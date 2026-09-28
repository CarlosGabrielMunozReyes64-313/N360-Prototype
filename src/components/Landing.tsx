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
            <h1 className="lp-h1">Reconoce lo que tu empresa ya hace y elige qué fortalecer</h1>
            <p className="lp-lead">
              El Autodiagnóstico RSE Express de NEXUS 360° recorre las siete materias de la
              ISO 26000 con preguntas abiertas y en lenguaje sencillo. Te entrega un mapa de
              tus prácticas, fortalezas y oportunidades, y te ayuda a priorizar un reto.
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
              Es un autodiagnóstico, no una auditoría. Se guarda a medida que avanzas y puedes retomarlo cuando quieras.
            </p>
          </div>

          {/* muestra del informe */}
          <div
            className="lp-sample"
            role="img"
            aria-label="Ejemplo de mapa de prácticas por materia"
          >
            <div className="lp-sample-head">
              <div>
                <h3>Mapa de ejemplo</h3>
                <p>Empresa pequeña · 24 personas · servicios</p>
              </div>
              <div className="lp-score">
                <b>11</b>
                <span>prácticas que ya realiza</span>
              </div>
            </div>

            {BARRAS.map((b) => (
              <div className="lp-row" key={b.area}>
                <div className="lp-row-top">
                  <span>{b.area}</span>
                  <span>{b.etiqueta}</span>
                </div>
                <div className="lp-track">
                  <i className={`lp-fill lp-fill--${nivel(b.valor)}`} style={{ width: `${b.valor}%` }} />
                </div>
              </div>
            ))}

            <p className="lp-sample-foot">
              Datos de ejemplo. Tu mapa se construye con lo que cuentas de tu empresa; no es un puntaje de cumplimiento.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ qué se evalúa */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Qué se conversa</h2>
          <p className="lp-intro">
            Primero conocemos qué hace realmente tu empresa; después identificamos qué puede
            fortalecer. Tres preguntas abiertas por materia, con ejemplos que ayudan a recordar.
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
                La ISO 26000 es una guía, no una norma certificable. La materia de consumidores
                solo aplica si vendes a personas u hogares.
              </p>
            </article>

            <article className="lp-card">
              <h3 className="lp-h3">Cómo funciona el RSE Express</h3>
              <p className="lp-sub">Unos 30 a 40 minutos · pensado para micro, pequeñas y medianas empresas</p>
              <ul className="lp-list">
                <li>Cuatro preguntas para conocer tu empresa (tamaño, personas, territorio y clientes)</li>
                <li>Por cada pregunta: tu respuesta, ejemplos opcionales y en qué punto estás</li>
                <li>«Hacemos algo diferente» y «No aplica» también son respuestas válidas</li>
                <li>Una pregunta por materia sobre lo que te gustaría fortalecer</li>
                <li>Matriz para priorizar oportunidades y elegir un reto</li>
              </ul>
              <p className="lp-fine">
                Los temas con implicaciones legales (seguridad y salud en el trabajo, datos
                personales, Ley 2173) se muestran como alertas informativas, no como sanción.
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

// El ancho solo dibuja la forma del ejemplo; en pantalla se lee la etiqueta.
const BARRAS = [
  { area: 'Gobernanza organizacional', valor: 80, etiqueta: 'Fortaleza' },
  { area: 'Prácticas laborales', valor: 70, etiqueta: 'Fortaleza' },
  { area: 'Medio ambiente', valor: 50, etiqueta: 'En desarrollo' },
  { area: 'Prácticas justas de operación', valor: 30, etiqueta: 'Oportunidad' },
  { area: 'Comunidad y territorio', valor: 55, etiqueta: 'En desarrollo' },
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
      'Datos básicos y cuatro preguntas sobre tu realidad: tamaño, personas, territorio y clientes. Sin documentos ni cifras exactas.',
  },
  {
    titulo: 'Cuenta lo que hace tu empresa',
    texto:
      'Preguntas abiertas en lenguaje claro, agrupadas por materia. Se guarda a medida que avanzas y lo puede continuar otra persona del equipo.',
  },
  {
    titulo: 'Recibe tu mapa y prioriza',
    texto:
      'Un mapa de prácticas, fortalezas y oportunidades, y una matriz para elegir el reto que trabajarás con NEXUS.',
  },
]

const ENTREGA = [
  {
    titulo: 'Mapa de prácticas',
    texto:
      'Lo que tu empresa ya hace en cada materia de la ISO 26000, con tus propias palabras y sin un puntaje de cumplimiento.',
  },
  {
    titulo: 'Fortalezas y oportunidades',
    texto:
      'Qué puedes empezar, formalizar, fortalecer o ampliar, con alternativas concretas para conversar.',
  },
  {
    titulo: 'Matriz de priorización',
    texto:
      'Califica importancia, viabilidad, potencial e interés, y elige la oportunidad que se convertirá en tu reto.',
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
