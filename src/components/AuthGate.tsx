import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Landing } from './Landing'
import { Login } from './Login'
import { Register } from './Register'
import { WelcomeOverlay } from './WelcomeOverlay'
import { AdminPanel } from './AdminPanel'
import App from '../App'

type Vista = 'landing' | 'login' | 'registro'

/** Lee la vista desde el hash de la URL (#/login, #/registro, o landing). */
function vistaDesdeHash(): Vista {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'login') return 'login'
  if (h === 'registro') return 'registro'
  return 'landing'
}

/**
 * Decide qué se muestra según el estado de sesión: cargando, landing pública,
 * login/registro, o la app (App recibe usuario + logout como props — ya no se
 * envuelve como children genérico, porque App necesita esos datos para su
 * propio top bar unificado).
 *
 * Sin sesión la vista arranca en 'landing'. Cada paso a login o registro
 * agrega una entrada al historial del navegador (#/login, #/registro), así
 * que la flecha de atrás devuelve a la landing sin necesidad de un router.
 */
export function AuthGate() {
  const { usuario, cargando, logout } = useAuth()
  const [vista, setVista] = useState<Vista>(() => vistaDesdeHash())
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false)

  // La flecha de atrás/adelante del navegador solo cambia el hash: aquí se
  // traduce ese cambio a la vista correspondiente.
  useEffect(() => {
    const sincronizar = () => setVista(vistaDesdeHash())
    window.addEventListener('popstate', sincronizar)
    window.addEventListener('hashchange', sincronizar)
    return () => {
      window.removeEventListener('popstate', sincronizar)
      window.removeEventListener('hashchange', sincronizar)
    }
  }, [])

  // Con sesión abierta el hash de autenticación ya no aplica: se limpia sin
  // agregar entrada al historial, para que atrás no reviva login/registro.
  useEffect(() => {
    if (usuario && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setVista('landing')
    }
  }, [usuario])

  const irA = useCallback((destino: Vista) => {
    setVista(destino)
    const hash = destino === 'landing' ? '#/' : `#/${destino}`
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash)
    }
  }, [])

  if (cargando) {
    return <div className="auth-loading">Cargando…</div>
  }

  if (!usuario) {
    if (vista === 'landing') {
      return (
        <Landing
          onCrearCuenta={() => irA('registro')}
          onIniciarSesion={() => irA('login')}
        />
      )
    }

    return vista === 'login'
      ? <Login onIrARegistro={() => irA('registro')} />
      : <Register
          onIrALogin={() => irA('login')}
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
