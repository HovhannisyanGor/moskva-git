import express from 'express';
import cors from 'cors';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import './db.js'; // создаёт таблицы при старте
import { authRouter } from './routes/auth.js';
import { chatsRouter } from './routes/chats.js';
import { usersRouter } from './routes/users.js';
import { adminRouter } from './routes/admin.js';
import { friendsRouter } from './routes/friends.js';
import { groupsRouter } from './routes/groups.js';
import { supportRouter } from './routes/support.js';
import { pinsRouter } from './routes/pins.js';
import { postsRouter } from './routes/posts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // за nginx берём реальный IP клиента (нужно для rate-limit входа)

app.use(cors({ origin: config.corsOrigin })); // разрешаем фронту обращаться к API
// Учим сервер читать JSON. Лимит подняли до 6 МБ: посты и обложки профиля содержат
// картинки (data URL), а это заметно больше стандартных 100 КБ.
app.use(express.json({ limit: '6mb' }));

// В режиме разработки отдаём простую страницу для ручной проверки API
// (открой http://localhost:4000/). На проде (NODE_ENV=production) она НЕ публикуется.
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(join(__dirname, '..', 'public')));
}

// Простая проверка, что сервер жив: GET /api/health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Маршруты авторизации: /api/auth/register, /api/auth/login, /api/auth/me
app.use('/api/auth', authRouter);
// Чаты (личные сообщения) и поиск пользователей
app.use('/api/chats', chatsRouter);
app.use('/api/users', usersRouter);
// Админка: список пользователей и управление ими (только для роли admin)
app.use('/api/admin', adminRouter);
// Друзья: заявки, принятие, список
app.use('/api/friends', friendsRouter);
// Группы: создание, участники, переписка, пригласительные ссылки
app.use('/api/groups', groupsRouter);
// Поддержка: обращения пользователей (форма «Написать в поддержку»)
app.use('/api/support', supportRouter);
// Пользовательские метки на карте (скопления, сходки, дрифт)
app.use('/api/pins', pinsRouter);
// Социальная лента: посты, лайки, комментарии, фотографии
app.use('/api/posts', postsRouter);

// Если запрошенного маршрута нет — отвечаем аккуратным JSON, а не HTML.
app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

// Единый обработчик ошибок. Главное: наружу отдаём короткое сообщение,
// а подробности (стек) пишем только в консоль сервера — чтобы не светить внутренности.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Тело запроса — не корректный JSON' });
  if (err?.type === 'entity.too.large')
    return res.status(413).json({ error: 'Файл слишком большой', code: 'too_large' });
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(config.port, () => {
  console.log(`Localee API запущен: http://localhost:${config.port}`);
});
