import { useState } from 'react'
import type { Bandera, Perfil, Prioridad, ResultadoFormato, Tamizaje } from '../types'
import type { Cruce } from '../engine/scoring'
import { Radar } from './Radar'
import { clasificar } from '../data/escala'

interface Props {
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
  onBack: () => void
}

function Puntaje({ etiqueta, nombre, res, activo, nota }: {
  etiqueta: string; nombre: string; res: ResultadoFormato | null; activo: boolean; nota: string
}) {
  const clase = 'score-card' + (activo ? ' score-law' : ' score-off')
  if (!res || !res.concluyente || res.score === null) {
    return (
      <div className={clase}>
        <div className="score-label">{etiqueta}</div>
        <div className="score-name">{nombre}</div>
        <p className="score-note" style={{ marginTop: 16 }}>{nota}</p>
      </div>
    )
  }
  const c = clasificar(res.score)
  return (
    <div className={clase}>
      <div className="score-label">{etiqueta}</div>
      <div className="score-name">{nombre}</div>
      <div className="score-row">
        <span className="score-num">{res.score.toFixed(1)}</span>
        <span className="score-den">/ {res.techo.toFixed(1)}</span>
      </div>
      <span className="score-tag" style={{ color: c.color }}>{c.etiqueta}</span>
      {res.techo < 4 && (
        <p className="score-note">
          Primer ciclo: el nivel 4 exige mejora continua entre ciclos, así que hoy el techo real es 3.0.
        </p>
      )}
      {res.cobertura < 1 && (
        <p className="score-note">
          Cobertura {(res.cobertura * 100).toFixed(0)}% del peso — el resto quedó en «no aplica».
        </p>
      )}
    </div>
  )
}

function Barras({ res }: { res: ResultadoFormato }) {
  return (
    <div>
      {res.dimensiones.map((d, i) => {
        const c = d.score !== null ? clasificar(d.score) : null
        return (
          <div key={d.id} className="bar-row">
            <span className="bar-num">{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span className="bar-name">{d.abrev}</span>{' '}
              <span className="bar-peso">peso {d.pesoEfectivo.toFixed(2)}</span>
            </span>
            <div className="bar-track">
              {d.score !== null && (
                <div className="bar-fill"
                  style={{ width: `${(d.score / 4) * 100}%`, background: c!.color }} />
              )}
            </div>
            <span className="bar-val" style={{ color: c?.color ?? 'var(--nx-muted)' }}>
              {d.score !== null ? d.score.toFixed(1) : 'n/a'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function Resultados(props: Props) {
  const { perfil, tamizaje, iso, ley, leyAplica, leyExigible, motivoLey, cruce, banderas, plan, onBack } = props
  const leyVisible = leyAplica && ley?.concluyente ? ley : null
  const [generando, setGenerando] = useState(false)

  // jsPDF pesa lo suyo: solo se carga cuando alguien pide el informe.
  const descargar = async () => {
    setGenerando(true)
    try {
      const { generarInforme } = await import('../export/pdf')
      generarInforme({ perfil, tamizaje, iso, ley, leyAplica, leyExigible, motivoLey, cruce, banderas, plan })
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="card">
      <div className="eyebrow">Paso 04 — Resultados</div>
      <h1 className="title">Diagnóstico de {perfil.razonSocial || 'la empresa'}</h1>
      <p className="lede">
        Dos instrumentos, dos lecturas. No se promedian: uno mide madurez declarada,
        el otro cumplimiento verificable.
      </p>

      <div className="score-pair">
        <Puntaje etiqueta="Formato 01 · ISO 26000" nombre="Madurez en responsabilidad social"
          res={iso} activo={false} nota="Complete el formato para ver el resultado." />
        <Puntaje etiqueta="Formato 02 · Ley 2173" nombre="Áreas de Vida"
          res={leyVisible} activo={leyExigible}
          nota={motivoLey || 'Formato sin responder o con cobertura insuficiente.'} />
      </div>

      {cruce && (
        <div className={'cross cross-' + cruce.tono}>
          <div className="cross-title">{cruce.titulo}</div>
          <p className="cross-text">{cruce.texto}</p>
        </div>
      )}

      {iso?.concluyente && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 34, color: 'var(--nx-dark)' }}>
            Madurez por materia
          </h2>
          <div className="result-grid">
            <Radar dimensiones={iso.dimensiones} />
            <div style={{ paddingTop: 18 }}><Barras res={iso} /></div>
          </div>
        </>
      )}

      {leyVisible && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 30, color: 'var(--nx-dark)' }}>
            Cumplimiento por dimensión — Ley 2173
          </h2>
          <div style={{ marginTop: 14 }}><Barras res={leyVisible} /></div>
        </>
      )}

      {banderas.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 34, color: 'var(--nx-alert)' }}>
            Alertas críticas
          </h2>
          <p className="lede" style={{ fontSize: 13.5 }}>
            Se muestran aunque el puntaje sea alto. Un promedio puede esconder un riesgo
            que invalida el ciclo completo.
          </p>
          {banderas.map((b) => (
            <div key={b.id} className="flag">
              <div className="flag-title">{b.titulo}</div>
              <p className="flag-text">{b.detalle}</p>
            </div>
          ))}
        </>
      )}

      {plan.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 34, color: 'var(--nx-dark)' }}>
            Plan de acción priorizado
          </h2>
          <p className="lede" style={{ fontSize: 13.5 }}>
            Ordenado por brecha ponderada, no por puntaje bruto. Una brecha legal exigible
            precede a cualquier brecha de madurez voluntaria.
          </p>
          {plan.map((p) => (
            <article key={p.orden} className={'plan-card' + (p.critica ? ' plan-critical' : '')}>
              <div className="plan-top">
                <span className="plan-rank">Prioridad {p.orden}</span>
                <span className="plan-origin">{p.etiquetaOrigen} · {p.dimension}</span>
              </div>
              <div className="plan-action">{p.verbo} {p.accion}</div>
              <p className="plan-meta">
                {p.pregunta} · Nivel actual {p.valor} de {p.techo}
              </p>
            </article>
          ))}
        </>
      )}

      <details className="method">
        <summary>Cómo se calculó esto</summary>
        <div className="method-body">
          <p>
            Los pesos de cada nivel suman 1.0. En el Formato 01 el peso de cada materia lo
            determina el sector: para una empresa {perfil.sector ? 'de este sector' : 'sin sector definido'} no
            pesan igual gobernanza y medio ambiente.
          </p>
          <p>
            Las respuestas «no aplica» salen del cálculo y su peso se reparte entre las preguntas
            restantes de la sección. Si más de la mitad del peso queda en «no aplica», no se
            reporta puntaje: se declara el diagnóstico no concluyente.
          </p>
          <p>
            El nivel 4 exige al menos dos ciclos ejecutados. {tamizaje.cicloPrevio === 'no'
              ? 'Como es el primer ciclo, el techo del Formato 02 es 3.0.'
              : 'Con ciclos previos, el techo es 4.0.'}
          </p>
          <p>
            El resultado de la Ley 2173 no alimenta la materia ambiental de la ISO: sería
            circular y contaría dos veces el mismo esfuerzo. Se contrastan, no se suman.
          </p>
        </div>
      </details>

      <div className="nav-footer">
        <button className="btn-ghost" onClick={onBack}>← Ajustar respuestas</button>
        <button className="btn btn-dark" onClick={descargar} disabled={generando}>
          {generando ? 'Preparando informe…' : 'Descargar informe en PDF'}
        </button>
      </div>
    </section>
  )
}
