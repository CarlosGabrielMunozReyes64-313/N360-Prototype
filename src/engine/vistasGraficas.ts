import type { Seccion } from './agregados'
import { nivelDe, numero, rebanadas, resumenPonderado } from './graficas'
import type { PuntoCampana, ResumenCampana } from './graficas'

/**
 * Las tres vistas de la pestaña de estadísticas (barras, pastel y
 * campana): qué datos usa cada una, cómo se explica y su tabla de datos.
 * La pantalla y el PDF leen de aquí, así que no pueden contar cosas
 * distintas.
 */

export type Vista = 'barras' | 'pastel' | 'campana'

export interface InfoVista {
  id: Vista
  nombre: string
  titulo: string
  descripcion: string
}

export const VISTAS: InfoVista[] = [
  {
    id: 'barras',
    nombre: 'Barras',
    titulo: 'Todo el tablero en barras',
    descripcion:
      'El valor exacto va escrito al final de cada barra. Los conteos y la madurez están en '
      + 'paneles separados porque usan escalas distintas: los conteos son cantidades y la '
      + 'madurez es un promedio de 0 a 4.',
  },
  {
    id: 'pastel',
    nombre: 'Pastel',
    titulo: 'Cómo se reparte cada total',
    descripcion:
      'Un pastel por cada reparto de un total: sectores, tamaños y estados de los diagnósticos. '
      + 'El resumen general y la madurez no aparecen aquí porque no son partes de un todo; '
      + 'se ven en las barras y en la campana.',
  },
  {
    id: 'campana',
    nombre: 'Campana',
    titulo: 'Cómo se distribuye la madurez',
    descripcion:
      'Cada punto es una dimensión, ubicada según su promedio. La curva de cada formato muestra '
      + 'alrededor de qué valor se concentran sus dimensiones (la media) y qué tan dispersas están '
      + '(entre más ancha, más dispersas). La franja sombreada cubre una desviación a cada lado de '
      + 'la media, donde cae cerca del 68 % de los casos. Las curvas se dibujan a la misma altura '
      + 'para comparar su forma.',
  },
]

export function infoVista(vista: Vista): InfoVista {
  return VISTAS.find((v) => v.id === vista) ?? VISTAS[0]
}

// ------------------------------------------------------------------ pastel

/** Solo repartos de un total, y solo si tienen algo que repartir. */
export function seccionesPastel(secciones: Seccion[]): Seccion[] {
  return secciones.filter(
    (s) => s.escala === 'conteo' && s.id !== 'resumen' && s.barras.some((b) => b.valor > 0),
  )
}

// ----------------------------------------------------------------- campana

export interface GrupoCampana {
  nombre: string
  puntos: PuntoCampana[]
  /** null si el grupo tiene menos de dos dimensiones (no hay campana). */
  resumen: ResumenCampana | null
}

/** Una curva por formato (ISO 26000, Ley 2173), con sus dimensiones. */
export function gruposCampana(secciones: Seccion[]): GrupoCampana[] {
  const barras = secciones.filter((s) => s.escala === 'madurez').flatMap((s) => s.barras)
  const grupos: GrupoCampana[] = []
  for (const b of barras) {
    const nombre = b.grupo ?? 'Madurez'
    let g = grupos.find((x) => x.nombre === nombre)
    if (!g) {
      g = { nombre, puntos: [], resumen: null }
      grupos.push(g)
    }
    g.puntos.push({ clave: b.clave, etiqueta: b.etiquetaLarga, valor: b.valor, peso: b.peso ?? 0 })
  }
  for (const g of grupos) g.resumen = resumenPonderado(g.puntos)
  return grupos
}

/** Texto de una línea con las cifras de una curva. */
export function describirResumen(r: ResumenCampana): string {
  return `media ${numero(r.media, 2)} (${nivelDe(r.media).etiqueta.toLowerCase()}) · `
    + `desviación ${numero(r.desviacion, 2)} · ${r.n} dimensiones`
}

// ------------------------------------------------------------------ tablas

export interface Tabla {
  titulo: string
  columnas: { titulo: string; numerica?: boolean }[]
  filas: string[][]
}

/** Los mismos datos de cada gráfica, en tablas: la alternativa en texto
 * para lectores de pantalla y la última parte del PDF. */
export function tablasDe(vista: Vista, secciones: Seccion[]): Tabla[] {
  if (vista === 'pastel') {
    const filas = seccionesPastel(secciones).flatMap((s) =>
      rebanadas(s.barras.map((b) => ({ clave: b.clave, etiqueta: b.etiquetaLarga, valor: b.valor })))
        .map((r) => [s.titulo, r.etiqueta, numero(r.valor), `${r.porcentaje} %`]),
    )
    return [{
      titulo: 'Repartos',
      columnas: [{ titulo: 'Reparto' }, { titulo: 'Categoría' }, { titulo: 'Cantidad', numerica: true }, { titulo: 'Porcentaje', numerica: true }],
      filas,
    }]
  }

  if (vista === 'campana') {
    const grupos = gruposCampana(secciones)
    return [
      {
        titulo: 'Resumen por formato',
        columnas: [
          { titulo: 'Formato' }, { titulo: 'Dimensiones', numerica: true }, { titulo: 'Media', numerica: true },
          { titulo: 'Desviación', numerica: true }, { titulo: 'Nivel de la media' },
        ],
        filas: grupos.map((g) => g.resumen
          ? [g.nombre, String(g.resumen.n), numero(g.resumen.media, 2), numero(g.resumen.desviacion, 2), nivelDe(g.resumen.media).etiqueta]
          : [g.nombre, String(g.puntos.length), '—', '—', 'Faltan dimensiones']),
      },
      {
        titulo: 'Promedio por dimensión',
        columnas: [
          { titulo: 'Formato' }, { titulo: 'Dimensión' }, { titulo: 'Promedio', numerica: true },
          { titulo: 'Nivel' }, { titulo: 'Respuestas', numerica: true },
        ],
        filas: grupos.flatMap((g) => g.puntos.map((p) => [
          g.nombre,
          p.etiqueta.startsWith(`${g.nombre} · `) ? p.etiqueta.slice(g.nombre.length + 3) : p.etiqueta,
          numero(p.valor, 2),
          nivelDe(p.valor).etiqueta,
          numero(p.peso),
        ])),
      },
    ]
  }

  return [{
    titulo: 'Datos de la gráfica',
    columnas: [{ titulo: 'Sección' }, { titulo: 'Concepto' }, { titulo: 'Valor', numerica: true }, { titulo: 'Detalle' }],
    filas: secciones.flatMap((s) => s.barras.map((b) => s.escala === 'madurez'
      ? [s.titulo, b.etiquetaLarga, numero(b.valor, 2), `${nivelDe(b.valor).etiqueta}${b.nota ? ` · ${b.nota}` : ''}`]
      : [s.titulo, b.etiquetaLarga, numero(b.valor), s.unidad])),
  }]
}
