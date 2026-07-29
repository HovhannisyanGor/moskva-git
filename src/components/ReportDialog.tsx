import { useEffect, useState } from 'react';
import { api, ApiError, REPORT_REASONS, type ReportReason, type ReportTarget } from '../utils/api';
import { useI18n } from '../i18n';

// Окно «пожаловаться». Одно на все виды контента: пост, комментарий,
// сообщение, метка на карте, профиль — отличается только targetType.
export default function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTarget;
  targetId: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.report({ targetType, targetId, reason, note: note.trim() || undefined });
      // Повторная жалоба — не ошибка: она уже принята, просто раньше.
      setDone(r.already ? t('report.already') : t('report.sent'));
      setTimeout(onClose, 1600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-backdrop" onClick={onClose}>
      <div className="report-card" onClick={(e) => e.stopPropagation()} role="dialog">
        {done ? (
          <div className="report-done">✓ {done}</div>
        ) : (
          <>
            <div className="report-title">{t('report.title')}</div>
            <div className="report-sub">{t('report.sub')}</div>

            <div className="report-reasons">
              {REPORT_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`report-reason${reason === r ? ' report-reason--on' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {t(`report.reason.${r}`)}
                </button>
              ))}
            </div>

            <textarea
              className="report-note"
              placeholder={t('report.notePh')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
            />

            {error && <div className="report-error">⚠️ {error}</div>}

            <div className="report-actions">
              <button type="button" className="report-cancel" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="button" className="report-send" onClick={send} disabled={busy}>
                {busy ? '…' : t('report.send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
