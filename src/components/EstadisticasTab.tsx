import { useEffect, useState } from 'react'
import * as adminApi from '../auth/adminApi'
import type { Estadisticas, EmpresaDetalle } from '../auth/adminApi'
import { AuthError } from '../auth/types'

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
  a.download = `nexus360-empresas-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function EstadisticasTab({ token }: { token: string }) {
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    setCargando(true)
    Promise.all([adminApi.obtenerEstadisticas(token), adminApi.listarEmpresasDetalle(token)])
      .then(([s, e]) => { setStats(s); setEmpresas(e) })
      .catch((err) => setError(err instanceof AuthError ? err.message : 'No se pudo cargar la información.'))
      .finally(() => setCargando(false))
  }, [token])

  if (cargando) return <p className="lede">Cargando estadísticas…</p>
  if (error) return <div className="auth-error" role="alert">{error}</div>
  if (!stats) return null

  const maxSector = Math.max(1, ...stats.empresas_por_sector.map((s) => s.total))
  const maxTamano = Math.max(1, ...stats.empresas_por_tamano.map((s) => s.total))
  const maxEstado = Math.max(1, ...stats.diagnosticos_por_estado.map((s) => s.total))

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
        <h1 className="title" style={{ fontSize: 18 }}>Exportar detalle de empresas</h1>
        <p className="lede">
          Descarga un archivo CSV con una fila por empresa (perfil, tamizaje y estado de cada
          diagnóstico) — se abre directo en Excel, Google Sheets o Numbers.
        </p>
        <button
          type="button" className="btn" disabled={exportando || empresas.length === 0}
          onClick={() => { setExportando(true); descargarCSV(empresas); setExportando(false) }}
        >
          {exportando ? 'Generando…' : `Exportar ${empresas.length} empresa(s) a CSV`}
        </button>
      </section>
    </div>
  )
}
