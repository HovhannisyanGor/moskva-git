// Универсальный in-memory rate-limit по IP и действию.
// Простой (без Redis) — на одном инстансе этого достаточно, чтобы отсечь ботов
// и спам постами/сообщениями/регистрациями. За nginx реальный IP берётся через
// trust proxy (см. index.js).

const buckets = new Map(); // "action:ip" -> { count, resetAt }

// Раз в 10 минут выкидываем протухшие записи, чтобы Map не рос бесконечно.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 10 * 60 * 1000).unref?.();

// action — ярлык эндпоинта, max — сколько запросов за окно, windowMs — окно.
export function rateLimit(action, max, windowMs) {
  return (req, res, next) => {
    const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const key = `${action}:${ip}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt < now) b = { count: 0, resetAt: now + windowMs };
    b.count += 1;
    buckets.set(key, b);
    if (b.count > max) {
      const secs = Math.ceil((b.resetAt - now) / 1000);
      res.set('Retry-After', String(secs));
      return res.status(429).json({
        error: `Слишком часто. Подождите ${secs > 60 ? Math.ceil(secs / 60) + ' мин.' : secs + ' c.'}`,
        code: 'rate_limited',
      });
    }
    next();
  };
}

const MIN = 60 * 1000;
// Готовые лимитеры под конкретные действия.
export const limitRegister = rateLimit('register', 5, 15 * MIN);   // 5 регистраций / 15 мин с IP
export const limitPost = rateLimit('post', 20, 60 * MIN);          // 20 постов / час
export const limitComment = rateLimit('comment', 40, 10 * MIN);    // 40 комментов / 10 мин
export const limitMessage = rateLimit('message', 90, MIN);         // 90 сообщений / мин (щедро)
export const limitPin = rateLimit('pin', 15, 60 * MIN);            // 15 меток / час
export const limitSupport = rateLimit('support', 5, 30 * MIN);     // 5 обращений / 30 мин
export const limitReport = rateLimit('report', 20, 60 * MIN);      // 20 жалоб / час (против «карусели» жалоб)
