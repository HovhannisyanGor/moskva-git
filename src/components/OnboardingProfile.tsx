import { useRef, useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import { useI18n } from '../i18n';
import { fileToAvatar } from '../utils/avatar';
import { GENDER_OPTS, CITY_OPTS } from './profileFields';
import InterestsInput from './InterestsInput';

// Второй шаг регистрации — «Расскажите о себе»: фото, дата рождения, пол, город,
// интересы, описание. Всё необязательно: можно пропустить и заполнить позже.
export default function OnboardingProfile({
  user,
  onDone,
}: {
  user: ApiUser;
  onDone: (u: ApiUser) => void;
}) {
  const { t, lang } = useI18n();
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [birthdate, setBirthdate] = useState(user.birthdate || '');
  const [gender, setGender] = useState(user.gender || '');
  const [city, setCity] = useState(user.city || 'Москва');
  const [bio, setBio] = useState(user.bio || '');
  const [interests, setInterests] = useState<string[]>(
    (user.interests || '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(t('ep.fileTooBig'));
      return;
    }
    try {
      setError('');
      setAvatar(await fileToAvatar(file));
    } catch {
      setError(t('ep.imageError'));
    }
  }

  async function finish() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateMe({ avatar, birthdate, gender, city, bio, interests });
      onDone(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('ep.saveError'));
      setBusy(false);
    }
  }

  const avatarStyle = avatar
    ? { backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: user.color };

  return (
    <div className="onb-screen">
      <div className="onb-card">
        <h1 className="onb-title">{t('onb.title')}</h1>
        <p className="onb-sub">{t('onb.sub')}</p>

        <div className="onb-avatar-row">
          <div className="onb-avatar" style={avatarStyle}>
            {avatar ? '' : user.letter}
          </div>
          <div className="onb-avatar-side">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <button className="ep-upload" type="button" onClick={() => fileRef.current?.click()}>
              {avatar ? t('onb.replace') : t('onb.upload')}
            </button>
            {avatar && (
              <button className="ep-upload" type="button" onClick={() => setAvatar('')} style={{ marginLeft: 8 }}>
                {t('onb.remove')}
              </button>
            )}
            <div className="onb-avatar-sub">{t('onb.avatarSub')}</div>
          </div>
        </div>

        <label className="ep-field">
          <span className="ep-label">{t('onb.birthday')}</span>
          <input
            className="ep-input"
            type="date"
            value={birthdate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </label>

        <div className="ep-field">
          <span className="ep-label">{t('onb.gender')}</span>
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
          <span className="ep-label">{t('onb.city')}</span>
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

        <div className="ep-field">
          <span className="ep-label">{t('onb.interests')}</span>
          <InterestsInput value={interests} onChange={setInterests} placeholder={t('onb.interestsPh')} />
        </div>

        <label className="ep-field">
          <span className="ep-label">{t('onb.about')}</span>
          <textarea
            className="ep-input ep-textarea"
            rows={3}
            value={bio}
            placeholder={t('onb.aboutPh')}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <div className="onb-actions">
          <button className="onb-skip" type="button" onClick={() => onDone(user)} disabled={busy}>
            {t('onb.skip')}
          </button>
          <button className="onb-finish" type="button" onClick={finish} disabled={busy}>
            {busy ? t('common.saving') : t('onb.finish')}
          </button>
        </div>
      </div>
    </div>
  );
}
