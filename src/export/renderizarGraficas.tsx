import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { Seccion } from '../engine/agregados'
import type { Vista } from '../engine/vistasGraficas'
import { GraficaSegunVista } from '../components/GraficaSegunVista'
import { svgAPng } from './rasterizar'
import type { Imagen } from './rasterizar'

/** Ancho con el que se dibujan las gráficas para los archivos: el mismo
 * PDF sale igual lo descargue alguien desde un celular o un monitor. */
export const ANCHO_EXPORTACION = 1100

interface Opciones {
  /** Título y fecha dentro de la imagen (Excel y Word); el PDF los pone aparte. */
  conEncabezado?: boolean
  fecha?: string
  ancho?: number
  /** Píxeles por punto: 2,5 da ~300 ppp al imprimir en A4. */
  escala?: number
}

/**
 * Dibuja una gráfica fuera de pantalla (en un nodo que nunca se agrega
 * al documento) y la convierte en PNG. No depende de lo que el admin
 * tenga abierto ni del tamaño de su ventana.
 */
export async function imagenDeGrafica(vista: Vista, secciones: Seccion[], o: Opciones = {}): Promise<Imagen> {
  const nodo = document.createElement('div')
  const raiz = createRoot(nodo)
  try {
    flushSync(() => {
      raiz.render(
        <GraficaSegunVista
          vista={vista}
          secciones={secciones}
          ancho={o.ancho ?? ANCHO_EXPORTACION}
          conEncabezado={o.conEncabezado ?? false}
          fecha={o.fecha}
        />,
      )
    })
    const svg = nodo.querySelector('svg')
    if (!svg) throw new Error('La gráfica no se pudo dibujar.')
    return await svgAPng(svg, o.escala ?? 2.5)
  } finally {
    raiz.unmount()
  }
}
