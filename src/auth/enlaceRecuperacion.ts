/**
 * Enlace del correo de recuperación: {FRONTEND_URL}/#/restablecer?token=<64 hex>
 *
 * El token va después del «#» a propósito: el navegador nunca manda esa
 * parte a ningún servidor (ni a Vercel, ni en la cabecera Referer), así que
 * no queda en logs de acceso. Aun así, apenas se lee, se borra de la barra
 * de direcciones y del historial (replaceState, sin entrada nueva): no debe
 * quedar a la vista en pantalla, en una captura ni en «atrás».
 */

const RUTA = 'restablecer'

/** '#/restablecer?token=abc' -> 'abc'. null si la dirección no trae token. */
export function tokenDesdeHash(hash: string): string | null {
  const h = hash.replace(/^#\/?/, '')
  if (h !== RUTA && !h.startsWith(`${RUTA}?`)) return null
  const query = h.slice(RUTA.length + 1)
  const token = new URLSearchParams(query).get('token')?.trim()
  return token ? token : null
}

/** ¿La dirección es la pantalla de restablecer (con o sin token)? */
export function esRutaRestablecer(hash: string): boolean {
  const h = hash.replace(/^#\/?/, '')
  return h === RUTA || h.startsWith(`${RUTA}?`)
}

/** Deja la dirección en #/restablecer, sin el token y sin agregar historial. */
export function quitarTokenDeLaUrl(): void {
  if (tokenDesdeHash(window.location.hash) === null) return
  window.history.replaceState(
    window.history.state, '', `${window.location.pathname}${window.location.search}#/${RUTA}`,
  )
}
