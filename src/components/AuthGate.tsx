import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Login } from './Login'
import { Register } from './Register'
import { WelcomeOverlay } from './WelcomeOverlay'
import { AdminPanel } from './AdminPanel'
import App from '../App'

/**
 * Decide qué se muestra según el estado de sesión: cargando, login/registro,
 * o la app (App recibe usuario + logout como props — ya no se envuelve
 * como children genérico, porque App necesita esos datos para su propio
 * top bar unificado).
 */
export function AuthGate() {
  const { usuario, cargando, logout } = useAuth()
  const [vista, setVista] = useState<'login' | 'registro'>('login')
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false)

  if (cargando) {
    return <div className="auth-loading">Cargando…</div>
  }

  if (!usuario) {
    return vista === 'login'
      ? <Login onIrARegistro={() => setVista('registro')} />
      : <Register
          onIrALogin={() => setVista('login')}
          onSuccess={() => setMostrarBienvenida(true)}
        />
  }

  // Las cuentas admin van a un panel completamente aparte — App.tsx (el
  // flujo de perfil/tamizaje/diagnóstico) no cambia en nada para cuentas
  // 'empresa', y el bienvenido animado solo tiene sentido para esas.
  if (usuario.rol === 'admin') {
    return <AdminPanel />
  }

  return (
    <>
      <App usuario={usuario} onLogout={logout} />
      {mostrarBienvenida && (
        <WelcomeOverlay
          nombre={usuario.nombre}
          onFinished={() => setMostrarBienvenida(false)}
        />
      )}
    </>
  )
}
