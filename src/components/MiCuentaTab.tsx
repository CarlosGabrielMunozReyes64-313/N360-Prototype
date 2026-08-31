import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { AuthError } from "../auth/types";

export function MiCuentaTab() {
  const { usuario, actualizarPerfil, cambiarPassword } = useAuth();

  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [okPerfil, setOkPerfil] = useState(false);

  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirmar, setPassConfirmar] = useState("");
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [errorPass, setErrorPass] = useState<string | null>(null);
  const [okPass, setOkPass] = useState(false);

  if (!usuario) return null;

  const guardarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    setErrorPerfil(null);
    setOkPerfil(false);
    if (!nombre.trim() || !email.trim()) return;
    setGuardandoPerfil(true);
    try {
      await actualizarPerfil({
        nombre: nombre.trim() !== usuario.nombre ? nombre.trim() : undefined,
        email: email.trim() !== usuario.email ? email.trim() : undefined,
      });
      setOkPerfil(true);
    } catch (err) {
      setErrorPerfil(
        err instanceof AuthError ? err.message : "No se pudo guardar.",
      );
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const guardarPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorPass(null);
    setOkPass(false);
    if (passNueva.length < 8) {
      setErrorPass("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (passNueva !== passConfirmar) {
      setErrorPass("Las contraseñas nuevas no coinciden.");
      return;
    }
    setGuardandoPass(true);
    try {
      await cambiarPassword({
        password_actual: passActual,
        password_nueva: passNueva,
      });
      setOkPass(true);
      setPassActual("");
      setPassNueva("");
      setPassConfirmar("");
    } catch (err) {
      setErrorPass(
        err instanceof AuthError
          ? err.message
          : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setGuardandoPass(false);
    }
  };

  return (
    <div className="cuenta-tab">
      <section className="card">
        <div className="eyebrow">Mi cuenta</div>
        <h1 className="title">Datos de la cuenta</h1>
        <p className="lede">Nombre y correo con los que iniciaste sesión.</p>

        <form onSubmit={guardarPerfil} noValidate>
          <div className="field">
            <label htmlFor="cuenta-nombre">Nombre</label>
            <input
              id="cuenta-nombre"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setOkPerfil(false);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="cuenta-email">Correo</label>
            <input
              id="cuenta-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setOkPerfil(false);
              }}
            />
          </div>

          {errorPerfil && (
            <div className="auth-error" role="alert">
              {errorPerfil}
            </div>
          )}
          {okPerfil && <div className="note">Datos actualizados.</div>}

          <div className="nav-footer nav-footer--fin">
            <button className="btn" disabled={guardandoPerfil}>
              {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="eyebrow">Seguridad</div>
        <h1 className="title">Cambiar contraseña</h1>
        <p className="lede">
          Necesitas tu contraseña actual para poder cambiarla.
        </p>

        <form onSubmit={guardarPassword} noValidate>
          <div className="field">
            <label htmlFor="pass-actual">Contraseña actual</label>
            <input
              id="pass-actual"
              type="password"
              autoComplete="current-password"
              value={passActual}
              onChange={(e) => setPassActual(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pass-nueva">Contraseña nueva</label>
            <input
              id="pass-nueva"
              type="password"
              autoComplete="new-password"
              value={passNueva}
              onChange={(e) => setPassNueva(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="field">
            <label htmlFor="pass-confirmar">Confirmar contraseña nueva</label>
            <input
              id="pass-confirmar"
              type="password"
              autoComplete="new-password"
              value={passConfirmar}
              onChange={(e) => setPassConfirmar(e.target.value)}
            />
          </div>

          {errorPass && (
            <div className="auth-error" role="alert">
              {errorPass}
            </div>
          )}
          {okPass && <div className="note">Contraseña actualizada.</div>}

          <div className="nav-footer nav-footer--fin">
            <button className="btn" disabled={guardandoPass}>
              {guardandoPass ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
