import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, FilterParams, Route } from '../types';
import { getRouteFromClaude } from '../utils/claudeApi';
import { useI18n } from '../i18n';

interface AIChatProps {
  onRouteUpdate: (route: Route | null) => void;
}

// Значения фильтров (метки берём из словаря по ключу ai.opt.<группа>.<значение>).
const FILTER_OPTIONS: Record<keyof FilterParams, string[]> = {
  time: ['2h', '4h', 'fullday', 'weekend'],
  people: ['solo', 'couple', 'family', 'group'],
  budget: ['free', '2000', '5000', 'unlimited'],
  interests: ['all', 'culture', 'nature', 'art', 'food'],
};

export default function AIChat({ onRouteUpdate }: AIChatProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: t('ai.greeting'),
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
        content: t('ai.error'),
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
      content: t('ai.resetMsg'),
      timestamp: new Date(),
    }]);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span className="sidebar-icon">✦</span>
          <span>{t('ai.title')}</span>
        </div>
        <p className="sidebar-subtitle">{t('ai.subtitle')}</p>
      </div>

      <div className="filters" ref={filtersRef}>
        {(Object.keys(FILTER_OPTIONS) as (keyof FilterParams)[]).map((key) => {
          const options = FILTER_OPTIONS[key];
          const isOpen = openFilter === key;
          const current = options.includes(filters[key]) ? t(`ai.opt.${key}.${filters[key]}`) : '';
          return (
            <div className={`filter-group${isOpen ? ' filter-group--open' : ''}`} key={key}>
              <label className="filter-label">{t(`ai.f.${key}`)}</label>
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
                  {options.map((value, i) => {
                    const active = filters[key] === value;
                    return (
                      <button
                        type="button"
                        key={value}
                        role="option"
                        aria-selected={active}
                        className={`filter-opt${active ? ' filter-opt--active' : ''}`}
                        style={{ animationDelay: `${i * 35}ms` }}
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, [key]: value }));
                          setOpenFilter(null);
                        }}
                      >
                        <span>{t(`ai.opt.${key}.${value}`)}</span>
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
              <div className="message-sender">{t('ai.sender')}</div>
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
          placeholder={t('ai.inputPh')}
          rows={3}
          disabled={loading}
        />
        <div className="chat-actions">
          <button className="btn-clear" onClick={clearRoute}>
            {t('ai.reset')}
          </button>
          <button className="btn-send" onClick={handleSend} disabled={loading || !input.trim()}>
            {t('ai.build')}
          </button>
        </div>
      </div>
    </aside>
  );
}
