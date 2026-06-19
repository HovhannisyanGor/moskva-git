import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!enabled) {
      // Вышли из аккаунта — нижняя навигация всё равно не показывается,
      // а при следующем входе первый же опрос обновит счётчик.
      prevUnread.current = null;
      return;
    }
    let alive = true;

    const tick = async () => {
      let list: ChatListItem[];
      try {
        list = await api.chatList();
      } catch {
        return; // молча — это фоновый опрос
      }
      if (!alive) return;

      setTotalUnread(list.reduce((sum, c) => sum + c.unread, 0));

      // Сравниваем с прошлым снимком: где непрочитанных стало больше — там новое сообщение.
      const cur = new Map(list.map((c) => [c.user.id, c.unread]));
      if (prevUnread.current && messagesEnabled()) {
        for (const c of list) {
          const before = prevUnread.current.get(c.user.id) ?? 0;
          const isNew = c.unread > before && c.last && !c.last.fromMe;
          if (isNew && c.user.id !== mutedRef.current) {
            setToast({ id: Date.now(), name: c.user.name, text: c.last!.text, userId: c.user.id });
          }
        }
      }
      prevUnread.current = cur;
    };

    tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);

  // Всплывашка сама прячется через 4 секунды.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return { totalUnread, toast, dismissToast: () => setToast(null) };
}
