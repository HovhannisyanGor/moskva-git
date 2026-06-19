import { useCallback, useEffect, useState } from 'react';
import { api, type AdminUser, type AdminStats } from '../utils/api';

interface AdminPageProps {
  meId: number; // id текущего администратора — чтобы не дать удалить/разжаловать самого себя
}

const MONTHS = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function avatarStyle(u: AdminUser) {
  return u.avatar
    ? { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: u.color };
}

export default function AdminPage({ meId }: AdminPageProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError('');
    try {
      const [s, list] = await Promise.all([api.adminStats(), api.adminUsers(query)]);
      setStats(s);
      setUsers(list.users);
      setTotal(list.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка при открытии и при изменении поиска (с задержкой, чтобы не дёргать сервер).
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  const refreshStats = useCallback(() => {
    api.adminStats().then(setStats).catch(() => {});
  }, []);

  async function toggleRole(u: AdminUser) {
    const next = u.role === 'admin' ? 'user' : 'admin';
    setBusyId(u.id);
    setError('');
    try {
      const updated = await api.adminSetRole(u.id, next);
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить роль');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u: AdminUser) {
    const ok = window.confirm(
      `Удалить пользователя @${u.handle}?\nЕго переписка тоже будет удалена. Действие необратимо.`,
    );
    if (!ok) return;
    setBusyId(u.id);
    setError('');
    try {
      await api.adminDeleteUser(u.id);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      setTotal((t) => Math.max(0, t - 1));
      refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить пользователя');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-scroll">
      <div className="admin-page">
        <div className="adm-head">
          <span className="adm-title">Админ-панель</span>
          <span className="adm-sub">Пользователи и управление</span>
        </div>

        <div className="adm-stats">
          <div className="adm-stat">
            <b>{stats ? stats.users : '—'}</b>
            <span>Пользователей</span>
          </div>
          <div className="adm-stat">
            <b>{stats ? stats.admins : '—'}</b>
            <span>Админов</span>
          </div>
          <div className="adm-stat">
            <b>{stats ? stats.messages : '—'}</b>
            <span>Сообщений</span>
          </div>
        </div>

        <div className="adm-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Поиск по имени, нику или email…"
          />
        </div>

        {error && <div className="adm-error">{error}</div>}

        {loading ? (
          <div className="adm-empty">Загрузка…</div>
        ) : users.length === 0 ? (
          <div className="adm-empty">Никого не нашлось</div>
        ) : (
          <>
            <div className="adm-count">
              {q.trim() ? `Найдено: ${total}` : `Всего: ${total}`}
            </div>
            <div className="adm-list">
              {users.map((u) => {
                const isMe = u.id === meId;
                const isAdmin = u.role === 'admin';
                const busy = busyId === u.id;
                return (
                  <div className="adm-row" key={u.id}>
                    <span className="adm-av" style={avatarStyle(u)}>
                      {u.avatar ? '' : u.letter}
                    </span>
                    <span className="adm-mid">
                      <span className="adm-name">
                        {u.name}
                        {isAdmin && <span className="adm-badge">admin</span>}
                        {isMe && <span className="adm-badge adm-badge--me">вы</span>}
                      </span>
                      <span className="adm-row-sub">
                        @{u.handle} · {u.email}
                      </span>
                      <span className="adm-row-meta">
                        #{u.id} · {u.city} · с {formatDate(u.created_at)}
                      </span>
                    </span>
                    <span className="adm-actions">
                      <button
                        type="button"
                        className="adm-act"
                        disabled={busy || isMe || u.protected}
                        title={
                          u.protected
                            ? 'Задан в настройках сервера (ADMIN_EMAILS)'
                            : isMe
                              ? 'Нельзя менять свою роль'
                              : isAdmin
                                ? 'Снять права администратора'
                                : 'Сделать администратором'
                        }
                        onClick={() => toggleRole(u)}
                      >
                        {isAdmin ? 'Снять админа' : 'Сделать админом'}
                      </button>
                      <button
                        type="button"
                        className="adm-act adm-act--danger"
                        disabled={busy || isMe || u.protected}
                        title={
                          u.protected
                            ? 'Задан в настройках сервера (ADMIN_EMAILS)'
                            : isMe
                              ? 'Нельзя удалить самого себя'
                              : 'Удалить пользователя'
                        }
                        onClick={() => remove(u)}
                      >
                        Удалить
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
