// Демо-пользователи — чтобы было кого найти в поиске и кому написать (тест чатов).
// Запуск из папки server:  npm run seed   (или  node seed.js)
// Безопасно запускать повторно — существующих не трогает.
//
// Войти под ними (например, во втором окне браузера) можно с паролем demo1234,
// тогда можно переписываться «сам с собой» и проверить чат в обе стороны.
import { db } from './src/db.js';
import { hashPassword } from './src/auth.js';

const PASSWORD = 'demo1234';

const DEMO = [
  { name: 'Анна',   handle: 'anna',    email: 'anna@localee.demo',  color: '#E0568A', letter: 'А', bio: 'Люблю прогулки по центру.' },
  { name: 'Максим', handle: 'maxim',   email: 'maxim@localee.demo', color: '#378ADD', letter: 'М', bio: 'Ищу компанию по музеям.' },
  { name: 'Localee', handle: 'localee', email: 'team@localee.demo', color: '#FA3C3C', letter: 'L', bio: 'Команда Localee — пиши, поможем!' },
];

let created = 0;
for (const u of DEMO) {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ? OR handle = ?').get(u.email, u.handle);
  if (exists) {
    console.log(`= уже есть: @${u.handle}`);
    continue;
  }
  db.prepare(`
    INSERT INTO users (handle, name, email, password_hash, color, letter, bio, city, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Москва', '', ?)
  `).run(u.handle, u.name, u.email, hashPassword(PASSWORD), u.color, u.letter, u.bio, new Date().toISOString());
  created++;
  console.log(`+ создан: @${u.handle}  (вход: ${u.email} / ${PASSWORD})`);
}

console.log(`\nГотово. Создано: ${created}. В чатах нажми «+» и найди их по нику: anna, maxim, localee.`);
process.exit(0);
