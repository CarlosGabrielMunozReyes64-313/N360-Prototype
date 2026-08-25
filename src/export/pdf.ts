import { jsPDF } from 'jspdf'
import type { Bandera, Perfil, Prioridad, ResultadoFormato, Tamizaje } from '../types'
import type { Cruce } from '../engine/scoring'
import { clasificar } from '../data/escala'
import { SECTORES } from '../data/formato01'

const DARK: [number, number, number] = [2, 64, 41]
const MID: [number, number, number] = [4, 169, 122]
const MUTED: [number, number, number] = [90, 112, 104]
const TEXT: [number, number, number] = [26, 46, 36]
const LINE: [number, number, number] = [221, 231, 226]
const ALERT: [number, number, number] = [168, 50, 42]
const GOLD: [number, number, number] = [217, 149, 33]

const M = 18            // margen
const W = 210           // ancho A4
const H = 297
const CW = W - M * 2    // ancho útil

export interface DatosInforme {
  perfil: Perfil
  tamizaje: Tamizaje
  iso: ResultadoFormato | null
  ley: ResultadoFormato | null
  leyAplica: boolean
  leyExigible: boolean
  motivoLey: string
  cruce: Cruce | null
  banderas: Bandera[]
  plan: Prioridad[]
}

/** Construye el documento. Separado de la descarga para poder probarlo. */
export function construirDoc(d: DatosInforme): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0
  let pagina = 1


  const pie = () => {
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2)
    doc.line(M, H - 14, W - M, H - 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED)
    doc.text('NEXUS 360° · Informe de diagnóstico · Documento de autoevaluación, no constituye concepto jurídico', M, H - 9.5)
    doc.text(String(pagina), W - M, H - 9.5, { align: 'right' })
  }

  const nuevaPagina = () => {
    pie(); doc.addPage(); pagina++; y = M + 4
  }

  const asegurar = (h: number) => { if (y + h > H - 22) nuevaPagina() }

  const h2 = (txt: string) => {
    asegurar(16)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
    doc.text(txt, M, y); y += 3
    doc.setDrawColor(...MID); doc.setLineWidth(0.6)
    doc.line(M, y, M + 14, y); y += 7
  }

  const parrafo = (txt: string, size = 9, color = TEXT) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const ls = doc.splitTextToSize(txt, CW) as string[]
    asegurar(ls.length * (size * 0.42) + 3)
    doc.text(ls, M, y)
    y += ls.length * (size * 0.42) + 3
  }

  /* ------------------------------------------------ portada / encabezado */
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 34, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(255, 255, 255)
  doc.text('NEXUS 360°', M, 15)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(200, 226, 216)
  doc.text('Informe de diagnóstico normativo', M, 22.5)
  doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }),
    W - M, 22.5, { align: 'right' })

  y = 46

  /* ------------------------------------------------ empresa */
  const sector = SECTORES.find((s) => s.id === d.perfil.sector)?.nombre ?? '—'
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...TEXT)
  doc.text(d.perfil.razonSocial || 'Empresa sin nombre', M, y); y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED)
  const nit = d.perfil.nit ? `NIT ${d.perfil.nit}${d.perfil.dv ? '-' + d.perfil.dv : ''}` : 'NIT no registrado'
  const lugar = [d.perfil.municipio, d.perfil.departamento].filter(Boolean).join(', ') || '—'
  doc.text(`${nit}   ·   ${sector}   ·   ${lugar}`, M, y); y += 5
  const emp = Number(d.tamizaje.empleados) || 0
  doc.text(`${emp} empleados al 31 de diciembre   ·   Meta Ley 2173: ${emp * 2} individuos`, M, y)
  y += 11

  /* ------------------------------------------------ puntajes */
  const caja = (x: number, w: number, titulo: string, sub: string,
                res: ResultadoFormato | null, activo: boolean, nota: string) => {
    const alto = 34
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3)
    doc.setFillColor(activo ? 255 : 244, activo ? 255 : 247, activo ? 255 : 245)
    doc.roundedRect(x, y, w, alto, 2, 2, 'FD')
    doc.setFillColor(...(activo ? MID : GOLD))
    doc.rect(x, y, w, 1.2, 'F')

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED)
    doc.text(titulo.toUpperCase(), x + 5, y + 7)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...TEXT)
    doc.text(sub, x + 5, y + 12.5)

    if (res?.concluyente && res.score !== null) {
      const c = clasificar(res.score)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.setTextColor(...DARK)
      doc.text(res.score.toFixed(1), x + 5, y + 25)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
      doc.text(`/ ${res.techo.toFixed(1)}`, x + 20, y + 25)
      const rgbTag = c.color === '#a8322a' ? ALERT : c.color === '#d99521' ? GOLD : MID
      doc.setTextColor(...rgbTag); doc.setFontSize(8)
      doc.text(c.etiqueta, x + 5, y + 30.5)
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
      const ls = doc.splitTextToSize(nota, w - 10) as string[]
      doc.text(ls.slice(0, 3), x + 5, y + 21)
    }
  }

  const anchoCaja = (CW - 6) / 2
  caja(M, anchoCaja, 'Formato 01 · ISO 26000', 'Madurez en responsabilidad social',
    d.iso, true, 'Sin datos suficientes.')
  caja(M + anchoCaja + 6, anchoCaja, 'Formato 02 · Ley 2173', 'Áreas de Vida',
    d.leyAplica ? d.ley : null, d.leyExigible, d.motivoLey || 'Formato no evaluado.')
  y += 42

  /* ------------------------------------------------ lectura cruzada */
  if (d.cruce) {
    const col = d.cruce.tono === 'alerta' ? ALERT : d.cruce.tono === 'aviso' ? GOLD : MID
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...col)
    const t = doc.splitTextToSize(d.cruce.titulo, CW - 6) as string[]
    asegurar(t.length * 5 + 16)
    doc.setFillColor(...col); doc.rect(M, y - 3.5, 1.2, t.length * 4.6 + 12, 'F')
    doc.text(t, M + 5, y); y += t.length * 4.6 + 1.5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT)
    const b = doc.splitTextToSize(d.cruce.texto, CW - 8) as string[]
    doc.text(b, M + 5, y); y += b.length * 3.9 + 8
  }

  /* ------------------------------------------------ barras por dimensión */
  const barras = (res: ResultadoFormato, titulo: string) => {
    h2(titulo)
    for (const dim of res.dimensiones) {
      asegurar(8)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT)
      doc.text(dim.nombre.length > 46 ? dim.nombre.slice(0, 44) + '…' : dim.nombre, M, y + 1)
      doc.setFontSize(6.5); doc.setTextColor(...MUTED)
      doc.text(`peso ${dim.pesoEfectivo.toFixed(2)}`, M + 92, y + 1)

      const bx = M + 112, bw = 48
      doc.setFillColor(240, 244, 242); doc.roundedRect(bx, y - 2, bw, 2.6, 1.3, 1.3, 'F')
      if (dim.score !== null) {
        const c = clasificar(dim.score)
        const r = parseInt(c.color.slice(1, 3), 16)
        const g = parseInt(c.color.slice(3, 5), 16)
        const bl = parseInt(c.color.slice(5, 7), 16)
        doc.setFillColor(r, g, bl)
        doc.roundedRect(bx, y - 2, Math.max(bw * (dim.score / 4), 1.5), 2.6, 1.3, 1.3, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(r, g, bl)
        doc.text(dim.score.toFixed(1), W - M, y + 1, { align: 'right' })
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED)
        doc.text('no aplica', W - M, y + 1, { align: 'right' })
      }
      y += 7.5
    }
    y += 4
  }

  if (d.iso?.concluyente) barras(d.iso, 'Madurez por materia — ISO 26000')
  if (d.leyAplica && d.ley?.concluyente) barras(d.ley, 'Cumplimiento por dimensión — Ley 2173')

  /* ------------------------------------------------ banderas */
  if (d.banderas.length) {
    // Un encabezado no debe quedar solo al pie de página.
    if (y > H - 78) nuevaPagina()
    h2('Alertas críticas')
    parrafo('Se muestran aunque el puntaje global sea alto: un promedio puede esconder un riesgo que invalida el ciclo completo.', 8, MUTED)
    for (const b of d.banderas) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ALERT)
      const t = doc.splitTextToSize(b.titulo, CW - 6) as string[]
      const c = doc.splitTextToSize(b.detalle, CW - 8) as string[]
      asegurar(t.length * 4.4 + c.length * 3.9 + 9)
      doc.setFillColor(...ALERT); doc.rect(M, y - 3, 1.2, t.length * 4.4 + c.length * 3.9 + 4, 'F')
      doc.text(t, M + 5, y); y += t.length * 4.4
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT)
      doc.text(c, M + 5, y); y += c.length * 3.9 + 6
    }
  }

  /* ------------------------------------------------ plan */
  if (d.plan.length) {
    if (y > H - 90) nuevaPagina()
    h2('Plan de acción priorizado')
    parrafo('Las prioridades se ordenan por brecha ponderada, no por puntaje bruto. Una brecha legal exigible precede a cualquier brecha de madurez voluntaria.', 8, MUTED)

    for (const p of d.plan) {
      const accion = `${p.verbo} ${p.accion}`
      const at = doc.splitTextToSize(accion, CW - 12) as string[]
      const pt = doc.splitTextToSize(p.pregunta, CW - 12) as string[]
      const alto = at.length * 5 + pt.length * 3.6 + 17
      asegurar(alto + 4)

      doc.setDrawColor(...LINE); doc.setLineWidth(0.3)
      doc.roundedRect(M, y - 4, CW, alto, 2, 2, 'S')
      doc.setFillColor(...(p.critica ? ALERT : MID))
      doc.rect(M, y - 4, 1.4, alto, 'F')

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED)
      doc.text(`PRIORIDAD ${p.orden}`, M + 6, y + 1)
      doc.text(`${p.etiquetaOrigen}  ·  ${p.dimension}`, W - M - 4, y + 1, { align: 'right' })

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...DARK)
      doc.text(at, M + 6, y + 7)

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED)
      doc.text(pt, M + 6, y + 7 + at.length * 5)
      doc.setFontSize(7)
      doc.text(`Nivel actual ${p.valor} de ${p.techo}`, M + 6, y + 9 + at.length * 5 + pt.length * 3.6)

      y += alto + 4
    }
  }

  /* ------------------------------------------------ método */
  if (y > H - 70) nuevaPagina()
  h2('Nota metodológica')
  parrafo(
    'Escala 0 a 4: 0 sin gestión, 1 informal, 2 planificado, 3 implementado y medido, 4 mejora continua. ' +
    'Las respuestas marcadas «no aplica» se excluyen del cálculo y su peso se redistribuye entre las preguntas restantes de la sección. ' +
    'Los pesos de cada nivel suman 1.0; en el Formato 01 el peso de cada materia lo determina el sector de la empresa.',
    8, MUTED)
  parrafo(
    'El nivel 4 exige al menos dos ciclos ejecutados. En un primer ciclo el techo alcanzable es 3.0 y el puntaje se reporta sobre esa base.',
    8, MUTED)
  parrafo(
    'La ISO 26000 es autoevaluación y refleja percepción; la Ley 2173 se contrasta contra documentos verificables. Los dos resultados no se promedian: se leen uno contra otro.',
    8, MUTED)
  parrafo(
    'Pendiente de validación normativa: criterios de exclusión en el conteo de empleados, plazo vigente de delimitación tras la Resolución 0358 de 2026 y régimen sancionatorio.',
    8, MUTED)

  pie()
  return doc
}

export function nombreArchivo(perfil: Perfil): string {
  const slug = (perfil.razonSocial || 'empresa').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 40)
  return `nexus360-diagnostico-${slug}.pdf`
}

export function generarInforme(d: DatosInforme) {
  construirDoc(d).save(nombreArchivo(d.perfil))
}
