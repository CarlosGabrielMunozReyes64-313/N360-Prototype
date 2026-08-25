import type { Tamano, Tamizaje } from '../types'
import { leyAplicable } from '../engine/scoring'

interface Props {
  tamizaje: Tamizaje
  onChange: (t: Tamizaje) => void
  onBack: () => void
  onNext: () => void
}

const TAMANOS: { id: Tamano; nombre: string; rango: string }[] = [
  { id: 'micro', nombre: 'Micro', rango: 'hasta 23.563 UVT' },
  { id: 'pequena', nombre: 'Pequeña', rango: '23.563 a 204.995 UVT' },
  { id: 'mediana', nombre: 'Mediana', rango: '204.995 a 1.736.565 UVT' },
  { id: 'grande', nombre: 'Grande', rango: 'más de 1.736.565 UVT' },
]

function Opciones<T extends string>({ valor, opciones, onPick }: {
  valor: string
  opciones: [T, string][]
  onPick: (v: T) => void
}) {
  return (
    <div className="choice-set">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" className={'choice' + (valor === v ? ' is-on' : '')}
          onClick={() => onPick(v)}>{t}</button>
      ))}
    </div>
  )
}

export function TamizajePaso({ tamizaje, onChange, onBack, onNext }: Props) {
  const set = <K extends keyof Tamizaje>(k: K, v: Tamizaje[K]) => onChange({ ...tamizaje, [k]: v })

  const empleados = Number(tamizaje.empleados)
  const metaValida = tamizaje.empleados !== '' && Number.isFinite(empleados) && empleados > 0
  const listo = Boolean(
    tamizaje.tamano && tamizaje.empleados && tamizaje.areasDeVida &&
    tamizaje.cicloPrevio && tamizaje.comunidadesEtnicas && tamizaje.consumidorFinal,
  )
  const ley = leyAplicable(tamizaje)

  return (
    <section className="card">
      <div className="eyebrow">Paso 02 — Tamizaje</div>
      <h1 className="title">Qué le aplica a su empresa este año</h1>
      <p className="lede">
        Seis preguntas que definen qué formatos se habilitan y cómo se calcula la meta.
        Se responden una vez por ciclo anual.
      </p>

      <div className="grid-2">
        <div className="field field-wide">
          <label>T1 · Tamaño por ingresos brutos anuales del último cierre</label>
          <span className="hint">La clasificación va por ingresos en UVT, no por número de empleados.</span>
          <div className="choice-set">
            {TAMANOS.map((t) => (
              <button key={t.id} type="button" title={t.rango}
                className={'choice' + (tamizaje.tamano === t.id ? ' is-on' : '')}
                onClick={() => set('tamano', t.id)}>{t.nombre}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="emp">T2 · Empleados con contrato vigente al 31 de diciembre pasado</label>
          <input id="emp" inputMode="numeric" value={tamizaje.empleados} placeholder="0"
            onChange={(e) => set('empleados', e.target.value.replace(/\D/g, ''))} />
          {metaValida && (
            <span className="hint">
              Meta mínima Ley 2173: <b>{empleados * 2} individuos</b> por ciclo anual.
            </span>
          )}
        </div>

        <div className="field">
          <label>T3 · ¿Su municipio ya publicó oficialmente sus Áreas de Vida?</label>
          <Opciones valor={tamizaje.areasDeVida}
            opciones={[['si', 'Sí'], ['no', 'No'], ['nose', 'No sé']]}
            onPick={(v) => set('areasDeVida', v)} />
        </div>

        <div className="field">
          <label>T4 · ¿Ejecutó algún ciclo de siembra bajo la Ley 2173 antes?</label>
          <Opciones valor={tamizaje.cicloPrevio}
            opciones={[['si', 'Sí'], ['no', 'No']]} onPick={(v) => set('cicloPrevio', v)} />
          {tamizaje.cicloPrevio === 'no' && (
            <span className="hint">
              Sin ciclos previos el nivel 4 no está disponible: exige mejora continua entre ciclos.
            </span>
          )}
        </div>

        <div className="field">
          <label>T5 · ¿Opera en territorio de comunidades étnicas?</label>
          <Opciones valor={tamizaje.comunidadesEtnicas}
            opciones={[['si', 'Sí'], ['no', 'No']]} onPick={(v) => set('comunidadesEtnicas', v)} />
        </div>

        <div className="field field-wide">
          <label>T6 · ¿Vende directamente a consumidor final?</label>
          <Opciones valor={tamizaje.consumidorFinal}
            opciones={[['si', 'Sí'], ['no', 'No']]} onPick={(v) => set('consumidorFinal', v)} />
          {tamizaje.consumidorFinal === 'no' && (
            <span className="hint">
              La materia 06 quedará marcada como no aplicable y su peso se repartirá entre las demás.
            </span>
          )}
        </div>
      </div>

      {tamizaje.tamano && tamizaje.areasDeVida && (
        <div className={'note' + (ley.exigible ? '' : ' note-gold')}>
          {ley.exigible
            ? <><strong>La Ley 2173 es exigible para su empresa.</strong> Se habilitan los dos formatos.</>
            : <><strong>Formato 02 no exigible por ahora.</strong> {ley.motivo}</>}
        </div>
      )}

      <div className="nav-footer">
        <button className="btn-ghost" onClick={onBack}>← Volver al perfil</button>
        <button className="btn" disabled={!listo} onClick={onNext}>Ver formatos disponibles</button>
      </div>
    </section>
  )
}
