import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import bocaAbierta from '../assets/asistente-boca-abierta.webp'
import bocaCerrada from '../assets/asistente-boca-cerrada.webp'
import { MAX_PREGUNTA, preguntarAlAsistente } from '../auth/asistenteApi'
import type { ContextoAsistente, PasoAsistente } from '../auth/asistenteApi'
import { AuthError } from '../auth/types'
import { IconoCarga } from './IconoCarga'
import './asistente.css'

/**
 * Asistente flotante de la empresa: el personaje en la esquina inferior
 * derecha abre una ventana de chat que guía en el tamizaje y en el
 * autodiagnóstico (respuestas de Gemini vía backend, ver asistenteApi.ts).
 *
 * El personaje «habla» (alterna boca abierta / boca cerrada):
 *   - al abrir la ventana, mientras dice el saludo «¿En qué puedo ayudarte?»
 *     (las veces siguientes, un saludo corto);
 *   - mientras la IA procesa y mientras escribe la respuesta, hasta que
 *     llega completa (evento «fin») y termina de mostrarse.
 * En reposo queda con la boca cerrada. Con «reducir movimiento» activado en
 * el sistema no alterna: muestra la boca abierta mientras habla.
 *
 * Si se cierra la ventana a mitad de una respuesta, la respuesta sigue
 * llegando y el personaje sigue hablando hasta terminar.
 */

export const SALUDO = '¿En qué puedo ayudarte?'

/** Ritmo de la boca (ms entre cambios): irregular para que no parezca un parpadeo mecánico. */
const RITMO = [150, 120, 190, 130, 170, 110]
/** Cuánto «habla» como mínimo al abrir la ventana (el saludo es corto). */
const SALUDO_MS = 1000
const PASO_ESCRITURA_MS = 28

const SUGERENCIAS: Record<PasoAsistente, string[]> = {
  perfil: [
    '¿Dónde encuentro el dígito de verificación?',
    '¿Qué pasos tiene el diagnóstico?',
    '¿Cuánto tiempo toma?',
  ],
  tamizaje: [
    '¿Qué tamaño elijo si no estoy seguro?',
    '¿Qué significa «vinculación»?',
    '¿Qué marco si no hay vecinos cerca?',
  ],
  autodiagnostico: [
    '¿Cómo se responden las preguntas?',
    '¿Puedo dejarlo a medias y seguir después?',
    '¿Qué es «¿En qué punto está?»?',
  ],
  cuestionario: [
    '¿Cómo sé en qué etapa estamos?',
    '¿Cuándo marco «No aplica»?',
    '¿Qué escribo si aún no hacemos nada en este tema?',
  ],
  resultados: [
    '¿Cómo califico la matriz de priorización?',
    '¿Qué son las alertas informativas?',
    '¿Qué pasa después de elegir mi reto?',
  ],
  configuracion: [
    '¿Cómo cambio las respuestas del tamizaje?',
    '¿Qué pasa con mis respuestas si cambio el tamizaje?',
  ],
}

interface Mensaje {
  id: number
  rol: 'usuario' | 'asistente'
  texto: string
  /** La respuesta terminó de llegar (evento «fin») o es un texto local. */
  completo: boolean
  /** Aviso de error: se muestra, pero no viaja al backend. */
  error?: boolean
  /** Pregunta que se puede volver a enviar desde el aviso de error. */
  reintentar?: string
}

interface Props {
  token: string
  contexto: ContextoAsistente
}

