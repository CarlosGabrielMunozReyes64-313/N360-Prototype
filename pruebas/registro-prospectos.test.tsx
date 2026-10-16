import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExcelJS from "exceljs";
import type { EmpresaDetalle } from "../src/auth/adminApi";
import {
  COLUMNAS,
  CRITERIOS,
  GUION,
  HOJA_CRITERIOS,
  HOJA_GUION,
  HOJA_REGISTRO,
  LISTAS,
  construirRegistro,
  estadoProspecto,
  evaluarPerfil,
  fechaColombia,
  filasRegistro,
  nombreArchivoRegistro,
  textoCelda,
} from "../src/export/registroProspectos";

/** Empresa con tamizaje, autodiagnóstico completado y contacto. */
const COMPLETA: EmpresaDetalle = {
  empresa_id: "e1",
  razon_social: "Frutos Andinos de La Cocha S.A.S.",
  nit: "901734265",
  dv: "3",
  sector_id: "agroindustrial",
  sector_nombre: "Agroindustrial",
  municipio: "Pasto",
  departamento: "Nariño",
  creado_en: "2026-10-09T15:09:00Z",
  anio: 2026,
  tamano: "pequena",
  ingresos_rango: "1000m_10000m",
  personas: 27,
  vinculacion: ["laboral"],
  vinculacion_detalle: null,
  zonas: ["barrios"],
  territorio: null,
  clientes: "mezcla",
  clientes_detalle: null,
  perfil_piloto: true,
  diagnostico_estado: "completado",
  diagnostico_actualizado_en: "2026-10-10T12:00:00Z",
  respuestas_con_etapa: 18,
  practicas_registradas: 15,
  pendientes_clasificar: 0,
  contacto_nombre: "Ana Lucía Muñoz",
  contacto_email: "ana@frutosandinos.co",
};
/** Recién registrada: sin tamizaje, sin contacto y sin departamento. */
const SIN_TAMIZAJE: EmpresaDetalle = {
  ...COMPLETA,
  empresa_id: "e2",
  razon_social: "Empresa Nueva SAS",
  nit: "900000033",
  dv: "8",
  sector_nombre: "Servicios",
  municipio: "Cali",
  departamento: null,
  creado_en: "2026-10-12T20:00:00Z",
  anio: null,
  tamano: null,
  ingresos_rango: null,
  personas: null,
  perfil_piloto: null,
  diagnostico_estado: null,
  respuestas_con_etapa: 0,
  contacto_nombre: null,
  contacto_email: null,
};
/** Con tamizaje y autodiagnóstico a medias. Más antigua: debe quedar de primera. */
const BORRADOR: EmpresaDetalle = {
  ...COMPLETA,
  empresa_id: "e3",
  razon_social: "Lácteos Guáitara Ltda",
  nit: "900000011",
  dv: "6",
  creado_en: "2026-08-01T10:00:00Z",
  personas: 9,
  diagnostico_estado: "borrador",
  respuestas_con_etapa: 9,
  contacto_nombre: "Carla Rosero",
  contacto_email: "carla@lacteos.co",
};

const VACIAS = [
  "Cargo",
  "Teléfono",
  "Fuente de contacto",
  "Fecha primer contacto",
  "Nueva para NEXUS",
  "Interés en participar",
  "Próxima acción",
  "Fecha próxima acción",
];

function porColumna(fila: (string | number | null)[]) {
  return Object.fromEntries(COLUMNAS.map((c, i) => [c.titulo, fila[i]]));
}

async function releer(empresas: EmpresaDetalle[]) {
  const buffer = await construirRegistro(
    empresas,
    new Date("2026-10-15T15:00:00Z"),
  ).xlsx.writeBuffer();
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as ArrayBuffer);
  return libro;
}

