import { useState } from 'react';
import { api, type ChatUser, type GroupInfo } from '../utils/api';

function avatarStyle(u: { avatar: string; color: string }) {
  return u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
}

export default function CreateGroup({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (g: GroupInfo) => void;
}) {
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<ChatUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
  function toggle(u: ChatUser) {
    setSelected((s) => (s.some((x) => x.id === u.id) ? s.filter((x) => x.id !== u.id) : [...s, u]));
  }
  async function create() {
    const nm = name.trim();
    if (!nm) {
      setError('Введите название группы');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const g = await api.createGroup(nm, selected.map((u) => u.id));
      onCreated(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать группу');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="msg-menu-backdrop" onClick={onClose} />
      <div className="grp-modal">
        <div className="grp-modal-head">
          <span>Новая группа</span>
          <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <div className="grp-modal-body">
          <input
            className="grp-input"
            placeholder="Название группы"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={60}
          />
          {selected.length > 0 && (
            <div className="grp-chips">
              {selected.map((u) => (
                <button key={u.id} type="button" className="grp-chip" onClick={() => toggle(u)}>
                  {u.name} ×
                </button>
              ))}
            </div>
          )}
          <input
            className="grp-input"
            placeholder="🔍 Добавить участников…"
            value={q}
            onChange={(e) => search(e.target.value)}
          />
          <div className="grp-results">
            {results.map((u) => {
              const on = selected.some((x) => x.id === u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`chat-item ${on ? 'chat-item--active' : ''}`}
                  onClick={() => toggle(u)}
                >
                  <span className="chat-av chat-av--sm" style={avatarStyle(u)}>
                    {u.avatar ? '' : u.letter}
                  </span>
                  <span className="chat-item-mid">
                    <span className="chat-item-name">{u.name}</span>
                    <span className="chat-item-last">@{u.handle}</span>
                  </span>
                  <span className="grp-check">{on ? '✓' : '＋'}</span>
                </button>
              );
            })}
          </div>
          {error && <div className="grp-error">{error}</div>}
        </div>
        <div className="grp-modal-foot">
          <button type="button" className="grp-btn-primary" onClick={create} disabled={busy || !name.trim()}>
            Создать{selected.length ? ` · ${selected.length + 1} чел.` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
