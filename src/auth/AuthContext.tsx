import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from './api'
import { AuthError } from './types'
import type { LoginPayload, RegistroPayload, Usuario } from './types'

const STORAGE_KEY = 'n360_sesion'

interface SesionGuardada {
  token: string
  usuario: Usuario
}

interface AuthState {
  usuario: Usuario | null
  token: string | null
  /** Cargando la validación inicial de sesión contra el backend. */
  cargando: boolean
  error: AuthError | null
  login: (payload: LoginPayload) => Promise<void>
  registrar: (payload: RegistroPayload) => Promise<void>
  logout: () => void
  limpiarError: () => void
  /** Cambia nombre y/o correo; actualiza la sesión guardada al terminar. */
  actualizarPerfil: (payload: api.ActualizarPerfilPayload) => Promise<void>
  cambiarPassword: (payload: api.CambiarPasswordPayload) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function leerSesionGuardada(): SesionGuardada | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const datos = JSON.parse(raw)
    if (datos?.token && datos?.usuario) return datos
    return null
  } catch {
    return null
  }
}

function guardarSesion(s: SesionGuardada | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Al montar: si hay sesión guardada, se restaura de inmediato (optimista) y se
  // valida en segundo plano. Como el backend todavía no existe, un fallo de red
  // NO cierra la sesión (evita pantallas de login en bucle); solo un 401 explícito
  // del backend (token inválido/expirado) la cierra.
  useEffect(() => {
    const guardada = leerSesionGuardada()
    if (!guardada) {
      setCargando(false)
      return
    }
    setUsuario(guardada.usuario)
    setToken(guardada.token)

    api.validarSesion(guardada.token)
      .then(({ usuario: actualizado }) => {
        setUsuario(actualizado)
        guardarSesion({ token: guardada.token, usuario: actualizado })
      })
      .catch((e) => {
        if (e instanceof AuthError && e.code !== 'RED') {
          setUsuario(null)
          setToken(null)
          guardarSesion(null)
        }
      })
      .finally(() => setCargando(false))
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null)
    try {
      const res = await api.iniciarSesion(payload)
      setUsuario(res.usuario)
      setToken(res.token)
      guardarSesion({ token: res.token, usuario: res.usuario })
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError('DESCONOCIDO', 'Error inesperado.')
      setError(err)
      throw err
    }
  }, [])

  const registrarUsuario = useCallback(async (payload: RegistroPayload) => {
    setError(null)
    try {
      const res = await api.registrar(payload)
      setUsuario(res.usuario)
      setToken(res.token)
      guardarSesion({ token: res.token, usuario: res.usuario })
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError('DESCONOCIDO', 'Error inesperado.')
      setError(err)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    if (token) void api.cerrarSesion(token)
    setUsuario(null)
    setToken(null)
    guardarSesion(null)
  }, [token])

  const actualizarPerfil = useCallback(async (payload: api.ActualizarPerfilPayload) => {
    if (!token) throw new AuthError('CREDENCIALES_INVALIDAS', 'No hay una sesión activa.')
    setError(null)
    try {
      const res = await api.actualizarPerfil(token, payload)
      setUsuario(res.usuario)
      guardarSesion({ token, usuario: res.usuario })
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError('DESCONOCIDO', 'Error inesperado.')
      setError(err)
      throw err
    }
  }, [token])

  const cambiarPasswordCtx = useCallback(async (payload: api.CambiarPasswordPayload) => {
    if (!token) throw new AuthError('CREDENCIALES_INVALIDAS', 'No hay una sesión activa.')
    setError(null)
    try {
      await api.cambiarPassword(token, payload)
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError('DESCONOCIDO', 'Error inesperado.')
      setError(err)
      throw err
    }
  }, [token])

  const limpiarError = useCallback(() => setError(null), [])

  const value = useMemo<AuthState>(() => ({
    usuario, token, cargando, error, login, registrar: registrarUsuario, logout, limpiarError,
    actualizarPerfil, cambiarPassword: cambiarPasswordCtx,
  }), [
    usuario, token, cargando, error, login, registrarUsuario, logout, limpiarError,
    actualizarPerfil, cambiarPasswordCtx,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
