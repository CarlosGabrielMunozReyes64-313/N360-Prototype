import type { Estadisticas } from '../auth/adminApi'
import { COLOR_CONTEO, nivelDe } from './graficas'
import { COLOR_NIVEL, etiquetaEtapa } from '../data/escala'
import { nombreCliente, nombreTamano } from '../data/tamizaje'
import type { Etapa, Tamano, TipoCliente } from '../types'

/**
 * Punto único donde las distribuciones del panel se vuelven una
 * sola estructura. La gráfica, el Excel y el Word leen de aquí, así que
 * los tres muestran exactamente lo mismo: si cambia un criterio, cambia
 * en un solo lugar y no hay forma de que el informe diga algo distinto
 * de lo que se ve en pantalla.
 */

export const NOMBRES_FORMATO: Record<string, string> = {
  rse_express: 'RSE Express',
  // Formatos retirados con la migración 009 (solo por si quedan datos viejos).
  iso26000: 'ISO 26000',
  ley2173: 'Ley 2173',
}

export const ORDEN_ETAPA = ['0', '1', '2', '3', '4', 'diferente', 'NA']

const RANGOS_PERSONAS: Record<string, string> = {
  '1-9': '1 a 9 personas',
  '10-50': '10 a 50 (perfil del piloto)',
  '51-200': '51 a 200 personas',
  '201+': 'Más de 200 personas',
}

const ALERTAS: { clave: 'ley2173' | 'sst' | 'datos' | 'territorio'; nombre: string; largo: string }[] = [
  { clave: 'sst', nombre: 'SG-SST en etapa inicial', largo: 'SG-SST en etapa inicial (03b)' },
  { clave: 'datos', nombre: 'Datos personales', largo: 'Datos personales (06b)' },
  { clave: 'ley2173', nombre: 'Ley 2173 (tamaño)', largo: 'Ley 2173 (mediana o no sabe)' },
  { clave: 'territorio', nombre: 'Comunidades étnicas', largo: 'Cerca de comunidades étnicas' },
]

function etapaDeTexto(e: string): Etapa | null {
  if (e === 'diferente' || e === 'NA') return e
  const n = Number(e)
  return Number.isInteger(n) && n >= 0 && n <= 4 ? (n as Etapa) : null
}

/** Color por etapa, pensado para barras apiladas: cada etapa vecina se
 * distingue por tono y por luminosidad, y «No aplica» queda claro y neutro. */
export const COLORES_ETAPA: Record<string, string> = {
  '0': '#a8322a',
  '1': '#c5881e',
  '2': '#025873',
  '3': '#04a97a',
  '4': '#024029',
  diferente: '#5b4fa0',
  NA: '#c3ccc8',
}

export function colorEtapa(e: string): string {
  return COLORES_ETAPA[e] ?? COLOR_NIVEL[Number(e)] ?? GRIS
}

export function nombreEtapa(e: string, corta = true): string {
  return etiquetaEtapa(etapaDeTexto(e), corta)
}

export const NOMBRES_ESTADO: Record<string, string> = {
  borrador: 'En borrador',
  completado: 'Completado',
  archivado: 'Archivado',
}

/** Las secciones de conteo comparten un eje; la de madurez tiene el suyo
 * (0–4). Mezclarlas en una sola escala haría que un promedio de 3,4
 * pareciera insignificante al lado de un conteo de 40 empresas.
 * 'distribucion' es una tabla cruzada (materia × etapa) que solo dibuja la
 * vista «Etapas»: las barras, el pastel y la campana la ignoran. */
