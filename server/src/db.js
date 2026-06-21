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

// Миграция: роль пользователя — 'user' (обычный) или 'admin' (администратор).
if (!userCols.some((c) => c.name === 'role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

// Миграция: время последней активности — для статуса «онлайн».
if (!userCols.some((c) => c.name === 'last_seen')) {
  db.exec("ALTER TABLE users ADD COLUMN last_seen TEXT NOT NULL DEFAULT ''");
}

// Приватность: показывать ли другим «в сети». 1 = показывать (по умолчанию).
if (!userCols.some((c) => c.name === 'show_online')) {
  db.exec('ALTER TABLE users ADD COLUMN show_online INTEGER NOT NULL DEFAULT 1');
}

// Бутстрап администраторов: всех, чьи email перечислены в ADMIN_EMAILS, повышаем
// до admin при старте. Безопасно гонять каждый раз. Роли, выданные внутри самой
// админки, не трогаем — понижаем только если так решит администратор вручную.
if (config.adminEmails.length) {
  const promote = db.prepare("UPDATE users SET role = 'admin' WHERE email = ? AND role != 'admin'");
  for (const email of config.adminEmails) promote.run(email);
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

// Миграции сообщений: редактирование, ответы (reply_to) и пересылка (forwarded_from).
const msgCols = db.prepare('PRAGMA table_info(messages)').all();
if (!msgCols.some((c) => c.name === 'edited')) {
  db.exec('ALTER TABLE messages ADD COLUMN edited INTEGER NOT NULL DEFAULT 0');
}
if (!msgCols.some((c) => c.name === 'reply_to')) {
  db.exec('ALTER TABLE messages ADD COLUMN reply_to INTEGER'); // id сообщения-оригинала (или NULL)
}
if (!msgCols.some((c) => c.name === 'forwarded_from')) {
  db.exec("ALTER TABLE messages ADD COLUMN forwarded_from TEXT NOT NULL DEFAULT ''"); // имя автора при пересылке
}

// Дружба между пользователями. Одна строка на пару: кто отправил заявку (requester)
// и кому (addressee). status: 'pending' (ждёт ответа) или 'accepted' (друзья).
db.exec(`
  CREATE TABLE IF NOT EXISTS friendships (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    addressee_id INTEGER NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'pending',
    created_at   TEXT    NOT NULL,
    UNIQUE(requester_id, addressee_id)
  );
`);

// На будущее: когда добавим вход через Yandex/VK/SMS, заведём отдельную таблицу
// auth_identities (user_id, provider, identifier) и таблицу users менять не придётся.
