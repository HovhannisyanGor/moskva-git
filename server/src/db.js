import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';
import { PLACES as SEED_PLACES } from './data/places.js';

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

// Профиль (как в соцсетях): дата рождения, пол и интересы.
// birthdate хранится строкой 'YYYY-MM-DD' (или пусто, если не указана).
if (!userCols.some((c) => c.name === 'birthdate')) {
  db.exec("ALTER TABLE users ADD COLUMN birthdate TEXT NOT NULL DEFAULT ''");
}
// gender: '' (не указан) | 'male' | 'female' | 'other'.
if (!userCols.some((c) => c.name === 'gender')) {
  db.exec("ALTER TABLE users ADD COLUMN gender TEXT NOT NULL DEFAULT ''");
}
// interests: интересы/хобби через запятую, например 'кофе,музеи,музыка'.
if (!userCols.some((c) => c.name === 'interests')) {
  db.exec("ALTER TABLE users ADD COLUMN interests TEXT NOT NULL DEFAULT ''");
}
// Приватность: показывать ли год рождения (и возраст) другим. 1 = показывать.
if (!userCols.some((c) => c.name === 'show_birthyear')) {
  db.exec('ALTER TABLE users ADD COLUMN show_birthyear INTEGER NOT NULL DEFAULT 1');
}
// Обложка профиля (шапка, как «cover» в соцсетях). Хранится как data URL (или пусто).
if (!userCols.some((c) => c.name === 'cover')) {
  db.exec("ALTER TABLE users ADD COLUMN cover TEXT NOT NULL DEFAULT ''");
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
if (!msgCols.some((c) => c.name === 'image')) {
  db.exec("ALTER TABLE messages ADD COLUMN image TEXT NOT NULL DEFAULT ''"); // фото в сообщении (data URL, как в постах)
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

// --- Группы (чаты на несколько человек) ---
// Сама группа: название, цвет/буква для аватара, кто создал (owner) и токен для
// пригласительной ссылки.
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    color        TEXT    NOT NULL DEFAULT '#9B7FE6',
    letter       TEXT    NOT NULL DEFAULT 'G',
    owner_id     INTEGER NOT NULL,
    invite_token TEXT    NOT NULL,
    created_at   TEXT    NOT NULL
  );
`);
// Участники группы. last_read — id последнего прочитанного сообщения (для непрочитанных).
db.exec(`
  CREATE TABLE IF NOT EXISTS group_members (
    group_id   INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    last_read  INTEGER NOT NULL DEFAULT 0,
    joined_at  TEXT    NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );
`);
// Сообщения группы (с поддержкой «изменено» и ответов, как в личных чатах).
db.exec(`
  CREATE TABLE IF NOT EXISTS group_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id   INTEGER NOT NULL,
    sender_id  INTEGER NOT NULL,
    text       TEXT    NOT NULL,
    edited     INTEGER NOT NULL DEFAULT 0,
    reply_to   INTEGER,
    created_at TEXT    NOT NULL
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_gmsg_group ON group_messages(group_id)');
// Миграция: фото в групповых сообщениях (data URL, как в личных чатах и постах).
const gmsgCols = db.prepare('PRAGMA table_info(group_messages)').all();
if (!gmsgCols.some((c) => c.name === 'image')) {
  db.exec("ALTER TABLE group_messages ADD COLUMN image TEXT NOT NULL DEFAULT ''");
}
db.exec('CREATE INDEX IF NOT EXISTS idx_gmembers_user ON group_members(user_id)');

// Обращения в поддержку (форма «Написать в поддержку»). Видны админам в админке.
db.exec(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    text       TEXT    NOT NULL,
    resolved   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );
`);

// Пользовательские метки на карте: скопления людей, сходки, дрифт-гонки.
// Эфемерные — на фронте показываем только свежие (за последние сутки).
db.exec(`
  CREATE TABLE IF NOT EXISTS map_pins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    kind       TEXT    NOT NULL,
    note       TEXT    NOT NULL DEFAULT '',
    lat        REAL    NOT NULL,
    lng        REAL    NOT NULL,
    created_at TEXT    NOT NULL
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_pins_created ON map_pins(created_at)');

// --- Социальная лента: посты, лайки и комментарии ---
// Пост = текст и/или картинка (картинка хранится как data URL, как и аватары).
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    text       TEXT    NOT NULL DEFAULT '',
    image      TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)');

