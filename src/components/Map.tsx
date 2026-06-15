import { useEffect, useRef, useState } from 'react';
import { load } from '@2gis/mapgl';
import type { Place, Route } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/places';

/* eslint-disable @typescript-eslint/no-explicit-any */

const API_KEY = import.meta.env.VITE_2GIS_API_KEY as string | undefined;
const MOSCOW_CENTER: [number, number] = [37.6173, 55.7558]; // [lng, lat]

interface MapProps {
  places: Place[];
  activeRoute: Route | null;
  onPlaceClick: (place: Place) => void;
  visitedIds?: number[];
}

// Наши координаты хранятся как [lat, lng], 2ГИС хочет [lng, lat].
const toLngLat = (c: [number, number]): [number, number] => [c[1], c[0]];

// 2ГИС HtmlMarker не поддерживает .on('click') — клик ловим DOM-листенером на элементе.
function buildMarker(
  dotHtml: string,
  name: string,
  categoryLabel: string,
  onClick: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-marker';
  el.innerHTML =
    dotHtml +
    `<div class="map-tip"><strong>${name}</strong><span>${categoryLabel}</span></div>`;
  el.addEventListener('click', onClick);
  return el;
}

const dotHtml = (color: string) => `<div class="map-dot" style="background:${color}"></div>`;
const visitedDotHtml = (color: string) =>
  `<div class="map-dot map-dot--visited" style="background:${color}">✓</div>`;
const routeDotHtml = (color: string, order: number) =>
  `<div class="map-dot map-dot--route" style="background:${color}">${order}</div>`;

export default function Map({ places, activeRoute, onPlaceClick, visitedIds = [] }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapglRef = useRef<any>(null);
  const objectsRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<'no-key' | 'load-failed' | null>(null);

  // Инициализация карты (один раз)
  useEffect(() => {
    if (!API_KEY) {
      setError('no-key');
      return;
    }
    let cancelled = false;

    load()
      .then((mapgl: any) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = new mapgl.Map(containerRef.current, {
          center: MOSCOW_CENTER,
          zoom: 11,
          key: API_KEY,
        });
        mapglRef.current = mapgl;
        mapRef.current = map;
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        console.error('[Localee] Не удалось загрузить 2ГИС:', e);
        setError('load-failed');
      });

    return () => {
      cancelled = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
      mapglRef.current = null;
    };
  }, []);

  // Маркеры мест и линия маршрута
  useEffect(() => {
    const mapgl = mapglRef.current;
    const map = mapRef.current;
    if (!ready || !mapgl || !map) return;

    objectsRef.current.forEach((o) => o.destroy?.());
    objectsRef.current = [];

    const routeIds = new Set(activeRoute?.stops.map((s) => s.place.id) ?? []);

    if (activeRoute && activeRoute.stops.length > 0) {
      const sorted = [...activeRoute.stops].sort((a, b) => a.order - b.order);
      const coordinates = sorted.map((s) => toLngLat(s.place.coords));

      const line = new mapgl.Polyline(map, {
        coordinates,
        color: '#FA3C3C',
        width: 4,
      });
      objectsRef.current.push(line);

      sorted.forEach((stop) => {
        const color = CATEGORY_COLORS[stop.place.category] || '#FA3C3C';
        const el = buildMarker(
          routeDotHtml(color, stop.order),
          stop.place.name,
          CATEGORY_LABELS[stop.place.category],
          () => onPlaceClick(stop.place),
        );
        const marker = new mapgl.HtmlMarker(map, {
          coordinates: toLngLat(stop.place.coords),
          html: el,
          anchor: [0, 0],
        });
        objectsRef.current.push(marker);
      });

      // Подогнать карту под маршрут (формат fitBounds может отличаться по версиям — гасим ошибку)
      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);
      try {
        map.fitBounds(
          {
            northEast: [Math.max(...lngs), Math.max(...lats)],
            southWest: [Math.min(...lngs), Math.min(...lats)],
          },
          { padding: { top: 80, right: 80, bottom: 80, left: 80 } },
        );
      } catch {
        /* не критично */
      }
    }

    places.forEach((place) => {
      if (routeIds.has(place.id)) return;
      const color = CATEGORY_COLORS[place.category] || '#888';
      const visited = visitedIds.includes(place.id);
      const el = buildMarker(
        visited ? visitedDotHtml(color) : dotHtml(color),
        place.name,
        CATEGORY_LABELS[place.category],
        () => onPlaceClick(place),
      );
      const marker = new mapgl.HtmlMarker(map, {
        coordinates: toLngLat(place.coords),
        html: el,
        anchor: [0, 0],
      });
      objectsRef.current.push(marker);
    });
  }, [places, activeRoute, onPlaceClick, visitedIds, ready]);

  if (error) {
    return (
      <div className="map-fallback">
        <div className="map-fallback-box">
          <div className="map-fallback-icon">🗺️</div>
          <p className="map-fallback-title">
            {error === 'no-key' ? 'Не задан ключ 2ГИС' : 'Карта недоступна'}
          </p>
          <p className="map-fallback-text">
            {error === 'no-key'
              ? 'Добавьте ключ VITE_2GIS_API_KEY в переменные окружения, чтобы отобразить карту.'
              : 'Не удалось загрузить 2ГИС. Проверьте ключ и подключение к интернету.'}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
