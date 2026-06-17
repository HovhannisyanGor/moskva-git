import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

// Папка для файла базы — создаём, если её ещё нет.
const dir = dirname(config.dbPath);
if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

// Подключаемся к базе-файлу. Если файла нет — он создастся автоматически.
export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL'); // быстрее и надёжнее при параллельных запросах

// Создаём таблицы при первом запуске.
// IF NOT EXISTS — значит повторный запуск ничего не сломает.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    handle        TEXT    UNIQUE NOT NULL,         -- ник, например term1x
    name          TEXT    NOT NULL,                -- отображаемое имя
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,                -- пароль храним только в виде хеша
    color         TEXT    NOT NULL DEFAULT '#378ADD',
    letter        TEXT    NOT NULL DEFAULT '?',
    bio           TEXT    NOT NULL DEFAULT '',
    city          TEXT    NOT NULL DEFAULT 'Москва',
    created_at    TEXT    NOT NULL
  );
`);

// На будущее: когда добавим вход через Yandex/VK/SMS, заведём отдельную таблицу
// auth_identities (user_id, provider, identifier) и таблицу users менять не придётся.
