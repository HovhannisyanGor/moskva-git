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
        <img
          className="logo-mark"
          src={theme === 'dark' ? '/localee-dark.png' : '/localee-light.png'}
          alt="Localee"
        />
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
