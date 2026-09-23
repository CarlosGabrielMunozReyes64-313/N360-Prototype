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
  components/MenuCuenta    menú de la foto de perfil (Configuración, Cerrar sesión)
  components/FotoPerfil    foto en «Mi cuenta» + EditorFoto (encuadre, zoom, giro)
  perfil/                  foto predeterminada, recorte y caché de fotos
pruebas/motor.ts           53 aserciones sobre la aritmética del motor
```

## Cuenta y foto de perfil

Arriba a la derecha, la foto de perfil abre el menú de la cuenta: nombre,
correo, empresa y NIT, y las opciones **Configuración** y **Cerrar sesión**.
Configuración abre en la pestaña **Mi cuenta** (foto, nombre, correo,
contraseña); le siguen **Datos y tamizaje** (solo cuando ya se completaron
una vez) e **Historial de cambios**.

- **Foto predeterminada**: todo usuario tiene una desde que se registra —
  sus iniciales sobre un color que sale de su `usuario_id`, así que es
  siempre la misma (`src/perfil/avatarPredeterminado.ts`). No se guarda.
- **Foto propia**: se elige (o se arrastra) en Mi cuenta y se encuadra en
  el editor antes de guardar: arrastrar, zoom (barra, rueda o pellizco),
  girar 90°, restablecer; también con teclado (flechas, + y −). El recorte
  se hace en el navegador (`src/perfil/recorte.ts`) y se sube un cuadrado
  de 512 px; el backend lo vuelve a validar y codificar.
- **Cómo se muestran**: la foto viaja con el token, así que se descarga
  como Blob y se cachea en memoria (`src/perfil/fotoCache.ts`) — una sola
  descarga por usuario y versión, y se limpia al cerrar sesión. El panel
  de admin usa el mismo componente `<Avatar>`.

Requiere el backend con la migración `008_foto_perfil.sql` aplicada.

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

## Estadísticas del panel de admin (gráficas)

La pestaña «Estadísticas generales» tiene tres gráficas de los mismos datos,
en pestañas: **Barras** (horizontales, conteos y madurez en paneles con su
propio eje), **Pastel** (un pastel por reparto de un total) y **Campana**
(curva normal de la madurez por formato, con un punto por dimensión).
Cada una se descarga sola en PDF, y el informe completo en PDF lleva
portada, las tres gráficas y las tablas.

- **Accesibilidad**: todo relleno tiene contraste ≥ 3:1 y todo texto
  ≥ 4,5:1 (lo verifica `pruebas/graficas.test.ts`); los colores se eligieron
  midiendo su separación también con deuteranopía y protanopía, y el color
  nunca va solo (valor y nivel escritos, porcentajes en cada rebanada,
  trazo y forma distintos por curva). Cada gráfica tiene su tabla de datos.
- **Tamaño real**: las gráficas se dibujan al ancho del contenedor
  (`useAncho`), así el texto no se encoge en pantallas angostas. Para los
  archivos se dibujan fuera de pantalla a 1100 px (`renderizarGraficas.tsx`),
  así un PDF sale igual desde un celular o un monitor.
- Lógica pura en `src/engine/graficas.ts` y `src/engine/vistasGraficas.ts`;
  el PDF en `src/export/pdfEstadisticas.ts`.
