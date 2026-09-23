import { describe, expect, it } from 'vitest'
import type { Estadisticas } from '../src/auth/adminApi'
import { construirSecciones, seccionesConDatos, totalBarras } from '../src/engine/agregados'
import { clasificar } from '../src/data/escala'
import {
  APAGADO, COLOR_CONTEO, COLOR_OTROS, ESTILOS_SERIE, NIVELES, PALETA_CATEGORIAS, TINTA,
  apilarPuntos, caminoRebanada, contraste, densidadNormal, nivelDe, partirTexto,
  porcentajesEnteros, rebanadas, resumenPonderado, anchoTexto,
} from '../src/engine/graficas'
import { gruposCampana, seccionesPastel, tablasDe } from '../src/engine/vistasGraficas'
import { construirPdfEstadisticas, lecturaRapida, limpiar, nombreArchivoPdf } from '../src/export/pdfEstadisticas'
import type { Imagen } from '../src/export/rasterizar'

const STATS: Estadisticas = {
  resumen: { empresas: 12, usuarios: 15, diagnosticos_totales: 20, diagnosticos_completados: 9 },
  empresas_por_sector: [
    { sector_id: 'C', nombre: 'Industrias manufactureras', total: 7 },
    { sector_id: 'G', nombre: 'Comercio al por mayor y al por menor', total: 5 },
  ],
  empresas_por_tamano: [
    { tamano: 'Microempresa', total: 6 },
    { tamano: 'Pequeña', total: 4 },
    { tamano: 'Mediana', total: 2 },
  ],
  diagnosticos_por_estado: [
    { formato_id: 'iso26000', estado: 'completado', total: 6 },
    { formato_id: 'iso26000', estado: 'borrador', total: 5 },
    { formato_id: 'ley2173', estado: 'completado', total: 3 },
  ],
  promedio_por_dimension: [
    { formato_id: 'iso26000', numero: '01', dimension: 'Gobernanza de la organización', promedio: 2.0, respuestas: 6 },
    { formato_id: 'iso26000', numero: '02', dimension: 'Derechos humanos', promedio: 2.4, respuestas: 5 },
    { formato_id: 'iso26000', numero: '03', dimension: 'Prácticas laborales', promedio: 3.17, respuestas: 6 },
    { formato_id: 'ley2173', numero: 'D1', dimension: 'Línea base y diagnóstico', promedio: 2.7, respuestas: 10 },
    { formato_id: 'ley2173', numero: 'D2', dimension: 'Habilitación del área', promedio: 2.78, respuestas: 9 },
  ],
}

const secciones = seccionesConDatos(construirSecciones(STATS))

describe('accesibilidad de los colores', () => {
  it('todo relleno tiene contraste ≥ 3:1 contra blanco (WCAG 1.4.11)', () => {
    const rellenos = [
      ...NIVELES.map((n) => n.color), ...PALETA_CATEGORIAS, COLOR_OTROS, COLOR_CONTEO,
      ...ESTILOS_SERIE.map((e) => e.color),
      ...secciones.flatMap((s) => s.barras.map((b) => b.color)),
    ]
    for (const c of rellenos) expect(contraste(c), c).toBeGreaterThanOrEqual(3)
  })

  it('el texto tiene contraste ≥ 4.5:1 (WCAG 1.4.3)', () => {
    expect(contraste(TINTA)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(APAGADO)).toBeGreaterThanOrEqual(4.5)
  })

  it('las series de la campana no se distinguen solo por color', () => {
    const formas = new Set(ESTILOS_SERIE.map((e) => e.marcador))
    const trazos = new Set(ESTILOS_SERIE.map((e) => e.trazo ?? 'continuo'))
    expect(formas.size).toBe(ESTILOS_SERIE.length)
    expect(trazos.size).toBe(ESTILOS_SERIE.length)
  })

  it('los niveles usan los mismos cortes que el informe de la empresa', () => {
    for (let v = 0; v <= 4.0001; v += 0.05) {
      expect(nivelDe(v).etiqueta).toBe(clasificar(v).etiqueta)
    }
  })
})

