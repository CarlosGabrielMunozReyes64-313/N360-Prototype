import { describe, it, expect } from 'vitest'
import { FORMATO_01, PESOS_SECTOR } from '../src/data/formato01'
import { FORMATO_02 } from '../src/data/formato02'
import {
  evaluarFormato, pesosValidos, progreso, leyAplicable,
  construirPlan, evaluarBanderas, lecturaCruzada,
} from '../src/engine/scoring'
import type { Respuestas, Tamizaje, Valor } from '../src/types'

// ---- Ayudas compartidas
const tam = (o: Partial<Tamizaje> = {}): Tamizaje => ({
  tamano: 'grande', empleados: '120', areasDeVida: 'si',
  cicloPrevio: 'si', comunidadesEtnicas: 'no', consumidorFinal: 'si', ...o,
})

const llenar = (f: typeof FORMATO_01, v: Valor): Respuestas => {
  const r: Respuestas = {}
  f.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => { r[p.id] = v })))
  return r
}

describe('1. Sumas de pesos', () => {
  it.each(Object.entries(PESOS_SECTOR))('los pesos de materia suman 1.0 — sector %s', (_sector, pesos) => {
    expect(pesosValidos(Object.values(pesos))).toBe(true)
  })

  it('el perfil neutro 1/7 pasa con tolerancia', () => {
    expect(pesosValidos(FORMATO_01.dimensiones.map(() => 1 / 7))).toBe(true)
  })

  it('las dimensiones de la Ley 2173 suman 1.0', () => {
    expect(pesosValidos(FORMATO_02.dimensiones.map(d => d.peso!))).toBe(true)
  })

  it.each([FORMATO_01, FORMATO_02])('secciones y preguntas suman 1.0 en $nombre', (f) => {
    for (const d of f.dimensiones) {
      expect(pesosValidos(d.secciones.map(s => s.peso)), `secciones de ${d.nombre}`).toBe(true)
      for (const s of d.secciones)
        expect(pesosValidos(s.preguntas.map(p => p.peso)), `preguntas de ${d.abrev}/${s.id}`).toBe(true)
    }
  })
})

describe('2. Techo y piso', () => {
  it('todo en 4 da 4.0', () => {
    const r = evaluarFormato(FORMATO_01, llenar(FORMATO_01, 4), 'agroindustrial', tam())
    expect(r.score).toBeCloseTo(4, 9)
  })

  it('todo en 0 da 0.0', () => {
    const r = evaluarFormato(FORMATO_01, llenar(FORMATO_01, 0), 'servicios', tam())
    expect(r.score).toBe(0)
  })
})

describe('3. El sector cambia el resultado', () => {
  it('un desempeño ambiental fuerte pesa más en agroindustrial que en servicios', () => {
    const mix: Respuestas = {}
    FORMATO_01.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => {
      mix[p.id] = d.id === 'ambiente' ? 4 : 1
    })))
    const agro = evaluarFormato(FORMATO_01, mix, 'agroindustrial', tam()).score!
    const serv = evaluarFormato(FORMATO_01, mix, 'servicios', tam()).score!
    expect(agro).toBeGreaterThan(serv)
  })
})

describe('4. N/A renormaliza en vez de puntuar cero', () => {
  const conNA: Respuestas = {
    ...llenar(FORMATO_01, 4),
    'consumidores.a': 'NA', 'consumidores.b': 'NA', 'consumidores.c': 'NA',
  }

  it('el puntaje sigue en 4.0 con tres preguntas en N/A', () => {
    expect(evaluarFormato(FORMATO_01, conNA, 'comercio', tam()).score).toBeCloseTo(4, 9)
  })

  it('la cobertura baja a 0.78 en comercio', () => {
    expect(evaluarFormato(FORMATO_01, conNA, 'comercio', tam()).cobertura).toBeCloseTo(0.78, 9)
  })

  it('un cero real sí baja el puntaje', () => {
    const conCero: Respuestas = {
      ...llenar(FORMATO_01, 4),
      'consumidores.a': 0 as Valor, 'consumidores.b': 0 as Valor, 'consumidores.c': 0 as Valor,
    }
    expect(evaluarFormato(FORMATO_01, conCero, 'comercio', tam()).score!).toBeLessThan(4)
  })
})

