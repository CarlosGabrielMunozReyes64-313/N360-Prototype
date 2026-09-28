import type { Etapa, Nivel, Verbo } from '../types'

/**
 * «¿En qué punto está?» — tabla de la sección 6.3 del protocolo. La
 * empresa ve la etiqueta en lenguaje sencillo; la conversión a 0–4 es
 * interna y solo se usa para el análisis. A la empresa NO se le muestra
 * un puntaje de cumplimiento.
 */
export const ETAPAS: { valor: Etapa; etiqueta: string; corta: string; ayuda?: string }[] = [
  { valor: 0, etiqueta: 'Aún no lo hemos abordado', corta: 'Aún no abordado' },
  { valor: 1, etiqueta: 'Estamos comenzando / Lo hacemos de manera informal', corta: 'Comenzando' },
  { valor: 2, etiqueta: 'Lo tenemos organizado: hay acuerdos y alguien a cargo, esté o no por escrito', corta: 'Organizado' },
  { valor: 3, etiqueta: 'Lo aplicamos y vemos resultados', corta: 'Con resultados' },
  { valor: 4, etiqueta: 'Lo revisamos y mejoramos con lo aprendido', corta: 'En mejora continua' },
  {
    valor: 'diferente', etiqueta: 'Hacemos algo diferente', corta: 'Algo diferente',
    ayuda: 'Cuéntenos qué hacen: el equipo NEXUS lo ubicará a partir de su respuesta.',
  },
  {
    valor: 'NA', etiqueta: 'No aplica a nuestra empresa', corta: 'No aplica',
    ayuda: 'Sale del análisis: no cuenta como un cero.',
  },
]

export function etiquetaEtapa(e: Etapa | null | undefined, corta = false): string {
  if (e === null || e === undefined) return 'Sin responder'
  const f = ETAPAS.find((x) => x.valor === e)
  return f ? (corta ? f.corta : f.etiqueta) : String(e)
}

/** Color por etapa 0–4. Progresa de neutro a verde profundo. */
export const COLOR_NIVEL = ['#8a9c94', '#c5881e', '#025873', '#04a97a', '#024029']

/**
 * Bandas para promedios (materias, estadísticas). Mismos cortes y colores
 * que engine/graficas.ts (NIVELES); los nombres salen de las etapas.
 */
export function clasificar(score: number): { etiqueta: string; color: string } {
  if (score < 1.5) return { etiqueta: 'Comenzando', color: '#a8322a' }
  if (score < 2.5) return { etiqueta: 'Organizado', color: '#c5881e' }
  if (score < 3.5) return { etiqueta: 'Con resultados', color: '#025873' }
  return { etiqueta: 'En mejora continua', color: '#04a97a' }
}

/**
 * Verbo de la oportunidad según la etapa de partida — la pregunta
 * orientadora de la matriz: «¿Qué se puede fortalecer, formalizar,
 * ampliar o empezar?».
 */
export const VERBO_ETAPA: Record<Exclude<Nivel, 4>, Verbo> = {
  0: 'Empezar',
  1: 'Formalizar',
  2: 'Fortalecer',
  3: 'Ampliar',
}

/** Cómo se muestra cada categoría del mapa de prácticas. */
export const CATEGORIAS = {
  fortaleza: { nombre: 'Fortaleza', plural: 'Fortalezas', color: '#04a97a', fondo: '#e6f6f0' },
  desarrollo: { nombre: 'En desarrollo', plural: 'En desarrollo', color: '#025873', fondo: '#e6f0f4' },
  oportunidad: { nombre: 'Oportunidad', plural: 'Oportunidades', color: '#b05a00', fondo: '#fbf1e6' },
  diferente: { nombre: 'Práctica propia', plural: 'Prácticas propias', color: '#5b4fa0', fondo: '#efedf7' },
  pendiente: { nombre: 'Sin responder', plural: 'Sin responder', color: '#6b7a74', fondo: '#f1f4f2' },
  na: { nombre: 'No aplica', plural: 'No aplica', color: '#6b7a74', fondo: '#f1f4f2' },
} as const
