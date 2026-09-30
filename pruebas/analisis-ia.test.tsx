import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PREGUNTAS, RSE_EXPRESS } from '../src/data/rseExpress'
import { mapaPracticas, oportunidades } from '../src/engine/scoring'
import {
  MAX_RESPUESTA_IA, analisisDesdeApi, payloadResultadosIA, solicitarAnalisisIA,
} from '../src/auth/analisisIaApi'
import type { AnalisisIAApi } from '../src/auth/analisisIaApi'
import { Resultados } from '../src/components/Resultados'
import { construirDoc } from '../src/export/pdf'
import * as pdf from '../src/export/pdf'
import type { Diagnostico, Etapa, Perfil, Tamizaje } from '../src/types'

const PERFIL: Perfil = {
  razonSocial: 'Confidencial del Guáitara S.A.S.', nit: '900765432', dv: '1', sector: 'agroindustrial',
  municipio: 'Pasto', departamento: 'Nariño', extranjera: false,
}
const TAM: Tamizaje = {
  tamano: 'pequena', ingresos: '', personas: '32', vinculacion: ['laboral'], vinculacionDetalle: '',
  zonas: ['veredas'], territorio: '', clientes: 'personas', clientesDetalle: '',
}

function diag(etapa: (i: number) => Etapa): Diagnostico {
  return {
    respuestas: Object.fromEntries(PREGUNTAS.map((p, i) => [p.id, {
      texto: `Hacemos ${p.id}`, ejemplos: [], otro: '', etapa: etapa(i),
    }])),
    fortalecer: { '03': 'Capacitar al equipo' },
    comentarioFinal: 'Apoyamos la escuela.',
  }
}
const ALTOS = diag(() => 4)
const BAJOS = diag(() => 0)
const MIXTOS = diag((i) => ([0, 1, 2, 3, 4, 'diferente', 'NA'] as const)[i % 7])

const API: AnalisisIAApi = {
  diagnostico_id: 'd-1',
  analisis: {
    resumen: 'La empresa tiene prácticas organizadas y una oportunidad clara en seguridad y salud.',
    fortalezas: ['Compromiso de la gerencia.'],
    areas_oportunidad: ['Seguridad y salud en el trabajo.'],
    prioridades: ['Empezar el SG-SST.', 'Contar lo que hace.'],
    recomendaciones: [{
      titulo: 'Designar un responsable de SST', descripcion: 'Nombrar a una persona a cargo.',
      prioridad: 'alta', justificacion: 'La práctica 03b está en etapa inicial.', materia: '03',
    }],
    acciones_corto_plazo: [{ accion: 'Pedir asesoría a la ARL', objetivo: 'Tener un plan', horizonte: '4 a 8 semanas', prioridad: 'alta' }],
    acciones_mediano_plazo: [{ accion: 'Formalizar el SG-SST', objetivo: 'Cumplir estándares 🙂', horizonte: '6 meses', prioridad: 'media' }],
    conclusion: 'Con un primer reto en SST la empresa puede avanzar este año.',
  },
  generado_en: '2026-09-29T15:00:00Z',
  modelo: 'gemini-3.5-flash-lite',
  version_prompt: 'rse-express-v1',
  reutilizado: false,
}

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }))

/* ------------------------------------------------ payload desde el motor */

