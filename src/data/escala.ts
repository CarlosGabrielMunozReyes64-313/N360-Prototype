import type { Arquetipo } from '../types'

export const NIVELES = [
  { valor: 0, etiqueta: 'Sin gestión' },
  { valor: 1, etiqueta: 'Informal' },
  { valor: 2, etiqueta: 'Planificado' },
  { valor: 3, etiqueta: 'Implementado y medido' },
  { valor: 4, etiqueta: 'Mejora continua' },
] as const

/** Color por nivel. Progresa de neutro a verde profundo. */
export const COLOR_NIVEL = ['#9fb3aa', '#d99521', '#025873', '#04a97a', '#024029']

/**
 * Anclas por arquetipo. Sin esto, dos personas de la misma empresa
 * responden distinto la misma pregunta.
 */
export const ANCLAS: Record<Arquetipo, string[]> = {
  A: [
    'No existe.',
    'Existe una práctica o criterio de hecho, no escrito ni aprobado.',
    'Documentado y aprobado formalmente, con responsable identificado.',
    'Aplicado en decisiones reales, con evidencia de uso y seguimiento.',
    'Se revisa periódicamente y se ajusta con base en resultados.',
  ],
  B: [
    'El dato no existe ni se ha intentado calcular.',
    'Hay una estimación aproximada, sin metodología ni fuente trazable.',
    'Metodología de cálculo definida y documentada, pendiente de consolidar.',
    'Dato calculado, certificado o firmado, con fuente verificable.',
    'Se recalcula cada ciclo con control de consistencia entre periodos.',
  ],
  C: [
    'No se ha iniciado ni identificado el trámite.',
    'Se ha indagado de manera informal: llamada, correo sin radicar, conversación.',
    'Documentación preparada y responsable asignado, pendiente de radicar.',
    'Radicado, con número de radicado y respuesta o constancia archivada.',
    'Ejecutado en ciclos sucesivos, con control de plazos y alertas anticipadas.',
  ],
  D: [
    'El instrumento no existe.',
    'Hay borradores parciales o criterios sueltos sin consolidar.',
    'Instrumento completo según los contenidos exigidos, no aprobado ni aplicado.',
    'Aprobado y en aplicación, con seguimiento de su ejecución.',
    'Actualizado con base en los resultados del ciclo anterior.',
  ],
  E: [
    'No hay ejecución ni registro.',
    'Se ejecutó algo, sin registro sistemático ni soportes recuperables.',
    'Protocolo de registro definido, ejecución iniciada o parcial.',
    'Ejecutado con registro completo, trazable e indicador reportado.',
    'Serie histórica de al menos dos ciclos, con acciones correctivas documentadas.',
  ],
}

export const NOMBRE_ARQUETIPO: Record<Arquetipo, string> = {
  A: 'Estructura',
  B: 'Línea base',
  C: 'Trámite',
  D: 'Instrumento',
  E: 'Ejecución',
}

/** El verbo de la recomendación sale del arquetipo, no de una plantilla única. */
export const VERBO: Record<Arquetipo, string> = {
  A: 'Formalizar',
  B: 'Calcular y certificar',
  C: 'Radicar',
  D: 'Formular',
  E: 'Ejecutar y registrar',
}

export function clasificar(score: number): { etiqueta: string; color: string } {
  if (score < 1.5) return { etiqueta: 'Sin gestión', color: '#a8322a' }
  if (score < 2.5) return { etiqueta: 'Informal', color: '#d99521' }
  if (score < 3.5) return { etiqueta: 'Planificado', color: '#025873' }
  return { etiqueta: 'Consolidado', color: '#04a97a' }
}
