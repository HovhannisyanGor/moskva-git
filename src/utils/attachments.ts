import type { Attachment } from './api';
import { fileToImage } from './avatar';

// Подготовка вложений на сайте. Правила намеренно повторяют серверные
// (server/src/attachments.js): сервер молча выбрасывает всё, что не прошло
// проверку, поэтому лучше отсеять здесь и сказать человеку, что не так.

export const MAX_ATTACHMENTS = 10; // столько же принимает сервер
// Сервер меряет ДЛИНУ data-URL (8 МБ). base64 раздувает файл примерно в 4/3,
// поэтому исходный файл должен быть заметно меньше — иначе вложение отвалится.
const MAX_FILE_BYTES = 6 * 1024 * 1024;
// Всё сообщение целиком должно пролезть в лимит тела запроса (nginx 25M,
// express 25mb). Держим запас, чтобы вместо загадочной ошибки 413 человек
// сразу увидел понятное предупреждение.
const MAX_TOTAL = 20 * 1024 * 1024;
// Эти типы сервер блокирует как вектор XSS.
const BLOCKED_MIME = /(text\/html|javascript|image\/svg)/i;

export class AttachmentError extends Error {}

// Суммарный вес уже выбранных вложений (по длине data-URL).
export function totalSize(list: Attachment[]): number {
  return list.reduce((sum, a) => sum + a.data.length, 0);
}

// Фото: пережимаем до 1400px — как в приложении, чтобы вложения на обоих
// клиентах весили одинаково. Канвас всегда отдаёт image/jpeg, а его сервер
// принимает.
export async function imageToAttachment(file: File): Promise<Attachment> {
  try {
    return { type: 'image', data: await fileToImage(file, 1400, 0.82) };
  } catch {
    throw new AttachmentError('imageError');
  }
}

// Файл: читаем как есть в data-URL.
export function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) return reject(new AttachmentError('tooBig'));
    // У файла без известного расширения браузер оставляет type пустым, и
    // получается «data:;base64,…» — такое сервер не примет. Подставляем
    // нейтральный тип, иначе вложение исчезло бы без объяснений.
    const mime = file.type || 'application/octet-stream';
    if (BLOCKED_MIME.test(mime)) return reject(new AttachmentError('blockedType'));

    const reader = new FileReader();
    reader.onerror = () => reject(new AttachmentError('readError'));
    reader.onload = () => {
      const raw = String(reader.result || '');
      // Пересобираем префикс сами: у пустого file.type он был бы битым.
      const comma = raw.indexOf(',');
      if (comma < 0) return reject(new AttachmentError('readError'));
      const data = `data:${mime};base64,${raw.slice(comma + 1)}`;
      if (data.length > 8 * 1024 * 1024) return reject(new AttachmentError('tooBig'));
      resolve({ type: 'file', data, name: file.name.slice(0, 120), mime: mime.slice(0, 100) });
    };
    reader.readAsDataURL(file);
  });
}

// Добавить выбранные файлы к уже набранным. Возвращает новый список и ключ
// ошибки для перевода (если что-то не поместилось).
export async function addFiles(
  current: Attachment[],
  files: File[],
  kind: 'image' | 'file',
): Promise<{ list: Attachment[]; error?: string }> {
  const list = [...current];
  let error: string | undefined;

  for (const file of files) {
    if (list.length >= MAX_ATTACHMENTS) {
      error = 'tooMany';
      break;
    }
    try {
      const att = kind === 'image' ? await imageToAttachment(file) : await fileToAttachment(file);
      if (totalSize(list) + att.data.length > MAX_TOTAL) {
        error = 'tooHeavy';
        break;
      }
      list.push(att);
    } catch (e) {
      error = e instanceof AttachmentError ? e.message : 'readError';
    }
  }
  return { list, error };
}

// Сколько весит вложение. У новых записей сервер присылает size (файл лежит на
// диске, и по ссылке размер не посчитать). У старых в data ещё base64 — там
// считаем по длине строки.
export function attachmentBytes(a: Attachment): number {
  if (typeof a.size === 'number' && a.size > 0) return a.size;
  if (!a.data.startsWith('data:')) return 0;
  const comma = a.data.indexOf(',');
  return comma < 0 ? 0 : Math.round(((a.data.length - comma - 1) * 3) / 4);
}

// Читаемый размер для карточки вложения: «1,2 MB».
export function humanSize(bytes: number, locale: string): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}
