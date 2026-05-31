import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Package, TrendingUp, DollarSign, Clock, Star, AlertCircle,
  ShoppingBag, RefreshCw, ArrowRight, Bell, BellOff,
} from 'lucide-react';
import { analyticsApi, fondateursApi, commandesApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import '../../styles/marjane.css';
import { useI18n } from '../../contexts/I18nContext';

// ── Son de notification via Web Audio API ───────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* ignore */ }
}

// ── Chronomètre de préparation ───────────────────────────────────────────────
function useTimer(startedAt) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const PrepTimer = ({ cmd }) => {
  const display = useTimer(cmd.statut === 'EN_PREPARATION' ? cmd.updated_at : null);
  if (cmd.statut !== 'EN_PREPARATION') return null;
  const isLate = parseInt(display.split(':')[0]) >= 15;
  return (
    <span style={{
      background: isLate ? 'rgba(227,6,19,0.1)' : 'rgba(245,158,11,0.1)',
      border: `1px solid ${isLate ? 'rgba(227,6,19,0.3)' : 'rgba(245,158,11,0.3)'}`,
      color: isLate ? '#E30613' : '#D97706',
      borderRadius: 6, padding: '1px 8px', fontSize: 11, fontFamily: 'monospace',
      fontWeight: 700, marginLeft: 6,
    }}>
      ⏱ {display}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, sub, color = '#E30613' }) => (
  <div className="mj-stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--mj-text-3)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </div>
);

const STATUT_LABEL = {
  EN_ATTENTE:      { color: '#64748b' },
  VALIDEE:         { color: '#3b82f6' },
  EN_PREPARATION:  { color: '#F59E0B' },
  EN_ROUTE:        { color: '#E30613' },
  LIVREE:          { color: '#22C55E' },
  ANNULEE:         { color: '#ef4444' },
};

const LiveBadge = ({ connected }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: connected ? '#22C55E' : '#ef4444',
      boxShadow: connected ? '0 0 6px #22C55E' : 'none',
    }} />
    <span style={{ fontSize: 12, color: connected ? '#22C55E' : '#ef4444', fontWeight: 600 }}>
      {connected ? 'Live' : t('tr_offline')}
    </span>
  </div>
);

