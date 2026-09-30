/* =====================================================================
 * Modelo de dominio · Autodiagnóstico RSE Express
 * (Protocolo de Validación NEXUS RSE Express + RSE por Retos, v2)
 * ===================================================================== */

/** Tríada interna por materia (sección 6.2 del protocolo): A estructura
 * («¿quién lo impulsa?»), D instrumento («¿cómo lo hacen?») y E ejecución
 * («¿cómo saben que funciona?»). Solo se usa para el análisis interno. */
export type Arquetipo = 'A' | 'D' | 'E'

/** Lectura interna 0–4 de la etapa (tabla de la sección 6.3). */
export type Nivel = 0 | 1 | 2 | 3 | 4

/** «¿En qué punto está?»: una etapa 0–4, «Hacemos algo diferente» o
 * «No aplica a nuestra empresa». */
export type Etapa = Nivel | 'diferente' | 'NA'

export type MateriaId =
  | 'gobernanza' | 'ddhh' | 'laborales' | 'ambiente' | 'practicas' | 'consumidores' | 'comunidad'

export interface Pregunta {
  /** Código del Anexo 1: '01a' … '07c'. */
  id: string
  /** Pregunta principal abierta. */
  texto: string
  /** Ejemplos orientadores: ayudan a recordar, no limitan la respuesta. */
  ejemplos: string[]
  /** Para qué se pregunta (lo lee NEXUS, no la empresa). */
  proposito: string
  arquetipo: Arquetipo
  /** Peso dentro de su materia (las tres suman 1.0). Solo análisis interno. */
  peso: number
  /** Oportunidad que se propone a la matriz de priorización. */
  oportunidad: string
  /** Dos o tres alternativas concretas para la conversación con NEXUS. */
  alternativas: string[]
  /** Tema con implicaciones legales: genera alerta informativa, no sanción. */
  alertaLegal?: 'sst' | 'datos'
}

export interface Materia {
  id: MateriaId
  numero: string
  nombre: string
  abrev: string
  descripcion: string
  /** «¿Qué le gustaría fortalecer o empezar a hacer en este tema?» */
  cierre: string
  preguntas: Pregunta[]
  /** Consumidores solo aplica si vende a personas u hogares (T6). */
  condicional?: 'soloConsumidorFinal'
}

export interface Instrumento {
  id: 'rse_express'
  codigo: string
  nombre: string
  norma: string
  naturaleza: string
  /** Pregunta abierta al final del formulario. */
  preguntaFinal: string
  materias: Materia[]
}

/* ---------------------------------------------------------- respuestas */

export interface RespuestaPregunta {
  /** Respuesta abierta principal. */
  texto: string
  /** Ejemplos orientadores marcados. */
  ejemplos: string[]
  /** «Hacemos algo diferente: ___» */
  otro: string
  etapa: Etapa | null
  /** Clasificación 0–4 que NEXUS asignó a una respuesta «Hacemos algo
   * diferente». La empresa no la escribe; llega del backend. */
  clasificada?: Nivel | null
}

export interface Diagnostico {
  respuestas: Record<string, RespuestaPregunta>
  /** «¿Qué le gustaría fortalecer?» por materia, con clave = número ('01'…'07'). */
  fortalecer: Record<string, string>
  /** Pregunta abierta final. */
  comentarioFinal: string
}

/* ------------------------------------------------ matriz de priorización */

export type Puntaje = 1 | 2 | 3

/** Una fila de la matriz (sección 7): cuatro criterios de 1 a 3. */
export interface Calificacion {
  importancia: Puntaje | null
  viabilidad: Puntaje | null
  potencial: Puntaje | null
  interes: Puntaje | null
}

export interface Priorizacion {
  /** Clave = código de la pregunta de donde sale la oportunidad. */
  filas: Record<string, Calificacion>
  /** Oportunidad que la empresa eligió para convertir en reto. */
  elegida: string | null
}

/* ------------------------------------------------------ perfil y tamizaje */

export interface Perfil {
  razonSocial: string
  nit: string
  dv: string
  sector: SectorId | ''
  municipio: string
  departamento: string
  extranjera: boolean
}

export type SectorId =
  | 'industrial'
  | 'servicios'
  | 'agroindustrial'
  | 'comercio'
  | 'energia'
  | 'movilidad'

/** T1 · ¿Cómo describiría el tamaño de su empresa? */
export type Tamano = 'micro' | 'pequena' | 'mediana' | 'nose'
/** T1 (opcional) · rango de ingresos anuales. */
export type RangoIngresos = 'menos_1000m' | '1000m_10000m' | '10000m_50000m' | 'mas_50000m' | 'no_indica'
/** T2 · cómo están vinculadas las personas. */
export type Vinculacion = 'laboral' | 'servicios' | 'socios' | 'temporada' | 'otra'
/** T5 · lugares y comunidades cercanas. */
export type Zona = 'barrios' | 'veredas' | 'rural' | 'indigenas' | 'afro' | 'otras'
/** T6 · ¿Quiénes son principalmente sus clientes? */
export type TipoCliente = 'personas' | 'empresas' | 'publicas' | 'mezcla'

