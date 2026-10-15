/**
 * SOLO PARA DESARROLLO Y PRUEBAS.
 *
 * Genera un perfil, un tamizaje y un autodiagnóstico RSE Express completos
 * y verosímiles para probar los resultados y el «Análisis inteligente» sin
 * llenar las encuestas a mano. Cada llamada sale distinta (salvo que se le
 * pase un azar fijo), así que el backend calcula otra huella y vuelve a
 * pedirle el análisis a Gemini en vez de reutilizar el guardado.
 *
 * Las respuestas abiertas están escritas pregunta por pregunta y en tres
 * niveles (informal, organizado, con resultados) para que el texto sea
 * coherente con la etapa elegida: así la IA recibe algo parecido a lo que
 * escribiría una empresa real.
 */
import type {
  Diagnostico, Etapa, Perfil, RangoIngresos, RespuestaPregunta, SectorId, Tamano, Tamizaje, TipoCliente,
  Vinculacion, Zona,
} from '../types'
import { RSE_EXPRESS } from '../data/rseExpress'
import { calcularDV } from '../data/nit'

export type Escenario = 'avanzada' | 'intermedia' | 'inicial' | 'mixta'

export const ESCENARIOS: { id: Escenario; nombre: string; ayuda: string }[] = [
  { id: 'avanzada', nombre: 'Empresa avanzada', ayuda: 'Casi todo con resultados o en mejora continua.' },
  { id: 'intermedia', nombre: 'Empresa intermedia', ayuda: 'Prácticas organizadas o informales, alguna «diferente» y algún «no aplica».' },
  { id: 'inicial', nombre: 'Empresa que empieza', ayuda: 'Mucho «aún no lo hemos abordado» y prácticas informales.' },
  { id: 'mixta', nombre: 'Mixta', ayuda: 'Cada materia con un nivel distinto: fuerte en unas, débil en otras.' },
]

/** Devuelve un número en [0, 1). Por defecto Math.random; en las pruebas se fija. */
export type Azar = () => number

