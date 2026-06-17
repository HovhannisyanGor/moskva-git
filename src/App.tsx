import { useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import Map from './components/Map';
import AIChat from './components/AIChat';
import RouteInfo from './components/RouteInfo';
import Topbar from './components/Topbar';
import ProfileMenu from './components/ProfileMenu';
import PlaceModal from './components/PlaceModal';
import AchievementsPage from './components/AchievementsPage';
import ProfilePage from './components/ProfilePage';
import EditProfilePage from './components/EditProfilePage';
import ChatsPage from './components/ChatsPage';
import FriendsPage from './components/FriendsPage';
import { useAchievements } from './hooks/useAchievements';
import { useIsMobile } from './hooks/useIsMobile';
import { useTheme } from './hooks/useTheme';
import type { Place, Route, View } from './types';
import { PLACES } from './data/places';
import './App.css';

const ICON = {
  map: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
    </svg>
  ),
  friends: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.2A3 3 0 0 1 17 11M21 20c0-2.6-1.5-4.2-3.5-4.8" />
    </svg>
  ),
  chats: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.7 3.1-5.6 7-5.6s7 1.9 7 5.6" />
    </svg>
  ),
};

const MOBILE_NAV: { view: View; label: string; icon: ReactNode }[] = [
  { view: 'map', label: 'Карта', icon: ICON.map },
  { view: 'achievements', label: 'Награды', icon: ICON.trophy },
  { view: 'friends', label: 'Друзья', icon: ICON.friends },
  { view: 'chats', label: 'Чаты', icon: ICON.chats },
  { view: 'profile', label: 'Профиль', icon: ICON.user },
];

export default function App() {
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [activeView, setActiveView] = useState<View>('map');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { visits, unlockedBadges, isVisited, toggleVisit, newBadge } = useAchievements();

  const isMobile = useIsMobile();
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const dragRef = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);

  const NAV_H = 58;
  const TOP_GAP = 76; // оставляем место сверху — шторка не доходит до кнопки профиля
  const PEEK_H = 96;
  const maxOpenH = () => Math.max(220, window.innerHeight - NAV_H - TOP_GAP);

  const onGrabberDown = (e: React.PointerEvent) => {
    const sheetEl = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    dragRef.current = { startY: e.clientY, startH: sheetEl.offsetHeight, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onGrabberMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (Math.abs(dy) > 5) d.moved = true;
    const h = Math.min(maxOpenH(), Math.max(PEEK_H, d.startH + dy));
    setDragH(h);
  };
  const onGrabberUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      setSheetOpen((o) => !o);
    } else if (dragH != null) {
      const threshold = PEEK_H + (maxOpenH() - PEEK_H) * 0.35;
      setSheetOpen(dragH > threshold);
    }
    setDragH(null);
  };

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const handleRouteUpdate = useCallback((route: Route | null) => {
    setActiveRoute(route);
  }, []);

  const navigate = useCallback((v: View) => {
    setActiveView(v);
    setSheetOpen(false);
    setDragH(null);
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
            onEdit={() => navigate('edit-profile')}
            onOpenFriends={() => navigate('friends')}
          />
        );
      case 'edit-profile':
        return <EditProfilePage onBack={() => navigate('profile')} />;
      case 'chats':
        return <ChatsPage />;
      case 'friends':
        return <FriendsPage />;
      default:
        return (
          <div className="layout">
            <div
              className={`sheet${sheetOpen ? ' sheet--open' : ''}`}
              style={isMobile && dragH != null ? { height: dragH, transition: 'none' } : undefined}
            >
              {isMobile && (
                <div
                  className="sheet-grabber"
                  onPointerDown={onGrabberDown}
                  onPointerMove={onGrabberMove}
                  onPointerUp={onGrabberUp}
                  role="button"
                  aria-label={sheetOpen ? 'Свернуть' : 'Развернуть'}
                >
                  <span className="sheet-grabber-bar" />
                </div>
              )}
              {isMobile && !sheetOpen && (
                <div className="sheet-peek">
                  <button className="sheet-peek-search" onClick={() => setSheetOpen(true)}>
                    <span className="sheet-peek-spark">✦</span>
                    <span>Спросите AI — куда сходить?</span>
                  </button>
                  <button
                    className="sheet-peek-filter"
                    onClick={() => setSheetOpen(true)}
                    aria-label="Фильтры"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                      <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="9" cy="7" r="2.3" fill="var(--bg)" /><circle cx="15" cy="12" r="2.3" fill="var(--bg)" /><circle cx="8" cy="17" r="2.3" fill="var(--bg)" />
                    </svg>
                  </button>
                </div>
              )}
              <AIChat onRouteUpdate={handleRouteUpdate} />
            </div>

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

  const isMapView = activeView === 'map' || activeView === 'places';
  const navActive = (v: View) =>
    v === activeView || (v === 'profile' && activeView === 'edit-profile');

  return (
    <div className={`app${isMobile ? ' app--mobile' : ''}`}>
      {!isMobile && <Topbar activeView={activeView} onNavigate={setActiveView} />}

      {newBadge && <div className="badge-toast">🏅 Новый бейдж разблокирован!</div>}

      {renderView()}

      {isMobile && (
        <>
          {isMapView && !sheetOpen && dragH == null && (
            <div className="mobile-profile-slot">
              <ProfileMenu themeMode={theme.mode} onThemeChange={theme.setMode} onNavigate={navigate} />
            </div>
          )}

          {isMapView && sheetOpen && (
            <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          )}

          <nav className="bottom-nav">
            {MOBILE_NAV.map((item) => (
              <button
                key={item.view}
                className={`bottom-nav-btn${navActive(item.view) ? ' bottom-nav-btn--active' : ''}`}
                onClick={() => navigate(item.view)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
