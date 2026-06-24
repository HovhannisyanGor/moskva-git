import { useState, useCallback, useRef, useEffect } from 'react';
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
import FavoritesPage from './components/FavoritesPage';
import UserProfilePage from './components/UserProfilePage';
import SettingsPage from './components/SettingsPage';
import SupportPage from './components/SupportPage';
import AdminPage from './components/AdminPage';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import { useAchievements } from './hooks/useAchievements';
import { useFavorites } from './hooks/useFavorites';
import { useIsMobile } from './hooks/useIsMobile';
import { useTheme } from './hooks/useTheme';
import { useChatNotifications } from './hooks/useChatNotifications';
import { useI18n } from './i18n';
import type { Place, Route, View } from './types';
import { PLACES } from './data/places';
import { api, getToken, clearToken, type ApiUser, type ChatUser } from './utils/api';
import { buildDisplayUser, displayBadges, recentPlaces } from './utils/profile';
import './App.css';

const ICON = {
  map: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21l8 0" /><path d="M12 17l0 4" /><path d="M7 4l10 0" /><path d="M17 4v8a5 5 0 0 1 -10 0v-8" /><path d="M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    </svg>
  ),
  friends: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.2A3 3 0 0 1 17 11M21 20c0-2.6-1.5-4.2-3.5-4.8" />
    </svg>
  ),
  chats: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.7 3.1-5.6 7-5.6s7 1.9 7 5.6" />
    </svg>
  ),
};

const MOBILE_NAV: { view: View; labelKey: string; icon: ReactNode }[] = [
  { view: 'map', labelKey: 'nav.map', icon: ICON.map },
  { view: 'achievements', labelKey: 'nav.awards', icon: ICON.trophy },
  { view: 'friends', labelKey: 'nav.friends', icon: ICON.friends },
  { view: 'chats', labelKey: 'nav.chats', icon: ICON.chats },
  { view: 'profile', labelKey: 'nav.profile', icon: ICON.user },
];

