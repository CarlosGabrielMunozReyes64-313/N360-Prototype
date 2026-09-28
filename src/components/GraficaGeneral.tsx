import { useId } from 'react'
import type { Ref } from 'react'
import type { Barra, Seccion } from '../engine/agregados'
import { maximoConteo, selloFecha, ticksBonitos } from '../engine/agregados'
import {
  APAGADO, EJE, FUENTE, MONO, NIVELES, REJILLA, TINTA, VERDE_OSCURO,
  anchoTexto, nivelDe, numero, partirTexto, rangoNivel,
} from '../engine/graficas'

/**
 * Gráfica general en barras HORIZONTALES, hecha a mano en SVG (sin
 * librería de gráficas: el mismo SVG se rasteriza para el PDF, el Excel y
 * el Word, y así los archivos muestran exactamente lo de la pantalla).
 *
 * Por qué horizontales: los nombres (sectores, dimensiones) se leen
 * completos y derechos a la izquierda de cada barra, en vez de cortados
 * y en diagonal debajo.
 *
 * Los conteos y la madurez (0–4) van en paneles separados, cada uno con su
 * propio eje: son escalas que no se pueden comparar. En pantallas anchas
 * quedan lado a lado; en angostas, uno debajo del otro.
 *
 * El ancho llega por props (lo mide quien la contiene), así el texto
 * siempre se dibuja a su tamaño real y no se encoge al escalar el SVG.
 */

const PAD_X = 20
const SEP_COLUMNAS = 44
const SEP_PANELES = 36
const ANCHO_DOS_COLUMNAS = 900

const F_PANEL = 16
const F_SECCION = 14
const F_ETIQUETA = 13
const F_VALOR = 13
const F_NOTA = 12
const INTERLINEA = 17
const GRUESO_BARRA = 18

interface Props {
  secciones: Seccion[]
  /** Ancho disponible en px. */
  ancho: number
  /** Título y fecha dentro del SVG: para las imágenes de Excel y Word,
   * que deben explicarse solas. En pantalla y en el PDF van por fuera. */
  conEncabezado?: boolean
  fecha?: string
  svgRef?: Ref<SVGSVGElement>
}

// ------------------------------------------------------------ maquetación

interface Fila {
  tipo: 'fila'
  y: number
  alto: number
  barra: Barra
  lineas: string[]
}
interface Titulo {
  tipo: 'titulo'
  y: number
  texto: string
  detalle: string
}
type Elemento = Fila | Titulo
type Nivel = (typeof NIVELES)[number]

interface Panel {
  id: 'conteo' | 'madurez'
  titulo: string
  subtitulo: string
  x: number
  y: number
  ancho: number
  alto: number
  elementos: Elemento[]
  yEje: number
  apilado: boolean
  xBarra: number
  anchoBarra: number
  marcas: number[]
  tope: number
  leyenda: { x: number; y: number; nivel: Nivel }[]
}

/** En madurez el formato ya va en el título del grupo: no se repite. */
function etiquetaVisible(b: Barra): string {
  const larga = b.etiquetaLarga
  return b.grupo && larga.startsWith(`${b.grupo} · `) ? larga.slice(b.grupo.length + 3) : larga
}

function agrupar(barras: Barra[]) {
  const grupos: { titulo: string; detalle: string; barras: Barra[] }[] = []
  for (const b of barras) {
    const titulo = b.grupo ?? ''
    let g = grupos.find((x) => x.titulo === titulo)
    if (!g) {
      g = { titulo, detalle: '', barras: [] }
      grupos.push(g)
    }
    g.barras.push(b)
  }
  for (const g of grupos) g.detalle = `${g.barras.length} ${g.barras.length === 1 ? 'materia' : 'materias'}`
  return grupos
}

