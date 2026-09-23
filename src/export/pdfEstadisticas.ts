import { jsPDF } from 'jspdf'
import type { Estadisticas } from '../auth/adminApi'
import type { Seccion } from '../engine/agregados'
import { selloArchivo, selloFecha } from '../engine/agregados'
import { nivelDe, numero } from '../engine/graficas'
import { describirResumen, gruposCampana, infoVista, tablasDe } from '../engine/vistasGraficas'
import type { Tabla, Vista } from '../engine/vistasGraficas'
import type { Imagen } from './rasterizar'

/**
 * PDF de las estadísticas del panel de admin. Dos modos:
 *  - informe completo: portada con cifras y lectura rápida, una página por
 *    gráfica (barras, pastel, campana) y las tablas de datos;
 *  - una sola gráfica: esa gráfica y su tabla.
 *
 * Las gráficas llegan ya rasterizadas (renderizarGraficas.tsx) a 2,5 px
 * por punto, ~300 ppp en A4: se imprimen nítidas. Cada página de gráfica
 * elige vertical u horizontal según cuál la muestre más grande.
 */

const VERDE: [number, number, number] = [2, 64, 41]
const VERDE_MEDIO: [number, number, number] = [4, 169, 122]
const TINTA: [number, number, number] = [26, 46, 36]
const APAGADO: [number, number, number] = [77, 98, 89]
const LINEA: [number, number, number] = [221, 231, 226]
const CEBRA: [number, number, number] = [244, 247, 245]

const M = 14
const PIE = 16

type Orientacion = 'portrait' | 'landscape'

export interface GraficaPdf {
  vista: Vista
  /** null si el navegador no pudo rasterizarla: la página lo dice. */
  imagen: Imagen | null
}

export interface DatosPdfEstadisticas {
  stats: Estadisticas
  secciones: Seccion[]
  graficas: GraficaPdf[]
  /** true = informe completo; false = solo las gráficas y sus tablas. */
  completo: boolean
  admin?: string
  fecha?: string
}

/** Las fuentes estándar del PDF solo cubren Latin-1: se cambian los pocos
 * signos tipográficos que usa la app por su equivalente simple. */
export function limpiar(t: string): string {
  return t
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u00a0\u202f]/g, ' ')
}

export function nombreArchivoPdf(graficas: GraficaPdf[], completo: boolean, fecha = new Date()): string {
  const dia = selloArchivo(fecha)
  if (completo || graficas.length !== 1) return `nexus360-estadisticas-${dia}.pdf`
  return `nexus360-grafica-${graficas[0].vista}-${dia}.pdf`
}

