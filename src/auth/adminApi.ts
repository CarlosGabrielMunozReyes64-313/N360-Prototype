import { API_URL } from './api'
import { AuthError } from './types'
import type { Usuario } from './types'

/** Vista de usuario para el panel de admin — incluye campos que un usuario
 * normal nunca ve de sí mismo. */
export interface UsuarioAdmin extends Usuario {
  intentos_fallidos: number
  bloqueado_hasta: string | null
  creado_en: string
  /** Marca de eliminación suave. Si no es null, la cuenta está eliminada
   * (archivada): no puede iniciar sesión y su correo quedó libre. */
  archivado_en: string | null
}

export type MotivoCierre = 'logout' | 'admin' | 'eliminacion'

export interface SesionAdmin {
  sesion_id: string
  usuario_id: string
  creado_en: string
  expira_en: string
  revocado_en: string | null
  /** Por qué se cerró. null en sesiones vivas y en las cerradas antes de
   * la migración 006, donde el motivo no quedó registrado. */
  revocado_motivo: MotivoCierre | null
  ip_origen: string | null
  user_agent: string | null
}

/** Conteo de sesiones por usuario, para la lista de actividad. */
export interface ResumenSesiones {
  usuario_id: string
  total: number
  activas: number
  ultima_sesion: string | null
}

export interface EmpresaActividad {
  empresa_id: string
  razon_social: string
  nit: string
  dv: string
  municipio: string
  creado_en: string
  es_creador: boolean
}

export interface TamizajeActividad {
  ciclo_id: string
  empresa_id: string
  razon_social: string
  anio: number
  tamano: string
  empleados: number
  areas_de_vida: string
  ciclo_previo: boolean
  comunidades_etnicas: boolean
  consumidor_final: boolean
  creado_en: string
}

export interface DiagnosticoActividad {
  diagnostico_id: string
  formato_id: string
  codigo: string
  formato_nombre: string
  razon_social: string
  anio: number
  estado: string
  creado_en: string
  completado_en: string | null
  respuestas_total: number
  respuestas_usuario: number
  primera_respuesta: string | null
  ultima_respuesta: string | null
}

export interface ActividadUsuario {
  usuario: UsuarioAdmin
  sesiones: SesionAdmin[]
  empresas: EmpresaActividad[]
  tamizajes: TamizajeActividad[]
  diagnosticos: DiagnosticoActividad[]
}

/** Resultado de eliminar una cuenta. `modo` distingue el borrado real del
 * archivado, que es lo que decide el backend según si quedó rastro. */
