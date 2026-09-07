import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { FORMATO_01, PESOS_SECTOR } from '../src/data/formato01'
import { FORMATO_02 } from '../src/data/formato02'
import { evaluarFormato, progreso } from '../src/engine/scoring'
import type { Formato, Respuestas, SectorId, Tamizaje, Valor } from '../src/types'

const VALORES: Valor[] = [0, 1, 2, 3, 4, 'NA']
const SECTORES = Object.keys(PESOS_SECTOR) as SectorId[]

const idsDe = (f: Formato): string[] =>
  f.dimensiones.flatMap(d => d.secciones.flatMap(s => s.preguntas.map(p => p.id)))

/** Genera un juego de respuestas completo para el formato dado. */
const respuestasArb = (f: Formato) => {
  const ids = idsDe(f)
  return fc.array(fc.constantFrom(...VALORES), { minLength: ids.length, maxLength: ids.length })
    .map(vals => Object.fromEntries(ids.map((id, i) => [id, vals[i]])) as Respuestas)
}

const tamizajeArb = fc.record<Tamizaje>({
  tamano: fc.constantFrom('micro', 'pequena', 'mediana', 'grande'),
  empleados: fc.integer({ min: 0, max: 5000 }).map(String),
  areasDeVida: fc.constantFrom('si', 'no', 'nose'),
  cicloPrevio: fc.constantFrom('si', 'no'),
  comunidadesEtnicas: fc.constantFrom('si', 'no'),
  consumidorFinal: fc.constantFrom('si', 'no'),
})

describe('Invariantes del motor (property-based)', () => {
  it('el puntaje del Formato 01 nunca sale del rango [0, techo]', () => {
    fc.assert(fc.property(
      respuestasArb(FORMATO_01), fc.constantFrom(...SECTORES), tamizajeArb,
      (respuestas, sector, tam) => {
        const r = evaluarFormato(FORMATO_01, respuestas, sector, tam)
        if (r.score === null) return true
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(r.techo + 1e-9)
        return true
      },
    ), { numRuns: 300 })
  })

  it('el puntaje del Formato 02 respeta el techo de primer ciclo', () => {
    fc.assert(fc.property(
      respuestasArb(FORMATO_02), tamizajeArb,
      (respuestas, tam) => {
        const r = evaluarFormato(FORMATO_02, respuestas, '', tam)
        expect(r.techo).toBe(tam.cicloPrevio === 'si' ? 4 : 3)
        if (r.score !== null) expect(r.score).toBeLessThanOrEqual(r.techo + 1e-9)
        return true
      },
    ), { numRuns: 300 })
  })

  it('la cobertura siempre está en [0, 1]', () => {
    fc.assert(fc.property(
      respuestasArb(FORMATO_01), fc.constantFrom(...SECTORES), tamizajeArb,
      (respuestas, sector, tam) => {
        const { cobertura } = evaluarFormato(FORMATO_01, respuestas, sector, tam)
        expect(cobertura).toBeGreaterThanOrEqual(0)
        expect(cobertura).toBeLessThanOrEqual(1 + 1e-9)
        return true
      },
    ), { numRuns: 300 })
  })

  it('subir una respuesta nunca baja el puntaje (monotonía)', () => {
    const ids = idsDe(FORMATO_01)
    fc.assert(fc.property(
      respuestasArb(FORMATO_01), fc.nat({ max: ids.length - 1 }),
      fc.constantFrom(...SECTORES), tamizajeArb,
      (respuestas, idx, sector, tam) => {
        const id = ids[idx]
        const actual = respuestas[id]
        // Solo comparamos entre valores numéricos: pasar de N/A a un número
        // cambia el denominador, y ahí la monotonía no aplica por diseño.
        if (actual === 'NA' || actual === 4) return true
        const antes = evaluarFormato(FORMATO_01, respuestas, sector, tam)
        const despues = evaluarFormato(
          FORMATO_01, { ...respuestas, [id]: (actual + 1) as Valor }, sector, tam,
        )
        if (antes.score === null || despues.score === null) return true
        expect(despues.score).toBeGreaterThanOrEqual(antes.score - 1e-9)
        return true
      },
    ), { numRuns: 300 })
  })

  it('el progreso nunca reporta más contestadas que el total', () => {
    fc.assert(fc.property(
      respuestasArb(FORMATO_02), tamizajeArb,
      (respuestas, tam) => {
        const p = progreso(FORMATO_02, respuestas, tam)
        expect(p.hechas).toBeLessThanOrEqual(p.total)
        return true
      },
    ), { numRuns: 300 })
  })
})
