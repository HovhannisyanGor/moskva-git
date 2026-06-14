import type { Badge, Visit } from '../types';
import { PLACES } from './places';

export const BADGES: Badge[] = [
  {
    id: 'first_visit',
    title: 'Первый шаг',
    description: 'Отметь своё первое место',
    icon: '🥾',
    condition: (visits) => visits.length >= 1,
  },
  {
    id: 'explorer_5',
    title: 'Исследователь',
    description: 'Посети 5 мест',
    icon: '🗺️',
    condition: (visits) => visits.length >= 5,
  },
  {
    id: 'explorer_10',
    title: 'Бывалый странник',
    description: 'Посети 10 мест',
    icon: '🧭',
    condition: (visits) => visits.length >= 10,
  },
  {
    id: 'explorer_all',
    title: 'Покоритель Москвы',
    description: 'Посети все места в приложении',
    icon: '🏆',
    condition: (visits) => visits.length >= PLACES.length,
  },
  {
    id: 'museum_lover',
    title: 'Ценитель искусства',
    description: 'Посети 3 музея',
    icon: '🎨',
    condition: (visits) => {
      const museumIds = PLACES.filter(p => p.category === 'museum').map(p => p.id);
      return visits.filter(v => museumIds.includes(v.placeId)).length >= 3;
    },
  },
  {
    id: 'park_walker',
    title: 'Любитель природы',
    description: 'Посети 4 парка',
    icon: '🌳',
    condition: (visits) => {
      const parkIds = PLACES.filter(p => p.category === 'park').map(p => p.id);
      return visits.filter(v => parkIds.includes(v.placeId)).length >= 4;
    },
  },
  {
    id: 'landmark_hunter',
    title: 'Охотник за достопримечательностями',
    description: 'Посети 5 достопримечательностей',
    icon: '🏛️',
    condition: (visits) => {
      const ids = PLACES.filter(p => p.category === 'landmark').map(p => p.id);
      return visits.filter(v => ids.includes(v.placeId)).length >= 5;
    },
  },
  {
    id: 'foodie',
    title: 'Гурман',
    description: 'Посети 2 ресторана',
    icon: '🍽️',
    condition: (visits) => {
      const ids = PLACES.filter(p => p.category === 'restaurant').map(p => p.id);
      return visits.filter(v => ids.includes(v.placeId)).length >= 2;
    },
  },
  {
    id: 'kremlin_visitor',
    title: 'Гость Кремля',
    description: 'Посети Московский Кремль',
    icon: '🏰',
    condition: (visits) => visits.some(v => v.placeId === 2),
  },
  {
    id: 'viewpoint',
    title: 'С высоты птичьего полёта',
    description: 'Посети Воробьёвы горы или Останкинскую башню',
    icon: '🔭',
    condition: (visits) => visits.some(v => v.placeId === 7 || v.placeId === 17),
  },
  {
    id: 'free_spirit',
    title: 'Бесплатный дух',
    description: 'Посети 5 бесплатных мест',
    icon: '🆓',
    condition: (visits) => {
      const freeIds = PLACES.filter(p => p.price === 0).map(p => p.id);
      return visits.filter(v => freeIds.includes(v.placeId)).length >= 5;
    },
  },
  {
    id: 'weekend_warrior',
    title: 'Выходной герой',
    description: 'Посети 3 места за один день',
    icon: '⚡',
    condition: (visits) => {
      const byDate: Record<string, number> = {};
      visits.forEach(v => {
        const date = v.visitedAt.split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      });
      return Object.values(byDate).some(count => count >= 3);
    },
  },
];

export function checkNewBadges(visits: Visit[], unlockedBadges: string[]): string[] {
  const newlyUnlocked: string[] = [];
  BADGES.forEach(badge => {
    if (!unlockedBadges.includes(badge.id) && badge.condition(visits)) {
      newlyUnlocked.push(badge.id);
    }
  });
  return newlyUnlocked;
}
