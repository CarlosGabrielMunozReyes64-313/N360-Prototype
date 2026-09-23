/**
 * Tipos del módulo de autenticación.
 * Reflejan la tabla `usuario` de nexus360_schema.sql (campos que sí viajan al front;
 * password_hash nunca sale del backend).
 */

export type Rol = 'empresa' | 'admin'

export interface Usuario {
  usuario_id: string
  email: string
  nombre: string
  rol: Rol
  activo: boolean
  email_verificado_en: string | null
  ultimo_login_en: string | null
  /** Cuándo subió su foto de perfil (sirve de versión para la caché).
   * null = usa su foto predeterminada (iniciales). Opcional porque las
   * sesiones guardadas antes de existir este campo no lo traen. */
  foto_actualizada_en?: string | null
}

export interface RegistroPayload {
  email: string
  nombre: string
  password: string
  /** El autorregistro siempre crea cuentas 'empresa'; 'admin' se aprovisiona aparte. */
  rol: Extract<Rol, 'empresa'>
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SesionRespuesta {
  token: string
  expira_en: string
  usuario: Usuario
}

/** Códigos de error que puede devolver la API de auth, mapeados a mensajes en Login/Register. */
export type AuthErrorCode =
  | 'CREDENCIALES_INVALIDAS'
  | 'EMAIL_YA_REGISTRADO'
  | 'CUENTA_BLOQUEADA'
  | 'CUENTA_INACTIVA'
  | 'EMAIL_NO_VERIFICADO'
  | 'VALIDACION'
  /** La sesión es válida pero la acción exige rol admin (endpoints /admin/*). */
  | 'PROHIBIDO'
  /** El estado actual del recurso impide la acción (cuenta ya eliminada, correo ya tomado). */
  | 'CONFLICTO'
  | 'RED'
  | 'DESCONOCIDO'

export class AuthError extends Error {
  code: AuthErrorCode
  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AuthError'
  }
}
