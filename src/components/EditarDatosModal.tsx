import { useState } from 'react'
import type { Perfil, Tamizaje } from '../types'
import { PerfilPaso } from './PerfilPaso'
import { TamizajePaso } from './TamizajePaso'
import './editar-datos.css'

interface Props {
  perfil: Perfil
  tamizaje: Tamizaje
  onGuardar: (perfil: Perfil, tamizaje: Tamizaje) => void
  onCancelar: () => void
}

/**
 * Pantalla para revisar/cambiar los datos de perfil y tamizaje después de
 * haberlos llenado la primera vez. Es un mini-asistente de 2 pasos que
 * reutiliza PerfilPaso y TamizajePaso tal cual (misma validación, mismos
 * campos) — solo cambia el texto de los botones y qué pasa al terminar:
 * en vez de avanzar de paso en la app, guarda y cierra el modal.
 * No toca nada de Diagnóstico, Resultados ni la generación de PDF.
 */
export function EditarDatosModal({ perfil, tamizaje, onGuardar, onCancelar }: Props) {
  const [paso, setPaso] = useState<0 | 1>(0)
  const [draftPerfil, setDraftPerfil] = useState<Perfil>(perfil)
  const [draftTamizaje, setDraftTamizaje] = useState<Tamizaje>(tamizaje)

  return (
    <div className="editar-datos-overlay" onClick={onCancelar} role="presentation">
      <div
        className="editar-datos-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Editar datos de la empresa y el tamizaje"
      >
        <div className="editar-datos-header">
          <div>
            <div className="eyebrow">Editar datos</div>
            <h2 className="editar-datos-titulo">
              {paso === 0 ? 'Datos de la empresa' : 'Tamizaje del ciclo'}
            </h2>
          </div>
          <button
            type="button"
            className="editar-datos-cerrar"
            onClick={onCancelar}
            aria-label="Cerrar sin guardar"
          >
            ×
          </button>
        </div>

        <div className="editar-datos-body">
          {paso === 0 && (
            <PerfilPaso
              perfil={draftPerfil}
              onChange={setDraftPerfil}
              onNext={() => setPaso(1)}
              textoBoton="Siguiente: tamizaje →"
              ocultarNota
            />
          )}

          {paso === 1 && (
            <TamizajePaso
              tamizaje={draftTamizaje}
              onChange={setDraftTamizaje}
              onBack={() => setPaso(0)}
              onNext={() => onGuardar(draftPerfil, draftTamizaje)}
              textoBoton="Guardar cambios"
            />
          )}
        </div>
      </div>
    </div>
  )
}
