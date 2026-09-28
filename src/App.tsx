import { useEffect, useMemo, useState } from 'react'
import type { Diagnostico, Perfil, Priorizacion, RespuestaPregunta, Tamizaje } from './types'
import type { Usuario } from './auth/types'
import { AuthError } from './auth/types'
import { RSE_EXPRESS } from './data/rseExpress'
import { TAMIZAJE_VACIO, tamizajeCompleto } from './data/tamizaje'
import { progreso } from './engine/scoring'
import {
  DIAGNOSTICO_VACIO, PRIORIZACION_VACIA, agregarAlHistorial, cargarBorrador, cargarDatos,
  cargarHistorial, guardarBorrador, guardarDatos,
} from './almacen'
import type { HistorialEntrada } from './almacen'
import { PerfilPaso } from './components/PerfilPaso'
import { TamizajePaso } from './components/TamizajePaso'
import { MenuFormatos } from './components/MenuFormatos'
import { Cuestionario } from './components/Cuestionario'
import { Resultados } from './components/Resultados'
import { EditarDatosPage } from './components/EditarDatosPage'
import { MenuCuenta } from './components/MenuCuenta'
import { useAuth } from './auth/AuthContext'
import {
  diagnosticoDesdeApi, guardarDiagnostico, guardarEmpresa, obtenerMiEmpresa, payloadDiagnostico,
  payloadEmpresa, perfilDesdeApi, priorizacionDesdeApi, tamizajeDesdeApi,
} from './auth/empresaApi'
import { useGuardadoDiferido } from './hooks/useGuardadoDiferido'
import './topbar.css'
import './rse.css'

const PASOS = ['Perfil', 'Tamizaje', 'Autodiagnóstico', 'Resultados']

const PERFIL_VACIO: Perfil = {
  razonSocial: '', nit: '', dv: '', sector: '',
  municipio: '', departamento: '', extranjera: false,
}

function perfilCompleto(p: Perfil): boolean {
  return Boolean(p.razonSocial && p.nit && p.sector && p.municipio)
}

function pasoInicial(p: Perfil, t: Tamizaje): number {
  if (!perfilCompleto(p)) return 0
  if (!tamizajeCompleto(t)) return 1
  return 2
}

/** Conserva la clasificación que NEXUS hizo en el backend cuando la copia
 * local es más nueva (la empresa nunca escribe ese campo). */
function conClasificaciones(local: Diagnostico, remoto: Diagnostico): Diagnostico {
  const respuestas: Record<string, RespuestaPregunta> = {}
  for (const [k, r] of Object.entries(local.respuestas)) {
    const rr = remoto.respuestas[k]
    respuestas[k] = r.etapa === 'diferente' && rr?.etapa === 'diferente' ? { ...r, clasificada: rr.clasificada ?? null } : r
  }
  return { ...local, respuestas }
}

interface Props {
  usuario: Usuario
  onLogout: () => void
}

