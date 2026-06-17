import { useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import { useTheme } from '../hooks/useTheme';

// Экран входа/регистрации. После успеха отдаёт пользователя наверх через onAuthed.
// onBack (если передан) показывает ссылку «← На главную» (назад на лендинг).
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
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const u =
        tab === 'register'
          ? await api.register({ name, email, handle, password })
          : await api.login({ email, password });
      onAuthed(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      {onBack && (
        <button type="button" className="auth-back" onClick={onBack}>
          ← На главную
        </button>
      )}
      <img
        className="auth-logo"
        src={effective === 'dark' ? '/localee-dark.png' : '/localee-light.png'}
        alt="Localee"
      />
      <div className="auth-tagline">исследуй город умно</div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('register')}
          >
            Регистрация
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('login')}
          >
            Вход
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
                <label className="auth-label">Имя</label>
                <input
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как тебя зовут"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Ник (латиница)</label>
                <input
                  className="auth-input"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="например, term1x"
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Пароль</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="минимум 6 символов"
            />
          </div>

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy ? '…' : tab === 'register' ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>

        {error && <div className="auth-error">⚠️ {error}</div>}
      </div>
    </div>
  );
}
