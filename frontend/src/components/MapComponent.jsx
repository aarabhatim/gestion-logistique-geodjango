import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { transporteursApi, commandesApi, fondateursApi } from '../services/api';

// ─── Inline SVG icons — no external CDN ──────────────────────────────────────
import '../../utils/leafletIcons'; // applies the L.Icon.Default patch
import { useI18n } from '../contexts/I18nContext';

const makePin = (color, emoji) => L.divIcon({
  className: '',
  html: `<div style="
    width:34px;height:34px;background:${color};
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    border:2px solid rgba(255,255,255,0.8);
    box-shadow:0 2px 8px rgba(0,0,0,0.45);
    display:flex;align-items:center;justify-content:center;
  "><span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -36],
});

const ICONS = {
  available:  makePin('#10b981', '🚗'),
  delivering: makePin('#f59e0b', '🚚'),
  offline:    makePin('#475569', '🚙'),
  boutique:   makePin('#3b82f6', '🏪'),
  delivery:   makePin('#ef4444', '📦'),
};

// ─── MapComponent (shared, used by admin layout) ──────────────────────────────
const MapComponent = () => {
  const { t } = useI18n();
  const [transporteurs, setTransporteurs] = useState([]);
  const [boutiques,     setBoutiques]     = useState([]);
  const [livraisons,    setLivraisons]    = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      transporteursApi.adminListe().catch(() => ({ data: [] })),
      fondateursApi.list({ is_verified: true }).catch(() => ({ data: [] })),
      commandesApi.list({ statut: 'EN_ROUTE' }).catch(() => ({ data: [] })),
    ]).then(([tRes, bRes, cRes]) => {
      setTransporteurs(tRes.data.results || tRes.data || []);
      setBoutiques(bRes.data.results || bRes.data || []);
      setLivraisons(cRes.data.results || cRes.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Chargement de la carte…
      </div>
    );
  }

  return (
    <MapContainer
      center={[33.5731, -7.5898]}
      zoom={6}
      style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 1 }}
      zoomControl={true}
    >
      <TileLayer
        url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
        attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
      />

      {/* Transporteurs */}
      {transporteurs.map(t => {
        if (!t.latitude || !t.longitude) return null;
        const icon = t.is_on_delivery ? ICONS.delivering : t.is_available ? ICONS.available : ICONS.offline;
        return (
          <Marker key={`t-${t.id}`} position={[t.latitude, t.longitude]} icon={icon}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{t.nom_complet || t.user_email}</strong><br />
                <span style={{ fontSize: 12, color: '#64748b' }}>{t.vehicule_type} · {t.plaque}</span><br />
                <span style={{ fontSize: 12, color: t.is_on_delivery ? '#f59e0b' : t.is_available ? '#10b981' : '#64748b' }}>
                  {t.is_on_delivery ? `🚚 ${t('mc_delivering')}` : t.is_available ? `✅ ${t('lbl_available')}` : `⭕ ${t('tr_offline')}`}
                </span><br />
                <span style={{ fontSize: 12, color: '#64748b' }}>⭐ {t.note_moyenne?.toFixed(1) || '–'} · {t.nombre_livraisons || 0} {t('mc_deliveries')}</span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Boutiques */}
      {boutiques.map(b => {
        if (!b.latitude || !b.longitude) return null;
        return (
          <Marker key={`b-${b.id}`} position={[b.latitude, b.longitude]} icon={ICONS.boutique}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{b.nom_boutique}</strong><br />
                <span style={{ fontSize: 12, color: '#64748b' }}>{b.categorie} · {b.ville}</span><br />
                <span style={{ fontSize: 12, color: b.is_open ? '#10b981' : '#ef4444' }}>
                  {b.is_open ? `🟢 ${t('map_open')}` : `🔴 ${t('map_closed')}`}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Livraisons actives */}
      {livraisons.map(cmd => {
        const lat = cmd.latitude_livraison;
        const lon = cmd.longitude_livraison;
        if (!lat || !lon) return null;
        return (
          <React.Fragment key={`l-${cmd.id}`}>
            <Marker position={[lat, lon]} icon={ICONS.delivery}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>#{cmd.reference}</strong><br />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{cmd.fondateur_detail?.nom_boutique}</span><br />
                  <span style={{ fontSize: 12 }}>{cmd.adresse_livraison}</span><br />
                  <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>{Math.round(cmd.total_price || 0)} MAD</span>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[lat, lon]}
              radius={400}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.07, weight: 1, dashArray: '5 4' }}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
