import { useCallback, useEffect, useState } from 'react';
import { api, type ChatUser, type GroupInfo } from '../utils/api';

function avatarStyle(u: { avatar: string; color: string }) {
  return u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
}

export default function GroupSettings({
  group,
  meId,
  onClose,
  onChanged,
  onOpenProfile,
  onToast,
}: {
  group: GroupInfo;
  meId?: number;
  onClose: () => void;
  onChanged: (stillOpen: boolean) => void;
  onOpenProfile?: (id: number) => void;
  onToast: (s: string) => void;
}) {
  const [info, setInfo] = useState<GroupInfo>(group);
  const [members, setMembers] = useState<ChatUser[]>([]);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(group.name);

  const isOwner = meId != null && info.ownerId === meId;
  const inviteLink = `${window.location.origin}/?join=${info.inviteToken}`;

  const load = useCallback(async () => {
    try {
      const d = await api.groupInfo(group.id);
      setInfo(d.group);
      setMembers(d.members);
    } catch {
      /* ignore */
    }
  }, [group.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function search(v: string) {
    setQ(v);
    if (v.trim().length < 1) {
      setResults([]);
      return;
    }
    try {
      setResults(await api.searchUsers(v.trim()));
    } catch {
      setResults([]);
    }
  }
  async function addMember(u: ChatUser) {
    try {
      await api.groupAddMember(group.id, u.id);
      setQ('');
      setResults([]);
      setAdding(false);
      load();
      onChanged(true);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка');
    }
  }
  async function removeMember(u: ChatUser) {
    if (!window.confirm(`Удалить ${u.name} из группы?`)) return;
    try {
      await api.groupRemoveMember(group.id, u.id);
      load();
      onChanged(true);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка');
    }
  }
  async function leave() {
    if (!window.confirm('Покинуть группу?')) return;
    try {
      await api.groupLeave(group.id);
      onChanged(false);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка');
    }
  }
  async function deleteGroup() {
    if (!window.confirm('Удалить группу для всех участников? Это необратимо.')) return;
    try {
      await api.groupDelete(group.id);
      onChanged(false);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка');
    }
  }
  async function saveName() {
    const nm = name.trim();
    if (!nm || nm === info.name) {
      setEditingName(false);
      return;
    }
    try {
      const g = await api.groupRename(group.id, nm);
      setInfo(g);
      setEditingName(false);
      onChanged(true);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка');
    }
  }
  function copyLink() {
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => onToast('Ссылка скопирована'))
      .catch(() => onToast('Не удалось скопировать'));
  }

  return (
    <>
      <div className="msg-menu-backdrop" onClick={onClose} />
      <div className="grp-settings">
        <button type="button" className="grp-settings-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="grp-settings-hero">
          <div className="grp-settings-av" style={{ background: info.color }}>
            {info.letter}
          </div>
          {editingName && isOwner ? (
            <input
              className="grp-input grp-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              autoFocus
              maxLength={60}
            />
          ) : (
            <button
              type="button"
              className="grp-settings-name"
              onClick={() => {
                if (isOwner) {
                  setName(info.name);
                  setEditingName(true);
                }
              }}
            >
              {info.name}
              {isOwner && <span className="grp-edit-pencil"> ✎</span>}
            </button>
          )}
          <div className="grp-settings-count">{info.memberCount} участников</div>
        </div>

        <div className="grp-settings-actions">
          <button type="button" className="grp-action" onClick={() => setAdding((v) => !v)}>
            <span className="grp-action-ic">＋</span>
            <span>Добавить</span>
          </button>
          <button type="button" className="grp-action" onClick={copyLink}>
            <span className="grp-action-ic">🔗</span>
            <span>Ссылка</span>
          </button>
          <button type="button" className="grp-action grp-action--danger" onClick={leave}>
            <span className="grp-action-ic">⎋</span>
            <span>Покинуть</span>
          </button>
          {isOwner && (
            <button type="button" className="grp-action grp-action--danger" onClick={deleteGroup}>
              <span className="grp-action-ic">🗑</span>
              <span>Удалить</span>
            </button>
          )}
        </div>

        <button type="button" className="grp-invite" onClick={copyLink}>
          <span className="grp-invite-link">{inviteLink}</span>
          <span className="grp-invite-sub">Пригласительная ссылка · нажмите, чтобы скопировать</span>
        </button>

        {adding && (
          <div className="grp-add-box">
            <input
              className="grp-input"
              placeholder="🔍 Найти пользователя…"
              value={q}
              onChange={(e) => search(e.target.value)}
              autoFocus
            />
            <div className="grp-results">
              {results.map((u) => {
                const already = members.some((m) => m.id === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="chat-item"
                    disabled={already}
                    onClick={() => addMember(u)}
                  >
                    <span className="chat-av chat-av--sm" style={avatarStyle(u)}>
                      {u.avatar ? '' : u.letter}
                    </span>
                    <span className="chat-item-mid">
                      <span className="chat-item-name">{u.name}</span>
                      <span className="chat-item-last">@{u.handle}</span>
                    </span>
                    <span className="grp-check">{already ? '✓' : '＋'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grp-members">
          <div className="grp-members-title">Участники · {info.memberCount}</div>
          {members.map((u) => (
            <div key={u.id} className="grp-member">
              <button type="button" className="grp-member-main" onClick={() => onOpenProfile?.(u.id)}>
                <span className="chat-av chat-av--sm" style={avatarStyle(u)}>
                  {u.avatar ? '' : u.letter}
                  {u.online && <span className="chat-online-dot" />}
                </span>
                <span className="chat-item-mid">
                  <span className="chat-item-name">
                    {u.name}
                    {u.id === meId && <span className="grp-you"> (вы)</span>}
                  </span>
                  <span className="chat-item-last">{u.online ? 'в сети' : `@${u.handle}`}</span>
                </span>
              </button>
              {u.id === info.ownerId ? (
                <span className="grp-owner-badge">владелец</span>
              ) : isOwner ? (
                <button
                  type="button"
                  className="grp-remove"
                  onClick={() => removeMember(u)}
                  aria-label="Удалить участника"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
