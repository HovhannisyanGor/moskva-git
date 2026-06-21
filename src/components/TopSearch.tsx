import { useEffect, useRef, useState } from 'react';
import { api, type ChatUser } from '../utils/api';
import { PLACES, CATEGORY_LABELS, CATEGORY_COLORS } from '../data/places';
import type { Place } from '../types';
import { Icon } from './Icon';

// Универсальный поиск сверху: люди (через API) + места (по списку PLACES).
export default function TopSearch({
  onOpenChat,
  onOpenPlace,
}: {
  onOpenChat: (u: ChatUser) => void;
  onOpenPlace: (p: Place) => void;
}) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<ChatUser[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const query = q.trim();
  const places =
    query.length >= 1
      ? PLACES.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      : [];

  async function onChange(v: string) {
    setQ(v);
    setOpen(true);
    const t = v.trim().replace(/^@+/, '');
    if (t.length < 1) {
      setPeople([]);
      return;
    }
    try {
      setPeople(await api.searchUsers(t));
    } catch {
      setPeople([]);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function reset() {
    setQ('');
    setPeople([]);
    setOpen(false);
  }
  function choosePerson(u: ChatUser) {
    onOpenChat(u);
    reset();
  }
  function choosePlace(p: Place) {
    onOpenPlace(p);
    reset();
  }

  const hasResults = people.length > 0 || places.length > 0;

  return (
    <div className="top-search" ref={ref}>
      <span className="top-search-icon">
        <Icon name="search" />
      </span>
      <input
        className="top-search-input"
        placeholder="Поиск людей и мест…"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />

      {open && query.length >= 1 && (
        <div className="top-search-pop">
          {!hasResults && <div className="top-search-empty">Ничего не нашлось</div>}

          {people.length > 0 && (
            <>
              <div className="top-search-label">Люди</div>
              {people.map((u) => (
                <button className="top-search-row" key={`u${u.id}`} onClick={() => choosePerson(u)}>
                  <span
                    className="top-search-av"
                    style={
                      u.avatar
                        ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: u.color }
                    }
                  >
                    {u.avatar ? '' : u.letter}
                    {u.online && <span className="fr-online-dot" />}
                  </span>
                  <span className="top-search-row-mid">
                    <span className="top-search-row-name">{u.name}</span>
                    <span className="top-search-row-sub">@{u.handle}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          {places.length > 0 && (
            <>
              <div className="top-search-label">Места</div>
              {places.map((p) => (
                <button className="top-search-row" key={`p${p.id}`} onClick={() => choosePlace(p)}>
                  <span className="top-search-dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                  <span className="top-search-row-mid">
                    <span className="top-search-row-name">{p.name}</span>
                    <span className="top-search-row-sub">{CATEGORY_LABELS[p.category]}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
