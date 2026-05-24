import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { previsionsApi } from '../../services/api';

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(7,18,11,0.97)', border: '1px solid rgba(34,197,94,0.35)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: <span style={{ color: '#f1f5f9' }}>{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const AlertBadge = ({ date, predicted }) => (
  <div style={{
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 10,
    alignItems: 'center', marginBottom: 8
  }}>
    <span style={{ fontSize: 18 }}>⚠️</span>
    <div>
      <div style={{ color: '#fca5a5', fontWeight: 600, fontSize: 14 }}>
        Pic prévu le {date}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>
        ~{Math.round(predicted)} commandes attendues
      </div>
    </div>
  </div>
);

export default function PrevisionsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    previsionsApi.get()
      .then(r => setData(r.data))
      .catch(() => setError('Erreur chargement prévisions'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
      Chargement des prévisions…
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>{error}</div>
  );

  const historique = (data?.historique || []).map(h => ({
    date: h.date ? h.date.slice(5) : '',
    commandes: h.commandes,
    type: 'historique',
  }));

  const previsions = (data?.previsions || []).map(p => ({
    date: p.date ? p.date.slice(5) : '',
    prevision: p.predicted,
    alerte: p.alerte_pic,
    type: 'prevision',
  }));

  const combined = [
    ...historique.map(h => ({ ...h, prevision: null })),
    ...previsions.map(p => ({ ...p, commandes: null })),
  ];

  const alertes = previsions.filter(p => p.alerte);
  const tendance = data?.tendance || 0;
  const tendancePos = tendance >= 0;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>📈</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            Prévisions de demande
          </h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            Historique 30j + projection 14 jours
          </div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: tendancePos ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${tendancePos ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 20, padding: '6px 16px',
          color: tendancePos ? '#86efac' : '#fca5a5',
          fontWeight: 700, fontSize: 14
        }}>
          Tendance {tendancePos ? '▲' : '▼'} {Math.abs(tendance).toFixed(1)} cmd/jour
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Moy. 30 derniers jours', value: data?.moyenne_historique ?? '—', icon: '📊', color: '#22c55e' },
          { label: 'Prévision semaine prochaine', value: data?.total_semaine_prochaine ?? '—', icon: '🔮', color: '#16a34a' },
          { label: 'Pics détectés (14j)', value: alertes.length, icon: '⚠️', color: alertes.length ? '#ef4444' : '#22c55e' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'rgba(13,32,21,0.88)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 14, padding: '18px 22px',
            borderLeft: `3px solid ${k.color}`
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{k.value}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 24
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#e2e8f0', fontSize: 15 }}>
          Commandes — historique &amp; prévisions
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={combined} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.1)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
            <Line
              type="monotone" dataKey="commandes" name="Historique"
              stroke="#22c55e" strokeWidth={2} dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone" dataKey="prevision" name="Prévision"
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
              dot={{ r: 3, fill: '#f59e0b' }} connectNulls={false}
            />
            {/* Séparateur historique/prévision */}
            {historique.length > 0 && (
              <ReferenceLine
                x={historique[historique.length - 1]?.date}
                stroke="rgba(148,163,184,0.4)"
                strokeDasharray="4 4"
                label={{ value: "Aujourd'hui", fill: '#94a3b8', fontSize: 11 }}
              />
            )}
            {/* Marqueurs pics */}
            {alertes.map((a, i) => (
              <ReferenceLine
                key={i} x={a.date}
                stroke="rgba(239,68,68,0.5)"
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alertes pics */}
      {alertes.length > 0 && (
        <div style={{
          background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 16, padding: '18px 22px'
        }}>
          <h3 style={{ margin: '0 0 14px', color: '#fca5a5', fontSize: 15 }}>
            ⚠️ Pics de demande prévus
          </h3>
          {alertes.map((a, i) => (
            <AlertBadge key={i} date={a.date} predicted={a.prevision} />
          ))}
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
            Un pic est détecté si la prévision dépasse 150% de la moyenne ou tombe un week-end.
          </div>
        </div>
      )}
    </div>
  );
}
