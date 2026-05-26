import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { analyticsApi, incidentsApi, commandesApi } from '../../services/api';
import { Truck, AlertTriangle, Package, RefreshCw, Radio, Clock, CheckCircle } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

const ICON_LIVE = new L.DivIcon({
  html: '<div style="width:14px;height:14px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(16,185,129,0.3);animation:pulse 2s infinite"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7],
});

function AnimatedCounter({ value, label, color, icon: Icon }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', borderLeft: `3px solid ${color}` }}>
      <Icon size={20} color={color} style={{ margin: '0 auto 6px', display: 'block' }} />
      <div style={{ fontSize: 32, fontWeight: 900, color }}>{display}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function LiveDashboard() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
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
    { label: t('lv_active_orders_label'), value: commandes.length,         color: '#3b82f6', icon: Package },
    { label: t('incidents'),              value: incidents.length,          color: '#ef4444', icon: AlertTriangle },
    { label: t('lv_active_drivers'),      value: commandes.length,          color: '#10b981', icon: Truck },
    { label: t('dash_total_orders'),      value: data.total_commandes || 0, color: '#f59e0b', icon: CheckCircle },
  ] : [];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={22} style={{ color: '#10b981' }} />
            {t('lv_title')}
          </h2>
          <p className="page-subtitle">
            {lastUpdate ? lastUpdate.toLocaleTimeString() : t('common_loading')}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('common_retry')}
        </button>
      </div>

      {/* KPI animés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.25rem' }}>
        {kpis.map(k => <AnimatedCounter key={k.label} {...k} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>
        {/* Carte live */}
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden', borderRadius: 14 }}>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t('lv_drivers_on_mission')}</span>
          </div>
          <MapContainer center={[33.589886, -7.603869]} zoom={12} style={{ height: 420 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {commandes.map(cmd => (
              cmd.transporteur_position_lat && (
                <Marker key={cmd.id} position={[cmd.transporteur_position_lat, cmd.transporteur_position_lng]} icon={ICON_LIVE}>
                  <Popup>
                    <b>#{cmd.reference}</b><br />
                    {t('lv_popup_client')}: {cmd.client_nom || '-'}<br />
                    {t('lv_popup_statut')}: {cmd.statut}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Alertes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Incidents ouverts */}
          <div className="glass-card animate-fade-in">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{t('lv_open_incidents_title')}</span>
              <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: 10 }}>{incidents.length}</span>
            </div>
            {incidents.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('lv_no_open_incidents')}
              </div>
            ) : (
              incidents.slice(0, 5).map(inc => (
                <div key={inc.id} style={{ padding: '10px 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{inc.type_display || inc.type}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                      {new Date(inc.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="badge badge-danger" style={{ fontSize: 9 }}>{t('lv_status_open')}</span>
                </div>
              ))
            )}
          </div>

          {/* Livraisons en cours */}
          <div className="glass-card animate-fade-in">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={14} color="#3b82f6" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{t('lv_deliveries_in_progress_title')}</span>
              <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: 10 }}>{commandes.length}</span>
            </div>
            {commandes.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('lv_no_deliveries_progress')}
              </div>
            ) : (
              commandes.slice(0, 6).map(cmd => (
                <div key={cmd.id} style={{ padding: '8px 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>#{cmd.reference}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{cmd.adresse_livraison || t('lv_en_route')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