/** Generador con semilla (mulberry32), para pruebas reproducibles. */
export function azarConSemilla(semilla: number): Azar {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function elegir<T>(azar: Azar, opciones: readonly T[]): T {
  return opciones[Math.floor(azar() * opciones.length)]
}

function elegirPonderado<T>(azar: Azar, opciones: readonly (readonly [T, number])[]): T {
  const total = opciones.reduce((s, [, p]) => s + p, 0)
  let r = azar() * total
  for (const [v, p] of opciones) {
    r -= p
    if (r < 0) return v
  }
  return opciones[opciones.length - 1][0]
}

function entero(azar: Azar, min: number, max: number): number {
  return min + Math.floor(azar() * (max - min + 1))
}

/* ------------------------------------------------------------- respuestas */

interface Nivel { texto: string; ejemplos: string[] }
interface Guion { bajo: Nivel; medio: Nivel; alto: Nivel; otro: string }

/** Respuesta abierta por pregunta y nivel. Los ejemplos son textos exactos del catálogo. */
export const GUIONES: Record<string, Guion> = {
  '01a': {
    bajo: { texto: 'Ayudamos cuando alguien lo pide: a veces un préstamo a un trabajador o una donación al barrio. Lo decide el dueño en el momento.', ejemplos: ['Lo decide la gerencia o el dueño'] },
    medio: { texto: 'Damos horario flexible a quienes estudian y apoyamos a una fundación del barrio. La gerencia y los socios lo acordaron en reunión, aunque no está escrito.', ejemplos: ['Lo decide la gerencia o el dueño', 'Acuerdos entre socios'] },
    alto: { texto: 'Tenemos una política escrita de bienestar, ambiente y comunidad que impulsa la gerencia con los socios. Cada año fijamos tres compromisos y revisamos si se cumplieron.', ejemplos: ['Política escrita', 'Forma parte de los valores de la empresa', 'Acuerdos entre socios'] },
    otro: 'Nos unimos a un programa de la Cámara de Comercio que nos acompaña a definir estas acciones.',
  },
  '01b': {
    bajo: { texto: 'Lo hace el gerente cuando le queda tiempo y con la plata que haya en el momento.', ejemplos: ['Lo asume el gerente', 'Se hace con recursos del momento'] },
    medio: { texto: 'La asistente administrativa coordina estas actividades unas horas al mes y la gerencia aprueba los gastos caso a caso.', ejemplos: ['Una persona encargada'] },
    alto: { texto: 'Hay una persona encargada con ocho horas al mes para estos temas y un monto fijo en el presupuesto anual que se ejecuta según un calendario.', ejemplos: ['Una persona encargada', 'Hay un monto destinado'] },
    otro: 'Rotamos la responsabilidad entre los jefes de área cada semestre.',
  },
  '01c': {
    bajo: { texto: 'Se comenta en conversaciones informales con el equipo; hacia afuera casi no lo contamos.', ejemplos: ['Conversaciones'] },
    medio: { texto: 'Lo contamos en las reuniones mensuales con el equipo y publicamos algunas fotos en redes sociales.', ejemplos: ['Reuniones', 'Redes sociales'] },
    alto: { texto: 'Publicamos un balance anual de dos páginas para socios y clientes, compartimos avances en la cartelera y en redes, y preguntamos al equipo qué opina.', ejemplos: ['Informe o balance', 'Carteleras', 'Redes sociales', 'Reuniones'] },
    otro: 'Lo contamos una vez al año en un programa de la emisora comunitaria.',
  },
  '02a': {
    bajo: { texto: 'Tratamos de que todos se traten bien; si hay un problema, el dueño habla con las personas.', ejemplos: ['Trato respetuoso'] },
    medio: { texto: 'Tenemos unas reglas de convivencia que explicamos en la inducción y no contratamos menores de edad.', ejemplos: ['Trato respetuoso', 'Reglas de convivencia', 'No contratar menores de edad'] },
    alto: { texto: 'Tenemos reglas de convivencia escritas, una selección de personal sin preguntas sobre edad, género u origen, y hemos vinculado a dos personas con discapacidad. Revisamos cada caso que se presenta.', ejemplos: ['Reglas de convivencia', 'No discriminación', 'Inclusión de personas', 'No contratar menores de edad'] },
    otro: 'Trabajamos con una fundación que nos orienta en inclusión laboral.',
  },
  '02b': {
    bajo: { texto: 'No lo hemos revisado de forma ordenada; si alguien comenta algo, se mira en el momento.', ejemplos: [] },
    medio: { texto: 'Identificamos jornadas largas en temporada alta y algunas condiciones inseguras en la bodega; el administrador las corrige cuando las ve.', ejemplos: ['Jornadas excesivas', 'Condiciones inseguras'] },
    alto: { texto: 'Cada semestre revisamos las condiciones de trabajo en la empresa y con los proveedores principales, y dejamos registro de lo encontrado y de cómo se corrigió.', ejemplos: ['Condiciones inseguras', 'Jornadas excesivas'] },
    otro: 'Pedimos a los proveedores que firmen una carta de compromiso de buenas prácticas.',
  },
  '02c': {
    bajo: { texto: 'Las personas hablan directamente con el dueño y él decide qué hacer.', ejemplos: ['Habla directamente con el dueño'] },
    medio: { texto: 'Tenemos una línea de WhatsApp y un buzón; la administradora revisa los mensajes cada semana y responde.', ejemplos: ['Línea o WhatsApp', 'Buzón'] },
    alto: { texto: 'Hay un procedimiento escrito: recibimos inquietudes por WhatsApp, buzón o en reunión, respondemos en máximo ocho días y llevamos un registro de los casos.', ejemplos: ['Procedimiento escrito', 'Línea o WhatsApp', 'Buzón', 'Reunión'] },
    otro: 'Dos veces al año hacemos una reunión abierta con los vecinos para escuchar inquietudes.',
  },
  '03a': {
    bajo: { texto: 'Los acuerdos se hacen de palabra con cada persona y se conversa cuando surge algo.', ejemplos: ['Conversación directa con la gerencia'] },
    medio: { texto: 'Todos tienen contrato escrito y hay reglamento interno; hacemos reuniones mensuales y tenemos un grupo de chat para comentar lo que funciona.', ejemplos: ['Contratos escritos', 'Reglamento interno', 'Reuniones periódicas', 'Grupo de chat'] },
    alto: { texto: 'Contratos escritos, reglamento actualizado y un comité que se reúne cada mes. Aplicamos una encuesta de clima cada año y hemos hecho cambios a partir de ella.', ejemplos: ['Contratos escritos', 'Reglamento interno', 'Comité', 'Reuniones periódicas'] },
    otro: 'Cada trabajador tiene una conversación individual con la gerencia cada trimestre.',
  },
  '03b': {
    bajo: { texto: 'Todos están afiliados a la ARL y entregamos algunos elementos de protección cuando los piden.', ejemplos: ['Afiliación a ARL', 'Elementos de protección'] },
    medio: { texto: 'Afiliación a la ARL, entrega de elementos de protección y una persona encargada del SG-SST con apoyo de la ARL; hacemos pausas activas.', ejemplos: ['Afiliación a ARL', 'Elementos de protección', 'Pausas activas', 'SG-SST'] },
    alto: { texto: 'Tenemos el SG-SST implementado con su responsable, capacitaciones cada trimestre y revisión de equipos. Los accidentes bajaron de cinco a uno en el último año.', ejemplos: ['SG-SST', 'Capacitaciones', 'Revisión de equipos', 'Afiliación a ARL', 'Elementos de protección'] },
    otro: 'Una brigada de trabajadores revisa cada mes los puntos de riesgo y propone mejoras.',
  },
  '03c': {
    bajo: { texto: 'Aprenden en el día a día con los compañeros que tienen más experiencia.', ejemplos: ['Aprendizaje entre compañeros'] },
    medio: { texto: 'Hacemos inducción a quienes llegan y algunos han tomado cursos del SENA; el jefe revisa cómo les va.', ejemplos: ['Inducción', 'Cursos SENA', 'Seguimiento del jefe'] },
    alto: { texto: 'Hay un plan de capacitación anual con cursos del SENA y formaciones internas; el jefe hace seguimiento y medimos menos reprocesos después de cada formación.', ejemplos: ['Capacitaciones', 'Cursos SENA', 'Seguimiento del jefe', 'Inducción'] },
    otro: 'Cada mes un trabajador le enseña al resto del equipo algo de su oficio.',
  },
  '04a': {
    bajo: { texto: 'Tratamos de no desperdiciar, pero no tenemos una meta ambiental.', ejemplos: ['Reducir consumos'] },
    medio: { texto: 'Queremos reducir el consumo de energía y manejar mejor los residuos; el administrador está pendiente, aunque no está escrito.', ejemplos: ['Reducir consumos', 'Manejar mejor los residuos'] },
    alto: { texto: 'Nos propusimos bajar 10 % el consumo de energía este año y cambiamos los empaques plásticos por cartón, que además nos lo pidió un cliente grande.', ejemplos: ['Reducir consumos', 'Cambiar materiales', 'Cumplir un requisito de un cliente', 'Manejar mejor los residuos'] },
    otro: 'Participamos en una mesa ambiental del gremio que nos propone metas comunes.',
  },
  '04b': {
    bajo: { texto: 'Apagamos luces y equipos al salir; los residuos se van con la basura común.', ejemplos: ['Apagar equipos'] },
    medio: { texto: 'Apagamos equipos, cerramos llaves y separamos el cartón y el plástico para un reciclador del barrio.', ejemplos: ['Apagar equipos', 'Ahorro de agua', 'Separar y reciclar'] },
    alto: { texto: 'Usamos bombillos LED con sensores, reutilizamos cajas, separamos en la fuente y entregamos los residuos especiales a un gestor autorizado que nos da certificado.', ejemplos: ['Ahorro de agua', 'Reutilizar', 'Separar y reciclar', 'Entregar a gestor autorizado'] },
    otro: 'Compostamos los residuos orgánicos y el abono se usa en una huerta vecina.',
  },
  '04c': {
    bajo: { texto: 'A veces miramos si el recibo de la luz llegó más alto, pero no llevamos cuentas.', ejemplos: ['Revisan recibos de servicios'] },
    medio: { texto: 'Revisamos cada mes los recibos de agua y energía y comentamos si subieron o bajaron.', ejemplos: ['Revisan recibos de servicios', 'Observan cambios'] },
    alto: { texto: 'Llevamos un registro mensual de consumos y de kilos reciclados; con eso cambiamos la iluminación de la bodega y el consumo de energía bajó 12 %.', ejemplos: ['Llevan un registro', 'Revisan recibos de servicios', 'Pesan o cuentan residuos'] },
    otro: 'El reciclador nos entrega cada trimestre un reporte de lo que recibe.',
  },
  '05a': {
    bajo: { texto: 'El dueño revisa los pagos; no se ha hablado del tema con el equipo.', ejemplos: ['La gerencia revisa y aprueba los pagos'] },
    medio: { texto: 'La gerencia aprueba todos los pagos, los gastos grandes los aprueban dos personas y no aceptamos regalos de proveedores.', ejemplos: ['La gerencia revisa y aprueba los pagos', 'Dos personas aprueban gastos importantes', 'No se aceptan regalos o favores de proveedores'] },
    alto: { texto: 'Tenemos un código de conducta escrito, reglas para compras y pagos y doble aprobación de gastos importantes; lo repasamos con el equipo cada año y el contador revisa que se cumpla.', ejemplos: ['Código de conducta o política escrita', 'Reglas claras para compras y pagos', 'Dos personas aprueban gastos importantes', 'Se habla del tema con el equipo'] },
    otro: 'Un socio externo revisa las compras grandes cada trimestre.',
  },
  '05b': {
    bajo: { texto: 'Compramos donde nos conocen y nos dan crédito.', ejemplos: ['Relación de confianza'] },
    medio: { texto: 'Preferimos proveedores locales y formalizados con los que ya tenemos confianza.', ejemplos: ['Que sean locales', 'Que estén formalizados', 'Relación de confianza'] },
    alto: { texto: 'Tenemos criterios escritos: proveedores locales, formalizados, que cuiden el ambiente y traten bien a su gente. Los evaluamos una vez al año.', ejemplos: ['Que sean locales', 'Que estén formalizados', 'Que cuiden el ambiente', 'Que traten bien a su gente'] },
    otro: 'Compramos a asociaciones de productores campesinos de la región.',
  },
  '05c': {
    bajo: { texto: 'Damos precios claros y tenemos los trámites al día con ayuda del contador.', ejemplos: ['Precios y ofertas claras', 'Trámites al día'] },
    medio: { texto: 'Precios y ofertas claras, trámites al día, y la gerencia revisa las cotizaciones antes de enviarlas.', ejemplos: ['Precios y ofertas claras', 'Trámites al día', 'Revisión de la gerencia'] },
    alto: { texto: 'Además de precios claros y trámites al día, una asesoría contable y jurídica revisa cada semestre los contratos, las licitaciones y la publicidad.', ejemplos: ['Precios y ofertas claras', 'Trámites al día', 'Asesoría contable o jurídica', 'Revisión de la gerencia'] },
    otro: 'Pertenecemos a una red empresarial con un pacto de competencia leal.',
  },
  '06a': {
    bajo: { texto: 'Le explicamos directamente al cliente cómo usar el producto cuando pregunta.', ejemplos: ['Explicación directa'] },
    medio: { texto: 'Los productos tienen etiquetas claras y garantía; revisamos la calidad de cada lote antes de despacharlo.', ejemplos: ['Etiquetas o fichas claras', 'Garantías', 'Controles de calidad'] },
    alto: { texto: 'Fichas técnicas claras, garantía escrita y control de calidad por lote con registro; las devoluciones bajaron a menos del 1 %.', ejemplos: ['Etiquetas o fichas claras', 'Garantías', 'Controles de calidad', 'Explicación directa'] },
    otro: 'Invitamos a algunos clientes a probar los productos nuevos antes de lanzarlos.',
  },
  '06b': {
    bajo: { texto: 'Guardamos nombres y teléfonos de clientes en un cuaderno y en el celular de ventas.', ejemplos: [] },
    medio: { texto: 'Tenemos una base de datos de clientes en el computador, con contraseña, y solo el área de ventas tiene acceso.', ejemplos: ['Contraseñas', 'Acceso restringido'] },
    alto: { texto: 'Tenemos política de tratamiento de datos, pedimos autorización al registrar al cliente, el acceso está restringido y las contraseñas se cambian cada trimestre.', ejemplos: ['Política de datos', 'Piden autorización', 'Acceso restringido', 'Contraseñas'] },
    otro: 'Un proveedor de software maneja la base de datos y nos envía reportes de seguridad.',
  },
  '06c': {
    bajo: { texto: 'Atendemos las quejas en persona o por WhatsApp cuando llegan.', ejemplos: ['Atención directa', 'WhatsApp o redes'] },
    medio: { texto: 'Recibimos quejas por WhatsApp, correo o en el punto de venta y las anotamos en un formato.', ejemplos: ['WhatsApp o redes', 'Correo', 'Formato o registro'] },
    alto: { texto: 'Registramos cada queja, respondemos en máximo tres días hábiles y cada mes revisamos los tiempos y las causas más repetidas para corregirlas.', ejemplos: ['Formato o registro', 'Seguimiento de tiempos', 'Correo', 'WhatsApp o redes'] },
    otro: 'Una semana después de cada compra llamamos al cliente para saber cómo le fue.',
  },
  '07a': {
    bajo: { texto: 'Conocemos a los vecinos y a veces apoyamos alguna actividad del barrio.', ejemplos: ['Apoya iniciativas'] },
    medio: { texto: 'Contratamos personas de la zona y participamos en las actividades de la junta de acción comunal.', ejemplos: ['Contrata personas de la zona', 'Participa en actividades del barrio o municipio'] },
    alto: { texto: 'La mitad del equipo es de la zona, nos reunimos con la junta de acción comunal cada trimestre y apoyamos un proyecto acordado con ellos.', ejemplos: ['Contrata personas de la zona', 'Conversa con vecinos, líderes u organizaciones', 'Participa en actividades del barrio o municipio', 'Apoya iniciativas'] },
    otro: 'Prestamos nuestras instalaciones los fines de semana para actividades de la comunidad.',
  },
  '07b': {
    bajo: { texto: 'Damos donaciones cuando alguien viene a pedir; lo decide el dueño.', ejemplos: ['Donaciones'] },
    medio: { texto: 'Patrocinamos el torneo de fútbol del barrio y hacemos donaciones en diciembre; la gerencia decide según lo que pidan.', ejemplos: ['Patrocinios', 'Donaciones'] },
    alto: { texto: 'Tenemos un criterio: apoyar la educación y el empleo de jóvenes de la zona. Elegimos con la junta y el equipo propone actividades de voluntariado.', ejemplos: ['Empleo local', 'Voluntariado', 'Patrocinios'] },
    otro: 'Destinamos un porcentaje de las ventas de un producto a una causa que eligen los clientes.',
  },
  '07c': {
    bajo: { texto: 'La gente nos agradece, pero no llevamos registro.', ejemplos: ['Comentarios de la comunidad'] },
    medio: { texto: 'Guardamos fotos de las actividades y notamos una mejor relación con los vecinos.', ejemplos: ['Fotos o registros', 'Relación con vecinos'] },
    alto: { texto: 'Contamos cuántas personas se benefician (unas 120 al año) y le preguntamos a la junta qué cambió; con eso ajustamos el apoyo del año siguiente.', ejemplos: ['Número de personas beneficiadas', 'Fotos o registros', 'Comentarios de la comunidad'] },
    otro: 'Una universidad nos ayudó a hacer una encuesta con la comunidad.',
  },
}

const SIN_ABORDAR = 'Por ahora no hacemos nada en este tema.'
const MEJORA_CONTINUA = 'Cada año revisamos lo que funcionó y lo ajustamos con lo aprendido.'

type NivelBase = Exclude<Escenario, 'mixta'>

/** Probabilidad de cada etapa según el escenario. */
const REPARTO: Record<NivelBase, readonly (readonly [Etapa, number])[]> = {
  avanzada: [[4, 30], [3, 40], [2, 20], [1, 5], ['diferente', 5]],
  intermedia: [[3, 15], [2, 35], [1, 30], [0, 5], ['diferente', 10], ['NA', 5]],
  inicial: [[0, 30], [1, 45], [2, 15], ['diferente', 5], ['NA', 5]],
}

function respuestaPara(guion: Guion, etapa: Etapa, permitidos: readonly string[]): RespuestaPregunta {
  const vacia = { texto: '', ejemplos: [] as string[], otro: '', clasificada: null }
  if (etapa === 'NA') return { ...vacia, etapa }
  if (etapa === 0) return { ...vacia, texto: SIN_ABORDAR, etapa }
  if (etapa === 'diferente') return { ...vacia, texto: guion.bajo.texto, otro: guion.otro, etapa }
  const nivel = etapa === 1 ? guion.bajo : etapa === 2 ? guion.medio : guion.alto
  return {
    ...vacia,
    texto: etapa === 4 ? `${nivel.texto} ${MEJORA_CONTINUA}` : nivel.texto,
    // Defensivo: solo ejemplos que existen en el catálogo (la pantalla los
    // muestra como casillas; uno que no exista quedaría invisible).
    ejemplos: nivel.ejemplos.filter((e) => permitidos.includes(e)),
    etapa,
  }
}

/** «¿Qué le gustaría fortalecer?» por materia: [si empieza, si ya avanzó]. */
const FORTALECER: Record<string, readonly [string, string]> = {
  '01': ['Queremos definir por escrito qué acciones sociales y ambientales vamos a sostener y quién las lidera.', 'Queremos medir mejor el avance de nuestros compromisos y contárselo a clientes y socios.'],
  '02': ['Nos gustaría tener reglas de convivencia claras y un canal para recibir quejas.', 'Queremos extender la revisión de condiciones de trabajo a todos los proveedores.'],
  '03': ['Queremos organizar la seguridad y salud en el trabajo con apoyo de la ARL.', 'Queremos un plan de carrera para que el equipo crezca dentro de la empresa.'],
  '04': ['Nos gustaría empezar a separar los residuos y llevar la cuenta de los consumos.', 'Queremos fijar metas de reducción de agua y energía y buscar una certificación.'],
  '05': ['Queremos reglas claras para compras y pagos.', 'Queremos que los proveedores principales también cumplan criterios sociales y ambientales.'],
  '06': ['Queremos organizar la atención de quejas y cuidar mejor los datos de los clientes.', 'Queremos medir la satisfacción de los clientes cada semestre.'],
  '07': ['Nos gustaría acercarnos más a la junta de acción comunal.', 'Queremos medir el impacto de los apoyos a la comunidad.'],
}

const COMENTARIOS = [
  'Apoyamos cada año la fiesta patronal del municipio con refrigerios.',
  'Varias trabajadoras son madres cabeza de hogar y les damos horario flexible.',
  'Dos veces al año hacemos con el equipo una jornada de limpieza del parque cercano.',
  '',
]

export function generarDiagnostico(escenario: Escenario, azar: Azar = Math.random): Diagnostico {
  const respuestas: Diagnostico['respuestas'] = {}
  const fortalecer: Diagnostico['fortalecer'] = {}
  for (const materia of RSE_EXPRESS.materias) {
    const nivel: NivelBase = escenario === 'mixta'
      ? elegir(azar, ['avanzada', 'intermedia', 'inicial'] as const)
      : escenario
    for (const p of materia.preguntas) {
      const guion = GUIONES[p.id]
      if (!guion) throw new Error(`Falta el guion de prueba de la pregunta ${p.id}`)
      respuestas[p.id] = respuestaPara(guion, elegirPonderado(azar, REPARTO[nivel]), p.ejemplos)
    }
    const [empieza, avanzo] = FORTALECER[materia.numero] ?? ['', '']
    fortalecer[materia.numero] = nivel === 'inicial' ? empieza : nivel === 'avanzada' ? avanzo : elegir(azar, [empieza, avanzo])
  }
  return { respuestas, fortalecer, comentarioFinal: elegir(azar, COMENTARIOS) }
}

/* ------------------------------------------------------ perfil y tamizaje */

const EMPRESAS: { nombre: string; sector: SectorId }[] = [
  { nombre: 'Panadería El Trigal', sector: 'comercio' },
  { nombre: 'Confecciones Andinas', sector: 'industrial' },
  { nombre: 'Café de la Montaña', sector: 'agroindustrial' },
  { nombre: 'Soluciones Contables del Sur', sector: 'servicios' },
  { nombre: 'Transportes La Ruta', sector: 'movilidad' },
  { nombre: 'Estación de Servicio El Puente', sector: 'energia' },
]

/** Pares departamento/municipio que existen en data/colombia.ts. */
export const UBICACIONES: readonly (readonly [string, string])[] = [
  ['Nariño', 'Pasto'], ['Nariño', 'Ipiales'], ['Antioquia', 'Medellín'], ['Cundinamarca', 'Bogotá'],
  ['Valle del Cauca', 'Cali'], ['Santander', 'Bucaramanga'],
]

/** Prefijo de las empresas de prueba, para encontrarlas y borrarlas en la base. */
export const PREFIJO_PRUEBA = 'PRUEBA · '

export function generarPerfil(azar: Azar = Math.random): Perfil {
  const empresa = elegir(azar, EMPRESAS)
  const [departamento, municipio] = elegir(azar, UBICACIONES)
  // NIT de 9 dígitos que empieza por 9 (personas jurídicas), con su DV real.
  let nit = '9'
  for (let i = 0; i < 8; i++) nit += String(Math.floor(azar() * 10))
  return {
    razonSocial: `${PREFIJO_PRUEBA}${empresa.nombre} S.A.S.`,
    nit, dv: calcularDV(nit) ?? '0',
    sector: empresa.sector, municipio, departamento, extranjera: false,
  }
}

const TERRITORIOS = [
  'Barrio comercial del centro, cerca de un colegio y de un parque.',
  'Zona industrial a la salida de la ciudad, junto a una vereda.',
  'Corregimiento rural rodeado de fincas cafeteras.',
  'Varios barrios de la ciudad donde están nuestros puntos de venta.',
]

export function generarTamizaje(azar: Azar = Math.random): Tamizaje {
  const tamano = elegirPonderado<Exclude<Tamano, 'nose'>>(azar, [['micro', 25], ['pequena', 50], ['mediana', 25]])
  const personas = tamano === 'micro' ? entero(azar, 3, 10) : tamano === 'pequena' ? entero(azar, 11, 50) : entero(azar, 51, 200)
  const ingresosPosibles: Record<typeof tamano, RangoIngresos[]> = {
    micro: ['menos_1000m'],
    pequena: ['menos_1000m', '1000m_10000m'],
    mediana: ['1000m_10000m', '10000m_50000m'],
  }
  const ingresos = azar() < 0.15 ? 'no_indica' : elegir(azar, ingresosPosibles[tamano])

  const vinculacion: Vinculacion[] = ['laboral']
  for (const v of ['servicios', 'socios', 'temporada'] as const) if (azar() < 0.35) vinculacion.push(v)

  const zonas: Zona[] = [elegirPonderado<Zona>(azar, [['barrios', 50], ['veredas', 20], ['rural', 20], ['indigenas', 5], ['afro', 5]])]
  if (azar() < 0.3 && !zonas.includes('barrios')) zonas.push('barrios')

  // Con «personas» o «mezcla» aplica la materia Consumidores (06).
  const clientes = elegirPonderado<TipoCliente>(azar, [['personas', 35], ['mezcla', 30], ['empresas', 25], ['publicas', 10]])

  return {
    tamano, ingresos, personas: String(personas), vinculacion,
    vinculacionDetalle: vinculacion.includes('temporada') ? 'En diciembre contratamos personal de apoyo por dos meses.' : '',
    zonas, territorio: elegir(azar, TERRITORIOS),
    clientes,
    clientesDetalle: clientes === 'mezcla' ? 'Vendemos al detal y también a tiendas y restaurantes.' : '',
  }
}

/* ------------------------------------------------------------------ todo */

export interface DatosPrueba {
  perfil: Perfil
  tamizaje: Tamizaje
  diagnostico: Diagnostico
}

/**
 * Datos completos para un escenario. Con `perfilActual` se conserva el
 * perfil de la cuenta (útil si la empresa ya está registrada en el backend:
 * no cambia su NIT ni su razón social).
 */
export function generarDatosPrueba(
  escenario: Escenario,
  { perfilActual = null, azar = Math.random }: { perfilActual?: Perfil | null; azar?: Azar } = {},
): DatosPrueba {
  return {
    perfil: perfilActual ?? generarPerfil(azar),
    tamizaje: generarTamizaje(azar),
    diagnostico: generarDiagnostico(escenario, azar),
  }
}
