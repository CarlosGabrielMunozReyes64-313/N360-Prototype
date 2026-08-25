import type { Dimension, Formato, SectorId } from '../types'

/**
 * Cada materia lleva una tríada fija: estructura (A), instrumento (D)
 * y ejecución medible (E). Así una empresa con políticas impecables y
 * cero acción no puede pasar de ~1.2.
 */
const P = [0.3, 0.35, 0.35]

function materia(
  numero: string,
  id: string,
  nombre: string,
  abrev: string,
  descripcion: string,
  qs: [string, string, string],
  acciones: [string, string, string],
): Dimension {
  const arqs = ['A', 'D', 'E'] as const
  return {
    id,
    numero,
    nombre,
    abrev,
    descripcion,
    secciones: [
      {
        id: `${id}-s`,
        peso: 1,
        preguntas: qs.map((texto, i) => ({
          id: `${id}.${'abc'[i]}`,
          texto,
          arquetipo: arqs[i],
          peso: P[i],
          accion: acciones[i],
        })),
      },
    ],
  }
}

export const MATERIAS: Dimension[] = [
  materia(
    '01', 'gobernanza', 'Gobernanza Organizacional', 'Gobernanza',
    'Los procesos y estructuras de decisión que permiten crear y aplicar políticas de responsabilidad social.',
    [
      '¿Cómo se define y aprueba la orientación de la organización en responsabilidad social?',
      '¿Cómo están asignados los roles, las responsabilidades y los recursos para la gestión de RSE?',
      '¿Cómo rinde cuentas la organización ante sus grupos de interés sobre su desempeño en RSE?',
    ],
    [
      'una política de RSE aprobada por la alta dirección',
      'el mapa de roles, responsabilidades y presupuesto de RSE',
      'un reporte periódico de desempeño hacia los grupos de interés',
    ],
  ),
  materia(
    '02', 'ddhh', 'Derechos Humanos', 'DD. HH.',
    'Debida diligencia, situaciones de riesgo, no discriminación y derechos civiles, políticos, económicos, sociales y culturales.',
    [
      '¿Cómo aborda la organización su compromiso con los derechos humanos?',
      '¿Cómo identifica y evalúa los riesgos de derechos humanos en sus operaciones y en su cadena de valor?',
      '¿Cómo atiende y resuelve las reclamaciones de personas o comunidades afectadas?',
    ],
    [
      'una declaración de compromiso en derechos humanos',
      'la matriz de debida diligencia sobre operaciones y proveedores',
      'un mecanismo de reclamación accesible con tiempos de respuesta medidos',
    ],
  ),
  materia(
    '03', 'laborales', 'Prácticas Laborales', 'Laboral',
    'Empleo y relaciones laborales, condiciones de trabajo, protección social, diálogo social, salud y seguridad, desarrollo humano.',
    [
      '¿Cómo están formalizadas las condiciones de empleo y los canales de diálogo con los trabajadores?',
      '¿Cómo gestiona la seguridad y salud en el trabajo?',
      '¿Cómo desarrolla las competencias de sus trabajadores y verifica el resultado de esa formación?',
    ],
    [
      'las condiciones de empleo y los canales de diálogo con los trabajadores',
      'el sistema de gestión de seguridad y salud en el trabajo',
      'el plan de formación con medición de resultado, no solo de asistencia',
    ],
  ),
  materia(
    '04', 'ambiente', 'Medio Ambiente', 'Ambiental',
    'Prevención de la contaminación, uso sostenible de recursos, mitigación del cambio climático y protección del entorno.',
    [
      '¿Cómo define la organización sus compromisos y metas ambientales?',
      '¿Cómo gestiona el uso de recursos (agua, energía, materiales) y la generación de residuos?',
      '¿Cómo mide su desempeño ambiental y actúa sobre los resultados obtenidos?',
    ],
    [
      'las metas ambientales con horizonte y responsable',
      'el programa de uso de recursos y manejo de residuos',
      'los indicadores ambientales y el ciclo de acción sobre los resultados',
    ],
  ),
  materia(
    '05', 'practicas', 'Prácticas Justas de Operación', 'Op. Justas',
    'Anticorrupción, participación política responsable, competencia justa, promoción de la RSE en la cadena de valor.',
    [
      '¿Cómo previene la corrupción y los conflictos de intereses?',
      '¿Cómo integra criterios de responsabilidad social en la selección y evaluación de proveedores?',
      '¿Cómo verifica el cumplimiento de sus lineamientos de competencia justa y de relación con el Estado?',
    ],
    [
      'la política anticorrupción y de conflicto de intereses',
      'los criterios de RSE en selección y evaluación de proveedores',
      'la verificación periódica de competencia justa y relación con el Estado',
    ],
  ),
  materia(
    '06', 'consumidores', 'Asuntos de Consumidores', 'Consumo',
    'Prácticas justas de mercadeo, protección de la salud y seguridad, consumo sostenible, privacidad de datos.',
    [
      '¿Cómo define sus compromisos frente a clientes en información, calidad y seguridad?',
      '¿Cómo protege los datos personales de sus clientes?',
      '¿Cómo atiende, registra y resuelve las peticiones, quejas y reclamos?',
    ],
    [
      'los compromisos de información, calidad y seguridad al cliente',
      'la política de tratamiento de datos personales',
      'el registro y la resolución medida de peticiones, quejas y reclamos',
    ],
  ),
  materia(
    '07', 'comunidad', 'Participación Activa y Desarrollo de la Comunidad', 'Comunidad',
    'Involucramiento, educación, generación de empleo, desarrollo tecnológico e inversión social en el territorio.',
    [
      '¿Cómo define su relacionamiento con las comunidades del territorio donde opera?',
      '¿Cómo planifica su inversión social y bajo qué criterios?',
      '¿Cómo mide el resultado de sus iniciativas en el territorio?',
    ],
    [
      'la estrategia de relacionamiento con las comunidades del territorio',
      'los criterios y el plan de inversión social',
      'la medición de resultado de las iniciativas territoriales',
    ],
  ),
]

