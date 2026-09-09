import type { Ref } from 'react'
import type { Seccion } from '../engine/agregados'
import { maximoConteo, selloFecha, ticksBonitos } from '../engine/agregados'

/**
 * Una sola gráfica de barras con todo el tablero. Está hecha a mano en
 * SVG, no con una librería de gráficas, por dos razones concretas:
 *
 *  1. Mezcla dos escalas incompatibles (conteos y madurez 0–4) en bandas
 *     con ejes separados; ninguna librería de uso general hace eso sin
 *     pelearse con ella.
 *  2. El SVG resultante no depende de CSS externo ni de fuentes web, así
 *     que se serializa a PNG tal cual y entra idéntico en el Excel y en
 *     el Word. Con un canvas o un DOM de librería habría que rasterizar
 *     la página entera y el resultado sería borroso.
 */

const ANCHO_BARRA = 40
const SEP_BARRA = 16
const SEP_SECCION = 54
const ALTO_TRAMA = 380
const M = { top: 142, right: 84, bottom: 136, left: 78 }
/** Ancho mínimo de una banda, para que su título no invada la vecina. */
const ANCHO_MIN_BANDA = 168

const TINTA = '#1a2e24'
const APAGADO = '#5a7068'
const LINEA = '#dde7e2'
const VERDE_OSCURO = '#024029'
const VERDE_MEDIO = '#04a97a'

const FUENTE = 'Inter, Helvetica, Arial, sans-serif'
const MONO = '"IBM Plex Mono", "Courier New", monospace'

/** Mismos cortes que `clasificar` en data/escala.ts. */
const COLORES_NIVEL = ['#a8322a', '#d99521', '#025873', '#04a97a']

function formatear(valor: number, escala: 'conteo' | 'madurez'): string {
  if (escala === 'madurez') return valor.toFixed(2).replace('.', ',')
  return String(valor)
}

interface Props {
  secciones: Seccion[]
  /** Se necesita para serializar la gráfica al exportar. */
  svgRef?: Ref<SVGSVGElement>
  /** Se imprime dentro de la gráfica para que el PNG sea autoexplicativo. */
  fecha?: string
}

