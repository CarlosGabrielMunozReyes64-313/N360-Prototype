/* Íconos de trazo, en línea para no sumar dependencias. Heredan el color
   del texto (currentColor) y son decorativos: el texto del botón o su
   aria-label ya dice qué hace. */

import type { ReactNode } from 'react'

interface Props {
  tamano?: number
}

function Svg({ tamano = 18, children }: Props & { children: ReactNode }) {
  return (
    <svg
      width={tamano} height={tamano} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      {children}
    </svg>
  )
}

export function IconoAjustes(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Svg>
  )
}

export function IconoSalir(p: Props) {
  return (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  )
}

export function IconoFlecha(p: Props) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function IconoCamara(p: Props) {
  return (
    <Svg {...p}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Svg>
  )
}

export function IconoGirar(p: Props) {
  return (
    <Svg {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  )
}

export function IconoMas(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
    </Svg>
  )
}

export function IconoMenos(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M8 11h6" />
    </Svg>
  )
}

export function IconoBarras(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 5h9M4 10h15M4 15h6M4 20h12" strokeWidth={2.6} />
    </Svg>
  )
}

export function IconoPastel(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
      <path d="M15 3.5A9 9 0 0 1 20.5 9H15Z" />
    </Svg>
  )
}

export function IconoEtapas(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 6h5M8 6h6M14 6h7M3 12h9M12 12h4M16 12h5M3 18h3M6 18h10M16 18h5" strokeWidth={3} />
    </Svg>
  )
}

export function IconoCampana(p: Props) {
  return (
    <Svg {...p}>
      <path d="M2 20c3.5 0 4.5-14 10-14s6.5 14 10 14" />
      <path d="M2 20h20" />
    </Svg>
  )
}

export function IconoDescarga(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Svg>
  )
}
