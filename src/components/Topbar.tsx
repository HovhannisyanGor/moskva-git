interface TopbarProps {
  activeView: 'map' | 'places' | 'achievements';
  onViewChange: (view: 'map' | 'places' | 'achievements') => void;
}

export default function Topbar({ activeView, onViewChange }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="logo-icon">◈</span>
        <span className="logo-text">localee</span>
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
      </nav>
    </header>
  );
}
