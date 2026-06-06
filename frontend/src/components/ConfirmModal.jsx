/**
 * ConfirmModal — replaces window.confirm() with a stylized dialog.
 */
import { useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';

export default function ConfirmModal({
  open, message, title, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true,
}) {
  const { t } = useI18n();
  const confirmBtnRef = useRef(null);
  const titleId = 'confirm-modal-title';
  const descId  = 'confirm-modal-desc';

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) confirmBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      aria-hidden="false"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={e => e.stopPropagation()}
        style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', animation: 'slideUp 0.2s ease' }}
      >
        <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 16, background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,138,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>
          {danger ? '⚠️' : '❓'}
        </div>

        <h2 id={titleId} style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>
          {title || t('confirm_modal_title') || "Confirmer l'action"}
        </h2>

        <p id={descId} style={{ fontSize: 14, color: '#A3A3A3', lineHeight: 1.6, margin: '0 0 28px' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            aria-label={cancelLabel || t('confirm_modal_cancel') || 'Annuler'}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#A3A3A3', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#252525'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#A3A3A3'; }}
          >
            {cancelLabel || t('confirm_modal_cancel') || 'Annuler'}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            aria-label={confirmLabel || t('confirm_modal_confirm') || 'Confirmer'}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#FF8A00,#FF6B00)', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: danger ? '0 4px 14px rgba(239,68,68,0.35)' : '0 4px 14px rgba(255,138,0,0.35)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {confirmLabel || t('confirm_modal_confirm') || 'Confirmer'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
