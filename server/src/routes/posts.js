import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { toChatUser } from '../users.js';

export const postsRouter = Router();
postsRouter.use(requireAuth); // вся лента доступна только вошедшим

const MAX_TEXT = 4000;
const MAX_COMMENT = 2000;
// Картинка поста: data URL небольшого размера (фронт сжимает до ~1080px).
function validImage(s) {
  if (!s) return true;
  return /^data:image\/(png|jpe?g|webp|gif);base64,/.test(s) && s.length <= 3_000_000;
}

// Краткие данные автора (имя, аватар, онлайн) — переиспользуем формат чатов.
function author(uid) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  return u ? toChatUser(u) : null;
}

// Готовим пост для фронта: автор + счётчики лайков/комментариев + лайкнул ли я.
function toPostItem(p, me) {
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?').get(p.id).c;
  const liked = !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(p.id, me);
  const commentCount = db.prepare('SELECT COUNT(*) AS c FROM post_comments WHERE post_id = ?').get(p.id).c;
  return {
    id: p.id,
    author: author(p.user_id),
    text: p.text,
    image: p.image || '',
    createdAt: p.created_at,
    likeCount,
    liked,
    commentCount,
    mine: p.user_id === me,
  };
}

function toComment(c, me) {
  return { id: c.id, text: c.text, createdAt: c.created_at, author: author(c.user_id), mine: c.user_id === me };
}

// GET /api/posts?scope=all|friends — общая лента или лента друзей (+ свои посты).
postsRouter.get('/', (req, res) => {
  const me = req.userId;
  const scope = req.query.scope === 'friends' ? 'friends' : 'all';
  let rows;
  if (scope === 'friends') {
    const friendIds = db
      .prepare(`
        SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS uid
        FROM friendships
        WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)
      `)
      .all(me, me, me)
      .map((r) => r.uid);
    const ids = [me, ...friendIds];
    const ph = ids.map(() => '?').join(',');
    rows = db.prepare(`SELECT * FROM posts WHERE user_id IN (${ph}) ORDER BY id DESC LIMIT 100`).all(...ids);
  } else {
    rows = db.prepare('SELECT * FROM posts ORDER BY id DESC LIMIT 100').all();
  }
  res.json({ posts: rows.map((p) => toPostItem(p, me)) });
});

// GET /api/posts/user/:userId — посты конкретного пользователя (стена профиля).
postsRouter.get('/user/:userId', (req, res) => {
  const me = req.userId;
  const uid = Number(req.params.userId);
  if (!Number.isInteger(uid)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  const rows = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(uid);
  res.json({ posts: rows.map((p) => toPostItem(p, me)) });
});

// GET /api/posts/photos/:userId — все картинки пользователя (для блока «Фото»).
postsRouter.get('/photos/:userId', (req, res) => {
  const uid = Number(req.params.userId);
  if (!Number.isInteger(uid)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  const rows = db
    .prepare("SELECT id, image, created_at FROM posts WHERE user_id = ? AND image != '' ORDER BY id DESC LIMIT 60")
    .all(uid);
  res.json({ photos: rows.map((r) => ({ postId: r.id, image: r.image, createdAt: r.created_at })) });
});

// POST /api/posts — создать пост (текст и/или картинка).
postsRouter.post('/', (req, res) => {
  const me = req.userId;
  const text = String(req.body?.text ?? '').trim();
  const image = typeof req.body?.image === 'string' ? req.body.image : '';
  if (!text && !image) return res.status(400).json({ error: 'Пост пустой', code: 'post_empty' });
  if (text.length > MAX_TEXT) return res.status(400).json({ error: 'Текст слишком длинный', code: 'post_long' });
  if (!validImage(image)) return res.status(400).json({ error: 'Картинка не подходит (формат или размер)', code: 'image_bad' });
  const info = db
    .prepare('INSERT INTO posts (user_id, text, image, created_at) VALUES (?, ?, ?, ?)')
    .run(me, text, image, new Date().toISOString());
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ post: toPostItem(p, me) });
});

// DELETE /api/posts/comments/:id — удалить свой комментарий (или админ).
// ВАЖНО: маршрут объявлен ДО '/:id', иначе '/:id' перехватит «comments».
postsRouter.delete('/comments/:id', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  const c = db.prepare('SELECT * FROM post_comments WHERE id = ?').get(id);
  if (!c) return res.status(404).json({ error: 'Комментарий не найден', code: 'comment_missing' });
  const meUser = db.prepare('SELECT role FROM users WHERE id = ?').get(me);
  if (c.user_id !== me && meUser?.role !== 'admin')
    return res.status(403).json({ error: 'Можно удалять только свои комментарии', code: 'not_owner' });
  db.prepare('DELETE FROM post_comments WHERE id = ?').run(id);
  res.json({ ok: true, deleted: id });
});

// GET /api/posts/:id/comments — список комментариев поста.
postsRouter.get('/:id/comments', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  const rows = db.prepare('SELECT * FROM post_comments WHERE post_id = ? ORDER BY id ASC').all(id);
  res.json({ comments: rows.map((c) => toComment(c, me)) });
});

// POST /api/posts/:id/comments — добавить комментарий.
postsRouter.post('/:id/comments', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Пост не найден', code: 'post_missing' });
  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'Пустой комментарий', code: 'comment_empty' });
  if (text.length > MAX_COMMENT) return res.status(400).json({ error: 'Слишком длинно', code: 'comment_long' });
  const info = db
    .prepare('INSERT INTO post_comments (post_id, user_id, text, created_at) VALUES (?, ?, ?, ?)')
    .run(id, me, text, new Date().toISOString());
  const c = db.prepare('SELECT * FROM post_comments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ comment: toComment(c, me) });
});

// POST /api/posts/:id/like — поставить или снять лайк (переключатель).
postsRouter.post('/:id/like', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Пост не найден', code: 'post_missing' });
  const has = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(id, me);
  if (has) db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(id, me);
  else
    db.prepare('INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').run(
      id,
      me,
      new Date().toISOString(),
    );
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?').get(id).c;
  res.json({ liked: !has, likeCount });
});

// DELETE /api/posts/:id — удалить свой пост (или админ) вместе с лайками/комментами.
postsRouter.delete('/:id', (req, res) => {
  const me = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id', code: 'bad_id' });
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Пост не найден', code: 'post_missing' });
  const meUser = db.prepare('SELECT role FROM users WHERE id = ?').get(me);
  if (p.user_id !== me && meUser?.role !== 'admin')
    return res.status(403).json({ error: 'Можно удалять только свои посты', code: 'not_owner' });
  const del = db.transaction(() => {
    db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(id);
    db.prepare('DELETE FROM post_comments WHERE post_id = ?').run(id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  });
  del();
  res.json({ ok: true, deleted: id });
});
