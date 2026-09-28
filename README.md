# NEXUS 360° — Autodiagnóstico RSE Express

Front-end del flujo: perfil de empresa → tamizaje «Conozcamos su empresa» →
Autodiagnóstico RSE Express (7 materias de la ISO 26000, 21 preguntas
abiertas) → mapa de prácticas y matriz de priorización → informe en PDF.

El instrumento es el Anexo 1 del *Protocolo de Validación NEXUS RSE Express +
RSE por Retos* (v2, septiembre de 2026). Reemplaza a los formatos anteriores
(Formato 01 ISO 26000 de 21 preguntas y Formato 02 Ley 2173 de 26 preguntas).

## Correr

```bash
npm install
npm run dev      # desarrollo
npm run build    # compila TypeScript y empaqueta
npm run test     # pruebas (motor, almacenamiento, API, gráficas, exportaciones)
npx vite-node pruebas/pdf.ts   # genera un informe de ejemplo en /tmp/informe.pdf
```

## Estructura

```
src/
  types.ts                 modelo de dominio (etapas, respuestas abiertas, matriz)
  data/rseExpress.ts       catálogo del Anexo 1 (GENERADO; mismo contenido que
                           db/009_rse_express.sql en el backend)
  data/tamizaje.ts         T1, T2, T5 y T6 del tamizaje, opciones y validación
  data/escala.ts           «¿En qué punto está?» (sección 6.3), bandas y verbos
  engine/scoring.ts        lectura interna 0–4, mapa de prácticas, oportunidades,
                           matriz de priorización y alertas informativas
  almacen.ts               copia local (localStorage v2) y migración de datos viejos
  auth/empresaApi.ts       /empresa/mio y /empresa/mio/diagnosticos/rse_express/…
  export/pdf.ts            informe para la empresa (mapa + matriz + alertas)
  components/TamizajePaso  tamizaje nuevo
  components/MenuFormatos  portada del autodiagnóstico con avance por materia
  components/Cuestionario  preguntas abiertas, ejemplos, «algo diferente», etapa
  components/Resultados    mapa de prácticas, fortalezas, matriz de priorización
  components/EmpresasTab   ficha de empresa del admin: respuestas y clasificación
pruebas/                   vitest (+ fast-check para las propiedades del motor)
```

## Cómo responde la empresa

Por cada pregunta (sección 6.3 del protocolo): una respuesta abierta, ejemplos
orientadores opcionales, «Hacemos algo diferente: ___» y «¿En qué punto
está?». Al final de cada materia, «¿Qué le gustaría fortalecer o empezar a
hacer en este tema?», y al final de todo una pregunta abierta. Una pregunta
queda completa con la etapa y algo de lo que hacen (texto, ejemplo u «otro»),
salvo que la etapa sea «Aún no lo hemos abordado» o «No aplica».

## Reglas que el motor implementa

- **A la empresa no se le muestra un puntaje.** Se le entrega un mapa de
  prácticas, fortalezas (etapas 3–4), prácticas en desarrollo (2) y
  oportunidades (0–1). La lectura 0–4 es interna (radar sin números, panel admin).
- **«No aplica» no es cero.** Sale del cálculo y su peso se redistribuye.
- **«Hacemos algo diferente» espera a NEXUS.** Queda fuera del cálculo hasta que
  un admin la clasifica (0–4) desde la ficha de la empresa.
- **Consumidores es condicional.** Si T6 es «otras empresas» o «entidades
  públicas», la materia no se pregunta ni cuenta.
- **Tríada interna por materia** (A 0.30, D 0.35, E 0.35) y pesos por sector
  (`PESOS_SECTOR`, juicio de materialidad pendiente de verificación). Σ = 1.0
  con tolerancia `1e-4`. No se trasladan a la matriz de priorización.
- **Matriz de priorización (sección 7).** 3 a 5 oportunidades, máximo una por
  materia; primero los temas con implicación legal en etapa inicial (03b SST,
  06b datos), luego la brecha ponderada. Verbo según la etapa: Empezar (0),
  Formalizar (1), Fortalecer (2), Ampliar (3). Cuatro criterios de 1 a 3
  (importancia, viabilidad, potencial, interés) y prioridad = suma (4–12). El
  interés se sugiere en 3 donde la empresa escribió qué quiere fortalecer.
- **Alertas informativas, no sanciones:** Ley 2173 si el tamaño es mediana o
  «no estoy seguro»; SG-SST si 03b está en 0–1 o N/A; Ley 1581 si 06b está en
  0–1 o N/A; comunidades étnicas si T5 las marca.

## Cuentas que venían del instrumento anterior

La migración `db/009_rse_express.sql` del backend conserva usuarios y empresas
(NIT, razón social, sector, ubicación) y retira tamizajes y diagnósticos
viejos (quedan respaldados en el esquema `nexus360_respaldo`). Al entrar, el
front recibe la empresa con `tamizaje: null`, muestra un aviso y pide el
tamizaje nuevo con el perfil ya lleno. En el navegador pasa lo mismo:
`almacen.ts` migra los datos locales de la versión anterior conservando el
perfil y descartando el tamizaje; el historial conserva fecha y perfil.

## Pendiente de validación

Las alternativas sugeridas para cada oportunidad y los rangos de ingresos de
T1 son propuestas para validar con el equipo NEXUS y con las empresas del
piloto. Los pesos sectoriales siguen siendo un juicio de materialidad.

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

## Estadísticas del panel de admin (gráficas)

Vistas: **Barras** (todo el tablero), **Pastel** (repartos de un total),
**Etapas** (una barra apilada al 100 % por materia con el reparto de
respuestas según «¿En qué punto está?»; nueva con el RSE Express) y
**Campana** (distribución de la etapa promedio por materia). Secciones del
RSE Express: empresas por número de personas y por tipo de cliente,
respuestas por etapa, prácticas registradas por materia, oportunidades
elegidas como reto, alertas informativas y etapa promedio (lectura
interna). Todo va también al PDF, al Excel (hojas «Etapas por materia»,
«Prácticas y retos», «Alertas» e «Indicadores») y al Word. Si el backend
todavía no manda las estadísticas nuevas, el panel las omite sin romperse.

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
