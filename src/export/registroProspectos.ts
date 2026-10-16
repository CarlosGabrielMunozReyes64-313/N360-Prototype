import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { EmpresaDetalle } from "../auth/adminApi";
import { RSE_EXPRESS } from "../data/rseExpress";

/**
 * «Entregable 3 · Registro de prospectos NEXUS RSE 360» lleno con las
 * empresas registradas en la plataforma (las mismas de «Datos de empresa»).
 *
 * Reproduce la plantilla del entregable: mismas tres hojas, encabezados,
 * anchos, colores, fila congelada, filtro y listas desplegables. Solo se
 * llenan las columnas que la plataforma conoce, del todo o en parte; las
 * demás (cargo, teléfono, fuente, fechas, nueva para NEXUS, interés, próxima
 * acción) quedan vacías para que el equipo las diligencie.
 *
 *   Empresa / organización  ← razón social
 *   Sector                  ← sector del perfil
 *   Municipio               ← «municipio, departamento»
 *   N.º aprox. empleados    ← personas del tamizaje (T2); vacío sin tamizaje
 *   Persona de contacto     ← nombre de la cuenta que registró la empresa
 *   Correo                  ← correo de esa cuenta
 *   Estado                  ← «Interesado» si se registró pero no ha hecho el
 *                             tamizaje; «En evaluación» si ya lo hizo
 *   Cumple perfil           ← con los dos criterios que la plataforma conoce
 *                             (10 a 50 personas, Candelaria / Valle del Cauca):
 *                             «No» si falla alguno, «Por verificar» si no; nunca
 *                             «Sí», porque el resto lo confirma el equipo
 *   Observaciones           ← NIT, fecha de registro, estado del autodiagnóstico
 *                             y, si no cumple el perfil, por qué
 */

const VERDE_PLANTILLA = "FF005B5B";
const FONDO_BLANCO = "FFFFFFFF";
const LINEA = "FFD9E2E0";
/** Alto de una línea de texto en la plantilla (Calibri 11). */
const ALTO_LINEA = 14.4;
/** La plantilla trae 21 filas numeradas (P-001 a P-021); se conservan
 * aunque haya menos empresas, para seguir agregando prospectos a mano. */
const FILAS_MINIMAS = 21;
const TOTAL_PREGUNTAS = RSE_EXPRESS.materias.reduce(
  (n, m) => n + m.preguntas.length,
  0,
);

export const HOJA_REGISTRO = "Registro de prospectos";
export const HOJA_CRITERIOS = "Criterios de selección";
export const HOJA_GUION = "Guion de contacto";

export const COLUMNAS: { titulo: string; ancho: number }[] = [
  { titulo: "ID", ancho: 8 },
  { titulo: "Empresa / organización", ancho: 30 },
  { titulo: "Sector", ancho: 24 },
  { titulo: "Municipio", ancho: 24 },
  { titulo: "N.º aprox. empleados", ancho: 18 },
  { titulo: "Persona de contacto", ancho: 24 },
  { titulo: "Cargo", ancho: 22 },
  { titulo: "Teléfono", ancho: 16 },
  { titulo: "Correo", ancho: 28 },
  { titulo: "Fuente de contacto", ancho: 25 },
  { titulo: "Fecha primer contacto", ancho: 18 },
  { titulo: "Estado", ancho: 18 },
  { titulo: "Cumple perfil", ancho: 16 },
  { titulo: "Nueva para NEXUS", ancho: 16 },
  { titulo: "Interés en participar", ancho: 20 },
  { titulo: "Próxima acción", ancho: 38 },
  { titulo: "Fecha próxima acción", ancho: 20 },
  { titulo: "Observaciones", ancho: 50 },
];

/** Opciones de las listas desplegables de la plantilla (columnas L, M:N y O).
 * Los valores que se escriben salen de aquí, así que siempre son opciones
 * válidas de la lista. */
const OPCIONES_ESTADO = [
  "Prospecto",
  "Contactado",
  "Interesado",
  "En evaluación",
  "Vinculado",
  "No participa",
  "Descartado",
] as const;
const OPCIONES_SI_NO = ["Sí", "No", "Por verificar"] as const;
const OPCIONES_INTERES = ["Alto", "Medio", "Bajo", "Por explorar"] as const;
export type Estado = (typeof OPCIONES_ESTADO)[number];
export type SiNo = (typeof OPCIONES_SI_NO)[number];

export const LISTAS = {
  estado: OPCIONES_ESTADO.join(","),
  siNo: OPCIONES_SI_NO.join(","),
  interes: OPCIONES_INTERES.join(","),
};

