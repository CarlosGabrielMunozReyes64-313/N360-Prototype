import { useEffect, useMemo, useRef, useState } from "react";
import * as adminApi from "../auth/adminApi";
import type { EmpresaDetalle } from "../auth/adminApi";
import type { EmpresaMia } from "../auth/empresaApi";
import {
  diagnosticoDesdeApi,
  etapaDesdeApi,
  perfilDesdeApi,
  priorizacionDesdeApi,
  tamizajeDesdeApi,
} from "../auth/empresaApi";
import { AuthError } from "../auth/types";
import type { RangoIngresos, SectorId, Tamano, TipoCliente } from "../types";
import { RSE_EXPRESS } from "../data/rseExpress";
import { ETAPAS, clasificar, etiquetaEtapa } from "../data/escala";
import {
  nombreCliente,
  nombreIngresos,
  nombreTamano,
  nombresVinculacion,
  resumenLugares,
  resumenVecinos,
} from "../data/tamizaje";
import {
  calificacionDe,
  evaluar,
  oportunidades,
  sumaPrioridad,
} from "../engine/scoring";
import { construirDoc, nombreArchivo } from "../export/pdf";
import type { DatosInforme } from "../export/pdf";

/**
 * Lista de empresas y ficha individual. La lista sale de `/admin/empresas`
 * (perfil, tamizaje vigente y avance del autodiagnóstico). La ficha pide
 * además `/admin/empresas/{id}/diagnostico` para leer las respuestas
 * abiertas y clasificar las «Hacemos algo diferente».
 *
 * Desde la lista y desde la ficha se puede descargar el autodiagnóstico en
 * PDF: es el mismo informe que la empresa descarga en sus resultados.
 *
 * «Descargar registro de prospectos» baja el Excel del Entregable 3 con todas
 * las empresas de la lista, hayan respondido o no (ver export/registroProspectos).
 */
const TOTAL_PREGUNTAS = RSE_EXPRESS.materias.reduce(
  (n, m) => n + m.preguntas.length,
  0,
);

