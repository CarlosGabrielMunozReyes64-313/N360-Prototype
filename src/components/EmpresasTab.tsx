import { useEffect, useMemo, useState } from 'react'
import * as adminApi from '../auth/adminApi'
import type { EmpresaDetalle } from '../auth/adminApi'
import type { EmpresaMia } from '../auth/empresaApi'
import { diagnosticoDesdeApi, etapaDesdeApi, priorizacionDesdeApi, tamizajeDesdeApi } from '../auth/empresaApi'
import { AuthError } from '../auth/types'
import type { RangoIngresos, SectorId, Tamano, TipoCliente } from '../types'
import { RSE_EXPRESS } from '../data/rseExpress'
import { ETAPAS, clasificar, etiquetaEtapa } from '../data/escala'
import {
  nombreCliente, nombreIngresos, nombreTamano, nombresVinculacion, nombresZonas,
} from '../data/tamizaje'
import { calificacionDe, evaluar, oportunidades, sumaPrioridad } from '../engine/scoring'

/**
 * Lista de empresas y ficha individual. La lista sale de `/admin/empresas`
 * (perfil, tamizaje vigente y avance del autodiagnóstico). La ficha pide
 * además `/admin/empresas/{id}/diagnostico` para leer las respuestas
 * abiertas y clasificar las «Hacemos algo diferente».
 */
const TOTAL_PREGUNTAS = RSE_EXPRESS.materias.reduce((n, m) => n + m.preguntas.length, 0)

const NOMBRES_ESTADO: Record<string, string> = {
  borrador: 'En borrador',
  completado: 'Completado',
  archivado: 'Archivado',
}

function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2)
  return partes.map((p) => p[0] ?? '').join('').toUpperCase() || '?'
}

function texto(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

/** Chip del estado de un diagnóstico. `null` no es un error: significa
 * que ese formato todavía no se abrió en el ciclo vigente. */
function ChipDiagnostico({ estado }: { estado: string | null }) {
  if (!estado) return <span className="chip-estado chip-estado--inactiva">Sin iniciar</span>
  const clase =
    estado === 'completado' ? 'chip-estado--activa'
      : estado === 'borrador' ? 'chip-estado--bloqueada'
        : 'chip-estado--inactiva'
  return <span className={`chip-estado ${clase}`}>{NOMBRES_ESTADO[estado] ?? estado}</span>
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  )
}