describe("filas del registro de prospectos", () => {
  it("llena lo que la plataforma sabe y deja vacío lo demás", () => {
    const filas = filasRegistro([COMPLETA, SIN_TAMIZAJE, BORRADOR]);
    expect(filas).toHaveLength(3);
    filas.forEach((f) => expect(f).toHaveLength(18));

    // Orden de registro: la más antigua es P-001.
    const [lacteos, frutos, nueva] = filas.map(porColumna);
    expect([lacteos.ID, frutos.ID, nueva.ID]).toEqual([
      "P-001",
      "P-002",
      "P-003",
    ]);

    expect(frutos).toMatchObject({
      "Empresa / organización": "Frutos Andinos de La Cocha S.A.S.",
      Sector: "Agroindustrial",
      Municipio: "Pasto, Nariño",
      "N.º aprox. empleados": 27,
      "Persona de contacto": "Ana Lucía Muñoz",
      Correo: "ana@frutosandinos.co",
      Estado: "En evaluación",
      "Cumple perfil": "No",
      Observaciones:
        "NIT 901734265-3. Registrada en NEXUS 360° el 09/10/2026. Autodiagnóstico completado. " +
        "Fuera del perfil por ubicación (fuera de Candelaria y el Valle del Cauca).",
    });
    expect(lacteos.Observaciones).toBe(
      "NIT 900000011-6. Registrada en NEXUS 360° el 01/08/2026. Autodiagnóstico en borrador (9/21 respuestas). " +
        "Fuera del perfil por tamaño (9 personas; se piden de 10 a 50) y ubicación (fuera de Candelaria y el Valle del Cauca).",
    );
    expect(lacteos["Cumple perfil"]).toBe("No");

    // Sin tamizaje ni contacto: esas celdas quedan vacías, no se inventan.
    expect(nueva).toMatchObject({
      Municipio: "Cali",
      "N.º aprox. empleados": null,
      "Persona de contacto": null,
      Correo: null,
      Estado: "Interesado",
      "Cumple perfil": null, // sin tamizaje ni departamento no hay con qué evaluarlo
      Observaciones:
        "NIT 900000033-8. Registrada en NEXUS 360° el 12/10/2026. Aún no responde el tamizaje.",
    });

    for (const f of [lacteos, frutos, nueva])
      for (const col of VACIAS) expect(f[col]).toBeNull();
  });

  it("funciona con un backend anterior que no manda el contacto", () => {
    const vieja = { ...COMPLETA } as Partial<EmpresaDetalle>;
    delete vieja.contacto_nombre;
    delete vieja.contacto_email;
    const [f] = filasRegistro([vieja as EmpresaDetalle]).map(porColumna);
    expect(f["Persona de contacto"]).toBeNull();
    expect(f.Correo).toBeNull();
    expect(f["Empresa / organización"]).toBe(COMPLETA.razon_social);
  });

  it('no confía en "personas" si no hay tamizaje vigente', () => {
    const [f] = filasRegistro([{ ...COMPLETA, anio: null, personas: 40 }]).map(
      porColumna,
    );
    expect(f["N.º aprox. empleados"]).toBeNull();
  });

  it("los valores de Estado y Cumple perfil son opciones de sus listas", () => {
    const filas = filasRegistro([
      COMPLETA,
      SIN_TAMIZAJE,
      BORRADOR,
      { ...COMPLETA, departamento: "Valle del Cauca" },
    ]);
    const estados = LISTAS.estado.split(",");
    const siNo = LISTAS.siNo.split(",");
    for (const f of filas.map(porColumna)) {
      expect(estados).toContain(f.Estado);
      if (f["Cumple perfil"] !== null)
        expect(siNo).toContain(f["Cumple perfil"]);
    }
  });

  it("una lista vacía no da filas", () => {
    expect(filasRegistro([])).toEqual([]);
  });
});

describe("datos parciales", () => {
  const valle = {
    ...COMPLETA,
    municipio: "Candelaria",
    departamento: "Valle del Cauca",
  };

  it("Estado: «Interesado» sin tamizaje, «En evaluación» con tamizaje", () => {
    expect(estadoProspecto(SIN_TAMIZAJE)).toBe("Interesado");
    expect(
      estadoProspecto({
        ...COMPLETA,
        diagnostico_estado: null,
        respuestas_con_etapa: 0,
      }),
    ).toBe("En evaluación");
    expect(estadoProspecto(BORRADOR)).toBe("En evaluación");
    expect(estadoProspecto(COMPLETA)).toBe("En evaluación");
  });

  it("Cumple perfil: nunca «Sí»; «Por verificar» si cumple lo que se sabe", () => {
    expect(evaluarPerfil(valle)).toEqual({
      valor: "Por verificar",
      motivo: null,
    });
    expect(evaluarPerfil({ ...valle, personas: 10 }).valor).toBe(
      "Por verificar",
    );
    expect(evaluarPerfil({ ...valle, personas: 50 }).valor).toBe(
      "Por verificar",
    );
    // Ubicación conocida y sin tamizaje: cumple lo que se sabe.
    expect(evaluarPerfil({ ...valle, anio: null, personas: null }).valor).toBe(
      "Por verificar",
    );
    // Tildes, mayúsculas y espacios no cambian el resultado.
    expect(
      evaluarPerfil({ ...valle, departamento: "  valle DEL cauca " }).valor,
    ).toBe("Por verificar");
  });

  it("Cumple perfil: «No» por tamaño o ubicación, con el motivo", () => {
    expect(evaluarPerfil({ ...valle, personas: 9 })).toEqual({
      valor: "No",
      motivo: "Fuera del perfil por tamaño (9 personas; se piden de 10 a 50).",
    });
    expect(evaluarPerfil({ ...valle, personas: 51 }).valor).toBe("No");
    // Candelaria del Atlántico no es la del piloto.
    expect(evaluarPerfil({ ...valle, departamento: "Atlántico" })).toEqual({
      valor: "No",
      motivo:
        "Fuera del perfil por ubicación (fuera de Candelaria y el Valle del Cauca).",
    });
    // Sin departamento pero con tamaño fuera de rango.
    expect(
      evaluarPerfil({ ...valle, departamento: null, personas: 60 }).valor,
    ).toBe("No");
  });

  it("Cumple perfil vacío si no se conoce ningún criterio", () => {
    expect(
      evaluarPerfil({
        ...COMPLETA,
        anio: null,
        personas: null,
        departamento: null,
      }),
    ).toEqual({ valor: null, motivo: null });
    expect(
      evaluarPerfil({
        ...COMPLETA,
        anio: null,
        personas: null,
        departamento: "   ",
      }).valor,
    ).toBeNull();
  });
});

