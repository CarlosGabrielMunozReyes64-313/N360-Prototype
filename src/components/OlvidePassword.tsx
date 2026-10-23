import { useState } from 'react'
import { solicitarRecuperacion } from '../auth/api'
import { AuthError } from '../auth/types'
import { AvisoRecaptcha } from './AvisoRecaptcha'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  /** Correo que la persona ya había escrito en el login, para no repetirlo. */
  emailInicial?: string
  onIrALogin: () => void
}

/**
 * «¿Olvidaste tu contraseña?»: pide el correo y el backend envía un enlace.
 *
 * La pantalla de confirmación es la MISMA exista o no la cuenta (el backend
 * responde igual en ambos casos): así nadie puede usar este formulario para
 * averiguar qué correos están registrados.
 */
export function OlvidePassword({ emailInicial = '', onIrALogin }: Props) {
  const [email, setEmail] = useState(emailInicial)
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const emailValido = EMAIL_RE.test(email.trim())

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!emailValido || enviando) return
    setEnviando(true)
    setError(null)
    try {
      const res = await solicitarRecuperacion(email.trim().toLowerCase())
      setConfirmacion(res.mensaje)
    } catch (err) {
      setError(err instanceof AuthError ? err : new AuthError('DESCONOCIDO', 'Error inesperado.'))
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

        {confirmacion ? (
          <>
            <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>Revisa tu correo</h1>
            <div className="auth-ok" role="status">{confirmacion}</div>
            <p className="auth-hint auth-parrafo">
              El enlace vence en unos minutos y sirve una sola vez. Si no te llega, revisa que el correo
              esté bien escrito o vuelve a intentarlo más tarde.
            </p>
            <div className="auth-actions">
              <button type="button" className="btn" onClick={onIrALogin}>Volver a iniciar sesión</button>
              <div className="auth-switch">
                <button type="button" onClick={() => { setConfirmacion(null); setTocado(false) }}>
                  Usar otro correo
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>¿Olvidaste tu contraseña?</h1>
            <p className="lede" style={{ marginBottom: 20 }}>
              Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva.
            </p>

            {error && <div className="auth-error" role="alert">{error.message}</div>}

            <form onSubmit={enviar} noValidate>
              <div className="auth-field">
                <label htmlFor="recuperar-email">Correo</label>
                <input
                  id="recuperar-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="gerencia@tuempresa.co"
                />
                {tocado && !emailValido && (
                  <span className="auth-hint" style={{ color: 'var(--nx-alert)' }}>Ingresa un correo válido.</span>
                )}
              </div>

              <div className="auth-actions">
                <button type="submit" className="btn" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar enlace'}
                </button>
                <div className="auth-switch">
                  ¿La recordaste?{' '}
                  <button type="button" onClick={onIrALogin}>Inicia sesión</button>
                </div>
              </div>
              <AvisoRecaptcha />
            </form>
          </>
        )}
      </div>
    </div>
  )
}
