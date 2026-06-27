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
  role: 'user' | 'admin';
  show_online: number; // 1 = показывать «в сети» другим (приватность)
  birthdate: string; // 'YYYY-MM-DD' или '' — дата рождения
  gender: string; // '' | 'male' | 'female' | 'other'
  interests: string; // интересы через запятую
  show_birthyear: number; // 1 = показывать год рождения и возраст другим
  created_at: string;
}

// Публичный профиль другого пользователя (по нику/ID).
export interface PublicUser {
  id: number;
  name: string;
  handle: string;
  color: string;
  letter: string;
  avatar: string;
  online: boolean;
  bio: string;
  city: string;
  gender: string; // '' | 'male' | 'female' | 'other'
  interests: string[]; // интересы списком
  birthDay: number; // день рождения (0, если не указан)
  birthMonth: number; // месяц (0, если не указан)
  birthYear: number | null; // год — null, если скрыт приватностью или не указан
  createdAt: string;
}
export type Relation = 'self' | 'friends' | 'incoming' | 'outgoing' | 'none';

// --- Админка ---
export interface AdminUser {
  id: number;
  handle: string;
  name: string;
  email: string;
  color: string;
  letter: string;
  bio: string;
  city: string;
  avatar: string;
  role: 'user' | 'admin';
  created_at: string;
  protected: boolean; // задан в ADMIN_EMAILS на сервере — роль не снять и не удалить
}
export interface AdminStats {
  users: number;
  admins: number;
  messages: number;
}

// --- Метки на карте ---
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

// --- Поддержка ---
export interface SupportMessage {
  id: number;
  text: string;
  resolved: boolean;
  createdAt: string;
  user: { id: number; name: string; handle: string; email: string };
}

// Типы для чатов
export interface ChatUser {
  id: number;
  name: string;
  handle: string;
  color: string;
  letter: string;
  avatar: string;
  online?: boolean; // активен в течение последней минуты
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
  forwardedFrom: string; // имя автора при пересылке ('' — обычное сообщение)
  replyTo: ReplyPreview | null;
}

