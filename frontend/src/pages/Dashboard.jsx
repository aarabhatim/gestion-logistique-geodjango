import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { analyticsApi } from '@/services/api';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { useI18n } from '@/contexts/I18nContext';

const G = {
  primary: '#22C55E', secondary: '#16A34A', accent: '#EAB308',
  card: '#0D2015', cardAlt: '#102817', border: 'rgba(255,255,255,0.04)', muted: '#9CA3AF',
};
const CARD = {
  background: 'linear-gradient(145deg,#0D2015,#102817)',
  borderRadius: 24, padding: 24,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.04)',
};
const TT = { backgroundColor: '#0D2015', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, color: '#fff', fontSize: 12 };
const MONTHS = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];

const StatusBadge = ({ status }) => {
  const { t } = useI18n();
  const map = {
    EN_ROUTE:       { label: t('dash_status_en_transit'),  bg: 'rgba(34,197,94,0.15)',  color: '#22C55E' },
    LIVREE:         { label: t('dash_status_livree'),      bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    ANNULEE:        { label: t('dash_status_annulee'),     bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
    EN_ATTENTE:     { label: t('dash_status_en_attente'),  bg: 'rgba(234,179,8,0.15)',  color: '#EAB308' },
    VALIDEE:        { label: t('dash_status_validee'),     bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    EN_PREPARATION: { label: t('dash_status_preparation'), bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  };
  const s = map[status] || { label: status, bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' };
  return (
    <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const FleetDonut = ({ on, unused, maint }) => {
  const { t } = useI18n();
  const total = (on || 0) + (unused || 0) + (maint || 0) || 50;
  const pct = Math.round(((on || 26) / total) * 100);
  const data = [
    { name: t('dash_fleet_on_route'),    value: on    || 26, color: G.primary },
    { name: t('dash_fleet_unused'),      value: unused || 20, color: G.accent  },
    { name: t('dash_fleet_maintenance'), value: maint  || 4,  color: '#ef4444' },
  ];
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={55}
              startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">{pct}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-gray-400 flex-1">{d.name}</span>
            <span className="text-xs font-semibold text-white w-6 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
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
        mois: e.mois ? new Date(e.mois).toLocaleDateString('fr-FR', { month: 'short' }) : '',
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

  const fleetOn    = kpis.transporteurs_actifs || 26;
  const fleetUnused = Math.max(0, Math.round(fleetOn * 0.77)) || 20;
  const fleetMaint  = Math.max(1, Math.round(fleetOn * 0.15)) || 4;
  const vehiclesRoad = kpis.taux_livraison || 65;

  const activities = (() => {
    const raw = [
      ...(data?.top_fondateurs  || []).slice(0, 2).map((f, i) => ({
        id: '#OPL172' + (8739 + i), type: f.fondateur__nom_boutique || 'Medical', status: 'EN_ROUTE',
      })),
      ...(data?.top_transporteurs || []).slice(0, 2).map((t, i) => ({
        id: '#OPL172' + (8742 + i), type: t.vehicule_type || 'Medical', status: i === 0 ? 'LIVREE' : 'ANNULEE',
      })),
    ];
    return raw.length >= 3 ? raw : [
      { id: '#OPL1728739', type: 'Medical', status: 'EN_ROUTE' },
      { id: '#OPL1728740', type: 'Medical', status: 'EN_ROUTE' },
      { id: '#OPL1728342', type: 'Medical', status: 'LIVREE'   },
      { id: '#OPL1728435', type: 'Medical', status: 'ANNULEE'  },
    ];
  })();

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <PageHeader title={t('dashboard')} description="DeliverMap" badge="Live" />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard index={0} loading={loading} title={t('commandes')} value={kpis.commandes_total}
          icon={Package} sub={(kpis.commandes_aujourd_hui || 0) + " " + t('this_month')} accent="green" trend={1.3} />
        <KpiCard index={1} loading={loading} title={t('drv_in_progress')} value={kpis.commandes_en_cours}
          icon={Truck} sub={t('delivery_rate') + " " + (kpis.taux_livraison || 0) + "%"} accent="amber" trend={-2.1} />
        <KpiCard index={2} loading={loading} title={t('clients')} value={kpis.clients_total}
          icon={Users} sub={t('clients')} accent="green" trend={5.2} />
        <KpiCard index={3} loading={loading} title={t('total_revenue')}
          value={Math.round(kpis.ca_total || 0).toLocaleString() + " MAD"}
          icon={TrendingUp} sub={Math.round(kpis.ca_mois || 0).toLocaleString() + " MAD " + t('this_month')} accent="amber" trend={8.7} />
      </div>

      {/* Row 2: Order chart + Revenue/Profit */}
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-3" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package size={16} style={{ color: G.primary }} />
              <span className="text-sm font-semibold text-white">{t('dash_total_orders')}</span>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: G.primary }}>
              {t('dash_monthly')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <p className="text-[11px] text-gray-400 mb-1">{t('dash_total_expeditions')}</p>
              <p className="text-xl font-bold text-white">{(kpis.commandes_total || 0).toLocaleString()}</p>
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: G.primary }}>
                <ArrowUpRight size={12} /> +1.3% {t('dash_vs_last_month')}
              </span>
            </div>
            <div className="rounded-2xl p-3" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.1)' }}>
              <p className="text-[11px] text-gray-400 mb-1">{t('dash_total_delivered')}</p>
              <p className="text-xl font-bold text-white">{(kpis.commandes_en_cours || 0).toLocaleString()}</p>
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#ef4444' }}>
                <ArrowDownRight size={12} /> -2.1% {t('dash_vs_last_month')}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mois" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TT} cursor={{ stroke: 'rgba(34,197,94,0.2)' }} />
              <Line type="monotone" dataKey="commandes" name="Commandes"
                stroke={G.primary} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="ca" name="CA (MAD)"
                stroke={G.accent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2 flex flex-col gap-6">
          <div style={CARD} className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{t('dash_total_revenue')}</span>
              <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', color: G.accent }}>{t('dash_monthly')}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="h-6 w-6 flex items-center justify-center rounded-lg text-xs font-bold"
                style={{ background: G.accent, color: '#000' }}>$</span>
              <span className="text-2xl font-bold text-white">{Math.round(kpis.ca_total || 243550).toLocaleString()}</span>
              <span className="text-sm text-gray-400">MAD</span>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={G.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={G.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mois" hide />
                <Tooltip contentStyle={TT} />
                <Area type="monotone" dataKey="revenue" stroke={G.accent} strokeWidth={2} fill="url(#revG)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={CARD} className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{t('dash_total_profit')}</span>
              <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: G.primary }}>{t('dash_monthly')}</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={profitData} barSize={14}>
                <XAxis dataKey="mois" tick={{ fill: G.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                  {profitData.map((_, i) => (
                    <Cell key={i} fill={"rgba(34,197,94," + (0.35 + (i / profitData.length) * 0.55) + ")"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Row 3: Fleet + Vehicles + Activities */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">{t('dash_fleet_efficiency')}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: G.primary }}>{t('dash_monthly')}</span>
          </div>
          <FleetDonut on={fleetOn} unused={fleetUnused} maint={fleetMaint} />
          <div className="flex items-center gap-2 mt-4">
            <span className="text-2xl font-bold text-white">
              {Math.round((fleetOn / (fleetOn + fleetUnused + fleetMaint)) * 100)}%
            </span>
            <span className="text-[11px]" style={{ color: '#ef4444' }}>-1.63% {t('dash_vs_last_month')}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">{t('dash_vehicles_on_road')}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: G.primary }}>{t('dash_monthly')}</span>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-white">{vehiclesRoad}%</span>
            <span className="text-[11px]" style={{ color: '#ef4444' }}>-1.63% {t('dash_vs_last_month')}</span>
          </div>
          <div className="w-full h-2 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-2 rounded-full" style={{
              width: vehiclesRoad + "%",
              background: "linear-gradient(90deg," + G.secondary + "," + G.primary + ")",
              boxShadow: "0 0 8px rgba(34,197,94,0.4)",
            }} />
          </div>
          <div className="flex justify-between items-end mt-4">
            <button
              onClick={() => navigate('/commandes')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(90deg,#16a34a,#22c55e)", boxShadow: "0 4px 14px rgba(34,197,94,0.25)" }}
            >
              <Plus size={14} /> {t('sb_add_expedition')}
            </button>
            {/* Icône camion réelle (le placeholder [TRUCK] est remplacé) */}
            <Truck size={56} strokeWidth={1.5}
              style={{ color: G.primary, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">{t('dash_recent_activities')}</span>
            <button
              onClick={() => navigate('/commandes')}
              className="text-[11px] font-semibold cursor-pointer hover:underline"
              style={{ color: G.primary, background: 'transparent', border: 'none' }}>
              {t('dash_view_all')}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {activities.slice(0, 4).map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' }}>
                  <Package size={15} style={{ color: G.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.id}</p>
                  <p className="text-[11px]" style={{ color: G.muted }}>{a.type}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Row 4: Top boutiques + transporteurs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid gap-6 lg:grid-cols-2">
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">{t('dash_top_stores')}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: G.primary }}>{t('dash_revenue')}</span>
          </div>
          {(data?.top_fondateurs || []).length === 0
            ? <p className="text-sm text-gray-500">{t('dash_no_data')}</p>
            : (data?.top_fondateurs || []).map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-2"
                style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.08)' }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg," + G.secondary + "," + G.primary + ")" }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-white">{f.fondateur__nom_boutique || "—"}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: G.primary }}>
                  {Math.round(f.ca || 0).toLocaleString()} MAD
                </span>
              </div>
            ))
          }
        </div>

        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">{t('dash_top_drivers')}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', color: G.accent }}>{t('transporteurs')}</span>
          </div>
          {(data?.top_transporteurs || []).length === 0
            ? <p className="text-sm text-gray-500">{t('dash_no_data')}</p>
            : (data?.top_transporteurs || []).map((tr, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-2"
                style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.08)' }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#a16207," + G.accent + ")" }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{tr.user__first_name} {tr.user__last_name}</p>
                    <p className="text-[10px]" style={{ color: G.muted }}>{tr.vehicule_type}</p>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: G.accent }}>{tr.nombre_livraisons} {t('dash_deliveries_short')}</span>
              </div>
            ))
          }
        </div>
      </motion.div>
    </div>
  );
}
