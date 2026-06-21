import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js';
import { toPublicUser, syncAdminRole } from '../users.js';

export const authRouter = Router();

// Палитра цветов для аватарок — назначаем новому пользователю случайный цвет.
const COLORS = ['#FA3C3C', '#378ADD', '#3FAE6E', '#9B7FE6', '#D69A1E', '#E0568A'];

// --- Защита входа от перебора паролей (простой in-memory rate-limit по IP) ---
const loginAttempts = new Map(); // ip -> { count, first, blockedUntil }
const MAX_LOGIN_ATTEMPTS = 6; // столько неверных попыток в окне — и блок
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // окно подсчёта
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // на сколько блокируем

function loginRateKey(req) {
  return String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
}
function loginBlockedMinutes(req) {
  const rec = loginAttempts.get(loginRateKey(req));
  if (rec?.blockedUntil && rec.blockedUntil > Date.now())
    return Math.ceil((rec.blockedUntil - Date.now()) / 60000);
  return 0;
}
function noteFailedLogin(req) {
  const key = loginRateKey(req);
  const now = Date.now();
  const rec = loginAttempts.get(key) || { count: 0, first: now };
  if (now - rec.first > LOGIN_WINDOW_MS) {
    rec.count = 0;
    rec.first = now;
  }
  rec.count += 1;
  if (rec.count >= MAX_LOGIN_ATTEMPTS) rec.blockedUntil = now + LOGIN_BLOCK_MS;
  loginAttempts.set(key, rec);
}
function clearLoginAttempts(req) {
  loginAttempts.delete(loginRateKey(req));
}

// POST /api/auth/register — регистрация нового пользователя.
authRouter.post('/register', (req, res) => {
  // Приводим к строке и убираем пробелы по краям — чтобы кривой ввод не ронял сервер.
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const handle = String(req.body?.handle ?? '').trim();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  // --- Проверяем входные данные ---
  if (!name || !email || !handle || !password)
    return res.status(400).json({ error: 'Заполните имя, email, ник и пароль' });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ error: 'Похоже, email неправильный' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle))
    return res.status(400).json({ error: 'Ник: 3–20 символов, латиница, цифры или _' });

  // --- Проверяем, что email и ник ещё не заняты ---
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
  if (db.prepare('SELECT 1 FROM users WHERE handle = ?').get(handle))
    return res.status(409).json({ error: 'Этот ник уже занят' });

  // --- Создаём пользователя ---
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  let info;
  try {
    info = db
      .prepare(`
        INSERT INTO users (handle, name, email, password_hash, color, letter, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        handle,
        name,
        email,
        hashPassword(password),
        color,
        name[0].toUpperCase(),
        new Date().toISOString(),
      );
  } catch (e) {
    // Подстраховка: уникальный индекс не даст создать дубль (на случай гонки).
    if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: 'Email или ник уже заняты' });
    throw e; // прочие ошибки уйдут в общий обработчик ошибок
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  syncAdminRole(user); // если этот email в ADMIN_EMAILS — сразу делаем админом
  const token = signToken(user);
  res.status(201).json({ token, user: toPublicUser(user) });
});

// POST /api/auth/login — вход по email и паролю.
authRouter.post('/login', (req, res) => {
  // Слишком много неудачных попыток с этого IP — временно не пускаем.
  const blockedMins = loginBlockedMinutes(req);
  if (blockedMins > 0)
    return res
      .status(429)
      .json({ error: `Слишком много попыток входа. Попробуйте через ${blockedMins} мин.` });

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password)
    return res.status(400).json({ error: 'Введите email и пароль' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Ответ одинаковый и при неверном email, и при неверном пароле —
  // чтобы не подсказывать злоумышленнику, какой email зарегистрирован.
  if (!user || !verifyPassword(password, user.password_hash)) {
    noteFailedLogin(req);
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  clearLoginAttempts(req); // успешный вход — сбрасываем счётчик
  syncAdminRole(user); // email мог попасть в ADMIN_EMAILS уже после регистрации
  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

// GET /api/auth/me — узнать, кто я (по токену). Защищённый маршрут.
authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  syncAdminRole(user); // поддерживаем роль в актуальном состоянии
  res.json({ user: toPublicUser(user) });
});

// PATCH /api/auth/me — обновить свой профиль. Меняем только разрешённые поля;
// что не прислали — оставляем как было. Email не трогаем (это логин).
authRouter.patch('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const b = req.body || {};
  const name = b.name !== undefined ? String(b.name).trim() : user.name;
  const bio = b.bio !== undefined ? String(b.bio).trim() : user.bio;
  const city = b.city !== undefined ? String(b.city).trim() : user.city;
  const color = b.color !== undefined ? String(b.color).trim() : user.color;
  const letter = b.letter !== undefined ? String(b.letter).trim().slice(0, 2) : user.letter;
  const handle = b.handle !== undefined ? String(b.handle).trim() : user.handle;
  const avatar = b.avatar !== undefined ? String(b.avatar) : user.avatar;

  if (!name) return res.status(400).json({ error: 'Имя не может быть пустым' });
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle))
    return res.status(400).json({ error: 'Ник: 3–20 символов, латиница, цифры или _' });
  // Аватар-фото: либо пусто, либо корректный data:image небольшого размера (~1 МБ).
  if (avatar && (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar) || avatar.length > 1_500_000))
    return res.status(400).json({ error: 'Картинка не подходит (формат или размер)' });

  // Ник занят кем-то другим?
  if (db.prepare('SELECT 1 FROM users WHERE handle = ? AND id != ?').get(handle, req.userId))
    return res.status(409).json({ error: 'Этот ник уже занят' });

  db.prepare('UPDATE users SET name = ?, bio = ?, city = ?, color = ?, letter = ?, handle = ?, avatar = ? WHERE id = ?')
    .run(name, bio, city, color, letter, handle, avatar, req.userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: toPublicUser(updated) });
});
