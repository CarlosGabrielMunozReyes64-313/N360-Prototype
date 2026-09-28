import type {
  Alerta, Calificacion, Categoria, Diagnostico, HojaResultado, Instrumento, MateriaId,
  MateriaMapa, Nivel, NodoResultado, Oportunidad, PracticaMapa, Puntaje, RespuestaPregunta,
  ResultadoRSE, SectorId, Tamizaje,
} from '../types'
import { PESOS_SECTOR } from '../data/rseExpress'
import { VERBO_ETAPA } from '../data/escala'
import { consumidoresAplica } from '../data/tamizaje'

/**
 * Motor del Autodiagnóstico RSE Express.
 *
 * Reglas (secciones 6.2, 6.3 y 7 del protocolo):
 *  - La etapa que elige la empresa se lee internamente en 0–4. Esa lectura
 *    solo sirve para el análisis de NEXUS: a la empresa se le entrega un
 *    mapa de prácticas, fortalezas y oportunidades, no un puntaje.
 *  - «No aplica» no es cero: sale del cálculo y su peso se reparte.
 *  - «Hacemos algo diferente» queda fuera del cálculo hasta que NEXUS la
 *    clasifica; entonces cuenta con esa clasificación.
 *  - Consumidores sale completa si la empresa no vende a personas (T6).
 *  - Se conserva la tríada interna (A 0.30, D 0.35, E 0.35) y el juicio de
 *    materialidad por sector, que no se trasladan a la matriz.
 */

export const TOLERANCIA = 1e-4

/** Σ peso ≠ 1.0 impide usar un catálogo. En coma flotante hay que tolerar. */
export function pesosValidos(pesos: number[]): boolean {
  return Math.abs(pesos.reduce((a, b) => a + b, 0) - 1) < TOLERANCIA
}

export function pesosMateria(instr: Instrumento, sector: SectorId | ''): Record<string, number> {
  if (sector && PESOS_SECTOR[sector]) return PESOS_SECTOR[sector]
  const n = instr.materias.length
  return Object.fromEntries(instr.materias.map((m) => [m.id, 1 / n]))
}

/** Materias que el tamizaje deja fuera. */
export function materiasFuera(instr: Instrumento, tam: Tamizaje | null): Set<MateriaId> {
  const fuera = new Set<MateriaId>()
  for (const m of instr.materias)
    if (m.condicional === 'soloConsumidorFinal' && !consumidoresAplica(tam)) fuera.add(m.id)
  return fuera
}

/** Lectura interna de una respuesta, o null si no entra al cálculo. */
export function valorInterno(r: RespuestaPregunta | null | undefined): Nivel | null {
  if (!r || r.etapa === null || r.etapa === undefined || r.etapa === 'NA') return null
  if (r.etapa === 'diferente') return r.clasificada ?? null
  return r.etapa
}

export function describeAlgo(r: RespuestaPregunta | null | undefined): boolean {
  return Boolean(r && (r.texto.trim() || r.ejemplos.length > 0 || r.otro.trim()))
}

/**
 * Una pregunta está respondida cuando eligió la etapa y, salvo que haya
 * dicho «aún no lo hemos abordado» o «no aplica», contó algo de lo que
 * hace (texto, un ejemplo marcado o «algo diferente»). La pregunta abierta
 * es la parte principal; sin ella no hay práctica que reconocer.
 */
