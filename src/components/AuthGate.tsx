import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Landing } from './Landing'
import { Login } from './Login'
import { Register } from './Register'
import { WelcomeOverlay } from './WelcomeOverlay'
import { AdminPanel } from './AdminPanel'
import App from '../App'

/**
 * Decide qué se muestra según el estado de sesión: cargando, landing pública,
 * login/registro, o la app (App recibe usuario + logout como props — ya no se
 * envuelve como children genérico, porque App necesita esos datos para su
 * propio top bar unificado).
 *
 * Sin sesión la vista arranca en 'landing' (página de presentación); los
 * botones de esa página son los que llevan a 'login' o a 'registro'.
 */
export function AuthGate() {
  const { usuario, cargando, logout } = useAuth()
  const [vista, setVista] = useState<'landing' | 'login' | 'registro'>('landing')
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false)

  if (cargando) {
    return <div className="auth-loading">Cargando…</div>
  }

  if (!usuario) {
    if (vista === 'landing') {
      return (
        <Landing
          onCrearCuenta={() => setVista('registro')}
          onIniciarSesion={() => setVista('login')}
        />
      )
    }

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
