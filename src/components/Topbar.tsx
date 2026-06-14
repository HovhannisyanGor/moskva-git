import { useState } from 'react';

interface TopbarProps {
  activeView: 'map' | 'places' | 'achievements';
  onViewChange: (view: 'map' | 'places' | 'achievements') => void;
}

export default function Topbar({ activeView, onViewChange }: TopbarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light',
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('localee_theme', next);
    } catch {
      // localStorage может быть недоступен — не критично
    }
    setTheme(next);
  };

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <svg className="logo-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <circle cx="66" cy="63" r="16" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="3" />
          <circle cx="66" cy="63" r="23" stroke="var(--accent)" strokeOpacity="0.28" strokeWidth="3" />
          <path
            d="M38 28 V63 H62"
            stroke="var(--accent)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="38" cy="26" r="12.5" fill="var(--accent)" />
          <circle cx="66" cy="63" r="11" fill="var(--logo-dot)" />
        </svg>
        <span className="logo-text">Localee</span>
        <span className="logo-tagline">— исследуй город умно</span>
      </div>

      <nav className="topbar-nav">
        <button
          className={`nav-btn ${activeView === 'map' ? 'nav-btn--active' : ''}`}
          onClick={() => onViewChange('map')}
        >
          Карта
        </button>
        <button
          className={`nav-btn ${activeView === 'places' ? 'nav-btn--active' : ''}`}
          onClick={() => onViewChange('places')}
        >
          Все места
        </button>
        <button
          className={`nav-btn ${activeView === 'achievements' ? 'nav-btn--active' : ''}`}
          onClick={() => onViewChange('achievements')}
        >
          🏅 Достижения
        </button>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Переключить тему"
          title="Переключить тему"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
    </header>
  );
}