// Лайки: одна строка на пару (пост, пользователь) — нельзя лайкнуть дважды.
db.exec(`
  CREATE TABLE IF NOT EXISTS post_likes (
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );
`);

// Комментарии под постами.
db.exec(`
  CREATE TABLE IF NOT EXISTS post_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    text       TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_pcomments_post ON post_comments(post_id)');

// --- Достижения: посещённые места ---
// Раньше посещения лежали только у клиента (localStorage на сайте, UserDefaults
// в приложении), поэтому прогресс на сайте и в телефоне жил отдельно. Теперь
// хранится на сервере — оба клиента видят одно и то же.
// Сами значки и уровни НЕ храним: клиенты считают их из списка посещений по
// одинаковым правилам (badges.ts на сайте, Gamification.swift в приложении).
db.exec(`
  CREATE TABLE IF NOT EXISTS place_visits (
    user_id    INTEGER NOT NULL,
    place_id   INTEGER NOT NULL,
    note       TEXT    NOT NULL DEFAULT '',
    visited_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, place_id)
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_visits_user ON place_visits(user_id)');

// --- Места ---
// Раньше список мест был скопирован в двух клиентах (src/data/places.ts и
// Places.swift) и расходился при правках. Теперь источник правды один —
// server/src/data/places.js, отсюда он заливается в таблицу, а клиенты
// забирают её через GET /api/places.
// Массивы (теги, фотографии) храним строкой JSON: в SQLite нет типа «массив»,
// а заводить отдельные таблицы ради двух списков смысла нет.
db.exec(`
  CREATE TABLE IF NOT EXISTS places (
    id           INTEGER PRIMARY KEY,      -- НЕ автоинкремент: id зафиксированы
    name         TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    address      TEXT    NOT NULL DEFAULT '',
    lat          REAL    NOT NULL,
    lng          REAL    NOT NULL,
    price        INTEGER NOT NULL DEFAULT 0,
    duration     INTEGER NOT NULL DEFAULT 60,
    rating       REAL    NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    tags         TEXT    NOT NULL DEFAULT '[]',
    image_url    TEXT    NOT NULL DEFAULT '',
    photos       TEXT    NOT NULL DEFAULT '[]',
    opens_at     TEXT    NOT NULL DEFAULT '',
    closes_at    TEXT    NOT NULL DEFAULT '',
    ticket_url   TEXT    NOT NULL DEFAULT ''
  );
`);

// Заливаем список из файла при каждом старте: поправил places.js, перезапустил
// сервер — изменения на месте. Строки не удаляем, только добавляем и обновляем,
// чтобы случайная правка файла не снесла место, на которое ссылаются посещения.
const upsertPlace = db.prepare(`
  INSERT INTO places (id, name, category, description, address, lat, lng, price,
                      duration, rating, rating_count, tags, image_url, photos,
                      opens_at, closes_at, ticket_url)
  VALUES (@id, @name, @category, @description, @address, @lat, @lng, @price,
          @duration, @rating, @rating_count, @tags, @image_url, @photos,
          @opens_at, @closes_at, @ticket_url)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name, category = excluded.category,
    description = excluded.description, address = excluded.address,
    lat = excluded.lat, lng = excluded.lng, price = excluded.price,
    duration = excluded.duration, rating = excluded.rating,
    rating_count = excluded.rating_count, tags = excluded.tags,
    image_url = excluded.image_url, photos = excluded.photos,
    opens_at = excluded.opens_at, closes_at = excluded.closes_at,
    ticket_url = excluded.ticket_url
`);
db.transaction((list) => {
  for (const p of list) {
    upsertPlace.run({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      address: p.address ?? '',
      lat: p.lat,
      lng: p.lng,
      price: p.price ?? 0,
      duration: p.duration ?? 60,
      rating: p.rating ?? 0,
      rating_count: p.ratingCount ?? 0,
      tags: JSON.stringify(p.tags ?? []),
      image_url: p.imageUrl ?? '',
      photos: JSON.stringify(p.photos ?? []),
      opens_at: p.opensAt ?? '',
      closes_at: p.closesAt ?? '',
      ticket_url: p.ticketUrl ?? '',
    });
  }
})(SEED_PLACES);

// На будущее: когда добавим вход через Yandex/VK/SMS, заведём отдельную таблицу
// auth_identities (user_id, provider, identifier) и таблицу users менять не придётся.
