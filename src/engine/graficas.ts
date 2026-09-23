/**
 * Lógica pura de las gráficas del panel de administración (barras,
 * pastel y campana). Sin React ni DOM, para poder probarla sola.
 *
 * Accesibilidad — cómo se eligieron los colores:
 *   - Todo color de relleno tiene contraste ≥ 3:1 contra el fondo blanco
 *     (WCAG 1.4.11, objetos gráficos); todo texto, ≥ 4.5:1.
 *   - Se midió la diferencia entre colores (ΔE CIELAB) simulando
 *     deuteranopía y protanopía (Machado 2009), las dos formas más
 *     comunes de daltonismo, además de la visión típica. Las paletas de
 *     abajo son las que mejor separan los colores en los tres casos sin
 *     salirse de la identidad NEXUS.
 *   - El color nunca va solo: cada barra lleva su valor y su nivel escritos,
 *     cada rebanada su nombre y porcentaje, y cada curva su propio trazo
 *     (continuo o discontinuo) y marcador (círculo o rombo).
 */

// ------------------------------------------------------------------ colores

export const TINTA = '#1a2e24'
export const APAGADO = '#4d6259'
export const REJILLA = '#dde7e2'
export const EJE = '#8fa39a'
export const FONDO_SUAVE = '#f4f7f5'
export const VERDE_OSCURO = '#024029'

export const FUENTE = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif'
export const MONO = '"IBM Plex Mono", "SFMono-Regular", Consolas, "Courier New", monospace'

/**
 * Niveles de madurez: los mismos cortes y tonos de data/escala.ts, con el
 * dorado apenas más oscuro (#d99521 → #c5881e) porque el original tenía
 * contraste 2,5:1 contra blanco. Separación mínima entre niveles:
 * ΔE ≥ 30 en visión típica, deuteranopía y protanopía.
 */
export const NIVELES = [
  { etiqueta: 'Sin gestión', desde: 0, hasta: 1.5, color: '#a8322a' },
  { etiqueta: 'Informal', desde: 1.5, hasta: 2.5, color: '#c5881e' },
  { etiqueta: 'Planificado', desde: 2.5, hasta: 3.5, color: '#025873' },
  { etiqueta: 'Consolidado', desde: 3.5, hasta: 4, color: '#04a97a' },
] as const

export function nivelDe(promedio: number) {
  return NIVELES.find((n) => promedio < n.hasta) ?? NIVELES[NIVELES.length - 1]
}

/**
 * Paleta para categorías sin orden (rebanadas del pastel). Separación
 * mínima ΔE ≈ 17 entre cualquier par, también con daltonismo; ordenada
 * para alternar tonos claros y oscuros, así dos rebanadas vecinas nunca
 * se confunden. Más de seis categorías se agrupan en «Otros» (gris).
 */
export const PALETA_CATEGORIAS = ['#024029', '#b05a00', '#0594d1', '#5b4fa0', '#17a193', '#025873'] as const
export const COLOR_OTROS = '#6b7a74'
export const MAX_REBANADAS = PALETA_CATEGORIAS.length

/** Color de cada sección de conteo en las barras (todos ≥ 3:1). */
export const COLOR_CONTEO = '#025873'

/** Estilo de trazo por formato en la campana: forma, no solo color. */
export const ESTILOS_SERIE = [
  { color: '#024029', trazo: undefined, marcador: 'circulo' },
  { color: '#b05a00', trazo: '9 6', marcador: 'rombo' },
  { color: '#0594d1', trazo: '2 5', marcador: 'cuadrado' },
] as const

// -------------------------------------------------------------- contraste

