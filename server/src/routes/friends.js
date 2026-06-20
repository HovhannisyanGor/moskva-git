import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser } from '../users.js';

export const friendsRouter = Router();
friendsRouter.use(requireAuth); // все маршруты друзей требуют входа

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// GET /api/friends — друзья + входящие заявки + исходящие заявки.
friendsRouter.get('/', (req, res) => {
  const me = req.userId;
  const rows = db
    .prepare('SELECT * FROM friendships WHERE requester_id = ? OR addressee_id = ?')
    .all(me, me);

  const friends = [];
  const incoming = [];
  const outgoing = [];
  for (const r of rows) {
    const otherId = r.requester_id === me ? r.addressee_id : r.requester_id;
    const u = getUser(otherId);
    if (!u) continue;
    const cu = toChatUser(u);
    if (r.status === 'accepted') friends.push(cu);
    else if (r.requester_id === me) outgoing.push(cu);
    else incoming.push(cu);
  }
  res.json({ friends, incoming, outgoing });
});

// POST /api/friends/:userId — отправить заявку (а если есть встречная — сразу подружиться).
friendsRouter.post('/:userId', (req, res) => {
  const me = req.userId;
  const other = Number(req.params.userId);
  if (!Number.isInteger(other) || other === me)
    return res.status(400).json({ error: 'Неверный пользователь' });
  if (!getUser(other)) return res.status(404).json({ error: 'Пользователь не найден' });

  const existing = db
    .prepare(
      'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
    )
    .get(me, other, other, me);

  if (existing) {
    if (existing.status === 'accepted') return res.json({ status: 'friends' });
    if (existing.requester_id === me) return res.json({ status: 'outgoing' });
    // Встречная заявка — принимаем её.
    db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(existing.id);
    return res.json({ status: 'friends' });
  }

  db.prepare(
    "INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)",
  ).run(me, other, new Date().toISOString());
  res.status(201).json({ status: 'outgoing' });
});

// POST /api/friends/:userId/accept — принять входящую заявку от userId.
friendsRouter.post('/:userId/accept', (req, res) => {
  const me = req.userId;
  const other = Number(req.params.userId);
  const r = db
    .prepare("SELECT * FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'")
    .get(other, me);
  if (!r) return res.status(404).json({ error: 'Заявки нет' });
  db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(r.id);
  res.json({ status: 'friends' });
});

// DELETE /api/friends/:userId — удалить из друзей / отклонить входящую / отменить исходящую.
friendsRouter.delete('/:userId', (req, res) => {
  const me = req.userId;
  const other = Number(req.params.userId);
  const info = db
    .prepare(
      'DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
    )
    .run(me, other, other, me);
  res.json({ ok: true, removed: info.changes });
});
