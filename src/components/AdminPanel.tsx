import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AuthError } from '../auth/types'
import * as adminApi from '../auth/adminApi'
import { EstadisticasTab } from './EstadisticasTab'
import type {
  UsuarioAdmin, ResumenSesiones, ActividadUsuario, MotivoCierre,
} from '../auth/adminApi'
import './admin-panel.css'

type Pestana = 'usuarios' | 'sesiones' | 'estadisticas'

export function AdminPanel() {
  const { usuario, token, logout } = useAuth()
  const [pestana, setPestana] = useState<Pestana>('usuarios')

  if (!usuario || !token) return null

  return (
    <div className="admin-pagina">
      <header className="admin-header">
        <div>
          <div className="brand-name">NEXUS 360°</div>
          <div className="brand-sub">Panel de administración</div>
        </div>
        <div className="sesion-tag">
          <span>Admin: <strong>{usuario.nombre}</strong></span>
          <button type="button" className="btn-ghost btn-sm" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          type="button"
          className={'admin-tab' + (pestana === 'usuarios' ? ' is-on' : '')}
          onClick={() => setPestana('usuarios')}
        >
          Usuarios
        </button>
        <button
          type="button"
          className={'admin-tab' + (pestana === 'sesiones' ? ' is-on' : '')}
          onClick={() => setPestana('sesiones')}
        >
          Actividad
        </button>
        <button
          type="button"
          className={'admin-tab' + (pestana === 'estadisticas' ? ' is-on' : '')}
          onClick={() => setPestana('estadisticas')}
        >
          Estadísticas
        </button>
      </nav>

      <main className="admin-body">
        {pestana === 'usuarios' && <TablaUsuarios token={token} adminId={usuario.usuario_id} />}
        {pestana === 'sesiones' && <PestanaActividad token={token} />}
        {pestana === 'estadisticas' && <EstadisticasTab token={token} />}
      </main>
    </div>
  )
}

function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2)
  return partes.map((p) => p[0] ?? '').join('').toUpperCase() || '?'
}

