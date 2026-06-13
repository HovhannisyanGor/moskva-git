import { useState, useCallback } from 'react';
import Map from './components/Map';
import AIChat from './components/AIChat';
import RouteInfo from './components/RouteInfo';
import Topbar from './components/Topbar';
import PlaceModal from './components/PlaceModal';
import type { Place, Route } from './types';
import { PLACES } from './data/places';
import './App.css';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'places' | 'favorites'>('map');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const handleRouteUpdate = useCallback((route: Route | null) => {
    setActiveRoute(route);
  }, []);

  return (
    <div className="app">
      <Topbar activeView={activeView} onViewChange={setActiveView} />

      <div className="layout">
        <AIChat onRouteUpdate={handleRouteUpdate} />

        <main className="map-container">
          <Map
            places={PLACES}
            activeRoute={activeRoute}
            onPlaceClick={handlePlaceClick}
          />

          {activeRoute && (
            <div className="route-overlay">
              <RouteInfo
                route={activeRoute}
                onClose={() => setActiveRoute(null)}
              />
            </div>
          )}

          {selectedPlace && (
            <PlaceModal
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
            />
          )}

          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#1D9E75' }} />
              <span>Достопримечательности</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#378ADD' }} />
              <span>Парки</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#D4537E' }} />
              <span>Музеи</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#BA7517' }} />
              <span>Рестораны</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
