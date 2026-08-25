import { useMemo, useState } from 'react'
import type { Formato, Perfil, Respuestas, Tamizaje, Valor } from './types'
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

export default function App() {
  const [paso, setPaso] = useState(0)
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VACIO)
  const [tamizaje, setTamizaje] = useState<Tamizaje>(TAMIZAJE_VACIO)
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [abierto, setAbierto] = useState<Formato['id'] | null>(null)

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
    if (p === 0) return Boolean(perfil.razonSocial && perfil.nit && perfil.sector && perfil.municipio)
    if (p === 1) return Boolean(tamizaje.tamano && tamizaje.empleados && tamizaje.areasDeVida &&
      tamizaje.cicloPrevio && tamizaje.comunidadesEtnicas && tamizaje.consumidorFinal)
    if (p === 2) return FORMATOS.some((f) => progreso(f, respuestas, tamizaje).completo)
    return true
  }

  const irA = (i: number) => {
    if (i <= paso || (i === paso + 1 && puedeAvanzar(paso))) {
      setPaso(i); setAbierto(null); window.scrollTo(0, 0)
    }
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
          {perfil.razonSocial && (
            <div className="company-tag">
              <strong>{perfil.razonSocial}</strong>
              {perfil.nit && `NIT ${perfil.nit}${perfil.dv ? '-' + perfil.dv : ''}`}
            </div>
          )}
        </div>
        <ul className="stepper">
          {PASOS.map((label, i) => (
            <li key={label}>
              <button
                className={'step' + (i === paso ? ' is-active' : i < paso ? ' is-done' : '')}
                disabled={i > paso && !(i === paso + 1 && puedeAvanzar(paso))}
                onClick={() => irA(i)}
              >
                <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="step-label">{label}</span>
              </button>
            </li>
          ))}
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
            onBack={() => setPaso(1)}
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
        Prototipo de autoevaluación. No constituye concepto jurídico. Los datos no se
        conservan al recargar la página.
      </footer>
    </>
  )
}