export function GraficaGeneral({ secciones, svgRef, fecha = selloFecha() }: Props) {
  // Ancho de cada banda y su posición, en el orden en que llegan.
  const anchoBarras = (s: Seccion) =>
    s.barras.length * ANCHO_BARRA + Math.max(0, s.barras.length - 1) * SEP_BARRA

  const bandas = secciones.map((s) => {
    const barras = anchoBarras(s)
    return { seccion: s, barras, ancho: Math.max(barras, ANCHO_MIN_BANDA) }
  })
  const anchoContenido =
    bandas.reduce((t, b) => t + b.ancho, 0) + Math.max(0, bandas.length - 1) * SEP_SECCION

  const W = M.left + anchoContenido + M.right
  const H = M.top + ALTO_TRAMA + M.bottom
  const base = M.top + ALTO_TRAMA

  const marcasConteo = ticksBonitos(maximoConteo(secciones))
  const topeConteo = marcasConteo[marcasConteo.length - 1]
  const yConteo = (v: number) => base - (v / topeConteo) * ALTO_TRAMA
  const yMadurez = (v: number) => base - (Math.min(4, Math.max(0, v)) / 4) * ALTO_TRAMA

  // Posición acumulada de cada banda, sin mutar nada durante el render.
  const colocadas = bandas.map((b, i) => ({
    ...b,
    x: M.left + bandas.slice(0, i).reduce((t, p) => t + p.ancho + SEP_SECCION, 0),
  }))

  const bandaMadurez = colocadas.find((b) => b.seccion.escala === 'madurez')
  const finConteo = bandaMadurez
    ? bandaMadurez.x - SEP_SECCION / 2
    : M.left + anchoContenido

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Gráfica general de estadísticas de NEXUS 360°"
      style={{ display: 'block', maxWidth: '100%', height: 'auto', fontFamily: FUENTE }}
    >
      <title>Estadísticas generales de NEXUS 360°</title>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      {/* ---------------------------------------------------- encabezado */}
      <text x={M.left} y={38} fontFamily={FUENTE} fontSize={20} fontWeight={700} fill={VERDE_OSCURO}>
        NEXUS 360° · Estadísticas generales
      </text>
      <text x={M.left} y={58} fontFamily={MONO} fontSize={11} fill={APAGADO}>
        Generado el {fecha}
      </text>
      <g>
        <rect x={M.left} y={72} width={11} height={11} rx={2} fill={VERDE_MEDIO} />
        <text x={M.left + 17} y={81} fontFamily={FUENTE} fontSize={11} fill={APAGADO}>
          Conteos — eje izquierdo
        </text>
        {COLORES_NIVEL.map((c, i) => (
          <rect key={c} x={M.left + 186 + i * 14} y={72} width={11} height={11} rx={2} fill={c} />
        ))}
        <text x={M.left + 186 + COLORES_NIVEL.length * 14 + 6} y={81} fontFamily={FUENTE} fontSize={11} fill={APAGADO}>
          Madurez 0–4 — eje derecho; el color indica el nivel alcanzado
        </text>
      </g>

      {/* -------------------------------------------- rejilla de conteos */}
      {marcasConteo.map((v) => (
        <g key={`tc-${v}`}>
          <line
            x1={M.left - 10} y1={yConteo(v)} x2={finConteo} y2={yConteo(v)}
            stroke={v === 0 ? '#c3d4cc' : LINEA} strokeWidth={v === 0 ? 1.4 : 1}
          />
          <text
            x={M.left - 16} y={yConteo(v) + 4} textAnchor="end"
            fontFamily={MONO} fontSize={11} fill={APAGADO}
          >
            {v}
          </text>
        </g>
      ))}

      {/* ------------------------------- banda y eje propios de la madurez */}
      {bandaMadurez && (
        <g>
          <rect
            x={bandaMadurez.x - SEP_SECCION / 2 + 8} y={M.top - 16}
            width={bandaMadurez.ancho + SEP_SECCION - 16} height={ALTO_TRAMA + 16}
            fill="#e8f5ef" fillOpacity={0.5} rx={8}
          />
          {[0, 1, 2, 3, 4].map((v) => (
            <g key={`tm-${v}`}>
              <line
                x1={bandaMadurez.x - 12} y1={yMadurez(v)}
                x2={bandaMadurez.x + bandaMadurez.ancho + 14} y2={yMadurez(v)}
                stroke={v === 0 ? '#c3d4cc' : '#cfe4da'} strokeWidth={v === 0 ? 1.4 : 1}
                strokeDasharray={v === 0 ? undefined : '3 3'}
              />
              <text
                x={bandaMadurez.x + bandaMadurez.ancho + 20} y={yMadurez(v) + 4}
                fontFamily={MONO} fontSize={11} fill={APAGADO}
              >
                {v}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* -------------------------------------- títulos de sección y barras */}
      {colocadas.map(({ seccion, ancho, barras: anchoDeBarras, x }) => {
        const centro = x + ancho / 2
        const x0 = x + (ancho - anchoDeBarras) / 2
        return (
          <g key={seccion.id}>
            <text
              x={centro} y={M.top - 48} textAnchor="middle"
              fontFamily={FUENTE} fontSize={12.5} fontWeight={600} fill={VERDE_OSCURO}
            >
              {seccion.titulo}
            </text>
            <text
              x={centro} y={M.top - 33} textAnchor="middle"
              fontFamily={MONO} fontSize={10} fill={APAGADO}
            >
              {seccion.unidad}
            </text>
            <line
              x1={centro - Math.min(ancho, 150) / 2} y1={M.top - 22}
              x2={centro + Math.min(ancho, 150) / 2} y2={M.top - 22}
              stroke={seccion.color} strokeWidth={2} strokeLinecap="round"
            />

            {seccion.barras.map((b, i) => {
              const bx = x0 + i * (ANCHO_BARRA + SEP_BARRA)
              const y = seccion.escala === 'madurez' ? yMadurez(b.valor) : yConteo(b.valor)
              const alto = Math.max(b.valor > 0 ? 3 : 2, base - y)
              const cx = bx + ANCHO_BARRA / 2
              return (
                <g key={b.clave}>
                  <rect
                    x={bx} y={base - alto} width={ANCHO_BARRA} height={alto}
                    rx={4} fill={b.valor > 0 || seccion.escala === 'madurez' ? b.color : '#dfe8e4'}
                  >
                    <title>{`${b.etiquetaLarga}: ${formatear(b.valor, seccion.escala)}${b.nota ? ` (${b.nota})` : ''}`}</title>
                  </rect>
                  <text
                    x={cx} y={base - alto - 8} textAnchor="middle"
                    fontFamily={MONO} fontSize={11} fontWeight={500} fill={TINTA}
                  >
                    {formatear(b.valor, seccion.escala)}
                  </text>
                  {b.nota && (
                    <text
                      x={cx} y={base - alto - 21} textAnchor="middle"
                      fontFamily={MONO} fontSize={9} fill={APAGADO}
                    >
                      {b.nota}
                    </text>
                  )}
                  <text
                    x={cx} y={base + 14} textAnchor="end"
                    transform={`rotate(-38 ${cx} ${base + 14})`}
                    fontFamily={FUENTE} fontSize={11} fill={APAGADO}
                  >
                    {b.etiqueta}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}

      {/* ------------------------------------------------------ pie de eje */}
      <line
        x1={M.left - 10} y1={base} x2={M.left + anchoContenido + 14} y2={base}
        stroke="#c3d4cc" strokeWidth={1.4}
      />
      <text
        x={M.left} y={H - 16} fontFamily={FUENTE} fontSize={10} fill={APAGADO}
      >
        Los conteos y la madurez usan escalas distintas y no son comparables entre sí; cada banda se lee contra el eje de su lado.
      </text>
    </svg>
  )
}