/** Criterios de la hoja «Criterios de selección» que la plataforma puede
 * comprobar con sus datos. Los demás (responsable de RSE, relación con NEXUS,
 * disponibilidad) solo los puede confirmar el equipo. */
export const CRITERIO_PERSONAS = { minimo: 10, maximo: 50 };
/** Departamentos del piloto, normalizados (sin tildes, en minúsculas).
 * Candelaria está en el Valle del Cauca, así que basta con el departamento. */
export const DEPARTAMENTOS_PILOTO = ["valle del cauca", "valle"];

export const CRITERIOS: {
  encabezado: [string, string];
  filas: [string, string][];
} = {
  encabezado: ["Criterio", "Definición para el piloto"],
  filas: [
    [
      "Número de prospectos",
      "Mínimo 10 empresas prospectadas para seleccionar 5 empresas piloto.",
    ],
    [
      "Tipo de empresa",
      "MiPymes que realicen o deseen realizar acciones de sostenibilidad / RSE.",
    ],
    ["Tamaño", "Entre 10 y 50 empleados, según el protocolo de validación."],
    ["Ubicación", "Candelaria y Valle del Cauca."],
    [
      "Responsable especializado en RSE",
      "Preferiblemente sin responsable especializado en RSE.",
    ],
    [
      "Relación con NEXUS",
      "Debe ser una empresa nueva para NEXUS; no cliente actual ni con relación cercana.",
    ],
    [
      "Disponibilidad",
      "Debe poder designar una persona de contacto y participar en la ruta piloto.",
    ],
    ["Sector", "No se establece un sector obligatorio."],
  ],
};

export const GUION: {
  encabezado: [string, string];
  filas: [string, string][];
} = {
  encabezado: ["Elemento", "Texto sugerido"],
  filas: [
    [
      "Mensaje breve",
      "Hola, somos NEXUS Innovación y Alianzas. Estamos validando una solución práctica para que las MiPymes puedan identificar oportunidades de responsabilidad social y sostenibilidad, priorizar qué trabajar y diseñar un plan de acción con orientación de consultores expertos.",
    ],
    [
      "Invitación",
      "Estamos seleccionando 5 MiPymes de Candelaria y el Valle del Cauca para participar en esta validación. La ruta incluye un autodiagnóstico, análisis con IA y una sesión de 2 horas con consultores expertos NEXUS.",
    ],
    [
      "Qué obtiene la empresa",
      "Un análisis de su situación actual, recomendaciones personalizadas y una sesión de orientación para definir una prioridad y estructurar un plan de acción inicial.",
    ],
    [
      "Cierre",
      "¿Podemos hacerte unas preguntas muy breves para verificar si la empresa cumple el perfil del piloto y, si es así, compartirte la convocatoria completa?",
    ],
    [
      "Nota de uso",
      "Este guion es una propuesta de comunicación para la captación. No constituye evidencia de participación ni de resultados del piloto.",
    ],
  ],
};

export type Celda = string | number | null;

/** Texto apto para una celda: sin caracteres de control (romperían el XML
 * del archivo y Excel pediría «reparar»), sin espacios sobrantes y dentro
 * del máximo de una celda. Vacío → null, para que la celda quede vacía. */
export function textoCelda(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const limpio = v
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "",
    )
    .trim();
  return limpio === "" ? null : limpio.slice(0, 32000);
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Fecha en hora de Colombia (dd/mm/aaaa). null si la fecha no es válida. */
export function fechaColombia(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : FORMATO_FECHA.format(d);
}

function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Personas del tamizaje vigente; null si no hay tamizaje. */
function personasTamizaje(e: EmpresaDetalle): number | null {
  return e.anio !== null &&
    typeof e.personas === "number" &&
    Number.isFinite(e.personas)
    ? e.personas
    : null;
}

/** Etapa en el embudo según lo que hizo en la plataforma. Toda empresa de la
 * lista ya se registró, así que pasó de «Prospecto» y «Contactado». Pasarla
 * a «Vinculado», «No participa» o «Descartado» lo decide el equipo. */
export function estadoProspecto(e: EmpresaDetalle): Estado {
  return e.anio === null ? "Interesado" : "En evaluación";
}

export interface EvaluacionPerfil {
  valor: SiNo | null;
  /** Por qué no cumple, para Observaciones. */
  motivo: string | null;
}

/** «No» si falla el tamaño o la ubicación; «Por verificar» si no falla
 * ninguno de los que se conocen; null si no se conoce ninguno. */
