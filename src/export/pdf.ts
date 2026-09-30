import { jsPDF } from 'jspdf'
import type { AccionIA, AnalisisIAGuardado, Diagnostico, Perfil, Priorizacion, Tamizaje } from '../types'
import { RSE_EXPRESS, SECTORES } from '../data/rseExpress'
import { CATEGORIAS, etiquetaEtapa } from '../data/escala'
import {
  nombreCliente, nombreIngresos, nombreTamano, nombresVinculacion, nombresZonas,
} from '../data/tamizaje'
import {
  alertasInformativas, calificacionDe, mapaPracticas, oportunidades, practicasRegistradas, sumaPrioridad,
} from '../engine/scoring'

/**
 * Informe para la empresa: «Mapa de prácticas actuales, fortalezas y
 * oportunidades» (sección 6.3) con la matriz de priorización (sección 7).
 * Como en pantalla, no lleva puntaje de cumplimiento.
 *
 * Si hay análisis inteligente (Gemini), se agrega al final como una sección
 * aparte; si no lo hay (no cargó, falló o el servidor no tiene clave), el
 * informe sale completo sin ella.
 */
export interface DatosInforme {
  perfil: Perfil
  tamizaje: Tamizaje
  diagnostico: Diagnostico
  priorizacion: Priorizacion
  analisisIA?: AnalisisIAGuardado | null
  fecha?: Date
}

const PRIORIDAD_IA = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja' } as const

const VERDE: [number, number, number] = [2, 64, 41]
const TEXTO: [number, number, number] = [26, 46, 36]
const GRIS: [number, number, number] = [90, 112, 104]
const MARGEN = 18
const ANCHO = 210 - MARGEN * 2
const ALTO_UTIL = 297 - 20

/** Las fuentes estándar de jsPDF usan WinAnsi: se cambian los caracteres
 * que no existen ahí por equivalentes. */
