// Archivo GENERADO a partir del catálogo del Anexo 1 del «Protocolo de
// Validación NEXUS RSE Express + RSE por Retos» (v2, septiembre de 2026).
// El mismo catálogo genera db/009_rse_express.sql en el backend: si cambia
// una pregunta, hay que cambiarla en los dos lados (mismo código, mismo peso).
//
// Estructura de cada pregunta (sección 6.3 del protocolo):
//   - texto:       pregunta principal abierta (texto libre)
//   - ejemplos:    ejemplos orientadores, selección múltiple opcional
//                  (+ «Hacemos algo diferente: ___», que es un campo aparte).
//                  Cada ejemplo trae su texto descriptivo (lo que se marca y
//                  se guarda), una ayuda sencilla que aparece al pasar el
//                  mouse y, en «antes», el texto corto de la versión
//                  anterior. db/012_tamizaje_vecinos_ejemplos.sql actualiza
//                  el catálogo y las respuestas guardadas con estos textos.
//   - etapa:       «¿En qué punto está?», selección única (ver data/escala.ts)
//   - proposito:   para qué se pregunta (uso interno de NEXUS)
//   - arquetipo / peso: la tríada interna A (estructura), D (instrumento) y
//                  E (ejecución). Solo se usa para el análisis interno.
//   - oportunidad / alternativas: insumo inicial para la matriz de
//                  priorización. Son sugerencias para la conversación con
//                  NEXUS, no recomendaciones validadas.
import type { Instrumento, Materia, MateriaId, Pregunta, SectorId } from '../types'

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
          {
            "texto": "El dueño o la gerencia decide qué acciones hacer, por ejemplo apoyar a un trabajador en una calamidad o donar a una causa",
            "ayuda": "Las acciones nacen de la iniciativa de quien dirige la empresa, aunque no estén escritas ni planeadas.",
            "antes": "Lo decide la gerencia o el dueño"
          },
          {
            "texto": "Los socios conversan y se ponen de acuerdo sobre qué hacer por el equipo, los clientes, el ambiente o la comunidad",
            "ayuda": "La decisión es compartida entre los dueños o socios, por ejemplo en una junta o una reunión, aunque no quede en un acta.",
            "antes": "Acuerdos entre socios"
          },
          {
            "texto": "Cuidar a las personas y al entorno hace parte de los valores de la empresa y se nota en cómo trabajamos",
            "ayuda": "Los valores son los principios que guían a la empresa, como la honestidad, el respeto o la solidaridad. Pueden estar escritos o simplemente vivirse en el día a día.",
            "antes": "Forma parte de los valores de la empresa"
          },
          {
            "texto": "Tenemos una política escrita de responsabilidad social, aprobada por la dirección y conocida por el equipo",
            "ayuda": "Una política es un documento corto en el que la empresa deja por escrito sus compromisos y quién responde por ellos.",
            "antes": "Política escrita"
          }
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
          {
            "texto": "El gerente o el dueño se encarga personalmente, además de sus otras tareas",
            "ayuda": "No hay otra persona a cargo: quien dirige la empresa saca el tiempo cuando puede.",
            "antes": "Lo asume el gerente"
          },
          {
            "texto": "Una persona del equipo tiene a su cargo estas acciones y dedica algunas horas a organizarlas",
            "ayuda": "Puede ser alguien de talento humano, de administración o de otra área. Lo importante es que todos saben quién responde por el tema.",
            "antes": "Una persona encargada"
          },
          {
            "texto": "Se hacen con el dinero o el tiempo que haya disponible en el momento, sin un presupuesto fijo",
            "ayuda": "Cuando surge una necesidad o una oportunidad se busca cómo cubrirla, pero no hay dinero reservado de antemano.",
            "antes": "Se hace con recursos del momento"
          },
          {
            "texto": "Cada año separamos un monto de dinero o un tiempo fijo para estas acciones dentro del presupuesto",
            "ayuda": "El presupuesto es el plan de cuánto dinero se va a gastar y en qué. Reservar un monto fijo permite planear las acciones con anticipación.",
            "antes": "Hay un monto destinado"
          }
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
          {
            "texto": "Lo contamos en conversaciones del día a día con el equipo, los clientes o los vecinos",
            "ayuda": "Comunicación informal, de voz a voz, sin un momento ni un formato definido.",
            "antes": "Conversaciones"
          },
          {
            "texto": "Lo compartimos en reuniones con el equipo, los socios o la comunidad",
            "ayuda": "Por ejemplo, una reunión mensual del equipo, una junta de socios o una reunión con la junta de acción comunal.",
            "antes": "Reuniones"
          },
          {
            "texto": "Publicamos fotos y noticias de lo que hacemos en redes sociales o en WhatsApp",
            "ayuda": "Facebook, Instagram, TikTok, LinkedIn, o estados y grupos de WhatsApp, entre otros.",
            "antes": "Redes sociales"
          },
          {
            "texto": "Lo ponemos en carteleras o avisos visibles dentro de la empresa",
            "ayuda": "Tableros o avisos en la oficina, la planta, el local o la cafetería, donde el equipo y los visitantes lo pueden ver.",
            "antes": "Carteleras"
          },
          {
            "texto": "Preparamos un informe o balance, por ejemplo cada año, con lo que hicimos y los resultados",
            "ayuda": "Un documento, aunque sea corto, que resume las acciones y lo que se logró. Algunas empresas lo llaman informe de gestión o de sostenibilidad.",
            "antes": "Informe o balance"
          }
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
          {
            "texto": "Exigimos un trato amable y respetuoso entre compañeros, jefes, clientes y proveedores, sin gritos, burlas ni humillaciones",
            "ayuda": "El respeto se nota en el trato diario: cómo se dan las órdenes, cómo se corrigen los errores y cómo se atiende a los demás.",
            "antes": "Trato respetuoso"
          },
          {
            "texto": "No tratamos distinto a nadie por su género, edad, origen, color de piel, religión, discapacidad u orientación sexual",
            "ayuda": "Discriminar es excluir o tratar peor a alguien por quién es y no por lo que hace. Aplica al contratar, al pagar, al ascender y al atender.",
            "antes": "No discriminación"
          },
          {
            "texto": "No contratamos a menores de 18 años y no permitimos que niños, niñas o adolescentes trabajen en la empresa",
            "ayuda": "El trabajo infantil está prohibido en Colombia. Los adolescentes de 15 a 17 años solo pueden trabajar con autorización del inspector de trabajo y en labores que no afecten su salud ni su estudio.",
            "antes": "No contratar menores de edad"
          },
          {
            "texto": "Abrimos oportunidades de trabajo a personas con discapacidad, víctimas del conflicto, migrantes, mayores de 50 años o jóvenes sin experiencia",
            "ayuda": "Inclusión es dar oportunidades reales a personas que suelen tener más dificultades para conseguir empleo.",
            "antes": "Inclusión de personas"
          },
          {
            "texto": "Tenemos reglas de convivencia acordadas, por ejemplo cómo resolver un conflicto o qué hacer ante un caso de acoso",
            "ayuda": "Normas claras sobre cómo tratarse en el trabajo y cómo resolver los problemas entre personas. También ayudan a prevenir el acoso laboral.",
            "antes": "Reglas de convivencia"
          }
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
          {
            "texto": "Condiciones inseguras, como máquinas sin protección, pisos resbalosos, cables sueltos o trabajo en alturas sin equipo",
            "ayuda": "Situaciones del lugar de trabajo que pueden causar un accidente o una enfermedad. Márquela si las han revisado o corregido, en la empresa o con sus proveedores.",
            "antes": "Condiciones inseguras"
          },
          {
            "texto": "Jornadas excesivas, como turnos muy largos, horas extra sin pago o semanas sin día de descanso",
            "ayuda": "La ley fija un máximo de horas de trabajo a la semana y exige pagar las horas extra y dar días de descanso. Excederse afecta la salud y los derechos de las personas.",
            "antes": "Jornadas excesivas"
          },
          {
            "texto": "Trabajo infantil: niños, niñas o adolescentes trabajando en la empresa o en la de un proveedor",
            "ayuda": "Es cualquier trabajo de menores de 15 años, o de adolescentes sin permiso del inspector de trabajo o en labores peligrosas. Está prohibido en Colombia.",
            "antes": "Trabajo infantil"
          },
          {
            "texto": "Discriminación o acoso: tratar peor a alguien por quién es, o burlas, presiones o maltratos repetidos",
            "ayuda": "Incluye el acoso laboral (persecución, humillación o maltrato repetido de un jefe o un compañero) y el acoso sexual.",
            "antes": "Discriminación"
          }
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
          {
            "texto": "La persona habla directamente con el dueño o el gerente, que la escucha y busca una solución",
            "ayuda": "Canal informal y cercano, común en empresas pequeñas. Funciona mejor si todos saben que pueden hacerlo sin miedo a represalias.",
            "antes": "Habla directamente con el dueño"
          },
          {
            "texto": "Tenemos una línea telefónica o un WhatsApp donde cualquier persona puede contar su inquietud",
            "ayuda": "Un número conocido para recibir quejas o inquietudes, ojalá con alguien encargado de responder.",
            "antes": "Línea o WhatsApp"
          },
          {
            "texto": "Hay un buzón, físico o en internet, para dejar quejas o sugerencias, incluso sin dar el nombre",
            "ayuda": "Una caja o un formulario en línea donde se pueden dejar mensajes de forma anónima. Sirve para temas delicados.",
            "antes": "Buzón"
          },
          {
            "texto": "Hacemos reuniones con el equipo o con los vecinos para escuchar inquietudes y acordar soluciones",
            "ayuda": "Espacios de diálogo programados, por ejemplo una reunión con el personal o con la junta de acción comunal.",
            "antes": "Reunión"
          },
          {
            "texto": "Tenemos un procedimiento escrito que dice quién recibe la queja, en cuánto tiempo se responde y cómo se hace seguimiento",
            "ayuda": "Un paso a paso por escrito para atender quejas o reclamos, de modo que no dependa de la memoria de una sola persona.",
            "antes": "Procedimiento escrito"
          }
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
          {
            "texto": "Cada persona tiene un contrato escrito con su salario, horario, funciones y tipo de vinculación",
            "ayuda": "El contrato escrito deja claras las reglas para las dos partes y evita malentendidos.",
            "antes": "Contratos escritos"
          },
          {
            "texto": "Tenemos un reglamento interno de trabajo que explica horarios, permisos, descansos y faltas",
            "ayuda": "Documento con las reglas generales del trabajo en la empresa. La ley lo exige a partir de cierto número de trabajadores, pero es útil en cualquier empresa.",
            "antes": "Reglamento interno"
          },
          {
            "texto": "Hacemos reuniones periódicas, semanales o mensuales, para hablar con el equipo de lo que funciona y lo que se puede mejorar",
            "ayuda": "Espacios fijos de conversación, no solo cuando hay un problema.",
            "antes": "Reuniones periódicas"
          },
          {
            "texto": "Las personas pueden hablar directamente con la gerencia cuando tienen una propuesta o un problema",
            "ayuda": "Es la llamada política de puertas abiertas: el equipo sabe que puede acercarse a quien dirige sin intermediarios.",
            "antes": "Conversación directa con la gerencia"
          },
          {
            "texto": "Tenemos un grupo de chat del equipo donde también se comentan propuestas e inquietudes",
            "ayuda": "Por ejemplo, un grupo de WhatsApp. Además de coordinar el trabajo, sirve para escuchar al equipo.",
            "antes": "Grupo de chat"
          },
          {
            "texto": "Hay un buzón de sugerencias para el equipo, en papel o en internet",
            "ayuda": "Permite que las personas propongan mejoras o expresen inconformidades, incluso sin decir su nombre.",
            "antes": "Buzón"
          },
          {
            "texto": "Funciona un comité con trabajadores, como el de convivencia laboral o el COPASST, que se reúne y deja actas",
            "ayuda": "El comité de convivencia laboral previene y atiende el acoso laboral. El COPASST (Comité Paritario de Seguridad y Salud en el Trabajo) vigila la seguridad y la salud; en empresas pequeñas puede ser un vigía.",
            "antes": "Comité"
          }
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
          {
            "texto": "Todas las personas que trabajan con la empresa están afiliadas a una ARL desde el primer día",
            "ayuda": "ARL: Administradora de Riesgos Laborales. Cubre la atención médica y los pagos si alguien se accidenta o se enferma por causa del trabajo. Es obligatoria para quien tiene contrato laboral y para los contratistas de más de un mes.",
            "antes": "Afiliación a ARL"
          },
          {
            "texto": "Entregamos y reponemos elementos de protección (casco, guantes, gafas, tapabocas, botas) y revisamos que se usen",
            "ayuda": "Los elementos de protección personal (EPP) los entrega la empresa sin costo para el trabajador, según los riesgos de cada labor.",
            "antes": "Elementos de protección"
          },
          {
            "texto": "Damos capacitaciones sobre los riesgos del trabajo, primeros auxilios o qué hacer en una emergencia",
            "ayuda": "Pueden ser charlas cortas dictadas por la ARL, los bomberos, la Cruz Roja o alguien de la empresa.",
            "antes": "Capacitaciones"
          },
          {
            "texto": "Hacemos pausas activas: unos minutos de estiramientos o ejercicios durante la jornada",
            "ayuda": "Pausas cortas para mover el cuerpo y descansar la vista, que previenen dolores de espalda, cuello y manos.",
            "antes": "Pausas activas"
          },
          {
            "texto": "Revisamos y hacemos mantenimiento a máquinas, herramientas, vehículos e instalaciones eléctricas",
            "ayuda": "Revisiones periódicas, ojalá con una lista de chequeo, para detectar fallas antes de que causen un accidente.",
            "antes": "Revisión de equipos"
          },
          {
            "texto": "Tenemos el SG-SST: identificamos los riesgos, seguimos un plan de trabajo anual y llevamos registros",
            "ayuda": "SG-SST: Sistema de Gestión de Seguridad y Salud en el Trabajo. Es la forma organizada, y obligatoria en Colombia, de prevenir accidentes y enfermedades laborales. La ARL puede ayudar a implementarlo.",
            "antes": "SG-SST"
          }
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
          {
            "texto": "Las personas con más experiencia enseñan a las nuevas en el día a día",
            "ayuda": "Aprendizaje práctico, de persona a persona, mientras se trabaja.",
            "antes": "Aprendizaje entre compañeros"
          },
          {
            "texto": "Quien llega recibe una inducción: le explicamos la empresa, sus funciones, las normas y los riesgos del puesto",
            "ayuda": "La inducción es la bienvenida y orientación de una persona nueva, para que sepa cómo funciona todo desde el primer día.",
            "antes": "Inducción"
          },
          {
            "texto": "Organizamos o pagamos capacitaciones sobre temas del trabajo, como atención al cliente, manejo de máquinas o ventas",
            "ayuda": "Formación dentro o fuera de la empresa, dictada por personas del equipo, por proveedores o por otras entidades.",
            "antes": "Capacitaciones"
          },
          {
            "texto": "Animamos al equipo a tomar cursos del SENA u otros cursos gratuitos y les damos tiempo para hacerlos",
            "ayuda": "SENA: Servicio Nacional de Aprendizaje. Entidad pública que ofrece cursos gratuitos, presenciales y virtuales, en muchos oficios.",
            "antes": "Cursos SENA"
          },
          {
            "texto": "El jefe hace seguimiento para ver si lo aprendido se aplica y si el trabajo mejoró",
            "ayuda": "Por ejemplo, observar el trabajo después de una capacitación o conversar con la persona sobre qué le sirvió.",
            "antes": "Seguimiento del jefe"
          }
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
          {
            "texto": "Queremos gastar menos agua, energía o combustible, por ejemplo cambiando bombillos o arreglando fugas",
            "ayuda": "Reducir los consumos ahorra dinero y disminuye el impacto en el ambiente.",
            "antes": "Reducir consumos"
          },
          {
            "texto": "Queremos manejar mejor los residuos: generar menos, separarlos y entregarlos a quien los aproveche",
            "ayuda": "Residuos: lo que sobra o se desecha en la operación, como empaques, papel, plástico, restos de comida, aceites o chatarra.",
            "antes": "Manejar mejor los residuos"
          },
          {
            "texto": "Cambiamos materiales o insumos por otros de menor impacto, como empaques reciclables o productos sin químicos fuertes",
            "ayuda": "Por ejemplo, dejar el icopor, usar bolsas reutilizables o comprar insumos biodegradables.",
            "antes": "Cambiar materiales"
          },
          {
            "texto": "Lo hacemos porque un cliente, un comprador o una certificación nos lo pide",
            "ayuda": "Algunas empresas grandes y algunos mercados de exportación exigen a sus proveedores prácticas ambientales mínimas.",
            "antes": "Cumplir un requisito de un cliente"
          }
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
          {
            "texto": "Apagamos luces, computadores y máquinas cuando no se están usando",
            "ayuda": "Pequeños hábitos que reducen el consumo de energía y el valor del recibo.",
            "antes": "Apagar equipos"
          },
          {
            "texto": "Ahorramos agua: arreglamos fugas, usamos llaves ahorradoras o recogemos agua lluvia",
            "ayuda": "Medidas sencillas que reducen el consumo de agua sin afectar el trabajo.",
            "antes": "Ahorro de agua"
          },
          {
            "texto": "Reutilizamos materiales, cajas, estibas o retales antes de botarlos",
            "ayuda": "Reutilizar es volver a usar algo, para lo mismo o para otra cosa, sin transformarlo. Las estibas son las plataformas de madera o plástico para mover y guardar mercancía.",
            "antes": "Reutilizar"
          },
          {
            "texto": "Separamos los residuos en aprovechables, orgánicos y no aprovechables, y entregamos lo reciclable",
            "ayuda": "En Colombia se usa un código de colores: blanco para aprovechables (plástico, vidrio, papel, metal), verde para orgánicos y negro para no aprovechables.",
            "antes": "Separar y reciclar"
          },
          {
            "texto": "Entregamos aceites, baterías, químicos u otros residuos peligrosos a un gestor autorizado",
            "ayuda": "Gestor autorizado: empresa con permiso de la autoridad ambiental para recoger, tratar o disponer residuos de forma segura. Debe entregar un certificado.",
            "antes": "Entregar a gestor autorizado"
          }
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
          {
            "texto": "Revisamos cada mes los recibos de agua, luz o gas para ver si el consumo baja",
            "ayuda": "Comparar los recibos mes a mes es la forma más sencilla de medir el consumo.",
            "antes": "Revisan recibos de servicios"
          },
          {
            "texto": "Pesamos o contamos los residuos que entregamos para reciclar o desechar",
            "ayuda": "Por ejemplo, los kilos de cartón entregados al reciclador cada mes. El reciclador o el gestor suele dar un comprobante.",
            "antes": "Pesan o cuentan residuos"
          },
          {
            "texto": "Observamos cambios en el lugar de trabajo, como menos basura, menos desperdicio o menos olores",
            "ayuda": "Un seguimiento a ojo, sin cifras, que permite notar si las acciones funcionan.",
            "antes": "Observan cambios"
          },
          {
            "texto": "Llevamos un registro en un cuaderno, una hoja de cálculo o un tablero con los consumos y los avances",
            "ayuda": "Anotar los datos permite comparar en el tiempo y mostrar resultados a clientes o socios.",
            "antes": "Llevan un registro"
          }
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
          {
            "texto": "Tenemos reglas claras para comprar y pagar: pedir cotizaciones, exigir factura y guardar el soporte de cada pago",
            "ayuda": "Reglas sencillas que evitan pagos sin justificación o compras amañadas.",
            "antes": "Reglas claras para compras y pagos"
          },
          {
            "texto": "La gerencia revisa y aprueba los pagos antes de hacerlos",
            "ayuda": "Un segundo par de ojos sobre cada pago reduce los errores y los malos manejos.",
            "antes": "La gerencia revisa y aprueba los pagos"
          },
          {
            "texto": "Los gastos grandes los aprueban dos personas, no una sola",
            "ayuda": "Se conoce como doble firma o control dual: ninguna persona puede comprometer mucho dinero por su cuenta.",
            "antes": "Dos personas aprueban gastos importantes"
          },
          {
            "texto": "No aceptamos regalos, comisiones o favores de proveedores o clientes a cambio de preferirlos",
            "ayuda": "Un regalo puede comprometer una decisión. Muchas empresas fijan un valor máximo o piden informar cualquier regalo recibido.",
            "antes": "No se aceptan regalos o favores de proveedores"
          },
          {
            "texto": "Hablamos con el equipo sobre qué hacer ante un soborno, un regalo o un conflicto de interés",
            "ayuda": "Hay conflicto de interés cuando alguien decide algo en lo que también gana él, un familiar o un amigo; por ejemplo, comprarle a la empresa de un primo.",
            "antes": "Se habla del tema con el equipo"
          },
          {
            "texto": "Tenemos un código de conducta o una política escrita de ética y transparencia que el equipo conoce",
            "ayuda": "Un código de conducta reúne las reglas de comportamiento esperadas: cómo actuar con proveedores, con regalos o con información confidencial, entre otras.",
            "antes": "Código de conducta o política escrita"
          }
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
          {
            "texto": "Preferimos proveedores locales, del mismo municipio o de la región",
            "ayuda": "Comprar cerca apoya la economía de la zona y reduce los costos y la contaminación del transporte.",
            "antes": "Que sean locales"
          },
          {
            "texto": "Pedimos que estén formalizados: que tengan RUT, entreguen factura y paguen la seguridad social de su gente",
            "ayuda": "El RUT (Registro Único Tributario) es el registro de la DIAN para quienes tienen obligaciones tributarias. La formalidad también protege a los trabajadores del proveedor.",
            "antes": "Que estén formalizados"
          },
          {
            "texto": "Tenemos en cuenta que cuiden el ambiente, por ejemplo que manejen bien sus residuos o tengan sus permisos ambientales",
            "ayuda": "Los impactos de sus proveedores también hacen parte de la cadena de su empresa.",
            "antes": "Que cuiden el ambiente"
          },
          {
            "texto": "Nos fijamos en que traten bien a su gente: pagos a tiempo, condiciones dignas y nada de trabajo infantil",
            "ayuda": "Si un proveedor maltrata a sus trabajadores, el riesgo también llega a su empresa y a su reputación.",
            "antes": "Que traten bien a su gente"
          },
          {
            "texto": "Trabajamos con proveedores de confianza, con quienes llevamos años y cumplimos acuerdos de lado y lado",
            "ayuda": "Relaciones de largo plazo, con pagos puntuales y acuerdos claros, que benefician a las dos partes.",
            "antes": "Relación de confianza"
          }
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
          {
            "texto": "Nuestros precios, ofertas y publicidad son claros, completos y se pueden cumplir",
            "ayuda": "Sin letra menuda ni promesas engañosas. La publicidad engañosa y la competencia desleal están prohibidas por la ley.",
            "antes": "Precios y ofertas claras"
          },
          {
            "texto": "Tenemos al día los trámites: registro mercantil, impuestos, permisos y licencias",
            "ayuda": "El registro mercantil es la inscripción de la empresa en la Cámara de Comercio, que se renueva cada año.",
            "antes": "Trámites al día"
          },
          {
            "texto": "La gerencia revisa de vez en cuando que se cumplan los acuerdos con clientes, competidores y entidades",
            "ayuda": "Una revisión periódica permite corregir a tiempo errores o malas prácticas.",
            "antes": "Revisión de la gerencia"
          },
          {
            "texto": "Un contador o un abogado nos asesora y revisa que cumplamos nuestras obligaciones",
            "ayuda": "Asesoría profesional para evitar sanciones y tomar decisiones dentro de la ley.",
            "antes": "Asesoría contable o jurídica"
          }
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
          {
            "texto": "Nuestros productos tienen etiquetas o fichas claras con ingredientes, precio, fecha de vencimiento y forma de uso",
            "ayuda": "La información debe ser veraz y suficiente para que el cliente decida bien, como lo pide el Estatuto del Consumidor (Ley 1480 de 2011).",
            "antes": "Etiquetas o fichas claras"
          },
          {
            "texto": "Damos garantía: si el producto o el servicio sale mal, lo arreglamos, lo cambiamos o devolvemos el dinero",
            "ayuda": "La garantía es un derecho del cliente: la empresa responde por la calidad y la seguridad de lo que vende.",
            "antes": "Garantías"
          },
          {
            "texto": "Revisamos la calidad antes de entregar, por ejemplo con una lista de chequeo o una prueba del producto",
            "ayuda": "Los controles de calidad son verificaciones para que lo que se entrega cumpla lo prometido y no sea peligroso.",
            "antes": "Controles de calidad"
          },
          {
            "texto": "Le explicamos directamente al cliente cómo usar el producto, sus riesgos y sus condiciones",
            "ayuda": "Atención personal para resolver dudas antes y después de la compra.",
            "antes": "Explicación directa"
          }
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
          {
            "texto": "Solo algunas personas de la empresa pueden ver o usar los datos de los clientes",
            "ayuda": "Restringir el acceso reduce el riesgo de que la información se pierda o se use mal.",
            "antes": "Acceso restringido"
          },
          {
            "texto": "Pedimos autorización al cliente antes de guardar o usar sus datos, por ejemplo para enviarle publicidad",
            "ayuda": "En Colombia se necesita la autorización previa de la persona para recoger, guardar, usar o compartir sus datos personales (Ley 1581 de 2012).",
            "antes": "Piden autorización"
          },
          {
            "texto": "Protegemos con contraseña los computadores, celulares y archivos donde están los datos",
            "ayuda": "Contraseñas seguras que no se compartan, ojalá con copias de seguridad de la información.",
            "antes": "Contraseñas"
          },
          {
            "texto": "Tenemos una política de tratamiento de datos personales publicada o disponible para los clientes",
            "ayuda": "Documento que explica qué datos recoge la empresa, para qué los usa y cómo puede el cliente consultarlos, corregirlos o pedir que los borren. La Ley 1581 de 2012 la exige.",
            "antes": "Política de datos"
          }
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
          {
            "texto": "Atendemos las quejas en persona, en el local o en el lugar donde prestamos el servicio",
            "ayuda": "Quien atiende escucha el caso y busca resolverlo en el momento.",
            "antes": "Atención directa"
          },
          {
            "texto": "Recibimos quejas y sugerencias por WhatsApp o redes sociales y las respondemos",
            "ayuda": "Canales rápidos y cercanos. Conviene que alguien se encargue de revisarlos todos los días.",
            "antes": "WhatsApp o redes"
          },
          {
            "texto": "Tenemos un correo electrónico para recibir quejas y reclamos",
            "ayuda": "Deja constancia escrita de lo que pidió el cliente y de la respuesta que se le dio.",
            "antes": "Correo"
          },
          {
            "texto": "Anotamos cada queja en un formato o registro con la fecha, el caso y la respuesta dada",
            "ayuda": "Un registro, aunque sea en un cuaderno o una hoja de cálculo, ayuda a no olvidar casos y a ver qué problemas se repiten.",
            "antes": "Formato o registro"
          },
          {
            "texto": "Medimos cuánto nos demoramos en responder y tratamos de cumplir un plazo fijo",
            "ayuda": "Por ejemplo, fijar un número máximo de días para responder y revisar cada mes si se cumple.",
            "antes": "Seguimiento de tiempos"
          }
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
          {
            "texto": "Participamos en actividades del barrio o del municipio, como ferias, fiestas, jornadas de limpieza o reuniones comunitarias",
            "ayuda": "Estar presente en la vida de la comunidad construye confianza con los vecinos.",
            "antes": "Participa en actividades del barrio o municipio"
          },
          {
            "texto": "Apoyamos iniciativas de la comunidad, como un equipo deportivo, un grupo de mujeres o un proyecto de la escuela",
            "ayuda": "El apoyo puede ser en dinero, en productos, prestando un espacio o con el tiempo de las personas de la empresa.",
            "antes": "Apoya iniciativas"
          },
          {
            "texto": "Conversamos con vecinos, líderes, la junta de acción comunal u otras organizaciones de la zona",
            "ayuda": "La junta de acción comunal (JAC) es la organización de los vecinos de un barrio o una vereda que trabaja por el desarrollo de su comunidad.",
            "antes": "Conversa con vecinos, líderes u organizaciones"
          },
          {
            "texto": "Contratamos a personas que viven en la zona donde operamos",
            "ayuda": "El empleo local deja beneficios en la comunidad vecina y fortalece la relación con ella.",
            "antes": "Contrata personas de la zona"
          }
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
          {
            "texto": "Donamos dinero, productos o servicios a personas u organizaciones que lo necesitan",
            "ayuda": "Una donación es entregar algo sin esperar nada a cambio.",
            "antes": "Donaciones"
          },
          {
            "texto": "Patrocinamos eventos, equipos o actividades, y a cambio aparece el nombre de la empresa",
            "ayuda": "Un patrocinio es un apoyo en dinero o en especie que también le da visibilidad a la empresa.",
            "antes": "Patrocinios"
          },
          {
            "texto": "Damos prioridad a personas de la comunidad cuando abrimos vacantes",
            "ayuda": "Empleo local: contratar a personas que viven cerca de donde opera la empresa.",
            "antes": "Empleo local"
          },
          {
            "texto": "Las personas de la empresa donan su tiempo a una causa, por ejemplo en jornadas de siembra o de refuerzo escolar",
            "ayuda": "En el voluntariado se dona tiempo y conocimiento, no dinero. Puede hacerse en horario de trabajo o fuera de él.",
            "antes": "Voluntariado"
          }
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
          {
            "texto": "La comunidad nos comenta o nos agradece los cambios que ha notado",
            "ayuda": "Lo que dicen los vecinos o las personas que recibieron el apoyo es una forma sencilla de saber si sirvió.",
            "antes": "Comentarios de la comunidad"
          },
          {
            "texto": "Guardamos fotos, listas de asistencia o actas de las actividades",
            "ayuda": "Evidencias sencillas que permiten mostrar lo que se hizo y cuándo.",
            "antes": "Fotos o registros"
          },
          {
            "texto": "Contamos cuántas personas se beneficiaron con cada apoyo",
            "ayuda": "Por ejemplo, el número de niños que recibieron útiles escolares o de familias que recibieron mercado.",
            "antes": "Número de personas beneficiadas"
          },
          {
            "texto": "Notamos que la relación con los vecinos mejoró: menos quejas, más confianza o trabajo conjunto",
            "ayuda": "Un cambio en la relación también es un resultado, aunque no se mida en cifras.",
            "antes": "Relación con vecinos"
          }
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

/** Texto vigente de cada ejemplo, por pregunta y por su texto anterior. */
const EJEMPLO_VIGENTE: Map<string, Map<string, string>> = new Map(
  PREGUNTAS.map((p: Pregunta) => [
    p.id,
    new Map(p.ejemplos.flatMap((e) => (e.antes ? [[e.antes, e.texto] as [string, string]] : []))),
  ]),
)

/**
 * Traduce los ejemplos marcados con el texto corto de la versión anterior
 * («Trato respetuoso») al texto descriptivo vigente. Así una respuesta
 * guardada antes del cambio (en el navegador o en el servidor) sigue
 * mostrando marcados sus ejemplos. Lo que no reconoce lo deja igual y
 * quita los repetidos.
 */
export function actualizarEjemplos(preguntaId: string, ejemplos: readonly string[]): string[] {
  const mapa = EJEMPLO_VIGENTE.get(preguntaId)
  const vigentes = ejemplos.map((e) => mapa?.get(e) ?? e)
  return [...new Set(vigentes)]
}
