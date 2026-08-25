import type { Arquetipo, Valor } from '../types'
import { ANCLAS, COLOR_NIVEL, NIVELES } from '../data/escala'

interface Props {
  valor: Valor | undefined
  arquetipo: Arquetipo
  /** Nivel máximo alcanzable. En primer ciclo el 4 no está disponible. */
  techo: number
  onChange: (v: Valor) => void
}

/**
 * La respuesta se muestra como un riel que se llena, no como cinco cajas
 * sueltas: la madurez es una progresión ordinal, no cinco opciones
 * inconexas. El N/A queda fuera del riel a propósito — no es un nivel bajo,
 * es una exclusión del cálculo.
 */
export function Escala({ valor, arquetipo, techo, onChange }: Props) {
  const nivel = typeof valor === 'number' ? valor : -1
  const color = nivel >= 0 ? COLOR_NIVEL[nivel] : undefined

  return (
    <>
      <div className="escala" role="radiogroup" aria-label="Nivel de madurez">
        <div className="escala-track">
          {NIVELES.map((n, i) => {
            const lleno = nivel >= 0 && i <= nivel
            const bloqueado = n.valor > techo
            return (
              <button
                key={n.valor}
                type="button"
                role="radio"
                aria-checked={valor === n.valor}
                aria-label={`Nivel ${n.valor}: ${n.etiqueta}`}
                disabled={bloqueado}
                title={bloqueado ? 'El nivel 4 exige al menos dos ciclos ejecutados' : n.etiqueta}
                className={
                  'seg' +
                  (i === NIVELES.length - 1 ? ' seg-last' : '') +
                  (lleno ? ' seg-filled' : '')
                }
                style={lleno ? { background: color } : undefined}
                onClick={() => onChange(n.valor)}
              >
                {n.valor}
              </button>
            )
          })}
        </div>

        <span className="escala-divider" aria-hidden="true" />

        <button
          type="button"
          role="radio"
          aria-checked={valor === 'NA'}
          className={'chip-na' + (valor === 'NA' ? ' chip-na-on' : '')}
          onClick={() => onChange('NA')}
        >
          No aplica
        </button>
      </div>

      <p className="escala-caption">
        {valor === undefined && 'Elija el nivel que describe su situación actual.'}
        {valor === 'NA' && 'Se excluye del cálculo y su peso se reparte entre las demás preguntas de la sección.'}
        {typeof valor === 'number' && (
          <>
            <b>{NIVELES[valor].etiqueta}</b> — {ANCLAS[arquetipo][valor]}
          </>
        )}
      </p>
    </>
  )
}
