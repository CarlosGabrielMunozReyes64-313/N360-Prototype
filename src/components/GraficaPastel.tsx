import { useId } from 'react'
import type { Ref } from 'react'
import type { Seccion } from '../engine/agregados'
import { selloFecha } from '../engine/agregados'
import {
  APAGADO, FUENTE, MONO, TINTA, VERDE_OSCURO,
  caminoRebanada, numero, partirTexto, puntoPolar, rebanadas, textoSobre,
} from '../engine/graficas'
import type { Rebanada } from '../engine/graficas'
import { seccionesPastel } from '../engine/vistasGraficas'

/**
 * Gráficas de pastel: una por cada reparto de un total (empresas por
 * sector, por tamaño y diagnósticos por estado). El resumen general y la
 * madurez no van aquí porque no son partes de un todo: un pastel de
 * «empresas + usuarios + diagnósticos» no significaría nada.
 *
 * Accesibilidad: cada rebanada lleva su porcentaje escrito encima (si
 * cabe) y la leyenda repite nombre, cantidad y porcentaje en el mismo
 * orden en que se recorre el pastel, desde las 12 en punto. Los bordes
 * blancos separan rebanadas vecinas aunque sus colores se parezcan.
 */

const PAD_X = 20
const SEP = 36
const F_TITULO = 15
const F_TEXTO = 13
const F_NOTA = 12
const INTERLINEA = 17

interface Props {
  secciones: Seccion[]
  ancho: number
  conEncabezado?: boolean
  fecha?: string
  svgRef?: Ref<SVGSVGElement>
}

interface PanelPastel {
  seccion: Seccion
  total: number
  rebanadas: Rebanada[]
  x: number
  y: number
  ancho: number
  radio: number
  yLeyenda: number
  filas: { r: Rebanada; lineas: string[]; y: number }[]
  alto: number
}

function maquetar(secciones: Seccion[], ancho: number) {
  const lista = seccionesPastel(secciones)
  const columnas = Math.max(1, Math.min(lista.length, ancho >= 820 ? 3 : ancho >= 560 ? 2 : 1))
  const anchoPanel = (ancho - 2 * PAD_X - (columnas - 1) * SEP) / columnas
  const radio = Math.round(Math.min(Math.max(anchoPanel * 0.3, 72), 108))

  const paneles: PanelPastel[] = lista.map((seccion, i) => {
    const rs = rebanadas(seccion.barras.map((b) => ({ clave: b.clave, etiqueta: b.etiquetaLarga, valor: b.valor })))
    const yLeyenda = 60 + radio * 2 + 26
    const anchoEtiqueta = anchoPanel - 22 - 96
    let cursor = yLeyenda
    const filas = rs.map((r) => {
      const lineas = partirTexto(r.etiqueta, anchoEtiqueta, F_TEXTO, 2)
      const fila = { r, lineas, y: cursor }
      cursor += Math.max(lineas.length, 1) * INTERLINEA + 10
      return fila
    })
    return {
      seccion,
      total: seccion.barras.reduce((t, b) => t + b.valor, 0),
      rebanadas: rs,
      x: PAD_X + (i % columnas) * (anchoPanel + SEP),
      y: 0,
      ancho: anchoPanel,
      radio,
      yLeyenda,
      filas,
      alto: cursor + 6,
    }
  })

  // Filas de la cuadrícula: cada una tan alta como su panel más alto.
  let y = 0
  for (let i = 0; i < paneles.length; i += columnas) {
    const fila = paneles.slice(i, i + columnas)
    const alto = Math.max(...fila.map((p) => p.alto))
    for (const p of fila) p.y = y
    y += alto + SEP
  }
  return { paneles, alto: Math.max(0, y - SEP) }
}

