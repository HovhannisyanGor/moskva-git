import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

// Посещённые места — основа достижений. Раньше список жил только у клиента,
// из-за чего прогресс на сайте и в приложении расходился. Теперь он общий.
// Значки и уровни здесь не считаем: это делают сами клиенты по одинаковым
// правилам, а серверу достаточно хранить факт «был в месте №N».
export const visitsRouter = Router();
visitsRouter.use(requireAuth);

const MAX_NOTE = 200;

function toVisit(row) {
  return { placeId: row.place_id, visitedAt: row.visited_at, note: row.note || '' };
}

function placeId(req) {
  const id = Number(req.params.placeId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/visits — все посещения текущего пользователя.
visitsRouter.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM place_visits WHERE user_id = ? ORDER BY visited_at')
    .all(req.userId);
  res.json({ visits: rows.map(toVisit) });
});

// PUT /api/visits/:placeId — отметить место посещённым.
// Повторный вызов не создаёт дубль и не сдвигает дату (нужно для значка
// «3 места за день»): у пары (пользователь, место) всегда одна строка.
// Пустую заметку игнорируем: приложение заметок не шлёт вообще, и без этого
// повторная отметка с телефона стирала бы текст, написанный на сайте.
visitsRouter.put('/:placeId', (req, res) => {
  const id = placeId(req);
  if (!id) return res.status(400).json({ error: 'Неверный id места', code: 'place_invalid' });
  const note = String(req.body?.note ?? '').trim().slice(0, MAX_NOTE);
  db.prepare(
    `INSERT INTO place_visits (user_id, place_id, note, visited_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, place_id) DO UPDATE
       SET note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE place_visits.note END`
  ).run(req.userId, id, note, new Date().toISOString());
  const row = db
    .prepare('SELECT * FROM place_visits WHERE user_id = ? AND place_id = ?')
    .get(req.userId, id);
  res.json({ visit: toVisit(row) });
});

// DELETE /api/visits/:placeId — снять отметку.
visitsRouter.delete('/:placeId', (req, res) => {
  const id = placeId(req);
  if (!id) return res.status(400).json({ error: 'Неверный id места', code: 'place_invalid' });
  db.prepare('DELETE FROM place_visits WHERE user_id = ? AND place_id = ?').run(req.userId, id);
  res.json({ ok: true });
});

// POST /api/visits/merge — разовый перенос старых посещений с устройства.
// У пользователей уже накоплен прогресс в localStorage (сайт) и UserDefaults
// (приложение). При первом запуске клиент присылает его сюда, чтобы ничего не
// потерялось. Существующие записи не трогаем — сервер главнее.
visitsRouter.post('/merge', (req, res) => {
  const incoming = Array.isArray(req.body?.visits) ? req.body.visits : [];
  const insert = db.prepare(
    `INSERT INTO place_visits (user_id, place_id, note, visited_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, place_id) DO NOTHING`
  );
  const merge = db.transaction((list) => {
    for (const v of list) {
      const id = Number(v?.placeId);
      if (!Number.isInteger(id) || id <= 0) continue;
      const at = typeof v?.visitedAt === 'string' && v.visitedAt ? v.visitedAt : new Date().toISOString();
      const note = String(v?.note ?? '').trim().slice(0, MAX_NOTE);
      insert.run(req.userId, id, note, at);
    }
  });
  merge(incoming.slice(0, 500)); // разумный потолок на один запрос
  const rows = db
    .prepare('SELECT * FROM place_visits WHERE user_id = ? ORDER BY visited_at')
    .all(req.userId);
  res.json({ visits: rows.map(toVisit) });
});
