/**
 * Glosario de términos poco comunes que aparecen en el tamizaje y en las
 * preguntas del autodiagnóstico. Al pasar el mouse (o tocar, o llegar con
 * el teclado) por una de estas palabras, se muestra la definición.
 *
 * `formas` son las maneras en que el término aparece en los textos, en
 * minúscula; se reconocen sin importar mayúsculas y solo como palabra
 * completa. Las definiciones son cortas, en lenguaje sencillo y sin
 * cifras que puedan quedar desactualizadas.
 *
 * Las opciones de selección (chips, botones, etapas) no usan este
 * glosario: cada una trae su propia ayuda (data/tamizaje.ts, data/escala.ts
 * y los ejemplos de data/rseExpress.ts).
 */
export interface EntradaGlosario {
  formas: string[]
  definicion: string
}

export const GLOSARIO: EntradaGlosario[] = [
  {
    formas: ['rse'],
    definicion: 'Responsabilidad Social Empresarial: la forma en que una empresa cuida a sus trabajadores, sus clientes, el ambiente y la comunidad mientras hace su negocio.',
  },
  {
    formas: ['ingresos anuales'],
    definicion: 'Todo el dinero que la empresa recibe en un año por sus ventas o servicios, antes de descontar gastos e impuestos.',
  },
  {
    formas: ['vinculadas', 'vinculación'],
    definicion: 'El tipo de relación que tiene cada persona con la empresa: contrato laboral, prestación de servicios, socio o familiar, por temporada, entre otras.',
  },
  {
    formas: ['su operación', 'la operación'],
    definicion: 'Los lugares donde la empresa produce, guarda, transporta o vende: su sede, planta, local, bodega, finca o punto de venta.',
  },
  {
    formas: ['actividad comercial'],
    definicion: 'Lo que la empresa hace para ganar dinero: producir, vender o prestar sus servicios.',
  },
  {
    formas: ['recursos'],
    definicion: 'Lo que se necesita para hacer algo: dinero, tiempo, personas, materiales o espacios.',
  },
  {
    formas: ['dignidad'],
    definicion: 'El valor que tiene toda persona y que exige tratarla con respeto, sin humillaciones, abusos ni malos tratos.',
  },
  {
    formas: ['proveedores'],
    definicion: 'Personas o empresas que le venden a su empresa los materiales, productos o servicios que necesita para trabajar.',
  },
  {
    formas: ['condiciones de trabajo'],
    definicion: 'Lo que se acuerda con cada persona: salario, horario, funciones, descansos, prestaciones y el lugar donde trabaja.',
  },
  {
    formas: ['acciones ambientales'],
    definicion: 'Lo que hace la empresa para disminuir su impacto en la naturaleza: ahorrar agua y energía, manejar bien los residuos o evitar la contaminación.',
  },
  {
    formas: ['residuos'],
    definicion: 'Lo que sobra o se desecha en la operación: empaques, papel, plástico, restos de comida o de materiales, aceites o chatarra.',
  },
  {
    formas: ['corrupción'],
    definicion: 'Usar un cargo o una posición para obtener un beneficio indebido; por ejemplo, pagar o recibir un soborno para conseguir un contrato o agilizar un trámite.',
  },
  {
    formas: ['conflictos de interés', 'conflicto de interés'],
    definicion: 'Cuando alguien de la empresa debe tomar una decisión en la que también gana él, un familiar o un amigo; por ejemplo, comprarle a la empresa de un primo.',
  },
  {
    formas: ['transparencia', 'transparente', 'transparentes'],
    definicion: 'Actuar de forma clara y abierta: que las decisiones, los pagos y los acuerdos se puedan explicar y revisar sin esconder nada.',
  },
  {
    formas: ['competir de manera honesta'],
    definicion: 'Ganar clientes por la calidad, el servicio y el precio, sin engañar, sin desprestigiar a otros y sin ponerse de acuerdo con la competencia para fijar precios.',
  },
  {
    formas: ['entidades públicas'],
    definicion: 'Organismos del Estado, como alcaldías, gobernaciones, ministerios, la DIAN u hospitales y colegios oficiales.',
  },
  {
    formas: ['información personal', 'datos personales'],
    definicion: 'Datos que identifican a una persona: nombre, cédula, teléfono, correo o dirección. En Colombia su manejo está protegido por la Ley 1581 de 2012.',
  },
  {
    formas: ['consumidor final'],
    definicion: 'La persona que compra un producto o un servicio para usarlo ella misma o su familia, y no para revenderlo o usarlo en otro negocio.',
  },
  {
    formas: ['reclamo'],
    definicion: 'Una queja expresa una inconformidad con la atención; un reclamo pide corregir un problema con lo que se compró, por ejemplo hacer válida una garantía.',
  },
  {
    formas: ['donaciones'],
    definicion: 'Entregar dinero, productos o servicios sin esperar nada a cambio.',
  },
  {
    formas: ['patrocinios'],
    definicion: 'Apoyo en dinero o en especie a un evento, un equipo o una actividad, a cambio de que aparezca el nombre de la empresa.',
  },
  {
    formas: ['empleo local'],
    definicion: 'Contratar a personas que viven en el barrio, la vereda o el municipio donde opera la empresa.',
  },
  {
    formas: ['voluntariado'],
    definicion: 'Cuando las personas de la empresa donan su tiempo o su conocimiento para apoyar una causa de la comunidad.',
  },
]

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const POR_FORMA = new Map<string, EntradaGlosario>(
  GLOSARIO.flatMap((e) => e.formas.map((f) => [f.toLocaleLowerCase('es'), e] as [string, EntradaGlosario])),
)

// Las formas más largas primero, para que «conflictos de interés» gane a
// una forma más corta que empiece igual. Solo palabras completas: ni letra
// ni número inmediatamente antes o después.
const PATRON = new RegExp(
  '(?<![\\p{L}\\p{N}])('
    + [...POR_FORMA.keys()].sort((a, b) => b.length - a.length).map(escapar).join('|')
    + ')(?![\\p{L}\\p{N}])',
  'giu',
)

export type Fragmento = string | { texto: string; definicion: string }

/**
 * Parte un texto en fragmentos: texto plano y términos del glosario con su
 * definición. Cada término se marca solo la primera vez que aparece en el
 * texto, para no llenarlo de subrayados.
 */
export function partirConGlosario(texto: string): Fragmento[] {
  const salida: Fragmento[] = []
  const usados = new Set<EntradaGlosario>()
  let desde = 0
  for (const m of texto.matchAll(PATRON)) {
    const entrada = POR_FORMA.get(m[0].toLocaleLowerCase('es'))
    if (!entrada || usados.has(entrada) || m.index === undefined) continue
    usados.add(entrada)
    if (m.index > desde) salida.push(texto.slice(desde, m.index))
    salida.push({ texto: m[0], definicion: entrada.definicion })
    desde = m.index + m[0].length
  }
  if (desde < texto.length) salida.push(texto.slice(desde))
  return salida
}
