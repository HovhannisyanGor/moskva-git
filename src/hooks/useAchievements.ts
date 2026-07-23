import { useState, useCallback, useEffect, useRef } from 'react';
import type { AchievementsState } from '../types';
import { checkNewBadges } from '../data/badges';
import { api, getToken } from '../utils/api';

// Посещённые места хранятся на сервере — тот же список видит мобильное
// приложение. localStorage остался кешем: страница рисуется сразу и не пустеет
// при плохой сети. Значки считаются из посещений здесь же (badges.ts).
const STORAGE_KEY = 'localee_achievements';
// Отметка о разовом переносе прогресса, накопленного до появления сервера.
const MERGED_KEY = 'localee_achievements_merged';

function loadState(): AchievementsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Битый кеш — начинаем с пустого списка, сервер всё равно пришлёт свой.
  }
  return { visits: [], unlockedBadges: [] };
}

function saveState(state: AchievementsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Приватный режим или переполнено хранилище — кеш не обязателен.
  }
}

export function useAchievements(userId?: number) {
  const [state, setState] = useState<AchievementsState>(loadState);
  const [newBadge, setNewBadge] = useState<string | null>(null);
  // Чтобы не тянуть список повторно на каждый ререндер.
  const syncedFor = useRef<number | undefined>(undefined);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Забираем посещения с сервера при входе и при смене аккаунта.
  useEffect(() => {
    if (!userId || !getToken()) {
      syncedFor.current = undefined;
      return;
    }
    if (syncedFor.current === userId) return;
    syncedFor.current = userId;

    let cancelled = false;
    (async () => {
      try {
        const local = loadState();
        const merged = localStorage.getItem(MERGED_KEY) === '1';
        // Первый вход с сервером: поднимаем наверх то, что уже накоплено в браузере.
        const visits = merged ? await api.visits() : await api.mergeVisits(local.visits);
        if (!merged) localStorage.setItem(MERGED_KEY, '1');
        if (cancelled) return;
        // Значки пересчитываем от полученного списка, чтобы отметки, сделанные
        // в приложении, тоже открывали достижения на сайте.
        setState({ visits, unlockedBadges: checkNewBadges(visits, []) });
      } catch {
        // Сеть недоступна — продолжаем на кеше.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isVisited = useCallback(
    (placeId: number) => state.visits.some(v => v.placeId === placeId),
    [state.visits]
  );

  const toggleVisit = useCallback(
    (placeId: number, note?: string) => {
      // Меняем локально сразу — интерфейс не ждёт сеть, — потом догоняем сервер.
      let wasVisited = false;
      setState(prev => {
        wasVisited = prev.visits.some(v => v.placeId === placeId);
        const newVisits = wasVisited
          ? prev.visits.filter(v => v.placeId !== placeId)
          : [...prev.visits, { placeId, visitedAt: new Date().toISOString(), note }];

        const newlyUnlocked = checkNewBadges(newVisits, prev.unlockedBadges);
        if (newlyUnlocked.length > 0) {
          setNewBadge(newlyUnlocked[0]);
          setTimeout(() => setNewBadge(null), 3000);
        }
        return {
          visits: newVisits,
          unlockedBadges: [...prev.unlockedBadges, ...newlyUnlocked],
        };
      });

      if (!getToken()) return;
      (wasVisited ? api.unmarkVisited(placeId) : api.markVisited(placeId, note)).catch(() => {
        // Не сохранилось на сервере — возвращаем как было, чтобы список
        // не расходился с тем, что увидит приложение.
        setState(prev => ({
          ...prev,
          visits: wasVisited
            ? [...prev.visits, { placeId, visitedAt: new Date().toISOString(), note }]
            : prev.visits.filter(v => v.placeId !== placeId),
        }));
      });
    },
    []
  );

  const clearNewBadge = useCallback(() => setNewBadge(null), []);

  // Сброс достижений: очищаем и на сервере, иначе они вернутся при перезагрузке.
  const resetAchievements = useCallback(() => {
    const ids = state.visits.map(v => v.placeId);
    setState({ visits: [], unlockedBadges: [] });
    if (getToken()) ids.forEach(id => api.unmarkVisited(id).catch(() => {}));
  }, [state.visits]);

  return {
    visits: state.visits,
    unlockedBadges: state.unlockedBadges,
    isVisited,
    toggleVisit,
    newBadge,
    clearNewBadge,
    resetAchievements,
  };
}
