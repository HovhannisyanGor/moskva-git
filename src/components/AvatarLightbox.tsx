import { useEffect } from 'react';

// Увеличенный просмотр аватара. Открывается по клику на фото в профиле.
// Не на весь экран — крупная карточка по центру, чтобы рассмотреть фото.
export default function AvatarLightbox({
  avatar,
  color,
  letter,
  name,
  onClose,
}: {
  avatar: string;
  color: string;
  letter: string;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="avatar-lightbox" onClick={onClose}>
      <div className="avatar-lightbox-card" onClick={(e) => e.stopPropagation()}>
        {avatar ? (
          <img className="avatar-lightbox-img" src={avatar} alt={name} />
        ) : (
          <div className="avatar-lightbox-letter" style={{ background: color }}>
            {letter}
          </div>
        )}
        <button className="avatar-lightbox-close" type="button" onClick={onClose} aria-label="×">
          ×
        </button>
      </div>
      <div className="avatar-lightbox-name">{name}</div>
    </div>
  );
}
