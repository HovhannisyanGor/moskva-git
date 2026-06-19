import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './db.js';
import { syncAdminRole } from './users.js';

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
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный или просроченный токен' });
  }
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
