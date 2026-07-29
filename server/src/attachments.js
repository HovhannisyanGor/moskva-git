import { storeDataUrl, storedSize, isStoredUrl, UPLOAD_PREFIX } from './storage.js';
import { config } from './config.js';

// Вложения сообщений и постов: несколько фото и файлов в одной записи.
//
// Храним JSON-массивом в колонке `attachments`. Для обратной совместимости
// параллельно кладём первое фото в старую колонку `image`.
//
// Элемент: { type: 'image' | 'file', data: 'https://…/uploads/…', name?, mime?, size? }
//
// В `data` лежит ССЫЛКА, а не base64. Клиенты по-прежнему присылают base64
// (менять формат запроса ради этого не стоило бы — сломались бы оба клиента),
// но дальше он не едет в базу: файл сохраняется на диск, а в записи остаётся
// адрес. Старые записи с data-URL продолжают работать — оба клиента показывают
// и то, и другое.

const MAX_ATTACHMENTS = 10;
const MAX_ONE = 8 * 1024 * 1024; // ~8 МБ на одно вложение (base64)
// Фото — только эти форматы (чтобы под видом «картинки» не залили что попало).
const IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
// Файл — любой data:...;base64, но не «активные» типы (html/js/svg — вектор XSS).
const FILE_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,/i;
const BLOCKED_MIME = /(text\/html|javascript|image\/svg)/i;

// Разобрать то, что прислал клиент. legacyImage — старое одиночное поле image
// (если клиент шлёт по-старому). Возвращает нормализованный, проверенный массив.
export function parseIncomingAttachments(raw, legacyImage = '') {
  const out = [];
  if (Array.isArray(raw)) {
    for (const a of raw.slice(0, MAX_ATTACHMENTS)) {
      const data = typeof a?.data === 'string' ? a.data : '';
      const type = a?.type === 'file' ? 'file' : 'image';

      // Клиент прислал ссылку на уже сохранённый файл (пересылка, повторная
      // отправка) — принимаем как есть. Только СВОИ ссылки: иначе через это
      // поле можно было бы подсунуть чужой адрес и заставить клиентов его
      // грузить.
      if (isOwnUpload(data)) {
        out.push(
          type === 'image'
            ? { type: 'image', data, size: Number(a?.size) || storedSize(data) }
            : {
                type: 'file',
                data,
                name: String(a?.name || 'файл').slice(0, 120),
                mime: String(a?.mime || '').slice(0, 100),
                size: Number(a?.size) || storedSize(data),
              },
        );
        continue;
      }

      if (data.length > MAX_ONE) continue;
      // Проверяем ДО сохранения: на диск не должно попадать ничего, что не
      // прошло бы валидацию.
      if (type === 'image') {
        if (!IMAGE_RE.test(data)) continue;      // не картинка разрешённого формата — мимо
        const saved = storeDataUrl(data);
        if (!saved) continue;
        out.push({ type: 'image', data: saved.url, size: saved.size });
      } else {
        const m = FILE_RE.exec(data);
        if (!m || BLOCKED_MIME.test(m[1])) continue; // не файл / опасный тип — мимо
        const saved = storeDataUrl(data);
        if (!saved) continue;
        out.push({
          type: 'file',
          data: saved.url,
          name: String(a?.name || 'файл').slice(0, 120),
          mime: m[1].slice(0, 100),
          size: saved.size,
        });
      }
    }
  }
  // Старый клиент прислал одно фото полем image — заворачиваем во вложение.
  if (out.length === 0 && typeof legacyImage === 'string') {
    if (isOwnUpload(legacyImage)) {
      out.push({ type: 'image', data: legacyImage, size: storedSize(legacyImage) });
    } else if (IMAGE_RE.test(legacyImage)) {
      const saved = storeDataUrl(legacyImage);
      if (saved) out.push({ type: 'image', data: saved.url, size: saved.size });
    }
  }
  return out;
}

// Ссылка ведёт в наше хранилище? Чужие адреса не принимаем.
function isOwnUpload(s) {
  return isStoredUrl(s) && s.startsWith(`${config.publicUrl}${UPLOAD_PREFIX}/`);
}

export function serializeAttachments(list) {
  return JSON.stringify(Array.isArray(list) ? list : []);
}

// Первое фото — в старую колонку image (для сайта/старых клиентов).
export function firstImage(list) {
  const img = (list || []).find((a) => a.type === 'image');
  return img ? img.data : '';
}

// Достать вложения из строки БД: колонка attachments (JSON) или, если пусто,
// старое одиночное image.
export function readAttachments(row) {
  let list = [];
  try {
    list = JSON.parse(row.attachments || '[]');
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  if (list.length === 0 && row.image) list = [{ type: 'image', data: row.image }];
  return list;
}
