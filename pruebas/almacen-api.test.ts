import { beforeEach, describe, expect, it } from 'vitest'
import {
  agregarAlHistorial, cargarBorrador, cargarDatos, cargarHistorial, guardarBorrador, guardarDatos,
} from '../src/almacen'
import {
  diagnosticoDesdeApi, etapaAApi, etapaDesdeApi, payloadDiagnostico, payloadEmpresa, perfilDesdeApi,
  priorizacionDesdeApi, tamizajeDesdeApi,
} from '../src/auth/empresaApi'
import type { DiagnosticoApi } from '../src/auth/empresaApi'
import { construirDoc, limpiarTexto, nombreArchivo } from '../src/export/pdf'
import { PREGUNTAS } from '../src/data/rseExpress'
import type { Diagnostico, Perfil, Tamizaje } from '../src/types'

const PERFIL: Perfil = {
  razonSocial: 'Panadería El Trigal', nit: '800197268', dv: '4', sector: 'comercio',
  municipio: 'Palmira', departamento: 'Valle del Cauca', extranjera: false,
}
const TAM: Tamizaje = {
  tamano: 'pequena', ingresos: 'menos_1000m', personas: '14', vinculacion: ['laboral', 'socios'],
  vinculacionDetalle: '', zonas: ['barrios'], territorio: 'Barrio Colombia', clientes: 'personas', clientesDetalle: '',
}
const USUARIO = 'u-1'

beforeEach(() => localStorage.clear())

describe('migración de datos guardados en el navegador', () => {
  it('conserva el perfil y retira el tamizaje de la versión anterior', () => {
    localStorage.setItem(`n360_datos:${USUARIO}`, JSON.stringify({
      perfil: PERFIL,
      tamizaje: { tamano: 'grande', empleados: '120', areasDeVida: 'si', cicloPrevio: 'no', comunidadesEtnicas: 'si', consumidorFinal: 'si' },
    }))
    const d = cargarDatos(USUARIO)
    expect(d.perfil).toEqual(PERFIL)
    expect(d.tamizaje).toBe(null)
    expect(d.legado).toBe(true)
    // Se reescribe de inmediato, sin el tamizaje viejo.
    const guardado = JSON.parse(localStorage.getItem(`n360_datos:${USUARIO}`)!)
    expect(guardado).toEqual({ v: 2, perfil: PERFIL, tamizaje: null })
    expect(cargarDatos(USUARIO).legado).toBe(false)
  })

  it('lee y escribe la versión nueva sin perder nada', () => {
    guardarDatos(USUARIO, PERFIL, TAM)
    expect(cargarDatos(USUARIO)).toEqual({ perfil: PERFIL, tamizaje: TAM, legado: false })
  })

  it('el historial conserva fecha y perfil de las entradas viejas, sin su tamizaje', () => {
    localStorage.setItem(`n360_historial:${USUARIO}`, JSON.stringify([
      { fecha: '2026-03-01T10:00:00Z', perfil: PERFIL, tamizaje: { tamano: 'micro', empleados: '5', areasDeVida: 'no' } },
    ]))
    const h = cargarHistorial(USUARIO)
    expect(h).toEqual([{ fecha: '2026-03-01T10:00:00Z', perfil: PERFIL, tamizaje: null, legado: true }])
    agregarAlHistorial(USUARIO, { fecha: '2026-09-28T10:00:00Z', perfil: PERFIL, tamizaje: TAM })
    expect(cargarHistorial(USUARIO).map((e) => e.tamizaje?.personas ?? null)).toEqual([null, '14'])
  })

  it('el borrador del autodiagnóstico ignora formatos anteriores', () => {
    localStorage.setItem(`n360_rse:${USUARIO}`, JSON.stringify({ respuestas: { '1.1': 3 } }))
    expect(cargarBorrador(USUARIO)).toBe(null)
    const d: Diagnostico = { respuestas: { '01a': { texto: 'x', ejemplos: [], otro: '', etapa: 2 } }, fortalecer: { '01': 'y' }, comentarioFinal: '' }
    guardarBorrador(USUARIO, d, { filas: {}, elegida: null })
    expect(cargarBorrador(USUARIO)?.diagnostico.respuestas['01a'].etapa).toBe(2)
  })
})

