import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser } from '../users.js';

export const chatsRouter = Router();
chatsRouter.use(requireAuth); // все маршруты чатов требуют входа

// GET /api/chats — список диалогов: собеседник + последнее сообщение + кол-во непрочитанных.
chatsRouter.get('/', (req, res) => {
  const me = req.userId;

  const partners = db
    .prepare(`
      SELECT DISTINCT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS uid
      FROM messages
      WHERE sender_id = ? OR recipient_id = ?
    `)
    .all(me, me, me);

  const chats = partners
    .map(({ uid }) => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
      if (!user) return null;
      const last = db
        .prepare(`
          SELECT * FROM messages
          WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
          ORDER BY id DESC LIMIT 1
        `)
        .get(me, uid, uid, me);
      const unread = db
        .prepare('SELECT COUNT(*) AS c FROM messages WHERE sender_id = ? AND recipient_id = ? AND read = 0')
        .get(uid, me).c;
      return {
        user: toChatUser(user),
        last: last ? { text: last.text, fromMe: last.sender_id === me, createdAt: last.created_at } : null,
        unread,
      };
    })
    .filter(Boolean);

  // Новые диалоги — сверху.
  chats.sort((a, b) => (b.last?.createdAt || '').localeCompare(a.last?.createdAt || ''));
  res.json({ chats });
});

// GET /api/chats/:userId/messages — переписка с пользователем (и помечаем входящие прочитанными).
chatsRouter.get('/:userId/messages', (req, res) => {
  const me = req.userId;
  const uid = Number(req.params.userId);
  if (!Number.isInteger(uid)) return res.status(400).json({ error: 'Неверный id' });

  const partner = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  if (!partner) return res.status(404).json({ error: 'Пользователь не найден' });

  const messages = db
    .prepare(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY id ASC
    `)
    .all(me, uid, uid, me);

  db.prepare('UPDATE messages SET read = 1 WHERE sender_id = ? AND recipient_id = ? AND read = 0').run(uid, me);

  res.json({
    user: toChatUser(partner),
    messages: messages.map((m) => ({
      id: m.id,
      fromMe: m.sender_id === me,
      text: m.text,
      createdAt: m.created_at,
    })),
  });
});

// POST /api/chats/:userId/messages — отправить сообщение собеседнику.
chatsRouter.post('/:userId/messages', (req, res) => {
  const me = req.userId;
  const uid = Number(req.params.userId);
  if (!Number.isInteger(uid)) return res.status(400).json({ error: 'Неверный id' });
  if (uid === me) return res.status(400).json({ error: 'Нельзя писать самому себе' });

  const partner = db.prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (!partner) return res.status(404).json({ error: 'Пользователь не найден' });

  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'Пустое сообщение' });
  if (text.length > 4000) return res.status(400).json({ error: 'Сообщение слишком длинное' });

  const info = db
    .prepare('INSERT INTO messages (sender_id, recipient_id, text, read, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(me, uid, text, new Date().toISOString());

  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ message: { id: m.id, fromMe: true, text: m.text, createdAt: m.created_at } });
});
