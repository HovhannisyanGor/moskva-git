import { useRef, useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import type { DisplayUser } from '../utils/profile';
import { useI18n } from '../i18n';
import { fileToAvatar } from '../utils/avatar';
import { GENDER_OPTS, CITY_OPTS } from './profileFields';
import InterestsInput from './InterestsInput';

interface EditProfilePageProps {
  user: DisplayUser;
  onSaved: (u: ApiUser) => void;
  onBack: () => void;
  onResetAchievements: () => void;
}

// Палитра цветов фона аватара.
const COLORS = [
  '#FA3C3C', '#378ADD', '#3FAE6E', '#BA7517', '#9B7FE6',
  '#E0568A', '#D4537E', '#16A39A', '#E8893B', '#5B6CE8',
];
// Эмодзи для аватара.
const EMOJIS = [
  '🦊', '🐺', '🦁', '🐻', '🦉', '🐲', '🐱', '🐶', '🐼',
  '🐸', '🦄', '🐧', '🗺️', '⭐', '🔥', '🎒', '☕', '🎧',
];

export default function EditProfilePage({ user, onSaved, onBack, onResetAchievements }: EditProfilePageProps) {
  const u = user;
  const { t, lang } = useI18n();
  const [avatarChar, setAvatarChar] = useState(u.letter); // буква или эмодзи на аватаре
  const [avatarColor, setAvatarColor] = useState(u.color);
  const [avatarImg, setAvatarImg] = useState(u.avatar || ''); // фото (data URL) или пусто
  const [name, setName] = useState(u.name);
  const [handle, setHandle] = useState(u.handle);
  const [bio, setBio] = useState(u.bio);
  const [city, setCity] = useState(u.city);
  const [birthdate, setBirthdate] = useState(u.birthdate || '');
  const [gender, setGender] = useState(u.gender || '');
  const [interests, setInterests] = useState<string[]>(u.interests);
  const [email] = useState(u.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const usingLetter = !EMOJIS.includes(avatarChar);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // позволяем выбрать тот же файл повторно
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(t('ep.fileTooBig'));
      return;
    }
    try {
      setError('');
      setAvatarImg(await fileToAvatar(file));
    } catch {
      setError(t('ep.imageError'));
    }
  }

  function pickColor(c: string) {
    setAvatarColor(c);
    setAvatarImg(''); // выбрали цвет — показываем цвет, а не фото
  }
  function pickEmoji(e: string) {
    setAvatarChar(e);
    setAvatarImg('');
  }
  function useLetter() {
    setAvatarChar((name.trim()[0] || '?').toUpperCase());
    setAvatarImg('');
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateMe({
        name,
        handle,
        bio,
        city,
        birthdate,
        gender,
        interests,
        color: avatarColor,
        letter: avatarChar,
        avatar: avatarImg,
      });
      onSaved(updated);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('ep.saveError'));
    } finally {
      setBusy(false);
    }
  }

  function handleResetAchievements() {
    const ok = window.confirm(t('ep.resetConfirm'));
    if (ok) onResetAchievements();
  }

  const avatarStyle = avatarImg
    ? { backgroundImage: `url(${avatarImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: avatarColor };

  return (
    <div className="page-scroll">
      <div className="edit-page">
        <button className="ep-back" onClick={onBack}>
          {t('ep.back')}
        </button>
        <h1 className="ep-title">{t('ep.title')}</h1>

        <div className="ep-avatar-row">
          <div className="ep-avatar" style={avatarStyle}>
            {avatarImg ? '' : avatarChar}
          </div>
          <div>
            <div className="ep-avatar-title">{t('ep.avatar')}</div>
            <div className="ep-avatar-sub">{t('ep.avatarSub')}</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <button className="ep-upload" type="button" onClick={() => fileRef.current?.click()}>
              {avatarImg ? t('ep.replace') : t('ep.upload')}
            </button>
            {avatarImg && (
              <button
                className="ep-upload"
                type="button"
                onClick={() => setAvatarImg('')}
                style={{ marginLeft: 8 }}
              >
                {t('ep.removePhoto')}
              </button>
            )}
          </div>
        </div>

        {!avatarImg && (
          <>
            <div className="ep-field">
              <span className="ep-label">{t('ep.color')}</span>
              <div className="ep-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`${t('ep.color')} ${c}`}
                    className={`ep-swatch ${avatarColor === c ? 'ep-swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => pickColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="ep-field">
              <span className="ep-label">{t('ep.icon')}</span>
              <div className="ep-emoji-grid">
                <button
                  type="button"
                  className={`ep-emoji ${usingLetter ? 'ep-emoji--active' : ''}`}
                  onClick={useLetter}
                  title={t('ep.letterTitle')}
                >
                  Аа
                </button>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`ep-emoji ${avatarChar === e ? 'ep-emoji--active' : ''}`}
                    onClick={() => pickEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <label className="ep-field">
          <span className="ep-label">{t('ep.name')}</span>
          <input className="ep-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="ep-field">
          <span className="ep-label">{t('ep.nickname')}</span>
          <input className="ep-input" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <span className="ep-hint">localee.app/@{handle}</span>
        </label>

        <label className="ep-field">
          <span className="ep-label">{t('ep.about')}</span>
          <textarea
            className="ep-input ep-textarea"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        <label className="ep-field">
          <span className="ep-label">{t('ep.birthday')}</span>
          <input
            className="ep-input"
            type="date"
            value={birthdate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </label>

        <div className="ep-field">
          <span className="ep-label">{t('ep.gender')}</span>
          <div className="ep-chips">
            {GENDER_OPTS.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`ep-chip ${gender === g.value ? 'ep-chip--active' : ''}`}
                onClick={() => setGender(gender === g.value ? '' : g.value)}
              >
                {t(g.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="ep-field">
          <span className="ep-label">{t('ep.interests')}</span>
          <InterestsInput value={interests} onChange={setInterests} placeholder={t('ep.interestsHint')} />
        </div>

        <div className="ep-field">
          <span className="ep-label">{t('ep.city')}</span>
          <div className="ep-chips">
            {CITY_OPTS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`ep-chip ${city === c.value ? 'ep-chip--active' : ''}`}
                onClick={() => setCity(c.value)}
              >
                {lang === 'en' ? c.en : c.value}
              </button>
            ))}
          </div>
        </div>

        <label className="ep-field">
          <span className="ep-label">{t('ep.email')}</span>
          <input className="ep-input" type="email" value={email} readOnly />
          <span className="ep-hint">{t('ep.emailHint')}</span>
        </label>

        <div className="ep-danger">
          <div className="ep-danger-label">{t('ep.danger')}</div>
          <div className="ep-danger-row">
            <span>{t('ep.resetAch')}</span>
            <button className="ep-danger-btn" type="button" onClick={handleResetAchievements}>
              {t('ep.reset')}
            </button>
          </div>
          <div className="ep-danger-row">
            <span>{t('ep.deleteAcc')}</span>
            <button className="ep-danger-btn" type="button">
              {t('ep.delete')}
            </button>
          </div>
        </div>

        {error && <div style={{ color: '#d23c3c', fontSize: 14, marginTop: 12 }}>⚠️ {error}</div>}

        <div className="ep-actions">
          <button className="ep-cancel" type="button" onClick={onBack} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className="ep-save" type="button" onClick={save} disabled={busy}>
            {busy ? t('common.saving') : t('ep.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