export function limpiarTexto(t: string): string {
  return t
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/✓/g, 'x')
    .split('')
    .filter((c) => {
      const n = c.charCodeAt(0)
      return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 126) || (n >= 160 && n <= 255)
    })
    .join('')
}

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function construirDoc(d: DatosInforme): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { perfil, tamizaje, diagnostico, priorizacion } = d
  const fecha = d.fecha ?? new Date()
  let y = 0

  const saltoSiHaceFalta = (alto: number) => {
    if (y + alto > ALTO_UTIL) { doc.addPage(); y = 20 }
  }
  const parrafo = (texto: string, o: { size?: number; bold?: boolean; color?: [number, number, number]; sangria?: number; despues?: number } = {}) => {
    const size = o.size ?? 10
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(o.color ?? TEXTO))
    const lineas = doc.splitTextToSize(limpiarTexto(texto), ANCHO - (o.sangria ?? 0)) as string[]
    const alto = size * 0.42
    for (const l of lineas) {
      saltoSiHaceFalta(alto)
      doc.text(l, MARGEN + (o.sangria ?? 0), y)
      y += alto
    }
    y += o.despues ?? 1.5
  }
  // Cada título reserva espacio para sí mismo (~14 mm) y para el primer
  // bloque que lo sigue: así nunca queda solo al pie de una página. Por
  // defecto, dos líneas de texto; las secciones con bloques más altos
  // (materias, oportunidades, recomendaciones) piden más.
  const titulo = (texto: string, reserva = 26) => {
    saltoSiHaceFalta(reserva)
    y += 3
    parrafo(texto, { size: 13, bold: true, color: VERDE, despues: 1 })
    doc.setDrawColor(...VERDE)
    doc.setLineWidth(0.3)
    doc.line(MARGEN, y, MARGEN + ANCHO, y)
    y += 4
  }
  const subtitulo = (texto: string) => {
    saltoSiHaceFalta(20)
    y += 1.5
    parrafo(texto, { size: 11, bold: true, color: VERDE, despues: 1.2 })
  }
  const vinetas = (items: string[], numeradas = false) => {
    items.forEach((t, i) => parrafo(`${numeradas ? `${i + 1}.` : '-'} ${t}`, { size: 9.5, sangria: 2, despues: 1 }))
    y += 1
  }

  // Encabezado
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text('NEXUS 360° - Autodiagnóstico RSE Express', MARGEN, 13)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(limpiarTexto('Mapa de prácticas actuales, fortalezas y oportunidades'), MARGEN, 20)
  doc.text(fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), MARGEN, 25.5)
  y = 40

  // Empresa y tamizaje
  const sector = SECTORES.find((s) => s.id === perfil.sector)?.nombre ?? '—'
  parrafo(perfil.razonSocial || 'Empresa', { size: 14, bold: true, despues: 0.5 })
  parrafo(`NIT ${perfil.nit}${perfil.dv ? '-' + perfil.dv : ''} · ${sector} · ${perfil.municipio}${perfil.departamento ? ', ' + perfil.departamento : ''}`, { color: GRIS, despues: 3 })
  parrafo(`Tamaño: ${nombreTamano(tamizaje.tamano)}${tamizaje.ingresos ? ` (ingresos: ${nombreIngresos(tamizaje.ingresos).toLowerCase()})` : ''}`, { size: 9.5, despues: 0.5 })
  parrafo(`Personas que trabajan con la empresa: ${tamizaje.personas} (${nombresVinculacion(tamizaje.vinculacion).toLowerCase()})`, { size: 9.5, despues: 0.5 })
  parrafo(`Territorio: ${[nombresZonas(tamizaje.zonas), tamizaje.territorio.trim()].filter((x) => x && x !== '—').join('. ') || '—'}`, { size: 9.5, despues: 0.5 })
  parrafo(`Clientes: ${nombreCliente(tamizaje.clientes)}${tamizaje.clientesDetalle.trim() ? ` - ${tamizaje.clientesDetalle.trim()}` : ''}`, { size: 9.5, despues: 3 })

  parrafo(
    'Este informe resume lo que la empresa ya hace, sus fortalezas y sus oportunidades. No es una '
    + 'calificación ni una verificación de cumplimiento legal: es el punto de partida para elegir un reto con NEXUS.',
    { size: 9.5, color: GRIS, despues: 2 },
  )

  const mapa = mapaPracticas(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje)
  const practicas = mapa.flatMap((m) => (m.aplica ? m.practicas : []))
  parrafo(
    `Prácticas que ya realiza: ${practicasRegistradas(RSE_EXPRESS, diagnostico, tamizaje)} · `
    + `Fortalezas: ${practicas.filter((p) => p.categoria === 'fortaleza').length} · `
    + `Temas por empezar o formalizar: ${practicas.filter((p) => p.categoria === 'oportunidad').length}`,
    { bold: true, despues: 2 },
  )

  // Mapa por materia
  titulo('Mapa de prácticas por materia', 32)
  for (const m of mapa) {
    saltoSiHaceFalta(16)
    const cat = CATEGORIAS[m.categoria]
    doc.setFillColor(...hexARgb(cat.color))
    doc.circle(MARGEN + 1.5, y - 1.3, 1.3, 'F')
    parrafo(`${m.materia.numero} ${m.materia.nombre} - ${m.aplica ? cat.nombre : 'No aplica (sus clientes no son personas u hogares)'}`, { size: 11, bold: true, sangria: 5, despues: 1 })
    if (!m.aplica) { y += 1; continue }
    for (const pr of m.practicas) {
      const estado = pr.respuesta?.etapa === 'diferente'
        ? `Hacemos algo diferente${pr.respuesta.clasificada != null ? ` (NEXUS: ${etiquetaEtapa(pr.respuesta.clasificada, true)})` : ' (por revisar)'}`
        : etiquetaEtapa(pr.respuesta?.etapa, true)
      parrafo(`${pr.pregunta.id} · ${estado}`, { size: 9, bold: true, sangria: 5, despues: 0.3 })
      parrafo(pr.haceHoy || 'Sin descripción.', { size: 9, sangria: 5, despues: 1.2 })
    }
    if (m.fortalecer) parrafo(`Quiere fortalecer: ${m.fortalecer}`, { size: 9, sangria: 5, color: GRIS, despues: 2 })
    y += 1
  }

  // Fortalezas y temas por empezar: los mismos que cuenta el resumen de
  // arriba y que muestra la pantalla (categorías del motor).
  const fortalezas = practicas.filter((p) => p.categoria === 'fortaleza')
  if (fortalezas.length) {
    titulo('Sus fortalezas')
    vinetas(fortalezas.map((f) => {
      const materia = RSE_EXPRESS.materias.find((m) => m.preguntas.includes(f.pregunta))?.nombre ?? ''
      return `${materia}: ${f.haceHoy || etiquetaEtapa(f.respuesta?.etapa)}`
    }))
  }
  const porEmpezar = practicas.filter((p) => p.categoria === 'oportunidad')
  if (porEmpezar.length) {
    titulo('Temas por empezar o formalizar')
    vinetas(porEmpezar.map((o) => {
      const materia = RSE_EXPRESS.materias.find((m) => m.preguntas.includes(o.pregunta))?.nombre ?? ''
      return `${materia} (${o.pregunta.id}, ${etiquetaEtapa(o.respuesta?.etapa, true).toLowerCase()}): ${o.pregunta.texto}`
    }))
  }

  // Matriz de priorización
  titulo('Matriz de priorización', 44)
  const ops = oportunidades(RSE_EXPRESS, diagnostico, perfil.sector, tamizaje)
  if (ops.length === 0) {
    parrafo('No hay temas en etapa inicial. En la conversación con NEXUS pueden elegir uno para ampliar.', { size: 9.5 })
  }
  parrafo('Escala de 1 (bajo) a 3 (alto). Prioridad = suma de los cuatro criterios (4 a 12).', { size: 8.5, color: GRIS, despues: 2 })
  for (const o of ops) {
    const c = calificacionDe(o, priorizacion.filas[o.clave])
    const n = (v: number | null) => (v === null ? '-' : String(v))
    const suma = sumaPrioridad(c)
    const elegida = priorizacion.elegida === o.clave
    saltoSiHaceFalta(22)
    parrafo(`${elegida ? '[ELEGIDA] ' : ''}${o.materia.numero} · ${o.verbo}: ${o.oportunidad}`, { size: 10, bold: true, despues: 0.5 })
    parrafo(`Lo que hace hoy: ${o.haceHoy}`, { size: 9, sangria: 4, despues: 0.5 })
    parrafo(`Importancia ${n(c.importancia)} · Viabilidad ${n(c.viabilidad)} · Potencial ${n(c.potencial)} · Interés ${n(c.interes)} · Prioridad ${suma ?? '-'}${suma !== null ? '/12' : ''}`, { size: 9, sangria: 4, color: GRIS, despues: 0.5 })
    parrafo(`Alternativas: ${o.alternativas.join('; ')}.`, { size: 8.5, sangria: 4, color: GRIS, despues: 2.5 })
  }

  const alertas = alertasInformativas(RSE_EXPRESS, diagnostico, tamizaje)
  if (alertas.length) {
    titulo('Alertas informativas')
    for (const a of alertas) {
      parrafo(a.titulo, { size: 10, bold: true, despues: 0.5 })
      parrafo(a.detalle, { size: 9, despues: 2.5 })
    }
  }

  if (diagnostico.comentarioFinal.trim()) {
    titulo('Otras prácticas que nos contó')
    parrafo(diagnostico.comentarioFinal.trim(), { size: 9.5 })
  }

  // Análisis inteligente (capa 2): interpretación con IA de lo anterior.
  const ia = d.analisisIA?.analisis
  if (ia) {
    const generado = d.analisisIA?.generadoEn ? new Date(d.analisisIA.generadoEn) : null
    titulo('Análisis inteligente')
    parrafo(
      'Interpretación generada con inteligencia artificial (Gemini) a partir de los resultados de este informe'
      + (generado && !Number.isNaN(generado.getTime())
        ? ` el ${generado.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : '')
      + '. No modifica el mapa de prácticas ni la matriz de priorización y puede contener imprecisiones: '
      + 'revísela con el equipo NEXUS antes de tomar decisiones.',
      { size: 8.5, color: GRIS, despues: 2 },
    )
    subtitulo('Resumen ejecutivo')
    parrafo(ia.resumen, { size: 9.5, despues: 2 })
    if (ia.fortalezas.length) { subtitulo('Fortalezas'); vinetas(ia.fortalezas) }
    if (ia.areasOportunidad.length) { subtitulo('Áreas de oportunidad'); vinetas(ia.areasOportunidad) }
    if (ia.prioridades.length) { subtitulo('Prioridades'); vinetas(ia.prioridades, true) }

    if (ia.recomendaciones.length) {
      titulo('Recomendaciones', 36)
      ia.recomendaciones.forEach((r, i) => {
        const materia = RSE_EXPRESS.materias.find((m) => m.numero === r.materia)
        saltoSiHaceFalta(20)
        parrafo(`${i + 1}. ${r.titulo}`, { size: 10, bold: true, despues: 0.4 })
        parrafo(`${PRIORIDAD_IA[r.prioridad]} · ${materia ? `${materia.numero} ${materia.nombre}` : 'Transversal'}`,
          { size: 8.5, color: GRIS, sangria: 4, despues: 0.6 })
        parrafo(r.descripcion, { size: 9.5, sangria: 4, despues: 0.6 })
        parrafo(`Por qué: ${r.justificacion}`, { size: 9, sangria: 4, color: GRIS, despues: 2.5 })
      })
    }
    const acciones = (nombre: string, lista: AccionIA[]) => {
      if (!lista.length) return
      titulo(nombre, 30)
      for (const a of lista) {
        saltoSiHaceFalta(14)
        parrafo(`- ${a.accion}`, { size: 9.5, bold: true, despues: 0.4 })
        parrafo(`Objetivo: ${a.objetivo}`, { size: 9, sangria: 4, despues: 0.4 })
        parrafo(`Horizonte: ${a.horizonte} · ${PRIORIDAD_IA[a.prioridad]}`, { size: 8.5, sangria: 4, color: GRIS, despues: 2 })
      }
    }
    acciones('Acciones a corto plazo', ia.accionesCortoPlazo)
    acciones('Acciones a mediano plazo', ia.accionesMedianoPlazo)
    if (ia.conclusion) {
      titulo('Conclusión')
      parrafo(ia.conclusion, { size: 9.5 })
    }
  }

  y += 4
  parrafo(
    'Autodiagnóstico, no auditoría: no verifica cumplimiento legal ni constituye concepto jurídico. '
    + 'Base: ISO 26000 (7 materias) y Protocolo de Validación NEXUS RSE Express + RSE por Retos.',
    { size: 8, color: GRIS },
  )

  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS)
    doc.text(`NEXUS 360° · ${limpiarTexto(perfil.razonSocial)} · Página ${i} de ${total}`, MARGEN, 290)
  }
  return doc
}

export function nombreArchivo(perfil: Perfil): string {
  const base = (perfil.razonSocial || 'empresa')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'empresa'
  return `NEXUS360_RSE_Express_${base}.pdf`
}

export function generarInforme(d: DatosInforme) {
  construirDoc(d).save(nombreArchivo(d.perfil))
}
