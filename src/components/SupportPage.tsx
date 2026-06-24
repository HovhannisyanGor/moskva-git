import { useState } from 'react';
import { api } from '../utils/api';

// === Контакты — меняй здесь (одно место) ===
const CONTACTS = {
  email: 'erik.zhamkochyan@mail.ru',
  telegram: 'localee_app', // без @; поменяй на реальный ник
};

export default function SupportPage({ onBack }: { onBack?: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    setError('');
    try {
      await api.sendSupport(t);
      setSent(true);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-scroll">
      <div className="support-page">
        <div className="sup-head">
          {onBack && (
            <button className="sup-back" type="button" onClick={onBack} aria-label="Назад">
              ‹
            </button>
          )}
          <span className="sup-title">Поддержка и контакты</span>
        </div>

        {/* Контакты для сотрудничества */}
        <div className="sup-section">
          <div className="sup-section-title">Сотрудничество</div>
          <div className="sup-section-sub">По вопросам партнёрства и сотрудничества пишите нам:</div>
          <a className="sup-contact" href={`mailto:${CONTACTS.email}`}>
            <span className="sup-contact-ic">✉️</span>
            <span className="sup-contact-body">
              <span className="sup-contact-label">Почта</span>
              <span className="sup-contact-val">{CONTACTS.email}</span>
            </span>
            <span className="sup-contact-arrow">›</span>
          </a>
          <a
            className="sup-contact"
            href={`https://t.me/${CONTACTS.telegram}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="sup-contact-ic">✈️</span>
            <span className="sup-contact-body">
              <span className="sup-contact-label">Telegram</span>
              <span className="sup-contact-val">@{CONTACTS.telegram}</span>
            </span>
            <span className="sup-contact-arrow">›</span>
          </a>
        </div>

        {/* Чат с поддержкой (форма обращения) */}
        <div className="sup-section">
          <div className="sup-section-title">Написать в поддержку</div>
          {sent ? (
            <div className="sup-sent">
              <span className="sup-sent-ic">✅</span>
              <div className="sup-sent-body">
                <div className="sup-sent-title">Обращение отправлено</div>
                <div className="sup-sent-sub">Мы получили ваше сообщение и ответим в ближайшее время.</div>
              </div>
              <button className="sup-sent-again" type="button" onClick={() => setSent(false)}>
                Написать ещё
              </button>
            </div>
          ) : (
            <>
              <div className="sup-section-sub">Опишите вопрос или проблему — мы поможем.</div>
              <textarea
                className="sup-textarea"
                placeholder="Ваше сообщение…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                maxLength={4000}
              />
              {error && <div className="sup-error">{error}</div>}
              <button
                className="sup-submit"
                type="button"
                onClick={submit}
                disabled={sending || !text.trim()}
              >
                {sending ? 'Отправка…' : 'Отправить'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
