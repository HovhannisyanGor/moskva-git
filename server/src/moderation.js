import { db } from './db.js';

// Модерация: на что можно пожаловаться, кто это может сделать и как устроен бан.

// Причины жалобы. Коды общие для сайта и приложения — подписи каждый клиент
// переводит у себя.
export const REASONS = ['spam', 'abuse', 'adult', 'violence', 'fake', 'other'];

const SNAPSHOT_MAX = 500;

// Описание каждого типа цели: где лежит, кто автор, что показать модератору и
// кому вообще видно эту запись (жаловаться на то, чего не видишь, нельзя).
const TARGETS = {
  post: {
    table: 'posts',
    author: 'user_id',
    snapshot: (r) => r.text || (r.attachments && r.attachments !== '[]' ? '[вложение]' : ''),
  },
  comment: {
    table: 'post_comments',
    author: 'user_id',
    snapshot: (r) => r.text,
  },
  message: {
    table: 'messages',
    author: 'sender_id',
    snapshot: (r) => r.text || (r.attachments && r.attachments !== '[]' ? '[вложение]' : ''),
    // Личная переписка: жаловаться может только её участник.
    canReport: (r, me) => r.sender_id === me || r.recipient_id === me,
  },
  group_message: {
    table: 'group_messages',
    author: 'sender_id',
    snapshot: (r) => r.text || (r.attachments && r.attachments !== '[]' ? '[вложение]' : ''),
    // Сообщение в группе видно только её участникам.
    canReport: (r, me) =>
      !!db
        .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
        .get(r.group_id, me),
  },
  pin: {
    table: 'map_pins',
    author: 'user_id',
    snapshot: (r) => r.note || r.kind,
  },
  user: {
    table: 'users',
    author: 'id',
    snapshot: (r) => `@${r.handle} — ${r.name}${r.bio ? ' · ' + r.bio : ''}`,
  },
};

export const TARGET_TYPES = Object.keys(TARGETS);

// Найти цель жалобы. Возвращает { authorId, snapshot } либо причину отказа.
export function resolveTarget(type, id, me) {
  const t = TARGETS[type];
  if (!t) return { error: 'Неизвестный тип жалобы', code: 'bad_target' };

  const row = db.prepare(`SELECT * FROM ${t.table} WHERE id = ?`).get(id);
  if (!row) return { error: 'Запись не найдена — возможно, её уже удалили', code: 'not_found' };

  if (t.canReport && !t.canReport(row, me))
    return { error: 'Нет доступа к этой записи', code: 'forbidden' };

  const authorId = row[t.author];
  if (authorId === me) return { error: 'Нельзя пожаловаться на себя', code: 'self' };

  return { authorId, snapshot: String(t.snapshot(row) ?? '').slice(0, SNAPSHOT_MAX) };
}

// Удалить запись, на которую пожаловались (решение модератора).
// Пользователя так не удаляем: для него есть бан и отдельная кнопка в админке.
export function deleteTarget(type, id) {
  const t = TARGETS[type];
  if (!t || type === 'user') return 0;
  return db.prepare(`DELETE FROM ${t.table} WHERE id = ?`).run(id).changes;
}

// --- Блокировка ---

// Разобрать состояние бана по строке пользователя. Временный бан, у которого
// вышел срок, считается снятым (и тут же чистится в базе, чтобы не проверять
// дату при каждом запросе).
export function banState(user) {
  const until = String(user?.banned_until || '');
  if (!until) return { banned: false };
  if (until !== 'forever' && Date.parse(until) <= Date.now()) {
    db.prepare("UPDATE users SET banned_until = '', ban_reason = '' WHERE id = ?").run(user.id);
    return { banned: false };
  }
  return {
    banned: true,
    forever: until === 'forever',
    until: until === 'forever' ? '' : until,
    reason: String(user?.ban_reason || ''),
  };
}

// Забанить: days = 0 или не задано — навсегда.
export function applyBan(userId, reason, days) {
  const until =
    days && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : 'forever';
  db.prepare('UPDATE users SET banned_until = ?, ban_reason = ? WHERE id = ?').run(
    until,
    String(reason || '').slice(0, 300),
    userId,
  );
  return until;
}

export function liftBan(userId) {
  db.prepare("UPDATE users SET banned_until = '', ban_reason = '' WHERE id = ?").run(userId);
}

// Текст для заблокированного — чтобы бан не выглядел поломкой приложения.
export function banMessage(state) {
  const till = state.forever
    ? 'навсегда'
    : `до ${new Date(state.until).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`;
  return state.reason
    ? `Аккаунт заблокирован ${till}. Причина: ${state.reason}`
    : `Аккаунт заблокирован ${till}.`;
}