describe('conversiones con la API', () => {
  it('etapas de ida y vuelta', () => {
    for (const e of [0, 1, 2, 3, 4, 'diferente', 'NA'] as const) expect(etapaDesdeApi(etapaAApi(e))).toBe(e)
    expect(etapaAApi(null)).toBe(null)
    expect(etapaDesdeApi('7')).toBe(null)
  })

  it('perfil + tamizaje de ida y vuelta', () => {
    const p = payloadEmpresa(PERFIL, TAM)
    expect(p).toMatchObject({ tamano: 'pequena', personas: 14, ingresos_rango: 'menos_1000m', vinculacion_detalle: null, clientes: 'personas' })
    const t = tamizajeDesdeApi({
      ciclo_id: 'c', anio: 2026, tamano: p.tamano, ingresos_rango: p.ingresos_rango, personas: p.personas,
      vinculacion: p.vinculacion, vinculacion_detalle: p.vinculacion_detalle, zonas: p.zonas,
      territorio: p.territorio, clientes: p.clientes, clientes_detalle: p.clientes_detalle, actualizado_en: '',
    })
    expect(t).toEqual(TAM)
    expect(perfilDesdeApi({ empresa_id: 'e', razon_social: p.razon_social, nit: p.nit, dv: p.dv, sector_id: p.sector_id, municipio: p.municipio, departamento: p.departamento ?? null, extranjera: false })).toEqual(PERFIL)
    expect(tamizajeDesdeApi(null)).toBe(null)
  })

  it('diagnóstico y priorización de ida y vuelta, con la clasificación de NEXUS', () => {
    const d: Diagnostico = {
      respuestas: {
        '04b': { texto: 'Compost', ejemplos: ['Reutilizar'], otro: 'Compostaje', etapa: 'diferente' },
        '06b': { texto: '', ejemplos: [], otro: '', etapa: 'NA' },
      },
      fortalecer: { '04': 'Residuos' },
      comentarioFinal: '  ',
    }
    const payload = payloadDiagnostico(d, { filas: { '04b': { importancia: 3, viabilidad: 2, potencial: 3, interes: 3 } }, elegida: '04b' }, false)
    expect(payload.respuestas['04b'].etapa).toBe('diferente')
    expect(payload.comentario_final).toBe(null)
    const api: DiagnosticoApi = {
      diagnostico_id: 'd', formato_id: 'rse_express', estado: 'borrador', creado_en: '', completado_en: null, actualizado_en: '',
      respuestas: Object.fromEntries(Object.entries(payload.respuestas).map(([k, r]) => [k, {
        ...r, respuesta_id: k, clasificada: k === '04b' ? 3 : null, clasificado_en: null, respondido_en: '',
      }])),
      fortalecer: payload.fortalecer, comentario_final: null, priorizacion: payload.priorizacion,
    }
    const vuelta = diagnosticoDesdeApi(api)!
    expect(vuelta.respuestas['04b']).toEqual({ ...d.respuestas['04b'], clasificada: 3 })
    expect(vuelta.respuestas['06b'].etapa).toBe('NA')
    expect(priorizacionDesdeApi(api).elegida).toBe('04b')
  })
})

describe('informe PDF de la empresa', () => {
  it('se construye con el mapa, la matriz y las alertas, sin caracteres fuera de WinAnsi', () => {
    const d: Diagnostico = {
      respuestas: Object.fromEntries(PREGUNTAS.map((p, i) => [p.id, {
        texto: `Práctica “${p.id}” — con detalle…`, ejemplos: p.ejemplos.slice(0, 1), otro: '', etapa: ([0, 1, 2, 3, 4] as const)[i % 5],
      }])),
      fortalecer: { '03': 'Capacitar al equipo' },
      comentarioFinal: 'Donamos pan a un hogar infantil',
    }
    const doc = construirDoc({ perfil: PERFIL, tamizaje: { ...TAM, tamano: 'mediana' }, diagnostico: d, priorizacion: { filas: {}, elegida: null } })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2)
    expect(nombreArchivo(PERFIL)).toBe('NEXUS360_RSE_Express_Panaderia_El_Trigal.pdf')
    expect(limpiarTexto('“Hola” — sí… ✓')).toBe('"Hola" - sí... x')
  })
})
