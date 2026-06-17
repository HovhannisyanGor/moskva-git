import { useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import type { DisplayUser } from '../utils/profile';

interface EditProfilePageProps {
  user: DisplayUser;
  onSaved: (u: ApiUser) => void;
  onBack: () => void;
}

const AV_COLORS = [
  { letter: 'Э', color: '#FA3C3C' },
  { letter: 'А', color: '#378ADD' },
  { letter: 'М', color: '#3FAE6E' },
  { letter: 'К', color: '#BA7517' },
  { letter: 'С', color: '#9B7FE6' },
  { letter: 'Д', color: '#E0568A' },
];
const AV_EMOJI = ['🦊', '🐺', '🦁', '🐻', '🦉', '🐲'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Другой'];

export default function EditProfilePage({ user, onSaved, onBack }: EditProfilePageProps) {
  const u = user;
  const [showMore, setShowMore] = useState(false);
  const [avatar, setAvatar] = useState(u.letter);
  const [avatarColor, setAvatarColor] = useState(u.color);
  const [name, setName] = useState(u.name);
  const [handle, setHandle] = useState(u.handle);
  const [bio, setBio] = useState(u.bio);
  const [city, setCity] = useState(u.city);
  const [email] = useState(u.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateMe({
        name,
        handle,
        bio,
        city,
        color: avatarColor,
        letter: avatar,
      });
      onSaved(updated);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-scroll">
      <div className="edit-page">
        <button className="ep-back" onClick={onBack}>
          ← Назад к профилю
        </button>
        <h1 className="ep-title">Редактировать профиль</h1>

        <div className="ep-avatar-row">
          <div className="ep-avatar" style={{ background: avatarColor }}>
            {avatar}
          </div>
          <div>
            <div className="ep-avatar-title">Аватар</div>
            <div className="ep-avatar-sub">Выбери из стандартных или загрузи своё фото</div>
            <button className="ep-upload" type="button">
              Загрузить фото
            </button>
          </div>
        </div>

        <div className="ep-avatar-grid">
          <div className="ep-av-line">
            {AV_COLORS.map((a) => (
              <button
                key={a.letter}
                type="button"
                className={`ep-av ${avatar === a.letter ? 'ep-av--active' : ''}`}
                style={{ background: a.color }}
                onClick={() => {
                  setAvatar(a.letter);
                  setAvatarColor(a.color);
                }}
              >
                {a.letter}
              </button>
            ))}
            <button
              type="button"
              className={`ep-av ep-av--more ${showMore ? 'ep-av--active' : ''}`}
              onClick={() => setShowMore((s) => !s)}
              aria-label={showMore ? 'Скрыть варианты' : 'Больше вариантов'}
            >
              {showMore ? '×' : '+'}
            </button>
          </div>
          {showMore && (
            <div className="ep-av-line ep-av-line--more">
              {AV_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`ep-av ep-av--emoji ${avatar === e ? 'ep-av--active' : ''}`}
                  onClick={() => {
                    setAvatar(e);
                    setAvatarColor('var(--bg-3)');
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="ep-field">
          <span className="ep-label">Имя</span>
          <input className="ep-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="ep-field">
          <span className="ep-label">Никнейм</span>
          <input className="ep-input" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <span className="ep-hint">localee.app/@{handle}</span>
        </label>

        <label className="ep-field">
          <span className="ep-label">О себе</span>
          <textarea
            className="ep-input ep-textarea"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        <div className="ep-field">
          <span className="ep-label">Город</span>
          <div className="ep-chips">
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`ep-chip ${city === c ? 'ep-chip--active' : ''}`}
                onClick={() => setCity(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="ep-field">
          <span className="ep-label">Email</span>
          <input className="ep-input" type="email" value={email} readOnly />
          <span className="ep-hint">Email пока нельзя изменить</span>
        </label>

        <div className="ep-danger">
          <div className="ep-danger-label">Опасная зона</div>
          <div className="ep-danger-row">
            <span>Сбросить достижения</span>
            <button className="ep-danger-btn" type="button">
              Сбросить
            </button>
          </div>
          <div className="ep-danger-row">
            <span>Удалить аккаунт</span>
            <button className="ep-danger-btn" type="button">
              Удалить
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#d23c3c', fontSize: 14, marginTop: 12 }}>⚠️ {error}</div>
        )}

        <div className="ep-actions">
          <button className="ep-cancel" type="button" onClick={onBack} disabled={busy}>
            Отмена
          </button>
          <button className="ep-save" type="button" onClick={save} disabled={busy}>
            {busy ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
}
