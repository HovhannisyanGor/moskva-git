// Клиент для общения фронта с бэкендом Localee.
// Адрес сервера берём из переменной окружения VITE_API_URL.
// Локально её можно не задавать — по умолчанию http://localhost:4000.
// На сайте пропишем сюда адрес развёрнутого бэкенда (как ключ 2ГИС).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'localee_token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t: string) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Форма пользователя — ровно та, что отдаёт бэкенд (без пароля).
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
  created_at: string;
}

// Типы для чатов
export interface ChatUser {
  id: number;
  name: string;
  handle: string;
  color: string;
  letter: string;
  avatar: string;
}
export interface ChatListItem {
  user: ChatUser;
  last: { text: string; fromMe: boolean; createdAt: string } | null;
  unread: number;
}
export interface ChatMessageItem {
  id: number;
  fromMe: boolean;
  text: string;
  createdAt: string;
}

// Универсальный запрос: добавляет токен (если нужно), разбирает JSON,
// а при ошибке кидает понятное сообщение от сервера.
async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth) {
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Не удалось связаться с сервером. Он запущен?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Ошибка ${res.status}`);
  }
  return data as T;
}

export const api = {
  baseUrl: BASE,

  async register(input: { name: string; email: string; handle: string; password: string }) {
    const data = await request<{ token: string; user: ApiUser }>('/api/auth/register', {
      method: 'POST',
      body: input,
    });
    setToken(data.token);
    return data.user;
  },

  async login(input: { email: string; password: string }) {
    const data = await request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: input,
    });
    setToken(data.token);
    return data.user;
  },

  async me() {
    const data = await request<{ user: ApiUser }>('/api/auth/me', { auth: true });
    return data.user;
  },

  async updateMe(patch: Partial<Pick<ApiUser, 'name' | 'handle' | 'bio' | 'city' | 'color' | 'letter' | 'avatar'>>) {
    const data = await request<{ user: ApiUser }>('/api/auth/me', {
      method: 'PATCH',
      body: patch,
      auth: true,
    });
    return data.user;
  },

  // --- Чаты ---
  async chatList() {
    const data = await request<{ chats: ChatListItem[] }>('/api/chats', { auth: true });
    return data.chats;
  },
  async chatMessages(userId: number) {
    return request<{ user: ChatUser; messages: ChatMessageItem[] }>(
      `/api/chats/${userId}/messages`,
      { auth: true },
    );
  },
  async chatSend(userId: number, text: string) {
    const data = await request<{ message: ChatMessageItem }>(`/api/chats/${userId}/messages`, {
      method: 'POST',
      body: { text },
      auth: true,
    });
    return data.message;
  },
  async searchUsers(q: string) {
    const data = await request<{ users: ChatUser[] }>(
      `/api/users/search?q=${encodeURIComponent(q)}`,
      { auth: true },
    );
    return data.users;
  },

  logout() {
    clearToken();
  },
};
