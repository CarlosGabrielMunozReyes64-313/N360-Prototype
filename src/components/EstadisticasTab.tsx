import { useEffect, useMemo, useRef, useState } from 'react'
import * as adminApi from '../auth/adminApi'
import type { Estadisticas, EmpresaDetalle } from '../auth/adminApi'
import { AuthError } from '../auth/types'
import { useAuth } from '../auth/AuthContext'
import { GraficaGeneral } from './GraficaGeneral'
import {
  construirSecciones, seccionesConDatos, selloArchivo, selloFecha, totalBarras,
} from '../engine/agregados'
import { svgAPng } from '../export/rasterizar'
import type { Imagen } from '../export/rasterizar'

const VERDE_OSCURO = '#024029'
const VERDE_MEDIO = '#04a97a'

/** Barra horizontal simple, hecha a mano en SVG (mismo espíritu que
 * Radar.tsx: sin librerías de gráficas nuevas). `valor` y `max` en la
 * misma unidad; `ancho` es el ancho total disponible en px. */
function BarraHorizontal({
  etiqueta, valor, max, sufijo = '', color = VERDE_MEDIO, ancho = 420,
}: {
  etiqueta: string
  valor: number
  max: number
  sufijo?: string
  color?: string
  ancho?: number
}) {
  const alto = 26
  const pctBarra = max > 0 ? Math.min(1, valor / max) : 0
  const anchoBarra = Math.max(2, pctBarra * ancho)
  return (
    <div className="barra-fila">
      <div className="barra-etiqueta">{etiqueta}</div>
      <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`${etiqueta}: ${valor}${sufijo}`}>
        <rect x={0} y={4} width={ancho} height={alto - 8} rx={4} fill="#eef2f0" />
        <rect x={0} y={4} width={anchoBarra} height={alto - 8} rx={4} fill={color} />
      </svg>
      <div className="barra-valor">{valor}{sufijo}</div>
    </div>
  )
}

function TarjetaResumen({ etiqueta, valor }: { etiqueta: string; valor: number | string }) {
  return (
    <div className="resumen-tarjeta">
      <div className="resumen-valor">{valor}</div>
      <div className="resumen-etiqueta">{etiqueta}</div>
    </div>
  )
}

