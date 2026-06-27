export type PlaceCategory =
  | 'landmark'
  | 'park'
  | 'museum'
  | 'restaurant'
  | 'entertainment'
  | 'nightlife'; // 18+: кальянные, клубы, ночные бары/рестораны

export interface Place {
  id: number;
  name: string;
  category: PlaceCategory;
  description: string;
  address: string;
  coords: [number, number]; // [lat, lng]
  price: number; // 0 = free
  duration: number; // minutes
  rating: number;
  tags: string[];
  ticketUrl?: string;
  imageUrl?: string;
}

export interface RouteStop {
  place: Place;
  order: number;
  tip?: string;
}

export interface Route {
  id: string;
  title: string;
  description: string;
  stops: RouteStop[];
  totalTime: number; // minutes
  totalPrice: number;
  tags: string[];
}

export interface FilterParams {
  time: '2h' | '4h' | 'fullday' | 'weekend';
  people: 'solo' | 'couple' | 'family' | 'group';
  budget: 'free' | '2000' | '5000' | 'unlimited';
  interests: 'culture' | 'nature' | 'all' | 'food' | 'art';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Visit {
  placeId: number;
  visitedAt: string; // ISO date
  note?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (visits: Visit[]) => boolean;
  category?: PlaceCategory;
}

export interface AchievementsState {
  visits: Visit[];
  unlockedBadges: string[];
}

export type View =
  | 'map'
  | 'places'
  | 'achievements'
  | 'profile'
  | 'edit-profile'
  | 'chats'
  | 'friends'
  | 'favorites'
  | 'user'
  | 'settings'
  | 'support'
  | 'admin';
