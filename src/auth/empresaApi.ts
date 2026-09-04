import { API_URL } from './api'
import { AuthError } from './types'

export interface EmpresaPayload {
  razon_social: string
  nit: string
  dv: string
  sector_id: string
  municipio: string
  departamento?: string | null
  extranjera: boolean
  tamano: 'micro' | 'pequena' | 'mediana' | 'grande'
  empleados: number
  areas_de_vida: 'si' | 'no' | 'nose'
  ciclo_previo: boolean
  comunidades_etnicas: boolean
  consumidor_final: boolean
}

export interface RespuestasPayload {
  respuestas: Record<string, string>
  completo: boolean
}

async function parseError(res: Response): Promise<AuthError> {
  let codigo = 'DESCONOCIDO'
  let mensaje = 'No se pudo completar la operación.'
  try {
    const data = await res.json()
    codigo = data.codigo ?? codigo
    mensaje = data.mensaje ?? mensaje
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  return new AuthError(codigo as AuthError['code'], mensaje)
}

async function put<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<T>
}

/** Guarda (crea o actualiza) el perfil + tamizaje de la empresa del usuario
 * en sesión. Best-effort desde el front: si falla, no rompe nada — la
 * app sigue funcionando con localStorage como venía haciendo. */
export function guardarEmpresa(token: string, payload: EmpresaPayload) {
  return put('/empresa/mio', payload, token)
}

/** Guarda las respuestas de un formato de diagnóstico. `respuestas` debe
 * traer solo los códigos que pertenecen a ESE formato. */
export function guardarRespuestas(token: string, formatoId: string, payload: RespuestasPayload) {
  return put(`/empresa/mio/diagnosticos/${formatoId}/respuestas`, payload, token)
}
