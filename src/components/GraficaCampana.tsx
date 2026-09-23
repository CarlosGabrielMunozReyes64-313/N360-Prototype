import { useId } from 'react'
import type { Ref } from 'react'
import type { Seccion } from '../engine/agregados'
import { selloFecha } from '../engine/agregados'
import {
  APAGADO, DESVIACION_MIN_DIBUJO, EJE, ESTILOS_SERIE, FUENTE, MONO, NIVELES, TINTA, VERDE_OSCURO,
  anchoTexto, apilarPuntos, curvaNormal, densidadNormal, nivelDe, numero, partirTexto, rangoNivel,
} from '../engine/graficas'
import { describirResumen, gruposCampana, infoVista } from '../engine/vistasGraficas'

/**
 * Campana de Gauss de la madurez: una curva normal por formato, con la
 * media y la desviación (ponderadas por número de respuestas) de los
 * promedios de sus dimensiones. Debajo de cada curva están los datos
 * reales: un punto por dimensión, para que se vea en qué se apoya.
 *
 * Accesibilidad: cada formato se distingue por color, por trazo
 * (continuo / discontinuo) y por forma del punto (círculo / rombo), y sus
 * cifras van escritas en la leyenda. Los niveles se marcan con franjas
 * rotuladas, no solo coloreadas.
 */

const PAD_X = 20
const F_TEXTO = 13
const F_NOTA = 12
const RADIO_PUNTO = 6.5

interface Props {
  secciones: Seccion[]
  ancho: number
  conEncabezado?: boolean
  fecha?: string
  svgRef?: Ref<SVGSVGElement>
}

type Marcador = (typeof ESTILOS_SERIE)[number]['marcador']

function Punto({ x, y, forma, color, titulo }: { x: number; y: number; forma: Marcador; color: string; titulo: string }) {
  const r = RADIO_PUNTO
  const comun = { fill: color, stroke: '#ffffff', strokeWidth: 1.6 }
  return (
    <g>
      <title>{titulo}</title>
      {forma === 'circulo' && <circle cx={x} cy={y} r={r} {...comun} />}
      {forma === 'rombo' && (
        <path d={`M ${x} ${y - r - 1.5} L ${x + r + 1.5} ${y} L ${x} ${y + r + 1.5} L ${x - r - 1.5} ${y} Z`} {...comun} />
      )}
      {forma === 'cuadrado' && <rect x={x - r + 0.5} y={y - r + 0.5} width={2 * r - 1} height={2 * r - 1} rx={1.5} {...comun} />}
    </g>
  )
}

