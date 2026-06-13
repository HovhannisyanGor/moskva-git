import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place, Route } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/places';

interface MapProps {
  places: Place[];
  activeRoute: Route | null;
  onPlaceClick: (place: Place) => void;
}

function createMarkerIcon(color: string, isRouteStop: boolean, order?: number) {
  if (isRouteStop && order !== undefined) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-size:13px;font-weight:600;font-family:sans-serif;
        border:2.5px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      ">${order}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function Map({ places, activeRoute, onPlaceClick }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [55.7558, 37.6173],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    routeLineRef.current?.remove();
    routeLineRef.current = null;

    const routeIds = new Set(activeRoute?.stops.map(s => s.place.id) || []);

    if (activeRoute && activeRoute.stops.length > 0) {
      const coords = activeRoute.stops
        .sort((a, b) => a.order - b.order)
        .map(s => s.place.coords as L.LatLngExpression);

      routeLineRef.current = L.polyline(coords, {
        color: '#1D9E75',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 6',
      }).addTo(mapRef.current);

      activeRoute.stops.forEach(stop => {
        const color = CATEGORY_COLORS[stop.place.category] || '#1D9E75';
        const icon = createMarkerIcon(color, true, stop.order);
        const marker = L.marker(stop.place.coords as L.LatLngExpression, { icon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px;">
              <strong style="font-size:14px;">${stop.place.name}</strong><br>
              <span style="font-size:12px;color:#666;">${CATEGORY_LABELS[stop.place.category]}</span><br>
              ${stop.tip ? `<span style="font-size:12px;margin-top:4px;display:block;">💡 ${stop.tip}</span>` : ''}
              ${stop.place.price > 0 ? `<span style="font-size:12px;color:#BA7517;">~${stop.place.price}₽</span>` : '<span style="font-size:12px;color:#1D9E75;">Бесплатно</span>'}
            </div>
          `);
        marker.on('click', () => onPlaceClick(stop.place));
        markersRef.current.push(marker);
      });

      const bounds = L.latLngBounds(coords);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    }

    places.forEach(place => {
      if (routeIds.has(place.id)) return;
      const color = CATEGORY_COLORS[place.category] || '#888';
      const icon = createMarkerIcon(color, false);
      const marker = L.marker(place.coords as L.LatLngExpression, { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:160px;">
            <strong style="font-size:14px;">${place.name}</strong><br>
            <span style="font-size:12px;color:#666;">${CATEGORY_LABELS[place.category]}</span><br>
            <span style="font-size:12px;color:#888;">${place.description.slice(0, 60)}...</span>
          </div>
        `);
      marker.on('click', () => onPlaceClick(place));
      markersRef.current.push(marker);
    });
  }, [places, activeRoute, onPlaceClick]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
