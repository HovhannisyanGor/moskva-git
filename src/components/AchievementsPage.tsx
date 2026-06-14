import type { Visit } from '../types';
import { BADGES } from '../data/badges';
import { PLACES, CATEGORY_LABELS, CATEGORY_COLORS } from '../data/places';

interface AchievementsPageProps {
  visits: Visit[];
  unlockedBadges: string[];
  onPlaceClick: (placeId: number) => void;
}

export default function AchievementsPage({ visits, unlockedBadges, onPlaceClick }: AchievementsPageProps) {
  const visitedPlaces = PLACES.filter(p => visits.some(v => v.placeId === p.id));
  const unvisitedPlaces = PLACES.filter(p => !visits.some(v => v.placeId === p.id));
  const progress = Math.round((visits.length / PLACES.length) * 100);

  return (
    <div className="achievements-page">
      <div className="ach-header">
        <div className="ach-header-top">
          <h1 className="ach-title">Достижения</h1>
          <div className="ach-count">{visits.length} / {PLACES.length} мест</div>
        </div>
        <div className="ach-progress-bar">
          <div className="ach-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="ach-progress-label">{progress}% Москвы исследовано</div>
      </div>

      <div className="ach-content">
        <section className="ach-section">
          <h2 className="ach-section-title">Бейджи</h2>
          <div className="badges-grid">
            {BADGES.map(badge => {
              const unlocked = unlockedBadges.includes(badge.id);
              return (
                <div key={badge.id} className={`badge-card ${unlocked ? 'badge-card--unlocked' : 'badge-card--locked'}`}>
                  <div className="badge-icon">{badge.icon}</div>
                  <div className="badge-info">
                    <div className="badge-title">{badge.title}</div>
                    <div className="badge-desc">{badge.description}</div>
                  </div>
                  {unlocked && <div className="badge-check">✓</div>}
                </div>
              );
            })}
          </div>
        </section>

        {visitedPlaces.length > 0 && (
          <section className="ach-section">
            <h2 className="ach-section-title">Посещённые места ({visitedPlaces.length})</h2>
            <div className="visited-list">
              {visitedPlaces.map(place => {
                const visit = visits.find(v => v.placeId === place.id)!;
                const color = CATEGORY_COLORS[place.category];
                const date = new Date(visit.visitedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', year: 'numeric'
                });
                return (
                  <div key={place.id} className="visited-item" onClick={() => onPlaceClick(place.id)}>
                    <div className="visited-dot" style={{ background: color }} />
                    <div className="visited-info">
                      <div className="visited-name">{place.name}</div>
                      <div className="visited-meta">
                        <span style={{ color }}>{CATEGORY_LABELS[place.category]}</span>
                        <span>·</span>
                        <span>{date}</span>
                      </div>
                    </div>
                    <div className="visited-check">✓</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {unvisitedPlaces.length > 0 && (
          <section className="ach-section">
            <h2 className="ach-section-title">Ещё не были ({unvisitedPlaces.length})</h2>
            <div className="visited-list">
              {unvisitedPlaces.map(place => {
                const color = CATEGORY_COLORS[place.category];
                return (
                  <div key={place.id} className="visited-item visited-item--unvisited" onClick={() => onPlaceClick(place.id)}>
                    <div className="visited-dot visited-dot--empty" style={{ borderColor: color }} />
                    <div className="visited-info">
                      <div className="visited-name">{place.name}</div>
                      <div className="visited-meta">
                        <span style={{ color }}>{CATEGORY_LABELS[place.category]}</span>
                        {place.price > 0 && <><span>·</span><span>{place.price} ₽</span></>}
                      </div>
                    </div>
                    <div className="visited-arrow">→</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
