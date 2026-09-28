// Archivo GENERADO a partir del catálogo del Anexo 1 del «Protocolo de
// Validación NEXUS RSE Express + RSE por Retos» (v2, septiembre de 2026).
// El mismo catálogo genera db/009_rse_express.sql en el backend: si cambia
// una pregunta, hay que cambiarla en los dos lados (mismo código, mismo peso).
//
// Estructura de cada pregunta (sección 6.3 del protocolo):
//   - texto:       pregunta principal abierta (texto libre)
//   - ejemplos:    ejemplos orientadores, selección múltiple opcional
//                  (+ «Hacemos algo diferente: ___», que es un campo aparte)
//   - etapa:       «¿En qué punto está?», selección única (ver data/escala.ts)
//   - proposito:   para qué se pregunta (uso interno de NEXUS)
//   - arquetipo / peso: la tríada interna A (estructura), D (instrumento) y
//                  E (ejecución). Solo se usa para el análisis interno.
//   - oportunidad / alternativas: insumo inicial para la matriz de
//                  priorización. Son sugerencias para la conversación con
//                  NEXUS, no recomendaciones validadas.
import type { Instrumento, Materia, MateriaId, SectorId } from '../types'

export const MATERIAS: Materia[] = [
  {
    "id": "gobernanza",
    "numero": "01",
    "nombre": "Gobernanza organizacional",
    "abrev": "Gobernanza",
    "descripcion": "Cómo se toman las decisiones en la empresa y quién impulsa lo que hace por sus trabajadores, clientes, el ambiente y la comunidad.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer en este tema?",
    "preguntas": [
      {
        "id": "01a",
        "texto": "Más allá de su actividad comercial, ¿qué hace hoy la empresa por sus trabajadores, clientes, el ambiente o la comunidad, y quién impulsa esas acciones?",
        "ejemplos": [
          "Lo decide la gerencia o el dueño",
          "Acuerdos entre socios",
          "Forma parte de los valores de la empresa",
          "Política escrita"
        ],
        "proposito": "Conocer si existe un compromiso de la dirección, formal o no, y quién lo sostiene.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "dejar claro qué quiere impulsar la empresa en estos temas y quién lo lidera",
        "alternativas": [
          "Conversar entre gerencia y socios qué acciones sociales y ambientales quieren sostener, y dejarlo en una página",
          "Nombrar a una persona que impulse estas acciones y revise su avance cada trimestre",
          "Incluir estos temas en los valores de la empresa y compartirlos con el equipo"
        ]
      },
      {
        "id": "01b",
        "texto": "¿Quién se encarga de estas acciones y cómo consiguen el tiempo y los recursos para hacerlas?",
        "ejemplos": [
          "Lo asume el gerente",
          "Una persona encargada",
          "Se hace con recursos del momento",
          "Hay un monto destinado"
        ],
        "proposito": "Conocer quién lleva el tema y con qué recursos cuenta.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "asignar un responsable y reservar tiempo y recursos para estas acciones",
        "alternativas": [
          "Definir un responsable con unas horas al mes para estos temas",
          "Reservar un monto pequeño y fijo del presupuesto para estas acciones",
          "Organizar las acciones en un calendario anual sencillo"
        ]
      },
      {
        "id": "01c",
        "texto": "¿Cómo le cuenta la empresa a sus trabajadores, clientes, socios o comunidad lo que hace en estos temas?",
        "ejemplos": [
          "Conversaciones",
          "Reuniones",
          "Redes sociales",
          "Carteleras",
          "Informe o balance"
        ],
        "proposito": "Conocer cómo comunica y comparte lo que hace.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "contar de forma periódica lo que la empresa hace y lo que ha logrado",
        "alternativas": [
          "Compartir cada semestre un resumen corto en una reunión con el equipo",
          "Publicar en redes o en cartelera las acciones realizadas, con fotos y cifras sencillas",
          "Preparar un balance anual de una o dos páginas para socios y clientes"
        ]
      }
    ]
  },
  {
    "id": "ddhh",
    "numero": "02",
    "nombre": "Derechos humanos",
    "abrev": "DD. HH.",
    "descripcion": "El trato respetuoso y digno a las personas con las que se relaciona la empresa: equipo, proveedores, clientes y vecinos.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer en este tema?",
    "preguntas": [
      {
        "id": "02a",
        "texto": "¿Cómo se asegura la empresa de que las personas con las que se relaciona (equipo, proveedores, clientes, vecinos) sean tratadas con respeto y dignidad?",
        "ejemplos": [
          "Trato respetuoso",
          "No discriminación",
          "No contratar menores de edad",
          "Inclusión de personas",
          "Reglas de convivencia"
        ],
        "proposito": "Conocer las prácticas de respeto a las personas como base de derechos humanos.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "acordar reglas claras de respeto, no discriminación e inclusión",
        "alternativas": [
          "Escribir unas reglas de convivencia cortas y compartirlas con todo el equipo",
          "Revisar que la forma de contratar no excluya a nadie por edad, género u origen",
          "Abrir oportunidades de empleo a personas con discapacidad o de poblaciones vulnerables"
        ]
      },
      {
        "id": "02b",
        "texto": "¿Han identificado situaciones, en la empresa o con sus proveedores, que puedan afectar a las personas? ¿Qué hacen cuando las detectan?",
        "ejemplos": [
          "Condiciones inseguras",
          "Jornadas excesivas",
          "Trabajo infantil",
          "Discriminación"
        ],
        "proposito": "Conocer cómo la empresa detecta y atiende situaciones de riesgo, dentro y fuera.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "identificar a tiempo situaciones que puedan afectar a las personas, dentro de la empresa y con proveedores",
        "alternativas": [
          "Hacer una revisión sencilla, una vez al año, de situaciones de riesgo en la empresa y con los principales proveedores",
          "Pedir a los proveedores clave un compromiso de no trabajo infantil y de condiciones dignas",
          "Definir qué hacer y a quién avisar cuando se detecta una situación de riesgo"
        ]
      },
      {
        "id": "02c",
        "texto": "Si una persona o un vecino se siente afectado por la empresa, ¿cómo se entera la empresa y qué hace para responder?",
        "ejemplos": [
          "Habla directamente con el dueño",
          "Línea o WhatsApp",
          "Buzón",
          "Reunión",
          "Procedimiento escrito"
        ],
        "proposito": "Conocer los canales reales de escucha y respuesta.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "tener un canal conocido para recibir inquietudes y responderlas a tiempo",
        "alternativas": [
          "Habilitar un WhatsApp o un buzón para inquietudes y darlo a conocer",
          "Llevar un registro sencillo de las inquietudes recibidas y de la respuesta dada",
          "Fijar un plazo de respuesta y revisar cada mes si se cumple"
        ]
      }
    ]
  },
  {
    "id": "laborales",
    "numero": "03",
    "nombre": "Prácticas laborales",
    "abrev": "Laboral",
    "descripcion": "Las condiciones de trabajo, el diálogo con el equipo, la seguridad y la salud, y el aprendizaje de las personas.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer en este tema?",
    "preguntas": [
      {
        "id": "03a",
        "texto": "¿Cómo acuerda la empresa las condiciones de trabajo con su equipo y cómo conversa con ellos sobre lo que funciona y lo que se puede mejorar?",
        "ejemplos": [
          "Contratos escritos",
          "Reglamento interno",
          "Reuniones periódicas",
          "Conversación directa con la gerencia",
          "Grupo de chat",
          "Buzón",
          "Comité"
        ],
        "proposito": "Conocer la formalidad laboral y los espacios de diálogo, formales o no.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "dejar claras las condiciones de trabajo y abrir espacios regulares de diálogo con el equipo",
        "alternativas": [
          "Revisar que todas las personas tengan sus condiciones de trabajo por escrito",
          "Programar una reunión mensual corta para escuchar al equipo",
          "Hacer una encuesta breve de clima laboral dos veces al año"
        ]
      },
      {
        "id": "03b",
        "texto": "¿Qué hace la empresa para cuidar la seguridad y la salud de las personas mientras trabajan?",
        "ejemplos": [
          "Afiliación a ARL",
          "Elementos de protección",
          "Capacitaciones",
          "Pausas activas",
          "Revisión de equipos",
          "SG-SST"
        ],
        "proposito": "Conocer prácticas de cuidado; los vacíos se presentan como oportunidad prioritaria y orientación, no como sanción.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "organizar el cuidado de la seguridad y la salud de las personas en el trabajo",
        "alternativas": [
          "Pedir apoyo a la ARL para identificar los principales riesgos y las medidas básicas",
          "Hacer una ronda mensual de revisión de equipos y elementos de protección",
          "Avanzar por etapas en el Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)"
        ],
        "alertaLegal": "sst"
      },
      {
        "id": "03c",
        "texto": "¿Cómo aprende y crece el equipo en la empresa y cómo se dan cuenta de que eso sirve en el trabajo diario?",
        "ejemplos": [
          "Aprendizaje entre compañeros",
          "Inducción",
          "Capacitaciones",
          "Cursos SENA",
          "Seguimiento del jefe"
        ],
        "proposito": "Conocer cómo se forma el equipo y si se observa la aplicación de lo aprendido.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "planear el aprendizaje del equipo y comprobar que se aplica en el trabajo",
        "alternativas": [
          "Definir con cada persona una capacitación útil al año (por ejemplo, cursos gratuitos del SENA)",
          "Tener una inducción corta para quien llega",
          "Conversar un mes después de cada capacitación sobre qué se aplicó"
        ]
      }
    ]
  },
  {
    "id": "ambiente",
    "numero": "04",
    "nombre": "Medio ambiente",
    "abrev": "Ambiental",
    "descripcion": "El uso del agua, la energía y los materiales, el manejo de los residuos y lo que la empresa hace por cuidar el entorno.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer en este tema?",
    "preguntas": [
      {
        "id": "04a",
        "texto": "¿Qué cuidados o acciones ambientales tiene hoy la empresa, aunque no estén escritos, y hay algo concreto que quieran lograr?",
        "ejemplos": [
          "Reducir consumos",
          "Manejar mejor los residuos",
          "Cambiar materiales",
          "Cumplir un requisito de un cliente"
        ],
        "proposito": "Conocer las prácticas y la intención ambiental de la empresa.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "fijar una o dos metas ambientales concretas y alcanzables",
        "alternativas": [
          "Escoger una meta sencilla para el año (por ejemplo, bajar el consumo de energía)",
          "Asignar a una persona que haga seguimiento a esa meta",
          "Revisar qué piden los clientes en temas ambientales y tomarlo como punto de partida"
        ]
      },
      {
        "id": "04b",
        "texto": "En el día a día, ¿qué hacen para usar mejor el agua, la energía y los materiales, y qué pasa con los residuos que generan?",
        "ejemplos": [
          "Apagar equipos",
          "Ahorro de agua",
          "Reutilizar",
          "Separar y reciclar",
          "Entregar a gestor autorizado"
        ],
        "proposito": "Conocer dónde ocurre el impacto ambiental real y qué se hace al respecto.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "ordenar el uso de recursos y el manejo de residuos en el día a día",
        "alternativas": [
          "Separar los residuos y entregarlos a un reciclador o gestor autorizado",
          "Crear hábitos y recordatorios de ahorro de agua y energía",
          "Revisar qué materiales se pueden reutilizar o cambiar por opciones de menor impacto"
        ]
      },
      {
        "id": "04c",
        "texto": "¿Cómo se dan cuenta si esas acciones están funcionando y han cambiado algo a partir de eso?",
        "ejemplos": [
          "Revisan recibos de servicios",
          "Pesan o cuentan residuos",
          "Observan cambios",
          "Llevan un registro"
        ],
        "proposito": "Conocer si hay seguimiento, aunque sea sencillo, y aprendizaje.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "hacer un seguimiento sencillo para saber si las acciones ambientales funcionan",
        "alternativas": [
          "Anotar cada mes los consumos de los recibos de agua y energía",
          "Pesar o contar los residuos reciclables entregados",
          "Revisar cada semestre los resultados y ajustar las acciones"
        ]
      }
    ]
  },
  {
    "id": "practicas",
    "numero": "05",
    "nombre": "Prácticas justas de operación",
    "abrev": "Op. justas",
    "descripcion": "La transparencia y la honestidad en las relaciones con clientes, proveedores, competidores y entidades públicas.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer para que sus relaciones con clientes, proveedores, competidores y entidades sean más transparentes?",
    "preguntas": [
      {
        "id": "05a",
        "texto": "Cuéntenos cómo aborda actualmente la empresa la prevención de situaciones de corrupción, conflictos de interés o prácticas que puedan afectar la transparencia de sus operaciones.",
        "ejemplos": [
          "Reglas claras para compras y pagos",
          "La gerencia revisa y aprueba los pagos",
          "Dos personas aprueban gastos importantes",
          "No se aceptan regalos o favores de proveedores",
          "Se habla del tema con el equipo",
          "Código de conducta o política escrita"
        ],
        "proposito": "Conocer las prácticas de transparencia, formales o no.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "acordar reglas claras de transparencia para compras, pagos y relación con terceros",
        "alternativas": [
          "Escribir unas reglas cortas para compras y pagos (quién aprueba y desde qué monto)",
          "Acordar con el equipo qué hacer ante regalos o favores de proveedores",
          "Conversar una vez al año con el equipo sobre situaciones de conflicto de interés"
        ]
      },
      {
        "id": "05b",
        "texto": "Además del precio y la calidad, ¿qué tiene en cuenta la empresa al escoger a sus proveedores?",
        "ejemplos": [
          "Que sean locales",
          "Que estén formalizados",
          "Que cuiden el ambiente",
          "Que traten bien a su gente",
          "Relación de confianza"
        ],
        "proposito": "Conocer si la RSE llega a la cadena de proveedores.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "tener en cuenta criterios sociales y ambientales al escoger proveedores",
        "alternativas": [
          "Dar preferencia a proveedores locales o de la región cuando sea posible",
          "Preguntar a los proveedores nuevos por su formalización y el trato a su equipo",
          "Conversar una vez al año con los proveedores principales sobre mejoras mutuas"
        ]
      },
      {
        "id": "05c",
        "texto": "¿Cómo procura la empresa competir de manera honesta y tener una relación transparente con clientes, competidores y entidades públicas? ¿Hacen algo para revisar que esto se cumpla?",
        "ejemplos": [
          "Precios y ofertas claras",
          "Trámites al día",
          "Revisión de la gerencia",
          "Asesoría contable o jurídica"
        ],
        "proposito": "Conocer las prácticas de competencia justa y relación con el Estado y si existe alguna revisión.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "revisar de vez en cuando que la empresa compite de forma honesta y tiene al día su relación con las entidades",
        "alternativas": [
          "Hacer una revisión semestral con el contador de trámites y obligaciones",
          "Revisar que precios, ofertas y publicidad sean claros y verificables",
          "Definir quién atiende la relación con entidades públicas y cómo se deja constancia"
        ]
      }
    ]
  },
  {
    "id": "consumidores",
    "numero": "06",
    "nombre": "Consumidores",
    "abrev": "Consumo",
    "descripcion": "La información clara, la calidad y la seguridad de lo que se vende, el cuidado de los datos personales y la atención a los clientes. Solo aplica si vende a consumidor final.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer en este tema?",
    "condicional": "soloConsumidorFinal",
    "preguntas": [
      {
        "id": "06a",
        "texto": "¿Cómo se asegura la empresa de que sus clientes reciban información clara y productos o servicios de calidad y seguros?",
        "ejemplos": [
          "Etiquetas o fichas claras",
          "Garantías",
          "Controles de calidad",
          "Explicación directa"
        ],
        "proposito": "Conocer las prácticas de cuidado del cliente.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "asegurar información clara, calidad y seguridad en lo que se ofrece a los clientes",
        "alternativas": [
          "Revisar etiquetas, fichas o explicaciones para que sean claras y completas",
          "Definir un control de calidad sencillo antes de entregar",
          "Dejar por escrito las condiciones de garantía"
        ]
      },
      {
        "id": "06b",
        "texto": "¿Qué información personal de sus clientes maneja la empresa (nombres, teléfonos, correos) y cómo la cuidan?",
        "ejemplos": [
          "Acceso restringido",
          "Piden autorización",
          "Contraseñas",
          "Política de datos"
        ],
        "proposito": "Conocer prácticas de cuidado de datos; si hay vacíos, orientar sobre la obligación legal como oportunidad.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "cuidar la información personal de los clientes",
        "alternativas": [
          "Pedir autorización a los clientes antes de guardar sus datos",
          "Limitar quién puede ver los datos y proteger con contraseña los archivos",
          "Preparar una política de tratamiento de datos sencilla (Ley 1581 de 2012)"
        ],
        "alertaLegal": "datos"
      },
      {
        "id": "06c",
        "texto": "Cuando un cliente tiene una queja, sugerencia o reclamo, ¿cómo lo recibe la empresa y cómo le responde?",
        "ejemplos": [
          "Atención directa",
          "WhatsApp o redes",
          "Correo",
          "Formato o registro",
          "Seguimiento de tiempos"
        ],
        "proposito": "Conocer cómo escucha y responde a sus clientes.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "recibir y responder de forma ordenada las quejas y sugerencias de los clientes",
        "alternativas": [
          "Llevar un registro sencillo de quejas y sugerencias",
          "Fijar un tiempo de respuesta y revisarlo cada mes",
          "Usar las quejas que se repiten para mejorar el producto o servicio"
        ]
      }
    ]
  },
  {
    "id": "comunidad",
    "numero": "07",
    "nombre": "Comunidad y territorio",
    "abrev": "Comunidad",
    "descripcion": "La relación de la empresa con el barrio, la vereda o el municipio donde opera, y los apoyos que da.",
    "cierre": "¿Qué le gustaría fortalecer o empezar a hacer en este tema?",
    "preguntas": [
      {
        "id": "07a",
        "texto": "¿Qué relación tiene la empresa con la comunidad o el sector donde opera?",
        "ejemplos": [
          "Participa en actividades del barrio o municipio",
          "Apoya iniciativas",
          "Conversa con vecinos, líderes u organizaciones",
          "Contrata personas de la zona"
        ],
        "proposito": "Conocer el vínculo real con el territorio.",
        "arquetipo": "A",
        "peso": 0.3,
        "oportunidad": "construir una relación cercana y constante con la comunidad donde opera",
        "alternativas": [
          "Identificar a los líderes y organizaciones del sector y conversar con ellos una vez al año",
          "Dar prioridad a personas de la zona en las vacantes",
          "Participar en al menos una actividad comunitaria al año"
        ]
      },
      {
        "id": "07b",
        "texto": "Cuando la empresa apoya a la comunidad (donaciones, patrocinios, empleo local, voluntariado), ¿cómo decide a quién y en qué apoyar?",
        "ejemplos": [
          "Donaciones",
          "Patrocinios",
          "Empleo local",
          "Voluntariado"
        ],
        "proposito": "Conocer cómo se toman las decisiones de apoyo y si hay criterios, aunque sean informales.",
        "arquetipo": "D",
        "peso": 0.35,
        "oportunidad": "definir criterios sencillos para decidir a quién y en qué apoyar",
        "alternativas": [
          "Escoger una o dos causas relacionadas con la actividad de la empresa",
          "Definir un monto o un tiempo anual para apoyos y quién lo decide",
          "Preguntar a la comunidad qué necesita antes de decidir"
        ]
      },
      {
        "id": "07c",
        "texto": "¿Qué cambios han notado en la comunidad o en la empresa a partir de esos apoyos y cómo se dan cuenta?",
        "ejemplos": [
          "Comentarios de la comunidad",
          "Fotos o registros",
          "Número de personas beneficiadas",
          "Relación con vecinos"
        ],
        "proposito": "Distinguir entre “hicimos una actividad” y “cambió algo”, con evidencias sencillas.",
        "arquetipo": "E",
        "peso": 0.35,
        "oportunidad": "reconocer, con evidencias sencillas, qué cambia gracias a los apoyos",
        "alternativas": [
          "Registrar cuántas personas se benefician de cada apoyo",
          "Guardar fotos y comentarios de la comunidad",
          "Preguntar una vez al año a quienes recibieron apoyo qué cambió"
        ]
      }
    ]
  }
]

