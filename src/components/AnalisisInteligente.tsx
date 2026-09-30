import type { AccionIA, AnalisisIAGuardado, PrioridadIA } from '../types'
import { RSE_EXPRESS } from '../data/rseExpress'
import { CATEGORIAS } from '../data/escala'
import type { EstadoAnalisisIA } from '../hooks/useAnalisisIA'

interface Props {
  estado: EstadoAnalisisIA
  onReintentar: () => void
}

// Mismos colores del mapa de prácticas, para no inventar una paleta nueva.
const PRIORIDAD: Record<PrioridadIA, { nombre: string; color: string; fondo: string }> = {
  alta: { nombre: 'Prioridad alta', color: CATEGORIAS.oportunidad.color, fondo: CATEGORIAS.oportunidad.fondo },
  media: { nombre: 'Prioridad media', color: CATEGORIAS.desarrollo.color, fondo: CATEGORIAS.desarrollo.fondo },
  baja: { nombre: 'Prioridad baja', color: CATEGORIAS.pendiente.color, fondo: CATEGORIAS.pendiente.fondo },
}

function Prioridad({ p }: { p: PrioridadIA }) {
  const x = PRIORIDAD[p]
  return <span className="rse-badge" style={{ color: x.color, background: x.fondo }}>{x.nombre}</span>
}

function Lista({ titulo, items, ordenada = false }: { titulo: string; items: string[]; ordenada?: boolean }) {
  if (items.length === 0) return null
  const Etiqueta = ordenada ? 'ol' : 'ul'
  return (
    <div>
      <h3 className="rse-ia-subtitulo">{titulo}</h3>
      <Etiqueta className="rse-fortalezas">{items.map((t, i) => <li key={i}>{t}</li>)}</Etiqueta>
    </div>
  )
}

function Acciones({ titulo, items }: { titulo: string; items: AccionIA[] }) {
  if (items.length === 0) return null
  return (
    <>
      <h3 className="rse-ia-subtitulo">{titulo}</h3>
      <ul className="rse-ia-acciones">
        {items.map((a, i) => (
          <li key={i}>
            <div className="rse-ia-accion-cabeza">
              <strong>{a.accion}</strong>
              <Prioridad p={a.prioridad} />
            </div>
            <p><span className="rse-ia-etiqueta">Objetivo:</span> {a.objetivo}</p>
            <p className="rse-ia-horizonte">Horizonte: {a.horizonte}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

function Contenido({ datos }: { datos: AnalisisIAGuardado }) {
  const a = datos.analisis
  const fecha = new Date(datos.generadoEn)
  return (
    <div className="rse-ia-contenido">
      <h3 className="rse-ia-subtitulo">Resumen ejecutivo</h3>
      <p className="rse-ia-parrafo">{a.resumen}</p>

      <div className="rse-ia-columnas">
        <Lista titulo="Fortalezas" items={a.fortalezas} />
        <Lista titulo="Áreas de oportunidad" items={a.areasOportunidad} />
      </div>

      <Lista titulo="Prioridades" items={a.prioridades} ordenada />

      {a.recomendaciones.length > 0 && (
        <>
          <h3 className="rse-ia-subtitulo">Recomendaciones</h3>
          <div className="rse-oportunidades">
            {a.recomendaciones.map((r, i) => {
              const materia = RSE_EXPRESS.materias.find((m) => m.numero === r.materia)
              return (
                <article key={i} className="rse-oportunidad">
                  <div className="rse-oportunidad-cabeza">
                    {materia && <span className="rse-materia-num">{materia.numero}</span>}
                    <span className="rse-oportunidad-materia">{materia?.nombre ?? 'Transversal'}</span>
                    <Prioridad p={r.prioridad} />
                  </div>
                  <h4 className="rse-oportunidad-titulo">{r.titulo}</h4>
                  <p className="rse-oportunidad-base">{r.descripcion}</p>
                  <p className="rse-oportunidad-base rse-ia-porque"><strong>Por qué:</strong> {r.justificacion}</p>
                </article>
              )
            })}
          </div>
        </>
      )}

      <Acciones titulo="Acciones a corto plazo" items={a.accionesCortoPlazo} />
      <Acciones titulo="Acciones a mediano plazo" items={a.accionesMedianoPlazo} />

      {a.conclusion && (
        <>
          <h3 className="rse-ia-subtitulo">Conclusión</h3>
          <div className="note rse-ia-conclusion">{a.conclusion}</div>
        </>
      )}

      <p className="rse-ia-pie">
        Generado {Number.isNaN(fecha.getTime()) ? '' : `el ${fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} `}
        con inteligencia artificial{datos.modelo ? ` (${datos.modelo})` : ''}. Puede contener imprecisiones:
        revíselo con el equipo NEXUS antes de tomar decisiones.
      </p>
    </div>
  )
}

/**
 * «Análisis inteligente»: interpretación con IA de los resultados. Es una
 * capa aparte: si carga o falla, el mapa, la matriz y el PDF siguen igual.
 */
export function AnalisisInteligente({ estado, onReintentar }: Props) {
  if (estado.tipo === 'inactivo') return null
  return (
    <section className="rse-ia" aria-labelledby="rse-ia-titulo" aria-busy={estado.tipo === 'cargando'}>
      <h2 id="rse-ia-titulo" className="q-section-title">Análisis inteligente</h2>
      <p className="rse-texto">
        Una lectura de sus resultados generada con inteligencia artificial. Interpreta el mapa y la matriz
        de arriba sin cambiarlos: sus fortalezas, oportunidades y prioridades siguen siendo las del
        autodiagnóstico.
      </p>

      {estado.tipo === 'cargando' && (
        <div className="note rse-ia-cargando" role="status" aria-live="polite">
          <span className="rse-ia-spinner" aria-hidden="true" />
          <div>
            <strong>Analizando resultados…</strong>{' '}
            Puede tardar hasta un minuto y medio. Mientras tanto puede seguir revisando su mapa o descargar el informe.
          </div>
        </div>
      )}

      {estado.tipo === 'error' && (
        <div className="note note-gold rse-ia-error" role="status">
          <span>{estado.mensaje}</span>
          {estado.reintentable && (
            <button type="button" className="btn-ghost btn-sm" onClick={onReintentar}>Reintentar</button>
          )}
        </div>
      )}

      {estado.tipo === 'listo' && <Contenido datos={estado.datos} />}
    </section>
  )
}
