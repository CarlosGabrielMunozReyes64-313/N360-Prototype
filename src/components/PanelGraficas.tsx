import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Seccion } from '../engine/agregados'
import { VISTAS, infoVista, tablasDe } from '../engine/vistasGraficas'
import type { Vista } from '../engine/vistasGraficas'
import { GraficaSegunVista } from './GraficaSegunVista'
import { IconoBarras, IconoCampana, IconoDescarga, IconoPastel } from './Iconos'
import { useAncho } from './useAncho'
import './graficas.css'

interface Props {
  secciones: Seccion[]
  onDescargarPdf: (vista: Vista) => void
  /** Vista cuyo PDF se está generando, para bloquear el botón. */
  generando: boolean
}

const ICONOS: Record<Vista, typeof IconoBarras> = {
  barras: IconoBarras,
  pastel: IconoPastel,
  campana: IconoCampana,
}

/**
 * Las tres gráficas del panel en una sola tarjeta, con pestañas para
 * elegir entre barras, pastel y campana (patrón WAI-ARIA de pestañas:
 * flechas izquierda/derecha, Inicio y Fin). Cada gráfica se puede bajar
 * en PDF, y sus datos exactos están siempre a un clic en una tabla, que
 * es también lo que leen los lectores de pantalla.
 */
export function PanelGraficas({ secciones, onDescargarPdf, generando }: Props) {
  const [vista, setVista] = useState<Vista>('barras')
  const [refLienzo, ancho] = useAncho()
  const pestanas = useRef<Partial<Record<Vista, HTMLButtonElement | null>>>({})
  const id = useId()
  const info = infoVista(vista)

  const elegir = (v: Vista) => {
    setVista(v)
    pestanas.current[v]?.focus()
  }

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = VISTAS.length
    const destino = {
      ArrowRight: (i + 1) % n,
      ArrowLeft: (i - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    elegir(VISTAS[destino].id)
  }

  return (
    <section className="card graficas-card" aria-labelledby={`${id}-titulo`}>
      <div className="graficas-cabecera">
        <div>
          <div className="eyebrow">Gráficas</div>
          <h2 className="title graficas-titulo" id={`${id}-titulo`}>{info.titulo}</h2>
        </div>
        <button
          type="button" className="btn-ghost graficas-pdf"
          onClick={() => onDescargarPdf(vista)} disabled={generando}
        >
          <IconoDescarga tamano={17} />
          {generando ? 'Generando PDF…' : 'Descargar esta gráfica en PDF'}
        </button>
      </div>

      <div className="graficas-vistas" role="tablist" aria-label="Tipo de gráfica">
        {VISTAS.map((v, i) => {
          const Icono = ICONOS[v.id]
          const activa = v.id === vista
          return (
            <button
              key={v.id}
              ref={(el) => { pestanas.current[v.id] = el }}
              type="button"
              role="tab"
              id={`${id}-pestana-${v.id}`}
              aria-selected={activa}
              aria-controls={`${id}-panel`}
              tabIndex={activa ? 0 : -1}
              className="graficas-vista"
              onClick={() => setVista(v.id)}
              onKeyDown={(e) => alTeclear(e, i)}
            >
              <Icono tamano={18} />
              {v.nombre}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-pestana-${vista}`}>
        <p className="lede graficas-descripcion">{info.descripcion}</p>

        <div className="graficas-lienzo" ref={refLienzo}>
          {ancho > 0 && <GraficaSegunVista vista={vista} secciones={secciones} ancho={ancho} />}
        </div>

        <details className="graficas-datos">
          <summary>Ver los datos de esta gráfica en una tabla</summary>
          {tablasDe(vista, secciones).map((t) => (
            <div className="graficas-tabla-scroll" key={t.titulo}>
              <table className="graficas-tabla">
                <caption>{t.titulo}</caption>
                <thead>
                  <tr>
                    {t.columnas.map((c) => (
                      <th key={c.titulo} scope="col" className={c.numerica ? 'num' : undefined}>{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.filas.length === 0 && (
                    <tr><td colSpan={t.columnas.length}>Sin datos todavía.</td></tr>
                  )}
                  {t.filas.map((f, i) => (
                    <tr key={i}>
                      {f.map((v, j) => (
                        <td key={j} className={t.columnas[j].numerica ? 'num' : undefined}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </details>
      </div>
    </section>
  )
}
