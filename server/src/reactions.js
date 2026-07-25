import { db } from './db.js';

// Реакции на сообщения — общий код для личных ('dm') и групповых ('group') чатов.
// Набор эмодзи ограничен: не «свободный ввод», а фиксированные реакции как в Telegram.
export const REACTION_EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

// Реакции одного сообщения, сгруппированные по эмодзи: [{ emoji, count, mine }].
export function reactionsFor(scope, messageId, me) {
  const rows = db
    .prepare('SELECT emoji, user_id FROM message_reactions WHERE scope = ? AND message_id = ?')
    .all(scope, messageId);
  const byEmoji = new Map();
  for (const r of rows) {
    const cur = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
    cur.count += 1;
    if (r.user_id === me) cur.mine = true;
    byEmoji.set(r.emoji, cur);
  }
  return [...byEmoji.values()];
}

// Поставить/сменить реакцию. Тот же эмодзи повторно — снять (toggle).
export function setReaction(scope, messageId, me, emoji) {
  if (!REACTION_EMOJIS.includes(emoji)) return false;
  const existing = db
    .prepare('SELECT emoji FROM message_reactions WHERE scope = ? AND message_id = ? AND user_id = ?')
    .get(scope, messageId, me);
  if (existing && existing.emoji === emoji) {
    db.prepare('DELETE FROM message_reactions WHERE scope = ? AND message_id = ? AND user_id = ?')
      .run(scope, messageId, me);
  } else {
    db.prepare(
      `INSERT INTO message_reactions (scope, message_id, user_id, emoji) VALUES (?, ?, ?, ?)
       ON CONFLICT(scope, message_id, user_id) DO UPDATE SET emoji = excluded.emoji`
    ).run(scope, messageId, me, emoji);
  }
  return true;
}

export function clearReaction(scope, messageId, me) {
  db.prepare('DELETE FROM message_reactions WHERE scope = ? AND message_id = ? AND user_id = ?')
    .run(scope, messageId, me);
}
