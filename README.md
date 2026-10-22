# NEXUS 360° — Autodiagnóstico RSE Express

Front-end del flujo: perfil de empresa → tamizaje «Conozcamos su empresa» →
Autodiagnóstico RSE Express (7 materias de la ISO 26000, 21 preguntas
abiertas) → mapa de prácticas, matriz de priorización y análisis inteligente
(Gemini, vía backend) → informe en PDF.

El instrumento es el Anexo 1 del *Protocolo de Validación NEXUS RSE Express +
RSE por Retos* (v2, septiembre de 2026). Reemplaza a los formatos anteriores
(Formato 01 ISO 26000 de 21 preguntas y Formato 02 Ley 2173 de 26 preguntas).

## Correr

```bash
npm install
npm run dev      # desarrollo
npm run build    # compila TypeScript y empaqueta
npm run test     # pruebas (motor, almacenamiento, API, gráficas, exportaciones)
npx vite-node pruebas/pdf.ts   # informe de ejemplo en /tmp/informe.pdf (con análisis IA)
SIN_IA=1 npx vite-node pruebas/pdf.ts   # el mismo informe sin la sección de IA
```

El único `.env` del front es `VITE_API_URL` (la URL del backend). La clave de
Gemini **no** va aquí: todo lo que empieza por `VITE_` termina en el
navegador. Vive solo en el `.env` del backend.

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
  auth/analisisIaApi.ts    análisis IA: arma los resultados del motor y llama a
                           POST …/rse_express/analisis-ia
  hooks/useAnalisisIA.ts   estado del análisis (cargando, listo, error, reintentar)
  export/pdf.ts            informe para la empresa (mapa + fortalezas + matriz +
                           alertas + análisis inteligente si lo hay)
  components/TamizajePaso  tamizaje nuevo
  components/MenuFormatos  portada del autodiagnóstico con avance por materia
  components/Cuestionario  preguntas abiertas, ejemplos, «algo diferente», etapa
  components/Resultados    mapa de prácticas, fortalezas, matriz de priorización
  components/AnalisisInteligente  sección «Análisis inteligente» de Resultados
  components/AsistenteChat  asistente flotante (chatbot del personaje)
  components/IconoCarga    ícono de carga (GIF) de todas las pantallas de carga
  components/NoEncontrada  página de error 404
  auth/asistenteApi.ts     POST /asistente/mensajes con la respuesta por partes
  data/politicaDatos.ts    Política de Tratamiento de Datos Personales (texto y versión)
  components/PoliticaDatos diálogo para leer la política desde el registro
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

## Análisis inteligente (Gemini)

Al abrir **Resultados**, el front toma lo que el motor ya calculó
(`mapaPracticas`, `evaluar`, `oportunidades`, `alertasInformativas`) y lo
manda al backend (`payloadResultadosIA` en `src/auth/analisisIaApi.ts`). El
backend se lo pasa a Gemini, valida la respuesta y la guarda. La IA solo
interpreta: no cambia el mapa, las categorías ni el orden de la matriz.

- **Qué se envía:** niveles en palabras (etapas y categorías), lo que la
  empresa contó (respuesta abierta completa, hasta 1.500 caracteres; en
  pantalla sigue saliendo el resumen), lo que quiere fortalecer (completo),
  las oportunidades en orden y las alertas. **No** se envían la razón social, el NIT ni la lectura numérica
  interna 0–4 (a la empresa no se le muestra un puntaje).
- **En pantalla:** sección «Análisis inteligente» al final (resumen
  ejecutivo, fortalezas, áreas de oportunidad, prioridades, recomendaciones,
  acciones a corto y mediano plazo, conclusión), con los mismos estilos del
  mapa y la matriz. Mientras se genera: «Analizando resultados…».
- **Sin llamadas de más:** si los resultados no cambiaron, el backend
  devuelve el análisis guardado (recargar la página no llama a Gemini), y dos
  pedidos iguales al tiempo comparten una sola petición.
- **Si falla** (sin red, Gemini caído, sin clave en el servidor, tope por
  hora): un aviso amable, «Reintentar» cuando tiene sentido, y todo lo demás
  sigue funcionando.
- **PDF:** «Descargar informe (PDF)» nunca se bloquea. Con el análisis listo,
  el informe agrega «Análisis inteligente», «Recomendaciones», «Acciones a
  corto plazo», «Acciones a mediano plazo» y «Conclusión» después de la
  matriz y las alertas; sin él, sale completo como antes. El informe también
  trae ahora «Sus fortalezas» y «Temas por empezar o formalizar» (del motor,
  igual que en pantalla). Ningún título queda solo al pie de una página: cada
  uno reserva espacio para el primer bloque que lo sigue (lo prueba
  `pruebas/analisis-ia.test.tsx` con 61 largos de contenido distintos).

