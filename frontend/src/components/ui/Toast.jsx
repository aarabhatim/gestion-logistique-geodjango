import React, { useEffect, useState } from 'react';

/**
 * Toast container — à placer une seule fois dans App.jsx ou Layout.jsx
 *
 * Usage:
 *   // Dans App.jsx
 *   const { toasts, toast, dismiss } = useToast();
 *   <ToastContainer toasts={toasts} onDismiss={dismiss} />
 *
 *   // N'importe où dans l'arbre (via Context recommandé) :
 *   toast.success('Enregistré !');
 */

const icons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
};

const colors = {
  success: { bg: 'bg-[var(--color-success)]',  icon: 'text-white', bar: 'bg-white/30' },
  error:   { bg: 'bg-[var(--color-danger)]',   icon: 'text-white', bar: 'bg-white/30' },
  info:    { bg: 'bg-[var(--color-secondary)]', icon: 'text-white', bar: 'bg-white/30' },
  warning: { bg: 'bg-[var(--color-warning)]',  icon: 'text-white', bar: 'bg-white/30' },
};

const Toast = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const c = colors[toast.type] || colors.info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-xl
        transition-all duration-300 min-w-64 max-w-sm cursor-pointer
        ${c.bg}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
      onClick={() => onDismiss(toast.id)}
    >
      <span className={`mt-0.5 flex-shrink-0 ${c.icon}`}>{icons[toast.type]}</span>
      <p className="text-sm font-medium leading-snug">{toast.message}</p>
      <button
        className="ml-auto text-white/60 hover:text-white text-lg leading-none flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
      >×</button>
      {/* Barre de progression */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${c.bar} rounded-full animate-[shrink_3.5s_linear_forwards]`} style={{ width: '100%' }} />
    </div>
  );
};

export const ToastContainer = ({ toasts = [], onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed bottom-5 right-5 flex flex-col gap-2"
      style={{ zIndex: 'var(--z-toast, 400)' }}
      aria-live="polite"
    >
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastContainer;
