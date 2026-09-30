import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../src/auth/AuthContext'
import { Register } from '../src/components/Register'
import { POLITICA_DATOS } from '../src/data/politicaDatos'

const SESION = {
  token: 't-nuevo', expira_en: '2026-09-30T00:00:00Z',
  usuario: {
    usuario_id: 'u-1', email: 'gerencia@empresa.co', nombre: 'Gerencia', rol: 'empresa', activo: true,
    email_verificado_en: null, ultimo_login_en: null, foto_actualizada_en: null,
  },
}

function pintar() {
  const f = vi.fn(() => Promise.resolve(new Response(JSON.stringify(SESION), { status: 201 })))
  vi.stubGlobal('fetch', f)
  render(<AuthProvider><Register onIrALogin={() => {}} /></AuthProvider>)
  return f
}

async function llenarFormulario() {
  const u = userEvent.setup()
  await u.type(screen.getByLabelText('Nombre'), 'Gerencia')
  await u.type(screen.getByLabelText('Correo'), 'gerencia@empresa.co')
  await u.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123')
  await u.type(screen.getByLabelText('Confirmar contraseña'), 'ClaveSegura123')
  return u
}

const casilla = () => screen.getByRole('checkbox', { name: /autorizo de manera previa, expresa e informada/ })

describe('registro con autorización de tratamiento de datos', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('no deja crear la cuenta sin autorizar', async () => {
    const f = pintar()
    const u = await llenarFormulario()
    expect(casilla()).not.toBeChecked()
    await u.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('Para crear la cuenta debes autorizar el tratamiento de tus datos.')).toBeInTheDocument()
    expect(f).not.toHaveBeenCalled()
  })

  it('muestra la política completa; leerla no equivale a aceptarla', async () => {
    pintar()
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: 'Política de Tratamiento de Datos Personales' }))
    const dialogo = screen.getByRole('dialog', { name: 'Política de Tratamiento de Datos Personales' })
    for (const t of ['1. Responsable del tratamiento', '4. Análisis con inteligencia artificial y proveedores',
      '5. Sus derechos', '6. Cómo ejercer sus derechos', '8. Vigencia']) {
      expect(within(dialogo).getByRole('heading', { name: t })).toBeInTheDocument()
    }
    expect(within(dialogo).getByText(/Gemini API/)).toBeInTheDocument()
    expect(within(dialogo).getByText(/Superintendencia de Industria y Comercio/)).toBeInTheDocument()
    expect(within(dialogo).getByText(new RegExp(`Versión ${POLITICA_DATOS.version}`))).toBeInTheDocument()

    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBe(null)
    // Abrir el enlace (que está dentro de la etiqueta) no marca la casilla.
    expect(casilla()).not.toBeChecked()
  })

  it('con la autorización envía la versión de la política que leyó', async () => {
    const f = pintar()
    const u = await llenarFormulario()
    await u.click(casilla())
    await u.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(f).toHaveBeenCalledTimes(1)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/auth\/register$/)
    expect(JSON.parse(init.body as string)).toMatchObject({
      email: 'gerencia@empresa.co', rol: 'empresa',
      acepta_politica_datos: true, politica_datos_version: POLITICA_DATOS.version,
    })
  })
})
