import { useRef, useState } from 'react';
import { api, ApiError, type PostItem, type Attachment } from '../utils/api';
import { addFiles, MAX_ATTACHMENTS } from '../utils/attachments';
import { AttachmentPreviewRow, ClipIcon, PhotoIcon } from './Attachments';
import { useI18n } from '../i18n';

// Поле «написать пост»: текст + вложения (несколько фото и файлы, как в приложении).
// Используется в ленте и в профиле.
export default function PostComposer({
  me,
  onPosted,
}: {
  me: { avatar: string; color: string; letter: string };
  onPosted: (p: PostItem) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'file') {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setError('');
    const { list, error: err } = await addFiles(atts, files, kind);
    setAtts(list);
    if (err) setError(t(`att.err.${err}`));
  }

  async function publish() {
    const body = text.trim();
    if ((!body && atts.length === 0) || busy) return;
    setBusy(true);
    setError('');
    try {
      const post = await api.createPost({
        text: body,
        attachments: atts.length > 0 ? atts : undefined,
      });
      onPosted(post);
      setText('');
      setAtts([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  const avStyle = me.avatar
    ? { backgroundImage: `url(${me.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: me.color };
  const full = atts.length >= MAX_ATTACHMENTS;

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

      <AttachmentPreviewRow
        items={atts}
        onRemove={(i) => {
          setAtts((p) => p.filter((_, x) => x !== i));
          setError(''); // человек убрал лишнее — предупреждение больше не актуально
        }}
      />

      {error && <div className="composer-error">⚠️ {error}</div>}

      <div className="composer-actions">
        <button
          type="button"
          className="composer-attach"
          onClick={() => photoRef.current?.click()}
          disabled={full}
          title={t('post.addPhoto')}
        >
          <PhotoIcon /> {t('post.addPhoto')}
        </button>
        <button
          type="button"
          className="composer-attach"
          onClick={() => fileRef.current?.click()}
          disabled={full}
          title={t('att.addFile')}
        >
          <ClipIcon /> {t('att.addFile')}
        </button>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => pick(e, 'image')}
        />
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => pick(e, 'file')} />
        <button
          type="button"
          className="composer-publish"
          onClick={publish}
          disabled={busy || (!text.trim() && atts.length === 0)}
        >
          {busy ? t('post.posting') : t('post.publish')}
        </button>
      </div>
    </div>
  );
}
