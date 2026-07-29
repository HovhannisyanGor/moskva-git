import { useEffect, useState } from 'react';
import { api, type AdminUser } from '../utils/api';

// Окно блокировки пользователя. Открывается и из списка пользователей,
// и из разбора жалобы.
const DURATIONS = [
  { days: 1, label: 'Сутки' },
  { days: 7, label: 'Неделя' },
  { days: 30, label: 'Месяц' },
  { days: 0, label: 'Навсегда' },
];

export default function BanDialog({
  userId,
  handle,
  onClose,
  onBanned,
}: {
  userId: number;
  handle: string;
  onClose: () => void;
  onBanned: (u: AdminUser) => void;
}) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function ban() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      onBanned(await api.adminBan(userId, reason.trim(), days));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось заблокировать');
      setBusy(false);
    }
  }

  return (
    <div className="report-backdrop" onClick={onClose}>
      <div className="report-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="report-title">Заблокировать @{handle}</div>
        <div className="report-sub">
          Заблокированный не сможет ни войти, ни писать. Причину он увидит.
        </div>

        <div className="report-reasons">
          {DURATIONS.map((d) => (
            <button
              type="button"
              key={d.days}
              className={`report-reason${days === d.days ? ' report-reason--on' : ''}`}
              onClick={() => setDays(d.days)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <textarea
          className="report-note"
          placeholder="Причина — её увидит заблокированный"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={300}
        />

        {error && <div className="report-error">⚠️ {error}</div>}

        <div className="report-actions">
          <button type="button" className="report-cancel" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="report-send report-send--danger" onClick={ban} disabled={busy}>
            {busy ? '…' : 'Заблокировать'}
          </button>
        </div>
      </div>
    </div>
  );
}