describe("ayudantes", () => {
  it("limpia el texto de las celdas", () => {
    expect(textoCelda("  Hola \u0007mundo\u0000 ")).toBe("Hola mundo");
    expect(textoCelda("   ")).toBeNull();
    expect(textoCelda(null)).toBeNull();
    expect(textoCelda(undefined)).toBeNull();
    expect(textoCelda("x".repeat(40000))).toHaveLength(32000);
    expect(textoCelda("Línea 1\nLínea 2")).toBe("Línea 1\nLínea 2");
  });

  it("usa la fecha de Colombia, no la UTC", () => {
    // 02:00 UTC del 16 es todavía el 15 en Colombia (UTC-5).
    expect(fechaColombia("2026-10-16T02:00:00Z")).toBe("15/10/2026");
    expect(fechaColombia("no es fecha")).toBeNull();
    expect(fechaColombia(null)).toBeNull();
    expect(nombreArchivoRegistro(new Date("2026-10-16T02:00:00Z"))).toBe(
      "Entregable_3_Registro_de_Prospectos_NEXUS_RSE_360_2026-10-15.xlsx",
    );
  });
});

describe("libro de Excel", () => {
  it("tiene las tres hojas de la plantilla con su contenido", async () => {
    const libro = await releer([COMPLETA, SIN_TAMIZAJE]);
    expect(libro.worksheets.map((h) => h.name)).toEqual([
      HOJA_REGISTRO,
      HOJA_CRITERIOS,
      HOJA_GUION,
    ]);

    const registro = libro.getWorksheet(HOJA_REGISTRO)!;
    expect(
      COLUMNAS.map((_, i) => registro.getRow(1).getCell(i + 1).value),
    ).toEqual(COLUMNAS.map((c) => c.titulo));
    expect(registro.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });

    const criterios = libro.getWorksheet(HOJA_CRITERIOS)!;
    expect(criterios.getCell("A1").value).toBe(CRITERIOS.encabezado[0]);
    expect(criterios.getCell(`B${CRITERIOS.filas.length + 1}`).value).toBe(
      CRITERIOS.filas.at(-1)![1],
    );
    const guion = libro.getWorksheet(HOJA_GUION)!;
    expect(guion.getCell(`B${GUION.filas.length + 1}`).value).toBe(
      GUION.filas.at(-1)![1],
    );
  });

  it("conserva las 21 filas numeradas y las listas desplegables", async () => {
    const registro = (await releer([COMPLETA])).getWorksheet(HOJA_REGISTRO)!;
    expect(registro.getCell("A2").value).toBe("P-001");
    expect(registro.getCell("B2").value).toBe(COMPLETA.razon_social);
    expect(registro.getCell("E2").value).toBe(27);
    expect(registro.getCell("G2").value).toBeNull();
    expect(registro.getCell("L2").value).toBe("En evaluación");
    expect(registro.getCell("M2").value).toBe("No");
    expect(registro.getCell("N2").value).toBeNull();
    expect(registro.getCell("L3").value).toBeNull(); // filas numeradas sin empresa: vacías
    expect(registro.getCell("A22").value).toBe("P-021");
    expect(registro.getCell("B22").value).toBeNull();
    expect(registro.getCell("A23").value).toBeNull();
    expect(registro.getCell("L2").dataValidation).toMatchObject({
      type: "list",
      formulae: [`"${LISTAS.estado}"`],
    });
    expect(registro.getCell("N23").dataValidation).toMatchObject({
      type: "list",
      formulae: [`"${LISTAS.siNo}"`],
    });
    expect(registro.getCell("O23").dataValidation).toMatchObject({
      type: "list",
      formulae: [`"${LISTAS.interes}"`],
    });
  });

  it("crece con más de 21 empresas", async () => {
    const muchas = Array.from({ length: 30 }, (_, i) => ({
      ...COMPLETA,
      empresa_id: `e${i}`,
      razon_social: `Empresa ${i + 1}`,
      creado_en: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    }));
    const registro = (await releer(muchas)).getWorksheet(HOJA_REGISTRO)!;
    expect(registro.getCell("A31").value).toBe("P-030");
    expect(registro.getCell("B31").value).toBe("Empresa 30");
    expect(registro.getCell("L32").dataValidation).toMatchObject({
      type: "list",
    });
  });

  it("caracteres raros en los datos no dañan el archivo", async () => {
    const rara = {
      ...COMPLETA,
      razon_social: 'Dato\u0001 & <raro> "S.A.S." \uD83C\uDF31',
      contacto_nombre: "\u000B",
    };
    const registro = (await releer([rara])).getWorksheet(HOJA_REGISTRO)!;
    expect(registro.getCell("B2").value).toBe(
      'Dato & <raro> "S.A.S." \uD83C\uDF31',
    );
    expect(registro.getCell("F2").value).toBeNull();
  });
});

