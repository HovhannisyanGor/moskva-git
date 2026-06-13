import type { Route } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/places';

interface RouteInfoProps {
  route: Route;
  onClose: () => void;
}

export default function RouteInfo({ route, onClose }: RouteInfoProps) {
  const hours = Math.floor(route.totalTime / 60);
  const mins = route.totalTime % 60;
  const timeStr = hours > 0 ? `${hours} ч ${mins > 0 ? `${mins} мин` : ''}` : `${mins} мин`;

  return (
    <div className="route-panel">
      <div className="route-panel-header">
        <div>
          <div className="route-panel-title">{route.title}</div>
          <div className="route-panel-meta">
            <span>⏱ {timeStr}</span>
            <span>·</span>
            <span>{route.stops.length} мест</span>
            <span>·</span>
            <span>{route.totalPrice > 0 ? `от ${route.totalPrice.toLocaleString()} ₽` : 'Бесплатно'}</span>
          </div>
        </div>
        <button className="route-close" onClick={onClose} aria-label="Закрыть">✕</button>
      </div>

      <div className="route-stops">
        {route.stops
          .sort((a, b) => a.order - b.order)
          .map((stop, i) => {
            const color = CATEGORY_COLORS[stop.place.category] || '#888';
            return (
              <div className="route-stop" key={stop.place.id}>
                <div className="route-stop-num" style={{ background: color }}>
                  {i + 1}
                </div>
                <div className="route-stop-info">
                  <div className="route-stop-name">{stop.place.name}</div>
                  <div className="route-stop-meta">
                    <span className="route-stop-cat">{CATEGORY_LABELS[stop.place.category]}</span>
                    <span>~{stop.place.duration} мин</span>
                    {stop.place.price > 0
                      ? <span>{stop.place.price} ₽</span>
                      : <span className="free">Бесплатно</span>
                    }
                  </div>
                  {stop.tip && <div className="route-stop-tip">💡 {stop.tip}</div>}
                  {stop.place.ticketUrl && (
                    <a
                      href={stop.place.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ticket-link"
                    >
                      Купить билет →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {route.tags.length > 0 && (
        <div className="route-tags">
          {route.tags.map(tag => (
            <span className="tag" key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
