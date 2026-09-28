import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  onIrARegistro: () => void
}

export function Login({ onIrARegistro }: Props) {
  const { login, error, limpiarError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tocado, setTocado] = useState(false)

  const emailValido = EMAIL_RE.test(email)
  const listo = emailValido && password.length > 0

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!listo || enviando) return
    setEnviando(true)
    try {
      await login({ email: email.trim().toLowerCase(), password })
    } catch {
      /* el error queda expuesto vía useAuth().error */
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <div className="auth-brand">
          <div className="brand-name">NEXUS 360°</div>
          <div className="brand-sub">Autodiagnóstico RSE Express · ISO 26000</div>
        </div>

        <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>Iniciar sesión</h1>
        <p className="lede" style={{ marginBottom: 20 }}>Ingresa con la cuenta de tu empresa.</p>

        {error && <div className="auth-error" role="alert">{error.message}</div>}

        <form onSubmit={enviar} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Correo</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); limpiarError() }}
              placeholder="gerencia@tuempresa.co"
            />
            {tocado && !emailValido && (
              <span className="auth-hint" style={{ color: 'var(--nx-alert)' }}>Ingresa un correo válido.</span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); limpiarError() }}
              placeholder="••••••••"
            />
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
            <div className="auth-switch">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={onIrARegistro}>Regístrate</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