function descargarCSV(filas: EmpresaDetalle[]) {
  const encabezados = [
    'razon_social', 'nit', 'dv', 'sector', 'municipio', 'departamento',
    'anio', 'tamano', 'empleados', 'areas_de_vida', 'ciclo_previo',
    'comunidades_etnicas', 'consumidor_final', 'iso26000_estado', 'ley2173_estado', 'creado_en',
  ]
  const escapar = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [
    encabezados.join(','),
    ...filas.map((f) => [
      f.razon_social, f.nit, f.dv, f.sector_nombre ?? f.sector_id, f.municipio, f.departamento,
      f.anio, f.tamano, f.empleados, f.areas_de_vida, f.ciclo_previo,
      f.comunidades_etnicas, f.consumidor_final, f.iso26000_estado, f.ley2173_estado, f.creado_en,
    ].map(escapar).join(',')),
  ]
  // BOM UTF-8 para que Excel abra bien las tildes/ñ.
  const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nexus360-empresas-${selloArchivo()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type Formato = 'excel' | 'word'

export function EstadisticasTab({ token }: { token: string }) {
  const { usuario } = useAuth()
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState<Formato | null>(null)
  const [avisoExport, setAvisoExport] = useState<string | null>(null)
  const graficaRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setCargando(true)
    Promise.all([adminApi.obtenerEstadisticas(token), adminApi.listarEmpresasDetalle(token)])
      .then(([s, e]) => { setStats(s); setEmpresas(e) })
      .catch((err) => setError(err instanceof AuthError ? err.message : 'No se pudo cargar la información.'))
      .finally(() => setCargando(false))
  }, [token])

  // Las secciones son la fuente única: alimentan la gráfica y los dos
  // exportadores, así que el archivo nunca puede discrepar de la pantalla.
  const secciones = useMemo(
    () => (stats ? seccionesConDatos(construirSecciones(stats)) : []),
    [stats],
  )

  async function exportar(formato: Formato) {
    if (!stats) return
    setGenerando(formato)
    setAvisoExport(null)
    try {
      // La gráfica se rasteriza en el momento, para que el archivo lleve
      // exactamente lo que el admin está viendo.
      let grafica: Imagen | null = null
      if (graficaRef.current) {
        try {
          grafica = await svgAPng(graficaRef.current, 2)
        } catch {
          grafica = null
        }
      }
      const datos = {
        stats, secciones, empresas, grafica,
        admin: usuario ? `Generado por ${usuario.nombre}` : '',
        fecha: selloFecha(),
      }
      // Import diferido: ExcelJS y docx pesan bastante y solo hacen falta
      // cuando alguien pulsa el botón, no en cada carga de la aplicación.
      if (formato === 'excel') {
        const { descargarExcel } = await import('../export/excel')
        await descargarExcel(datos)
      } else {
        const { descargarWord } = await import('../export/word')
        await descargarWord(datos)
      }
      if (!grafica && totalBarras(secciones) > 0) {
        setAvisoExport('El archivo se descargó, pero la gráfica no pudo incrustarse en este navegador.')
      }
    } catch {
      setAvisoExport('No se pudo generar el archivo. Vuelve a intentarlo.')
    } finally {
      setGenerando(null)
    }
  }

  if (cargando) return <p className="lede">Cargando estadísticas…</p>
  if (error) return <div className="auth-error" role="alert">{error}</div>
  if (!stats) return null

  const maxSector = Math.max(1, ...stats.empresas_por_sector.map((s) => s.total))
  const maxTamano = Math.max(1, ...stats.empresas_por_tamano.map((s) => s.total))
  const maxEstado = Math.max(1, ...stats.diagnosticos_por_estado.map((s) => s.total))
  const hayBarras = totalBarras(secciones) > 0

  const NOMBRES_FORMATO: Record<string, string> = { iso26000: 'ISO 26000', ley2173: 'Ley 2173' }
  const NOMBRES_ESTADO: Record<string, string> = { borrador: 'En borrador', completado: 'Completado', archivado: 'Archivado' }

  return (
    <div className="estadisticas-tab">
      <section className="resumen-grid">
        <TarjetaResumen etiqueta="Empresas registradas" valor={stats.resumen.empresas} />
        <TarjetaResumen etiqueta="Usuarios totales" valor={stats.resumen.usuarios} />
        <TarjetaResumen etiqueta="Diagnósticos completados" valor={stats.resumen.diagnosticos_completados} />
        <TarjetaResumen etiqueta="Diagnósticos iniciados" valor={stats.resumen.diagnosticos_totales} />
      </section>

      <section className="card grafica-card">
        <div className="eyebrow">Gráfica general</div>
        <h2 className="title" style={{ fontSize: 18 }}>Todo el tablero en una sola vista</h2>
        <p className="lede">
          Cada banda es una distribución distinta. Las de conteo comparten el eje izquierdo;
          la de madurez usa el eje derecho, en escala 0–4, porque un promedio y un conteo no
          se pueden leer con la misma regla.
        </p>
        {hayBarras ? (
          <div className="grafica-scroll">
            <GraficaGeneral secciones={secciones} svgRef={graficaRef} />
          </div>
        ) : (
          <p className="lede">Todavía no hay datos suficientes para dibujar la gráfica.</p>
        )}
      </section>

      <section className="card">
        <div className="eyebrow">Empresas por sector</div>
        {stats.empresas_por_sector.length === 0 && <p className="lede">Todavía no hay empresas registradas.</p>}
        {stats.empresas_por_sector.map((s) => (
          <BarraHorizontal key={s.sector_id} etiqueta={s.nombre} valor={s.total} max={maxSector} />
        ))}
      </section>

      <section className="card">
        <div className="eyebrow">Empresas por tamaño</div>
        {stats.empresas_por_tamano.length === 0 && <p className="lede">Todavía no hay tamizajes guardados.</p>}
        {stats.empresas_por_tamano.map((s) => (
          <BarraHorizontal key={s.tamano} etiqueta={s.tamano} valor={s.total} max={maxTamano} />
        ))}
      </section>

      <section className="card">
        <div className="eyebrow">Diagnósticos por estado</div>
        {stats.diagnosticos_por_estado.length === 0 && <p className="lede">Todavía no hay diagnósticos iniciados.</p>}
        {stats.diagnosticos_por_estado.map((s) => (
          <BarraHorizontal
            key={`${s.formato_id}-${s.estado}`}
            etiqueta={`${NOMBRES_FORMATO[s.formato_id] ?? s.formato_id} · ${NOMBRES_ESTADO[s.estado] ?? s.estado}`}
            valor={s.total} max={maxEstado}
            color={s.estado === 'completado' ? VERDE_OSCURO : VERDE_MEDIO}
          />
        ))}
      </section>

      <section className="card">
        <div className="eyebrow">Madurez promedio por dimensión (escala 0–4)</div>
        {stats.promedio_por_dimension.length === 0 && <p className="lede">Todavía no hay respuestas registradas.</p>}
        {stats.promedio_por_dimension.map((d) => (
          <BarraHorizontal
            key={`${d.formato_id}-${d.numero}`}
            etiqueta={`${NOMBRES_FORMATO[d.formato_id] ?? d.formato_id} · ${d.dimension}`}
            valor={d.promedio} max={4} sufijo={` (${d.respuestas} resp.)`}
          />
        ))}
      </section>

      <section className="card">
        <div className="eyebrow">Reporte</div>
        <h2 className="title" style={{ fontSize: 18 }}>Exportar estadísticas generales</h2>
        <p className="lede">
          El Excel y el Word llevan el mismo contenido de esta pestaña: los indicadores, las
          cuatro distribuciones, el detalle de cada empresa y la gráfica de arriba tal como se
          ve ahora mismo.
        </p>

        <div className="export-acciones">
          <button
            type="button" className="btn" disabled={generando !== null}
            onClick={() => void exportar('excel')}
          >
            {generando === 'excel' ? 'Generando…' : 'Descargar Excel (.xlsx)'}
          </button>
          <button
            type="button" className="btn btn-dark" disabled={generando !== null}
            onClick={() => void exportar('word')}
          >
            {generando === 'word' ? 'Generando…' : 'Descargar Word (.docx)'}
          </button>
          <button
            type="button" className="btn-ghost" disabled={generando !== null || empresas.length === 0}
            onClick={() => descargarCSV(empresas)}
          >
            Solo empresas en CSV ({empresas.length})
          </button>
        </div>

        {avisoExport && <p className="export-aviso" role="status">{avisoExport}</p>}

        <ul className="export-detalle">
          <li><strong>Excel</strong> — siete hojas con encabezado fijo y filtros: resumen con la gráfica, los datos que la componen, cada distribución por separado y el detalle de empresas.</li>
          <li><strong>Word</strong> — informe editable con encabezado, pie numerado, tablas y la gráfica a página completa en horizontal.</li>
          <li><strong>CSV</strong> — la exportación de siempre, una fila por empresa.</li>
        </ul>
      </section>
    </div>
  )
}
