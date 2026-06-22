import { useState } from 'react';
import type { DisplayUser, DisplayBadge, RecentPlace } from '../utils/profile';
import { BadgeIcon } from './Icon';
import { useI18n } from '../i18n';
import AvatarLightbox from './AvatarLightbox';
import { localizeCity } from './profileFields';

const BADGE_PREVIEW = 5; // сколько бейджей показываем до нажатия «+»

interface ProfilePageProps {
  user: DisplayUser;
  badges: DisplayBadge[];
  recent: RecentPlace[];
  onEdit: () => void;
  onOpenFriends: () => void;
}

// Дата рождения 'YYYY-MM-DD' → {d, m, y} (или null).
function parseBirthdate(s: string): { d: number; m: number; y: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export default function ProfilePage({ user, badges, recent, onEdit, onOpenFriends }: ProfilePageProps) {
  const u = user;
  const { t, lang, formatBirthday, formatAge, formatSince } = useI18n();
  const progress = Math.min(1, u.points / u.levelNext);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [zoom, setZoom] = useState(false);
  const shownBadges = showAllBadges ? badges : badges.slice(0, BADGE_PREVIEW);
  const hiddenCount = badges.length - BADGE_PREVIEW;

  const bd = parseBirthdate(u.birthdate);
  // Свой профиль — год рождения и возраст видны всегда (приватность только для других).
  const birthdayStr = bd
    ? [formatBirthday(bd.d, bd.m, bd.y), formatAge(bd.d, bd.m, bd.y)].filter(Boolean).join(' · ')
    : '';
  const avatarStyle = u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };

  // Строки блока «Информация» — показываем только заполненные.
  const infoRows: { icon: string; label: string; value: string }[] = [];
  if (birthdayStr) infoRows.push({ icon: '🎂', label: t('profile.birthday'), value: birthdayStr });
  if (u.gender) infoRows.push({ icon: '⚧', label: t('profile.gender'), value: t(`gender.${u.gender}`) });
  if (u.city) infoRows.push({ icon: '📍', label: t('profile.cityLabel'), value: localizeCity(u.city, lang) });
  const since = formatSince(u.createdAt);
  if (since) infoRows.push({ icon: '🗓', label: t('profile.joined'), value: since });

  return (
    <div className="page-scroll">
      <div className="profile-page">
        <div className="pp-cover" style={{ background: u.color }}>
          <span className="pp-cover-tint" />
        </div>

        <div className="pp-head pp-head--fb">
          <button
            type="button"
            className="pp-avatar pp-avatar--btn"
            style={avatarStyle}
            onClick={() => setZoom(true)}
            aria-label={u.name}
          >
            {u.avatar ? '' : u.letter}
          </button>
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
            <b>{u.friends}</b>
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
              <button
                type="button"
                className="pp-badge pp-badge--more"
                onClick={() => setShowAllBadges(true)}
              >
                <div className="pp-badge-icon">+{hiddenCount}</div>
                <div className="pp-badge-name">{t('profile.more')}</div>
              </button>
            )}
            {showAllBadges && (
              <button
                type="button"
                className="pp-badge pp-badge--more"
                onClick={() => setShowAllBadges(false)}
              >
                <div className="pp-badge-icon">×</div>
                <div className="pp-badge-name">{t('profile.collapse')}</div>
              </button>
            )}
          </div>
        </section>

        <section className="pp-section">
          <div className="pp-section-label">{t('profile.recent')}</div>
          <div className="pp-list">
            {recent.length === 0 && (
              <div className="pp-list-item">
                <span className="pp-list-name pp-muted">{t('profile.noPlaces')}</span>
              </div>
            )}
            {recent.map((p) => (
              <div className="pp-list-item" key={p.name}>
                <span className="pp-dot" style={{ background: p.color }} />
                <span className="pp-list-name">{p.name}</span>
                <span className="pp-list-when">{p.when}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pp-section">
          <div className="pp-section-label">{t('profile.friends')}</div>
          <div className="pp-list-item">
            <span className="pp-list-name pp-muted">{t('profile.noFriends')}</span>
          </div>
        </section>
      </div>

      {zoom && (
        <AvatarLightbox
          avatar={u.avatar}
          color={u.color}
          letter={u.letter}
          name={u.name}
          onClose={() => setZoom(false)}
        />
      )}
    </div>
  );
}
