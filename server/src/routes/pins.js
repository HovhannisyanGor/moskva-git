import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const pinsRouter = Router();
pinsRouter.use(requireAuth);

const KINDS = ['crowd', 'meetup', 'drift']; // скопление людей, сходка, дрифт-гонки
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000; // показываем метки за последние сутки

function toPin(row, me) {
  const u = db.prepare('SELECT name, handle FROM users WHERE id = ?').get(row.user_id);
  return {
    id: row.id,
    kind: row.kind,
    note: row.note || '',
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    mine: row.user_id === me,
    author: u ? { name: u.name, handle: u.handle } : null,
  };
}

// GET /api/pins — активные метки (за последние сутки).
pinsRouter.get('/', (req, res) => {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
  const rows = db.prepare('SELECT * FROM map_pins WHERE created_at > ? ORDER BY id DESC').all(since);
  res.json({ pins: rows.map((r) => toPin(r, req.userId)) });
});

// POST /api/pins — поставить метку.
pinsRouter.post('/', (req, res) => {
  const kind = String(req.body?.kind ?? '');
  if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Неверный тип метки' });
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return res.status(400).json({ error: 'Неверные координаты' });
  const note = String(req.body?.note ?? '').trim().slice(0, 200);
  const info = db
    .prepare('INSERT INTO map_pins (user_id, kind, note, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.userId, kind, note, lat, lng, new Date().toISOString());
  res
    .status(201)
    .json({ pin: toPin(db.prepare('SELECT * FROM map_pins WHERE id = ?').get(info.lastInsertRowid), req.userId) });
});

// DELETE /api/pins/:id — удалить свою метку.
pinsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  const p = db.prepare('SELECT user_id FROM map_pins WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Метка не найдена' });
  if (p.user_id !== req.userId) return res.status(403).json({ error: 'Можно удалять только свои метки' });
  db.prepare('DELETE FROM map_pins WHERE id = ?').run(id);
  res.json({ ok: true });
});
