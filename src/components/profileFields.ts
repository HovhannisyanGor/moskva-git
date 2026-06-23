// Общие варианты полей профиля — используются и в онбординге, и в редактировании.
// Город храним каноничным русским значением, а показываем перевод (en).
export const GENDER_OPTS: { value: 'male' | 'female' | 'other'; key: string }[] = [
  { value: 'male', key: 'gender.male' },
  { value: 'female', key: 'gender.female' },
  { value: 'other', key: 'gender.other' },
];

export const CITY_OPTS: { value: string; en: string }[] = [
  { value: 'Москва', en: 'Moscow' },
  { value: 'Санкт-Петербург', en: 'Saint Petersburg' },
  { value: 'Казань', en: 'Kazan' },
  { value: 'Другой', en: 'Other' },
];

// Известный город показываем на текущем языке; остальное — как ввёл пользователь.
export function localizeCity(value: string, lang: 'ru' | 'en'): string {
  if (lang !== 'en') return value;
  return CITY_OPTS.find((c) => c.value === value)?.en ?? value;
}
