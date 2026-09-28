import { useId } from 'react'
import type { Ref } from 'react'
import type { Seccion } from '../engine/agregados'
import { ORDEN_ETAPA, colorEtapa, nombreEtapa, selloFecha } from '../engine/agregados'
import { APAGADO, FUENTE, MONO, REJILLA, TINTA, VERDE_OSCURO, anchoTexto, numero, partirTexto, textoSobre } from '../engine/graficas'
import { filasEtapas } from '../engine/vistasGraficas'
import type { FilaEtapas } from '../engine/vistasGraficas'

/**
 * «Etapas por materia»: una barra apilada al 100 % por materia con el
 * reparto de las respuestas según «¿En qué punto está?». Muestra de un
 * vistazo en qué materias el grupo está comenzando y en cuáles ya hay
 * prácticas con resultados: la base para proponer retos comunes.
 *
 * Accesibilidad: cada tramo lleva su porcentaje escrito si cabe, la
 * leyenda sigue el mismo orden que los tramos (de izquierda a derecha) y
 * cada tramo tiene un <title> con materia, etapa, cantidad y porcentaje.
 * Los bordes blancos separan tramos vecinos aunque sus colores se parezcan.
 */

const PAD_X = 20
const F_TEXTO = 13
const F_NOTA = 12
const ALTO_BARRA = 26
const MIN_ETIQUETA = 34

/** Posiciones de filas, tramos y leyenda. Función pura, fuera del componente. */
function maquetar(
  filas: FilaEtapas[], W: number, angosto: boolean, anchoRotulo: number,
  xBarra: number, anchoBarra: number, anchoTotal: number,
) {
  // En pantallas angostas el nombre de la materia va encima de la barra.
  let y = 8
  const maqueta = []
  for (const f of filas) {
    const lineas = partirTexto(f.materia, angosto ? W - 2 * PAD_X - anchoTotal : anchoRotulo - 14, F_TEXTO, 2)
    const altoRotulo = angosto ? lineas.length * 16 + 4 : 0
    const yFila = y
    const yBarra = yFila + altoRotulo
    y += Math.max(altoRotulo + ALTO_BARRA, angosto ? 0 : lineas.length * 16) + 14
    let x = xBarra
    const tramos = []
    for (const s of f.segmentos) {
      const w = f.total > 0 ? (anchoBarra * s.valor) / f.total : 0
      tramos.push({ ...s, x, w })
      x += w
    }
    maqueta.push({ ...f, lineas, yFila, yBarra, tramos })
  }

  // Leyenda: solo las etapas presentes, en el orden de la escala.
  const presentes = ORDEN_ETAPA.filter((e) => filas.some((f) => f.segmentos.some((s) => s.clave.endsWith(`-${e}`))))
  let xl = PAD_X
  let yl = y + 10
  const leyenda = []
  for (const e of presentes) {
    const texto = nombreEtapa(e)
    const w = 22 + anchoTexto(texto, F_NOTA) + 18
    if (xl + w > W - PAD_X && xl > PAD_X) { xl = PAD_X; yl += 22 }
    leyenda.push({ e, texto, x: xl, y: yl })
    xl += w
  }
  return { maqueta, leyenda, altoCuerpo: yl + 26 }
}

interface Props {
  secciones: Seccion[]
  ancho: number
  conEncabezado?: boolean
  fecha?: string
  svgRef?: Ref<SVGSVGElement>
}

export function GraficaEtapas({ secciones, ancho, conEncabezado = false, fecha = selloFecha(), svgRef }: Props) {
  const idTitulo = useId()
  const idDesc = useId()
  const W = Math.max(300, Math.round(ancho))
  const filas = filasEtapas(secciones)
  const angosto = W < 640
  const anchoRotulo = angosto ? 0 : Math.min(260, Math.round(W * 0.28))
  const anchoTotal = 64
  const xBarra = PAD_X + anchoRotulo
  const anchoBarra = W - xBarra - PAD_X - anchoTotal
  const arriba = conEncabezado ? 78 : 12

  const { maqueta, leyenda, altoCuerpo } = maquetar(filas, W, angosto, anchoRotulo, xBarra, anchoBarra, anchoTotal)
  const vacio = filas.length === 0
  const H = Math.round(arriba + (vacio ? 60 : altoCuerpo) + (conEncabezado ? 20 : 8))

  const resumen = filas
    .map((f) => `${f.materia}: ${f.segmentos.map((s) => `${s.etiqueta} ${s.porcentaje} %`).join(', ')} (${numero(f.total)} respuestas)`)
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
      <title id={idTitulo}>Etapas por materia</title>
      <desc id={idDesc}>{vacio ? 'Sin respuestas con etapa todavía.' : resumen}</desc>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      {conEncabezado && (
        <g>
          <text x={PAD_X} y={34} fontFamily={FUENTE} fontSize={21} fontWeight={700} fill={VERDE_OSCURO}>
            NEXUS 360° · Etapas por materia
          </text>
          <text x={PAD_X} y={56} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
            Generado el {fecha}
          </text>
        </g>
      )}

      <g transform={`translate(0 ${arriba})`}>
        {vacio ? (
          <text x={PAD_X} y={30} fontFamily={FUENTE} fontSize={F_TEXTO} fill={APAGADO}>
            Todavía no hay respuestas con etapa para repartir por materia.
          </text>
        ) : (
          <>
            {maqueta.map((f) => (
              <g key={f.materia}>
                <text
                  x={PAD_X} y={angosto ? f.yFila + 13 : f.yBarra + ALTO_BARRA / 2 + (f.lineas.length > 1 ? -2 : 5)}
                  fontFamily={FUENTE} fontSize={F_TEXTO} fill={TINTA}
                >
                  {f.lineas.map((l, i) => (
                    <tspan key={i} x={PAD_X} dy={i === 0 ? 0 : 16}>{l}</tspan>
                  ))}
                </text>
                <rect x={xBarra} y={f.yBarra} width={anchoBarra} height={ALTO_BARRA} fill={REJILLA} rx={3} />
                {f.tramos.map((t) => (
                  <g key={t.clave}>
                    <rect x={t.x} y={f.yBarra} width={Math.max(t.w, 0)} height={ALTO_BARRA}
                      fill={t.color} stroke="#ffffff" strokeWidth={1.5}>
                      <title>{`${f.materia} · ${t.etiqueta}: ${numero(t.valor)} (${t.porcentaje} %)`}</title>
                    </rect>
                    {t.w >= MIN_ETIQUETA && (
                      <text x={t.x + t.w / 2} y={f.yBarra + ALTO_BARRA / 2 + 4.5} textAnchor="middle"
                        fontFamily={FUENTE} fontSize={F_NOTA} fontWeight={700} fill={textoSobre(t.color)}>
                        {`${t.porcentaje} %`}
                      </text>
                    )}
                  </g>
                ))}
                <text x={W - PAD_X} y={f.yBarra + ALTO_BARRA / 2 + 4.5} textAnchor="end"
                  fontFamily={MONO} fontSize={F_NOTA} fill={APAGADO}>
                  {`${numero(f.total)} resp.`}
                </text>
              </g>
            ))}

            {leyenda.map((l) => (
              <g key={l.e}>
                <rect x={l.x} y={l.y - 11} width={14} height={14} rx={3} fill={colorEtapa(l.e)}
                  stroke={l.e === 'NA' ? '#8fa39a' : 'none'} />
                <text x={l.x + 20} y={l.y} fontFamily={FUENTE} fontSize={F_NOTA} fill={TINTA}>{l.texto}</text>
              </g>
            ))}
          </>
        )}
      </g>
    </svg>
  )
}
