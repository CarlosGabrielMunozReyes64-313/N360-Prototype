import { describe, expect, it } from 'vitest'
import {
  ENCUADRE_INICIAL, ZOOM_MAX, ZOOM_MIN,
  acotar, dimensionesGiradas, girar, limites, mover, tamanoRelativo, zoomHacia,
} from '../src/perfil/recorte'
import type { Encuadre } from '../src/perfil/recorte'
import { PALETA_AVATAR, colorPredeterminado, iniciales } from '../src/perfil/avatarPredeterminado'

const HORIZONTAL = { ancho: 1600, alto: 1000 }
const CUADRADA = { ancho: 800, alto: 800 }

/** Posición (en fracciones del recorte) de un punto de la imagen,
 * dado en fracciones del tamaño relativo de la imagen desde su centro. */
function aPantalla(enc: Encuadre, u: number, v: number) {
  const { w, h } = tamanoRelativo(HORIZONTAL, enc)
  const rad = (enc.rotacion * Math.PI) / 180
  const lx = u * w
  const ly = v * h
  return {
    x: enc.x + lx * Math.cos(rad) - ly * Math.sin(rad),
    y: enc.y + lx * Math.sin(rad) + ly * Math.cos(rad),
  }
}

describe('recorte de la foto de perfil', () => {
  it('con zoom 1 la imagen cubre justo el recorte por su lado corto', () => {
    const { w, h } = tamanoRelativo(HORIZONTAL, ENCUADRE_INICIAL)
    expect(h).toBeCloseTo(1)
    expect(w).toBeCloseTo(1.6)
    expect(limites(HORIZONTAL, ENCUADRE_INICIAL)).toEqual({ x: expect.closeTo(0.3), y: 0 })
  })

  it('girar 90° intercambia ancho y alto', () => {
    expect(dimensionesGiradas(HORIZONTAL, 90)).toEqual([1000, 1600])
    expect(dimensionesGiradas(HORIZONTAL, 180)).toEqual([1600, 1000])
    expect(limites(HORIZONTAL, { zoom: 1, rotacion: 90 })).toEqual({ x: 0, y: expect.closeTo(0.3) })
  })

  it('no deja mover la imagen hasta mostrar un borde vacío', () => {
    const enc = mover(HORIZONTAL, ENCUADRE_INICIAL, 5, 5)
    expect(enc.x).toBeCloseTo(0.3)
    expect(enc.y).toBe(0)
    // Los bordes de la imagen siguen fuera del recorte (±0.5).
    const bordeIzq = aPantalla(enc, -0.5, 0).x
    expect(bordeIzq).toBeLessThanOrEqual(-0.5 + 1e-9)
  })

  it('una imagen cuadrada sin zoom no se puede mover', () => {
    expect(mover(CUADRADA, ENCUADRE_INICIAL, 0.2, -0.2)).toEqual(ENCUADRE_INICIAL)
  })

  it('el zoom se queda entre el mínimo y el máximo', () => {
    expect(zoomHacia(HORIZONTAL, ENCUADRE_INICIAL, 0.2).zoom).toBe(ZOOM_MIN)
    expect(zoomHacia(HORIZONTAL, ENCUADRE_INICIAL, 99).zoom).toBe(ZOOM_MAX)
  })

  it('al acercar hacia un punto, ese punto no se mueve', () => {
    const inicio: Encuadre = { zoom: 1.5, rotacion: 0, x: 0.1, y: -0.05 }
    const px = 0.2
    const py = -0.1
    // Qué punto de la imagen está bajo (px, py) antes del zoom…
    const { w, h } = tamanoRelativo(HORIZONTAL, inicio)
    const u = (px - inicio.x) / w
    const v = (py - inicio.y) / h
    // …sigue bajo (px, py) después.
    const despues = zoomHacia(HORIZONTAL, inicio, 2.5, px, py)
    const p = aPantalla(despues, u, v)
    expect(p.x).toBeCloseTo(px)
    expect(p.y).toBeCloseTo(py)
  })

  it('al alejar hasta zoom 1, vuelve a quedar sin bordes vacíos', () => {
    const lejos = zoomHacia(HORIZONTAL, { zoom: 3, rotacion: 0, x: 0.9, y: 0.9 }, 1)
    const lim = limites(HORIZONTAL, lejos)
    expect(Math.abs(lejos.x)).toBeLessThanOrEqual(lim.x)
    expect(Math.abs(lejos.y)).toBeLessThanOrEqual(lim.y)
  })

  it('girar deja en el centro lo que ya estaba en el centro', () => {
    const inicio: Encuadre = { zoom: 2, rotacion: 0, x: 0.2, y: -0.15 }
    const { w, h } = tamanoRelativo(HORIZONTAL, inicio)
    const u = -inicio.x / w
    const v = -inicio.y / h
    const girado = girar(HORIZONTAL, inicio)
    expect(girado.rotacion).toBe(90)
    const centro = aPantalla(girado, u, v)
    expect(centro.x).toBeCloseTo(0)
    expect(centro.y).toBeCloseTo(0)
  })

  it('cuatro giros vuelven al encuadre original', () => {
    let enc: Encuadre = { zoom: 2, rotacion: 0, x: 0.1, y: 0.2 }
    for (let i = 0; i < 4; i++) enc = girar(HORIZONTAL, enc)
    expect(enc.rotacion).toBe(0)
    expect(enc.x).toBeCloseTo(0.1)
    expect(enc.y).toBeCloseTo(0.2)
  })

  it('acotar corrige un encuadre fuera de rango', () => {
    const enc = acotar(HORIZONTAL, { zoom: 10, rotacion: 0, x: -9, y: 9 })
    expect(enc.zoom).toBe(ZOOM_MAX)
    const lim = limites(HORIZONTAL, enc)
    expect(enc.x).toBeCloseTo(-lim.x)
    expect(enc.y).toBeCloseTo(lim.y)
  })
})

describe('foto predeterminada', () => {
  it('usa hasta dos iniciales, en mayúscula', () => {
    expect(iniciales('Ana María Pérez')).toBe('AM')
    expect(iniciales('  ana   pérez ')).toBe('AP')
    expect(iniciales('empresa888')).toBe('E')
    expect(iniciales('Ñandú Ávila')).toBe('ÑÁ')
    expect(iniciales('')).toBe('?')
  })

  it('el color es siempre el mismo para el mismo usuario', () => {
    const id = '0df22c48-118e-4bb8-a5fa-ad70c3d5e928'
    expect(colorPredeterminado(id)).toBe(colorPredeterminado(id))
    expect(PALETA_AVATAR).toContain(colorPredeterminado(id))
  })

  it('usuarios distintos no quedan todos del mismo color', () => {
    const colores = new Set(
      Array.from({ length: 40 }, (_, i) =>
        colorPredeterminado(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)),
    )
    expect(colores.size).toBeGreaterThan(4)
  })
})
