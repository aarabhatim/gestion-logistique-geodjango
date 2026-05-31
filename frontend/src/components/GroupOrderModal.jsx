import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useI18n } from '../contexts/I18nContext';

/**
 * GroupOrderModal — Commande collective (Mode Groupe)
 *
 * Usage dans ClientDashboard :
 *   const [showGroup, setShowGroup] = useState(false);
 *   <GroupOrderModal boutiqueId={boutique.id} onClose={() => setShowGroup(false)} onOrder={handleGroupOrder} />
 */

const GroupOrderModal = ({ boutiqueId, onClose, onOrder }) => {
  const [step, setStep] = useState('menu'); // menu | waiting | ready
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [membres, setMembres] = useState([]);
  const [polling, setPolling] = useState(null);

  const creerSession = async () => {
    setLoading(true);
    try {
      const res = await api.post('/mode-groupe/creer/', { boutique_id: boutiqueId });
      setSession(res.data);
      setStep('waiting');
      startPolling(res.data.code);
    } catch {
      alert(t('go_err_create'));
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (code) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/mode-groupe/${code}/`);
        setMembres(res.data.membres || []);
        if (res.data.membres?.every(m => m.est_pret)) {
          setStep('ready');
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    setPolling(interval);
  };

  useEffect(() => {
    return () => { if (polling) clearInterval(polling); };
  }, [polling]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/rejoindre-groupe/${session?.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validerCommande = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await api.post(`/mode-groupe/${session.code}/valider/`);
      onOrder && onOrder(session);
      onClose();
    } catch {
      alert(t('go_err_validate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      style={{ zIndex: 'var(--z-modal, 300)' }}
    >
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <h2 className="font-bold text-[var(--color-text)] font-heading">{t('go_title')}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl">✕</button>
        </div>

        <div className="p-5">
          {step === 'menu' && (
            <div className="space-y-4">
              <div className="bg-[var(--color-primary-10)] rounded-xl p-4 text-sm text-[var(--color-text)]">
                <p className="font-semibold text-[var(--color-primary)] mb-2">{t('go_how_title')}</p>
                <ol className="space-y-1 text-[var(--color-text-secondary)] list-decimal list-inside">
                  <li>{t('go_step1')}</li>
                  <li>{t('go_step2')}</li>
                  <li>{t('go_step3')}</li>
                  <li>{t('go_step4')}</li>
                </ol>
              </div>
              <button
                onClick={creerSession}
                disabled={loading}
                className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t('go_creating')}
                  </>
                ) : t('go_create_btn')}
              </button>
            </div>
          )}

          {step === 'waiting' && session && (
            <div className="space-y-4">
              {/* Lien invitation */}
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-2">{t('go_share_link')}</p>
                <div className="flex items-center gap-2 bg-[var(--color-surface-alt)] rounded-xl px-3 py-2">
                  <code className="flex-1 text-xs text-[var(--color-text-secondary)] truncate">
                    {window.location.origin}/rejoindre-groupe/{session.code}
                  </code>
                  <button
                    onClick={copyLink}
                    className="text-[var(--color-primary)] text-xs font-semibold flex-shrink-0"
                  >
                    {copied ? t('go_copied') : t('go_copy')}
                  </button>
                </div>
              </div>

              {/* Membres */}
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-2">
                  {t('go_members')} ({membres.length}) — {t('go_auto_update')}
                </p>
                <div className="space-y-2">
                  {membres.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-alt)]">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center">
                        {m.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--color-text)]">{m.username}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {m.articles?.length || 0} {t('ml_article_unit')}
                        </p>
                      </div>
                      <span className={`text-sm ${m.est_pret ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                        {m.est_pret ? t('go_ready_badge') : t('go_in_progress_badge')}
                      </span>
                    </div>
                  ))}
                  {membres.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-3">
                      {t('go_waiting')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-surface-alt)] transition-colors"
                >
                  {t('common_cancel')}
                </button>
                <button
                  disabled={membres.length === 0 || !membres.every(m => m.est_pret)}
                  onClick={() => setStep('ready')}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  {t('go_force_valid')}
                </button>
              </div>
            </div>
          )}

          {step === 'ready' && (
            <div className="text-center space-y-4">
              <div className="text-6xl py-4">🎉</div>
              <h3 className="text-xl font-bold text-[var(--color-text)]">{t('go_all_ready')}</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {membres.length} {t('go_participants_suffix')}
              </p>
              <button
                onClick={validerCommande}
                disabled={loading}
                className="w-full bg-[var(--color-success)] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {loading ? t('go_validating') : t('go_validate_btn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupOrderModal;
