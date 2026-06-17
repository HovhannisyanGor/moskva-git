import { useState } from 'react';
import type { Place } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../data/places';

interface PlaceModalProps {
  place: Place;
  onClose: () => void;
  isVisited?: boolean;
  onToggleVisit?: (placeId: number) => void;
}

const FALLBACK_IMAGES: Record<string, string> = {
  landmark: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80',
  park: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  museum: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800&q=80',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  entertainment: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'star star--filled' : 'star'}>★</span>
      ))}
      <span className="rating-value">{rating}</span>
    </div>
  );
}

export default function PlaceModal({ place, onClose, isVisited, onToggleVisit }: PlaceModalProps) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 230);
  };
  const color = CATEGORY_COLORS[place.category] || '#1D9E75';
  const imgSrc = place.imageUrl || FALLBACK_IMAGES[place.category];
  const hours = Math.floor(place.duration / 60);
  const mins = place.duration % 60;
  const timeStr = hours > 0 ? `${hours} ч${mins > 0 ? ` ${mins} мин` : ''}` : `${mins} мин`;

  return (
    <div className={`modal-overlay${closing ? ' modal-overlay--closing' : ''}`} onClick={close}>
      <div className={`modal${closing ? ' modal--closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-image-wrap">
          <img
            src={imgSrc}
            alt={place.name}
            className="modal-image"
            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[place.category]; }}
          />
          <button className="modal-close" onClick={close} aria-label="Закрыть">✕</button>
          <div className="modal-category-badge" style={{ background: color }}>
            {CATEGORY_LABELS[place.category]}
          </div>
        </div>

        <div className="modal-body">
          <h2 className="modal-title">{place.name}</h2>

          <StarRating rating={place.rating} />

          <p className="modal-description">{place.description}</p>

          <div className="modal-address">
            <span className="modal-address-icon">📍</span>
            <span>{place.address}</span>
          </div>

          <div className="modal-stats">
            <div className="modal-stat">
              <div className="modal-stat-label">Время</div>
              <div className="modal-stat-value">~{timeStr}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Стоимость</div>
              <div className="modal-stat-value" style={{ color: place.price === 0 ? '#1D9E75' : undefined }}>
                {place.price === 0 ? 'Бесплатно' : `${place.price.toLocaleString()} ₽`}
              </div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Рейтинг</div>
              <div className="modal-stat-value">{place.rating} / 5</div>
            </div>
          </div>

          <div className="modal-tags">
            {place.tags.map(tag => (
              <span className="modal-tag" key={tag} style={{ borderColor: color, color }}>
                {tag}
              </span>
            ))}
          </div>

          {onToggleVisit && (
            <button
              className={`modal-visit-btn ${isVisited ? 'modal-visit-btn--visited' : ''}`}
              onClick={() => onToggleVisit(place.id)}
            >
              {isVisited ? '✓ Я здесь был' : '+ Отметить посещение'}
            </button>
          )}

          {place.ticketUrl && (
            <a
              href={place.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-ticket-btn"
              style={{ background: color }}
            >
              Купить билет →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
