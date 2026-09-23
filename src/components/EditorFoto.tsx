import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, SyntheticEvent } from 'react'
import { AuthError } from '../auth/types'
import {
  ENCUADRE_INICIAL, ZOOM_MAX, ZOOM_MIN,
  dibujarRecorte, girar, lienzoABlob, mover, tamanoRelativo, zoomHacia,
} from '../perfil/recorte'
import type { Dimensiones, Encuadre } from '../perfil/recorte'
import { IconoGirar, IconoMas, IconoMenos } from './Iconos'

interface Props {
  /** Imagen a ajustar: un archivo recién elegido o la foto actual. */
  fuente: Blob
  onCancelar: () => void
  /** Recibe el recorte final (cuadrado, 512 px). Si lanza, el editor
   * sigue abierto y muestra el error. */
  onGuardar: (foto: Blob) => Promise<void>
}

interface ImagenCargada extends Dimensiones {
  el: HTMLImageElement
  url: string
}

type Gesto =
  | { tipo: 'mover'; x0: number; y0: number; enc: Encuadre; lado: number }
  | { tipo: 'pellizco'; dist0: number; cx0: number; cy0: number; enc: Encuadre; rect: DOMRect }

const PASO_ZOOM = 1.25

/**
 * Editor para encuadrar la foto de perfil antes de guardarla: arrastrar
 * para mover, zoom con la barra, la rueda del ratón o pellizcando, y
 * girar de a 90°. Lo que queda dentro del círculo es la foto.
 *
 * Es un <dialog> nativo abierto con showModal(): el navegador se encarga
 * de atrapar el foco, oscurecer el fondo y de la tecla Escape.
 */
