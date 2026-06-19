import { useTheme } from '../hooks/useTheme';
import type { View } from '../types';
import type { DisplayUser } from '../utils/profile';
import ProfileMenu from './ProfileMenu';

interface TopbarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  user: DisplayUser;
  isAdmin: boolean;
  chatsUnread?: number;
  onLogout: () => void;
}

const NAV: { view: View; label: string }[] = [
  { view: 'map', label: 'Карта' },
  { view: 'achievements', label: '🏅 Достижения' },
  { view: 'chats', label: '💬 Чаты' },
];

export default function Topbar({ activeView, onNavigate, user, isAdmin, chatsUnread = 0, onLogout }: TopbarProps) {
  const { mode, setMode, effective } = useTheme();

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-logo"
        onClick={() => onNavigate('map')}
        title="На главную"
      >
        <img
          className="logo-mark"
          src={effective === 'dark' ? '/localee-dark.png' : '/localee-light.png'}
          alt="Localee"
        />
        <span className="logo-text">Localee</span>
        <span className="logo-tagline">— исследуй город умно</span>
      </button>

      <nav className="topbar-nav">
        {NAV.map((n) => (
          <button
            key={n.view}
            className={`nav-btn ${activeView === n.view ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate(n.view)}
          >
            {n.label}
            {n.view === 'chats' && chatsUnread > 0 && (
              <span className="nav-badge nav-badge--inline">{chatsUnread > 99 ? '99+' : chatsUnread}</span>
            )}
          </button>
        ))}

        {isAdmin && (
          <button
            className={`nav-btn ${activeView === 'admin' ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate('admin')}
          >
            🛠 Админка
          </button>
        )}

        <ProfileMenu
          themeMode={mode}
          onThemeChange={setMode}
          onNavigate={onNavigate}
          user={user}
          isAdmin={isAdmin}
          onLogout={onLogout}
        />
      </nav>
    </header>
  );
}
