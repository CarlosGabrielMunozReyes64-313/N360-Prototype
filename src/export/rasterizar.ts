/**
 * Convierte el SVG de la gráfica en un PNG para incrustarlo en el Excel y
 * en el Word. Se serializa a data URI (no a blob URL) a propósito: un data
 * URI no marca el canvas como contaminado, así que `toDataURL` funciona sin
 * pedir CORS y sin depender de que el navegador permita leer el blob.
 */

export interface Imagen {
  dataUrl: string
  /** Píxeles reales del PNG (ya multiplicados por la escala). */
  ancho: number
  alto: number
  /** Puntos del SVG original, útiles para conservar la proporción. */
  anchoBase: number
  altoBase: number
}

/** Base64 → bytes, que es lo que espera la librería `docx`. */
export function dataUrlABytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

export async function svgAPng(svg: SVGSVGElement, escala = 2): Promise<Imagen> {
  const caja = svg.viewBox.baseVal
  const anchoBase = caja && caja.width ? caja.width : svg.clientWidth || 1200
  const altoBase = caja && caja.height ? caja.height : svg.clientHeight || 600

  const clon = svg.cloneNode(true) as SVGSVGElement
  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clon.setAttribute('width', String(anchoBase))
  clon.setAttribute('height', String(altoBase))
  // El SVG en pantalla se estira con CSS; el clon debe llevar medidas fijas.
  clon.removeAttribute('style')

  const texto = new XMLSerializer().serializeToString(clon)
  const fuente = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texto)}`

  const img = await new Promise<HTMLImageElement>((resolver, rechazar) => {
    const el = new Image()
    el.onload = () => resolver(el)
    el.onerror = () => rechazar(new Error('No se pudo rasterizar la gráfica.'))
    el.src = fuente
  })

  const ancho = Math.round(anchoBase * escala)
  const alto = Math.round(altoBase * escala)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('El navegador no permitió abrir un lienzo 2D.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(img, 0, 0, ancho, alto)

  return { dataUrl: lienzo.toDataURL('image/png'), ancho, alto, anchoBase, altoBase }
}
