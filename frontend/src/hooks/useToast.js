import { useState, useCallback } from 'react';

/**
 * Hook useToast — remplace tous les alert() natifs
 *
 * Usage dans un composant:
 *   const { toasts, toast } = useToast();
 *   toast.success('Commande validée !');
 *   toast.error('Une erreur est survenue.');
 *   toast.info('Mise à jour disponible.');
 *
 * Puis dans le JSX : <ToastContainer toasts={toasts} />
 */

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type, message, duration = 3500 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    dismiss,
    toast: {
      success: (msg, opts) => addToast({ type: 'success', message: msg, ...opts }),
      error:   (msg, opts) => addToast({ type: 'error',   message: msg, ...opts }),
      info:    (msg, opts) => addToast({ type: 'info',    message: msg, ...opts }),
      warning: (msg, opts) => addToast({ type: 'warning', message: msg, ...opts }),
    },
  };
};