export function construirPdfEstadisticas(d: DatosPdfEstadisticas): jsPDF {
  const fecha = d.fecha ?? selloFecha()
  let doc: jsPDF | null = null
  let y = 0

  const ancho = () => doc!.internal.pageSize.getWidth()
  const alto = () => doc!.internal.pageSize.getHeight()
  const util = () => ancho() - 2 * M

  const pagina = (o: Orientacion) => {
    if (!doc) doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: o, compress: true })
    else doc.addPage('a4', o)
    y = M
  }

  const texto = (t: string, x: number, yy: number, opciones?: Parameters<jsPDF['text']>[3]) =>
    doc!.text(limpiar(t), x, yy, opciones)

  const lineas = (t: string, anchoMax: number): string[] => doc!.splitTextToSize(limpiar(t), anchoMax) as string[]

  const cintillo = () => {
    doc!.setFont('helvetica', 'bold'); doc!.setFontSize(8); doc!.setTextColor(...VERDE)
    texto('NEXUS 360°', M, y + 2)
    doc!.setFont('helvetica', 'normal'); doc!.setTextColor(...APAGADO)
    texto('Estadísticas generales', M + 20, y + 2)
    texto(fecha, ancho() - M, y + 2, { align: 'right' })
    doc!.setDrawColor(...LINEA); doc!.setLineWidth(0.3)
    doc!.line(M, y + 4.5, ancho() - M, y + 4.5)
    y += 12
  }

  const titulo = (t: string, tamano = 16) => {
    doc!.setFont('helvetica', 'bold'); doc!.setFontSize(tamano); doc!.setTextColor(...VERDE)
    texto(t, M, y)
    y += 2.5
    doc!.setDrawColor(...VERDE_MEDIO); doc!.setLineWidth(0.7)
    doc!.line(M, y, M + 16, y)
    y += 6.5
  }

  const parrafo = (t: string, tamano = 9.5, color = TINTA) => {
    doc!.setFont('helvetica', 'normal'); doc!.setFontSize(tamano); doc!.setTextColor(...color)
    const ls = lineas(t, util())
    doc!.text(ls, M, y)
    y += ls.length * tamano * 0.42 + 2.5
  }

  // ---------------------------------------------------------------- portada
  if (d.completo) {
    pagina('portrait')
    doc!.setFillColor(...VERDE); doc!.rect(0, 0, ancho(), 42, 'F')
    doc!.setFont('helvetica', 'bold'); doc!.setFontSize(22); doc!.setTextColor(255, 255, 255)
    texto('NEXUS 360°', M, 18)
    doc!.setFont('helvetica', 'normal'); doc!.setFontSize(12); doc!.setTextColor(200, 226, 216)
    texto('Estadísticas generales del panel de administración', M, 27)
    doc!.setFontSize(9)
    texto(fecha, M, 35)
    if (d.admin) texto(d.admin, ancho() - M, 35, { align: 'right' })
    y = 56

    // Cifras principales en cuatro recuadros.
    const r = d.stats.resumen
    const cifras: [string, string][] = [
      [numero(r.empresas), 'Empresas registradas'],
      [numero(r.usuarios), 'Usuarios totales'],
      [numero(r.diagnosticos_totales), 'Diagnósticos iniciados'],
      [numero(r.diagnosticos_completados), 'Diagnósticos completados'],
    ]
    const sep = 4
    const w = (util() - sep * 3) / 4
    cifras.forEach(([valor, etiqueta], i) => {
      const x = M + i * (w + sep)
      doc!.setFillColor(...CEBRA); doc!.setDrawColor(...LINEA); doc!.setLineWidth(0.3)
      doc!.roundedRect(x, y, w, 24, 2, 2, 'FD')
      doc!.setFillColor(...VERDE_MEDIO); doc!.rect(x, y, 1.2, 24, 'F')
      doc!.setFont('helvetica', 'bold'); doc!.setFontSize(20); doc!.setTextColor(...VERDE)
      texto(valor, x + 5, y + 11)
      doc!.setFont('helvetica', 'normal'); doc!.setFontSize(8); doc!.setTextColor(...APAGADO)
      doc!.text(lineas(etiqueta, w - 8), x + 5, y + 17)
    })
    y += 36

    titulo('Lectura rápida', 13)
    for (const frase of lecturaRapida(d.stats, d.secciones)) {
      doc!.setFillColor(...VERDE_MEDIO); doc!.circle(M + 1.2, y - 1.2, 0.9, 'F')
      doc!.setFont('helvetica', 'normal'); doc!.setFontSize(10); doc!.setTextColor(...TINTA)
      const ls = lineas(frase, util() - 6)
      doc!.text(ls, M + 5, y)
      y += ls.length * 4.3 + 2.2
    }

    y += 6
    titulo('Contenido', 13)
    const partes = [
      ...d.graficas.map((g, i) => `${i + 1}. ${infoVista(g.vista).nombre}: ${infoVista(g.vista).titulo.toLowerCase()}`),
      `${d.graficas.length + 1}. Tablas con todos los datos`,
    ]
    doc!.setFont('helvetica', 'normal'); doc!.setFontSize(10); doc!.setTextColor(...TINTA)
    for (const p of partes) { texto(p, M, y); y += 5.5 }
  }

  // ------------------------------------------------------ páginas de gráfica
  for (const g of d.graficas) {
    const info = infoVista(g.vista)
    const notas = notasDe(g.vista, d.secciones)

    // Qué orientación deja la imagen más grande.
    const reservaArriba = 12 + 9 + 16 // cintillo + título + descripción aprox.
    const reservaAbajo = PIE + 4 + notas.length * 4.6
    const tamano = (o: Orientacion) => {
      const [pw, ph] = o === 'portrait' ? [210, 297] : [297, 210]
      if (!g.imagen) return { w: 0, h: 0 }
      const disponibleW = pw - 2 * M
      const disponibleH = ph - M - reservaArriba - reservaAbajo
      const proporcion = g.imagen.altoBase / g.imagen.anchoBase
      const w = Math.min(disponibleW, disponibleH / proporcion)
      return { w, h: w * proporcion }
    }
    const orientacion: Orientacion = tamano('landscape').w * tamano('landscape').h >= tamano('portrait').w * tamano('portrait').h
      ? 'landscape' : 'portrait'

    pagina(orientacion)
    cintillo()
    titulo(`${info.nombre}: ${info.titulo}`)
    parrafo(info.descripcion, 9.5, APAGADO)
    y += 1

    if (g.imagen) {
      const disponibleH = alto() - y - reservaAbajo
      const proporcion = g.imagen.altoBase / g.imagen.anchoBase
      const w = Math.min(util(), disponibleH / proporcion)
      const h = w * proporcion
      const x = M + (util() - w) / 2
      doc!.setDrawColor(...LINEA); doc!.setLineWidth(0.3)
      doc!.roundedRect(x - 1.5, y - 1.5, w + 3, h + 3, 1.5, 1.5, 'S')
      doc!.addImage(g.imagen.dataUrl, 'PNG', x, y, w, h, undefined, 'FAST')
      y += h + 6
    } else {
      parrafo('Esta gráfica no pudo incrustarse en este navegador. Sus datos están en las tablas.', 10, APAGADO)
    }

    doc!.setFont('helvetica', 'normal'); doc!.setFontSize(8.5); doc!.setTextColor(...APAGADO)
    for (const n of notas) {
      const ls = lineas(n, util())
      doc!.text(ls, M, y)
      y += ls.length * 3.8 + 0.8
    }
  }

  // ----------------------------------------------------------------- tablas
  const tablas: Tabla[] = d.completo
    ? [
        ...tablasDe('barras', d.secciones),
        ...tablasDe('pastel', d.secciones),
        ...tablasDe('campana', d.secciones).slice(0, 1),
      ]
    : d.graficas.flatMap((g) => tablasDe(g.vista, d.secciones))

  const conFilas = tablas.filter((t) => t.filas.length > 0)
  if (conFilas.length) {
    pagina('portrait')
    cintillo()
    titulo('Datos')
    for (const t of conFilas) dibujarTabla(t)
  }

  function dibujarTabla(t: Tabla) {
    const tamano = 8.5
    const altoLinea = 3.7
    const anchos = anchosColumna(t, util())

    const encabezado = () => {
      doc!.setFillColor(...VERDE); doc!.rect(M, y, util(), 7, 'F')
      doc!.setFont('helvetica', 'bold'); doc!.setFontSize(tamano); doc!.setTextColor(255, 255, 255)
      let x = M
      t.columnas.forEach((c, i) => {
        const derecha = c.numerica
        texto(c.titulo, derecha ? x + anchos[i] - 2 : x + 2, y + 4.8, derecha ? { align: 'right' } : undefined)
        x += anchos[i]
      })
      y += 7
    }

    if (y + 20 > alto() - PIE - 4) { pagina('portrait'); cintillo() }
    doc!.setFont('helvetica', 'bold'); doc!.setFontSize(11); doc!.setTextColor(...TINTA)
    texto(t.titulo, M, y + 2)
    y += 6
    encabezado()

    t.filas.forEach((fila, n) => {
      doc!.setFont('helvetica', 'normal'); doc!.setFontSize(tamano)
      const celdas = fila.map((v, i) => lineas(v, anchos[i] - 4))
      const h = Math.max(...celdas.map((c) => c.length)) * altoLinea + 3
      if (y + h > alto() - PIE - 4) {
        pagina('portrait'); cintillo(); encabezado()
        doc!.setFont('helvetica', 'normal'); doc!.setFontSize(tamano)
      }
      if (n % 2 === 1) { doc!.setFillColor(...CEBRA); doc!.rect(M, y, util(), h, 'F') }
      doc!.setTextColor(...TINTA)
      let x = M
      celdas.forEach((ls, i) => {
        const derecha = t.columnas[i].numerica
        doc!.text(ls, derecha ? x + anchos[i] - 2 : x + 2, y + 4.3, derecha ? { align: 'right' } : undefined)
        x += anchos[i]
      })
      y += h
    })
    doc!.setDrawColor(...LINEA); doc!.setLineWidth(0.3)
    doc!.line(M, y, M + util(), y)
    y += 9
  }

  if (!doc) pagina('portrait')
  const final = doc as unknown as jsPDF

  // ------------------------------------------ pie con «Página X de Y» en todas
  const total = final.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    final.setPage(i)
    const w = final.internal.pageSize.getWidth()
    const h = final.internal.pageSize.getHeight()
    final.setDrawColor(...LINEA); final.setLineWidth(0.3)
    final.line(M, h - 11, w - M, h - 11)
    final.setFont('helvetica', 'normal'); final.setFontSize(7.5); final.setTextColor(...APAGADO)
    final.text(limpiar('NEXUS 360° · Estadísticas generales · Datos agregados, sin información de empresas individuales'), M, h - 6.5)
    final.text(`Página ${i} de ${total}`, w - M, h - 6.5, { align: 'right' })
  }
  final.setProperties({ title: 'NEXUS 360° · Estadísticas generales', creator: 'NEXUS 360°' })
  return final
}

