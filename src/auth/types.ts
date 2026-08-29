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
