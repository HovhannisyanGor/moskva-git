import { useRef, useState } from 'react';
import { api, ApiError, type PostItem } from '../utils/api';
import { fileToImage } from '../utils/avatar';
import { useI18n } from '../i18n';

// Поле «написать пост»: текст + необязательная картинка. Используется в ленте и в профиле.
export default function PostComposer({
  me,
  onPosted,
}: {
  me: { avatar: string; color: string; letter: string };
  onPosted: (p: PostItem) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      setImage(await fileToImage(file, 1280, 0.82));
    } catch {
      setError(t('ep.imageError'));
    }
  }

  async function publish() {
    const body = text.trim();
    if ((!body && !image) || busy) return;
    setBusy(true);
    setError('');
    try {
      const post = await api.createPost({ text: body, image: image || undefined });
      onPosted(post);
      setText('');
      setImage('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  const avStyle = me.avatar
    ? { backgroundImage: `url(${me.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: me.color };

  return (
    <div className="composer">
      <div className="composer-top">
        <span className="composer-av" style={avStyle}>
          {me.avatar ? '' : me.letter}
        </span>
        <textarea
          className="composer-input"
          placeholder={t('post.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={4000}
        />
      </div>

      {image && (
        <div className="composer-preview">
          <img src={image} alt="" />
          <button
            type="button"
            className="composer-preview-x"
            onClick={() => setImage('')}
            aria-label={t('post.removePhoto')}
          >
            ×
          </button>
        </div>
      )}

      {error && <div className="composer-error">⚠️ {error}</div>}

      <div className="composer-actions">
        <button type="button" className="composer-photo" onClick={() => fileRef.current?.click()}>
          📷 {t('post.addPhoto')}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
        <button
          type="button"
          className="composer-publish"
          onClick={publish}
          disabled={busy || (!text.trim() && !image)}
        >
          {busy ? t('post.posting') : t('post.publish')}
        </button>
      </div>
    </div>
  );
}
