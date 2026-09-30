/**
 * Política de Tratamiento de Datos Personales de NEXUS 360°.
 *
 * Contenido mínimo que exige el Decreto 1377 de 2013 (compilado en el
 * Decreto 1074 de 2015, art. 2.2.2.25.3.1) para la Ley 1581 de 2012:
 * identificación del responsable, tratamiento y finalidades, derechos del
 * titular, área responsable de las peticiones, procedimiento para ejercer los
 * derechos, y vigencia.
 *
 * ⚠️ ANTES DE PRODUCCIÓN:
 *  1. Completar RESPONSABLE con los datos legales reales de la entidad que
 *     opera NEXUS 360° (mientras tanto se ven los textos entre corchetes).
 *  2. Hacer revisar el texto por el área jurídica: es una base redactada
 *     sobre la norma, no un concepto jurídico.
 *
 * Si el texto cambia de fondo, sube `version` aquí Y en el backend
 * (app/schemas.py::POLITICA_DATOS_VERSION): el registro guarda qué versión
 * aceptó cada persona y rechaza versiones viejas.
 */

export const RESPONSABLE = {
  nombre: '[Razón social de la entidad responsable]',
  nit: '[NIT]',
  domicilio: '[Ciudad de domicilio]',
  direccion: '[Dirección]',
  correo: '[correo para peticiones sobre datos personales]',
  telefono: '[Teléfono]',
  area: '[Área o persona responsable de atender las peticiones]',
}

export interface SeccionPolitica {
  titulo: string
  /** Párrafos antes de la lista. */
  parrafos?: string[]
  lista?: string[]
  /** Párrafos después de la lista. */
  notas?: string[]
}

