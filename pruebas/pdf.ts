// Genera un informe de ejemplo en /tmp/informe.pdf para revisarlo a ojo:
//   npx vite-node pruebas/pdf.ts
import { writeFileSync } from 'node:fs'
import { construirDoc, nombreArchivo } from '../src/export/pdf'
import { PREGUNTAS } from '../src/data/rseExpress'
import type { Diagnostico, Perfil, Tamizaje } from '../src/types'

const perfil: Perfil = { razonSocial: 'Agroindustrias del Guáitara S.A.S.', nit: '900123456', dv: '1', sector: 'agroindustrial', municipio: 'Pasto', departamento: 'Nariño', extranjera: false }
const tamizaje: Tamizaje = {
  tamano: 'pequena', ingresos: '1000m_10000m', personas: '32', vinculacion: ['laboral', 'temporada'],
  vinculacionDetalle: '8 personas en cosecha', zonas: ['veredas', 'indigenas'], territorio: 'Vereda Jamondino',
  clientes: 'mezcla', clientesDetalle: 'Tiendas y venta directa',
}
const etapas = [2, 1, 0, 3, 2, 'diferente', 1, 4, 'NA'] as const
const diagnostico: Diagnostico = {
  respuestas: Object.fromEntries(PREGUNTAS.map((p, i) => [p.id, {
    texto: i % 3 === 0 ? '' : `Práctica de ejemplo para ${p.id}`, ejemplos: p.ejemplos.slice(0, i % 3), otro: '', etapa: etapas[i % etapas.length],
  }])),
  fortalecer: { '04': 'Manejo de residuos de la planta', '07': 'Relación con la vereda' },
  comentarioFinal: 'Apoyamos la escuela de la vereda con transporte.',
}
const doc = construirDoc({ perfil, tamizaje, diagnostico, priorizacion: { filas: {}, elegida: null } })
const buf = Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
writeFileSync('/tmp/informe.pdf', buf)
console.log(`PDF generado: ${(buf.length / 1024).toFixed(1)} KB · ${doc.getNumberOfPages()} páginas · ${nombreArchivo(perfil)}`)
