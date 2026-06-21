import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser, isOnline } from '../users.js';

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

// Статус дружбы между me и other: self | friends | outgoing | incoming | none.
function relationFor(me, other) {
  if (me === other) return 'self';
  const row = db
    .prepare(
      'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
    )
    .get(me, other, other, me);
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requester_id === me ? 'outgoing' : 'incoming';
}

// GET /api/users/:id — публичный профиль пользователя + мой статус дружбы с ним.
usersRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({
    user: {
      id: u.id,
      name: u.name,
      handle: u.handle,
      color: u.color,
      letter: u.letter,
      avatar: u.avatar || '',
      online: u.show_online === 0 ? false : isOnline(u),
      bio: u.bio || '',
      city: u.city || '',
      createdAt: u.created_at,
    },
    relation: relationFor(req.userId, id),
  });
});
