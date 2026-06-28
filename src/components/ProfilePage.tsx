import { useEffect, useRef, useState } from 'react';
import type { DisplayUser, DisplayBadge, RecentPlace } from '../utils/profile';
import { api, type ApiUser, type PostItem, type PhotoItem } from '../utils/api';
import { fileToAvatar, fileToImage } from '../utils/avatar';
import { BadgeIcon } from './Icon';
import { useI18n } from '../i18n';
import AvatarLightbox from './AvatarLightbox';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import FriendsSidebar from './FriendsSidebar';
import { localizeCity } from './profileFields';
import { PLACES, CATEGORY_COLORS } from '../data/places';

const BADGE_PREVIEW = 5; // сколько бейджей показываем до нажатия «+»
const PHOTO_PREVIEW = 9;

interface ProfilePageProps {
  user: DisplayUser;
  badges: DisplayBadge[];
  recent: RecentPlace[];
  favorites: number[];
  meId: number;
  onEdit: () => void;
  onOpenFriends: () => void;
  onOpenProfile?: (id: number) => void;
  onPlaceClick?: (placeId: number) => void;
  onUserUpdated?: (u: ApiUser) => void;
}

// Дата рождения 'YYYY-MM-DD' → {d, m, y} (или null).
function parseBirthdate(s: string): { d: number; m: number; y: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export default function ProfilePage({
  user,
  badges,
  recent,
  favorites,
  meId,
  onEdit,
  onOpenFriends,
  onOpenProfile,
  onPlaceClick,
  onUserUpdated,
}: ProfilePageProps) {
  const u = user;
  const { t, lang, formatBirthday, formatAge, formatSince } = useI18n();
  const progress = Math.min(1, u.points / u.levelNext);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [photoZoom, setPhotoZoom] = useState('');
  const shownBadges = showAllBadges ? badges : badges.slice(0, BADGE_PREVIEW);
  const hiddenCount = badges.length - BADGE_PREVIEW;

  // Свои посты (стена), фотографии, количество друзей.
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Загрузка обложки/аватара.
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'cover' | 'avatar' | null>(null);

  useEffect(() => {
    let alive = true;
    api.userPosts(meId).then((p) => alive && setPosts(p)).catch(() => {});
    api.userPhotos(meId).then((p) => alive && setPhotos(p)).catch(() => {});
    api.friends().then((d) => alive && setFriendCount(d.friends.length)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [meId]);

  async function onPick(kind: 'cover' | 'avatar', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(kind);
    try {
      const dataUrl = kind === 'cover' ? await fileToImage(file, 1280, 0.82) : await fileToAvatar(file);
      const updated = await api.updateMe(kind === 'cover' ? { cover: dataUrl } : { avatar: dataUrl });
      onUserUpdated?.(updated);
    } catch {
      /* ignore */
    } finally {
      setUploading(null);
    }
  }

  function afterNewPost(p: PostItem) {
    setPosts((prev) => [p, ...prev]);
    if (p.image) setPhotos((prev) => [{ postId: p.id, image: p.image, createdAt: p.createdAt }, ...prev]);
  }
  function afterDelPost(id: number) {
    setPosts((prev) => prev.filter((x) => x.id !== id));
    setPhotos((prev) => prev.filter((x) => x.postId !== id));
  }

  const bd = parseBirthdate(u.birthdate);
  const birthdayStr = bd
    ? [formatBirthday(bd.d, bd.m, bd.y), formatAge(bd.d, bd.m, bd.y)].filter(Boolean).join(' · ')
    : '';
  const avatarStyle = u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
  const coverStyle = u.cover
    ? { backgroundImage: `url(${u.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${u.color}, ${u.color}99)` };

  const infoRows: { icon: string; label: string; value: string }[] = [];
  if (birthdayStr) infoRows.push({ icon: '🎂', label: t('profile.birthday'), value: birthdayStr });
  if (u.gender) infoRows.push({ icon: '⚧', label: t('profile.gender'), value: t(`gender.${u.gender}`) });
  if (u.city) infoRows.push({ icon: '📍', label: t('profile.cityLabel'), value: localizeCity(u.city, lang) });
  const since = formatSince(u.createdAt);
  if (since) infoRows.push({ icon: '🗓', label: t('profile.joined'), value: since });

  const favPlaces = favorites
    .map((id) => PLACES.find((p) => p.id === id))
    .filter((p): p is (typeof PLACES)[number] => Boolean(p))
    .slice(0, 6);
  const shownPhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_PREVIEW);

  return (
    <div className="page-scroll">
      <div className="profile-page">
        <div className="pp-cover pp-cover--lg" style={coverStyle}>
          <span className="pp-cover-tint" />
          <button
            type="button"
            className="pp-cover-edit"
            onClick={() => coverRef.current?.click()}
            disabled={uploading === 'cover'}
          >
            📷 {uploading === 'cover' ? t('profile.uploading') : t('profile.changeCover')}
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => onPick('cover', e)} />
        </div>

        <div className="pp-head pp-head--fb">
          <div className="pp-avatar-wrap">
            <button
              type="button"
              className="pp-avatar pp-avatar--btn"
              style={avatarStyle}
              onClick={() => setZoom(true)}
              aria-label={u.name}
            >
              {u.avatar ? '' : u.letter}
            </button>
            <button
              type="button"
              className="pp-avatar-edit"
              onClick={() => avatarRef.current?.click()}
              disabled={uploading === 'avatar'}
              aria-label={t('profile.changePhoto')}
              title={t('profile.changePhoto')}
            >
              📷
            </button>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => onPick('avatar', e)} />
          </div>
          <div className="pp-id">
            <h1 className="pp-name">{u.name}</h1>
            <div className="pp-handle">
              @{u.handle} · #{u.id}
            </div>
          </div>
        </div>

        <button className="pp-edit-btn" onClick={onEdit}>
          {t('profile.edit')}
        </button>

        <div className="pp-stats">
          <div className="pp-stat">
            <b>{u.places}</b>
            <span>{t('profile.stat.places')}</span>
          </div>
          <div className="pp-stat">
            <b>{u.badges}</b>
            <span>{t('profile.stat.badges')}</span>
          </div>
          <div className="pp-stat">
            <b>{u.points}</b>
            <span>{t('profile.stat.points')}</span>
          </div>
          <button className="pp-stat pp-stat--btn" onClick={onOpenFriends}>
            <b>{friendCount}</b>
            <span>{t('profile.stat.friends')}</span>
          </button>
        </div>

        <section className="pp-section">
          <div className="pp-section-label">{t('profile.intro')}</div>
          <div className="pp-about">{u.bio ? u.bio : <span className="pp-muted">{t('profile.noBio')}</span>}</div>
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
          {u.interests.length > 0 && (
            <div className="pp-interests">
              {u.interests.map((it) => (
                <span className="pp-interest" key={it}>{it}</span>
              ))}
            </div>
          )}
        </section>

        <div className="pp-level">
          <div className="pp-level-top">
            <span>{t('profile.level', { level: u.level, name: t(`level.${u.level}`) })}</span>
            <span className="profile-level-tag">{t('profile.levelTag', { level: u.level })}</span>
          </div>
          <div className="profile-level-bar">
            <div className="profile-level-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="profile-level-sub">
            {t('profile.levelSub', { points: u.points, next: u.levelNext, nextLevel: u.level + 1 })}
          </div>
        </div>

        {/* Двухколоночная часть: слева стена записей, справа фото/места/друзья */}
        <div className="social-layout">
          <div className="social-main">
            <PostComposer me={{ avatar: u.avatar, color: u.color, letter: u.letter }} onPosted={afterNewPost} />
            <section className="pp-section">
              <div className="pp-section-label">{t('profile.wall')}</div>
              {posts.length === 0 ? (
                <div className="pp-list-item">
                  <span className="pp-list-name pp-muted">{t('profile.noPosts')}</span>
                </div>
              ) : (
                <div className="feed-list">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} onOpenProfile={onOpenProfile} onDeleted={afterDelPost} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="social-aside">
            {photos.length > 0 && (
              <section className="pp-card">
                <div className="pp-card-head">
                  <span>{t('profile.photos')}</span>
                  <b>{photos.length}</b>
                </div>
                <div className="pp-photos">
                  {shownPhotos.map((ph) => (
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
                {photos.length > PHOTO_PREVIEW && !showAllPhotos && (
                  <button type="button" className="pp-card-more" onClick={() => setShowAllPhotos(true)}>
                    {t('profile.allPhotos')} ›
                  </button>
                )}
              </section>
            )}

            <section className="pp-card">
              <div className="pp-card-head">
                <span>{t('profile.favPlaces')}</span>
                <b>{favPlaces.length}</b>
              </div>
              {favPlaces.length === 0 ? (
                <div className="pp-muted pp-card-empty">{t('profile.noFav')}</div>
              ) : (
                <div className="pp-list">
                  {favPlaces.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="pp-list-item pp-list-item--btn"
                      onClick={() => onPlaceClick?.(p.id)}
                    >
                      <span className="pp-dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                      <span className="pp-list-name">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="pp-card">
              <div className="pp-card-head">
                <span>{t('profile.recent')}</span>
              </div>
              {recent.length === 0 ? (
                <div className="pp-muted pp-card-empty">{t('profile.noPlaces')}</div>
              ) : (
                <div className="pp-list">
                  {recent.map((p) => (
                    <div className="pp-list-item" key={p.name + p.when}>
                      <span className="pp-dot" style={{ background: p.color }} />
                      <span className="pp-list-name">{p.name}</span>
                      <span className="pp-list-when">{p.when}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <FriendsSidebar onOpenProfile={onOpenProfile} onOpenFriends={onOpenFriends} />
          </div>
        </div>

        <section className="pp-section">
          <div className="pp-section-label">
            {t('profile.badges')} <span className="pp-section-count">{u.badges} / {badges.length}</span>
          </div>
          <div className="pp-badges">
            {shownBadges.map((b) => (
              <div key={b.id} className={`pp-badge ${b.unlocked ? '' : 'pp-badge--locked'}`}>
                <div className="pp-badge-icon"><BadgeIcon id={b.id} /></div>
                <div className="pp-badge-name">{b.name}</div>
              </div>
            ))}
            {!showAllBadges && hiddenCount > 0 && (
              <button type="button" className="pp-badge pp-badge--more" onClick={() => setShowAllBadges(true)}>
                <div className="pp-badge-icon">+{hiddenCount}</div>
                <div className="pp-badge-name">{t('profile.more')}</div>
              </button>
            )}
            {showAllBadges && (
              <button type="button" className="pp-badge pp-badge--more" onClick={() => setShowAllBadges(false)}>
                <div className="pp-badge-icon">×</div>
                <div className="pp-badge-name">{t('profile.collapse')}</div>
              </button>
            )}
          </div>
        </section>
      </div>

      {zoom && (
        <AvatarLightbox avatar={u.avatar} color={u.color} letter={u.letter} name={u.name} onClose={() => setZoom(false)} />
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
