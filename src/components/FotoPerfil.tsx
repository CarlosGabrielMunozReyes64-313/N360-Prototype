import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AuthError } from '../auth/types'
import { useFotoPerfil } from '../perfil/useFotoPerfil'
import { Avatar } from './Avatar'
import { EditorFoto } from './EditorFoto'
import { IconoCamara } from './Iconos'
import './foto-perfil.css'

/** Tope del archivo ORIGINAL que se elige. No es lo que se sube: el
 * editor lo recorta a 512 px antes de mandarlo (unas decenas de KB). */
const MAX_BYTES_ARCHIVO = 20 * 1024 * 1024

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * Foto de perfil en «Mi cuenta»: la foto actual (o la predeterminada con
 * iniciales) y las acciones para cambiarla, ajustarla o quitarla. Cambiar
 * y ajustar pasan por el editor, donde se encuadra antes de guardar. Se
 * guarda al instante: no depende del botón «Guardar cambios» del nombre y
 * el correo.
 */
export function FotoPerfil() {
  const { usuario, subirFoto, quitarFoto } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fuente, setFuente] = useState<Blob | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [quitando, setQuitando] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [soltando, setSoltando] = useState(false)
  const urlActual = useFotoPerfil(usuario?.usuario_id ?? '', usuario?.foto_actualizada_en)

  if (!usuario) return null
  const tieneFoto = Boolean(usuario.foto_actualizada_en)
  const ocupado = quitando || preparando

  const elegirArchivo = () => inputRef.current?.click()

  const abrirArchivo = (archivo: File | null | undefined) => {
    setAviso(null)
    if (!archivo) return
    // Algunos sistemas no informan el tipo (queda vacío); en ese caso se
    // deja que el editor intente abrirlo y avise si no puede.
    if (archivo.type && !archivo.type.startsWith('image/')) {
      setAviso({ tipo: 'error', texto: 'Ese archivo no es una imagen. Elige una foto JPG, PNG o WebP.' })
      return
    }
    if (archivo.size > MAX_BYTES_ARCHIVO) {
      setAviso({ tipo: 'error', texto: 'La imagen pesa más de 20 MB. Elige una más liviana.' })
      return
    }
    setFuente(archivo)
  }

  const alElegir = (e: ChangeEvent<HTMLInputElement>) => {
    abrirArchivo(e.target.files?.[0])
    e.target.value = '' // así se puede volver a elegir el mismo archivo
  }

  const ajustarActual = async () => {
    if (!urlActual) return
    setAviso(null)
    setPreparando(true)
    try {
      const respuesta = await fetch(urlActual)
      setFuente(await respuesta.blob())
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo abrir la foto actual. Intenta de nuevo.' })
    } finally {
      setPreparando(false)
    }
  }

  const guardar = async (foto: Blob) => {
    await subirFoto(foto) // si falla, el editor sigue abierto y muestra el error
    setFuente(null)
    setAviso({ tipo: 'ok', texto: 'Foto de perfil actualizada.' })
  }

  const quitar = async () => {
    setAviso(null)
    setQuitando(true)
    try {
      await quitarFoto()
      setAviso({ tipo: 'ok', texto: 'Foto quitada. Ahora se muestra tu foto predeterminada.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof AuthError ? err.message : 'No se pudo quitar la foto.' })
    } finally {
      setQuitando(false)
    }
  }

  const alArrastrarEncima = (e: DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!soltando) setSoltando(true)
  }
  const alSalirArrastre = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSoltando(false)
  }
  const alSoltarArchivo = (e: DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    setSoltando(false)
    abrirArchivo(e.dataTransfer.files?.[0])
  }

  let nota = 'Por ahora usas tu foto predeterminada, con tus iniciales. Sube una foto o arrástrala aquí.'
  if (tieneFoto) nota = 'Puedes cambiarla por otra, ajustar el encuadre o volver a la predeterminada.'
  if (soltando) nota = 'Suelta la imagen para usarla como foto de perfil.'

  return (
    <div
      className={'perfil-foto' + (soltando ? ' is-soltando' : '')}
      onDragOver={alArrastrarEncima}
      onDragLeave={alSalirArrastre}
      onDrop={alSoltarArchivo}
    >
      <button
        type="button"
        className="perfil-foto-avatar"
        onClick={elegirArchivo}
        disabled={ocupado}
        aria-label={tieneFoto ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
      >
        <Avatar
          usuarioId={usuario.usuario_id}
          nombre={usuario.nombre}
          fotoVersion={usuario.foto_actualizada_en}
          tamano={84}
        />
        <span className="perfil-foto-camara" aria-hidden="true"><IconoCamara tamano={15} /></span>
      </button>

      <div className="perfil-foto-texto">
        <div className="perfil-foto-nombre">{usuario.nombre}</div>
        <p className="perfil-foto-nota">{nota}</p>
      </div>

      <div className="perfil-foto-botones">
        <button type="button" className="btn" onClick={elegirArchivo} disabled={ocupado}>
          {tieneFoto ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {tieneFoto && (
          <button type="button" className="btn-ghost" onClick={ajustarActual} disabled={ocupado || !urlActual}>
            {preparando ? 'Abriendo…' : 'Ajustar'}
          </button>
        )}
        {tieneFoto && (
          <button type="button" className="btn-ghost" onClick={quitar} disabled={ocupado}>
            {quitando ? 'Quitando…' : 'Quitar foto'}
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={alElegir} />

      {aviso && (
        <div
          className={(aviso.tipo === 'ok' ? 'note' : 'auth-error') + ' perfil-foto-aviso'}
          role={aviso.tipo === 'ok' ? 'status' : 'alert'}
        >
          {aviso.texto}
        </div>
      )}

      {fuente && <EditorFoto fuente={fuente} onCancelar={() => setFuente(null)} onGuardar={guardar} />}
    </div>
  )
}
