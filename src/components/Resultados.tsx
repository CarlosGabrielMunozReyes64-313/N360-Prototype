import { useMemo, useState } from 'react'
import type { Calificacion, Diagnostico, Perfil, Priorizacion, Puntaje, Tamizaje } from '../types'
import { RSE_EXPRESS } from '../data/rseExpress'
import { CATEGORIAS, etiquetaEtapa } from '../data/escala'
import { nombreCliente, nombreTamano } from '../data/tamizaje'
import {
  alertasInformativas, calificacionDe, evaluar, mapaPracticas, oportunidades, practicasRegistradas,
  sumaPrioridad,
} from '../engine/scoring'
import { Radar } from './Radar'
import { generarInforme } from '../export/pdf'

interface Props {
  perfil: Perfil
  tamizaje: Tamizaje
  diagnostico: Diagnostico
  priorizacion: Priorizacion
  onPriorizacion: (p: Priorizacion) => void
  onBack: () => void
}

const CRITERIOS: { clave: keyof Calificacion; nombre: string; ayuda: string }[] = [
  { clave: 'importancia', nombre: 'Importancia', ayuda: '¿Qué tan relevante es para la empresa y sus grupos de interés?' },
  { clave: 'viabilidad', nombre: 'Viabilidad', ayuda: '¿Qué tan posible es hacerlo con los recursos actuales?' },
  { clave: 'potencial', nombre: 'Potencial de mejora', ayuda: '¿Cuánto puede cambiar si se trabaja?' },
  { clave: 'interes', nombre: 'Interés de la empresa', ayuda: '¿Qué tanto quiere la empresa trabajar en esto?' },
]
const PUNTAJES: { v: Puntaje; t: string }[] = [{ v: 1, t: 'Bajo' }, { v: 2, t: 'Medio' }, { v: 3, t: 'Alto' }]

/**
 * Resultado para la empresa (secciones 6.3 y 7 del protocolo): un mapa de
 * prácticas actuales, fortalezas y oportunidades, y la matriz de
 * priorización. No se muestra un puntaje de cumplimiento.
 */
