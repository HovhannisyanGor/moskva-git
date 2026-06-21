import { PLACES, CATEGORY_LABELS, CATEGORY_COLORS } from '../data/places';

interface FavoritesPageProps {
  favorites: number[];
  onPlaceClick: (placeId: number) => void;
}

export default function FavoritesPage({ favorites, onPlaceClick }: FavoritesPageProps) {
  // Сохраняем порядок добавления (как в списке favorites).
  const places = favorites
    .map((id) => PLACES.find((p) => p.id === id))
    .filter((p): p is (typeof PLACES)[number] => Boolean(p));

  return (
    <div className="page-scroll">
      <div className="fav-page">
        <h1 className="fav-title">Избранное</h1>

        {places.length === 0 ? (
          <div className="fav-empty">
            Пока пусто. Открой место на карте и нажми ★, чтобы сохранить его сюда.
          </div>
        ) : (
          <div className="fav-list">
            {places.map((p) => {
              const color = CATEGORY_COLORS[p.category];
              return (
                <button className="fav-item" key={p.id} onClick={() => onPlaceClick(p.id)}>
                  <span className="fav-dot" style={{ background: color }} />
                  <span className="fav-item-mid">
                    <span className="fav-item-name">{p.name}</span>
                    <span className="fav-item-sub" style={{ color }}>
                      {CATEGORY_LABELS[p.category]}
                    </span>
                  </span>
                  <span className="fav-arrow">→</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
