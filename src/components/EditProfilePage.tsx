import { useRef, useState } from 'react';
import { api, type ApiUser } from '../utils/api';
import type { DisplayUser } from '../utils/profile';

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
const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Другой'];

// Уменьшаем выбранное фото до 256×256 (обрезка по центру) и отдаём как data URL —
// чтобы аватар занимал мало места и помещался в базу.
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('img'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('ctx'));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function EditProfilePage({ user, onSaved, onBack, onResetAchievements }: EditProfilePageProps) {
  const u = user;
  const [avatarChar, setAvatarChar] = useState(u.letter); // буква или эмодзи на аватаре
  const [avatarColor, setAvatarColor] = useState(u.color);
  const [avatarImg, setAvatarImg] = useState(u.avatar || ''); // фото (data URL) или пусто
  const [name, setName] = useState(u.name);
  const [handle, setHandle] = useState(u.handle);
  const [bio, setBio] = useState(u.bio);
  const [city, setCity] = useState(u.city);
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
      setError('Файл слишком большой (до 10 МБ)');
      return;
    }
    try {
      setError('');
      setAvatarImg(await fileToAvatar(file));
    } catch {
      setError('Не удалось обработать изображение');
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
        color: avatarColor,
        letter: avatarChar,
        avatar: avatarImg,
      });
      onSaved(updated);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  }

  function handleResetAchievements() {
    const ok = window.confirm(
      'Сбросить все достижения и отметки о посещённых местах? Это действие нельзя отменить.',
    );
    if (ok) onResetAchievements();
  }

  const avatarStyle = avatarImg
    ? { backgroundImage: `url(${avatarImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: avatarColor };

  return (
    <div className="page-scroll">
      <div className="edit-page">
        <button className="ep-back" onClick={onBack}>
          ← Назад к профилю
        </button>
        <h1 className="ep-title">Редактировать профиль</h1>

        <div className="ep-avatar-row">
          <div className="ep-avatar" style={avatarStyle}>
            {avatarImg ? '' : avatarChar}
          </div>
          <div>
            <div className="ep-avatar-title">Аватар</div>
            <div className="ep-avatar-sub">Загрузи фото или собери из цвета и эмодзи</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <button className="ep-upload" type="button" onClick={() => fileRef.current?.click()}>
              {avatarImg ? 'Заменить фото' : 'Загрузить фото'}
            </button>
            {avatarImg && (
              <button
                className="ep-upload"
                type="button"
                onClick={() => setAvatarImg('')}
                style={{ marginLeft: 8 }}
              >
                Убрать фото
              </button>
            )}
          </div>
        </div>

        {!avatarImg && (
          <>
            <div className="ep-field">
              <span className="ep-label">Цвет</span>
              <div className="ep-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Цвет ${c}`}
                    className={`ep-swatch ${avatarColor === c ? 'ep-swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => pickColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="ep-field">
              <span className="ep-label">Иконка</span>
              <div className="ep-emoji-grid">
                <button
                  type="button"
                  className={`ep-emoji ${usingLetter ? 'ep-emoji--active' : ''}`}
                  onClick={useLetter}
                  title="Первая буква имени"
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
            <button className="ep-danger-btn" type="button" onClick={handleResetAchievements}>
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

        {error && <div style={{ color: '#d23c3c', fontSize: 14, marginTop: 12 }}>⚠️ {error}</div>}

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
