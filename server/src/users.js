import { db } from './db.js';
import { config } from './config.js';

// Готовим данные пользователя для отправки на фронт: убираем поле с паролем,
// чтобы хеш пароля никогда не уходил наружу.
export function toPublicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

// Если email пользователя есть в ADMIN_EMAILS, гарантируем ему роль admin.
// Нужно на случай, когда администратор регистрируется уже после старта сервера
// (стартовый бутстрап в db.js застаёт только тех, кто уже был в базе).
// Меняет строку на месте и возвращает её же.
export function syncAdminRole(row) {
  if (!row) return row;
  if (config.adminEmails.includes(row.email) && row.role !== 'admin') {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(row.id);
    row.role = 'admin';
  }
  return row;
}

// Пользователь считается «онлайн», если был активен недавно (в пределах окна).
const ONLINE_WINDOW_MS = 60 * 1000; // 60 секунд
export function isOnline(row) {
  if (!row?.last_seen) return false;
  const t = new Date(row.last_seen).getTime();
  return Number.isFinite(t) && Date.now() - t < ONLINE_WINDOW_MS;
}

// Краткие данные собеседника для чатов и поиска (без email и пароля).
export function toChatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    color: row.color,
    letter: row.letter,
    avatar: row.avatar || '',
    // Если пользователь скрыл свой онлайн (приватность) — показываем «не в сети».
    online: row.show_online === 0 ? false : isOnline(row),
  };
}
