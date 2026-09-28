import { ORDEN_ETAPA, nombreEtapa } from '../engine/agregados'
import { etiquetaEtapa } from '../data/escala'
import { etapaDesdeApi } from '../auth/empresaApi'
import type { Tamano, TipoCliente } from '../types'
import { nombreCliente, nombreTamano, nombresVinculacion, nombresZonas } from '../data/tamizaje'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { EmpresaDetalle, Estadisticas } from '../auth/adminApi'
import type { Seccion } from '../engine/agregados'
import { aplanar, selloArchivo, selloFecha } from '../engine/agregados'
import type { Imagen } from './rasterizar'

/**
 * Libro de Excel real (.xlsx), no un CSV renombrado. Se usa ExcelJS y no
 * SheetJS porque la versión libre de SheetJS no escribe estilos: sin ellos
 * el archivo llega sin encabezados fijos, sin filtros y sin la gráfica, que
 * es justo lo que hace útil un reporte para presentar.
 */

const VERDE_OSCURO = 'FF024029'
const VERDE_MEDIO = 'FF04A97A'
const CLARO = 'FFF4F7F5'
const BORDE = 'FFDDE7E2'

type Valor = string | number | boolean | null | undefined

interface Columna {
  titulo: string
  ancho: number
  /** Formato numérico de Excel; p. ej. '0.00' para promedios. */
  formato?: string
}

const borde: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDE } },
  left: { style: 'thin', color: { argb: BORDE } },
  bottom: { style: 'thin', color: { argb: BORDE } },
  right: { style: 'thin', color: { argb: BORDE } },
}

function siNo(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v ? 'Sí' : 'No'
}

/** Hoja tabular estándar: encabezado verde fijo, filtro, cebra y bordes. */
function agregarTabla(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Columna[],
  filas: Valor[][],
): ExcelJS.Worksheet {
  const hoja = libro.addWorksheet(nombre, {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  hoja.addRow(columnas.map((c) => c.titulo))
  const encabezado = hoja.getRow(1)
  encabezado.height = 24
  encabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_OSCURO } }
    celda.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    celda.border = borde
  })

  filas.forEach((f, i) => {
    const fila = hoja.addRow(f)
    fila.eachCell({ includeEmpty: true }, (celda) => {
      celda.border = borde
      celda.alignment = { vertical: 'middle' }
      if (i % 2 === 1) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLARO } }
      }
    })
  })

  columnas.forEach((c, i) => {
    const col = hoja.getColumn(i + 1)
    col.width = c.ancho
    if (c.formato) col.numFmt = c.formato
  })

  if (filas.length > 0) {
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnas.length },
    }
  }
  return hoja
}

function hojaResumen(
  libro: ExcelJS.Workbook,
  stats: Estadisticas,
  admin: string,
  fecha: string,
  grafica: Imagen | null,
): void {
  const hoja = libro.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  hoja.getColumn(1).width = 4
  hoja.getColumn(2).width = 34
  hoja.getColumn(3).width = 18
  hoja.getColumn(4).width = 22
  hoja.getColumn(5).width = 22

  hoja.mergeCells('B2:E2')
  const titulo = hoja.getCell('B2')
  titulo.value = 'NEXUS 360° — Estadísticas generales'
  titulo.font = { bold: true, size: 18, color: { argb: VERDE_OSCURO } }
  hoja.getRow(2).height = 28

  hoja.mergeCells('B3:E3')
  const sub = hoja.getCell('B3')
  sub.value = `Generado el ${fecha}${admin ? ` · ${admin}` : ''}`
  sub.font = { size: 10, color: { argb: 'FF5A7068' } }

  const indicadores: [string, number][] = [
    ['Empresas registradas', stats.resumen.empresas],
    ['Usuarios totales', stats.resumen.usuarios],
    ['Diagnósticos iniciados', stats.resumen.diagnosticos_totales],
    ['Diagnósticos completados', stats.resumen.diagnosticos_completados],
  ]

  hoja.getCell('B5').value = 'Indicador'
  hoja.getCell('C5').value = 'Valor'
  ;['B5', 'C5'].forEach((ref) => {
    const c = hoja.getCell(ref)
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_OSCURO } }
    c.border = borde
  })

  indicadores.forEach(([etiqueta, valor], i) => {
    const fila = 6 + i
    hoja.getCell(`B${fila}`).value = etiqueta
    const celdaValor = hoja.getCell(`C${fila}`)
    celdaValor.value = valor
    celdaValor.font = { bold: true, size: 12, color: { argb: VERDE_OSCURO } }
    ;[`B${fila}`, `C${fila}`].forEach((ref) => {
      hoja.getCell(ref).border = borde
    })
  })

  // Porcentaje de avance: dato derivado que el panel no muestra pero que
  // es lo primero que pregunta quien lee el reporte.
  const avance = stats.resumen.diagnosticos_totales > 0
    ? stats.resumen.diagnosticos_completados / stats.resumen.diagnosticos_totales
    : 0
  hoja.getCell('B10').value = 'Tasa de finalización'
  const celdaAvance = hoja.getCell('C10')
  celdaAvance.value = avance
  celdaAvance.numFmt = '0.0%'
  celdaAvance.font = { bold: true, size: 12, color: { argb: VERDE_MEDIO } }
  ;['B10', 'C10'].forEach((ref) => { hoja.getCell(ref).border = borde })

  if (grafica) {
    const id = libro.addImage({
      base64: grafica.dataUrl.slice(grafica.dataUrl.indexOf(',') + 1),
      extension: 'png',
    })
    // Se limita el ancho para que quepa en pantalla sin obligar a hacer zoom
    // (y el alto, porque las barras horizontales crecen hacia abajo).
    const anchoDestino = Math.min(980, grafica.anchoBase, 900 * (grafica.anchoBase / grafica.altoBase))
    const altoDestino = (grafica.altoBase / grafica.anchoBase) * anchoDestino
    hoja.addImage(id, {
      tl: { col: 1, row: 12 },
      ext: { width: anchoDestino, height: altoDestino },
    })
  }
}

