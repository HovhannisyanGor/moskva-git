import { useState } from 'react';
import { DEMO_FRIENDS, DEMO_REQUESTS, type MockFriend } from '../data/mock';

type FriendsTab = 'all' | 'online' | 'requests';

function FriendRow({ f }: { f: MockFriend }) {
  return (
    <div className="fr-row">
      <span className="fr-av" style={{ background: f.color }}>
        {f.letter}
        {f.online && <span className="fr-online-dot" />}
      </span>
      <span className="fr-row-mid">
        <span className="fr-row-name">{f.name}</span>
        <span className="fr-row-sub">
          @{f.handle} · {f.status}
        </span>
      </span>
      <span className="fr-row-actions">
        <button className="fr-act" type="button" title="Написать">
          💬
        </button>
        <button className="fr-act" type="button" title="Маршрут вместе">
          🗺️
        </button>
      </span>
    </div>
  );
}

export default function FriendsPage() {
  const [tab, setTab] = useState<FriendsTab>('all');
  const online = DEMO_FRIENDS.filter((f) => f.online);
  const offline = DEMO_FRIENDS.filter((f) => !f.online);

  return (
    <div className="page-scroll">
      <div className="friends-page">
        <div className="fr-head">
          <span className="fr-title">Друзья</span>
          <button className="fr-add" type="button">
            + Добавить
          </button>
        </div>

        <div className="fr-search">
          <input placeholder="🔍 Поиск друзей..." />
        </div>

        <div className="fr-tabs">
          <button
            type="button"
            className={`fr-tab ${tab === 'all' ? 'fr-tab--active' : ''}`}
            onClick={() => setTab('all')}
          >
            Все ({DEMO_FRIENDS.length})
          </button>
          <button
            type="button"
            className={`fr-tab ${tab === 'online' ? 'fr-tab--active' : ''}`}
            onClick={() => setTab('online')}
          >
            Онлайн ({online.length})
          </button>
          <button
            type="button"
            className={`fr-tab ${tab === 'requests' ? 'fr-tab--active' : ''}`}
            onClick={() => setTab('requests')}
          >
            Запросы ({DEMO_REQUESTS.length})
          </button>
        </div>

        <div className="fr-stats">
          <div className="fr-stat">
            <b>{DEMO_FRIENDS.length}</b>
            <span>Друзей</span>
          </div>
          <div className="fr-stat">
            <b>{online.length}</b>
            <span>Онлайн</span>
          </div>
          <div className="fr-stat">
            <b>12</b>
            <span>Мест вместе</span>
          </div>
        </div>

        {(tab === 'all' || tab === 'online') && (
          <>
            <div className="fr-group-label">Онлайн</div>
            {online.map((f) => (
              <FriendRow key={f.handle} f={f} />
            ))}
          </>
        )}

        {tab === 'all' && (
          <>
            <div className="fr-group-label">Не в сети</div>
            {offline.map((f) => (
              <FriendRow key={f.handle} f={f} />
            ))}
          </>
        )}

        {(tab === 'all' || tab === 'requests') && (
          <>
            <div className="fr-group-label">Входящие запросы</div>
            {DEMO_REQUESTS.map((r) => (
              <div className="fr-row" key={r.handle}>
                <span className="fr-av" style={{ background: r.color }}>
                  {r.letter}
                </span>
                <span className="fr-row-mid">
                  <span className="fr-row-name">{r.name}</span>
                  <span className="fr-row-sub">
                    @{r.handle} · {r.mutual}
                  </span>
                </span>
                <span className="fr-req-actions">
                  <button className="fr-req-accept" type="button" title="Принять">
                    ✓
                  </button>
                  <button className="fr-req-decline" type="button" title="Отклонить">
                    ×
                  </button>
                </span>
              </div>
            ))}
          </>
        )}

        <button className="fr-find" type="button">
          Найти друзей по нику или email
        </button>
      </div>
    </div>
  );
}