export type Escala = 'conteo' | 'madurez' | 'distribucion'

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
        etiqueta: nombreTamano(x.tamano as Tamano),
        etiquetaLarga: `Tamaño: ${nombreTamano(x.tamano as Tamano)}`,
        valor: x.total,
        color: TEAL,
        nota: '',
      })),
    },
    {
      id: 'personas',
      titulo: 'Empresas por número de personas',
      escala: 'conteo',
      unidad: 'empresas',
      color: TEAL,
      vacio: 'Todavía no hay tamizajes guardados.',
      barras: (s.empresas_por_personas ?? []).map((x) => ({
        clave: `personas-${x.rango}`,
        etiqueta: acortar(RANGOS_PERSONAS[x.rango] ?? x.rango),
        etiquetaLarga: `Personas: ${RANGOS_PERSONAS[x.rango] ?? x.rango}`,
        valor: x.total,
        color: TEAL,
        nota: '',
      })),
    },
    {
      id: 'clientes',
      titulo: 'Empresas por tipo de cliente',
      escala: 'conteo',
      unidad: 'empresas',
      color: TEAL,
      vacio: 'Todavía no hay tamizajes guardados.',
      barras: (s.empresas_por_cliente ?? []).map((x) => ({
        clave: `clientes-${x.clientes}`,
        etiqueta: acortar(nombreCliente(x.clientes as TipoCliente)),
        etiquetaLarga: `Clientes: ${nombreCliente(x.clientes as TipoCliente)}`,
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
      id: 'etapas',
      titulo: 'Respuestas por etapa',
      escala: 'conteo',
      unidad: 'respuestas',
      color: VERDE_OSCURO,
      vacio: 'Todavía no hay respuestas con etapa.',
      barras: [...(s.respuestas_por_etapa ?? [])]
        .sort((a, b) => ORDEN_ETAPA.indexOf(a.etapa) - ORDEN_ETAPA.indexOf(b.etapa))
        .map((x) => ({
          clave: `etapa-${x.etapa}`,
          etiqueta: acortar(etiquetaEtapa(etapaDeTexto(x.etapa), true)),
          etiquetaLarga: etiquetaEtapa(etapaDeTexto(x.etapa)).replace(' / Lo hacemos de manera informal', '').replace(': hay acuerdos y alguien a cargo, esté o no por escrito', ''),
          valor: x.total,
          // En barras sueltas «No aplica» va en gris oscuro para que se vea.
          color: x.etapa === 'NA' ? GRIS : colorEtapa(x.etapa),
          nota: '',
        })),
    },
    {
      id: 'practicas',
      titulo: 'Prácticas registradas por materia',
      escala: 'conteo',
      unidad: 'prácticas',
      color: VERDE_OSCURO,
      vacio: 'Todavía no hay prácticas registradas.',
      barras: (s.practicas_por_materia ?? []).map((x) => ({
        clave: `practicas-${x.numero}`,
        etiqueta: acortar(`${x.numero}. ${x.materia}`, 24),
        etiquetaLarga: `${x.numero}. ${x.materia}`,
        valor: x.total,
        color: VERDE_OSCURO,
        nota: '',
      })),
    },
    {
      id: 'retos',
      titulo: 'Oportunidades elegidas como reto',
      escala: 'conteo',
      unidad: 'empresas',
      color: ORO,
      vacio: 'Ninguna empresa ha elegido todavía una oportunidad en la matriz.',
      barras: (s.retos_por_materia ?? []).map((x) => ({
        clave: `retos-${x.numero}`,
        etiqueta: acortar(`${x.numero}. ${x.materia}`, 24),
        etiquetaLarga: `Reto en ${x.numero}. ${x.materia}`,
        valor: x.total,
        color: ORO,
        nota: '',
      })),
    },
    {
      id: 'alertas',
      titulo: 'Empresas con alertas informativas',
      escala: 'conteo',
      unidad: 'empresas',
      color: '#a8322a',
      vacio: 'Sin alertas.',
      barras: s.alertas
        ? ALERTAS.filter((a) => (s.alertas?.[a.clave] ?? 0) > 0).map((a) => ({
          clave: `alerta-${a.clave}`,
          etiqueta: a.nombre,
          etiquetaLarga: a.largo,
          valor: s.alertas![a.clave],
          color: '#a8322a',
          nota: '',
        }))
        : [],
    },
    {
      id: 'madurez',
      titulo: 'Etapa promedio por materia (lectura interna)',
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
    {
      id: 'etapas_materia',
      titulo: 'Etapas por materia',
      escala: 'distribucion',
      unidad: 'respuestas',
      color: VERDE_OSCURO,
      vacio: 'Todavía no hay respuestas con etapa.',
      barras: [...(s.etapas_por_materia ?? [])]
        .sort((a, b) => a.numero.localeCompare(b.numero) || ORDEN_ETAPA.indexOf(a.etapa) - ORDEN_ETAPA.indexOf(b.etapa))
        .map((x) => ({
          clave: `em-${x.numero}-${x.etapa}`,
          etiqueta: nombreEtapa(x.etapa),
          etiquetaLarga: `${x.numero}. ${x.materia} · ${nombreEtapa(x.etapa, false)}`,
          valor: x.total,
          color: colorEtapa(x.etapa),
          nota: '',
          grupo: `${x.numero}. ${x.materia}`,
        })),
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
