import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DICTS, type Lang } from './translations';

// Что пользователь выбрал в настройках: 'auto' — определять по браузеру.
export type LangPref = 'auto' | Lang;

const PREF_KEY = 'localee_lang';

// Язык браузера → наш язык. Всё, что начинается на 'ru', считаем русским.
function detectLang(): Lang {
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const l of langs) if (l && l.toLowerCase().startsWith('ru')) return 'ru';
  }
  return 'en';
}

function readPref(): LangPref {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === 'ru' || v === 'en' || v === 'auto') return v;
  } catch {
    /* ignore */
  }
  return 'auto';
}

function resolveLang(pref: LangPref): Lang {
  return pref === 'auto' ? detectLang() : pref;
}

// --- Локализованные форматтеры дат и возраста ---
const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ageFrom(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age;
}

interface I18nValue {
  lang: Lang;
  pref: LangPref;
  setPref: (p: LangPref) => void;
  /** Перевод по ключу. Поддерживает подстановки {имя} из params. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** «С июня 2026» / «Since June 2026» из ISO-даты регистрации. */
  formatSince: (iso: string) => string;
  /** «14 марта 1999» / «March 14, 1999». Без года, если year не задан. */
  formatBirthday: (day: number, month: number, year: number | null) => string;
  /** «26 лет» / «26 years». Пусто, если год скрыт/не указан. */
  formatAge: (day: number, month: number, year: number | null) => string;
  /** Код локали для Intl и toLocale* ('ru-RU' | 'en-US'). */
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<LangPref>(readPref);
  const lang = resolveLang(pref);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setPref = useCallback((p: LangPref) => {
    setPrefState(p);
    try {
      localStorage.setItem(PREF_KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    const t = (key: string, params?: Record<string, string | number>) => {
      let s = dict[key] ?? DICTS.ru[key] ?? key;
      if (params) for (const k in params) s = s.replaceAll(`{${k}}`, String(params[k]));
      return s;
    };
    const months = lang === 'ru' ? RU_MONTHS : EN_MONTHS;
    const formatSince = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return t('profile.since', { month: months[d.getMonth()], year: d.getFullYear() });
    };
    const formatBirthday = (day: number, month: number, year: number | null) => {
      if (!day || !month) return '';
      const mn = months[month - 1] ?? '';
      const base = lang === 'ru' ? `${day} ${mn}` : `${mn} ${day}`;
      if (!year) return base;
      return lang === 'ru' ? `${base} ${year}` : `${base}, ${year}`;
    };
    const formatAge = (day: number, month: number, year: number | null) => {
      if (!year) return '';
      const age = ageFrom(year, month || 1, day || 1);
      if (age < 0 || age > 130) return '';
      if (lang === 'ru') {
        const lastTwo = age % 100;
        const last = age % 10;
        const word =
          last === 1 && lastTwo !== 11
            ? 'год'
            : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
              ? 'года'
              : 'лет';
        return `${age} ${word}`;
      }
      return `${age} ${age === 1 ? 'year' : 'years'}`;
    };
    return {
      lang,
      pref,
      setPref,
      t,
      formatSince,
      formatBirthday,
      formatAge,
      locale: lang === 'ru' ? 'ru-RU' : 'en-US',
    };
  }, [lang, pref, setPref]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
