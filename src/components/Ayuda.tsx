import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { partirConGlosario } from '../data/glosario'

/**
 * Explicaciones sencillas que aparecen al pasar el mouse.
 *
 * - <Ayuda texto>…</Ayuda> envuelve una opción (chip, botón, etapa) sin
 *   cambiar el diseño: el envoltorio usa `display: contents`.
 * - <Termino definicion>…</Termino> marca una palabra dentro de un texto
 *   (subrayado punteado). Se puede enfocar con el teclado.
 * - <TextoConGlosario texto /> marca los términos de data/glosario.ts.
 *
 * El globo aparece al pasar el mouse, al llegar con el teclado (Tab) o al
 * tocar en pantallas táctiles; se cierra al salir, con Escape o, si se
 * abrió tocando, a los pocos segundos. Solo hay un globo abierto a la vez.
 * Para los lectores de pantalla la explicación es la descripción
 * (aria-describedby) del control, y el globo visual se oculta para que no
 * se lea dos veces.
 */

const RETRASO_MS = 150
const CIERRE_TACTIL_MS = 4500
const SEPARACION = 10
const BORDE = 8
/** Evento con el que un globo que se abre le pide a los demás cerrarse. */
const EVENTO_ABRE = 'n360:ayuda-abre'

function colocar(ancla: Element, globo: HTMLElement) {
  const r = ancla.getBoundingClientRect()
  const g = globo.getBoundingClientRect()
  const ancho = document.documentElement.clientWidth || window.innerWidth
  const alto = window.innerHeight
  const centro = r.left + r.width / 2
  const left = Math.max(BORDE, Math.min(centro - g.width / 2, ancho - g.width - BORDE))
  const cabeArriba = r.top - g.height - SEPARACION >= BORDE
  const cabeAbajo = r.bottom + g.height + SEPARACION <= alto - BORDE
  const arriba = cabeArriba || (!cabeAbajo && r.top > alto - r.bottom)
  const top = arriba ? r.top - g.height - SEPARACION : r.bottom + SEPARACION
  globo.style.left = `${Math.round(left)}px`
  globo.style.top = `${Math.round(top)}px`
  globo.style.setProperty('--flecha', `${Math.round(Math.max(14, Math.min(centro - left, g.width - 14)))}px`)
  globo.dataset.lado = arriba ? 'arriba' : 'abajo'
  globo.style.visibility = 'visible'
}

function enfoqueVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

interface OpcionesGlobo {
  /** Abrir también al llegar con el teclado. */
  alEnfocar?: boolean
  /** Elemento que se mide para colocar el globo, a partir del envoltorio. */
  medir?: (envoltorio: HTMLElement) => Element | null
  /** Control que recibe aria-describedby, a partir del envoltorio. */
  describir?: (envoltorio: HTMLElement) => Element | null
}

