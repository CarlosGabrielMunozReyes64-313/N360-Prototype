import './landing.css'

interface Props {
  onCrearCuenta: () => void
  onIniciarSesion: () => void
}

/**
 * Página pública de presentación. Es lo primero que ve alguien sin sesión;
 * desde aquí se entra a Login o a Register. No consulta la API ni toca el
 * estado de autenticación: solo informa y deriva a las dos pantallas que
 * ya existen.
 */
export function Landing({ onCrearCuenta, onIniciarSesion }: Props) {
  return (
    <div className="lp">

      {/* ------------------------------------------------ barra superior */}
      <header className="lp-bar">
        <div className="lp-wrap lp-bar-in">
          <div className="lp-brand">
            <LogoN360 />
            <span className="lp-brand-name">NEXUS 360°</span>
          </div>
          <nav className="lp-bar-acc">
            <button type="button" className="lp-btn lp-btn-ghost" onClick={onIniciarSesion}>
              Iniciar sesión
            </button>
            <button type="button" className="lp-btn lp-btn-primary" onClick={onCrearCuenta}>
              Crear cuenta
            </button>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------ hero */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-in">
          <div>
            <span className="lp-tag">Para empresas en Colombia</span>
            <h1 className="lp-h1">Sabe en qué punto está tu empresa frente a la norma</h1>
            <p className="lp-lead">
              NEXUS 360° evalúa tu gestión de responsabilidad social frente a la ISO 26000
              y la Ley 2173 de 2021, y te entrega un informe con el nivel de cumplimiento
              por área y las acciones que quedan pendientes.
            </p>
            <div className="lp-cta">
              <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onCrearCuenta}>
                Crear cuenta
              </button>
              <button type="button" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={onIniciarSesion}>
                Ya tengo cuenta
              </button>
            </div>
            <p className="lp-note">
              El diagnóstico se guarda a medida que avanzas y puedes retomarlo cuando quieras.
            </p>
          </div>

          {/* muestra del informe */}
          <div
            className="lp-sample"
            role="img"
            aria-label="Ejemplo de informe con el nivel de cumplimiento por área"
          >
            <div className="lp-sample-head">
              <div>
                <h3>Diagnóstico de ejemplo</h3>
                <p>Empresa mediana · sector manufactura</p>
              </div>
              <div className="lp-score">
                <b>62%</b>
                <span>cumplimiento</span>
              </div>
            </div>

            {BARRAS.map((b) => (
              <div className="lp-row" key={b.area}>
                <div className="lp-row-top">
                  <span>{b.area}</span>
                  <span>{b.valor}%</span>
                </div>
                <div className="lp-track">
                  <i className={`lp-fill lp-fill--${nivel(b.valor)}`} style={{ width: `${b.valor}%` }} />
                </div>
              </div>
            ))}

            <p className="lp-sample-foot">
              Datos de ejemplo. Tu informe se genera con las respuestas de tu empresa.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ qué se evalúa */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Qué se evalúa</h2>
          <p className="lp-intro">
            Dos marcos distintos: uno voluntario que ordena la gestión social de la empresa,
            y uno obligatorio con una exigencia concreta y verificable.
          </p>

          <div className="lp-two">
            <article className="lp-card">
              <h3 className="lp-h3">ISO 26000</h3>
              <p className="lp-sub">Guía de responsabilidad social · aplicación voluntaria</p>
              <ul className="lp-list">
                <li>Gobernanza de la organización</li>
                <li>Derechos humanos</li>
                <li>Prácticas laborales</li>
                <li>Medio ambiente</li>
                <li>Prácticas justas de operación</li>
                <li>Asuntos de consumidores</li>
                <li>Participación activa y desarrollo de la comunidad</li>
              </ul>
              <p className="lp-fine">
                La ISO 26000 es una guía, no una norma certificable. El resultado es un
                autodiagnóstico de tu gestión, no un certificado.
              </p>
            </article>

            <article className="lp-card">
              <h3 className="lp-h3">Ley 2173 de 2021</h3>
              <p className="lp-sub">Restauración ecológica · obligatoria para medianas y grandes</p>
              <ul className="lp-list">
                <li>Programa anual de siembra de árboles nativos</li>
                <li>Siembra en las Áreas de Vida definidas por la autoridad</li>
                <li>Articulación con la alcaldía y la autoridad ambiental</li>
                <li>Costos del programa a cargo de la empresa</li>
                <li>Registro y seguimiento de lo sembrado</li>
              </ul>
              <p className="lp-fine">
                Reglamentada por la Resolución 1491 del 17 de octubre de 2025 del Ministerio
                de Ambiente. Voluntaria para micro y pequeñas empresas.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ cómo funciona */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Cómo funciona</h2>
          <p className="lp-intro">Tres pasos, sin instalar nada y sin consultor de por medio.</p>

          <div className="lp-three">
            {PASOS.map((p, i) => (
              <article className="lp-card" key={p.titulo}>
                <div className="lp-num">{i + 1}</div>
                <h3 className="lp-h3">{p.titulo}</h3>
                <p className="lp-txt">{p.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ qué recibes */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Qué queda en tus manos</h2>
          <p className="lp-intro">
            El diagnóstico no termina en un puntaje: termina en una lista de cosas por hacer.
          </p>

          <div className="lp-grid">
            {ENTREGA.map((e) => (
              <div key={e.titulo}>
                <h3 className="lp-h4">{e.titulo}</h3>
                <p className="lp-txt">{e.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ cierre */}
      <section className="lp-close">
        <div className="lp-wrap lp-close-in">
          <div>
            <h2 className="lp-h2 lp-h2--claro">Empieza el diagnóstico de tu empresa</h2>
            <p className="lp-close-txt">
              Crear la cuenta toma un minuto. El primer resultado lo tienes hoy mismo.
            </p>
          </div>
          <div className="lp-cta">
            <button type="button" className="lp-btn lp-btn-light lp-btn-lg" onClick={onCrearCuenta}>
              Crear cuenta
            </button>
            <button type="button" className="lp-btn lp-btn-outline-light lp-btn-lg" onClick={onIniciarSesion}>
              Iniciar sesión
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span>NEXUS 360° · Diagnóstico normativo empresarial · Colombia</span>
          <span>Los datos se tratan conforme a la Ley 1581 de 2012.</span>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------ datos */

const BARRAS = [
  { area: 'Gobernanza de la organización', valor: 84 },
  { area: 'Prácticas laborales', valor: 71 },
  { area: 'Medio ambiente', valor: 48 },
  { area: 'Programa de siembra (Ley 2173)', valor: 25 },
  { area: 'Desarrollo de la comunidad', valor: 66 },
]

function nivel(v: number): 'alto' | 'medio' | 'bajo' {
  if (v >= 60) return 'alto'
  if (v >= 40) return 'medio'
  return 'bajo'
}

const PASOS = [
  {
    titulo: 'Registra tu empresa',
    texto:
      'Sector, tamaño y número de empleados. Con eso se define qué normativa te aplica y cuáles preguntas verás.',
  },
  {
    titulo: 'Responde el cuestionario',
    texto:
      'Preguntas en lenguaje claro, agrupadas por área. Se guarda a medida que avanzas y lo puede continuar otra persona del equipo.',
  },
  {
    titulo: 'Recibe el informe',
    texto:
      'Nivel de cumplimiento por área, brechas priorizadas y un plan de acción que puedes descargar y presentar a gerencia.',
  },
]

const ENTREGA = [
  {
    titulo: 'Resultado por área',
    texto:
      'El puntaje de cada materia de la ISO 26000 y del componente de Ley 2173, para ver dónde está la debilidad real.',
  },
  {
    titulo: 'Brechas priorizadas',
    texto:
      'Qué falta, ordenado por lo que más pesa en el cumplimiento y por lo que es exigible por ley.',
  },
  {
    titulo: 'Plan de acción descargable',
    texto:
      'Acciones concretas con su área responsable, en un documento listo para llevar a comité.',
  },
  {
    titulo: 'Histórico de la empresa',
    texto:
      'Cada diagnóstico queda guardado en el espacio de tu empresa, para comparar cómo avanzas de un año al siguiente.',
  },
]

/* ------------------------------------------------------------ logo */

function LogoN360() {
  return (
    <svg viewBox="0 0 200 200" className="lp-logo" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="100,30 160.62,65 160.62,135 100,170 39.38,135 39.38,65"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <line x1="100" y1="27" x2="100" y2="100" stroke="var(--nx-mid)" strokeWidth="7" strokeLinecap="round" />
      <polygon
        points="100,55 138.97,77.5 138.97,122.5 100,145 61.03,122.5 61.03,77.5"
        fill="none"
        stroke="var(--nx-mid)"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <polygon points="100,80 117.32,90 117.32,110 100,120 82.68,110 82.68,90" fill="var(--nx-dark)" />
    </svg>
  )
}
