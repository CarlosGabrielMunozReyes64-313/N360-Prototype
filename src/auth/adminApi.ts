import { API_URL } from './api'
import type { EmpresaMia } from './empresaApi'
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
  ingresos_rango: string | null
  personas: number
  vinculacion: string[]
  zonas: string[]
  territorio: string | null
  clientes: string
  actualizado_en: string
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

export interface ConteoCliente {
  clientes: string
  total: number
}

export interface ConteoEtapa {
  /** '0'..'4', 'diferente' o 'NA'. */
  etapa: string
  total: number
}

export interface ConteoRango {
  /** '1-9', '10-50', '51-200' o '201+'. */
  rango: string
  total: number
}

export interface ConteoMateria {
  numero: string
  materia: string
  total: number
}

export interface ConteoMateriaEtapa extends ConteoMateria {
  etapa: string
}

/** Empresas con cada alerta informativa (mismas reglas que la empresa ve). */
export interface Alertas {
  ley2173: number
  sst: number
  datos: number
  territorio: number
}

/** Indicadores de la sección 10 del protocolo. */
export interface IndicadoresDiagnostico {
  empresas_con_tamizaje: number
  empresas_perfil_piloto: number
  empresas_con_diagnostico: number
  empresas_con_practicas: number
  practicas_registradas: number
  respuestas_diferente: number
  diferente_sin_clasificar: number
  respuestas_na: number
  materias_con_fortalecer: number
  comentarios_finales: number
}

/** Promedio de la lectura INTERNA 0–4 por materia (uso de NEXUS). */
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
  empresas_por_cliente: ConteoCliente[]
  diagnosticos_por_estado: ConteoEstado[]
  respuestas_por_etapa: ConteoEtapa[]
  promedio_por_dimension: PromedioDimension[]
  indicadores: IndicadoresDiagnostico
  // Opcionales: un backend anterior no los manda y el panel no debe romperse.
  empresas_por_personas?: ConteoRango[]
  etapas_por_materia?: ConteoMateriaEtapa[]
  practicas_por_materia?: ConteoMateria[]
  retos_por_materia?: ConteoMateria[]
  alertas?: Alertas
}

/** Una fila por empresa activa: perfil, tamizaje vigente y avance del
 * autodiagnóstico RSE Express. Los campos de tamizaje y de diagnóstico son
 * null cuando la empresa aún no responde el tamizaje nuevo. */
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
  ingresos_rango: string | null
  personas: number | null
  vinculacion: string[] | null
  vinculacion_detalle: string | null
  zonas: string[] | null
  territorio: string | null
  clientes: string | null
  clientes_detalle: string | null
  /** Criterio del piloto: entre 10 y 50 personas. */
  perfil_piloto: boolean | null
  diagnostico_estado: string | null
  diagnostico_actualizado_en: string | null
  respuestas_con_etapa: number
  practicas_registradas: number
  pendientes_clasificar: number
}

/** Lo que respondió una empresa (mismo formato que GET /empresa/mio). */
export function obtenerDiagnosticoEmpresa(token: string, empresaId: string): Promise<EmpresaMia> {
  return llamar(`/admin/empresas/${empresaId}/diagnostico`, token)
}

export interface Clasificacion {
  respuesta_id: string
  codigo: string
  clasificada: number | null
  clasificado_en: string | null
}

/** NEXUS clasifica (0–4) una respuesta «Hacemos algo diferente»; null la quita. */
export function clasificarRespuesta(token: string, respuestaId: string, valor: number | null): Promise<Clasificacion> {
  return llamar(`/admin/respuestas/${respuestaId}/clasificacion`, token, {
    method: 'PUT', body: JSON.stringify({ valor }),
  })
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
