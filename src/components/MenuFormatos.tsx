import type { Diagnostico, Instrumento, Tamizaje } from '../types'
import { materiasFuera, progreso } from '../engine/scoring'

interface Props {
  instrumento: Instrumento
  diagnostico: Diagnostico
  tamizaje: Tamizaje
  /** Abre el cuestionario en la materia indicada (índice). */
  onAbrir: (materia: number) => void
  onResultados: () => void
}

/** Portada del autodiagnóstico: las siete materias con su avance. */
export function MenuFormatos({ instrumento, diagnostico, tamizaje, onAbrir, onResultados }: Props) {
  const prog = progreso(instrumento, diagnostico, tamizaje)
  const fuera = materiasFuera(instrumento, tamizaje)
  const pct = prog.total ? (prog.hechas / prog.total) * 100 : 0
  const siguiente = Math.max(0, instrumento.materias.findIndex((m) => {
    const pm = prog.porMateria[m.id]
    return pm.total > 0 && pm.hechas < pm.total
  }))

  return (
    <section className="card">
      <div className="eyebrow">Paso 03 — Autodiagnóstico</div>
      <h1 className="title">{instrumento.nombre}</h1>
      <p className="lede">
        Primero queremos conocer qué hace realmente su empresa; después identificamos qué puede
        fortalecer. No hay respuestas buenas ni malas: esto no es una auditoría. Puede responder
        las materias en el orden que quiera y volver cuando lo necesite.
      </p>

      <div className="progress-line" style={{ marginTop: 18 }}>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <span className="progress-text">{prog.hechas} / {prog.total} preguntas</span>
      </div>

      <ul className="rse-materias">
        {instrumento.materias.map((m, i) => {
          const pm = prog.porMateria[m.id]
          const noAplica = fuera.has(m.id)
          const completa = !noAplica && pm.hechas === pm.total
          return (
            <li key={m.id} className={'rse-materia-fila' + (noAplica ? ' is-off' : '')}>
              <span className="rse-materia-num">{m.numero}</span>
              <div className="rse-materia-texto">
                <strong>{m.nombre}</strong>
                <span>{noAplica ? 'No aplica: sus clientes no son principalmente personas u hogares.' : m.descripcion}</span>
              </div>
              {!noAplica && (
                <>
                  <span className={'rse-materia-avance' + (completa ? ' is-ok' : '')}>
                    {completa ? '✓ ' : ''}{pm.hechas}/{pm.total}
                  </span>
                  <button type="button" className={completa ? 'btn-ghost btn-sm' : 'btn btn-sm'} onClick={() => onAbrir(i)}>
                    {pm.hechas === 0 ? 'Responder' : completa ? 'Revisar' : 'Continuar'}
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <div className="nav-footer">
        <button type="button" className="btn-ghost" onClick={() => onAbrir(siguiente)}>
          {prog.hechas === 0 ? 'Comenzar' : prog.completo ? 'Revisar respuestas' : 'Continuar donde iba'}
        </button>
        <button className="btn" disabled={!prog.completo} onClick={onResultados}
          title={prog.completo ? undefined : 'Responda todas las preguntas para ver el mapa de resultados'}>
          Ver mi mapa de resultados
        </button>
      </div>
    </section>
  )
}