export function evaluarPerfil(e: EmpresaDetalle): EvaluacionPerfil {
  const personas = personasTamizaje(e);
  const departamento = textoCelda(e.departamento);
  const tamanoOk =
    personas === null
      ? null
      : personas >= CRITERIO_PERSONAS.minimo &&
        personas <= CRITERIO_PERSONAS.maximo;
  const ubicacionOk =
    departamento === null
      ? null
      : DEPARTAMENTOS_PILOTO.includes(normalizar(departamento));
  if (tamanoOk === null && ubicacionOk === null)
    return { valor: null, motivo: null };

  const fallas: string[] = [];
  if (tamanoOk === false) {
    fallas.push(
      `tamaño (${personas} personas; se piden de ${CRITERIO_PERSONAS.minimo} a ${CRITERIO_PERSONAS.maximo})`,
    );
  }
  if (ubicacionOk === false)
    fallas.push("ubicación (fuera de Candelaria y el Valle del Cauca)");
  if (fallas.length > 0)
    return {
      valor: "No",
      motivo: `Fuera del perfil por ${fallas.join(" y ")}.`,
    };
  return { valor: "Por verificar", motivo: null };
}

function estadoAutodiagnostico(e: EmpresaDetalle): string {
  if (e.anio === null) return "Aún no responde el tamizaje.";
  const avance = `${e.respuestas_con_etapa}/${TOTAL_PREGUNTAS} respuestas`;
  switch (e.diagnostico_estado) {
    case null:
      return "Autodiagnóstico sin iniciar.";
    // Sin conteo: si una materia no aplica (T6), un diagnóstico completo
    // tiene menos de 21 respuestas y «18/21» parecería un error.
    case "completado":
      return "Autodiagnóstico completado.";
    case "borrador":
      return `Autodiagnóstico en borrador (${avance}).`;
    default:
      return `Autodiagnóstico: ${e.diagnostico_estado} (${avance}).`;
  }
}

function observaciones(e: EmpresaDetalle): string | null {
  const partes: string[] = [];
  const nit = textoCelda(e.nit);
  if (nit)
    partes.push(`NIT ${nit}${textoCelda(e.dv) ? "-" + textoCelda(e.dv) : ""}.`);
  const registro = fechaColombia(e.creado_en);
  if (registro) partes.push(`Registrada en NEXUS 360° el ${registro}.`);
  partes.push(estadoAutodiagnostico(e));
  const { motivo } = evaluarPerfil(e);
  if (motivo) partes.push(motivo);
  return textoCelda(partes.join(" "));
}

/** Las empresas en orden de registro (la primera registrada es P-001). */
function ordenRegistro(empresas: EmpresaDetalle[]): EmpresaDetalle[] {
  const t = (e: EmpresaDetalle) => {
    const n = new Date(e.creado_en).getTime();
    return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
  };
  return [...empresas].sort(
    (a, b) =>
      t(a) - t(b) ||
      a.razon_social.localeCompare(b.razon_social, "es") ||
      a.empresa_id.localeCompare(b.empresa_id),
  );
}

export function idProspecto(indice: number): string {
  return `P-${String(indice + 1).padStart(3, "0")}`;
}

/** Una fila por empresa, en el orden de las columnas de la plantilla. Lo que
 * la plataforma no sabe va en null (celda vacía). */
export function filasRegistro(empresas: EmpresaDetalle[]): Celda[][] {
  return ordenRegistro(empresas).map((e, i) => {
    const municipio = [
      textoCelda(e.municipio),
      textoCelda(e.departamento),
    ].filter((x): x is string => x !== null);
    return [
      idProspecto(i),
      textoCelda(e.razon_social),
      textoCelda(e.sector_nombre) ?? textoCelda(e.sector_id),
      municipio.length ? municipio.join(", ") : null,
      personasTamizaje(e),
      textoCelda(e.contacto_nombre),
      null, // Cargo: la plataforma no lo pide
      null, // Teléfono: la plataforma no lo pide
      textoCelda(e.contacto_email),
      null, // Fuente de contacto
      null, // Fecha primer contacto
      estadoProspecto(e),
      evaluarPerfil(e).valor,
      null, // Nueva para NEXUS
      null, // Interés en participar
      null, // Próxima acción
      null, // Fecha próxima acción
      observaciones(e),
    ];
  });
}

/** Líneas que ocupa el texto más largo de la fila con el ancho de su
 * columna. Solo para darle alto a las filas con texto que se parte. */
function lineasFila(fila: Celda[]): number {
  let max = 1;
  fila.forEach((v, i) => {
    if (typeof v !== "string") return;
    const porLinea = Math.max(1, Math.floor(COLUMNAS[i].ancho * 1.1) - 2);
    const lineas = v
      .split("\n")
      .reduce((n, l) => n + Math.max(1, Math.ceil(l.length / porLinea)), 0);
    max = Math.max(max, lineas);
  });
  return Math.min(max, 15);
}

