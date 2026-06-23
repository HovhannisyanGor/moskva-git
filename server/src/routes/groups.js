import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser } from '../users.js';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

const COLORS = ['#9B7FE6', '#378ADD', '#3FAE6E', '#D69A1E', '#E0568A', '#FA3C3C'];

function isMember(groupId, userId) {
  return !!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}
function memberCount(groupId) {
  return db.prepare('SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?').get(groupId).c;
}
function groupInfo(g) {
  return {
    id: g.id,
    name: g.name,
    color: g.color,
    letter: g.letter,
    ownerId: g.owner_id,
    inviteToken: g.invite_token,
    memberCount: memberCount(g.id),
  };
}
// Сообщение группы для фронта: автор, «изменено», цитата ответа.
function toGroupMessage(m, me) {
  let replyTo = null;
  if (m.reply_to) {
    const r = db.prepare('SELECT id, text, sender_id FROM group_messages WHERE id = ?').get(m.reply_to);
    if (r) {
      const ra = db.prepare('SELECT name FROM users WHERE id = ?').get(r.sender_id);
      replyTo = { id: r.id, text: r.text, fromMe: r.sender_id === me, author: ra?.name || '' };
    }
  }
  const s = db.prepare('SELECT id, name, color, letter, avatar FROM users WHERE id = ?').get(m.sender_id);
  return {
    id: m.id,
    fromMe: m.sender_id === me,
    text: m.text,
    createdAt: m.created_at,
    edited: !!m.edited,
    forwardedFrom: '',
    replyTo,
    sender: s ? { id: s.id, name: s.name, color: s.color, letter: s.letter, avatar: s.avatar || '' } : null,
  };
}

// POST /api/groups — создать группу (название + начальные участники).
groupsRouter.post('/', (req, res) => {
  const me = req.userId;
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Введите название группы' });
  if (name.length > 60) return res.status(400).json({ error: 'Название слишком длинное' });

  let memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map(Number).filter(Number.isInteger) : [];
  memberIds = [...new Set(memberIds.filter((id) => id !== me))];
  const valid = memberIds.filter((id) => db.prepare('SELECT 1 FROM users WHERE id = ?').get(id));

  const now = new Date().toISOString();
  const token = randomBytes(9).toString('base64url');
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const create = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO groups (name, color, letter, owner_id, invite_token, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name, color, name[0].toUpperCase(), me, token, now);
    const gid = info.lastInsertRowid;
    const add = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, last_read, joined_at) VALUES (?, ?, 0, ?)');
    add.run(gid, me, now);
    for (const id of valid) add.run(gid, id, now);
    return gid;
  });
  const gid = create();
  res.status(201).json({ group: groupInfo(db.prepare('SELECT * FROM groups WHERE id = ?').get(gid)) });
});

// GET /api/groups — мои группы (для общего списка чатов): последнее сообщение + непрочитанные.
groupsRouter.get('/', (req, res) => {
  const me = req.userId;
  const rows = db
    .prepare(`
      SELECT g.*, gm.last_read FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
    `)
    .all(me);
  const groups = rows.map((g) => {
    const last = db.prepare('SELECT * FROM group_messages WHERE group_id = ? ORDER BY id DESC LIMIT 1').get(g.id);
    const unread = db
      .prepare('SELECT COUNT(*) AS c FROM group_messages WHERE group_id = ? AND id > ? AND sender_id != ?')
      .get(g.id, g.last_read, me).c;
    let lastInfo = null;
    if (last) {
      const sn = db.prepare('SELECT name FROM users WHERE id = ?').get(last.sender_id);
      lastInfo = { text: last.text, fromMe: last.sender_id === me, author: sn?.name || '', createdAt: last.created_at };
    }
    return { ...groupInfo(g), last: lastInfo, unread };
  });
  groups.sort((a, b) => (b.last?.createdAt || '').localeCompare(a.last?.createdAt || ''));
  res.json({ groups });
});