/* -------------------------------------------- botón en «Datos de empresa» */

const descargarRegistro = vi.fn();
vi.mock("../src/export/registroProspectos", async (orig) => ({
  ...(await orig<typeof import("../src/export/registroProspectos")>()),
  descargarRegistro: (...a: unknown[]) => descargarRegistro(...a),
}));
vi.mock("../src/auth/adminApi", () => ({
  listarEmpresasDetalle: vi.fn(),
  obtenerDiagnosticoEmpresa: vi.fn(),
  clasificarRespuesta: vi.fn(),
}));
import * as adminApi from "../src/auth/adminApi";
import { EmpresasTab } from "../src/components/EmpresasTab";

describe("botón «Descargar registro de prospectos»", () => {
  beforeEach(() => {
    descargarRegistro.mockReset().mockResolvedValue(undefined);
    vi.mocked(adminApi.listarEmpresasDetalle).mockReset();
  });

  it("descarga todas las empresas con la lista recién pedida, aunque haya un filtro", async () => {
    vi.mocked(adminApi.listarEmpresasDetalle)
      .mockResolvedValueOnce([COMPLETA, SIN_TAMIZAJE])
      .mockResolvedValueOnce([COMPLETA, SIN_TAMIZAJE, BORRADOR]);
    render(<EmpresasTab token="t" />);
    await screen.findByText(COMPLETA.razon_social);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Frutos" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Descargar registro de prospectos" }),
    );
    await waitFor(() => expect(descargarRegistro).toHaveBeenCalledTimes(1));
    expect(descargarRegistro.mock.calls[0][0]).toEqual([
      COMPLETA,
      SIN_TAMIZAJE,
      BORRADOR,
    ]);
    expect(
      await screen.findByRole("button", {
        name: "Descargar registro de prospectos",
      }),
    ).toBeEnabled();
  });

  it("si falla, lo dice y deja volver a intentar", async () => {
    vi.mocked(adminApi.listarEmpresasDetalle)
      .mockResolvedValueOnce([COMPLETA])
      .mockRejectedValueOnce(new Error("red"));
    render(<EmpresasTab token="t" />);
    await screen.findByText(COMPLETA.razon_social);
    fireEvent.click(
      screen.getByRole("button", { name: "Descargar registro de prospectos" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo generar el registro de prospectos",
    );
    expect(descargarRegistro).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Descargar registro de prospectos" }),
    ).toBeEnabled();
  });

  it("sin empresas el botón está deshabilitado", async () => {
    vi.mocked(adminApi.listarEmpresasDetalle).mockResolvedValueOnce([]);
    render(<EmpresasTab token="t" />);
    await screen.findByText("Todavía no hay empresas registradas.");
    expect(
      screen.getByRole("button", { name: "Descargar registro de prospectos" }),
    ).toBeDisabled();
  });
});
