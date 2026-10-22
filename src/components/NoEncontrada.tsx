import { useEffect } from 'react'
import mascota from '../assets/mascota-nexus.webp'
import { LogoN360 } from './Landing'
import './no-encontrada.css'

interface Props {
  /** Hay sesión abierta: «Ir al inicio» lleva al diagnóstico (o al panel). */
  conSesion: boolean
  onInicio: () => void
  onIniciarSesion: () => void
}

/**
 * Error 404: la dirección no corresponde a ninguna pantalla de NEXUS 360°
 * (una ruta distinta de la raíz o un #/… desconocido). La decide AuthGate.
 */
export function NoEncontrada({ conSesion, onInicio, onIniciarSesion }: Props) {
  useEffect(() => {
    const anterior = document.title
    document.title = 'Página no encontrada · NEXUS 360°'
    return () => { document.title = anterior }
  }, [])

  return (
    <div className="nf">
      <header className="nf-bar">
        <button type="button" className="nf-marca" onClick={onInicio}>
          <LogoN360 />
          <span>NEXUS 360°</span>
        </button>
      </header>

      <main className="nf-cuerpo">
        <div className="nf-contenido">
          <img className="nf-mascota" src={mascota} alt="" width={332} height={440} />
          <div className="nf-texto">
            <p className="nf-codigo">Error 404</p>
            <h1 className="nf-titulo">No encontramos esta página</h1>
            <p className="nf-lead">
              Puede que el enlace esté mal escrito o que la página ya no exista.
              {conSesion && ' Sus respuestas siguen guardadas en su cuenta.'}
            </p>
            <div className="nf-acciones">
              <button type="button" className="nf-btn nf-btn-primario" onClick={onInicio}>
                Ir al inicio
              </button>
              {!conSesion && (
                <button type="button" className="nf-btn nf-btn-secundario" onClick={onIniciarSesion}>
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
