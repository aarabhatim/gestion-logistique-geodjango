import React, { useState, useEffect } from 'react';
import api from '../services/api';

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
      alert('Erreur lors de la création de la session');
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
      alert('Erreur lors de la validation');
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
            <h2 className="font-bold text-[var(--color-text)] font-heading">Commande Groupe</h2>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl">✕</button>
        </div>

        <div className="p-5">
          {step === 'menu' && (
            <div className="space-y-4">
              <div className="bg-[var(--color-primary-10)] rounded-xl p-4 text-sm text-[var(--color-text)]">
                <p className="font-semibold text-[var(--color-primary)] mb-2">💡 Comment ça marche ?</p>
                <ol className="space-y-1 text-[var(--color-text-secondary)] list-decimal list-inside">
                  <li>Créez une session et partagez le lien</li>
                  <li>Chaque ami choisit ses produits</li>
                  <li>Validez quand tout le monde est prêt</li>
                  <li>Une seule commande, une seule livraison !</li>
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
                    Création…
                  </>
                ) : '🚀 Créer une session groupe'}
              </button>
            </div>
          )}

          {step === 'waiting' && session && (
            <div className="space-y-4">
              {/* Lien invitation */}
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-2">Partage ce lien avec tes amis :</p>
                <div className="flex items-center gap-2 bg-[var(--color-surface-alt)] rounded-xl px-3 py-2">
                  <code className="flex-1 text-xs text-[var(--color-text-secondary)] truncate">
                    {window.location.origin}/rejoindre-groupe/{session.code}
                  </code>
                  <button
                    onClick={copyLink}
                    className="text-[var(--color-primary)] text-xs font-semibold flex-shrink-0"
                  >
                    {copied ? '✅ Copié' : '📋 Copier'}
                  </button>
                </div>
              </div>

              {/* Membres */}
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-2">
                  Membres ({membres.length}) — mise à jour auto…
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
                          {m.articles?.length || 0} article(s)
                        </p>
                      </div>
                      <span className={`text-sm ${m.est_pret ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                        {m.est_pret ? '✅ Prêt' : '⌛ En cours'}
                      </span>
                    </div>
                  ))}
                  {membres.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-3">
                      En attente de participants…
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-surface-alt)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  disabled={membres.length === 0 || !membres.every(m => m.est_pret)}
                  onClick={() => setStep('ready')}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Forcer la validation
                </button>
              </div>
            </div>
          )}

          {step === 'ready' && (
            <div className="text-center space-y-4">
              <div className="text-6xl py-4">🎉</div>
              <h3 className="text-xl font-bold text-[var(--color-text)]">Tout le monde est prêt !</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {membres.length} participant(s) — Les commandes vont être fusionnées en une seule livraison.
              </p>
              <button
                onClick={validerCommande}
                disabled={loading}
                className="w-full bg-[var(--color-success)] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {loading ? 'Validation…' : '✅ Valider la commande groupe'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupOrderModal;
