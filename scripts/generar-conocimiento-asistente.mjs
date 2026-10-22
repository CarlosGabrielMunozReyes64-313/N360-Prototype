#!/usr/bin/env node
/**
 * Genera la base de conocimiento del asistente (chatbot) para el backend:
 * app/ia/asistente_conocimiento.py
 *
 * La fuente es la misma que usa la app: src/data/tamizaje.ts, escala.ts,
 * rseExpress.ts y glosario.ts. Si cambia una pregunta, una opción o una
 * ayuda, se vuelve a correr este script y se copia el archivo al backend:
 *
 *   node scripts/generar-conocimiento-asistente.mjs ../N360-PrototypeBACKEND-main/app/ia/asistente_conocimiento.py
 *
 * Qué NO entra (es de uso interno de NEXUS y el asistente no debe citarlo):
 * propósito de cada pregunta, arquetipo, pesos, lectura numérica 0–4,
 * pesos por sector ni las alternativas de la matriz.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destino = process.argv[2]
if (!destino) {
  console.error('Uso: node scripts/generar-conocimiento-asistente.mjs <ruta>/app/ia/asistente_conocimiento.py')
  process.exit(1)
}

// Los archivos de datos solo importan tipos: basta con transpilarlos.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n360-conocimiento-'))
async function cargar(nombre) {
  const fuente = fs.readFileSync(path.join(raiz, 'src/data', `${nombre}.ts`), 'utf8')
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const archivo = path.join(tmp, `${nombre}.mjs`)
  fs.writeFileSync(archivo, js)
  return import(pathToFileURL(archivo).href)
}

const tam = await cargar('tamizaje')
const esc = await cargar('escala')
const rse = await cargar('rseExpress')
const glo = await cargar('glosario')
fs.rmSync(tmp, { recursive: true, force: true })

const L = []
const opciones = (lista) => lista.forEach((o) => L.push(`  - «${o.nombre}»${o.ayuda ? `: ${o.ayuda}` : ''}`))
const P = tam.PREGUNTAS_TAMIZAJE
const consumidores = rse.MATERIAS.find((m) => m.id === 'consumidores')

L.push('# NEXUS 360° y el Autodiagnóstico RSE Express')
L.push('NEXUS 360° es una plataforma para empresas en Colombia (micro, pequeñas y medianas). El Autodiagnóstico RSE Express recorre las siete materias de la ISO 26000 con preguntas abiertas y en lenguaje sencillo. Toma unos 30 a 40 minutos.')
L.push('Es un autodiagnóstico, no una auditoría: no verifica cumplimiento legal ni constituye concepto jurídico. A la empresa no se le muestra un puntaje: recibe un mapa de prácticas, sus fortalezas, temas por empezar o formalizar y una matriz para priorizar un reto.')
L.push('Las respuestas se guardan solas a medida que se avanza; se puede salir y retomar después, y otra persona del equipo puede continuar con la misma cuenta.')
L.push('La ISO 26000 es una guía de aplicación voluntaria, no una norma certificable.')
L.push('El recorrido tiene cuatro pasos: 1) Perfil, 2) Tamizaje «Conozcamos su empresa», 3) Autodiagnóstico y 4) Resultados. Para pasar al siguiente paso hay que completar el anterior.')
L.push('Cuando el perfil y el tamizaje ya están completos, esos datos se cambian desde el menú de la cuenta → Configuración («Datos y tamizaje»); el cambio queda en el historial.')
L.push('')

L.push('# Paso 1 · Perfil (datos básicos de la empresa)')
L.push('Pide: razón social; NIT y dígito de verificación (DV), que aparece en el RUT (el NIT debe tener al menos 5 dígitos); sector (ayuda a leer las respuestas según la actividad de la empresa); departamento y municipio; y si es una sociedad extranjera constituida en Colombia.')
L.push(`Sectores: ${rse.SECTORES.map((s) => s.nombre).join(', ')}.`)
L.push('')

L.push('# Paso 2 · Tamizaje «Conozcamos su empresa»')
L.push('Cinco preguntas para conocer la realidad de la empresa. No pide documentos ni cifras exactas. Son obligatorias T1 (tamaño), T2 (número de personas y cómo están vinculadas), T5a (al menos un lugar o el texto), T5b (al menos una opción o el texto) y T6 (tipo de clientes). El rango de ingresos y los detalles en texto son opcionales.')
L.push(`- T1. ${P.T1} Opciones:`); opciones(tam.TAMANOS)
L.push(`- T1 (opcional). ${P.T1b}. Opciones: ${tam.RANGOS_INGRESOS.map((r) => `«${r.nombre}»`).join(', ')}.`)
L.push(`- T2. ${P.T2} Se escribe el número de personas (un número entero mayor que cero) y se marcan todas las formas de vinculación que apliquen:`); opciones(tam.VINCULACIONES)
L.push(`- T5a. ${P.T5a} Se marcan todos los que apliquen y se puede escribir el detalle:`); opciones(tam.LUGARES)
L.push(`- T5b. ${P.T5b} Se marcan todos los que apliquen y se puede escribir el detalle. «No hay comunidades ni vecinos cerca» desmarca las demás opciones de esta pregunta:`); opciones(tam.VECINOS)
L.push(`- T6. ${P.T6} Opciones:`); opciones(tam.CLIENTES)
L.push(`- Si la empresa le vende solo a «Otras empresas» o a «Entidades públicas», la materia ${consumidores.numero} «${consumidores.nombre}» no se pregunta ni cuenta en los resultados.`)
L.push('')

L.push('# Paso 3 · Autodiagnóstico RSE Express')
L.push('Se entra por la portada del autodiagnóstico, que muestra el avance de cada materia. Se puede abrir cualquier materia, responder en el orden que se quiera y usar «Guardar y volver» para regresar a la portada.')
L.push('Cómo se responde cada pregunta:')
L.push('- «Cuéntenos con sus palabras»: respuesta abierta sobre lo que la empresa hace hoy. No hay respuestas correctas ni incorrectas; sirve contar ejemplos concretos (qué hacen, quién lo hace, cada cuánto).')
L.push('- Ejemplos orientadores (opcionales, se marcan los que apliquen): ayudan a recordar. Si un ejemplo no describe a la empresa, no se marca.')
L.push('- «Hacemos algo diferente: ___»: para contar una práctica propia que no aparece en los ejemplos.')
L.push('- «¿En qué punto está?»: una sola opción. Opciones:')
for (const e of esc.ETAPAS) L.push(`  - «${e.etiqueta}»: ${e.explicacion}${e.ayuda ? ` ${e.ayuda}` : ''}`)
L.push('- Una pregunta queda completa con la etapa elegida y algo de lo que hacen (texto, un ejemplo marcado o «Hacemos algo diferente»), salvo que la etapa sea «Aún no lo hemos abordado» o «No aplica a nuestra empresa», que no necesitan texto.')
L.push('- «Hacemos algo diferente» y «No aplica a nuestra empresa» también son respuestas válidas.')
L.push('- Al final de cada materia hay una pregunta abierta sobre lo que la empresa quiere fortalecer o empezar a hacer en ese tema. Lo que se escriba ahí sugiere el «interés» en la matriz de priorización.')
L.push(`- Para terminar hay una pregunta final: «${rse.RSE_EXPRESS.preguntaFinal}»`)
L.push('- Cuando todas las preguntas están completas aparece «Ver mi mapa de resultados».')
L.push('')
L.push('## Materias y preguntas')
for (const m of rse.MATERIAS) {
  const condicion = m.id === 'consumidores' ? ' (solo aplica si la empresa le vende a personas u hogares, o a una mezcla)' : ''
  L.push(`### ${m.numero} · ${m.nombre}${condicion}`)
  L.push(m.descripcion)
  for (const p of m.preguntas) {
    L.push(`- Pregunta ${p.id}: ${p.texto}`)
    if (p.ejemplos?.length) L.push(`  Ejemplos orientadores: ${p.ejemplos.map((x) => `«${x.texto}»`).join('; ')}.`)
  }
  L.push(`- Cierre de la materia: ${m.cierre}`)
}
L.push('')

L.push('# Paso 4 · Resultados')
L.push('- Mapa de prácticas: lo que la empresa ya hace en cada materia, con sus propias palabras, y su punto de partida por materia en una gráfica que es una referencia visual, no un puntaje.')
L.push('- Categorías: «Fortaleza» (prácticas en «Lo aplicamos y vemos resultados» o «Lo revisamos y mejoramos con lo aprendido»), «En desarrollo» («Lo tenemos organizado»), «Oportunidad» («Aún no lo hemos abordado» o «Estamos comenzando / Lo hacemos de manera informal»), «Práctica propia» («Hacemos algo diferente»: el equipo NEXUS la revisa y la ubica) y «No aplica» (sale del análisis y no cuenta como un cero).')
L.push('- Matriz de priorización: propone de 3 a 5 oportunidades, máximo una por materia; primero los temas con implicaciones legales que están en etapa inicial. Cada oportunidad trae un verbo según la etapa de partida: Empezar, Formalizar, Fortalecer o Ampliar. La empresa califica cada una de 1 (bajo) a 3 (alto) en cuatro criterios y elige la que quiere convertir en su reto. La suma orienta, pero no reemplaza su decisión; si hay empate, pesa más el interés de la empresa.')
L.push('  - Importancia: ¿qué tan relevante es para la empresa y sus grupos de interés?')
L.push('  - Viabilidad: ¿qué tan posible es hacerlo con los recursos actuales?')
L.push('  - Potencial de mejora: ¿cuánto puede cambiar si se trabaja?')
L.push('  - Interés de la empresa: ¿qué tanto quiere la empresa trabajar en esto? Se sugiere alto donde la empresa escribió qué quiere fortalecer.')
L.push('- Cada oportunidad trae «Alternativas para conversar con NEXUS»: son ideas para la conversación, no recomendaciones validadas.')
L.push('- Siguiente paso: con NEXUS, la oportunidad elegida se convierte en un reto («¿Cómo podríamos…?») y un microproyecto de 4 a 8 semanas, con un responsable y un indicador sencillo.')
L.push('- Alertas informativas (no son sanciones): Ley 2173 si el tamaño es «Mediana» o «No estoy seguro»; Seguridad y Salud en el Trabajo (SG-SST) y protección de datos personales (Ley 1581 de 2012) si esas prácticas están en etapa inicial o marcadas como «No aplica»; comunidades étnicas si el tamizaje marca comunidades indígenas o afrodescendientes cerca.')
L.push('- Análisis inteligente: una interpretación con IA (Gemini) de los resultados que ya calculó la plataforma. No cambia el mapa, las categorías ni el orden de la matriz.')
L.push('- Informe en PDF: «Descargar informe (PDF)» con el mapa, las fortalezas, la matriz, las alertas y, si está listo, el análisis inteligente.')
L.push('- Cada diagnóstico queda guardado en el espacio de la empresa para comparar el avance de un año al siguiente.')
L.push('')

L.push('# Glosario')
for (const g of glo.GLOSARIO) L.push(`- ${g.formas[0]}: ${g.definicion}`)

const texto = L.join('\n')
if (texto.includes('"""')) throw new Error('El texto no puede contener comillas triples')

const py = `"""Base de conocimiento del asistente de NEXUS 360° (chatbot de la empresa).

ARCHIVO GENERADO por el frontend (scripts/generar-conocimiento-asistente.mjs)
a partir de src/data/tamizaje.ts, escala.ts, rseExpress.ts y glosario.ts:
no se edita a mano. Si cambia una pregunta, una opción o una ayuda, se vuelve
a generar y se sube VERSION_ASISTENTE en app/ia/asistente.py.

No incluye lo que es de uso interno de NEXUS (propósito de cada pregunta,
arquetipos, pesos, lectura numérica 0–4 ni alternativas de la matriz).
"""

# Número → nombre de cada materia: valida el contexto de pantalla que manda el front.
MATERIAS = {
${rse.MATERIAS.map((m) => `    ${JSON.stringify(m.numero)}: ${JSON.stringify(m.nombre)},`).join('\n')}
}

CONOCIMIENTO = """\\
${texto.replace(/\\/g, '\\\\')}
"""
`
fs.writeFileSync(destino, py)
console.log(`Escrito ${destino} (${texto.length} caracteres de conocimiento).`)
