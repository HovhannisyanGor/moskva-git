import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { limitReport } from '../ratelimit.js';
import { REASONS, resolveTarget } from '../moderation.js';

export const reportsRouter = Router();

// POST /api/reports — пожаловаться на запись или на пользователя.
// Тело: { targetType, targetId, reason, note? }
reportsRouter.post('/', requireAuth, limitReport, (req, res) => {
  const targetType = String(req.body?.targetType ?? '');
  const targetId = Number(req.body?.targetId);
  const reason = String(req.body?.reason ?? '');
  const note = String(req.body?.note ?? '').trim().slice(0, 1000);

  if (!Number.isInteger(targetId))
    return res.status(400).json({ error: 'Неверный id', code: 'bad_target' });
  if (!REASONS.includes(reason))
    return res.status(400).json({ error: 'Выберите причину', code: 'bad_reason' });

  const target = resolveTarget(targetType, targetId, req.userId);
  if (target.error) {
    const status = target.code === 'not_found' ? 404 : target.code === 'forbidden' ? 403 : 400;
    return res.status(status).json({ error: target.error, code: target.code });
  }

  try {
    db.prepare(
      `INSERT INTO reports (reporter_id, target_type, target_id, target_user_id, reason, note, snapshot, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    ).run(
      req.userId,
      targetType,
      targetId,
      target.authorId,
      reason,
      note,
      target.snapshot,
      new Date().toISOString(),
    );
  } catch (e) {
    // Сработал уникальный индекс: на эту запись человек уже жаловался.
    // Для него это не ошибка — жалоба и правда принята, просто раньше.
    if (String(e?.code) === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.json({ ok: true, already: true });
    throw e;
  }

  res.status(201).json({ ok: true });
});