/** Tamizaje «Conozcamos su empresa» (T1, T2, T5 y T6 del Anexo 1). */
export interface Tamizaje {
  tamano: Tamano | ''
  ingresos: RangoIngresos | ''
  personas: string
  vinculacion: Vinculacion[]
  vinculacionDetalle: string
  zonas: Zona[]
  territorio: string
  clientes: TipoCliente | ''
  clientesDetalle: string
}

/* ------------------------------------------------------------ resultados */

/** Resultado interno de una materia (lectura 0–4; uso de NEXUS). */
export interface NodoResultado {
  id: MateriaId
  numero: string
  nombre: string
  abrev: string
  /** Promedio ponderado 0–4, o null si la materia no tiene datos. */
  score: number | null
  /** Proporción del peso de la materia que sí se pudo leer. */
  cobertura: number
  pesoEfectivo: number
  /** false si el tamizaje la dejó fuera (Consumidores con T6). */
  aplica: boolean
}

export interface HojaResultado {
  id: string
  materiaId: MateriaId
  materia: string
  texto: string
  etapa: Etapa | null
  /** Lectura interna usada en el cálculo (la etapa o la clasificación de NEXUS). */
  valor: Nivel | null
  pesoGlobal: number
  /** true si la materia no aplica por el tamizaje. */
  fueraDeAlcance: boolean
}

export interface ResultadoRSE {
  score: number | null
  cobertura: number
  concluyente: boolean
  materias: NodoResultado[]
  hojas: HojaResultado[]
  /** Respuestas «Hacemos algo diferente» que NEXUS aún no clasifica. */
  pendientes: number
}

export type Categoria = 'fortaleza' | 'desarrollo' | 'oportunidad' | 'diferente' | 'na' | 'pendiente'

export interface PracticaMapa {
  pregunta: Pregunta
  respuesta: RespuestaPregunta | null
  categoria: Categoria
  /** Resumen de lo que la empresa hace hoy, en sus palabras. */
  haceHoy: string
}

export interface MateriaMapa {
  materia: Materia
  aplica: boolean
  /** Lectura interna 0–4 de la materia (para el radar), o null. */
  score: number | null
  categoria: Exclude<Categoria, 'diferente'>
  practicas: PracticaMapa[]
  fortalecer: string
}

export type Verbo = 'Empezar' | 'Formalizar' | 'Fortalecer' | 'Ampliar'

/** Fila pre-diligenciada de la matriz de priorización. */
export interface Oportunidad {
  clave: string
  materia: Materia
  pregunta: Pregunta
  /** Lo que la empresa hace hoy (práctica de base). */
  haceHoy: string
  verbo: Verbo
  /** Oportunidad identificada. */
  oportunidad: string
  alternativas: string[]
  /** Lo que escribió en «¿Qué le gustaría fortalecer?» para esa materia. */
  fortalecer: string
  /** Sugerencia para «Interés de la empresa» (3 si escribió qué fortalecer). */
  interesSugerido: Puntaje | null
  alertaLegal?: 'sst' | 'datos'
}

export interface Alerta {
  id: 'ley2173' | 'sst' | 'datos' | 'territorio'
  titulo: string
  detalle: string
}

/* ------------------------------------------------ análisis inteligente (IA) */

/**
 * Interpretación de los resultados generada con Gemini en el backend (capa
 * 2). No trae puntajes: los niveles, categorías y prioridades siguen siendo
 * los que calcula engine/scoring.ts (capa 1), y la IA no puede cambiarlos.
 */
export type PrioridadIA = 'alta' | 'media' | 'baja'

export interface RecomendacionIA {
  titulo: string
  descripcion: string
  prioridad: PrioridadIA
  justificacion: string
  /** Número de la materia ('01'…'07') o 'general' si es transversal. */
  materia: string
}

export interface AccionIA {
  accion: string
  objetivo: string
  horizonte: string
  prioridad: PrioridadIA
}

export interface AnalisisIA {
  resumen: string
  fortalezas: string[]
  areasOportunidad: string[]
  prioridades: string[]
  recomendaciones: RecomendacionIA[]
  accionesCortoPlazo: AccionIA[]
  accionesMedianoPlazo: AccionIA[]
  conclusion: string
}

export interface AnalisisIAGuardado {
  analisis: AnalisisIA
  /** ISO 8601. */
  generadoEn: string
  modelo: string
  /** true si el backend devolvió un análisis ya guardado (sin llamar a Gemini). */
  reutilizado: boolean
}
