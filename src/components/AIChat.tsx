import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, FilterParams, Route } from '../types';
import { getRouteFromClaude } from '../utils/claudeApi';

interface AIChatProps {
  onRouteUpdate: (route: Route | null) => void;
}

const FILTER_OPTIONS = {
  time: [
    { value: '2h', label: '2 часа' },
    { value: '4h', label: '4 часа' },
    { value: 'fullday', label: 'Весь день' },
    { value: 'weekend', label: 'Выходные' },
  ],
  people: [
    { value: 'solo', label: 'Один' },
    { value: 'couple', label: 'Вдвоём' },
    { value: 'family', label: 'С детьми' },
    { value: 'group', label: 'Группа' },
  ],
  budget: [
    { value: 'free', label: 'Бесплатно' },
    { value: '2000', label: 'До 2 000 ₽' },
    { value: '5000', label: 'До 5 000 ₽' },
    { value: 'unlimited', label: 'Без лимита' },
  ],
  interests: [
    { value: 'all', label: 'Всё подряд' },
    { value: 'culture', label: 'История' },
    { value: 'nature', label: 'Природа' },
    { value: 'art', label: 'Искусство' },
    { value: 'food', label: 'Гастрономия' },
  ],
};

export default function AIChat({ onRouteUpdate }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Привет! Я помогу составить идеальный маршрут по Москве.\n\nЗадай параметры фильтрами ниже или просто напиши, что тебе интересно — и я проложу маршрут прямо на карте.',
      timestamp: new Date(),
    },
  ]);
  const [filters, setFilters] = useState<FilterParams>({
    time: 'fullday',
    people: 'couple',
    budget: '2000',
    interests: 'all',
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const { text: responseText, route } = await getRouteFromClaude(text, filters, history);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (route) onRouteUpdate(route);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Не удалось получить ответ. Проверь подключение к интернету и попробуй снова.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearRoute = () => {
    onRouteUpdate(null);
    setMessages([{
      role: 'assistant',
      content: 'Маршрут сброшен. Напиши новый запрос — составлю другой маршрут!',
      timestamp: new Date(),
    }]);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span className="sidebar-icon">✦</span>
          <span>AI-помощник</span>
        </div>
        <p className="sidebar-subtitle">Опиши, что хочешь — составлю маршрут</p>
      </div>

      <div className="filters">
        {(Object.entries(FILTER_OPTIONS) as [keyof FilterParams, typeof FILTER_OPTIONS.time][]).map(([key, options]) => (
          <div className="filter-group" key={key}>
            <label className="filter-label">
              {key === 'time' ? 'Время' : key === 'people' ? 'Компания' : key === 'budget' ? 'Бюджет' : 'Интересы'}
            </label>
            <select
              className="filter-select"
              value={filters[key]}
              onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
            >
              {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message message--${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-sender">✦ AI-помощник</div>
            )}
            <div className="message-bubble">
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message--assistant">
            <div className="message-sender">✦ AI-помощник</div>
            <div className="message-bubble typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Спросите AI-помощника: например, «маршрут на день по центру»…"
          rows={3}
          disabled={loading}
        />
        <div className="chat-actions">
          <button className="btn-clear" onClick={clearRoute}>
            Сбросить маршрут
          </button>
          <button className="btn-send" onClick={handleSend} disabled={loading || !input.trim()}>
            Построить ↗
          </button>
        </div>
      </div>
    </aside>
  );
}