export function preguntaCompleta(r: RespuestaPregunta | null | undefined): boolean {
  if (!r || r.etapa === null || r.etapa === undefined) return false
  if (r.etapa === 'NA' || r.etapa === 0) return true
  return describeAlgo(r)
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

export function evaluar(
  instr: Instrumento, diag: Diagnostico, sector: SectorId | '', tam: Tamizaje | null,
): ResultadoRSE {
  const pesos = pesosMateria(instr, sector)
  const fuera = materiasFuera(instr, tam)
  const hojas: HojaResultado[] = []
  const materias: NodoResultado[] = []
  const nivelMateria: { peso: number; score: number | null; cobertura: number }[] = []
  let pendientes = 0

  for (const m of instr.materias) {
    const pesoM = pesos[m.id] ?? 0
    const aplica = !fuera.has(m.id)
    const items = m.preguntas.map((p) => {
      const r = diag.respuestas[p.id]
      const valor = aplica ? valorInterno(r) : null
      if (aplica && r?.etapa === 'diferente' && valor === null) pendientes++
      hojas.push({
        id: p.id, materiaId: m.id, materia: m.nombre, texto: p.texto,
        etapa: r?.etapa ?? null, valor, pesoGlobal: pesoM * p.peso, fueraDeAlcance: !aplica,
      })
      return { peso: p.peso, score: valor, cobertura: valor === null ? 0 : 1 }
    })
    const a = acumular(items)
    const score = a.covW > 0 ? a.num / a.covW : null
    const cobertura = a.totW > 0 ? a.covW / a.totW : 0
    materias.push({
      id: m.id, numero: m.numero, nombre: m.nombre, abrev: m.abrev,
      score, cobertura, pesoEfectivo: pesoM, aplica,
    })
    nivelMateria.push({ peso: pesoM, score, cobertura })
  }

  const a = acumular(nivelMateria)
  const score = a.covW > 0 ? a.num / a.covW : null
  const cobertura = a.totW > 0 ? a.covW / a.totW : 0
  return {
    score, cobertura,
    // Con más de la mitad del peso fuera del cálculo, la lectura diría más de lo que sabe.
    concluyente: score !== null && cobertura >= 0.5,
    materias, hojas, pendientes,
  }
}

export interface Progreso {
  total: number
  hechas: number
  completo: boolean
  porMateria: Record<string, { total: number; hechas: number }>
}

/** Preguntas respondidas, sin contar las de materias fuera de alcance. */
export function progreso(instr: Instrumento, diag: Diagnostico, tam: Tamizaje | null): Progreso {
  const fuera = materiasFuera(instr, tam)
  let total = 0, hechas = 0
  const porMateria: Progreso['porMateria'] = {}
  for (const m of instr.materias) {
    const pm = { total: 0, hechas: 0 }
    if (!fuera.has(m.id)) {
      for (const p of m.preguntas) {
        pm.total++
        if (preguntaCompleta(diag.respuestas[p.id])) pm.hechas++
      }
    }
    porMateria[m.id] = pm
    total += pm.total
    hechas += pm.hechas
  }
  return { total, hechas, completo: total > 0 && hechas === total, porMateria }
}

/* ------------------------------------------------------ mapa de prácticas */

export function categoriaDe(r: RespuestaPregunta | null | undefined): Categoria {
  if (!r || r.etapa === null || r.etapa === undefined) return 'pendiente'
  if (r.etapa === 'NA') return 'na'
  const v = valorInterno(r)
  if (v === null) return 'diferente'
  if (v >= 3) return 'fortaleza'
  if (v === 2) return 'desarrollo'
  return 'oportunidad'
}

function recortar(texto: string, max: number): string {
  const t = texto.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const corte = t.slice(0, max - 1)
  const espacio = corte.lastIndexOf(' ')
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trimEnd() + '…'
}

/** Lo que la empresa hace hoy, con sus palabras primero. */
export function haceHoy(r: RespuestaPregunta | null | undefined, max = 240): string {
  if (!r) return ''
  const partes: string[] = []
  if (r.texto.trim()) partes.push(r.texto.trim())
  if (r.ejemplos.length) partes.push(r.ejemplos.join(', '))
  if (r.otro.trim()) partes.push(r.otro.trim())
  if (partes.length) return recortar(partes.join(' · '), max)
  if (r.etapa === 0) return 'Aún no lo han abordado.'
  return ''
}

export function mapaPracticas(
  instr: Instrumento, diag: Diagnostico, sector: SectorId | '', tam: Tamizaje | null,
): MateriaMapa[] {
  const res = evaluar(instr, diag, sector, tam)
  return instr.materias.map((m) => {
    const nodo = res.materias.find((x) => x.id === m.id)!
    const practicas: PracticaMapa[] = m.preguntas.map((p) => {
      const r = diag.respuestas[p.id] ?? null
      return { pregunta: p, respuesta: r, categoria: nodo.aplica ? categoriaDe(r) : 'na', haceHoy: haceHoy(r) }
    })
    let categoria: MateriaMapa['categoria']
    if (!nodo.aplica) categoria = 'na'
    else if (nodo.score === null) {
      categoria = practicas.every((x) => x.categoria === 'na') ? 'na' : 'pendiente'
    } else if (nodo.score >= 2.5) categoria = 'fortaleza'
    else if (nodo.score >= 1.5) categoria = 'desarrollo'
    else categoria = 'oportunidad'
    return {
      materia: m, aplica: nodo.aplica, score: nodo.score, categoria, practicas,
      fortalecer: (diag.fortalecer[m.numero] ?? '').trim(),
    }
  })
}

/** Prácticas existentes registradas (indicador de H13): describió algo que
 * ya hace y no lo marcó como «aún no» ni «no aplica». */
export function practicasRegistradas(instr: Instrumento, diag: Diagnostico, tam: Tamizaje | null): number {
  const fuera = materiasFuera(instr, tam)
  let n = 0
  for (const m of instr.materias) {
    if (fuera.has(m.id)) continue
    for (const p of m.preguntas) {
      const r = diag.respuestas[p.id]
      if (!r || !describeAlgo(r) || r.etapa === 'NA' || r.etapa === 0 || r.etapa === null) continue
      n++
    }
  }
  return n
}

/* ---------------------------------------------- matriz de priorización */

/**
 * Oportunidades pre-diligenciadas para la conversación de priorización
 * (sección 7: «entre tres y cinco»). Candidatas: preguntas con etapa 0–3.
 * Orden: primero lo que tiene implicación legal en etapa inicial (se
 * presenta como oportunidad prioritaria, no como sanción), luego la brecha
 * ponderada con la lectura interna, con más peso donde la empresa escribió
 * qué quiere fortalecer. Máximo una por materia mientras haya variedad.
 */
export function oportunidades(
  instr: Instrumento, diag: Diagnostico, sector: SectorId | '', tam: Tamizaje | null, max = 5,
): Oportunidad[] {
  const pesos = pesosMateria(instr, sector)
  const fuera = materiasFuera(instr, tam)
  interface Cand { op: Oportunidad; orden: number; rango: number }
  const cand: Cand[] = []

  for (const m of instr.materias) {
    if (fuera.has(m.id)) continue
    const fortalecer = (diag.fortalecer[m.numero] ?? '').trim()
    for (const p of m.preguntas) {
      const r = diag.respuestas[p.id]
      const v = valorInterno(r)
      if (v === null || v >= 4) continue
      const brecha = (pesos[m.id] ?? 0) * p.peso * (4 - v) * (fortalecer ? 1.5 : 1)
      const legal = Boolean(p.alertaLegal && v <= 1)
      cand.push({
        op: {
          clave: p.id, materia: m, pregunta: p,
          haceHoy: haceHoy(r) || 'Sin descripción.',
          verbo: VERBO_ETAPA[v as 0 | 1 | 2 | 3],
          oportunidad: p.oportunidad,
          alternativas: p.alternativas,
          fortalecer,
          interesSugerido: fortalecer ? 3 : null,
          alertaLegal: p.alertaLegal,
        },
        orden: brecha,
        rango: legal ? 0 : 1,
      })
    }
  }
  cand.sort((a, b) => a.rango - b.rango || b.orden - a.orden || a.op.clave.localeCompare(b.op.clave))

  const elegidas: Cand[] = []
  const materias = new Set<string>()
  for (const c of cand) {
    if (elegidas.length >= max) break
    if (materias.has(c.op.materia.id)) continue
    elegidas.push(c)
    materias.add(c.op.materia.id)
  }
  // Si hay pocas materias con oportunidades, se completa hasta tres.
  for (const c of cand) {
    if (elegidas.length >= Math.min(3, max)) break
    if (!elegidas.includes(c)) elegidas.push(c)
  }
  return elegidas.map((c) => c.op)
}

export const CALIFICACION_VACIA: Calificacion = { importancia: null, viabilidad: null, potencial: null, interes: null }

/** Prioridad = suma simple de los cuatro criterios (4 a 12). null si falta alguno. */
export function sumaPrioridad(c: Calificacion | null | undefined): number | null {
  if (!c) return null
  const v = [c.importancia, c.viabilidad, c.potencial, c.interes]
  if (v.some((x) => x === null)) return null
  return (v as Puntaje[]).reduce((a, b) => a + b, 0)
}

/** La calificación con el interés sugerido cuando la empresa aún no lo puso. */
export function calificacionDe(o: Oportunidad, c: Calificacion | undefined): Calificacion {
  const base = c ?? CALIFICACION_VACIA
  return { ...base, interes: base.interes ?? o.interesSugerido }
}

/* ----------------------------------------------------- alertas informativas */

/**
 * Alertas informativas: el diagnóstico no es una auditoría ni verifica
 * cumplimiento legal (sección 1, fuera de alcance). Se muestran como
 * orientación para conversar con NEXUS.
 */
export function alertasInformativas(instr: Instrumento, diag: Diagnostico, tam: Tamizaje | null): Alerta[] {
  const out: Alerta[] = []
  const fuera = materiasFuera(instr, tam)
  const etapa = (id: string) => diag.respuestas[id]?.etapa ?? null
  const baja = (id: string) => {
    const e = etapa(id)
    return e === 0 || e === 1 || e === 'NA'
  }

  if (tam?.tamano === 'mediana' || tam?.tamano === 'nose') {
    out.push({
      id: 'ley2173',
      titulo: 'Ley 2173 de 2021 (Áreas de Vida)',
      detalle: (tam.tamano === 'mediana'
        ? 'Indicó que su empresa es mediana. '
        : 'Indicó que no está seguro del tamaño de su empresa. ')
        + 'Las medianas y grandes empresas tienen la obligación anual de sembrar dos árboles por cada '
        + 'trabajador en las Áreas de Vida que defina su municipio. Es solo una alerta informativa: '
        + 'NEXUS puede ayudarle a confirmar si le corresponde.',
    })
  }
  if (baja('03b')) {
    out.push({
      id: 'sst',
      titulo: 'Seguridad y salud en el trabajo',
      detalle:
        'En Colombia todo empleador debe implementar el Sistema de Gestión de Seguridad y Salud en el '
        + 'Trabajo (SG-SST), con estándares ajustados a su tamaño. Lo presentamos como una oportunidad '
        + 'prioritaria para conversar con NEXUS, no como una sanción: este diagnóstico no verifica cumplimiento.',
    })
  }
  if (!fuera.has('consumidores') && baja('06b')) {
    out.push({
      id: 'datos',
      titulo: 'Datos personales de sus clientes',
      detalle:
        'La Ley 1581 de 2012 regula cómo se recogen, guardan y usan los datos personales (por ejemplo, '
        + 'pedir autorización y tener una política de tratamiento). Si su empresa maneja datos de '
        + 'clientes, es una buena oportunidad para ponerse al día con orientación de NEXUS.',
    })
  }
  if (tam && (tam.zonas.includes('indigenas') || tam.zonas.includes('afro'))) {
    out.push({
      id: 'territorio',
      titulo: 'Operación cerca de comunidades étnicas',
      detalle:
        'Indicó que hay comunidades indígenas o afrodescendientes cerca de su operación. Conviene '
        + 'prestar especial atención al respeto de sus derechos y de sus formas de organización '
        + '(materias de Derechos humanos y Comunidad). NEXUS puede orientarle sobre si alguna '
        + 'actividad requiere procesos especiales de relacionamiento.',
    })
  }
  return out
}
