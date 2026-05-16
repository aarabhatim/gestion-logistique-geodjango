import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { transporteursApi, fondateursApi, commandesApi } from '../services/api';
import {
  Truck, Store, Package, RefreshCw, Layers, Users,
  Navigation, AlertCircle, CheckCircle, Clock, TrendingUp,
} from 'lucide-react';

// ─── Marker SVG factories ─────────────────────────────────────────────────────
const makeIcon = (color, emoji, size = 36) => L.divIcon({
  className: '',
  html: `<div style="
    width:${size}px;height:${size}px;
    background:${color};
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:2px solid rgba(255,255,255,0.8);
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
  "><span style="transform:rotate(45deg);font-size:${size * 0.45}px;line-height:1">${emoji}</span></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const ICONS = {
  transporteur_available: makeIcon('#10b981', '🚗'),
  transporteur_delivering: makeIcon('#f59e0b', '🚚'),
  transporteur_offline:   makeIcon('#475569', '🚙'),
  boutique:               makeIcon('#3b82f6', '🏪', 32),
  delivery_active:        makeIcon('#ef4444', '📦', 32),
  client:                 makeIcon('#8b5cf6', '📍', 28),
};

const CATEGORIE_ICONS = {
  SUPERMARCHE:  '🛒', PHARMACIE: '💊', RESTAURATION: '🍽️',
  BOUTIQUE: '👗', ELECTRONIQUE: '📱',
};

// ─── Auto-fit map bounds ──────────────────────────────────────────────────────
const FitBounds = ({ transporteurs, boutiques, commandes }) => {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    transporteurs.forEach(t => { if (t.latitude && t.longitude) pts.push([t.latitude, t.longitude]); });
    boutiques.forEach(b => { if (b.latitude && b.longitude) pts.push([b.latitude, b.longitude]); });
    commandes.forEach(c => {
      if (c.latitude_livraison && c.longitude_livraison) pts.push([c.latitude_livraison, c.longitude_livraison]);
    });
    if (pts.length > 0) {
      map.fitBounds(pts, { padding: [60, 60], maxZoom: 13 });
    }
  }, [transporteurs, boutiques, commandes]);
  return null;
};

// ─── Stat Chip ────────────────────────────────────────────────────────────────
const StatChip = ({ icon: Icon, label, value, color }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
    border: `1px solid ${color}40`, borderRadius: '10px', padding: '10px 14px',
    minWidth: '120px',
  }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={16} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => (
  <div style={{
    position: 'absolute', bottom: 24, right: 16, zIndex: 1000,
    background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
    padding: '14px 18px', minWidth: 170,
  }}>
    <div style={{ fontWeight: 700, fontSize: 11, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.08em' }}>LÉGENDE</div>
    {[
      { color: '#10b981', emoji: '🚗', label: 'Transporteur disponible' },
      { color: '#f59e0b', emoji: '🚚', label: 'En livraison' },
      { color: '#475569', emoji: '🚙', label: 'Hors ligne' },
      { color: '#3b82f6', emoji: '🏪', label: 'Boutique' },
      { color: '#ef4444', emoji: '📦', label: 'Livraison active' },
    ].map(({ color, emoji, label }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ color: '#cbd5e1' }}>{label}</span>
      </div>
    ))}
  </div>
);

// ─── Layer Toggle ─────────────────────────────────────────────────────────────
const LayerToggle = ({ layers, onToggle }) => (
  <div style={{
    position: 'absolute', top: 80, right: 16, zIndex: 1000,
    background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px',
  }}>
    <div style={{ fontWeight: 700, fontSize: 11, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.08em' }}>
      <Layers size={12} style={{ marginRight: 4 }} />CALQUES
    </div>
    {Object.entries(layers).map(([key, { label, color, active }]) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}
        onClick={() => onToggle(key)}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, border: `2px solid ${color}`,
          background: active ? color : 'transparent', transition: 'all 0.2s',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, color: active ? '#e2e8f0' : '#64748b' }}>{label}</span>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const MapPage = () => {
  const [transporteurs, setTransporteurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [layers, setLayers] = useState({
    transporteurs: { label: 'Transporteurs', color: '#10b981', active: true },
    boutiques:     { label: 'Boutiques',     color: '#3b82f6', active: true },
    livraisons:    { label: 'Livraisons actives', color: '#ef4444', active: true },
  });
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [tRes, bRes, cRes] = await Promise.all([
        transporteursApi.adminListe(),
        fondateursApi.list({ is_verified: true }),
        commandesApi.list({ statut: 'EN_ROUTE' }),
      ]);
      setTransporteurs(tRes.data.results || tRes.data || []);
      setBoutiques(bRes.data.results || bRes.data || []);
      setLivraisons(cRes.data.results || cRes.data || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000); // refresh every 30s
    return () => clearInterval(intervalRef.current);
  }, []);

  const toggleLayer = (key) => {
    setLayers(prev => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }));
  };

  // Stats
  const disponibles    = transporteurs.filter(t => t.is_available && !t.is_on_delivery).length;
  const enLivraison    = transporteurs.filter(t => t.is_on_delivery).length;
  const horsLigne      = transporteurs.filter(t => !t.is_available).length;
  const boutiquesOpen  = boutiques.filter(b => b.is_open).length;

  const getTransporteurIcon = (t) => {
    if (t.is_on_delivery) return ICONS.transporteur_delivering;
    if (t.is_available)   return ICONS.transporteur_available;
    return ICONS.transporteur_offline;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '1rem' }}>
      {/* Header */}
      <div className="dashboard-header animate-fade-in" style={{ flexShrink: 0 }}>
        <div>
          <h2 className="page-title text-gradient">Carte des Opérations</h2>
          <p className="page-subtitle">
            Suivi en direct de la flotte · Mise à jour automatique toutes les 30s
            {lastUpdate && ` · ${lastUpdate.toLocaleTimeString('fr-FR')}`}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Chargement...' : 'Actualiser'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flexShrink: 0 }}>
        <StatChip icon={CheckCircle} label="Disponibles"   value={disponibles}   color="#10b981" />
        <StatChip icon={Truck}       label="En livraison"  value={enLivraison}   color="#f59e0b" />
        <StatChip icon={AlertCircle} label="Hors ligne"    value={horsLigne}     color="#64748b" />
        <StatChip icon={Store}       label="Boutiques ouv." value={boutiquesOpen} color="#3b82f6" />
        <StatChip icon={Package}     label="Actives EN_ROUTE" value={livraisons.length} color="#ef4444" />
      </div>

      {/* Map */}
      <div className="glass-card animate-fade-in" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative', borderRadius: 16, minHeight: 400 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text-secondary)' }}>
            <RefreshCw size={32} className="spin" />
            <span>Chargement des données cartographiques…</span>
          </div>
        ) : (
          <MapContainer
            center={[33.5731, -7.5898]}
            zoom={6}
            style={{ height: '100%', width: '100%', borderRadius: 16 }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <FitBounds transporteurs={transporteurs} boutiques={boutiques} commandes={livraisons} />

            {/* Transporteur markers */}
            {layers.transporteurs.active && transporteurs.map(t => {
              if (!t.latitude && !t.longitude) return null;
              return (
                <Marker
                  key={`t-${t.id}`}
                  position={[t.latitude || 33.5731, t.longitude || -7.5898]}
                  icon={getTransporteurIcon(t)}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        🚗 {t.nom_complet || `${t.user_first_name || ''} ${t.user_last_name || ''}`}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        {t.vehicule_type} · {t.plaque}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.is_on_delivery
                          ? <span style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>🚚 En livraison</span>
                          : t.is_available
                            ? <span style={{ background: '#10b98120', color: '#10b981', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>✅ Disponible</span>
                            : <span style={{ background: '#47556920', color: '#94a3b8', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>⭕ Hors ligne</span>
                        }
                        {t.is_verified && <span style={{ background: '#3b82f620', color: '#3b82f6', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>✔ Vérifié</span>}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 6, color: '#64748b' }}>
                        ⭐ {t.note_moyenne?.toFixed(1) || '–'} · {t.nombre_livraisons || 0} livraisons
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Revenus: {Math.round(t.revenus_total || 0).toLocaleString()} MAD
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Boutique markers */}
            {layers.boutiques.active && boutiques.map(b => {
              if (!b.latitude && !b.longitude) return null;
              return (
                <Marker
                  key={`b-${b.id}`}
                  position={[b.latitude, b.longitude]}
                  icon={ICONS.boutique}
                >
                  <Popup>
                    <div style={{ minWidth: 190 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {CATEGORIE_ICONS[b.categorie] || '🏪'} {b.nom_boutique}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{b.adresse} · {b.ville}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {b.is_open
                          ? <span style={{ background: '#10b98120', color: '#10b981', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>🟢 Ouvert</span>
                          : <span style={{ background: '#ef444420', color: '#ef4444', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>🔴 Fermé</span>
                        }
                        <span style={{ background: '#8b5cf620', color: '#8b5cf6', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
                          {b.categorie}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 6, color: '#64748b' }}>
                        ⭐ {b.note_moyenne?.toFixed(1) || '–'} · {b.nombre_commandes || 0} commandes
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Rayon: {b.rayon_livraison_km} km · Min: {b.commande_minimum} MAD
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Active delivery markers */}
            {layers.livraisons.active && livraisons.map(cmd => {
              const lat = cmd.latitude_livraison;
              const lon = cmd.longitude_livraison;
              if (!lat && !lon) return null;
              return (
                <React.Fragment key={`l-${cmd.id}`}>
                  <Marker position={[lat, lon]} icon={ICONS.delivery_active}>
                    <Popup>
                      <div style={{ minWidth: 190 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>📦 {cmd.reference}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                          {cmd.fondateur_detail?.nom_boutique || 'Boutique'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                          📍 {cmd.adresse_livraison}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
                            🚚 EN ROUTE
                          </span>
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6, color: '#64748b' }}>
                          Total: {Math.round(cmd.total_price || 0)} MAD
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  {/* Pulse circle around active delivery */}
                  <Circle
                    center={[lat, lon]}
                    radius={500}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08, weight: 1, dashArray: '6 4' }}
                  />
                </React.Fragment>
              );
            })}
          </MapContainer>
        )}

        {/* Overlay controls */}
        {!loading && (
          <>
            <LayerToggle layers={layers} onToggle={toggleLayer} />
            <Legend />
          </>
        )}
      </div>

      {/* Bottom data panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', flexShrink: 0 }}>

        {/* Transporteurs rapides */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: 13 }}>🚗 Transporteurs ({transporteurs.length})</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {transporteurs.slice(0, 8).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{t.nom_complet || t.user_email}</span>
                <span style={{
                  background: t.is_on_delivery ? '#f59e0b20' : t.is_available ? '#10b98120' : '#47556920',
                  color: t.is_on_delivery ? '#f59e0b' : t.is_available ? '#10b981' : '#94a3b8',
                  fontSize: 10, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                }}>
                  {t.is_on_delivery ? 'Livraison' : t.is_available ? 'Dispo' : 'Off'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Livraisons en cours */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: 13 }}>📦 En route ({livraisons.length})</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {livraisons.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Aucune livraison active</p>
            ) : livraisons.slice(0, 8).map(cmd => (
              <div key={cmd.id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cmd.reference}</span>
                  <span style={{ color: '#f59e0b' }}>{Math.round(cmd.total_price || 0)} MAD</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  {cmd.fondateur_detail?.nom_boutique}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boutiques par statut */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h4 style={{ fontWeight: 700, fontSize: 13, marginBottom: '0.75rem' }}>🏪 Boutiques ({boutiques.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Ouvertes maintenant', value: boutiquesOpen, color: '#10b981' },
              { label: 'Fermées', value: boutiques.length - boutiquesOpen, color: '#ef4444' },
              { label: 'Non vérifiées', value: boutiques.filter(b => !b.is_verified).length, color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {['SUPERMARCHE', 'RESTAURATION', 'PHARMACIE', 'ELECTRONIQUE', 'BOUTIQUE'].map(cat => {
                const n = boutiques.filter(b => b.categorie === cat).length;
                if (!n) return null;
                return (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{CATEGORIE_ICONS[cat]} {cat}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
