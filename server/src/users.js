// Готовим данные пользователя для отправки на фронт: убираем поле с паролем,
// чтобы хеш пароля никогда не уходил наружу.
export function toPublicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}
