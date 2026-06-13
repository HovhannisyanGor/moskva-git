export type PlaceCategory = 'landmark' | 'park' | 'museum' | 'restaurant' | 'entertainment';

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
