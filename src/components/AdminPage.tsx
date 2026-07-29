import { useCallback, useEffect, useState } from 'react';
import { api, type AdminUser, type AdminStats, type SupportMessage, type AdminReport } from '../utils/api';
import BanDialog from './BanDialog';

// Подписи причин жалоб — те же коды, что шлют сайт и приложение.
const REASON_LABELS: Record<string, string> = {
  spam: 'Спам или реклама',
  abuse: 'Оскорбления или травля',
  adult: 'Материалы 18+',
  violence: 'Насилие или угрозы',
  fake: 'Обман или фейк',
  other: 'Другое',
};

// Названия того, на что пожаловались.
const TARGET_LABELS: Record<string, string> = {
  post: 'Пост',
  comment: 'Комментарий',
  message: 'Личное сообщение',
  group_message: 'Сообщение в группе',
  pin: 'Метка на карте',
  user: 'Профиль',
};

// Человеческое описание блокировки для строки пользователя.
function banLabel(ban: AdminUser['ban']): string {
  if (!ban?.banned) return '';
  if (ban.forever) return 'заблокирован навсегда';
  const d = ban.until ? new Date(ban.until) : null;
  return d ? `заблокирован до ${d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}` : 'заблокирован';
}

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
  const [support, setSupport] = useState<SupportMessage[]>([]);
  const [showSupport, setShowSupport] = useState(false);

  // Модерация
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [showReports, setShowReports] = useState(true); // жалобы важнее — открыты сразу
  const [reportFilter, setReportFilter] = useState<'open' | 'all'>('open');
  const [banTarget, setBanTarget] = useState<{ id: number; handle: string } | null>(null);

  useEffect(() => {
    api.adminSupportList().then(setSupport).catch(() => {});
  }, []);

  const loadReports = useCallback(() => {
    api.adminReports(reportFilter).then(setReports).catch(() => {});
  }, [reportFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function resolveSupport(id: number) {
    try {
      await api.adminResolveSupport(id);
      setSupport((prev) => prev.map((m) => (m.id === id ? { ...m, resolved: true } : m)));
    } catch {
      /* ignore */
    }
  }

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

  // Решение по жалобе. deleteContent удаляет саму запись, на которую пожаловались.
  async function decide(r: AdminReport, action: 'resolve' | 'reject', deleteContent = false) {
    setBusyId(r.id);
    setError('');
    try {
      await api.adminResolveReport(r.id, action, deleteContent);
      loadReports();
      refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось закрыть жалобу');
    } finally {
      setBusyId(null);
    }
  }

  // Пользователя обновляем сразу в обоих списках: он может быть виден и там, и там.
  function applyUser(u: AdminUser) {
    setUsers((list) => list.map((x) => (x.id === u.id ? u : x)));
    loadReports();
    refreshStats();
  }

  async function unban(u: { id: number; handle: string }) {
    setBusyId(u.id);
    setError('');
    try {
      applyUser(await api.adminUnban(u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять блокировку');
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
          <div className={`adm-stat${stats && stats.openReports > 0 ? ' adm-stat--alert' : ''}`}>
            <b>{stats ? stats.openReports : '—'}</b>
            <span>Жалоб</span>
          </div>
          <div className="adm-stat">
            <b>{stats ? stats.banned : '—'}</b>
            <span>Заблокировано</span>
          </div>
        </div>

        {/* Жалобы на контент */}
        <button type="button" className="adm-support-toggle" onClick={() => setShowReports((v) => !v)}>
          <span>⚑ Жалобы</span>
          <span className="adm-support-count">
            {reports.filter((r) => r.status === 'open').length} на разборе
          </span>
          <span className="adm-support-arrow">{showReports ? '▴' : '▾'}</span>
        </button>
        {showReports && (
          <div className="adm-support-list">
            <div className="adm-rep-filter">
              <button
                type="button"
                className={`adm-rep-tab${reportFilter === 'open' ? ' adm-rep-tab--on' : ''}`}
                onClick={() => setReportFilter('open')}
              >
                На разборе
              </button>
              <button
                type="button"
                className={`adm-rep-tab${reportFilter === 'all' ? ' adm-rep-tab--on' : ''}`}
                onClick={() => setReportFilter('all')}
              >
                Все
              </button>
            </div>

            {reports.length === 0 && <div className="adm-empty">Жалоб нет</div>}

            {reports.map((r) => {
              const open = r.status === 'open';
              const busy = busyId === r.id;
              return (
                <div key={r.id} className={`adm-rep${open ? '' : ' adm-support-item--done'}`}>
                  <div className="adm-rep-top">
                    <span className="adm-rep-reason">{REASON_LABELS[r.reason] || r.reason}</span>
                    <span className="adm-rep-kind">{TARGET_LABELS[r.targetType] || r.targetType}</span>
                    {r.reportsOnTarget > 1 && (
                      <span className="adm-rep-many">жалоб: {r.reportsOnTarget}</span>
                    )}
                    <span className="adm-support-date">{formatDate(r.createdAt)}</span>
                  </div>

                  {/* Копия текста на момент жалобы: оригинал автор мог уже удалить. */}
                  <div className="adm-rep-snapshot">{r.snapshot || '(без текста)'}</div>
                  {r.note && <div className="adm-rep-note">Жалобщик: {r.note}</div>}

                  <div className="adm-rep-who">
                    <span>
                      на <b>@{r.target.handle}</b>
                      {r.target.ban.banned && (
                        <span className="adm-badge adm-badge--ban">{banLabel(r.target.ban)}</span>
                      )}
                    </span>
                    <span className="adm-rep-from">от @{r.reporter.handle}</span>
                  </div>

                  {open ? (
                    <div className="adm-rep-actions">
                      {/* Жалоба на профиль: удалять тут нечего — для человека есть
                          блокировка, а удаление аккаунта живёт в списке пользователей. */}
                      {r.targetType !== 'user' && (
                        <button
                          type="button"
                          className="adm-act adm-act--danger"
                          disabled={busy}
                          onClick={() => decide(r, 'resolve', true)}
                          title="Удалить запись и закрыть жалобу"
                        >
                          Удалить запись
                        </button>
                      )}
                      <button
                        type="button"
                        className="adm-act"
                        disabled={busy}
                        onClick={() => decide(r, 'resolve')}
                        title="Закрыть жалобу, запись оставить"
                      >
                        Закрыть
                      </button>
                      <button
                        type="button"
                        className="adm-act"
                        disabled={busy}
                        onClick={() => decide(r, 'reject')}
                        title="Жалоба необоснованна"
                      >
                        Отклонить
                      </button>
                      {r.target.ban.banned ? (
                        <button
                          type="button"
                          className="adm-act"
                          disabled={busy}
                          onClick={() => unban(r.target)}
                        >
                          Разблокировать автора
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="adm-act adm-act--danger"
                          disabled={busy}
                          onClick={() => setBanTarget({ id: r.target.id, handle: r.target.handle })}
                        >
                          Заблокировать автора
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="adm-rep-status">
                      {r.status === 'resolved' ? 'жалоба принята' : 'жалоба отклонена'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Обращения в поддержку */}
        <button type="button" className="adm-support-toggle" onClick={() => setShowSupport((v) => !v)}>
          <span>🛟 Обращения в поддержку</span>
          <span className="adm-support-count">
            {support.filter((m) => !m.resolved).length} новых · {support.length} всего
          </span>
          <span className="adm-support-arrow">{showSupport ? '▴' : '▾'}</span>
        </button>
        {showSupport && (
          <div className="adm-support-list">
            {support.length === 0 && <div className="adm-empty">Обращений пока нет</div>}
            {support.map((m) => (
              <div key={m.id} className={`adm-support-item${m.resolved ? ' adm-support-item--done' : ''}`}>
                <div className="adm-support-top">
                  <span className="adm-support-user">
                    {m.user.name} · @{m.user.handle}
                  </span>
                  <span className="adm-support-date">{formatDate(m.createdAt)}</span>
                </div>
                <div className="adm-support-text">{m.text}</div>
                <div className="adm-support-foot">
                  <a className="adm-support-mail" href={`mailto:${m.user.email}`}>{m.user.email}</a>
                  {m.resolved ? (
                    <span className="adm-support-done-badge">обработано</span>
                  ) : (
                    <button type="button" className="adm-support-resolve" onClick={() => resolveSupport(m.id)}>
                      Пометить обработанным
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

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
                        {u.ban?.banned && (
                          <span className="adm-badge adm-badge--ban" title={u.ban.reason || ''}>
                            {banLabel(u.ban)}
                          </span>
                        )}
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
                      {u.ban?.banned ? (
                        <button
                          type="button"
                          className="adm-act"
                          disabled={busy}
                          title={u.ban.reason ? `Причина: ${u.ban.reason}` : 'Снять блокировку'}
                          onClick={() => unban(u)}
                        >
                          Разблокировать
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="adm-act"
                          disabled={busy || isMe || u.protected}
                          title={
                            u.protected
                              ? 'Задан в настройках сервера (ADMIN_EMAILS)'
                              : isMe
                                ? 'Нельзя заблокировать самого себя'
                                : 'Заблокировать: не сможет ни войти, ни писать'
                          }
                          onClick={() => setBanTarget({ id: u.id, handle: u.handle })}
                        >
                          Заблокировать
                        </button>
                      )}
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

      {banTarget && (
        <BanDialog
          userId={banTarget.id}
          handle={banTarget.handle}
          onClose={() => setBanTarget(null)}
          onBanned={applyUser}
        />
      )}
    </div>
  );
}
