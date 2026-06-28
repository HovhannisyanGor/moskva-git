import { useEffect, useState } from 'react';
import { api, type ChatUser } from '../utils/api';
import { useI18n } from '../i18n';

function avStyle(u: ChatUser) {
  if (u.avatar) return { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: u.color };
}

// Боковая колонка «Друзья» (как в ВК справа): онлайн + сетка всех друзей.
// Показывается только на десктопе (на мобиле скрыта через CSS).
export default function FriendsSidebar({
  onOpenProfile,
  onOpenFriends,
}: {
  onOpenProfile?: (id: number) => void;
  onOpenFriends?: () => void;
}) {
  const { t } = useI18n();
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [incoming, setIncoming] = useState<ChatUser[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .friends()
        .then((d) => {
          if (alive) {
            setFriends(d.friends);
            setIncoming(d.incoming);
          }
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const online = friends.filter((f) => f.online);

  function tile(f: ChatUser) {
    return (
      <button key={f.id} type="button" className="frail-tile" onClick={() => onOpenProfile?.(f.id)}>
        <span className="frail-av" style={avStyle(f)}>
          {f.avatar ? '' : f.letter}
          {f.online && <span className="frail-dot" />}
        </span>
        <span className="frail-name">{f.name}</span>
      </button>
    );
  }

  return (
    <aside className="friends-rail">
      {online.length > 0 && (
        <div className="frail-card">
          <div className="frail-head">
            <span>{t('fside.online')}</span>
            <b>{online.length}</b>
          </div>
          <div className="frail-grid">{online.slice(0, 8).map(tile)}</div>
        </div>
      )}

      <div className="frail-card">
        <button type="button" className="frail-head frail-head--btn" onClick={onOpenFriends}>
          <span>{t('fside.title')}</span>
          <b>{friends.length}</b>
        </button>
        {incoming.length > 0 && (
          <button type="button" className="frail-requests" onClick={onOpenFriends}>
            {incoming.length} {t('fside.requests')} ›
          </button>
        )}
        {friends.length === 0 ? (
          <div className="frail-empty">{t('fside.empty')}</div>
        ) : (
          <div className="frail-grid">{friends.slice(0, 9).map(tile)}</div>
        )}
        {friends.length > 9 && (
          <button type="button" className="frail-all" onClick={onOpenFriends}>
            {t('fside.all')} ›
          </button>
        )}
      </div>
    </aside>
  );
}
