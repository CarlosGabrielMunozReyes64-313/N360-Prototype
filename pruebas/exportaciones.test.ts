import { describe, expect, it } from 'vitest'
import { Packer } from 'docx'
import type { EmpresaDetalle, Estadisticas } from '../src/auth/adminApi'
import {
  aplanar, construirSecciones, maximoConteo, seccionesConDatos, ticksBonitos, totalBarras,
} from '../src/engine/agregados'
import { construirLibro } from '../src/export/excel'
import { construirDocumento } from '../src/export/word'

const STATS: Estadisticas = {
  resumen: {
    empresas: 12, usuarios: 19, diagnosticos_totales: 21, diagnosticos_completados: 9,
  },
  empresas_por_sector: [
    { sector_id: 'G', nombre: 'Comercio al por mayor y al por menor', total: 7 },
    { sector_id: 'C', nombre: 'Industrias manufactureras', total: 5 },
  ],
  empresas_por_tamano: [
    { tamano: 'Microempresa', total: 8 },
    { tamano: 'Pequeña', total: 4 },
  ],
  diagnosticos_por_estado: [
    { formato_id: 'iso26000', estado: 'completado', total: 6 },
    { formato_id: 'iso26000', estado: 'borrador', total: 9 },
    { formato_id: 'ley2173', estado: 'completado', total: 3 },
    { formato_id: 'ley2173', estado: 'archivado', total: 3 },
  ],
  promedio_por_dimension: [
    { formato_id: 'iso26000', numero: '1', dimension: 'Gobernanza de la organización', promedio: 2.75, respuestas: 40 },
    { formato_id: 'iso26000', numero: '2', dimension: 'Derechos humanos', promedio: 1.2, respuestas: 36 },
    { formato_id: 'ley2173', numero: '1', dimension: 'Huella de carbono', promedio: 3.6, respuestas: 12 },
  ],
}

const VACIAS: Estadisticas = {
  resumen: { empresas: 0, usuarios: 2, diagnosticos_totales: 0, diagnosticos_completados: 0 },
  empresas_por_sector: [],
  empresas_por_tamano: [],
  diagnosticos_por_estado: [],
  promedio_por_dimension: [],
}

const EMPRESAS: EmpresaDetalle[] = [
  {
    empresa_id: 'e1', razon_social: 'Café del Sur S.A.S.', nit: '900123456', dv: '7',
    sector_id: 'C', sector_nombre: 'Industrias manufactureras', municipio: 'La Unión',
    departamento: 'Nariño', creado_en: '2026-03-01T14:00:00Z', anio: 2026,
    tamano: 'Microempresa', empleados: 8, areas_de_vida: 'Ambiental',
    ciclo_previo: false, comunidades_etnicas: null, consumidor_final: true,
    iso26000_estado: 'completado', ley2173_estado: null,
  },
]

describe('agregados', () => {
  it('consolida las cinco secciones del panel', () => {
    const secciones = construirSecciones(STATS)
    expect(secciones.map((s) => s.id)).toEqual([
      'resumen', 'sector', 'tamano', 'estado', 'madurez',
    ])
    // 4 del resumen + 2 + 2 + 4 + 3
    expect(totalBarras(secciones)).toBe(15)
  })

  it('el eje de conteo ignora los promedios de madurez', () => {
    // 21 diagnósticos iniciados es el conteo más alto; 3,6 de madurez no
    // debe influir en el techo del eje izquierdo.
    expect(maximoConteo(construirSecciones(STATS))).toBe(21)
  })

  it('descarta las secciones sin datos para no dibujar huecos', () => {
    const secciones = seccionesConDatos(construirSecciones(VACIAS))
    expect(secciones.map((s) => s.id)).toEqual(['resumen'])
  })

  it('la tabla plana conserva una fila por barra', () => {
    const secciones = construirSecciones(STATS)
    const filas = aplanar(secciones)
    expect(filas).toHaveLength(totalBarras(secciones))
    expect(filas.at(-1)).toMatchObject({ unidad: 'escala 0–4', nota: '12 resp.' })
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
      'Diagnósticos por estado', 'Madurez por dimensión', 'Detalle de empresas',
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
