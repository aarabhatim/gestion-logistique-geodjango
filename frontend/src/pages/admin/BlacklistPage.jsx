import { useState, useEffect } from 'react';
import { blacklistApi } from '../../services/api';

const RAISONS = [
  { value: 'fraude',        label: 'Fraude',              icon: '🚫' },
  { value: 'inaccessible', label: 'Adresse inaccessible', icon: '🔒' },
  { value: 'dangereux',    label: 'Zone dangereuse',      icon: '⚠️' },
  { value: 'faux',         label: 'Fausse adresse',       icon: '❌' },
  { value: 'autre',        label: 'Autre',                icon: '📝' },
];

const RAISON_COLORS = {
  fraude:        { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#fca5a5' },
  inaccessible:  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#fcd34d' },
  dangereux:     { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#fca5a5' },
  faux:          { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', color: '#22c55e' },
  autre:         { bg: 'rgba(71,85,105,0.2)',   border: 'rgba(71,85,105,0.4)',  color: '#94a3b8' },
};

const EMPTY_FORM = { adresse: '', raison: 'fraude', notes: '' };

export default function BlacklistPage() {
  const [list, setList]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [search, setSearch]         = useState('');
  const [verifyAddr, setVerifyAddr] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying]   = useState(false);

  const load = () => {
    setLoading(true);
    blacklistApi.list()
      .then(r => setList(r.data?.results || r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = () => {
    if (!form.adresse.trim()) { setError("L'adresse est obligatoire"); return; }
    setSaving(true); setError(null); setSuccess(null);
    blacklistApi.create(form)
      .then(() => {
        setSuccess('Adresse ajoutée à la blacklist');
        setForm(EMPTY_FORM);
        setShowForm(false);
        load();
      })
      .catch(e => setError(e.response?.data?.adresse?.[0] || e.response?.data?.detail || 'Erreur'))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Retirer cette adresse de la blacklist ?')) return;
    blacklistApi.delete(id).then(load).catch(() => {});
  };

  const handleVerify = () => {
    if (!verifyAddr.trim()) return;
    setVerifying(true); setVerifyResult(null);
    blacklistApi.verifier(verifyAddr)
      .then(r => setVerifyResult(r.data))
      .catch(() => setVerifyResult({ blacklistee: false }))
      .finally(() => setVerifying(false));
  };

  const filtered = list.filter(a =>
    !search || a.adresse?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>🚫</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            Blacklist d'adresses
          </h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            Adresses bloquées automatiquement lors des livraisons
          </div>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setError(null); }}
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
            border: 'none', color: '#fff', borderRadius: 10,
            padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14
          }}
        >
          {showForm ? '✕ Annuler' : '+ Bloquer une adresse'}
        </button>
      </div>

      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14
        }}>✅ {success}</div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{
          background: 'rgba(13,32,21,0.90)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 15 }}>
            Bloquer une nouvelle adresse
          </h3>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13
            }}>{error}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            <label>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>Adresse *</div>
              <input
                value={form.adresse}
                onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                placeholder="Ex: 12 Rue Hassan II, Casablanca"
                style={{
                  width: '100%', padding: '9px 13px',
                  background: 'rgba(7,18,11,0.80)', border: '1px solid rgba(34,197,94,0.22)',
                  borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </label>
            <label>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>Raison</div>
              <select
                value={form.raison}
                onChange={e => setForm(f => ({ ...f, raison: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 13px',
                  background: 'rgba(7,18,11,0.80)', border: '1px solid rgba(34,197,94,0.22)',
                  borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none'
                }}
              >
                {RAISONS.map(r => (
                  <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: 'block', marginBottom: 14 }}>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>Notes (optionnel)</div>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Contexte supplémentaire…"
              style={{
                width: '100%', padding: '9px 13px',
                background: 'rgba(7,18,11,0.80)', border: '1px solid rgba(34,197,94,0.22)',
                borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </label>
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
              border: 'none', color: '#fff', borderRadius: 9,
              padding: '9px 22px', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Enregistrement…' : '🚫 Bloquer l\'adresse'}
          </button>
        </div>
      )}

      {/* Verify tool */}
      <div style={{
        background: 'rgba(13,32,21,0.88)', border: '1px solid rgba(34,197,94,0.12)',
        borderRadius: 14, padding: '16px 20px', marginBottom: 24
      }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
          🔍 Vérifier si une adresse est blacklistée
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={verifyAddr}
            onChange={e => setVerifyAddr(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="Entrer une adresse…"
            style={{
              flex: 1, padding: '8px 12px',
              background: 'rgba(7,18,11,0.80)', border: '1px solid rgba(34,197,94,0.22)',
              borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none'
            }}
          />
          <button
            onClick={handleVerify}
            disabled={verifying}
            style={{
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
              color: '#a5b4fc', borderRadius: 8, padding: '8px 18px',
              cursor: 'pointer', fontWeight: 600, fontSize: 14
            }}
          >
            {verifying ? '…' : 'Vérifier'}
          </button>
        </div>
        {verifyResult && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: verifyResult.blacklistee ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${verifyResult.blacklistee ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            color: verifyResult.blacklistee ? '#fca5a5' : '#86efac',
            fontSize: 13
          }}>
            {verifyResult.blacklistee
              ? `🚫 Adresse blacklistée — raison : ${verifyResult.raison || 'inconnue'}`
              : '✅ Adresse non bloquée'}
          </div>
        )}
      </div>

      {/* Search + list */}
      <div style={{
        background: 'rgba(13,32,21,0.88)', border: '1px solid rgba(34,197,94,0.12)',
        borderRadius: 16, padding: '20px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 15 }}>
            Adresses bloquées ({filtered.length})
          </h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par adresse…"
            style={{
              padding: '7px 12px',
              background: 'rgba(7,18,11,0.80)', border: '1px solid rgba(34,197,94,0.22)',
              borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', width: 220
            }}
          />
        </div>

        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 30 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 30 }}>
            {search ? 'Aucun résultat' : 'Aucune adresse blacklistée'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(a => {
              const rInfo = RAISONS.find(r => r.value === a.raison) || RAISONS[4];
              const rStyle = RAISON_COLORS[a.raison] || RAISON_COLORS.autre;
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(7,18,11,0.55)', border: '1px solid rgba(34,197,94,0.10)',
                  borderRadius: 10, padding: '12px 16px'
                }}>
                  <span style={{ fontSize: 20 }}>{rInfo.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
                      {a.adresse}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                      <span style={{
                        background: rStyle.bg, border: `1px solid ${rStyle.border}`,
                        color: rStyle.color, borderRadius: 5, padding: '1px 7px', fontSize: 11
                      }}>{rInfo.label}</span>
                      {a.notes && (
                        <span style={{ color: '#64748b', fontSize: 12 }}>{a.notes}</span>
                      )}
                      <span style={{ color: '#475569', fontSize: 11, marginLeft: 'auto' }}>
                        {a.ajoutee_par_nom || 'Admin'} · {a.date_ajout?.slice(0,10)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171', borderRadius: 8, padding: '5px 10px',
                      cursor: 'pointer', fontSize: 13
                    }}
                  >🗑️</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