function FichaEmpresa({ e, token, onVolver, onCambio }: {
  e: EmpresaDetalle
  token: string
  onVolver: () => void
  onCambio: () => void
}) {
  const sinTamizaje = e.anio === null
  const [datos, setDatos] = useState<EmpresaMia | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    adminApi.obtenerDiagnosticoEmpresa(token, e.empresa_id)
      .then((d) => { if (vivo) setDatos(d) })
      .catch((err) => { if (vivo) setError(err instanceof AuthError ? err.message : 'No se pudo cargar el autodiagnóstico.') })
    return () => { vivo = false }
  }, [token, e.empresa_id])

  const clasificarRespuesta = async (respuestaId: string, codigo: string, valor: number | null) => {
    setGuardando(codigo)
    try {
      const r = await adminApi.clasificarRespuesta(token, respuestaId, valor)
      setDatos((d) => {
        if (!d?.diagnostico) return d
        const actual = d.diagnostico.respuestas[codigo]
        return {
          ...d,
          diagnostico: {
            ...d.diagnostico,
            respuestas: { ...d.diagnostico.respuestas, [codigo]: { ...actual, clasificada: r.clasificada, clasificado_en: r.clasificado_en } },
          },
        }
      })
      onCambio()
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No se pudo guardar la clasificación.')
    } finally {
      setGuardando(null)
    }
  }

  const diag = diagnosticoDesdeApi(datos?.diagnostico ?? null)
  const tam = tamizajeDesdeApi(datos?.tamizaje ?? null)
  const lectura = diag ? evaluar(RSE_EXPRESS, diag, e.sector_id as SectorId, tam) : null
  const prior = priorizacionDesdeApi(datos?.diagnostico ?? null)
  const ops = diag ? oportunidades(RSE_EXPRESS, diag, e.sector_id as SectorId, tam) : []

  return (
    <>
      <button type="button" className="btn-volver" onClick={onVolver}>
        ← Volver a la lista
      </button>

      <div className="detalle">
        <header className="detalle-cabecera">
          <span className="avatar avatar--lg">{iniciales(e.razon_social)}</span>
          <div style={{ minWidth: 0 }}>
            <h2>{e.razon_social}</h2>
            <p className="detalle-email">NIT {e.nit}-{e.dv}</p>
            <div className="panel-chips">
              <span className="chip-rol">{texto(e.sector_nombre ?? e.sector_id)}</span>
              <span className="chip-rol">{texto(e.municipio)}</span>
              {e.perfil_piloto !== null && (
                <span className={'chip-estado ' + (e.perfil_piloto ? 'chip-estado--activa' : 'chip-estado--inactiva')}>
                  {e.perfil_piloto ? 'Perfil del piloto (10–50 personas)' : 'Fuera del perfil del piloto'}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="detalle-tarjetas">
          <div className="tarjeta">
            <span>Tamaño</span>
            <strong>{sinTamizaje ? '—' : nombreTamano(e.tamano as Tamano)}</strong>
          </div>
          <div className="tarjeta">
            <span>Personas</span>
            <strong>{texto(e.personas)}</strong>
          </div>
          <div className="tarjeta">
            <span>Respuestas con etapa</span>
            <strong>{e.respuestas_con_etapa} / {TOTAL_PREGUNTAS}</strong>
          </div>
          <div className="tarjeta">
            <span>Prácticas registradas</span>
            <strong>{e.practicas_registradas}</strong>
          </div>
        </div>

        <section className="detalle-seccion">
          <h3>Identificación</h3>
          <div className="panel-datos">
            <Dato etiqueta="Razón social" valor={e.razon_social} />
            <Dato etiqueta="NIT" valor={`${e.nit}-${e.dv}`} />
            <Dato etiqueta="Sector" valor={texto(e.sector_nombre ?? e.sector_id)} />
            <Dato etiqueta="Municipio" valor={texto(e.municipio)} />
            <Dato etiqueta="Departamento" valor={texto(e.departamento)} />
            <Dato etiqueta="Fecha de registro" valor={formatearFecha(e.creado_en)} />
            <Dato etiqueta="Identificador interno" valor={e.empresa_id} />
          </div>
        </section>

        <section className="detalle-seccion">
          <h3>Tamizaje «Conozcamos su empresa»</h3>
          {sinTamizaje ? (
            <p className="detalle-vacio">
              Esta empresa todavía no responde el tamizaje nuevo. Si venía del instrumento
              anterior, se le pedirá al volver a entrar; sus datos de cuenta se conservaron.
            </p>
          ) : (
            <div className="panel-datos">
              <Dato etiqueta="T1 · Tamaño" valor={nombreTamano(e.tamano as Tamano)} />
              <Dato etiqueta="T1 · Ingresos anuales" valor={e.ingresos_rango ? nombreIngresos(e.ingresos_rango as RangoIngresos) : 'Sin indicar'} />
              <Dato etiqueta="T2 · Personas" valor={texto(e.personas)} />
              <Dato etiqueta="T2 · Vinculación" valor={nombresVinculacion(e.vinculacion)} />
              <Dato etiqueta="T2 · Detalle" valor={texto(e.vinculacion_detalle)} />
              <Dato etiqueta="T5 · Lugares" valor={nombresZonas(e.zonas)} />
              <Dato etiqueta="T5 · Territorio y vecinos" valor={texto(e.territorio)} />
              <Dato etiqueta="T6 · Clientes" valor={e.clientes ? nombreCliente(e.clientes as TipoCliente) : '—'} />
              <Dato etiqueta="T6 · Detalle" valor={texto(e.clientes_detalle)} />
            </div>
          )}
        </section>

        <section className="detalle-seccion">
          <h3>Autodiagnóstico RSE Express <ChipDiagnostico estado={e.diagnostico_estado} /></h3>
          {error && <p className="detalle-vacio" role="alert">{error}</p>}
          {!datos && !error && <p className="detalle-vacio">Cargando respuestas…</p>}
          {datos && !diag && <p className="detalle-vacio">Todavía no hay respuestas.</p>}
          {datos?.diagnostico && diag && lectura && (
            <>
              <p className="detalle-nota">
                Lectura interna 0–4 (uso de NEXUS; a la empresa no se le muestra como puntaje):{' '}
                {lectura.score === null ? 'sin datos' : `${lectura.score.toFixed(2)} · ${clasificar(lectura.score).etiqueta}`}
                {' '}· cobertura {Math.round(lectura.cobertura * 100)}%
                {lectura.pendientes > 0 && ` · ${lectura.pendientes} por clasificar`}
              </p>
              {RSE_EXPRESS.materias.map((m) => {
                const nodo = lectura.materias.find((x) => x.id === m.id)!
                return (
                  <details key={m.id} className="admin-materia" open={m.preguntas.some((p) => diag.respuestas[p.id]?.etapa === 'diferente')}>
                    <summary>
                      <strong>{m.numero} · {m.nombre}</strong>
                      <span>{!nodo.aplica ? 'No aplica (T6)' : nodo.score === null ? 'sin datos' : `${nodo.score.toFixed(2)} · ${clasificar(nodo.score).etiqueta}`}</span>
                    </summary>
                    <ul className="lista-simple">
                      {m.preguntas.map((p) => {
                        const r = datos.diagnostico!.respuestas[p.id]
                        const etapa = etapaDesdeApi(r?.etapa)
                        return (
                          <li key={p.id}>
                            <strong>{p.id} · {etiquetaEtapa(etapa)}</strong>
                            <span className="admin-pregunta">{p.texto}</span>
                            {r?.texto && <span>{r.texto}</span>}
                            {r && r.ejemplos.length > 0 && <span className="evento-meta">Ejemplos: {r.ejemplos.join(', ')}</span>}
                            {r?.otro && <span className="evento-meta">Algo diferente: {r.otro}</span>}
                            {r && etapa === 'diferente' && (
                              <label className="admin-clasificar">
                                Clasificación NEXUS:{' '}
                                <select value={r.clasificada ?? ''} disabled={guardando === p.id}
                                  onChange={(ev) => clasificarRespuesta(r.respuesta_id, p.id, ev.target.value === '' ? null : Number(ev.target.value))}>
                                  <option value="">Sin clasificar</option>
                                  {ETAPAS.filter((x) => typeof x.valor === 'number').map((x) => (
                                    <option key={String(x.valor)} value={String(x.valor)}>{x.valor} · {x.corta}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    {diag.fortalecer[m.numero] && <p className="detalle-nota"><strong>Quiere fortalecer:</strong> {diag.fortalecer[m.numero]}</p>}
                  </details>
                )
              })}
              {diag.comentarioFinal && (
                <p className="detalle-nota"><strong>Pregunta final:</strong> {diag.comentarioFinal}</p>
              )}
              <h3>Matriz de priorización</h3>
              {ops.length === 0 ? <p className="detalle-vacio">Sin oportunidades en etapa inicial.</p> : (
                <ul className="lista-simple">
                  {ops.map((o) => {
                    const c = calificacionDe(o, prior.filas[o.clave])
                    return (
                      <li key={o.clave}>
                        <strong>{prior.elegida === o.clave ? '★ ' : ''}{o.materia.numero} · {o.verbo}: {o.oportunidad}</strong>
                        <span className="evento-meta">
                          Importancia {c.importancia ?? '—'} · Viabilidad {c.viabilidad ?? '—'} · Potencial {c.potencial ?? '—'} · Interés {c.interes ?? '—'} · Prioridad {sumaPrioridad(c) ?? '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}

export function EmpresasTab({ token }: { token: string }) {
  const [empresas, setEmpresas] = useState<EmpresaDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  // Se guarda el id y no el objeto: al recargar la lista, la ficha abierta
  // muestra los datos nuevos y no una copia vieja.
  const [abiertaId, setAbiertaId] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    adminApi.listarEmpresasDetalle(token)
      .then(setEmpresas)
      .catch((e) => setError(e instanceof AuthError ? e.message : 'No se pudo cargar la lista.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  const filtro = busqueda.trim().toLowerCase()
  const visibles = useMemo(() => {
    if (!filtro) return empresas
    return empresas.filter((e) =>
      e.razon_social.toLowerCase().includes(filtro)
      || e.nit.includes(filtro)
      || e.municipio.toLowerCase().includes(filtro)
      || (e.sector_nombre ?? '').toLowerCase().includes(filtro))
  }, [empresas, filtro])

  const abierta = empresas.find((e) => e.empresa_id === abiertaId) ?? null

  if (error) return <div className="auth-error" role="alert">{error}</div>
  if (abierta) return <FichaEmpresa e={abierta} token={token} onVolver={() => setAbiertaId(null)} onCambio={cargar} />

  return (
    <div className="admin-tabla-wrap">
      <div className="tabla-barra">
        <input
          type="search" className="buscador"
          placeholder="Buscar por razón social, NIT, municipio o sector"
          value={busqueda} onChange={(ev) => setBusqueda(ev.target.value)}
        />
        <button type="button" className="btn-ghost btn-sm" onClick={cargar}>Actualizar</button>
      </div>

      {cargando ? (
        <p className="tabla-vacia">Cargando empresas…</p>
      ) : empresas.length === 0 ? (
        <p className="tabla-vacia">Todavía no hay empresas registradas.</p>
      ) : visibles.length === 0 ? (
        <p className="tabla-vacia">No hay empresas que coincidan.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Sector</th>
              <th>Municipio</th>
              <th>Autodiagnóstico</th>
              <th>Por clasificar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => (
              <tr key={e.empresa_id}>
                <td className="celda-empresa">
                  <div className="celda-usuario">
                    <span className="avatar">{iniciales(e.razon_social)}</span>
                    <div className="celda-usuario-texto">
                      <strong>{e.razon_social}</strong>
                      <span>NIT {e.nit}-{e.dv}</span>
                    </div>
                  </div>
                </td>
                <td className="celda-truncada">{texto(e.sector_nombre ?? e.sector_id)}</td>
                <td>{texto(e.municipio)}</td>
                <td>
                  <ChipDiagnostico estado={e.anio === null ? null : e.diagnostico_estado} />
                  {e.anio === null
                    ? <span className="evento-meta"> Sin tamizaje</span>
                    : <span className="evento-meta"> {e.respuestas_con_etapa}/{TOTAL_PREGUNTAS}</span>}
                </td>
                <td>{e.pendientes_clasificar > 0 ? <strong>{e.pendientes_clasificar}</strong> : '—'}</td>
                <td className="celda-accion">
                  <button
                    type="button" className="btn-ghost btn-sm"
                    onClick={() => setAbiertaId(e.empresa_id)}
                  >
                    Ver datos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
