// Вложения сообщений и постов: несколько фото и файлов в одной записи.
//
// Храним JSON-массивом в колонке `attachments`. Для обратной совместимости
// параллельно кладём первое фото в старую колонку `image` — её читают старые
// клиенты и сайт (пока он не обновлён на галерею).
//
// Элемент: { type: 'image' | 'file', data: 'data:...;base64,...', name?, mime? }

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
      if (data.length > MAX_ONE) continue;
      const type = a?.type === 'file' ? 'file' : 'image';
      if (type === 'image') {
        if (!IMAGE_RE.test(data)) continue;      // не картинка разрешённого формата — мимо
        out.push({ type: 'image', data });
      } else {
        const m = FILE_RE.exec(data);
        if (!m || BLOCKED_MIME.test(m[1])) continue; // не файл / опасный тип — мимо
        out.push({
          type: 'file',
          data,
          name: String(a?.name || 'файл').slice(0, 120),
          mime: m[1].slice(0, 100),
        });
      }
    }
  }
  // Старый клиент прислал одно фото полем image — заворачиваем во вложение.
  if (out.length === 0 && typeof legacyImage === 'string' && IMAGE_RE.test(legacyImage)) {
    out.push({ type: 'image', data: legacyImage });
  }
  return out;
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
