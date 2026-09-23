import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AuthProvider } from '../src/auth/AuthContext'
import type { Usuario } from '../src/auth/types'
import { MenuCuenta } from '../src/components/MenuCuenta'
import { EditarDatosPage } from '../src/components/EditarDatosPage'
import type { Perfil, Tamizaje } from '../src/types'

const USUARIO: Usuario = {
  usuario_id: '0df22c48-118e-4bb8-a5fa-ad70c3d5e928',
  email: 'empresa888@correo.co',
  nombre: 'empresa888',
  rol: 'empresa',
  activo: true,
  email_verificado_en: null,
  ultimo_login_en: null,
  foto_actualizada_en: null,
}

const EMPRESA = { razonSocial: 'servicentro', nit: '456163156', dv: '4' }

const conAuth = (ui: ReactNode) => render(<AuthProvider>{ui}</AuthProvider>)

function renderMenu() {
  const onConfiguracion = vi.fn()
  const onCerrarSesion = vi.fn()
  conAuth(
    <MenuCuenta
      usuario={USUARIO} empresa={EMPRESA}
      onConfiguracion={onConfiguracion} onCerrarSesion={onCerrarSesion}
    />,
  )
  return { onConfiguracion, onCerrarSesion, disparador: screen.getByRole('button', { name: 'Cuenta de empresa888' }) }
}

describe('menú de la cuenta', () => {
  it('muestra la foto predeterminada (iniciales) y no la razón social ni el NIT', () => {
    const { disparador } = renderMenu()
    expect(disparador).toHaveTextContent('E')
    expect(screen.queryByText('servicentro')).not.toBeInTheDocument()
    expect(screen.queryByText(/NIT/)).not.toBeInTheDocument()
    expect(disparador).toHaveAttribute('aria-expanded', 'false')
  })

  it('al abrirlo muestra la cuenta, la empresa y las dos opciones', async () => {
    const { disparador } = renderMenu()
    await userEvent.click(disparador)

    expect(disparador).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('empresa888@correo.co')).toBeInTheDocument()
    expect(screen.getByText('servicentro')).toBeInTheDocument()
    expect(screen.getByText('NIT 456163156-4')).toBeInTheDocument()

    const menu = screen.getByRole('menu')
    const opciones = within(menu).getAllByRole('menuitem')
    expect(opciones.map((o) => o.textContent)).toEqual(['Configuración', 'Cerrar sesión'])
    expect(opciones[0]).toHaveFocus()
  })

  it('Configuración y Cerrar sesión llaman a su acción y cierran el menú', async () => {
    const { disparador, onConfiguracion, onCerrarSesion } = renderMenu()

    await userEvent.click(disparador)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Configuración' }))
    expect(onConfiguracion).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(disparador)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(onCerrarSesion).toHaveBeenCalledOnce()
  })

  it('se maneja con teclado: flechas, Escape devuelve el foco', async () => {
    const { disparador } = renderMenu()
    disparador.focus()
    await userEvent.keyboard('{ArrowDown}')
    const [config, salir] = screen.getAllByRole('menuitem')
    expect(config).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(salir).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(config).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(salir).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(disparador).toHaveFocus()
  })

  it('un clic fuera lo cierra', async () => {
    const { disparador } = renderMenu()
    await userEvent.click(disparador)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('sin empresa todavía, no muestra ese bloque', async () => {
    conAuth(<MenuCuenta usuario={USUARIO} onConfiguracion={() => {}} onCerrarSesion={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta de empresa888' }))
    expect(screen.queryByText(/NIT/)).not.toBeInTheDocument()
  })
})

const PERFIL: Perfil = {
  razonSocial: 'servicentro', nit: '456163156', dv: '4', sector: 'comercio',
  municipio: 'Popayán', departamento: 'Cauca', extranjera: false,
}
const TAMIZAJE: Tamizaje = {
  tamano: 'micro', empleados: '5', areasDeVida: 'no',
  cicloPrevio: 'no', comunidadesEtnicas: 'no', consumidorFinal: 'si',
}

describe('Configuración', () => {
  const renderConfig = (puedeEditarDatos: boolean) => conAuth(
    <EditarDatosPage
      perfil={PERFIL} tamizaje={TAMIZAJE} historial={[]}
      puedeEditarDatos={puedeEditarDatos}
      onEnviar={() => {}} onVolver={() => {}}
    />,
  )
  const pestanas = () => within(screen.getByRole('navigation')).getAllByRole('button').map((b) => b.textContent)

  it('«Mi cuenta» va antes de «Datos y tamizaje» y se abre por defecto', () => {
    renderConfig(true)
    expect(pestanas()).toEqual(['Mi cuenta', 'Datos y tamizaje', 'Historial de cambios'])
    expect(screen.getByRole('button', { name: 'Mi cuenta' })).toHaveAttribute('aria-current', 'page')
  })

  it('sin perfil y tamizaje completos no ofrece editarlos', () => {
    renderConfig(false)
    expect(pestanas()).toEqual(['Mi cuenta', 'Historial de cambios'])
  })
})
