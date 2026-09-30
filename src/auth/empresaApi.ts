import { API_URL } from './api'
import { AuthError } from './types'
import type { Diagnostico, Etapa, Perfil, Priorizacion, Tamizaje } from '../types'
import {
  normalizarDiagnostico, normalizarPerfil, normalizarPriorizacion, normalizarRespuesta, normalizarTamizaje,
} from '../almacen'

/* ------------------------------------------------------------ contrato */

export interface EmpresaPayload {
  razon_social: string
  nit: string
  dv: string
  sector_id: string
  municipio: string
  departamento?: string | null
  extranjera: boolean
  tamano: 'micro' | 'pequena' | 'mediana' | 'nose'
  ingresos_rango: string | null
  personas: number
  vinculacion: string[]
  vinculacion_detalle: string | null
  zonas: string[]
  territorio: string | null
  clientes: 'personas' | 'empresas' | 'publicas' | 'mezcla'
  clientes_detalle: string | null
}

export type EtapaApi = '0' | '1' | '2' | '3' | '4' | 'diferente' | 'NA'

export interface RespuestaApiIn {
  texto: string
  ejemplos: string[]
  otro: string
  etapa: EtapaApi | null
}

export interface DiagnosticoPayload {
  respuestas: Record<string, RespuestaApiIn>
  fortalecer: Record<string, string>
  comentario_final: string | null
  priorizacion: Priorizacion
  completo: boolean
}

export interface RespuestaApi extends RespuestaApiIn {
  respuesta_id: string
  clasificada: number | null
  clasificado_en: string | null
  respondido_en: string
}

export interface DiagnosticoApi {
  diagnostico_id: string
  formato_id: string
  estado: 'borrador' | 'completado' | 'archivado'
  creado_en: string
  completado_en: string | null
  actualizado_en: string
  respuestas: Record<string, RespuestaApi>
  fortalecer: Record<string, string>
  comentario_final: string | null
  priorizacion: unknown
}

export interface TamizajeApi {
  ciclo_id: string
  anio: number
  tamano: string
  ingresos_rango: string | null
  personas: number
  vinculacion: string[]
  vinculacion_detalle: string | null
  zonas: string[]
  territorio: string | null
  clientes: string
  clientes_detalle: string | null
  actualizado_en: string
}

export interface PerfilApi {
  empresa_id: string
  razon_social: string
  nit: string
  dv: string
  sector_id: string
  municipio: string
  departamento: string | null
  extranjera: boolean
}

/** GET/PUT /empresa/mio (y GET /admin/empresas/{id}/diagnostico). */
export interface EmpresaMia {
  empresa: PerfilApi
  tamizaje: TamizajeApi | null
  diagnostico: DiagnosticoApi | null
}

/* ------------------------------------------------------- conversiones */

export function etapaAApi(e: Etapa | null): EtapaApi | null {
  return e === null ? null : (String(e) as EtapaApi)
}

export function etapaDesdeApi(e: string | null | undefined): Etapa | null {
  if (e === 'NA' || e === 'diferente') return e
  if (e === '0' || e === '1' || e === '2' || e === '3' || e === '4') return Number(e) as Etapa
  return null
}

export function perfilDesdeApi(p: PerfilApi): Perfil {
  return normalizarPerfil({
    razonSocial: p.razon_social, nit: p.nit, dv: p.dv, sector: p.sector_id,
    municipio: p.municipio, departamento: p.departamento ?? '', extranjera: p.extranjera,
  })!
}

export function tamizajeDesdeApi(t: TamizajeApi | null): Tamizaje | null {
  if (!t) return null
  return normalizarTamizaje({
    tamano: t.tamano, ingresos: t.ingresos_rango ?? '', personas: String(t.personas),
    vinculacion: t.vinculacion, vinculacionDetalle: t.vinculacion_detalle ?? '',
    zonas: t.zonas, territorio: t.territorio ?? '', clientes: t.clientes,
    clientesDetalle: t.clientes_detalle ?? '',
  })
}

export function diagnosticoDesdeApi(d: DiagnosticoApi | null): Diagnostico | null {
  if (!d) return null
  const respuestas: Diagnostico['respuestas'] = {}
  for (const [k, r] of Object.entries(d.respuestas))
    respuestas[k] = normalizarRespuesta({ ...r, etapa: etapaDesdeApi(r.etapa) })
  return normalizarDiagnostico({ respuestas, fortalecer: d.fortalecer, comentarioFinal: d.comentario_final ?? '' })
}

export function priorizacionDesdeApi(d: DiagnosticoApi | null): Priorizacion {
  return normalizarPriorizacion(d?.priorizacion)
}

export function payloadEmpresa(perfil: Perfil, t: Tamizaje): EmpresaPayload {
  const opcional = (s: string) => s.trim() || null
  return {
    razon_social: perfil.razonSocial,
    nit: perfil.nit,
    dv: perfil.dv,
    sector_id: perfil.sector,
    municipio: perfil.municipio,
    departamento: perfil.departamento || null,
    extranjera: perfil.extranjera,
    tamano: t.tamano as EmpresaPayload['tamano'],
    ingresos_rango: t.ingresos || null,
    personas: Number(t.personas) || 0,
    vinculacion: t.vinculacion,
    vinculacion_detalle: opcional(t.vinculacionDetalle),
    zonas: t.zonas,
    territorio: opcional(t.territorio),
    clientes: t.clientes as EmpresaPayload['clientes'],
    clientes_detalle: opcional(t.clientesDetalle),
  }
}

export function payloadDiagnostico(d: Diagnostico, p: Priorizacion, completo: boolean): DiagnosticoPayload {
  const respuestas: DiagnosticoPayload['respuestas'] = {}
  for (const [k, r] of Object.entries(d.respuestas))
    respuestas[k] = { texto: r.texto, ejemplos: r.ejemplos, otro: r.otro, etapa: etapaAApi(r.etapa) }
  return {
    respuestas,
    fortalecer: d.fortalecer,
    comentario_final: d.comentarioFinal.trim() || null,
    priorizacion: p,
    completo,
  }
}

/* ------------------------------------------------------------ llamadas */

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

/** fetch autenticado con el formato de error {codigo, mensaje} del backend. */
export async function llamar<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<T>
}

/** Lo que la empresa tiene guardado. null si la cuenta aún no registró su
 * empresa (404). Tras la migración 009 las empresas existentes llegan con
 * `tamizaje: null`: hay que responder el tamizaje nuevo. */
export async function obtenerMiEmpresa(token: string): Promise<EmpresaMia | null> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/empresa/mio`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (res.status === 404) return null
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<EmpresaMia>
}

/** Crea o actualiza el perfil + el tamizaje de la empresa del usuario. */
export function guardarEmpresa(token: string, payload: EmpresaPayload) {
  return llamar<EmpresaMia>('/empresa/mio', token, { method: 'PUT', body: JSON.stringify(payload) })
}

/** Guarda el autodiagnóstico RSE Express completo (el backend solo
 * reescribe lo que cambió). */
export function guardarDiagnostico(token: string, payload: DiagnosticoPayload) {
  return llamar<DiagnosticoApi>('/empresa/mio/diagnosticos/rse_express/respuestas', token, {
    method: 'PUT', body: JSON.stringify(payload),
  })
}
