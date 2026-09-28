import type { NodoResultado } from '../types'

interface Props { dimensiones: NodoResultado[]; color?: string }

export function Radar({ dimensiones, color = '#04a97a' }: Props) {
  const n = dimensiones.length
  if (n < 3) return null

  const cx = 180, cy = 176, R = 128
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(ang(i)),
    cy + r * Math.sin(ang(i)),
  ]

  const anillos = [1, 2, 3, 4].map((k) => {
    const r = (R * k) / 4
    return Array.from({ length: n }, (_, i) => pt(i, r).join(',')).join(' ')
  })

  const datos = dimensiones
    .map((d, i) => pt(i, (R * (d.score ?? 0)) / 4).join(','))
    .join(' ')

  return (
    <svg viewBox="0 0 360 360" style={{ width: '100%', maxWidth: 360, height: 'auto' }} role="img"
      aria-label="Forma del punto de partida por materia (lectura interna, sin puntaje)">
      {anillos.map((p, i) => (
        <polygon key={i} points={p} fill="none" stroke="#dde7e2" strokeWidth={1} />
      ))}
      {dimensiones.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#dde7e2" strokeWidth={1} />
      })}
      <polygon points={datos} fill={color} fillOpacity={0.26} stroke={color} strokeWidth={2} />
      {dimensiones.map((d, i) => {
        const [x, y] = pt(i, R + 27)
        return (
          <text key={d.id} x={x} y={y} fill="#5a7068" fontSize={11}
            fontFamily="IBM Plex Mono, monospace" textAnchor="middle" dominantBaseline="middle">
            {d.abrev}
          </text>
        )
      })}
    </svg>
  )
}