// --- Группы ---
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

  async updateMe(patch: Partial<Pick<ApiUser, 'name' | 'handle' | 'bio' | 'city' | 'color' | 'letter' | 'avatar' | 'show_online' | 'birthdate' | 'gender' | 'show_birthyear'>> & { interests?: string | string[] }) {
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
  async chatSend(
    userId: number,
    text: string,
    opts: { replyTo?: number; forwardedFrom?: string } = {},
  ) {
    const data = await request<{ message: ChatMessageItem }>(`/api/chats/${userId}/messages`, {
      method: 'POST',
      body: { text, replyTo: opts.replyTo, forwardedFrom: opts.forwardedFrom },
      auth: true,
    });
    return data.message;
  },
  async chatEditMessage(id: number, text: string) {
    const data = await request<{ message: ChatMessageItem }>(`/api/chats/messages/${id}`, {
      method: 'PATCH',
      body: { text },
      auth: true,
    });
    return data.message;
  },
  async chatDeleteMessage(id: number) {
    return request<{ ok: boolean; deleted: number }>(`/api/chats/messages/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  // --- Группы ---
  async groupList() {
    const data = await request<{ groups: GroupListItem[] }>('/api/groups', { auth: true });
    return data.groups;
  },
  async createGroup(name: string, memberIds: number[]) {
    const data = await request<{ group: GroupInfo }>('/api/groups', {
      method: 'POST',
      body: { name, memberIds },
      auth: true,
    });
    return data.group;
  },
  async groupInfo(id: number) {
    return request<{ group: GroupInfo; members: ChatUser[] }>(`/api/groups/${id}`, { auth: true });
  },
  async groupMessages(id: number) {
    return request<{ group: GroupInfo; messages: GroupMessageItem[] }>(`/api/groups/${id}/messages`, {
      auth: true,
    });
  },
  async groupSend(id: number, text: string, opts: { replyTo?: number } = {}) {
    const data = await request<{ message: GroupMessageItem }>(`/api/groups/${id}/messages`, {
      method: 'POST',
      body: { text, replyTo: opts.replyTo },
      auth: true,
    });
    return data.message;
  },
  async groupEditMessage(id: number, text: string) {
    const data = await request<{ message: GroupMessageItem }>(`/api/groups/messages/${id}`, {
      method: 'PATCH',
      body: { text },
      auth: true,
    });
    return data.message;
  },
  async groupDeleteMessage(id: number) {
    return request<{ ok: boolean }>(`/api/groups/messages/${id}`, { method: 'DELETE', auth: true });
  },
  async groupAddMember(groupId: number, userId: number) {
    const data = await request<{ ok: boolean; group: GroupInfo }>(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: { userId },
      auth: true,
    });
    return data.group;
  },
  async groupRemoveMember(groupId: number, userId: number) {
    return request<{ ok: boolean }>(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      auth: true,
    });
  },
  async groupLeave(id: number) {
    return request<{ ok: boolean }>(`/api/groups/${id}/leave`, { method: 'DELETE', auth: true });
  },
  async groupRename(id: number, name: string) {
    const data = await request<{ group: GroupInfo }>(`/api/groups/${id}`, {
      method: 'PATCH',
      body: { name },
      auth: true,
    });
    return data.group;
  },
  async groupDelete(id: number) {
    return request<{ ok: boolean }>(`/api/groups/${id}`, { method: 'DELETE', auth: true });
  },
  async groupInvitePreview(token: string) {
    return request<{ group: GroupInfo; alreadyMember: boolean }>(`/api/groups/invite/${token}`, {
      auth: true,
    });
  },
  async groupJoin(token: string) {
    const data = await request<{ group: GroupInfo }>(`/api/groups/invite/${token}`, {
      method: 'POST',
      auth: true,
    });
    return data.group;
  },

  async searchUsers(q: string) {
    const data = await request<{ users: ChatUser[] }>(
      `/api/users/search?q=${encodeURIComponent(q)}`,
      { auth: true },
    );
    return data.users;
  },
  async userProfile(id: number) {
    return request<{ user: PublicUser; relation: Relation }>(`/api/users/${id}`, { auth: true });
  },

  // --- Друзья ---
  async friends() {
    return request<{ friends: ChatUser[]; incoming: ChatUser[]; outgoing: ChatUser[] }>(
      '/api/friends',
      { auth: true },
    );
  },
  async addFriend(userId: number) {
    return request<{ status: string }>(`/api/friends/${userId}`, { method: 'POST', auth: true });
  },
  async acceptFriend(userId: number) {
    return request<{ status: string }>(`/api/friends/${userId}/accept`, {
      method: 'POST',
      auth: true,
    });
  },
  async removeFriend(userId: number) {
    return request<{ ok: boolean }>(`/api/friends/${userId}`, { method: 'DELETE', auth: true });
  },

  // --- Админка (доступна только пользователям с ролью admin) ---
  async adminStats() {
    const data = await request<{ stats: AdminStats }>('/api/admin/stats', { auth: true });
    return data.stats;
  },
  async adminUsers(q = '') {
    return request<{ total: number; users: AdminUser[] }>(
      `/api/admin/users?q=${encodeURIComponent(q)}`,
      { auth: true },
    );
  },
  async adminSetRole(id: number, role: 'admin' | 'user') {
    const data = await request<{ user: AdminUser }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
      auth: true,
    });
    return data.user;
  },
  async adminDeleteUser(id: number) {
    return request<{ ok: boolean; deleted: number }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  // --- Поддержка ---
  async sendSupport(text: string) {
    return request<{ ok: boolean }>('/api/support', { method: 'POST', body: { text }, auth: true });
  },
  async adminSupportList() {
    const data = await request<{ messages: SupportMessage[] }>('/api/support', { auth: true });
    return data.messages;
  },
  async adminResolveSupport(id: number) {
    return request<{ ok: boolean }>(`/api/support/${id}/resolve`, { method: 'PATCH', auth: true });
  },

  // --- Метки на карте ---
  async pinList() {
    const data = await request<{ pins: MapPin[] }>('/api/pins', { auth: true });
    return data.pins;
  },
  async createPin(input: { kind: PinKind; lat: number; lng: number; note?: string }) {
    const data = await request<{ pin: MapPin }>('/api/pins', { method: 'POST', body: input, auth: true });
    return data.pin;
  },
  async deletePin(id: number) {
    return request<{ ok: boolean }>(`/api/pins/${id}`, { method: 'DELETE', auth: true });
  },

  logout() {
    clearToken();
  },
};
