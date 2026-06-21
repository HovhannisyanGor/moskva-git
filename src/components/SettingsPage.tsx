import { useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import type { ThemeMode } from '../hooks/useTheme';

const THEME_OPTS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Светлая', icon: '☀️' },
  { mode: 'dark', label: 'Тёмная', icon: '🌙' },
  { mode: 'auto', label: 'Авто', icon: '🖥️' },
];

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
const NOTIF_ROWS: { k: keyof Notifs; icon: string; title: string; sub: string }[] = [
  { k: 'push', icon: '🔔', title: 'Push-уведомления', sub: 'Новые места и события' },
  { k: 'messages', icon: '💬', title: 'Сообщения', sub: 'Чаты и группы' },
  { k: 'achievements', icon: '🏅', title: 'Достижения', sub: 'Новые бейджи и уровни' },
];

export default function SettingsPage({
  user,
  onSavedUser,
  onBack,
  themeMode,
  onThemeChange,
}: {
  user: ApiUser;
  onSavedUser: (u: ApiUser) => void;
  onBack: () => void;
  themeMode: ThemeMode;
  onThemeChange: (m: ThemeMode) => void;
}) {
  const [notifs, setNotifs] = useState<Notifs>(readNotifs);
  const [showOnline, setShowOnline] = useState(user.show_online !== 0);
  const [saving, setSaving] = useState(false);

  function toggleNotif(k: keyof Notifs) {
    setNotifs((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function toggleShowOnline() {
    const next = !showOnline;
    setShowOnline(next);
    setSaving(true);
    try {
      const updated = await api.updateMe({ show_online: next ? 1 : 0 });
      onSavedUser(updated);
    } catch {
      setShowOnline(!next); // откат при ошибке
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-scroll">
      <div className="settings-page">
        <button className="ep-back" onClick={onBack}>
          ← Назад
        </button>
        <h1 className="settings-page-title">Настройки</h1>

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
        </div>

        <div className="settings-section">
          <div className="settings-label">Конфиденциальность</div>
          <div className="settings-row">
            <span className="settings-row-icon">🟢</span>
            <span className="settings-row-text">
              <span className="settings-row-title">Показывать, что я в сети</span>
              <span className="settings-row-sub">Другие видят ваш онлайн-статус</span>
            </span>
            <button
              type="button"
              className={`toggle ${showOnline ? 'toggle--on' : ''}`}
              onClick={toggleShowOnline}
              disabled={saving}
              aria-label="Показывать онлайн"
            />
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
      </div>
    </div>
  );
}
