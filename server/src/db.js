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
    avatar        TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL
  );
`);

// Миграция: добавляем avatar в уже существующие базы (если колонки ещё нет).
const userCols = db.prepare('PRAGMA table_info(users)').all();
if (!userCols.some((c) => c.name === 'avatar')) {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''");
}

// Личные сообщения (чаты 1-на-1). Диалог = все сообщения между двумя пользователями.
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id    INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    text         TEXT    NOT NULL,
    read         INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id)');

// На будущее: когда добавим вход через Yandex/VK/SMS, заведём отдельную таблицу
// auth_identities (user_id, provider, identifier) и таблицу users менять не придётся.
