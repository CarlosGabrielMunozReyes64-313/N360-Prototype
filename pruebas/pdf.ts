import { construirDoc, nombreArchivo } from '../src/export/pdf'
import { FORMATO_01 } from '../src/data/formato01'
import { FORMATO_02 } from '../src/data/formato02'
import { construirPlan, evaluarBanderas, evaluarFormato, lecturaCruzada } from '../src/engine/scoring'
import type { Perfil, Respuestas, Tamizaje, Valor } from '../src/types'
import { writeFileSync } from 'node:fs'

const tam: Tamizaje = { tamano: 'grande', empleados: '120', areasDeVida: 'si', cicloPrevio: 'no', comunidadesEtnicas: 'si', consumidorFinal: 'si' }
const perfil: Perfil = { razonSocial: 'Agroindustrias del Guáitara S.A.S.', nit: '900123456', dv: '1', sector: 'agroindustrial', municipio: 'Pasto', departamento: 'Nariño', extranjera: false }

const r: Respuestas = {}
let i = 0
for (const f of [FORMATO_01, FORMATO_02])
  for (const d of f.dimensiones) for (const s of d.secciones) for (const p of s.preguntas)
    r[p.id] = ([3, 2, 1, 3, 0, 2] as Valor[])[i++ % 6]
r['4.4'] = 1

const iso = evaluarFormato(FORMATO_01, r, 'agroindustrial', tam)
const ley = evaluarFormato(FORMATO_02, r, 'agroindustrial', tam)
const banderas = evaluarBanderas(ley)
const doc = construirDoc({
  perfil, tamizaje: tam, iso, ley, leyAplica: true, leyExigible: true, motivoLey: '',
  cruce: lecturaCruzada(iso, ley, true), banderas,
  plan: construirPlan(iso, ley, banderas, true),
})
const buf = Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
writeFileSync('/tmp/informe.pdf', buf)
console.log(`PDF generado: ${(buf.length / 1024).toFixed(1)} KB · ${doc.getNumberOfPages()} páginas · ${nombreArchivo(perfil)}`)
console.log(`ISO ${iso.score?.toFixed(2)} · Ley ${ley.score?.toFixed(2)}/${ley.techo} · ${banderas.length} banderas`)
