import 'dotenv/config';

// Все настройки берём из переменных окружения (файл .env), с разумными значениями
// по умолчанию. Благодаря этому ОДИН И ТОТ ЖЕ код работает и локально, и на хостинге —
// меняется только файл .env, а не сам код.
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || './data/localee.db',
  // Каким сайтам разрешено обращаться к API. Можно указать несколько адресов
  // через запятую (например, с www и без). '*' — разрешить всем (для локалки).
  corsOrigin: (() => {
    const raw = (process.env.CORS_ORIGIN || '*').trim();
    if (raw === '*') return '*';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  })(),
  // Email-адреса администраторов (через запятую). Эти пользователи автоматически
  // получают роль admin при старте сервера и при входе. Например:
  //   ADMIN_EMAILS=me@example.com, boss@example.com
  adminEmails: String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  // --- Файловое хранилище картинок и документов ---
  // Раньше всё лежало в базе строкой base64: два поста с фото раздули её с
  // 1,6 до 6,9 МБ. Теперь файлы живут на диске, а в базе остаётся ссылка.
  // Папка рядом с базой — чтобы бэкап забирал и то, и другое.
  uploadDir: process.env.UPLOAD_DIR || './data/uploads',
  // Адрес, по которому файлы видны снаружи. В базу пишем полную ссылку:
  // тогда оба клиента показывают её как обычную картинку, без единой правки
  // в местах отрисовки. Локально это http://localhost:4000.
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 4000}`)
    .replace(/\/+$/, ''),
};