export function Resultados({ perfil, tamizaje, diagnostico, priorizacion, onPriorizacion, onBack }: Props) {
  const [generando, setGenerando] = useState(false)
  const mapa = useMemo(() => mapaPracticas(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje), [diagnostico, perfil.sector, tamizaje])
  const res = useMemo(() => evaluar(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje), [diagnostico, perfil.sector, tamizaje])
  const ops = useMemo(() => oportunidades(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje), [diagnostico, perfil.sector, tamizaje])
  const alertas = useMemo(() => alertasInformativas(RSE_EXPRESS, diagnostico, tamizaje), [diagnostico, tamizaje])
  const registradas = practicasRegistradas(RSE_EXPRESS, diagnostico, tamizaje)

  const practicas = mapa.flatMap((m) => m.aplica ? m.practicas : [])
  const fortalezas = practicas.filter((p) => p.categoria === 'fortaleza')
  const nOportunidad = practicas.filter((p) => p.categoria === 'oportunidad').length
  const propias = practicas.filter((p) => p.categoria === 'diferente').length
  const materiasRadar = res.materias.filter((m) => m.aplica)

  const calificar = (clave: string, criterio: keyof Calificacion, v: Puntaje) => {
    const actual = priorizacion.filas[clave] ?? { importancia: null, viabilidad: null, potencial: null, interes: null }
    onPriorizacion({ ...priorizacion, filas: { ...priorizacion.filas, [clave]: { ...actual, [criterio]: v } } })
  }
  const elegir = (clave: string) => {
    // Al elegir, el interés sugerido queda guardado como respuesta.
    const o = ops.find((x) => x.clave === clave)!
    const c = calificacionDe(o, priorizacion.filas[clave])
    onPriorizacion({ filas: { ...priorizacion.filas, [clave]: c }, elegida: clave })
  }
  const elegida = ops.find((o) => o.clave === priorizacion.elegida) ?? null

  const descargar = async () => {
    setGenerando(true)
    try {
      generarInforme({ perfil, tamizaje, diagnostico, priorizacion })
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="card">
      <div className="eyebrow">Paso 04 — Resultados</div>
      <h1 className="title">Mapa de prácticas de {perfil.razonSocial || 'su empresa'}</h1>
      <p className="lede">
        Este es un mapa de lo que su empresa ya hace, de sus fortalezas y de sus oportunidades para
        seguir avanzando. No es una calificación ni una verificación de cumplimiento: es el punto de
        partida para conversar con NEXUS y elegir un reto.
      </p>
      <p className="rse-contexto">
        {nombreTamano(tamizaje.tamano)} · {tamizaje.personas} personas · Clientes: {nombreCliente(tamizaje.clientes).toLowerCase()}
      </p>

      <div className="rse-resumen">
        <div><strong>{registradas}</strong><span>prácticas que ya realiza</span></div>
        <div><strong>{fortalezas.length}</strong><span>fortalezas</span></div>
        <div><strong>{nOportunidad}</strong><span>temas por empezar o formalizar</span></div>
        {propias > 0 && <div><strong>{propias}</strong><span>prácticas propias que NEXUS revisará</span></div>}
      </div>

      <h2 className="q-section-title">Su punto de partida por materia</h2>
      <div className="rse-mapa-cabeza">
        <div className="rse-radar">
          <Radar dimensiones={materiasRadar} />
          <p className="hint">Mientras más amplia la forma, más avanzada la práctica en esa materia. Es una referencia visual, no un puntaje.</p>
        </div>
        <ul className="rse-materias-resumen">
          {mapa.map((m) => {
            const cat = CATEGORIAS[m.categoria]
            return (
              <li key={m.materia.id}>
                <span className="rse-materia-num">{m.materia.numero}</span>
                <span className="rse-materia-nombre">{m.materia.nombre}</span>
                <span className="rse-badge" style={{ color: cat.color, background: cat.fondo }}>
                  {m.aplica ? cat.nombre : 'No aplica'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <h2 className="q-section-title">Lo que su empresa ya hace</h2>
      <div className="rse-detalle">
        {mapa.filter((m) => m.aplica).map((m) => (
          <details key={m.materia.id} className="rse-materia-detalle">
            <summary>
              <span className="rse-materia-num">{m.materia.numero}</span> {m.materia.nombre}
              <span className="rse-badge" style={{ color: CATEGORIAS[m.categoria].color, background: CATEGORIAS[m.categoria].fondo }}>
                {CATEGORIAS[m.categoria].nombre}
              </span>
            </summary>
            <ul>
              {m.practicas.map((pr) => {
                const cat = CATEGORIAS[pr.categoria]
                return (
                  <li key={pr.pregunta.id} className="rse-practica">
                    <div className="rse-practica-cabeza">
                      <span className="q-id">{pr.pregunta.id}</span>
                      <span className="rse-badge" style={{ color: cat.color, background: cat.fondo }}>
                        {pr.respuesta?.etapa === 'diferente' ? cat.nombre : etiquetaEtapa(pr.respuesta?.etapa, true)}
                      </span>
                    </div>
                    <p className="rse-practica-pregunta">{pr.pregunta.texto}</p>
                    {pr.haceHoy && <p className="rse-practica-texto">{pr.haceHoy}</p>}
                  </li>
                )
              })}
            </ul>
            {m.fortalecer && <p className="rse-fortalecer"><strong>Quiere fortalecer:</strong> {m.fortalecer}</p>}
          </details>
        ))}
      </div>

      {fortalezas.length > 0 && (
        <>
          <h2 className="q-section-title">Sus fortalezas</h2>
          <ul className="rse-fortalezas">
            {fortalezas.map((f) => (
              <li key={f.pregunta.id}>
                <strong>{RSE_EXPRESS.materias.find((m) => m.preguntas.includes(f.pregunta))?.nombre}:</strong>{' '}
                {f.haceHoy || etiquetaEtapa(f.respuesta?.etapa)}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="q-section-title">Matriz de priorización</h2>
      {ops.length === 0 ? (
        <p className="note">
          No encontramos temas en etapa inicial: todas sus prácticas están en revisión y mejora
          continua. En la conversación con NEXUS pueden escoger un tema para ampliar su alcance.
        </p>
      ) : (
        <>
          <p className="rse-texto">
            A partir de sus respuestas le proponemos {ops.length} oportunidades, máximo una por materia.
            Califique cada una de 1 (bajo) a 3 (alto) y elija la que quiere convertir en su reto. La suma
            orienta, pero no reemplaza su decisión: si hay empate, pesa más el interés de la empresa.
          </p>
          <div className="rse-oportunidades">
            {ops.map((o) => {
              const c = calificacionDe(o, priorizacion.filas[o.clave])
              const suma = sumaPrioridad(c)
              const esElegida = priorizacion.elegida === o.clave
              return (
                <article key={o.clave} className={'rse-oportunidad' + (esElegida ? ' is-on' : '')}>
                  <div className="rse-oportunidad-cabeza">
                    <span className="rse-materia-num">{o.materia.numero}</span>
                    <span className="rse-oportunidad-materia">{o.materia.nombre}</span>
                    {o.alertaLegal && <span className="rse-badge rse-badge-legal">Tema con implicaciones legales</span>}
                  </div>
                  <h3 className="rse-oportunidad-titulo">{o.verbo}: {o.oportunidad}</h3>
                  <p className="rse-oportunidad-base"><strong>Lo que hace hoy:</strong> {o.haceHoy}</p>
                  {o.fortalecer && <p className="rse-oportunidad-base"><strong>Lo que quiere fortalecer:</strong> {o.fortalecer}</p>}
                  <details>
                    <summary>Alternativas para conversar con NEXUS</summary>
                    <ul>{o.alternativas.map((a) => <li key={a}>{a}</li>)}</ul>
                  </details>
                  <div className="rse-criterios">
                    {CRITERIOS.map((cr) => (
                      <fieldset key={cr.clave} className="rse-criterio">
                        <legend title={cr.ayuda}>{cr.nombre}</legend>
                        <div className="rse-puntajes">
                          {PUNTAJES.map((p) => (
                            <button key={p.v} type="button" aria-pressed={c[cr.clave] === p.v}
                              aria-label={`${cr.nombre}: ${p.t}`}
                              className={'rse-puntaje' + (c[cr.clave] === p.v ? ' is-on' : '')}
                              onClick={() => calificar(o.clave, cr.clave, p.v)}>
                              {p.v}
                            </button>
                          ))}
                        </div>
                        {cr.clave === 'interes' && o.interesSugerido && priorizacion.filas[o.clave]?.interes == null && (
                          <span className="hint">Sugerido por lo que escribió</span>
                        )}
                      </fieldset>
                    ))}
                  </div>
                  <div className="rse-oportunidad-pie">
                    <span className="rse-suma">Prioridad: <strong>{suma ?? '—'}</strong>{suma !== null && ' / 12'}</span>
                    <button type="button" className={esElegida ? 'btn btn-sm' : 'btn-ghost btn-sm'}
                      aria-pressed={esElegida} onClick={() => elegir(o.clave)}>
                      {esElegida ? '✓ Oportunidad elegida' : 'Elegir esta oportunidad'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          {elegida && (
            <div className="note note-gold">
              <strong>Siguiente paso:</strong> con NEXUS convertirán «{elegida.verbo.toLowerCase()} {elegida.oportunidad}» en
              un reto («¿Cómo podríamos…?») y un microproyecto de 4 a 8 semanas, con un responsable y un
              indicador sencillo.
            </div>
          )}
        </>
      )}

      {alertas.length > 0 && (
        <>
          <h2 className="q-section-title">Alertas informativas</h2>
          {alertas.map((a) => (
            <div key={a.id} className="rse-alerta">
              <strong>{a.titulo}</strong>
              <p>{a.detalle}</p>
            </div>
          ))}
        </>
      )}

      <details className="method">
        <summary>Cómo se construyó este mapa</summary>
        <div className="method-body">
          <p>
            Cada pregunta combina lo que usted contó con la etapa que eligió. «Lo aplicamos y vemos
            resultados» y «Lo revisamos y mejoramos» se muestran como fortalezas; «Lo tenemos
            organizado», como prácticas en desarrollo; «Aún no lo hemos abordado» y «Estamos
            comenzando», como oportunidades. «No aplica» sale del análisis sin contar como cero, y las
            prácticas propias («Hacemos algo diferente») las revisa el equipo NEXUS.
          </p>
          <p>
            Las oportunidades se ordenan dando prioridad a los temas con implicaciones legales en
            etapa inicial y a donde hay más camino por recorrer, con una por materia. Los temas
            legales se presentan como orientación, no como sanción: este autodiagnóstico no
            verifica cumplimiento ni reemplaza una asesoría jurídica.
          </p>
        </div>
      </details>

      <div className="nav-footer">
        <button className="btn-ghost" onClick={onBack}>← Volver al autodiagnóstico</button>
        <button className="btn-dark" onClick={descargar} disabled={generando}>
          {generando ? 'Generando…' : 'Descargar informe (PDF)'}
        </button>
      </div>
    </section>
  )
}
