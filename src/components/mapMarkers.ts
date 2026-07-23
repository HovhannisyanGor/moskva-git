import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/places';
import type { Place } from '../types';

// Разметка маркеров — общая для обеих реализаций карты (Яндекс и 2ГИС),
// чтобы при переключении вид не менялся. Стили лежат в App.css
// (.map-marker, .map-dot, .map-pin), там же центрирование по точке.

export const PIN_EMOJI: Record<string, string> = { crowd: '👥', meetup: '📣', drift: '🏎️' };

const dotHtml = (color: string) => `<div class="map-dot" style="background:${color}"></div>`;
const visitedDotHtml = (color: string) =>
  `<div class="map-dot map-dot--visited" style="background:${color}">✓</div>`;
const routeDotHtml = (color: string, order: number) =>
  `<div class="map-dot map-dot--route" style="background:${color}">${order}</div>`;

// Экранируем: названия мест приходят с сервера и попадают в innerHTML.
function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Маркер места. Клик вешаем на сам элемент: так работает и в 2ГИС
// (у HtmlMarker нет своего onClick), и в Яндексе.
export function buildPlaceMarker(
  place: Place,
  opts: { visited?: boolean; routeOrder?: number },
  onClick: () => void,
): HTMLElement {
  const color = CATEGORY_COLORS[place.category] || '#888';
  const dot =
    opts.routeOrder !== undefined
      ? routeDotHtml(color, opts.routeOrder)
      : opts.visited
        ? visitedDotHtml(color)
        : dotHtml(color);

  const el = document.createElement('div');
  el.className = 'map-marker';
  el.innerHTML =
    dot +
    `<div class="map-tip"><strong>${esc(place.name)}</strong>` +
    `<span>${esc(CATEGORY_LABELS[place.category] ?? '')}</span></div>`;
  el.addEventListener('click', onClick);
  return el;
}

// Пользовательская метка (скопление, сходка, дрифт).
export function buildPinMarker(kind: string, onClick: () => void): HTMLElement {
  const el = document.createElement('div');
  el.className = `map-pin map-pin--${kind}`;
  el.innerHTML = `<div class="map-pin-badge">${PIN_EMOJI[kind] || '📍'}</div>`;
  el.addEventListener('click', onClick);
  return el;
}
