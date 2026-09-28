import type { RangoIngresos, Tamizaje, TipoCliente, Vinculacion, Zona } from '../types'
import {
  CLIENTES, PREGUNTAS_TAMIZAJE, RANGOS_INGRESOS, TAMANOS, VINCULACIONES, ZONAS,
  consumidoresAplica, personasValidas, tamizajeCompleto,
} from '../data/tamizaje'

interface Props {
  tamizaje: Tamizaje
  onChange: (t: Tamizaje) => void
  onBack: () => void
  onNext: () => void
  /** Texto del botón principal. Por defecto, el de avance del asistente. */
  textoBoton?: string
  /** Cuenta que venía del instrumento anterior: se explica el cambio. */
  avisoActualizacion?: boolean
}

function alternar<T>(lista: T[], v: T): T[] {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]
}

/**
 * Tamizaje «Conozcamos su empresa» (Anexo 1, T1, T2, T5 y T6). Caracteriza
 * la empresa para ajustar el análisis a su realidad: no pide documentos,
 * cifras en UVT ni fechas de corte.
 */
export function TamizajePaso({ tamizaje: t, onChange, onBack, onNext, textoBoton, avisoActualizacion }: Props) {
  const set = <K extends keyof Tamizaje>(k: K, v: Tamizaje[K]) => onChange({ ...t, [k]: v })
  const listo = tamizajeCompleto(t)
  const personasMal = t.personas !== '' && !personasValidas(t)

  return (
    <section className="card">
      <div className="eyebrow">Paso 02 — Conozcamos su empresa</div>
      <h1 className="title">Cuéntenos un poco de su empresa</h1>
      <p className="lede">
        Cuatro preguntas para entender su realidad y ajustar el análisis a su capacidad. No pedimos
        documentos ni cifras exactas: responda con lo que sabe hoy.
      </p>

      {avisoActualizacion && (
        <div className="note note-gold" role="status">
          <strong>Actualizamos NEXUS 360°: ahora es el Autodiagnóstico RSE Express.</strong>{' '}
          Conservamos los datos de su cuenta y de su empresa (razón social, NIT, sector y ubicación).
          El tamizaje y los diagnósticos anteriores se retiraron porque las preguntas cambiaron:
          le pedimos responder este tamizaje nuevo y el autodiagnóstico, que ahora es más abierto
          y en lenguaje sencillo.
        </div>
      )}

      <div className="rse-tamizaje">
        <fieldset className="field field-wide">
          <legend className="rse-legend"><span className="q-id">T1</span> {PREGUNTAS_TAMIZAJE.T1}</legend>
          <div className="choice-set">
            {TAMANOS.map((x) => (
              <button key={x.id} type="button" aria-pressed={t.tamano === x.id}
                className={'choice' + (t.tamano === x.id ? ' is-on' : '')}
                onClick={() => set('tamano', x.id)}>
                {x.nombre}
              </button>
            ))}
          </div>
          <label htmlFor="ingresos" className="rse-sublabel">
            {PREGUNTAS_TAMIZAJE.T1b} <span className="rse-opcional">(opcional)</span>
          </label>
          <select id="ingresos" value={t.ingresos}
            onChange={(e) => set('ingresos', e.target.value as RangoIngresos | '')}>
            <option value="">Sin indicar</option>
            {RANGOS_INGRESOS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend"><span className="q-id">T2</span> {PREGUNTAS_TAMIZAJE.T2}</legend>
          <label htmlFor="personas" className="rse-sublabel">Número de personas</label>
          <input id="personas" inputMode="numeric" value={t.personas} placeholder="Ej.: 18"
            className="rse-numero" aria-invalid={personasMal}
            onChange={(e) => set('personas', e.target.value.replace(/\D/g, '').slice(0, 7))} />
          <span className="rse-sublabel">¿Cómo están vinculadas? Marque todas las que apliquen.</span>
          <div className="rse-ejemplos">
            {VINCULACIONES.map((v) => {
              const on = t.vinculacion.includes(v.id)
              return (
                <label key={v.id} className={'rse-chip' + (on ? ' is-on' : '')}>
                  <input type="checkbox" checked={on}
                    onChange={() => set('vinculacion', alternar<Vinculacion>(t.vinculacion, v.id))} />
                  {v.nombre}
                </label>
              )
            })}
          </div>
          <input aria-label="Detalle de la vinculación (opcional)" value={t.vinculacionDetalle} maxLength={1000}
            placeholder="Si quiere, cuéntenos más (por ejemplo: 4 personas por temporada de cosecha)"
            onChange={(e) => set('vinculacionDetalle', e.target.value)} />
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend"><span className="q-id">T5</span> {PREGUNTAS_TAMIZAJE.T5}</legend>
          <span className="rse-sublabel">Ejemplos (marque los que apliquen)</span>
          <div className="rse-ejemplos">
            {ZONAS.map((z) => {
              const on = t.zonas.includes(z.id)
              return (
                <label key={z.id} className={'rse-chip' + (on ? ' is-on' : '')}>
                  <input type="checkbox" checked={on}
                    onChange={() => set('zonas', alternar<Zona>(t.zonas, z.id))} />
                  {z.nombre}
                </label>
              )
            })}
          </div>
          <textarea className="rse-textarea" rows={2} maxLength={2000} value={t.territorio}
            aria-label="Lugares y vecinos cercanos"
            placeholder="Por ejemplo: planta en la vereda El Tiple de Candelaria, cerca de una escuela y de un cultivo vecino"
            onChange={(e) => set('territorio', e.target.value)} />
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend"><span className="q-id">T6</span> {PREGUNTAS_TAMIZAJE.T6}</legend>
          <div className="choice-set">
            {CLIENTES.map((c) => (
              <button key={c.id} type="button" aria-pressed={t.clientes === c.id}
                className={'choice' + (t.clientes === c.id ? ' is-on' : '')}
                onClick={() => set('clientes', c.id as TipoCliente)}>
                {c.nombre}
              </button>
            ))}
          </div>
          <textarea className="rse-textarea" rows={2} maxLength={1000} value={t.clientesDetalle}
            aria-label="Cuéntenos brevemente sobre sus clientes"
            placeholder="Cuéntenos brevemente (opcional)"
            onChange={(e) => set('clientesDetalle', e.target.value)} />
          {t.clientes && !consumidoresAplica(t) && (
            <span className="hint">
              Como no vende principalmente a personas u hogares, no le haremos las preguntas de la
              materia Consumidores.
            </span>
          )}
        </fieldset>
      </div>

      <div className="nav-footer">
        <button className="btn-ghost" onClick={onBack}>← Volver al perfil</button>
        <button className="btn" disabled={!listo} onClick={onNext}>
          {textoBoton ?? 'Continuar al autodiagnóstico'}
        </button>
      </div>
    </section>
  )
}
