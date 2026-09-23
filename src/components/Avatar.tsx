import { useState } from 'react'
import { colorPredeterminado, iniciales } from '../perfil/avatarPredeterminado'
import { useFotoPerfil } from '../perfil/useFotoPerfil'
import './avatar.css'

interface Props {
  usuarioId: string
  nombre: string
  /** `foto_actualizada_en` del usuario. null/undefined = foto predeterminada. */
  fotoVersion?: string | null
  /** Diámetro en px. */
  tamano?: number
  className?: string
}

/**
 * Foto de perfil circular. Si el usuario subió una, la muestra; si no (o
 * mientras descarga, o si falla), muestra su foto predeterminada: sus
 * iniciales sobre su color. Es decorativa: el nombre siempre aparece al
 * lado o en la etiqueta del botón que la contiene.
 */
export function Avatar({ usuarioId, nombre, fotoVersion, tamano = 36, className = '' }: Props) {
  const url = useFotoPerfil(usuarioId, fotoVersion)
  const [urlFallida, setUrlFallida] = useState<string | null>(null)
  const color = colorPredeterminado(usuarioId)
  const conFoto = Boolean(url) && url !== urlFallida

  return (
    <span
      className={'avatar-foto' + (className ? ' ' + className : '')}
      style={{
        width: tamano,
        height: tamano,
        fontSize: Math.max(10, Math.round(tamano * 0.38)),
        background: color.fondo,
        color: color.texto,
      }}
      aria-hidden="true"
    >
      {conFoto && url ? (
        <img src={url} alt="" draggable={false} onError={() => setUrlFallida(url)} />
      ) : (
        iniciales(nombre)
      )}
    </span>
  )
}