describe('5. Guarda de cobertura', () => {
  it('con 96% del peso en N/A el diagnóstico no es concluyente', () => {
    const casiTodoNA = llenar(FORMATO_01, 'NA')
    casiTodoNA['gobernanza.a'] = 4
    expect(evaluarFormato(FORMATO_01, casiTodoNA, 'industrial', tam()).concluyente).toBe(false)
  })
})

describe('6. El tamizaje apaga dimensiones de la Ley 2173', () => {
  const sinAreas = tam({ areasDeVida: 'no' })

  it('con Áreas de Vida se preguntan las 26', () => {
    expect(progreso(FORMATO_02, {}, tam()).total).toBe(26)
  })

  it('sin Áreas de Vida solo quedan 8 preguntas activas', () => {
    expect(progreso(FORMATO_02, {}, sinAreas).total).toBe(8)
  })

  it('sin Áreas de Vida la obligación no es exigible', () => {
    expect(leyAplicable(sinAreas).exigible).toBe(false)
  })

  it('a una microempresa no le aplica', () => {
    expect(leyAplicable(tam({ tamano: 'micro' })).aplica).toBe(false)
  })
})

describe('7. Techo de primer ciclo', () => {
  it('sin ciclo previo el techo es 3.0', () => {
    expect(evaluarFormato(FORMATO_02, {}, '', tam({ cicloPrevio: 'no' })).techo).toBe(3)
  })

  it('con ciclo previo el techo es 4.0', () => {
    expect(evaluarFormato(FORMATO_02, {}, '', tam()).techo).toBe(4)
  })
})

describe('8. Banderas rojas pese a puntaje alto', () => {
  const casiPerfecto = llenar(FORMATO_02, 4)
  casiPerfecto['4.4'] = 1
  const rLey = evaluarFormato(FORMATO_02, casiPerfecto, '', tam())

  it('el puntaje sigue alto', () => {
    expect(rLey.score!).toBeGreaterThan(3.5)
  })

  it('la bandera de mortalidad se levanta igual', () => {
    expect(evaluarBanderas(rLey).map(b => b.id)).toContain('permanencia')
  })
})

describe('9. Prioridad: lo crítico y lo legal van primero', () => {
  it('el plan trae 3 prioridades y la primera es la crítica de Ley 2173', () => {
    const casiPerfecto = llenar(FORMATO_02, 4)
    casiPerfecto['4.4'] = 1
    const rLey = evaluarFormato(FORMATO_02, casiPerfecto, '', tam())
    const isoFlojo = evaluarFormato(FORMATO_01, llenar(FORMATO_01, 1), 'industrial', tam())
    const plan = construirPlan(isoFlojo, rLey, evaluarBanderas(rLey), true)

    expect(plan).toHaveLength(3)
    expect(plan[0]).toMatchObject({ critica: true, origen: 'ley2173' })
  })
})

describe('10. Lectura cruzada detecta la inconsistencia', () => {
  it('marca como alerta una autoevaluación ISO sobreestimada frente a la Ley 2173', () => {
    const isoAmbAlto: Respuestas = {}
    FORMATO_01.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => {
      isoAmbAlto[p.id] = d.id === 'ambiente' ? 4 : 2
    })))
    const cruce = lecturaCruzada(
      evaluarFormato(FORMATO_01, isoAmbAlto, 'industrial', tam()),
      evaluarFormato(FORMATO_02, llenar(FORMATO_02, 1), '', tam()),
      true,
    )
    expect(cruce?.tono).toBe('alerta')
    expect(cruce?.titulo).toContain('Inconsistencia')
  })
})
