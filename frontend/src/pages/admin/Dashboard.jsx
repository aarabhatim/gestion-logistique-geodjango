import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Truck, Users, TrendingUp, ArrowUpRight, ArrowDownRight,
  Activity, Store, Star, CheckCircle, Clock, AlertTriangle, Zap,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { analyticsApi } from '@/services/api';
import { useI18n } from '@/contexts/I18nContext';

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg:      '#080E09',
  surface: '#0D1A10',
  card:    '#0F1D12',
  primary: '#22C55E',
  p2:      '#16A34A',
  accent:  '#F59E0B',
  text:    '#FFFFFF',
  text2:   '#6B7280',
  border:  'rgba(34,197,94,0.08)',
  danger:  '#EF4444',
  info:    '#60A5FA',
};
const grad  = `linear-gradient(135deg, ${T.p2}, ${T.primary})`;
const gradA = `linear-gradient(135deg, #B45309, ${T.accent})`;
const CARD  = {
  background: T.card,
  borderRadius: 20, padding: 24,
  border: `1px solid ${T.border}`,
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
};
const TT = {
  backgroundColor: '#0A1A0D',
  border: '1px solid rgba(34,197,94,0.15)',
  borderRadius: 10, color: '#fff', fontSize: 11,
};
const LOCALE_MAP_D = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA', es: 'es-ES' };

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const STATUT_MAP = {
  EN_ROUTE:       { label: '🚚 En route',      bg: 'rgba(34,197,94,0.12)',   color: '#22C55E' },
  LIVREE:         { label: '✅ Livrée',         bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
  ANNULEE:        { label: '❌ Annulée',        bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
  EN_ATTENTE:     { label: '⏳ En attente',    bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  VALIDEE:        { label: '🔵 Validée',        bg: 'rgba(96,165,250,0.12)', color: '#60A5FA' },
  EN_PREPARATION: { label: '⚙️ Préparation',   bg: 'rgba(167,139,250,0.12)', color: '#A78BFA' },
};
const StatusBadge = ({ status }) => {
  const { tStatus } = useI18n();
  const s = STATUT_MAP[status] || { label: status, bg: 'rgba(156,163,175,0.12)', color: '#9CA3AF' };
  const label = s.label.includes('✅') || s.label.includes('❌') || s.label.includes('⏳') || s.label.includes('🔵') || s.label.includes('🚚') || s.label.includes('⚙️') ? (tStatus(status) ? (s.label.split(' ')[0] + ' ' + tStatus(status)) : s.label) : tStatus(status) || s.label;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, trend, color = T.primary, loading, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    style={{
      ...CARD, padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'transform 0.25s, box-shadow 0.25s',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}25`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = CARD.boxShadow; }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}15`,
        border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color }} />
      </div>
      {trend != null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '3px 8px', borderRadius: 20,
          background: trend >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: trend >= 0 ? T.primary : T.danger,
          fontSize: 11, fontWeight: 700,
        }}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <div style={{ fontSize: 12, color: T.text2, fontWeight: 500, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.5px' }}>
        {loading ? '—' : value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: color, fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {sub}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Fleet Donut ─────────────────────────────────────────────────────────────
const FleetDonut = ({ on, unused, maint }) => {
  const total = (on || 0) + (unused || 0) + (maint || 0) || 50;
  const pct   = Math.round(((on || 26) / total) * 100);
  const data  = [
    { name: 'En route',    value: on    || 26, color: T.primary },
    { name: 'Inutilisé',   value: unused || 20, color: T.accent  },
    { name: 'Maintenance', value: maint  || 4,  color: T.danger  },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={34} outerRadius={50}
              startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: 9, color: T.text2, marginTop: 2 }}>actifs</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.text2, flex: 1 }}>{d.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, lang } = useI18n();
  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString(LOCALE_MAP_D[lang] || 'fr-FR', { month: 'short' })
  );
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.adminDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis || {};

  const orderData = (data?.evolution_6m || []).length >= 2
    ? data.evolution_6m.map(e => ({
        mois: e.mois ? new Date(e.mois).toLocaleString(LOCALE_MAP_D[lang] || 'fr-FR', { month: 'short' }) : '',
        commandes: e.count || 0, ca: Math.round(e.ca || 0),
      }))
    : Array.from({ length: 15 }, (_, i) => ({
        mois: String(i + 1).padStart(2, '0'),
        commandes: Math.round(40 + Math.sin(i * 0.8) * 25),
        ca: Math.round(20000 + Math.sin(i * 0.6) * 8000),
      }));

  const revenueData = MONTHS.map((m, i) => ({
    mois: m, revenue: Math.round(15000 + Math.sin(i * 0.7) * 6000 + (kpis.ca_total || 0) / 12),
  }));

  const profitData = MONTHS.map((m, i) => ({
    mois: m, profit: Math.round(8000 + Math.sin(i * 0.9 + 1) * 4000 + (kpis.ca_total || 0) / 20),
  }));

  const fleetOn     = kpis.transporteurs_actifs || 26;
  const fleetUnused = Math.max(0, Math.round(fleetOn * 0.77)) || 20;
  const fleetMaint  = Math.max(1, Math.round(fleetOn * 0.15)) || 4;
  const vehiclesRoad = kpis.taux_livraison || 65;

  const activities = (() => {
    const raw = [
      ...(data?.top_fondateurs   || []).slice(0, 2).map((f, i) => ({
        id: '#OPL172' + (8739 + i), type: f.fondateur__nom_boutique || 'Boutique', status: 'EN_ROUTE',
      })),
      ...(data?.top_transporteurs || []).slice(0, 2).map((t, i) => ({
        id: '#OPL172' + (8742 + i), type: t.vehicule_type || 'Véhicule', status: i === 0 ? 'LIVREE' : 'ANNULEE',
      })),
    ];
    return raw.length >= 3 ? raw : [
      { id: '#OPL1728739', type: 'Électronique', status: 'EN_ROUTE' },
      { id: '#OPL1728740', type: 'Alimentaire',  status: 'EN_ROUTE' },
      { id: '#OPL1728342', type: 'Médical',       status: 'LIVREE'   },
      { id: '#OPL1728435', type: 'Textile',       status: 'ANNULEE'  },
    ];
  })();

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.5px' }}>
            {t('dash_title')}
          </h1>
          <p style={{ fontSize: 13, color: T.text2, marginTop: 4 }}>
            {t('dash_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 11, fontWeight: 700, color: T.primary,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, display: 'inline-block', boxShadow: `0 0 6px ${T.primary}` }} />
            Live
          </span>
        </div>
      </motion.div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard delay={0}    loading={loading} icon={Package}    label={t('dash_orders_total')}
          value={(kpis.commandes_total || 0).toLocaleString()}
          sub={`${kpis.commandes_aujourd_hui || 0} ${t('dash_today')}`}
          color={T.primary} trend={1.3} />
        <KpiCard delay={0.05} loading={loading} icon={Truck}      label={t('dash_in_progress')}
          value={(kpis.commandes_en_cours || 0).toLocaleString()}
          sub={`${t('dash_taux')} ${kpis.taux_livraison || 0}%`}
          color={T.accent} trend={-2.1} />
        <KpiCard delay={0.10} loading={loading} icon={Users}      label={t('dash_clients_registered')}
          value={(kpis.clients_total || 0).toLocaleString()}
          sub={t('dash_total_platform')}
          color={T.info} trend={5.2} />
        <KpiCard delay={0.15} loading={loading} icon={TrendingUp} label={t('dash_ca_title')}
          value={`${Math.round(kpis.ca_total || 0).toLocaleString()} MAD`}
          sub={`${Math.round(kpis.ca_mois || 0).toLocaleString()} MAD ${t('dash_this_month')}`}
          color="#A78BFA" trend={8.7} />
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Orders Line Chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Package size={15} color={T.primary} />
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t('dash_orders_evolution')}</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: T.text2 }}>{t('dash_total_label')}</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>
                    {(kpis.commandes_total || 0).toLocaleString()}
                  </div>
                  <span style={{ fontSize: 11, color: T.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ArrowUpRight size={11} /> +1.3%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: T.text2 }}>{t('dash_ca_total_label')}</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>
                    {Math.round(kpis.ca_total || 0).toLocaleString()}
                  </div>
                  <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>MAD</span>
                </div>
              </div>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: T.primary, fontSize: 11, fontWeight: 700 }}>
              {t('dash_monthly')}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={orderData}>
              <defs>
                <linearGradient id="ordG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor={T.primary} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={T.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="mois" tick={{ fill: T.text2, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.text2, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={TT} cursor={{ stroke: 'rgba(34,197,94,0.15)' }} />
              <Line type="monotone" dataKey="commandes" name="Commandes"
                stroke={T.primary} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="ca" name="CA (MAD)"
                stroke={T.accent} strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {[{ color: T.primary, label: 'Commandes' }, { color: T.accent, label: 'CA (MAD)' }].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 24, height: 2, background: color, borderRadius: 1, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: T.text2 }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Revenue + Profit stacked */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Revenue Area */}
          <div style={{ ...CARD, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Revenu total</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: T.text }}>
                    {Math.round(kpis.ca_total || 243550).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12, color: T.text2 }}>MAD</span>
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: T.accent, fontSize: 11, fontWeight: 700 }}>
                Mensuel
              </span>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mois" hide />
                <Tooltip contentStyle={TT} />
                <Area type="monotone" dataKey="revenue" stroke={T.accent} strokeWidth={2} fill="url(#revG)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Bar */}
          <div style={{ ...CARD, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Profit mensuel</span>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: T.primary, fontSize: 11, fontWeight: 700 }}>
                Mensuel
              </span>
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={profitData} barSize={12}>
                <XAxis dataKey="mois" tick={{ fill: T.text2, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                  {profitData.map((_, i) => (
                    <Cell key={i} fill={`rgba(34,197,94,${0.3 + (i / profitData.length) * 0.6})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Fleet + Vehicles + Activities ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Fleet Donut */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t('dash_fleet_efficiency')}</span>
            <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: T.primary, fontSize: 11, fontWeight: 700 }}>{t('dash_current')}</span>
          </div>
          <FleetDonut on={fleetOn} unused={fleetUnused} maint={fleetMaint} />
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 12,
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: T.text2 }}>{t('dash_global_rate')}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: T.primary }}>
              {Math.round((fleetOn / (fleetOn + fleetUnused + fleetMaint)) * 100)}%
            </span>
          </div>
        </motion.div>

        {/* Vehicles on road */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t('dash_vehicles_on_road')}</span>
            <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: T.primary, fontSize: 11, fontWeight: 700 }}>Live</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: T.text, lineHeight: 1 }}>{vehiclesRoad}%</div>
            <div style={{ fontSize: 12, color: T.danger, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
              <ArrowDownRight size={13} /> -1.6% {t('dash_vs_last_month')}
            </div>
          </div>
          <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }}>
            <div style={{
              height: 6, borderRadius: 3,
              width: vehiclesRoad + '%',
              background: grad,
              boxShadow: '0 0 10px rgba(34,197,94,0.4)',
              transition: 'width 1s ease',
            }} />
          </div>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'En livraison', value: fleetOn,    color: T.primary, icon: '🚚' },
              { label: 'Disponibles',  value: fleetUnused, color: T.accent,  icon: '🟡' },
              { label: 'Maintenance',  value: fleetMaint,  color: T.danger,  icon: '🔧' },
              { label: 'Total flotte', value: fleetOn + fleetUnused + fleetMaint, color: T.info, icon: '🚛' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{
                padding: '10px 12px', borderRadius: 10,
                background: `${color}08`, border: `1px solid ${color}15`,
              }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
                <div style={{ fontSize: 10.5, color: T.text2, marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent activities */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t('dash_recent_activities')}</span>
            <button style={{ fontSize: 11, fontWeight: 600, color: T.primary, background: 'none', border: 'none', cursor: 'pointer' }}>
              {t('dash_view_all')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activities.slice(0, 4).map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={14} color={T.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.id}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{a.type}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Top Boutiques + Transporteurs ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Top Boutiques */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={15} color={T.primary} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t('dash_top_stores')}</span>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: T.primary, fontSize: 11, fontWeight: 700 }}>{t('dash_by_revenue')}</span>
          </div>
          {(data?.top_fondateurs || []).length === 0
            ? <p style={{ fontSize: 13, color: T.text2 }}>{t('dash_no_data')}</p>
            : (data?.top_fondateurs || []).map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px', borderRadius: 12, marginBottom: 8,
                background: i === 0 ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)'}`,
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: i === 0 ? grad : i === 1 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: 'white',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{f.fondateur__nom_boutique || '—'}</span>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: T.primary }}>
                  {Math.round(f.ca || 0).toLocaleString()} MAD
                </span>
              </div>
            ))
          }
        </div>

        {/* Top Transporteurs */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={15} color={T.accent} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t('dash_top_drivers')}</span>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: T.accent, fontSize: 11, fontWeight: 700 }}>{t('dash_by_deliveries')}</span>
          </div>
          {(data?.top_transporteurs || []).length === 0
            ? <p style={{ fontSize: 13, color: T.text2 }}>{t('dash_no_data')}</p>
            : (data?.top_transporteurs || []).map((tr, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px', borderRadius: 12, marginBottom: 8,
                background: i === 0 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'}`,
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: i === 0 ? gradA : 'rgba(245,158,11,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: 'white',
                  }}>
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{tr.user__first_name} {tr.user__last_name}</div>
                    <div style={{ fontSize: 10.5, color: T.text2 }}>{tr.vehicule_type}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.accent }}>{tr.nombre_livraisons}</div>
                  <div style={{ fontSize: 10, color: T.text2 }}>{t('dash_deliveries')}</div>
                </div>
              </div>
            ))
          }
        </div>
      </motion.div>
    </div>
  );
}
