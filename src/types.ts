/** Arquetipo de pregunta. Determina las anclas de nivel y el verbo de la recomendación. */
export type Arquetipo = 'A' | 'B' | 'C' | 'D' | 'E'

/** 0–4 en la escala de madurez, o 'NA' cuando el asunto no aplica. */
export type Valor = 0 | 1 | 2 | 3 | 4 | 'NA'

export interface Pregunta {
  id: string
  texto: string
  arquetipo: Arquetipo
  /** Peso dentro de su sección. Las preguntas de una sección suman 1.0. */
  peso: number
  /** Qué evidencia sustenta el nivel 3 en esta pregunta. */
  ancla?: string
  /** Acción concreta si esta pregunta resulta priorizada. */
  accion: string
}

export interface Seccion {
  id: string
  nombre?: string
  /** Peso dentro de su dimensión. Las secciones de una dimensión suman 1.0. */
  peso: number
  preguntas: Pregunta[]
  /** Si el tamizaje la desactiva, se marca N/A completa. */
  condicional?: 'requiereAreasDeVida'
}

export interface Dimension {
  id: string
  numero: string
  nombre: string
  abrev: string
  descripcion: string
  /** Peso fijo. En el Formato 01 lo define el sector, así que va indefinido. */
  peso?: number
  secciones: Seccion[]
  condicional?: 'requiereAreasDeVida'
}

export interface Formato {
  id: 'iso26000' | 'ley2173'
  codigo: string
  nombre: string
  norma: string
  naturaleza: string
  dimensiones: Dimension[]
}

export type Respuestas = Record<string, Valor>

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

export type Tamano = 'micro' | 'pequena' | 'mediana' | 'grande'

export interface Tamizaje {
  tamano: Tamano | ''
  empleados: string
  areasDeVida: 'si' | 'no' | 'nose' | ''
  cicloPrevio: 'si' | 'no' | ''
  comunidadesEtnicas: 'si' | 'no' | ''
  consumidorFinal: 'si' | 'no' | ''
}

/* ---------- resultados ---------- */

export interface NodoResultado {
  id: string
  nombre: string
  abrev: string
  /** 0–4, o null si todo el nodo quedó en N/A. */
  score: number | null
  /** Proporción del peso del nodo que sí fue evaluada. */
  cobertura: number
  pesoEfectivo: number
}

export interface HojaResultado {
  id: string
  texto: string
  arquetipo: Arquetipo
  accion: string
  ancla?: string
  dimension: string
  valor: Valor | undefined
  /** Peso de la pregunta dentro del formato completo. */
  pesoGlobal: number
}

export interface ResultadoFormato {
  formatoId: Formato['id']
  score: number | null
  cobertura: number
  techo: number
  concluyente: boolean
  dimensiones: NodoResultado[]
  hojas: HojaResultado[]
}

export interface Bandera {
  id: string
  titulo: string
  detalle: string
}

export interface Prioridad {
  orden: number
  origen: 'iso26000' | 'ley2173'
  etiquetaOrigen: string
  dimension: string
  verbo: string
  accion: string
  pregunta: string
  valor: number
  techo: number
  brecha: number
  critica: boolean
}
