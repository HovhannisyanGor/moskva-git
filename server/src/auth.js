import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './db.js';
import { syncAdminRole } from './users.js';
import { banState, banMessage } from './moderation.js';

// Пароль никогда не храним в открытом виде — только его «хеш» (необратимый отпечаток).
export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}
export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// Токен — это «пропуск» пользователя. Внутрь кладём только id.
export function signToken(user) {
  return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '30d' });
}

// Middleware: проверяет «пропуск» в заголовке Authorization у защищённых маршрутов.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Нужен вход' });

  // Разбор токена — отдельно от работы с базой: иначе ошибка запроса к БД
  // выглядела бы как «неверный токен» и увела бы отладку не туда.
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Неверный или просроченный токен' });
  }

  const user = db
    .prepare('SELECT id, banned_until, ban_reason FROM users WHERE id = ?')
    .get(payload.id);
  // Токен ещё живой, а пользователя уже нет (удалили аккаунт) — считаем, что входа нет.
  if (!user) return res.status(401).json({ error: 'Нужен вход' });

  // Бан проверяем здесь, в единственной общей точке: так он закрывает СРАЗУ всё
  // (посты, сообщения, метки, реакции), и про новый маршрут нельзя забыть.
  const ban = banState(user);
  if (ban.banned) {
    return res.status(403).json({
      error: banMessage(ban),
      code: 'banned',
      bannedUntil: ban.until,
      forever: !!ban.forever,
    });
  }

  req.userId = payload.id;
  // Отмечаем активность — для статуса «онлайн». Дёшево: один UPDATE по id.
  db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(new Date().toISOString(), payload.id);
  next();
}

// Middleware: пускает дальше только администраторов. Ставится ПОСЛЕ requireAuth,
// поэтому req.userId уже известен. Заодно подкладывает строку пользователя в req.user.
export function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'Нужен вход' });
  syncAdminRole(user); // вдруг email добавили в ADMIN_EMAILS уже после регистрации
  if (user.role !== 'admin')
    return res.status(403).json({ error: 'Доступ только для администраторов' });
  req.user = user;
  next();
}
