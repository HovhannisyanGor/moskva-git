// Вложения сообщений и постов: несколько фото и файлов в одной записи.
//
// Храним JSON-массивом в колонке `attachments`. Для обратной совместимости
// параллельно кладём первое фото в старую колонку `image` — её читают старые
// клиенты и сайт (пока он не обновлён на галерею).
//
// Элемент: { type: 'image' | 'file', data: 'data:...;base64,...', name?, mime? }

const MAX_ATTACHMENTS = 10;
const MAX_ONE = 8 * 1024 * 1024; // ~8 МБ на одно вложение (base64)

// Разобрать то, что прислал клиент. legacyImage — старое одиночное поле image
// (если клиент шлёт по-старому). Возвращает нормализованный массив.
export function parseIncomingAttachments(raw, legacyImage = '') {
  const out = [];
  if (Array.isArray(raw)) {
    for (const a of raw.slice(0, MAX_ATTACHMENTS)) {
      const data = typeof a?.data === 'string' ? a.data : '';
      if (!data.startsWith('data:') || data.length > MAX_ONE) continue;
      const type = a?.type === 'file' ? 'file' : 'image';
      const item = { type, data };
      if (type === 'file') {
        item.name = String(a?.name || 'файл').slice(0, 120);
        item.mime = String(a?.mime || '').slice(0, 100);
      }
      out.push(item);
    }
  }
  // Старый клиент прислал одно фото полем image — заворачиваем во вложение.
  if (out.length === 0 && typeof legacyImage === 'string' && legacyImage.startsWith('data:')) {
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
