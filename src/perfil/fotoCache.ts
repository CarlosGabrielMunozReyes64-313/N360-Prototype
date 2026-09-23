import { descargarFotoUsuario } from '../auth/api'

/**
 * Caché en memoria de las fotos de perfil ya descargadas.
 *
 * La foto viaja con el token (no es pública), así que no se puede poner la
 * URL del backend directo en un <img>: se descarga como Blob y se muestra
 * con una URL local (blob:). Sin esta caché, cada <Avatar> del mismo
 * usuario (menú, página de cuenta, lista del admin…) la descargaría otra
 * vez. Se guarda UNA versión por usuario: cuando llega una nueva, la
 * anterior se libera.
 */

interface Entrada {
  version: string
  promesa: Promise<string>
  /** Ya resuelta: permite pintar la foto en el primer render, sin parpadeo. */
  url: string | null
}

const cache = new Map<string, Entrada>()

function liberar(entrada: Entrada) {
  if (entrada.url) URL.revokeObjectURL(entrada.url)
  else entrada.promesa.then((url) => URL.revokeObjectURL(url), () => { /* nada que liberar */ })
}

function guardar(usuarioId: string, entrada: Entrada) {
  const anterior = cache.get(usuarioId)
  if (anterior && anterior !== entrada) liberar(anterior)
  cache.set(usuarioId, entrada)
}

/** La URL local de la foto si ya está descargada en esa versión. */
export function urlFotoEnCache(usuarioId: string, version: string): string | null {
  const entrada = cache.get(usuarioId)
  return entrada && entrada.version === version ? entrada.url : null
}

/** Devuelve (descargándola una sola vez) la URL local de la foto. */
export function cargarFoto(token: string, usuarioId: string, version: string): Promise<string> {
  const existente = cache.get(usuarioId)
  if (existente && existente.version === version) return existente.promesa

  const entrada: Entrada = {
    version,
    url: null,
    promesa: descargarFotoUsuario(token, usuarioId, version).then((blob) => URL.createObjectURL(blob)),
  }
  entrada.promesa.then(
    (url) => { entrada.url = url },
    // Si falló (sin red, 404…), se olvida para que un próximo intento
    // vuelva a pedirla en vez de quedarse con el error para siempre.
    () => { if (cache.get(usuarioId) === entrada) cache.delete(usuarioId) },
  )
  guardar(usuarioId, entrada)
  return entrada.promesa
}

/** Recién subida: se guarda la imagen local para mostrarla al instante
 * sin volver a descargarla del backend. */
export function sembrarFoto(usuarioId: string, version: string, foto: Blob) {
  const url = URL.createObjectURL(foto)
  guardar(usuarioId, { version, url, promesa: Promise.resolve(url) })
}

export function olvidarFoto(usuarioId: string) {
  const entrada = cache.get(usuarioId)
  if (entrada) liberar(entrada)
  cache.delete(usuarioId)
}

/** Al cerrar sesión: no deben quedar fotos de esta cuenta en memoria. */
export function limpiarFotos() {
  for (const entrada of cache.values()) liberar(entrada)
  cache.clear()
}
