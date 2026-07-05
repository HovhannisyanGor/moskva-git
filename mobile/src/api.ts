// Клиент API Localee для мобильного приложения.
// Тот же бэкенд, что у сайта: https://api.localee.ru (Express + SQLite на VPS).
// Токен храним в AsyncStorage, в памяти держим копию для синхронного доступа.
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://api.localee.ru';
const TOKEN_KEY = 'localee_token';

let token = '';

export async function loadToken(): Promise<string> {
  token = (await AsyncStorage.getItem(TOKEN_KEY)) || '';
  return token;
}
export async function setToken(t: string) {
  token = t;
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  data: Record<string, unknown>;
  constructor(message: string, code = '', data: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

// --- Типы (зеркало серверных ответов, как в src/utils/api.ts сайта) ---
export interface ApiUser {
  id: number;
  handle: string;
  name: string;
  email: string;
  color: string;
  letter: string;
  bio: string;
  city: string;
  avatar: string;
  cover: string;
  role: 'user' | 'admin';
  show_online: number;
  birthdate: string;
  gender: string;
  interests: string;
  show_birthyear: number;
  created_at: string;
}

export interface ChatUser {
  id: number;
  name: string;
  handle: string;
  color: string;
  letter: string;
  avatar: string;
  online?: boolean;
}
export interface ChatListItem {
  user: ChatUser;
  last: { text: string; fromMe: boolean; createdAt: string } | null;
  unread: number;
}
export interface ReplyPreview {
  id: number;
  text: string;
  fromMe: boolean;
}
export interface ChatMessageItem {
  id: number;
  fromMe: boolean;
  text: string;
  createdAt: string;
  edited: boolean;
  forwardedFrom: string;
  replyTo: ReplyPreview | null;
}

export interface GroupInfo {
  id: number;
  name: string;
  color: string;
  letter: string;
  ownerId: number;
  inviteToken: string;
  memberCount: number;
}
export interface GroupListItem extends GroupInfo {
  last: { text: string; fromMe: boolean; author: string; createdAt: string } | null;
  unread: number;
}
export interface GroupSender {
  id: number;
  name: string;
  color: string;
  letter: string;
  avatar: string;
}
export interface GroupMessageItem {
  id: number;
  fromMe: boolean;
  text: string;
  createdAt: string;
  edited: boolean;
  forwardedFrom: string;
  replyTo: (ReplyPreview & { author: string }) | null;
  sender: GroupSender | null;
}

export interface PostItem {
  id: number;
  author: ChatUser | null;
  text: string;
  image: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  mine: boolean;
}
export interface PostComment {
  id: number;
  text: string;
  createdAt: string;
  author: ChatUser | null;
  mine: boolean;
}

export type PinKind = 'crowd' | 'meetup' | 'drift';
export interface MapPin {
  id: number;
  kind: PinKind;
  note: string;
  lat: number;
  lng: number;
  createdAt: string;
  mine: boolean;
  author: { name: string; handle: string } | null;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new ApiError(`Нет связи с сервером: ${detail}`, 'network');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; code?: string; [k: string]: unknown };
    throw new ApiError(d.error || `Ошибка ${res.status}`, d.code || '', d);
  }
  return data as T;
}

export const api = {
  // --- Авторизация ---
  async register(input: { name: string; handle: string; email: string; password: string }) {
    const data = await request<{ token: string; user: ApiUser }>('/api/auth/register', {
      method: 'POST',
      body: input,
    });
    await setToken(data.token);
    return data.user;
  },
  async login(input: { email: string; password: string }) {
    const data = await request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: input,
    });
    await setToken(data.token);
    return data.user;
  },
  async me(): Promise<ApiUser> {
    const data = await request<{ user: ApiUser }>('/api/auth/me', { auth: true });
    return data.user;
  },
  async logout() {
    await setToken('');
  },

  // --- Чаты ---
  async chatList(): Promise<ChatListItem[]> {
    const data = await request<{ chats: ChatListItem[] }>('/api/chats', { auth: true });
    return data.chats;
  },
  chatMessages(userId: number) {
    return request<{ user: ChatUser; messages: ChatMessageItem[] }>(
      `/api/chats/${userId}/messages`,
      { auth: true },
    );
  },
  async sendMessage(userId: number, text: string, extra: { replyTo?: number } = {}) {
    const data = await request<{ message: ChatMessageItem }>(`/api/chats/${userId}/messages`, {
      method: 'POST',
      body: { text, ...extra },
      auth: true,
    });
    return data.message;
  },

  // --- Группы ---
  async groupList(): Promise<GroupListItem[]> {
    const data = await request<{ groups: GroupListItem[] }>('/api/groups', { auth: true });
    return data.groups;
  },
  groupMessages(id: number) {
    return request<{ group: GroupInfo; messages: GroupMessageItem[] }>(
      `/api/groups/${id}/messages`,
      { auth: true },
    );
  },
  async sendGroupMessage(id: number, text: string) {
    const data = await request<{ message: GroupMessageItem }>(`/api/groups/${id}/messages`, {
      method: 'POST',
      body: { text },
      auth: true,
    });
    return data.message;
  },

  // --- Лента ---
  async feed(scope: 'all' | 'friends' = 'all'): Promise<PostItem[]> {
    const data = await request<{ posts: PostItem[] }>(`/api/posts?scope=${scope}`, { auth: true });
    return data.posts;
  },
  async createPost(input: { text: string; image?: string }): Promise<PostItem> {
    const data = await request<{ post: PostItem }>('/api/posts', {
      method: 'POST',
      body: input,
      auth: true,
    });
    return data.post;
  },
  deletePost(id: number) {
    return request<{ ok: boolean }>(`/api/posts/${id}`, { method: 'DELETE', auth: true });
  },
  likePost(id: number) {
    return request<{ liked: boolean; likeCount: number }>(`/api/posts/${id}/like`, {
      method: 'POST',
      auth: true,
    });
  },

  // --- Метки на карте ---
  async pinList(): Promise<MapPin[]> {
    const data = await request<{ pins: MapPin[] }>('/api/pins', { auth: true });
    return data.pins;
  },
  async createPin(input: { kind: PinKind; lat: number; lng: number; note?: string }) {
    const data = await request<{ pin: MapPin }>('/api/pins', {
      method: 'POST',
      body: input,
      auth: true,
    });
    return data.pin;
  },
  deletePin(id: number) {
    return request<{ ok: boolean }>(`/api/pins/${id}`, { method: 'DELETE', auth: true });
  },
};
