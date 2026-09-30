// Genera un informe de ejemplo en /tmp/informe.pdf para revisarlo a ojo:
//   npx vite-node pruebas/pdf.ts
import { writeFileSync } from 'node:fs'
import { construirDoc, nombreArchivo } from '../src/export/pdf'
import { PREGUNTAS } from '../src/data/rseExpress'
import type { AnalisisIAGuardado, Diagnostico, Perfil, Tamizaje } from '../src/types'

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
// Análisis IA de ejemplo (en la app lo genera Gemini en el backend). Para
// ver el informe sin esa sección:  SIN_IA=1 npx vite-node pruebas/pdf.ts
const analisisIA: AnalisisIAGuardado | null = process.env.SIN_IA ? null : {
  generadoEn: new Date().toISOString(), modelo: 'gemini-3.5-flash-lite', reutilizado: false,
  analisis: {
    resumen: 'La empresa ya realiza prácticas en varias materias, con fortalezas en gobernanza y comunidad. '
      + 'La principal oportunidad está en seguridad y salud en el trabajo, que aún no ha abordado.',
    fortalezas: ['La gerencia impulsa las acciones con la comunidad.', 'Revisa y mejora el apoyo a la vereda.'],
    areasOportunidad: ['Seguridad y salud en el trabajo.', 'Manejo de residuos de la planta.'],
    prioridades: ['Empezar el SG-SST con apoyo de la ARL.', 'Formalizar el manejo de residuos.'],
    recomendaciones: [{
      titulo: 'Designar un responsable de seguridad y salud', prioridad: 'alta', materia: '03',
      descripcion: 'Nombrar a una persona que coordine, con asesoría de la ARL, la evaluación inicial del SG-SST.',
      justificacion: 'La práctica 03b está en «Aún no lo hemos abordado» y es la primera prioridad de la matriz.',
    }],
    accionesCortoPlazo: [{ accion: 'Solicitar a la ARL la evaluación inicial', objetivo: 'Saber por dónde empezar', horizonte: '4 a 8 semanas', prioridad: 'alta' }],
    accionesMedianoPlazo: [{ accion: 'Implementar un plan de manejo de residuos', objetivo: 'Reducir lo que llega al relleno', horizonte: '6 meses', prioridad: 'media' }],
    conclusion: 'Con un primer reto en seguridad y salud en el trabajo, la empresa puede avanzar de forma concreta este año.',
  },
}
const doc = construirDoc({ perfil, tamizaje, diagnostico, priorizacion: { filas: {}, elegida: null }, analisisIA })
const buf = Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
writeFileSync('/tmp/informe.pdf', buf)
console.log(`PDF generado: ${(buf.length / 1024).toFixed(1)} KB · ${doc.getNumberOfPages()} páginas · ${nombreArchivo(perfil)}`)
