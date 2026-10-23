import { useEffect, useState } from 'react'
import { restablecerPassword, verificarTokenRecuperacion } from '../auth/api'
import { AuthError } from '../auth/types'

const PASS_MIN = 8

type Estado = 'verificando' | 'sin-conexion' | 'invalido' | 'listo' | 'hecho'

interface Props {
  /** Token del enlace del correo (AuthGate ya lo quitó de la URL). */
  token: string | null
  onIrALogin: () => void
  onPedirOtro: () => void
  /** Se llama al cambiar la contraseña: el backend ya cerró TODAS las
   * sesiones de la cuenta, así que si había una abierta en este navegador
   * hay que olvidarla también. */
  onRestablecida?: () => void
}

/**
 * Pantalla del enlace del correo: elegir la contraseña nueva.
 *
 * Al abrirse pregunta al backend si el enlace sigue sirviendo, para avisar
 * «ya venció» ANTES de que la persona escriba nada. No carga reCAPTCHA: el
 * token del enlace (256 bits, de un solo uso) ya es la prueba.
 *
 * AuthGate la monta con key={token}: un enlace distinto reinicia el estado.
 */
export function RestablecerPassword({ token, onIrALogin, onPedirOtro, onRestablecida }: Props) {
  const [estado, setEstado] = useState<Estado>(token ? 'verificando' : 'invalido')
  const [intento, setIntento] = useState(0)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    if (!token) return
    let vigente = true
    verificarTokenRecuperacion(token)
      .then((valido) => { if (vigente) setEstado(valido ? 'listo' : 'invalido') })
      .catch(() => { if (vigente) setEstado('sin-conexion') })
    return () => { vigente = false }
  }, [token, intento])

  const passwordValida = password.length >= PASS_MIN
  const coinciden = password.length > 0 && password === confirmar
  const listo = passwordValida && coinciden

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!token || !listo || enviando) return
    setEnviando(true)
    setError(null)
    try {
      await restablecerPassword(token, password)
      setPassword('')
      setConfirmar('')
      setEstado('hecho')
      onRestablecida?.()
    } catch (err) {
      const e2 = err instanceof AuthError ? err : new AuthError('DESCONOCIDO', 'Error inesperado.')
      if (e2.code === 'TOKEN_INVALIDO') setEstado('invalido')
      else setError(e2)
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

        {estado === 'verificando' && (
          <p className="lede" role="status">Comprobando el enlace…</p>
        )}

        {estado === 'sin-conexion' && (
          <>
            <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>No pudimos comprobar el enlace</h1>
            <div className="auth-error" role="alert">
              No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.
            </div>
            <div className="auth-actions">
              <button type="button" className="btn" onClick={() => { setEstado('verificando'); setIntento((n) => n + 1) }}>
                Reintentar
              </button>
            </div>
          </>
        )}

        {estado === 'invalido' && (
          <>
            <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>Este enlace ya no sirve</h1>
            <p className="lede" style={{ marginBottom: 20 }}>
              Puede que haya vencido, que ya se haya usado o que hayas pedido uno más reciente
              (solo el último funciona). Pide un enlace nuevo.
            </p>
            <div className="auth-actions">
              <button type="button" className="btn" onClick={onPedirOtro}>Pedir un enlace nuevo</button>
              <div className="auth-switch">
                <button type="button" onClick={onIrALogin}>Volver a iniciar sesión</button>
              </div>
            </div>
          </>
        )}

        {estado === 'hecho' && (
          <>
            <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>Contraseña actualizada</h1>
            <div className="auth-ok" role="status">
              Ya puedes iniciar sesión con tu contraseña nueva. Por seguridad cerramos todas las sesiones
              que estaban abiertas, también en otros dispositivos.
            </div>
            <div className="auth-actions">
              <button type="button" className="btn" onClick={onIrALogin}>Iniciar sesión</button>
            </div>
          </>
        )}

        {estado === 'listo' && (
          <>
            <h1 className="title" style={{ fontSize: 20, marginBottom: 4 }}>Elige una contraseña nueva</h1>
            <p className="lede" style={{ marginBottom: 20 }}>Debe tener al menos {PASS_MIN} caracteres.</p>

            {error && <div className="auth-error" role="alert">{error.message}</div>}

            <form onSubmit={enviar} noValidate>
              <div className="auth-field">
                <label htmlFor="restablecer-password">Contraseña nueva</label>
                <input
                  id="restablecer-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                />
                {tocado && !passwordValida && (
                  <span className="auth-hint" style={{ color: 'var(--nx-alert)' }}>
                    Usa al menos {PASS_MIN} caracteres.
                  </span>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="restablecer-confirmar">Confirmar contraseña</label>
                <input
                  id="restablecer-confirmar"
                  type="password"
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => { setConfirmar(e.target.value); setError(null) }}
                  placeholder="••••••••"
                />
                {tocado && passwordValida && !coinciden && (
                  <span className="auth-hint" style={{ color: 'var(--nx-alert)' }}>Las contraseñas no coinciden.</span>
                )}
              </div>

              <div className="auth-actions">
                <button type="submit" className="btn" disabled={enviando}>
                  {enviando ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
