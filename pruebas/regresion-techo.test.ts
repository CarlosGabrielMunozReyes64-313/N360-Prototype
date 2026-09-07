/**
 * PRUEBA EN ROJO — documenta un defecto conocido, todavía sin corregir.
 *
 * `techoDe()` devuelve 3.0 cuando no hay ciclo previo, pero `evaluarFormato()`
 * nunca limita el puntaje a ese techo. Hoy no se nota porque <Escala> bloquea
 * el botón del 4 en la interfaz, así que haciendo clic es imposible llegar ahí.
 *
 * Se llega por otro camino: responder con "ciclo previo: sí", guardar, y luego
 * cambiar el tamizaje a "no". Las respuestas persistidas siguen en 4 y el
 * informe reporta 4.0 / 3.0, contradiciendo el texto del propio PDF ("el
 * puntaje se reporta sobre esa base").
 *
 * Decisión pendiente, es de negocio y no técnica:
 *   (a) limitar en el motor  ->  score = Math.min(score, techo)
 *   (b) al cambiar el tamizaje a primer ciclo, bajar a 3 las respuestas en 4
 *   (c) mostrar el exceso como dato ("4.0, por encima del techo de este ciclo")
 *
 * Cuando se decida, esta prueba pasa a verde o se reescribe según la opción.
 */
import { describe, it, expect } from 'vitest'
import { FORMATO_02 } from '../src/data/formato02'
import { evaluarFormato } from '../src/engine/scoring'
import type { Respuestas, Tamizaje, Valor } from '../src/types'

const TAMIZAJE_BASE: Tamizaje = {
  tamano: 'grande', empleados: '120', areasDeVida: 'si',
  cicloPrevio: 'si', comunidadesEtnicas: 'no', consumidorFinal: 'si',
}

const llenar = (v: Valor): Respuestas => {
  const r: Respuestas = {}
  FORMATO_02.dimensiones.forEach(d => d.secciones.forEach(s => s.preguntas.forEach(p => { r[p.id] = v })))
  return r
}

describe('Techo de primer ciclo', () => {
  it.fails('el puntaje no debería superar el techo tras cambiar el tamizaje a primer ciclo', () => {
    // La empresa respondió todo en 4 cuando declaraba ciclo previo.
    const respuestas = llenar(4)
    // Luego corrige el tamizaje: en realidad es su primer ciclo.
    const r = evaluarFormato(FORMATO_02, respuestas, '', { ...TAMIZAJE_BASE, cicloPrevio: 'no' })

    expect(r.techo).toBe(3)
    expect(r.score).toBeLessThanOrEqual(r.techo) // hoy da 4.0 y falla
  })
})
