import type { Place } from '../types';
import { api } from '../utils/api';

// Места приезжают с сервера (GET /api/places) — тот же список видит мобильное
// приложение. Раньше он лежал прямо здесь и дублировал Places.swift, из-за чего
// файлы расходились; теперь источник правды один: server/src/data/places.js.
//
// PLACES остаётся обычным массивом, чтобы весь существующий код (badges.ts,
// поиск, достижения) работал без переделки. Он заполняется до первого рендера
// и переиспользуется из кеша, если сеть недоступна.
const CACHE_KEY = 'localee_places';

export const PLACES: Place[] = loadCache();

function loadCache(): Place[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Битый кеш — подождём ответа сервера.
  }
  return [];
}

// Заполняем массив на месте: переприсваивание порвало бы ссылки у тех, кто уже
// импортировал PLACES.
function fill(list: Place[]) {
  PLACES.length = 0;
  PLACES.push(...list);
}

// Вызывается один раз при старте приложения, до первого рендера.
export async function loadPlaces(): Promise<void> {
  try {
    const list = await api.places();
    fill(list);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch {
      // Приватный режим или нет места — не страшно, список уже в памяти.
    }
  } catch {
    // Сервер недоступен: остаёмся на кеше (или пустом списке при первом запуске).
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  landmark: 'Достопримечательность',
  park: 'Парк',
  museum: 'Музей',
  restaurant: 'Ресторан',
  entertainment: 'Развлечения',
  nightlife: '18+ · Ночная жизнь',
};

export const CATEGORY_COLORS: Record<string, string> = {
  landmark: '#FA3C3C',
  park: '#378ADD',
  museum: '#D4537E',
  restaurant: '#BA7517',
  entertainment: '#7F77DD',
  nightlife: '#C04CFF',
};
