import { useEffect, useRef, useState } from 'react';
import { load } from '@2gis/mapgl';
import type { MapProps } from './Map';
import { buildPlaceMarker, buildPinMarker } from './mapMarkers';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Карта на 2ГИС — запасной вариант. Используется, пока не задан ключ
// JavaScript API Яндекс.Карт (VITE_YANDEX_JS_KEY); как только он появится,
// Map.tsx переключится на Яндекс, и этот файл можно будет удалить.
const API_KEY = import.meta.env.VITE_2GIS_API_KEY as string | undefined;
const MOSCOW_CENTER: [number, number] = [37.6173, 55.7558]; // [lng, lat]

// Наши координаты хранятся как [lat, lng], 2ГИС хочет [lng, lat].
const toLngLat = (c: [number, number]): [number, number] => [c[1], c[0]];

export default function Map2gis({
  places,
  activeRoute,
  onPlaceClick,
  visitedIds = [],
  pins = [],
  onPinClick,
  placing = false,
  onMapClick,
}: MapProps) {
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
        const el = buildPlaceMarker(stop.place, { routeOrder: stop.order }, () =>
          onPlaceClick(stop.place),
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
      const el = buildPlaceMarker(place, { visited: visitedIds.includes(place.id) }, () =>
        onPlaceClick(place),
      );
      const marker = new mapgl.HtmlMarker(map, {
        coordinates: toLngLat(place.coords),
        html: el,
        anchor: [0, 0],
      });
      objectsRef.current.push(marker);
    });

    // Пользовательские метки (скопления людей, сходки, дрифт-гонки)
    pins.forEach((pin) => {
      const el = buildPinMarker(pin.kind, () => onPinClick?.(pin));
      const marker = new mapgl.HtmlMarker(map, {
        coordinates: [pin.lng, pin.lat],
        html: el,
        anchor: [0, 0],
      });
      objectsRef.current.push(marker);
    });
  }, [places, activeRoute, onPlaceClick, visitedIds, ready, pins, onPinClick]);

  // Режим постановки метки: следующий клик по карте отдаёт координаты наверх.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !placing || !onMapClick) return;
    const handler = (e: any) => {
      const c = e?.lngLat || e?.latLng;
      if (c && c.length === 2) onMapClick(c[1], c[0]); // [lng,lat] -> lat,lng
    };
    map.on('click', handler);
    return () => {
      try { map.off('click', handler); } catch { /* ignore */ }
    };
  }, [ready, placing, onMapClick]);

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
