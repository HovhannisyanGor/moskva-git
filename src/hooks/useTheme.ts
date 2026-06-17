import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
const KEY = 'localee_theme';

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* localStorage недоступен */
  }
  return 'auto';
}

/**
 * Управление темой: light | dark | auto (следует системной).
 * Применяет тему на <html data-theme>, сохраняет выбор, слушает смену системной темы в режиме auto.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [effective, setEffective] = useState<'light' | 'dark'>(
    () => (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light',
  );

  useEffect(() => {
    const apply = () => {
      const eff = mode === 'auto' ? systemTheme() : mode;
      document.documentElement.setAttribute('data-theme', eff);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', eff === 'dark' ? '#121013' : '#ffffff');
      setEffective(eff);
    };
    apply();
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* localStorage недоступен */
    }
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  return { mode, setMode, effective };
}
