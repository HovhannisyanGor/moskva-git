import { useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '../hooks/useTheme';
import type { View } from '../types';
import type { DisplayUser } from '../utils/profile';
import { useI18n } from '../i18n';

interface ProfileMenuProps {
  themeMode: ThemeMode;
  onThemeChange: (m: ThemeMode) => void;
  onNavigate: (v: View) => void;
  user: DisplayUser;
  onLogout: () => void;
  isAdmin?: boolean; // показывать пункт «Админка»
  navMode?: boolean; // режим вкладки нижней навигации (мобила): аватар + подпись «Профиль»
  navActive?: boolean; // подсветка, когда открыта страница профиля
}

type Notifs = { push: boolean; messages: boolean; achievements: boolean };
const NOTIF_KEY = 'localee_notifications';

function readNotifs(): Notifs {
  try {
    const v = JSON.parse(localStorage.getItem(NOTIF_KEY) || 'null');
    if (v && typeof v === 'object') {
      return { push: !!v.push, messages: !!v.messages, achievements: !!v.achievements };
    }
  } catch {
    /* ignore */
  }
  return { push: true, messages: true, achievements: false };
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 19.5c0-3.8 3.4-5.8 7.5-5.8s7.5 2 7.5 5.8v.5h-15z" />
    </svg>
  );
}

const THEME_OPTS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Светлая', icon: '☀️' },
  { mode: 'dark', label: 'Тёмная', icon: '🌙' },
  { mode: 'auto', label: 'Авто', icon: '🖥️' },
];

const NOTIF_ROWS: { k: keyof Notifs; icon: string; title: string; sub: string }[] = [
  { k: 'push', icon: '🔔', title: 'Push-уведомления', sub: 'Новые места и события' },
  { k: 'messages', icon: '💬', title: 'Сообщения', sub: 'Чаты и группы' },
  { k: 'achievements', icon: '🏅', title: 'Достижения', sub: 'Новые бейджи и уровни' },
];

