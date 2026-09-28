import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Estadisticas } from '../src/auth/adminApi'
import { construirSecciones, seccionesConDatos } from '../src/engine/agregados'
import { GraficaGeneral } from '../src/components/GraficaGeneral'
import { GraficaPastel } from '../src/components/GraficaPastel'
import { GraficaCampana } from '../src/components/GraficaCampana'
import { GraficaEtapas } from '../src/components/GraficaEtapas'
import { PanelGraficas } from '../src/components/PanelGraficas'

const STATS: Estadisticas = {
  resumen: { empresas: 2, usuarios: 3, diagnosticos_totales: 4, diagnosticos_completados: 4 },
  empresas_por_sector: [
    { sector_id: 'I', nombre: 'Industrial', total: 1 },
    { sector_id: 'C', nombre: 'Comercio', total: 1 },
  ],
  empresas_por_tamano: [{ tamano: 'mediana', total: 1 }, { tamano: 'pequena', total: 1 }],
  empresas_por_cliente: [],
  respuestas_por_etapa: [],
  diagnosticos_por_estado: [
    { formato_id: 'iso26000', estado: 'completado', total: 2 },
    { formato_id: 'ley2173', estado: 'completado', total: 2 },
  ],
  promedio_por_dimension: [
    { formato_id: 'iso26000', numero: '01', dimension: 'Gobernanza de la organización', promedio: 2.0, respuestas: 6 },
    { formato_id: 'iso26000', numero: '05', dimension: 'Prácticas justas de operación', promedio: 1.67, respuestas: 6 },
    { formato_id: 'iso26000', numero: '03', dimension: 'Prácticas laborales', promedio: 3.17, respuestas: 6 },
    { formato_id: 'ley2173', numero: 'D1', dimension: 'Línea base y diagnóstico', promedio: 2.7, respuestas: 10 },
    { formato_id: 'ley2173', numero: 'D4', dimension: 'Ejecución, permanencia y reporte', promedio: 2.88, respuestas: 8 },
  ],
}
const secciones = seccionesConDatos(construirSecciones(STATS))
const textoDe = (el: Element) => el.textContent ?? ''

describe('gráfica de barras horizontales', () => {
  it('muestra los nombres completos, no recortados', () => {
    const { container } = render(<GraficaGeneral secciones={secciones} ancho={1100} />)
    const svg = textoDe(container)
    expect(svg).toContain('Prácticas justas de operación')
    expect(svg).toContain('Ejecución, permanencia y reporte')
    expect(svg).not.toContain('Ejecución, permanen…')
  })

  it('escribe el nivel junto a cada promedio: el color no va solo', () => {
    const { container } = render(<GraficaGeneral secciones={secciones} ancho={1100} />)
    const barra = [...container.querySelectorAll('g')].find((g) => g.querySelector('title')?.textContent?.startsWith('ISO 26000 · 05.'))!
    expect(textoDe(barra)).toMatch(/1,67\s*Organizado/)
  })

  it('agrupa la etapa promedio por formato y separa las escalas en dos paneles', () => {
    const { container } = render(<GraficaGeneral secciones={secciones} ancho={1100} />)
    const svg = textoDe(container)
    for (const t of ['Conteos', 'Etapa promedio por materia (lectura interna)', 'ISO 26000', 'Ley 2173', 'Etapa promedio (lectura interna, 0 a 4)', 'Cantidad']) {
      expect(svg).toContain(t)
    }
  })

  it('usa el ancho que recibe: el texto no se encoge en pantallas angostas', () => {
    const { container } = render(<GraficaGeneral secciones={secciones} ancho={380} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('380')
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 380 /)
  })
})

describe('gráfica de pastel', () => {
  it('un pastel por reparto, sin el resumen ni la madurez', () => {
    const { container } = render(<GraficaPastel secciones={secciones} ancho={1100} />)
    const svg = textoDe(container)
    expect(svg).toContain('Empresas por sector')
    expect(svg).toContain('Empresas por tamaño')
    expect(svg).toContain('Diagnósticos por estado')
    expect(svg).not.toContain('Resumen general')
    expect(svg).not.toContain('Madurez')
  })

  it('escribe cantidad y porcentaje de cada categoría', () => {
    const { container } = render(<GraficaPastel secciones={secciones} ancho={1100} />)
    expect(textoDe(container)).toContain('Total: 2 empresas')
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(6)
    expect((textoDe(container).match(/50 %/g) ?? []).length).toBeGreaterThanOrEqual(6)
  })
})