/** Frases que un lector busca primero, calculadas de los mismos datos. */
export function lecturaRapida(stats: Estadisticas, secciones: Seccion[]): string[] {
  const frases: string[] = []
  const r = stats.resumen
  frases.push(`${numero(r.empresas)} empresas registradas y ${numero(r.usuarios)} usuarios.`)
  if (r.diagnosticos_totales > 0) {
    const tasa = Math.round((r.diagnosticos_completados / r.diagnosticos_totales) * 100)
    frases.push(`${numero(r.diagnosticos_completados)} de ${numero(r.diagnosticos_totales)} diagnósticos iniciados están completos (${tasa} %).`)
  } else {
    frases.push('Todavía no hay diagnósticos iniciados.')
  }
  const sector = [...stats.empresas_por_sector].sort((a, b) => b.total - a.total)[0]
  if (sector) frases.push(`El sector con más empresas es ${sector.nombre} (${numero(sector.total)}).`)

  for (const g of gruposCampana(secciones)) {
    if (!g.resumen) continue
    const orden = [...g.puntos].sort((a, b) => b.valor - a.valor)
    const alta = orden[0]
    const baja = orden[orden.length - 1]
    const nombre = (e: string) => (e.startsWith(`${g.nombre} · `) ? e.slice(g.nombre.length + 3) : e)
    frases.push(
      `${g.nombre}: madurez media ${numero(g.resumen.media, 2)} (${nivelDe(g.resumen.media).etiqueta.toLowerCase()}). `
      + `La dimensión más alta es ${nombre(alta.etiqueta)} (${numero(alta.valor, 2)}) `
      + `y la más baja, ${nombre(baja.etiqueta)} (${numero(baja.valor, 2)}).`,
    )
  }
  return frases
}