export default function ProfileMenu({
  themeMode,
  onThemeChange,
  onNavigate,
  user,
  onLogout,
  isAdmin = false,
  navMode = false,
  navActive = false,
}: ProfileMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const [notifs, setNotifs] = useState<Notifs>(readNotifs);
  const ref = useRef<HTMLDivElement>(null);

  const u = user;
  const progress = Math.min(1, u.points / u.levelNext);

  useEffect(() => {
    if (!open) {
      setView('menu');
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleNotif = (k: keyof Notifs) => {
    setNotifs((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const go = (v: View) => {
    setOpen(false);
    onNavigate(v);
  };

  const avatarStyle = u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };

  return (
    <div className={`topbar-profile${navMode ? ' topbar-profile--nav' : ''}`} ref={ref}>
      {navMode ? (
        <button
          className={`profile-nav-btn${open || navActive ? ' profile-nav-btn--active' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={t('nav.profile')}
        >
          <span className="profile-nav-av" style={avatarStyle}>
            {u.avatar ? '' : u.letter || ''}
          </span>
          <span>{t('nav.profile')}</span>
        </button>
      ) : (
        <button
          className={`profile-btn ${open ? 'profile-btn--active' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={t('nav.profile')}
          style={avatarStyle}
        >
          {u.avatar ? null : u.letter ? (
            <span className="profile-btn-letter">{u.letter}</span>
          ) : (
            <PersonIcon />
          )}
        </button>
      )}

      {open && <div className="profile-backdrop" onClick={() => setOpen(false)} />}

      {open && (
        <div className="profile-dropdown">
          {view === 'menu' ? (
            <>
              <button className="profile-header profile-header--btn" onClick={() => go('profile')}>
                <div
                  className="profile-avatar"
                  style={u.avatar ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: u.color }}
                >
                  {u.avatar ? '' : u.letter}
                </div>
                <div className="profile-id">
                  <div className="profile-name">{u.name}</div>
                  <div className="profile-handle">
                    @{u.handle} · #{u.id}
                  </div>
                </div>
              </button>

              <div className="profile-stats">
                <div className="profile-stat">
                  <b>{u.places}</b>
                  <span>{t('menu.statPlaces')}</span>
                </div>
                <div className="profile-stat">
                  <b>{u.badges}</b>
                  <span>{t('menu.statBadges')}</span>
                </div>
                <div className="profile-stat">
                  <b>{u.points}</b>
                  <span>{t('menu.statPoints')}</span>
                </div>
              </div>

              <div className="profile-level">
                <div className="profile-level-top">
                  <span>{t('profile.level', { level: u.level, name: t(`level.${u.level}`) })}</span>
                  <span className="profile-level-tag">{t('profile.levelTag', { level: u.level })}</span>
                </div>
                <div className="profile-level-bar">
                  <div className="profile-level-fill" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="profile-level-sub">
                  {t('profile.levelSub', { points: u.points, next: u.levelNext, nextLevel: u.level + 1 })}
                </div>
              </div>

              <div className="profile-menu">
                <button className="profile-menu-item" type="button" onClick={() => go('profile')}>
                  <span className="profile-menu-icon">👤</span>
                  <span className="profile-menu-text">
                    <span className="profile-menu-title">{t('menu.myProfile')}</span>
                    <span className="profile-menu-sub">{t('menu.myProfileSub')}</span>
                  </span>
                  <span className="profile-menu-arrow">›</span>
                </button>
                <button className="profile-menu-item" type="button" onClick={() => go('chats')}>
                  <span className="profile-menu-icon">💬</span>
                  <span className="profile-menu-text">
                    <span className="profile-menu-title">{t('menu.chats')}</span>
                    <span className="profile-menu-sub">{t('menu.chatsSub')}</span>
                  </span>
                  <span className="profile-menu-arrow">›</span>
                </button>
                <button className="profile-menu-item" type="button" onClick={() => go('favorites')}>
                  <span className="profile-menu-icon">⭐</span>
                  <span className="profile-menu-text">
                    <span className="profile-menu-title">{t('menu.favorites')}</span>
                    <span className="profile-menu-sub">{t('menu.favoritesSub')}</span>
                  </span>
                  <span className="profile-menu-arrow">›</span>
                </button>
                <button className="profile-menu-item" type="button" onClick={() => go('friends')}>
                  <span className="profile-menu-icon">🤝</span>
                  <span className="profile-menu-text">
                    <span className="profile-menu-title">{t('menu.friends')}</span>
                    <span className="profile-menu-sub">{t('menu.friendsSub')}</span>
                  </span>
                  <span className="profile-menu-arrow">›</span>
                </button>
                {isAdmin && (
                  <button className="profile-menu-item" type="button" onClick={() => go('admin')}>
                    <span className="profile-menu-icon">🛠</span>
                    <span className="profile-menu-text">
                      <span className="profile-menu-title">{t('menu.admin')}</span>
                      <span className="profile-menu-sub">{t('menu.adminSub')}</span>
                    </span>
                    <span className="profile-menu-arrow">›</span>
                  </button>
                )}
                <button className="profile-menu-item" type="button" onClick={() => go('settings')}>
                  <span className="profile-menu-icon">⚙️</span>
                  <span className="profile-menu-text">
                    <span className="profile-menu-title">{t('menu.settings')}</span>
                    <span className="profile-menu-sub">{t('menu.settingsSub')}</span>
                  </span>
                  <span className="profile-menu-arrow">›</span>
                </button>
                <button
                  className="profile-menu-item profile-menu-item--danger"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                >
                  <span className="profile-menu-icon">↩</span>
                  <span className="profile-menu-text">
                    <span className="profile-menu-title">{t('menu.logout')}</span>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="settings-head">
                <button
                  className="settings-back"
                  type="button"
                  onClick={() => setView('menu')}
                  aria-label="Назад"
                >
                  ‹
                </button>
                <span>Настройки</span>
              </div>

              <div className="settings-section">
                <div className="settings-label">Внешний вид</div>
                <div className="theme-switch">
                  {THEME_OPTS.map((t) => (
                    <button
                      key={t.mode}
                      type="button"
                      className={`theme-opt ${themeMode === t.mode ? 'theme-opt--active' : ''}`}
                      onClick={() => onThemeChange(t.mode)}
                    >
                      <span className="theme-opt-icon">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">🗺️</span>
                  <span className="settings-row-text">
                    <span className="settings-row-title">Язык карты</span>
                    <span className="settings-row-sub">Названия на карте</span>
                  </span>
                  <span className="settings-row-value">Русский</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label">Уведомления</div>
                {NOTIF_ROWS.map((row) => (
                  <div className="settings-row" key={row.k}>
                    <span className="settings-row-icon">{row.icon}</span>
                    <span className="settings-row-text">
                      <span className="settings-row-title">{row.title}</span>
                      <span className="settings-row-sub">{row.sub}</span>
                    </span>
                    <button
                      type="button"
                      className={`toggle ${notifs[row.k] ? 'toggle--on' : ''}`}
                      onClick={() => toggleNotif(row.k)}
                      aria-label={row.title}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
