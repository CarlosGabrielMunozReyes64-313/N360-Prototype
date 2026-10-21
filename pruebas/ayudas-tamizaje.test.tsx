import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { TamizajePaso } from '../src/components/TamizajePaso'
import { Cuestionario } from '../src/components/Cuestionario'
import { RSE_EXPRESS } from '../src/data/rseExpress'
import { PREGUNTAS_TAMIZAJE, TAMIZAJE_VACIO, VECINOS } from '../src/data/tamizaje'
import type { Diagnostico, Tamizaje } from '../src/types'

const COMPLETO_SIN_T5B: Tamizaje = {
  ...TAMIZAJE_VACIO, tamano: 'pequena', personas: '18', vinculacion: ['laboral'],
  zonas: ['barrios'], territorio: 'Barrio Centro', clientes: 'personas',
}

function Envoltorio({ inicial, onNext = () => {} }: { inicial: Tamizaje; onNext?: () => void }) {
  const [t, setT] = useState(inicial)
  return <TamizajePaso tamizaje={t} onChange={setT} onBack={() => {}} onNext={onNext} />
}

const globo = () => document.body.querySelector('.ayuda-globo')

describe('tamizaje: T5 dividida en dos preguntas', () => {
  it('muestra T5a y T5b por separado', () => {
    render(<Envoltorio inicial={TAMIZAJE_VACIO} />)
    expect(screen.getByText(PREGUNTAS_TAMIZAJE.T5a)).toBeInTheDocument()
    expect(screen.getByText('T5b')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Veredas' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Comunidades indígenas' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Comunidades o vecinos cercanos' })).toBeInTheDocument()
  })

  it('no deja continuar sin T5b y avisa a quien venía del tamizaje anterior', () => {
    const onNext = vi.fn()
    render(<Envoltorio inicial={COMPLETO_SIN_T5B} onNext={onNext} />)
    expect(screen.getByText(/Separamos una pregunta en dos/)).toBeInTheDocument()
    const continuar = screen.getByRole('button', { name: 'Continuar al autodiagnóstico' })
    expect(continuar).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Escuelas, centros de salud o iglesias' }))
    expect(continuar).toBeEnabled()
    fireEvent.click(continuar)
    expect(onNext).toHaveBeenCalled()
  })

  it('«No hay comunidades ni vecinos cerca» desmarca los demás vecinos', () => {
    render(<Envoltorio inicial={{ ...COMPLETO_SIN_T5B, zonas: ['barrios', 'viviendas'] }} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'No hay comunidades ni vecinos cerca' }))
    expect(screen.getByRole('checkbox', { name: 'Viviendas o familias vecinas' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Barrios' })).toBeChecked()
  })
})

describe('explicaciones al pasar el mouse', () => {
  it('cada opción se describe con su ayuda y la muestra al pasar el mouse', () => {
    vi.useFakeTimers()
    try {
      render(<Envoltorio inicial={TAMIZAJE_VACIO} />)
      const indigenas = screen.getByRole('checkbox', { name: 'Comunidades indígenas' })
      const ayuda = VECINOS.find((v) => v.id === 'indigenas')!.ayuda
      // Para lectores de pantalla: descripción, sin cambiar el nombre.
      expect(indigenas).toHaveAccessibleDescription(ayuda)

      fireEvent.mouseEnter(indigenas.closest('label')!)
      expect(globo()).toBeNull()
      act(() => { vi.advanceTimersByTime(200) })
      expect(globo()).toHaveTextContent(ayuda)

      // Solo un globo a la vez.
      fireEvent.mouseEnter(screen.getByRole('checkbox', { name: 'Veredas' }).closest('label')!)
      act(() => { vi.advanceTimersByTime(200) })
      expect(document.body.querySelectorAll('.ayuda-globo')).toHaveLength(1)
      expect(globo()).toHaveTextContent(/División del área rural/)

      fireEvent.mouseLeave(screen.getByRole('checkbox', { name: 'Veredas' }).closest('label')!)
      expect(globo()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('Escape cierra el globo y los botones de opción también explican', () => {
    vi.useFakeTimers()
    try {
      render(<Envoltorio inicial={TAMIZAJE_VACIO} />)
      const micro = screen.getByRole('button', { name: 'Micro' })
      expect(micro).toHaveAccessibleDescription(/hasta 10 personas/)
      fireEvent.mouseEnter(micro)
      act(() => { vi.advanceTimersByTime(200) })
      expect(globo()).not.toBeNull()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(globo()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('en el autodiagnóstico explica ejemplos, etapas y términos poco comunes', () => {
    const diag: Diagnostico = { respuestas: {}, fortalecer: {}, comentarioFinal: '' }
    render(
      <Cuestionario instrumento={RSE_EXPRESS} diagnostico={diag} tamizaje={COMPLETO_SIN_T5B} materiaInicial={4}
        onRespuesta={() => {}} onFortalecer={() => {}} onComentario={() => {}} onSalir={() => {}} />,
    )
    // 05a: ejemplo descriptivo con su ayuda.
    const regalos = screen.getByRole('checkbox', { name: /No aceptamos regalos, comisiones o favores/ })
    expect(regalos).toHaveAccessibleDescription(/comprometer una decisión/)
    // Etapas.
    const [aunNo] = screen.getAllByRole('radio', { name: 'Aún no lo hemos abordado' })
    expect(aunNo).toHaveAccessibleDescription(/punto de partida/)
    // Términos del glosario dentro de la pregunta, enfocables.
    const termino = screen.getAllByText('conflictos de interés').find((el) => el.classList.contains('termino'))!
    expect(termino).toHaveAttribute('tabindex', '0')
    expect(termino).toHaveAccessibleDescription(/familiar o un amigo/)
    // El texto de la pregunta sigue completo.
    expect(screen.getByText(/Cuéntenos cómo aborda actualmente la empresa/).closest('p'))
      .toHaveTextContent(RSE_EXPRESS.materias[4].preguntas[0].texto)
  })
})
