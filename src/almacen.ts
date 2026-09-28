import type {
  Calificacion, Diagnostico, Etapa, Perfil, Priorizacion, Puntaje, RespuestaPregunta, Tamizaje,
} from './types'
import { CLIENTES, RANGOS_INGRESOS, TAMANOS, VINCULACIONES, ZONAS } from './data/tamizaje'

/**
 * Guardado local por cuenta (localStorage). Es la copia inmediata: el
 * backend es la fuente de verdad y esto evita perder lo escrito si la red
 * falla o se recarga la página.
 *
 * Versión 2 (RSE Express). Los datos de la versión anterior (tamizaje T1–T6
 * con UVT, Áreas de Vida, etc.) se migran al leerlos: se conserva el perfil
 * de la empresa y se descarta el tamizaje, igual que hace la migración 009
 * en la base de datos. En el historial se conserva la fecha y el perfil de
 * cada cambio, pero no el tamizaje retirado.
 */
export const VERSION_ALMACEN = 2

const clave = {
  datos: (id: string) => `n360_datos:${id}`,
  historial: (id: string) => `n360_historial:${id}`,
  borrador: (id: string) => `n360_rse:${id}`,
}

function leer(k: string): unknown {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function escribir(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* sin almacenamiento disponible: simplemente no persiste */
  }
}

const esTexto = (v: unknown): v is string => typeof v === 'string'
const texto = (v: unknown) => (esTexto(v) ? v : '')
const deLista = <T extends string>(lista: { id: T }[], v: unknown): T | '' =>
  lista.some((x) => x.id === v) ? (v as T) : ''
const listaDe = <T extends string>(lista: { id: T }[], v: unknown): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => lista.some((y) => y.id === x)))] : []

export function normalizarPerfil(v: unknown): Perfil | null {
  if (!v || typeof v !== 'object') return null
  const p = v as Record<string, unknown>
  return {
    razonSocial: texto(p.razonSocial), nit: texto(p.nit), dv: texto(p.dv),
    sector: (texto(p.sector) as Perfil['sector']), municipio: texto(p.municipio),
    departamento: texto(p.departamento), extranjera: p.extranjera === true,
  }
}

/** Solo acepta la estructura nueva: un tamizaje de la versión anterior
 * (con `areasDeVida`, `empleados`…) devuelve null. */
export function normalizarTamizaje(v: unknown): Tamizaje | null {
  if (!v || typeof v !== 'object') return null
  const t = v as Record<string, unknown>
  if ('areasDeVida' in t || 'cicloPrevio' in t || 'consumidorFinal' in t || 'empleados' in t) return null
  return {
    tamano: deLista(TAMANOS, t.tamano),
    ingresos: deLista(RANGOS_INGRESOS, t.ingresos),
    personas: texto(t.personas).replace(/\D/g, ''),
    vinculacion: listaDe(VINCULACIONES, t.vinculacion),
    vinculacionDetalle: texto(t.vinculacionDetalle),
    zonas: listaDe(ZONAS, t.zonas),
    territorio: texto(t.territorio),
    clientes: deLista(CLIENTES, t.clientes),
    clientesDetalle: texto(t.clientesDetalle),
  }
}

const ETAPAS_VALIDAS: Etapa[] = [0, 1, 2, 3, 4, 'diferente', 'NA']

export function normalizarRespuesta(v: unknown): RespuestaPregunta {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const etapa = ETAPAS_VALIDAS.includes(r.etapa as Etapa) ? (r.etapa as Etapa) : null
  const clasificada = [0, 1, 2, 3, 4].includes(r.clasificada as number) ? (r.clasificada as 0) : null
  return {
    texto: texto(r.texto),
    ejemplos: Array.isArray(r.ejemplos) ? r.ejemplos.filter(esTexto) : [],
    otro: texto(r.otro),
    etapa,
    clasificada,
  }
}

export const DIAGNOSTICO_VACIO: Diagnostico = { respuestas: {}, fortalecer: {}, comentarioFinal: '' }
export const PRIORIZACION_VACIA: Priorizacion = { filas: {}, elegida: null }

export function normalizarDiagnostico(v: unknown): Diagnostico {
  const d = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const respuestas: Diagnostico['respuestas'] = {}
  if (d.respuestas && typeof d.respuestas === 'object')
    for (const [k, r] of Object.entries(d.respuestas as object)) respuestas[k] = normalizarRespuesta(r)
  const fortalecer: Diagnostico['fortalecer'] = {}
  if (d.fortalecer && typeof d.fortalecer === 'object')
    for (const [k, t] of Object.entries(d.fortalecer as object)) if (esTexto(t)) fortalecer[k] = t
  return { respuestas, fortalecer, comentarioFinal: texto(d.comentarioFinal) }
}

