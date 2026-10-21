import { useState } from 'react'
import type { Lugar, RangoIngresos, Tamizaje, TipoCliente, Vecino, Vinculacion } from '../types'
import {
  CLIENTES, LUGARES, PREGUNTAS_TAMIZAJE, RANGOS_INGRESOS, TAMANOS, VECINOS, VINCULACIONES,
  alternarVecino, consumidoresAplica, lugaresRespondidos, personasValidas, tamizajeCompleto,
  vecinosRespondidos,
} from '../data/tamizaje'
import { Ayuda, TextoConGlosario } from './Ayuda'

const AYUDA_INGRESOS = 'Todo el dinero que la empresa recibe en un año por sus ventas o servicios, antes de descontar gastos e impuestos. Si no lo sabe o prefiere no decirlo, déjelo sin indicar.'

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

/** Tamizaje que ya estaba completo salvo T5b: viene de antes de dividir
 * la pregunta T5 en dos. */
function soloFaltaT5b(t: Tamizaje): boolean {
  return Boolean(
    t.tamano && personasValidas(t) && t.vinculacion.length > 0 && t.clientes &&
    lugaresRespondidos(t) && !vecinosRespondidos(t),
  )
}

/**
 * Tamizaje «Conozcamos su empresa» (Anexo 1, T1, T2, T5a, T5b y T6).
 * Caracteriza la empresa para ajustar el análisis a su realidad: no pide
 * documentos, cifras en UVT ni fechas de corte. Cada opción explica qué
 * significa al pasar el mouse.
 */
