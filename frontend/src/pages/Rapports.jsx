import React, { useState, useEffect, useMemo, useRef } from 'react';
import { analyticsApi, incidentsApi, ticketsApi, scoringApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import {
  TrendingUp, Package, Truck, Store, Printer, Download, FileText,
  Calendar, RefreshCw, AlertTriangle, TicketIcon, BarChart2, CheckCircle,
} from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const STATUT_LABELS = {
  EN_ATTENTE: 'En attente', VALIDEE: 'Validée', EN_PREPARATION: 'En prépa.',
  EN_ROUTE: 'En route', LIVREE: 'Livrée', ANNULEE: 'Annulée',
};

// ─── Helpers export CSV ──────────────────────────────────────────────────────
const escapeCsv = (val) => {
  if (val == null) return '';
  const s = String(val).replace(/"/g, '""');
  return /[",\n;]/.test(s) ? `"${s}"` : s;
};

const downloadFile = (filename, content, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const toCsv = (headers, rows) => {
  const head = headers.map(escapeCsv).join(',');
  const body = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  return head + '\n' + body;
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, title, value, sub, color }) => (
  <div className="glass-card stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="stat-header">
      <div>
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value" style={{ color }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} />
      </div>
    </div>
  </div>
);

const Rapports = () => {
  const { t, langue, formatPrice, formatDate, devise } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [incidentStats, setIncidentStats] = useState(null);
  const [ticketStats, setTicketStats] = useState(null);
  const [scoringStats, setScoringStats] = useState(null);
  const printRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      analyticsApi.adminDashboard(),
      incidentsApi.stats().catch(() => ({ data: null })),
      ticketsApi.statistiques().catch(() => ({ data: null })),
      scoringApi.classement({ page_size: 100 }).catch(() => ({ data: null })),
    ]).then(([mainRes, incRes, tickRes, scoreRes]) => {
      setData(mainRes.data);
      setIncidentStats(incRes.data);
      if (tickRes.data) {
        setTicketStats(tickRes.data);
      }
      // Compute avg score
      if (scoreRes.data) {
        const scores = scoreRes.data.results || scoreRes.data || [];
        const avg = scores.length > 0
          ? scores.reduce((s, sc) => s + (sc.score_global || 0), 0) / scores.length
          : null;
        setScoringStats({ avg_score: avg, count: scores.length });
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const kpis = data?.kpis || {};

  const evolution = useMemo(() => {
    const all = (data?.evolution_6m || []).map(e => ({
      mois: e.mois ? new Date(e.mois).toLocaleDateString(langue === 'ar' ? 'ar-MA' : langue, { month: 'short', year: '2-digit' }) : '',
      commandes: e.count,
      ca: Math.round(e.ca || 0),
      moisRaw: e.mois,
    }));
    if (periode === 'all') return all;
    const cutoff = new Date();
    if (periode === '7') cutoff.setDate(cutoff.getDate() - 7);
    if (periode === '30') cutoff.setDate(cutoff.getDate() - 30);
    if (periode === '90') cutoff.setDate(cutoff.getDate() - 90);
    return all.filter(e => !e.moisRaw || new Date(e.moisRaw) >= cutoff);
  }, [data, periode, langue]);

  const parStatut = (data?.par_statut || []).map(s => ({
    name: STATUT_LABELS[s.statut] || s.statut,
    value: s.count,
    rawStatut: s.statut,
  }));
  const topFondateurs = (data?.top_fondateurs || []).slice(0, 8).map(f => ({
    name: f.fondateur__nom_boutique?.length > 18 ? f.fondateur__nom_boutique.slice(0, 18) + '…' : f.fondateur__nom_boutique,
    fullName: f.fondateur__nom_boutique,
    ca: Math.round(f.ca || 0),
    commandes: f.nb_commandes,
  }));
  const topTransporteurs = (data?.top_transporteurs || []).slice(0, 8).map(tr => ({
    name: `${tr.user__first_name} ${tr.user__last_name?.[0]}.`,
    fullName: `${tr.user__first_name} ${tr.user__last_name || ''}`,
    livraisons: tr.nombre_livraisons,
    note: tr.note_moyenne,
  }));

  // ── Export CSV : multi-section ──────────────────────────────────────────
  const exportCSV = (section) => {
    const now = new Date().toISOString().split('T')[0];
    let filename = `rapport_${section}_${now}.csv`;
    let csv = '';

    if (section === 'kpis') {
      csv = toCsv(
        ['Indicateur', 'Valeur'],
        [
          [t('total_revenue'), Math.round(kpis.ca_total || 0)],
          ['CA ' + t('this_month'), Math.round(kpis.ca_mois || 0)],
          [t('delivery_rate') + ' (%)', kpis.taux_livraison || 0],
          [t('active_stores'), kpis.fondateurs_actifs || 0],
          ['Boutiques en attente', kpis.fondateurs_en_attente || 0],
          [t('transporteurs'), kpis.transporteurs_actifs || 0],
          ['Transporteurs en mission', kpis.transporteurs_en_livraison || 0],
        ]
      );
    } else if (section === 'evolution') {
      csv = toCsv(
        ['Mois', 'Commandes', `CA (${devise})`],
        evolution.map(e => [e.mois, e.commandes, e.ca])
      );
    } else if (section === 'statut') {
      const total = parStatut.reduce((s, p) => s + p.value, 0) || 1;
      csv = toCsv(
        ['Statut', 'Commandes', 'Pourcentage (%)'],
        parStatut.map(p => [p.name, p.value, ((p.value / total) * 100).toFixed(1)])
      );
    } else if (section === 'boutiques') {
      csv = toCsv(
        ['Boutique', `CA (${devise})`, 'Nombre commandes'],
        topFondateurs.map(f => [f.fullName, f.ca, f.commandes])
      );
    } else if (section === 'transporteurs') {
      csv = toCsv(
        ['Transporteur', 'Livraisons', 'Note moyenne'],
        topTransporteurs.map(tr => [tr.fullName, tr.livraisons, tr.note?.toFixed?.(2) || tr.note || ''])
      );
    } else if (section === 'all') {
      const sections = [
        '# Rapport global DeliverMap - ' + new Date().toLocaleString(),
        '',
        '## Indicateurs clés',
        toCsv(['Indicateur', 'Valeur'], [
          [t('total_revenue'), Math.round(kpis.ca_total || 0)],
          ['CA mois', Math.round(kpis.ca_mois || 0)],
          ['Taux livraison %', kpis.taux_livraison || 0],
          ['Boutiques actives', kpis.fondateurs_actifs || 0],
          ['Transporteurs actifs', kpis.transporteurs_actifs || 0],
        ]),
        '',
        '## Evolution',
        toCsv(['Mois', 'Commandes', 'CA'], evolution.map(e => [e.mois, e.commandes, e.ca])),
        '',
        '## Par statut',
        toCsv(['Statut', 'Commandes'], parStatut.map(p => [p.name, p.value])),
        '',
        '## Top boutiques',
        toCsv(['Boutique', 'CA', 'Commandes'], topFondateurs.map(f => [f.fullName, f.ca, f.commandes])),
        '',
        '## Top transporteurs',
        toCsv(['Transporteur', 'Livraisons', 'Note'], topTransporteurs.map(tr => [tr.fullName, tr.livraisons, tr.note])),
      ];
      csv = sections.join('\n');
      filename = `rapport_complet_${now}.csv`;
    }
    downloadFile(filename, csv);
    setShowExportMenu(false);
  };

  // ── Impression / PDF (via window.print) ─────────────────────────────────
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Veuillez autoriser les pop-ups pour imprimer.'); return; }
    const total = parStatut.reduce((s, p) => s + p.value, 0) || 1;
    const html = `<!doctype html><html lang="${langue}"><head><meta charset="utf-8">
      <title>Rapport DeliverMap - ${new Date().toLocaleDateString()}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 24px; max-width: 900px; margin: auto; }
        h1 { color: #3b82f6; border-bottom: 3px solid #3b82f6; padding-bottom: 8px; }
        h2 { color: #1e40af; margin-top: 28px; border-left: 4px solid #10b981; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 13px; }
        th { background: #3b82f6; color: white; padding: 8px; text-align: left; }
        td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
        .kpi { padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
        .kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .kpi-value { font-size: 22px; font-weight: 800; color: #10b981; margin-top: 4px; }
        .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
        @media print { @page { margin: 1.5cm; } }
      </style></head><body>
      <h1>📊 Rapport DeliverMap</h1>
      <p>Généré le ${new Date().toLocaleString()} · Période : <strong>${t('period_label_' + periode) || periode}</strong></p>

      <h2>${t('total_revenue')} & indicateurs clés</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">${t('total_revenue')}</div><div class="kpi-value">${Math.round(kpis.ca_total || 0).toLocaleString()} ${devise}</div></div>
        <div class="kpi"><div class="kpi-label">${t('delivery_rate')}</div><div class="kpi-value">${kpis.taux_livraison || 0}%</div></div>
        <div class="kpi"><div class="kpi-label">${t('active_stores')}</div><div class="kpi-value">${kpis.fondateurs_actifs || 0}</div></div>
        <div class="kpi"><div class="kpi-label">${t('transporteurs')}</div><div class="kpi-value">${kpis.transporteurs_actifs || 0}</div></div>
      </div>

      <h2>${t('evolution_6m')}</h2>
      <table>
        <thead><tr><th>Mois</th><th>Commandes</th><th>CA (${devise})</th></tr></thead>
        <tbody>${evolution.map(e => `<tr><td>${e.mois}</td><td>${e.commandes}</td><td>${e.ca.toLocaleString()}</td></tr>`).join('')}</tbody>
      </table>

      <h2>${t('by_status')}</h2>
      <table>
        <thead><tr><th>Statut</th><th>Nombre</th><th>%</th></tr></thead>
        <tbody>${parStatut.map(p => `<tr><td>${p.name}</td><td>${p.value}</td><td>${((p.value / total) * 100).toFixed(1)}%</td></tr>`).join('')}</tbody>
      </table>

      <h2>${t('top_stores')}</h2>
      <table>
        <thead><tr><th>Boutique</th><th>CA (${devise})</th><th>Commandes</th></tr></thead>
        <tbody>${topFondateurs.map(f => `<tr><td>${f.fullName || f.name}</td><td>${f.ca.toLocaleString()}</td><td>${f.commandes}</td></tr>`).join('')}</tbody>
      </table>

      <h2>${t('top_carriers')}</h2>
      <table>
        <thead><tr><th>Transporteur</th><th>Livraisons</th><th>Note moyenne</th></tr></thead>
        <tbody>${topTransporteurs.map(tr => `<tr><td>${tr.fullName || tr.name}</td><td>${tr.livraisons}</td><td>${tr.note ? Number(tr.note).toFixed(2) : '—'}</td></tr>`).join('')}</tbody>
      </table>

      <div class="footer">DeliverMap · Plateforme de gestion logistique · Document confidentiel</div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  if (loading) return (
    <div className="dashboard-container">
      <div className="dashboard-header"><h2 className="page-title text-gradient">{t('reports')}</h2></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1,2,3,4].map(i => <div key={i} className="glass-card" style={{ height: '100px', opacity: 0.4 }} />)}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container" ref={printRef}>
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-title text-gradient">📊 {t('reports')}</h2>
          <p className="page-subtitle">{t('reports_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtre période */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
            <select value={periode} onChange={e => setPeriode(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13, outline: 'none' }}>
              <option value="all" style={{ color: 'black' }}>{t('all_periods')}</option>
              <option value="7" style={{ color: 'black' }}>{t('last_7')}</option>
              <option value="30" style={{ color: 'black' }}>{t('last_30')}</option>
              <option value="90" style={{ color: 'black' }}>{t('last_90')}</option>
            </select>
          </div>

          <button onClick={fetchData} className="btn btn-icon" title="Actualiser"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>

          {/* Bouton export CSV (menu) */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExportMenu(s => !s)} className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> {t('export_csv')}
            </button>
            {showExportMenu && (
              <div className="glass-card animate-fade-in" style={{
                position: 'absolute', right: 0, top: '110%', width: 240, padding: 6, zIndex: 100,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}>
                {[
                  { key: 'all', label: '📦 Rapport complet (toutes sections)' },
                  { key: 'kpis', label: '📈 Indicateurs clés (KPI)' },
                  { key: 'evolution', label: '📅 Évolution commandes & CA' },
                  { key: 'statut', label: '🎯 Répartition par statut' },
                  { key: 'boutiques', label: '🏪 Top boutiques' },
                  { key: 'transporteurs', label: '🚚 Top transporteurs' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => exportCSV(opt.key)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'inherit', borderRadius: 6, fontSize: 12.5,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton imprimer */}
          <button onClick={handlePrint} className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={14} /> {t('print')} / {t('export_pdf')}
          </button>
        </div>
      </div>

      {/* KPIs — Section 1 : Commandes & Réseau */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <KPICard icon={Package} title={t('total_revenue')}
          value={`${Math.round(kpis.ca_total || 0).toLocaleString()} ${devise}`}
          sub={`${Math.round(kpis.ca_mois || 0).toLocaleString()} ${devise} ${t('this_month')}`} color="#10b981" />
        <KPICard icon={TrendingUp} title={t('delivery_rate')} value={`${kpis.taux_livraison || 0}%`}
          sub="Commandes livrées / total" color="#3b82f6" />
        <KPICard icon={Store} title={t('active_stores')} value={kpis.fondateurs_actifs || 0}
          sub={`${kpis.fondateurs_en_attente || 0} en attente`} color="#f59e0b" />
        <KPICard icon={Truck} title={t('transporteurs')} value={kpis.transporteurs_actifs || 0}
          sub={`${kpis.transporteurs_en_livraison || 0} en mission`} color="#8b5cf6" />
      </div>

      {/* KPIs — Section 2 : Incidents, Scoring, Tickets */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {incidentStats && (
          <>
            <KPICard icon={AlertTriangle} title={t('resolution_rate')}
              value={`${incidentStats.taux_resolution ?? '—'}%`}
              sub={`${incidentStats.total_resolus ?? '—'} / ${incidentStats.total ?? '—'} incidents`}
              color="#ef4444" />
            <KPICard icon={CheckCircle} title="Incidents ouverts"
              value={incidentStats.ouverts ?? '—'}
              sub={`${incidentStats.en_cours ?? 0} en cours`}
              color="#f59e0b" />
          </>
        )}
        {scoringStats?.avg_score != null && (
          <KPICard icon={BarChart2} title={t('avg_carrier_score')}
            value={scoringStats.avg_score.toFixed(1)}
            sub={`${scoringStats.count} transporteurs évalués`}
            color="#8b5cf6" />
        )}
        {ticketStats && (
          <KPICard icon={TicketIcon} title="Tickets support"
            value={ticketStats.count ?? ticketStats.total ?? '—'}
            sub="Tickets créés au total"
            color="#06b6d4" />
        )}
      </div>

      {/* Évolution CA + commandes */}
      <div className="glass-card animate-fade-in" style={{ marginBottom: '1.5rem', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>{t('evolution_6m')}</h3>
          <button onClick={() => exportCSV('evolution')}
            className="btn btn-sm" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} /> CSV
          </button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={evolution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCmd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="mois" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="commandes" name={t('commandes')} stroke="#3b82f6" fill="url(#colorCmd)" strokeWidth={2} />
            <Area yAxisId="right" type="monotone" dataKey="ca" name={`CA (${devise})`} stroke="#10b981" fill="url(#colorCa)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t('by_status')}</h3>
            <button onClick={() => exportCSV('statut')} className="btn btn-sm"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={parStatut} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={3} dataKey="value" nameKey="name" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {parStatut.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t('top_stores')}</h3>
            <button onClick={() => exportCSV('boutiques')} className="btn btn-sm"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topFondateurs} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={90} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={v => [`${v.toLocaleString()} ${devise}`]} />
              <Bar dataKey="ca" name="CA" radius={[0, 4, 4, 0]}>
                {topFondateurs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t('top_carriers')}</h3>
            <button onClick={() => exportCSV('transporteurs')} className="btn btn-sm"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topTransporteurs} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="livraisons" name="Livraisons" radius={[0, 4, 4, 0]}>
                {topTransporteurs.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section Tickets par catégorie */}
      {ticketStats && (ticketStats.par_categorie || ticketStats.par_statut) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {ticketStats.par_categorie && (
            <div className="glass-card animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <h3 className="card-title" style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TicketIcon size={16} color="#06b6d4" /> {t('tickets_by_category')}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(ticketStats.par_categorie).map(([k, v]) => ({ name: k, count: v }))}
                  margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                    {Object.keys(ticketStats.par_categorie).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {ticketStats.par_statut && (
            <div className="glass-card animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <h3 className="card-title" style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TicketIcon size={16} color="#8b5cf6" /> Tickets par statut
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={Object.entries(ticketStats.par_statut).map(([k, v]) => ({ name: k, value: v }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {Object.keys(ticketStats.par_statut).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Section Incidents stats */}
      {incidentStats?.par_type && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: '1.5rem', animationDelay: '0.55s' }}>
          <h3 className="card-title" style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#ef4444" /> Incidents par type
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={Object.entries(incidentStats.par_type).map(([k, v]) => ({ name: k, count: v }))}
              margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="count" name="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Rapports;
