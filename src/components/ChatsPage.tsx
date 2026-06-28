import { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  type ChatListItem,
  type ChatMessageItem,
  type ChatUser,
  type GroupListItem,
  type GroupInfo,
  type GroupMessageItem,
} from '../utils/api';
import { useI18n } from '../i18n';
import GroupSettings from './GroupSettings';
import CreateGroup from './CreateGroup';

// Сообщение может быть из личного чата или из группы (у группового есть автор).
type AnyMsg = ChatMessageItem | GroupMessageItem;

// Короткое время: сегодня — часы:минуты, иначе — дата.
function timeShort(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toDateString();
}
function dayLabel(
  iso: string,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return todayLabel;
  if (d.toDateString() === yest.toDateString()) return yesterdayLabel;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

function avatarStyle(u: { avatar: string; color: string }) {
  return u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
}

interface ChatsPageProps {
  onActiveChatChange?: (userId: number | null) => void;
  meName?: string; // имя текущего пользователя — для пометки «Переслано от …»
  meId?: number; // id текущего пользователя — для групп (владелец, «вы»)
  openWith?: ChatUser | null; // открыть диалог с этим пользователем (например, из «Друзей»)
  onOpenedWith?: () => void; // сообщить, что openWith обработан
  onOpenProfile?: (id: number) => void; // клик по нику собеседника → его профиль
  onRead?: () => void; // прочитали чат (пометили на сервере) — обновить общий счётчик
}

export default function ChatsPage({
  onActiveChatChange,
  meName = '',
  meId,
  openWith = null,
  onOpenedWith,
  onOpenProfile,
  onRead,
}: ChatsPageProps) {
  const { t, locale } = useI18n();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [newChat, setNewChat] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);

  // Действия с сообщениями
  const [menuMsg, setMenuMsg] = useState<AnyMsg | null>(null); // открытое меню действий
  const [replyTo, setReplyTo] = useState<AnyMsg | null>(null); // на что отвечаем
  const [editing, setEditing] = useState<AnyMsg | null>(null); // что редактируем
  const [forwarding, setForwarding] = useState<AnyMsg | null>(null); // что пересылаем
  const [toast, setToast] = useState('');

  // Группы
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false); // панель настроек группы
  const [creating, setCreating] = useState(false); // окно «создать группу»
  const activeGroupRef = useRef<number | null>(null);
  const isGroup = activeGroup != null;

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeIdRef = useRef<number | null>(null);

  const loadChats = useCallback(async () => {
    // Грузим личные чаты и группы НЕЗАВИСИМО: если один запрос упадёт (например,
    // старый бэкенд без групп), второй всё равно покажется — раньше Promise.all
    // ронял оба, и список выглядел пустым, хотя переписки есть.
    const [c, g] = await Promise.allSettled([api.chatList(), api.groupList()]);
    if (c.status === 'fulfilled') setChats(c.value);
    if (g.status === 'fulfilled') setGroups(g.value);
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

  // Загрузка сообщений группы (и обновление инфо: название, число участников).
  const loadGroupMessages = useCallback(async (gid: number) => {
    try {
      const data = await api.groupMessages(gid);
      if (activeGroupRef.current === gid) {
        setActiveGroup(data.group);
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
      // Сервер пометил входящие прочитанными — сразу обновляем список и общий счётчик.
      loadChats();
      onRead?.();
    });
    const t = setInterval(() => loadMessages(activeUserId), 1500);
    return () => clearInterval(t);
  }, [activeUserId, loadMessages, loadChats, onRead]);

  // Сообщения активной группы: загрузка + опрос.
  useEffect(() => {
    activeGroupRef.current = activeGroup?.id ?? null;
    const gid = activeGroup?.id;
    if (gid == null) return;
    setLoading(true);
    loadGroupMessages(gid).finally(() => {
      if (activeGroupRef.current === gid) setLoading(false);
      // Группу тоже пометили прочитанной — обновляем список и общий счётчик.
      loadChats();
      onRead?.();
    });
    const tm = setInterval(() => loadGroupMessages(gid), 1500);
    return () => clearInterval(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id, loadGroupMessages]);

  // Прокрутка к последнему сообщению.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeUserId]);

  // Открыли диалог — сразу ставим курсор в поле ввода, чтобы можно было печатать
  // не нажимая на него отдельно. На мобиле фокус ещё и поднимает клавиатуру.
  useEffect(() => {
    if (activeUserId == null) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [activeUserId]);

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

  // Открыть конкретный диалог снаружи (например, кнопка «Написать» у друга).
  useEffect(() => {
    if (openWith) {
      openChat(openWith);
      onOpenedWith?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWith?.id]);

  function openChat(user: ChatUser) {
    setActiveGroup(null);
    activeGroupRef.current = null;
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

  function openGroup(g: GroupInfo) {
    setActiveUserId(null);
    activeIdRef.current = null;
    setActiveUser(null);
    setActiveGroup(g);
    setMessages([]);
    setMobilePane('chat');
    setNewChat(false);
    setSearchQ('');
    setResults([]);
    setReplyTo(null);
    setEditing(null);
    setInput('');
    setShowSettings(false);
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
    if (!text || sending || (activeUserId == null && !activeGroup)) return;
    setSending(true);
    try {
      if (editing) {
        const updated = isGroup
          ? await api.groupEditMessage(editing.id, text)
          : await api.chatEditMessage(editing.id, text);
        setMessages((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
        setEditing(null);
      } else {
        const opts = replyTo ? { replyTo: replyTo.id } : {};
        const msg = isGroup
          ? await api.groupSend(activeGroup!.id, text, opts)
          : await api.chatSend(activeUserId!, text, opts);
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
  function startReply(m: AnyMsg) {
    setEditing(null);
    setReplyTo(m);
    setMenuMsg(null);
    inputRef.current?.focus();
  }
  function startEdit(m: AnyMsg) {
    setReplyTo(null);
    setEditing(m);
    setInput(m.text);
    setMenuMsg(null);
    inputRef.current?.focus();
  }
  async function copyMsg(m: AnyMsg) {
    setMenuMsg(null);
    try {
      await navigator.clipboard.writeText(m.text);
      setToast(t('chats.copied'));
    } catch {
      setToast(t('chats.copyFail'));
    }
  }
  async function deleteMsg(m: AnyMsg) {
    setMenuMsg(null);
    if (!window.confirm(t('chats.deleteConfirm'))) return;
    try {
      if (isGroup) await api.groupDeleteMessage(m.id);
      else await api.chatDeleteMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (replyTo?.id === m.id) setReplyTo(null);
      if (editing?.id === m.id) {
        setEditing(null);
        setInput('');
      }
      loadChats();
    } catch {
      setToast(t('chats.deleteFail'));
    }
  }
  // Пересылка: открываем выбор чата, затем отправляем туда текст с пометкой автора.
  async function forwardTo(target: ChatUser) {
    if (!forwarding) return;
    const author = forwarding.fromMe
      ? meName
      : activeUser?.name || (forwarding as GroupMessageItem).sender?.name || '';
    try {
      await api.chatSend(target.id, forwarding.text, { forwardedFrom: author });
      setForwarding(null);
      openChat(target);
    } catch {
      setToast(t('chats.forwardFail'));
    }
  }

  function cancelEditReply() {
    setEditing(null);
    setReplyTo(null);
    setInput('');
  }

  // Единый список: личные чаты + группы, по времени последнего сообщения.
  const conversations = [
    ...chats.map((c) => ({ kind: 'dm' as const, sortAt: c.last?.createdAt || '', dm: c })),
    ...groups.map((g) => ({ kind: 'group' as const, sortAt: g.last?.createdAt || '', group: g })),
  ].sort((a, b) => b.sortAt.localeCompare(a.sortAt));

  // После изменений группы обновляем состояние. stillOpen=false — мы вышли/удалили
  // группу: закрываем настройки и сам чат. Иначе (добавили/удалили участника,
  // переименовали) — настройки оставляем открытыми, только обновляем данные.
  function afterGroupChange(stillOpen: boolean) {
    loadChats();
    if (!stillOpen) {
      setShowSettings(false);
      setActiveGroup(null);
      activeGroupRef.current = null;
      setMobilePane('list');
    } else if (activeGroup) {
      loadGroupMessages(activeGroup.id);
    }
  }

  return (
    <div className={`chats-page ${mobilePane === 'chat' ? 'chats-page--chat' : ''}`}>
      <aside className="chats-list">
        <div className="chats-list-head">
          <span className="chats-title">{newChat ? t('chats.newChat') : t('chats.messages')}</span>
          <button
            className="chats-new"
            type="button"
            onClick={() => {
              setNewChat((v) => !v);
              setSearchQ('');
              setResults([]);
            }}
            aria-label={newChat ? t('common.close') : t('chats.newChat')}
          >
            {newChat ? '×' : '+'}
          </button>
        </div>

        {newChat ? (
          <>
            <button
              type="button"
              className="chats-create-group"
              onClick={() => {
                setCreating(true);
                setNewChat(false);
              }}
            >
              <span className="chats-create-group-ic">👥</span> Создать группу
            </button>
            <div className="chats-search">
              <input
                placeholder={t('chats.searchPh')}
                value={searchQ}
                onChange={(e) => onSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="chats-items">
              {searchQ.trim().length < 1 && <div className="chats-empty">{t('chats.enterQuery')}</div>}
              {searchQ.trim().length >= 1 && results.length === 0 && (
                <div className="chats-empty">{t('chats.noneFound')}</div>
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
            {conversations.length === 0 && (
              <div className="chats-empty">
                {t('chats.empty')}
                <br />
                {t('chats.tapPlus')}
              </div>
            )}
            {conversations.map((it) =>
              it.kind === 'dm' ? (
                <button
                  key={`dm-${it.dm.user.id}`}
                  type="button"
                  className={`chat-item ${it.dm.user.id === activeUserId ? 'chat-item--active' : ''}`}
                  onClick={() => openChat(it.dm.user)}
                >
                  <span className="chat-av" style={avatarStyle(it.dm.user)}>
                    {it.dm.user.avatar ? '' : it.dm.user.letter}
                    {it.dm.user.online && <span className="chat-online-dot" />}
                  </span>
                  <span className="chat-item-mid">
                    <span className="chat-item-name">{it.dm.user.name}</span>
                    <span className="chat-item-last">
                      {it.dm.last
                        ? (it.dm.last.fromMe ? t('chats.you') : '') + it.dm.last.text
                        : t('chats.noMessages')}
                    </span>
                  </span>
                  <span className="chat-item-right">
                    <span className="chat-item-time">{timeShort(it.dm.last?.createdAt, locale)}</span>
                    {it.dm.unread ? <span className="chat-unread">{it.dm.unread}</span> : null}
                  </span>
                </button>
              ) : (
                <button
                  key={`g-${it.group.id}`}
                  type="button"
                  className={`chat-item ${it.group.id === activeGroup?.id ? 'chat-item--active' : ''}`}
                  onClick={() => openGroup(it.group)}
                >
                  <span className="chat-av chat-av--group" style={{ background: it.group.color }}>
                    {it.group.letter}
                    <span className="chat-group-count" title="участников">{it.group.memberCount}</span>
                  </span>
                  <span className="chat-item-mid">
                    <span className="chat-item-name">{it.group.name}</span>
                    <span className="chat-item-last">
                      {it.group.last
                        ? (it.group.last.fromMe ? t('chats.you') : it.group.last.author + ': ') + it.group.last.text
                        : `${it.group.memberCount} участников`}
                    </span>
                  </span>
                  <span className="chat-item-right">
                    <span className="chat-item-time">{timeShort(it.group.last?.createdAt, locale)}</span>
                    {it.group.unread ? <span className="chat-unread">{it.group.unread}</span> : null}
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </aside>

      <section className="chat-view">
        {activeUser || activeGroup ? (
          <>
            <header className="chat-view-head">
              <button
                className="chat-back"
                type="button"
                onClick={() => setMobilePane('list')}
                aria-label={t('chats.back')}
              >
                ‹
              </button>
              {activeGroup ? (
                <>
                  <span className="chat-av chat-av--sm chat-av--group" style={{ background: activeGroup.color }}>
                    {activeGroup.letter}
                  </span>
                  <button
                    type="button"
                    className="chat-view-id chat-view-id--btn"
                    onClick={() => setShowSettings(true)}
                    title="Настройки группы"
                  >
                    <span className="chat-view-name">{activeGroup.name}</span>
                    <span className="chat-view-status">{activeGroup.memberCount} участников</span>
                  </button>
                  <button
                    type="button"
                    className="chat-group-gear"
                    onClick={() => setShowSettings(true)}
                    aria-label="Настройки группы"
                  >
                    ⋯
                  </button>
                </>
              ) : activeUser ? (
                <>
                  <span className="chat-av chat-av--sm" style={avatarStyle(activeUser)}>
                    {activeUser.avatar ? '' : activeUser.letter}
                    {activeUser.online && <span className="chat-online-dot" />}
                  </span>
                  <button
                    type="button"
                    className="chat-view-id chat-view-id--btn"
                    onClick={() => onOpenProfile?.(activeUser.id)}
                    title={t('chats.openProfile')}
                  >
                    <span className="chat-view-name">{activeUser.name}</span>
                    <span className={`chat-view-status${activeUser.online ? ' chat-view-status--online' : ''}`}>
                      {activeUser.online ? t('common.online') : `@${activeUser.handle}`}
                    </span>
                  </button>
                </>
              ) : null}
            </header>

            <div className="chat-messages">
              {loading && messages.length === 0 && <div className="chats-empty">{t('common.loading')}</div>}
              {!loading && messages.length === 0 && (
                <div className="chats-empty">{t('chats.firstMessage')}</div>
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
                    {showDay && (
                      <div className="chat-day">
                        {dayLabel(m.createdAt, locale, t('chats.today'), t('chats.yesterday'))}
                      </div>
                    )}
                    <div
                      className={`chat-msg chat-msg--${m.fromMe ? 'me' : 'them'}${sameAsPrev ? ' chat-msg--grouped' : ''}`}
                    >
                      <button
                        type="button"
                        className="chat-bubble"
                        onClick={() => setMenuMsg(m)}
                        title={t('chats.msgActions')}
                      >
                        {isGroup && !m.fromMe && !sameAsPrev && (m as GroupMessageItem).sender && (
                          <span className="chat-sender" style={{ color: (m as GroupMessageItem).sender!.color }}>
                            {(m as GroupMessageItem).sender!.name}
                          </span>
                        )}
                        {m.forwardedFrom && (
                          <span className="chat-fwd">{t('chats.fwdFrom', { name: m.forwardedFrom })}</span>
                        )}
                        {m.replyTo && (
                          <span className="chat-quote">
                            <span className="chat-quote-author">
                              {m.replyTo.fromMe
                                ? t('chats.youShort')
                                : (isGroup ? (m.replyTo as { author?: string }).author : activeUser?.name) || ''}
                            </span>
                            <span className="chat-quote-text">{m.replyTo.text}</span>
                          </span>
                        )}
                        <span className="chat-bubble-text">{m.text}</span>
                      </button>
                      {!sameAsNext && (
                        <div className="chat-msg-time">
                          {m.edited && <span className="chat-edited">{t('chats.edited')}</span>}
                          {timeShort(m.createdAt, locale)}
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
                    {editing
                      ? t('chats.editing')
                      : t('chats.replyTo', {
                          name: replyTo!.fromMe
                            ? t('chats.replySelf')
                            : (isGroup ? (replyTo as GroupMessageItem).sender?.name : activeUser?.name) || '',
                        })}
                  </span>
                  <span className="chat-compose-text">{(editing || replyTo)!.text}</span>
                </span>
                <button className="chat-compose-x" type="button" onClick={cancelEditReply} aria-label={t('common.cancel')}>
                  ×
                </button>
              </div>
            )}

            <div className="chat-input">
              <input
                ref={inputRef}
                placeholder={editing ? t('chats.editPh') : t('chats.messagePh')}
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
                aria-label={editing ? t('common.save') : t('common.message')}
              >
                {editing ? '✓' : '➤'}
              </button>
            </div>
          </>
        ) : (
          <div className="chat-empty-view">{t('chats.pickChat')}</div>
        )}
      </section>

      {/* Меню действий с сообщением */}
      {menuMsg && (
        <>
          <div className="msg-menu-backdrop" onClick={() => setMenuMsg(null)} />
          <div className="msg-menu" role="menu">
            <div className="msg-menu-preview">{menuMsg.text}</div>
            <button type="button" className="msg-menu-item" onClick={() => startReply(menuMsg)}>
              <span className="msg-menu-ic">↩</span> {t('chats.reply')}
            </button>
            <button type="button" className="msg-menu-item" onClick={() => copyMsg(menuMsg)}>
              <span className="msg-menu-ic">⧉</span> {t('chats.copy')}
            </button>
            <button type="button" className="msg-menu-item" onClick={() => { setForwarding(menuMsg); setMenuMsg(null); }}>
              <span className="msg-menu-ic">↪</span> {t('chats.forward')}
            </button>
            {menuMsg.fromMe && (
              <button type="button" className="msg-menu-item" onClick={() => startEdit(menuMsg)}>
                <span className="msg-menu-ic">✎</span> {t('chats.edit')}
              </button>
            )}
            {menuMsg.fromMe && (
              <button type="button" className="msg-menu-item msg-menu-item--danger" onClick={() => deleteMsg(menuMsg)}>
                <span className="msg-menu-ic">🗑</span> {t('chats.delete')}
              </button>
            )}
            <button type="button" className="msg-menu-cancel" onClick={() => setMenuMsg(null)}>
              {t('common.cancel')}
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
              <span>{t('chats.forwardTitle')}</span>
              <button type="button" onClick={() => setForwarding(null)} aria-label={t('common.close')}>×</button>
            </div>
            <div className="fwd-picker-preview">«{forwarding.text}»</div>
            <div className="fwd-picker-list">
              {chats.length === 0 && <div className="chats-empty">{t('chats.noChats')}</div>}
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

      {/* Настройки группы */}
      {showSettings && activeGroup && (
        <GroupSettings
          group={activeGroup}
          meId={meId}
          onClose={() => setShowSettings(false)}
          onChanged={afterGroupChange}
          onOpenProfile={onOpenProfile}
          onToast={setToast}
        />
      )}

      {/* Создание группы */}
      {creating && (
        <CreateGroup
          onClose={() => setCreating(false)}
          onCreated={(g) => {
            setCreating(false);
            loadChats();
            openGroup(g);
          }}
        />
      )}

      {toast && <div className="chat-mini-toast">{toast}</div>}
    </div>
  );
}
