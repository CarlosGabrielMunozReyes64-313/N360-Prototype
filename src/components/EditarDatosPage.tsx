import { useState } from 'react'
import type { Perfil, Tamizaje } from '../types'
import type { HistorialEntrada } from '../App'
import { PerfilPaso } from './PerfilPaso'
import { TamizajePaso } from './TamizajePaso'
import { MiCuentaTab } from './MiCuentaTab'
import './editar-datos-page.css'

type Pestana = 'datos' | 'historial' | 'cuenta'

interface Props {
  perfil: Perfil
  tamizaje: Tamizaje
  historial: HistorialEntrada[]
  onEnviar: (perfil: Perfil, tamizaje: Tamizaje) => void
  onVolver: () => void
}

/**
 * Vista completa (no modal/flotante) para:
 * - editar perfil + tamizaje, con un botón final "Enviar" que reemplaza
 *   los datos activos (guardando la versión anterior en el historial),
 * - consultar el historial de cambios (solo lectura, nada para borrar),
 * - gestionar la cuenta (nombre, correo, contraseña).
 *
 * No toca Cuestionario, Resultados, Radar ni la generación de PDF.
 */
export function EditarDatosPage({ perfil, tamizaje, historial, onEnviar, onVolver }: Props) {
  const [pestana, setPestana] = useState<Pestana>('datos')
  const [subpaso, setSubpaso] = useState<0 | 1>(0)
  const [draftPerfil, setDraftPerfil] = useState<Perfil>(perfil)
  const [draftTamizaje, setDraftTamizaje] = useState<Tamizaje>(tamizaje)

  const TABS: { id: Pestana; label: string }[] = [
    { id: 'datos', label: 'Datos y tamizaje' },
    { id: 'historial', label: 'Historial de cambios' },
    { id: 'cuenta', label: 'Mi cuenta' },
  ]

  return (
    <div className="editar-pagina">
      <header className="editar-pagina-header">
        <button type="button" className="btn-ghost" onClick={onVolver}>← Volver</button>
        <div className="brand-name">NEXUS 360°</div>
      </header>

      <nav className="editar-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={'editar-tab' + (pestana === t.id ? ' is-on' : '')}
            onClick={() => setPestana(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="editar-pagina-body">
        {pestana === 'datos' && subpaso === 0 && (
          <PerfilPaso
            perfil={draftPerfil}
            onChange={setDraftPerfil}
            onNext={() => setSubpaso(1)}
            textoBoton="Siguiente: tamizaje →"
            ocultarNota
          />
        )}

        {pestana === 'datos' && subpaso === 1 && (
          <TamizajePaso
            tamizaje={draftTamizaje}
            onChange={setDraftTamizaje}
            onBack={() => setSubpaso(0)}
            onNext={() => onEnviar(draftPerfil, draftTamizaje)}
            textoBoton="Enviar"
          />
        )}

        {pestana === 'historial' && (
          <section className="card">
            <div className="eyebrow">Historial</div>
            <h1 className="title">Cambios anteriores</h1>
            <p className="lede">
              Cada envío queda registrado aquí con la fecha. Es de solo lectura: no se puede borrar.
            </p>

            {historial.length === 0 ? (
              <p className="lede">Todavía no hay cambios registrados para esta cuenta.</p>
            ) : (
              <ul className="historial-lista">
                {[...historial].reverse().map((h, i) => (
                  <li key={i} className="historial-item">
                    <div className="historial-fecha">
                      {new Date(h.fecha).toLocaleString('es-CO', {
                        dateStyle: 'medium', timeStyle: 'short',
                      })}
                    </div>
                    <div className="historial-empresa">
                      <strong>{h.perfil.razonSocial || 'Sin razón social'}</strong>
                      {h.perfil.nit && ` · NIT ${h.perfil.nit}${h.perfil.dv ? '-' + h.perfil.dv : ''}`}
                    </div>
                    <div className="historial-meta">
                      Sector: {h.perfil.sector || '—'} · {h.perfil.municipio || '—'}, {h.perfil.departamento || '—'}
                    </div>
                    <div className="historial-meta">
                      Tamaño: {h.tamizaje.tamano || '—'} · Empleados: {h.tamizaje.empleados || '—'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {pestana === 'cuenta' && <MiCuentaTab />}
      </main>
    </div>
  )
}
