import { Router } from 'express';
import { db } from '../db.js';

// Список мест — общий для сайта и приложения.
// Вход не требуем: это справочник достопримечательностей, ничего личного в нём
// нет, а сайту он нужен ещё до авторизации.
export const placesRouter = Router();

function toPlace(row) {
  const parse = (s, fallback) => {
    try {
      return JSON.parse(s);
    } catch {
      return fallback; // битая строка в базе не должна ронять весь список
    }
  };
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    duration: row.duration,
    rating: row.rating,
    ratingCount: row.rating_count,
    tags: parse(row.tags, []),
    imageUrl: row.image_url,
    photos: parse(row.photos, []),
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    ticketUrl: row.ticket_url,
  };
}

// GET /api/places — все места, по возрастанию id.
placesRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM places ORDER BY id').all();
  res.json({ places: rows.map(toPlace) });
});
