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
  const { t, tStatus, langue, formatPrice, formatDate, devise } = useI18n();
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

  // ── Impression / PDF (via window.print) ──────────────────────────────────
  const handlePrint = () => window.print();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: 'var(--text-secondary)' }}>
      Chargement des rapports...
    </div>
  );

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📊 {t('reports')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {t('reports_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <button onClick={() => setShowExportMenu(v => !v)} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
          }}>⬇️ {t('export')}</button>
          <button onClick={handlePrint} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
          }}>🖨️ {t('print')}</button>
          {showExportMenu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, background: 'var(--bg-elevated,rgba(20,26,42,0.98))',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 8, zIndex: 100, minWidth: 200,
            }}>
              {[
                { type: 'kpis', labelKey: 'rp_export_kpis' },
                { type: 'evolution', labelKey: 'rp_export_evol' },
                { type: 'statut', labelKey: 'rp_export_statut' },
                { type: 'boutiques', labelKey: 'rp_export_stores' },
                { type: 'transporteurs', labelKey: 'rp_export_trans' },
                { type: 'all', labelKey: 'rp_export_all' },
              ].map(opt => (
                <button key={opt.type} onClick={() => exportCSV(opt.type)} style={{
                  display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                  background: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
                  borderRadius: 8, textAlign: 'left',
                }} className="hover-highlight">{t(opt.labelKey)}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: t('rp_total_orders'),  value: kpis.total_commandes ?? 0, icon: '📦' },
          { label: t('rp_total_revenue'), value: `${(kpis.ca_total ?? 0).toLocaleString()}`, icon: '💰' },
          { label: t('rp_delivery_rate'), value: `${kpis.taux_livraison ?? 0}%`, icon: '✅' },
          { label: t('rp_active_stores'), value: kpis.boutiques_actives ?? 0, icon: '🏪' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--bg-card,rgba(255,255,255,0.04))', borderRadius: 14,
            padding: '18px 20px', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 40 }}>
        {t('rp_data_loaded')}
      </div>
    </div>
  );
}

export default Rapports;
