import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Landing } from './Landing'
import { Login } from './Login'
import { Register } from './Register'
import { OlvidePassword } from './OlvidePassword'
import { RestablecerPassword } from './RestablecerPassword'
import { esRutaRestablecer, quitarTokenDeLaUrl, tokenDesdeHash } from '../auth/enlaceRecuperacion'
import { WelcomeOverlay } from './WelcomeOverlay'
import { AdminPanel } from './AdminPanel'
import { IconoCarga } from './IconoCarga'
import { NoEncontrada } from './NoEncontrada'
import App from '../App'

type Vista = 'landing' | 'login' | 'registro' | 'recuperar' | 'restablecer' | 'no-encontrada'

/** Raíz donde se sirve la app (la `base` de Vite; «/» por defecto). */
const RAIZ = import.meta.env.BASE_URL

/**
 * Lee la vista desde la URL: la app vive en la raíz y navega con el hash
 * (#/login, #/registro, #/recuperar, #/restablecer?token=… que llega en el
 * correo de recuperación, o la landing sin hash). Cualquier otra ruta o un
 * #/… desconocido es un error 404.
 */
function vistaDesdeHash(): Vista {
  const ruta = window.location.pathname.replace(/index\.html$/, '')
  if (ruta !== RAIZ && ruta !== RAIZ.replace(/\/$/, '')) return 'no-encontrada'
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === '') return 'landing'
  if (h === 'login') return 'login'
  if (h === 'registro') return 'registro'
  if (h === 'recuperar') return 'recuperar'
  if (esRutaRestablecer(window.location.hash)) return 'restablecer'
  return 'no-encontrada'
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
  // Token del enlace de recuperación. Se lee de la URL al cargar (sin efectos
  // secundarios: StrictMode llama dos veces a este inicializador) y el efecto
  // de abajo lo borra de la barra de direcciones y del historial.
  const [tokenRecuperacion, setTokenRecuperacion] = useState<string | null>(
    () => tokenDesdeHash(window.location.hash),
  )
  // Correo que la persona ya había escrito en el login, para no repetirlo.
  const [emailRecuperacion, setEmailRecuperacion] = useState('')

  useEffect(() => { quitarTokenDeLaUrl() }, [])

  // La flecha de atrás/adelante del navegador solo cambia el hash: aquí se
  // traduce ese cambio a la vista correspondiente. También cubre pegar otro
  // enlace de recuperación en la misma pestaña.
  useEffect(() => {
    const sincronizar = () => {
      const token = tokenDesdeHash(window.location.hash)
      if (token) {
        setTokenRecuperacion(token)
        quitarTokenDeLaUrl()
      }
      setVista(vistaDesdeHash())
    }
    window.addEventListener('popstate', sincronizar)
    window.addEventListener('hashchange', sincronizar)
    return () => {
      window.removeEventListener('popstate', sincronizar)
      window.removeEventListener('hashchange', sincronizar)
    }
  }, [])

  // Con sesión abierta el hash de autenticación ya no aplica: se limpia sin
  // agregar entrada al historial, para que atrás no reviva login/registro.
  // Una dirección que no existe se queda en la página 404, y el enlace de
  // recuperación se respeta aunque haya sesión (ver abajo).
  useEffect(() => {
    if (usuario && window.location.hash && vista !== 'no-encontrada' && vista !== 'restablecer') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setVista('landing')
    }
  }, [usuario, vista])

  const irA = useCallback((destino: Vista) => {
    setVista(destino)
    const hash = destino === 'landing' ? '#/' : `#/${destino}`
    // Desde la página 404 también se vuelve a la raíz de la app.
    const destinoUrl = window.location.pathname === RAIZ ? hash : RAIZ + hash
    if (window.location.hash !== hash || window.location.pathname !== RAIZ) {
      window.history.pushState(null, '', destinoUrl)
    }
  }, [])

  if (cargando) {
    return (
      <div className="auth-loading" role="status">
        <IconoCarga tamano={64} />
        <span>Cargando…</span>
      </div>
    )
  }

  // El enlace del correo se atiende haya o no sesión abierta en este
  // navegador. Al restablecer, el backend cierra TODAS las sesiones de la
  // cuenta; aquí se olvida también la local para no quedar con un token muerto.
  if (vista === 'restablecer') {
    return (
      <RestablecerPassword
        key={tokenRecuperacion ?? 'sin-token'}
        token={tokenRecuperacion}
        onIrALogin={() => irA('login')}
        onPedirOtro={() => irA('recuperar')}
        onRestablecida={() => { if (usuario) logout() }}
      />
    )
  }

  if (vista === 'no-encontrada') {
    return (
      <NoEncontrada
        conSesion={Boolean(usuario)}
        onInicio={() => irA('landing')}
        onIniciarSesion={() => irA('login')}
      />
    )
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

    if (vista === 'recuperar') {
      return <OlvidePassword emailInicial={emailRecuperacion} onIrALogin={() => irA('login')} />
    }

    return vista === 'login'
      ? <Login
          onIrARegistro={() => irA('registro')}
          onOlvidePassword={(email) => { setEmailRecuperacion(email); irA('recuperar') }}
        />
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
