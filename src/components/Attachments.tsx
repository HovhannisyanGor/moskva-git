import { useEffect, useState } from 'react';
import type { Attachment } from '../utils/api';
import { humanSize, attachmentBytes } from '../utils/attachments';
import { useI18n } from '../i18n';

// Показ и выбор вложений: несколько фото и файлы в посте или сообщении.
// Раскладка повторяет приложение: одно фото — крупно, несколько — сеткой,
// файлы — карточками со скачиванием.

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
    </svg>
  );
}
function ClipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 7l-6.5 6.5a2.1 2.1 0 0 0 3 3L18 10a4.2 4.2 0 0 0-6-6l-6.6 6.6a6.3 6.3 0 0 0 9 9L21 13" />
    </svg>
  );
}
export function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 8h.01" />
      <path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z" />
      <path d="m3 16 5-5c.9-.87 2.1-.87 3 0l5 5" />
      <path d="m14 14 1-1c.9-.87 2.1-.87 3 0l3 3" />
    </svg>
  );
}

// Просмотр фото на весь экран. Закрывается по клику и по Escape.
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="img-lightbox" onClick={onClose}>
      <img className="img-lightbox-img" src={src} alt="" onClick={(e) => e.stopPropagation()} />
      <button className="img-lightbox-close" type="button" onClick={onClose} aria-label="×">
        ×
      </button>
    </div>
  );
}

// --- Показ вложений в готовом посте или сообщении ---
export function AttachmentsView({ attachments }: { attachments: Attachment[] }) {
  const { t, locale } = useI18n();
  const [zoom, setZoom] = useState('');
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === 'image');
  const files = attachments.filter((a) => a.type !== 'image');

  return (
    <div className="att">
      {images.length === 1 && (
        <button type="button" className="att-one" onClick={() => setZoom(images[0].data)}>
          <img src={images[0].data} alt="" />
        </button>
      )}
      {images.length > 1 && (
        <div className="att-grid">
          {images.map((a, i) => (
            <button type="button" className="att-cell" key={i} onClick={() => setZoom(a.data)}>
              <img src={a.data} alt="" />
            </button>
          ))}
        </div>
      )}

      {files.map((a, i) => (
        <a
          className="att-file"
          key={i}
          href={a.data}
          download={a.name || 'file'}
          // Файл лежит на другом домене (api.localee.ru), поэтому download
          // браузер проигнорирует и просто откроет его — пусть в новой вкладке,
          // а не вместо приложения.
          target="_blank"
          rel="noopener noreferrer"
          title={t('att.download')}
        >
          <span className="att-file-ic">
            <FileIcon />
          </span>
          <span className="att-file-body">
            <span className="att-file-name">{a.name || t('att.file')}</span>
            <span className="att-file-size">{humanSize(attachmentBytes(a), locale)}</span>
          </span>
        </a>
      ))}

      {zoom && <ImageLightbox src={zoom} onClose={() => setZoom('')} />}
    </div>
  );
}

// --- Ряд превью выбранных вложений в композере ---
export function AttachmentPreviewRow({
  items,
  onRemove,
}: {
  items: Attachment[];
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;

  return (
    <div className="att-row">
      {items.map((a, i) => (
        <div className="att-chip" key={i}>
          {a.type === 'image' ? (
            <img src={a.data} alt="" />
          ) : (
            <span className="att-chip-file">
              <FileIcon />
              <span className="att-chip-name">{a.name || t('att.file')}</span>
            </span>
          )}
          <button
            type="button"
            className="att-chip-x"
            onClick={() => onRemove(i)}
            aria-label={t('att.remove')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export { ClipIcon };
