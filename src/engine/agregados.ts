import type { Estadisticas } from '../auth/adminApi'
import { COLOR_CONTEO, nivelDe } from './graficas'

/**
 * Punto único donde las cuatro distribuciones del panel se vuelven una
 * sola estructura. La gráfica, el Excel y el Word leen de aquí, así que
 * los tres muestran exactamente lo mismo: si cambia un criterio, cambia
 * en un solo lugar y no hay forma de que el informe diga algo distinto
 * de lo que se ve en pantalla.
 */

export const NOMBRES_FORMATO: Record<string, string> = {
  iso26000: 'ISO 26000',
  ley2173: 'Ley 2173',
}

export const NOMBRES_ESTADO: Record<string, string> = {
  borrador: 'En borrador',
  completado: 'Completado',
  archivado: 'Archivado',
}

/** Las secciones de conteo comparten un eje; la de madurez tiene el suyo
 * (0–4). Mezclarlas en una sola escala haría que un promedio de 3,4
 * pareciera insignificante al lado de un conteo de 40 empresas. */
export type Escala = 'conteo' | 'madurez'

export interface Barra {
  clave: string
  /** Texto corto bajo la barra en la gráfica. */
  etiqueta: string
  /** Texto completo para tablas y tooltips. */
  etiquetaLarga: string
  valor: number
  color: string
  /** Aclaración opcional (p. ej. cuántas respuestas sostienen el promedio). */
  nota: string
  /** Subgrupo dentro de la sección (en madurez: el formato, ISO o Ley). */
  grupo?: string
  /** Número de respuestas detrás de un promedio (pondera la campana). */
  peso?: number
}

export interface Seccion {
  id: string
  titulo: string
  escala: Escala
  unidad: string
  color: string
  /** Qué decir cuando la sección no tiene ni una barra. */
  vacio: string
  barras: Barra[]
}

// Todos con contraste ≥ 3:1 contra blanco (ver engine/graficas.ts). El
// verde medio y el dorado de la marca no llegaban (3,0 y 2,5).
const VERDE_OSCURO = '#024029'
const TEAL = COLOR_CONTEO
const ORO = '#c5881e'
const GRIS = '#6b7a74'

/** Recorta sin partir palabras a la mitad cuando se puede. */
export function acortar(texto: string, max = 26): string {
  if (texto.length <= max) return texto
  const corte = texto.slice(0, max - 1)
  const espacio = corte.lastIndexOf(' ')
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trimEnd() + '…'
}

function colorEstado(estado: string): string {
  if (estado === 'completado') return VERDE_OSCURO
  if (estado === 'borrador') return ORO
  return GRIS
}

