import type { Perfil, SectorId } from '../types'
import { SECTORES } from '../data/formato01'

interface Props {
  perfil: Perfil
  onChange: (p: Perfil) => void
  onNext: () => void
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

export function PerfilPaso({ perfil, onChange, onNext }: Props) {
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => onChange({ ...perfil, [k]: v })

  const dvEsperado = calcularDV(perfil.nit)
  const dvMal = perfil.dv !== '' && dvEsperado !== null && perfil.dv !== dvEsperado
  const listo = Boolean(perfil.razonSocial && perfil.nit && perfil.sector && perfil.municipio) && !dvMal

  return (
    <section className="card">
      <div className="eyebrow">Paso 01 — Perfil</div>
      <h1 className="title">Datos de la empresa</h1>
      <p className="lede">
        Solo datos que no cambian solos. El número de empleados y el tamaño por ingresos
        se preguntan en el tamizaje, porque son datos de un año concreto.
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
            <input id="nit" value={perfil.nit} inputMode="numeric" placeholder="900123456"
              onChange={(e) => set('nit', e.target.value.replace(/\D/g, ''))} />
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
          <span className="hint">Define el peso de cada materia en el Formato 01.</span>
        </div>

        <div className="field">
          <label htmlFor="mun">Municipio</label>
          <input id="mun" value={perfil.municipio} placeholder="Pasto"
            onChange={(e) => set('municipio', e.target.value)} />
          <span className="hint">Determina si la Ley 2173 ya es exigible.</span>
        </div>

        <div className="field">
          <label htmlFor="dep">Departamento</label>
          <input id="dep" value={perfil.departamento} placeholder="Nariño"
            onChange={(e) => set('departamento', e.target.value)} />
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
          {perfil.extranjera && (
            <span className="hint">
              No podrá cumplir la Ley 2173 en modalidad de asocio con otras empresas.
            </span>
          )}
        </div>
      </div>

      <div className="note">
        Este prototipo arranca en el perfil. El acceso con cuenta va antes y se
        integra aparte; los datos no se conservan al recargar la página.
      </div>

      <div className="nav-footer">
        <span className="progress-text">Los campos marcados alimentan el cálculo</span>
        <button className="btn" disabled={!listo} onClick={onNext}>Continuar al tamizaje</button>
      </div>
    </section>
  )
}
