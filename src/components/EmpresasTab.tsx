import { useEffect, useMemo, useState } from 'react'
import * as adminApi from '../auth/adminApi'
import type { EmpresaDetalle } from '../auth/adminApi'
import { AuthError } from '../auth/types'

/**
 * Lista de empresas y ficha individual. No pide nada nuevo al backend:
 * `/admin/empresas` ya devuelve, por empresa, el perfil, el tamizaje de
 * su ciclo más reciente y el estado vigente de cada formato. La ficha
 * solo reorganiza esa fila; así la lista y el detalle no pueden
 * desincronizarse ni hay un segundo viaje que pueda fallar.
 */

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

function siNo(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v ? 'Sí' : 'No'
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

function FichaEmpresa({ e, onVolver }: { e: EmpresaDetalle; onVolver: () => void }) {
  const sinCiclo = e.anio === null
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
            </div>
          </div>
        </header>

        <div className="detalle-tarjetas">
          <div className="tarjeta">
            <span>Año del ciclo</span>
            <strong>{texto(e.anio)}</strong>
          </div>
          <div className="tarjeta">
            <span>Tamaño</span>
            <strong>{texto(e.tamano)}</strong>
          </div>
          <div className="tarjeta">
            <span>Empleados</span>
            <strong>{texto(e.empleados)}</strong>
          </div>
          <div className="tarjeta">
            <span>Registrada</span>
            <strong>{new Date(e.creado_en).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</strong>
          </div>
        </div>

        <section className="detalle-seccion">
          <h3>Identificación</h3>
          <div className="panel-datos">
            <Dato etiqueta="Razón social" valor={e.razon_social} />
            <Dato etiqueta="NIT" valor={`${e.nit}-${e.dv}`} />
            <Dato etiqueta="Sector" valor={texto(e.sector_nombre ?? e.sector_id)} />
            <Dato etiqueta="Código de sector" valor={texto(e.sector_id)} />
            <Dato etiqueta="Municipio" valor={texto(e.municipio)} />
            <Dato etiqueta="Departamento" valor={texto(e.departamento)} />
            <Dato etiqueta="Fecha de registro" valor={formatearFecha(e.creado_en)} />
            <Dato etiqueta="Identificador interno" valor={e.empresa_id} />
          </div>
        </section>

        <section className="detalle-seccion">
          <h3>Tamizaje del ciclo más reciente</h3>
          {sinCiclo ? (
            <p className="detalle-vacio">
              Esta empresa todavía no ha guardado ningún ciclo de tamizaje, así que no hay
              datos de tamaño, empleados ni banderas que mostrar.
            </p>
          ) : (
            <div className="panel-datos">
              <Dato etiqueta="Año" valor={texto(e.anio)} />
              <Dato etiqueta="Tamaño" valor={texto(e.tamano)} />
              <Dato etiqueta="Empleados" valor={texto(e.empleados)} />
              <Dato etiqueta="Áreas de vida" valor={texto(e.areas_de_vida)} />
              <Dato etiqueta="Ciclo previo" valor={siNo(e.ciclo_previo)} />
              <Dato etiqueta="Comunidades étnicas" valor={siNo(e.comunidades_etnicas)} />
              <Dato etiqueta="Consumidor final" valor={siNo(e.consumidor_final)} />
            </div>
          )}
        </section>

        <section className="detalle-seccion">
          <h3>Diagnósticos</h3>
          <ul className="lista-simple">
            <li>
              <strong>ISO 26000</strong>
              <span><ChipDiagnostico estado={e.iso26000_estado} /></span>
            </li>
            <li>
              <strong>Ley 2173</strong>
              <span><ChipDiagnostico estado={e.ley2173_estado} /></span>
            </li>
          </ul>
          <p className="detalle-nota">
            El estado corresponde al diagnóstico más reciente de cada formato dentro del ciclo
            vigente. Un formato puede haber pasado por varios estados a lo largo del tiempo;
            aquí se muestra el actual, no el historial.
          </p>
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
  if (abierta) return <FichaEmpresa e={abierta} onVolver={() => setAbiertaId(null)} />

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
              <th>ISO 26000</th>
              <th>Ley 2173</th>
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
                <td><ChipDiagnostico estado={e.iso26000_estado} /></td>
                <td><ChipDiagnostico estado={e.ley2173_estado} /></td>
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
