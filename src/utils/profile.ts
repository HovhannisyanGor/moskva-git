// Превращает «сырого» пользователя с сервера (ApiUser) + локальную активность
// (посещения, бейджи) в данные для отображения профиля.
import type { ApiUser } from './api';
import type { Visit, PlaceCategory } from '../types';
import { BADGES } from '../data/badges';
import { PLACES } from '../data/places';

export interface DisplayUser {
  name: string;
  handle: string;
  id: string;
  letter: string;
  color: string;
  avatar: string;
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

export interface DisplayBadge {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
}

export interface RecentPlace {
  name: string;
  color: string;
  when: string;
}

// Простая, прозрачная система уровней (порог = сколько баллов нужно для уровня).
const LEVELS = [
  { level: 1, name: 'Новичок', min: 0 },
  { level: 2, name: 'Исследователь', min: 300 },
  { level: 3, name: 'Знаток города', min: 1000 },
  { level: 4, name: 'Гид', min: 2500 },
  { level: 5, name: 'Мастер', min: 5000 },
];

export function levelFor(points: number) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) cur = l;
  const next = LEVELS.find((l) => l.min > cur.min);
  return { level: cur.level, levelName: cur.name, levelNext: next ? next.min : cur.min };
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function sinceFrom(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return `С ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  landmark: '#FA3C3C',
  park: '#378ADD',
  museum: '#D4537E',
  restaurant: '#BA7517',
  entertainment: '#9B7FE6',
};

function relativeWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const days = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (days <= 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  return b.toLocaleDateString('ru-RU');
}

// Баллы = за посещённые места и полученные бейджи. Меняется при росте активности.
export function pointsFor(visits: Visit[], unlockedBadges: string[]): number {
  return visits.length * 100 + unlockedBadges.length * 50;
}

export function buildDisplayUser(
  u: ApiUser,
  visits: Visit[],
  unlockedBadges: string[],
): DisplayUser {
  const places = visits.length;
  const badges = unlockedBadges.length;
  const points = pointsFor(visits, unlockedBadges);
  const { level, levelName, levelNext } = levelFor(points);
  return {
    name: u.name,
    handle: u.handle,
    id: String(u.id).padStart(5, '0'),
    letter: u.letter,
    color: u.color,
    avatar: u.avatar ?? '',
    city: u.city,
    bio: u.bio,
    email: u.email,
    since: sinceFrom(u.created_at),
    places,
    badges,
    points,
    friends: 0, // появится, когда сделаем друзей
    level,
    levelName,
    levelNext,
  };
}

export function displayBadges(unlockedBadges: string[]): DisplayBadge[] {
  return BADGES.map((b) => ({
    id: b.id,
    icon: b.icon,
    name: b.title,
    unlocked: unlockedBadges.includes(b.id),
  }));
}

export function recentPlaces(visits: Visit[]): RecentPlace[] {
  return [...visits]
    .reverse()
    .slice(0, 5)
    .map((v) => {
      const p = PLACES.find((pl) => pl.id === v.placeId);
      return {
        name: p?.name ?? 'Место',
        color: p ? CATEGORY_COLOR[p.category] : '#378ADD',
        when: relativeWhen(v.visitedAt),
      };
    });
}
