import type { RangoIngresos, Tamano, Tamizaje, TipoCliente, Vinculacion, Zona } from '../types'

/**
 * Tamizaje «Conozcamos su empresa» — Anexo 1 del protocolo, preguntas T1,
 * T2, T5 y T6. T3 y T4 (Áreas de Vida y ciclo previo, de la Ley 2173) se
 * retiraron: no forman parte del documento de referencia.
 */
export const PREGUNTAS_TAMIZAJE = {
  T1: '¿Cómo describiría el tamaño de su empresa?',
  T1b: 'Rango de ingresos anuales, si lo conoce',
  T2: '¿Cuántas personas trabajan hoy con la empresa y cómo están vinculadas?',
  T5: '¿En qué lugares desarrolla su actividad y qué comunidades o vecinos están cerca de su operación?',
  T6: '¿Quiénes son principalmente sus clientes?',
} as const

export const TAMANOS: { id: Tamano; nombre: string }[] = [
  { id: 'micro', nombre: 'Micro' },
  { id: 'pequena', nombre: 'Pequeña' },
  { id: 'mediana', nombre: 'Mediana' },
  { id: 'nose', nombre: 'No estoy seguro' },
]

export const RANGOS_INGRESOS: { id: RangoIngresos; nombre: string }[] = [
  { id: 'menos_1000m', nombre: 'Menos de $1.000 millones' },
  { id: '1000m_10000m', nombre: 'Entre $1.000 y $10.000 millones' },
  { id: '10000m_50000m', nombre: 'Entre $10.000 y $50.000 millones' },
  { id: 'mas_50000m', nombre: 'Más de $50.000 millones' },
  { id: 'no_indica', nombre: 'Prefiero no indicarlo' },
]

export const VINCULACIONES: { id: Vinculacion; nombre: string }[] = [
  { id: 'laboral', nombre: 'Contrato laboral' },
  { id: 'servicios', nombre: 'Prestación de servicios' },
  { id: 'socios', nombre: 'Socios o familiares que trabajan' },
  { id: 'temporada', nombre: 'Personal por temporada' },
  { id: 'otra', nombre: 'Otra forma' },
]

export const ZONAS: { id: Zona; nombre: string }[] = [
  { id: 'barrios', nombre: 'Barrios' },
  { id: 'veredas', nombre: 'Veredas' },
  { id: 'rural', nombre: 'Zonas rurales' },
  { id: 'indigenas', nombre: 'Comunidades indígenas' },
  { id: 'afro', nombre: 'Comunidades afrodescendientes' },
  { id: 'otras', nombre: 'Otras' },
]

export const CLIENTES: { id: TipoCliente; nombre: string }[] = [
  { id: 'personas', nombre: 'Personas u hogares' },
  { id: 'empresas', nombre: 'Otras empresas' },
  { id: 'publicas', nombre: 'Entidades públicas' },
  { id: 'mezcla', nombre: 'Una mezcla' },
]

export const TAMIZAJE_VACIO: Tamizaje = {
  tamano: '', ingresos: '', personas: '', vinculacion: [], vinculacionDetalle: '',
  zonas: [], territorio: '', clientes: '', clientesDetalle: '',
}

const nombre = <T extends string>(lista: { id: T; nombre: string }[], id: T | '') =>
  lista.find((x) => x.id === id)?.nombre ?? '—'

export const nombreTamano = (t: Tamano | '' | null | undefined) => nombre(TAMANOS, t ?? '')
export const nombreIngresos = (r: RangoIngresos | '' | null | undefined) => nombre(RANGOS_INGRESOS, r ?? '')
export const nombreCliente = (c: TipoCliente | '' | null | undefined) => nombre(CLIENTES, c ?? '')
export const nombresVinculacion = (v: readonly string[] | null | undefined) =>
  (v ?? []).map((x) => nombre(VINCULACIONES, x as Vinculacion)).join(', ') || '—'
export const nombresZonas = (z: readonly string[] | null | undefined) =>
  (z ?? []).map((x) => nombre(ZONAS, x as Zona)).join(', ') || '—'

export function personasValidas(t: Tamizaje): boolean {
  const n = Number(t.personas)
  return t.personas !== '' && Number.isInteger(n) && n > 0
}

/** Obligatorio: T1 tamaño, T2 número y vinculación, T5 una zona o el
 * texto, T6 tipo de clientes. Los detalles y el rango de ingresos son
 * opcionales. */
export function tamizajeCompleto(t: Tamizaje | null | undefined): t is Tamizaje {
  if (!t) return false
  return Boolean(
    t.tamano && personasValidas(t) && t.vinculacion.length > 0 &&
    (t.zonas.length > 0 || t.territorio.trim()) && t.clientes,
  )
}

/** La materia Consumidores se activa si vende a personas u hogares
 * (o a una mezcla que puede incluirlos). */
export function consumidoresAplica(t: Tamizaje | null | undefined): boolean {
  return !t || !(t.clientes === 'empresas' || t.clientes === 'publicas')
}

/** Perfil del piloto: entre 10 y 50 personas (criterio de selección). */
export function enPerfilPiloto(t: Tamizaje): boolean | null {
  if (!personasValidas(t)) return null
  const n = Number(t.personas)
  return n >= 10 && n <= 50
}

export function resumenTamizaje(t: Tamizaje): string {
  return [
    `Tamaño: ${nombreTamano(t.tamano)}`,
    `${t.personas || '—'} personas (${nombresVinculacion(t.vinculacion)})`,
    `Clientes: ${nombreCliente(t.clientes)}`,
  ].join(' · ')
}