function useGlobo(texto: string | undefined, { alEnfocar = true, medir, describir }: OpcionesGlobo = {}) {
  const id = useId()
  const idDescripcion = `ayuda-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const envoltorio = useRef<HTMLElement | null>(null)
  const globo = useRef<HTMLDivElement | null>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const ultimoToque = useRef(0)
  const [abierto, setAbierto] = useState(false)

  const limpiarTemporizador = () => {
    if (temporizador.current !== undefined) window.clearTimeout(temporizador.current)
    temporizador.current = undefined
  }
  const cerrar = () => {
    limpiarTemporizador()
    setAbierto(false)
  }
  const abrir = () => {
    limpiarTemporizador()
    window.dispatchEvent(new CustomEvent(EVENTO_ABRE, { detail: idDescripcion }))
    setAbierto(true)
  }

  // El control (checkbox, radio, botón o término) se describe con la ayuda.
  useEffect(() => {
    const raiz = envoltorio.current
    if (!texto || !raiz) return
    const control = describir ? describir(raiz) : raiz
    if (!control) return
    const previos = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    if (!previos.includes(idDescripcion)) control.setAttribute('aria-describedby', [...previos, idDescripcion].join(' '))
    return () => {
      const resto = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((x) => x && x !== idDescripcion)
      if (resto.length) control.setAttribute('aria-describedby', resto.join(' '))
      else control.removeAttribute('aria-describedby')
    }
  }, [texto, idDescripcion, describir])

  // Abierto: se coloca después de pintarse, sigue al desplazamiento y se
  // cierra con Escape o cuando se abre otro globo.
  useLayoutEffect(() => {
    if (!abierto) return
    const raiz = envoltorio.current
    const g = globo.current
    if (!raiz || !g) return
    const ancla = (medir ? medir(raiz) : raiz) ?? raiz
    const reubicar = () => colocar(ancla, g)
    const ocultar = () => {
      if (temporizador.current !== undefined) window.clearTimeout(temporizador.current)
      temporizador.current = undefined
      setAbierto(false)
    }
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') ocultar() }
    const alAbrirOtro = (e: Event) => { if ((e as CustomEvent<string>).detail !== idDescripcion) ocultar() }
    reubicar()
    window.addEventListener('scroll', reubicar, true)
    window.addEventListener('resize', reubicar)
    window.addEventListener(EVENTO_ABRE, alAbrirOtro)
    document.addEventListener('keydown', alTeclado)
    return () => {
      window.removeEventListener('scroll', reubicar, true)
      window.removeEventListener('resize', reubicar)
      window.removeEventListener(EVENTO_ABRE, alAbrirOtro)
      document.removeEventListener('keydown', alTeclado)
    }
  }, [abierto, medir, idDescripcion])

  // Al desmontar no quedan temporizadores pendientes.
  useEffect(() => () => {
    if (temporizador.current !== undefined) window.clearTimeout(temporizador.current)
  }, [])

  const manejadores = texto
    ? {
      onMouseEnter: () => {
        // Tras un toque, el navegador simula un «mouseenter»: se ignora para
        // no anular el cierre automático del globo táctil.
        if (Date.now() - ultimoToque.current < 1000) return
        limpiarTemporizador()
        temporizador.current = window.setTimeout(abrir, RETRASO_MS)
      },
      onMouseLeave: cerrar,
      onFocus: (e: FocusEvent<HTMLElement>) => {
        if (alEnfocar && enfoqueVisible(e.target)) abrir()
      },
      onBlur: cerrar,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'touch') return
        ultimoToque.current = Date.now()
        abrir()
        temporizador.current = window.setTimeout(() => setAbierto(false), CIERRE_TACTIL_MS)
      },
    }
    : {}

  // La descripción y el globo van fuera del texto (en <body>): así no
  // cambian el nombre accesible de la opción ni el texto de la pregunta.
  const extra = texto
    ? createPortal(
      <>
        <span id={idDescripcion} hidden>{texto}</span>
        {abierto && (
          <div ref={globo} className="ayuda-globo" aria-hidden="true" style={{ visibility: 'hidden' }}>
            {texto}
          </div>
        )}
      </>,
      document.body,
    )
    : null

  return { envoltorio, manejadores, extra }
}

const primerElemento = (raiz: HTMLElement) => raiz.firstElementChild
const primerControl = (raiz: HTMLElement) =>
  raiz.querySelector('input, button, select, textarea, [tabindex]')

/**
 * Envuelve una opción para mostrar su explicación. No cambia el diseño:
 * el hijo sigue siendo el chip o el botón de siempre.
 */
export function Ayuda({ texto, alEnfocar = true, children }: {
  texto?: string
  /** false en campos de texto: el globo no tapa lo que se escribe. */
  alEnfocar?: boolean
  children: ReactNode
}) {
  const { envoltorio, manejadores, extra } = useGlobo(texto, {
    alEnfocar, medir: primerElemento, describir: primerControl,
  })
  if (!texto) return <>{children}</>
  return (
    <span className="ayuda" ref={envoltorio} {...manejadores}>
      {children}
      {extra}
    </span>
  )
}

/** Palabra o frase con definición, dentro de un texto. */
export function Termino({ definicion, children }: { definicion: string; children: ReactNode }) {
  const { envoltorio, manejadores, extra } = useGlobo(definicion)
  return (
    <span className="termino" tabIndex={0} ref={envoltorio} {...manejadores}>
      {children}
      {extra}
    </span>
  )
}

/** Texto con los términos del glosario marcados (data/glosario.ts). */
export function TextoConGlosario({ texto }: { texto: string }) {
  return (
    <>
      {partirConGlosario(texto).map((f, i) => (typeof f === 'string'
        ? f
        : <Termino key={i} definicion={f.definicion}>{f.texto}</Termino>))}
    </>
  )
}
