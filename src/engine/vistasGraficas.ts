import type { Barra, Seccion } from './agregados'
import { nivelDe, numero, porcentajesEnteros, rebanadas, resumenPonderado } from './graficas'
import type { PuntoCampana, ResumenCampana } from './graficas'

/**
 * Las cuatro vistas de la pestaña de estadísticas (barras, pastel, campana
 * y etapas por materia): qué datos usa cada una, cómo se explica y su
 * tabla de datos.
 * La pantalla y el PDF leen de aquí, así que no pueden contar cosas
 * distintas.
 */

export type Vista = 'barras' | 'pastel' | 'campana' | 'etapas'

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
      'El valor exacto va escrito al final de cada barra. Los conteos y la etapa promedio están en '
      + 'paneles separados porque usan escalas distintas: los conteos son cantidades y la '
      + 'etapa promedio es la lectura interna de 0 a 4.',
  },
  {
    id: 'pastel',
    nombre: 'Pastel',
    titulo: 'Cómo se reparte cada total',
    descripcion:
      'Un pastel por cada reparto de un total: sectores, tamaños, clientes, etapas, prácticas y retos. '
      + 'El resumen general, las alertas y la etapa promedio no aparecen aquí porque no son partes de '
      + 'un todo (una empresa puede tener varias alertas); se ven en las barras y en la campana.',
  },
  {
    id: 'etapas',
    nombre: 'Etapas',
    titulo: 'En qué punto están las empresas en cada materia',
    descripcion:
      'Una barra por materia con el reparto de las respuestas según «¿En qué punto está?»: de «Aún no '
      + 'lo hemos abordado» a «Lo revisamos y mejoramos», más «Hacemos algo diferente» y «No aplica». '
      + 'Cada barra suma 100 % y a la derecha va el número de respuestas. Es la vista que mejor '
      + 'muestra dónde están las oportunidades comunes del grupo.',
  },
  {
    id: 'campana',
    nombre: 'Campana',
    titulo: 'Cómo se distribuye la etapa promedio',
    descripcion:
      'Cada punto es una materia, ubicada según su etapa promedio. La curva de cada formato muestra '
      + 'alrededor de qué valor se concentran sus materias (la media) y qué tan dispersas están '
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
    (s) => s.escala === 'conteo' && s.id !== 'resumen' && s.id !== 'alertas' && s.barras.some((b) => b.valor > 0),
  )
}

// ----------------------------------------------------------------- etapas

export interface SegmentoEtapa extends Barra {
  porcentaje: number
}

export interface FilaEtapas {
  materia: string
  total: number
  segmentos: SegmentoEtapa[]
}

/** Una fila por materia con sus respuestas por etapa, en el orden de la
 * escala. Los porcentajes se redondean para que cada fila sume 100. */
export function filasEtapas(secciones: Seccion[]): FilaEtapas[] {
  const barras = secciones.filter((s) => s.escala === 'distribucion').flatMap((s) => s.barras)
  const grupos = new Map<string, Barra[]>()
  for (const b of barras) {
    if (b.valor <= 0) continue
    const nombre = b.grupo ?? 'Sin materia'
    grupos.set(nombre, [...(grupos.get(nombre) ?? []), b])
  }
  return [...grupos.entries()].map(([materia, bs]) => {
    const total = bs.reduce((t, b) => t + b.valor, 0)
    const pct = porcentajesEnteros(bs.map((b) => b.valor))
    return { materia, total, segmentos: bs.map((b, i) => ({ ...b, porcentaje: pct[i] })) }
  })
}

// ----------------------------------------------------------------- campana

export interface GrupoCampana {
  nombre: string
  puntos: PuntoCampana[]
  /** null si el grupo tiene menos de dos dimensiones (no hay campana). */
  resumen: ResumenCampana | null
}

/** Una curva por formato (hoy solo RSE Express), con sus materias. */
export function gruposCampana(secciones: Seccion[]): GrupoCampana[] {
  const barras = secciones.filter((s) => s.escala === 'madurez').flatMap((s) => s.barras)
  const grupos: GrupoCampana[] = []
  for (const b of barras) {
    const nombre = b.grupo ?? 'Etapa promedio'
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
    + `desviación ${numero(r.desviacion, 2)} · ${r.n} materias`
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
          { titulo: 'Formato' }, { titulo: 'Materias', numerica: true }, { titulo: 'Media', numerica: true },
          { titulo: 'Desviación', numerica: true }, { titulo: 'Nivel de la media' },
        ],
        filas: grupos.map((g) => g.resumen
          ? [g.nombre, String(g.resumen.n), numero(g.resumen.media, 2), numero(g.resumen.desviacion, 2), nivelDe(g.resumen.media).etiqueta]
          : [g.nombre, String(g.puntos.length), '—', '—', 'Faltan materias']),
      },
      {
        titulo: 'Promedio por materia',
        columnas: [
          { titulo: 'Formato' }, { titulo: 'Materia' }, { titulo: 'Promedio', numerica: true },
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

  if (vista === 'etapas') {
    return [{
      titulo: 'Respuestas por materia y etapa',
      columnas: [{ titulo: 'Materia' }, { titulo: 'Etapa' }, { titulo: 'Respuestas', numerica: true }, { titulo: 'Porcentaje', numerica: true }],
      filas: filasEtapas(secciones).flatMap((f) => f.segmentos.map((g) => [
        f.materia, g.etiqueta, numero(g.valor), `${g.porcentaje} %`,
      ])),
    }]
  }

  return [{
    titulo: 'Datos de la gráfica',
    columnas: [{ titulo: 'Sección' }, { titulo: 'Concepto' }, { titulo: 'Valor', numerica: true }, { titulo: 'Detalle' }],
    filas: secciones.filter((s) => s.escala !== 'distribucion').flatMap((s) => s.barras.map((b) => s.escala === 'madurez'
      ? [s.titulo, b.etiquetaLarga, numero(b.valor, 2), `${nivelDe(b.valor).etiqueta}${b.nota ? ` · ${b.nota}` : ''}`]
      : [s.titulo, b.etiquetaLarga, numero(b.valor), s.unidad])),
  }]
}
