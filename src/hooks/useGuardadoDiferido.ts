import { useEffect, useRef } from 'react'

/**
 * Guarda `valor` en el backend cuando la persona deja de cambiarlo.
 *
 * Resuelve tres problemas del guardado en cada tecla/clic:
 *
 *  1. Volumen — sin esto, responder un diagnóstico de 47 preguntas dispara
 *     casi cien escrituras completas. Con un respiro de `ms` milisegundos
 *     quedan unas pocas.
 *  2. Orden — las peticiones en paralelo pueden llegar desordenadas y una
 *     respuesta vieja pisar a una nueva. Aquí se encadenan: la siguiente
 *     no sale hasta que la anterior termina.
 *  3. Pérdida al salir — si la persona cierra la pestaña dentro de la
 *     ventana de espera, el último cambio se manda igual.
 *
 * `guardar` puede fallar sin consecuencias: el error se ignora a propósito,
 * igual que hacía el código anterior, porque localStorage es la fuente
 * inmediata y el backend es respaldo.
 */
export function useGuardadoDiferido<T>(
  valor: T,
  guardar: (valor: T) => Promise<unknown>,
  { ms = 800, activo = true }: { ms?: number; activo?: boolean } = {},
) {
  const valorRef = useRef(valor)
  const guardarRef = useRef(guardar)
  const cadenaRef = useRef<Promise<unknown>>(Promise.resolve())
  const pendienteRef = useRef(false)
  const primeraRef = useRef(true)

  valorRef.current = valor
  guardarRef.current = guardar

  // Encola el guardado detrás del anterior, para que nunca haya dos en vuelo.
  const enviar = useRef(() => {
    if (!pendienteRef.current) return
    pendienteRef.current = false
    const instantanea = valorRef.current
    cadenaRef.current = cadenaRef.current
      .then(() => guardarRef.current(instantanea))
      .catch(() => { /* best-effort: sin red o backend caído, no rompe nada */ })
  }).current

  useEffect(() => {
    if (!activo) return
    // El primer render solo hidrata el estado; no hay nada que guardar.
    if (primeraRef.current) {
      primeraRef.current = false
      return
    }
    pendienteRef.current = true
    const id = setTimeout(enviar, ms)
    return () => clearTimeout(id)
  }, [valor, activo, ms, enviar])

  // Si la persona cierra la pestaña con un cambio en la ventana de espera,
  // se manda antes de irse.
  useEffect(() => {
    if (!activo) return
    const alSalir = () => enviar()
    window.addEventListener('beforeunload', alSalir)
    return () => {
      window.removeEventListener('beforeunload', alSalir)
      enviar()
    }
  }, [activo, enviar])
}
