import type { Ref } from 'react'
import type { Seccion } from '../engine/agregados'
import type { Vista } from '../engine/vistasGraficas'
import { GraficaCampana } from './GraficaCampana'
import { GraficaGeneral } from './GraficaGeneral'
import { GraficaPastel } from './GraficaPastel'

interface Props {
  vista: Vista
  secciones: Seccion[]
  ancho: number
  conEncabezado?: boolean
  fecha?: string
  svgRef?: Ref<SVGSVGElement>
}

/** Una de las tres gráficas del panel, según la vista elegida. */
export function GraficaSegunVista({ vista, ...props }: Props) {
  if (vista === 'pastel') return <GraficaPastel {...props} />
  if (vista === 'campana') return <GraficaCampana {...props} />
  return <GraficaGeneral {...props} />
}
