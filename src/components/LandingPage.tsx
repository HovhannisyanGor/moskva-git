import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';

// Встречная (публичная) страница: рассказывает, что такое Localee,
// до входа. Кнопки ведут на экран регистрации/входа.
interface LandingPageProps {
  onStart: () => void; // «Начать» → регистрация
  onLogin: () => void; // «Войти» → вход
}

const FEATURES = [
  { icon: '✨', key: 'feat1' },
  { icon: '🗺️', key: 'feat2' },
  { icon: '🏅', key: 'feat3' },
  { icon: '🤝', key: 'feat4' },
];

const STEPS = [1, 2, 3];

export default function LandingPage({ onStart, onLogin }: LandingPageProps) {
  const { effective } = useTheme();
  const { t } = useI18n();

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
          {t('landing.login')}
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-badge">{t('landing.badge')}</div>
        <h1 className="landing-title">{t('landing.title')}</h1>
        <p className="landing-sub">{t('landing.sub')}</p>
        <div className="landing-cta">
          <button className="landing-start" type="button" onClick={onStart}>
            {t('landing.start')}
          </button>
          <button className="landing-secondary" type="button" onClick={onLogin}>
            {t('landing.haveAccount')}
          </button>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div className="landing-feature" key={f.key}>
            <div className="landing-feature-icon">{f.icon}</div>
            <div className="landing-feature-title">{t(`landing.${f.key}.title`)}</div>
            <div className="landing-feature-text">{t(`landing.${f.key}.text`)}</div>
          </div>
        ))}
      </section>

      <section className="landing-steps">
        <h2 className="landing-section-title">{t('landing.howItWorks')}</h2>
        <div className="landing-steps-row">
          {STEPS.map((n) => (
            <div className="landing-step" key={n}>
              <div className="landing-step-n">{n}</div>
              <div className="landing-step-text">{t(`landing.step${n}`)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <h2 className="landing-section-title">{t('landing.finalTitle')}</h2>
        <button className="landing-start" type="button" onClick={onStart}>
          {t('landing.createAccount')}
        </button>
      </section>

      <footer className="landing-footer">{t('landing.footer')}</footer>
    </div>
  );
}
