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

interface ChatsPageProps {
  onActiveChatChange?: (userId: number | null) => void;
  meName?: string; // имя текущего пользователя — для пометки «Переслано от …»
}

export default function ChatsPage({ onActiveChatChange, meName = '' }: ChatsPageProps) {
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

  // Действия с сообщениями
  const [menuMsg, setMenuMsg] = useState<ChatMessageItem | null>(null); // открытое меню действий
  const [replyTo, setReplyTo] = useState<ChatMessageItem | null>(null); // на что отвечаем
  const [editing, setEditing] = useState<ChatMessageItem | null>(null); // что редактируем
  const [forwarding, setForwarding] = useState<ChatMessageItem | null>(null); // что пересылаем
  const [toast, setToast] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Список чатов: загрузка + опрос раз в 2.5 сек.
  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 2500);
    return () => clearInterval(t);
  }, [loadChats]);

  // Сообщения активного чата: загрузка + опрос. Во время правки/ответа не дёргаем,
  // чтобы опрос не перетирал то, что пользователь сейчас делает.
  useEffect(() => {
    activeIdRef.current = activeUserId;
    if (activeUserId == null) return;
    setLoading(true);
    loadMessages(activeUserId).finally(() => {
      if (activeIdRef.current === activeUserId) setLoading(false);
    });
    const t = setInterval(() => loadMessages(activeUserId), 1500);
    return () => clearInterval(t);
  }, [activeUserId, loadMessages]);

  // Прокрутка к последнему сообщению.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeUserId]);

  // Сообщаем приложению, какой чат открыт — чтобы по нему не показывать всплывашку.
  useEffect(() => {
    onActiveChatChange?.(activeUserId);
    return () => onActiveChatChange?.(null);
  }, [activeUserId, onActiveChatChange]);

  // Короткое уведомление («Скопировано» и т.п.) — само прячется.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  function openChat(user: ChatUser) {
    setActiveUserId(user.id);
    setActiveUser(user);
    setMessages([]);
    setMobilePane('chat');
    setNewChat(false);
    setSearchQ('');
    setResults([]);
    setReplyTo(null);
    setEditing(null);
    setInput('');
  }

  async function onSearch(q: string) {
    setSearchQ(q);
    if (q.trim().length < 1) {
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
      if (editing) {
        const updated = await api.chatEditMessage(editing.id, text);
        setMessages((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
        setEditing(null);
      } else {
        const msg = await api.chatSend(activeUserId, text, replyTo ? { replyTo: replyTo.id } : {});
        setMessages((prev) => [...prev, msg]);
        setReplyTo(null);
      }
      setInput('');
      loadChats();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  // --- Действия из меню ---
  function startReply(m: ChatMessageItem) {
    setEditing(null);
    setReplyTo(m);
    setMenuMsg(null);
    inputRef.current?.focus();
  }
  function startEdit(m: ChatMessageItem) {
    setReplyTo(null);
    setEditing(m);
    setInput(m.text);
    setMenuMsg(null);
    inputRef.current?.focus();
  }
  async function copyMsg(m: ChatMessageItem) {
    setMenuMsg(null);
    try {
      await navigator.clipboard.writeText(m.text);
      setToast('Скопировано');
    } catch {
      setToast('Не удалось скопировать');
    }
  }
  async function deleteMsg(m: ChatMessageItem) {
    setMenuMsg(null);
    if (!window.confirm('Удалить сообщение? Действие необратимо.')) return;
    try {
      await api.chatDeleteMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (replyTo?.id === m.id) setReplyTo(null);
      if (editing?.id === m.id) {
        setEditing(null);
        setInput('');
      }
      loadChats();
    } catch {
      setToast('Не удалось удалить');
    }
  }
  // Пересылка: открываем выбор чата, затем отправляем туда текст с пометкой автора.
  async function forwardTo(target: ChatUser) {
    if (!forwarding) return;
    const author = forwarding.fromMe ? meName : activeUser?.name || '';
    try {
      await api.chatSend(target.id, forwarding.text, { forwardedFrom: author });
      setForwarding(null);
      openChat(target);
    } catch {
      setToast('Не удалось переслать');
    }
  }

  function cancelEditReply() {
    setEditing(null);
    setReplyTo(null);
    setInput('');
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
                placeholder="🔍 Ник, имя или ID…"
                value={searchQ}
                onChange={(e) => onSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="chats-items">
              {searchQ.trim().length < 1 && <div className="chats-empty">Введи ник, имя или ID</div>}
              {searchQ.trim().length >= 1 && results.length === 0 && (
                <div className="chats-empty">Никого не нашлось</div>
              )}
              {results.map((u) => (
                <button key={u.id} type="button" className="chat-item" onClick={() => openChat(u)}>
                  <span className="chat-av" style={avatarStyle(u)}>
                    {u.avatar ? '' : u.letter}
                    {u.online && <span className="chat-online-dot" />}
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
                  {c.user.online && <span className="chat-online-dot" />}
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
                {activeUser.online && <span className="chat-online-dot" />}
              </span>
              <span className="chat-view-id">
                <span className="chat-view-name">{activeUser.name}</span>
                <span className={`chat-view-status${activeUser.online ? ' chat-view-status--online' : ''}`}>
                  {activeUser.online ? 'в сети' : `@${activeUser.handle}`}
                </span>
              </span>
            </header>

            <div className="chat-messages">
              {loading && messages.length === 0 && <div className="chats-empty">Загрузка…</div>}
              {!loading && messages.length === 0 && (
                <div className="chats-empty">Сообщений пока нет — напиши первым 👋</div>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                const sameAsPrev = !showDay && !!prev && prev.fromMe === m.fromMe;
                const sameAsNext =
                  !!next && next.fromMe === m.fromMe && dayKey(next.createdAt) === dayKey(m.createdAt);
                return (
                  <div key={m.id}>
                    {showDay && <div className="chat-day">{dayLabel(m.createdAt)}</div>}
                    <div
                      className={`chat-msg chat-msg--${m.fromMe ? 'me' : 'them'}${sameAsPrev ? ' chat-msg--grouped' : ''}`}
                    >
                      <button
                        type="button"
                        className="chat-bubble"
                        onClick={() => setMenuMsg(m)}
                        title="Действия с сообщением"
                      >
                        {m.forwardedFrom && (
                          <span className="chat-fwd">↪ Переслано от {m.forwardedFrom}</span>
                        )}
                        {m.replyTo && (
                          <span className="chat-quote">
                            <span className="chat-quote-author">{m.replyTo.fromMe ? 'Вы' : activeUser.name}</span>
                            <span className="chat-quote-text">{m.replyTo.text}</span>
                          </span>
                        )}
                        <span className="chat-bubble-text">{m.text}</span>
                      </button>
                      {!sameAsNext && (
                        <div className="chat-msg-time">
                          {m.edited && <span className="chat-edited">изменено</span>}
                          {timeShort(m.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Баннер ответа / редактирования над полем ввода */}
            {(replyTo || editing) && (
              <div className="chat-compose-banner">
                <span className="chat-compose-ic">{editing ? '✎' : '↩'}</span>
                <span className="chat-compose-body">
                  <span className="chat-compose-title">
                    {editing ? 'Редактирование' : `Ответ ${replyTo!.fromMe ? 'себе' : activeUser.name}`}
                  </span>
                  <span className="chat-compose-text">{(editing || replyTo)!.text}</span>
                </span>
                <button className="chat-compose-x" type="button" onClick={cancelEditReply} aria-label="Отмена">
                  ×
                </button>
              </div>
            )}

            <div className="chat-input">
              <input
                ref={inputRef}
                placeholder={editing ? 'Изменить сообщение…' : 'Сообщение...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                  if (e.key === 'Escape') cancelEditReply();
                }}
              />
              <button
                className="chat-send"
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label={editing ? 'Сохранить' : 'Отправить'}
              >
                {editing ? '✓' : '➤'}
              </button>
            </div>
          </>
        ) : (
          <div className="chat-empty-view">Выбери чат или начни новый кнопкой «+»</div>
        )}
      </section>

      {/* Меню действий с сообщением */}
      {menuMsg && (
        <>
          <div className="msg-menu-backdrop" onClick={() => setMenuMsg(null)} />
          <div className="msg-menu" role="menu">
            <div className="msg-menu-preview">{menuMsg.text}</div>
            <button type="button" className="msg-menu-item" onClick={() => startReply(menuMsg)}>
              <span className="msg-menu-ic">↩</span> Ответить
            </button>
            <button type="button" className="msg-menu-item" onClick={() => copyMsg(menuMsg)}>
              <span className="msg-menu-ic">⧉</span> Копировать
            </button>
            <button type="button" className="msg-menu-item" onClick={() => { setForwarding(menuMsg); setMenuMsg(null); }}>
              <span className="msg-menu-ic">↪</span> Переслать
            </button>
            {menuMsg.fromMe && (
              <button type="button" className="msg-menu-item" onClick={() => startEdit(menuMsg)}>
                <span className="msg-menu-ic">✎</span> Изменить
              </button>
            )}
            {menuMsg.fromMe && (
              <button type="button" className="msg-menu-item msg-menu-item--danger" onClick={() => deleteMsg(menuMsg)}>
                <span className="msg-menu-ic">🗑</span> Удалить
              </button>
            )}
            <button type="button" className="msg-menu-cancel" onClick={() => setMenuMsg(null)}>
              Отмена
            </button>
          </div>
        </>
      )}

      {/* Выбор чата для пересылки */}
      {forwarding && (
        <>
          <div className="msg-menu-backdrop" onClick={() => setForwarding(null)} />
          <div className="fwd-picker">
            <div className="fwd-picker-head">
              <span>Переслать в чат</span>
              <button type="button" onClick={() => setForwarding(null)} aria-label="Закрыть">×</button>
            </div>
            <div className="fwd-picker-preview">«{forwarding.text}»</div>
            <div className="fwd-picker-list">
              {chats.length === 0 && <div className="chats-empty">Нет доступных чатов</div>}
              {chats.map((c) => (
                <button key={c.user.id} type="button" className="chat-item" onClick={() => forwardTo(c.user)}>
                  <span className="chat-av chat-av--sm" style={avatarStyle(c.user)}>
                    {c.user.avatar ? '' : c.user.letter}
                  </span>
                  <span className="chat-item-mid">
                    <span className="chat-item-name">{c.user.name}</span>
                    <span className="chat-item-last">@{c.user.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {toast && <div className="chat-mini-toast">{toast}</div>}
    </div>
  );
}
