import type { Dimension, Formato } from '../types'

/**
 * Las preguntas están redactadas a nivel de proceso y el acto legal
 * concreto queda como ancla del nivel 3. Así la escala 0–4 tiene sentido
 * sin perder la precisión jurídica que se pierde con un sí/no.
 */
export const DIMENSIONES_2173: Dimension[] = [
  {
    id: 'd1',
    numero: 'D1',
    nombre: 'Línea base y gobernanza de la obligación',
    abrev: 'Línea base',
    descripcion: 'Determinar a cuánto asciende la obligación y quién responde por ella.',
    peso: 0.15,
    secciones: [
      {
        id: 'd1s1',
        nombre: 'Determinación de la obligación',
        peso: 0.6,
        preguntas: [
          {
            id: '1.1', arquetipo: 'B', peso: 0.3,
            texto: '¿Cómo determina y actualiza su clasificación de tamaño empresarial según ingresos brutos en UVT?',
            ancla: 'Clasificación soportada en los estados financieros del último cierre.',
            accion: 'la clasificación de tamaño en UVT con soporte contable',
          },
          {
            id: '1.2', arquetipo: 'B', peso: 0.4,
            texto: '¿Cómo consolida y certifica el número de empleados con contrato vigente al 31 de diciembre?',
            ancla: 'Certificación firmada por el representante legal.',
            accion: 'la certificación de empleados firmada por el representante legal',
          },
          {
            id: '1.3', arquetipo: 'B', peso: 0.3,
            texto: '¿Cómo calcula la meta anual de individuos a sembrar?',
            ancla: 'Memoria de cálculo aprobada internamente.',
            accion: 'la memoria de cálculo de la meta anual de siembra',
          },
        ],
      },
      {
        id: 'd1s2',
        nombre: 'Responsabilidad interna',
        peso: 0.4,
        preguntas: [
          {
            id: '1.4', arquetipo: 'A', peso: 0.45,
            texto: '¿Cómo asigna la responsabilidad interna sobre esta obligación?',
            ancla: 'Designación formal con rol y autoridad definidos.',
            accion: 'la designación del responsable interno de la obligación',
          },
          {
            id: '1.5', arquetipo: 'A', peso: 0.55,
            texto: '¿Cómo incorpora la obligación en su matriz de requisitos legales y en el presupuesto anual?',
            ancla: 'Matriz legal vigente que la incluye.',
            accion: 'la inclusión de la obligación en matriz legal y presupuesto',
          },
        ],
      },
    ],
  },
  {
    id: 'd2',
    numero: 'D2',
    nombre: 'Habilitación territorial',
    abrev: 'Territorio',
    descripcion: 'Consultar, seleccionar y formalizar el Área de Vida donde se ejecutará.',
    peso: 0.2,
    secciones: [
      {
        id: 'd2s1',
        nombre: 'Consulta y disponibilidad',
        peso: 0.55,
        preguntas: [
          {
            id: '2.1', arquetipo: 'C', peso: 0.35,
            texto: '¿Cómo verifica la publicación oficial de Áreas de Vida en los municipios de su interés?',
            ancla: 'Constancia de consulta a fuente oficial.',
            accion: 'la verificación documentada de Áreas de Vida publicadas',
          },
          {
            id: '2.2', arquetipo: 'C', peso: 0.4,
            texto: '¿Cómo gestiona la consulta de disponibilidad y capacidad ante la autoridad municipal?',
            ancla: 'Número de radicado de la consulta.',
            accion: 'la consulta de disponibilidad ante la autoridad municipal',
          },
          {
            id: '2.3', arquetipo: 'C', peso: 0.25,
            texto: '¿Cómo archiva y hace seguimiento a las respuestas de la autoridad?',
            ancla: 'Oficio de respuesta archivado y trazable.',
            accion: 'el archivo y seguimiento de respuestas de la autoridad',
          },
        ],
      },
      {
        id: 'd2s2',
        nombre: 'Selección y formalización',
        peso: 0.45,
        condicional: 'requiereAreasDeVida',
        preguntas: [
          {
            id: '2.4', arquetipo: 'C', peso: 0.4,
            texto: '¿Cómo formaliza ante el municipio la elección del Área de Vida?',
            ancla: 'Comunicación radicada de elección del área.',
            accion: 'la comunicación formal de elección del Área de Vida',
          },
          {
            id: '2.5', arquetipo: 'C', peso: 0.3,
            texto: '¿Cómo verifica la inscripción del área en el REAA?',
            ancla: 'Consulta al REAA documentada.',
            accion: 'la verificación de inscripción del área en el REAA',
          },
          {
            id: '2.6', arquetipo: 'C', peso: 0.3,
            texto: '¿Cómo gestiona los acuerdos de conservación cuando el predio es privado o colectivo?',
            ancla: 'Acuerdo de conservación suscrito.',
            accion: 'el acuerdo de conservación con el titular del predio',
          },
        ],
      },
    ],
  },
  {
    id: 'd3',
    numero: 'D3',
    nombre: 'Programa de siembra',
    abrev: 'Programa',
    descripcion: 'El instrumento técnico, su presupuesto y su radicación ante la autoridad.',
    peso: 0.3,
    condicional: 'requiereAreasDeVida',
    secciones: [
      {
        id: 'd3s1',
        nombre: 'Contenido técnico',
        peso: 0.55,
        preguntas: [
          {
            id: '3.1', arquetipo: 'D', peso: 0.3,
            texto: '¿Cómo define las especies nativas a establecer y su pertinencia ecosistémica?',
            ancla: 'Listado con identificación taxonómica.',
            accion: 'el listado de especies nativas con identificación taxonómica',
          },
          {
            id: '3.2', arquetipo: 'D', peso: 0.25,
            texto: '¿Cómo define el área de intervención, la densidad y el arreglo de siembra?',
            ancla: 'Ficha técnica con cartografía del polígono.',
            accion: 'la ficha técnica de área, densidad y arreglo de siembra',
          },
          {
            id: '3.3', arquetipo: 'D', peso: 0.25,
            texto: '¿Cómo caracteriza ecológica y socioeconómicamente el Área de Vida?',
            ancla: 'Estudio de caracterización del área.',
            accion: 'la caracterización ecológica y socioeconómica del área',
          },
          {
            id: '3.4', arquetipo: 'D', peso: 0.2,
            texto: '¿Cómo construye el cronograma frente al calendario municipal y la ventana climática?',
            ancla: 'Cronograma alineado y aprobado.',
            accion: 'el cronograma alineado a la ventana climática del municipio',
          },
        ],
      },
      {
        id: 'd3s2',
        nombre: 'Recursos y trámite',
        peso: 0.45,
        preguntas: [
          {
            id: '3.5', arquetipo: 'D', peso: 0.4,
            texto: '¿Cómo presupuesta el ciclo completo, incluyendo mantenimiento y monitoreo a dos años?',
            ancla: 'Presupuesto plurianual aprobado.',
            accion: 'el presupuesto plurianual que cubre los dos años de permanencia',
          },
          {
            id: '3.6', arquetipo: 'D', peso: 0.3,
            texto: '¿Cómo selecciona operador y viveros con registro ICA vigente?',
            ancla: 'Registro ICA del vivero verificado.',
            accion: 'la selección de viveros con registro ICA vigente',
          },
          {
            id: '3.7', arquetipo: 'C', peso: 0.3,
            texto: '¿Cómo gestiona la radicación del programa y el seguimiento a su aprobación?',
            ancla: 'Radicado y acto de aprobación.',
            accion: 'la radicación del programa de siembra ante la autoridad',
          },
        ],
      },
    ],
  },
  {
    id: 'd4',
    numero: 'D4',
    nombre: 'Ejecución, permanencia y trazabilidad',
    abrev: 'Permanencia',
    descripcion: 'Sembrar es la mitad. Lo que valida el cumplimiento es que los árboles sigan vivos a dos años.',
    peso: 0.35,
    condicional: 'requiereAreasDeVida',
    secciones: [
      {
        id: 'd4s1',
        nombre: 'Ejecución',
        peso: 0.3,
        preguntas: [
          {
            id: '4.1', arquetipo: 'C', peso: 0.45,
            texto: '¿Cómo gestiona el aviso previo de inicio de actividades?',
            ancla: 'Comunicación radicada con diez días o más de antelación.',
            accion: 'el aviso previo de inicio con diez días de antelación',
          },
          {
            id: '4.2', arquetipo: 'E', peso: 0.55,
            texto: '¿Cómo verifica y documenta el origen del material vegetal?',
            ancla: 'Certificado ICA del vivero de origen.',
            accion: 'el certificado ICA que acredita el origen del material vegetal',
          },
        ],
      },
      {
        id: 'd4s2',
        nombre: 'Permanencia',
        peso: 0.45,
        preguntas: [
          {
            id: '4.3', arquetipo: 'D', peso: 0.35,
            texto: '¿Cómo planifica el mantenimiento de los dos años posteriores a la siembra?',
            ancla: 'Plan de mantenimiento documentado a 24 meses.',
            accion: 'el plan de mantenimiento a veinticuatro meses',
          },
          {
            id: '4.4', arquetipo: 'E', peso: 0.4,
            texto: '¿Cómo registra la supervivencia y gestiona la reposición de mortalidad?',
            ancla: 'Registro de supervivencia con reposiciones ejecutadas.',
            accion: 'el registro de supervivencia y la reposición de mortalidad',
          },
          {
            id: '4.5', arquetipo: 'E', peso: 0.25,
            texto: '¿Cómo monitorea con indicadores y periodicidad definida?',
            ancla: 'Protocolo de monitoreo aplicado con reportes.',
            accion: 'el protocolo de monitoreo con indicadores y periodicidad',
          },
        ],
      },
      {
        id: 'd4s3',
        nombre: 'Trazabilidad y certificación',
        peso: 0.25,
        preguntas: [
          {
            id: '4.6', arquetipo: 'E', peso: 0.35,
            texto: '¿Cómo construye el expediente documental de la siembra?',
            ancla: 'Expediente con geolocalización, fotografías y soportes.',
            accion: 'el expediente documental con geolocalización y soportes',
          },
          {
            id: '4.7', arquetipo: 'E', peso: 0.4,
            texto: '¿Cómo elabora el informe de cumplimiento y reporta al MADS?',
            ancla: 'Informe con identificación taxonómica remitido.',
            accion: 'el informe de cumplimiento con identificación taxonómica',
          },
          {
            id: '4.8', arquetipo: 'C', peso: 0.25,
            texto: '¿Cómo gestiona la solicitud del certificado «Siembra Vida Empresarial»?',
            ancla: 'Solicitud radicada o certificado obtenido.',
            accion: 'la solicitud del certificado Siembra Vida Empresarial',
          },
        ],
      },
    ],
  },
]

