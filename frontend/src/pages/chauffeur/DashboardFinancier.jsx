/**
 * Dashboard financier du chauffeur — thème Transporteur orange.
 * Route : /chauffeur/finances
 */
import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Download, RefreshCw, Receipt } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { chauffeurApi } from '../../services/api';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#0B0B0B',
  surface: '#161616',
  primary: '#FF8A00',
  primary2:'#FF6B00',
  text:    '#FFFFFF',
  text2:   '#A3A3A3',
  border:  'rgba(255,255,255,0.05)',
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#FACC15',
};
const gradient    = `linear-gradient(90deg, ${T.primary}, ${T.primary2})`;
const glowOrange  = `0 8px 24px rgba(255,138,0,0.2)`;

const TOOLTIP_STYLE = {
  background: '#1A1A1A',
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  color: T.text,
  fontSize: 12,
  padding: '8px 12px',
};

const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0 });

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, nets, bruts, commission, sub, color = T.primary, loading }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${color}30`,
      borderRadius: 20,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.3s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Glow top-left */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top left, ${color}15, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      {/* Icon badge */}
      <div style={{
        position: 'absolute', top: 18, right: 18,
        width: 40, height: 40, borderRadius: 12,
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${color}40`,
      }}>
        <DollarSign size={20} color="white" />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        {label}
      </div>

      {loading ? (
        <div style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 900, color, marginBottom: 6, letterSpacing: '-0.5px' }}>
            {fmt(nets)} <span style={{ fontSize: 13, fontWeight: 500, color: T.text2 }}>MAD</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: T.text2, flexWrap: 'wrap' }}>
            <span>Bruts : <strong style={{ color: T.text }}>{fmt(bruts)} MAD</strong></span>
            <span>Commission : <strong style={{ color: T.danger }}>-{fmt(commission)} MAD</strong></span>
          </div>
          {sub && (
            <div style={{ fontSize: 11, marginTop: 8, color: T.primary, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} /> {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardFinancier() {
  const [data, setData]                 = useState(null);
  const [historique, setHistorique]     = useState([]);
  const [pagePaiements, setPagePaiements] = useState(1);
  const [totalPaiements, setTotalPaiements] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [loadingHist, setLoadingHist]   = useState(false);
  const [chartMode, setChartMode]       = useState('jours');
  const [exportLoading, setExportLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await chauffeurApi.finances(); setData(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchHistorique = async (page = 1) => {
    setLoadingHist(true);
    try {
      const res = await chauffeurApi.financesHistorique({ page, statut: 'LIVREE' });
      setHistorique(res.data.results || res.data || []);
      setTotalPaiements(res.data.count || 0);
      setPagePaiements(page);
    } catch (e) { console.error(e); }
    finally { setLoadingHist(false); }
  };

  useEffect(() => { fetchData(); fetchHistorique(1); }, []);

  const exportCSV = async () => {
    setExportLoading(true);
    try {
      const now = new Date();
      const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await chauffeurApi.financesExport(mois);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `releve_${mois}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { console.error(e); }
    finally { setExportLoading(false); }
  };

  const periode  = data?.periode || {};
  const jour     = periode.aujourd_hui || {};
  const semaine  = periode.semaine || {};
  const mois     = periode.mois || {};
  const carburant = data?.carburant || {};

  const dataJours    = (data?.graphiques?.par_jour_30j   || []).map(d => ({ date: d.date?.slice(5), revenus: d.revenus, livraisons: d.livraisons }));
  const dataSemaines = (data?.graphiques?.par_semaine_12s || []).map(d => ({ semaine: d.semaine, revenus: d.revenus, livraisons: d.livraisons }));
  const chartData    = chartMode === 'jours' ? dataJours : dataSemaines;
  const chartKey     = chartMode === 'jours' ? 'date' : 'semaine';
  const maxRev       = Math.max(...chartData.map(d => d.revenus), 1);

  const totalPages = Math.ceil(totalPaiements / 20);

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: T.text }}>
            💰 Tableau de bord financier
          </h1>
          <p style={{ color: T.text2, fontSize: 13, margin: '5px 0 0' }}>
            Revenus nets après commission plateforme
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={exportCSV}
            disabled={exportLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 12,
              border: `1px solid ${T.primary}40`,
              background: `${T.primary}12`, color: T.primary,
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
              boxShadow: exportLoading ? 'none' : glowOrange,
            }}
          >
            {exportLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            Export CSV
          </button>
          <button
            onClick={fetchData}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.surface, color: T.text2,
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        <StatCard
          label="Aujourd'hui" nets={jour.revenus_nets} bruts={jour.revenus_bruts}
          commission={jour.commission} sub={`${jour.nb_livraisons || 0} livraison(s)`}
          color="#38BDF8" loading={loading}
        />
        <StatCard
          label="Cette semaine" nets={semaine.revenus_nets} bruts={semaine.revenus_bruts}
          commission={semaine.commission} sub={`${semaine.nb_livraisons || 0} livraisons`}
          color={T.primary} loading={loading}
        />
        <StatCard
          label="Ce mois" nets={mois.revenus_nets} bruts={mois.revenus_bruts}
          commission={mois.commission}
          sub={mois.prevision_fin_mois ? `Prévision : ${fmt(mois.prevision_fin_mois)} MAD` : null}
          color={T.success} loading={loading}
        />

        {/* Carburant */}
        <div style={{
          background: T.surface, border: `1px solid ${T.warning}30`,
          borderRadius: 20, padding: '20px 22px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${T.warning}12, transparent 60%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 18, right: 18, width: 40, height: 40, borderRadius: 12, background: `${T.warning}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>⛽</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Carburant estimé (mois)
          </div>
          {loading ? (
            <div style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.warning, marginBottom: 6, letterSpacing: '-0.5px' }}>
                {fmt(carburant.cout_estime_mad)} <span style={{ fontSize: 13, fontWeight: 500, color: T.text2 }}>MAD</span>
              </div>
              <div style={{ fontSize: 11, color: T.text2 }}>
                {carburant.distance_mois_km} km · {carburant.conso_estimee_litres}L estimés
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Revenue Chart ── */}
      <div style={{
        background: T.surface, borderRadius: 20,
        padding: '22px 24px', border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color={T.primary} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Évolution des revenus</span>
          </div>
          <div style={{ display: 'flex', gap: 6, background: '#1A1A1A', borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
            {['jours', 'semaines'].map(m => (
              <button key={m} onClick={() => setChartMode(m)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: chartMode === m ? gradient : 'transparent',
                color: chartMode === m ? 'white' : T.text2,
                transition: 'all 0.2s',
              }}>
                {m === 'jours' ? '30 jours' : '12 semaines'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'jours' ? (
              <LineChart data={chartData}>
                <defs>
                  <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey={chartKey} tick={{ fontSize: 10, fill: T.text2 }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: T.text2 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${fmt(v)} MAD`, 'Revenus nets']} />
                <Line type="monotone" dataKey="revenus" stroke={T.primary} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: T.primary }} filter="url(#glow)" />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey={chartKey} tick={{ fontSize: 10, fill: T.text2 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: T.text2 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${fmt(v)} MAD`, 'Revenus nets']} />
                <Bar dataKey="revenus" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => {
                    const pct = entry.revenus / maxRev;
                    return <Cell key={i} fill={`rgba(255,${Math.round(138 + pct * 30)},0,${0.5 + pct * 0.5})`} />;
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Historique paiements ── */}
      <div style={{ background: T.surface, borderRadius: 20, padding: '22px 24px', border: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} color={T.primary} />
          </div>
          Historique des paiements
          <span style={{ fontSize: 12, color: T.text2, fontWeight: 400 }}>({totalPaiements} livraisons)</span>
        </div>

        {loadingHist ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: T.text2 }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : historique.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: T.text2, fontSize: 13 }}>
            Aucune livraison trouvée
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Date', 'Référence', 'Distance', 'Bruts', 'Commission', 'Nets'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: T.text2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historique.map((lv, i) => (
                  <tr key={lv.id}
                    style={{ borderBottom: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = `${T.primary}08`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px', color: T.text2, whiteSpace: 'nowrap' }}>
                      {lv.date ? new Date(lv.date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: 12 }}>
                      <span style={{ color: T.primary, background: `${T.primary}15`, padding: '2px 8px', borderRadius: 6 }}>
                        {lv.commande_ref || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: T.text2 }}>
                      {lv.distance_km ? `${lv.distance_km} km` : '—'}
                    </td>
                    <td style={{ padding: '10px', color: T.text, fontWeight: 600 }}>{fmt(lv.revenus_bruts)} MAD</td>
                    <td style={{ padding: '10px', color: T.danger }}>-{fmt(lv.commission)} MAD</td>
                    <td style={{ padding: '10px', color: T.success, fontWeight: 800 }}>{fmt(lv.revenus_nets)} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPaiements > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
                <button
                  disabled={pagePaiements === 1}
                  onClick={() => fetchHistorique(pagePaiements - 1)}
                  style={{
                    padding: '7px 16px', borderRadius: 10,
                    border: `1px solid ${T.border}`, background: T.surface,
                    color: pagePaiements === 1 ? T.text2 : T.text,
                    cursor: pagePaiements === 1 ? 'default' : 'pointer',
                    opacity: pagePaiements === 1 ? 0.4 : 1,
                  }}>
                  ←
                </button>
                <span style={{ fontSize: 13, color: T.text2 }}>
                  Page <strong style={{ color: T.primary }}>{pagePaiements}</strong> / {totalPages}
                </span>
                <button
                  disabled={pagePaiements >= totalPages}
                  onClick={() => fetchHistorique(pagePaiements + 1)}
                  style={{
                    padding: '7px 16px', borderRadius: 10,
                    border: `1px solid ${T.border}`, background: T.surface,
                    color: pagePaiements >= totalPages ? T.text2 : T.text,
                    cursor: pagePaiements >= totalPages ? 'default' : 'pointer',
                    opacity: pagePaiements >= totalPages ? 0.4 : 1,
                  }}>
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
