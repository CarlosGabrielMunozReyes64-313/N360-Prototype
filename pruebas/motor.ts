import { FORMATO_01, PESOS_SECTOR } from '../src/data/formato01'
import { FORMATO_02 } from '../src/data/formato02'
import { evaluarFormato, pesosValidos, progreso, leyAplicable, construirPlan, evaluarBanderas, lecturaCruzada } from '../src/engine/scoring'
import type { Respuestas, Tamizaje, Valor } from '../src/types'

let fallos = 0
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? '  OK   ' : '  FALLA') + '  ' + msg)
  if (!cond) fallos++
}

// ---- 1. Sumas de pesos
for (const [sec, pesos] of Object.entries(PESOS_SECTOR))
  ok(pesosValidos(Object.values(pesos)), `pesos de materia suman 1.0 — sector ${sec}`)
ok(pesosValidos(FORMATO_01.dimensiones.map(() => 1 / 7)), 'perfil neutro 1/7 pasa con tolerancia')
ok(pesosValidos(FORMATO_02.dimensiones.map(d => d.peso!)), 'dimensiones Ley 2173 suman 1.0')
for (const f of [FORMATO_01, FORMATO_02])
  for (const d of f.dimensiones) {
    ok(pesosValidos(d.secciones.map(s => s.peso)), `secciones suman 1.0 — ${d.nombre}`)
    for (const s of d.secciones)
      ok(pesosValidos(s.preguntas.map(p => p.peso)), `preguntas suman 1.0 — ${d.abrev}/${s.id}`)
  }

const tam = (o: Partial<Tamizaje> = {}): Tamizaje => ({
  tamano: 'grande', empleados: '120', areasDeVida: 'si',
  cicloPrevio: 'si', comunidadesEtnicas: 'no', consumidorFinal: 'si', ...o,
})
const llenar = (f: typeof FORMATO_01, v: Valor): Respuestas => {
  const r: Respuestas = {}
  f.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => { r[p.id] = v })))
  return r
}

// ---- 2. Techo y piso
const todo4 = evaluarFormato(FORMATO_01, llenar(FORMATO_01, 4), 'agroindustrial', tam())
ok(Math.abs(todo4.score! - 4) < 1e-9, `todo en 4 da 4.0 (dio ${todo4.score})`)
const todo0 = evaluarFormato(FORMATO_01, llenar(FORMATO_01, 0), 'servicios', tam())
ok(todo0.score === 0, `todo en 0 da 0.0 (dio ${todo0.score})`)

// ---- 3. El sector cambia el resultado
const mix: Respuestas = {}
FORMATO_01.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => {
  mix[p.id] = d.id === 'ambiente' ? 4 : 1
})))
const agro = evaluarFormato(FORMATO_01, mix, 'agroindustrial', tam()).score!
const serv = evaluarFormato(FORMATO_01, mix, 'servicios', tam()).score!
ok(agro > serv, `ambiental fuerte pesa más en agroindustrial (${agro.toFixed(2)}) que en servicios (${serv.toFixed(2)})`)

// ---- 4. N/A renormaliza en vez de puntuar cero
const conNA: Respuestas = { ...llenar(FORMATO_01, 4) }
conNA['consumidores.a'] = 'NA'; conNA['consumidores.b'] = 'NA'; conNA['consumidores.c'] = 'NA'
const rNA = evaluarFormato(FORMATO_01, conNA, 'comercio', tam())
ok(Math.abs(rNA.score! - 4) < 1e-9, `N/A no hunde el puntaje: sigue en 4.0 (dio ${rNA.score?.toFixed(3)})`)
ok(Math.abs(rNA.cobertura - 0.78) < 1e-9, `cobertura baja a 0.78 en comercio (dio ${rNA.cobertura.toFixed(2)})`)
const conCero = { ...llenar(FORMATO_01, 4), 'consumidores.a': 0 as Valor, 'consumidores.b': 0 as Valor, 'consumidores.c': 0 as Valor }
ok(evaluarFormato(FORMATO_01, conCero, 'comercio', tam()).score! < 4, 'un cero real sí baja el puntaje')

// ---- 5. Guarda de cobertura
const casiTodoNA = llenar(FORMATO_01, 'NA')
casiTodoNA['gobernanza.a'] = 4
const rPoco = evaluarFormato(FORMATO_01, casiTodoNA, 'industrial', tam())
ok(!rPoco.concluyente, `con 96% en N/A el diagnóstico no es concluyente (cobertura ${rPoco.cobertura.toFixed(2)})`)

// ---- 6. Tamizaje apaga dimensiones de la Ley 2173
const sinAreas = tam({ areasDeVida: 'no' })
const pSin = progreso(FORMATO_02, {}, sinAreas)
const pCon = progreso(FORMATO_02, {}, tam())
ok(pCon.total === 26, `con Áreas de Vida se preguntan las 26 (dio ${pCon.total})`)
ok(pSin.total === 8, `sin Áreas de Vida solo quedan 8 preguntas activas (dio ${pSin.total})`)
ok(!leyAplicable(sinAreas).exigible, 'sin Áreas de Vida la obligación no es exigible')
ok(!leyAplicable(tam({ tamano: 'micro' })).aplica, 'a una microempresa no le aplica')

// ---- 7. Techo de primer ciclo
ok(evaluarFormato(FORMATO_02, {}, '', tam({ cicloPrevio: 'no' })).techo === 3, 'primer ciclo: techo 3.0')
ok(evaluarFormato(FORMATO_02, {}, '', tam()).techo === 4, 'con ciclo previo: techo 4.0')

// ---- 8. Banderas rojas pese a puntaje alto
const casiPerfecto = llenar(FORMATO_02, 4)
casiPerfecto['4.4'] = 1
const rLey = evaluarFormato(FORMATO_02, casiPerfecto, '', tam())
const bs = evaluarBanderas(rLey)
ok(rLey.score! > 3.5, `puntaje alto pese al riesgo (${rLey.score!.toFixed(2)})`)
ok(bs.some(b => b.id === 'permanencia'), 'la bandera de mortalidad se levanta igual')

// ---- 9. Prioridad: lo crítico y lo legal van primero
const isoFlojo = evaluarFormato(FORMATO_01, llenar(FORMATO_01, 1), 'industrial', tam())
const plan = construirPlan(isoFlojo, rLey, bs, true)
ok(plan.length === 3, 'el plan trae 3 prioridades')
ok(plan[0].critica && plan[0].origen === 'ley2173', `la prioridad 1 es la crítica de Ley 2173 (${plan[0].verbo} ${plan[0].accion})`)

// ---- 10. Lectura cruzada detecta la inconsistencia
const isoAmbAlto: Respuestas = {}
FORMATO_01.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => {
  isoAmbAlto[p.id] = d.id === 'ambiente' ? 4 : 2
})))
const cruce = lecturaCruzada(
  evaluarFormato(FORMATO_01, isoAmbAlto, 'industrial', tam()),
  evaluarFormato(FORMATO_02, llenar(FORMATO_02, 1), '', tam()), true)
ok(cruce?.tono === 'alerta' && cruce.titulo.includes('Inconsistencia'),
  `se detecta autoevaluación sobreestimada: "${cruce?.titulo}"`)

console.log(fallos === 0 ? '\nTodo correcto.' : `\n${fallos} pruebas fallaron.`)
process.exit(fallos ? 1 : 0)
