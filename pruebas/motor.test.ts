import { describe, expect, it } from 'vitest'
import { MATERIAS, PESOS_SECTOR, PREGUNTAS, RSE_EXPRESS } from '../src/data/rseExpress'
import {
  LUGARES, TAMIZAJE_VACIO, VECINOS, ZONAS, alternarVecino, consumidoresAplica, enPerfilPiloto, lugaresDe,
  resumenLugares, resumenVecinos, tamizajeCompleto, vecinosDe,
} from '../src/data/tamizaje'
import { actualizarEjemplos } from '../src/data/rseExpress'
import { ETAPAS } from '../src/data/escala'
import { GLOSARIO, partirConGlosario } from '../src/data/glosario'
import { clasificar } from '../src/data/escala'
import {
  alertasInformativas, calificacionDe, categoriaDe, evaluar, mapaPracticas, oportunidades,
  pesosValidos, practicasRegistradas, preguntaCompleta, progreso, sumaPrioridad, valorInterno,
} from '../src/engine/scoring'
import type { Diagnostico, Etapa, RespuestaPregunta, Tamizaje } from '../src/types'

const TAM: Tamizaje = {
  ...TAMIZAJE_VACIO, tamano: 'pequena', personas: '24', vinculacion: ['laboral'],
  zonas: ['barrios', 'viviendas'], clientes: 'personas',
}
const r = (etapa: Etapa | null, texto = 'Lo hacemos así', extra: Partial<RespuestaPregunta> = {}): RespuestaPregunta =>
  ({ texto, ejemplos: [], otro: '', etapa, ...extra })
const todas = (etapa: Etapa, texto = 'Algo que hacemos'): Diagnostico => ({
  respuestas: Object.fromEntries(PREGUNTAS.map((p) => [p.id, r(etapa, texto)])),
  fortalecer: {}, comentarioFinal: '',
})

describe('catálogo del Anexo 1', () => {
  it('tiene 7 materias y 21 preguntas 01a…07c', () => {
    expect(MATERIAS).toHaveLength(7)
    expect(PREGUNTAS.map((p) => p.id)).toEqual(
      ['01', '02', '03', '04', '05', '06', '07'].flatMap((n) => ['a', 'b', 'c'].map((l) => n + l)),
    )
  })

  it('cada materia tiene la tríada A/D/E con pesos que suman 1', () => {
    for (const m of MATERIAS) {
      expect(m.preguntas.map((p) => p.arquetipo)).toEqual(['A', 'D', 'E'])
      expect(pesosValidos(m.preguntas.map((p) => p.peso))).toBe(true)
      expect(m.cierre).toMatch(/^¿Qué le gustaría fortalecer/)
    }
  })

  it('los pesos por sector suman 1 en cada sector', () => {
    for (const pesos of Object.values(PESOS_SECTOR)) expect(pesosValidos(Object.values(pesos))).toBe(true)
  })

  it('cada pregunta trae ejemplos, oportunidad y tres alternativas', () => {
    for (const p of PREGUNTAS) {
      expect(p.ejemplos.length).toBeGreaterThanOrEqual(4)
      expect(p.oportunidad.length).toBeGreaterThan(10)
      expect(p.alternativas).toHaveLength(3)
    }
  })

  it('marca los temas legales (SST y datos) y la materia condicional', () => {
    expect(PREGUNTAS.filter((p) => p.alertaLegal).map((p) => [p.id, p.alertaLegal])).toEqual([['03b', 'sst'], ['06b', 'datos']])
    expect(MATERIAS.find((m) => m.id === 'consumidores')?.condicional).toBe('soloConsumidorFinal')
    expect(RSE_EXPRESS.preguntaFinal).toMatch(/que no le hayamos preguntado/)
  })
})

