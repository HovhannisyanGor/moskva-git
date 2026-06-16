import { useState } from 'react';
import { DEMO_CHATS, DEMO_MESSAGES } from '../data/mock';

type ChatTab = 'personal' | 'groups' | 'requests';

export default function ChatsPage() {
  const [activeId, setActiveId] = useState('kostyan');
  const [tab, setTab] = useState<ChatTab>('personal');
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const active = DEMO_CHATS.find((c) => c.id === activeId) ?? DEMO_CHATS[0];

  const openChat = (id: string) => {
    setActiveId(id);
    setMobilePane('chat');
  };

  return (
    <div className={`chats-page ${mobilePane === 'chat' ? 'chats-page--chat' : ''}`}>
      <aside className="chats-list">
        <div className="chats-list-head">
          <span className="chats-title">Сообщения</span>
          <button className="chats-new" type="button">
            +
          </button>
        </div>
        <div className="chats-search">
          <input placeholder="🔍 Поиск чатов..." />
        </div>
        <div className="chats-tabs">
          {(['personal', 'groups', 'requests'] as ChatTab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`chats-tab ${tab === t ? 'chats-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'personal' ? 'Личные' : t === 'groups' ? 'Группы' : 'Запросы'}
            </button>
          ))}
        </div>
        <div className="chats-items">
          {DEMO_CHATS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chat-item ${c.id === activeId ? 'chat-item--active' : ''}`}
              onClick={() => openChat(c.id)}
            >
              <span className="chat-av" style={{ background: c.color }}>
                {c.letter}
                {c.online && <span className="chat-online-dot" />}
              </span>
              <span className="chat-item-mid">
                <span className="chat-item-name">{c.name}</span>
                <span className="chat-item-last">{c.last}</span>
              </span>
              <span className="chat-item-right">
                <span className="chat-item-time">{c.time}</span>
                {c.unread ? <span className="chat-unread">{c.unread}</span> : null}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-view">
        <header className="chat-view-head">
          <button
            className="chat-back"
            type="button"
            onClick={() => setMobilePane('list')}
            aria-label="Назад к чатам"
          >
            ‹
          </button>
          <span className="chat-av chat-av--sm" style={{ background: active.color }}>
            {active.letter}
          </span>
          <span className="chat-view-id">
            <span className="chat-view-name">{active.name}</span>
            {active.online && <span className="chat-view-status">● онлайн</span>}
          </span>
        </header>

        <div className="chat-messages">
          <div className="chat-day">Сегодня</div>
          {DEMO_MESSAGES.map((m) => (
            <div key={m.id} className={`chat-msg chat-msg--${m.from}`}>
              {m.route ? (
                <div className="chat-route-card">
                  <div className="chat-route-title">{m.route.title}</div>
                  <div className="chat-route-meta">{m.route.meta}</div>
                  {m.route.stops.map((s) => (
                    <div className="chat-route-stop" key={s.n}>
                      <span className="chat-route-n">{s.n}</span>
                      {s.name}
                    </div>
                  ))}
                  <button className="chat-route-open" type="button">
                    Открыть на карте →
                  </button>
                </div>
              ) : (
                <div className="chat-bubble">{m.text}</div>
              )}
              <div className="chat-msg-time">{m.time}</div>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input placeholder="Сообщение..." />
          <button className="chat-send" type="button">
            ➤
          </button>
        </div>
      </section>
    </div>
  );
}
