import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Perfil } from '../types'
import { perfilNitValido } from '../data/nit'
import { ESCENARIOS, generarDatosPrueba } from './datosPrueba'
import type { DatosPrueba, Escenario } from './datosPrueba'

interface Props {
  perfilActual: Perfil
  /** true mientras la app todavía carga los datos del backend. */
  deshabilitado?: boolean
  /** Guarda en el backend, actualiza la pantalla y navega. Si falla, lanza. */
  onLlenar: (datos: DatosPrueba, verResultados: boolean) => Promise<void>
}

const caja: CSSProperties = {
  position: 'fixed', left: 16, bottom: 16, zIndex: 1000, width: 300, maxWidth: 'calc(100vw - 32px)',
  background: '#fff', border: '2px dashed var(--nx-gold, #d99521)', borderRadius: 12,
  boxShadow: '0 10px 30px rgba(0,0,0,.15)', padding: 14, fontSize: 13, lineHeight: 1.4,
}
const pastilla: CSSProperties = {
  position: 'fixed', left: 16, bottom: 16, zIndex: 1000, border: '2px dashed var(--nx-gold, #d99521)',
  background: '#fffaf0', color: 'var(--nx-text, #1a2e24)', borderRadius: 999, padding: '8px 14px',
  fontWeight: 600, cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,.12)',
}
const boton: CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--nx-dark, #024029)',
  fontWeight: 600, cursor: 'pointer', marginTop: 8,
}

/**
 * SOLO DESARROLLO. Llena el perfil, el tamizaje y el autodiagnóstico con
 * datos de prueba para probar los resultados y el análisis inteligente.
 * App.tsx solo lo carga con `npm run dev` o con VITE_DATOS_PRUEBA=true.
 */
export default function PanelPrueba({ perfilActual, deshabilitado = false, onLlenar }: Props) {
  const tienePerfil = Boolean(perfilActual.razonSocial && perfilActual.sector && perfilActual.municipio)
    && perfilNitValido(perfilActual)
  const [abierto, setAbierto] = useState(false)
  const [escenario, setEscenario] = useState<Escenario>('intermedia')
  const [conservarPerfil, setConservarPerfil] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  if (!abierto) {
    return <button type="button" style={pastilla} onClick={() => setAbierto(true)}>🧪 Datos de prueba</button>
  }

  const llenar = async (verResultados: boolean) => {
    setOcupado(true)
    setMensaje(null)
    try {
      const datos = generarDatosPrueba(escenario, { perfilActual: tienePerfil && conservarPerfil ? perfilActual : null })
      await onLlenar(datos, verResultados)
      setMensaje({ tipo: 'ok', texto: `Listo: ${datos.perfil.razonSocial}.` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo llenar con datos de prueba.' })
    } finally {
      setOcupado(false)
    }
  }

  const ayuda = ESCENARIOS.find((x) => x.id === escenario)?.ayuda
  const bloqueado = ocupado || deshabilitado

  return (
    <aside style={caja} aria-label="Datos de prueba">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>🧪 Datos de prueba</strong>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"
          style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <label htmlFor="dp-escenario" style={{ display: 'block', fontWeight: 600 }}>Escenario</label>
      <select id="dp-escenario" value={escenario} onChange={(e) => setEscenario(e.target.value as Escenario)}
        style={{ width: '100%', padding: 6, marginTop: 4 }}>
        {ESCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </select>
      {ayuda && <p style={{ margin: '4px 0 8px', color: 'var(--nx-muted, #5a7068)' }}>{ayuda}</p>}

      <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', opacity: tienePerfil ? 1 : 0.5 }}>
        <input type="checkbox" checked={tienePerfil && conservarPerfil} disabled={!tienePerfil}
          onChange={(e) => setConservarPerfil(e.target.checked)} />
        <span>
          Conservar el perfil actual
          {tienePerfil ? ` (${perfilActual.razonSocial})` : ' (no hay uno completo: se crea una empresa «PRUEBA · …»)'}
        </span>
      </label>

      <button type="button" disabled={bloqueado} onClick={() => llenar(true)}
        style={{ ...boton, background: 'var(--nx-dark, #024029)', color: '#fff', opacity: bloqueado ? 0.6 : 1 }}>
        {ocupado ? 'Guardando…' : 'Llenar y ver resultados'}
      </button>
      <button type="button" disabled={bloqueado} onClick={() => llenar(false)}
        style={{ ...boton, background: '#fff', color: 'var(--nx-dark, #024029)', opacity: bloqueado ? 0.6 : 1 }}>
        Solo llenar (revisar respuestas)
      </button>

      {mensaje && (
        <p role="status" style={{ margin: '8px 0 0', color: mensaje.tipo === 'ok' ? 'var(--nx-mid, #04a97a)' : 'var(--nx-alert, #a8322a)' }}>
          {mensaje.texto}
        </p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--nx-muted, #5a7068)' }}>
        Cada clic genera respuestas nuevas, así que el análisis inteligente se vuelve a pedir a Gemini.
        Solo visible en desarrollo.
      </p>
    </aside>
  )
}
