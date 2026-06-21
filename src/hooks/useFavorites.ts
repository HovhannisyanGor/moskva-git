import { useCallback, useEffect, useState } from 'react';

// Избранные места — список id мест, сохранённый локально в браузере.
// (как достижения; позже можно перенести на аккаунт вместе с ними)
const KEY = 'localee_favorites';

function load(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'number');
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const isFavorite = useCallback((id: number) => favorites.includes(id), [favorites]);
  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