describe('resultados que se envían al análisis IA', () => {
  it('no incluye la razón social, el NIT ni puntajes numéricos', () => {
    const texto = JSON.stringify(payloadResultadosIA(PERFIL, TAM, MIXTOS))
    expect(texto).not.toContain('Confidencial')
    expect(texto).not.toContain(PERFIL.nit)
    expect(texto).not.toMatch(/"(score|puntaje|cobertura|pesoEfectivo)"/)
  })

  it('resultados altos: todo fortaleza y sin oportunidades que priorizar', () => {
    const r = payloadResultadosIA(PERFIL, TAM, ALTOS)
    expect(r.fortalezas).toBe(21)
    expect(r.oportunidades).toBe(0)
    expect(r.prioridades).toEqual([])
    expect(r.materias.every((m) => m.categoria === 'fortaleza')).toBe(true)
  })

  it('resultados bajos: el tema legal va primero, como lo ordena el motor', () => {
    const r = payloadResultadosIA(PERFIL, TAM, BAJOS)
    expect(r.fortalezas).toBe(0)
    expect(r.oportunidades).toBe(21)
    expect(r.prioridades[0]).toMatchObject({ codigo: '03b', verbo: 'Empezar', alerta_legal: 'sst' })
    expect(r.alertas.map((a) => a.id)).toContain('sst')
  })

  it('resultados mixtos: respeta el orden y las categorías del motor', () => {
    const r = payloadResultadosIA(PERFIL, TAM, MIXTOS)
    const ops = oportunidades(RSE_EXPRESS, MIXTOS, PERFIL.sector, TAM)
    expect(r.prioridades.map((p) => p.codigo)).toEqual(ops.map((o) => o.clave))
    expect(r.practicas_propias_por_revisar).toBeGreaterThan(0)
    const propia = r.materias.flatMap((m) => m.practicas).find((p) => p.categoria === 'diferente')!
    expect(propia.etapa).toContain('pendiente de revisión por NEXUS')
  })

  it('las respuestas abiertas viajan completas (la pantalla sigue mostrando el resumen)', () => {
    const largo = 'Hacemos orden y limpieza diaria de la planta. '.repeat(30)  // ~1.400 caracteres
    const d: typeof MIXTOS = {
      ...MIXTOS,
      respuestas: { ...MIXTOS.respuestas, '03b': { texto: largo, ejemplos: ['Botiquín'], otro: 'Pausas activas', etapa: 1 } },
      fortalecer: { '04': 'Queremos medir agua y energía. '.repeat(40) },  // ~1.240 caracteres
    }
    const r = payloadResultadosIA(PERFIL, TAM, d)
    const practica = r.materias.flatMap((m) => m.practicas).find((p) => p.codigo === '03b')!
    expect(practica.hace_hoy.length).toBeGreaterThan(1300)
    expect(practica.hace_hoy.length).toBeLessThanOrEqual(MAX_RESPUESTA_IA)
    expect(practica.hace_hoy).toContain('Botiquín')
    expect(practica.hace_hoy).toContain('Pausas activas')
    expect(r.materias.find((m) => m.numero === '04')!.fortalecer.length).toBeGreaterThan(1200)
    // En pantalla y en el PDF, el mismo texto sigue saliendo resumido.
    const enPantalla = mapaPracticas(RSE_EXPRESS, d, PERFIL.sector, TAM)
      .flatMap((m) => m.practicas).find((p) => p.pregunta.id === '03b')!
    expect(enPantalla.haceHoy.length).toBeLessThanOrEqual(240)
  })

  it('una materia fuera de alcance viaja sin prácticas', () => {
    const r = payloadResultadosIA(PERFIL, { ...TAM, clientes: 'empresas' }, MIXTOS)
    const consumidores = r.materias.find((m) => m.numero === '06')!
    expect(consumidores).toMatchObject({ aplica: false, practicas: [] })
    expect(r.prioridades.some((p) => p.materia_numero === '06')).toBe(false)
  })
})

describe('respuesta del backend', () => {
  it('se convierte al modelo del front', () => {
    const a = analisisDesdeApi(API)!
    expect(a.analisis.areasOportunidad).toEqual(['Seguridad y salud en el trabajo.'])
    expect(a.analisis.accionesCortoPlazo[0].horizonte).toBe('4 a 8 semanas')
    expect(a.modelo).toBe('gemini-3.5-flash-lite')
  })

  it('es defensiva con datos inesperados', () => {
    expect(analisisDesdeApi(null)).toBe(null)
    expect(analisisDesdeApi({ analisis: {} })).toBe(null)
    const raro = analisisDesdeApi({ ...API, analisis: { ...API.analisis, recomendaciones: [{ ...API.analisis.recomendaciones[0], prioridad: 'urgentísima' }, 'x'] } })!
    expect(raro.analisis.recomendaciones).toHaveLength(1)
    expect(raro.analisis.recomendaciones[0].prioridad).toBe('media')
  })
})

/* ------------------------------------------------------------ red */

