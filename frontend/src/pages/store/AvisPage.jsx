import { useState, useEffect } from 'react';
import { avisApi } from '../../services/api';
import '../../styles/marjane.css';
import { useI18n } from '../../contexts/I18nContext';

const NOTE_COLOR = (n) => {
  if (n >= 4) return '#22C55E';
  if (n >= 3) return '#F59E0B';
  return '#E30613';
};

const StarRow = ({ note }) => {
  const rounded = Math.round(note || 0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: 14, color: i <= rounded ? '#F59E0B' : '#E5E5E5' }}>★</span>
      ))}
    </div>
  );
};

export default function AvisPage() {
  const { t } = useI18n();
  const [avis, setAvis]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [replyId, setReplyId]     = useState(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [filter, setFilter]       = useState('tous');
  const [search, setSearch]       = useState('');

  const load = () => {
    setLoading(true);
    avisApi.list()
      .then(r => setAvis(r.data?.results || r.data || []))
      .catch(() => setAvis([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReply = (id) => {
    setSaving(true); setError(null);
    avisApi.reply(id, replyText)
      .then(() => { setReplyId(null); setReplyText(''); load(); })
      .catch(e => setError(e.response?.data?.detail || 'Erreur'))
      .finally(() => setSaving(false));
  };

  // Stats
  const total       = avis.length;
  const moyenne     = total ? (avis.reduce((s, a) => s + (a.note || 0), 0) / total).toFixed(1) : '—';
  const sansReponse = avis.filter(a => !a.reponse_fondateur).length;

  const byNote = [5, 4, 3, 2, 1].map(n => ({
    n, count: avis.filter(a => Math.round(a.note) === n).length,
  }));

  const filtered = avis.filter(a => {
    if (filter === 'sans_reponse' && a.reponse_fondateur) return false;
    if (filter === 'avec_reponse' && !a.reponse_fondateur) return false;
    if (search && !a.commentaire?.toLowerCase().includes(search.toLowerCase()) &&
        !a.client_nom?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mj-page" style={{ maxWidth: 1000, padding: '0 0 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, #F59E0B, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>⭐</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            Avis clients
          </h1>
          <div style={{ color: 'var(--mj-text-3)', fontSize: 13, marginTop: 2 }}>
            Notes, commentaires et réponses
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: t('av_avg_rating'), value: moyenne, icon: '⭐', color: '#F59E0B' },
          { label: t('av_total_reviews'), value: total, icon: '💬', color: '#3b82f6' },
          { label: t('av_no_reply_badge'), value: sansReponse, icon: '📬', color: sansReponse ? '#E30613' : '#22C55E' },
        ].map((k, i) => (
          <div key={i} className="mj-stat-card" style={{ borderLeft: `3px solid ${k.color}`, borderTop: 'none' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Distribution des notes ── */}
      <div className="mj-card" style={{ marginBottom: 24 }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
          Distribution des notes
        </h4>
        {byNote.map(({ n, count }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 28, color: '#F59E0B', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
              {n}★
            </div>
            <div style={{ flex: 1, height: 10, background: 'var(--mj-border)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6,
                background: NOTE_COLOR(n),
                width: total ? `${(count / total) * 100}%` : '0%',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ width: 28, color: 'var(--mj-text-3)', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>
              {count}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { v: 'tous', l: t('state_all') },
          { v: 'sans_reponse', l: `📬 ${t('av_no_reply_badge')}` },
          { v: 'avec_reponse', l: `✅ ${t('av_with_reply')}` },
        ].map(f => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`mj-btn mj-btn-sm ${filter === f.v ? 'mj-btn-primary' : 'mj-btn-secondary'}`}
          >
            {f.l}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('action_search')}
          className="mj-input mj-search"
          style={{ marginLeft: 'auto', width: 200 }}
        />
      </div>

      {/* ── Avis list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="mj-card">
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div className="mj-skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="mj-skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                  <div className="mj-skeleton" style={{ height: 12, width: '25%' }} />
                </div>
              </div>
              <div className="mj-skeleton" style={{ height: 50, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mj-empty">
          <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>{t('av_no_reviews')}</h3>
          <p style={{ margin: 0, color: 'var(--mj-text-3)', fontSize: 14 }}>
            {search ? `${t('av_no_results_for')} "${search}"` : t('av_no_filter')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(a => (
            <div key={a.id} className="mj-card" style={{ padding: 20 }}>
              {/* En-tête */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div className="mj-avatar" style={{ flexShrink: 0 }}>
                  {a.client_nom?.charAt(0)?.toUpperCase() || '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--mj-text)', fontWeight: 700, fontSize: 15, fontFamily: 'var(--mj-font)' }}>
                      {a.client_nom || t('lbl_client')}
                    </span>
                    <StarRow note={a.note} />
                    <span style={{
                      fontSize: 13, color: NOTE_COLOR(a.note), fontWeight: 700,
                    }}>
                      {a.note}/5
                    </span>
                  </div>
                  <div style={{ color: 'var(--mj-text-3)', fontSize: 12, marginTop: 2 }}>
                    {a.commande_ref && `${t('av_order_prefix')} ${a.commande_ref} · `}
                    {a.date_creation?.slice(0, 10)}
                  </div>
                </div>
                {!a.reponse_fondateur && (
                  <span className="mj-badge" style={{
                    background: 'var(--mj-red-light)', color: 'var(--mj-red)',
                    border: '1px solid rgba(227,6,19,0.2)', flexShrink: 0,
                  }}>
                    {t('av_no_reply_badge')}
                  </span>
                )}
              </div>

              {/* Commentaire */}
              {a.commentaire && (
                <div style={{
                  color: 'var(--mj-text)', fontSize: 14, lineHeight: 1.7,
                  background: 'var(--mj-bg)', borderRadius: 10,
                  padding: '12px 16px', marginBottom: 12,
                  borderLeft: `3px solid ${NOTE_COLOR(a.note)}`,
                }}>
                  "{a.commentaire}"
                </div>
              )}

              {/* Réponse fondateur */}
              {a.reponse_fondateur && (
                <div style={{
                  background: 'rgba(227,6,19,0.04)', border: '1px solid rgba(227,6,19,0.12)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 12,
                }}>
                  <div style={{ color: 'var(--mj-red)', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>
                    💬 Votre réponse
                  </div>
                  <div style={{ color: 'var(--mj-text)', fontSize: 13, lineHeight: 1.6 }}>
                    {a.reponse_fondateur}
                  </div>
                </div>
              )}

              {/* Zone de réponse */}
              {replyId === a.id ? (
                <div>
                  {error && (
                    <div style={{ color: '#E30613', fontSize: 12, marginBottom: 8 }}>{error}</div>
                  )}
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    placeholder={t('av_reply_ph')}
                    className="mj-input"
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 10 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleReply(a.id)}
                      disabled={saving || !replyText.trim()}
                      className="mj-btn mj-btn-primary"
                    >
                      {saving ? t('av_sending') : `📤 ${t('av_send_reply')}`}
                    </button>
                    <button
                      onClick={() => { setReplyId(null); setReplyText(''); setError(null); }}
                      className="mj-btn mj-btn-secondary"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyId(a.id); setReplyText(a.reponse_fondateur || ''); setError(null); }}
                  className="mj-btn mj-btn-outline-red mj-btn-sm"
                >
                  {a.reponse_fondateur ? `✏️ ${t('av_edit_reply')}` : `💬 ${t('av_reply_btn')}`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
