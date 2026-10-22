import { API_URL } from './api'
import { parseError } from './empresaApi'
import { AuthError } from './types'

/**
 * Asistente de la empresa (chatbot del personaje). Guía en el tamizaje y en
 * el Autodiagnóstico RSE Express; la respuesta la genera Gemini en el
 * backend (la API Key nunca pasa por el navegador).
 *
 * Contrato: POST {API_URL}/asistente/mensajes
 *   body: { mensajes: MensajeAsistente[], contexto: ContextoAsistente }
 *   200 -> NDJSON, una línea por evento, a medida que Gemini escribe:
 *            {"tipo":"texto","texto":"…"}   (0 o más)
 *            {"tipo":"error","codigo":"…","mensaje":"…"}   (si se corta a mitad)
 *            {"tipo":"fin"}                 (siempre, al final)
 *   401 CREDENCIALES_INVALIDAS · 403 PROHIBIDO (cuentas admin)
 *   429 IA_LIMITE · 503 IA_NO_DISPONIBLE | IA_NO_CONFIGURADA   -> { codigo, mensaje }
 *
 * No se envían las respuestas del diagnóstico ni los datos de la empresa:
 * solo la conversación y en qué pantalla está la persona.
 */

export const RUTA_ASISTENTE = '/asistente/mensajes'

/** Mensajes que viajan al backend (él usa solo los más recientes). */
export const MAX_MENSAJES_ENVIADOS = 20
export const MAX_PREGUNTA = 1000

export type PasoAsistente =
  | 'perfil' | 'tamizaje' | 'autodiagnostico' | 'cuestionario' | 'resultados' | 'configuracion'

export interface ContextoAsistente {
  paso: PasoAsistente | null
  /** Número de la materia abierta en el cuestionario («01»…«07»). */
  materia: string | null
}

export interface MensajeAsistente {
  rol: 'usuario' | 'asistente'
  texto: string
}

interface Evento {
  tipo: 'texto' | 'error' | 'fin'
  texto?: string
  codigo?: string
  mensaje?: string
}

const CORTADA = 'La respuesta se cortó antes de terminar. Inténtalo de nuevo.'

/**
 * Envía la conversación y llama `onTexto` con cada parte de la respuesta.
 * Se resuelve cuando llega el evento «fin»: solo entonces la respuesta está
 * completa. Lanza AuthError si el backend responde con error, si la
 * respuesta se corta o si no hay conexión.
 */
export async function preguntarAlAsistente(
  token: string,
  mensajes: MensajeAsistente[],
  contexto: ContextoAsistente,
  onTexto: (parte: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${RUTA_ASISTENTE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mensajes: mensajes.slice(-MAX_MENSAJES_ENVIADOS), contexto }),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new AuthError('RED', 'No pude conectarme con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!res.ok) throw await parseError(res)

  let terminado = false
  const procesar = (linea: string) => {
    if (!linea.trim()) return
    let ev: Evento
    try {
      ev = JSON.parse(linea) as Evento
    } catch {
      return // línea incompleta o ajena al contrato: se ignora
    }
    if (ev.tipo === 'texto' && ev.texto) onTexto(ev.texto)
    else if (ev.tipo === 'error') {
      throw new AuthError((ev.codigo ?? 'IA_NO_DISPONIBLE') as AuthError['code'], ev.mensaje ?? CORTADA)
    } else if (ev.tipo === 'fin') terminado = true
  }

  try {
    if (!res.body) {
      // Navegadores sin lectura por partes: se procesa todo al final.
      (await res.text()).split('\n').forEach(procesar)
    } else {
      const lector = res.body.getReader()
      const decodificador = new TextDecoder()
      let pendiente = ''
      for (;;) {
        const { value, done } = await lector.read()
        if (done) break
        pendiente += decodificador.decode(value, { stream: true })
        const lineas = pendiente.split('\n')
        pendiente = lineas.pop() ?? ''
        lineas.forEach(procesar)
      }
      procesar(pendiente + decodificador.decode())
    }
  } catch (e) {
    if (e instanceof AuthError || signal?.aborted) throw e
    throw new AuthError('RED', CORTADA)
  }
  if (!terminado) throw new AuthError('RED', CORTADA)
}
