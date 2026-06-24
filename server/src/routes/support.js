import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

export const supportRouter = Router();

// POST /api/support — пользователь отправляет обращение в поддержку.
supportRouter.post('/', requireAuth, (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'Напишите сообщение' });
  if (text.length > 4000) return res.status(400).json({ error: 'Сообщение слишком длинное' });
  db.prepare('INSERT INTO support_messages (user_id, text, resolved, created_at) VALUES (?, ?, 0, ?)')
    .run(req.userId, text, new Date().toISOString());
  res.status(201).json({ ok: true });
});

// GET /api/support — список обращений (только админ): необработанные сверху.
supportRouter.get('/', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(`
      SELECT s.*, u.name AS user_name, u.handle AS user_handle, u.email AS user_email
      FROM support_messages s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.resolved ASC, s.id DESC
    `)
    .all();
  res.json({
    messages: rows.map((r) => ({
      id: r.id,
      text: r.text,
      resolved: !!r.resolved,
      createdAt: r.created_at,
      user: { id: r.user_id, name: r.user_name, handle: r.user_handle, email: r.user_email },
    })),
  });
});

// PATCH /api/support/:id/resolve — пометить обращение обработанным (админ).
supportRouter.patch('/:id/resolve', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  db.prepare('UPDATE support_messages SET resolved = 1 WHERE id = ?').run(id);
  res.json({ ok: true });
});