export function AsistenteChat({ token, contexto }: Props) {
  const idPanel = useId()
  const reducido = usePrefiereMenosMovimiento()

  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [entrada, setEntrada] = useState('')
  const [pensando, setPensando] = useState(false)
  /** Mensaje del asistente que se está mostrando letra a letra. */
  const [escribiendo, setEscribiendo] = useState<number | null>(null)
  const [visibles, setVisibles] = useState(0)
  const [saludoBreve, setSaludoBreve] = useState(false)

  const siguienteId = useRef(1)
  const peticion = useRef<AbortController | null>(null)
  const temporizadorSaludo = useRef<number | undefined>(undefined)
  const lista = useRef<HTMLDivElement>(null)
  const pegadoAbajo = useRef(true)
  const campo = useRef<HTMLTextAreaElement>(null)
  const lanzador = useRef<HTMLButtonElement>(null)

  const ocupado = pensando || escribiendo !== null
  const hablando = ocupado || saludoBreve
  const abierta = useBoca(hablando, reducido)

  // Al desmontar (cerrar sesión), se corta la respuesta en curso.
  useEffect(() => () => {
    peticion.current?.abort()
    window.clearTimeout(temporizadorSaludo.current)
  }, [])

  // Escritura letra a letra del mensaje en curso: avanza más rápido cuanto
  // más texto haya llegado sin mostrarse, y termina cuando la respuesta está
  // completa y ya se ve entera. Mientras tanto el personaje sigue hablando.
  useEffect(() => {
    if (escribiendo === null) return
    const m = mensajes.find((x) => x.id === escribiendo)
    if (!m) return
    const t = window.setTimeout(() => {
      if (visibles < m.texto.length) {
        const pendiente = m.texto.length - visibles
        // Con poco texto pendiente va letra a letra; con mucho, se pone al día.
        const paso = Math.max(pendiente > 40 ? 2 : 1, Math.ceil(pendiente / 14))
        setVisibles(reducido ? m.texto.length : Math.min(m.texto.length, visibles + paso))
      } else if (m.completo) {
        setEscribiendo(null)
      }
    }, reducido ? 0 : PASO_ESCRITURA_MS)
    return () => window.clearTimeout(t)
  }, [escribiendo, visibles, mensajes, reducido])

  // Mantiene a la vista lo último, salvo que la persona haya subido a releer.
  useEffect(() => {
    const el = lista.current
    if (el && pegadoAbajo.current) el.scrollTop = el.scrollHeight
  }, [mensajes, visibles, pensando, abierto])

  useEffect(() => {
    if (abierto) campo.current?.focus()
  }, [abierto])

  const nuevoId = () => siguienteId.current++

  const abrir = () => {
    setAbierto(true)
    pegadoAbajo.current = true
    if (mensajes.length === 0) {
      const id = nuevoId()
      setMensajes([{ id, rol: 'asistente', texto: SALUDO, completo: true }])
      setVisibles(0)
      setEscribiendo(id)
    }
    // Al abrir, el personaje saluda: habla al menos SALUDO_MS (si ya está
    // respondiendo, sigue hablando hasta terminar de todos modos).
    setSaludoBreve(true)
    window.clearTimeout(temporizadorSaludo.current)
    temporizadorSaludo.current = window.setTimeout(() => setSaludoBreve(false), SALUDO_MS)
  }

  const cerrar = (devolverFoco = true) => {
    setAbierto(false)
    if (devolverFoco) lanzador.current?.focus()
  }

  const enviar = async (texto: string, base: Mensaje[] = mensajes) => {
    const pregunta = texto.trim().slice(0, MAX_PREGUNTA)
    if (!pregunta || ocupado) return

    const historial = [...base.filter((m) => !m.error), { id: nuevoId(), rol: 'usuario' as const, texto: pregunta, completo: true }]
    const idRespuesta = nuevoId()
    setMensajes(historial)
    setEntrada('')
    setPensando(true)
    pegadoAbajo.current = true

    const control = new AbortController()
    peticion.current = control
    let recibido = ''
    try {
      await preguntarAlAsistente(
        token,
        historial.map(({ rol, texto: t }) => ({ rol, texto: t })),
        contexto,
        (parte) => {
          if (!recibido) {
            setPensando(false)
            setMensajes((ms) => [...ms, { id: idRespuesta, rol: 'asistente', texto: '', completo: false }])
            setVisibles(0)
            setEscribiendo(idRespuesta)
          }
          recibido += parte
          const actual = recibido
          setMensajes((ms) => ms.map((m) => (m.id === idRespuesta ? { ...m, texto: actual } : m)))
        },
        control.signal,
      )
      setMensajes((ms) => ms.map((m) => (m.id === idRespuesta ? { ...m, completo: true } : m)))
    } catch (e) {
      if (control.signal.aborted) return
      setPensando(false)
      const aviso = textoDeError(e)
      setMensajes((ms) => [
        // Lo que alcanzó a llegar se conserva y se da por terminado.
        ...ms.map((m) => (m.id === idRespuesta ? { ...m, completo: true } : m)),
        { id: nuevoId(), rol: 'asistente', texto: aviso.texto, completo: true, error: true,
          reintentar: aviso.reintentable ? pregunta : undefined },
      ])
    } finally {
      if (peticion.current === control) peticion.current = null
    }
  }

  const reintentar = (m: Mensaje) => {
    if (!m.reintentar) return
    // Se quita la pregunta fallida (y lo que alcanzó a llegar) y se envía otra vez.
    const i = mensajes.findIndex((x) => x.id === m.id)
    const anteriores = mensajes.slice(0, i)
    const ultimaPregunta = anteriores.map((x) => x.rol).lastIndexOf('usuario')
    void enviar(m.reintentar, ultimaPregunta >= 0 ? anteriores.slice(0, ultimaPregunta) : anteriores)
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    void enviar(entrada)
  }

  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía; Mayús + Enter hace un salto de línea.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void enviar(entrada)
    }
  }

  const alTeclearPanel = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      cerrar()
    }
  }

  const sinPreguntas = !mensajes.some((m) => m.rol === 'usuario')
  const sugerencias = contexto.paso ? SUGERENCIAS[contexto.paso] : SUGERENCIAS.autodiagnostico

  return (
    <div className="asis">
      {abierto && (
        <section
          id={idPanel}
          className="asis-panel"
          role="dialog"
          aria-label="Asistente NEXUS"
          onKeyDown={alTeclearPanel}
        >
          <header className="asis-cab">
            <div>
              <h2 className="asis-titulo">Asistente NEXUS</h2>
              <p className="asis-sub">Te guío en el tamizaje y el autodiagnóstico</p>
            </div>
            <button type="button" className="asis-cerrar" aria-label="Cerrar el asistente" onClick={() => cerrar()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>

          <div
            ref={lista}
            className="asis-mensajes"
            role="log"
            aria-live="polite"
            aria-busy={ocupado}
            onScroll={(e) => {
              const el = e.currentTarget
              pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
            }}
          >
            {mensajes.map((m) => {
              const enCurso = m.id === escribiendo
              const texto = enCurso ? sinNegritaAbierta(m.texto.slice(0, visibles)) : m.texto
              if (m.rol === 'usuario') {
                return <p key={m.id} className="asis-msg asis-msg--yo">{m.texto}</p>
              }
              return (
                <div key={m.id} className={'asis-msg asis-msg--bot' + (m.error ? ' asis-msg--error' : '')}>
                  <TextoFormateado texto={texto} />
                  {m.reintentar && (
                    <button type="button" className="asis-reintentar" disabled={ocupado} onClick={() => reintentar(m)}>
                      Reintentar
                    </button>
                  )}
                </div>
              )
            })}

            {pensando && (
              <div className="asis-msg asis-msg--bot asis-pensando">
                <IconoCarga tamano={26} />
                <span className="asis-oculto">El asistente está escribiendo</span>
              </div>
            )}

            {sinPreguntas && escribiendo === null && mensajes.length > 0 && (
              <div className="asis-sugerencias" aria-label="Preguntas sugeridas">
                {sugerencias.map((s) => (
                  <button key={s} type="button" className="asis-sugerencia" onClick={() => void enviar(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="asis-form" onSubmit={alEnviar}>
            <label className="asis-oculto" htmlFor={`${idPanel}-campo`}>Escribe tu pregunta</label>
            <textarea
              id={`${idPanel}-campo`}
              ref={campo}
              className="asis-campo"
              rows={1}
              maxLength={MAX_PREGUNTA}
              placeholder="Escribe tu pregunta…"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={alTeclear}
            />
            <button type="submit" className="asis-enviar" aria-label="Enviar pregunta" disabled={ocupado || !entrada.trim()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <p className="asis-nota">Respuestas generadas con IA (Gemini). No escribas datos personales.</p>
        </section>
      )}

      <button
        ref={lanzador}
        type="button"
        className={'asis-lanzador' + (abierto ? ' is-abierto' : '')}
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-label={abierto ? 'Cerrar el asistente' : 'Abrir el asistente: ¿en qué puedo ayudarte?'}
        onClick={() => (abierto ? cerrar(false) : abrir())}
      >
        <span className="asis-cara" data-hablando={hablando || undefined}>
          {/* Las dos imágenes quedan cargadas: alternar no parpadea. */}
          <img src={bocaCerrada} alt="" width={64} height={64} className={abierta ? 'is-oculta' : undefined} />
          <img src={bocaAbierta} alt="" width={64} height={64} className={abierta ? undefined : 'is-oculta'} />
        </span>
        {!abierto && <span className="asis-etiqueta" aria-hidden="true">¿Dudas con la encuesta? Pregúntame</span>}
      </button>
    </div>
  )
}

/* ---------------------------------------------------------- personaje */

/** true = boca abierta. Alterna mientras `hablando`; en reposo, cerrada. */
function useBoca(hablando: boolean, reducido: boolean): boolean {
  const [abierta, setAbierta] = useState(false)
  useEffect(() => {
    if (!hablando || reducido) return
    let i = 0
    let t = window.setTimeout(function cambiar() {
      setAbierta((a) => !a)
      t = window.setTimeout(cambiar, RITMO[i++ % RITMO.length])
    }, 60)
    return () => window.clearTimeout(t)
  }, [hablando, reducido])
  if (!hablando) return false
  return reducido ? true : abierta
}

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)'

function usePrefiereMenosMovimiento(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia?.(CONSULTA_MOVIMIENTO)
      mq?.addEventListener('change', avisar)
      return () => mq?.removeEventListener('change', avisar)
    },
    () => window.matchMedia?.(CONSULTA_MOVIMIENTO).matches ?? false,
    () => false,
  )
}

/* ---------------------------------------------------------- errores */

function textoDeError(e: unknown): { texto: string; reintentable: boolean } {
  if (!(e instanceof AuthError)) {
    return { texto: 'Algo salió mal al responder. Inténtalo de nuevo.', reintentable: true }
  }
  switch (e.code) {
    case 'CREDENCIALES_INVALIDAS':
      return { texto: 'Tu sesión expiró. Vuelve a iniciar sesión para seguir conversando.', reintentable: false }
    case 'IA_LIMITE':
    case 'IA_NO_CONFIGURADA':
    case 'PROHIBIDO':
      return { texto: e.message, reintentable: false }
    default:
      return { texto: e.message || 'No pude responder en este momento. Inténtalo de nuevo.', reintentable: true }
  }
}

/* ---------------------------------------------------------- texto */

/** Mientras se escribe letra a letra, oculta un «**» que aún no cierra. */
function sinNegritaAbierta(t: string): string {
  const partes = t.split('**')
  return partes.length % 2 === 0 ? partes.slice(0, -1).join('**') + partes[partes.length - 1] : t
}

/** Negritas (**así**) dentro de una línea, sin interpretar HTML. */
function enLinea(t: string): ReactNode[] {
  return t.split(/(\*\*[^*\n]+\*\*)/g).filter(Boolean).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  )
}

const VINETA = /^\s*[-•*]\s+/

/** Párrafos y listas con guiones: el formato que pide el prompt del backend. */
function TextoFormateado({ texto }: { texto: string }) {
  const bloques: ReactNode[] = []
  texto.split(/\n{2,}/).forEach((bloque, b) => {
    let parrafo: string[] = []
    let lista: string[] = []
    const cerrarParrafo = () => {
      if (parrafo.length) {
        const lineas = parrafo
        bloques.push(
          <p key={`p${b}-${bloques.length}`}>
            {lineas.map((l, i) => <span key={i}>{i > 0 && <br />}{enLinea(l)}</span>)}
          </p>,
        )
      }
      parrafo = []
    }
    const cerrarLista = () => {
      if (lista.length) {
        const items = lista
        bloques.push(<ul key={`u${b}-${bloques.length}`}>{items.map((l, i) => <li key={i}>{enLinea(l)}</li>)}</ul>)
      }
      lista = []
    }
    for (const linea of bloque.split('\n')) {
      if (!linea.trim()) continue
      if (VINETA.test(linea)) {
        cerrarParrafo()
        lista.push(linea.replace(VINETA, ''))
      } else {
        cerrarLista()
        parrafo.push(linea)
      }
    }
    cerrarParrafo()
    cerrarLista()
  })
  return <>{bloques}</>
}
