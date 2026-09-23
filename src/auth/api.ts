import type { LoginPayload, RegistroPayload, SesionRespuesta } from './types'
import { AuthError } from './types'

/**
 * Base de la API del backend (N-360-Back, aún sin desarrollar).
 * Configúrala en un .env con VITE_API_URL="https://tu-backend/api".
 * Si no existe, se asume que corre en localhost:8000 (default típico de FastAPI + uvicorn).
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:8000/api'

/**
 * Contrato esperado del backend (a implementar sobre la tabla `usuario` del schema):
 *
 *   POST {API_URL}/auth/register
 *     body: { email, nombre, password, rol: 'empresa' }
 *     201 -> SesionRespuesta   (registra e inicia sesión de una vez)
 *     409 -> { codigo: 'EMAIL_YA_REGISTRADO' }
 *     422 -> { codigo: 'VALIDACION', detalle }
 *
 *   POST {API_URL}/auth/login
 *     body: { email, password }
 *     200 -> SesionRespuesta
 *     401 -> { codigo: 'CREDENCIALES_INVALIDAS' }
 *     423 -> { codigo: 'CUENTA_BLOQUEADA' }            (bloqueado_hasta en el futuro)
 *     403 -> { codigo: 'CUENTA_INACTIVA' | 'EMAIL_NO_VERIFICADO' }
 *
 *   POST {API_URL}/auth/logout   (Authorization: Bearer <token>)
 *     204
 *
 *   GET {API_URL}/auth/me        (Authorization: Bearer <token>)
 *     200 -> { usuario: Usuario }
 *     401 -> token inválido/expirado/revocado
 */

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

  const mensajes: Record<string, string> = {
    CREDENCIALES_INVALIDAS: 'El correo o la contraseña no son correctos.',
    EMAIL_YA_REGISTRADO: 'Ya existe una cuenta registrada con ese correo.',
    CUENTA_BLOQUEADA: 'La cuenta está bloqueada temporalmente por intentos fallidos.',
    CUENTA_INACTIVA: 'Esta cuenta está inactiva. Contacta al administrador.',
    EMAIL_NO_VERIFICADO: 'Debes verificar tu correo antes de iniciar sesión.',
    VALIDACION: mensaje,
  }

  const code = (codigo in mensajes ? codigo : 'DESCONOCIDO') as AuthError['code']
  return new AuthError(code, mensajes[codigo] ?? mensaje)
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.')
  }

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function patch<T>(path: string, body: unknown, token: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<T>
}

export async function registrar(payload: RegistroPayload): Promise<SesionRespuesta> {
  return post<SesionRespuesta>('/auth/register', payload)
}

export async function iniciarSesion(payload: LoginPayload): Promise<SesionRespuesta> {
  return post<SesionRespuesta>('/auth/login', payload)
}

export async function cerrarSesion(token: string): Promise<void> {
  try {
    await post<void>('/auth/logout', {}, token)
  } catch {
    /* si el backend no responde, igual limpiamos la sesión local */
  }
}

export async function validarSesion(token: string): Promise<{ usuario: SesionRespuesta['usuario'] }> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new AuthError('RED', 'Sin conexión con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export interface ActualizarPerfilPayload {
  nombre?: string
  email?: string
}

/** PATCH /auth/me — cambia nombre y/o correo. La contraseña NUNCA pasa
 * por aquí; ver cambiarPassword(). */
export async function actualizarPerfil(
  token: string, payload: ActualizarPerfilPayload,
): Promise<{ usuario: SesionRespuesta['usuario'] }> {
  return patch('/auth/me', payload, token)
}

export interface CambiarPasswordPayload {
  password_actual: string
  password_nueva: string
}

/** POST /auth/change-password — 204 sin cuerpo si sale bien. */
export async function cambiarPassword(token: string, payload: CambiarPasswordPayload): Promise<void> {
  return post<void>('/auth/change-password', payload, token)
}

// ---------------------------------------------------------------------
// Foto de perfil
// ---------------------------------------------------------------------

/** PUT /auth/me/foto — sube la foto ya recortada (binario, no multipart).
 * El backend la vuelve a validar y codificar; devuelve el usuario con la
 * nueva `foto_actualizada_en`. */
export async function subirFotoPerfil(
  token: string, foto: Blob,
): Promise<{ usuario: SesionRespuesta['usuario'] }> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/me/foto`, {
      method: 'PUT',
      headers: {
        'Content-Type': foto.type || 'application/octet-stream',
        Authorization: `Bearer ${token}`,
      },
      body: foto,
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** DELETE /auth/me/foto — vuelve a la foto predeterminada. */
export async function quitarFotoPerfil(token: string): Promise<{ usuario: SesionRespuesta['usuario'] }> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/me/foto`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new AuthError('RED', 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** GET /usuarios/{id}/foto — la foto va con el token, así que no se puede
 * poner la URL directo en un <img>: se descarga como Blob. `version` hace
 * que la URL cambie cuando cambia la foto (el backend la marca inmutable). */
export async function descargarFotoUsuario(token: string, usuarioId: string, version: string): Promise<Blob> {
  const res = await fetch(
    `${API_URL}/usuarios/${encodeURIComponent(usuarioId)}/foto?v=${encodeURIComponent(version)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw await parseError(res)
  return res.blob()
}
