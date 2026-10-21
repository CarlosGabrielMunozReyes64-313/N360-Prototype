import type {
  Lugar, RangoIngresos, Tamano, Tamizaje, TipoCliente, Vecino, Vinculacion, Zona,
} from '../types'

/**
 * Tamizaje «Conozcamos su empresa» — Anexo 1 del protocolo, preguntas T1,
 * T2, T5 y T6. T3 y T4 (Áreas de Vida y ciclo previo, de la Ley 2173) se
 * retiraron: no forman parte del documento de referencia.
 *
 * La T5 original («¿En qué lugares desarrolla su actividad y qué
 * comunidades o vecinos están cerca de su operación?») se dividió en dos:
 * T5a (lugares) y T5b (comunidades o vecinos). Las dos guardan sus
 * opciones en la misma lista `zonas`; cada una tiene su texto libre
 * (`territorio` y `vecinos`).
 */
export const PREGUNTAS_TAMIZAJE = {
  T1: '¿Cómo describiría el tamaño de su empresa?',
  T1b: 'Rango de ingresos anuales, si lo conoce',
  T2: '¿Cuántas personas trabajan hoy con la empresa y cómo están vinculadas?',
  T5a: '¿En qué lugares desarrolla su actividad?',
  T5b: '¿Qué comunidades o vecinos están cerca de su operación?',
  T6: '¿Quiénes son principalmente sus clientes?',
} as const

/** Opción de selección con su explicación (se ve al pasar el mouse). */
export interface Opcion<T extends string> {
  id: T
  nombre: string
  ayuda: string
}

export const TAMANOS: Opcion<Tamano>[] = [
  {
    id: 'micro', nombre: 'Micro',
    ayuda: 'Negocio pequeño. Como referencia, suele tener hasta 10 personas trabajando.',
  },
  {
    id: 'pequena', nombre: 'Pequeña',
    ayuda: 'Como referencia, suele tener entre 11 y 50 personas trabajando.',
  },
  {
    id: 'mediana', nombre: 'Mediana',
    ayuda: 'Como referencia, suele tener entre 51 y 200 personas trabajando.',
  },
  {
    id: 'nose', nombre: 'No estoy seguro',
    ayuda: 'Elíjala si no conoce la clasificación oficial de su empresa. No hay problema: el tamaño solo se usa como referencia.',
  },
]

export const RANGOS_INGRESOS: { id: RangoIngresos; nombre: string }[] = [
  { id: 'menos_1000m', nombre: 'Menos de $1.000 millones' },
  { id: '1000m_10000m', nombre: 'Entre $1.000 y $10.000 millones' },
  { id: '10000m_50000m', nombre: 'Entre $10.000 y $50.000 millones' },
  { id: 'mas_50000m', nombre: 'Más de $50.000 millones' },
  { id: 'no_indica', nombre: 'Prefiero no indicarlo' },
]

export const VINCULACIONES: Opcion<Vinculacion>[] = [
  {
    id: 'laboral', nombre: 'Contrato laboral',
    ayuda: 'La persona es empleada de la empresa: tiene salario, horario, prestaciones sociales y afiliación a salud, pensión y ARL. Puede ser a término fijo o indefinido.',
  },
  {
    id: 'servicios', nombre: 'Prestación de servicios',
    ayuda: 'La persona trabaja de forma independiente: cobra honorarios por una tarea o un resultado, sin horario fijo, y paga su propia seguridad social.',
  },
  {
    id: 'socios', nombre: 'Socios o familiares que trabajan',
    ayuda: 'Dueños, socios o parientes que trabajan en la empresa, tengan o no un contrato o un pago fijo.',
  },
  {
    id: 'temporada', nombre: 'Personal por temporada',
    ayuda: 'Personas que se contratan solo en ciertas épocas, como la cosecha, diciembre o una obra, y luego terminan su vínculo.',
  },
  {
    id: 'otra', nombre: 'Otra forma',
    ayuda: 'Por ejemplo, aprendices del SENA, practicantes, personal de una empresa de servicios temporales o de una cooperativa. Puede contarlo en el campo de abajo.',
  },
]