// GET /api/groups/invite/:token — предпросмотр группы по ссылке (название, кол-во, я уже участник?).
groupsRouter.get('/invite/:token', (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE invite_token = ?').get(String(req.params.token));
  if (!g) return res.status(404).json({ error: 'Ссылка недействительна' });
  res.json({ group: groupInfo(g), alreadyMember: isMember(g.id, req.userId) });
});

// POST /api/groups/invite/:token — присоединиться по ссылке.
groupsRouter.post('/invite/:token', (req, res) => {
  const me = req.userId;
  const g = db.prepare('SELECT * FROM groups WHERE invite_token = ?').get(String(req.params.token));
  if (!g) return res.status(404).json({ error: 'Ссылка недействительна' });
  db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, last_read, joined_at) VALUES (?, ?, 0, ?)')
    .run(g.id, me, new Date().toISOString());
  res.json({ group: groupInfo(g) });
});

// PATCH /api/groups/messages/:id — изменить своё сообщение в группе.
groupsRouter.patch('/messages/:id', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  const m = db.prepare('SELECT * FROM group_messages WHERE id = ?').get(id);
  if (!m) return res.status(404).json({ error: 'Сообщение не найдено' });
  if (m.sender_id !== me) return res.status(403).json({ error: 'Можно менять только свои сообщения' });
  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'Пустое сообщение' });
  if (text.length > 4000) return res.status(400).json({ error: 'Сообщение слишком длинное' });
  db.prepare('UPDATE group_messages SET text = ?, edited = 1 WHERE id = ?').run(text, id);
  res.json({ message: toGroupMessage(db.prepare('SELECT * FROM group_messages WHERE id = ?').get(id), me) });
});

// DELETE /api/groups/messages/:id — удалить своё сообщение в группе.
groupsRouter.delete('/messages/:id', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  const m = db.prepare('SELECT sender_id FROM group_messages WHERE id = ?').get(id);
  if (!m) return res.status(404).json({ error: 'Сообщение не найдено' });
  if (m.sender_id !== me) return res.status(403).json({ error: 'Можно удалять только свои сообщения' });
  db.prepare('UPDATE group_messages SET reply_to = NULL WHERE reply_to = ?').run(id);
  db.prepare('DELETE FROM group_messages WHERE id = ?').run(id);
  res.json({ ok: true, deleted: id });
});

// GET /api/groups/:id/messages — переписка группы (только участники); помечаем прочитанным.
groupsRouter.get('/:id/messages', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  if (!isMember(gid, me)) return res.status(403).json({ error: 'Вы не участник группы' });
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid);
  const msgs = db.prepare('SELECT * FROM group_messages WHERE group_id = ? ORDER BY id ASC').all(gid);
  const maxId = msgs.length ? msgs[msgs.length - 1].id : 0;
  db.prepare('UPDATE group_members SET last_read = ? WHERE group_id = ? AND user_id = ? AND last_read < ?').run(maxId, gid, me, maxId);
  res.json({ group: groupInfo(g), messages: msgs.map((m) => toGroupMessage(m, me)) });
});

// POST /api/groups/:id/messages — отправить сообщение в группу.
groupsRouter.post('/:id/messages', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  if (!isMember(gid, me)) return res.status(403).json({ error: 'Вы не участник группы' });
  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'Пустое сообщение' });
  if (text.length > 4000) return res.status(400).json({ error: 'Сообщение слишком длинное' });
  let replyTo = null;
  const replyId = Number(req.body?.replyTo);
  if (Number.isInteger(replyId)) {
    const r = db.prepare('SELECT id FROM group_messages WHERE id = ? AND group_id = ?').get(replyId, gid);
    if (r) replyTo = replyId;
  }
  const info = db
    .prepare('INSERT INTO group_messages (group_id, sender_id, text, created_at, reply_to) VALUES (?, ?, ?, ?, ?)')
    .run(gid, me, text, new Date().toISOString(), replyTo);
  db.prepare('UPDATE group_members SET last_read = ? WHERE group_id = ? AND user_id = ?').run(info.lastInsertRowid, gid, me);
  res.status(201).json({ message: toGroupMessage(db.prepare('SELECT * FROM group_messages WHERE id = ?').get(info.lastInsertRowid), me) });
});

