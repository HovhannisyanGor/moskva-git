import 'dotenv/config';

// Все настройки берём из переменных окружения (файл .env), с разумными значениями
// по умолчанию. Благодаря этому ОДИН И ТОТ ЖЕ код работает и локально, и на хостинге —
// меняется только файл .env, а не сам код.
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || './data/localee.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Email-адреса администраторов (через запятую). Эти пользователи автоматически
  // получают роль admin при старте сервера и при входе. Например:
  //   ADMIN_EMAILS=me@example.com, boss@example.com
  adminEmails: String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};
