import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser } from '../users.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

// GET /api/users/search?q=ник — поиск людей по нику или имени (для нового чата).
usersRouter.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ users: [] });
  const like = `%${q}%`;
  const rows = db
    .prepare(`
      SELECT * FROM users
      WHERE id != ? AND (handle LIKE ? OR name LIKE ?)
      ORDER BY handle
      LIMIT 10
    `)
    .all(req.userId, like, like);
  res.json({ users: rows.map(toChatUser) });
});
