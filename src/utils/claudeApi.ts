import type { FilterParams, Place, Route, RouteStop } from '../types';
import { PLACES } from '../data/places';

const SYSTEM_PROMPT = (places: Place[]) => `Ты — AI-помощник сервиса Routeo. Помогаешь туристам и москвичам исследовать город.

Твоя задача — составлять персональные маршруты прогулок по Москве на основе предпочтений пользователя.

ДОСТУПНЫЕ МЕСТА (используй ТОЛЬКО эти ID):
${places.map(p => `ID ${p.id}: ${p.name} (${p.category}, цена ${p.price}₽, ~${p.duration}мин) — ${p.description.slice(0, 80)}`).join('\n')}

ПРАВИЛА:
- Подбирай места исходя из фильтров: время, бюджет, компания, интересы
- Учитывай географическую близость мест (не строй маршрут через весь город)
- Для семьи с детьми — только парки и доступные места
- Если бюджет "бесплатно" — price: 0 только
- Давай краткий совет по каждому месту

ОТВЕЧАЙ СТРОГО В JSON (без markdown, без текста вне JSON):
{
  "greeting": "Живое, конкретное описание маршрута (2-3 предложения). Назови места по имени.",
  "route": {
    "id": "route_1",
    "title": "Название маршрута (до 5 слов)",
    "description": "Одна строка описания",
    "stops": [
      { "placeId": 1, "order": 1, "tip": "Краткий совет (1 предложение)" }
    ],
    "tags": ["тег1", "тег2"]
  },
  "totalTime": 240,
  "totalPrice": 1300
}`;

export async function getRouteFromClaude(
  userMessage: string,
  filters: FilterParams,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ text: string; route?: Route }> {
  const enrichedMessage = `${userMessage}

Параметры пользователя:
- Время на прогулку: ${filters.time}
- Компания: ${filters.people}
- Бюджет: ${filters.budget}
- Интересы: ${filters.interests}`;

  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: enrichedMessage },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT(PLACES),
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content.map((c: { text?: string }) => c.text || '').join('').trim();

  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const stops: RouteStop[] = (parsed.route?.stops || [])
      .map((s: { placeId: number; order: number; tip?: string }) => {
        const place = PLACES.find(p => p.id === s.placeId);
        if (!place) return null;
        return { place, order: s.order, tip: s.tip };
      })
      .filter(Boolean);

    const route: Route = {
      id: parsed.route?.id || 'route_1',
      title: parsed.route?.title || 'Маршрут',
      description: parsed.route?.description || '',
      stops,
      totalTime: parsed.totalTime || 0,
      totalPrice: parsed.totalPrice || 0,
      tags: parsed.route?.tags || [],
    };

    return { text: parsed.greeting || '', route };
  } catch {
    return { text: raw };
  }
}
