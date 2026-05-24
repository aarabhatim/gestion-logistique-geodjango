import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { analyticsApi, incidentsApi, commandesApi } from '../../services/api';
import { Truck, AlertTriangle, Package, RefreshCw, Radio, CheckCircle, Activity } from 'lucide-react';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:      '#080E09',
  surface: '#0D1A10',
  card:    '#0F1D12',
  primary: '#22C55E',
  border:  'rgba(34,197,94,0.08)',
  text:    '#FFFFFF',
  text2:   '#6B7280',
  danger:  '#EF4444',
  info:    '#60A5FA',
  accent:  '#F59E0B',
};
const grad = `linear-gradient(135deg, #16A34A, ${T.primary})`;
const CARD = {
  background: T.card,
  borderRadius: 16,
  border: `1px solid ${T.border}`,
  overflow: 'hidden',
};

// ─── Pulsing live icon ────────────────────────────────────────────────────────
const ICON_LIVE = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#22C55E;border:2px solid white;border-radius:50%;
    box-shadow:0 0 0 4px rgba(34,197,94,0.3);animation:pulse 2s infinite"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, label, color, icon: Icon }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div style={{
      ...CARD, padding: '18px 20px',
      borderLeft: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'transform 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}15`, border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: 12, color: T.text2 }}>{label}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveDashboard() {
  const [data, setData]           = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading]     = useState(true);
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [dash, inc, cmd] = await Promise.all([
        analyticsApi.adminDashboard(),
        incidentsApi.list({ statut: 'ouvert', page_size: 5 }),
        commandesApi.list({ statut: 'EN_ROUTE', page_size: 50 }),
      ]);
      setData(dash.data);
      setIncidents(inc.data?.results || inc.data || []);
      setCommandes(cmd.data?.results || cmd.data || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const kpis = data ? [
    { label: 'Commandes actives',     value: commandes.length,             color: T.info,    icon: Package },
    { label: 'Incidents ouverts',     value: incidents.length,             color: T.danger,  icon: AlertTriangle },
    { label: 'Transporteurs en route',value: commandes.length,             color: T.primary, icon: Truck },
    { label: 'Total commandes',       value: data.total_commandes || 0,    color: T.accent,  icon: CheckCircle },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, color: T.text, margin: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Radio size={18} color={T.primary} />
            </div>
            Tableau de bord live
          </h2>
          <p style={{ fontSize: 13, color: T.text2, marginTop: 6 }}>
            {lastUpdate ? `Mis à jour : ${lastUpdate.toLocaleTimeString('fr-FR')}` : 'Chargement…'}
          </p>
        </div>
        <button
          onClick={fetchAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: 'rgba(34,197,94,0.07)', color: T.primary,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.07)'; e.currentTarget.style.borderColor = T.border; }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {kpis.map(k => <AnimatedCounter key={k.label} {...k} />)}
      </div>

      {/* ── Map + Panels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>

        {/* Live map */}
        <div style={{ ...CARD, borderRadius: 18 }}>
          <div style={{
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: T.primary,
              display: 'inline-block', boxShadow: `0 0 6px ${T.primary}`,
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Chauffeurs en mission</span>
            <span style={{
              marginLeft: 'auto', padding: '2px 8px', borderRadius: 20,
              background: 'rgba(34,197,94,0.12)', color: T.primary, fontSize: 11, fontWeight: 700,
            }}>
              {commandes.length} actif{commandes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <MapContainer center={[33.589886, -7.603869]} zoom={12}
            style={{ height: 440 }}>
            <TileLayer
              url="https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=5d2tALzIlgsl0ucJYKZL"
              attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
            />
            {commandes.map(cmd =>
              cmd.transporteur_position_lat ? (
                <Marker key={cmd.id}
                  position={[cmd.transporteur_position_lat, cmd.transporteur_position_lng]}
                  icon={ICON_LIVE}>
                  <Popup>
                    <b>Commande #{cmd.reference}</b><br />
                    Client : {cmd.client_nom || '–'}<br />
                    Statut : {cmd.statut}
                  </Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>

        {/* Panels column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Incidents */}
          <div style={{ ...CARD, flex: 1 }}>
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14} color={T.danger} />
              <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>Incidents ouverts</span>
              <span style={{
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 20,
                background: 'rgba(239,68,68,0.12)', color: T.danger, fontSize: 10, fontWeight: 700,
              }}>
                {incidents.length}
              </span>
            </div>
            {incidents.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: T.text2 }}>
                ✅ Aucun incident ouvert
              </div>
            ) : (
              incidents.slice(0, 5).map(inc => (
                <div key={inc.id} style={{
                  padding: '10px 16px',
                  borderBottom: `1px solid rgba(255,255,255,0.03)`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{inc.type_display || inc.type}</div>
                    <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>
                      {new Date(inc.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                    background: 'rgba(239,68,68,0.12)', color: T.danger,
                  }}>
                    Ouvert
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Livraisons en cours */}
          <div style={{ ...CARD, flex: 1 }}>
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Truck size={14} color={T.info} />
              <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>Livraisons en cours</span>
              <span style={{
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 20,
                background: 'rgba(96,165,250,0.12)', color: T.info, fontSize: 10, fontWeight: 700,
              }}>
                {commandes.length}
              </span>
            </div>
            {commandes.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: T.text2 }}>
                Aucune livraison en cours
              </div>
            ) : (
              commandes.slice(0, 6).map(cmd => (
                <div key={cmd.id} style={{
                  padding: '10px 16px',
                  borderBottom: `1px solid rgba(255,255,255,0.03)`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package size={12} color={T.primary} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>#{cmd.reference}</div>
                    <div style={{ fontSize: 10, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cmd.adresse_livraison || 'En route…'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
