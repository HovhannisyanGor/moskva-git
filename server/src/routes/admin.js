import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { config } from '../config.js';

// Все маршруты админки требуют входа И роли администратора.
export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// Карточка пользователя для админки: всё, кроме хеша пароля.
// Поле protected = true означает, что пользователь задан в ADMIN_EMAILS на сервере —
// его роль нельзя снять и его нельзя удалить (всё равно вернётся при перезапуске).
function toAdminUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return {
    ...rest,
    role: rest.role || 'user',
    protected: config.adminEmails.includes(row.email),
  };
}

// GET /api/admin/stats — сводка для шапки админки.
adminRouter.get('/stats', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
  const messages = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  res.json({ stats: { users, admins, messages } });
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
