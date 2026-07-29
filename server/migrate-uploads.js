// Разовая миграция: картинки и документы из базы (base64) — в файлы на диске.
//
// Запуск:  node migrate-uploads.js          — перенести и ужать базу
//          node migrate-uploads.js --dry     — только показать, что будет
//
// Скрипт идемпотентный: значения, которые уже стали ссылками, пропускаются.
// Поэтому его можно спокойно запустить повторно.

import { db } from './src/db.js';
import { storeDataUrl, isStoredUrl, storedSize } from './src/storage.js';

const DRY = process.argv.includes('--dry');
const MB = 1048576;

let movedFiles = 0;
let movedBytes = 0;
let skipped = 0;

// Перенести одно значение-картинку. Возвращает новое значение (ссылку).
function moveValue(value) {
  if (!value) return value;
  if (isStoredUrl(value)) { skipped += 1; return value; }
  const saved = storeDataUrl(value, { write: !DRY });
  if (!saved) return value;         // не data-URL — оставляем как есть
  movedFiles += 1;
  movedBytes += saved.size;
  return saved.url;
}

// Перенести JSON-массив вложений.
function moveAttachments(json) {
  if (!json || json === '[]') return json;
  let list;
  try { list = JSON.parse(json); } catch { return json; }
  if (!Array.isArray(list) || list.length === 0) return json;

  const out = list.map((a) => {
    if (!a || typeof a.data !== 'string') return a;
    if (isStoredUrl(a.data)) {
      skipped += 1;
      return { ...a, size: a.size || storedSize(a.data) };
    }
    const saved = storeDataUrl(a.data, { write: !DRY });
    if (!saved) return a;
    movedFiles += 1;
    movedBytes += saved.size;
    return { ...a, data: saved.url, size: saved.size };
  });
  return JSON.stringify(out);
}

// Таблицы и колонки, где лежат картинки.
const PLAIN = [
  ['users', 'avatar'],
  ['users', 'cover'],
  ['posts', 'image'],
  ['messages', 'image'],
  ['group_messages', 'image'],
];
const JSON_COLS = [
  ['posts', 'attachments'],
  ['messages', 'attachments'],
  ['group_messages', 'attachments'],
];

function tableExists(t) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
}

function sizeBefore() {
  let total = 0;
  for (const [t, c] of [...PLAIN, ...JSON_COLS]) {
    if (!tableExists(t)) continue;
    total += db.prepare(`SELECT IFNULL(SUM(LENGTH(${c})), 0) AS b FROM ${t}`).get().b;
  }
  return total;
}

console.log(DRY ? '— пробный прогон, база не меняется —\n' : '— перенос —\n');
console.log('в колонках сейчас:', (sizeBefore() / MB).toFixed(2), 'МБ\n');

for (const [table, col] of PLAIN) {
  if (!tableExists(table)) continue;
  const rows = db.prepare(`SELECT id, ${col} AS v FROM ${table} WHERE ${col} != ''`).all();
  let changed = 0;
  const upd = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`);
  const run = db.transaction((list) => {
    for (const r of list) {
      const next = moveValue(r.v);
      if (next !== r.v) { changed += 1; if (!DRY) upd.run(next, r.id); }
    }
  });
  run(rows);
  console.log(`${table}.${col}: строк ${rows.length}, перенесено ${changed}`);
}

for (const [table, col] of JSON_COLS) {
  if (!tableExists(table)) continue;
  const rows = db.prepare(`SELECT id, ${col} AS v FROM ${table} WHERE LENGTH(${col}) > 2`).all();
  let changed = 0;
  const upd = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`);
  const run = db.transaction((list) => {
    for (const r of list) {
      const next = moveAttachments(r.v);
      if (next !== r.v) { changed += 1; if (!DRY) upd.run(next, r.id); }
    }
  });
  run(rows);
  console.log(`${table}.${col}: строк ${rows.length}, перенесено ${changed}`);
}

console.log('\nфайлов сохранено:', movedFiles, '| объём:', (movedBytes / MB).toFixed(2), 'МБ');
console.log('уже были ссылками (пропущено):', skipped);

if (!DRY) {
  console.log('в колонках осталось:', (sizeBefore() / MB).toFixed(2), 'МБ');
  // Без VACUUM файл базы не уменьшится: SQLite оставит освободившееся место
  // внутри файла под будущие записи.
  console.log('\nсжимаю файл базы (VACUUM)…');
  db.exec('VACUUM');
  console.log('готово');
} else {
  console.log('\n(пробный прогон — ничего не записано)');
}
