import { useState, useCallback } from 'react';
import Map from './components/Map';
import AIChat from './components/AIChat';
import RouteInfo from './components/RouteInfo';
import Topbar from './components/Topbar';
import PlaceModal from './components/PlaceModal';
import AchievementsPage from './components/AchievementsPage';
import ProfilePage from './components/ProfilePage';
import EditProfilePage from './components/EditProfilePage';
import ChatsPage from './components/ChatsPage';
import FriendsPage from './components/FriendsPage';
import { useAchievements } from './hooks/useAchievements';
import type { Place, Route, View } from './types';
import { PLACES } from './data/places';
import './App.css';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [activeView, setActiveView] = useState<View>('map');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { visits, unlockedBadges, isVisited, toggleVisit, newBadge } = useAchievements();

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const handleRouteUpdate = useCallback((route: Route | null) => {
    setActiveRoute(route);
  }, []);

  const handleAchievementPlaceClick = useCallback((placeId: number) => {
    const place = PLACES.find((p) => p.id === placeId);
    if (place) {
      setActiveView('map');
      setSelectedPlace(place);
    }
  }, []);

  function renderView() {
    switch (activeView) {
      case 'achievements':
        return (
          <div className="achievements-wrap">
            <AchievementsPage
              visits={visits}
              unlockedBadges={unlockedBadges}
              onPlaceClick={handleAchievementPlaceClick}
            />
          </div>
        );
      case 'profile':
        return (
          <ProfilePage
            onEdit={() => setActiveView('edit-profile')}
            onOpenFriends={() => setActiveView('friends')}
          />
        );
      case 'edit-profile':
        return <EditProfilePage onBack={() => setActiveView('profile')} />;
      case 'chats':
        return <ChatsPage />;
      case 'friends':
        return <FriendsPage />;
      default:
        return (
          <div className="layout">
            <AIChat onRouteUpdate={handleRouteUpdate} />

            <main className="map-container">
              <Map
                places={PLACES}
                activeRoute={activeRoute}
                onPlaceClick={handlePlaceClick}
                visitedIds={visits.map((v) => v.placeId)}
              />

              {activeRoute && (
                <div className="route-overlay">
                  <RouteInfo route={activeRoute} onClose={() => setActiveRoute(null)} />
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
                  <div className="legend-dot" style={{ background: '#FA3C3C' }} />
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
        );
    }
  }

  return (
    <div className="app">
      <Topbar activeView={activeView} onNavigate={setActiveView} />

      {newBadge && <div className="badge-toast">🏅 Новый бейдж разблокирован!</div>}

      {renderView()}
    </div>
  );
}
