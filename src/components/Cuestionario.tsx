import { useState } from 'react'
import type { Diagnostico, Etapa, Instrumento, Materia, Pregunta, RespuestaPregunta, Tamizaje } from '../types'
import { ETAPAS, etiquetaEtapa } from '../data/escala'
import { describeAlgo, materiasFuera, preguntaCompleta, progreso } from '../engine/scoring'

const RESPUESTA_VACIA: RespuestaPregunta = { texto: '', ejemplos: [], otro: '', etapa: null }

interface Props {
  instrumento: Instrumento
  diagnostico: Diagnostico
  tamizaje: Tamizaje
  materiaInicial?: number
  onRespuesta: (preguntaId: string, r: RespuestaPregunta) => void
  onFortalecer: (numeroMateria: string, texto: string) => void
  onComentario: (texto: string) => void
  onSalir: () => void
  /** Solo se pasa cuando ya se puede ver el resultado. */
  onResultados?: () => void
}

/**
 * Formulario abierto del Anexo 1. Por pregunta (sección 6.3): la pregunta
 * principal con texto libre, ejemplos orientadores opcionales, «Hacemos
 * algo diferente: ___» y «¿En qué punto está?». Al final de cada materia,
 * «¿Qué le gustaría fortalecer?»; al final de todo, la pregunta abierta.
 */
