import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { config } from './config.js';

// Файловое хранилище картинок и документов.
//
// Клиенты по-прежнему присылают base64 (менять формат запроса ради этого не
// стоит — сломались бы оба клиента сразу). Разница в том, что дальше base64 не
// едет в базу: мы сохраняем байты файлом, а в колонке остаётся обычная ссылка.
// Оба клиента умеют показывать http-ссылку как картинку, поэтому места
// отрисовки править не пришлось.
//
// Имя файла — sha256 его содержимого. Даёт две вещи бесплатно:
//   * одинаковые файлы не дублируются (переслал фото десять раз — файл один);
//   * содержимое по ссылке никогда не меняется, значит можно кешировать вечно.
// Раскладываем по подпапкам из первых двух символов хеша, чтобы в одной папке
// не скопились десятки тысяч файлов.

const ROOT = isAbsolute(config.uploadDir)
  ? config.uploadDir
  : join(process.cwd(), config.uploadDir);

export const UPLOAD_ROOT = ROOT;
export const UPLOAD_PREFIX = '/uploads';

// Расширение по MIME — только чтобы файл скачивался с понятным именем.
const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
};

const DATA_URL_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,(.*)$/s;

// Уже ссылка (а не base64)? Такие значения трогать не нужно.
export function isStoredUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}

// Сколько байт весит содержимое data-URL (без разбора самого base64).
export function dataUrlBytes(s) {
  const comma = typeof s === 'string' ? s.indexOf(',') : -1;
  if (comma < 0) return 0;
  return Math.floor(((s.length - comma - 1) * 3) / 4);
}

// Сохранить data-URL файлом. Возвращает { url, size, mime } либо null, если
// это не data-URL (например, уже ссылка или мусор).
// write: false — только посчитать адрес и размер, ничего не записывая
// (нужно пробному прогону миграции).
export function storeDataUrl(dataUrl, { write = true } = {}) {
  if (typeof dataUrl !== 'string') return null;
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) return null;

  const mime = m[1].toLowerCase();
  let bytes;
  try {
    bytes = Buffer.from(m[2], 'base64');
  } catch {
    return null;
  }
  if (!bytes.length) return null;

  const hash = createHash('sha256').update(bytes).digest('hex');
  const ext = EXT[mime] || 'bin';
  const rel = `${hash.slice(0, 2)}/${hash}.${ext}`;
  const full = join(ROOT, rel);

  // Файл с таким содержимым уже есть — просто переиспользуем.
  if (write && !existsSync(full)) {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, bytes);
  }

  return { url: `${config.publicUrl}${UPLOAD_PREFIX}/${rel}`, size: bytes.length, mime };
}

// Размер уже сохранённого файла по его ссылке (для миграции и статистики).
export function storedSize(url) {
  const i = String(url).indexOf(`${UPLOAD_PREFIX}/`);
  if (i < 0) return 0;
  const rel = String(url).slice(i + UPLOAD_PREFIX.length + 1);
  try {
    return statSync(join(ROOT, rel)).size;
  } catch {
    return 0;
  }
}

// Положить что угодно (base64 или уже готовую ссылку) и получить ссылку.
// Пустая строка остаётся пустой — это «нет картинки».
export function toStoredUrl(value) {
  if (!value) return '';
  if (isStoredUrl(value)) return value;
  const saved = storeDataUrl(value);
  return saved ? saved.url : '';
}
