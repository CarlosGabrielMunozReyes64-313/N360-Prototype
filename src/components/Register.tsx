import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASS_MIN = 8

interface Props {
  onIrALogin: () => void
  /** Se llama justo después de crear la cuenta con éxito (antes de que
   * AuthGate revele la app). No afecta el flujo si no se pasa. */
  onSuccess?: () => void
}

export function Register({ onIrALogin, onSuccess }: Props) {
  const { registrar, error, limpiarError } = useAuth()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tocado, setTocado] = useState(false)

  const emailValido = EMAIL_RE.test(email)
  const passwordValida = password.length >= PASS_MIN
  const coinciden = password.length > 0 && password === confirmar
  const listo = nombre.trim().length > 1 && emailValido && passwordValida && coinciden

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!listo || enviando) return
    setEnviando(true)
    try {
      await registrar({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        rol: 'empresa',
      })
      onSuccess?.()
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
          <div className="brand-sub">Diagnóstico normativo · ISO 26000 y Ley 2173</div>
        </div>

        <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>Crear cuenta</h1>
        <p className="lede" style={{ marginBottom: 20 }}>Registra la cuenta de tu empresa para empezar el diagnóstico.</p>

        {error && <div className="auth-error" role="alert">{error.message}</div>}

        <form onSubmit={enviar} noValidate>
          <div className="auth-field">
            <label htmlFor="reg-nombre">Nombre</label>
            <input
              id="reg-nombre"
              autoComplete="name"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); limpiarError() }}
              placeholder="Nombre de quien administra la cuenta"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Correo</label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); limpiarError() }}
              placeholder="Mínimo 8 caracteres"
            />
            {tocado && !passwordValida && (
              <span className="auth-hint" style={{ color: 'var(--nx-alert)' }}>
                Debe tener al menos {PASS_MIN} caracteres.
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirmar">Confirmar contraseña</label>
            <input
              id="reg-confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => { setConfirmar(e.target.value); limpiarError() }}
              placeholder="Repite la contraseña"
            />
            {tocado && confirmar.length > 0 && !coinciden && (
              <span className="auth-hint" style={{ color: 'var(--nx-alert)' }}>Las contraseñas no coinciden.</span>
            )}
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn" disabled={enviando}>
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
            <div className="auth-switch">
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={onIrALogin}>Inicia sesión</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
