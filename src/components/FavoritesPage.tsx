import { PLACES, CATEGORY_COLORS } from '../data/places';
import { useI18n } from '../i18n';

interface FavoritesPageProps {
  favorites: number[];
  onPlaceClick: (placeId: number) => void;
}

export default function FavoritesPage({ favorites, onPlaceClick }: FavoritesPageProps) {
  const { t } = useI18n();
  // Сохраняем порядок добавления (как в списке favorites).
  const places = favorites
    .map((id) => PLACES.find((p) => p.id === id))
    .filter((p): p is (typeof PLACES)[number] => Boolean(p));

  return (
    <div className="page-scroll">
      <div className="fav-page">
        <h1 className="fav-title">{t('fav.title')}</h1>

        {places.length === 0 ? (
          <div className="fav-empty">{t('fav.empty')}</div>
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
                      {t(`category.${p.category}`)}
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