export function construirSecciones(s: Estadisticas): Seccion[] {
  return [
    {
      id: 'resumen',
      titulo: 'Resumen general',
      escala: 'conteo',
      unidad: 'registros',
      color: VERDE_OSCURO,
      vacio: 'Sin registros.',
      barras: [
        { clave: 'empresas', etiqueta: 'Empresas', etiquetaLarga: 'Empresas registradas', valor: s.resumen.empresas, color: VERDE_OSCURO, nota: '' },
        { clave: 'usuarios', etiqueta: 'Usuarios', etiquetaLarga: 'Usuarios totales', valor: s.resumen.usuarios, color: VERDE_OSCURO, nota: '' },
        { clave: 'diag-total', etiqueta: 'Diag. iniciados', etiquetaLarga: 'Diagnósticos iniciados', valor: s.resumen.diagnosticos_totales, color: VERDE_OSCURO, nota: '' },
        { clave: 'diag-ok', etiqueta: 'Diag. completados', etiquetaLarga: 'Diagnósticos completados', valor: s.resumen.diagnosticos_completados, color: VERDE_OSCURO, nota: '' },
      ],
    },
    {
      id: 'sector',
      titulo: 'Empresas por sector',
      escala: 'conteo',
      unidad: 'empresas',
      color: TEAL,
      vacio: 'Todavía no hay empresas registradas.',
      barras: s.empresas_por_sector.map((x) => ({
        clave: `sector-${x.sector_id}`,
        etiqueta: acortar(x.nombre),
        etiquetaLarga: x.nombre,
        valor: x.total,
        color: TEAL,
        nota: '',
      })),
    },
    {
      id: 'tamano',
      titulo: 'Empresas por tamaño',
      escala: 'conteo',
      unidad: 'empresas',
      color: TEAL,
      vacio: 'Todavía no hay tamizajes guardados.',
      barras: s.empresas_por_tamano.map((x) => ({
        clave: `tamano-${x.tamano}`,
        etiqueta: x.tamano,
        etiquetaLarga: `Tamaño: ${x.tamano}`,
        valor: x.total,
        color: TEAL,
        nota: '',
      })),
    },
    {
      id: 'estado',
      titulo: 'Diagnósticos por estado',
      escala: 'conteo',
      unidad: 'diagnósticos',
      color: VERDE_OSCURO,
      vacio: 'Todavía no hay diagnósticos iniciados.',
      barras: s.diagnosticos_por_estado.map((x) => {
        const formato = NOMBRES_FORMATO[x.formato_id] ?? x.formato_id
        const estado = NOMBRES_ESTADO[x.estado] ?? x.estado
        return {
          clave: `estado-${x.formato_id}-${x.estado}`,
          etiqueta: acortar(`${formato} · ${estado}`, 24),
          etiquetaLarga: `${formato} · ${estado}`,
          valor: x.total,
          color: colorEstado(x.estado),
          nota: '',
        }
      }),
    },
    {
      id: 'madurez',
      titulo: 'Madurez promedio por dimensión',
      escala: 'madurez',
      unidad: 'escala 0–4',
      color: VERDE_OSCURO,
      vacio: 'Todavía no hay respuestas registradas.',
      barras: s.promedio_por_dimension.map((d) => {
        const formato = NOMBRES_FORMATO[d.formato_id] ?? d.formato_id
        return {
          clave: `dim-${d.formato_id}-${d.numero}`,
          etiqueta: acortar(`${d.numero}. ${d.dimension}`, 24),
          etiquetaLarga: `${formato} · ${d.numero}. ${d.dimension}`,
          valor: d.promedio,
          // El color dice el nivel, igual que en el informe de empresa.
          color: nivelDe(d.promedio).color,
          nota: `${d.respuestas} resp.`,
          grupo: formato,
          peso: d.respuestas,
        }
      }),
    },
  ]
}

/** Solo las secciones con al menos una barra: dibujar un hueco titulado
 * dentro de la gráfica la vuelve ilegible. */
export function seccionesConDatos(secciones: Seccion[]): Seccion[] {
  return secciones.filter((s) => s.barras.length > 0)
}

export function totalBarras(secciones: Seccion[]): number {
  return secciones.reduce((n, s) => n + s.barras.length, 0)
}

/** Techo del eje de conteo, mirando solo las secciones que lo usan. */
export function maximoConteo(secciones: Seccion[]): number {
  const valores = secciones
    .filter((s) => s.escala === 'conteo')
    .flatMap((s) => s.barras.map((b) => b.valor))
  return valores.length ? Math.max(...valores) : 0
}

/** Marcas de eje "redondas" (1, 2, 5, 10, 20, 50…) para que el lector no
 * tenga que interpretar cortes en 3,7. */
export function ticksBonitos(max: number, objetivo = 5): number[] {
  if (!(max > 0)) return [0, 1]
  const bruto = max / objetivo
  const magnitud = 10 ** Math.floor(Math.log10(bruto))
  const norm = bruto / magnitud
  const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitud
  const tope = Math.ceil(max / paso) * paso
  const marcas: number[] = []
  for (let v = 0; v <= tope + paso / 1000; v += paso) marcas.push(Number(v.toFixed(6)))
  return marcas
}

export interface FilaPlana {
  seccion: string
  concepto: string
  valor: number
  unidad: string
  nota: string
}

/** Todo el tablero en una sola tabla — la forma que necesitan Excel y Word. */
export function aplanar(secciones: Seccion[]): FilaPlana[] {
  return secciones.flatMap((s) =>
    s.barras.map((b) => ({
      seccion: s.titulo,
      concepto: b.etiquetaLarga,
      valor: b.valor,
      unidad: s.unidad,
      nota: b.nota,
    })),
  )
}

/** Sello de fecha en horario colombiano, igual en pantalla y en los archivos. */
export function selloFecha(d = new Date()): string {
  return d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
}

export function selloArchivo(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}