function maquetarPanel(
  id: Panel['id'], secciones: Seccion[], x: number, y: number, ancho: number, marcasConteo: number[],
): Panel {
  const madurez = id === 'madurez'
  // Angosto: el nombre va encima de la barra, a todo lo ancho.
  const apilado = ancho < 480
  const reserva = madurez ? 132 : 52
  const colEtiqueta = apilado ? ancho : Math.min(Math.round(ancho * 0.4), 280)
  const xBarra = apilado ? 0 : colEtiqueta + 14
  const anchoBarra = Math.max(60, ancho - xBarra - reserva)

  const titulo = madurez ? 'Etapa promedio por materia (lectura interna)' : 'Conteos'
  const subtitulo = madurez
    ? 'Escala de 0 a 4. El color y la palabra al final de cada barra indican el nivel.'
    : 'Cuántos registros hay en cada categoría.'

  let cursor = 44
  const leyenda: Panel['leyenda'] = []
  if (madurez) {
    cursor += 16
    let lx = 0
    for (const nivel of NIVELES) {
      const w = 20 + anchoTexto(`${nivel.etiqueta} (${rangoNivel(nivel)})`, F_NOTA) + 18
      if (lx > 0 && lx + w > ancho) {
        lx = 0
        cursor += 22
      }
      leyenda.push({ x: lx, y: cursor, nivel })
      lx += w
    }
    cursor += 14
  }
  cursor += 6

  const bloques = madurez
    ? agrupar(secciones.flatMap((s) => s.barras))
    : secciones.map((s) => ({ titulo: s.titulo, detalle: s.unidad, barras: s.barras }))

  const elementos: Elemento[] = []
  for (const bloque of bloques) {
    if (bloque.titulo) {
      elementos.push({ tipo: 'titulo', y: cursor, texto: bloque.titulo, detalle: bloque.detalle })
      cursor += 32
    }
    for (const barra of bloque.barras) {
      const lineas = partirTexto(etiquetaVisible(barra), colEtiqueta, F_ETIQUETA, apilado ? 3 : 2)
      const alto = apilado
        ? lineas.length * INTERLINEA + 8 + GRUESO_BARRA + (madurez ? 28 : 14)
        : Math.max(lineas.length * INTERLINEA + 14, madurez ? 46 : 34)
      elementos.push({ tipo: 'fila', y: cursor, alto, barra, lineas })
      cursor += alto
    }
    cursor += 12
  }

  const marcas = madurez ? [0, 1, 2, 3, 4] : marcasConteo
  return {
    id, titulo, subtitulo, x, y, ancho,
    alto: cursor + 44,
    elementos, yEje: cursor, apilado, xBarra, anchoBarra,
    marcas, tope: marcas[marcas.length - 1] || 1, leyenda,
  }
}

/** Posición de cada panel y alto total, para un ancho dado. */
function maquetarBarras(secciones: Seccion[], ancho: number) {
  const conteo = secciones.filter((s) => s.escala === 'conteo' && s.barras.length > 0)
  const madurez = secciones.filter((s) => s.escala === 'madurez' && s.barras.length > 0)
  const ids: Panel['id'][] = []
  if (conteo.length) ids.push('conteo')
  if (madurez.length) ids.push('madurez')

  const dosColumnas = ids.length === 2 && ancho >= ANCHO_DOS_COLUMNAS
  const anchoPanel = dosColumnas ? (ancho - 2 * PAD_X - SEP_COLUMNAS) / 2 : ancho - 2 * PAD_X
  const marcasConteo = ticksBonitos(maximoConteo(conteo))

  const paneles: Panel[] = []
  let y = 0
  ids.forEach((id, i) => {
    const x = dosColumnas ? PAD_X + i * (anchoPanel + SEP_COLUMNAS) : PAD_X
    const p = maquetarPanel(id, id === 'conteo' ? conteo : madurez, x, dosColumnas ? 0 : y, anchoPanel, marcasConteo)
    paneles.push(p)
    y += p.alto + SEP_PANELES
  })
  const alto = dosColumnas
    ? Math.max(...paneles.map((p) => p.alto))
    : paneles.reduce((t, p) => t + p.alto, 0) + SEP_PANELES * Math.max(0, paneles.length - 1)
  return { paneles, alto, dosColumnas }
}