describe('gráfica de campana', () => {
  it('una curva por formato, con su media escrita y un punto por dimensión', () => {
    const { container } = render(<GraficaCampana secciones={secciones} ancho={1100} />)
    const svg = textoDe(container)
    expect(svg).toContain('ISO 26000')
    expect(svg).toContain('Ley 2173')
    expect((svg.match(/media \d,\d\d/g) ?? []).length).toBeGreaterThanOrEqual(2)
    const puntos = [...container.querySelectorAll('title')].filter((t) => /resp\.$/.test(t.textContent ?? ''))
    expect(puntos).toHaveLength(5)
  })

  it('explica por qué no dibuja curva si faltan datos', () => {
    const una = seccionesConDatos(construirSecciones({ ...STATS, promedio_por_dimension: STATS.promedio_por_dimension.slice(0, 1) }))
    const { container } = render(<GraficaCampana secciones={una} ancho={900} />)
    expect(textoDe(container)).toMatch(/Hace falta al menos dos materias/)
  })
})

describe('panel de gráficas', () => {
  it('pestañas accesibles: flechas para cambiar de gráfica', async () => {
    render(<PanelGraficas secciones={secciones} generando={false} onDescargarPdf={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Barras', 'Pastel', 'Etapas', 'Campana'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    tabs[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Pastel' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Pastel' })).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Cómo se reparte cada total' })).toBeInTheDocument()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Etapas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'En qué punto están las empresas en cada materia' })).toBeInTheDocument()

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Campana' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Barras' })).toHaveAttribute('aria-selected', 'true')
  })

  it('descarga en PDF la gráfica que se está viendo', async () => {
    const onDescargarPdf = vi.fn()
    render(<PanelGraficas secciones={secciones} generando={false} onDescargarPdf={onDescargarPdf} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Campana' }))
    await userEvent.click(screen.getByRole('button', { name: /Descargar esta gráfica en PDF/ }))
    expect(onDescargarPdf).toHaveBeenCalledWith('campana')
  })

  it('los datos de cada gráfica están también en una tabla', async () => {
    render(<PanelGraficas secciones={secciones} generando={false} onDescargarPdf={() => {}} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Pastel' }))
    await userEvent.click(screen.getByText('Ver los datos de esta gráfica en una tabla'))
    const tabla = screen.getByRole('table', { name: 'Repartos' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(1 + 6)
    expect(within(tabla).getAllByText('50 %')).toHaveLength(6)
  })
})

describe('gráfica de etapas por materia', () => {
  const conEtapas = seccionesConDatos(construirSecciones({
    ...STATS,
    etapas_por_materia: [
      { numero: '01', materia: 'Gobernanza organizacional', etapa: '0', total: 2 },
      { numero: '01', materia: 'Gobernanza organizacional', etapa: '2', total: 5 },
      { numero: '01', materia: 'Gobernanza organizacional', etapa: 'NA', total: 1 },
      { numero: '03', materia: 'Prácticas laborales', etapa: '3', total: 4 },
      { numero: '03', materia: 'Prácticas laborales', etapa: 'diferente', total: 1 },
    ],
  }))

  it('dibuja una barra por materia con porcentajes que suman 100 y su leyenda', () => {
    const { container } = render(<GraficaEtapas secciones={conEtapas} ancho={1000} />)
    const texto = textoDe(container)
    expect(texto).toContain('01. Gobernanza organizacional')
    expect(texto).toContain('8 resp.')
    expect(texto).toContain('63 %')
    for (const e of ['Aún no abordado', 'Organizado', 'Con resultados', 'Algo diferente', 'No aplica']) expect(texto).toContain(e)
    const tramos = [...container.querySelectorAll('rect > title')].map((t) => t.textContent)
    expect(tramos).toContain('03. Prácticas laborales · Con resultados: 4 (80 %)')
  })

  it('en pantallas angostas no se desborda y explica cuando no hay datos', () => {
    const { container } = render(<GraficaEtapas secciones={conEtapas} ancho={360} />)
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('360')
    const vacio = render(<GraficaEtapas secciones={secciones} ancho={800} />)
    expect(textoDe(vacio.container)).toMatch(/Todavía no hay respuestas con etapa/)
  })
})