describe('llamadas al backend', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('dos pedidos iguales al mismo tiempo hacen una sola llamada', async () => {
    const f = vi.fn(() => respuesta(200, API))
    vi.stubGlobal('fetch', f)
    const cuerpo = JSON.stringify({ resultados: payloadResultadosIA(PERFIL, TAM, MIXTOS) })
    const [a, b] = await Promise.all([solicitarAnalisisIA('t', cuerpo), solicitarAnalisisIA('t', cuerpo)])
    expect(a).toBe(b)
    expect(f).toHaveBeenCalledTimes(1)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/empresa\/mio\/diagnosticos\/rse_express\/analisis-ia$/)
    expect(init.method).toBe('POST')
    // La clave de Gemini jamás pasa por el navegador: solo el token de sesión.
    expect(JSON.stringify(init.headers)).not.toMatch(/gemini|goog/i)
  })
})

/* ------------------------------------------------------ pantalla */

describe('sección «Análisis inteligente» en Resultados', () => {
  const pintar = (token: string | null = 'token-1') => render(
    <Resultados token={token} perfil={PERFIL} tamizaje={TAM} diagnostico={MIXTOS}
      priorizacion={{ filas: {}, elegida: null }} onPriorizacion={() => {}} onBack={() => {}} />,
  )
  let generar: ReturnType<typeof vi.spyOn>

  beforeEach(() => { generar = vi.spyOn(pdf, 'generarInforme').mockImplementation(() => {}) })
  afterEach(() => { vi.unstubAllGlobals(); generar.mockRestore() })

  it('muestra «Analizando resultados…» y luego el análisis completo', async () => {
    let soltar!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((ok) => { soltar = ok })))
    pintar()
    expect(screen.getByText('Analizando resultados…')).toBeInTheDocument()
    // Mientras carga, el PDF se puede descargar (sin la sección de IA).
    const boton = screen.getByRole('button', { name: 'Descargar informe (PDF)' })
    expect(boton).toBeEnabled()
    await userEvent.click(boton)
    expect(generar).toHaveBeenLastCalledWith(expect.objectContaining({ analisisIA: null }))

    soltar(new Response(JSON.stringify(API), { status: 200 }))
    expect(await screen.findByText('Resumen ejecutivo')).toBeInTheDocument()
    for (const t of ['Fortalezas', 'Áreas de oportunidad', 'Prioridades', 'Recomendaciones',
      'Acciones a corto plazo', 'Acciones a mediano plazo', 'Conclusión']) {
      expect(screen.getByRole('heading', { name: t })).toBeInTheDocument()
    }
    const tarjeta = screen.getByText('Designar un responsable de SST').closest('article')!
    expect(within(tarjeta).getByText('Prácticas laborales')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Prioridad alta')).toBeInTheDocument()

    // Con el análisis listo, el PDF lo incluye.
    await userEvent.click(screen.getByRole('button', { name: 'Descargar informe (PDF)' }))
    expect(generar).toHaveBeenLastCalledWith(expect.objectContaining({
      analisisIA: expect.objectContaining({ modelo: 'gemini-3.5-flash-lite' }),
    }))
  })

  it('si Gemini falla muestra un mensaje amable y permite reintentar', async () => {
    const f = vi.fn()
      .mockImplementationOnce(() => respuesta(503, { codigo: 'IA_NO_DISPONIBLE', mensaje: 'No pudimos generar el análisis inteligente en este momento.' }))
      .mockImplementationOnce(() => respuesta(200, API))
    vi.stubGlobal('fetch', f)
    pintar()
    expect(await screen.findByText('No pudimos generar el análisis inteligente en este momento.')).toBeInTheDocument()
    // El resto de los resultados y el PDF siguen ahí.
    expect(screen.getByText('Matriz de priorización')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Descargar informe (PDF)' }))
    expect(generar).toHaveBeenLastCalledWith(expect.objectContaining({ analisisIA: null }))

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Resumen ejecutivo')).toBeInTheDocument()
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('sin red tampoco se rompe ni muestra detalles técnicos', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    pintar()
    expect(await screen.findByText(/Sus resultados y el informe PDF siguen disponibles/)).toBeInTheDocument()
    expect(screen.queryByText(/Failed to fetch/)).toBe(null)
  })

  it('si el servidor no tiene clave, lo dice sin ofrecer reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(503, { codigo: 'IA_NO_CONFIGURADA', mensaje: 'El análisis inteligente no está habilitado en este servidor.' })))
    pintar()
    expect(await screen.findByText('El análisis inteligente no está habilitado en este servidor.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBe(null)
  })

  it('sin sesión no pide nada y no muestra la sección', () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    pintar(null)
    expect(screen.queryByText('Análisis inteligente')).toBe(null)
    expect(f).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------ PDF */

describe('informe PDF', () => {
  const base = { perfil: PERFIL, tamizaje: TAM, diagnostico: MIXTOS, priorizacion: { filas: {}, elegida: null } }
  const texto = (d: Parameters<typeof construirDoc>[0]) => construirDoc(d).output()

  it('sin análisis IA sale completo, con fortalezas y temas por empezar', () => {
    const t = texto(base)
    expect(t).toContain('Sus fortalezas')
    expect(t).toContain('Temas por empezar o formalizar')
    expect(t).toContain('Matriz de priorizaci')
    expect(t).not.toContain('Resumen ejecutivo')
    expect(t).not.toContain('Recomendaciones')
  })

  it('con análisis IA agrega todas sus secciones sin romper por caracteres raros', () => {
    const conIA = { ...base, analisisIA: analisisDesdeApi(API) }
    const t = texto(conIA)
    for (const s of ['Resumen ejecutivo', 'Recomendaciones', 'Acciones a corto plazo', 'Acciones a mediano plazo',
      'Conclusi', 'Designar un responsable de SST', 'Prioridad alta']) {
      expect(t).toContain(s)
    }
    expect(construirDoc(conIA).getNumberOfPages()).toBeGreaterThan(construirDoc(base).getNumberOfPages())
  })
})

describe('títulos del PDF', () => {
  // Texto de cada título tal como lo escribe construirDoc.
  const TITULOS = new Set([
    'Mapa de prácticas por materia', 'Sus fortalezas', 'Temas por empezar o formalizar', 'Matriz de priorización',
    'Alertas informativas', 'Otras prácticas que nos contó', 'Análisis inteligente', 'Resumen ejecutivo',
    'Fortalezas', 'Áreas de oportunidad', 'Prioridades', 'Recomendaciones', 'Acciones a corto plazo',
    'Acciones a mediano plazo', 'Conclusión',
  ])

  /** Último texto de cada página, sin contar el pie («… Página i de n»). */
  function finalesDePagina(doc: ReturnType<typeof construirDoc>): string[] {
    const paginas = (doc.internal as unknown as { pages: (string[] | null)[] }).pages
    return paginas.slice(1).map((ops) => {
      const textos = (ops ?? []).flatMap((op) => [...op.matchAll(/\((.*)\) Tj/g)].map((m) => m[1]))
      return textos.filter((t) => !/Página \d+ de \d+$/.test(t)).at(-1) ?? ''
    })
  }

  it('ningún título queda solo al pie de una página', () => {
    const analisisIA = analisisDesdeApi(API)!
    let paginas = 0
    // Distintos largos del comentario final corren todo el contenido de
    // abajo, así cada título cae alguna vez cerca del final de una página.
    for (let n = 0; n <= 60; n++) {
      const diagnostico = { ...MIXTOS, comentarioFinal: 'Línea del comentario final. '.repeat(n * 3) }
      const doc = construirDoc({ perfil: PERFIL, tamizaje: TAM, diagnostico, priorizacion: { filas: {}, elegida: null }, analisisIA })
      for (const final of finalesDePagina(doc)) expect(TITULOS.has(final), `página que termina en «${final}»`).toBe(false)
      paginas += doc.getNumberOfPages()
    }
    expect(paginas).toBeGreaterThan(61)
  })
})

describe('cuando el servidor todavía no tiene el diagnóstico', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lo dice claramente (no es un fallo de la IA) y permite reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(422, {
      codigo: 'SIN_DIAGNOSTICO', mensaje: 'Todavía no hay datos de la empresa ni un autodiagnóstico guardados para analizar.',
    })))
    render(<Resultados token="t" perfil={PERFIL} tamizaje={TAM} diagnostico={MIXTOS}
      priorizacion={{ filas: {}, elegida: null }} onPriorizacion={() => {}} onBack={() => {}} />)
    expect(await screen.findByText(/no hay nada que analizar/)).toBeInTheDocument()
    expect(screen.getByText(/aviso rojo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText(/No pudimos generar el análisis/)).toBe(null)
  })
})