/** T5a · lugares donde la empresa desarrolla su actividad. */
export const LUGARES: Opcion<Lugar>[] = [
  {
    id: 'barrios', nombre: 'Barrios',
    ayuda: 'Sectores dentro del casco urbano de una ciudad o un pueblo, donde hay calles, casas y comercio.',
  },
  {
    id: 'comercial', nombre: 'Centro o zona comercial',
    ayuda: 'Sector con muchos locales, oficinas y comercio, como el centro de la ciudad, una plaza de mercado o un centro comercial.',
  },
  {
    id: 'industrial', nombre: 'Zona industrial o de bodegas',
    ayuda: 'Sector destinado a fábricas, talleres, bodegas o parques industriales, por lo general separado de las viviendas.',
  },
  {
    id: 'veredas', nombre: 'Veredas',
    ayuda: 'División del área rural de un municipio. Agrupa fincas y casas del campo, fuera del casco urbano, y cada una tiene su propio nombre.',
  },
  {
    id: 'rural', nombre: 'Zonas rurales',
    ayuda: 'Áreas de campo fuera del casco urbano, como fincas, cultivos, bosques o corregimientos. Si conoce el nombre de la vereda, marque también «Veredas».',
  },
  {
    id: 'otras', nombre: 'Otros lugares',
    ayuda: 'Por ejemplo, varios municipios, rutas de transporte, ventas por internet o trabajos en el sitio de sus clientes. Puede escribirlo en el campo de abajo.',
  },
]

/** T5b · comunidades o vecinos cercanos a la operación. */
export const VECINOS: Opcion<Vecino>[] = [
  {
    id: 'viviendas', nombre: 'Viviendas o familias vecinas',
    ayuda: 'Casas, edificios o conjuntos residenciales cerca de su sede, planta, local o finca. Pueden notar el ruido, los olores, el polvo o el tránsito de la operación.',
  },
  {
    id: 'instituciones', nombre: 'Escuelas, centros de salud o iglesias',
    ayuda: 'Lugares donde se reúnen niños, estudiantes, pacientes o fieles. Son especialmente sensibles al ruido, al tránsito de vehículos y a los residuos.',
  },
  {
    id: 'campesinos', nombre: 'Fincas o familias campesinas',
    ayuda: 'Familias que viven y trabajan en el campo, con cultivos o animales, cerca de su operación. Pueden compartir con usted el agua, los caminos o el aire.',
  },
  {
    id: 'negocios', nombre: 'Otros negocios o empresas',
    ayuda: 'Tiendas, talleres, fábricas, restaurantes o cultivos de otras empresas que comparten la zona con usted.',
  },
  {
    id: 'indigenas', nombre: 'Comunidades indígenas',
    ayuda: 'Pueblos originarios con su propia cultura, lengua y autoridades, que pueden vivir en resguardos o estar organizados en cabildos. Tienen derechos especiales sobre su territorio, como la consulta previa.',
  },
  {
    id: 'afro', nombre: 'Comunidades afrodescendientes',
    ayuda: 'Comunidades negras, afrocolombianas, raizales o palenqueras. Muchas se organizan en consejos comunitarios y tienen territorios colectivos protegidos por la ley.',
  },
  {
    id: 'otros_vecinos', nombre: 'Otros vecinos',
    ayuda: 'Por ejemplo, una junta de acción comunal, una asociación de productores u otra organización de la zona. Puede escribirlo en el campo de abajo.',
  },
  {
    id: 'ninguno', nombre: 'No hay comunidades ni vecinos cerca',
    ayuda: 'Elíjala si su operación está aislada y nadie vive o trabaja cerca. Si marca otra opción de esta pregunta, esta se desmarca sola.',
  },
]

/** Todas las opciones de `zonas` (T5a + T5b), en el orden en que se muestran. */
export const ZONAS: Opcion<Zona>[] = [...LUGARES, ...VECINOS]

export const CLIENTES: Opcion<TipoCliente>[] = [
  {
    id: 'personas', nombre: 'Personas u hogares',
    ayuda: 'Le vende directamente a la gente para su uso personal o familiar (consumidor final), como una tienda, un restaurante o un taller de barrio.',
  },
  {
    id: 'empresas', nombre: 'Otras empresas',
    ayuda: 'Le vende a negocios que usan su producto o servicio para trabajar o para revender. Con esta opción no le haremos las preguntas de la materia Consumidores.',
  },
  {
    id: 'publicas', nombre: 'Entidades públicas',
    ayuda: 'Le vende al Estado: alcaldías, gobernaciones, hospitales o colegios oficiales u otras entidades, por lo general mediante contratos.',
  },
  {
    id: 'mezcla', nombre: 'Una mezcla',
    ayuda: 'Le vende tanto a personas u hogares como a empresas o entidades públicas.',
  },
]

