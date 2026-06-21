import { useCallback, useEffect, useState } from 'react';
import { api, type ChatUser, type PublicUser, type Relation } from '../utils/api';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
function sinceFrom(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return `С ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function UserProfilePage({
  userId,
  onBack,
  onMessage,
}: {
  userId: number;
  onBack: () => void;
  onMessage: (u: ChatUser) => void;
}) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [relation, setRelation] = useState<Relation>('none');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.userProfile(userId);
      setUser(data.user);
      setRelation(data.relation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function friendAction() {
    if (!user) return;
    setBusy(true);
    try {
      if (relation === 'none') await api.addFriend(user.id);
      else if (relation === 'incoming') await api.acceptFriend(user.id);
      else await api.removeFriend(user.id); // outgoing | friends → отменить/удалить
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  const friendLabel =
    relation === 'friends'
      ? 'Удалить из друзей'
      : relation === 'outgoing'
        ? 'Отменить заявку'
        : relation === 'incoming'
          ? 'Принять заявку'
          : '+ В друзья';

  const avatarStyle = user?.avatar
    ? { backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: user?.color };

  return (
    <div className="page-scroll">
      <div className="up-page">
        <button className="ep-back" onClick={onBack}>
          ← Назад
        </button>

        {error && <div className="fr-empty">{error}</div>}

        {user && (
          <>
            <div className="up-head">
              <div className="up-avatar" style={avatarStyle}>
                {user.avatar ? '' : user.letter}
                {user.online && <span className="fr-online-dot" />}
              </div>
              <h1 className="up-name">{user.name}</h1>
              <div className="up-handle">
                @{user.handle} · #{String(user.id).padStart(5, '0')}
              </div>
              <div className="up-meta">
                {user.online ? (
                  <span className="up-online">● в сети</span>
                ) : (
                  <span className="up-offline">не в сети</span>
                )}
                {user.city ? <span> · 📍 {user.city}</span> : null}
                {sinceFrom(user.createdAt) ? <span> · {sinceFrom(user.createdAt)}</span> : null}
              </div>
            </div>

            {user.bio && <p className="up-bio">{user.bio}</p>}

            {relation !== 'self' && (
              <div className="up-actions">
                <button
                  className="up-btn up-btn--primary"
                  onClick={() =>
                    onMessage({
                      id: user.id,
                      name: user.name,
                      handle: user.handle,
                      color: user.color,
                      letter: user.letter,
                      avatar: user.avatar,
                      online: user.online,
                    })
                  }
                >
                  Написать
                </button>
                <button
                  className={`up-btn${relation === 'friends' ? ' up-btn--danger' : ''}`}
                  onClick={friendAction}
                  disabled={busy}
                >
                  {friendLabel}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
