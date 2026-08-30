import { useEffect, useState } from "react";
import "./welcome.css";

interface Props {
  nombre?: string;
  /** Cuánto dura visible antes de empezar a desvanecerse (ms). */
  duracionMs?: number;
  /** Se llama cuando termina la transición de desvanecimiento. */
  onFinished: () => void;
}

/**
 * Mensaje de bienvenida a pantalla completa que se muestra una sola vez,
 * justo después de crear la cuenta. Aparece, se queda un momento, y se
 * desvanece solo (fade-out) revelando la app debajo — no navega ni cambia
 * el estado de la app en sí, solo se monta encima y luego desaparece.
 */
export function WelcomeOverlay({
  nombre,
  duracionMs = 4000,
  onFinished,
}: Props) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSaliendo(true), duracionMs);
    return () => clearTimeout(t1);
  }, [duracionMs]);

  // La duración de esta transición debe coincidir con --welcome-fade-ms en welcome.css.
  const handleTransitionEnd = () => {
    if (saliendo) onFinished();
  };

  return (
    <div
      className={`welcome-overlay${saliendo ? " welcome-overlay--saliendo" : ""}`}
      onTransitionEnd={handleTransitionEnd}
      role="status"
      aria-live="polite"
    >
      <div className="welcome-content">
        <div className="welcome-brand">NEXUS 360°</div>
        <h1 className="welcome-title">
          {nombre ? `¡Bienvenido, ${nombre}!` : "¡Bienvenido a NEXUS 360°!"}
        </h1>
        <p className="welcome-sub">Tomaremos unos datos antes de comenzar.</p>
      </div>
    </div>
  );
}