export default function StoreDash() {
  const navigate = useNavigate();
  const { t, tStatus } = useI18n();
  const [kpis, setKpis]               = useState(null);
  const [topProduits, setTopProduits] = useState([]);
  const [alertes, setAlertes]         = useState([]);
  const [commandes, setCommandes]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [soundOn, setSoundOn]         = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate]   = useState(null);
  const [newCount, setNewCount]       = useState(0);

  const knownIdsRef = useRef(new Set());
  const wsRef       = useRef(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [analyticsRes, alertesRes, commandesRes] = await Promise.all([
        analyticsApi.fondateurAnalytics().catch(() => ({ data: {} })),
        fondateursApi.stockAlertes().catch(() => ({ data: [] })),
        commandesApi.list({ page_size: 10 }).catch(() => ({ data: { results: [] } })),
      ]);
      const a = analyticsRes.data || {};
      setKpis(a.kpis || {});
      setTopProduits(a.top_produits || []);
      setAlertes(Array.isArray(alertesRes.data) ? alertesRes.data : (alertesRes.data?.results || []));

      const cmds = Array.isArray(commandesRes.data)
        ? commandesRes.data.slice(0, 10)
        : (commandesRes.data?.results || []).slice(0, 10);
      setCommandes(cmds);
      setLastUpdate(new Date());

      const newOnes = cmds.filter(c => !knownIdsRef.current.has(c.id));
      if (newOnes.length > 0 && knownIdsRef.current.size > 0) {
        setNewCount(n => n + newOnes.length);
        if (soundOn) playNotifSound();
      }
      cmds.forEach(c => knownIdsRef.current.add(c.id));
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [soundOn]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 20000);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) return;
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws/notifications/?token=${token}`;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen  = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'notification' || data.type === 'nouvelle_commande') fetchAll(true);
        } catch (_) {}
      };
    } catch (_) {}
    return () => { try { ws?.close(); } catch (_) {} };
  }, []);

  if (loading) return (
    <div className="mj-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <div className="mj-spin" style={{ width: 28, height: 28, border: '3px solid var(--mj-border)', borderTopColor: 'var(--mj-red)', borderRadius: '50%' }} />
      <span style={{ color: 'var(--mj-text-3)' }}>{t('common_loading')}</span>
    </div>
  );

  const k = kpis || {};
  const enAttente     = commandes.filter(c => c.statut === 'EN_ATTENTE');
  const enPreparation = commandes.filter(c => c.statut === 'EN_PREPARATION');

  return (
    <div className="mj-page" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 0 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            {t('sd_title')}
          </h2>
          {lastUpdate && (
            <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 4 }}>
              {t('sd_updated_at')} {lastUpdate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <LiveBadge connected={wsConnected} />
          {newCount > 0 && (
            <div
              onClick={() => setNewCount(0)}
              style={{
                background: 'var(--mj-red-light)', border: '1px solid rgba(227,6,19,0.3)',
                color: 'var(--mj-red)', borderRadius: 20, padding: '5px 14px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔔 +{newCount} {newCount > 1 ? t('sd_new_orders') : t('sd_new_order')}
            </div>
          )}
          <button
            onClick={() => setSoundOn(s => !s)}
            className="mj-btn mj-btn-secondary mj-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {soundOn ? <Bell size={14} /> : <BellOff size={14} />}
            {soundOn ? t('sd_sound_on') : t('sd_sound_off')}
          </button>
          <button
            className="mj-btn mj-btn-outline-red mj-btn-sm"
            onClick={() => fetchAll()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> {t('action_refresh')}
          </button>
        </div>
      </div>

      {/* ── Bande statut temps réel ── */}
      {(enAttente.length > 0 || enPreparation.length > 0) && (
        <div style={{
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 14, padding: '14px 20px',
          display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#D97706', fontWeight: 700 }}>{t('sd_live_status')}</span>
          {enAttente.length > 0 && (
            <span style={{ color: 'var(--mj-text-3)', fontSize: 13 }}>
              🟡 <strong style={{ color: 'var(--mj-text)' }}>{enAttente.length}</strong> {t('sd_waiting_val')}
            </span>
          )}
          {enPreparation.length > 0 && (
            <span style={{ color: 'var(--mj-text-3)', fontSize: 13 }}>
              🟠 <strong style={{ color: 'var(--mj-text)' }}>{enPreparation.length}</strong> {t('sd_in_prep_lbl')}
            </span>
          )}
          <button
            className="mj-btn mj-btn-sm"
            onClick={() => navigate('/boutique/commandes')}
            style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#D97706' }}
          >
            Gérer →
          </button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
        <StatCard title={t('sd_ca_month')} value={`${Math.round(k.ca_mois || 0).toLocaleString(undefined)} MAD`} icon={DollarSign} color="#22C55E" />
        <StatCard title={t('sd_ca_total')} value={`${Math.round(k.ca_total || 0).toLocaleString(undefined)} MAD`} icon={TrendingUp} color="#3b82f6" />
        <StatCard title={t('sd_orders_total')} value={k.commandes_total || 0}
          sub={`${k.commandes_aujourd_hui || 0} ${t('sd_today')}`} icon={Package} color="#6366f1" />
        <StatCard title={t('status_EN_ATTENTE')} value={k.commandes_en_attente || 0}
          sub={`${k.commandes_en_preparation || 0} ${t('an_in_prep_sub')}`} icon={Clock} color="#F59E0B" />
        <StatCard title={t('sd_shop_rating')} value={(k.note_boutique || 0).toFixed(1)}
          sub={`${k.nombre_avis || 0} ${t('sd_reviews_lbl')}`} icon={Star} color="#F59E0B" />
        <StatCard title={t('sd_cancel_rate')} value={`${k.taux_annulation || 0}%`} icon={AlertCircle} color="#E30613" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>

        {/* ── Dernières commandes ── */}
        <div className="mj-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
              <ShoppingBag size={16} color="var(--mj-red)" /> Commandes récentes
            </h4>
            <button
              className="mj-btn mj-btn-secondary mj-btn-sm"
              onClick={() => navigate('/boutique/commandes')}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Tout voir <ArrowRight size={12} />
            </button>
          </div>
          {commandes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mj-text-3)', fontSize: 14 }}>
              Aucune commande
            </div>
          ) : commandes.slice(0, 6).map(cmd => {
            const s = STATUT_LABEL[cmd.statut] || STATUT_LABEL.EN_ATTENTE;
            return (
              <div key={cmd.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--mj-border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mj-text)', display: 'flex', alignItems: 'center' }}>
                    #{cmd.reference || cmd.id}
                    <PrepTimer cmd={cmd} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mj-text-3)' }}>
                    {new Date(cmd.created_at).toLocaleDateString(undefined)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#22C55E', fontSize: 14 }}>
                    {Math.round(parseFloat(cmd.total_price || 0))} MAD
                  </div>
                  <span style={{
                    fontSize: 10, background: s.color + '15', color: s.color,
                    padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                  }}>
                    {tStatus(cmd.statut)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Alertes stock ── */}
        <div className="mj-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
              <AlertCircle size={16} color="#F59E0B" /> Alertes de stock
            </h4>
            <button
              className="mj-btn mj-btn-secondary mj-btn-sm"
              onClick={() => navigate('/boutique/produits')}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Gérer <ArrowRight size={12} />
            </button>
          </div>
          {alertes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#22C55E', fontSize: 14 }}>
              ✅ Tous les stocks sont suffisants
            </div>
          ) : alertes.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--mj-border)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mj-text)' }}>{p.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--mj-text-3)' }}>{t('sd_threshold')}: {p.stock_alerte} {t('sd_units')}</div>
              </div>
              <span style={{
                background: p.stock === 0 ? 'rgba(227,6,19,0.08)' : 'rgba(245,158,11,0.08)',
                color: p.stock === 0 ? '#E30613' : '#D97706',
                border: `1px solid ${p.stock === 0 ? 'rgba(227,6,19,0.2)' : 'rgba(245,158,11,0.2)'}`,
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
              }}>
                {p.stock === 0 ? t('sd_out_of_stock') : `${p.stock} ${t('sd_remaining')}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top produits ── */}
      {topProduits.length > 0 && (
        <div className="mj-card">
          <h4 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            <TrendingUp size={16} color="var(--mj-red)" /> Top produits commandés
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {topProduits.slice(0, 6).map((p, i) => (
              <div key={p.nom} style={{
                background: 'var(--mj-bg)', borderRadius: 12, padding: 14,
                border: '1px solid var(--mj-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--mj-red)',
                    background: 'var(--mj-red-light)', padding: '2px 8px', borderRadius: 20,
                  }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 700 }}>
                    {p.nombre_commandes} cmd
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--mj-text)', marginBottom: 4 }}>{p.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--mj-text-3)' }}>
                  {p.stock} {t('sd_in_stock')} · {p.prix} MAD
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
