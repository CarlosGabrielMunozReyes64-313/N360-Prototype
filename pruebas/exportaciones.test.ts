import { describe, expect, it } from 'vitest'
import { Packer } from 'docx'
import type { EmpresaDetalle, Estadisticas } from '../src/auth/adminApi'
import {
  aplanar, construirSecciones, maximoConteo, seccionesConDatos, ticksBonitos, totalBarras,
} from '../src/engine/agregados'
import { filasEtapas, seccionesPastel } from '../src/engine/vistasGraficas'
import { construirLibro } from '../src/export/excel'
import { construirDocumento } from '../src/export/word'

const INDICADORES = {
  empresas_con_tamizaje: 12, empresas_perfil_piloto: 7, empresas_con_diagnostico: 10, empresas_con_practicas: 9,
  practicas_registradas: 140, respuestas_diferente: 3, diferente_sin_clasificar: 1, respuestas_na: 4,
  materias_con_fortalecer: 25, comentarios_finales: 6,
}

const STATS: Estadisticas = {
  resumen: {
    empresas: 12, usuarios: 19, diagnosticos_totales: 21, diagnosticos_completados: 9,
  },
  empresas_por_sector: [
    { sector_id: 'G', nombre: 'Comercio al por mayor y al por menor', total: 7 },
    { sector_id: 'C', nombre: 'Industrias manufactureras', total: 5 },
  ],
  empresas_por_tamano: [
    { tamano: 'micro', total: 8 },
    { tamano: 'pequena', total: 4 },
  ],
  empresas_por_cliente: [
    { clientes: 'personas', total: 7 },
    { clientes: 'mezcla', total: 5 },
  ],
  diagnosticos_por_estado: [
    { formato_id: 'rse_express', estado: 'completado', total: 9 },
    { formato_id: 'rse_express', estado: 'borrador', total: 12 },
  ],
  respuestas_por_etapa: [
    { etapa: 'NA', total: 4 },
    { etapa: '2', total: 31 },
    { etapa: '0', total: 20 },
    { etapa: 'diferente', total: 3 },
  ],
  promedio_por_dimension: [
    { formato_id: 'rse_express', numero: '01', dimension: 'Gobernanza organizacional', promedio: 2.75, respuestas: 40 },
    { formato_id: 'rse_express', numero: '02', dimension: 'Derechos humanos', promedio: 1.2, respuestas: 36 },
    { formato_id: 'rse_express', numero: '04', dimension: 'Medio ambiente', promedio: 3.6, respuestas: 12 },
  ],
  indicadores: INDICADORES,
  empresas_por_personas: [{ rango: '1-9', total: 5 }, { rango: '10-50', total: 7 }],
  etapas_por_materia: [
    { numero: '01', materia: 'Gobernanza organizacional', etapa: '1', total: 6 },
    { numero: '01', materia: 'Gobernanza organizacional', etapa: '3', total: 2 },
    { numero: '04', materia: 'Medio ambiente', etapa: '0', total: 3 },
  ],
  practicas_por_materia: [
    { numero: '01', materia: 'Gobernanza organizacional', total: 14 },
    { numero: '04', materia: 'Medio ambiente', total: 0 },
  ],
  retos_por_materia: [{ numero: '04', materia: 'Medio ambiente', total: 3 }],
  alertas: { ley2173: 2, sst: 4, datos: 0, territorio: 1 },
}

const VACIAS: Estadisticas = {
  resumen: { empresas: 0, usuarios: 2, diagnosticos_totales: 0, diagnosticos_completados: 0 },
  empresas_por_sector: [],
  empresas_por_tamano: [],
  empresas_por_cliente: [],
  diagnosticos_por_estado: [],
  respuestas_por_etapa: [],
  promedio_por_dimension: [],
  indicadores: { ...INDICADORES, empresas_con_tamizaje: 0, practicas_registradas: 0 },
}

const EMPRESAS: EmpresaDetalle[] = [
  {
    empresa_id: 'e1', razon_social: 'Café del Sur S.A.S.', nit: '900123456', dv: '7',
    sector_id: 'C', sector_nombre: 'Industrias manufactureras', municipio: 'La Unión',
    departamento: 'Nariño', creado_en: '2026-03-01T14:00:00Z', anio: 2026,
    tamano: 'micro', ingresos_rango: null, personas: 8, vinculacion: ['laboral', 'socios'],
    vinculacion_detalle: null, zonas: ['rural'], territorio: 'Vereda La Palma', clientes: 'personas',
    clientes_detalle: null, perfil_piloto: false, diagnostico_estado: 'completado',
    diagnostico_actualizado_en: '2026-09-01T10:00:00Z', respuestas_con_etapa: 21,
    practicas_registradas: 15, pendientes_clasificar: 0,
  },
]