export function Cuestionario({
  instrumento, diagnostico, tamizaje, materiaInicial = 0,
  onRespuesta, onFortalecer, onComentario, onSalir, onResultados,
}: Props) {
  const fuera = materiasFuera(instrumento, tamizaje)
  const visibles = instrumento.materias.filter((m) => !fuera.has(m.id))
  const FINAL = visibles.length
  const inicial = Math.max(0, visibles.findIndex((m) => m.id === instrumento.materias[materiaInicial]?.id))
  const [actual, setActual] = useState(inicial)
  const prog = progreso(instrumento, diagnostico, tamizaje)
  const pct = prog.total ? (prog.hechas / prog.total) * 100 : 0

  const ir = (i: number) => { setActual(i); window.scrollTo(0, 0) }
  const materia = actual < FINAL ? visibles[actual] : null

  return (
    <section className="card">
      <div className="eyebrow">Autodiagnóstico RSE Express</div>
      <h1 className="title">Cuéntenos qué hace hoy su empresa</h1>
      <p className="lede">
        Responda con sus palabras. Los ejemplos solo ayudan a recordar: no son una lista para
        cumplir. Lo que escribe se guarda solo.
      </p>

      <div className="progress-line">
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <span className="progress-text">{prog.hechas} / {prog.total} preguntas</span>
      </div>

      <div className="q-layout">
        <nav className="q-nav" aria-label="Materias">
          {visibles.map((m, i) => {
            const pm = prog.porMateria[m.id]
            return (
              <button key={m.id} type="button"
                className={'q-nav-item' + (i === actual ? ' is-on' : '')}
                aria-current={i === actual ? 'step' : undefined}
                onClick={() => ir(i)}>
                <span className="q-nav-num">{m.numero}</span>
                <span>{m.nombre}</span>
                <span className="q-nav-score">{pm.hechas === pm.total ? '✓' : `${pm.hechas}/${pm.total}`}</span>
              </button>
            )
          })}
          <button type="button" className={'q-nav-item' + (actual === FINAL ? ' is-on' : '')}
            aria-current={actual === FINAL ? 'step' : undefined} onClick={() => ir(FINAL)}>
            <span className="q-nav-num">+</span>
            <span>Para terminar</span>
            <span className="q-nav-score">{diagnostico.comentarioFinal.trim() ? '✓' : ''}</span>
          </button>
        </nav>

        <div>
          {materia ? (
            <BloqueMateria
              materia={materia} diagnostico={diagnostico}
              onRespuesta={onRespuesta} onFortalecer={onFortalecer}
            />
          ) : (
            <div className="rse-cierre">
              <h2 className="q-section-title">Para terminar</h2>
              <label htmlFor="comentario-final" className="rse-pregunta-texto">{instrumento.preguntaFinal}</label>
              <textarea id="comentario-final" className="rse-textarea" rows={4} maxLength={4000}
                value={diagnostico.comentarioFinal}
                placeholder="Opcional. Cualquier práctica, apoyo o idea que quiera contarnos."
                onChange={(e) => onComentario(e.target.value)} />
              {!prog.completo && (
                <p className="note">
                  Le faltan {prog.total - prog.hechas} pregunta(s) por completar. Una pregunta queda
                  completa cuando elige en qué punto está y nos cuenta algo de lo que hacen (salvo que
                  diga que aún no lo han abordado o que no aplica).
                </p>
              )}
            </div>
          )}

          <div className="nav-footer">
            <button type="button" className="btn-ghost" onClick={actual === 0 ? onSalir : () => ir(actual - 1)}>
              {actual === 0 ? '← Volver a las materias' : '← Anterior'}
            </button>
            {actual < FINAL ? (
              <button type="button" className="btn" onClick={() => ir(actual + 1)}>Siguiente →</button>
            ) : onResultados ? (
              <button type="button" className="btn" onClick={onResultados}>Ver mi mapa de resultados</button>
            ) : (
              <button type="button" className="btn" onClick={onSalir}>Guardar y volver</button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function BloqueMateria({ materia, diagnostico, onRespuesta, onFortalecer }: {
  materia: Materia
  diagnostico: Diagnostico
  onRespuesta: Props['onRespuesta']
  onFortalecer: Props['onFortalecer']
}) {
  const idCierre = `fortalecer-${materia.numero}`
  return (
    <div>
      <h2 className="q-section-title q-section-first">{materia.numero} · {materia.nombre}</h2>
      <p className="rse-materia-desc">{materia.descripcion}</p>

      {materia.preguntas.map((p) => (
        <TarjetaPregunta key={p.id} pregunta={p}
          respuesta={diagnostico.respuestas[p.id] ?? RESPUESTA_VACIA}
          onChange={(r) => onRespuesta(p.id, r)} />
      ))}

      <div className="rse-cierre">
        <label htmlFor={idCierre} className="rse-pregunta-texto">{materia.cierre}</label>
        <textarea id={idCierre} className="rse-textarea" rows={2} maxLength={2000}
          value={diagnostico.fortalecer[materia.numero] ?? ''}
          placeholder="Opcional. Nos ayuda a proponerle oportunidades que le interesen."
          onChange={(e) => onFortalecer(materia.numero, e.target.value)} />
      </div>
    </div>
  )
}

function TarjetaPregunta({ pregunta: p, respuesta: r, onChange }: {
  pregunta: Pregunta
  respuesta: RespuestaPregunta
  onChange: (r: RespuestaPregunta) => void
}) {
  const set = (cambio: Partial<RespuestaPregunta>) => onChange({ ...r, ...cambio })
  const alternarEjemplo = (e: string) =>
    set({ ejemplos: r.ejemplos.includes(e) ? r.ejemplos.filter((x) => x !== e) : [...r.ejemplos, e] })
  const nombre = `etapa-${p.id}`
  const idTexto = `texto-${p.id}`
  const falta = r.etapa !== null && !preguntaCompleta(r)
  const ayuda = ETAPAS.find((x) => x.valor === r.etapa)?.ayuda

  return (
    <article className="rse-pregunta" aria-labelledby={`p-${p.id}`}>
      <div className="rse-pregunta-cabeza">
        <span className="q-id">{p.id}</span>
        <p id={`p-${p.id}`} className="rse-pregunta-texto">{p.texto}</p>
        {preguntaCompleta(r) && <span className="rse-listo" aria-label="Pregunta completa">✓</span>}
      </div>

      <label htmlFor={idTexto} className="rse-sublabel">Cuéntenos con sus palabras</label>
      <textarea id={idTexto} className="rse-textarea" rows={3} maxLength={4000} value={r.texto}
        placeholder="Qué hacen, quién lo hace, cada cuánto…"
        onChange={(e) => set({ texto: e.target.value })} />

      <fieldset className="rse-fieldset">
        <legend className="rse-sublabel">
          Ejemplos que pueden ayudarle a recordar <span className="rse-opcional">(opcional, marque los que apliquen)</span>
        </legend>
        <div className="rse-ejemplos">
          {p.ejemplos.map((e) => {
            const on = r.ejemplos.includes(e)
            return (
              <label key={e} className={'rse-chip' + (on ? ' is-on' : '')}>
                <input type="checkbox" checked={on} onChange={() => alternarEjemplo(e)} />
                {e}
              </label>
            )
          })}
        </div>
        <label className="rse-otro">
          <span>Hacemos algo diferente:</span>
          <input value={r.otro} maxLength={1000} placeholder="Escríbalo aquí"
            onChange={(e) => set({ otro: e.target.value })} />
        </label>
      </fieldset>

      <fieldset className="rse-fieldset">
        <legend className="rse-sublabel">¿En qué punto está?</legend>
        <div className="rse-etapas">
          {ETAPAS.map((x) => {
            const on = r.etapa === x.valor
            return (
              <label key={String(x.valor)} className={'rse-etapa' + (on ? ' is-on' : '')}>
                <input type="radio" name={nombre} checked={on}
                  onChange={() => set({ etapa: x.valor as Etapa, clasificada: x.valor === 'diferente' ? r.clasificada ?? null : null })} />
                <span>{x.etiqueta}</span>
              </label>
            )
          })}
        </div>
        {ayuda && <p className="hint">{ayuda}</p>}
      </fieldset>

      {falta && !describeAlgo(r) && (
        <p className="rse-aviso" role="status">
          Para completar esta pregunta, cuéntenos brevemente qué hacen o marque un ejemplo.
        </p>
      )}
      {r.etapa === 'diferente' && r.clasificada !== null && r.clasificada !== undefined && (
        <p className="hint">El equipo NEXUS ubicó esta práctica en: «{etiquetaEtapa(r.clasificada)}».</p>
      )}
    </article>
  )
}
