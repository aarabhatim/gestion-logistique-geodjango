/**
 * Dashboard financier du chauffeur.
 * Route : /chauffeur/finances
 *
 * Affiche :
 *  - Revenus jour / semaine / mois avec décomposition brut/commission/net
 *  - Prévision fin de mois
 *  - Graphique LineChart revenus 30j et BarChart 12 semaines
 *  - Coût carburant estimé
 *  - Bouton export CSV du mois
 *  - Historique des paiements paginé
 */
import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Fuel, Download, RefreshCw,
  Calendar, ArrowUpRight, ArrowDownRight, Receipt,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { chauffeurApi } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0 });

const TOOLTIP_STYLE = {
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'white',
  fontSize: 12,
  padding: '8px 12px',
};

function StatCard({ label, nets, bruts, commission, sub, color = '#6366f1', loading }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}30`,
      borderRadius: 14,
      padding: '1rem 1.25rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top left, ${color}10, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      {loading ? (
        <div style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 2 }}>
            {fmt(nets)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>MAD</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span>Bruts : <strong style={{ color: 'white' }}>{fmt(bruts)} MAD</strong></span>
            <span>Commission : <strong style={{ color: '#ef4444' }}>-{fmt(commission)} MAD</strong></span>
          </div>
          {sub && <div style={{ fontSize: 11, marginTop: 4, color: '#a78bfa' }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

export default function DashboardFinancier() {
  const [data, setData] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [pagePaiements, setPagePaiements] = useState(1);
  const [totalPaiements, setTotalPaiements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingHist, setLoadingHist] = useState(false);
  const [chartMode, setChartMode] = useState('jours'); // 'jours' | 'semaines'
  const [exportLoading, setExportLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await chauffeurApi.finances();
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorique = async (page = 1) => {
    setLoadingHist(true);
    try {
      const res = await chauffeurApi.financesHistorique({ page, statut: 'LIVREE' });
      setHistorique(res.data.results || res.data || []);
      setTotalPaiements(res.data.count || 0);
      setPagePaiements(page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHist(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistorique(1);
  }, []);

  const exportCSV = async () => {
    setExportLoading(true);
    try {
      const now = new Date();
      const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await chauffeurApi.financesExport(mois);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `releve_${mois}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  };

  const periode = data?.periode || {};
  const jour = periode.aujourd_hui || {};
  const semaine = periode.semaine || {};
  const mois = periode.mois || {};
  const carburant = data?.carburant || {};

  // Graphique jours (30j)
  const dataJours = (data?.graphiques?.par_jour_30j || []).map(d => ({
    date: d.date?.slice(5), // MM-DD
    revenus: d.revenus,
    livraisons: d.livraisons,
  }));

  // Graphique semaines (12s)
  const dataSemaines = (data?.graphiques?.par_semaine_12s || []).map(d => ({
    semaine: d.semaine,
    revenus: d.revenus,
    livraisons: d.livraisons,
  }));

  const chartData = chartMode === 'jours' ? dataJours : dataSemaines;
  const chartKey = chartMode === 'jours' ? 'date' : 'semaine';
  const maxRev = Math.max(...chartData.map(d => d.revenus), 1);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 0 2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>💰 Tableau de bord financier</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Revenus nets après commission plateforme
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportCSV}
            disabled={exportLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.1)', color: '#818cf8',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
            {exportLoading ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            Export CSV
          </button>
          <button
            onClick={fetchData}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13,
            }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          label="Aujourd'hui" nets={jour.revenus_nets} bruts={jour.revenus_bruts}
          commission={jour.commission} sub={`${jour.nb_livraisons || 0} livraison(s)`}
          color="#06b6d4" loading={loading}
        />
        <StatCard
          label="Cette semaine" nets={semaine.revenus_nets} bruts={semaine.revenus_bruts}
          commission={semaine.commission} sub={`${semaine.nb_livraisons || 0} livraisons`}
          color="#6366f1" loading={loading}
        />
        <StatCard
          label="Ce mois" nets={mois.revenus_nets} bruts={mois.revenus_bruts}
          commission={mois.commission}
          sub={mois.prevision_fin_mois ? `Prévision fin de mois : ${fmt(mois.prevision_fin_mois)} MAD` : null}
          color="#10b981" loading={loading}
        />
        {/* Carburant */}
        <div style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 14,
          padding: '1rem 1.25rem',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            ⛽ Carburant estimé (mois)
          </div>
          {loading ? (
            <div style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
                {fmt(carburant.cout_estime_mad)} <span style={{ fontSize: 12 }}>MAD</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {carburant.distance_mois_km} km · {carburant.conso_estimee_litres}L estimés
              </div>
            </>
          )}
        </div>
      </div>

      {/* Graphique */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>📈 Évolution des revenus</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['jours', 'semaines'].map(m => (
              <button key={m} onClick={() => setChartMode(m)}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: chartMode === m ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                  color: chartMode === m ? '#818cf8' : 'var(--text-secondary)',
                }}>
                {m === 'jours' ? '30 jours' : '12 semaines'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'jours' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey={chartKey} tick={{ fontSize: 10, fill: '#64748b' }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${fmt(v)} MAD`, 'Revenus nets']} />
                <Line type="monotone" dataKey="revenus" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey={chartKey} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${fmt(v)} MAD`, 'Revenus nets']} />
                <Bar dataKey="revenus" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={`hsl(${240 + (entry.revenus / maxRev) * 40}, 80%, 65%)`} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historique paiements */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Receipt size={16} /> Historique des paiements
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>({totalPaiements} livraisons)</span>
        </div>

        {loadingHist ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} className="spin" />
          </div>
        ) : historique.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: 13 }}>
            Aucune livraison trouvée
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Date', 'Référence', 'Distance', 'Bruts', 'Commission', 'Nets'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historique.map((lv, i) => (
                  <tr key={lv.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {lv.date ? new Date(lv.date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: 12, color: '#60a5fa' }}>
                      {lv.commande_ref || '—'}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {lv.distance_km ? `${lv.distance_km} km` : '—'}
                    </td>
                    <td style={{ padding: '8px', color: 'white' }}>{fmt(lv.revenus_bruts)} MAD</td>
                    <td style={{ padding: '8px', color: '#ef4444' }}>-{fmt(lv.commission)} MAD</td>
                    <td style={{ padding: '8px', color: '#10b981', fontWeight: 700 }}>{fmt(lv.revenus_nets)} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPaiements > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
                <button
                  disabled={pagePaiements === 1}
                  onClick={() => fetchHistorique(pagePaiements - 1)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: pagePaiements === 1 ? 'default' : 'pointer', opacity: pagePaiements === 1 ? 0.4 : 1 }}>
                  ←
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Page {pagePaiements} / {Math.ceil(totalPaiements / 20)}
                </span>
                <button
                  disabled={pagePaiements >= Math.ceil(totalPaiements / 20)}
                  onClick={() => fetchHistorique(pagePaiements + 1)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: pagePaiements >= Math.ceil(totalPaiements / 20) ? 'default' : 'pointer', opacity: pagePaiements >= Math.ceil(totalPaiements / 20) ? 0.4 : 1 }}>
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