Configuración de la clave, migración y detalles: README del backend,
sección «Análisis inteligente con Gemini (010)». Pruebas:
`pruebas/analisis-ia.test.tsx` (resultados altos, bajos y mixtos, carga,
error, reintento, sin clave, sin sesión, PDF con y sin IA).

## Asistente (chatbot del personaje)

Solo para cuentas `empresa`. El personaje (cabeza de la mascota) queda en la
esquina inferior derecha en todos los pasos y en Configuración; al pasar el
cursor muestra «¿Dudas con la encuesta? Pregúntame» y al hacer clic abre la
ventana del chat, que empieza con «¿En qué puedo ayudarte?» y sugiere tres
preguntas según el paso en que esté la persona.

- **El personaje habla** (alterna `asistente-boca-abierta.webp` y
  `asistente-boca-cerrada.webp`) al abrir la ventana, mientras dice el
  saludo, y mientras la IA procesa y escribe la respuesta, hasta que llega
  completa (evento `fin` del backend) y termina de mostrarse. En reposo queda
  con la boca cerrada. Las dos imágenes son idénticas salvo la boca y quedan
  cargadas a la vez, así que alternar no parpadea. Con «reducir movimiento»
  activado en el sistema no alterna: muestra la boca abierta mientras habla.
- La respuesta llega por partes (NDJSON) y se muestra letra a letra. Si se
  cierra la ventana a mitad, la respuesta sigue llegando y el personaje sigue
  hablando hasta terminar; al reabrir, la conversación sigue ahí (se borra al
  cerrar sesión o recargar).
- Contexto: el asistente recibe el paso y, en el cuestionario, el número de
  la materia abierta (`Cuestionario` lo avisa con `onMateria`), para entender
  «esta pregunta». No recibe las respuestas del diagnóstico ni los datos de
  la empresa.
- Errores: un aviso en el chat con «Reintentar» cuando tiene sentido (sin red,
  Gemini caído); sin botón cuando no (tope por hora, sin clave en el servidor,
  sesión vencida).
- Teclado: Enter envía, Mayús + Enter salta de línea, Escape cierra y devuelve
  el foco al personaje.

La base de conocimiento del asistente vive en el backend y se genera desde
`src/data/` con `node scripts/generar-conocimiento-asistente.mjs <ruta al
backend>/app/ia/asistente_conocimiento.py`. Hay que correrlo cada vez que
cambie una pregunta, una opción o una ayuda del tamizaje o del
autodiagnóstico. Detalles y contrato: README del backend, sección «Asistente
de la empresa (chatbot)».

## Ícono de carga y página 404

- **Carga:** todas las pantallas y avisos de carga usan el mismo GIF
  (`src/assets/cargando.gif`, 160 px, 8 cuadros) con `<IconoCarga tamano={…} />`:
  la validación de la sesión, «Cargando los datos de su empresa…», el
  «Analizando resultados…» del análisis inteligente, el asistente mientras
  procesa, el editor de la foto de perfil y las listas del panel de admin. El
  ícono siempre va junto a un texto que dice qué carga. Con «reducir
  movimiento» activado se muestra un cuadro fijo (`cargando-quieto.png`). Los
  botones que cambian su texto mientras trabajan («Generando…», «Guardando…»)
  no llevan ícono.
- **404:** `AuthGate` muestra `NoEncontrada` cuando la dirección no es la raíz
  de la app (`/algo`) o el hash no es una pantalla conocida (`#/algo`). Desde
  ahí, «Ir al inicio» lleva a la landing o, con sesión abierta, al diagnóstico
  (o al panel de admin); sin sesión también ofrece «Iniciar sesión». En
  `npm run dev` y `npm run preview` funciona tal cual. En el hosting, las rutas
  como `/algo` deben devolver `index.html` (reescritura de SPA; en Vercel, una
  regla `rewrites` hacia `/index.html`) para que se vea esta página y no la
  404 del servidor.

## Política de tratamiento de datos en el registro

Para crear una cuenta hay que marcar la casilla de autorización (Ley 1581 de
2012): «He leído la Política de Tratamiento de Datos Personales y autorizo…».
El enlace abre la política en un diálogo; leerla no marca la casilla. El
registro envía `acepta_politica_datos: true` y la versión leída, y el backend
guarda la prueba (ver README del backend, sección 011).

El texto vive en `src/data/politicaDatos.ts` y cubre el contenido mínimo del
Decreto 1377 de 2013: responsable, datos y finalidades, el envío a Google
(Gemini) para el análisis inteligente, derechos, cómo ejercerlos y plazos, y
vigencia. **Antes de producción:** completar `RESPONSABLE` con los datos
legales reales (hoy se ven textos entre corchetes) y hacerlo revisar por el
área jurídica. Si el texto cambia de fondo, subir `version` aquí y en el
backend a la vez.

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