export interface DatosReporte {
  stats: Estadisticas
  secciones: Seccion[]
  empresas: EmpresaDetalle[]
  grafica: Imagen | null
  admin?: string
  fecha?: string
}

export async function construirLibro(d: DatosReporte): Promise<ExcelJS.Workbook> {
  const fecha = d.fecha ?? selloFecha()
  const libro = new ExcelJS.Workbook()
  libro.creator = 'NEXUS 360°'
  libro.created = new Date()
  libro.company = 'NEXUS 360°'

  hojaResumen(libro, d.stats, d.admin ?? '', fecha, d.grafica)

  // La hoja que refleja exactamente lo que dibuja la gráfica.
  agregarTabla(
    libro,
    'Gráfica (datos)',
    [
      { titulo: 'Sección', ancho: 30 },
      { titulo: 'Concepto', ancho: 46 },
      { titulo: 'Valor', ancho: 12, formato: '0.##' },
      { titulo: 'Unidad', ancho: 16 },
      { titulo: 'Nota', ancho: 16 },
    ],
    aplanar(d.secciones).map((f) => [f.seccion, f.concepto, f.valor, f.unidad, f.nota || '—']),
  )

  agregarTabla(
    libro,
    'Empresas por sector',
    [
      { titulo: 'Sector', ancho: 46 },
      { titulo: 'Código', ancho: 14 },
      { titulo: 'Empresas', ancho: 12 },
    ],
    d.stats.empresas_por_sector.map((s) => [s.nombre, s.sector_id, s.total]),
  )

  agregarTabla(
    libro,
    'Empresas por tamaño',
    [
      { titulo: 'Tamaño', ancho: 24 },
      { titulo: 'Empresas', ancho: 12 },
    ],
    d.stats.empresas_por_tamano.map((s) => [nombreTamano(s.tamano as Tamano), s.total]),
  )

  agregarTabla(
    libro,
    'Empresas por cliente',
    [
      { titulo: 'Tipo de cliente (T6)', ancho: 28 },
      { titulo: 'Empresas', ancho: 12 },
    ],
    (d.stats.empresas_por_cliente ?? []).map((s) => [nombreCliente(s.clientes as TipoCliente), s.total]),
  )

  agregarTabla(
    libro,
    'Respuestas por etapa',
    [
      { titulo: 'Etapa', ancho: 60 },
      { titulo: 'Respuestas', ancho: 14 },
    ],
    (d.stats.respuestas_por_etapa ?? []).map((s) => [etiquetaEtapa(etapaDesdeApi(s.etapa)), s.total]),
  )

  // Tabla cruzada materia × etapa (la misma de la gráfica «Etapas»).
  const materiasEtapas = [...new Set((d.stats.etapas_por_materia ?? []).map((x) => `${x.numero}. ${x.materia}`))].sort()
  agregarTabla(
    libro,
    'Etapas por materia',
    [
      { titulo: 'Materia', ancho: 36 },
      ...ORDEN_ETAPA.map((e) => ({ titulo: nombreEtapa(e), ancho: 14 })),
      { titulo: 'Total', ancho: 10 },
    ],
    materiasEtapas.map((m) => {
      const fila = ORDEN_ETAPA.map((e) => (d.stats.etapas_por_materia ?? [])
        .find((x) => `${x.numero}. ${x.materia}` === m && x.etapa === e)?.total ?? 0)
      return [m, ...fila, fila.reduce((a, b) => a + b, 0)]
    }),
  )

  agregarTabla(
    libro,
    'Prácticas y retos',
    [
      { titulo: 'Materia', ancho: 36 },
      { titulo: 'Prácticas registradas', ancho: 16 },
      { titulo: 'Elegida como reto (empresas)', ancho: 18 },
    ],
    (d.stats.practicas_por_materia ?? []).map((x) => [
      `${x.numero}. ${x.materia}`, x.total,
      (d.stats.retos_por_materia ?? []).find((r) => r.numero === x.numero)?.total ?? 0,
    ]),
  )

  const al = d.stats.alertas
  agregarTabla(
    libro,
    'Alertas',
    [
      { titulo: 'Alerta informativa', ancho: 62 },
      { titulo: 'Empresas', ancho: 12 },
    ],
    al ? [
      ['Seguridad y salud en el trabajo (03b en etapa inicial o N/A)', al.sst],
      ['Datos personales de clientes (06b en etapa inicial o N/A)', al.datos],
      ['Ley 2173: empresa mediana o que no conoce su tamaño', al.ley2173],
      ['Operación cerca de comunidades indígenas o afrodescendientes', al.territorio],
    ] : [],
  )

  const ind = d.stats.indicadores
  agregarTabla(
    libro,
    'Indicadores',
    [
      { titulo: 'Indicador (sección 10 del protocolo)', ancho: 60 },
      { titulo: 'Valor', ancho: 12 },
    ],
    ind ? [
      ['Empresas con tamizaje', ind.empresas_con_tamizaje],
      ['Empresas en el perfil del piloto (10–50 personas)', ind.empresas_perfil_piloto],
      ['Empresas con autodiagnóstico iniciado', ind.empresas_con_diagnostico],
      ['Empresas con al menos una práctica registrada', ind.empresas_con_practicas],
      ['Prácticas existentes registradas', ind.practicas_registradas],
      ['Respuestas «Hacemos algo diferente»', ind.respuestas_diferente],
      ['… de ellas sin clasificar por NEXUS', ind.diferente_sin_clasificar],
      ['Respuestas «No aplica»', ind.respuestas_na],
      ['Respuestas a «¿Qué le gustaría fortalecer?»', ind.materias_con_fortalecer],
      ['Respuestas a la pregunta final', ind.comentarios_finales],
    ] : [],
  )

  agregarTabla(
    libro,
    'Diagnósticos por estado',
    [
      { titulo: 'Formato', ancho: 20 },
      { titulo: 'Estado', ancho: 20 },
      { titulo: 'Diagnósticos', ancho: 14 },
    ],
    d.stats.diagnosticos_por_estado.map((s) => [s.formato_id, s.estado, s.total]),
  )

  agregarTabla(
    libro,
    'Etapa promedio por materia',
    [
      { titulo: 'Formato', ancho: 18 },
      { titulo: 'N.º', ancho: 8 },
      { titulo: 'Dimensión', ancho: 46 },
      { titulo: 'Promedio (0–4)', ancho: 16, formato: '0.00' },
      { titulo: 'Respuestas', ancho: 14 },
    ],
    d.stats.promedio_por_dimension.map((x) => [
      x.formato_id, x.numero, x.dimension, x.promedio, x.respuestas,
    ]),
  )

  agregarTabla(
    libro,
    'Detalle de empresas',
    [
      { titulo: 'Razón social', ancho: 40 },
      { titulo: 'NIT', ancho: 16 },
      { titulo: 'DV', ancho: 6 },
      { titulo: 'Sector', ancho: 34 },
      { titulo: 'Municipio', ancho: 22 },
      { titulo: 'Departamento', ancho: 22 },
      { titulo: 'Año', ancho: 8 },
      { titulo: 'Tamaño', ancho: 16 },
      { titulo: 'Personas', ancho: 10 },
      { titulo: 'Vinculación', ancho: 24 },
      { titulo: 'Territorio', ancho: 28 },
      { titulo: 'Clientes', ancho: 18 },
      { titulo: 'Perfil piloto (10–50)', ancho: 14 },
      { titulo: 'Autodiagnóstico', ancho: 14 },
      { titulo: 'Respuestas con etapa', ancho: 12 },
      { titulo: 'Prácticas registradas', ancho: 12 },
      { titulo: 'Por clasificar', ancho: 11 },
      { titulo: 'Registro', ancho: 22 },
    ],
    d.empresas.map((e) => [
      e.razon_social, e.nit, e.dv, e.sector_nombre ?? e.sector_id, e.municipio,
      e.departamento ?? '—', e.anio ?? '—', nombreTamano(e.tamano as Tamano), e.personas ?? '—',
      e.vinculacion ? nombresVinculacion(e.vinculacion) : '—',
      [e.zonas ? nombresZonas(e.zonas) : '', e.territorio ?? ''].filter((x) => x && x !== '—').join(' · ') || '—',
      e.clientes ? nombreCliente(e.clientes as TipoCliente) : '—',
      siNo(e.perfil_piloto), e.diagnostico_estado ?? '—', e.respuestas_con_etapa,
      e.practicas_registradas, e.pendientes_clasificar,
      new Date(e.creado_en).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
    ]),
  )

  return libro
}

export async function descargarExcel(d: DatosReporte): Promise<void> {
  const libro = await construirLibro(d)
  const buffer = await libro.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `nexus360-estadisticas-${selloArchivo()}.xlsx`,
  )
}
