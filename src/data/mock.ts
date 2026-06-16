// Демо-данные соц-слоя (профиль, друзья, чаты). Без бэкенда — заглушки.
// Когда появится бэкенд, эти константы заменяются ответами API той же формы.

export interface MockUser {
  name: string;
  handle: string;
  id: string;
  letter: string;
  color: string;
  city: string;
  since: string;
  bio: string;
  email: string;
  places: number;
  badges: number;
  points: number;
  friends: number;
  level: number;
  levelName: string;
  levelNext: number;
}

export const DEMO_USER: MockUser = {
  name: 'Эрик',
  handle: 'term1x',
  id: '00142',
  letter: 'Э',
  color: '#FA3C3C',
  city: 'Москва',
  since: 'С июня 2026',
  bio: 'Люблю исследовать Москву 🗺️ Парки, музеи и скрытые места.',
  email: 'erik@example.com',
  places: 7,
  badges: 3,
  points: 420,
  friends: 5,
  level: 2,
  levelName: 'Исследователь',
  levelNext: 1000,
};

export const DEMO_BADGES: { icon: string; name: string; unlocked: boolean }[] = [
  { icon: '🥾', name: 'Первый шаг', unlocked: true },
  { icon: '🗺️', name: 'Исследователь', unlocked: true },
  { icon: '🏰', name: 'Гость Кремля', unlocked: true },
  { icon: '🧭', name: 'Бывалый странник', unlocked: false },
];

export const DEMO_RECENT: { name: string; color: string; when: string }[] = [
  { name: 'Красная площадь', color: '#FA3C3C', when: 'Сегодня' },
  { name: 'Парк Горького', color: '#378ADD', when: 'Вчера' },
  { name: 'Московский Кремль', color: '#FA3C3C', when: '3 дня назад' },
];

export interface MockFriend {
  name: string;
  handle: string;
  letter: string;
  color: string;
  online: boolean;
  status: string;
}

export const DEMO_FRIENDS: MockFriend[] = [
  { name: 'Костян', handle: 'kostyan_msk', letter: 'К', color: '#378ADD', online: true, status: 'онлайн' },
  { name: 'Маша', handle: 'masha_walks', letter: 'М', color: '#3FAE6E', online: true, status: 'онлайн' },
  { name: 'Саша', handle: 'sasha_x', letter: 'С', color: '#9B7FE6', online: false, status: 'был(а) час назад' },
  { name: 'Даша', handle: 'dasha_moscow', letter: 'Д', color: '#D69A1E', online: false, status: 'была вчера' },
  { name: 'Артём', handle: 'artem_gid', letter: 'А', color: '#E0568A', online: false, status: 'был 3 дня назад' },
];

export const DEMO_REQUESTS: { name: string; handle: string; letter: string; color: string; mutual: string }[] = [
  { name: 'Никита', handle: 'nikita_spb', letter: 'Н', color: '#FA3C3C', mutual: '3 общих места' },
];

export interface MockChat {
  id: string;
  name: string;
  letter: string;
  color: string;
  last: string;
  time: string;
  unread?: number;
  group?: boolean;
  online?: boolean;
}

export const DEMO_CHATS: MockChat[] = [
  { id: 'kostyan', name: 'Костян', letter: 'К', color: '#378ADD', last: 'Давай в Зарядье сегодня?...', time: '14:32', unread: 2, online: true },
  { id: 'masha', name: 'Маша', letter: 'М', color: '#3FAE6E', last: 'Ты видел новый маршрут?', time: '12:10' },
  { id: 'sasha', name: 'Саша', letter: 'С', color: '#9B7FE6', last: '👍', time: 'Вчера' },
  { id: 'g1', name: 'Выходные в Москве', letter: '🗺️', color: '#BA7517', last: 'Маша: отличная идея!', time: 'Вчера', unread: 5, group: true },
  { id: 'g2', name: 'Походы по паркам', letter: '🏞️', color: '#3FAE6E', last: 'Эрик поделился маршрутом', time: 'Пн', group: true },
  { id: 'dasha', name: 'Даша', letter: 'Д', color: '#D69A1E', last: 'Спасибо за маршрут 🙌', time: 'Пн' },
];

export interface MockMessage {
  id: string;
  from: 'me' | 'them';
  text?: string;
  time: string;
  route?: { title: string; meta: string; stops: { n: number; name: string }[] };
}

export const DEMO_MESSAGES: MockMessage[] = [
  { id: 'm1', from: 'them', text: 'Привет! Что делаешь сегодня?', time: '13:55' },
  { id: 'm2', from: 'me', text: 'Пока ничего не планировал, а что?', time: '13:57' },
  { id: 'm3', from: 'them', text: 'Давай в Зарядье сходим? Там сегодня открытие смотровой 👀', time: '13:58' },
  { id: 'm4', from: 'me', text: 'Огонь! Давай составим маршрут через localee', time: '14:01' },
  {
    id: 'm5',
    from: 'me',
    time: '14:02',
    route: {
      title: '🗺️ Маршрут на вечер',
      meta: '3 места · ~3 часа · Бесплатно',
      stops: [
        { n: 1, name: 'Зарядье' },
        { n: 2, name: 'Красная площадь' },
        { n: 3, name: 'ГУМ' },
      ],
    },
  },
];
