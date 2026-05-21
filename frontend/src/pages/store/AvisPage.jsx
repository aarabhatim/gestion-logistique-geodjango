import { useState, useEffect } from 'react';
import { avisApi } from '../../services/api';

const STARS = (n) => '⭐'.repeat(Math.round(n || 0));

const NOTE_COLOR = (n) => {
  if (n >= 4) return '#22c55e';
  if (n >= 3) return '#f59e0b';
  return '#ef4444';
};

export default function AvisPage() {
  const [avis, setAvis]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [replyId, setReplyId]   = useState(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('tous');
  const [search, setSearch]     = useState('');

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
  const total   = avis.length;
  const moyenne = total ? (avis.reduce((s, a) => s + (a.note || 0), 0) / total).toFixed(1) : '—';
  const sansReponse = avis.filter(a => !a.reponse_fondateur).length;

  const byNote = [5,4,3,2,1].map(n => ({
    n, count: avis.filter(a => Math.round(a.note) === n).length
  }));

  const filtered = avis.filter(a => {
    if (filter === 'sans_reponse' && a.reponse_fondateur) return false;
    if (filter === 'avec_reponse' && !a.reponse_fondateur) return false;
    if (search && !a.commentaire?.toLowerCase().includes(search.toLowerCase()) &&
        !a.client_nom?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg,#f59e0b,#f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>⭐</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
            Avis clients
          </h1>
          <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: 13 }}>
            Notes, commentaires et réponses
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Note moyenne', value: moyenne, icon: '⭐', color: '#f59e0b' },
          { label: 'Total avis', value: total, icon: '💬', color: '#6366f1' },
          { label: 'Sans réponse', value: sansReponse, icon: '📬', color: sansReponse ? '#ef4444' : '#22c55e' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 14, padding: '16px 20px', borderLeft: `3px solid ${k.color}`
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Distribution des notes */}
      <div style={{
        background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 14, padding: '16px 20px', marginBottom: 24
      }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Distribution des notes</div>
        {byNote.map(({ n, count }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 22, color: '#94a3b8', fontSize: 13, textAlign: 'right' }}>{n}★</div>
            <div style={{ flex: 1, height: 10, background: 'rgba(71,85,105,0.3)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 5,
                background: NOTE_COLOR(n),
                width: total ? `${(count / total) * 100}%` : '0%',
                transition: 'width 0.6s ease'
              }} />
            </div>
            <div style={{ width: 28, color: '#64748b', fontSize: 12, textAlign: 'right' }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { v: 'tous', l: 'Tous' },
          { v: 'sans_reponse', l: '📬 Sans réponse' },
          { v: 'avec_reponse', l: '✅ Avec réponse' },
        ].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{
            background: filter === f.v ? 'rgba(99,102,241,0.25)' : 'rgba(30,41,59,0.5)',
            border: `1px solid ${filter === f.v ? 'rgba(99,102,241,0.5)' : 'rgba(71,85,105,0.3)'}`,
            color: filter === f.v ? '#a5b4fc' : '#64748b',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13
          }}>{f.l}</button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{
            marginLeft: 'auto', padding: '6px 12px',
            background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', width: 200
          }}
        />
      </div>

      {/* Avis list */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'rgba(30,41,59,0.5)', border: '1px dashed rgba(71,85,105,0.3)',
          borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b'
        }}>Aucun avis</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: 14, padding: '18px 20px'
            }}>
              {/* En-tête avis */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
                }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
                      {a.client_nom || 'Client'}
                    </span>
                    <span style={{
                      fontSize: 15, color: NOTE_COLOR(a.note), fontWeight: 700
                    }}>
                      {'★'.repeat(Math.round(a.note || 0))}{'☆'.repeat(5 - Math.round(a.note || 0))}
                      <span style={{ color: NOTE_COLOR(a.note), marginLeft: 4, fontSize: 13 }}>{a.note}/5</span>
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: 12 }}>
                    {a.commande_ref && `Commande ${a.commande_ref} · `}
                    {a.date_creation?.slice(0,10)}
                  </div>
                </div>
                {!a.reponse_fondateur && (
                  <span style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11
                  }}>Sans réponse</span>
                )}
              </div>

              {/* Commentaire */}
              {a.commentaire && (
                <div style={{
                  color: '#cbd5e1', fontSize: 14, lineHeight: 1.6,
                  background: 'rgba(15,23,42,0.3)', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 10
                }}>
                  "{a.commentaire}"
                </div>
              )}

              {/* Réponse fondateur */}
              {a.reponse_fondateur && (
                <div style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 10
                }}>
                  <div style={{ color: '#a5b4fc', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                    💬 Votre réponse
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: 13 }}>{a.reponse_fondateur}</div>
                </div>
              )}

              {/* Zone de réponse */}
              {replyId === a.id ? (
                <div>
                  {error && (
                    <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 6 }}>{error}</div>
                  )}
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Votre réponse au client…"
                    style={{
                      width: '100%', padding: '8px 12px',
                      background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: 8, color: '#f1f5f9', fontSize: 13,
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleReply(a.id)}
                      disabled={saving || !replyText.trim()}
                      style={{
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', color: '#fff', borderRadius: 8,
                        padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
                      }}
                    >
                      {saving ? 'Envoi…' : '📤 Envoyer la réponse'}
                    </button>
                    <button
                      onClick={() => { setReplyId(null); setReplyText(''); setError(null); }}
                      style={{
                        background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)',
                        color: '#94a3b8', borderRadius: 8, padding: '7px 14px',
                        cursor: 'pointer', fontSize: 13
                      }}
                    >Annuler</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyId(a.id); setReplyText(a.reponse_fondateur || ''); setError(null); }}
                  style={{
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                    color: '#a5b4fc', borderRadius: 8, padding: '6px 14px',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}
                >
                  {a.reponse_fondateur ? '✏️ Modifier la réponse' : '💬 Répondre'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
