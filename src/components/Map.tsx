import type { Place, Route } from '../types';
import type { MapPin } from '../utils/api';
import MapYandex from './MapYandex';
import Map2gis from './Map2gis';

// Выбор карты.
//
// Основная — Яндекс.Карты, как и в мобильном приложении. Пока не задан ключ
// JavaScript API, используется прежняя карта на 2ГИС, чтобы сайт оставался живым.
//
// ВАЖНО: переменная читается НА СБОРКЕ, а не в браузере — Vite подставляет её
// значение прямо в код. Поэтому мало вписать ключ на хостинге: нужно вписать его
// перед `npm run build` и залить новую сборку. Заодно неиспользуемая карта
// выбрасывается из бандла: в сборку попадает ровно одна из двух.
//
// Ключей два разных: VITE_YANDEX_JS_KEY — для сайта (JavaScript API),
// а в приложении используется ключ MapKit SDK. Один вместо другого не работает.
// Оба берутся в кабинете https://developer.tech.yandex.ru

export interface MapProps {
  places: Place[];
  activeRoute: Route | null;
  onPlaceClick: (place: Place) => void;
  visitedIds?: number[];
  pins?: MapPin[];
  onPinClick?: (pin: MapPin) => void;
  placing?: boolean; // режим постановки метки — следующий клик по карте ставит метку
  onMapClick?: (lat: number, lng: number) => void;
}

const YANDEX_KEY = import.meta.env.VITE_YANDEX_JS_KEY as string | undefined;

export default function Map(props: MapProps) {
  if (YANDEX_KEY) return <MapYandex apiKey={YANDEX_KEY} {...props} />;
  return <Map2gis {...props} />;
}
