import type { Perfil } from '../types'

// En un módulo aparte (y no en PerfilPaso.tsx) para que el archivo del
// componente solo exporte componentes: así Vite puede recargarlo en caliente.

/** NIT de 5 a 9 dígitos con su DV correcto: lo mismo que exige el backend. */
export function perfilNitValido(p: Pick<Perfil, 'nit' | 'dv'>): boolean {
  const esperado = calcularDV(p.nit)
  return esperado !== null && p.dv === esperado
}

/** Dígito de verificación del NIT: módulo 11 de la DIAN. */
export function calcularDV(nit: string): string | null {
  const limpio = nit.replace(/\D/g, '')
  if (limpio.length < 5 || limpio.length > 15) return null
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  let suma = 0
  const rev = limpio.split('').reverse()
  for (let i = 0; i < rev.length; i++) suma += Number(rev[i]) * pesos[i]
  const r = suma % 11
  return String(r > 1 ? 11 - r : r)
}
