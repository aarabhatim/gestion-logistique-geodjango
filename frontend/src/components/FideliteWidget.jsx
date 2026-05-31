import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useI18n } from '../contexts/I18nContext';

/**
 * FideliteWidget — Points de fidélité client
 *
 * Usage dans ClientDashboard :
 *   import FideliteWidget from '../components/FideliteWidget';
 *   <FideliteWidget />
 */

const FideliteWidget = ({ compact = false }) => {
  const { t } = useI18n();
  const [compte, setCompte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toConvert, setToConvert] = useState(100);

  useEffect(() => {
    api.get('/fidelite/mon-compte/')
      .then(r => setCompte(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConvert = async () => {
    if (!compte || compte.points < toConvert) return;
    setConverting(true);
    try {
      const res = await api.post('/fidelite/utiliser-points/', { points: toConvert });
      alert(`✅ ${res.data.message}`);
      const updated = await api.get('/fidelite/mon-compte/');
      setCompte(updated.data);
    } catch (e) {
      alert('❌ ' + (e.response?.data?.error || 'Erreur'));
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-24 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />
    );
  }

  if (!compte) return null;

  const percent = Math.min(100, (compte.points % 100));
  const reduction = compte.reduction_disponible;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary-10)] border border-[var(--color-primary)] border-opacity-20">
        <span className="text-xl">⭐</span>
        <div>
          <p className="text-sm font-bold text-[var(--color-primary)]">{compte.points} pts</p>
          {reduction > 0 && <p className="text-xs text-[var(--color-text-secondary)]">{reduction} {t('fw_dzd_dispo')}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl p-5 text-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{t('fw_pts_label')}</p>
            <p className="text-2xl font-bold">{compte.points.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">{t('fw_reduction')}</p>
          <p className="text-lg font-bold">{reduction} DZD</p>
        </div>
      </div>

      {/* Barre progression vers prochain palier */}
      <div className="mb-4">
        <div className="flex justify-between text-xs opacity-80 mb-1">
          <span>{percent} / 100 {t('fw_progress_suffix')}</span>
          <span>+50 DZD</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Conversion */}
      {reduction > 0 && (
        <div className="bg-white/10 rounded-xl p-3 mb-3">
          <p className="text-xs font-medium mb-2 opacity-90">{t('fw_convert')}</p>
          <div className="flex items-center gap-2">
            <select
              value={toConvert}
              onChange={e => setToConvert(Number(e.target.value))}
              className="flex-1 bg-white/20 text-white text-sm px-2 py-1.5 rounded-lg border border-white/30 outline-none"
            >
              {[100, 200, 300, 400, 500].filter(v => v <= compte.points).map(v => (
                <option key={v} value={v} className="text-black">{v} pts → {(v/100)*50} DZD</option>
              ))}
            </select>
            <button
              onClick={handleConvert}
              disabled={converting}
              className="bg-white text-[var(--color-primary)] px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-white/90 disabled:opacity-60 transition-colors flex-shrink-0"
            >
              {converting ? '⌛' : t('fw_use')}
            </button>
          </div>
        </div>
      )}

      {/* Historique toggle */}
      <button
        onClick={() => setShowHistory(prev => !prev)}
        className="text-xs opacity-70 hover:opacity-100 transition-opacity underline"
      >
        {showHistory ? t('fw_hide_history') : t('fw_see_history')}
      </button>

      {showHistory && compte.transactions?.length > 0 && (
        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
          {compte.transactions.slice(0, 10).map(tx => (
            <div key={tx.id} className="flex items-center justify-between text-xs bg-white/10 rounded-lg px-2 py-1">
              <span className="opacity-80 truncate flex-1">{tx.raison || tx.type}</span>
              <span className={`font-semibold ml-2 ${tx.type === 'GAIN' ? 'text-green-300' : 'text-red-300'}`}>
                {tx.type === 'GAIN' ? '+' : '-'}{tx.points} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FideliteWidget;
