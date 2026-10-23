import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../src/auth/AuthContext'
import { esRutaRestablecer, quitarTokenDeLaUrl, tokenDesdeHash } from '../src/auth/enlaceRecuperacion'
import { AuthGate } from '../src/components/AuthGate'
import { Login } from '../src/components/Login'
import { OlvidePassword } from '../src/components/OlvidePassword'
import { RestablecerPassword } from '../src/components/RestablecerPassword'

const TOKEN = 'ab'.repeat(32)

type Respuesta = Response | Error
/** fetch simulado por ruta: cada ruta devuelve en orden las respuestas dadas. */
function simularApi(rutas: Record<string, Respuesta[]>) {
  const f = vi.fn((url: string) => {
    const ruta = Object.keys(rutas).find((r) => url.endsWith(r))
    const r = ruta ? rutas[ruta].shift() : undefined
    if (!r) return Promise.reject(new Error(`sin respuesta simulada para ${url}`))
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r)
  })
  vi.stubGlobal('fetch', f)
  return f
}

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status })
const sinCuerpo = () => new Response(null, { status: 204 })

function cuerpoDe(f: ReturnType<typeof simularApi>, ruta: string) {
  const llamada = f.mock.calls.find(([url]) => (url as string).endsWith(ruta))
  expect(llamada, `no se llamó ${ruta}`).toBeDefined()
  return JSON.parse((llamada![1] as RequestInit).body as string)
}

const llamadasA = (f: ReturnType<typeof simularApi>, ruta: string) =>
  f.mock.calls.filter(([url]) => (url as string).endsWith(ruta)).length

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

// ------------------------------------------------------------------------

describe('enlace del correo', () => {
  it('lee el token del hash', () => {
    expect(tokenDesdeHash(`#/restablecer?token=${TOKEN}`)).toBe(TOKEN)
    expect(tokenDesdeHash(`#restablecer?token=${TOKEN}`)).toBe(TOKEN)
    expect(tokenDesdeHash('#/restablecer')).toBe(null)
    expect(tokenDesdeHash('#/restablecer?token=')).toBe(null)
    expect(tokenDesdeHash(`#/login?token=${TOKEN}`)).toBe(null)
    expect(tokenDesdeHash('')).toBe(null)
    expect(esRutaRestablecer('#/restablecer')).toBe(true)
    expect(esRutaRestablecer('#/restablecerx')).toBe(false)
  })

  it('borra el token de la barra de direcciones sin agregar historial', () => {
    window.history.replaceState(null, '', `/?x=1#/restablecer?token=${TOKEN}`)
    const largo = window.history.length
    quitarTokenDeLaUrl()
    expect(window.location.hash).toBe('#/restablecer')
    expect(window.location.search).toBe('?x=1')
    expect(window.location.href).not.toContain(TOKEN)
    expect(window.history.length).toBe(largo)
  })
})

// ------------------------------------------------------------------------

describe('login', () => {
  it('ofrece «¿Olvidaste tu contraseña?» y pasa el correo ya escrito', async () => {
    simularApi({})
    const alOlvidar = vi.fn()
    render(<AuthProvider><Login onIrARegistro={() => {}} onOlvidePassword={alOlvidar} /></AuthProvider>)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Correo'), ' Gerencia@Empresa.co ')
    await u.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))
    expect(alOlvidar).toHaveBeenCalledWith('gerencia@empresa.co')
  })

  it('con un correo a medio escribir no lo pasa', async () => {
    simularApi({})
    const alOlvidar = vi.fn()
    render(<AuthProvider><Login onIrARegistro={() => {}} onOlvidePassword={alOlvidar} /></AuthProvider>)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Correo'), 'gerencia@')
    await u.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))
    expect(alOlvidar).toHaveBeenCalledWith('')
  })
})

// ------------------------------------------------------------------------