// ------------------------------------------------------------------ dibujo

function valorTexto(b: Barra, madurez: boolean): string {
  return madurez ? numero(b.valor, 2) : numero(b.valor)
}

function DibujoPanel({ p }: { p: Panel }) {
  const madurez = p.id === 'madurez'
  const xEscala = (v: number) => p.xBarra + (Math.min(Math.max(v, 0), p.tope) / p.tope) * p.anchoBarra
  const primeraFila = p.elementos.find((e) => e.tipo === 'fila')
  const yInicio = primeraFila ? primeraFila.y : p.yEje

  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <text x={0} y={18} fontFamily={FUENTE} fontSize={F_PANEL} fontWeight={700} fill={VERDE_OSCURO}>
        {p.titulo}
      </text>
      <text x={0} y={38} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>{p.subtitulo}</text>

      {p.leyenda.map(({ x, y, nivel }) => (
        <g key={nivel.etiqueta}>
          <rect x={x} y={y - 11} width={14} height={14} rx={3} fill={nivel.color} />
          <text x={x + 20} y={y} fontFamily={FUENTE} fontSize={F_NOTA} fill={TINTA}>
            <tspan fontWeight={600}>{nivel.etiqueta}</tspan>
            <tspan fill={APAGADO}>{` (${rangoNivel(nivel)})`}</tspan>
          </text>
        </g>
      ))}

      {/* Rejilla vertical, detrás de las barras. */}
      {p.marcas.map((m) => (
        <line
          key={`r-${m}`}
          x1={xEscala(m)} x2={xEscala(m)} y1={yInicio - 4} y2={p.yEje}
          stroke={m === 0 ? EJE : REJILLA} strokeWidth={m === 0 ? 1.5 : 1}
          strokeDasharray={m === 0 ? undefined : '4 4'}
        />
      ))}

      {p.elementos.map((e) => {
        if (e.tipo === 'titulo') {
          return (
            <g key={`t-${e.texto}`}>
              {/* Fondo blanco: la rejilla no atraviesa el título. */}
              <rect x={0} y={e.y + 2} width={p.ancho} height={26} fill="#ffffff" />
              <text x={0} y={e.y + 21} fontFamily={FUENTE} fontSize={F_SECCION} fontWeight={700} fill={TINTA}>
                {e.texto}
                {e.detalle && (
                  <tspan fontWeight={400} fontSize={F_NOTA} fill={APAGADO}>{`  ·  ${e.detalle}`}</tspan>
                )}
              </text>
            </g>
          )
        }

        const b = e.barra
        const centro = p.apilado
          ? e.y + e.lineas.length * INTERLINEA + 6 + GRUESO_BARRA / 2
          : e.y + e.alto / 2
        const largo = Math.max(b.valor > 0 ? 3 : 0, xEscala(b.valor) - p.xBarra)
        const nivel = madurez ? nivelDe(b.valor) : null
        const color = nivel ? nivel.color : b.color
        const xTexto = p.xBarra + largo + 8
        const primeraLinea = p.apilado
          ? e.y + INTERLINEA - 3
          : centro - ((e.lineas.length - 1) * INTERLINEA) / 2 + 4.5
        const descripcion = `${b.etiquetaLarga}: ${valorTexto(b, madurez)}`
          + `${nivel ? ` (${nivel.etiqueta})` : ''}${b.nota ? ` · ${b.nota}` : ''}`

        return (
          <g key={b.clave}>
            <title>{descripcion}</title>
            <text x={0} y={primeraLinea} fontFamily={FUENTE} fontSize={F_ETIQUETA} fill={TINTA}>
              {e.lineas.map((l, i) => (
                <tspan key={i} x={0} dy={i === 0 ? 0 : INTERLINEA}>{l}</tspan>
              ))}
            </text>
            {b.valor > 0 ? (
              <rect
                x={p.xBarra} y={centro - GRUESO_BARRA / 2}
                width={largo} height={GRUESO_BARRA} rx={3}
                fill={color}
              />
            ) : (
              <line
                x1={p.xBarra} x2={p.xBarra} y1={centro - GRUESO_BARRA / 2} y2={centro + GRUESO_BARRA / 2}
                stroke={APAGADO} strokeWidth={2}
              />
            )}
            <text x={xTexto} y={centro + 4.5} fontFamily={MONO} fontSize={F_VALOR} fontWeight={700} fill={TINTA}>
              {valorTexto(b, madurez)}
              {nivel && (
                <tspan fontFamily={FUENTE} fontWeight={600} fontSize={F_NOTA} dx={7}>{nivel.etiqueta}</tspan>
              )}
            </text>
            {madurez && b.nota && (
              <text x={xTexto} y={centro + 21} fontFamily={FUENTE} fontSize={F_NOTA - 1} fill={APAGADO}>
                {b.nota}
              </text>
            )}
          </g>
        )
      })}

      {/* Eje con sus marcas, al pie del panel. */}
      <line x1={p.xBarra} x2={p.xBarra + p.anchoBarra} y1={p.yEje} y2={p.yEje} stroke={EJE} strokeWidth={1.5} />
      {p.marcas.map((m) => (
        <g key={`m-${m}`}>
          <line x1={xEscala(m)} x2={xEscala(m)} y1={p.yEje} y2={p.yEje + 5} stroke={EJE} strokeWidth={1.5} />
          <text
            x={xEscala(m)} y={p.yEje + 20} textAnchor="middle"
            fontFamily={MONO} fontSize={F_NOTA} fill={APAGADO}
          >
            {numero(m)}
          </text>
        </g>
      ))}
      <text
        x={p.xBarra + p.anchoBarra / 2} y={p.yEje + 38} textAnchor="middle"
        fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}
      >
        {madurez ? 'Etapa promedio (lectura interna, 0 a 4)' : 'Cantidad'}
      </text>
    </g>
  )
}