const puntaje = (v: unknown): Puntaje | null => (v === 1 || v === 2 || v === 3 ? v : null)

export function normalizarPriorizacion(v: unknown): Priorizacion {
  const p = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const filas: Record<string, Calificacion> = {}
  if (p.filas && typeof p.filas === 'object')
    for (const [k, c] of Object.entries(p.filas as Record<string, Record<string, unknown>>)) {
      if (!c || typeof c !== 'object') continue
      filas[k] = {
        importancia: puntaje(c.importancia), viabilidad: puntaje(c.viabilidad),
        potencial: puntaje(c.potencial), interes: puntaje(c.interes),
      }
    }
  return { filas, elegida: esTexto(p.elegida) ? p.elegida : null }
}

/* ------------------------------------------------------- perfil + tamizaje */

export interface DatosLocales {
  perfil: Perfil | null
  tamizaje: Tamizaje | null
  /** true si había datos de la versión anterior (se migraron al leer). */
  legado: boolean
}

export function cargarDatos(usuarioId: string): DatosLocales {
  const raw = leer(clave.datos(usuarioId)) as Record<string, unknown> | null
  if (!raw || typeof raw !== 'object') return { perfil: null, tamizaje: null, legado: false }
  const perfil = normalizarPerfil(raw.perfil)
  if (raw.v === VERSION_ALMACEN) {
    return { perfil, tamizaje: normalizarTamizaje(raw.tamizaje), legado: false }
  }
  // Versión anterior: se conserva el perfil (datos de la cuenta) y se
  // retira el tamizaje. Se reescribe ya, para que el tamizaje viejo no
  // quede guardado en el navegador.
  guardarDatos(usuarioId, perfil, null)
  return { perfil, tamizaje: null, legado: Boolean(raw.tamizaje) }
}

export function guardarDatos(usuarioId: string, perfil: Perfil | null, tamizaje: Tamizaje | null) {
  escribir(clave.datos(usuarioId), { v: VERSION_ALMACEN, perfil, tamizaje })
}

/* ---------------------------------------------------------------- historial */

/** Un registro del historial: el estado activo hasta esta fecha, justo
 * antes de reemplazarse. `tamizaje` es null en los registros de la versión
 * anterior: ese tamizaje se retiró con el cambio al RSE Express. */
export interface HistorialEntrada {
  fecha: string
  perfil: Perfil
  tamizaje: Tamizaje | null
  legado?: boolean
}

export function cargarHistorial(usuarioId: string): HistorialEntrada[] {
  const raw = leer(clave.historial(usuarioId))
  if (!Array.isArray(raw)) return []
  let habiaLegado = false
  const entradas: HistorialEntrada[] = []
  for (const e of raw) {
    if (!e || typeof e !== 'object' || !esTexto(e.fecha)) continue
    const perfil = normalizarPerfil(e.perfil)
    if (!perfil) continue
    const tamizaje = normalizarTamizaje(e.tamizaje)
    const legado = e.legado === true || (Boolean(e.tamizaje) && tamizaje === null)
    if (legado && e.legado !== true) habiaLegado = true
    entradas.push({ fecha: e.fecha, perfil, tamizaje, ...(legado ? { legado: true } : {}) })
  }
  if (habiaLegado) escribir(clave.historial(usuarioId), entradas)
  return entradas
}

/** Append-only: nunca se borra una entrada, solo se agrega. */
export function agregarAlHistorial(usuarioId: string, entrada: HistorialEntrada) {
  const actual = cargarHistorial(usuarioId)
  actual.push(entrada)
  escribir(clave.historial(usuarioId), actual)
}

/* ----------------------------------------------------------------- borrador */

export interface Borrador {
  diagnostico: Diagnostico
  priorizacion: Priorizacion
  /** ISO de la última escritura local, para compararla con el backend. */
  guardadoEn: string
}

export function cargarBorrador(usuarioId: string): Borrador | null {
  const raw = leer(clave.borrador(usuarioId)) as Record<string, unknown> | null
  if (!raw || raw.v !== VERSION_ALMACEN) return null
  return {
    diagnostico: normalizarDiagnostico(raw.diagnostico),
    priorizacion: normalizarPriorizacion(raw.priorizacion),
    guardadoEn: texto(raw.guardadoEn),
  }
}

export function guardarBorrador(usuarioId: string, diagnostico: Diagnostico, priorizacion: Priorizacion) {
  escribir(clave.borrador(usuarioId), {
    v: VERSION_ALMACEN, diagnostico, priorizacion, guardadoEn: new Date().toISOString(),
  })
}
