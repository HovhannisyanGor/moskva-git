import { useTheme } from '../hooks/useTheme';
import type { View } from '../types';
import type { DisplayUser } from '../utils/profile';
import ProfileMenu from './ProfileMenu';

interface TopbarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  user: DisplayUser;
  onLogout: () => void;
}

const NAV: { view: View; label: string }[] = [
  { view: 'map', label: 'Карта' },
  { view: 'places', label: 'Все места' },
  { view: 'achievements', label: '🏅 Достижения' },
  { view: 'chats', label: '💬 Чаты' },
];

export default function Topbar({ activeView, onNavigate, user, onLogout }: TopbarProps) {
  const { mode, setMode, effective } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <img
          className="logo-mark"
          src={effective === 'dark' ? '/localee-dark.png' : '/localee-light.png'}
          alt="Localee"
        />
        <span className="logo-text">Localee</span>
        <span className="logo-tagline">— исследуй город умно</span>
      </div>

      <nav className="topbar-nav">
        {NAV.map((n) => (
          <button
            key={n.view}
            className={`nav-btn ${activeView === n.view ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate(n.view)}
          >
            {n.label}
          </button>
        ))}

        <ProfileMenu
          themeMode={mode}
          onThemeChange={setMode}
          onNavigate={onNavigate}
          user={user}
          onLogout={onLogout}
        />
      </nav>
    </header>
  );
}