export const FORMATO_01: Formato = {
  id: 'iso26000',
  codigo: 'Formato 01',
  nombre: 'Madurez en Responsabilidad Social',
  norma: 'ISO 26000:2010',
  naturaleza: 'Estándar voluntario · autoevaluación',
  dimensiones: MATERIAS,
}

export const SECTORES: { id: SectorId; nombre: string }[] = [
  { id: 'industrial', nombre: 'Industrial' },
  { id: 'servicios', nombre: 'Servicios' },
  { id: 'agroindustrial', nombre: 'Agroindustrial' },
  { id: 'comercio', nombre: 'Comercio' },
  { id: 'energia', nombre: 'Energía / Combustibles' },
  { id: 'movilidad', nombre: 'Movilidad' },
]

/**
 * ISO 26000 no jerarquiza las siete materias: la materialidad es propia de
 * cada organización. Esta tabla es un juicio de materialidad sectorial y
 * debe poder ajustarse desde administración. Cada columna suma 1.00.
 */
export const PESOS_SECTOR: Record<SectorId, Record<string, number>> = {
  industrial:    { gobernanza: 0.14, ddhh: 0.12, laborales: 0.18, ambiente: 0.22, practicas: 0.14, consumidores: 0.08, comunidad: 0.12 },
  servicios:     { gobernanza: 0.16, ddhh: 0.12, laborales: 0.20, ambiente: 0.10, practicas: 0.16, consumidores: 0.16, comunidad: 0.10 },
  agroindustrial:{ gobernanza: 0.12, ddhh: 0.14, laborales: 0.16, ambiente: 0.22, practicas: 0.10, consumidores: 0.08, comunidad: 0.18 },
  comercio:      { gobernanza: 0.14, ddhh: 0.10, laborales: 0.16, ambiente: 0.12, practicas: 0.16, consumidores: 0.22, comunidad: 0.10 },
  energia:       { gobernanza: 0.14, ddhh: 0.14, laborales: 0.16, ambiente: 0.22, practicas: 0.12, consumidores: 0.06, comunidad: 0.16 },
  movilidad:     { gobernanza: 0.14, ddhh: 0.12, laborales: 0.18, ambiente: 0.18, practicas: 0.12, consumidores: 0.16, comunidad: 0.10 },
}
