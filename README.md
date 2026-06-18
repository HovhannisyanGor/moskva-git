<div align="center">

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/localee-dark.png">
    <img src="public/localee-light.png" alt="Localee" width="110">
  </picture>

  <h1>Localee</h1>

  <p><b>AI-гид по Москве</b> — персональные маршруты под твоё время, бюджет и интересы.</p>

  <p>
    <a href="https://localee.ru"><b>🌐 Открыть localee.ru</b></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  </p>

</div>

---

## О проекте

**Localee** — веб-приложение для исследования Москвы. Опиши, чего хочешь, — и AI-помощник
построит персональный маршрут прямо на интерактивной карте. А ещё это личный профиль,
достижения за посещённые места и (скоро) друзья и совместные прогулки.

## Возможности

- ✨ **AI-маршруты** — задаёшь время, компанию, бюджет и интересы → получаешь готовый маршрут на карте
- 🗺️ **Интерактивная карта** — достопримечательности, парки, музеи и рестораны (2ГИС MapGL)
- 🏅 **Достижения** — отмечай места, открывай бейджи, повышай уровень
- 👤 **Аккаунты** — регистрация, вход и личный профиль с редактированием
- 🤝 **Друзья и чаты** — _в разработке_
- 📱 **Адаптивный интерфейс** — десктоп и мобильный (жестовая нижняя шторка, светлая/тёмная тема)

## Стек

| Слой | Технологии |
|------|------------|
| Фронтенд | React 19 · TypeScript · Vite |
| Карта | 2ГИС MapGL |
| Бэкенд | Node.js · Express · SQLite · JWT |
| Хостинг | reg.ru (nginx) |

## Структура

```
localee/
├── src/             # фронтенд (React)
│   ├── components/   # экраны и UI
│   ├── utils/        # API-клиент, помощники
│   └── data/         # места и бейджи
├── server/          # бэкенд (Node + Express + SQLite)
│   └── src/          # маршруты, БД, авторизация
└── TASKS.md         # дорожная карта проекта
```

## Запуск локально

Нужен **Node.js 20+**.

**Фронтенд:**
```bash
npm install
npm run dev          # http://localhost:5173
```

**Бэкенд (аккаунты):**
```bash
cd server
npm install
cp .env.example .env
npm run dev          # http://localhost:4000
```

> Адрес API задаётся переменной `VITE_API_URL` (по умолчанию `http://localhost:4000`).

## Дорожная карта

Актуальные задачи, идеи и прогресс — в [TASKS.md](TASKS.md).

---

<div align="center">
  <sub>Сделано с ❤️ для исследователей Москвы</sub>
</div>
