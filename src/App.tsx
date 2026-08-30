import { useEffect, useMemo, useState } from 'react'
import type { Formato, Perfil, Respuestas, Tamizaje, Valor } from './types'
import type { Usuario } from './auth/types'
import { FORMATO_01 } from './data/formato01'
import { FORMATO_02 } from './data/formato02'
import {
  construirPlan, evaluarBanderas, evaluarFormato, leyAplicable, lecturaCruzada, progreso,
} from './engine/scoring'
import { PerfilPaso } from './components/PerfilPaso'
import { TamizajePaso } from './components/TamizajePaso'
import { MenuFormatos } from './components/MenuFormatos'
import { Cuestionario } from './components/Cuestionario'
import { Resultados } from './components/Resultados'
import { EditarDatosModal } from './components/EditarDatosModal'
import './topbar.css'

const FORMATOS: Formato[] = [FORMATO_01, FORMATO_02]
const PASOS = ['Perfil', 'Tamizaje', 'Diagnóstico', 'Resultados']

const PERFIL_VACIO: Perfil = {
  razonSocial: '', nit: '', dv: '', sector: '',
  municipio: '', departamento: '', extranjera: false,
}
const TAMIZAJE_VACIO: Tamizaje = {
  tamano: '', empleados: '', areasDeVida: '',
  cicloPrevio: '', comunidadesEtnicas: '', consumidorFinal: '',
}

function perfilCompleto(p: Perfil): boolean {
  return Boolean(p.razonSocial && p.nit && p.sector && p.municipio)
}
function tamizajeCompleto(t: Tamizaje): boolean {
  return Boolean(
    t.tamano && t.empleados && t.areasDeVida &&
    t.cicloPrevio && t.comunidadesEtnicas && t.consumidorFinal,
  )
}

/** Guardado local por cuenta. Solo mientras no exista un endpoint de
 * backend para empresa/tamizaje — es la misma estrategia "front-only"
 * que ya usa la sesión de auth (localStorage), aplicada aquí a los
 * datos de perfil y tamizaje para que no se pidan de nuevo en cada login. */
function claveDatos(usuarioId: string) {
  return `n360_datos:${usuarioId}`
}
function cargarDatosGuardados(usuarioId: string): { perfil: Perfil; tamizaje: Tamizaje } | null {
  try {
    const raw = localStorage.getItem(claveDatos(usuarioId))
    if (!raw) return null
    const datos = JSON.parse(raw)
    if (datos?.perfil && datos?.tamizaje) return datos
    return null
  } catch {
    return null
  }
}
function guardarDatos(usuarioId: string, perfil: Perfil, tamizaje: Tamizaje) {
  try {
    localStorage.setItem(claveDatos(usuarioId), JSON.stringify({ perfil, tamizaje }))
  } catch {
    /* si no hay almacenamiento disponible, simplemente no persiste */
  }
}

interface Props {
  usuario: Usuario
  onLogout: () => void
}

