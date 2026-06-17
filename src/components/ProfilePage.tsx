import type { DisplayUser, DisplayBadge, RecentPlace } from '../utils/profile';

interface ProfilePageProps {
  user: DisplayUser;
  badges: DisplayBadge[];
  recent: RecentPlace[];
  onEdit: () => void;
  onOpenFriends: () => void;
}

export default function ProfilePage({ user, badges, recent, onEdit, onOpenFriends }: ProfilePageProps) {
  const u = user;
  const progress = Math.min(1, u.points / u.levelNext);

  return (
    <div className="page-scroll">
      <div className="profile-page">
        <div className="pp-head">
          <div className="pp-avatar" style={{ background: u.color }}>
            {u.letter}
          </div>
          <div className="pp-id">
            <h1 className="pp-name">{u.name}</h1>
            <div className="pp-handle">
              @{u.handle} · #{u.id}
            </div>
            <div className="pp-meta">
              📍 {u.city} · {u.since}
            </div>
          </div>
        </div>

        <button className="pp-edit-btn" onClick={onEdit}>
          Редактировать профиль
        </button>

        <div className="pp-stats">
          <div className="pp-stat">
            <b>{u.places}</b>
            <span>МЕСТ</span>
          </div>
          <div className="pp-stat">
            <b>{u.badges}</b>
            <span>БЕЙДЖЕЙ</span>
          </div>
          <div className="pp-stat">
            <b>{u.points}</b>
            <span>БАЛЛОВ</span>
          </div>
          <button className="pp-stat pp-stat--btn" onClick={onOpenFriends}>
            <b>{u.friends}</b>
            <span>ДРУЗЕЙ</span>
          </button>
        </div>

        <div className="pp-level">
          <div className="pp-level-top">
            <span>
              Уровень {u.level} — {u.levelName}
            </span>
            <span className="profile-level-tag">Ур. {u.level}</span>
          </div>
          <div className="profile-level-bar">
            <div className="profile-level-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="profile-level-sub">
            {u.points} / {u.levelNext} баллов до Уровня {u.level + 1}
          </div>
        </div>

        <section className="pp-section">
          <div className="pp-section-label">Бейджи</div>
          <div className="pp-badges">
            {badges.map((b) => (
              <div key={b.name} className={`pp-badge ${b.unlocked ? '' : 'pp-badge--locked'}`}>
                <div className="pp-badge-icon">{b.icon}</div>
                <div className="pp-badge-name">{b.name}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="pp-section">
          <div className="pp-section-label">Последние места</div>
          <div className="pp-list">
            {recent.length === 0 && (
              <div className="pp-list-item">
                <span className="pp-list-name" style={{ opacity: 0.6 }}>
                  Пока нет посещённых мест — отмечай места на карте
                </span>
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
          <div className="pp-section-label">Друзья</div>
          <div className="pp-list-item">
            <span className="pp-list-name" style={{ opacity: 0.6 }}>
              Пока нет друзей — добавим на странице «Друзья»
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