function TablaUsuarios({ token, adminId }: { token: string; adminId: string }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [incluirArchivados, setIncluirArchivados] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  // El panel guarda el id, no el objeto: así, al recargar la lista tras una
  // acción, el panel abierto muestra los datos nuevos y no una copia vieja.
  const [gestionandoId, setGestionandoId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    adminApi.listarUsuarios(token, incluirArchivados)
      .then(setUsuarios)
      .catch((e) => setError(e instanceof AuthError ? e.message : 'No se pudo cargar la lista.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token, incluirArchivados])

  const filtro = busqueda.trim().toLowerCase()
  const visibles = filtro
    ? usuarios.filter((u) =>
        u.nombre.toLowerCase().includes(filtro) || u.email.toLowerCase().includes(filtro))
    : usuarios

  const gestionado = usuarios.find((u) => u.usuario_id === gestionandoId) ?? null

  return (
    <>
      <div className="admin-tabla-wrap">
        <div className="tabla-barra">
          <input
            type="search" className="buscador" placeholder="Buscar por nombre o correo"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          />
          <label className="filtro-check">
            <input
              type="checkbox"
              checked={incluirArchivados}
              onChange={(e) => { setAviso(null); setIncluirArchivados(e.target.checked) }}
            />
            Mostrar eliminadas
          </label>
          <button type="button" className="btn-ghost btn-sm" onClick={cargar}>Actualizar</button>
        </div>

        {aviso && <div className="barra-aviso" role="status">{aviso}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}

        {cargando ? (
          <p className="tabla-vacia">Cargando usuarios…</p>
        ) : visibles.length === 0 ? (
          <p className="tabla-vacia">No hay usuarios que coincidan.</p>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const bloqueada = Boolean(u.bloqueado_hasta) || u.intentos_fallidos >= 5
                const eliminada = Boolean(u.archivado_en)
                return (
                  <tr
                    key={u.usuario_id}
                    className={
                      (eliminada ? 'fila-eliminada' : bloqueada ? 'fila-bloqueada' : '') +
                      (u.usuario_id === gestionandoId ? ' fila-activa' : '')
                    }
                  >
                    <td>
                      <div className="celda-usuario">
                        <span className={'avatar' + (u.rol === 'admin' ? ' avatar--admin' : '')}>
                          {iniciales(u.nombre)}
                        </span>
                        <div className="celda-usuario-texto">
                          <strong>{u.nombre}</strong>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={'chip-rol' + (u.rol === 'admin' ? ' chip-rol--admin' : '')}>{u.rol}</span>
                    </td>
                    <td><EstadoChip u={u} /></td>
                    <td className="celda-fecha">{formatearFecha(u.ultimo_login_en)}</td>
                    <td className="celda-accion">
                      <button
                        type="button" className="btn-ghost btn-sm"
                        onClick={() => { setAviso(null); setGestionandoId(u.usuario_id) }}
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {gestionado && (
        <PanelUsuario
          u={gestionado}
          token={token}
          adminId={adminId}
          onCerrar={() => setGestionandoId(null)}
          onCambio={cargar}
          onAviso={setAviso}
        />
      )}
    </>
  )
}

function EstadoChip({ u }: { u: UsuarioAdmin }) {
  const bloqueada = Boolean(u.bloqueado_hasta) || u.intentos_fallidos >= 5
  if (u.archivado_en) return <span className="chip-estado chip-estado--eliminada">Eliminada</span>
  if (!u.activo) return <span className="chip-estado chip-estado--inactiva">Inactiva</span>
  if (bloqueada) return <span className="chip-estado chip-estado--bloqueada">Bloqueada</span>
  return <span className="chip-estado chip-estado--activa">Activa</span>
}

/**
 * Panel lateral de gestión de una cuenta. Las acciones van apiladas en
 * secciones, no en una fila horizontal dentro de la tabla: así ninguna
 * queda cortada ni obliga a hacer scroll lateral, y hay espacio para
 * explicar qué hace cada una antes de ejecutarla.
 */
function PanelUsuario({
  u, token, adminId, onCerrar, onCambio, onAviso,
}: {
  u: UsuarioAdmin
  token: string
  adminId: string
  onCerrar: () => void
  onCambio: () => void
  onAviso: (mensaje: string | null) => void
}) {
  const [accionando, setAccionando] = useState(false)
  const [errorPanel, setErrorPanel] = useState<string | null>(null)
  const [okPanel, setOkPanel] = useState<string | null>(null)
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  const bloqueada = Boolean(u.bloqueado_hasta) || u.intentos_fallidos >= 5
  const esUnoMismo = u.usuario_id === adminId
  const eliminada = Boolean(u.archivado_en)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmandoBorrado) setConfirmandoBorrado(false)
      else onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [confirmandoBorrado, onCerrar])

  const ejecutar = async (accion: () => Promise<unknown>, mensajeOk: string) => {
    setAccionando(true)
    setErrorPanel(null)
    setOkPanel(null)
    try {
      await accion()
      setOkPanel(mensajeOk)
      onCambio()
    } catch (e) {
      setErrorPanel(e instanceof AuthError ? e.message : 'No se pudo completar la acción.')
    } finally {
      setAccionando(false)
    }
  }

  const eliminar = async (conservarHistorial: boolean) => {
    setAccionando(true)
    setErrorPanel(null)
    try {
      const r = await adminApi.eliminarUsuario(token, u.usuario_id, conservarHistorial)
      setConfirmandoBorrado(false)
      onAviso(`${u.email}: ${r.mensaje}`)
      onCambio()
      // Si el borrado fue definitivo la cuenta ya no existe: el panel se
      // cierra en vez de quedarse mostrando datos fantasma.
      if (r.modo === 'fisico') onCerrar()
    } catch (e) {
      setErrorPanel(e instanceof AuthError ? e.message : 'No se pudo eliminar la cuenta.')
      setConfirmandoBorrado(false)
    } finally {
      setAccionando(false)
    }
  }

  return (
    <>
      <div className="panel-fondo" onClick={onCerrar} />
      <aside className="panel-lateral" role="dialog" aria-label={`Gestionar ${u.nombre}`}>
        <header className="panel-cabecera">
          <div className="panel-identidad">
            <span className={'avatar avatar--lg' + (u.rol === 'admin' ? ' avatar--admin' : '')}>
              {iniciales(u.nombre)}
            </span>
            <div className="panel-identidad-texto">
              <h2>{u.nombre}</h2>
              <p className="panel-email">{u.email}</p>
              <div className="panel-chips">
                <span className={'chip-rol' + (u.rol === 'admin' ? ' chip-rol--admin' : '')}>{u.rol}</span>
                <EstadoChip u={u} />
              </div>
            </div>
          </div>
          <button type="button" className="panel-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </header>

        <div className="panel-cuerpo">
          {errorPanel && <div className="auth-error" role="alert">{errorPanel}</div>}
          {okPanel && <div className="panel-ok" role="status">{okPanel}</div>}

          <section className="panel-datos">
            <div><span>Registro</span><strong>{formatearFecha(u.creado_en)}</strong></div>
            <div><span>Último login</span><strong>{formatearFecha(u.ultimo_login_en)}</strong></div>
            <div><span>Intentos fallidos</span><strong>{u.intentos_fallidos}</strong></div>
            <div><span>Bloqueada hasta</span><strong>{formatearFecha(u.bloqueado_hasta)}</strong></div>
          </section>

          {eliminada ? (
            <section className="panel-seccion">
              <h3>Cuenta eliminada</h3>
              <p className="panel-ayuda">
                Se archivó el {formatearFecha(u.archivado_en)}. Conserva su historial y su correo
                quedó libre para un registro nuevo. Restaurarla solo es posible si nadie más
                registró ese correo desde entonces.
              </p>
              <button
                type="button" className="btn-panel" disabled={accionando}
                onClick={() => ejecutar(async () => {
                  await adminApi.restaurarUsuario(token, u.usuario_id)
                  onAviso(`${u.email}: cuenta restaurada. Ya puede iniciar sesión de nuevo.`)
                }, 'Cuenta restaurada.')}
              >
                Restaurar cuenta
              </button>
            </section>
          ) : (
            <>
              <section className="panel-seccion">
                <h3>Acceso</h3>
                <p className="panel-ayuda">
                  Desactivar corta el acceso de inmediato y cierra sus sesiones abiertas,
                  pero conserva la cuenta y todos sus datos.
                </p>
                <button
                  type="button" className="btn-panel" disabled={accionando || esUnoMismo}
                  title={esUnoMismo ? 'No puedes desactivar tu propia cuenta' : undefined}
                  onClick={() => ejecutar(
                    () => adminApi.cambiarEstadoUsuario(token, u.usuario_id, !u.activo),
                    u.activo ? 'Cuenta desactivada.' : 'Cuenta activada.',
                  )}
                >
                  {u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                </button>
              </section>

              <section className="panel-seccion">
                <h3>Bloqueo por intentos fallidos</h3>
                <p className="panel-ayuda">
                  {bloqueada
                    ? 'La cuenta está bloqueada. Desbloquear pone el contador en cero.'
                    : 'La cuenta no está bloqueada. El bloqueo se activa solo tras 5 intentos fallidos.'}
                </p>
                <button
                  type="button" className="btn-panel" disabled={accionando || !bloqueada}
                  onClick={() => ejecutar(
                    () => adminApi.desbloquearUsuario(token, u.usuario_id),
                    'Cuenta desbloqueada.',
                  )}
                >
                  Desbloquear
                </button>
              </section>

              <section className="panel-seccion">
                <h3>Rol</h3>
                <p className="panel-ayuda">Un admin ve y gestiona todas las cuentas del sistema.</p>
                <select
                  className="campo-panel"
                  disabled={accionando || esUnoMismo}
                  title={esUnoMismo ? 'No puedes cambiar tu propio rol' : undefined}
                  value={u.rol}
                  onChange={(e) => ejecutar(
                    () => adminApi.cambiarRolUsuario(token, u.usuario_id, e.target.value as 'empresa' | 'admin'),
                    'Rol actualizado.',
                  )}
                >
                  <option value="empresa">empresa</option>
                  <option value="admin">admin</option>
                </select>
              </section>

              <section className="panel-seccion">
                <h3>Contraseña</h3>
                <p className="panel-ayuda">
                  Se cambia sin conocer la actual. Comunícasela por un canal seguro.
                </p>
                <input
                  type="password" className="campo-panel" placeholder="Contraseña nueva (mín. 8)"
                  value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)}
                />
                <button
                  type="button" className="btn-panel"
                  disabled={accionando || passwordNueva.length < 8}
                  onClick={() => ejecutar(
                    () => adminApi.restablecerPasswordUsuario(token, u.usuario_id, passwordNueva)
                      .then(() => setPasswordNueva('')),
                    'Contraseña restablecida.',
                  )}
                >
                  Restablecer contraseña
                </button>
              </section>

              <section className="panel-seccion panel-seccion--peligro">
                <h3>Eliminar cuenta</h3>
                <p className="panel-ayuda">
                  Le quita el acceso de forma permanente y cierra sus sesiones.
                  Si la cuenta no dejó datos, no se puede deshacer.
                </p>
                <button
                  type="button" className="btn-panel btn-panel--peligro"
                  disabled={accionando || esUnoMismo}
                  title={esUnoMismo ? 'No puedes eliminar tu propia cuenta' : undefined}
                  onClick={() => { setErrorPanel(null); setConfirmandoBorrado(true) }}
                >
                  Eliminar cuenta
                </button>
              </section>
            </>
          )}
        </div>
      </aside>

      {confirmandoBorrado && (
        <DialogoEliminar
          u={u}
          ocupado={accionando}
          onCancelar={() => setConfirmandoBorrado(false)}
          onConfirmar={eliminar}
        />
      )}
    </>
  )
}

/** Confirmación de borrado en diálogo propio: separa la acción destructiva
 *  del resto del panel y da ancho suficiente para leer y escribir el correo
 *  completo, que era lo que quedaba cortado en la fila de la tabla. */
function DialogoEliminar({
  u, ocupado, onCancelar, onConfirmar,
}: {
  u: UsuarioAdmin
  ocupado: boolean
  onCancelar: () => void
  onConfirmar: (conservarHistorial: boolean) => void
}) {
  const [texto, setTexto] = useState('')
  const [conservarHistorial, setConservarHistorial] = useState(false)
  const coincide = texto.trim().toLowerCase() === u.email.trim().toLowerCase()

  return (
    <div className="modal-fondo" onClick={onCancelar}>
      <div
        className="modal-caja" role="alertdialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-titulo">Eliminar la cuenta de {u.nombre}</h2>

        <p className="modal-texto">
          Si la cuenta ya creó empresas o respondió diagnósticos, se <strong>archiva</strong>:
          se conserva la trazabilidad del diagnóstico y su correo queda libre para registrarse
          otra vez. Si nunca dejó datos, se <strong>borra definitivamente</strong>.
          En ambos casos sus sesiones se cierran de inmediato.
        </p>

        <label className="modal-check">
          <input
            type="checkbox" checked={conservarHistorial}
            onChange={(e) => setConservarHistorial(e.target.checked)}
          />
          <span>Conservar el registro aunque la cuenta no tenga datos</span>
        </label>

        <div className="modal-campo">
          <span className="modal-campo-label">Para confirmar, escribe el correo de la cuenta:</span>
          <code className="modal-correo">{u.email}</code>
          <input
            type="text" autoComplete="off" autoFocus
            placeholder="Correo de la cuenta"
            value={texto} onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="modal-acciones">
          <button type="button" className="btn-panel" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </button>
          <button
            type="button" className="btn-panel btn-panel--peligro-solido"
            disabled={ocupado || !coincide}
            onClick={() => onConfirmar(conservarHistorial)}
          >
            {ocupado ? 'Eliminando…' : 'Eliminar cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function duracion(desde: string, hasta: string): string {
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  if (ms < 0) return '—'
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min`
}

const MOTIVO_CIERRE: Record<MotivoCierre, string> = {
  logout: 'el usuario cerró sesión',
  admin: 'revocada por un administrador',
  eliminacion: 'se eliminó la cuenta',
}

/**
 * Pestaña de actividad: una fila por usuario, igual que la de cuentas.
 * Antes era una lista plana de sesiones sueltas, donde el mismo usuario
 * aparecía diez veces y no se podía leer la historia de nadie.
 */
function PestanaActividad({ token }: { token: string }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [resumen, setResumen] = useState<Record<string, ResumenSesiones>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [detalleId, setDetalleId] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    Promise.all([adminApi.listarUsuarios(token, true), adminApi.resumenSesiones(token)])
      .then(([us, rs]) => {
        setUsuarios(us)
        setResumen(Object.fromEntries(rs.map((r) => [r.usuario_id, r])))
      })
      .catch((e) => setError(e instanceof AuthError ? e.message : 'No se pudo cargar la lista.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  if (detalleId) {
    return (
      <VistaActividad
        token={token}
        usuarioId={detalleId}
        onVolver={() => { setDetalleId(null); cargar() }}
      />
    )
  }

  const filtro = busqueda.trim().toLowerCase()
  const visibles = (filtro
    ? usuarios.filter((u) =>
        u.nombre.toLowerCase().includes(filtro) || u.email.toLowerCase().includes(filtro))
    : usuarios
  ).slice().sort((a, b) => {
    const ra = resumen[a.usuario_id]?.ultima_sesion ?? ''
    const rb = resumen[b.usuario_id]?.ultima_sesion ?? ''
    return rb.localeCompare(ra)
  })

  return (
    <div className="admin-tabla-wrap">
      <div className="tabla-barra">
        <input
          type="search" className="buscador" placeholder="Buscar por nombre o correo"
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="button" className="btn-ghost btn-sm" onClick={cargar}>Actualizar</button>
      </div>

      {error && <div className="auth-error" role="alert">{error}</div>}

      {cargando ? (
        <p className="tabla-vacia">Cargando actividad…</p>
      ) : visibles.length === 0 ? (
        <p className="tabla-vacia">No hay usuarios que coincidan.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Sesiones</th>
              <th>Activas</th>
              <th>Última entrada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => {
              const r = resumen[u.usuario_id]
              return (
                <tr key={u.usuario_id} className={u.archivado_en ? 'fila-eliminada' : ''}>
                  <td>
                    <div className="celda-usuario">
                      <span className={'avatar' + (u.rol === 'admin' ? ' avatar--admin' : '')}>
                        {iniciales(u.nombre)}
                      </span>
                      <div className="celda-usuario-texto">
                        <strong>{u.nombre}</strong>
                        <span>{u.email}</span>
                      </div>
                      {u.archivado_en && <span className="chip-estado chip-estado--eliminada">Eliminada</span>}
                    </div>
                  </td>
                  <td>{r?.total ?? 0}</td>
                  <td>
                    {r && r.activas > 0
                      ? <span className="chip-estado chip-estado--activa">{r.activas}</span>
                      : <span className="celda-fecha">0</span>}
                  </td>
                  <td className="celda-fecha">{formatearFecha(r?.ultima_sesion ?? null)}</td>
                  <td className="celda-accion">
                    <button
                      type="button" className="btn-ghost btn-sm"
                      onClick={() => setDetalleId(u.usuario_id)}
                    >
                      Ver historial
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/**
 * Vista completa de un usuario. Ocupa la pestaña entera en vez de abrirse
 * como modal: es contenido para leer con calma y comparar fechas, no una
 * decisión que atender y cerrar.
 */
function VistaActividad({
  token, usuarioId, onVolver,
}: {
  token: string
  usuarioId: string
  onVolver: () => void
}) {
  const [datos, setDatos] = useState<ActividadUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    adminApi.actividadUsuario(token, usuarioId)
      .then(setDatos)
      .catch((e) => setError(e instanceof AuthError ? e.message : 'No se pudo cargar la actividad.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token, usuarioId])

  const revocar = (sesionId: string) => {
    adminApi.revocarSesion(token, sesionId).then(cargar).catch((e) =>
      setError(e instanceof AuthError ? e.message : 'No se pudo revocar la sesión.'))
  }

  if (cargando) return <p className="lede">Cargando actividad…</p>
  if (error) return (
    <>
      <button type="button" className="btn-volver" onClick={onVolver}>← Volver a la lista</button>
      <div className="auth-error" role="alert">{error}</div>
    </>
  )
  if (!datos) return null

  const { usuario: u, sesiones, empresas, tamizajes, diagnosticos } = datos
  const activas = sesiones.filter((s) => !s.revocado_en && new Date(s.expira_en).getTime() > Date.now())
  const respuestas = diagnosticos.reduce((acc, d) => acc + d.respuestas_usuario, 0)

  return (
    <div className="detalle">
      <button type="button" className="btn-volver" onClick={onVolver}>← Volver a la lista</button>

      <header className="detalle-cabecera">
        <span className={'avatar avatar--lg' + (u.rol === 'admin' ? ' avatar--admin' : '')}>
          {iniciales(u.nombre)}
        </span>
        <div>
          <h2>{u.nombre}</h2>
          <p className="detalle-email">{u.email}</p>
          <div className="panel-chips">
            <span className={'chip-rol' + (u.rol === 'admin' ? ' chip-rol--admin' : '')}>{u.rol}</span>
            <EstadoChip u={u} />
          </div>
        </div>
      </header>

      <div className="detalle-tarjetas">
        <div className="tarjeta"><span>Sesiones registradas</span><strong>{sesiones.length}</strong></div>
        <div className="tarjeta"><span>Sesiones activas</span><strong>{activas.length}</strong></div>
        <div className="tarjeta"><span>Cuenta creada</span><strong>{formatearFecha(u.creado_en)}</strong></div>
        <div className="tarjeta"><span>Respuestas suyas</span><strong>{respuestas}</strong></div>
      </div>

      <section className="detalle-seccion">
        <h3>Historial de sesiones</h3>
        {sesiones.length === 0 ? (
          <p className="detalle-vacio">Esta cuenta nunca inició sesión.</p>
        ) : (
          <ul className="linea-tiempo">
            {sesiones.map((s) => {
              const expirada = new Date(s.expira_en).getTime() < Date.now()
              const activa = !s.revocado_en && !expirada
              return (
                <li key={s.sesion_id} className={'evento' + (activa ? ' evento--activo' : '')}>
                  <div className="evento-cabecera">
                    <strong>Entró el {formatearFecha(s.creado_en)}</strong>
                    {activa && <span className="chip-estado chip-estado--activa">Activa</span>}
                    {!activa && s.revocado_en && <span className="chip-estado chip-estado--inactiva">Cerrada</span>}
                    {!activa && !s.revocado_en && <span className="chip-estado chip-estado--bloqueada">Expirada</span>}
                  </div>
                  <p className="evento-detalle">
                    {s.revocado_en ? (
                      <>
                        Cerró el {formatearFecha(s.revocado_en)} · duró {duracion(s.creado_en, s.revocado_en)} ·{' '}
                        {s.revocado_motivo
                          ? MOTIVO_CIERRE[s.revocado_motivo]
                          : 'motivo no registrado (sesión anterior a esta versión)'}
                      </>
                    ) : expirada ? (
                      <>Expiró el {formatearFecha(s.expira_en)} sin que se cerrara sesión</>
                    ) : (
                      <>Vence el {formatearFecha(s.expira_en)}</>
                    )}
                  </p>
                  <p className="evento-meta">
                    <span className="celda-mono">{s.ip_origen ?? 'sin IP'}</span>
                    <span className="celda-mono evento-agente" title={s.user_agent ?? undefined}>
                      {s.user_agent ?? 'sin cliente'}
                    </span>
                    {activa && (
                      <button type="button" className="btn-ghost btn-sm" onClick={() => revocar(s.sesion_id)}>
                        Revocar
                      </button>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="detalle-seccion">
        <h3>Empresas</h3>
        {empresas.length === 0 ? (
          <p className="detalle-vacio">No está vinculado a ninguna empresa.</p>
        ) : (
          <ul className="lista-simple">
            {empresas.map((e) => (
              <li key={e.empresa_id}>
                <strong>{e.razon_social}</strong>
                <span>
                  NIT {e.nit}-{e.dv} · {e.municipio} · {e.es_creador ? 'la creó' : 'vinculado'} ·
                  registrada el {formatearFecha(e.creado_en)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detalle-seccion">
        <h3>Tamizaje anual</h3>
        {tamizajes.length === 0 ? (
          <p className="detalle-vacio">
            Sin tamizajes guardados. La app todavía no envía el tamizaje al backend,
            así que esta sección queda vacía hasta que existan esos endpoints.
          </p>
        ) : (
          <ul className="lista-simple">
            {tamizajes.map((t) => (
              <li key={t.ciclo_id}>
                <strong>{t.razon_social} · ciclo {t.anio}</strong>
                <span>
                  {t.tamano} · {t.empleados} empleados · Áreas de Vida: {t.areas_de_vida} ·
                  {t.ciclo_previo ? ' con ciclo previo' : ' primer ciclo'} ·
                  {t.comunidades_etnicas ? ' comunidades étnicas' : ' sin comunidades étnicas'} ·
                  {t.consumidor_final ? ' consumidor final' : ' sin consumidor final'}
                </span>
                <span className="evento-meta">Registrado el {formatearFecha(t.creado_en)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="detalle-nota">
          El esquema guarda solo la fecha de creación del ciclo: no hay historial de
          ediciones del tamizaje ni registro de quién lo modificó.
        </p>
      </section>

      <section className="detalle-seccion">
        <h3>Diagnósticos</h3>
        {diagnosticos.length === 0 ? (
          <p className="detalle-vacio">
            Sin diagnósticos guardados. Los Formatos 01 y 02 aún no se persisten
            desde la app, así que aquí no aparece nada todavía.
          </p>
        ) : (
          <ul className="lista-simple">
            {diagnosticos.map((d) => (
              <li key={d.diagnostico_id}>
                <div className="evento-cabecera">
                  <strong>{d.codigo} · {d.formato_nombre}</strong>
                  <span className={'chip-estado ' + (
                    d.estado === 'completado' ? 'chip-estado--activa'
                      : d.estado === 'borrador' ? 'chip-estado--bloqueada'
                        : 'chip-estado--inactiva')}>
                    {d.estado}
                  </span>
                </div>
                <span>{d.razon_social} · ciclo {d.anio}</span>
                <span className="evento-meta">
                  Abierto el {formatearFecha(d.creado_en)}
                  {d.completado_en && ` · completado el ${formatearFecha(d.completado_en)}`}
                </span>
                <span className="evento-meta">
                  {d.respuestas_usuario} de {d.respuestas_total} respuestas son suyas
                  {d.primera_respuesta && ` · primera el ${formatearFecha(d.primera_respuesta)}`}
                  {d.ultima_respuesta && ` · última el ${formatearFecha(d.ultima_respuesta)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