function lineal(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function luminancia(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => lineal(parseInt(h.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razón de contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b = '#ffffff'): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

/** Blanco o tinta, lo que se lea mejor encima de `fondo`. */
export function textoSobre(fondo: string): string {
  return contraste('#ffffff', fondo) >= contraste(TINTA, fondo) ? '#ffffff' : TINTA
}

// ------------------------------------------------------------------- texto

/** Formato colombiano: coma decimal. */
export function numero(valor: number, decimales = 0): string {
  return valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

/** Ancho aproximado de un texto en px (Inter/Helvetica). Suficiente para
 * decidir dónde partir líneas; no hace falta medir con el DOM. */
export function anchoTexto(texto: string, tamano: number): number {
  let unidades = 0
  for (const ch of texto) {
    if (/[ilI.,:;'|!]/.test(ch)) unidades += 0.3
    else if (/[mwMW@]/.test(ch)) unidades += 0.85
    else if (/[A-ZÁÉÍÓÚÑ0-9]/.test(ch)) unidades += 0.64
    else if (ch === ' ') unidades += 0.28
    else unidades += 0.54
  }
  return unidades * tamano
}

/**
 * Parte un texto en líneas que quepan en `anchoMax` px, sin cortar
 * palabras. Si no cabe en `maxLineas`, la última termina en «…».
 */
export function partirTexto(texto: string, anchoMax: number, tamano: number, maxLineas = 2): string[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (anchoTexto(prueba, tamano) <= anchoMax || !actual) actual = prueba
    else {
      lineas.push(actual)
      actual = p
    }
  }
  if (actual) lineas.push(actual)
  if (lineas.length <= maxLineas) return lineas

  const visibles = lineas.slice(0, maxLineas)
  let ultima = visibles[maxLineas - 1]
  while (ultima.length > 1 && anchoTexto(`${ultima}…`, tamano) > anchoMax) {
    ultima = ultima.slice(0, -1).trimEnd()
  }
  visibles[maxLineas - 1] = `${ultima}…`
  return visibles
}

// ------------------------------------------------------------------ pastel

export interface EntradaPastel {
  clave: string
  etiqueta: string
  valor: number
}

export interface Rebanada extends EntradaPastel {
  /** Porcentaje entero; la suma de todas da exactamente 100. */
  porcentaje: number
  fraccion: number
  /** Ángulos en radianes, 0 = las 12 en punto, sentido horario. */
  inicio: number
  fin: number
  color: string
}

/**
 * Enteros que suman exactamente 100 (método del mayor residuo). Con
 * redondeo simple, tres rebanadas iguales darían 33 + 33 + 33 = 99 %.
 */
export function porcentajesEnteros(valores: number[]): number[] {
  const total = valores.reduce((a, b) => a + b, 0)
  if (total <= 0) return valores.map(() => 0)
  const exactos = valores.map((v) => (v / total) * 100)
  const base = exactos.map(Math.floor)
  let faltan = 100 - base.reduce((a, b) => a + b, 0)
  const orden = exactos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto)
  for (const { i } of orden) {
    if (faltan <= 0) break
    base[i] += 1
    faltan -= 1
  }
  return base
}

/**
 * Rebanadas ordenadas de mayor a menor desde las 12 en punto. Las
 * categorías en cero no se dibujan; si hay más de MAX_REBANADAS, las más
 * pequeñas se juntan en «Otros».
 */
export function rebanadas(entradas: EntradaPastel[]): Rebanada[] {
  let items = entradas.filter((e) => e.valor > 0).sort((a, b) => b.valor - a.valor)
  if (items.length > MAX_REBANADAS) {
    const visibles = items.slice(0, MAX_REBANADAS - 1)
    const resto = items.slice(MAX_REBANADAS - 1)
    items = [
      ...visibles,
      {
        clave: 'otros',
        etiqueta: `Otros (${resto.length})`,
        valor: resto.reduce((t, e) => t + e.valor, 0),
      },
    ]
  }
  const total = items.reduce((t, e) => t + e.valor, 0)
  const porcentajes = porcentajesEnteros(items.map((e) => e.valor))
  let angulo = 0
  return items.map((e, i) => {
    const fraccion = total > 0 ? e.valor / total : 0
    const inicio = angulo
    angulo += fraccion * Math.PI * 2
    return {
      ...e,
      porcentaje: porcentajes[i],
      fraccion,
      inicio,
      fin: angulo,
      color: e.clave === 'otros' ? COLOR_OTROS : PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length],
    }
  })
}

/** Punto sobre la circunferencia; ángulo 0 = arriba, sentido horario. */
export function puntoPolar(cx: number, cy: number, r: number, angulo: number): [number, number] {
  return [cx + r * Math.sin(angulo), cy - r * Math.cos(angulo)]
}

/** `d` de un <path> para una rebanada. Una rebanada del 100 % se dibuja
 * como círculo aparte (un arco de 360° no existe en SVG). */
export function caminoRebanada(cx: number, cy: number, r: number, inicio: number, fin: number): string {
  const [x0, y0] = puntoPolar(cx, cy, r, inicio)
  const [x1, y1] = puntoPolar(cx, cy, r, fin)
  const grande = fin - inicio > Math.PI ? 1 : 0
  const f = (n: number) => n.toFixed(2)
  return `M ${f(cx)} ${f(cy)} L ${f(x0)} ${f(y0)} A ${f(r)} ${f(r)} 0 ${grande} 1 ${f(x1)} ${f(y1)} Z`
}

// ----------------------------------------------------------------- campana

export interface PuntoCampana {
  clave: string
  etiqueta: string
  valor: number
  /** Número de respuestas que sostienen el promedio. */
  peso: number
}

export interface ResumenCampana {
  n: number
  /** Media ponderada por respuestas = promedio de todas las respuestas. */
  media: number
  /** Desviación estándar ponderada entre dimensiones. */
  desviacion: number
  respuestas: number
}

export function resumenPonderado(puntos: PuntoCampana[]): ResumenCampana | null {
  const validos = puntos.filter((p) => Number.isFinite(p.valor))
  if (validos.length < 2) return null
  // Sin respuestas registradas, cada dimensión pesa lo mismo.
  const pesos = validos.map((p) => (p.peso > 0 ? p.peso : 1))
  const total = pesos.reduce((a, b) => a + b, 0)
  const media = validos.reduce((t, p, i) => t + p.valor * pesos[i], 0) / total
  const varianza = validos.reduce((t, p, i) => t + pesos[i] * (p.valor - media) ** 2, 0) / total
  return {
    n: validos.length,
    media,
    desviacion: Math.sqrt(varianza),
    respuestas: validos.reduce((t, p) => t + Math.max(0, p.peso), 0),
  }
}

/** La desviación más angosta que se dibuja: con promedios casi idénticos
 * la curva real sería una aguja que tapa todo lo demás. */
export const DESVIACION_MIN_DIBUJO = 0.12

export function densidadNormal(x: number, media: number, desviacion: number): number {
  const d = Math.max(desviacion, DESVIACION_MIN_DIBUJO)
  return Math.exp(-0.5 * ((x - media) / d) ** 2) / (d * Math.sqrt(2 * Math.PI))
}

export function curvaNormal(media: number, desviacion: number, desde = 0, hasta = 4, pasos = 160): [number, number][] {
  const puntos: [number, number][] = []
  for (let i = 0; i <= pasos; i++) {
    const x = desde + ((hasta - desde) * i) / pasos
    puntos.push([x, densidadNormal(x, media, desviacion)])
  }
  return puntos
}

/**
 * Posición vertical (0, 1, 2…) de cada punto del diagrama de puntos:
 * los que caen a menos de `separacion` de otro ya colocado se apilan, en
 * vez de quedar uno encima de otro.
 */
export function apilarPuntos(valores: number[], separacion: number): number[] {
  const orden = valores.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const niveles = new Array<number>(valores.length).fill(0)
  const colocados: { v: number; nivel: number }[] = []
  for (const { v, i } of orden) {
    let nivel = 0
    while (colocados.some((c) => c.nivel === nivel && Math.abs(c.v - v) < separacion)) nivel++
    niveles[i] = nivel
    colocados.push({ v, nivel })
  }
  return niveles
}

/** "menos de 1,5", "1,5 a 2,5", "3,5 o más". */
export function rangoNivel(n: (typeof NIVELES)[number]): string {
  if (n.desde === 0) return `menos de ${numero(n.hasta, 1)}`
  if (n.hasta === 4) return `${numero(n.desde, 1)} o más`
  return `${numero(n.desde, 1)} a ${numero(n.hasta, 1)}`
}