const NOMBRES_ESTADO: Record<string, string> = {
  borrador: "En borrador",
  completado: "Completado",
  archivado: "Archivado",
};

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return (
    partes
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

function texto(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

/** Chip del estado de un diagnóstico. `null` no es un error: significa
 * que ese formato todavía no se abrió en el ciclo vigente. */
function ChipDiagnostico({ estado }: { estado: string | null }) {
  if (!estado)
    return (
      <span className="chip-estado chip-estado--inactiva">Sin iniciar</span>
    );
  const clase =
    estado === "completado"
      ? "chip-estado--activa"
      : estado === "borrador"
        ? "chip-estado--bloqueada"
        : "chip-estado--inactiva";
  return (
    <span className={`chip-estado ${clase}`}>
      {NOMBRES_ESTADO[estado] ?? estado}
    </span>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

/** Lo que necesita el informe PDF, armado con la respuesta de
 * `/admin/empresas/{id}/diagnostico`. `null` si todavía no hay tamizaje o
 * respuestas. La fecha del informe es la de la última actualización de las
 * respuestas, no la del día en que se descarga. */
function informeDesdeApi(datos: EmpresaMia): DatosInforme | null {
  const tamizaje = tamizajeDesdeApi(datos.tamizaje);
  const diagnostico = diagnosticoDesdeApi(datos.diagnostico);
  if (!datos.diagnostico || !tamizaje || !diagnostico) return null;
  const fecha = new Date(datos.diagnostico.actualizado_en);
  return {
    perfil: perfilDesdeApi(datos.empresa),
    tamizaje,
    diagnostico,
    priorizacion: priorizacionDesdeApi(datos.diagnostico),
    fecha: Number.isNaN(fecha.getTime()) ? undefined : fecha,
  };
}

/** Genera y descarga el PDF. No lleva la lectura interna 0–4 (igual que el
 * de la empresa) ni el análisis con IA, que este endpoint no devuelve. Si el
 * autodiagnóstico sigue en borrador, el nombre del archivo lo indica.
 * Devuelve `false` si no había nada que descargar. */
function descargarInforme(datos: EmpresaMia): boolean {
  const informe = informeDesdeApi(datos);
  if (!informe) return false;
  const nombre = nombreArchivo(informe.perfil);
  const borrador = datos.diagnostico?.estado === "borrador";
  construirDoc(informe).save(
    borrador ? nombre.replace(/\.pdf$/, "_borrador.pdf") : nombre,
  );
  return true;
}

/** Hay algo que descargar: tamizaje vigente y al menos una respuesta. */
function tieneRespuestas(e: EmpresaDetalle): boolean {
  return (
    e.anio !== null &&
    e.diagnostico_estado !== null &&
    e.respuestas_con_etapa > 0
  );
}

function FichaEmpresa({
  e,
  token,
  onVolver,
  onCambio,
}: {
  e: EmpresaDetalle;
  token: string;
  onVolver: () => void;
  onCambio: () => void;
}) {
  const sinTamizaje = e.anio === null;
  const [datos, setDatos] = useState<EmpresaMia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const seccionDiagnostico = useRef<HTMLElement>(null);

  useEffect(() => {
    let vivo = true;
    adminApi
      .obtenerDiagnosticoEmpresa(token, e.empresa_id)
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch((err) => {
        if (vivo)
          setError(
            err instanceof AuthError
              ? err.message
              : "No se pudo cargar el autodiagnóstico.",
          );
      });
    return () => {
      vivo = false;
    };
  }, [token, e.empresa_id]);

  const clasificarRespuesta = async (
    respuestaId: string,
    codigo: string,
    valor: number | null,
  ) => {
    setGuardando(codigo);
    try {
      const r = await adminApi.clasificarRespuesta(token, respuestaId, valor);
      setDatos((d) => {
        if (!d?.diagnostico) return d;
        const actual = d.diagnostico.respuestas[codigo];
        return {
          ...d,
          diagnostico: {
            ...d.diagnostico,
            respuestas: {
              ...d.diagnostico.respuestas,
              [codigo]: {
                ...actual,
                clasificada: r.clasificada,
                clasificado_en: r.clasificado_en,
              },
            },
          },
        };
      });
      onCambio();
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : "No se pudo guardar la clasificación.",
      );
    } finally {
      setGuardando(null);
    }
  };

  const diag = diagnosticoDesdeApi(datos?.diagnostico ?? null);
  const tam = tamizajeDesdeApi(datos?.tamizaje ?? null);
  const lectura = diag
    ? evaluar(RSE_EXPRESS, diag, e.sector_id as SectorId, tam)
    : null;
  const prior = priorizacionDesdeApi(datos?.diagnostico ?? null);
  const ops = diag
    ? oportunidades(RSE_EXPRESS, diag, e.sector_id as SectorId, tam)
    : [];
  const puedeDescargar = Boolean(datos?.diagnostico && diag && tam);
  const enBorrador = datos?.diagnostico?.estado === "borrador";

  const descargar = () => {
    if (!datos) return;
    setErrorDescarga(null);
    try {
      if (!descargarInforme(datos))
        setErrorDescarga(
          "Esta empresa todavía no tiene respuestas para descargar.",
        );
    } catch {
      setErrorDescarga("No se pudo generar el PDF. Intente de nuevo.");
    }
  };

  const irAlDiagnostico = () => {
    const quieto =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    seccionDiagnostico.current?.scrollIntoView?.({
      behavior: quieto ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <>
      <button type="button" className="btn-volver" onClick={onVolver}>
        ← Volver a la lista
      </button>

      <div className="detalle">
        <header className="detalle-cabecera">
          <span className="avatar avatar--lg">{iniciales(e.razon_social)}</span>
          <div className="detalle-cabecera-texto">
            <h2>{e.razon_social}</h2>
            <p className="detalle-email">
              NIT {e.nit}-{e.dv}
            </p>
            <div className="panel-chips">
              <span className="chip-rol">
                {texto(e.sector_nombre ?? e.sector_id)}
              </span>
              <span className="chip-rol">{texto(e.municipio)}</span>
              {e.perfil_piloto !== null && (
                <span
                  className={
                    "chip-estado " +
                    (e.perfil_piloto
                      ? "chip-estado--activa"
                      : "chip-estado--inactiva")
                  }
                >
                  {e.perfil_piloto
                    ? "Perfil del piloto (10–50 personas)"
                    : "Fuera del perfil del piloto"}
                </span>
              )}
            </div>
          </div>
          <div className="detalle-acciones">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={irAlDiagnostico}
            >
              Ver autodiagnóstico
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={descargar}
              disabled={!puedeDescargar}
              title={
                puedeDescargar
                  ? undefined
                  : !datos && !error
                    ? "Cargando respuestas…"
                    : "Esta empresa todavía no tiene respuestas"
              }
            >
              {enBorrador ? "Descargar PDF (borrador)" : "Descargar PDF"}
            </button>
          </div>
        </header>

        {errorDescarga && (
          <div className="auth-error" role="alert">
            {errorDescarga}
          </div>
        )}

        <div className="detalle-tarjetas">
          <div className="tarjeta">
            <span>Tamaño</span>
            <strong>
              {sinTamizaje ? "—" : nombreTamano(e.tamano as Tamano)}
            </strong>
          </div>
          <div className="tarjeta">
            <span>Personas</span>
            <strong>{texto(e.personas)}</strong>
          </div>
          <div className="tarjeta">
            <span>Respuestas con etapa</span>
            <strong>
              {e.respuestas_con_etapa} / {TOTAL_PREGUNTAS}
            </strong>
          </div>
          <div className="tarjeta">
            <span>Prácticas registradas</span>
            <strong>{e.practicas_registradas}</strong>
          </div>
        </div>

        <section className="detalle-seccion">
          <h3>Identificación</h3>
          <div className="panel-datos">
            <Dato etiqueta="Razón social" valor={e.razon_social} />
            <Dato etiqueta="NIT" valor={`${e.nit}-${e.dv}`} />
            <Dato
              etiqueta="Sector"
              valor={texto(e.sector_nombre ?? e.sector_id)}
            />
            <Dato etiqueta="Municipio" valor={texto(e.municipio)} />
            <Dato etiqueta="Departamento" valor={texto(e.departamento)} />
            <Dato
              etiqueta="Fecha de registro"
              valor={formatearFecha(e.creado_en)}
            />
            <Dato etiqueta="Identificador interno" valor={e.empresa_id} />
          </div>
        </section>

        <section className="detalle-seccion">
          <h3>Tamizaje «Conozcamos su empresa»</h3>
          {sinTamizaje ? (
            <p className="detalle-vacio">
              Esta empresa todavía no responde el tamizaje nuevo. Si venía del
              instrumento anterior, se le pedirá al volver a entrar; sus datos
              de cuenta se conservaron.
            </p>
          ) : (
            <div className="panel-datos">
              <Dato
                etiqueta="T1 · Tamaño"
                valor={nombreTamano(e.tamano as Tamano)}
              />
              <Dato
                etiqueta="T1 · Ingresos anuales"
                valor={
                  e.ingresos_rango
                    ? nombreIngresos(e.ingresos_rango as RangoIngresos)
                    : "Sin indicar"
                }
              />
              <Dato etiqueta="T2 · Personas" valor={texto(e.personas)} />
              <Dato
                etiqueta="T2 · Vinculación"
                valor={nombresVinculacion(e.vinculacion)}
              />
              <Dato
                etiqueta="T2 · Detalle"
                valor={texto(e.vinculacion_detalle)}
              />
              <Dato
                etiqueta="T5a · Lugares"
                valor={resumenLugares(e.zonas, e.territorio)}
              />
              <Dato
                etiqueta="T5b · Comunidades y vecinos"
                valor={resumenVecinos(e.zonas, e.vecinos)}
              />
              <Dato
                etiqueta="T6 · Clientes"
                valor={
                  e.clientes ? nombreCliente(e.clientes as TipoCliente) : "—"
                }
              />
              <Dato etiqueta="T6 · Detalle" valor={texto(e.clientes_detalle)} />
            </div>
          )}
        </section>

        <section className="detalle-seccion" ref={seccionDiagnostico}>
          <h3>
            Autodiagnóstico RSE Express{" "}
            <ChipDiagnostico estado={e.diagnostico_estado} />
          </h3>
          {error && (
            <p className="detalle-vacio" role="alert">
              {error}
            </p>
          )}
          {!datos && !error && (
            <p className="detalle-vacio">Cargando respuestas…</p>
          )}
          {datos && !diag && (
            <p className="detalle-vacio">Todavía no hay respuestas.</p>
          )}
          {datos?.diagnostico && diag && lectura && (
            <>
              <p className="detalle-nota">
                Lectura interna 0–4 (uso de NEXUS; a la empresa no se le muestra
                como puntaje):{" "}
                {lectura.score === null
                  ? "sin datos"
                  : `${lectura.score.toFixed(2)} · ${clasificar(lectura.score).etiqueta}`}{" "}
                · cobertura {Math.round(lectura.cobertura * 100)}%
                {lectura.pendientes > 0 &&
                  ` · ${lectura.pendientes} por clasificar`}
              </p>
              {RSE_EXPRESS.materias.map((m) => {
                const nodo = lectura.materias.find((x) => x.id === m.id)!;
                return (
                  <details
                    key={m.id}
                    className="admin-materia"
                    open={m.preguntas.some(
                      (p) => diag.respuestas[p.id]?.etapa === "diferente",
                    )}
                  >
                    <summary>
                      <strong>
                        {m.numero} · {m.nombre}
                      </strong>
                      <span>
                        {!nodo.aplica
                          ? "No aplica (T6)"
                          : nodo.score === null
                            ? "sin datos"
                            : `${nodo.score.toFixed(2)} · ${clasificar(nodo.score).etiqueta}`}
                      </span>
                    </summary>
                    <ul className="lista-simple">
                      {m.preguntas.map((p) => {
                        const r = datos.diagnostico!.respuestas[p.id];
                        const etapa = etapaDesdeApi(r?.etapa);
                        return (
                          <li key={p.id}>
                            <strong>
                              {p.id} · {etiquetaEtapa(etapa)}
                            </strong>
                            <span className="admin-pregunta">{p.texto}</span>
                            {r?.texto && <span>{r.texto}</span>}
                            {r && r.ejemplos.length > 0 && (
                              <span className="evento-meta">
                                Ejemplos: {r.ejemplos.join(", ")}
                              </span>
                            )}
                            {r?.otro && (
                              <span className="evento-meta">
                                Algo diferente: {r.otro}
                              </span>
                            )}
                            {r && etapa === "diferente" && (
                              <label className="admin-clasificar">
                                Clasificación NEXUS:{" "}
                                <select
                                  value={r.clasificada ?? ""}
                                  disabled={guardando === p.id}
                                  onChange={(ev) =>
                                    clasificarRespuesta(
                                      r.respuesta_id,
                                      p.id,
                                      ev.target.value === ""
                                        ? null
                                        : Number(ev.target.value),
                                    )
                                  }
                                >
                                  <option value="">Sin clasificar</option>
                                  {ETAPAS.filter(
                                    (x) => typeof x.valor === "number",
                                  ).map((x) => (
                                    <option
                                      key={String(x.valor)}
                                      value={String(x.valor)}
                                    >
                                      {x.valor} · {x.corta}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {diag.fortalecer[m.numero] && (
                      <p className="detalle-nota">
                        <strong>Quiere fortalecer:</strong>{" "}
                        {diag.fortalecer[m.numero]}
                      </p>
                    )}
                  </details>
                );
              })}
              {diag.comentarioFinal && (
                <p className="detalle-nota">
                  <strong>Pregunta final:</strong> {diag.comentarioFinal}
                </p>
              )}
              <h3>Matriz de priorización</h3>
              {ops.length === 0 ? (
                <p className="detalle-vacio">
                  Sin oportunidades en etapa inicial.
                </p>
              ) : (
                <ul className="lista-simple">
                  {ops.map((o) => {
                    const c = calificacionDe(o, prior.filas[o.clave]);
                    return (
                      <li key={o.clave}>
                        <strong>
                          {prior.elegida === o.clave ? "★ " : ""}
                          {o.materia.numero} · {o.verbo}: {o.oportunidad}
                        </strong>
                        <span className="evento-meta">
                          Importancia {c.importancia ?? "—"} · Viabilidad{" "}
                          {c.viabilidad ?? "—"} · Potencial {c.potencial ?? "—"}{" "}
                          · Interés {c.interes ?? "—"} · Prioridad{" "}
                          {sumaPrioridad(c) ?? "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

export function EmpresasTab({ token }: { token: string }) {
  const [empresas, setEmpresas] = useState<EmpresaDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [generandoRegistro, setGenerandoRegistro] = useState(false);
  // Se guarda el id y no el objeto: al recargar la lista, la ficha abierta
  // muestra los datos nuevos y no una copia vieja.
  const [abiertaId, setAbiertaId] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    adminApi
      .listarEmpresasDetalle(token)
      .then(setEmpresas)
      .catch((e) =>
        setError(
          e instanceof AuthError ? e.message : "No se pudo cargar la lista.",
        ),
      )
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [token]);

  // Pide la lista otra vez para que el Excel salga con los datos del momento
  // (todas las empresas, sin el filtro del buscador).
  const descargarRegistroProspectos = async () => {
    setGenerandoRegistro(true);
    setErrorDescarga(null);
    try {
      const actuales = await adminApi.listarEmpresasDetalle(token);
      setEmpresas(actuales);
      const { descargarRegistro } =
        await import("../export/registroProspectos");
      await descargarRegistro(actuales);
    } catch (err) {
      setErrorDescarga(
        err instanceof AuthError
          ? err.message
          : "No se pudo generar el registro de prospectos. Intente de nuevo.",
      );
    } finally {
      setGenerandoRegistro(false);
    }
  };

  const descargarDesdeLista = async (e: EmpresaDetalle) => {
    setDescargandoId(e.empresa_id);
    setErrorDescarga(null);
    try {
      const datos = await adminApi.obtenerDiagnosticoEmpresa(
        token,
        e.empresa_id,
      );
      if (!descargarInforme(datos))
        setErrorDescarga(
          `${e.razon_social} todavía no tiene respuestas para descargar.`,
        );
    } catch (err) {
      setErrorDescarga(
        err instanceof AuthError
          ? err.message
          : `No se pudo descargar el PDF de ${e.razon_social}.`,
      );
    } finally {
      setDescargandoId(null);
    }
  };

  const filtro = busqueda.trim().toLowerCase();
  const visibles = useMemo(() => {
    if (!filtro) return empresas;
    return empresas.filter(
      (e) =>
        e.razon_social.toLowerCase().includes(filtro) ||
        e.nit.includes(filtro) ||
        e.municipio.toLowerCase().includes(filtro) ||
        (e.sector_nombre ?? "").toLowerCase().includes(filtro),
    );
  }, [empresas, filtro]);

  const abierta = empresas.find((e) => e.empresa_id === abiertaId) ?? null;

  if (error)
    return (
      <div className="auth-error" role="alert">
        {error}
      </div>
    );
  if (abierta)
    return (
      <FichaEmpresa
        e={abierta}
        token={token}
        onVolver={() => setAbiertaId(null)}
        onCambio={cargar}
      />
    );

  return (
    <div className="admin-tabla-wrap">
      <div className="tabla-barra">
        <input
          type="search"
          className="buscador"
          placeholder="Buscar por razón social, NIT, municipio o sector"
          value={busqueda}
          onChange={(ev) => setBusqueda(ev.target.value)}
        />
        <button type="button" className="btn-ghost btn-sm" onClick={cargar}>
          Actualizar
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={descargarRegistroProspectos}
          disabled={generandoRegistro || cargando || empresas.length === 0}
          title={
            empresas.length === 0 && !cargando
              ? "Todavía no hay empresas registradas"
              : "Excel del Entregable 3 con todas las empresas registradas"
          }
        >
          {generandoRegistro
            ? "Generando Excel…"
            : "Descargar registro de prospectos"}
        </button>
      </div>

      {errorDescarga && (
        <div className="auth-error tabla-aviso" role="alert">
          {errorDescarga}
        </div>
      )}

      {cargando ? (
        <p className="tabla-vacia">Cargando empresas…</p>
      ) : empresas.length === 0 ? (
        <p className="tabla-vacia">Todavía no hay empresas registradas.</p>
      ) : visibles.length === 0 ? (
        <p className="tabla-vacia">No hay empresas que coincidan.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Sector</th>
              <th>Municipio</th>
              <th>Autodiagnóstico</th>
              <th>Por clasificar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => (
              <tr key={e.empresa_id}>
                <td className="celda-empresa">
                  <div className="celda-usuario">
                    <span className="avatar">{iniciales(e.razon_social)}</span>
                    <div className="celda-usuario-texto">
                      <strong>{e.razon_social}</strong>
                      <span>
                        NIT {e.nit}-{e.dv}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="celda-truncada">
                  {texto(e.sector_nombre ?? e.sector_id)}
                </td>
                <td>{texto(e.municipio)}</td>
                <td>
                  <ChipDiagnostico
                    estado={e.anio === null ? null : e.diagnostico_estado}
                  />
                  {e.anio === null ? (
                    <span className="evento-meta"> Sin tamizaje</span>
                  ) : (
                    <span className="evento-meta">
                      {" "}
                      {e.respuestas_con_etapa}/{TOTAL_PREGUNTAS}
                    </span>
                  )}
                </td>
                <td>
                  {e.pendientes_clasificar > 0 ? (
                    <strong>{e.pendientes_clasificar}</strong>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="celda-accion">
                  {tieneRespuestas(e) && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={descargandoId !== null}
                      onClick={() => descargarDesdeLista(e)}
                      aria-label={`Descargar PDF del autodiagnóstico de ${e.razon_social}`}
                    >
                      {descargandoId === e.empresa_id
                        ? "Descargando…"
                        : "Descargar PDF"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setAbiertaId(e.empresa_id)}
                  >
                    Ver datos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
