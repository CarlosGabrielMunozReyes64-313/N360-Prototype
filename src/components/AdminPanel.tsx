import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AuthError } from '../auth/types'
import * as adminApi from '../auth/adminApi'
import type { UsuarioAdmin, SesionAdmin } from '../auth/adminApi'
import './admin-panel.css'

type Pestana = 'usuarios' | 'sesiones'

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
          Sesiones
        </button>
      </nav>

      <main className="admin-body">
        {pestana === 'usuarios' && <TablaUsuarios token={token} adminId={usuario.usuario_id} />}
        {pestana === 'sesiones' && <TablaSesiones token={token} />}
      </main>
    </div>
  )
}

function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function TablaUsuarios({ token, adminId }: { token: string; adminId: string }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    adminApi.listarUsuarios(token)
      .then(setUsuarios)
      .catch((e) => setError(e instanceof AuthError ? e.message : 'No se pudo cargar la lista.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  if (cargando) return <p className="lede">Cargando usuarios…</p>
  if (error) return <div className="auth-error" role="alert">{error}</div>

  return (
    <div className="admin-tabla-wrap">
      <table className="admin-tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Último login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <FilaUsuario
              key={u.usuario_id}
              u={u}
              token={token}
              adminId={adminId}
              expandido={expandido === u.usuario_id}
              onToggle={() => setExpandido(expandido === u.usuario_id ? null : u.usuario_id)}
              onCambio={cargar}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FilaUsuario({
  u, token, adminId, expandido, onToggle, onCambio,
}: {
  u: UsuarioAdmin
  token: string
  adminId: string
  expandido: boolean
  onToggle: () => void
  onCambio: () => void
}) {
  const [accionando, setAccionando] = useState(false)
  const [errorFila, setErrorFila] = useState<string | null>(null)
  const [okFila, setOkFila] = useState<string | null>(null)
  const [passwordNueva, setPasswordNueva] = useState('')

  const bloqueada = Boolean(u.bloqueado_hasta) || u.intentos_fallidos >= 5
  const esUnoMismo = u.usuario_id === adminId

  const ejecutar = async (accion: () => Promise<unknown>, mensajeOk: string) => {
    setAccionando(true)
    setErrorFila(null)
    setOkFila(null)
    try {
      await accion()
      setOkFila(mensajeOk)
      onCambio()
    } catch (e) {
      setErrorFila(e instanceof AuthError ? e.message : 'No se pudo completar la acción.')
    } finally {
      setAccionando(false)
    }
  }

  return (
    <>
      <tr className={bloqueada ? 'fila-bloqueada' : ''}>
        <td>{u.nombre}</td>
        <td>{u.email}</td>
        <td>
          <span className={'chip-rol' + (u.rol === 'admin' ? ' chip-rol--admin' : '')}>{u.rol}</span>
        </td>
        <td>
          {!u.activo && <span className="chip-estado chip-estado--inactiva">Inactiva</span>}
          {u.activo && bloqueada && <span className="chip-estado chip-estado--bloqueada">Bloqueada</span>}
          {u.activo && !bloqueada && <span className="chip-estado chip-estado--activa">Activa</span>}
        </td>
        <td>{formatearFecha(u.ultimo_login_en)}</td>
        <td>
          <button type="button" className="btn-ghost btn-sm" onClick={onToggle}>
            {expandido ? 'Cerrar' : 'Gestionar'}
          </button>
        </td>
      </tr>

      {expandido && (
        <tr className="fila-acciones">
          <td colSpan={6}>
            <div className="acciones-grid">
              <div className="accion-bloque">
                <span className="accion-etiqueta">Cuenta</span>
                <button
                  type="button" className="btn-ghost btn-sm" disabled={accionando || esUnoMismo}
                  title={esUnoMismo ? 'No puedes desactivar tu propia cuenta' : undefined}
                  onClick={() => ejecutar(
                    () => adminApi.cambiarEstadoUsuario(token, u.usuario_id, !u.activo),
                    u.activo ? 'Cuenta desactivada.' : 'Cuenta activada.',
                  )}
                >
                  {u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                </button>
              </div>

              <div className="accion-bloque">
                <span className="accion-etiqueta">Bloqueo</span>
                <button
                  type="button" className="btn-ghost btn-sm" disabled={accionando || !bloqueada}
                  onClick={() => ejecutar(
                    () => adminApi.desbloquearUsuario(token, u.usuario_id),
                    'Cuenta desbloqueada.',
                  )}
                >
                  Desbloquear
                </button>
              </div>

              <div className="accion-bloque">
                <span className="accion-etiqueta">Rol</span>
                <select
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
              </div>

              <div className="accion-bloque accion-bloque--ancho">
                <span className="accion-etiqueta">Restablecer contraseña</span>
                <div className="accion-fila">
                  <input
                    type="password" placeholder="Contraseña nueva (mín. 8)"
                    value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)}
                  />
                  <button
                    type="button" className="btn-ghost btn-sm"
                    disabled={accionando || passwordNueva.length < 8}
                    onClick={() => ejecutar(
                      () => adminApi.restablecerPasswordUsuario(token, u.usuario_id, passwordNueva)
                        .then(() => setPasswordNueva('')),
                      'Contraseña restablecida. Comunícasela al usuario por un canal seguro.',
                    )}
                  >
                    Restablecer
                  </button>
                </div>
              </div>
            </div>

            {errorFila && <div className="auth-error" role="alert">{errorFila}</div>}
            {okFila && <div className="note">{okFila}</div>}
          </td>
        </tr>
      )}
    </>
  )
}

function TablaSesiones({ token }: { token: string }) {
  const [sesiones, setSesiones] = useState<SesionAdmin[]>([])
  const [usuarios, setUsuarios] = useState<Record<string, UsuarioAdmin>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    Promise.all([adminApi.listarSesiones(token), adminApi.listarUsuarios(token)])
      .then(([ss, us]) => {
        setSesiones(ss)
        setUsuarios(Object.fromEntries(us.map((u) => [u.usuario_id, u])))
      })
      .catch((e) => setError(e instanceof AuthError ? e.message : 'No se pudo cargar la lista.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  if (cargando) return <p className="lede">Cargando sesiones…</p>
  if (error) return <div className="auth-error" role="alert">{error}</div>

  return (
    <div className="admin-tabla-wrap">
      <table className="admin-tabla">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Creada</th>
            <th>Expira</th>
            <th>IP</th>
            <th>Navegador / cliente</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sesiones.map((s) => {
            const u = usuarios[s.usuario_id]
            const expirada = new Date(s.expira_en).getTime() < Date.now()
            const activa = !s.revocado_en && !expirada
            return (
              <tr key={s.sesion_id}>
                <td>{u ? `${u.nombre} (${u.email})` : s.usuario_id}</td>
                <td>{formatearFecha(s.creado_en)}</td>
                <td>{formatearFecha(s.expira_en)}</td>
                <td className="celda-mono">{s.ip_origen ?? '—'}</td>
                <td className="celda-mono celda-truncada" title={s.user_agent ?? undefined}>
                  {s.user_agent ?? '—'}
                </td>
                <td>
                  {activa && <span className="chip-estado chip-estado--activa">Activa</span>}
                  {!activa && s.revocado_en && <span className="chip-estado chip-estado--inactiva">Revocada</span>}
                  {!activa && !s.revocado_en && <span className="chip-estado chip-estado--bloqueada">Expirada</span>}
                </td>
                <td>
                  {activa && (
                    <button
                      type="button" className="btn-ghost btn-sm"
                      onClick={() => adminApi.revocarSesion(token, s.sesion_id).then(cargar)}
                    >
                      Revocar
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
