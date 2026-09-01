import { API_URL } from './api'
import { AuthError } from './types'
import type { Usuario } from './types'

/** Vista de usuario para el panel de admin — incluye campos que un usuario
 * normal nunca ve de sí mismo. */
export interface UsuarioAdmin extends Usuario {
  intentos_fallidos: number
  bloqueado_hasta: string | null
  creado_en: string
}

export interface SesionAdmin {
  sesion_id: string
  usuario_id: string
  creado_en: string
  expira_en: string
  revocado_en: string | null
  ip_origen: string | null
  user_agent: string | null
}

async function parseError(res: Response): Promise<AuthError> {
  let codigo = 'DESCONOCIDO'
  let mensaje = 'No se pudo completar la operación.'
  try {
    const data = await res.json()
    codigo = data.codigo ?? codigo
    mensaje = data.mensaje ?? mensaje
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  return new AuthError(codigo as AuthError['code'], mensaje)
}

async function llamar<T>(
  path: string, token: string, opciones: RequestInit = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opciones.headers,
      },
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function listarUsuarios(token: string): Promise<UsuarioAdmin[]> {
  return llamar('/admin/usuarios', token)
}

export function cambiarEstadoUsuario(
  token: string, usuarioId: string, activo: boolean,
): Promise<UsuarioAdmin> {
  return llamar(`/admin/usuarios/${usuarioId}/estado`, token, {
    method: 'PATCH', body: JSON.stringify({ activo }),
  })
}

export function desbloquearUsuario(token: string, usuarioId: string): Promise<void> {
  return llamar(`/admin/usuarios/${usuarioId}/desbloquear`, token, { method: 'POST' })
}

export function cambiarRolUsuario(
  token: string, usuarioId: string, rol: 'empresa' | 'admin',
): Promise<UsuarioAdmin> {
  return llamar(`/admin/usuarios/${usuarioId}/rol`, token, {
    method: 'POST', body: JSON.stringify({ rol }),
  })
}

export function restablecerPasswordUsuario(
  token: string, usuarioId: string, passwordNueva: string,
): Promise<void> {
  return llamar(`/admin/usuarios/${usuarioId}/restablecer-password`, token, {
    method: 'POST', body: JSON.stringify({ password_nueva: passwordNueva }),
  })
}

export function listarSesiones(token: string, usuarioId?: string): Promise<SesionAdmin[]> {
  const query = usuarioId ? `?usuario_id=${usuarioId}` : ''
  return llamar(`/admin/sesiones${query}`, token)
}

export function revocarSesion(token: string, sesionId: string): Promise<void> {
  return llamar(`/admin/sesiones/${sesionId}/revocar`, token, { method: 'POST' })
}
