import { useState } from 'react';
import { api, ApiError, type ApiUser } from '../utils/api';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import OnboardingProfile from './OnboardingProfile';

// Экран входа/регистрации. После успеха отдаёт пользователя наверх через onAuthed.
// После регистрации сначала показываем онбординг (заполнение профиля), и только
// потом пускаем в приложение. onBack (если передан) показывает «← На главную».
export default function AuthScreen({
  onAuthed,
  initialTab = 'register',
  onBack,
}: {
  onAuthed: (u: ApiUser) => void;
  initialTab?: 'login' | 'register';
  onBack?: () => void;
}) {
  const { effective } = useTheme();
  const { t } = useI18n();

  // Ошибку от сервера показываем на выбранном языке: у ApiError есть code, по нему
  // берём перевод 'autherr.<code>'. Если перевода нет — показываем текст сервера.
  function describeError(e: unknown): string {
    if (e instanceof ApiError && e.code) {
      const key = `autherr.${e.code}`;
      const params =
        e.code === 'login_blocked' ? { minutes: String(e.data.minutes ?? '') } : undefined;
      const translated = t(key, params);
      if (translated !== key) return translated;
      return e.message;
    }
    return e instanceof Error ? e.message : t('auth.error');
  }
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Новый пользователь, которого нужно провести через онбординг профиля.
  const [onboarding, setOnboarding] = useState<ApiUser | null>(null);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (tab === 'register') {
        const u = await api.register({ name, email, handle, password });
        setOnboarding(u); // показываем шаг «Расскажите о себе»
      } else {
        onAuthed(await api.login({ email, password }));
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  if (onboarding) {
    return <OnboardingProfile user={onboarding} onDone={onAuthed} />;
  }

  return (
    <div className="auth-screen">
      {onBack && (
        <button type="button" className="auth-back" onClick={onBack}>
          {t('auth.toHome')}
        </button>
      )}
      <img
        className="auth-logo"
        src={effective === 'dark' ? '/localee-dark.png' : '/localee-light.png'}
        alt="Localee"
      />
      <div className="auth-tagline">{t('auth.tagline')}</div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('register')}
          >
            {t('auth.register')}
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('login')}
          >
            {t('auth.login')}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) submit();
          }}
        >
          {tab === 'register' && (
            <>
              <div className="auth-field">
                <label className="auth-label">{t('auth.name')}</label>
                <input
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePh')}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">{t('auth.handle')}</label>
                <input
                  className="auth-input"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={t('auth.handlePh')}
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label className="auth-label">{t('auth.email')}</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">{t('auth.password')}</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPh')}
            />
          </div>

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy ? t('common.savingShort') : tab === 'register' ? t('auth.createAccount') : t('auth.signIn')}
          </button>
        </form>

        {error && <div className="auth-error">⚠️ {error}</div>}
      </div>
    </div>
  );
}
