import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Usuario } from '../auth/types'
import { Avatar } from './Avatar'
import { IconoAjustes, IconoFlecha, IconoSalir } from './Iconos'
import './menu-cuenta.css'

export interface EmpresaResumen {
  razonSocial: string
  nit: string
  dv: string
}

interface Props {
  usuario: Usuario
  /** Empresa de la cuenta, si ya se llenó el perfil. */
  empresa?: EmpresaResumen | null
  onConfiguracion: () => void
  onCerrarSesion: () => void
}

function opcionesDe(menu: HTMLElement | null): HTMLButtonElement[] {
  return Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
}

/**
 * Menú de la cuenta en el encabezado: la foto de perfil abre una lista
 * con quién tiene la sesión abierta, la empresa, y las opciones
 * Configuración y Cerrar sesión.
 *
 * Teclado (patrón WAI-ARIA de botón de menú): Enter/Espacio o ↓ abren y
 * llevan el foco a la primera opción; ↑/↓, Inicio y Fin se mueven entre
 * opciones; Escape cierra y devuelve el foco a la foto; Tab cierra.
 * Un clic fuera también lo cierra.
 */
export function MenuCuenta({ usuario, empresa, onConfiguracion, onCerrarSesion }: Props) {
  const [abierto, setAbierto] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const disparadorRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const idMenu = useId()

  useEffect(() => {
    if (abierto) opcionesDe(menuRef.current)[0]?.focus()
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const alPresionarFuera = (e: PointerEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', alPresionarFuera)
    return () => document.removeEventListener('pointerdown', alPresionarFuera)
  }, [abierto])

  const cerrar = (devolverFoco: boolean) => {
    setAbierto(false)
    if (devolverFoco) disparadorRef.current?.focus()
  }

  const elegir = (accion: () => void) => {
    setAbierto(false)
    accion()
  }

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setAbierto(true)
      }
      return
    }

    const opciones = opcionesDe(menuRef.current)
    const n = opciones.length
    const actual = opciones.indexOf(document.activeElement as HTMLButtonElement)

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        cerrar(true)
        break
      case 'ArrowDown':
        e.preventDefault()
        opciones[actual < 0 ? 0 : (actual + 1) % n]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        opciones[actual < 0 ? n - 1 : (actual - 1 + n) % n]?.focus()
        break
      case 'Home':
        e.preventDefault()
        opciones[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        opciones[n - 1]?.focus()
        break
      case 'Tab':
        setAbierto(false)
        break
    }
  }

  const nit = empresa?.nit ? `NIT ${empresa.nit}${empresa.dv ? '-' + empresa.dv : ''}` : null

  return (
    <div className="menu-cuenta" ref={raizRef} onKeyDown={alTeclear}>
      <button
        ref={disparadorRef}
        type="button"
        className="menu-cuenta-disparador"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={`Cuenta de ${usuario.nombre}`}
        title={usuario.nombre}
        onClick={() => setAbierto((a) => !a)}
      >
        <Avatar
          usuarioId={usuario.usuario_id}
          nombre={usuario.nombre}
          fotoVersion={usuario.foto_actualizada_en}
          tamano={38}
        />
        <span className="menu-cuenta-flecha"><IconoFlecha tamano={16} /></span>
      </button>

      {abierto && (
        <div className="menu-cuenta-panel">
          <div className="menu-cuenta-identidad">
            <Avatar
              usuarioId={usuario.usuario_id}
              nombre={usuario.nombre}
              fotoVersion={usuario.foto_actualizada_en}
              tamano={46}
            />
            <div className="menu-cuenta-identidad-texto">
              <span className="menu-cuenta-nombre">{usuario.nombre}</span>
              <span className="menu-cuenta-email">{usuario.email}</span>
            </div>
          </div>

          {empresa && (
            <div className="menu-cuenta-empresa">
              <span className="menu-cuenta-empresa-nombre">{empresa.razonSocial}</span>
              {nit && <span className="menu-cuenta-empresa-nit">{nit}</span>}
            </div>
          )}

          <div ref={menuRef} id={idMenu} role="menu" aria-label="Opciones de la cuenta">
            <div className="menu-cuenta-separador" role="separator" />
            <button
              type="button" role="menuitem" tabIndex={-1} className="menu-cuenta-opcion"
              onClick={() => elegir(onConfiguracion)}
            >
              <IconoAjustes />
              Configuración
            </button>
            <div className="menu-cuenta-separador menu-cuenta-separador--grueso" role="separator" />
            <button
              type="button" role="menuitem" tabIndex={-1} className="menu-cuenta-opcion"
              onClick={() => elegir(onCerrarSesion)}
            >
              <IconoSalir />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
