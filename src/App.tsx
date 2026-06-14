import { useState, useCallback } from 'react';
import Map from './components/Map';
import AIChat from './components/AIChat';
import RouteInfo from './components/RouteInfo';
import Topbar from './components/Topbar';
import PlaceModal from './components/PlaceModal';
import AchievementsPage from './components/AchievementsPage';
import WelcomePage from './components/WelcomePage';
import { useAchievements } from './hooks/useAchievements';
import type { Place, Route } from './types';
import { PLACES } from './data/places';
import './App.css';

export default function App() {
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('localee_welcomed'));
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'places' | 'achievements'>('map');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { visits, unlockedBadges, isVisited, toggleVisit, newBadge } = useAchievements();

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const handleRouteUpdate = useCallback((route: Route | null) => {
    setActiveRoute(route);
  }, []);

  const handleWelcomeDone = useCallback(() => {
    localStorage.setItem('localee_welcomed', '1');
    setShowWelcome(false);
  }, []);

  const handleAchievementPlaceClick = useCallback((placeId: number) => {
    const place = PLACES.find(p => p.id === placeId);
    if (place) {
      setActiveView('map');
      setSelectedPlace(place);
    }
  }, []);

  if (showWelcome) {
    return <WelcomePage onStart={handleWelcomeDone} />;
  }

  return (
    <div className="app">
      <Topbar activeView={activeView} onViewChange={setActiveView} />

      {newBadge && (
        <div className="badge-toast">
          🏅 Новый бейдж разблокирован!
        </div>
      )}

      {activeView === 'achievements' ? (
        <div className="achievements-wrap">
          <AchievementsPage
            visits={visits}
            unlockedBadges={unlockedBadges}
            onPlaceClick={handleAchievementPlaceClick}
          />
        </div>
      ) : (
        <div className="layout">
          <AIChat onRouteUpdate={handleRouteUpdate} />

          <main className="map-container">
            <Map
              places={PLACES}
              activeRoute={activeRoute}
              onPlaceClick={handlePlaceClick}
              visitedIds={visits.map(v => v.placeId)}
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
                isVisited={isVisited(selectedPlace.id)}
                onToggleVisit={toggleVisit}
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
      )}
    </div>
  );
}
