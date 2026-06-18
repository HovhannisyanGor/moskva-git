// Готовим данные пользователя для отправки на фронт: убираем поле с паролем,
// чтобы хеш пароля никогда не уходил наружу.
export function toPublicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
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
  };
}
