import { useEffect, useRef, useState } from 'react';
import type { Place, Route } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/places';
import { loadYandexMaps } from '../utils/yandexMaps';

/* eslint-disable @typescript-eslint/no-explicit-any */

const API_KEY = import.meta.env.VITE_YANDEX_API_KEY as string | undefined;
const MOSCOW_CENTER: [number, number] = [37.6173, 55.7558]; // [lng, lat]

interface MapProps {
  places: Place[];
  activeRoute: Route | null;
  onPlaceClick: (place: Place) => void;
  visitedIds?: number[];
}

// Наши координаты хранятся как [lat, lng], Яндексу нужен [lng, lat].
const toLngLat = (c: [number, number]): [number, number] => [c[1], c[0]];

function buildMarker(dotHtml: string, name: string, categoryLabel: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ymap-marker';
  el.innerHTML =
    dotHtml +
    `<div class="ymap-tip"><strong>${name}</strong><span>${categoryLabel}</span></div>`;
  return el;
}

const dotHtml = (color: string) => `<div class="ymap-dot" style="background:${color}"></div>`;
const visitedDotHtml = (color: string) =>
  `<div class="ymap-dot ymap-dot--visited" style="background:${color}">✓</div>`;
const routeDotHtml = (color: string, order: number) =>
  `<div class="ymap-dot ymap-dot--route" style="background:${color}">${order}</div>`;

export default function Map({ places, activeRoute, onPlaceClick, visitedIds = [] }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const ymapsRef = useRef<any>(null);
  const childrenRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<'no-key' | 'load-failed' | null>(null);

  // Инициализация карты (один раз)
  useEffect(() => {
    if (!API_KEY) {
      setError('no-key');
      return;
    }
    let cancelled = false;

    loadYandexMaps(API_KEY)
      .then(async (ymaps3: any) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapControls } = ymaps3;
        const { YMapZoomControl } = await ymaps3.import('@yandex/ymaps3-default-ui-theme');

        const map = new YMap(containerRef.current, {
          location: { center: MOSCOW_CENTER, zoom: 11 },
        });
        map.addChild(new YMapDefaultSchemeLayer());
        map.addChild(new YMapDefaultFeaturesLayer());
        map.addChild(new YMapControls({ position: 'bottom right' }).addChild(new YMapZoomControl({})));

        ymapsRef.current = ymaps3;
        mapRef.current = map;
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        console.error('[Localee] Не удалось инициализировать Яндекс.Карты:', e);
        setError('load-failed');
      });

    return () => {
      cancelled = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
      ymapsRef.current = null;
    };
  }, []);

  // Маркеры мест и линия маршрута
  useEffect(() => {
    const ymaps3 = ymapsRef.current;
    const map = mapRef.current;
    if (!ready || !ymaps3 || !map) return;

    const { YMapMarker, YMapFeature } = ymaps3;

    childrenRef.current.forEach((c) => map.removeChild(c));
    childrenRef.current = [];

    const routeIds = new Set(activeRoute?.stops.map((s) => s.place.id) ?? []);

    if (activeRoute && activeRoute.stops.length > 0) {
      const sorted = [...activeRoute.stops].sort((a, b) => a.order - b.order);
      const coordinates = sorted.map((s) => toLngLat(s.place.coords));

      const line = new YMapFeature({
        geometry: { type: 'LineString', coordinates },
        style: { stroke: [{ color: '#FA3C3C', width: 4 }] },
      });
      map.addChild(line);
      childrenRef.current.push(line);

      sorted.forEach((stop) => {
        const color = CATEGORY_COLORS[stop.place.category] || '#FA3C3C';
        const el = buildMarker(
          routeDotHtml(color, stop.order),
          stop.place.name,
          CATEGORY_LABELS[stop.place.category],
        );
        el.addEventListener('click', () => onPlaceClick(stop.place));
        const marker = new YMapMarker({ coordinates: toLngLat(stop.place.coords) }, el);
        map.addChild(marker);
        childrenRef.current.push(marker);
      });

      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);
      map.setLocation({
        bounds: [
          [Math.min(...lngs), Math.max(...lats)],
          [Math.max(...lngs), Math.min(...lats)],
        ],
        duration: 500,
      });
    }

    places.forEach((place) => {
      if (routeIds.has(place.id)) return;
      const color = CATEGORY_COLORS[place.category] || '#888';
      const visited = visitedIds.includes(place.id);
      const html = visited ? visitedDotHtml(color) : dotHtml(color);
      const el = buildMarker(html, place.name, CATEGORY_LABELS[place.category]);
      el.addEventListener('click', () => onPlaceClick(place));
      const marker = new YMapMarker({ coordinates: toLngLat(place.coords) }, el);
      map.addChild(marker);
      childrenRef.current.push(marker);
    });
  }, [places, activeRoute, onPlaceClick, visitedIds, ready]);

  if (error) {
    return (
      <div className="map-fallback">
        <div className="map-fallback-box">
          <div className="map-fallback-icon">🗺️</div>
          <p className="map-fallback-title">
            {error === 'no-key' ? 'Не задан ключ Яндекс.Карт' : 'Карта недоступна'}
          </p>
          <p className="map-fallback-text">
            {error === 'no-key'
              ? 'Добавьте ключ VITE_YANDEX_API_KEY в переменные окружения, чтобы отобразить карту.'
              : 'Не удалось загрузить Яндекс.Карты. Проверьте ключ и подключение к интернету.'}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
