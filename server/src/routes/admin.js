import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { config } from '../config.js';
import { applyBan, liftBan, banState, deleteTarget } from '../moderation.js';

// Все маршруты админки требуют входа И роли администратора.
export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// Карточка пользователя для админки: всё, кроме хеша пароля.
// Поле protected = true означает, что пользователь задан в ADMIN_EMAILS на сервере —
// его роль нельзя снять и его нельзя удалить (всё равно вернётся при перезапуске).
function toAdminUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  const ban = banState(row);
  return {
    ...rest,
    role: rest.role || 'user',
    protected: config.adminEmails.includes(row.email),
    // Состояние блокировки в удобном виде — админке не нужно разбирать строку.
    ban: ban.banned
      ? { banned: true, forever: !!ban.forever, until: ban.until, reason: ban.reason }
      : { banned: false },
  };
}

// Кого блокировать нельзя: себя и админа из ADMIN_EMAILS (он всё равно вернётся).
function banGuard(user, meId) {
  if (user.id === meId) return 'Нельзя заблокировать самого себя';
  if (config.adminEmails.includes(user.email))
    return 'Этот администратор задан в настройках сервера (ADMIN_EMAILS) — заблокировать нельзя';
  return null;
}

// GET /api/admin/stats — сводка для шапки админки.
adminRouter.get('/stats', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
  const messages = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  const openReports = db.prepare("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'").get().c;
  const banned = db.prepare("SELECT COUNT(*) AS c FROM users WHERE banned_until != ''").get().c;
  res.json({ stats: { users, admins, messages, openReports, banned } });
});

// GET /api/admin/users?q=&limit=&offset= — список пользователей (с поиском по нику/имени/email).
adminRouter.get('/users', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  let total, rows;
  if (q) {
    const like = `%${q}%`;
    total = db
      .prepare('SELECT COUNT(*) AS c FROM users WHERE handle LIKE ? OR name LIKE ? OR email LIKE ?')
      .get(like, like, like).c;
    rows = db
      .prepare('SELECT * FROM users WHERE handle LIKE ? OR name LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(like, like, like, limit, offset);
  } else {
    total = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    rows = db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
  }
  res.json({ total, users: rows.map(toAdminUser) });
});

// GET /api/admin/users/:id — карточка одного пользователя + статистика по сообщениям.
adminRouter.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const sent = db.prepare('SELECT COUNT(*) AS c FROM messages WHERE sender_id = ?').get(id).c;
  const received = db.prepare('SELECT COUNT(*) AS c FROM messages WHERE recipient_id = ?').get(id).c;
  res.json({ user: toAdminUser(user), stats: { sent, received } });
});

// PATCH /api/admin/users/:id/role — назначить или снять роль администратора.
adminRouter.patch('/users/:id/role', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const role = String(req.body?.role ?? '');
  if (role !== 'admin' && role !== 'user')
    return res.status(400).json({ error: 'Роль может быть только admin или user' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  // Себя разжаловать нельзя — иначе можно случайно потерять доступ к админке.
  if (id === req.userId && role !== 'admin')
    return res.status(400).json({ error: 'Нельзя снять роль администратора с самого себя' });
  // env-админа (из ADMIN_EMAILS) понижать бесполезно — роль вернётся при перезапуске.
  if (config.adminEmails.includes(user.email) && role !== 'admin')
    return res.status(400).json({ error: 'Этот администратор задан в настройках сервера (ADMIN_EMAILS) — снять роль нельзя' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: toAdminUser(updated) });
});

// DELETE /api/admin/users/:id — удалить пользователя вместе с его сообщениями.
adminRouter.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (id === req.userId)
    return res.status(400).json({ error: 'Нельзя удалить самого себя' });
  if (config.adminEmails.includes(user.email))
    return res.status(400).json({ error: 'Этот администратор задан в настройках сервера (ADMIN_EMAILS) — удалить нельзя' });

  // Удаляем пользователя и его переписку одной транзакцией (или всё, или ничего).
  const remove = db.transaction((uid) => {
    db.prepare('DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?').run(uid, uid);
    db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  });
  remove(id);

  res.json({ ok: true, deleted: id });
});

// --- Блокировка пользователей ---

// POST /api/admin/users/:id/ban — заблокировать. { reason?, days? }
// days не задан или 0 — навсегда.
adminRouter.post('/users/:id/ban', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const denied = banGuard(user, req.userId);
  if (denied) return res.status(400).json({ error: denied });

  const days = Number(req.body?.days) || 0;
  applyBan(id, req.body?.reason, days);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: toAdminUser(updated) });
});

// DELETE /api/admin/users/:id/ban — снять блокировку.
adminRouter.delete('/users/:id/ban', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  liftBan(id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: toAdminUser(updated) });
});

// --- Жалобы ---

// GET /api/admin/reports?status=open|resolved|rejected|all
adminRouter.get('/reports', (req, res) => {
  const status = String(req.query.status ?? 'open');
  const where = status === 'all' ? '' : 'WHERE r.status = ?';
  const args = status === 'all' ? [] : [status];

  const rows = db
    .prepare(`
      SELECT r.*,
             rep.handle AS rep_handle, rep.name AS rep_name,
             tgt.handle AS tgt_handle, tgt.name AS tgt_name,
             tgt.banned_until AS tgt_banned_until, tgt.ban_reason AS tgt_ban_reason
      FROM reports r
      LEFT JOIN users rep ON rep.id = r.reporter_id
      LEFT JOIN users tgt ON tgt.id = r.target_user_id
      ${where}
      ORDER BY r.id DESC
      LIMIT 200
    `)
    .all(...args);

  // Сколько ещё жалоб на ту же запись — чтобы модератор видел, что случай не единичный.
  const countSame = db.prepare(
    'SELECT COUNT(*) AS c FROM reports WHERE target_type = ? AND target_id = ?',
  );

  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      note: r.note,
      snapshot: r.snapshot,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      reportsOnTarget: countSame.get(r.target_type, r.target_id).c,
      reporter: { id: r.reporter_id, handle: r.rep_handle || '', name: r.rep_name || '—' },
      target: {
        id: r.target_user_id,
        handle: r.tgt_handle || '',
        name: r.tgt_name || '—',
        ban: banState({
          id: r.target_user_id,
          banned_until: r.tgt_banned_until,
          ban_reason: r.tgt_ban_reason,
        }),
      },
    })),
  });
});

// PATCH /api/admin/reports/:id — решение по жалобе.
// { action: 'resolve' | 'reject', deleteContent?: boolean }
// resolve — жалоба обоснованна, reject — отклонена. deleteContent удаляет саму запись.
adminRouter.patch('/reports/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!report) return res.status(404).json({ error: 'Жалоба не найдена' });

  const action = String(req.body?.action ?? '');
  if (action !== 'resolve' && action !== 'reject')
    return res.status(400).json({ error: 'Решение может быть resolve или reject' });

  let deleted = 0;
  if (req.body?.deleteContent) deleted = deleteTarget(report.target_type, report.target_id);

  const now = new Date().toISOString();
  db.prepare('UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?').run(
    action === 'resolve' ? 'resolved' : 'rejected',
    now,
    req.userId,
    id,
  );

  // Остальные жалобы на ту же запись закрываем тем же решением: разбирать
  // повторно одно и то же модератору незачем.
  db.prepare(
    `UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ?
     WHERE target_type = ? AND target_id = ? AND status = 'open'`,
  ).run(
    action === 'resolve' ? 'resolved' : 'rejected',
    now,
    req.userId,
    report.target_type,
    report.target_id,
  );

  res.json({ ok: true, deletedContent: deleted });
});
