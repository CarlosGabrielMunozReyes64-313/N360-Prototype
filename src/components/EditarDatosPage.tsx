import { useState } from 'react'
import type { Perfil, Tamizaje } from '../types'
import type { HistorialEntrada } from '../almacen'
import { nombreCliente, nombreTamano } from '../data/tamizaje'
import { PerfilPaso } from './PerfilPaso'
import { TamizajePaso } from './TamizajePaso'
import { MiCuentaTab } from './MiCuentaTab'
import './editar-datos-page.css'

type Pestana = 'datos' | 'historial' | 'cuenta'

interface Props {
  perfil: Perfil
  tamizaje: Tamizaje
  historial: HistorialEntrada[]
  /** false mientras la empresa no haya completado perfil + tamizaje por
   * primera vez: esos datos se llenan en el asistente, no aquí. */
  puedeEditarDatos: boolean
  onEnviar: (perfil: Perfil, tamizaje: Tamizaje) => void
  onVolver: () => void
}

/**
 * Configuración (se abre desde el menú de la foto de perfil). Vista
 * completa, no modal, con tres pestañas:
 * - Mi cuenta (la primera y la que se abre por defecto): foto de perfil,
 *   nombre, correo y contraseña;
 * - Datos y tamizaje: editar perfil + tamizaje, con un botón final
 *   "Enviar" que reemplaza los datos activos (guardando la versión
 *   anterior en el historial);
 * - Historial de cambios: solo lectura, nada para borrar.
 *
 * No toca Cuestionario, Resultados, Radar ni la generación de PDF.
 */
export function EditarDatosPage({
  perfil, tamizaje, historial, puedeEditarDatos, onEnviar, onVolver,
}: Props) {
  const [pestana, setPestana] = useState<Pestana>('cuenta')
  const [subpaso, setSubpaso] = useState<0 | 1>(0)
  const [draftPerfil, setDraftPerfil] = useState<Perfil>(perfil)
  const [draftTamizaje, setDraftTamizaje] = useState<Tamizaje>(tamizaje)

  const TABS: { id: Pestana; label: string }[] = [
    { id: 'cuenta', label: 'Mi cuenta' },
    ...(puedeEditarDatos ? [{ id: 'datos' as const, label: 'Datos y tamizaje' }] : []),
    { id: 'historial', label: 'Historial de cambios' },
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
            aria-current={pestana === t.id ? 'page' : undefined}
            onClick={() => setPestana(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="editar-pagina-body">
        {pestana === 'datos' && puedeEditarDatos && subpaso === 0 && (
          <PerfilPaso
            perfil={draftPerfil}
            onChange={setDraftPerfil}
            onNext={() => setSubpaso(1)}
            textoBoton="Siguiente: tamizaje →"
            ocultarNota
          />
        )}

        {pestana === 'datos' && puedeEditarDatos && subpaso === 1 && (
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
                      {h.tamizaje
                        ? <>Tamaño: {nombreTamano(h.tamizaje.tamano)} · Personas: {h.tamizaje.personas || '—'} · Clientes: {nombreCliente(h.tamizaje.clientes)}</>
                        : 'Tamizaje del instrumento anterior (se retiró con la actualización al Autodiagnóstico RSE Express).'}
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
