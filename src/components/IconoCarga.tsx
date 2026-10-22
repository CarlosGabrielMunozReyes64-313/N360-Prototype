import gif from '../assets/cargando.gif'
import quieto from '../assets/cargando-quieto.png'

interface Props {
  /** Lado en píxeles (el GIF es cuadrado). */
  tamano?: number
  className?: string
}

/**
 * Ícono de carga de NEXUS 360° (GIF animado). Se usa en todas las pantallas
 * y avisos de carga, siempre junto a un texto que dice qué está cargando:
 * el ícono es decorativo para los lectores de pantalla.
 *
 * Con «reducir movimiento» activado en el sistema se muestra un cuadro fijo
 * del mismo ícono (igual que index.css detiene las demás animaciones).
 */
export function IconoCarga({ tamano = 24, className }: Props) {
  return (
    <picture className={'icono-carga' + (className ? ` ${className}` : '')} aria-hidden="true">
      <source srcSet={quieto} media="(prefers-reduced-motion: reduce)" />
      <img src={gif} alt="" width={tamano} height={tamano} draggable={false} />
    </picture>
  )
}