// POST /api/groups/:id/members — добавить участника (может любой участник группы).
groupsRouter.post('/:id/members', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  if (!isMember(gid, me)) return res.status(403).json({ error: 'Вы не участник группы' });
  const uid = Number(req.body?.userId);
  if (!Number.isInteger(uid) || !db.prepare('SELECT 1 FROM users WHERE id = ?').get(uid))
    return res.status(400).json({ error: 'Пользователь не найден' });
  db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, last_read, joined_at) VALUES (?, ?, 0, ?)')
    .run(gid, uid, new Date().toISOString());
  res.json({ ok: true, group: groupInfo(db.prepare('SELECT * FROM groups WHERE id = ?').get(gid)) });
});

// DELETE /api/groups/:id/members/:userId — удалить участника (только владелец, и не себя).
groupsRouter.delete('/:id/members/:userId', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  const uid = Number(req.params.userId);
  if (!Number.isInteger(gid) || !Number.isInteger(uid)) return res.status(400).json({ error: 'Неверный id' });
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid);
  if (!g) return res.status(404).json({ error: 'Группа не найдена' });
  if (g.owner_id !== me) return res.status(403).json({ error: 'Удалять участников может только создатель' });
  if (uid === me) return res.status(400).json({ error: 'Нельзя удалить себя — используйте «Покинуть»' });
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(gid, uid);
  res.json({ ok: true });
});

// DELETE /api/groups/:id/leave — покинуть группу. Если уходит владелец — передаём
// владение старейшему участнику; если никого не осталось — удаляем группу.
groupsRouter.delete('/:id/leave', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid);
  if (!g) return res.status(404).json({ error: 'Группа не найдена' });
  if (!isMember(gid, me)) return res.status(403).json({ error: 'Вы не участник' });

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(gid, me);
  const rest = db.prepare('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY joined_at ASC LIMIT 1').get(gid);
  if (!rest) {
    db.prepare('DELETE FROM group_messages WHERE group_id = ?').run(gid);
    db.prepare('DELETE FROM groups WHERE id = ?').run(gid);
  } else if (g.owner_id === me) {
    db.prepare('UPDATE groups SET owner_id = ? WHERE id = ?').run(rest.user_id, gid);
  }
  res.json({ ok: true });
});

// GET /api/groups/:id — инфо о группе + список участников.
groupsRouter.get('/:id', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  if (!isMember(gid, me)) return res.status(403).json({ error: 'Вы не участник группы' });
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid);
  if (!g) return res.status(404).json({ error: 'Группа не найдена' });
  const members = db
    .prepare('SELECT u.* FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY u.name')
    .all(gid)
    .map(toChatUser);
  res.json({ group: groupInfo(g), members });
});

// PATCH /api/groups/:id — переименовать группу (только владелец).
groupsRouter.patch('/:id', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid);
  if (!g) return res.status(404).json({ error: 'Группа не найдена' });
  if (g.owner_id !== me) return res.status(403).json({ error: 'Переименовать может только создатель' });
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Название не может быть пустым' });
  if (name.length > 60) return res.status(400).json({ error: 'Название слишком длинное' });
  db.prepare('UPDATE groups SET name = ?, letter = ? WHERE id = ?').run(name, name[0].toUpperCase(), gid);
  res.json({ group: groupInfo(db.prepare('SELECT * FROM groups WHERE id = ?').get(gid)) });
});

// DELETE /api/groups/:id — удалить группу целиком (только владелец).
groupsRouter.delete('/:id', (req, res) => {
  const me = req.userId;
  const gid = Number(req.params.id);
  if (!Number.isInteger(gid)) return res.status(400).json({ error: 'Неверный id' });
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid);
  if (!g) return res.status(404).json({ error: 'Группа не найдена' });
  if (g.owner_id !== me) return res.status(403).json({ error: 'Удалить группу может только создатель' });
  const del = db.transaction(() => {
    db.prepare('DELETE FROM group_messages WHERE group_id = ?').run(gid);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(gid);
    db.prepare('DELETE FROM groups WHERE id = ?').run(gid);
  });
  del();
  res.json({ ok: true, deleted: gid });
});