describe('agregados', () => {
  it('consolida las secciones del panel, incluidas las del RSE Express', () => {
    const secciones = construirSecciones(STATS)
    expect(secciones.map((s) => s.id)).toEqual([
      'resumen', 'sector', 'tamano', 'personas', 'clientes', 'estado', 'etapas',
      'practicas', 'retos', 'alertas', 'madurez', 'etapas_materia',
    ])
    // 4 del resumen + 2 + 2 + 2 + 2 + 2 + 4 + 2 + 1 + 3 alertas con valor + 3 + 3
    expect(totalBarras(secciones)).toBe(30)
    expect(secciones.find((s) => s.id === 'etapas_materia')!.escala).toBe('distribucion')
  })

  it('las alertas no van al pastel ni la tabla cruzada a las barras', () => {
    const secciones = seccionesConDatos(construirSecciones(STATS))
    expect(seccionesPastel(secciones).map((s) => s.id)).not.toContain('alertas')
    expect(seccionesPastel(secciones).map((s) => s.id)).not.toContain('etapas_materia')
    const filas = filasEtapas(secciones)
    expect(filas.map((f) => [f.materia, f.total])).toEqual([['01. Gobernanza organizacional', 8], ['04. Medio ambiente', 3]])
    expect(filas[0].segmentos.map((g) => g.porcentaje)).toEqual([75, 25])
  })

  it('funciona con un backend que todavía no manda las estadísticas nuevas', () => {
    const viejo: Estadisticas = {
      ...STATS, empresas_por_personas: undefined, etapas_por_materia: undefined,
      practicas_por_materia: undefined, retos_por_materia: undefined, alertas: undefined,
    }
    const ids = seccionesConDatos(construirSecciones(viejo)).map((s) => s.id)
    expect(ids).not.toContain('etapas_materia')
    expect(ids).toContain('madurez')
  })

  it('nombra tamaños, clientes y etapas en lenguaje de la empresa, en orden de etapa', () => {
    const secciones = construirSecciones(STATS)
    const de = (id: string) => secciones.find((s) => s.id === id)!.barras.map((b) => b.etiqueta)
    expect(de('tamano')).toEqual(['Micro', 'Pequeña'])
    expect(de('clientes')).toEqual(['Personas u hogares', 'Una mezcla'])
    expect(de('etapas')).toEqual(['Aún no abordado', 'Organizado', 'Algo diferente', 'No aplica'])
    expect(secciones.find((s) => s.id === 'madurez')!.barras[0].grupo).toBe('RSE Express')
  })

  it('el eje de conteo ignora los promedios de madurez', () => {
    // 31 respuestas en «organizado» es el conteo más alto; 3,6 de etapa
    // promedio no debe influir en el techo del eje izquierdo.
    expect(maximoConteo(construirSecciones(STATS))).toBe(31)
  })

  it('descarta las secciones sin datos para no dibujar huecos', () => {
    const secciones = seccionesConDatos(construirSecciones(VACIAS))
    expect(secciones.map((s) => s.id)).toEqual(['resumen'])
  })

  it('la tabla plana conserva una fila por barra', () => {
    const secciones = construirSecciones(STATS)
    const filas = aplanar(secciones)
    expect(filas).toHaveLength(totalBarras(secciones))
    expect(filas.at(-1)).toMatchObject({ seccion: 'Etapas por materia', unidad: 'respuestas', valor: 3 })
    expect(filas.find((f) => f.nota === '12 resp.')).toMatchObject({ unidad: 'escala 0–4' })
  })
})

describe('ticksBonitos', () => {
  it('siempre arranca en cero y cubre el máximo', () => {
    for (const max of [1, 3, 7, 21, 48, 137, 1004]) {
      const marcas = ticksBonitos(max)
      expect(marcas[0]).toBe(0)
      expect(marcas.at(-1)!).toBeGreaterThanOrEqual(max)
    }
  })

  it('usa pasos redondos', () => {
    expect(ticksBonitos(21)).toEqual([0, 5, 10, 15, 20, 25])
    expect(ticksBonitos(4)).toEqual([0, 1, 2, 3, 4])
  })

  it('no se rompe sin datos', () => {
    expect(ticksBonitos(0)).toEqual([0, 1])
  })
})

describe('exportación a Excel', () => {
  it('produce un .xlsx con todas las hojas', async () => {
    const libro = await construirLibro({
      stats: STATS,
      secciones: seccionesConDatos(construirSecciones(STATS)),
      empresas: EMPRESAS,
      grafica: null,
    })
    expect(libro.worksheets.map((h) => h.name)).toEqual([
      'Resumen', 'Gráfica (datos)', 'Empresas por sector', 'Empresas por tamaño',
      'Empresas por cliente', 'Respuestas por etapa', 'Etapas por materia', 'Prácticas y retos',
      'Alertas', 'Indicadores',
      'Diagnósticos por estado', 'Etapa promedio por materia', 'Detalle de empresas',
    ])

    const hojaSector = libro.getWorksheet('Empresas por sector')!
    // Fila 1 es el encabezado, así que los datos empiezan en la 2.
    expect(hojaSector.getRow(2).getCell(3).value).toBe(7)

    const buffer = await libro.xlsx.writeBuffer()
    const bytes = new Uint8Array(buffer as ArrayBuffer)
    // Firma de un archivo ZIP, que es lo que es un .xlsx por dentro.
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
    expect(bytes.length).toBeGreaterThan(5000)
  })

  it('no se cae cuando no hay ni una empresa', async () => {
    const libro = await construirLibro({
      stats: VACIAS,
      secciones: seccionesConDatos(construirSecciones(VACIAS)),
      empresas: [],
      grafica: null,
    })
    await expect(libro.xlsx.writeBuffer()).resolves.toBeDefined()
  })
})

describe('exportación a Word', () => {
  it('produce un .docx con dos secciones de página', async () => {
    const doc = construirDocumento({
      stats: STATS,
      secciones: seccionesConDatos(construirSecciones(STATS)),
      empresas: EMPRESAS,
      grafica: null,
      admin: 'Generado por Gabriel',
    })
    const buffer = await Packer.toBuffer(doc)
    expect([buffer[0], buffer[1]]).toEqual([0x50, 0x4b])
    expect(buffer.length).toBeGreaterThan(5000)
  })

  it('no se cae con el panel vacío', async () => {
    const doc = construirDocumento({
      stats: VACIAS,
      secciones: seccionesConDatos(construirSecciones(VACIAS)),
      empresas: [],
      grafica: null,
    })
    await expect(Packer.toBuffer(doc)).resolves.toBeDefined()
  })
})
