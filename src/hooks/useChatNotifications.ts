import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ChatListItem } from '../utils/api';

export interface ChatToast {
  id: number; // уникальный, чтобы перезапускать анимацию/таймер
  name: string;
  text: string;
  userId: number;
}

const NOTIF_KEY = 'localee_notifications';

// Включены ли уведомления о сообщениях (тумблер в меню профиля). По умолчанию — да.
function messagesEnabled(): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(NOTIF_KEY) || 'null');
    return !v || v.messages !== false;
  } catch {
    return true;
  }
}

/**
 * Опрашивает список чатов на уровне всего приложения (даже когда ты не на странице
 * чатов): даёт общий счётчик непрочитанных для бейджа и ловит новые входящие
 * сообщения, чтобы показать всплывашку.
 *
 * @param enabled  опрашивать только когда пользователь вошёл
 * @param mutedUserId  чат, который сейчас открыт — по нему всплывашку не показываем
 */
export function useChatNotifications(enabled: boolean, mutedUserId: number | null) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [toast, setToast] = useState<ChatToast | null>(null);
  const prevUnread = useRef<Map<number, number> | null>(null);
  // Открытый чат держим в ref, чтобы опрос читал актуальное значение,
  // но не перезапускался при каждой смене активного чата.
  const mutedRef = useRef(mutedUserId);
  useEffect(() => {
    mutedRef.current = mutedUserId;
  }, [mutedUserId]);

  // Один проход опроса. Считаем непрочитанные И в личных чатах, И в группах —
  // раньше счётчик в меню игнорировал группы и не сходился со списком чатов.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const aliveRef = useRef(true);

  const tick = useCallback(async () => {
    if (!enabledRef.current) return;
    const [dmRes, grRes] = await Promise.allSettled([api.chatList(), api.groupList()]);
    if (!aliveRef.current || !enabledRef.current) return;
    const dms: ChatListItem[] = dmRes.status === 'fulfilled' ? dmRes.value : [];
    const groupsUnread =
      grRes.status === 'fulfilled' ? grRes.value.reduce((s, g) => s + (g.unread || 0), 0) : 0;
    // Если оба запроса упали — не трогаем счётчик (не обнуляем зря).
    if (dmRes.status === 'rejected' && grRes.status === 'rejected') return;

    setTotalUnread(dms.reduce((sum, c) => sum + c.unread, 0) + groupsUnread);

    // Сравниваем с прошлым снимком ЛС: где непрочитанных стало больше — там новое сообщение.
    const cur = new Map(dms.map((c) => [c.user.id, c.unread]));
    if (prevUnread.current && messagesEnabled()) {
      for (const c of dms) {
        const before = prevUnread.current.get(c.user.id) ?? 0;
        const isNew = c.unread > before && c.last && !c.last.fromMe;
        if (isNew && c.user.id !== mutedRef.current) {
          setToast({ id: Date.now(), name: c.user.name, text: c.last!.text, userId: c.user.id });
        }
      }
    }
    prevUnread.current = cur;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    if (!enabled) {
      // Вышли из аккаунта — сбрасываем счётчик и снимок.
      prevUnread.current = null;
      setTotalUnread(0);
      return;
    }
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      aliveRef.current = false;
      clearInterval(t);
    };
  }, [enabled, tick]);

  // Всплывашка сама прячется через 4 секунды.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // refresh() — позвать опрос немедленно (например, сразу после прочтения чата).
  return { totalUnread, toast, dismissToast: () => setToast(null), refresh: tick };
}
