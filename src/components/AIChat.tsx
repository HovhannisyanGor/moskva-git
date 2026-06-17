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

const FILTER_LABELS: Record<keyof FilterParams, string> = {
  time: 'Время',
  people: 'Компания',
  budget: 'Бюджет',
  interests: 'Интересы',
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
  // Какой фильтр сейчас раскрыт (или null). Одно общее состояние на все фильтры —
  // поэтому тап по другому фильтру сразу переключает на него, без двойного клика.
  const [openFilter, setOpenFilter] = useState<keyof FilterParams | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Клик вне блока фильтров или Escape — закрыть открытый список.
  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setOpenFilter(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFilter(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openFilter]);

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

      <div className="filters" ref={filtersRef}>
        {(Object.keys(FILTER_OPTIONS) as (keyof FilterParams)[]).map((key) => {
          const options = FILTER_OPTIONS[key];
          const isOpen = openFilter === key;
          const current = options.find((o) => o.value === filters[key])?.label ?? '';
          return (
            <div className={`filter-group${isOpen ? ' filter-group--open' : ''}`} key={key}>
              <label className="filter-label">{FILTER_LABELS[key]}</label>
              <button
                type="button"
                className={`filter-trigger${isOpen ? ' filter-trigger--open' : ''}`}
                onClick={() => setOpenFilter(isOpen ? null : key)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
              >
                <span>{current}</span>
                <svg
                  className="filter-chevron"
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <div className="filter-pop" role="listbox">
                  {options.map((o, i) => {
                    const active = filters[key] === o.value;
                    return (
                      <button
                        type="button"
                        key={o.value}
                        role="option"
                        aria-selected={active}
                        className={`filter-opt${active ? ' filter-opt--active' : ''}`}
                        style={{ animationDelay: `${i * 35}ms` }}
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, [key]: o.value }));
                          setOpenFilter(null);
                        }}
                      >
                        <span>{o.label}</span>
                        {active && <span className="filter-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