export function TamizajePaso({ tamizaje: t, onChange, onBack, onNext, textoBoton, avisoActualizacion }: Props) {
  const set = <K extends keyof Tamizaje>(k: K, v: Tamizaje[K]) => onChange({ ...t, [k]: v })
  const listo = tamizajeCompleto(t)
  const personasMal = t.personas !== '' && !personasValidas(t)
  // Se decide al abrir el paso: no debe aparecer a mitad de camino a quien
  // está llenando el tamizaje por primera vez.
  const [avisoT5b] = useState(() => soloFaltaT5b(t))

  return (
    <section className="card">
      <div className="eyebrow">Paso 02 — Conozcamos su empresa</div>
      <h1 className="title">Cuéntenos un poco de su empresa</h1>
      <p className="lede">
        Cinco preguntas para entender su realidad y ajustar el análisis a su capacidad. No pedimos
        documentos ni cifras exactas: responda con lo que sabe hoy.
      </p>
      <p className="rse-pista">
        Pase el mouse (o toque) sobre las opciones y las palabras subrayadas para ver qué significan.
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
      {!avisoActualizacion && avisoT5b && (
        <div className="note" role="status">
          <strong>Separamos una pregunta en dos.</strong>{' '}
          Conservamos sus respuestas. Solo le falta contarnos qué comunidades o vecinos están cerca
          de su operación (pregunta T5b).
        </div>
      )}

      <div className="rse-tamizaje">
        <fieldset className="field field-wide">
          <legend className="rse-legend">
            <span className="q-id">T1</span> <span>{PREGUNTAS_TAMIZAJE.T1}</span>
          </legend>
          <div className="choice-set">
            {TAMANOS.map((x) => (
              <Ayuda key={x.id} texto={x.ayuda}>
                <button type="button" aria-pressed={t.tamano === x.id}
                  className={'choice' + (t.tamano === x.id ? ' is-on' : '')}
                  onClick={() => set('tamano', x.id)}>
                  {x.nombre}
                </button>
              </Ayuda>
            ))}
          </div>
          <Ayuda texto={AYUDA_INGRESOS} alEnfocar={false}>
            <label htmlFor="ingresos" className="rse-sublabel">
              <span className="termino-sin-foco">{PREGUNTAS_TAMIZAJE.T1b}</span>{' '}
              <span className="rse-opcional">(opcional)</span>
            </label>
            <select id="ingresos" value={t.ingresos}
              onChange={(e) => set('ingresos', e.target.value as RangoIngresos | '')}>
              <option value="">Sin indicar</option>
              {RANGOS_INGRESOS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </Ayuda>
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend">
            <span className="q-id">T2</span> <span><TextoConGlosario texto={PREGUNTAS_TAMIZAJE.T2} /></span>
          </legend>
          <label htmlFor="personas" className="rse-sublabel">Número de personas</label>
          <input id="personas" inputMode="numeric" value={t.personas} placeholder="Ej.: 18"
            className="rse-numero" aria-invalid={personasMal}
            onChange={(e) => set('personas', e.target.value.replace(/\D/g, '').slice(0, 7))} />
          <span className="rse-sublabel">¿Cómo están vinculadas? Marque todas las que apliquen.</span>
          <div className="rse-ejemplos">
            {VINCULACIONES.map((v) => {
              const on = t.vinculacion.includes(v.id)
              return (
                <Ayuda key={v.id} texto={v.ayuda}>
                  <label className={'rse-chip' + (on ? ' is-on' : '')}>
                    <input type="checkbox" checked={on}
                      onChange={() => set('vinculacion', alternar<Vinculacion>(t.vinculacion, v.id))} />
                    {v.nombre}
                  </label>
                </Ayuda>
              )
            })}
          </div>
          <input aria-label="Detalle de la vinculación (opcional)" value={t.vinculacionDetalle} maxLength={1000}
            placeholder="Si quiere, cuéntenos más (por ejemplo: 4 personas por temporada de cosecha)"
            onChange={(e) => set('vinculacionDetalle', e.target.value)} />
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend">
            <span className="q-id">T5a</span> <span>{PREGUNTAS_TAMIZAJE.T5a}</span>
          </legend>
          <span className="rse-sublabel">Marque todos los que apliquen</span>
          <div className="rse-ejemplos">
            {LUGARES.map((z) => {
              const on = t.zonas.includes(z.id)
              return (
                <Ayuda key={z.id} texto={z.ayuda}>
                  <label className={'rse-chip' + (on ? ' is-on' : '')}>
                    <input type="checkbox" checked={on}
                      onChange={() => set('zonas', alternar<Lugar | Vecino>(t.zonas, z.id))} />
                    {z.nombre}
                  </label>
                </Ayuda>
              )
            })}
          </div>
          <textarea className="rse-textarea" rows={2} maxLength={2000} value={t.territorio}
            aria-label="Lugares donde desarrolla su actividad"
            placeholder="Por ejemplo: planta en la vereda El Tiple de Candelaria y un punto de venta en el centro de Palmira"
            onChange={(e) => set('territorio', e.target.value)} />
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend">
            <span className="q-id">T5b</span> <span><TextoConGlosario texto={PREGUNTAS_TAMIZAJE.T5b} /></span>
          </legend>
          <span className="rse-sublabel">Marque todos los que apliquen</span>
          <div className="rse-ejemplos">
            {VECINOS.map((z) => {
              const on = t.zonas.includes(z.id)
              return (
                <Ayuda key={z.id} texto={z.ayuda}>
                  <label className={'rse-chip' + (on ? ' is-on' : '')}>
                    <input type="checkbox" checked={on}
                      onChange={() => set('zonas', alternarVecino(t.zonas, z.id))} />
                    {z.nombre}
                  </label>
                </Ayuda>
              )
            })}
          </div>
          <textarea className="rse-textarea" rows={2} maxLength={2000} value={t.vecinos}
            aria-label="Comunidades o vecinos cercanos"
            placeholder="Por ejemplo: a dos cuadras hay una escuela rural y alrededor hay cultivos de caña de familias campesinas"
            onChange={(e) => set('vecinos', e.target.value)} />
        </fieldset>

        <fieldset className="field field-wide">
          <legend className="rse-legend">
            <span className="q-id">T6</span> <span>{PREGUNTAS_TAMIZAJE.T6}</span>
          </legend>
          <div className="choice-set">
            {CLIENTES.map((c) => (
              <Ayuda key={c.id} texto={c.ayuda}>
                <button type="button" aria-pressed={t.clientes === c.id}
                  className={'choice' + (t.clientes === c.id ? ' is-on' : '')}
                  onClick={() => set('clientes', c.id as TipoCliente)}>
                  {c.nombre}
                </button>
              </Ayuda>
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