describe('tamizaje', () => {
  it('exige T1, T2 (número y vinculación), T5a (lugar o texto), T5b (vecino o texto) y T6', () => {
    expect(tamizajeCompleto(TAM)).toBe(true)
    expect(tamizajeCompleto({ ...TAM, personas: '0' })).toBe(false)
    expect(tamizajeCompleto({ ...TAM, vinculacion: [] })).toBe(false)
    expect(tamizajeCompleto({ ...TAM, clientes: '' })).toBe(false)
    // T5a: un lugar o el texto. Un vecino solo no responde T5a.
    expect(tamizajeCompleto({ ...TAM, zonas: ['viviendas'], territorio: '  ' })).toBe(false)
    expect(tamizajeCompleto({ ...TAM, zonas: ['viviendas'], territorio: 'Vereda El Tiple' })).toBe(true)
    // T5b: un vecino (incluido «ninguno») o el texto. Un lugar solo no responde T5b.
    expect(tamizajeCompleto({ ...TAM, zonas: ['barrios'] })).toBe(false)
    expect(tamizajeCompleto({ ...TAM, zonas: ['barrios'], vecinos: 'Una escuela al lado' })).toBe(true)
    expect(tamizajeCompleto({ ...TAM, zonas: ['barrios', 'ninguno'] })).toBe(true)
  })

  it('T5a y T5b comparten la lista de zonas sin mezclarse', () => {
    const ids = ZONAS.map((z) => z.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(LUGARES.length + VECINOS.length).toBe(ids.length)
    // Los códigos anteriores a la división siguen existiendo.
    for (const viejo of ['barrios', 'veredas', 'rural', 'indigenas', 'afro', 'otras']) expect(ids).toContain(viejo)
    expect(lugaresDe(['veredas', 'indigenas', 'rural'])).toEqual(['veredas', 'rural'])
    expect(vecinosDe(['veredas', 'indigenas', 'rural'])).toEqual(['indigenas'])
    expect(resumenLugares(['veredas', 'afro'], ' Vereda La Palma ')).toBe('Veredas. Vereda La Palma')
    expect(resumenVecinos(['veredas'], '')).toBe('—')
    // Todas las opciones explican qué significan.
    for (const z of ZONAS) expect(z.ayuda.length).toBeGreaterThan(20)
  })

  it('«No hay comunidades ni vecinos cerca» excluye a los demás vecinos, no a los lugares', () => {
    expect(alternarVecino(['barrios', 'viviendas', 'afro'], 'ninguno')).toEqual(['barrios', 'ninguno'])
    expect(alternarVecino(['barrios', 'ninguno'], 'instituciones')).not.toContain('ninguno')
    expect(alternarVecino(['rural', 'ninguno'], 'campesinos')).toEqual(['rural', 'campesinos'])
    expect(alternarVecino(['rural', 'campesinos'], 'campesinos')).toEqual(['rural'])
  })

  it('Consumidores solo aplica si vende a personas o a una mezcla', () => {
    expect(consumidoresAplica({ ...TAM, clientes: 'personas' })).toBe(true)
    expect(consumidoresAplica({ ...TAM, clientes: 'mezcla' })).toBe(true)
    expect(consumidoresAplica({ ...TAM, clientes: 'empresas' })).toBe(false)
    expect(consumidoresAplica({ ...TAM, clientes: 'publicas' })).toBe(false)
  })

  it('perfil del piloto: entre 10 y 50 personas', () => {
    expect(enPerfilPiloto({ ...TAM, personas: '9' })).toBe(false)
    expect(enPerfilPiloto({ ...TAM, personas: '10' })).toBe(true)
    expect(enPerfilPiloto({ ...TAM, personas: '50' })).toBe(true)
    expect(enPerfilPiloto({ ...TAM, personas: '' })).toBe(null)
  })
})

describe('lectura interna 0–4', () => {
  it('«No aplica» sale del cálculo y no cuenta como cero', () => {
    const d = todas(4)
    d.respuestas['01a'] = r('NA', '')
    const res = evaluar(RSE_EXPRESS, d, 'servicios', TAM)
    expect(res.materias.find((m) => m.id === 'gobernanza')?.score).toBe(4)
    expect(res.score).toBeCloseTo(4)
    expect(res.cobertura).toBeLessThan(1)
  })

  it('«Hacemos algo diferente» espera la clasificación de NEXUS', () => {
    const d = todas(2)
    d.respuestas['04b'] = r('diferente', 'Compostaje comunitario')
    let res = evaluar(RSE_EXPRESS, d, 'industrial', TAM)
    expect(res.pendientes).toBe(1)
    expect(res.hojas.find((h) => h.id === '04b')?.valor).toBe(null)
    d.respuestas['04b'] = { ...d.respuestas['04b'], clasificada: 4 }
    res = evaluar(RSE_EXPRESS, d, 'industrial', TAM)
    expect(res.pendientes).toBe(0)
    expect(valorInterno(d.respuestas['04b'])).toBe(4)
    expect(res.materias.find((m) => m.id === 'ambiente')!.score!).toBeGreaterThan(2)
  })

  it('todas en la misma etapa dan exactamente esa etapa', () => {
    for (const e of [0, 1, 2, 3, 4] as const) expect(evaluar(RSE_EXPRESS, todas(e), 'comercio', TAM).score).toBeCloseTo(e)
  })

  it('Consumidores sale completa cuando T6 es otras empresas', () => {
    const tam: Tamizaje = { ...TAM, clientes: 'empresas' }
    const res = evaluar(RSE_EXPRESS, todas(3), 'industrial', tam)
    expect(res.materias.find((m) => m.id === 'consumidores')?.aplica).toBe(false)
    expect(res.hojas.filter((h) => h.fueraDeAlcance)).toHaveLength(3)
    expect(progreso(RSE_EXPRESS, todas(3), tam).total).toBe(18)
    expect(res.score).toBeCloseTo(3)
  })

  it('las bandas usan los nombres de las etapas', () => {
    expect(clasificar(0.4).etiqueta).toBe('Comenzando')
    expect(clasificar(2).etiqueta).toBe('Organizado')
    expect(clasificar(3).etiqueta).toBe('Con resultados')
    expect(clasificar(3.9).etiqueta).toBe('En mejora continua')
  })
})

describe('pregunta completa y progreso', () => {
  it('pide etapa y una descripción, salvo «aún no» y «no aplica»', () => {
    expect(preguntaCompleta(r(null))).toBe(false)
    expect(preguntaCompleta(r(2, ''))).toBe(false)
    expect(preguntaCompleta(r(2, '', { ejemplos: ['Buzón'] }))).toBe(true)
    expect(preguntaCompleta(r(2, '', { otro: 'Algo propio' }))).toBe(true)
    expect(preguntaCompleta(r(0, ''))).toBe(true)
    expect(preguntaCompleta(r('NA', ''))).toBe(true)
    expect(preguntaCompleta(r('diferente', ''))).toBe(false)
  })

  it('cuenta por materia', () => {
    const d: Diagnostico = { respuestas: { '01a': r(1), '01b': r(2, '') }, fortalecer: {}, comentarioFinal: '' }
    const p = progreso(RSE_EXPRESS, d, TAM)
    expect(p.total).toBe(21)
    expect(p.hechas).toBe(1)
    expect(p.porMateria.gobernanza).toEqual({ total: 3, hechas: 1 })
    expect(p.completo).toBe(false)
    expect(progreso(RSE_EXPRESS, todas(3), TAM).completo).toBe(true)
  })
})

describe('mapa de prácticas', () => {
  it('clasifica fortalezas, en desarrollo y oportunidades', () => {
    expect(categoriaDe(r(4))).toBe('fortaleza')
    expect(categoriaDe(r(3))).toBe('fortaleza')
    expect(categoriaDe(r(2))).toBe('desarrollo')
    expect(categoriaDe(r(1))).toBe('oportunidad')
    expect(categoriaDe(r(0, ''))).toBe('oportunidad')
    expect(categoriaDe(r('NA'))).toBe('na')
    expect(categoriaDe(r('diferente'))).toBe('diferente')
    expect(categoriaDe(r('diferente', 'x', { clasificada: 3 }))).toBe('fortaleza')
    expect(categoriaDe(undefined)).toBe('pendiente')
  })

  it('usa las palabras de la empresa y recoge «qué le gustaría fortalecer»', () => {
    const d = todas(2, 'Reunión mensual con el equipo')
    d.fortalecer['03'] = 'Queremos capacitar al equipo'
    const mapa = mapaPracticas(RSE_EXPRESS, d, 'servicios', TAM)
    const lab = mapa.find((m) => m.materia.id === 'laborales')!
    expect(lab.categoria).toBe('desarrollo')
    expect(lab.fortalecer).toBe('Queremos capacitar al equipo')
    expect(lab.practicas[0].haceHoy).toBe('Reunión mensual con el equipo')
  })

  it('cuenta prácticas registradas sin «aún no» ni «no aplica»', () => {
    const d = todas(2)
    d.respuestas['01a'] = r(0, 'Nada todavía')
    d.respuestas['01b'] = r('NA', 'No aplica')
    d.respuestas['01c'] = r(3, '')
    expect(practicasRegistradas(RSE_EXPRESS, d, TAM)).toBe(18)
  })
})

describe('matriz de priorización', () => {
  it('propone entre 3 y 5, máximo una por materia, con el verbo según la etapa', () => {
    const d = todas(1)
    d.respuestas['02a'] = r(0, '')
    d.respuestas['04a'] = r(2)
    d.respuestas['07c'] = r(3)
    const ops = oportunidades(RSE_EXPRESS, d, 'industrial', TAM)
    expect(ops.length).toBeGreaterThanOrEqual(3)
    expect(ops.length).toBeLessThanOrEqual(5)
    expect(new Set(ops.map((o) => o.materia.id)).size).toBe(ops.length)
    const VERBO: Record<number, string> = { 0: 'Empezar', 1: 'Formalizar', 2: 'Fortalecer', 3: 'Ampliar' }
    const todasOps = oportunidades(RSE_EXPRESS, d, 'industrial', TAM, 21)
    expect(todasOps).toHaveLength(7) // una por materia
    for (const o of todasOps) expect(o.verbo).toBe(VERBO[d.respuestas[o.clave].etapa as number])
    expect(todasOps.find((o) => o.materia.id === 'ddhh')?.clave).toBe('02a')
  })

  it('pone primero los temas legales en etapa inicial', () => {
    const d = todas(3)
    d.respuestas['03b'] = r(1, 'Tenemos ARL')
    d.respuestas['01a'] = r(0, '')
    const ops = oportunidades(RSE_EXPRESS, d, 'servicios', TAM)
    expect(ops[0].clave).toBe('03b')
    expect(ops[0].alertaLegal).toBe('sst')
  })

  it('no propone lo que ya está en mejora continua ni lo que no aplica', () => {
    const d = todas(4)
    d.respuestas['05a'] = r('NA', '')
    expect(oportunidades(RSE_EXPRESS, d, 'servicios', TAM)).toEqual([])
  })

  it('completa hasta tres aunque se repita materia', () => {
    const d = todas(4)
    d.respuestas['01a'] = r(1)
    d.respuestas['01b'] = r(1)
    d.respuestas['01c'] = r(1)
    expect(oportunidades(RSE_EXPRESS, d, 'servicios', TAM).map((o) => o.clave).sort()).toEqual(['01a', '01b', '01c'])
  })

  it('sugiere interés alto donde la empresa escribió qué fortalecer', () => {
    const d = todas(1)
    d.fortalecer['04'] = 'Separar residuos'
    const o = oportunidades(RSE_EXPRESS, d, 'industrial', TAM, 21).find((x) => x.materia.id === 'ambiente')!
    expect(o.interesSugerido).toBe(3)
    expect(calificacionDe(o, undefined).interes).toBe(3)
    expect(calificacionDe(o, { importancia: 2, viabilidad: 2, potencial: 2, interes: 1 }).interes).toBe(1)
  })

  it('la prioridad es la suma simple de 4 a 12', () => {
    expect(sumaPrioridad({ importancia: 3, viabilidad: 2, potencial: 3, interes: 3 })).toBe(11)
    expect(sumaPrioridad({ importancia: 1, viabilidad: 1, potencial: 1, interes: 1 })).toBe(4)
    expect(sumaPrioridad({ importancia: 3, viabilidad: null, potencial: 3, interes: 3 })).toBe(null)
  })
})

describe('alertas informativas', () => {
  const ids = (d: Diagnostico, t: Tamizaje) => alertasInformativas(RSE_EXPRESS, d, t).map((a) => a.id)

  it('Ley 2173 solo como alerta para medianas o «no estoy seguro»', () => {
    expect(ids(todas(3), { ...TAM, tamano: 'mediana' })).toContain('ley2173')
    expect(ids(todas(3), { ...TAM, tamano: 'nose' })).toContain('ley2173')
    expect(ids(todas(3), { ...TAM, tamano: 'micro' })).not.toContain('ley2173')
  })

  it('SST y datos personales cuando la etapa es inicial', () => {
    const d = todas(3)
    d.respuestas['03b'] = r(0, '')
    d.respuestas['06b'] = r(1)
    expect(ids(d, TAM)).toEqual(expect.arrayContaining(['sst', 'datos']))
    expect(ids(d, { ...TAM, clientes: 'empresas' })).not.toContain('datos')
    expect(ids(todas(3), TAM)).toEqual([])
  })

  it('territorio cuando hay comunidades étnicas cerca', () => {
    expect(ids(todas(3), { ...TAM, zonas: ['rural', 'indigenas'] })).toContain('territorio')
    expect(ids(todas(3), { ...TAM, zonas: ['afro'] })).toContain('territorio')
  })
})

describe('ejemplos descriptivos y explicaciones', () => {
  it('cada ejemplo es descriptivo, trae su ayuda y cabe en lo que guarda el backend', () => {
    for (const p of PREGUNTAS) {
      const textos = p.ejemplos.map((e) => e.texto)
      expect(new Set(textos).size).toBe(textos.length)
      for (const e of p.ejemplos) {
        expect(e.texto.length).toBeGreaterThan(40)
        expect(e.texto.length).toBeLessThanOrEqual(200)
        expect(e.ayuda.length).toBeGreaterThan(20)
        expect(e.antes).toBeTruthy()
      }
    }
  })

  it('traduce los ejemplos guardados con el texto anterior', () => {
    const p02a = PREGUNTAS.find((p) => p.id === '02a')!
    const nuevo = p02a.ejemplos.find((e) => e.antes === 'Trato respetuoso')!.texto
    expect(actualizarEjemplos('02a', ['Trato respetuoso'])).toEqual([nuevo])
    // Ya vigente, desconocido o repetido: se conserva una vez.
    expect(actualizarEjemplos('02a', [nuevo, 'Trato respetuoso', 'Otra cosa'])).toEqual([nuevo, 'Otra cosa'])
    // «Buzón» existe en 02c y en 03a con textos distintos: cuenta la pregunta.
    expect(actualizarEjemplos('02c', ['Buzón'])[0]).not.toBe(actualizarEjemplos('03a', ['Buzón'])[0])
    expect(actualizarEjemplos('99z', ['Buzón'])).toEqual(['Buzón'])
  })

  it('cada etapa explica qué significa', () => {
    for (const e of ETAPAS) expect(e.explicacion.length).toBeGreaterThan(20)
  })

  it('el glosario marca palabras completas, una vez y sin perder texto', () => {
    const texto = '¿Cómo evita la corrupción y los conflictos de interés? La corrupción afecta a proveedores.'
    const partes = partirConGlosario(texto)
    expect(partes.map((f) => (typeof f === 'string' ? f : f.texto)).join('')).toBe(texto)
    const terminos = partes.filter((f) => typeof f !== 'string').map((f) => (f as { texto: string }).texto)
    expect(terminos).toEqual(['corrupción', 'conflictos de interés', 'proveedores'])
    // No marca dentro de otra palabra.
    expect(partirConGlosario('Los RSEguros no cuentan')).toEqual(['Los RSEguros no cuentan'])
    expect(partirConGlosario('Sin términos')).toEqual(['Sin términos'])
    for (const g of GLOSARIO) expect(g.definicion.length).toBeGreaterThan(20)
  })

  it('las preguntas del autodiagnóstico tienen términos explicados', () => {
    const conTermino = PREGUNTAS.filter((p) => partirConGlosario(p.texto).some((f) => typeof f !== 'string'))
    expect(conTermino.map((p) => p.id)).toEqual(expect.arrayContaining(['02a', '02b', '04b', '05a', '06b', '07b']))
  })
})