export function EditorFoto({ fuente, onCancelar, onGuardar }: Props) {
  const idTitulo = useId()
  const idAyuda = useId()
  const dialogoRef = useRef<HTMLDialogElement>(null)
  const visorRef = useRef<HTMLDivElement>(null)

  const [imagen, setImagen] = useState<ImagenCargada | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)
  const [encuadre, setEncuadre] = useState<Encuadre>(ENCUADRE_INICIAL)
  const [moviendo, setMoviendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Copia del encuadre para los manejadores de gestos: un pointermove
  // puede llegar antes de que React vuelva a renderizar, y ahí el estado
  // del closure estaría un paso atrás.
  const encuadreRef = useRef<Encuadre>(ENCUADRE_INICIAL)
  const punterosRef = useRef(new Map<number, { x: number; y: number }>())
  const gestoRef = useRef<Gesto | null>(null)

  const aplicar = useCallback((nuevo: Encuadre) => {
    encuadreRef.current = nuevo
    setEncuadre(nuevo)
  }, [])

  useEffect(() => {
    const dialogo = dialogoRef.current
    if (!dialogo || dialogo.open) return
    if (typeof dialogo.showModal === 'function') dialogo.showModal()
    else dialogo.setAttribute('open', '')
    return () => { if (dialogo.open) dialogo.close() }
  }, [])

  useEffect(() => {
    const url = URL.createObjectURL(fuente)
    const el = new Image()
    let vigente = true
    el.onload = () => {
      if (!vigente) return
      if (!el.naturalWidth || !el.naturalHeight) setErrorCarga(true)
      else setImagen({ el, url, ancho: el.naturalWidth, alto: el.naturalHeight })
    }
    el.onerror = () => { if (vigente) setErrorCarga(true) }
    el.src = url
    return () => {
      vigente = false
      // Cancelar la carga pendiente ANTES de liberar la URL; si no, el
      // navegador intenta leer una URL ya liberada (pasa en desarrollo,
      // donde StrictMode monta y desmonta los efectos dos veces).
      el.onload = null
      el.onerror = null
      el.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [fuente])

  // La rueda se escucha a mano porque React registra `wheel` como pasivo
  // y ahí preventDefault() no evita que la página se desplace.
  useEffect(() => {
    const visor = visorRef.current
    if (!visor || !imagen) return
    const alUsarRueda = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      const r = visor.getBoundingClientRect()
      const actual = encuadreRef.current
      aplicar(zoomHacia(
        imagen, actual, actual.zoom * Math.exp(-delta * 0.0015),
        (e.clientX - r.left) / r.width - 0.5,
        (e.clientY - r.top) / r.height - 0.5,
      ))
    }
    visor.addEventListener('wheel', alUsarRueda, { passive: false })
    return () => visor.removeEventListener('wheel', alUsarRueda)
  }, [imagen, aplicar])

  // ----- arrastrar (un dedo o ratón) y pellizcar (dos dedos) -----

  const reiniciarGesto = () => {
    const visor = visorRef.current
    const punteros = Array.from(punterosRef.current.values())
    if (!visor || punteros.length === 0) {
      gestoRef.current = null
      setMoviendo(false)
      return
    }
    const rect = visor.getBoundingClientRect()
    const enc = encuadreRef.current
    if (punteros.length === 1) {
      gestoRef.current = { tipo: 'mover', x0: punteros[0].x, y0: punteros[0].y, enc, lado: rect.width }
    } else {
      const [a, b] = punteros
      gestoRef.current = {
        tipo: 'pellizco',
        dist0: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        cx0: (a.x + b.x) / 2,
        cy0: (a.y + b.y) / 2,
        enc,
        rect,
      }
    }
    setMoviendo(true)
  }

  const alPresionar = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!imagen || guardando) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    punterosRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    reiniciarGesto()
  }

  const alMover = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!imagen || !punterosRef.current.has(e.pointerId)) return
    punterosRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const gesto = gestoRef.current
    const punteros = Array.from(punterosRef.current.values())
    if (!gesto) return

    if (gesto.tipo === 'mover') {
      const p = punteros[0]
      aplicar(mover(imagen, gesto.enc, (p.x - gesto.x0) / gesto.lado, (p.y - gesto.y0) / gesto.lado))
      return
    }
    if (punteros.length < 2) return
    const [a, b] = punteros
    const lado = gesto.rect.width
    const conZoom = zoomHacia(
      imagen, gesto.enc,
      (gesto.enc.zoom * Math.hypot(b.x - a.x, b.y - a.y)) / gesto.dist0,
      (gesto.cx0 - gesto.rect.left) / lado - 0.5,
      (gesto.cy0 - gesto.rect.top) / lado - 0.5,
    )
    aplicar(mover(imagen, conZoom, ((a.x + b.x) / 2 - gesto.cx0) / lado, ((a.y + b.y) / 2 - gesto.cy0) / lado))
  }

  const alSoltar = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!punterosRef.current.delete(e.pointerId)) return
    reiniciarGesto()
  }

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!imagen) return
    const paso = e.shiftKey ? 0.1 : 0.02
    const enc = encuadreRef.current
    let nuevo: Encuadre | null = null
    switch (e.key) {
      case 'ArrowLeft': nuevo = mover(imagen, enc, -paso, 0); break
      case 'ArrowRight': nuevo = mover(imagen, enc, paso, 0); break
      case 'ArrowUp': nuevo = mover(imagen, enc, 0, -paso); break
      case 'ArrowDown': nuevo = mover(imagen, enc, 0, paso); break
      case '+': case '=': nuevo = zoomHacia(imagen, enc, enc.zoom * 1.1); break
      case '-': case '_': nuevo = zoomHacia(imagen, enc, enc.zoom / 1.1); break
    }
    if (nuevo) {
      e.preventDefault()
      aplicar(nuevo)
    }
  }

  const alCancelarDialogo = (e: SyntheticEvent<HTMLDialogElement>) => {
    // Escape: se cierra desde React (desmontando), no el navegador.
    e.preventDefault()
    if (!guardando) onCancelar()
  }

  const guardar = async () => {
    if (!imagen || guardando) return
    setGuardando(true)
    setError(null)
    try {
      const lienzo = dibujarRecorte(imagen.el, imagen, encuadreRef.current)
      const foto = await lienzoABlob(lienzo)
      await onGuardar(foto)
      // Si sale bien, quien abrió el editor lo cierra (se desmonta).
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No se pudo guardar la foto. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  const tam = imagen ? tamanoRelativo(imagen, encuadre) : null
  const sinCambios = encuadre.zoom === 1 && encuadre.rotacion === 0 && encuadre.x === 0 && encuadre.y === 0
  const bloqueado = !imagen || guardando

  return (
    <dialog
      ref={dialogoRef}
      className="editor-foto"
      aria-labelledby={idTitulo}
      aria-describedby={idAyuda}
      onCancel={alCancelarDialogo}
    >
      <div className="editor-foto-cabecera">
        <h2 id={idTitulo}>Ajustar foto</h2>
        <p id={idAyuda}>
          Arrastra la foto para encuadrarla y usa el zoom para acercarla. Lo que quede
          dentro del círculo será tu foto de perfil.
        </p>
      </div>

      <div className="editor-foto-cuerpo">
        <div
          ref={visorRef}
          className={'editor-foto-visor' + (moviendo ? ' is-moviendo' : '')}
          tabIndex={0}
          role="group"
          aria-label="Encuadre de la foto. Flechas para mover; teclas más y menos para acercar o alejar."
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={alTeclear}
        >
          {imagen && tam && (
            <div
              className="editor-foto-lienzo"
              style={{ transform: `translate(${encuadre.x * 100}%, ${encuadre.y * 100}%)` }}
            >
              <img
                src={imagen.url}
                alt=""
                draggable={false}
                style={{
                  width: `${tam.w * 100}%`,
                  height: `${tam.h * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${encuadre.rotacion}deg)`,
                }}
              />
            </div>
          )}
          {!imagen && !errorCarga && <div className="editor-foto-estado">Cargando…</div>}
          <div className="editor-foto-guia" aria-hidden="true" />
          <div className="editor-foto-mascara" aria-hidden="true" />
        </div>

        <div className="editor-foto-controles">
          <button
            type="button" className="editor-foto-icono" aria-label="Alejar"
            disabled={bloqueado || encuadre.zoom <= ZOOM_MIN}
            onClick={() => imagen && aplicar(zoomHacia(imagen, encuadreRef.current, encuadreRef.current.zoom / PASO_ZOOM))}
          >
            <IconoMenos />
          </button>
          <input
            type="range" className="editor-foto-zoom" aria-label="Zoom"
            min={ZOOM_MIN} max={ZOOM_MAX} step={0.01}
            value={encuadre.zoom}
            aria-valuetext={`${Math.round(encuadre.zoom * 100)} %`}
            disabled={bloqueado}
            onChange={(e) => imagen && aplicar(zoomHacia(imagen, encuadreRef.current, Number(e.target.value)))}
          />
          <button
            type="button" className="editor-foto-icono" aria-label="Acercar"
            disabled={bloqueado || encuadre.zoom >= ZOOM_MAX}
            onClick={() => imagen && aplicar(zoomHacia(imagen, encuadreRef.current, encuadreRef.current.zoom * PASO_ZOOM))}
          >
            <IconoMas />
          </button>
          <span className="editor-foto-divisor" aria-hidden="true" />
          <button
            type="button" className="editor-foto-icono" aria-label="Girar 90 grados" title="Girar"
            disabled={bloqueado}
            onClick={() => imagen && aplicar(girar(imagen, encuadreRef.current))}
          >
            <IconoGirar />
          </button>
        </div>

        {errorCarga && (
          <div className="auth-error editor-foto-error" role="alert">
            Ese archivo no se pudo abrir como imagen. Prueba con una foto JPG, PNG o WebP.
          </div>
        )}
        {error && <div className="auth-error editor-foto-error" role="alert">{error}</div>}
      </div>

      <div className="editor-foto-pie">
        <button
          type="button" className="editor-foto-restablecer"
          disabled={bloqueado || sinCambios}
          onClick={() => aplicar(ENCUADRE_INICIAL)}
        >
          Restablecer
        </button>
        <div className="editor-foto-pie-acciones">
          <button type="button" className="btn-ghost" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button type="button" className="btn" onClick={guardar} disabled={bloqueado}>
            {guardando ? 'Guardando…' : 'Guardar foto'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
