# NEXUS 360° — Prototipo de diagnóstico normativo

Front-end del flujo de diagnóstico: perfil de empresa → tamizaje anual →
formatos → resultados cruzados → informe en PDF. El acceso con cuenta va
antes y se integra aparte.

## Correr

```bash
npm install
npm run dev      # desarrollo
npm run build    # compila TypeScript y empaqueta
npm run test     # pruebas del motor de cálculo (requiere red la primera vez)
```

## Estructura

```
src/
  types.ts                 modelo de dominio
  data/escala.ts           escala 0–4, anclas por arquetipo, verbos
  data/formato01.ts        ISO 26000 · 21 preguntas · pesos por sector
  data/formato02.ts        Ley 2173 · 26 preguntas · reglas de bandera roja
  engine/scoring.ts        pesos, N/A, cobertura, banderas, lectura cruzada, plan
  export/pdf.ts            informe en PDF vectorial
  components/              pantallas y el control de escala
pruebas/motor.ts           53 aserciones sobre la aritmética del motor
```

## Reglas que el motor implementa

- **Σ peso = 1.0 en cada nivel.** Se valida con tolerancia (`1e-4`), no con
  igualdad exacta: siete materias iguales dan 0.142857… y una comparación
  estricta rechazaría un formato correcto.
- **«No aplica» no es cero.** Sale del denominador y su peso se redistribuye
  entre las preguntas restantes de la sección. Un cero real sí baja el puntaje.
- **Guarda de cobertura.** Si más de la mitad del peso queda en N/A, no se
  reporta puntaje: el diagnóstico se declara no concluyente.
- **Techo de primer ciclo.** El nivel 4 exige mejora continua entre ciclos. Sin
  ciclos previos el techo del Formato 02 es 3.0 y se reporta sobre esa base.
- **El tamizaje apaga dimensiones.** Sin Áreas de Vida publicadas en el
  municipio, el Formato 02 pasa de 26 preguntas a 8 y la obligación se marca
  como no exigible, no como incumplida.
- **Los dos formatos no se promedian.** Se contrastan: la Ley 2173 se verifica
  contra documentos y funciona como control de realidad sobre la autoevaluación
  de la ISO.
- **Prioridad por brecha ponderada**, `peso × (techo − valor)`, no por puntaje
  bruto. Las banderas rojas y las brechas legales exigibles van primero.
- **El verbo de la recomendación sale del arquetipo** de la pregunta: radicar,
  formular, ejecutar y registrar, calcular y certificar, formalizar.

## Pendiente de validación normativa

Antes de publicar el Formato 02 hay que contrastar contra el articulado:
criterios de exclusión en el conteo de empleados, plazo vigente de delimitación
tras la Resolución 0358 de 2026, régimen sancionatorio y modalidad de asocio.
Los pesos sectoriales de `PESOS_SECTOR` son un juicio de materialidad, no una
lectura de la norma, y deben poder editarse desde administración.
