import { useEffect, useRef, useState } from 'react';
import type { MapProps } from './Map';
import { buildPlaceMarker, buildPinMarker } from './mapMarkers';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Карта на JavaScript API Яндекс.Карт 3.0.
//
// Ключ нужен именно **JavaScript API** — это другой продукт, чем MapKit SDK
// для мобильного приложения, их ключи не взаимозаменяемы.
// Берётся в кабинете https://developer.tech.yandex.ru
//
// Координаты у Яндекса, как и у 2ГИС, идут в порядке [lng, lat], а у нас
// в Place они хранятся как [lat, lng] — переворачиваем на границе.

const MOSCOW_CENTER: [number, number] = [37.6173, 55.7558]; // [lng, lat]

const toLngLat = (c: [number, number]): [number, number] => [c[1], c[0]];

// Грузим скрипт API один раз на всё приложение.
let loader: Promise<any> | null = null;

function loadYmaps(key: string): Promise<any> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      const ymaps3 = (window as any).ymaps3;
      if (!ymaps3) {
        reject(new Error('ymaps3 не появился'));
        return;
      }
      ymaps3.ready.then(() => resolve(ymaps3)).catch(reject);
    };
    script.onerror = () => reject(new Error('скрипт не загрузился'));
    document.head.appendChild(script);
  });
  return loader;
}

export default function MapYandex({
  apiKey,
  places,
  activeRoute,
  onPlaceClick,
  visitedIds = [],
  pins = [],
  onPinClick,
  placing = false,
  onMapClick,
}: MapProps & { apiKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const ymapsRef = useRef<any>(null);
  const objectsRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Слушатель клика создаётся один раз, а состояние режима постановки меняется —
  // держим его в ref, чтобы обработчик всегда видел свежее значение.
  const clickRef = useRef<{ placing: boolean; onMapClick?: (lat: number, lng: number) => void }>({
    placing,
    onMapClick,
  });
  useEffect(() => {
    clickRef.current = { placing, onMapClick };
  }, [placing, onMapClick]);

  // Инициализация (один раз)
  useEffect(() => {
    let cancelled = false;

    loadYmaps(apiKey)
      .then((ymaps3) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3;

        const map = new YMap(containerRef.current, {
          location: { center: MOSCOW_CENTER, zoom: 11 },
        });
        map.addChild(new YMapDefaultSchemeLayer());
        map.addChild(new YMapDefaultFeaturesLayer());

        // Клик по карте нужен только в режиме постановки метки — состояние
        // читаем из ref, чтобы не пересоздавать слушатель на каждый рендер.
        map.addChild(
          new YMapListener({
            onClick: (_object: unknown, event: any) => {
              const { placing: on, onMapClick: cb } = clickRef.current;
              const c = event?.coordinates;
              if (on && cb && Array.isArray(c)) cb(c[1], c[0]); // [lng,lat] -> lat,lng
            },
          }),
        );

        ymapsRef.current = ymaps3;
        mapRef.current = map;
        setReady(true);
      })
      .catch((e: unknown) => {
        console.error('[Localee] Не удалось загрузить Яндекс.Карты:', e);
        setError(true);
      });

    return () => {
      cancelled = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
      ymapsRef.current = null;
    };
  }, [apiKey]);

  // Маркеры мест, маршрут и пользовательские метки
  useEffect(() => {
    const ymaps3 = ymapsRef.current;
    const map = mapRef.current;
    if (!ready || !ymaps3 || !map) return;
    const { YMapMarker, YMapFeature } = ymaps3;

    objectsRef.current.forEach((o) => {
      try {
        map.removeChild(o);
      } catch {
        /* уже снят */
      }
    });
    objectsRef.current = [];

    const add = (child: any) => {
      map.addChild(child);
      objectsRef.current.push(child);
    };

    const routeIds = new Set(activeRoute?.stops.map((s) => s.place.id) ?? []);

    if (activeRoute && activeRoute.stops.length > 0) {
      const sorted = [...activeRoute.stops].sort((a, b) => a.order - b.order);
      const coordinates = sorted.map((s) => toLngLat(s.place.coords));

      add(
        new YMapFeature({
          geometry: { type: 'LineString', coordinates },
          style: { stroke: [{ color: '#FA3C3C', width: 4 }] },
        }),
      );

      sorted.forEach((stop) => {
        add(
          new YMapMarker(
            { coordinates: toLngLat(stop.place.coords), zIndex: 20 },
            buildPlaceMarker(stop.place, { routeOrder: stop.order }, () => onPlaceClick(stop.place)),
          ),
        );
      });

      // Подгоняем карту под маршрут: bounds — [верхний левый, нижний правый].
      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);
      map.update({
        location: {
          bounds: [
            [Math.min(...lngs), Math.max(...lats)],
            [Math.max(...lngs), Math.min(...lats)],
          ],
          duration: 400,
        },
      });
    }

    places.forEach((place) => {
      if (routeIds.has(place.id)) return;
      add(
        new YMapMarker(
          { coordinates: toLngLat(place.coords), zIndex: 10 },
          buildPlaceMarker(place, { visited: visitedIds.includes(place.id) }, () =>
            onPlaceClick(place),
          ),
        ),
      );
    });

    pins.forEach((pin) => {
      add(
        new YMapMarker(
          { coordinates: [pin.lng, pin.lat], zIndex: 30 },
          buildPinMarker(pin.kind, () => onPinClick?.(pin)),
        ),
      );
    });
  }, [places, activeRoute, onPlaceClick, visitedIds, ready, pins, onPinClick]);

  if (error) {
    return (
      <div className="map-fallback">
        <div className="map-fallback-box">
          <div className="map-fallback-icon">🗺️</div>
          <p className="map-fallback-title">Карта недоступна</p>
          <p className="map-fallback-text">
            Не удалось загрузить Яндекс.Карты. Проверьте ключ JavaScript API и подключение к
            интернету.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