export default function App({ usuario, onLogout }: Props) {
  const { token } = useAuth()
  const id = usuario.usuario_id

  // Lectura local (inmediata). Si había datos de la versión anterior, aquí
  // mismo se migran: se conserva el perfil y se retira el tamizaje viejo.
  const local = useMemo(() => cargarDatos(id), [id])
  const borrador = useMemo(() => cargarBorrador(id), [id])

  const [perfil, setPerfil] = useState<Perfil>(local.perfil ?? PERFIL_VACIO)
  const [tamizaje, setTamizaje] = useState<Tamizaje>(local.tamizaje ?? TAMIZAJE_VACIO)
  const [diag, setDiag] = useState<Diagnostico>(borrador?.diagnostico ?? DIAGNOSTICO_VACIO)
  const [prior, setPrior] = useState<Priorizacion>(borrador?.priorizacion ?? PRIORIZACION_VACIA)
  const [paso, setPaso] = useState(() => pasoInicial(local.perfil ?? PERFIL_VACIO, local.tamizaje ?? TAMIZAJE_VACIO))
  const [hidratado, setHidratado] = useState(!token)
  const [avisoActualizacion, setAvisoActualizacion] = useState(local.legado)
  const [errorEmpresa, setErrorEmpresa] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [historial, setHistorial] = useState<HistorialEntrada[]>(() => cargarHistorial(id))
  const [abierto, setAbierto] = useState<number | null>(null)

  // Lo que está en el backend manda: el perfil, el tamizaje vigente y el
  // autodiagnóstico. Si el backend no responde, se sigue con lo local.
  useEffect(() => {
    if (!token) return
    let vivo = true
    obtenerMiEmpresa(token)
      .then((remoto) => {
        if (!vivo || !remoto) return
        const p = perfilDesdeApi(remoto.empresa)
        const t = tamizajeDesdeApi(remoto.tamizaje) ?? local.tamizaje ?? TAMIZAJE_VACIO
        setPerfil(p)
        setTamizaje(t)
        // Empresa guardada pero sin tamizaje = cuenta que venía del
        // instrumento anterior (migración 009): se le explica el cambio.
        if (!remoto.tamizaje && !local.tamizaje) setAvisoActualizacion(true)

        const d = diagnosticoDesdeApi(remoto.diagnostico)
        if (d && remoto.diagnostico) {
          const localMasNuevo = borrador?.guardadoEn
            && new Date(borrador.guardadoEn).getTime() > new Date(remoto.diagnostico.actualizado_en).getTime()
          if (localMasNuevo && borrador) {
            const combinado = conClasificaciones(borrador.diagnostico, d)
            setDiag(combinado)
            // Lo local no alcanzó a llegar al backend: se manda ya.
            guardarDiagnostico(token, payloadDiagnostico(combinado, borrador.priorizacion,
              progreso(RSE_EXPRESS, combinado, t).completo)).catch(() => {})
          } else {
            setDiag(d)
            setPrior(priorizacionDesdeApi(remoto.diagnostico))
          }
        }
        setPaso(pasoInicial(p, t))
      })
      .catch(() => { /* sin red o backend caído: se sigue con lo guardado en el navegador */ })
      .finally(() => { if (vivo) setHidratado(true) })
    return () => { vivo = false }
  }, [token, id, local, borrador])

  const completadoUnaVez = perfilCompleto(perfil) && tamizajeCompleto(tamizaje)
  const prog = useMemo(() => progreso(RSE_EXPRESS, diag, tamizaje), [diag, tamizaje])

  // Copia local inmediata.
  useEffect(() => { if (hidratado) guardarDatos(id, perfil, tamizaje) }, [hidratado, id, perfil, tamizaje])
  useEffect(() => { if (hidratado) guardarBorrador(id, diag, prior) }, [hidratado, id, diag, prior])

  // Backend, con un respiro entre envíos (ver useGuardadoDiferido).
  const datosEmpresa = useMemo(
    () => (completadoUnaVez ? payloadEmpresa(perfil, tamizaje) : null),
    [completadoUnaVez, perfil, tamizaje],
  )
  useGuardadoDiferido(datosEmpresa, async (v) => {
    if (!v || !token) return
    try {
      await guardarEmpresa(token, v)
      setErrorEmpresa(null)
    } catch (e) {
      if (e instanceof AuthError && (e.code === 'CONFLICTO' || e.code === 'VALIDACION')) setErrorEmpresa(e.message)
      throw e
    }
  }, { activo: hidratado && Boolean(token), ms: 600 })

  const datosDiagnostico = useMemo(
    () => (completadoUnaVez ? payloadDiagnostico(diag, prior, prog.completo) : null),
    [completadoUnaVez, diag, prior, prog.completo],
  )
  useGuardadoDiferido(datosDiagnostico, async (v) => {
    if (v && token) await guardarDiagnostico(token, v)
  }, { activo: hidratado && Boolean(token), ms: 1200 })

  const responder = (preguntaId: string, r: RespuestaPregunta) =>
    setDiag((d) => ({ ...d, respuestas: { ...d.respuestas, [preguntaId]: r } }))
  const escribirFortalecer = (numero: string, texto: string) =>
    setDiag((d) => ({ ...d, fortalecer: { ...d.fortalecer, [numero]: texto } }))
  const escribirComentario = (texto: string) => setDiag((d) => ({ ...d, comentarioFinal: texto }))

  const puedeAvanzar = (p: number) => {
    if (p === 0) return perfilCompleto(perfil)
    if (p === 1) return tamizajeCompleto(tamizaje)
    if (p === 2) return prog.completo
    return true
  }

  const ir = (i: number) => { setPaso(i); setAbierto(null); window.scrollTo(0, 0) }

  const irA = (i: number) => {
    // Con perfil y tamizaje completos, esos dos pasos se cambian desde
    // Configuración → «Datos y tamizaje» (queda registro en el historial).
    if (completadoUnaVez && i < 2 && i !== paso) return
    if (i <= paso || (i === paso + 1 && puedeAvanzar(paso))) ir(i)
  }

  const guardarEdicion = (p: Perfil, t: Tamizaje) => {
    const entrada: HistorialEntrada = { fecha: new Date().toISOString(), perfil, tamizaje }
    agregarAlHistorial(id, entrada)
    setHistorial((h) => [...h, entrada])
    setPerfil(p)
    setTamizaje(t)
    setEditando(false)
  }

  if (editando) {
    return (
      <EditarDatosPage
        perfil={perfil}
        tamizaje={tamizaje}
        historial={historial}
        puedeEditarDatos={completadoUnaVez}
        onEnviar={guardarEdicion}
        onVolver={() => setEditando(false)}
      />
    )
  }

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <div>
            <div className="brand-name">NEXUS 360°</div>
            <div className="brand-sub">Autodiagnóstico RSE Express · ISO 26000</div>
          </div>

          <MenuCuenta
            usuario={usuario}
            empresa={perfil.razonSocial
              ? { razonSocial: perfil.razonSocial, nit: perfil.nit, dv: perfil.dv }
              : null}
            onConfiguracion={() => { setEditando(true); window.scrollTo(0, 0) }}
            onCerrarSesion={onLogout}
          />
        </div>

        <ul className="stepper">
          {PASOS.map((label, i) => {
            const bloqueadoPorEdicion = completadoUnaVez && i < 2 && i !== paso
            return (
              <li key={label}>
                <button
                  className={'step' + (i === paso ? ' is-active' : i < paso ? ' is-done' : '')}
                  disabled={!hidratado || bloqueadoPorEdicion || (i > paso && !(i === paso + 1 && puedeAvanzar(paso)))}
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
        {errorEmpresa && (
          <div className="note note-alert" role="alert">
            <strong>No pudimos guardar los datos de la empresa.</strong> {errorEmpresa}
          </div>
        )}

        {!hidratado && (
          <section className="card"><p className="lede">Cargando los datos de su empresa…</p></section>
        )}

        {hidratado && paso === 0 && (
          <PerfilPaso perfil={perfil} onChange={setPerfil} onNext={() => ir(1)} />
        )}

        {hidratado && paso === 1 && (
          <TamizajePaso
            tamizaje={tamizaje} onChange={setTamizaje}
            avisoActualizacion={avisoActualizacion}
            onBack={() => ir(0)}
            onNext={() => { setAvisoActualizacion(false); ir(2) }}
          />
        )}

        {hidratado && paso === 2 && abierto === null && (
          <MenuFormatos
            instrumento={RSE_EXPRESS} diagnostico={diag} tamizaje={tamizaje}
            onAbrir={(i) => { setAbierto(i); window.scrollTo(0, 0) }}
            onResultados={() => ir(3)}
          />
        )}

        {hidratado && paso === 2 && abierto !== null && (
          <Cuestionario
            instrumento={RSE_EXPRESS} diagnostico={diag} tamizaje={tamizaje}
            materiaInicial={abierto}
            onRespuesta={responder}
            onFortalecer={escribirFortalecer}
            onComentario={escribirComentario}
            onSalir={() => { setAbierto(null); window.scrollTo(0, 0) }}
            onResultados={prog.completo ? () => ir(3) : undefined}
          />
        )}

        {hidratado && paso === 3 && (
          <Resultados
            perfil={perfil} tamizaje={tamizaje} diagnostico={diag}
            priorizacion={prior} onPriorizacion={setPrior}
            onBack={() => ir(2)}
          />
        )}
      </main>

      <footer className="app-footer">
        Autodiagnóstico, no auditoría: no verifica cumplimiento legal ni constituye concepto
        jurídico. Sus respuestas se guardan en su cuenta a medida que avanza.
      </footer>
    </>
  )
}
