import { llamar } from './empresaApi'
import { AuthError } from './types'
import type {
  AccionIA, AnalisisIA, AnalisisIAGuardado, Categoria, Diagnostico, Perfil, PracticaMapa, PrioridadIA,
  RecomendacionIA, Tamizaje, Verbo,
} from '../types'
import { RSE_EXPRESS } from '../data/rseExpress'
import { etiquetaEtapa } from '../data/escala'
import {
  alertasInformativas, evaluar, haceHoy, mapaPracticas, oportunidades, practicasRegistradas,
} from '../engine/scoring'

/**
 * Análisis inteligente (Gemini) de los resultados del autodiagnóstico.
 *
 * El front manda lo que el motor (engine/scoring.ts) YA calculó —niveles,
 * categorías, oportunidades en orden y alertas— y el backend le pide a
 * Gemini que lo interprete. Aquí no se recalcula nada: solo se reordena la
 * salida del motor. La API Key de Gemini nunca pasa por el navegador.
 *
 * Contrato: POST {API_URL}/empresa/mio/diagnosticos/rse_express/analisis-ia
 *   body: { resultados: ResultadosIAPayload }
 *   200 -> AnalisisIAApi   (reutilizado: true si no hizo falta llamar a Gemini)
 *   503 -> { codigo: 'IA_NO_DISPONIBLE' | 'IA_NO_CONFIGURADA', mensaje }
 *   429 -> { codigo: 'IA_LIMITE', mensaje }
 */

export const RUTA_ANALISIS_IA = '/empresa/mio/diagnosticos/rse_express/analisis-ia'

/* ------------------------------------------------------------ contrato */

export interface PracticaIAPayload {
  codigo: string
  pregunta: string
  etapa: string
  categoria: Categoria
  hace_hoy: string
}

export interface MateriaIAPayload {
  numero: string
  nombre: string
  aplica: boolean
  categoria: Exclude<Categoria, 'diferente'>
  fortalecer: string
  practicas: PracticaIAPayload[]
}

export interface PrioridadIAPayload {
  codigo: string
  materia_numero: string
  materia: string
  verbo: Verbo
  oportunidad: string
  hace_hoy: string
  alternativas: string[]
  alerta_legal: 'sst' | 'datos' | null
  fortalecer: string
}

/** Resultados del motor, sin datos de identificación (ni razón social ni NIT). */
export interface ResultadosIAPayload {
  lectura_concluyente: boolean
  practicas_registradas: number
  fortalezas: number
  en_desarrollo: number
  oportunidades: number
  practicas_propias_por_revisar: number
  materias: MateriaIAPayload[]
  prioridades: PrioridadIAPayload[]
  alertas: { id: string; titulo: string; detalle: string }[]
  comentario_final: string
}

interface AccionApi { accion: string; objetivo: string; horizonte: string; prioridad: string }

export interface AnalisisIAApi {
  diagnostico_id: string
  analisis: {
    resumen: string
    fortalezas: string[]
    areas_oportunidad: string[]
    prioridades: string[]
    recomendaciones: { titulo: string; descripcion: string; prioridad: string; justificacion: string; materia: string }[]
    acciones_corto_plazo: AccionApi[]
    acciones_mediano_plazo: AccionApi[]
    conclusion: string
  }
  generado_en: string
  modelo: string
  version_prompt: string
  reutilizado: boolean
}

/* --------------------------------------------------------- payload */

/** Tope por respuesta abierta. La pantalla y el PDF muestran un resumen de
 * ~240 caracteres, pero Gemini necesita el detalle para fundamentar sus
 * recomendaciones. */
export const MAX_RESPUESTA_IA = 1500
/** «¿Qué le gustaría fortalecer?»: la base admite hasta 2.000 caracteres. */
export const MAX_FORTALECER_IA = 2000

function recortar(texto: string, max: number): string {
  const t = texto.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…'
}

/** La etapa como la ve la empresa (y, si NEXUS ya la clasificó, su lectura). */
function etapaDe(pr: PracticaMapa): string {
  const r = pr.respuesta
  if (r?.etapa === 'diferente') {
    return r.clasificada != null
      ? `Hacemos algo diferente (NEXUS: ${etiquetaEtapa(r.clasificada, true)})`
      : 'Hacemos algo diferente (pendiente de revisión por NEXUS)'
  }
  return etiquetaEtapa(r?.etapa)
}