export function GraficaGeneral({ secciones, ancho, conEncabezado = false, fecha = selloFecha(), svgRef }: Props) {
  const idTitulo = useId()
  const idDesc = useId()
  const W = Math.max(300, Math.round(ancho))
  const { paneles, alto } = maquetarBarras(secciones, W)

  const arriba = conEncabezado ? 78 : 10
  const abajo = conEncabezado ? 40 : 6
  const H = Math.round(arriba + alto + abajo)
  const conteos = secciones.filter((s) => s.escala === 'conteo').reduce((t, s) => t + s.barras.length, 0)
  const promedios = secciones.filter((s) => s.escala === 'madurez').reduce((t, s) => t + s.barras.length, 0)

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
      <title id={idTitulo}>Estadísticas generales de NEXUS 360° en barras horizontales</title>
      <desc id={idDesc}>
        {`${conteos} barras de conteo y ${promedios} promedios de etapa en escala de 0 a 4. `}
        El valor exacto está escrito al final de cada barra; en los promedios también la etapa.
      </desc>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      {conEncabezado && (
        <g>
          <text x={PAD_X} y={34} fontFamily={FUENTE} fontSize={21} fontWeight={700} fill={VERDE_OSCURO}>
            NEXUS 360° · Estadísticas generales
          </text>
          <text x={PAD_X} y={56} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
            Generado el {fecha}
          </text>
        </g>
      )}

      <g transform={`translate(0 ${arriba})`}>
        {paneles.map((p) => <DibujoPanel key={p.id} p={p} />)}
      </g>

      {conEncabezado && (
        <text x={PAD_X} y={H - 14} fontFamily={FUENTE} fontSize={F_NOTA} fill={APAGADO}>
          Conteos y promedios de etapa usan escalas distintas: cada panel se lee contra su propio eje.
        </text>
      )}
    </svg>
  )
}
