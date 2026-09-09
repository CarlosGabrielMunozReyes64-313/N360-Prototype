import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun,
  PageNumber, PageOrientation, Packer, Paragraph, ShadingType, Table, TableCell,
  TableRow, TextRun, VerticalAlign, WidthType, convertMillimetersToTwip,
} from 'docx'
import { saveAs } from 'file-saver'
import type { EmpresaDetalle, Estadisticas } from '../auth/adminApi'
import type { Seccion } from '../engine/agregados'
import { NOMBRES_ESTADO, NOMBRES_FORMATO, selloArchivo, selloFecha } from '../engine/agregados'
import type { Imagen } from './rasterizar'
import { dataUrlABytes } from './rasterizar'

/**
 * Informe .docx generado con la librería `docx`, que escribe OOXML de
 * verdad. La alternativa habitual —soltar HTML dentro de un archivo con
 * extensión .doc— produce algo que Word abre con una advertencia, que
 * Google Docs deforma y que no se puede editar con estilos. Esto sí es un
 * documento editable: tablas reales, encabezado, pie y numeración.
 *
 * El documento tiene dos secciones porque la gráfica y el detalle de
 * empresas son anchos: el texto va vertical y esos dos van horizontal.
 */

const VERDE_OSCURO = '024029'
const VERDE_MEDIO = '04A97A'
const APAGADO = '5A7068'
const CLARO = 'F4F7F5'
const BORDE = 'DDE7E2'

const bordeFino = { style: BorderStyle.SINGLE, size: 4, color: BORDE }
const bordesTabla = {
  top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino,
  insideHorizontal: bordeFino, insideVertical: bordeFino,
}

function celda(texto: string, opciones: {
  encabezado?: boolean
  cebra?: boolean
  ancho?: number
  derecha?: boolean
} = {}): TableCell {
  return new TableCell({
    width: opciones.ancho
      ? { size: opciones.ancho, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opciones.encabezado
      ? { type: ShadingType.CLEAR, fill: VERDE_OSCURO, color: 'auto' }
      : opciones.cebra
        ? { type: ShadingType.CLEAR, fill: CLARO, color: 'auto' }
        : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [
      new Paragraph({
        alignment: opciones.derecha ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: texto,
            bold: opciones.encabezado,
            color: opciones.encabezado ? 'FFFFFF' : '1A2E24',
            size: opciones.encabezado ? 17 : 17, // medios puntos: 8.5 pt
          }),
        ],
      }),
    ],
  })
}

/** Tabla con encabezado verde, cebra y última columna alineada a la derecha
 * cuando es numérica. */
function tabla(
  encabezados: string[],
  filas: string[][],
  opciones: { anchos?: number[]; numericaFinal?: boolean } = {},
): Table {
  const { anchos, numericaFinal = true } = opciones
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: bordesTabla,
    rows: [
      new TableRow({
        tableHeader: true,
        children: encabezados.map((h, i) =>
          celda(h, {
            encabezado: true,
            ancho: anchos?.[i],
            derecha: numericaFinal && i === encabezados.length - 1,
          }),
        ),
      }),
      ...filas.map((f, r) =>
        new TableRow({
          children: f.map((v, i) =>
            celda(v, {
              cebra: r % 2 === 1,
              ancho: anchos?.[i],
              derecha: numericaFinal && i === f.length - 1,
            }),
          ),
        }),
      ),
    ],
  })
}

function titulo2(texto: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text: texto, bold: true, color: VERDE_OSCURO, size: 26 })],
  })
}

function parrafo(texto: string, opciones: { apagado?: boolean; despues?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: opciones.despues ?? 120 },
    children: [
      new TextRun({
        text: texto,
        color: opciones.apagado ? APAGADO : '1A2E24',
        size: opciones.apagado ? 17 : 19,
      }),
    ],
  })
}

function vacio(mensaje: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: mensaje, italics: true, color: APAGADO, size: 18 })],
  })
}

function encabezadoPagina(): Header {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: VERDE_MEDIO } },
        children: [
          new TextRun({ text: 'NEXUS 360°', bold: true, color: VERDE_OSCURO, size: 18 }),
          new TextRun({ text: '  ·  Estadísticas generales', color: APAGADO, size: 16 }),
        ],
      }),
    ],
  })
}

function piePagina(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Página ', color: APAGADO, size: 15 }),
          new TextRun({ children: [PageNumber.CURRENT], color: APAGADO, size: 15 }),
          new TextRun({ text: ' de ', color: APAGADO, size: 15 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: APAGADO, size: 15 }),
        ],
      }),
    ],
  })
}

function siNo(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v ? 'Sí' : 'No'
}

export interface DatosInformeWord {
  stats: Estadisticas
  secciones: Seccion[]
  empresas: EmpresaDetalle[]
  grafica: Imagen | null
  admin?: string
  fecha?: string
}

