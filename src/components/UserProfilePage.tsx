import { useCallback, useEffect, useState } from 'react';
import { api, type ChatUser, type PublicUser, type Relation, type PostItem, type PhotoItem } from '../utils/api';
import { useI18n } from '../i18n';
import AvatarLightbox from './AvatarLightbox';
import PostCard from './PostCard';
import { localizeCity } from './profileFields';

export default function UserProfilePage({
  userId,
  onBack,
  onMessage,
  onOpenProfile,
}: {
  userId: number;
  onBack: () => void;
  onMessage: (u: ChatUser) => void;
  onOpenProfile?: (id: number) => void;
}) {
  const { t, lang, formatBirthday, formatAge, formatSince } = useI18n();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [relation, setRelation] = useState<Relation>('none');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoZoom, setPhotoZoom] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.userProfile(userId);
      setUser(data.user);
      setRelation(data.relation);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.error'));
    }
  }, [userId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    api.userPosts(userId).then((p) => alive && setPosts(p)).catch(() => {});
    api.userPhotos(userId).then((p) => alive && setPhotos(p)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

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
      ? t('up.removeFriend')
      : relation === 'outgoing'
        ? t('up.cancelRequest')
        : relation === 'incoming'
          ? t('up.acceptRequest')
          : t('up.addFriend');

  const avatarStyle = user?.avatar
    ? { backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: user?.color };
  const coverStyle = user?.cover
    ? { backgroundImage: `url(${user.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${user?.color}, ${user?.color}99)` };

  // Блок «Информация» — только заполненные строки.
  const infoRows: { icon: string; label: string; value: string }[] = [];
  if (user) {
    const birthdayStr = user.birthDay
      ? [
          formatBirthday(user.birthDay, user.birthMonth, user.birthYear),
          formatAge(user.birthDay, user.birthMonth, user.birthYear),
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
    if (birthdayStr) infoRows.push({ icon: '🎂', label: t('profile.birthday'), value: birthdayStr });
    if (user.gender) infoRows.push({ icon: '⚧', label: t('profile.gender'), value: t(`gender.${user.gender}`) });
    if (user.city) infoRows.push({ icon: '📍', label: t('profile.cityLabel'), value: localizeCity(user.city, lang) });
    const since = formatSince(user.createdAt);
    if (since) infoRows.push({ icon: '🗓', label: t('profile.joined'), value: since });
  }

  return (
    <div className="page-scroll">
      <div className="up-page">
        <button className="ep-back" onClick={onBack}>
          {t('common.back')}
        </button>

        {error && <div className="fr-empty">{error}</div>}

        {user && (
          <>
            <div className="up-cover pp-cover--lg" style={coverStyle}>
              <span className="pp-cover-tint" />
            </div>

            <div className="up-head up-head--fb">
              <button
                type="button"
                className="up-avatar up-avatar--btn"
                style={avatarStyle}
                onClick={() => setZoom(true)}
                aria-label={user.name}
              >
                {user.avatar ? '' : user.letter}
                {user.online && <span className="fr-online-dot" />}
              </button>
              <h1 className="up-name">{user.name}</h1>
              <div className="up-handle">
                @{user.handle} · #{String(user.id).padStart(5, '0')}
              </div>
              <div className="up-meta">
                {user.online ? (
                  <span className="up-online">● {t('common.online')}</span>
                ) : (
                  <span className="up-offline">{t('common.offline')}</span>
                )}
              </div>
            </div>

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
                  {t('common.message')}
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

            <section className="pp-section up-section">
              <div className="pp-section-label">{t('profile.intro')}</div>
              <div className="pp-about">
                {user.bio ? user.bio : <span className="pp-muted">{t('profile.noBio')}</span>}
              </div>
              {infoRows.length > 0 && (
                <div className="pp-info">
                  {infoRows.map((r) => (
                    <div className="pp-info-row" key={r.label}>
                      <span className="pp-info-ic">{r.icon}</span>
                      <span className="pp-info-label">{r.label}</span>
                      <span className="pp-info-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {user.interests.length > 0 && (
                <div className="pp-interests">
                  {user.interests.map((it) => (
                    <span className="pp-interest" key={it}>{it}</span>
                  ))}
                </div>
              )}
            </section>

            {photos.length > 0 && (
              <section className="pp-section">
                <div className="pp-section-label">
                  {t('profile.photos')} <span className="pp-section-count">{photos.length}</span>
                </div>
                <div className="pp-photos">
                  {photos.slice(0, 9).map((ph) => (
                    <button
                      key={ph.postId}
                      type="button"
                      className="pp-photo"
                      style={{ backgroundImage: `url(${ph.image})` }}
                      onClick={() => setPhotoZoom(ph.image)}
                      aria-label="фото"
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="pp-section">
              <div className="pp-section-label">{t('profile.wall')}</div>
              {posts.length === 0 ? (
                <div className="pp-list-item">
                  <span className="pp-list-name pp-muted">{t('profile.noPostsOther')}</span>
                </div>
              ) : (
                <div className="feed-list">
                  {posts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      onOpenProfile={onOpenProfile}
                      onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {zoom && user && (
        <AvatarLightbox
          avatar={user.avatar}
          color={user.color}
          letter={user.letter}
          name={user.name}
          onClose={() => setZoom(false)}
        />
      )}
      {photoZoom && (
        <div className="photo-lightbox" onClick={() => setPhotoZoom('')}>
          <img src={photoZoom} alt="" />
          <button type="button" className="photo-lightbox-x" onClick={() => setPhotoZoom('')} aria-label={t('common.close')}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
