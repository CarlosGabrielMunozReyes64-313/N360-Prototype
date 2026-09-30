import { useEffect, useMemo, useState } from 'react'
import type { AnalisisIAGuardado } from '../types'
import { AuthError } from '../auth/types'
import { solicitarAnalisisIA } from '../auth/analisisIaApi'
import type { ResultadosIAPayload } from '../auth/analisisIaApi'

export type EstadoAnalisisIA =
  | { tipo: 'inactivo' }
  | { tipo: 'cargando' }
  | { tipo: 'listo'; datos: AnalisisIAGuardado }
  /** `reintentable`: tiene sentido ofrecer «Reintentar» (no lo tiene si el
   * servidor no tiene clave o se alcanzó el tope por hora). */
  | { tipo: 'error'; mensaje: string; reintentable: boolean }

export const MENSAJE_SIN_DIAGNOSTICO =
  'Todavía no hay datos de su empresa ni respuestas guardados en el servidor, así que no hay nada que analizar. '
  + 'Si al inicio de la página aparece un aviso rojo, corrija lo que indica y vuelva a intentarlo.'

export const MENSAJE_IA_GENERICO =
  'No pudimos generar el análisis inteligente en este momento. Sus resultados y el informe PDF siguen disponibles.'

/** Solo se muestran tal cual los mensajes del análisis IA (pensados para el
 * usuario); cualquier otro error se reemplaza por uno genérico y amable. */
export function estadoDeError(e: unknown): EstadoAnalisisIA {
  if (e instanceof AuthError) {
    if (e.code === 'IA_NO_CONFIGURADA' || e.code === 'IA_LIMITE') {
      return { tipo: 'error', mensaje: e.message, reintentable: false }
    }
    if (e.code === 'IA_NO_DISPONIBLE') return { tipo: 'error', mensaje: e.message || MENSAJE_IA_GENERICO, reintentable: true }
    // No es un fallo de la IA: el servidor todavía no tiene la empresa o el
    // autodiagnóstico (p. ej. porque el perfil no se pudo guardar).
    if (e.code === 'SIN_DIAGNOSTICO') return { tipo: 'error', mensaje: MENSAJE_SIN_DIAGNOSTICO, reintentable: true }
  }
  return { tipo: 'error', mensaje: MENSAJE_IA_GENERICO, reintentable: true }
}

/**
 * Pide al backend el análisis inteligente de los resultados. El backend
 * reutiliza el guardado si los resultados no cambiaron, así que volver a
 * entrar a Resultados o recargar la página no vuelve a llamar a Gemini.
 *
 * Nunca bloquea nada: mientras carga o si falla, el resto de la pantalla y
 * el PDF funcionan igual.
 */
export function useAnalisisIA(token: string | null, resultados: ResultadosIAPayload | null) {
  const [intento, setIntento] = useState(0)
  // Se compara por contenido, no por identidad del objeto.
  const cuerpo = useMemo(() => (resultados ? JSON.stringify({ resultados }) : null), [resultados])
  const clave = token && cuerpo ? `${intento}\n${cuerpo}` : null
  const [respuesta, setRespuesta] = useState<{ clave: string; estado: EstadoAnalisisIA } | null>(null)

  useEffect(() => {
    if (!clave || !token || !cuerpo) return
    let vivo = true
    solicitarAnalisisIA(token, cuerpo)
      .then((datos) => { if (vivo) setRespuesta({ clave, estado: { tipo: 'listo', datos } }) })
      .catch((e: unknown) => { if (vivo) setRespuesta({ clave, estado: estadoDeError(e) }) })
    return () => { vivo = false }
  }, [clave, token, cuerpo])

  // Mientras no llegue la respuesta de ESTA clave, está cargando: así no hay
  // que marcar «cargando» dentro del efecto.
  const estado: EstadoAnalisisIA = !clave
    ? { tipo: 'inactivo' }
    : respuesta?.clave === clave ? respuesta.estado : { tipo: 'cargando' }

  return { estado, reintentar: () => setIntento((n) => n + 1) }
}
