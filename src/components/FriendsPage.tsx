import { useCallback, useEffect, useState } from 'react';
import { api, type ChatUser } from '../utils/api';
import { Icon } from './Icon';
import { useI18n } from '../i18n';

function avatarStyle(u: { avatar: string; color: string }) {
  return u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
}

function Avatar({ u }: { u: ChatUser }) {
  return (
    <span className="fr-av" style={avatarStyle(u)}>
      {u.avatar ? '' : u.letter}
      {u.online && <span className="fr-online-dot" />}
    </span>
  );
}

type Tab = 'all' | 'requests';

export default function FriendsPage({
  onMessage,
  onOpenProfile,
}: {
  onMessage: (u: ChatUser) => void;
  onOpenProfile: (id: number) => void;
}) {
  const { t } = useI18n();
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [incoming, setIncoming] = useState<ChatUser[]>([]);
  const [outgoing, setOutgoing] = useState<ChatUser[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [adding, setAdding] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await api.friends();
      setFriends(data.friends);
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    } catch {
      /* фоновый опрос — молча */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function onSearch(q: string) {
    setSearchQ(q);
    const t = q.trim().replace(/^@+/, '');
    if (t.length < 1) {
      setResults([]);
      return;
    }
    try {
      setResults(await api.searchUsers(t));
    } catch {
      setResults([]);
    }
  }

  function relationOf(id: number): 'friends' | 'outgoing' | 'incoming' | 'none' {
    if (friends.some((u) => u.id === id)) return 'friends';
    if (outgoing.some((u) => u.id === id)) return 'outgoing';
    if (incoming.some((u) => u.id === id)) return 'incoming';
    return 'none';
  }

  const add = async (u: ChatUser) => {
    try {
      await api.addFriend(u.id);
      await load();
    } catch {
      /* ignore */
    }
  };
  const accept = async (u: ChatUser) => {
    try {
      await api.acceptFriend(u.id);
      await load();
    } catch {
      /* ignore */
    }
  };
  const remove = async (u: ChatUser) => {
    try {
      await api.removeFriend(u.id);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="page-scroll">
      <div className="friends-page">
        <div className="fr-head">
          <span className="fr-title">{t('friends.title')}</span>
          <button
            className="fr-add"
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setSearchQ('');
              setResults([]);
            }}
          >
            {adding ? t('friends.close') : t('friends.add')}
          </button>
        </div>

        {adding ? (
          <>
            <div className="fr-search">
              <input
                placeholder={t('chats.searchPh')}
                value={searchQ}
                onChange={(e) => onSearch(e.target.value)}
                autoFocus
              />
            </div>
            {searchQ.trim().length >= 1 && results.length === 0 && (
              <div className="fr-empty">{t('friends.noneFound')}</div>
            )}
            {results.map((u) => {
              const rel = relationOf(u.id);
              return (
                <div className="fr-row" key={u.id}>
                  <Avatar u={u} />
                  <span className="fr-row-mid">
                    <span className="fr-row-name">{u.name}</span>
                    <span className="fr-row-sub">
                      @{u.handle} · #{String(u.id).padStart(5, '0')}
                    </span>
                  </span>
                  <span className="fr-row-actions">
                    {rel === 'friends' && <span className="fr-tag">{t('friends.inFriends')}</span>}
                    {rel === 'outgoing' && <span className="fr-tag">{t('friends.requestSent')}</span>}
                    {rel === 'incoming' && (
                      <button className="fr-add-btn" onClick={() => accept(u)}>
                        {t('friends.accept')}
                      </button>
                    )}
                    {rel === 'none' && (
                      <button className="fr-add-btn" onClick={() => add(u)}>
                        {t('friends.addFriend')}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="fr-tabs">
              <button
                className={`fr-tab ${tab === 'all' ? 'fr-tab--active' : ''}`}
                onClick={() => setTab('all')}
              >
                {t('friends.tabAll', { n: friends.length })}
              </button>
              <button
                className={`fr-tab ${tab === 'requests' ? 'fr-tab--active' : ''}`}
                onClick={() => setTab('requests')}
              >
                {t('friends.tabReq', { n: incoming.length })}
              </button>
            </div>

            {tab === 'all' && (
              <>
                {friends.length === 0 && (
                  <div className="fr-empty">{t('friends.emptyAll')}</div>
                )}
                {friends.map((u) => (
                  <div className="fr-row" key={u.id}>
                    <Avatar u={u} />
                    <button
                      className="fr-row-mid fr-row-mid--btn"
                      onClick={() => onOpenProfile(u.id)}
                      title="Открыть профиль"
                    >
                      <span className="fr-row-name">{u.name}</span>
                      <span className="fr-row-sub">@{u.handle}</span>
                    </button>
                    <span className="fr-row-actions">
                      <button className="fr-act" title={t('friends.write')} onClick={() => onMessage(u)}>
                        <Icon name="chat" />
                      </button>
                      <button
                        className="fr-act fr-act--danger"
                        title={t('friends.removeFriend')}
                        onClick={() => remove(u)}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}

            {tab === 'requests' && (
              <>
                <div className="fr-group-label">{t('friends.incoming')}</div>
                {incoming.length === 0 && <div className="fr-empty">{t('friends.noIncoming')}</div>}
                {incoming.map((u) => (
                  <div className="fr-row" key={u.id}>
                    <Avatar u={u} />
                    <span className="fr-row-mid">
                      <span className="fr-row-name">{u.name}</span>
                      <span className="fr-row-sub">@{u.handle}</span>
                    </span>
                    <span className="fr-req-actions">
                      <button className="fr-req-accept" title={t('friends.accept')} onClick={() => accept(u)}>
                        ✓
                      </button>
                      <button className="fr-req-decline" title={t('friends.decline')} onClick={() => remove(u)}>
                        ×
                      </button>
                    </span>
                  </div>
                ))}

                {outgoing.length > 0 && (
                  <>
                    <div className="fr-group-label">{t('friends.outgoing')}</div>
                    {outgoing.map((u) => (
                      <div className="fr-row" key={u.id}>
                        <Avatar u={u} />
                        <span className="fr-row-mid">
                          <span className="fr-row-name">{u.name}</span>
                          <span className="fr-row-sub">@{u.handle}</span>
                        </span>
                        <span className="fr-row-actions">
                          <button className="fr-act" title={t('friends.cancelRequest')} onClick={() => remove(u)}>
                            {t('friends.cancelReq')}
                          </button>
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