describe('pastel', () => {
  it('los porcentajes enteros suman exactamente 100', () => {
    for (const valores of [[1, 1, 1], [7, 5], [1, 2, 3, 4, 5, 6], [33, 33, 34], [1, 99], [5]]) {
      expect(porcentajesEnteros(valores).reduce((a, b) => a + b, 0)).toBe(100)
    }
    expect(porcentajesEnteros([1, 1, 1]).sort()).toEqual([33, 33, 34])
    expect(porcentajesEnteros([0, 0])).toEqual([0, 0])
  })

  it('las rebanadas cubren la vuelta completa, de mayor a menor', () => {
    const rs = rebanadas([
      { clave: 'a', etiqueta: 'A', valor: 2 },
      { clave: 'b', etiqueta: 'B', valor: 5 },
      { clave: 'c', etiqueta: 'C', valor: 0 },
    ])
    expect(rs.map((r) => r.clave)).toEqual(['b', 'a'])
    expect(rs[0].inicio).toBe(0)
    expect(rs.at(-1)!.fin).toBeCloseTo(Math.PI * 2)
    expect(caminoRebanada(100, 100, 50, rs[0].inicio, rs[0].fin)).toMatch(/^M .* A 50\.00 50\.00 0 1 1 .* Z$/)
  })

  it('más de seis categorías se agrupan en «Otros»', () => {
    const muchas = Array.from({ length: 9 }, (_, i) => ({ clave: `k${i}`, etiqueta: `Cat ${i}`, valor: 10 - i }))
    const rs = rebanadas(muchas)
    expect(rs).toHaveLength(6)
    expect(rs.at(-1)).toMatchObject({ clave: 'otros', etiqueta: 'Otros (4)', valor: 5 + 4 + 3 + 2, color: COLOR_OTROS })
    expect(new Set(rs.map((r) => r.color)).size).toBe(6)
  })

  it('solo reparte totales: ni el resumen ni la madurez', () => {
    expect(seccionesPastel(secciones).map((s) => s.id)).toEqual(['sector', 'tamano', 'estado'])
  })
})

describe('campana', () => {
  it('media y desviación ponderadas por respuestas', () => {
    const r = resumenPonderado([
      { clave: 'a', etiqueta: 'a', valor: 1, peso: 1 },
      { clave: 'b', etiqueta: 'b', valor: 3, peso: 3 },
    ])!
    expect(r.media).toBeCloseTo(2.5)
    expect(r.desviacion).toBeCloseTo(Math.sqrt((1 * 2.25 + 3 * 0.25) / 4))
    expect(r.respuestas).toBe(4)
  })

  it('con menos de dos dimensiones no hay curva', () => {
    expect(resumenPonderado([{ clave: 'a', etiqueta: 'a', valor: 2, peso: 3 }])).toBeNull()
  })

  it('la curva normal integra 1 y tiene su pico en la media', () => {
    let area = 0
    const paso = 0.001
    for (let x = -4; x <= 8; x += paso) area += densidadNormal(x, 2, 0.6) * paso
    expect(area).toBeCloseTo(1, 3)
    expect(densidadNormal(2, 2, 0.6)).toBeGreaterThan(densidadNormal(2.3, 2, 0.6))
  })

  it('agrupa una curva por formato', () => {
    const grupos = gruposCampana(secciones)
    expect(grupos.map((g) => [g.nombre, g.puntos.length])).toEqual([['ISO 26000', 3], ['Ley 2173', 2]])
    const ley = grupos[1].resumen!
    expect(ley.media).toBeCloseTo((2.7 * 10 + 2.78 * 9) / 19)
  })

  it('apila los puntos que caen muy juntos', () => {
    expect(apilarPuntos([2.0, 2.02, 2.04, 3.0], 0.05)).toEqual([0, 1, 2, 0])
  })
})

