import { useState, useCallback, useEffect } from 'react';
import type { Visit, AchievementsState } from '../types';
import { checkNewBadges } from '../data/badges';

const STORAGE_KEY = 'localee_achievements';

function loadState(): AchievementsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { visits: [], unlockedBadges: [] };
}

function saveState(state: AchievementsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useAchievements() {
  const [state, setState] = useState<AchievementsState>(loadState);
  const [newBadge, setNewBadge] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const isVisited = useCallback(
    (placeId: number) => state.visits.some(v => v.placeId === placeId),
    [state.visits]
  );

  const toggleVisit = useCallback(
    (placeId: number, note?: string) => {
      setState(prev => {
        const already = prev.visits.some(v => v.placeId === placeId);
        let newVisits: Visit[];

        if (already) {
          newVisits = prev.visits.filter(v => v.placeId !== placeId);
        } else {
          newVisits = [
            ...prev.visits,
            { placeId, visitedAt: new Date().toISOString(), note },
          ];
        }

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
    },
    []
  );

  const clearNewBadge = useCallback(() => setNewBadge(null), []);

  // Сброс достижений: очищаем посещённые места и открытые бейджи.
  const resetAchievements = useCallback(() => {
    setState({ visits: [], unlockedBadges: [] });
  }, []);

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
