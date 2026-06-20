import { useTheme } from '../hooks/useTheme';
import type { Place, View } from '../types';
import type { DisplayUser } from '../utils/profile';
import type { ChatUser } from '../utils/api';
import ProfileMenu from './ProfileMenu';
import TopSearch from './TopSearch';
import { Icon } from './Icon';

interface TopbarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  user: DisplayUser;
  isAdmin: boolean;
  onLogout: () => void;
  onOpenChat: (u: ChatUser) => void;
  onOpenPlace: (p: Place) => void;
}

const NAV: { view: View; label: string; icon?: string }[] = [
  { view: 'map', label: 'Карта' },
  { view: 'achievements', label: 'Достижения', icon: 'trophy' },
  { view: 'chats', label: 'Чаты', icon: 'chat' },
];

export default function Topbar({
  activeView,
  onNavigate,
  user,
  isAdmin,
  onLogout,
  onOpenChat,
  onOpenPlace,
}: TopbarProps) {
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

      <TopSearch onOpenChat={onOpenChat} onOpenPlace={onOpenPlace} />

      <nav className="topbar-nav">
        {NAV.map((n) => (
          <button
            key={n.view}
            className={`nav-btn ${activeView === n.view ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate(n.view)}
          >
            {n.icon && <Icon name={n.icon} className="nav-btn-icon" />}
            {n.label}
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