describe('¿Olvidaste tu contraseña?', () => {
  const MENSAJE = 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.'

  it('no envía un correo inválido', async () => {
    const f = simularApi({})
    render(<OlvidePassword onIrALogin={() => {}} />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Correo'), 'no-es-correo')
    await u.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument()
    expect(f).not.toHaveBeenCalled()
  })

  it('envía el correo normalizado y muestra el mensaje del servidor', async () => {
    const f = simularApi({ '/auth/recuperar-password': [json({ mensaje: MENSAJE }, 202)] })
    const alVolver = vi.fn()
    render(<OlvidePassword onIrALogin={alVolver} />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Correo'), '  Gerencia@Empresa.CO ')
    await u.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('status')).toHaveTextContent(MENSAJE)
    expect(cuerpoDe(f, '/auth/recuperar-password')).toEqual({ email: 'gerencia@empresa.co' })
    await u.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }))
    expect(alVolver).toHaveBeenCalled()
  })

  it('trae el correo que ya se había escrito en el login', () => {
    simularApi({})
    render(<OlvidePassword emailInicial="gerencia@empresa.co" onIrALogin={() => {}} />)
    expect(screen.getByLabelText('Correo')).toHaveValue('gerencia@empresa.co')
  })

  it('si el backend no tiene correo configurado, lo dice', async () => {
    simularApi({ '/auth/recuperar-password': [json({
      codigo: 'CORREO_NO_CONFIGURADO', mensaje: 'La recuperación de contraseña por correo no está disponible.',
    }, 503)] })
    render(<OlvidePassword emailInicial="gerencia@empresa.co" onIrALogin={() => {}} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no está disponible')
  })

  it('sin conexión, lo dice', async () => {
    simularApi({ '/auth/recuperar-password': [new TypeError('Failed to fetch')] })
    render(<OlvidePassword emailInicial="gerencia@empresa.co" onIrALogin={() => {}} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
  })
})

// ------------------------------------------------------------------------

