import { useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import type { ThemeMode } from '../hooks/useTheme';
import { useI18n, type LangPref } from '../i18n';

const THEME_OPTS: { mode: ThemeMode; labelKey: string; icon: string }[] = [
  { mode: 'light', labelKey: 'settings.theme.light', icon: '☀️' },
  { mode: 'dark', labelKey: 'settings.theme.dark', icon: '🌙' },
  { mode: 'auto', labelKey: 'settings.theme.auto', icon: '🖥️' },
];

const LANG_OPTS: { pref: LangPref; labelKey: string; icon: string }[] = [
  { pref: 'auto', labelKey: 'settings.lang.auto', icon: '🌐' },
  { pref: 'ru', labelKey: 'settings.lang.ru', icon: '🇷🇺' },
  { pref: 'en', labelKey: 'settings.lang.en', icon: '🇬🇧' },
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
const NOTIF_ROWS: { k: keyof Notifs; icon: string }[] = [
  { k: 'push', icon: '🔔' },
  { k: 'messages', icon: '💬' },
  { k: 'achievements', icon: '🏅' },
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
  const { t, pref, setPref } = useI18n();
  const [notifs, setNotifs] = useState<Notifs>(readNotifs);
  const [showOnline, setShowOnline] = useState(user.show_online !== 0);
  const [showBirthyear, setShowBirthyear] = useState(user.show_birthyear !== 0);
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

  // Общий обработчик для приватных тумблеров, которые хранятся на сервере.
  async function savePrivacy(
    field: 'show_online' | 'show_birthyear',
    next: boolean,
    setLocal: (v: boolean) => void,
  ) {
    setLocal(next);
    setSaving(true);
    try {
      const updated = await api.updateMe({ [field]: next ? 1 : 0 });
      onSavedUser(updated);
    } catch {
      setLocal(!next); // откат при ошибке
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-scroll">
      <div className="settings-page">
        <button className="ep-back" onClick={onBack}>
          {t('common.back')}
        </button>
        <h1 className="settings-page-title">{t('settings.title')}</h1>

        <div className="settings-section">
          <div className="settings-label">{t('settings.appearance')}</div>
          <div className="theme-switch">
            {THEME_OPTS.map((th) => (
              <button
                key={th.mode}
                type="button"
                className={`theme-opt ${themeMode === th.mode ? 'theme-opt--active' : ''}`}
                onClick={() => onThemeChange(th.mode)}
              >
                <span className="theme-opt-icon">{th.icon}</span>
                {t(th.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('settings.language')}</div>
          <div className="settings-row-sub" style={{ marginBottom: 10 }}>{t('settings.langSub')}</div>
          <div className="theme-switch">
            {LANG_OPTS.map((l) => (
              <button
                key={l.pref}
                type="button"
                className={`theme-opt ${pref === l.pref ? 'theme-opt--active' : ''}`}
                onClick={() => setPref(l.pref)}
              >
                <span className="theme-opt-icon">{l.icon}</span>
                {t(l.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('settings.privacy')}</div>
          <div className="settings-row">
            <span className="settings-row-icon">🟢</span>
            <span className="settings-row-text">
              <span className="settings-row-title">{t('settings.showOnline.title')}</span>
              <span className="settings-row-sub">{t('settings.showOnline.sub')}</span>
            </span>
            <button
              type="button"
              className={`toggle ${showOnline ? 'toggle--on' : ''}`}
              onClick={() => savePrivacy('show_online', !showOnline, setShowOnline)}
              disabled={saving}
              aria-label={t('settings.showOnline.title')}
            />
          </div>
          <div className="settings-row">
            <span className="settings-row-icon">🎂</span>
            <span className="settings-row-text">
              <span className="settings-row-title">{t('settings.showBirthyear.title')}</span>
              <span className="settings-row-sub">{t('settings.showBirthyear.sub')}</span>
            </span>
            <button
              type="button"
              className={`toggle ${showBirthyear ? 'toggle--on' : ''}`}
              onClick={() => savePrivacy('show_birthyear', !showBirthyear, setShowBirthyear)}
              disabled={saving}
              aria-label={t('settings.showBirthyear.title')}
            />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('settings.notifications')}</div>
          {NOTIF_ROWS.map((row) => (
            <div className="settings-row" key={row.k}>
              <span className="settings-row-icon">{row.icon}</span>
              <span className="settings-row-text">
                <span className="settings-row-title">{t(`notif.${row.k}.title`)}</span>
                <span className="settings-row-sub">{t(`notif.${row.k}.sub`)}</span>
              </span>
              <button
                type="button"
                className={`toggle ${notifs[row.k] ? 'toggle--on' : ''}`}
                onClick={() => toggleNotif(row.k)}
                aria-label={t(`notif.${row.k}.title`)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