describe('texto', () => {
  it('parte en líneas sin pasarse del ancho y sin cortar palabras', () => {
    const lineas = partirTexto('Asuntos de consumidores y protección del usuario final', 200, 13, 3)
    expect(lineas.length).toBeGreaterThan(1)
    for (const l of lineas) expect(anchoTexto(l, 13)).toBeLessThanOrEqual(200)
    expect(lineas.join(' ')).toBe('Asuntos de consumidores y protección del usuario final')
  })

  it('si no cabe, la última línea termina en «…»', () => {
    const lineas = partirTexto('una frase bastante larga que no va a caber en dos líneas angostas', 90, 13, 2)
    expect(lineas).toHaveLength(2)
    expect(lineas[1].endsWith('…')).toBe(true)
  })
})

describe('tablas de datos', () => {
  it('la tabla de barras tiene una fila por barra', () => {
    expect(tablasDe('barras', secciones)[0].filas).toHaveLength(totalBarras(secciones))
  })

  it('en la tabla del pastel cada reparto suma 100 %', () => {
    const filas = tablasDe('pastel', secciones)[0].filas
    const porReparto = new Map<string, number>()
    for (const [reparto, , , pct] of filas) porReparto.set(reparto, (porReparto.get(reparto) ?? 0) + parseInt(pct))
    expect([...porReparto.values()]).toEqual([100, 100, 100])
  })
})

// PNG real de 4×2 px (más ancho que alto) y de 2×4 px (más alto que ancho).
const PNG_ANCHO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEklEQVR4nGNkWVnFAANMDEgAABuAASsciwFSAAAAAElFTkSuQmCC'
const PNG_ALTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAAECAIAAAArjXluAAAAFUlEQVR4nGNkWVnFwMDAxMDAgEEBAB4MAS/iag2wAAAAAElFTkSuQmCC'
const imagen = (dataUrl: string, anchoBase: number, altoBase: number): Imagen => ({
  dataUrl, ancho: anchoBase, alto: altoBase, anchoBase, altoBase,
})

describe('PDF de estadísticas', () => {
  it('informe completo: portada, una página por gráfica y tablas', () => {
    const doc = construirPdfEstadisticas({
      stats: STATS, secciones, completo: true, admin: 'Generado por Gabriel',
      graficas: [
        { vista: 'barras', imagen: imagen(PNG_ALTO, 1100, 1500) },
        { vista: 'pastel', imagen: imagen(PNG_ANCHO, 1100, 520) },
        { vista: 'campana', imagen: null },
      ],
    })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(5)
    // Cada gráfica elige la orientación que la muestra más grande.
    doc.setPage(2)
    expect(doc.internal.pageSize.getWidth()).toBeLessThan(doc.internal.pageSize.getHeight())
    doc.setPage(3)
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight())

    const bytes = new Uint8Array(doc.output('arraybuffer'))
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('una sola gráfica: su página y su tabla', () => {
    const graficas = [{ vista: 'pastel' as const, imagen: imagen(PNG_ANCHO, 1100, 520) }]
    const doc = construirPdfEstadisticas({ stats: STATS, secciones, completo: false, graficas })
    expect(doc.getNumberOfPages()).toBe(2)
    expect(nombreArchivoPdf(graficas, false, new Date('2026-09-23T12:00:00Z'))).toBe('nexus360-grafica-pastel-2026-09-23.pdf')
  })

  it('no se cae con el panel vacío', () => {
    const vacias = seccionesConDatos(construirSecciones({
      ...STATS, empresas_por_sector: [], empresas_por_tamano: [], diagnosticos_por_estado: [], promedio_por_dimension: [],
    }))
    const doc = construirPdfEstadisticas({ stats: STATS, secciones: vacias, completo: true, graficas: [] })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })

  it('la lectura rápida destaca lo que un lector busca primero', () => {
    const frases = lecturaRapida(STATS, secciones)
    expect(frases).toContain('9 de 20 diagnósticos iniciados están completos (45 %).')
    expect(frases.join(' ')).toMatch(/más alta es 03\. Prácticas laborales \(3,17\)/)
  })

  it('reemplaza los signos que las fuentes del PDF no tienen', () => {
    expect(limpiar('0–4 … ≥ “sí”')).toBe('0-4 ... >= "sí"')
  })
})