function Pastel({ p }: { p: PanelPastel }) {
  const cx = p.ancho / 2
  const cy = 60 + p.radio
  const unica = p.rebanadas.length === 1

  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <text x={0} y={18} fontFamily={FUENTE} fontSize={F_TITULO} fontWeight={700} fill={VERDE_OSCURO}>
        {p.seccion.titulo}
      </text>
      <text x={0} y={38} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
        {`Total: ${numero(p.total)} ${p.seccion.unidad}`}
      </text>

      {unica ? (
        <circle cx={cx} cy={cy} r={p.radio} fill={p.rebanadas[0].color} stroke="#ffffff" strokeWidth={2.5}>
          <title>{`${p.rebanadas[0].etiqueta}: ${numero(p.rebanadas[0].valor)} (100 %)`}</title>
        </circle>
      ) : (
        p.rebanadas.map((r) => (
          <path
            key={r.clave}
            d={caminoRebanada(cx, cy, p.radio, r.inicio, r.fin)}
            fill={r.color} stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round"
          >
            <title>{`${r.etiqueta}: ${numero(r.valor)} (${r.porcentaje} %)`}</title>
          </path>
        ))
      )}

      {/* Porcentaje encima de cada rebanada que tenga espacio para él. */}
      {p.rebanadas.map((r) => {
        if (!unica && r.fraccion < 0.08) return null
        const [tx, ty] = unica ? [cx, cy] : puntoPolar(cx, cy, p.radio * 0.64, (r.inicio + r.fin) / 2)
        return (
          <text
            key={`p-${r.clave}`}
            x={tx} y={ty + 5} textAnchor="middle"
            fontFamily={FUENTE} fontSize={14} fontWeight={700} fill={textoSobre(r.color)}
          >
            {`${r.porcentaje} %`}
          </text>
        )
      })}

      {p.filas.map(({ r, lineas, y }) => (
        <g key={`l-${r.clave}`}>
          <rect x={0} y={y - 12} width={14} height={14} rx={3} fill={r.color} />
          <text x={22} y={y} fontFamily={FUENTE} fontSize={F_TEXTO} fill={TINTA}>
            {lineas.map((l, i) => (
              <tspan key={i} x={22} dy={i === 0 ? 0 : INTERLINEA}>{l}</tspan>
            ))}
          </text>
          <text x={p.ancho} y={y} textAnchor="end" fontFamily={MONO} fontSize={F_TEXTO} fill={TINTA}>
            <tspan fontWeight={700}>{numero(r.valor)}</tspan>
            <tspan fill={APAGADO}>{` · ${r.porcentaje} %`}</tspan>
          </text>
        </g>
      ))}
    </g>
  )
}

export function GraficaPastel({ secciones, ancho, conEncabezado = false, fecha = selloFecha(), svgRef }: Props) {
  const idTitulo = useId()
  const idDesc = useId()
  const W = Math.max(300, Math.round(ancho))
  const { paneles, alto } = maquetar(secciones, W)
  const arriba = conEncabezado ? 78 : 12
  const vacio = paneles.length === 0
  const H = Math.round(arriba + (vacio ? 60 : alto) + (conEncabezado ? 20 : 8))

  const resumen = paneles
    .map((p) => `${p.seccion.titulo}: ${p.rebanadas.map((r) => `${r.etiqueta} ${r.porcentaje} %`).join(', ')}`)
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
      <title id={idTitulo}>Repartos en gráficas de pastel</title>
      <desc id={idDesc}>{vacio ? 'Sin datos todavía.' : resumen}</desc>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      {conEncabezado && (
        <g>
          <text x={PAD_X} y={34} fontFamily={FUENTE} fontSize={21} fontWeight={700} fill={VERDE_OSCURO}>
            NEXUS 360° · Repartos
          </text>
          <text x={PAD_X} y={56} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
            Generado el {fecha}
          </text>
        </g>
      )}

      <g transform={`translate(0 ${arriba})`}>
        {vacio ? (
          <text x={PAD_X} y={30} fontFamily={FUENTE} fontSize={F_TEXTO} fill={APAGADO}>
            Todavía no hay empresas ni diagnósticos para repartir.
          </text>
        ) : (
          paneles.map((p) => <Pastel key={p.seccion.id} p={p} />)
        )}
      </g>
    </svg>
  )
}