export const TAMIZAJE_VACIO: Tamizaje = {
  tamano: '', ingresos: '', personas: '', vinculacion: [], vinculacionDetalle: '',
  zonas: [], territorio: '', vecinos: '', clientes: '', clientesDetalle: '',
}

const nombre = <T extends string>(lista: { id: T; nombre: string }[], id: T | '') =>
  lista.find((x) => x.id === id)?.nombre ?? '—'

const esLugar = (z: string): z is Lugar => LUGARES.some((x) => x.id === z)
const esVecino = (z: string): z is Vecino => VECINOS.some((x) => x.id === z)

/** Separa la lista `zonas` en las respuestas de T5a y de T5b. */
export function lugaresDe(z: readonly string[] | null | undefined): Lugar[] {
  return (z ?? []).filter(esLugar)
}
export function vecinosDe(z: readonly string[] | null | undefined): Vecino[] {
  return (z ?? []).filter(esVecino)
}

export const nombreTamano = (t: Tamano | '' | null | undefined) => nombre(TAMANOS, t ?? '')
export const nombreIngresos = (r: RangoIngresos | '' | null | undefined) => nombre(RANGOS_INGRESOS, r ?? '')
export const nombreCliente = (c: TipoCliente | '' | null | undefined) => nombre(CLIENTES, c ?? '')
export const nombresVinculacion = (v: readonly string[] | null | undefined) =>
  (v ?? []).map((x) => nombre(VINCULACIONES, x as Vinculacion)).join(', ') || '—'
/** Nombres de todas las opciones marcadas en T5a y T5b. */
export const nombresZonas = (z: readonly string[] | null | undefined) =>
  (z ?? []).map((x) => nombre(ZONAS, x as Zona)).join(', ') || '—'
export const nombresLugares = (z: readonly string[] | null | undefined) =>
  lugaresDe(z).map((x) => nombre(LUGARES, x)).join(', ') || '—'
export const nombresVecinos = (z: readonly string[] | null | undefined) =>
  vecinosDe(z).map((x) => nombre(VECINOS, x)).join(', ') || '—'

/** Opciones marcadas y texto libre en una sola línea (informes y listados). */
export function resumenLugares(z: readonly string[] | null | undefined, texto?: string | null): string {
  return [lugaresDe(z).length ? nombresLugares(z) : '', (texto ?? '').trim()].filter(Boolean).join('. ') || '—'
}
export function resumenVecinos(z: readonly string[] | null | undefined, texto?: string | null): string {
  return [vecinosDe(z).length ? nombresVecinos(z) : '', (texto ?? '').trim()].filter(Boolean).join('. ') || '—'
}

/**
 * Marca o desmarca una opción de T5b. «No hay comunidades ni vecinos
 * cerca» excluye a las demás opciones de T5b (no toca las de T5a).
 */
export function alternarVecino(zonas: readonly Zona[], v: Vecino): Zona[] {
  if (zonas.includes(v)) return zonas.filter((x) => x !== v)
  const sinConflicto = zonas.filter((x) =>
    v === 'ninguno' ? !esVecino(x) : x !== 'ninguno')
  return [...sinConflicto, v]
}

export function personasValidas(t: Tamizaje): boolean {
  const n = Number(t.personas)
  return t.personas !== '' && Number.isInteger(n) && n > 0
}

/** T5a respondida: un lugar marcado o el texto. */
export function lugaresRespondidos(t: Tamizaje): boolean {
  return lugaresDe(t.zonas).length > 0 || Boolean(t.territorio.trim())
}

/** T5b respondida: una opción marcada (incluida «No hay comunidades ni
 * vecinos cerca») o el texto. */
export function vecinosRespondidos(t: Tamizaje): boolean {
  return vecinosDe(t.zonas).length > 0 || Boolean(t.vecinos.trim())
}

/** Obligatorio: T1 tamaño, T2 número y vinculación, T5a un lugar o el
 * texto, T5b una opción o el texto, T6 tipo de clientes. Los detalles y el
 * rango de ingresos son opcionales. */
export function tamizajeCompleto(t: Tamizaje | null | undefined): t is Tamizaje {
  if (!t) return false
  return Boolean(
    t.tamano && personasValidas(t) && t.vinculacion.length > 0 &&
    lugaresRespondidos(t) && vecinosRespondidos(t) && t.clientes,
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
