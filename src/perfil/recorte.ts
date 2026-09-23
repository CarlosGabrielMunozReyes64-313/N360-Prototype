/**
 * Matemática del editor de foto de perfil, separada del componente para
 * poder probarla sin navegador.
 *
 * Sistema de coordenadas: todo se mide en FRACCIONES del lado del recorte
 * (el cuadrado que contiene el círculo). Así el mismo encuadre sirve para
 * la vista previa en pantalla (mida lo que mida) y para el lienzo final
 * de 512 px, sin conversiones que se desalineen.
 *
 *   zoom      1 = la imagen justo cubre el recorte por su lado más corto.
 *   rotacion  giro horario en grados.
 *   x, y      desplazamiento del CENTRO de la imagen respecto al centro
 *             del recorte (0,0 = centrada; 0.1 = un 10 % del lado).
 */

export type Rotacion = 0 | 90 | 180 | 270

export interface Encuadre {
  zoom: number
  rotacion: Rotacion
  x: number
  y: number
}

export interface Dimensiones {
  ancho: number
  alto: number
}

export const ZOOM_MIN = 1
export const ZOOM_MAX = 4
export const LADO_FINAL = 512

export const ENCUADRE_INICIAL: Encuadre = { zoom: 1, rotacion: 0, x: 0, y: 0 }

/** Ancho y alto de la imagen ya girada. */
export function dimensionesGiradas({ ancho, alto }: Dimensiones, rotacion: Rotacion): [number, number] {
  return rotacion === 90 || rotacion === 270 ? [alto, ancho] : [ancho, alto]
}

/** Tamaño de la imagen SIN girar, en fracciones del lado del recorte. Es
 * lo que mide el <img> antes de aplicarle la rotación. */
export function tamanoRelativo(dim: Dimensiones, enc: Pick<Encuadre, 'zoom' | 'rotacion'>): { w: number; h: number } {
  const [gw, gh] = dimensionesGiradas(dim, enc.rotacion)
  const base = Math.min(gw, gh)
  return { w: (dim.ancho / base) * enc.zoom, h: (dim.alto / base) * enc.zoom }
}

/** Cuánto se puede mover la imagen sin que aparezca un borde vacío. */
export function limites(dim: Dimensiones, enc: Pick<Encuadre, 'zoom' | 'rotacion'>): { x: number; y: number } {
  const [gw, gh] = dimensionesGiradas(dim, enc.rotacion)
  const base = Math.min(gw, gh)
  return {
    x: Math.max(0, ((gw / base) * enc.zoom - 1) / 2),
    y: Math.max(0, ((gh / base) * enc.zoom - 1) / 2),
  }
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Deja el encuadre dentro de lo permitido (zoom en rango, sin bordes). */
export function acotar(dim: Dimensiones, enc: Encuadre): Encuadre {
  const zoom = entre(enc.zoom, ZOOM_MIN, ZOOM_MAX)
  const lim = limites(dim, { zoom, rotacion: enc.rotacion })
  return {
    zoom,
    rotacion: enc.rotacion,
    // `+ 0` convierte un -0 en 0 (evita sorpresas al comparar en pruebas).
    x: entre(enc.x, -lim.x, lim.x) + 0,
    y: entre(enc.y, -lim.y, lim.y) + 0,
  }
}

/** Arrastrar: dx, dy en fracciones del lado del recorte. */
export function mover(dim: Dimensiones, enc: Encuadre, dx: number, dy: number): Encuadre {
  return acotar(dim, { ...enc, x: enc.x + dx, y: enc.y + dy })
}

/**
 * Cambia el zoom manteniendo fijo el punto `(px, py)` del recorte
 * (relativo a su centro, en fracciones). Con el punto en (0,0) acerca
 * hacia el centro, como la barra; con la posición del cursor o del
 * pellizco, acerca hacia donde está el dedo.
 */
export function zoomHacia(dim: Dimensiones, enc: Encuadre, zoom: number, px = 0, py = 0): Encuadre {
  const nuevo = entre(zoom, ZOOM_MIN, ZOOM_MAX)
  const f = nuevo / enc.zoom
  return acotar(dim, {
    ...enc,
    zoom: nuevo,
    x: px - (px - enc.x) * f,
    y: py - (py - enc.y) * f,
  })
}

/** Gira 90° en sentido horario, dejando en el centro lo que ya lo estaba. */
export function girar(dim: Dimensiones, enc: Encuadre): Encuadre {
  const rotacion = ((enc.rotacion + 90) % 360) as Rotacion
  // Girar la imagen 90° sobre su centro gira también el vector que va de
  // su centro al del recorte: (x, y) → (−y, x) en coordenadas de pantalla.
  return acotar(dim, { zoom: enc.zoom, rotacion, x: -enc.y, y: enc.x })
}

/**
 * Pinta el recorte en un lienzo cuadrado de `lado` px, con fondo blanco
 * (las partes transparentes de un PNG quedan blancas, igual que en el
 * backend). Es la misma transformación que la vista previa, en píxeles.
 */
export function dibujarRecorte(
  imagen: CanvasImageSource,
  dim: Dimensiones,
  enc: Encuadre,
  lado = LADO_FINAL,
): HTMLCanvasElement {
  const lienzo = document.createElement('canvas')
  lienzo.width = lado
  lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('Este navegador no permite editar imágenes.')

  const { w, h } = tamanoRelativo(dim, enc)
  const destinoAncho = w * lado
  const destinoAlto = h * lado
  const fuente = reducirPorMitades(imagen, dim, destinoAncho, destinoAlto)

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, lado, lado)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(lado / 2 + enc.x * lado, lado / 2 + enc.y * lado)
  ctx.rotate((enc.rotacion * Math.PI) / 180)
  ctx.drawImage(fuente, -destinoAncho / 2, -destinoAlto / 2, destinoAncho, destinoAlto)
  return lienzo
}

/**
 * Una foto de celular (4000 px) reducida a 512 de un solo golpe sale con
 * dientes de sierra en algunos navegadores. Reducir a la mitad varias
 * veces antes del paso final da un resultado limpio en todos.
 */
function reducirPorMitades(
  imagen: CanvasImageSource, dim: Dimensiones, destinoAncho: number, destinoAlto: number,
): CanvasImageSource {
  let fuente = imagen
  let ancho = dim.ancho
  let alto = dim.alto
  while (ancho / 2 >= destinoAncho && alto / 2 >= destinoAlto) {
    const paso = document.createElement('canvas')
    paso.width = Math.max(1, Math.round(ancho / 2))
    paso.height = Math.max(1, Math.round(alto / 2))
    const ctx = paso.getContext('2d')
    if (!ctx) break
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(fuente, 0, 0, paso.width, paso.height)
    fuente = paso
    ancho = paso.width
    alto = paso.height
  }
  return fuente
}

/** WebP si el navegador lo sabe generar (pesa menos); si no, JPEG. */
export function lienzoABlob(lienzo: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    lienzo.toBlob((webp) => {
      if (webp && webp.type === 'image/webp') {
        resolve(webp)
        return
      }
      lienzo.toBlob(
        (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('No se pudo generar la imagen.'))),
        'image/jpeg',
        0.9,
      )
    }, 'image/webp', 0.9)
  })
}