export default function App() {
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [activeView, setActiveView] = useState<View>('map');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { visits, unlockedBadges, isVisited, toggleVisit, newBadge, resetAchievements } = useAchievements();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Какой чат сейчас открыт — по нему не показываем всплывашку (ты его и так читаешь).
  const [activeChatUser, setActiveChatUser] = useState<number | null>(null);
  // Состояние «гостя» (пока не вошёл): сначала лендинг, потом экран входа.
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  // Какой диалог открыть в чатах (например, по кнопке «Написать» у друга).
  const [chatWith, setChatWith] = useState<ChatUser | null>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [prevView, setPrevView] = useState<View>('map');

  // При загрузке: если есть сохранённый токен — проверяем его и подтягиваем профиль.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken()) {
        setAuthChecked(true);
        return;
      }
      try {
        const u = await api.me();
        if (alive) setCurrentUser(u);
      } catch {
        clearToken(); // токен протух — выходим
      } finally {
        if (alive) setAuthChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Пригласительная ссылка в группу: ?join=TOKEN — вступаем и открываем «Чаты».
  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('join');
    if (!token) return;
    (async () => {
      try {
        await api.groupJoin(token);
        setActiveView('chats');
      } catch {
        /* ссылка недействительна — молча игнорируем */
      } finally {
        params.delete('join');
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
      }
    })();
  }, [currentUser]);

  const handleLogout = useCallback(() => {
    api.logout();
    setCurrentUser(null);
    setAuthView('landing');
  }, []);

  const handleProfileSaved = useCallback((u: ApiUser) => setCurrentUser(u), []);

  const isMobile = useIsMobile();
  const theme = useTheme();
  const { t, lang } = useI18n();
  // Непрочитанные сообщения (для бейджа) + всплывашка о новом сообщении.
  const { totalUnread, toast, dismissToast } = useChatNotifications(!!currentUser, activeChatUser);
  // Нижняя шторка: 0 = свёрнуто (пик), 1 = полностью раскрыто
  const [snap, setSnap] = useState(0);
  const [dragH, setDragH] = useState<number | null>(null);
  const dragRef = useRef<
    { startY: number; startH: number; lastY: number; lastT: number; vy: number; lastH: number; moved: boolean; onGrabber: boolean } | null
  >(null);
  const sheetOpen = snap > 0;

  const NAV_H = 58;
  const TOP_GAP = 76; // полностью раскрытая шторка не доходит до кнопки профиля
  const PEEK_H = 96;
  const snapPoints = () => [PEEK_H, Math.max(240, window.innerHeight - NAV_H - TOP_GAP)];
  // высота шторки фиксированная (полная), показываем через сдвиг translateY
  const visibleH = () => (dragH != null ? dragH : snapPoints()[snap]);
  const sheetTranslateY = () => snapPoints()[1] - visibleH();

  // Тянуть можно за любую точку шторки, кроме самих полей/кнопок
  const onSheetDown = (e: React.PointerEvent) => {
    if (!isMobile) return;
    const t = e.target as HTMLElement;
    const onGrabber = !!t.closest('.sheet-grabber');
    if (!onGrabber && t.closest('input, select, textarea, button, a')) return;
    const h = visibleH();
    dragRef.current = { startY: e.clientY, startH: h, lastY: e.clientY, lastT: performance.now(), vy: 0, lastH: h, moved: false, onGrabber };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onSheetMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const pts = snapPoints();
    const dy = d.startY - e.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    const h = Math.min(pts[1], Math.max(pts[0], d.startH + dy));
    const now = performance.now();
    d.vy = (e.clientY - d.lastY) / Math.max(1, now - d.lastT); // px/мс, <0 — вверх
    d.lastY = e.clientY;
    d.lastT = now;
    d.lastH = h;
    setDragH(h);
  };
  const onSheetUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      if (d.onGrabber) setSnap((s) => (s === 0 ? 1 : 0)); // тап по язычку — открыть/свернуть
      setDragH(null);
      return;
    }
    const pts = snapPoints();
    const h = d.lastH;
    const FLICK = 0.5;
    let target: number;
    if (d.vy < -FLICK) target = 1; // флик вверх — полностью
    else if (d.vy > FLICK) target = 0; // флик вниз — свернуть
    else target = Math.abs(pts[0] - h) <= Math.abs(pts[1] - h) ? 0 : 1; // ближайшая
    setSnap(target);
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
    setSnap(0);
    setDragH(null);
  }, []);

  const openChatWith = useCallback((u: ChatUser) => {
    setChatWith(u);
    setActiveView('chats');
    setSnap(0);
    setDragH(null);
  }, []);

  const openPlace = useCallback((p: Place) => {
    setSelectedPlace(p);
    setActiveView('map');
    setSnap(0);
    setDragH(null);
  }, []);

  const openUserProfile = useCallback(
    (id: number) => {
      setPrevView(activeView);
      setProfileUserId(id);
      setActiveView('user');
      setSnap(0);
      setDragH(null);
    },
    [activeView],
  );

  const handleAchievementPlaceClick = useCallback((placeId: number) => {
    const place = PLACES.find((p) => p.id === placeId);
    if (place) {
      setActiveView('map');
      setSelectedPlace(place);
    }
  }, []);

  // --- Ворота авторизации: пока не вошёл — показываем экран входа/регистрации ---
  if (!authChecked) {
    return (
      <div
        className="app"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}
      >
        <div style={{ opacity: 0.6 }}>{t('common.loading')}</div>
      </div>
    );
  }
  if (!currentUser) {
    if (authView === 'landing') {
      return (
        <LandingPage
          onStart={() => {
            setAuthTab('register');
            setAuthView('auth');
          }}
          onLogin={() => {
            setAuthTab('login');
            setAuthView('auth');
          }}
        />
      );
    }
    return (
      <AuthScreen
        initialTab={authTab}
        onAuthed={setCurrentUser}
        onBack={() => setAuthView('landing')}
      />
    );
  }

  const displayUser = buildDisplayUser(currentUser, visits, unlockedBadges);
  const isAdmin = currentUser.role === 'admin';
  const meId = currentUser.id;

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
            user={displayUser}
            badges={displayBadges(unlockedBadges)}
            recent={recentPlaces(visits, lang)}
            onEdit={() => navigate('edit-profile')}
            onOpenFriends={() => navigate('friends')}
          />
        );
      case 'edit-profile':
        return (
          <EditProfilePage
            user={displayUser}
            onSaved={handleProfileSaved}
            onBack={() => navigate('profile')}
            onResetAchievements={resetAchievements}
          />
        );
      case 'chats':
        return (
          <ChatsPage
            onActiveChatChange={setActiveChatUser}
            meName={displayUser.name}
            meId={meId}
            openWith={chatWith}
            onOpenedWith={() => setChatWith(null)}
            onOpenProfile={openUserProfile}
          />
        );
      case 'friends':
        return <FriendsPage onMessage={openChatWith} onOpenProfile={openUserProfile} />;
      case 'favorites':
        return <FavoritesPage favorites={favorites} onPlaceClick={handleAchievementPlaceClick} />;
      case 'user':
        return profileUserId != null ? (
          <UserProfilePage userId={profileUserId} onBack={() => navigate(prevView)} onMessage={openChatWith} />
        ) : null;
      case 'settings':
        return currentUser ? (
          <SettingsPage
            user={currentUser}
            onSavedUser={setCurrentUser}
            onBack={() => navigate('profile')}
            themeMode={theme.mode}
            onThemeChange={theme.setMode}
          />
        ) : null;
      case 'support':
        return <SupportPage onBack={() => navigate('profile')} />;
      case 'admin':
        // Вход в админку показан только админам, и сервер всё равно проверяет роль.
        // Если сюда как-то попал не-админ — просто ничего не рендерим.
        return isAdmin ? <AdminPage meId={meId} /> : null;
      default:
        return (
          <div className="layout">
            <div
              className={`sheet${sheetOpen ? ' sheet--open' : ''}`}
              style={isMobile ? { transform: `translateY(${sheetTranslateY()}px)`, transition: dragH != null ? 'none' : undefined } : undefined}
              onPointerDown={isMobile ? onSheetDown : undefined}
              onPointerMove={isMobile ? onSheetMove : undefined}
              onPointerUp={isMobile ? onSheetUp : undefined}
            >
              {isMobile && (
                <div className="sheet-grabber" role="button" aria-label={sheetOpen ? t('common.collapse') : t('common.expand')}>
                  <span className="sheet-grabber-bar" />
                </div>
              )}
              {isMobile && !sheetOpen && (
                <div className="sheet-peek">
                  <button className="sheet-peek-search" onClick={() => setSnap(1)}>
                    <span className="sheet-peek-spark">✦</span>
                    <span>{t('ai.peek')}</span>
                  </button>
                  <button
                    className="sheet-peek-filter"
                    onClick={() => setSnap(1)}
                    aria-label={t('common.filters')}
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
                  isFavorite={isFavorite(selectedPlace.id)}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              <div className="map-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#FA3C3C' }} />
                  <span>{t('legend.landmark')}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#378ADD' }} />
                  <span>{t('legend.park')}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#D4537E' }} />
                  <span>{t('legend.museum')}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#BA7517' }} />
                  <span>{t('legend.restaurant')}</span>
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
      {!isMobile && (
        <Topbar
          activeView={activeView}
          onNavigate={setActiveView}
          user={displayUser}
          isAdmin={isAdmin}
          chatsUnread={totalUnread}
          onLogout={handleLogout}
          onOpenProfile={openUserProfile}
          onOpenPlace={openPlace}
        />
      )}

      {newBadge && <div className="badge-toast">{t('toast.newBadge')}</div>}

      {toast && (
        <button
          type="button"
          className="chat-toast"
          onClick={() => {
            dismissToast();
            navigate('chats');
          }}
        >
          <span className="chat-toast-ic">💬</span>
          <span className="chat-toast-body">
            <span className="chat-toast-name">{toast.name}</span>
            <span className="chat-toast-text">{toast.text}</span>
          </span>
        </button>
      )}

      {renderView()}

      {isMobile && (
        <>
          {isMapView && sheetOpen && (
            <div className="sheet-backdrop" onClick={() => setSnap(0)} />
          )}

          <nav className="bottom-nav">
            {MOBILE_NAV.map((item) =>
              item.view === 'profile' ? (
                <ProfileMenu
                  key="profile"
                  navMode
                  navActive={activeView === 'profile' || activeView === 'edit-profile'}
                  themeMode={theme.mode}
                  onThemeChange={theme.setMode}
                  onNavigate={navigate}
                  user={displayUser}
                  isAdmin={isAdmin}
                  onLogout={handleLogout}
                />
              ) : (
                <button
                  key={item.view}
                  className={`bottom-nav-btn${navActive(item.view) ? ' bottom-nav-btn--active' : ''}`}
                  onClick={() => navigate(item.view)}
                >
                  <span className="bottom-nav-ic">
                    {item.icon}
                    {item.view === 'chats' && totalUnread > 0 && (
                      <span className="nav-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
                    )}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </button>
              ),
            )}
          </nav>
        </>
      )}
    </div>
  );
}
