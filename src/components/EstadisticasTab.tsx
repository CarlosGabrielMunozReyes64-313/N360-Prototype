import { useEffect, useMemo, useState } from 'react'
import * as adminApi from '../auth/adminApi'
import type { Estadisticas, EmpresaDetalle } from '../auth/adminApi'
import { AuthError } from '../auth/types'
import { useAuth } from '../auth/AuthContext'
import { PanelGraficas } from './PanelGraficas'
import { IconoDescarga } from './Iconos'
import {
  construirSecciones, seccionesConDatos, selloArchivo, selloFecha, totalBarras,
} from '../engine/agregados'
import { VISTAS } from '../engine/vistasGraficas'
import type { Vista } from '../engine/vistasGraficas'
import type { Imagen } from '../export/rasterizar'

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

/** Qué se está generando: el informe completo en PDF, el PDF de una sola
 * gráfica, el Excel o el Word. */
type Trabajo = 'pdf' | 'pdf-grafica' | 'excel' | 'word'

export function EstadisticasTab({ token }: { token: string }) {
  const { usuario } = useAuth()
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState<Trabajo | null>(null)
  const [avisoExport, setAvisoExport] = useState<string | null>(null)

  useEffect(() => {
    // `cargando` ya empieza en true; el token no cambia sin desmontar el panel.
    Promise.all([adminApi.obtenerEstadisticas(token), adminApi.listarEmpresasDetalle(token)])
      .then(([s, e]) => { setStats(s); setEmpresas(e) })
      .catch((err) => setError(err instanceof AuthError ? err.message : 'No se pudo cargar la información.'))
      .finally(() => setCargando(false))
  }, [token])

  // Las secciones son la fuente única: alimentan las tres gráficas y los
  // tres exportadores, así que un archivo nunca discrepa de la pantalla.
  const secciones = useMemo(
    () => (stats ? seccionesConDatos(construirSecciones(stats)) : []),
    [stats],
  )

  async function exportar(trabajo: Trabajo, soloVista?: Vista) {
    if (!stats) return
    setGenerando(trabajo)
    setAvisoExport(null)
    const fecha = selloFecha()
    const admin = usuario ? `Generado por ${usuario.nombre}` : ''
    let fallidas = 0

    try {
      // Las gráficas se dibujan aparte, a un ancho fijo, para que el archivo
      // salga igual sin importar el tamaño de la pantalla de quien lo baja.
      const { imagenDeGrafica } = await import('../export/renderizarGraficas')
      const imagen = async (vista: Vista, conEncabezado: boolean): Promise<Imagen | null> => {
        try {
          return await imagenDeGrafica(vista, secciones, { conEncabezado, fecha })
        } catch {
          fallidas += 1
          return null
        }
      }

      if (trabajo === 'pdf' || trabajo === 'pdf-grafica') {
        const vistas = soloVista ? [soloVista] : VISTAS.map((v) => v.id)
        const graficas = []
        for (const vista of vistas) graficas.push({ vista, imagen: await imagen(vista, false) })
        // Import diferido: jsPDF solo se carga cuando alguien lo pide.
        const { descargarPdfEstadisticas } = await import('../export/pdfEstadisticas')
        await descargarPdfEstadisticas({
          stats, secciones, graficas, completo: trabajo === 'pdf', admin, fecha,
        })
      } else {
        const grafica = await imagen('barras', true)
        const datos = { stats, secciones, empresas, grafica, admin, fecha }
        if (trabajo === 'excel') {
          const { descargarExcel } = await import('../export/excel')
          await descargarExcel(datos)
        } else {
          const { descargarWord } = await import('../export/word')
          await descargarWord(datos)
        }
      }
      if (fallidas > 0 && totalBarras(secciones) > 0) {
        setAvisoExport('El archivo se descargó, pero alguna gráfica no pudo incrustarse en este navegador; sus datos sí van en las tablas.')
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

  const hayDatos = totalBarras(secciones) > 0

  return (
    <div className="estadisticas-tab">
      <section className="resumen-grid" aria-label="Cifras principales">
        <TarjetaResumen etiqueta="Empresas registradas" valor={stats.resumen.empresas} />
        <TarjetaResumen etiqueta="Usuarios totales" valor={stats.resumen.usuarios} />
        <TarjetaResumen etiqueta="Diagnósticos completados" valor={stats.resumen.diagnosticos_completados} />
        <TarjetaResumen etiqueta="Diagnósticos iniciados" valor={stats.resumen.diagnosticos_totales} />
      </section>

      {hayDatos ? (
        <PanelGraficas
          secciones={secciones}
          generando={generando !== null}
          onDescargarPdf={(vista) => void exportar('pdf-grafica', vista)}
        />
      ) : (
        <section className="card">
          <div className="eyebrow">Gráficas</div>
          <p className="lede">Todavía no hay datos suficientes para dibujar las gráficas.</p>
        </section>
      )}

      <section className="card">
        <div className="eyebrow">Reporte</div>
        <h2 className="title" style={{ fontSize: 18 }}>Exportar estadísticas generales</h2>
        <p className="lede">
          Descarga todo lo de esta pestaña en el formato que necesites. Las gráficas salen
          dibujadas a tamaño completo, sin importar el tamaño de tu pantalla.
        </p>

        <div className="export-acciones">
          <button
            type="button" className="btn export-principal" disabled={generando !== null}
            onClick={() => void exportar('pdf')}
          >
            <IconoDescarga tamano={17} />
            {generando === 'pdf' ? 'Generando…' : 'Informe completo en PDF'}
          </button>
          <button
            type="button" className="btn btn-dark" disabled={generando !== null}
            onClick={() => void exportar('excel')}
          >
            {generando === 'excel' ? 'Generando…' : 'Excel (.xlsx)'}
          </button>
          <button
            type="button" className="btn btn-dark" disabled={generando !== null}
            onClick={() => void exportar('word')}
          >
            {generando === 'word' ? 'Generando…' : 'Word (.docx)'}
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
          <li><strong>PDF</strong> — portada con las cifras principales y una lectura rápida, las tres gráficas (barras, pastel y campana) a página completa y las tablas con todos los datos. Para bajar una sola gráfica, usa el botón que está junto a ella.</li>
          <li><strong>Excel</strong> — siete hojas con encabezado fijo y filtros: resumen con la gráfica de barras, los datos que la componen, cada distribución por separado y el detalle de empresas.</li>
          <li><strong>Word</strong> — informe editable con encabezado, pie numerado, tablas y la gráfica de barras en una página horizontal.</li>
          <li><strong>CSV</strong> — la exportación de siempre, una fila por empresa.</li>
        </ul>
      </section>
    </div>
  )
}
