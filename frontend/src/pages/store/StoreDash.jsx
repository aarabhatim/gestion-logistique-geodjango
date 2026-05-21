import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Package, TrendingUp, DollarSign, Clock, Star, AlertCircle,
  ShoppingBag, RefreshCw, ArrowRight, Bell, BellOff,
} from 'lucide-react';
import { analyticsApi, fondateursApi, commandesApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

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
  } catch (e) { /* ignore — navigateur bloque audio sans geste */ }
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
      background: isLate ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
      border: `1px solid ${isLate ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
      color: isLate ? '#fca5a5' : '#fcd34d',
      borderRadius: 6, padding: '1px 8px', fontSize: 11, fontFamily: 'monospace',
      fontWeight: 700, marginLeft: 6
    }}>
      ⏱ {display}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, sub, color = '#6366f1' }) => (
  <div className="glass-card" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </div>
);

const STATUT_LABEL = {
  EN_ATTENTE:      { label: 'En attente',     color: '#64748b' },
  VALIDEE:         { label: 'Validée',         color: '#3b82f6' },
  EN_PREPARATION:  { label: 'En préparation', color: '#f59e0b' },
  EN_ROUTE:        { label: 'En route',        color: '#10b981' },
  LIVREE:          { label: 'Livrée',          color: '#22c55e' },
  ANNULEE:         { label: 'Annulée',         color: '#ef4444' },
};

// ── Indicateur live WebSocket ────────────────────────────────────────────────
const LiveBadge = ({ connected }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: connected ? '#22c55e' : '#ef4444',
      boxShadow: connected ? '0 0 6px #22c55e' : 'none',
      animation: connected ? 'pulse 2s infinite' : 'none',
    }} />
    <span style={{ fontSize: 11, color: connected ? '#86efac' : '#f87171' }}>
      {connected ? 'Live' : 'Hors ligne'}
    </span>
  </div>
);

export default function StoreDash() {
  const navigate = useNavigate();
  const [kpis, setKpis]           = useState(null);
  const [topProduits, setTopProduits] = useState([]);
  const [alertes, setAlertes]     = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [soundOn, setSoundOn]     = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate]   = useState(null);
  const [newCount, setNewCount]       = useState(0);

  // Track IDs we've already seen to detect new orders
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

      // Détection nouvelles commandes
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

  // Initial load
  useEffect(() => { fetchAll(); }, []);

  // Auto-refresh toutes les 20s
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 20000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // WebSocket notifications
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
          if (data.type === 'notification' || data.type === 'nouvelle_commande') {
            fetchAll(true);
          }
        } catch (_) {}
      };
    } catch (_) {}
    return () => { try { ws?.close(); } catch (_) {} };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-secondary)' }}>Chargement…</span>
    </div>
  );

  const k = kpis || {};
  const enAttente     = commandes.filter(c => c.statut === 'EN_ATTENTE');
  const enPreparation = commandes.filter(c => c.statut === 'EN_PREPARATION');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Tableau de bord Boutique</h2>
          {lastUpdate && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
              Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LiveBadge connected={wsConnected} />
          {newCount > 0 && (
            <div
              onClick={() => setNewCount(0)}
              style={{
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#fca5a5', borderRadius: 20, padding: '4px 12px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', animation: 'pulse 1.5s infinite'
              }}
            >
              🔔 +{newCount} nouvelle{newCount > 1 ? 's' : ''} commande{newCount > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => setSoundOn(s => !s)}
            title={soundOn ? 'Désactiver le son' : 'Activer le son'}
            style={{
              background: soundOn ? 'rgba(34,197,94,0.15)' : 'rgba(71,85,105,0.2)',
              border: `1px solid ${soundOn ? 'rgba(34,197,94,0.4)' : 'rgba(71,85,105,0.3)'}`,
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: soundOn ? '#86efac' : '#64748b', display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            {soundOn ? <Bell size={14} /> : <BellOff size={14} />}
            <span style={{ fontSize: 12 }}>{soundOn ? 'Son on' : 'Son off'}</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchAll()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* Bande statut temps réel */}
      {(enAttente.length > 0 || enPreparation.length > 0) && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12, padding: '12px 18px',
          display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center'
        }}>
          <span style={{ fontSize: 13, color: '#fcd34d', fontWeight: 700 }}>
            ⚡ Statut en direct
          </span>
          {enAttente.length > 0 && (
            <span style={{ color: '#94a3b8', fontSize: 13 }}>
              🟡 <strong style={{ color: '#f1f5f9' }}>{enAttente.length}</strong> en attente de validation
            </span>
          )}
          {enPreparation.length > 0 && (
            <span style={{ color: '#94a3b8', fontSize: 13 }}>
              🟠 <strong style={{ color: '#f1f5f9' }}>{enPreparation.length}</strong> en cours de préparation
            </span>
          )}
          <button
            onClick={() => navigate('/boutique/commandes')}
            style={{
              marginLeft: 'auto', background: 'rgba(245,158,11,0.2)',
              border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d',
              borderRadius: 8, padding: '5px 14px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600
            }}
          >
            Gérer →
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
        <StatCard title="CA ce mois" value={`${Math.round(k.ca_mois || 0).toLocaleString('fr-FR')} MAD`} icon={DollarSign} color="#10b981" />
        <StatCard title="CA total" value={`${Math.round(k.ca_total || 0).toLocaleString('fr-FR')} MAD`} icon={TrendingUp} color="#6366f1" />
        <StatCard title="Commandes totales" value={k.commandes_total || 0}
          sub={`${k.commandes_aujourd_hui || 0} aujourd'hui`} icon={Package} color="#3b82f6" />
        <StatCard title="En attente" value={k.commandes_en_attente || 0}
          sub={`${k.commandes_en_preparation || 0} en préparation`} icon={Clock} color="#f59e0b" />
        <StatCard title="Note boutique" value={(k.note_boutique || 0).toFixed(1)}
          sub={`${k.nombre_avis || 0} avis`} icon={Star} color="#f59e0b" />
        <StatCard title="Taux annulation" value={`${k.taux_annulation || 0}%`} icon={AlertCircle} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Dernières commandes — avec chronomètre */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} color="#3b82f6" /> Commandes récentes
            </h4>
            <button className="btn btn-secondary btn-sm"
              onClick={() => navigate('/boutique/commandes')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              Tout voir <ArrowRight size={12} />
            </button>
          </div>
          {commandes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Aucune commande
            </div>
          ) : commandes.slice(0, 6).map(cmd => {
            const s = STATUT_LABEL[cmd.statut] || STATUT_LABEL.EN_ATTENTE;
            return (
              <div key={cmd.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
                    #{cmd.reference || cmd.id}
                    <PrepTimer cmd={cmd} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {new Date(cmd.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    {Math.round(parseFloat(cmd.total_price || 0))} MAD
                  </div>
                  <span style={{ fontSize: 10, background: s.color + '20', color: s.color,
                    padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alertes stock */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="#f59e0b" /> Alertes de stock
            </h4>
            <button className="btn btn-secondary btn-sm"
              onClick={() => navigate('/boutique/produits')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              Gérer <ArrowRight size={12} />
            </button>
          </div>
          {alertes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981' }}>
              ✅ Tous les stocks sont suffisants
            </div>
          ) : alertes.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Seuil: {p.stock_alerte} unités
                </div>
              </div>
              <span style={{
                background: p.stock === 0 ? '#ef444420' : '#f59e0b20',
                color: p.stock === 0 ? '#ef4444' : '#f59e0b',
                fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              }}>
                {p.stock === 0 ? 'Rupture' : `${p.stock} restants`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top produits */}
      {topProduits.length > 0 && (
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="#6366f1" /> Top produits commandés
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {topProduits.slice(0, 6).map((p, i) => (
              <div key={p.nom} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1',
                    background: '#6366f120', padding: '2px 8px', borderRadius: 20 }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>
                    {p.nombre_commandes} cmd
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {p.stock} en stock · {p.prix} MAD
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
