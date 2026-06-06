import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { analyticsApi, incidentsApi, commandesApi, transporteursApi } from '../../services/api';
import { Truck, AlertTriangle, Package, RefreshCw, Radio, CheckCircle, Activity, MapPin, Users } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

// ─── Icônes carte ─────────────────────────────────────────────────────────────
const makeMarker = (color, size = 16) => new L.DivIcon({
  className: '',
  html: `<div style="
    position:relative;
    width:${size}px;height:${size}px;
    background:${color};
    border:2px solid rgba(255,255,255,0.9);
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const ICON_DRIVER_ACTIVE   = makeMarker('#22C55E', 18);
const ICON_DRIVER_DELIVER  = makeMarker('#F59E0B', 18);
const ICON_DRIVER_OFFLINE  = makeMarker('#64748B', 14);
const ICON_ORDER           = makeMarker('#60A5FA', 16);

const T = {
  bg: '#080E09', card: '#0F1D12', primary: '#22C55E',
  border: 'rgba(34,197,94,0.1)', text: '#FFFFFF', text2: '#6B7280',
  danger: '#EF4444', info: '#60A5FA', accent: '#F59E0B',
};
const CARD = { background: T.card, borderRadius: 16, border: `1px solid ${T.border}` };

// ─── Compteur animé ───────────────────────────────────────────────────────────
function Counter({ value, label, color, icon: Icon }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let v = 0;
    const step = Math.max(1, Math.ceil(value / 24));
    const id = setInterval(() => {
      v = Math.min(v + step, value);
      setN(v);
      if (v >= value) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div style={{ ...CARD, padding: '18px 20px', borderLeft: `3px solid ${color}` }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{ padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, fontSize: 10, fontWeight: 700 }}>
    {label}
  </span>
);

// ─── Composant principal ──────────────────────────────────────────────────────
export default function LiveDashboard() {
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState(null);
  const [incidents, setIncidents]   = useState([]);
  const [commandes, setCommandes]   = useState([]);
  const [drivers, setDrivers]       = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading]       = useState(true);
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [dash, inc, cmd, drv] = await Promise.all([
        analyticsApi.adminDashboard(),
        incidentsApi.list({ statut: 'ouvert', page_size: 10 }),
        commandesApi.list({ statut: 'EN_ROUTE', page_size: 50 }),
        transporteursApi.adminListe({ page_size: 100 }),
      ]);
      setAnalytics(dash.data);
      setIncidents(inc.data?.results || inc.data || []);
      setCommandes(cmd.data?.results || cmd.data || []);
      setDrivers(drv.data?.results || drv.data || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('[LiveDashboard]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const kpis = analytics ? [
    { label: t('live_active_orders'),    value: commandes.length,                               color: T.info,    icon: Package },
    { label: t('live_open_incidents'),   value: incidents.length,                               color: T.danger,  icon: AlertTriangle },
    { label: t('live_drivers_en_route'), value: drivers.filter(d => d.is_on_delivery).length,   color: T.accent,  icon: Truck },
    { label: t('live_drivers_mission'),  value: drivers.filter(d => d.is_available).length,     color: T.primary, icon: Users },
  ] : [];

  const activeDrivers   = drivers.filter(d => d.latitude && d.longitude);
  const activeCommandes = commandes.filter(c => c.latitude_livraison && c.longitude_livraison);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={17} color={T.primary} />
            </div>
            {t('live_dashboard')}
          </h2>
          <p style={{ fontSize: 12, color: T.text2, marginTop: 5 }}>
            {lastUpdate ? `${t('live_updated')} ${lastUpdate.toLocaleTimeString()}` : t('live_loading')}
          </p>
        </div>
        <button onClick={fetchAll} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
          borderRadius: 10, border: `1px solid ${T.border}`,
          background: 'rgba(34,197,94,0.07)', color: T.primary,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {t('live_refresh')}
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {kpis.map(k => <Counter key={k.label} {...k} />)}
      </div>

      {/* ── Carte + Panneaux ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>

        {/* Carte */}
        <div style={{ ...CARD, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.primary, display: 'inline-block', boxShadow: `0 0 6px ${T.primary}`, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('live_drivers_mission')}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 11 }}>
              <Badge label={`${activeDrivers.filter(d => d.is_on_delivery).length} en livraison`} color={T.accent} />
              <Badge label={`${activeDrivers.filter(d => d.is_available && !d.is_on_delivery).length} disponibles`} color={T.primary} />
              <Badge label={`${commandes.length} commandes`} color={T.info} />
            </div>
          </div>
          <MapContainer center={[33.589886, -7.603869]} zoom={12} style={{ height: 460 }}>
            <TileLayer
              url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
              attribution="&copy; MapTiler"
            />

            {/* Marqueurs chauffeurs */}
            {activeDrivers.map(driver => (
              <Marker
                key={`drv-${driver.id}`}
                position={[driver.latitude, driver.longitude]}
                icon={driver.is_on_delivery ? ICON_DRIVER_DELIVER : (driver.is_available ? ICON_DRIVER_ACTIVE : ICON_DRIVER_OFFLINE)}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <b style={{ fontSize: 13 }}>{driver.nom_complet || 'Chauffeur'}</b>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      {driver.vehicule_type} — {driver.plaque}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {driver.is_on_delivery && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>En livraison</span>}
                      {driver.is_available && !driver.is_on_delivery && <span style={{ background: '#22c55e20', color: '#22c55e', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>Disponible</span>}
                      {!driver.is_available && <span style={{ background: '#64748b20', color: '#64748b', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>Hors ligne</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      Note: {driver.note_moyenne?.toFixed(1) || '—'} | {driver.nombre_livraisons} livraisons
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Marqueurs commandes EN_ROUTE */}
            {commandes.map(cmd => {
              const lat = cmd.latitude_livraison;
              const lng = cmd.longitude_livraison;
              if (!lat || !lng) return null;
              return (
                <Marker key={`cmd-${cmd.id}`} position={[lat, lng]} icon={ICON_ORDER}>
                  <Popup>
                    <b>#{cmd.reference}</b><br />
                    {cmd.client_nom || cmd.client_detail?.username || '—'}<br />
                    <span style={{ fontSize: 11, color: '#64748b' }}>{cmd.adresse_livraison}</span>
                  </Popup>
                </Marker>
              );
            })}

          </MapContainer>

          {/* Légende */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { color: '#22C55E', label: 'Disponible' },
              { color: '#F59E0B', label: 'En livraison' },
              { color: '#64748B', label: 'Hors ligne' },
              { color: '#60A5FA', label: 'Commande EN_ROUTE' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.text2 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Panneaux droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Incidents ouverts */}
          <div style={{ ...CARD, flex: 1 }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color={T.danger} />
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{t('live_open_incidents')}</span>
              <Badge label={String(incidents.length)} color={T.danger} />
            </div>
            {incidents.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: T.text2 }}>
                <CheckCircle size={22} color={T.primary} style={{ display: 'block', margin: '0 auto 8px' }} />
                {t('live_no_incident')}
              </div>
            ) : incidents.slice(0, 6).map(inc => (
              <div key={inc.id} style={{ padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.03)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{inc.type_display || inc.type_incident || inc.type}</div>
                  <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>
                    {inc.created_at ? new Date(inc.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
                <Badge label={t('incident_open')} color={T.danger} />
              </div>
            ))}
          </div>

          {/* Livraisons en cours */}
          <div style={{ ...CARD, flex: 1 }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={14} color={T.info} />
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{t('live_deliveries_ongoing')}</span>
              <Badge label={String(commandes.length)} color={T.info} />
            </div>
            {commandes.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: T.text2 }}>{t('live_no_delivery')}</div>
            ) : commandes.slice(0, 7).map(cmd => (
              <div key={cmd.id} style={{ padding: '9px 14px', borderBottom: `1px solid rgba(255,255,255,0.03)`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={11} color={T.primary} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>#{cmd.reference}</div>
                  <div style={{ fontSize: 10, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cmd.client_nom || cmd.client_detail?.username || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