export interface ResultadoEliminacion {
  usuario_id: string
  modo: 'fisico' | 'archivado'
  mensaje: string
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

async function llamar<T>(
  path: string, token: string, opciones: RequestInit = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opciones.headers,
      },
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function listarUsuarios(
  token: string, incluirArchivados = false,
): Promise<UsuarioAdmin[]> {
  const query = incluirArchivados ? '?incluir_archivados=true' : ''
  return llamar(`/admin/usuarios${query}`, token)
}

export function cambiarEstadoUsuario(
  token: string, usuarioId: string, activo: boolean,
): Promise<UsuarioAdmin> {
  return llamar(`/admin/usuarios/${usuarioId}/estado`, token, {
    method: 'PATCH', body: JSON.stringify({ activo }),
  })
}

export function desbloquearUsuario(token: string, usuarioId: string): Promise<void> {
  return llamar(`/admin/usuarios/${usuarioId}/desbloquear`, token, { method: 'POST' })
}

export function cambiarRolUsuario(
  token: string, usuarioId: string, rol: 'empresa' | 'admin',
): Promise<UsuarioAdmin> {
  return llamar(`/admin/usuarios/${usuarioId}/rol`, token, {
    method: 'POST', body: JSON.stringify({ rol }),
  })
}

export function restablecerPasswordUsuario(
  token: string, usuarioId: string, passwordNueva: string,
): Promise<void> {
  return llamar(`/admin/usuarios/${usuarioId}/restablecer-password`, token, {
    method: 'POST', body: JSON.stringify({ password_nueva: passwordNueva }),
  })
}

/**
 * Elimina una cuenta. El backend decide entre borrado definitivo y
 * archivado según si el usuario dejó rastro (empresas, respuestas);
 * `conservarHistorial` fuerza el archivado incluso si la cuenta está limpia.
 */
export function eliminarUsuario(
  token: string, usuarioId: string, conservarHistorial = false,
): Promise<ResultadoEliminacion> {
  const query = conservarHistorial ? '?conservar_historial=true' : ''
  return llamar(`/admin/usuarios/${usuarioId}${query}`, token, { method: 'DELETE' })
}

/** Deshace un archivado. No aplica a cuentas borradas definitivamente. */
export function restaurarUsuario(token: string, usuarioId: string): Promise<UsuarioAdmin> {
  return llamar(`/admin/usuarios/${usuarioId}/restaurar`, token, { method: 'POST' })
}

export function listarSesiones(token: string, usuarioId?: string): Promise<SesionAdmin[]> {
  const query = usuarioId ? `?usuario_id=${usuarioId}` : ''
  return llamar(`/admin/sesiones${query}`, token)
}

// ---- Estadísticas y detalle de empresas (panel /admin/estadisticas) ----

export interface ResumenGeneral {
  empresas: number
  usuarios: number
  diagnosticos_totales: number
  diagnosticos_completados: number
}

export interface ConteoSector {
  sector_id: string
  nombre: string
  total: number
}

export interface ConteoTamano {
  tamano: string
  total: number
}

export interface ConteoEstado {
  formato_id: string
  estado: string
  total: number
}

export interface PromedioDimension {
  formato_id: string
  numero: string
  dimension: string
  promedio: number
  respuestas: number
}

export interface Estadisticas {
  resumen: ResumenGeneral
  empresas_por_sector: ConteoSector[]
  empresas_por_tamano: ConteoTamano[]
  diagnosticos_por_estado: ConteoEstado[]
  promedio_por_dimension: PromedioDimension[]
}

/** Una fila por empresa activa: perfil, tamizaje del ciclo más reciente y
 * estado actual de cada formato en ese ciclo. Los campos de tamizaje y de
 * diagnóstico son null cuando la empresa aún no tiene ciclo registrado. */
export interface EmpresaDetalle {
  empresa_id: string
  razon_social: string
  nit: string
  dv: string
  sector_id: string
  sector_nombre: string
  municipio: string
  departamento: string | null
  creado_en: string
  anio: number | null
  tamano: string | null
  empleados: number | null
  areas_de_vida: string | null
  ciclo_previo: boolean | null
  comunidades_etnicas: boolean | null
  consumidor_final: boolean | null
  iso26000_estado: string | null
  ley2173_estado: string | null
}

/** Conteos generales y distribuciones para el panel de estadísticas. */
export function obtenerEstadisticas(token: string): Promise<Estadisticas> {
  return llamar('/admin/estadisticas', token)
}

/** Una fila por empresa, para la exportación a CSV. */
export function listarEmpresasDetalle(token: string): Promise<EmpresaDetalle[]> {
  return llamar('/admin/empresas', token)
}

/** Sesiones totales y activas por usuario, sin traer cada sesión. */
export function resumenSesiones(token: string): Promise<ResumenSesiones[]> {
  return llamar('/admin/sesiones/resumen', token)
}

/** Todo el rastro de un usuario: sesiones, empresas, tamizajes y diagnósticos. */
export function actividadUsuario(token: string, usuarioId: string): Promise<ActividadUsuario> {
  return llamar(`/admin/usuarios/${usuarioId}/actividad`, token)
}

export function revocarSesion(token: string, sesionId: string): Promise<void> {
  return llamar(`/admin/sesiones/${sesionId}/revocar`, token, { method: 'POST' })
}
