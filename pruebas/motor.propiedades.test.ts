import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { PESOS_SECTOR, PREGUNTAS, RSE_EXPRESS } from '../src/data/rseExpress'
import { evaluar, oportunidades, progreso, sumaPrioridad } from '../src/engine/scoring'
import type { Diagnostico, Etapa, SectorId, Tamizaje } from '../src/types'

const ETAPAS: (Etapa | null)[] = [0, 1, 2, 3, 4, 'diferente', 'NA', null]
const SECTORES = Object.keys(PESOS_SECTOR) as SectorId[]

const diagnosticoArb = fc
  .array(fc.record({
    etapa: fc.constantFrom(...ETAPAS),
    texto: fc.constantFrom('', 'Lo hacemos'),
    clasificada: fc.constantFrom(null, 0, 1, 2, 3, 4),
  }), { minLength: PREGUNTAS.length, maxLength: PREGUNTAS.length })
  .map((vals): Diagnostico => ({
    respuestas: Object.fromEntries(PREGUNTAS.map((p, i) => [p.id, {
      texto: vals[i].texto, ejemplos: [], otro: '', etapa: vals[i].etapa,
      clasificada: vals[i].etapa === 'diferente' ? (vals[i].clasificada as 0 | null) : null,
    }])),
    fortalecer: {},
    comentarioFinal: '',
  }))

const tamizajeArb = fc.record<Tamizaje>({
  tamano: fc.constantFrom('micro', 'pequena', 'mediana', 'nose'),
  ingresos: fc.constantFrom(''),
  personas: fc.integer({ min: 1, max: 500 }).map(String),
  vinculacion: fc.constant(['laboral']),
  vinculacionDetalle: fc.constant(''),
  zonas: fc.subarray(['barrios', 'veredas', 'rural', 'indigenas', 'afro', 'otras'] as const).map((z) => [...z]),
  territorio: fc.constant('Centro'),
  clientes: fc.constantFrom('personas', 'empresas', 'publicas', 'mezcla'),
  clientesDetalle: fc.constant(''),
})

describe('invariantes del motor RSE Express (property-based)', () => {
  it('la lectura interna siempre queda entre 0 y 4 y la cobertura entre 0 y 1', () => {
    fc.assert(fc.property(diagnosticoArb, tamizajeArb, fc.constantFrom(...SECTORES), (d, t, s) => {
      const res = evaluar(RSE_EXPRESS, d, s, t)
      if (res.score !== null) expect(res.score).toBeGreaterThanOrEqual(0)
      if (res.score !== null) expect(res.score).toBeLessThanOrEqual(4 + 1e-9)
      expect(res.cobertura).toBeGreaterThanOrEqual(0)
      expect(res.cobertura).toBeLessThanOrEqual(1 + 1e-9)
      for (const m of res.materias) if (m.score !== null) expect(m.score).toBeLessThanOrEqual(4 + 1e-9)
    }))
  })

  it('cambiar «no aplica» por cualquier etapa nunca baja la cobertura', () => {
    fc.assert(fc.property(diagnosticoArb, tamizajeArb, fc.constantFrom(0, 1, 2, 3, 4) as fc.Arbitrary<Etapa>, (d, t, e) => {
      const antes = evaluar(RSE_EXPRESS, d, 'servicios', t).cobertura
      const d2: Diagnostico = {
        ...d,
        respuestas: Object.fromEntries(Object.entries(d.respuestas).map(([k, r]) => [k, r.etapa === 'NA' ? { ...r, etapa: e } : r])),
      }
      expect(evaluar(RSE_EXPRESS, d2, 'servicios', t).cobertura).toBeGreaterThanOrEqual(antes - 1e-9)
    }))
  })

  it('el progreso nunca supera el total y excluye Consumidores cuando no aplica', () => {
    fc.assert(fc.property(diagnosticoArb, tamizajeArb, (d, t) => {
      const p = progreso(RSE_EXPRESS, d, t)
      expect(p.hechas).toBeLessThanOrEqual(p.total)
      expect(p.total).toBe(t.clientes === 'empresas' || t.clientes === 'publicas' ? 18 : 21)
    }))
  })

  it('la matriz propone como máximo 5, sin repetir, y nunca algo en etapa 4 o no aplica', () => {
    fc.assert(fc.property(diagnosticoArb, tamizajeArb, fc.constantFrom(...SECTORES), (d, t, s) => {
      const ops = oportunidades(RSE_EXPRESS, d, s, t)
      expect(ops.length).toBeLessThanOrEqual(5)
      expect(new Set(ops.map((o) => o.clave)).size).toBe(ops.length)
      for (const o of ops) {
        const r = d.respuestas[o.clave]
        expect(r.etapa).not.toBe('NA')
        expect(r.etapa).not.toBe(4)
        expect(sumaPrioridad({ importancia: 1, viabilidad: 1, potencial: 1, interes: o.interesSugerido ?? 1 })).toBeGreaterThanOrEqual(4)
      }
    }))
  })
})
