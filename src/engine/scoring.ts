import type {
  Bandera, Formato, HojaResultado, NodoResultado,
  Prioridad, Respuestas, ResultadoFormato, SectorId, Tamizaje,
} from '../types'
import { PESOS_SECTOR } from '../data/formato01'
import { REGLAS_BANDERA } from '../data/formato02'
import { VERBO } from '../data/escala'

export const TOLERANCIA = 1e-4

/** Σ peso ≠ 1.0 impide publicar un formato. En coma flotante hay que tolerar. */
export function pesosValidos(pesos: number[]): boolean {
  return Math.abs(pesos.reduce((a, b) => a + b, 0) - 1) < TOLERANCIA
}

export function pesosDimension(formato: Formato, sector: SectorId | ''): Record<string, number> {
  if (formato.id === 'iso26000') {
    if (sector && PESOS_SECTOR[sector]) return PESOS_SECTOR[sector]
    // Perfil neutro: 1/7 por materia.
    const n = formato.dimensiones.length
    return Object.fromEntries(formato.dimensiones.map((d) => [d.id, 1 / n]))
  }
  return Object.fromEntries(formato.dimensiones.map((d) => [d.id, d.peso ?? 0]))
}

/** El tamizaje puede apagar dimensiones o secciones enteras. */
export function hojasForzadasNA(formato: Formato, tam: Tamizaje): Set<string> {
  const out = new Set<string>()
  if (formato.id !== 'ley2173') return out
  const sinAreas = tam.areasDeVida !== 'si'
  for (const d of formato.dimensiones) {
    for (const s of d.secciones) {
      const apagada =
        sinAreas && (d.condicional === 'requiereAreasDeVida' || s.condicional === 'requiereAreasDeVida')
      if (apagada) s.preguntas.forEach((p) => out.add(p.id))
    }
  }
  return out
}

export function techoDe(formatoId: Formato['id'], tam: Tamizaje): number {
  if (formatoId === 'ley2173' && tam.cicloPrevio !== 'si') return 3
  return 4
}

export function leyAplicable(tam: Tamizaje): { aplica: boolean; exigible: boolean; motivo: string } {
  if (tam.tamano === 'micro' || tam.tamano === 'pequena') {
    return {
      aplica: false, exigible: false,
      motivo: 'La obligación cobija a medianas y grandes empresas. Puede evaluarla igual, como preparación voluntaria.',
    }
  }
  if (tam.areasDeVida !== 'si') {
    return {
      aplica: true, exigible: false,
      motivo: 'Su municipio aún no ha delimitado y publicado sus Áreas de Vida. La obligación existe pero todavía no es exigible.',
    }
  }
  return { aplica: true, exigible: true, motivo: '' }
}

interface Acc { num: number; covW: number; totW: number }

function acumular(items: { peso: number; score: number | null; cobertura: number }[]): Acc {
  let num = 0, covW = 0, totW = 0
  for (const it of items) {
    totW += it.peso
    const w = it.peso * it.cobertura
    covW += w
    if (it.score !== null) num += w * it.score
  }
  return { num, covW, totW }
}

export function evaluarFormato(
  formato: Formato,
  respuestas: Respuestas,
  sector: SectorId | '',
  tam: Tamizaje,
): ResultadoFormato {
  const pesosDim = pesosDimension(formato, sector)
  const forzadas = hojasForzadasNA(formato, tam)
  const techo = techoDe(formato.id, tam)

  const hojas: HojaResultado[] = []
  const dims: NodoResultado[] = []
  const nivelDim: { peso: number; score: number | null; cobertura: number }[] = []

  for (const d of formato.dimensiones) {
    const pesoDim = pesosDim[d.id] ?? 0
    const nivelSec: { peso: number; score: number | null; cobertura: number }[] = []

    for (const s of d.secciones) {
      const nivelPreg = s.preguntas.map((p) => {
        const valor = forzadas.has(p.id) ? ('NA' as const) : respuestas[p.id]
        const contable = valor !== undefined && valor !== 'NA'
        hojas.push({
          id: p.id, texto: p.texto, arquetipo: p.arquetipo, accion: p.accion,
          ancla: p.ancla, dimension: d.nombre, valor,
          pesoGlobal: pesoDim * s.peso * p.peso,
        })
        return {
          peso: p.peso,
          score: contable ? (valor as number) : null,
          cobertura: contable ? 1 : 0,
        }
      })
      const a = acumular(nivelPreg)
      nivelSec.push({
        peso: s.peso,
        score: a.covW > 0 ? a.num / a.covW : null,
        cobertura: a.totW > 0 ? a.covW / a.totW : 0,
      })
    }

    const a = acumular(nivelSec)
    const score = a.covW > 0 ? a.num / a.covW : null
    const cobertura = a.totW > 0 ? a.covW / a.totW : 0
    dims.push({ id: d.id, nombre: d.nombre, abrev: d.abrev, score, cobertura, pesoEfectivo: pesoDim })
    nivelDim.push({ peso: pesoDim, score, cobertura })
  }

  const a = acumular(nivelDim)
  const score = a.covW > 0 ? a.num / a.covW : null
  const cobertura = a.totW > 0 ? a.covW / a.totW : 0

  return {
    formatoId: formato.id,
    score,
    cobertura,
    techo,
    // Con más de la mitad del peso en N/A, un puntaje diría más de lo que sabe.
    concluyente: score !== null && cobertura >= 0.5,
    dimensiones: dims,
    hojas,
  }
}