export const POLITICA_DATOS = {
  version: '2026-09-29',
  vigenteDesde: '29 de septiembre de 2026',
  titulo: 'Política de Tratamiento de Datos Personales',
  secciones: [
    {
      titulo: '1. Responsable del tratamiento',
      parrafos: [
        `${RESPONSABLE.nombre}, NIT ${RESPONSABLE.nit}, con domicilio en ${RESPONSABLE.domicilio}, `
        + `dirección ${RESPONSABLE.direccion}, correo ${RESPONSABLE.correo} y teléfono `
        + `${RESPONSABLE.telefono} (en adelante, «el Responsable»), es responsable del tratamiento de `
        + 'los datos personales que se recogen en la plataforma NEXUS 360°.',
        'Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el '
        + 'Decreto 1074 de 2015) y las normas que los modifiquen o complementen.',
      ],
    },
    {
      titulo: '2. Qué datos tratamos',
      lista: [
        'De su cuenta: nombre, correo electrónico, contraseña (se guarda cifrada con un método de un '
        + 'solo sentido: nadie puede leerla) y, si decide subirla, su foto de perfil.',
        'De uso y seguridad: fecha y hora de cada acceso, dirección IP y tipo de navegador, tanto de '
        + 'sus sesiones como de esta autorización.',
        'De su empresa y del autodiagnóstico: razón social, NIT, sector, ubicación, tamaño, número de '
        + 'personas que trabajan, tipo de clientes, territorio, respuestas del autodiagnóstico, la '
        + 'matriz de priorización y los informes generados.',
      ],
      notas: [
        'Los datos de la empresa no son datos personales, pero las respuestas abiertas podrían incluir '
        + 'información de personas. Le pedimos no escribir nombres, documentos ni datos de contacto de '
        + 'trabajadores, clientes u otras personas.',
        'No solicitamos datos sensibles ni datos de niñas, niños o adolescentes. Si alguna pregunta '
        + 'llegara a tocar datos sensibles, responderla es facultativo. La plataforma no está dirigida a '
        + 'menores de edad.',
      ],
    },
    {
      titulo: '3. Para qué los usamos',
      lista: [
        'Crear y administrar su cuenta y permitirle iniciar sesión de forma segura.',
        'Guardar su autodiagnóstico y mostrarle sus resultados y el informe en PDF.',
        'Generar el análisis inteligente de sus resultados con inteligencia artificial (ver el punto 4).',
        'Permitir el acompañamiento del equipo NEXUS: revisar las prácticas propias que describa, '
        + 'conversar sobre retos y hacer seguimiento.',
        'Elaborar estadísticas agregadas del programa, en las que no se identifica a ninguna persona.',
        'Proteger la plataforma: prevenir accesos indebidos, bloquear intentos fallidos y atender incidentes.',
        'Comunicarnos con usted sobre su cuenta y el programa.',
      ],
    },
    {
      titulo: '4. Análisis con inteligencia artificial y proveedores',
      parrafos: [
        'Para generar el análisis inteligente, la plataforma envía los resultados del autodiagnóstico y '
        + 'las respuestas abiertas a Google LLC, mediante el servicio Gemini API. No se envían su nombre, '
        + 'su correo, la razón social ni el NIT de la empresa. Este proveedor puede procesar la '
        + 'información fuera de Colombia, por lo que se trata de una transferencia o transmisión '
        + 'internacional de datos, que usted autoriza expresamente al aceptar esta política. Cuando el '
        + 'servicio se usa en su modalidad gratuita, Google puede utilizar ese contenido para mejorar sus '
        + 'productos, según sus propias condiciones.',
        'La plataforma también se aloja en proveedores de infraestructura tecnológica, que actúan como '
        + 'encargados del tratamiento y solo pueden usar la información para prestar el servicio.',
      ],
    },
    {
      titulo: '5. Sus derechos',
      lista: [
        'Conocer, actualizar y rectificar sus datos personales.',
        'Solicitar prueba de la autorización que otorgó.',
        'Ser informado sobre el uso que se ha dado a sus datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio, una vez haya agotado el '
        + 'trámite de consulta o reclamo ante el Responsable.',
        'Revocar la autorización o solicitar la supresión de sus datos, cuando no exista un deber legal '
        + 'o contractual de conservarlos.',
        'Acceder de forma gratuita a sus datos personales.',
      ],
    },
    {
      titulo: '6. Cómo ejercer sus derechos',
      parrafos: [
        `Escriba a ${RESPONSABLE.correo} indicando su nombre, el correo de su cuenta y lo que solicita. `
        + `Atiende: ${RESPONSABLE.area}.`,
      ],
      lista: [
        'Consultas: se responden en un máximo de 10 días hábiles desde su recibo. Si no es posible, le '
        + 'informaremos el motivo y la nueva fecha, que no superará 5 días hábiles adicionales.',
        'Reclamos (corrección, actualización, supresión, revocatoria o posible incumplimiento): se '
        + 'atienden en un máximo de 15 días hábiles. Si no es posible, le informaremos el motivo y la '
        + 'nueva fecha, que no superará 8 días hábiles adicionales. Si el reclamo está incompleto, le '
        + 'pediremos completarlo dentro de los 5 días siguientes; si pasan 2 meses sin que lo haga, se '
        + 'entenderá que desistió.',
      ],
    },
    {
      titulo: '7. Seguridad',
      parrafos: [
        'Aplicamos medidas técnicas y organizativas para proteger sus datos: contraseñas cifradas, '
        + 'control de acceso por cuenta (cada empresa solo ve su propia información), bloqueo tras '
        + 'intentos fallidos y registro de sesiones.',
      ],
    },
    {
      titulo: '8. Vigencia',
      parrafos: [
        'Esta política rige desde el 29 de septiembre de 2026. Los datos se conservarán mientras la '
        + 'cuenta esté activa y durante el tiempo necesario para cumplir las finalidades descritas y las '
        + 'obligaciones legales. Cualquier cambio sustancial se le informará y, cuando corresponda, se le '
        + 'pedirá una nueva autorización.',
      ],
    },
  ] satisfies SeccionPolitica[],
}
