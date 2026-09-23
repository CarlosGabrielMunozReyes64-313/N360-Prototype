/**
 * Foto de perfil predeterminada: la tiene TODO usuario desde que se
 * registra, sin guardar nada en la base. Son sus iniciales sobre un color
 * que sale de su usuario_id, así que:
 *   - cada persona tiene la suya y siempre es la misma (en cualquier
 *     navegador, en el menú y en el panel de admin);
 *   - si cambia de nombre, cambian las iniciales pero no el color.
 */

export interface ColorAvatar {
  fondo: string
  texto: string
}

/** Pares derivados de la paleta NEXUS, todos con contraste de texto ≥ 4.5:1. */
export const PALETA_AVATAR: readonly ColorAvatar[] = [
  { fondo: '#024029', texto: '#dff3e9' },
  { fondo: '#025873', texto: '#dcf0f6' },
  { fondo: '#04a97a', texto: '#02291c' },
  { fondo: '#d99521', texto: '#3b2503' },
  { fondo: '#cfe8dc', texto: '#024029' },
  { fondo: '#d3e6ee', texto: '#02455b' },
  { fondo: '#f4e2bd', texto: '#6a4304' },
  { fondo: '#35a644', texto: '#062b0c' },
]

/** FNV-1a de 32 bits: estable, rápido y con buena dispersión para UUIDs. */
function hash(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function colorPredeterminado(usuarioId: string): ColorAvatar {
  return PALETA_AVATAR[hash(usuarioId) % PALETA_AVATAR.length]
}

/** "Ana María Pérez" → "AM"; "empresa888" → "E"; "" → "?". */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const letras = palabras.map((p) => Array.from(p)[0] ?? '').join('')
  return letras.toLocaleUpperCase('es-CO') || '?'
}
