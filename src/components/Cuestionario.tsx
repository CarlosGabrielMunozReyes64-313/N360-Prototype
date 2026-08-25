import { useMemo, useState } from 'react'
import type { Formato, Respuestas, SectorId, Tamizaje, Valor } from '../types'
import { Escala } from './Escala'
import { NOMBRE_ARQUETIPO, clasificar } from '../data/escala'
import { evaluarFormato, hojasForzadasNA, progreso, techoDe } from '../engine/scoring'

interface Props {
  formato: Formato
  respuestas: Respuestas
  sector: SectorId | ''
  tamizaje: Tamizaje
  onAnswer: (id: string, v: Valor) => void
  onSalir: () => void
}

export function Cuestionario({ formato, respuestas, sector, tamizaje, onAnswer, onSalir }: Props) {
  const [activa, setActiva] = useState(0)

  const forzadas = useMemo(() => hojasForzadasNA(formato, tamizaje), [formato, tamizaje])
  const res = useMemo(
    () => evaluarFormato(formato, respuestas, sector, tamizaje),
    [formato, respuestas, sector, tamizaje],
  )
  const prog = progreso(formato, respuestas, tamizaje)
  const techo = techoDe(formato.id, tamizaje)

  const visibles = formato.dimensiones.filter((d) =>
    d.secciones.some((s) => s.preguntas.some((p) => !forzadas.has(p.id))),
  )
  const dim = visibles[Math.min(activa, visibles.length - 1)]
  const apagadas = formato.dimensiones.length - visibles.length

  return (
    <section className="card">
      <div className="eyebrow">{formato.codigo} — {formato.norma}</div>
      <h1 className="title">{formato.nombre}</h1>
      <p className="lede">{formato.naturaleza}</p>

      <div className="progress-line" style={{ marginTop: 18 }}>
        <div className="progress-track">
          <div className="progress-fill"
            style={{ width: `${prog.total ? (prog.hechas / prog.total) * 100 : 0}%` }} />
        </div>
        <span className="progress-text">{prog.hechas} / {prog.total} respondidas</span>
      </div>

      {apagadas > 0 && (
        <div className="note note-gold">
          <strong>{apagadas} dimensiones quedaron fuera de este ciclo.</strong> Su municipio aún
          no ha publicado Áreas de Vida, así que el programa de siembra todavía no es exigible.
          Su peso se reparte entre lo que sí se puede evaluar hoy.
        </div>
      )}

      <div className="q-layout" style={{ marginTop: 26 }}>
        <nav className="q-nav" aria-label="Dimensiones">
          {visibles.map((d, i) => {
            const r = res.dimensiones.find((x) => x.id === d.id)
            const c = r?.score != null ? clasificar(r.score) : null
            return (
              <button key={d.id} className={'q-nav-item' + (i === activa ? ' is-on' : '')}
                onClick={() => setActiva(i)}>
                <span className="q-nav-num">{d.numero}</span>
                <span>{d.abrev}</span>
                {c && r?.score != null && (
                  <span className="q-nav-score" style={{ color: c.color }}>{r.score.toFixed(1)}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div>
          <h2 style={{ fontSize: 19, color: 'var(--nx-dark)' }}>{dim.nombre}</h2>
          <p className="lede" style={{ marginTop: 6, fontSize: 14 }}>{dim.descripcion}</p>

          {dim.secciones.map((s, si) => {
            const preguntas = s.preguntas.filter((p) => !forzadas.has(p.id))
            if (!preguntas.length) return null
            return (
              <div key={s.id}>
                {s.nombre && (
                  <div className={'q-section-title' + (si === 0 ? ' q-section-first' : '')}>
                    {s.nombre}
                  </div>
                )}
                {preguntas.map((p, pi) => (
                  <div key={p.id}
                    className={'question' + (pi === preguntas.length - 1 ? ' question-last' : '')}>
                    <div className="q-head">
                      <span className="q-id">{p.id}</span>
                      <span className="q-text">{p.texto}</span>
                      <span className="q-chip" title={`Arquetipo ${p.arquetipo}`}>
                        {NOMBRE_ARQUETIPO[p.arquetipo]}
                      </span>
                    </div>
                    {p.ancla && (
                      <p className="q-ancla"><b>Nivel 3 exige:</b> {p.ancla}</p>
                    )}
                    <Escala valor={respuestas[p.id]} arquetipo={p.arquetipo} techo={techo}
                      onChange={(v) => onAnswer(p.id, v)} />
                  </div>
                ))}
              </div>
            )
          })}

          <div className="nav-footer">
            <button className="btn-ghost" disabled={activa === 0}
              onClick={() => { setActiva(activa - 1); window.scrollTo(0, 0) }}>← Anterior</button>
            {activa < visibles.length - 1
              ? <button className="btn" onClick={() => { setActiva(activa + 1); window.scrollTo(0, 0) }}>
                  Siguiente dimensión →
                </button>
              : <button className="btn btn-dark" onClick={onSalir}>Guardar y volver al menú</button>}
          </div>
        </div>
      </div>
    </section>
  )
}