export function payloadResultadosIA(perfil: Perfil, tamizaje: Tamizaje, diagnostico: Diagnostico): ResultadosIAPayload {
  const mapa = mapaPracticas(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje)
  const res = evaluar(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje)
  const ops = oportunidades(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje)
  const practicas = mapa.flatMap((m) => (m.aplica ? m.practicas : []))
  const contar = (c: Categoria) => practicas.filter((p) => p.categoria === c).length

  return {
    lectura_concluyente: res.concluyente,
    practicas_registradas: practicasRegistradas(RSE_EXPRESS, diagnostico, tamizaje),
    fortalezas: contar('fortaleza'),
    en_desarrollo: contar('desarrollo'),
    oportunidades: contar('oportunidad'),
    practicas_propias_por_revisar: contar('diferente'),
    materias: mapa.map((m) => ({
      numero: m.materia.numero,
      nombre: m.materia.nombre,
      aplica: m.aplica,
      categoria: m.categoria,
      fortalecer: m.aplica ? recortar(m.fortalecer, MAX_FORTALECER_IA) : '',
      practicas: m.aplica
        ? m.practicas.map((pr) => ({
          codigo: pr.pregunta.id,
          pregunta: recortar(pr.pregunta.texto, 400),
          etapa: etapaDe(pr),
          categoria: pr.categoria,
          // Respuesta abierta + ejemplos + «algo diferente», completos.
          hace_hoy: haceHoy(pr.respuesta, MAX_RESPUESTA_IA),
        }))
        : [],
    })),
    prioridades: ops.map((o) => ({
      codigo: o.clave,
      materia_numero: o.materia.numero,
      materia: o.materia.nombre,
      verbo: o.verbo,
      oportunidad: recortar(o.oportunidad, 400),
      // Resúmenes: el texto completo de la práctica y de lo que quiere
      // fortalecer ya viaja en `materias` (no se manda dos veces).
      hace_hoy: o.haceHoy,
      alternativas: o.alternativas.slice(0, 5).map((a) => recortar(a, 300)),
      alerta_legal: o.alertaLegal ?? null,
      fortalecer: recortar(o.fortalecer, 300),
    })),
    alertas: alertasInformativas(RSE_EXPRESS, diagnostico, tamizaje)
      .map((a) => ({ id: a.id, titulo: a.titulo, detalle: recortar(a.detalle, 900) })),
    comentario_final: recortar(diagnostico.comentarioFinal, 2000),
  }
}

/* ------------------------------------------------------ conversión */

const PRIORIDADES: readonly PrioridadIA[] = ['alta', 'media', 'baja']

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const textos = (v: unknown): string[] => (Array.isArray(v) ? v.map(texto).filter(Boolean) : [])
const prioridad = (v: unknown): PrioridadIA => (PRIORIDADES.includes(v as PrioridadIA) ? (v as PrioridadIA) : 'media')
const objetos = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : [])

function acciones(v: unknown): AccionIA[] {
  return objetos(v)
    .map((a) => ({ accion: texto(a.accion), objetivo: texto(a.objetivo), horizonte: texto(a.horizonte), prioridad: prioridad(a.prioridad) }))
    .filter((a) => a.accion)
}

/** Respuesta del backend → modelo del front. Defensiva: la pantalla y el
 * PDF nunca deben romperse por un campo inesperado. null si no sirve. */
export function analisisDesdeApi(api: unknown): AnalisisIAGuardado | null {
  if (typeof api !== 'object' || api === null) return null
  const raiz = api as Partial<AnalisisIAApi>
  const a = raiz.analisis as Record<string, unknown> | undefined
  if (!a || typeof a !== 'object') return null

  const recomendaciones: RecomendacionIA[] = objetos(a.recomendaciones)
    .map((r) => ({
      titulo: texto(r.titulo), descripcion: texto(r.descripcion), prioridad: prioridad(r.prioridad),
      justificacion: texto(r.justificacion), materia: texto(r.materia) || 'general',
    }))
    .filter((r) => r.titulo)

  const analisis: AnalisisIA = {
    resumen: texto(a.resumen),
    fortalezas: textos(a.fortalezas),
    areasOportunidad: textos(a.areas_oportunidad),
    prioridades: textos(a.prioridades),
    recomendaciones,
    accionesCortoPlazo: acciones(a.acciones_corto_plazo),
    accionesMedianoPlazo: acciones(a.acciones_mediano_plazo),
    conclusion: texto(a.conclusion),
  }
  if (!analisis.resumen && recomendaciones.length === 0) return null
  return {
    analisis,
    generadoEn: texto(raiz.generado_en),
    modelo: texto(raiz.modelo),
    reutilizado: raiz.reutilizado === true,
  }
}

/* ------------------------------------------------------------ llamada */

// Una sola petición en curso por (sesión, resultados): el doble montaje de
// React en modo estricto o volver a entrar a Resultados no disparan una
// segunda llamada mientras la primera sigue esperando a Gemini.
const enCurso = new Map<string, Promise<AnalisisIAGuardado>>()

/** `cuerpo` es JSON.stringify({ resultados }) — ver useAnalisisIA. */
export function solicitarAnalisisIA(token: string, cuerpo: string): Promise<AnalisisIAGuardado> {
  const clave = `${token}\n${cuerpo}`
  let p = enCurso.get(clave)
  if (!p) {
    p = llamar<unknown>(RUTA_ANALISIS_IA, token, { method: 'POST', body: cuerpo })
      .then((api) => {
        const a = analisisDesdeApi(api)
        if (!a) throw new AuthError('IA_NO_DISPONIBLE', 'La respuesta del análisis inteligente no es válida.')
        return a
      })
      .finally(() => enCurso.delete(clave))
    enCurso.set(clave, p)
  }
  return p
}