export const RSE_EXPRESS: Instrumento = {
  id: 'rse_express',
  codigo: "RSE Express",
  nombre: "Autodiagnóstico RSE Express",
  norma: "ISO 26000 · 7 materias",
  naturaleza: "Autodiagnóstico abierto · no es una auditoría",
  preguntaFinal: "¿Hay algo que haga la empresa por sus trabajadores, clientes, el ambiente o la comunidad que no le hayamos preguntado?",
  materias: MATERIAS,
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
 * Juicio de materialidad por sector (pendiente de verificación, ver
 * sección 7 del protocolo). Solo pondera la lectura INTERNA 0–4 que usa
 * NEXUS para el análisis; no se traslada a la matriz de priorización ni se
 * le muestra a la empresa como puntaje. Cada fila suma 1.00.
 */
export const PESOS_SECTOR: Record<SectorId, Record<MateriaId, number>> = {
  "industrial": {
    "gobernanza": 0.14,
    "ddhh": 0.12,
    "laborales": 0.18,
    "ambiente": 0.22,
    "practicas": 0.14,
    "consumidores": 0.08,
    "comunidad": 0.12
  },
  "servicios": {
    "gobernanza": 0.16,
    "ddhh": 0.12,
    "laborales": 0.2,
    "ambiente": 0.1,
    "practicas": 0.16,
    "consumidores": 0.16,
    "comunidad": 0.1
  },
  "agroindustrial": {
    "gobernanza": 0.12,
    "ddhh": 0.14,
    "laborales": 0.16,
    "ambiente": 0.22,
    "practicas": 0.1,
    "consumidores": 0.08,
    "comunidad": 0.18
  },
  "comercio": {
    "gobernanza": 0.14,
    "ddhh": 0.1,
    "laborales": 0.16,
    "ambiente": 0.12,
    "practicas": 0.16,
    "consumidores": 0.22,
    "comunidad": 0.1
  },
  "energia": {
    "gobernanza": 0.14,
    "ddhh": 0.14,
    "laborales": 0.16,
    "ambiente": 0.22,
    "practicas": 0.12,
    "consumidores": 0.06,
    "comunidad": 0.16
  },
  "movilidad": {
    "gobernanza": 0.14,
    "ddhh": 0.12,
    "laborales": 0.18,
    "ambiente": 0.18,
    "practicas": 0.12,
    "consumidores": 0.16,
    "comunidad": 0.1
  }
}

/** Todas las preguntas en orden (01a … 07c). */
export const PREGUNTAS = MATERIAS.flatMap((m) => m.preguntas)
