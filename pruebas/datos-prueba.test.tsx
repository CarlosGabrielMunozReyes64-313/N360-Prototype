import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RSE_EXPRESS } from '../src/data/rseExpress'
import { tamizajeCompleto } from '../src/data/tamizaje'
import { perfilNitValido } from '../src/data/nit'
import { municipiosDe } from '../src/data/colombia'
import { mapaPracticas, progreso } from '../src/engine/scoring'
import { payloadResultadosIA } from '../src/auth/analisisIaApi'
import { payloadDiagnostico, payloadEmpresa } from '../src/auth/empresaApi'
import { PRIORIZACION_VACIA } from '../src/almacen'
import {
  ESCENARIOS, GUIONES, UBICACIONES, azarConSemilla, generarDatosPrueba,
} from '../src/dev/datosPrueba'
import type { DatosPrueba, Escenario } from '../src/dev/datosPrueba'
import PanelPrueba from '../src/dev/PanelPrueba'
import type { Perfil } from '../src/types'

const PERFIL_VACIO: Perfil = { razonSocial: '', nit: '', dv: '', sector: '', municipio: '', departamento: '', extranjera: false }

describe('datos de prueba', () => {
  it('cada pregunta tiene guion y sus ejemplos existen en el catálogo', () => {
    for (const m of RSE_EXPRESS.materias)
      for (const p of m.preguntas) {
        const g = GUIONES[p.id]
        expect(g, p.id).toBeDefined()
        for (const nivel of [g.bajo, g.medio, g.alto])
          for (const e of nivel.ejemplos) expect(p.ejemplos, `${p.id}: ${e}`).toContain(e)
      }
  })

  it('las ubicaciones existen en la lista de municipios', () => {
    for (const [dep, mun] of UBICACIONES) expect(municipiosDe(dep)).toContain(mun)
  })

  it.each(ESCENARIOS.map((e) => e.id))('el escenario %s deja todo completo y válido', (escenario) => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const d = generarDatosPrueba(escenario as Escenario, { azar: azarConSemilla(semilla) })
      expect(perfilNitValido(d.perfil)).toBe(true)
      expect(municipiosDe(d.perfil.departamento)).toContain(d.perfil.municipio)
      expect(tamizajeCompleto(d.tamizaje)).toBe(true)
      expect(progreso(RSE_EXPRESS, d.diagnostico, d.tamizaje).completo).toBe(true)
      // Mismos límites que valida el backend (schemas_empresa.py).
      const emp = payloadEmpresa(d.perfil, d.tamizaje)
      expect(emp.personas).toBeGreaterThan(0)
      expect(emp.vinculacion.length).toBeGreaterThan(0)
      const diag = payloadDiagnostico(d.diagnostico, PRIORIZACION_VACIA, true)
      expect(Object.keys(diag.respuestas)).toHaveLength(21)
      for (const t of Object.values(diag.fortalecer)) expect(t.length).toBeLessThanOrEqual(2000)
    }
  })

  it('conserva el perfil actual si se le pasa', () => {
    const actual: Perfil = { ...PERFIL_VACIO, razonSocial: 'Mi empresa', nit: '900123456', dv: '8', sector: 'servicios', municipio: 'Pasto', departamento: 'Nariño' }
    expect(generarDatosPrueba('inicial', { perfilActual: actual }).perfil).toBe(actual)
  })

  it('los escenarios producen lecturas distintas (avanzada > inicial)', () => {
    const fortalezas = (escenario: Escenario) => {
      let n = 0
      for (let semilla = 1; semilla <= 20; semilla++) {
        const d = generarDatosPrueba(escenario, { azar: azarConSemilla(semilla) })
        n += mapaPracticas(RSE_EXPRESS, d.diagnostico, d.perfil.sector, d.tamizaje)
          .flatMap((m) => m.practicas).filter((p) => p.categoria === 'fortaleza').length
      }
      return n
    }
    expect(fortalezas('avanzada')).toBeGreaterThan(fortalezas('intermedia'))
    expect(fortalezas('intermedia')).toBeGreaterThan(fortalezas('inicial'))
  })

  it('dos llenados distintos mandan resultados distintos a la IA (no se reutiliza el análisis)', () => {
    const a = generarDatosPrueba('mixta', { azar: azarConSemilla(1) })
    const b = generarDatosPrueba('mixta', { azar: azarConSemilla(2) })
    const ra = JSON.stringify(payloadResultadosIA(a.perfil, a.tamizaje, a.diagnostico))
    const rb = JSON.stringify(payloadResultadosIA(b.perfil, b.tamizaje, b.diagnostico))
    expect(ra).not.toBe(rb)
  })
})

describe('PanelPrueba', () => {
  it('genera datos completos y pide ir a resultados', async () => {
    const onLlenar = vi.fn<(d: DatosPrueba, ver: boolean) => Promise<void>>().mockResolvedValue()
    render(<PanelPrueba perfilActual={PERFIL_VACIO} onLlenar={onLlenar} />)
    await userEvent.click(screen.getByRole('button', { name: /datos de prueba/i }))
    await userEvent.selectOptions(screen.getByLabelText('Escenario'), 'avanzada')
    await userEvent.click(screen.getByRole('button', { name: /llenar y ver resultados/i }))

    expect(onLlenar).toHaveBeenCalledTimes(1)
    const [datos, ver] = onLlenar.mock.calls[0]
    expect(ver).toBe(true)
    expect(datos.perfil.razonSocial).toMatch(/^PRUEBA · /)
    expect(progreso(RSE_EXPRESS, datos.diagnostico, datos.tamizaje).completo).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent(/Listo/)
  })

  it('muestra el error del backend si no se pudo guardar', async () => {
    const onLlenar = vi.fn().mockRejectedValue(new Error('Ese NIT ya está registrado por otra cuenta.'))
    render(<PanelPrueba perfilActual={PERFIL_VACIO} onLlenar={onLlenar} />)
    await userEvent.click(screen.getByRole('button', { name: /datos de prueba/i }))
    await userEvent.click(screen.getByRole('button', { name: /solo llenar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ese NIT ya está registrado')
    expect(onLlenar.mock.calls[0][1]).toBe(false)
  })
})
