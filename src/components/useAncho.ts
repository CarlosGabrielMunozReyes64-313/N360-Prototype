import { useCallback, useState } from 'react'

/** Ancho que se usa si el navegador no tiene ResizeObserver (p. ej. jsdom). */
const ANCHO_RESPALDO = 960

/**
 * Ancho real (px) de un contenedor, actualizado cuando cambia de tamaño.
 * Las gráficas lo usan para dibujarse a su tamaño verdadero en vez de
 * estirar un SVG fijo: así el texto nunca se encoge hasta volverse
 * ilegible en pantallas angostas. Devuelve 0 hasta la primera medida.
 */
export function useAncho(): [(el: HTMLElement | null) => (() => void) | undefined, number] {
  const [ancho, setAncho] = useState(0)

  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return undefined
    if (typeof ResizeObserver === 'undefined') {
      setAncho(el.clientWidth || ANCHO_RESPALDO)
      return undefined
    }
    const observador = new ResizeObserver((entradas) => {
      const w = Math.floor(entradas[0]?.contentRect.width ?? 0)
      if (w > 0) setAncho(w)
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return [ref, ancho]
}