/** Preguntas que faltan por responder, sin contar las apagadas por tamizaje. */
export function progreso(formato: Formato, respuestas: Respuestas, tam: Tamizaje) {
  const forzadas = hojasForzadasNA(formato, tam)
  let total = 0, hechas = 0
  for (const d of formato.dimensiones)
    for (const s of d.secciones)
      for (const p of s.preguntas) {
        if (forzadas.has(p.id)) continue
        total++
        if (respuestas[p.id] !== undefined) hechas++
      }
  return { total, hechas, completo: total > 0 && hechas === total }
}

export function evaluarBanderas(res: ResultadoFormato | null): Bandera[] {
  if (!res) return []
  const v = (id: string): number | null => {
    const h = res.hojas.find((x) => x.id === id)
    if (!h || h.valor === undefined || h.valor === 'NA') return null
    return h.valor
  }
  return REGLAS_BANDERA.filter((r) => r.evaluar(v)).map(({ id, titulo, detalle }) => ({ id, titulo, detalle }))
}

const HOJAS_CRITICAS: Record<string, string[]> = {
  permanencia: ['4.3', '4.4'],
  ica: ['4.2'],
  plazo: ['4.1'],
  base: ['1.2'],
}

export interface Cruce { tono: 'alerta' | 'aviso' | 'bien'; titulo: string; texto: string }

export function lecturaCruzada(
  iso: ResultadoFormato | null,
  ley: ResultadoFormato | null,
  exigible: boolean,
): Cruce | null {
  if (!iso?.concluyente) return null
  const m04 = iso.dimensiones.find((d) => d.id === 'ambiente')?.score ?? null

  if (!ley?.concluyente) {
    return {
      tono: 'aviso',
      titulo: 'Lectura de un solo instrumento',
      texto:
        'La ISO 26000 es autoevaluación: mide lo que la empresa cree de sí misma. Sin un formato legal que se contraste contra documentos verificables, no hay con qué confirmarla.',
    }
  }

  if (m04 !== null && m04 >= 3 && ley.score! <= 1.5) {
    return {
      tono: 'alerta',
      titulo: 'Inconsistencia entre lo declarado y lo verificable',
      texto:
        'La empresa se autoevalúa fuerte en gestión ambiental, pero no sostiene una obligación ambiental que se comprueba con radicados y certificados. La autoevaluación probablemente está sobreestimada.',
    }
  }
  if (m04 !== null && m04 <= 1.5 && exigible) {
    return {
      tono: 'alerta',
      titulo: 'Riesgo alto: obligación sin capacidad que la sostenga',
      texto:
        'Hay una obligación exigible sobre una base ambiental débil. Sembrar sin capacidad de mantenimiento y monitoreo a dos años es inversión perdida: primero conviene construir la capacidad.',
    }
  }
  if (iso.score! >= 2.5 && ley.score! <= 1.5) {
    return {
      tono: 'aviso',
      titulo: 'Tiene la maquinaria, falta activar este requisito',
      texto:
        'La gestión general está madura pero este requisito específico no se ha activado. Es una brecha corregible en meses, no un problema estructural.',
    }
  }
  if (iso.score! <= 1.5 && ley.score! <= 1.5) {
    return {
      tono: 'alerta',
      titulo: 'Requiere acompañamiento estructural',
      texto:
        'Ambos instrumentos son bajos. Un plan de siembra aislado no resolvería el fondo: falta la base de gestión sobre la que apoyarlo.',
    }
  }
  return {
    tono: 'bien',
    titulo: 'Lecturas coherentes entre sí',
    texto:
      'La madurez declarada y el cumplimiento verificable apuntan en la misma dirección. El plan puede concentrarse en cerrar brechas puntuales.',
  }
}

export function construirPlan(
  iso: ResultadoFormato | null,
  ley: ResultadoFormato | null,
  banderas: Bandera[],
  exigible: boolean,
): Prioridad[] {
  const criticas = new Set(banderas.flatMap((b) => HOJAS_CRITICAS[b.id] ?? []))
  const cand: Prioridad[] = []

  const agregar = (res: ResultadoFormato | null, origen: 'iso26000' | 'ley2173', etiqueta: string) => {
    if (!res) return
    for (const h of res.hojas) {
      if (h.valor === undefined || h.valor === 'NA') continue
      if (h.valor >= res.techo) continue
      cand.push({
        orden: 0, origen, etiquetaOrigen: etiqueta,
        dimension: h.dimension,
        verbo: VERBO[h.arquetipo],
        accion: h.accion,
        pregunta: h.texto,
        valor: h.valor,
        techo: res.techo,
        // La brecha se pondera: una materia pesada a media tabla importa más
        // que una liviana en cero.
        brecha: h.pesoGlobal * (res.techo - h.valor),
        critica: origen === 'ley2173' && criticas.has(h.id),
      })
    }
  }

  agregar(ley, 'ley2173', 'Ley 2173')
  agregar(iso, 'iso26000', 'ISO 26000')

  const rango = (p: Prioridad) => (p.critica ? 0 : p.origen === 'ley2173' && exigible ? 1 : 2)
  cand.sort((a, b) => rango(a) - rango(b) || b.brecha - a.brecha)

  return cand.slice(0, 3).map((p, i) => ({ ...p, orden: i + 1 }))
}
