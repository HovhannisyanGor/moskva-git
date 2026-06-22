import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { Place, View } from '../types';
import type { DisplayUser } from '../utils/profile';
import ProfileMenu from './ProfileMenu';
import TopSearch from './TopSearch';
import { Icon } from './Icon';

interface TopbarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  user: DisplayUser;
  isAdmin: boolean;
  chatsUnread?: number;
  onLogout: () => void;
  onOpenProfile: (id: number) => void;
  onOpenPlace: (p: Place) => void;
}

const NAV: { view: View; labelKey: string; icon?: string }[] = [
  { view: 'map', labelKey: 'nav.map' },
  { view: 'achievements', labelKey: 'nav.achievements', icon: 'trophy' },
  { view: 'chats', labelKey: 'nav.chats', icon: 'chat' },
];

export default function Topbar({
  activeView,
  onNavigate,
  user,
  isAdmin,
  chatsUnread = 0,
  onLogout,
  onOpenProfile,
  onOpenPlace,
}: TopbarProps) {
  const { mode, setMode, effective } = useTheme();
  const { t } = useI18n();

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
        <span className="logo-tagline">{t('topbar.tagline')}</span>
      </button>

      <TopSearch onOpenProfile={onOpenProfile} onOpenPlace={onOpenPlace} />

      <nav className="topbar-nav">
        {NAV.map((n) => (
          <button
            key={n.view}
            className={`nav-btn ${activeView === n.view ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate(n.view)}
          >
            {n.icon && <Icon name={n.icon} className="nav-btn-icon" />}
            {t(n.labelKey)}
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
            🛠 {t('nav.admin')}
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
