import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser } from '../users.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

// GET /api/users/search?q=ник — поиск людей по нику или имени (для нового чата).
usersRouter.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim().replace(/^@+/, ''); // «@anna» → «anna»
  if (q.length < 1) return res.json({ users: [] });
  const like = `%${q}%`;
  // LIKE для кириллицы в SQLite регистрозависим — добавляем вариант с заглавной
  // первой буквой, чтобы «макс» находил «Максим».
  const likeCap = `%${q.charAt(0).toUpperCase() + q.slice(1)}%`;
  // Если ввели число — ищем ещё и по ID (поддерживаем и «18», и «00018»).
  const asId = /^\d+$/.test(q) ? parseInt(q, 10) : -1;
  const rows = db
    .prepare(`
      SELECT * FROM users
      WHERE id != ? AND (handle LIKE ? OR name LIKE ? OR name LIKE ? OR id = ?)
      ORDER BY (id = ?) DESC, handle
      LIMIT 10
    `)
    .all(req.userId, like, like, likeCap, asId, asId);
  res.json({ users: rows.map(toChatUser) });
});
