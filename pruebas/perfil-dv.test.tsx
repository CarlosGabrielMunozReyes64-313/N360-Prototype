import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerfilPaso } from '../src/components/PerfilPaso'
import { perfilNitValido } from '../src/data/nit'
import type { Perfil } from '../src/types'

// 900123456 → DV 8 (módulo 11 de la DIAN).
const PERFIL: Perfil = {
  razonSocial: 'Empresa de prueba', nit: '900123456', dv: '8', sector: 'industrial',
  municipio: 'Pasto', departamento: 'Nariño', extranjera: false,
}

describe('NIT y dígito de verificación en el perfil', () => {
  it('mismas reglas que el backend: DV obligatorio y correcto, NIT de al menos 5 dígitos', () => {
    expect(perfilNitValido(PERFIL)).toBe(true)
    expect(perfilNitValido({ ...PERFIL, dv: '' })).toBe(false)
    expect(perfilNitValido({ ...PERFIL, dv: '3' })).toBe(false)
    expect(perfilNitValido({ nit: '1234', dv: '0' })).toBe(false)
  })

  it('no deja continuar con el DV vacío (antes pasaba y la empresa nunca se guardaba)', () => {
    const { rerender } = render(<PerfilPaso perfil={{ ...PERFIL, dv: '' }} onChange={() => {}} onNext={() => {}} />)
    const boton = () => screen.getByRole('button', { name: /continuar|siguiente|guardar/i })
    expect(boton()).toBeDisabled()
    expect(screen.getByText(/Escriba el dígito de verificación/)).toBeInTheDocument()

    rerender(<PerfilPaso perfil={{ ...PERFIL, dv: '3' }} onChange={() => {}} onNext={() => {}} />)
    expect(boton()).toBeDisabled()
    expect(screen.getByText(/debería ser 8/)).toBeInTheDocument()

    rerender(<PerfilPaso perfil={PERFIL} onChange={() => {}} onNext={() => {}} />)
    expect(boton()).toBeEnabled()
  })
})
