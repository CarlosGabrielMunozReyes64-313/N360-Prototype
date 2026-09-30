import { useEffect } from 'react'
import { POLITICA_DATOS } from '../data/politicaDatos'
import type { SeccionPolitica } from '../data/politicaDatos'

interface Props {
  onCerrar: () => void
}

/** Política de Tratamiento de Datos Personales en un diálogo, para leerla
 * sin salir del registro. Se cierra con Escape, con el botón o tocando fuera. */
export function PoliticaDatos({ onCerrar }: Props) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div className="politica-fondo" onClick={onCerrar}>
      <div
        className="politica-caja" role="dialog" aria-modal="true" aria-labelledby="politica-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="politica-cabeza">
          <h2 id="politica-titulo" className="politica-titulo">{POLITICA_DATOS.titulo}</h2>
          <p className="politica-version">
            NEXUS 360° · Versión {POLITICA_DATOS.version} · Vigente desde el {POLITICA_DATOS.vigenteDesde}
          </p>
        </div>
        <div className="politica-cuerpo">
          {(POLITICA_DATOS.secciones as SeccionPolitica[]).map((s) => (
            <section key={s.titulo}>
              <h3>{s.titulo}</h3>
              {s.parrafos?.map((p) => <p key={p}>{p}</p>)}
              {s.lista && <ul>{s.lista.map((x) => <li key={x}>{x}</li>)}</ul>}
              {s.notas?.map((p) => <p key={p}>{p}</p>)}
            </section>
          ))}
        </div>
        <div className="politica-pie">
          <button type="button" className="btn" onClick={onCerrar} autoFocus>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
