import 'dotenv/config';

// Все настройки берём из переменных окружения (файл .env), с разумными значениями
// по умолчанию. Благодаря этому ОДИН И ТОТ ЖЕ код работает и локально, и на хостинге —
// меняется только файл .env, а не сам код.
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || './data/localee.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