function notasDe(vista: Vista, secciones: Seccion[]): string[] {
  if (vista === 'campana') {
    return [
      ...gruposCampana(secciones).map((g) => `${g.nombre}: ${g.resumen ? describirResumen(g.resumen) : 'hacen falta al menos dos dimensiones para la curva'}.`),
      'Media y desviación ponderadas por el número de respuestas de cada dimensión.',
    ]
  }
  if (vista === 'barras') return ['Conteos y madurez usan escalas distintas: cada panel se lee contra su propio eje.']
  return ['Los porcentajes están redondeados de forma que cada pastel sume exactamente 100 %.']
}

/** Reparte el ancho según lo largo del contenido de cada columna. */
function anchosColumna(t: Tabla, total: number): number[] {
  const pesos = t.columnas.map((c, i) => {
    const largo = Math.max(c.titulo.length, ...t.filas.map((f) => (f[i] ?? '').length))
    return c.numerica ? Math.min(Math.max(largo, 8), 12) : Math.min(Math.max(largo, 10), 46)
  })
  const suma = pesos.reduce((a, b) => a + b, 0)
  return pesos.map((p) => (p / suma) * total)
}

export async function descargarPdfEstadisticas(d: DatosPdfEstadisticas): Promise<void> {
  const doc = construirPdfEstadisticas(d)
  doc.save(nombreArchivoPdf(d.graficas, d.completo))
}