describe('elegir la contraseña nueva', () => {
  function pintar(token: string | null) {
    const props = { onIrALogin: vi.fn(), onPedirOtro: vi.fn(), onRestablecida: vi.fn() }
    render(<RestablecerPassword token={token} {...props} />)
    return props
  }

  async function escribir(nueva: string, confirmar: string) {
    const u = userEvent.setup()
    await u.type(await screen.findByLabelText('Contraseña nueva'), nueva)
    await u.type(screen.getByLabelText('Confirmar contraseña'), confirmar)
    await u.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    return u
  }

  it('sin token: enlace no válido, sin preguntar al servidor', async () => {
    const f = simularApi({})
    const props = pintar(null)
    expect(screen.getByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }))
    expect(props.onPedirOtro).toHaveBeenCalled()
    expect(f).not.toHaveBeenCalled()
  })

  it('enlace vencido o usado: lo avisa antes de pedir la contraseña', async () => {
    const f = simularApi({ '/auth/recuperar-password/verificar': [json({ valido: false })] })
    pintar(TOKEN)
    expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
    expect(cuerpoDe(f, '/auth/recuperar-password/verificar')).toEqual({ token: TOKEN })
    expect(screen.queryByLabelText('Contraseña nueva')).toBe(null)
  })

  it('exige 8 caracteres y que coincidan, sin llamar al servidor', async () => {
    const f = simularApi({ '/auth/recuperar-password/verificar': [json({ valido: true })] })
    pintar(TOKEN)
    await escribir('corta', 'corta')
    expect(screen.getByText('Usa al menos 8 caracteres.')).toBeInTheDocument()
    const u = userEvent.setup()
    await u.clear(screen.getByLabelText('Contraseña nueva'))
    await u.type(screen.getByLabelText('Contraseña nueva'), 'ClaveNueva456')
    await u.clear(screen.getByLabelText('Confirmar contraseña'))
    await u.type(screen.getByLabelText('Confirmar contraseña'), 'ClaveNueva457')
    await u.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(llamadasA(f, '/auth/restablecer-password')).toBe(0)
  })

  it('cambia la contraseña y manda a iniciar sesión', async () => {
    const f = simularApi({
      '/auth/recuperar-password/verificar': [json({ valido: true })],
      '/auth/restablecer-password': [sinCuerpo()],
    })
    const props = pintar(TOKEN)
    const u = await escribir('ClaveNueva456', 'ClaveNueva456')
    expect(await screen.findByRole('heading', { name: 'Contraseña actualizada' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('cerramos todas las sesiones')
    expect(cuerpoDe(f, '/auth/restablecer-password')).toEqual({ token: TOKEN, password_nueva: 'ClaveNueva456' })
    expect(props.onRestablecida).toHaveBeenCalledTimes(1)
    await u.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(props.onIrALogin).toHaveBeenCalled()
  })

  it('si el enlace venció mientras escribía, lo avisa', async () => {
    simularApi({
      '/auth/recuperar-password/verificar': [json({ valido: true })],
      '/auth/restablecer-password': [json({ codigo: 'TOKEN_INVALIDO', mensaje: 'x' }, 400)],
    })
    const props = pintar(TOKEN)
    await escribir('ClaveNueva456', 'ClaveNueva456')
    expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
    expect(props.onRestablecida).not.toHaveBeenCalled()
  })

  it('un error de validación del servidor se muestra en el formulario', async () => {
    simularApi({
      '/auth/recuperar-password/verificar': [json({ valido: true })],
      '/auth/restablecer-password': [json({
        codigo: 'VALIDACION', mensaje: 'La contraseña debe tener al menos 8 caracteres',
      }, 422)],
    })
    pintar(TOKEN)
    await escribir('ClaveNueva456', 'ClaveNueva456')
    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 8 caracteres')
    expect(screen.getByLabelText('Contraseña nueva')).toBeInTheDocument()
  })

  it('sin conexión al comprobar el enlace, deja reintentar', async () => {
    simularApi({ '/auth/recuperar-password/verificar': [new TypeError('Failed to fetch'), json({ valido: true })] })
    pintar(TOKEN)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Contraseña nueva')).toBeInTheDocument()
  })
})

// ------------------------------------------------------------------------

describe('navegación (AuthGate)', () => {
  beforeEach(() => localStorage.clear())

  it('el enlace del correo abre el formulario y el token desaparece de la URL', async () => {
    window.history.replaceState(null, '', `/#/restablecer?token=${TOKEN}`)
    const f = simularApi({ '/auth/recuperar-password/verificar': [json({ valido: true })] })
    render(<AuthProvider><AuthGate /></AuthProvider>)
    expect(await screen.findByLabelText('Contraseña nueva')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/restablecer')
    expect(window.location.href).not.toContain(TOKEN)
    expect(cuerpoDe(f, '/auth/recuperar-password/verificar')).toEqual({ token: TOKEN })
  })

  it('desde el login se llega a «¿Olvidaste tu contraseña?» con el correo puesto', async () => {
    window.history.replaceState(null, '', '/#/login')
    simularApi({})
    render(<AuthProvider><AuthGate /></AuthProvider>)
    const u = userEvent.setup()
    await u.type(await screen.findByLabelText('Correo'), 'gerencia@empresa.co')
    await u.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))
    expect(await screen.findByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveValue('gerencia@empresa.co')
    expect(window.location.hash).toBe('#/recuperar')
  })

  it('con una sesión abierta en el navegador, el enlace se atiende y la sesión local se olvida', async () => {
    localStorage.setItem('n360_sesion', JSON.stringify({
      token: 'sesion-vieja',
      usuario: {
        usuario_id: 'u-1', email: 'gerencia@empresa.co', nombre: 'Gerencia', rol: 'empresa', activo: true,
        email_verificado_en: null, ultimo_login_en: null, foto_actualizada_en: null,
      },
    }))
    window.history.replaceState(null, '', `/#/restablecer?token=${TOKEN}`)
    simularApi({
      '/auth/me': [json({ usuario: {
        usuario_id: 'u-1', email: 'gerencia@empresa.co', nombre: 'Gerencia', rol: 'empresa', activo: true,
        email_verificado_en: null, ultimo_login_en: null, foto_actualizada_en: null,
      } })],
      '/auth/recuperar-password/verificar': [json({ valido: true })],
      '/auth/restablecer-password': [sinCuerpo()],
      '/auth/logout': [sinCuerpo()],
    })
    render(<AuthProvider><AuthGate /></AuthProvider>)
    await escribirEnGate('ClaveNueva456')
    expect(await screen.findByRole('heading', { name: 'Contraseña actualizada' })).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('n360_sesion')).toBe(null))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })
})

async function escribirEnGate(clave: string) {
  const u = userEvent.setup()
  await u.type(await screen.findByLabelText('Contraseña nueva'), clave)
  await u.type(screen.getByLabelText('Confirmar contraseña'), clave)
  await u.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}