export default function App({ usuario, onLogout }: Props) {
  const guardado = useMemo(() => cargarDatosGuardados(usuario.usuario_id), [usuario.usuario_id])
  const yaCompletadoAlEntrar = Boolean(
    guardado && perfilCompleto(guardado.perfil) && tamizajeCompleto(guardado.tamizaje),
  )

  const [paso, setPaso] = useState(yaCompletadoAlEntrar ? 2 : 0)
  const [perfil, setPerfil] = useState<Perfil>(guardado?.perfil ?? PERFIL_VACIO)
  const [tamizaje, setTamizaje] = useState<Tamizaje>(guardado?.tamizaje ?? TAMIZAJE_VACIO)
  const [completadoUnaVez, setCompletadoUnaVez] = useState(yaCompletadoAlEntrar)
  const [editando, setEditando] = useState(false)
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [abierto, setAbierto] = useState<Formato['id'] | null>(null)

  // En cuanto perfil y tamizaje quedan completos (la primera vez, por el
  // asistente normal, o después vía el modal de edición), se guardan para
  // esta cuenta y se marca como "ya completado" — así el próximo login
  // entra directo a Diagnóstico en vez de pedir todo de nuevo.
  useEffect(() => {
    if (perfilCompleto(perfil) && tamizajeCompleto(tamizaje)) {
      guardarDatos(usuario.usuario_id, perfil, tamizaje)
      setCompletadoUnaVez(true)
    }
  }, [perfil, tamizaje, usuario.usuario_id])

  const responder = (id: string, v: Valor) =>
    setRespuestas((r) => ({ ...r, [id]: v }))

  /** T6 en «no» deja la materia de consumidores fuera del cálculo por defecto. */
  const irAFormatos = () => {
    if (tamizaje.consumidorFinal === 'no') {
      setRespuestas((r) => {
        const next = { ...r }
        for (const k of ['consumidores.a', 'consumidores.b', 'consumidores.c'])
          if (next[k] === undefined) next[k] = 'NA'
        return next
      })
    }
    setPaso(2)
  }

  const ley = leyAplicable(tamizaje)

  const resIso = useMemo(() => {
    const p = progreso(FORMATO_01, respuestas, tamizaje)
    return p.hechas > 0 ? evaluarFormato(FORMATO_01, respuestas, perfil.sector, tamizaje) : null
  }, [respuestas, perfil.sector, tamizaje])

  const resLey = useMemo(() => {
    const p = progreso(FORMATO_02, respuestas, tamizaje)
    return p.hechas > 0 ? evaluarFormato(FORMATO_02, respuestas, perfil.sector, tamizaje) : null
  }, [respuestas, perfil.sector, tamizaje])

  const banderas = useMemo(() => evaluarBanderas(ley.aplica ? resLey : null), [resLey, ley.aplica])
  const cruce = useMemo(
    () => lecturaCruzada(resIso, ley.aplica ? resLey : null, ley.exigible),
    [resIso, resLey, ley.aplica, ley.exigible],
  )
  const plan = useMemo(
    () => construirPlan(resIso, ley.aplica ? resLey : null, banderas, ley.exigible),
    [resIso, resLey, banderas, ley.aplica, ley.exigible],
  )

  const puedeAvanzar = (p: number) => {
    if (p === 0) return perfilCompleto(perfil)
    if (p === 1) return tamizajeCompleto(tamizaje)
    if (p === 2) return FORMATOS.some((f) => progreso(f, respuestas, tamizaje).completo)
    return true
  }

  const irA = (i: number) => {
    // Una vez completados perfil+tamizaje, esos dos pasos quedan bloqueados
    // en la barra de pasos: la única forma de cambiarlos es el modal de
    // edición (clic en el nombre de la empresa, arriba).
    if (completadoUnaVez && i < 2 && i !== paso) return
    if (i <= paso || (i === paso + 1 && puedeAvanzar(paso))) {
      setPaso(i); setAbierto(null); window.scrollTo(0, 0)
    }
  }

  const guardarEdicion = (p: Perfil, t: Tamizaje) => {
    setPerfil(p)
    setTamizaje(t)
    setEditando(false)
  }

  const formatoAbierto = FORMATOS.find((f) => f.id === abierto)

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <div>
            <div className="brand-name">NEXUS 360°</div>
            <div className="brand-sub">Diagnóstico normativo · ISO 26000 y Ley 2173</div>
          </div>

          <div className="header-cuenta">
            {perfil.razonSocial && (
              <button
                type="button"
                className="company-tag company-tag--clic"
                onClick={() => setEditando(true)}
                title={completadoUnaVez ? 'Editar datos de la empresa y el tamizaje' : 'Datos de la empresa'}
              >
                <strong>{perfil.razonSocial}</strong>
                {perfil.nit && `NIT ${perfil.nit}${perfil.dv ? '-' + perfil.dv : ''}`}
              </button>
            )}
            <div className="sesion-tag">
              <span>Sesión: <strong>{usuario.nombre}</strong></span>
              <button type="button" className="btn-ghost btn-sm" onClick={onLogout}>Cerrar sesión</button>
            </div>
          </div>
        </div>

        <ul className="stepper">
          {PASOS.map((label, i) => {
            const bloqueadoPorEdicion = completadoUnaVez && i < 2 && i !== paso
            return (
              <li key={label}>
                <button
                  className={'step' + (i === paso ? ' is-active' : i < paso ? ' is-done' : '')}
                  disabled={bloqueadoPorEdicion || (i > paso && !(i === paso + 1 && puedeAvanzar(paso)))}
                  onClick={() => irA(i)}
                >
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="step-label">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </header>

      <main>
        {paso === 0 && (
          <PerfilPaso perfil={perfil} onChange={setPerfil} onNext={() => { setPaso(1); window.scrollTo(0, 0) }} />
        )}

        {paso === 1 && (
          <TamizajePaso tamizaje={tamizaje} onChange={setTamizaje}
            onBack={() => setPaso(0)} onNext={() => { irAFormatos(); window.scrollTo(0, 0) }} />
        )}

        {paso === 2 && !formatoAbierto && (
          <MenuFormatos formatos={FORMATOS} respuestas={respuestas} tamizaje={tamizaje}
            onAbrir={(id) => { setAbierto(id); window.scrollTo(0, 0) }}
            onResultados={() => { setPaso(3); window.scrollTo(0, 0) }} />
        )}

        {paso === 2 && formatoAbierto && (
          <Cuestionario formato={formatoAbierto} respuestas={respuestas} sector={perfil.sector}
            tamizaje={tamizaje} onAnswer={responder}
            onSalir={() => { setAbierto(null); window.scrollTo(0, 0) }} />
        )}

        {paso === 3 && (
          <Resultados perfil={perfil} tamizaje={tamizaje} iso={resIso} ley={resLey}
            leyAplica={ley.aplica} leyExigible={ley.exigible} motivoLey={ley.motivo}
            cruce={cruce} banderas={banderas} plan={plan}
            onBack={() => { setPaso(2); window.scrollTo(0, 0) }} />
        )}
      </main>

      <footer className="app-footer">
        Prototipo de autoevaluación. No constituye concepto jurídico. Los datos del
        diagnóstico no se conservan al recargar la página; el perfil y el tamizaje
        sí quedan guardados para esta cuenta.
      </footer>

      {editando && (
        <EditarDatosModal
          perfil={perfil}
          tamizaje={tamizaje}
          onGuardar={guardarEdicion}
          onCancelar={() => setEditando(false)}
        />
      )}
    </>
  )
}
