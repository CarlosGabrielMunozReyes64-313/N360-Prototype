import { useEffect } from 'react'
import { RECAPTCHA_ACTIVO, cargarRecaptcha } from '../auth/recaptcha'

/**
 * Aviso de reCAPTCHA para las pantallas de login y registro. Google permite
 * ocultar su insignia flotante si se muestra este texto con los enlaces a su
 * Política de privacidad y sus Condiciones del servicio.
 *
 * Además precarga el script al abrir la pantalla: así el token sale al
 * instante al enviar y reCAPTCHA alcanza a observar la interacción, lo que
 * mejora el puntaje de las personas reales. Sin VITE_RECAPTCHA_SITE_KEY no
 * muestra nada.
 */
export function AvisoRecaptcha() {
  useEffect(() => {
    // Si no carga, el error se muestra al enviar el formulario.
    cargarRecaptcha()?.catch(() => {})
  }, [])

  if (!RECAPTCHA_ACTIVO) return null
  return (
    <p className="auth-recaptcha">
      Este sitio está protegido por reCAPTCHA y se aplican la{' '}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Política de privacidad</a>
      {' '}y las{' '}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Condiciones del servicio</a>
      {' '}de Google.
    </p>
  )
}
