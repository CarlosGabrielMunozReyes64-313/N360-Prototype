import { AuthError } from './types'

/**
 * reCAPTCHA v3 para el registro, el inicio de sesión y «¿Olvidaste tu contraseña?».
 *
 * Configuración: VITE_RECAPTCHA_SITE_KEY en el .env del front (la clave del
 * SITIO, que es pública). La clave secreta va solo en el .env del backend
 * (RECAPTCHA_SECRET_KEY), que es quien verifica el token con Google.
 * Sin VITE_RECAPTCHA_SITE_KEY todo funciona igual que antes, sin reCAPTCHA.
 *
 * - El script de Google se carga solo en las pantallas de login, registro y
 *   recuperación de contraseña
 *   (AvisoRecaptcha lo precarga al montarse), no en el resto de la app.
 * - El token se pide justo al enviar el formulario: dura dos minutos y sirve
 *   una sola vez. Viaja en la cabecera X-Recaptcha-Token.
 * - La insignia flotante de Google se oculta (auth.css) porque las dos
 *   pantallas muestran el aviso de reCAPTCHA que Google exige en ese caso.
 */

export type AccionRecaptcha = 'registro' | 'login' | 'recuperacion'

interface Grecaptcha {
  ready(alListo: () => void): void
  execute(claveSitio: string, opciones: { action: string }): Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}

const CLAVE_SITIO = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ?? ''
export const RECAPTCHA_ACTIVO = CLAVE_SITIO !== ''

const CABECERA = 'X-Recaptcha-Token'
const ESPERA_MAX_MS = 10_000

const NO_CARGA =
  'No se pudo cargar la verificación de seguridad (reCAPTCHA). Revisa tu conexión o desactiva el ' +
  'bloqueador de anuncios para este sitio, recarga la página e inténtalo de nuevo.'

let carga: Promise<Grecaptcha> | null = null

/** Carga el script de Google una sola vez. null si reCAPTCHA no está configurado. */
export function cargarRecaptcha(): Promise<Grecaptcha> | null {
  if (!RECAPTCHA_ACTIVO) return null
  if (!carga) {
    carga = new Promise<Grecaptcha>((resolver, rechazar) => {
      const limite = window.setTimeout(() => rechazar(new Error('reCAPTCHA no respondió')), ESPERA_MAX_MS)
      const listo = () => {
        const g = window.grecaptcha
        if (!g) {
          window.clearTimeout(limite)
          rechazar(new Error('reCAPTCHA no está disponible'))
          return
        }
        g.ready(() => {
          window.clearTimeout(limite)
          resolver(g)
        })
      }
      if (window.grecaptcha) {
        listo()
        return
      }
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(CLAVE_SITIO)}`
      script.async = true
      script.onload = listo
      script.onerror = () => {
        window.clearTimeout(limite)
        rechazar(new Error('No se pudo descargar reCAPTCHA'))
      }
      document.head.appendChild(script)
    }).catch((e: unknown) => {
      carga = null // el próximo intento vuelve a probar (p. ej. tras desactivar el bloqueador)
      throw e
    })
  }
  return carga
}

/** Cabecera con un token nuevo para la acción, o vacía si reCAPTCHA no está configurado. */
export async function cabeceraRecaptcha(accion: AccionRecaptcha): Promise<Record<string, string>> {
  const pendiente = cargarRecaptcha()
  if (!pendiente) return {}
  try {
    const g = await pendiente
    const token = await g.execute(CLAVE_SITIO, { action: accion })
    return { [CABECERA]: token }
  } catch {
    throw new AuthError('RECAPTCHA', NO_CARGA)
  }
}
