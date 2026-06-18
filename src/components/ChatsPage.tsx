import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ChatListItem, type ChatMessageItem, type ChatUser } from '../utils/api';

// Короткое время: сегодня — часы:минуты, иначе — дата.
function timeShort(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toDateString();
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yest.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function avatarStyle(u: { avatar: string; color: string }) {
  return u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
}

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [newChat, setNewChat] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(null);

  const loadChats = useCallback(async () => {
    try {
      setChats(await api.chatList());
    } catch {
      /* молча — это фоновый опрос */
    }
  }, []);

  const loadMessages = useCallback(async (uid: number) => {
    try {
      const data = await api.chatMessages(uid);
      if (activeIdRef.current === uid) {
        setActiveUser(data.user);
        setMessages(data.messages);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Список чатов: загрузка + опрос раз в 3 сек.
  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 3000);
    return () => clearInterval(t);
  }, [loadChats]);

  // Сообщения активного чата: загрузка + опрос раз в 3 сек.
  useEffect(() => {
    activeIdRef.current = activeUserId;
    if (activeUserId == null) return;
    setLoading(true);
    loadMessages(activeUserId).finally(() => {
      if (activeIdRef.current === activeUserId) setLoading(false);
    });
    const t = setInterval(() => loadMessages(activeUserId), 3000);
    return () => clearInterval(t);
  }, [activeUserId, loadMessages]);

  // Прокрутка к последнему сообщению.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeUserId]);

  function openChat(user: ChatUser) {
    setActiveUserId(user.id);
    setActiveUser(user);
    setMessages([]);
    setMobilePane('chat');
    setNewChat(false);
    setSearchQ('');
    setResults([]);
  }

  async function onSearch(q: string) {
    setSearchQ(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setResults(await api.searchUsers(q.trim()));
    } catch {
      setResults([]);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || activeUserId == null || sending) return;
    setSending(true);
    try {
      const msg = await api.chatSend(activeUserId, text);
      setMessages((prev) => [...prev, msg]);
      setInput('');
      loadChats();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`chats-page ${mobilePane === 'chat' ? 'chats-page--chat' : ''}`}>
      <aside className="chats-list">
        <div className="chats-list-head">
          <span className="chats-title">{newChat ? 'Новый чат' : 'Сообщения'}</span>
          <button
            className="chats-new"
            type="button"
            onClick={() => {
              setNewChat((v) => !v);
              setSearchQ('');
              setResults([]);
            }}
            aria-label={newChat ? 'Закрыть' : 'Новый чат'}
          >
            {newChat ? '×' : '+'}
          </button>
        </div>

        {newChat ? (
          <>
            <div className="chats-search">
              <input
                placeholder="🔍 Найти по нику или имени…"
                value={searchQ}
                onChange={(e) => onSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="chats-items">
              {searchQ.trim().length < 2 && (
                <div className="chats-empty">Введи минимум 2 символа</div>
              )}
              {searchQ.trim().length >= 2 && results.length === 0 && (
                <div className="chats-empty">Никого не нашлось</div>
              )}
              {results.map((u) => (
                <button key={u.id} type="button" className="chat-item" onClick={() => openChat(u)}>
                  <span className="chat-av" style={avatarStyle(u)}>
                    {u.avatar ? '' : u.letter}
                  </span>
                  <span className="chat-item-mid">
                    <span className="chat-item-name">{u.name}</span>
                    <span className="chat-item-last">@{u.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="chats-items">
            {chats.length === 0 && (
              <div className="chats-empty">
                Пока нет переписок.
                <br />
                Нажми «+», чтобы начать чат.
              </div>
            )}
            {chats.map((c) => (
              <button
                key={c.user.id}
                type="button"
                className={`chat-item ${c.user.id === activeUserId ? 'chat-item--active' : ''}`}
                onClick={() => openChat(c.user)}
              >
                <span className="chat-av" style={avatarStyle(c.user)}>
                  {c.user.avatar ? '' : c.user.letter}
                </span>
                <span className="chat-item-mid">
                  <span className="chat-item-name">{c.user.name}</span>
                  <span className="chat-item-last">
                    {c.last ? (c.last.fromMe ? 'Вы: ' : '') + c.last.text : 'Нет сообщений'}
                  </span>
                </span>
                <span className="chat-item-right">
                  <span className="chat-item-time">{timeShort(c.last?.createdAt)}</span>
                  {c.unread ? <span className="chat-unread">{c.unread}</span> : null}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="chat-view">
        {activeUser ? (
          <>
            <header className="chat-view-head">
              <button
                className="chat-back"
                type="button"
                onClick={() => setMobilePane('list')}
                aria-label="Назад к чатам"
              >
                ‹
              </button>
              <span className="chat-av chat-av--sm" style={avatarStyle(activeUser)}>
                {activeUser.avatar ? '' : activeUser.letter}
              </span>
              <span className="chat-view-id">
                <span className="chat-view-name">{activeUser.name}</span>
                <span className="chat-view-status">@{activeUser.handle}</span>
              </span>
            </header>

            <div className="chat-messages">
              {loading && messages.length === 0 && <div className="chats-empty">Загрузка…</div>}
              {!loading && messages.length === 0 && (
                <div className="chats-empty">Сообщений пока нет — напиши первым 👋</div>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                return (
                  <div key={m.id}>
                    {showDay && <div className="chat-day">{dayLabel(m.createdAt)}</div>}
                    <div className={`chat-msg chat-msg--${m.fromMe ? 'me' : 'them'}`}>
                      <div className="chat-bubble">{m.text}</div>
                      <div className="chat-msg-time">{timeShort(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="chat-input">
              <input
                placeholder="Сообщение..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button className="chat-send" type="button" onClick={send} disabled={sending || !input.trim()}>
                ➤
              </button>
            </div>
          </>
        ) : (
          <div className="chat-empty-view">Выбери чат или начни новый кнопкой «+»</div>
        )}
      </section>
    </div>
  );
}