export const FORMATO_02: Formato = {
  id: 'ley2173',
  codigo: 'Formato 02',
  nombre: 'Áreas de Vida',
  norma: 'Ley 2173 de 2021',
  naturaleza: 'Obligación legal · verificable documentalmente',
  dimensiones: DIMENSIONES_2173,
}

/**
 * Banderas independientes del puntaje. Un promedio alto puede esconder
 * un riesgo que invalida el ciclo completo.
 */
export const REGLAS_BANDERA: {
  id: string
  titulo: string
  detalle: string
  evaluar: (v: (id: string) => number | null) => boolean
}[] = [
  {
    id: 'permanencia',
    titulo: 'Riesgo de invalidación por mortalidad',
    detalle:
      'Sin plan de mantenimiento ni registro de supervivencia, la plantación puede morir. Si eso ocurre, se pierde la inversión y el cumplimiento no se acredita.',
    evaluar: (v) => {
      const a = v('4.3'), b = v('4.4')
      return (a !== null && a <= 1) || (b !== null && b <= 1)
    },
  },
  {
    id: 'ica',
    titulo: 'Material vegetal sin trazabilidad ICA',
    detalle:
      'El informe de cumplimiento exige acreditar que el material provino de viveros con registro ICA vigente. Sin ese soporte, el informe puede ser rechazado.',
    evaluar: (v) => {
      const a = v('4.2')
      return a !== null && a <= 1
    },
  },
  {
    id: 'plazo',
    titulo: 'Programa aprobado sin ejecución iniciada',
    detalle:
      'Hay aprobación del programa pero no se ha iniciado la ejecución. El plazo de un año contado desde la aprobación ya está corriendo.',
    evaluar: (v) => {
      const a = v('3.7'), b = v('4.1')
      return a !== null && a >= 3 && b !== null && b === 0
    },
  },
  {
    id: 'base',
    titulo: 'Sin base de cálculo no hay meta',
    detalle:
      'No existe la certificación del número de empleados. Toda la ruta de cumplimiento queda sin sustento, porque la meta de siembra se deriva de ese dato.',
    evaluar: (v) => {
      const a = v('1.2')
      return a !== null && a === 0
    },
  },
]
