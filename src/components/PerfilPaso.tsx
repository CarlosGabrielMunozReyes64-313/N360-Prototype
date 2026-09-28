import type { Perfil, SectorId } from '../types'
import { SECTORES } from '../data/rseExpress'
import { DEPARTAMENTOS_COLOMBIA, municipiosDe } from '../data/colombia'

interface Props {
  perfil: Perfil
  onChange: (p: Perfil) => void
  onNext: () => void
  /** Texto del botón principal. Por defecto, el de avance del asistente. */
  textoBoton?: string
  /** Oculta la nota "Este prototipo arranca en el perfil..." — no aplica
   * cuando este formulario se usa dentro del modal de edición posterior. */
  ocultarNota?: boolean
}

/** Dígito de verificación del NIT: módulo 11 de la DIAN. */
export function calcularDV(nit: string): string | null {
  const limpio = nit.replace(/\D/g, '')
  if (limpio.length < 5 || limpio.length > 15) return null
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  let suma = 0
  const rev = limpio.split('').reverse()
  for (let i = 0; i < rev.length; i++) suma += Number(rev[i]) * pesos[i]
  const r = suma % 11
  return String(r > 1 ? 11 - r : r)
}

export function PerfilPaso({ perfil, onChange, onNext, textoBoton, ocultarNota }: Props) {
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => onChange({ ...perfil, [k]: v })

  const dvEsperado = calcularDV(perfil.nit)
  const dvMal = perfil.dv !== '' && dvEsperado !== null && perfil.dv !== dvEsperado
  const listo = Boolean(perfil.razonSocial && perfil.nit && perfil.sector && perfil.municipio) && !dvMal

  return (
    <section className="card">
      <div className="eyebrow">Paso 01 — Perfil</div>
      <h1 className="title">Datos de la empresa</h1>
      <p className="lede">
        Solo datos básicos que no cambian con frecuencia. El tamaño, las personas que trabajan
        con la empresa y sus clientes se preguntan en el siguiente paso, «Conozcamos su empresa».
      </p>

      <div className="grid-2">
        <div className="field field-wide">
          <label htmlFor="rs">Razón social</label>
          <input id="rs" value={perfil.razonSocial} placeholder="Como aparece en el RUT"
            onChange={(e) => set('razonSocial', e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="nit">NIT y dígito de verificación</label>
          <div className="nit-row">
            <input id="nit" value={perfil.nit} inputMode="numeric" maxLength={9} placeholder="900123456"
              onChange={(e) => set('nit', e.target.value.replace(/\D/g, '').slice(0, 9))} />
            <input aria-label="Dígito de verificación" value={perfil.dv} inputMode="numeric" maxLength={1}
              placeholder="DV" onChange={(e) => set('dv', e.target.value.replace(/\D/g, ''))} />
          </div>
          {dvMal && (
            <span className="hint" style={{ color: 'var(--nx-alert)' }}>
              El dígito no corresponde al NIT. Para {perfil.nit} debería ser {dvEsperado}.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="sector">Sector</label>
          <select id="sector" value={perfil.sector}
            onChange={(e) => set('sector', e.target.value as SectorId)}>
            <option value="">Seleccione…</option>
            {SECTORES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <span className="hint">Nos ayuda a leer sus respuestas según la actividad de la empresa.</span>
        </div>

        <div className="field">
          <label htmlFor="dep">Departamento</label>
          <select id="dep" value={perfil.departamento}
            onChange={(e) => {
              const dep = e.target.value
              // Si el municipio ya elegido no pertenece al nuevo departamento, se limpia.
              const siguienteMunicipio = municipiosDe(dep).includes(perfil.municipio) ? perfil.municipio : ''
              onChange({ ...perfil, departamento: dep, municipio: siguienteMunicipio })
            }}>
            <option value="">Seleccione…</option>
            {DEPARTAMENTOS_COLOMBIA.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="mun">Municipio</label>
          <select id="mun" value={perfil.municipio} disabled={!perfil.departamento}
            onChange={(e) => set('municipio', e.target.value)}>
            <option value="">{perfil.departamento ? 'Seleccione…' : 'Elige primero el departamento'}</option>
            {municipiosDe(perfil.departamento).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="field field-wide">
          <label>¿Es una sociedad extranjera constituida en Colombia?</label>
          <div className="choice-set">
            {[['no', 'No'], ['si', 'Sí']].map(([v, t]) => (
              <button key={v} type="button"
                className={'choice' + ((perfil.extranjera ? 'si' : 'no') === v ? ' is-on' : '')}
                onClick={() => set('extranjera', v === 'si')}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {!ocultarNota && (
        <div className="note">
          Estos datos identifican a su empresa y se guardan en su cuenta. Si otra cuenta ya
          registró el mismo NIT, el administrador de NEXUS puede vincularle el acceso.
        </div>
      )}

      <div className="nav-footer">
        <span className="progress-text">Paso 1 de 4 · Datos básicos de la empresa</span>
        <button className="btn" disabled={!listo} onClick={onNext}>
          {textoBoton ?? 'Continuar al tamizaje'}
        </button>
      </div>
    </section>
  )
}
