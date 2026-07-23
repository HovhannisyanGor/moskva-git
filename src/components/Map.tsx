import type { Place, Route } from '../types';
import type { MapPin } from '../utils/api';
import MapYandex from './MapYandex';
import Map2gis from './Map2gis';

// Выбор карты.
//
// Основная — Яндекс.Карты, как и в мобильном приложении. Пока не задан ключ
// JavaScript API, показываем прежнюю карту на 2ГИС: сайт живой, и переключение
// произойдёт само, как только ключ появится в переменных окружения.
//
// ВАЖНО: ключей два разных. VITE_YANDEX_JS_KEY — для сайта (JavaScript API),
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