export function construirDocumento(d: DatosInformeWord): Document {
  const fecha = d.fecha ?? selloFecha()
  const s = d.stats

  // ------------------------------------------------ sección 1: vertical
  const cuerpo: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'INFORME DE ESTADÍSTICAS', color: VERDE_MEDIO, size: 18, bold: true, characterSpacing: 40 })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'NEXUS 360° — Estadísticas generales', bold: true, color: VERDE_OSCURO, size: 40 })],
    }),
    parrafo(`Generado el ${fecha}${d.admin ? ` · ${d.admin}` : ''}`, { apagado: true, despues: 260 }),

    titulo2('Resumen general'),
    tabla(
      ['Indicador', 'Valor'],
      [
        ['Empresas registradas', String(s.resumen.empresas)],
        ['Usuarios totales', String(s.resumen.usuarios)],
        ['Diagnósticos iniciados', String(s.resumen.diagnosticos_totales)],
        ['Diagnósticos completados', String(s.resumen.diagnosticos_completados)],
        [
          'Tasa de finalización',
          s.resumen.diagnosticos_totales > 0
            ? `${((s.resumen.diagnosticos_completados / s.resumen.diagnosticos_totales) * 100).toFixed(1).replace('.', ',')} %`
            : '—',
        ],
      ],
      { anchos: [70, 30] },
    ),

    titulo2('Empresas por sector'),
  ]

  if (s.empresas_por_sector.length === 0) {
    cuerpo.push(vacio('Todavía no hay empresas registradas.'))
  } else {
    cuerpo.push(tabla(
      ['Sector', 'Empresas'],
      s.empresas_por_sector.map((x) => [x.nombre, String(x.total)]),
      { anchos: [78, 22] },
    ))
  }

  cuerpo.push(titulo2('Empresas por tamaño'))
  if (s.empresas_por_tamano.length === 0) {
    cuerpo.push(vacio('Todavía no hay tamizajes guardados.'))
  } else {
    cuerpo.push(tabla(
      ['Tamaño', 'Empresas'],
      s.empresas_por_tamano.map((x) => [x.tamano, String(x.total)]),
      { anchos: [78, 22] },
    ))
  }

  cuerpo.push(titulo2('Diagnósticos por estado'))
  if (s.diagnosticos_por_estado.length === 0) {
    cuerpo.push(vacio('Todavía no hay diagnósticos iniciados.'))
  } else {
    cuerpo.push(tabla(
      ['Formato', 'Estado', 'Diagnósticos'],
      s.diagnosticos_por_estado.map((x) => [
        NOMBRES_FORMATO[x.formato_id] ?? x.formato_id,
        NOMBRES_ESTADO[x.estado] ?? x.estado,
        String(x.total),
      ]),
      { anchos: [40, 38, 22] },
    ))
  }

  cuerpo.push(titulo2('Madurez promedio por dimensión'))
  cuerpo.push(parrafo(
    'Escala 0–4: 0 sin gestión, 1 informal, 2 planificado, 3 implementado y medido, 4 mejora continua.',
    { apagado: true },
  ))
  if (s.promedio_por_dimension.length === 0) {
    cuerpo.push(vacio('Todavía no hay respuestas registradas.'))
  } else {
    cuerpo.push(tabla(
      ['Formato', 'Dimensión', 'Respuestas', 'Promedio'],
      s.promedio_por_dimension.map((x) => [
        NOMBRES_FORMATO[x.formato_id] ?? x.formato_id,
        `${x.numero}. ${x.dimension}`,
        String(x.respuestas),
        x.promedio.toFixed(2).replace('.', ','),
      ]),
      { anchos: [16, 54, 15, 15] },
    ))
  }

  // ---------------------------------------------- sección 2: horizontal
  const anexo: (Paragraph | Table)[] = [titulo2('Gráfica general')]

  if (d.grafica) {
    // Ancho útil en A4 horizontal con márgenes de 15 mm ≈ 267 mm ≈ 1009 px.
    const anchoDestino = 1000
    const altoDestino = Math.round((d.grafica.altoBase / d.grafica.anchoBase) * anchoDestino)
    anexo.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new ImageRun({
          type: 'png',
          data: dataUrlABytes(d.grafica.dataUrl),
          transformation: { width: anchoDestino, height: altoDestino },
          altText: {
            name: 'Gráfica general',
            description: 'Todas las distribuciones del panel en una sola gráfica de barras',
            title: 'Estadísticas generales',
          },
        }),
      ],
    }))
  } else {
    anexo.push(vacio('La gráfica no pudo incrustarse en este documento.'))
  }

  anexo.push(titulo2('Detalle de empresas'))
  if (d.empresas.length === 0) {
    anexo.push(vacio('No hay empresas registradas.'))
  } else {
    anexo.push(tabla(
      ['Razón social', 'NIT', 'Sector', 'Municipio', 'Año', 'Tamaño', 'Empleados', 'ISO 26000', 'Ley 2173', 'Étnicas'],
      d.empresas.map((e) => [
        e.razon_social,
        `${e.nit}-${e.dv}`,
        e.sector_nombre ?? e.sector_id,
        e.municipio,
        e.anio !== null ? String(e.anio) : '—',
        e.tamano ?? '—',
        e.empleados !== null ? String(e.empleados) : '—',
        e.iso26000_estado ?? '—',
        e.ley2173_estado ?? '—',
        siNo(e.comunidades_etnicas),
      ]),
      { anchos: [20, 10, 16, 11, 5, 9, 8, 8, 8, 5], numericaFinal: false },
    ))
  }

  return new Document({
    creator: 'NEXUS 360°',
    title: 'NEXUS 360° — Estadísticas generales',
    description: `Informe de estadísticas generado el ${fecha}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 19, color: '1A2E24' } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: {
              top: convertMillimetersToTwip(20), bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(20), right: convertMillimetersToTwip(20),
            },
          },
        },
        headers: { default: encabezadoPagina() },
        footers: { default: piePagina() },
        children: cuerpo,
      },
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: {
              top: convertMillimetersToTwip(15), bottom: convertMillimetersToTwip(15),
              left: convertMillimetersToTwip(15), right: convertMillimetersToTwip(15),
            },
          },
        },
        headers: { default: encabezadoPagina() },
        footers: { default: piePagina() },
        children: anexo,
      },
    ],
  })
}

export async function descargarWord(d: DatosInformeWord): Promise<void> {
  const blob = await Packer.toBlob(construirDocumento(d))
  saveAs(blob, `nexus360-estadisticas-${selloArchivo()}.docx`)
}
