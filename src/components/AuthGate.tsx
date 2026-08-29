import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Login } from './Login'
import { Register } from './Register'

export function AuthGate({ children }: { children: ReactNode }) {
  const { usuario, cargando, logout } = useAuth()
  const [vista, setVista] = useState<'login' | 'registro'>('login')

  if (cargando) {
    return <div className="auth-loading">Cargando…</div>
  }

  if (!usuario) {
    return vista === 'login'
      ? <Login onIrARegistro={() => setVista('registro')} />
      : <Register onIrALogin={() => setVista('login')} />
  }

  return (
    <>
      <div className="auth-session-bar">
        <span>Sesión: <strong>{usuario.nombre}</strong></span>
        <button type="button" onClick={logout}>Cerrar sesión</button>
      </div>
      {children}
    </>
  )
}
