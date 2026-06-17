import { useTheme } from '../hooks/useTheme';

// Встречная (публичная) страница: рассказывает, что такое Localee,
// до входа. Кнопки ведут на экран регистрации/входа.
interface LandingPageProps {
  onStart: () => void; // «Начать» → регистрация
  onLogin: () => void; // «Войти» → вход
}

const FEATURES = [
  { icon: '✨', title: 'AI-маршруты', text: 'Опиши, чего хочешь, — и получи готовый маршрут прямо на карте.' },
  { icon: '🗺️', title: 'Карта мест', text: 'Достопримечательности, парки, музеи и рестораны Москвы в одном месте.' },
  { icon: '🏅', title: 'Достижения', text: 'Отмечай посещённые места, открывай бейджи и повышай уровень.' },
  { icon: '🤝', title: 'Вместе с друзьями', text: 'Делись маршрутами и исследуй город компанией. (скоро)' },
];

const STEPS = [
  { n: 1, text: 'Создай аккаунт за минуту' },
  { n: 2, text: 'Расскажи AI, сколько есть времени и что интересно' },
  { n: 3, text: 'Получи маршрут — и иди гулять' },
];

export default function LandingPage({ onStart, onLogin }: LandingPageProps) {
  const { effective } = useTheme();

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <img
            className="landing-logo"
            src={effective === 'dark' ? '/localee-dark.png' : '/localee-light.png'}
            alt="Localee"
          />
          <span className="landing-brand-name">Localee</span>
        </div>
        <button className="landing-login" type="button" onClick={onLogin}>
          Войти
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-badge">AI-гид по Москве</div>
        <h1 className="landing-title">Исследуй город умно</h1>
        <p className="landing-sub">
          Localee составит персональный маршрут по Москве под твоё время, бюджет и интересы —
          с картой, местами и достижениями.
        </p>
        <div className="landing-cta">
          <button className="landing-start" type="button" onClick={onStart}>
            Начать бесплатно
          </button>
          <button className="landing-secondary" type="button" onClick={onLogin}>
            У меня есть аккаунт
          </button>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div className="landing-feature" key={f.title}>
            <div className="landing-feature-icon">{f.icon}</div>
            <div className="landing-feature-title">{f.title}</div>
            <div className="landing-feature-text">{f.text}</div>
          </div>
        ))}
      </section>

      <section className="landing-steps">
        <h2 className="landing-section-title">Как это работает</h2>
        <div className="landing-steps-row">
          {STEPS.map((s) => (
            <div className="landing-step" key={s.n}>
              <div className="landing-step-n">{s.n}</div>
              <div className="landing-step-text">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <h2 className="landing-section-title">Готов открыть Москву заново?</h2>
        <button className="landing-start" type="button" onClick={onStart}>
          Создать аккаунт
        </button>
      </section>

      <footer className="landing-footer">© 2026 Localee · гид по Москве</footer>
    </div>
  );
}
