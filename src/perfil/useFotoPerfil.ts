import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { cargarFoto, urlFotoEnCache } from './fotoCache'

interface Cargada {
  clave: string
  url: string | null
}

/**
 * URL local de la foto de perfil de un usuario, o null si usa la
 * predeterminada (o si todavía no termina de descargar, o si falló: en
 * todos esos casos se ven sus iniciales, nunca un hueco vacío).
 *
 * `version` es `foto_actualizada_en` del usuario: cuando cambia, el hook
 * descarga la nueva y descarta la vieja.
 */
export function useFotoPerfil(usuarioId: string, version: string | null | undefined): string | null {
  const { token } = useAuth()
  const [cargada, setCargada] = useState<Cargada | null>(null)
  const clave = token && version ? `${usuarioId}|${version}` : null

  useEffect(() => {
    if (!token || !version) return
    const miClave = `${usuarioId}|${version}`
    let vigente = true
    cargarFoto(token, usuarioId, version).then(
      (url) => { if (vigente) setCargada({ clave: miClave, url }) },
      () => { if (vigente) setCargada({ clave: miClave, url: null }) },
    )
    return () => { vigente = false }
  }, [token, usuarioId, version])

  if (!clave || !version) return null
  if (cargada?.clave === clave) return cargada.url
  return urlFotoEnCache(usuarioId, version)
}