const ENCABEZADO_REGISTRO: Partial<ExcelJS.Style> = {
  font: {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: FONDO_BLANCO },
  },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE_PLANTILLA },
  },
  border: { bottom: { style: "thin", color: { argb: LINEA } } },
  alignment: { horizontal: "center", vertical: "middle", wrapText: true },
};
const CUERPO_REGISTRO: Partial<ExcelJS.Style> = {
  border: { bottom: { style: "thin", color: { argb: LINEA } } },
  alignment: { vertical: "top", wrapText: true },
};
const ENCABEZADO_REFERENCIA: Partial<ExcelJS.Style> = {
  font: {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: FONDO_BLANCO },
  },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE_PLANTILLA },
  },
  alignment: { vertical: "top", wrapText: true },
};
const CUERPO_REFERENCIA: Partial<ExcelJS.Style> = {
  alignment: { vertical: "top", wrapText: true },
};

function hojaRegistro(libro: ExcelJS.Workbook, filas: Celda[][]): void {
  const hoja = libro.addWorksheet(HOJA_REGISTRO, {
    views: [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: 1,
        topLeftCell: "A2",
        activeCell: "A2",
      },
    ],
  });
  hoja.columns = COLUMNAS.map((c) => ({ width: c.ancho }));

  const encabezado = hoja.getRow(1);
  encabezado.height = 28.8;
  COLUMNAS.forEach((c, i) => {
    const celda = encabezado.getCell(i + 1);
    celda.value = c.titulo;
    celda.style = ENCABEZADO_REGISTRO;
  });

  const total = Math.max(filas.length, FILAS_MINIMAS);
  for (let i = 0; i < total; i++) {
    const valores: Celda[] = filas[i] ?? [
      idProspecto(i),
      ...Array<Celda>(COLUMNAS.length - 1).fill(null),
    ];
    const fila = hoja.getRow(i + 2);
    valores.forEach((v, j) => {
      const celda = fila.getCell(j + 1);
      if (v !== null) celda.value = v;
      celda.style = CUERPO_REGISTRO;
    });
    const lineas = lineasFila(valores);
    if (lineas > 1) fila.height = lineas * ALTO_LINEA;
  }

  // Igual que la plantilla: filtro y listas hasta una fila después de la última.
  const ultima = total + 2;
  hoja.autoFilter = `A1:R${ultima}`;
  for (let r = 2; r <= ultima; r++) {
    hoja.getCell(`L${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${LISTAS.estado}"`],
    };
    hoja.getCell(`M${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${LISTAS.siNo}"`],
    };
    hoja.getCell(`N${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${LISTAS.siNo}"`],
    };
    hoja.getCell(`O${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${LISTAS.interes}"`],
    };
  }
}

function hojaReferencia(
  libro: ExcelJS.Workbook,
  nombre: string,
  contenido: { encabezado: [string, string]; filas: [string, string][] },
  anchos: [number, number],
  altos: Record<number, number> = {},
): void {
  const hoja = libro.addWorksheet(nombre);
  hoja.columns = anchos.map((width) => ({ width }));
  [contenido.encabezado, ...contenido.filas].forEach((valores, i) => {
    const fila = hoja.getRow(i + 1);
    valores.forEach((v, j) => {
      const celda = fila.getCell(j + 1);
      celda.value = v;
      celda.style = i === 0 ? ENCABEZADO_REFERENCIA : CUERPO_REFERENCIA;
    });
    if (altos[i + 1]) fila.height = altos[i + 1];
  });
}

export function construirRegistro(
  empresas: EmpresaDetalle[],
  fecha = new Date(),
): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "NEXUS 360°";
  libro.created = fecha;
  libro.modified = fecha;
  hojaRegistro(libro, filasRegistro(empresas));
  hojaReferencia(libro, HOJA_CRITERIOS, CRITERIOS, [30, 100]);
  hojaReferencia(libro, HOJA_GUION, GUION, [28, 110], {
    2: 43.2,
    3: 28.8,
    4: 28.8,
    5: 28.8,
    6: 28.8,
  });
  return libro;
}

/** Nombre del archivo: el de la plantilla con la fecha (hora de Colombia). */
export function nombreArchivoRegistro(fecha = new Date()): string {
  const [d, m, a] = (fechaColombia(fecha.toISOString()) ?? "").split("/");
  const sello = a && m && d ? `_${a}-${m}-${d}` : "";
  return `Entregable_3_Registro_de_Prospectos_NEXUS_RSE_360${sello}.xlsx`;
}

export async function descargarRegistro(
  empresas: EmpresaDetalle[],
  fecha = new Date(),
): Promise<void> {
  const buffer = await construirRegistro(empresas, fecha).xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    nombreArchivoRegistro(fecha),
  );
}