export function GraficaCampana({ secciones, ancho, conEncabezado = false, fecha = selloFecha(), svgRef }: Props) {
  const idTitulo = useId()
  const idDesc = useId()
  const W = Math.max(300, Math.round(ancho))
  const grupos = gruposCampana(secciones)
  const hayPuntos = grupos.some((g) => g.puntos.length > 0)
  const curvas = grupos.map((g, i) => ({ ...g, estilo: ESTILOS_SERIE[i % ESTILOS_SERIE.length] }))

  // ------------------------------------------------------- leyenda arriba
  let y = conEncabezado ? 78 : 12
  const anchoUtil = W - 2 * PAD_X
  const leyenda: { c: (typeof curvas)[number]; detalle: string[]; y: number; enUnaLinea: boolean }[] = []
  for (const c of curvas) {
    const texto = c.resumen ? describirResumen(c.resumen) : `${c.puntos.length} dimensión: hacen falta dos para la curva`
    const enUnaLinea = 52 + anchoTexto(`${c.nombre}   ${texto}`, F_TEXTO) <= anchoUtil
    const detalle = enUnaLinea ? [texto] : partirTexto(texto, anchoUtil - 50, F_TEXTO, 3)
    leyenda.push({ c, detalle, y: y + 16, enUnaLinea })
    y += enUnaLinea ? 26 : 26 + detalle.length * 18
  }

  // ---------------------------------------------------------- área de trazo
  const xIzq = PAD_X + 10
  const xDer = W - PAD_X - 10
  const xDe = (v: number) => xIzq + (Math.min(Math.max(v, 0), 4) / 4) * (xDer - xIzq)
  const yFranjas = y + 14
  const altoCurva = Math.round(Math.min(Math.max(W * 0.28, 180), 290))
  const base = yFranjas + 30 + altoCurva

  // Cada curva se dibuja a la misma altura: lo que se compara es dónde está
  // su centro y qué tan ancha es. Con la densidad real, un formato muy
  // concentrado sería tan alto que aplastaría al otro, y un lector podría
  // leer «más bajo» como «peor».
  const yDe = (d: number, pico: number) => base - (d / pico) * altoCurva * 0.88
  const picoDe = (media: number, desviacion: number) => densidadNormal(media, media, desviacion)

  // Puntos: se apilan hacia arriba desde la base cuando caen muy juntos.
  const pxPorUnidad = (xDer - xIzq) / 4
  const todos = curvas.flatMap((c) => c.puntos.map((p) => ({ p, c })))
  const niveles = apilarPuntos(todos.map((t) => t.p.valor), (RADIO_PUNTO * 2 + 2) / pxPorUnidad)

  // Franjas de nivel y si su nombre cabe dentro.
  const franjas = NIVELES.map((n) => {
    const x0 = xDe(n.desde)
    const x1 = xDe(n.hasta)
    return { n, x0, x1, cabe: anchoTexto(n.etiqueta, F_NOTA) + 10 <= x1 - x0 }
  })
  const faltanNombres = franjas.some((f) => !f.cabe)

  // Etiquetas de media: si dos quedan muy cerca, la segunda sube.
  const medias = curvas
    .filter((c) => c.resumen)
    .map((c) => ({ c, x: xDe(c.resumen!.media), yPico: base - altoCurva * 0.88 }))
  // Si dos quedan cerca, la de la izquierda se alinea a la izquierda de su
  // línea y la otra a la derecha, así no se montan.
  const ordenadas = [...medias].sort((a, b) => a.x - b.x)
  const etiquetasMedia = ordenadas.map((m, i) => {
    const antes = ordenadas[i - 1]
    const despues = ordenadas[i + 1]
    const cerca = (o?: { x: number }) => o !== undefined && Math.abs(o.x - m.x) < 100
    const ancla: 'start' | 'middle' | 'end' = cerca(despues) ? 'end' : cerca(antes) ? 'start' : 'middle'
    const x = ancla === 'end' ? m.x - 5 : ancla === 'start' ? m.x + 5 : m.x
    return { ...m, xTexto: x, ancla, yTexto: m.yPico - 10 }
  })

  let yPie = base + 48
  const nota = conEncabezado ? partirTexto(infoVista('campana').descripcion, anchoUtil, F_NOTA, 4) : []
  const nivelesTexto = faltanNombres
    ? partirTexto(NIVELES.map((n) => `${n.etiqueta} (${rangoNivel(n)})`).join(' · '), anchoUtil, F_NOTA - 1, 3)
    : []
  yPie += nivelesTexto.length * 16 + (nivelesTexto.length ? 6 : 0)
  const H = Math.round(yPie + (nota.length ? nota.length * 17 + 16 : 4))

  const descripcion = curvas
    .map((c) => `${c.nombre}: ${c.resumen ? describirResumen(c.resumen) : 'sin curva, faltan dimensiones'}`)
    .join('. ')

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`${idTitulo} ${idDesc}`}
      style={{ display: 'block', fontFamily: FUENTE }}
    >
      <title id={idTitulo}>Campana de distribución de la madurez por formato</title>
      <desc id={idDesc}>{hayPuntos ? descripcion : 'Sin respuestas registradas todavía.'}</desc>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      {conEncabezado && (
        <g>
          <text x={PAD_X} y={34} fontFamily={FUENTE} fontSize={21} fontWeight={700} fill={VERDE_OSCURO}>
            NEXUS 360° · Distribución de la madurez
          </text>
          <text x={PAD_X} y={56} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
            Generado el {fecha}
          </text>
        </g>
      )}

      {!hayPuntos && (
        <text x={PAD_X} y={(conEncabezado ? 78 : 12) + 30} fontFamily={FUENTE} fontSize={F_TEXTO} fill={APAGADO}>
          Todavía no hay respuestas registradas para dibujar la campana.
        </text>
      )}

      {hayPuntos && (
        <>
          {/* Leyenda: trazo + forma + nombre + cifras de cada formato. */}
          {leyenda.map(({ c, detalle, y: yl, enUnaLinea }) => (
            <g key={`ley-${c.nombre}`}>
              <line
                x1={PAD_X} x2={PAD_X + 36} y1={yl - 4.5} y2={yl - 4.5}
                stroke={c.estilo.color} strokeWidth={3} strokeDasharray={c.estilo.trazo}
              />
              <Punto x={PAD_X + 18} y={yl - 4.5} forma={c.estilo.marcador} color={c.estilo.color} titulo={c.nombre} />
              <text x={PAD_X + 50} y={yl} fontFamily={FUENTE} fontSize={F_TEXTO} fill={TINTA}>
                <tspan fontWeight={700}>{c.nombre}</tspan>
                {enUnaLinea
                  ? <tspan fill={APAGADO}>{`   ${detalle[0]}`}</tspan>
                  : detalle.map((l, i) => <tspan key={i} x={PAD_X + 50} dy={18} fill={APAGADO}>{l}</tspan>)}
              </text>
            </g>
          ))}

          {/* Franjas de nivel: tinte muy suave, borde superior de color y nombre. */}
          {franjas.map(({ n, x0, x1, cabe }) => (
            <g key={`f-${n.etiqueta}`}>
              <rect x={x0} y={yFranjas} width={x1 - x0} height={base - yFranjas} fill={n.color} fillOpacity={0.07} />
              <rect x={x0 + 1} y={yFranjas} width={x1 - x0 - 2} height={4} fill={n.color} />
              {cabe && (
                <text
                  x={(x0 + x1) / 2} y={yFranjas + 22} textAnchor="middle"
                  fontFamily={FUENTE} fontSize={F_NOTA} fontWeight={600} fill={TINTA}
                >
                  {n.etiqueta}
                </text>
              )}
            </g>
          ))}

          {/* Curvas: franja de ±1 desviación sombreada y la curva encima. */}
          {curvas.map((c) => {
            if (!c.resumen) return null
            const { media, desviacion } = c.resumen
            const puntos = curvaNormal(media, desviacion)
            const pico = picoDe(media, desviacion)
            const d = puntos.map(([vx, vy], i) => `${i ? 'L' : 'M'} ${xDe(vx).toFixed(1)} ${yDe(vy, pico).toFixed(1)}`).join(' ')
            const s = Math.max(desviacion, DESVIACION_MIN_DIBUJO)
            const dentro = puntos.filter(([vx]) => vx >= media - s && vx <= media + s)
            const area = dentro.length > 1
              ? `M ${xDe(dentro[0][0]).toFixed(1)} ${base} `
                + dentro.map(([vx, vy]) => `L ${xDe(vx).toFixed(1)} ${yDe(vy, pico).toFixed(1)}`).join(' ')
                + ` L ${xDe(dentro[dentro.length - 1][0]).toFixed(1)} ${base} Z`
              : ''
            return (
              <g key={`c-${c.nombre}`}>
                {area && <path d={area} fill={c.estilo.color} fillOpacity={0.13} />}
                <path d={d} fill="none" stroke={c.estilo.color} strokeWidth={3} strokeDasharray={c.estilo.trazo} strokeLinejoin="round" />
              </g>
            )
          })}

          {/* Media de cada curva: línea vertical y valor escrito. */}
          {etiquetasMedia.map(({ c, x, yPico, xTexto, ancla, yTexto }) => (
            <g key={`m-${c.nombre}`}>
              <line x1={x} x2={x} y1={base} y2={yPico} stroke={c.estilo.color} strokeWidth={1.5} strokeDasharray="3 3" />
              <text
                x={xTexto} y={yTexto} textAnchor={ancla} fontFamily={FUENTE} fontSize={F_NOTA} fontWeight={700} fill={TINTA}
                stroke="#ffffff" strokeWidth={4} paintOrder="stroke"
              >
                {`media ${numero(c.resumen!.media, 2)}`}
              </text>
            </g>
          ))}

          {/* Un punto por dimensión: los datos reales detrás de la curva. */}
          {todos.map(({ p, c }, i) => (
            <Punto
              key={p.clave}
              x={xDe(p.valor)}
              y={base - RADIO_PUNTO - 3 - niveles[i] * (RADIO_PUNTO * 2 + 1)}
              forma={c.estilo.marcador}
              color={c.estilo.color}
              titulo={`${p.etiqueta}: ${numero(p.valor, 2)} (${nivelDe(p.valor).etiqueta}) · ${numero(p.peso)} resp.`}
            />
          ))}

          {curvas.every((c) => !c.resumen) && (
            <text x={xIzq} y={yFranjas + 50} fontFamily={FUENTE} fontSize={F_TEXTO} fill={APAGADO}>
              Hace falta al menos dos dimensiones con respuestas en un formato para dibujar su curva.
            </text>
          )}

          {/* Eje 0–4. */}
          <line x1={xIzq} x2={xDer} y1={base} y2={base} stroke={EJE} strokeWidth={1.5} />
          {[0, 1, 2, 3, 4].map((m) => (
            <g key={`e-${m}`}>
              <line x1={xDe(m)} x2={xDe(m)} y1={base} y2={base + 5} stroke={EJE} strokeWidth={1.5} />
              <text x={xDe(m)} y={base + 20} textAnchor="middle" fontFamily={MONO} fontSize={F_NOTA} fill={APAGADO}>
                {m}
              </text>
            </g>
          ))}
          <text x={(xIzq + xDer) / 2} y={base + 40} textAnchor="middle" fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
            Promedio de madurez de cada dimensión (0 a 4)
          </text>
          {nivelesTexto.length > 0 && (
            <text x={PAD_X} y={base + 62} fontFamily={FUENTE} fontSize={F_NOTA - 1} fill={APAGADO}>
              {nivelesTexto.map((l, i) => <tspan key={i} x={PAD_X} dy={i === 0 ? 0 : 16}>{l}</tspan>)}
            </text>
          )}

          {nota.length > 0 && (
            <text x={PAD_X} y={yPie + 14} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
              {nota.map((l, i) => <tspan key={i} x={PAD_X} dy={i === 0 ? 0 : 17}>{l}</tspan>)}
            </text>
          )}
        </>
      )}
    </svg>
  )
}
