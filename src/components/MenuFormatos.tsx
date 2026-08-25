import type { Formato, Respuestas, Tamizaje } from '../types'
import { leyAplicable, progreso } from '../engine/scoring'

interface Props {
  formatos: Formato[]
  respuestas: Respuestas
  tamizaje: Tamizaje
  onAbrir: (id: Formato['id']) => void
  onBack: () => void
  onResultados: () => void
}

export function MenuFormatos({ formatos, respuestas, tamizaje, onAbrir, onBack, onResultados }: Props) {
  const ley = leyAplicable(tamizaje)
  const algunoCompleto = formatos.some((f) => progreso(f, respuestas, tamizaje).completo)

  return (
    <section className="card">
      <div className="eyebrow">Paso 03 — Diagnóstico</div>
      <h1 className="title">Formatos disponibles</h1>
      <p className="lede">
        Cada norma es un formato con sus propias dimensiones y pesos. Puede responderlos
        en el orden que quiera y volver a un formato a medio llenar.
      </p>

      <div className="formato-list">
        {formatos.map((f) => {
          const prog = progreso(f, respuestas, tamizaje)
          const bloqueado = f.id === 'ley2173' && !ley.aplica
          const pct = prog.total ? (prog.hechas / prog.total) * 100 : 0

          return (
            <article key={f.id} className={'formato-card' + (bloqueado ? ' is-blocked' : '')}>
              <div>
                <div className="formato-code">{f.codigo} · {f.norma}</div>
                <div className="formato-name">{f.nombre}</div>
                <div className="formato-meta">
                  {bloqueado ? ley.motivo : f.naturaleza}
                </div>
                {!bloqueado && f.id === 'ley2173' && !ley.exigible && (
                  <div className="formato-meta" style={{ color: 'var(--nx-gold)' }}>
                    {ley.motivo}
                  </div>
                )}
              </div>

              <div className="formato-side">
                {!bloqueado && (
                  <div className="progress-line">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="progress-text">{prog.hechas}/{prog.total}</span>
                  </div>
                )}
                <button
                  className={prog.completo ? 'btn-ghost' : 'btn'}
                  onClick={() => onAbrir(f.id)}
                >
                  {bloqueado ? 'Evaluar de todos modos' : prog.hechas === 0 ? 'Comenzar' : prog.completo ? 'Revisar' : 'Continuar'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {!ley.aplica && (
        <div className="note note-gold">
          <strong>El Formato 02 sigue visible a propósito.</strong> No se oculta lo que no
          aplica: se muestra con el motivo, para que quede claro que el sistema evaluó
          la norma contra el caso de su empresa.
        </div>
      )}

      <div className="nav-footer">
        <button className="btn-ghost" onClick={onBack}>← Volver al tamizaje</button>
        <button className="btn" disabled={!algunoCompleto} onClick={onResultados}>
          Ver resultados
        </button>
      </div>
    </section>
  )
}
