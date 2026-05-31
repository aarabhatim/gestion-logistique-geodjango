import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, MapPin, Layers, RefreshCw, Store, Package, Target,
  TrendingUp, AlertCircle, Eye, EyeOff, Download,
  Clock, DollarSign, AlertTriangle, Truck,
} from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { useI18n } from '../../contexts/I18nContext';

const { BaseLayer } = LayersControl;

const VILLES_COORDS = {
  'Casablanca':  [33.5731, -7.5898],
  'Rabat':       [34.0209, -6.8416],
  'Marrakech':   [31.6295, -7.9811],
  'Fes':         [34.0181, -5.0078],
  'Tanger':      [35.7595, -5.8340],
  'Agadir':      [30.4278, -9.5981],
  'Meknes':      [33.8935, -5.5547],
  'Oujda':       [34.6814, -1.9086],
  'Kenitra':     [34.2610, -6.5802],
  'Tetouan':     [35.5785, -5.3683],
};

const STATUT_COLORS = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#3b82f6', EN_PREPARATION: '#22c55e',
  EN_ROUTE: '#06b6d4', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

// Labels traduits via i18nKey -> t() au rendu
const HEATMAP_TYPES = [
  { key: 'commandes', i18nKey: 'hm_tab_orders',    icon: Package,       color: '#3b82f6' },
  { key: 'retards',   i18nKey: 'hm_tab_delays',    icon: Clock,         color: '#f59e0b' },
  { key: 'incidents', i18nKey: 'hm_tab_incidents', icon: AlertTriangle, color: '#ef4444' },
  { key: 'profits',   i18nKey: 'hm_tab_profits',   icon: DollarSign,    color: '#10b981' },
  { key: 'trafic',    i18nKey: 'hm_tab_traffic',   icon: Truck,         color: '#8b5cf6' },
];

const PERIODES = [
  { value: '7j',  i18nKey: 'hm_7_days'  },
  { value: '30j', i18nKey: 'hm_30_days' },
  { value: '90j', i18nKey: 'hm_90_days' },
];

const normalizeGeoPoint = (p) => {
  const lat = parseFloat(p?.lat ?? p?.latitude);
  const lon = parseFloat(p?.lon ?? p?.lng ?? p?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { ...p, lat, lon, weight: p.weight ?? p.count ?? 1 };
};

const heatColor = (intensity, baseColor) => {
  const t = Math.max(0, Math.min(1, intensity));
  if (t < 0.25) return '#3b82f6';
  if (t < 0.5)  return '#10b981';
  if (t < 0.75) return '#f59e0b';
  return '#ef4444';
};

const aggregateGrid = (points, gridSize = 0.02) => {
  const cells = {};
  points.forEach(p => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
    const gx = Math.floor(p.lat / gridSize) * gridSize;
    const gy = Math.floor(p.lon / gridSize) * gridSize;
    const key = `${gx.toFixed(4)}_${gy.toFixed(4)}`;
    if (!cells[key]) {
      cells[key] = { lat: gx + gridSize / 2, lon: gy + gridSize / 2, count: 0, weight: 0 };
    }
    cells[key].count += 1;
    cells[key].weight += p.weight || 1;
  });
  return Object.values(cells);
};

const KPI = ({ icon: Icon, label, value, sub, color }) => (
  <div className="glass-card" style={{ padding: '0.85rem 1rem', borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontWeight: 800, fontSize: 17, color }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
    </div>
  </div>
);

const HeatmapPage = () => {
  const { t } = useI18n();
  const [heatmapType, setHeatmapType] = useState('commandes');
  const [periode, setPeriode] = useState('30j');
  const [data, setData] = useState(null);
  const [coverageData, setCoverageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreVille, setFiltreVille] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showBoutiques, setShowBoutiques] = useState(true);
  const [showRayons, setShowRayons] = useState(false);
  const [gridSize, setGridSize] = useState(0.015);
  const mapRef = useRef(null);

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const apiMap = {
        commandes: analyticsApi.heatmapCommandes,
        retards:   analyticsApi.heatmapRetards,
        incidents: analyticsApi.heatmapIncidents,
        profits:   analyticsApi.heatmapProfits,
        trafic:    analyticsApi.heatmapTrafic,
      };
      const fn = apiMap[heatmapType];
      const [heatRes, covRes] = await Promise.all([
        fn(periode).catch(() => ({ data: { points: [] } })),
        analyticsApi.heatmap().catch(() => ({ data: { commandes: [], boutiques: [], couverture_villes: [] } })),
      ]);
      setData(heatRes.data);
      setCoverageData(covRes.data);
    } catch (err) {
      console.error(err);
      setData({ points: [] });
      setCoverageData({ commandes: [], boutiques: [], couverture_villes: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHeatmap(); }, [heatmapType, periode]);

  // Points de la heatmap typee
  const typedPoints = useMemo(() => {
    if (!data) return [];
    const raw = data.points || data.commandes || [];
    return raw
      .map(normalizeGeoPoint)
      .filter(Boolean)
      .filter(p => !filtreStatut || p.statut === filtreStatut);
  }, [data, filtreStatut]);

  // Boutiques de la couverture legacy
  const boutiquesFiltrees = useMemo(() => {
    if (!coverageData?.boutiques) return [];
    return coverageData.boutiques
      .map(b => normalizeGeoPoint(b))
      .filter(Boolean)
      .filter(b => !filtreVille || b.ville === filtreVille);
  }, [coverageData, filtreVille]);

  const heatGrid = useMemo(() => {
    const cells = aggregateGrid(typedPoints, gridSize);
    const maxWeight = Math.max(1, ...cells.map(c => c.weight));
    return cells.map(c => ({ ...c, intensity: c.weight / maxWeight }));
  }, [typedPoints, gridSize]);

  const couverture = coverageData?.couverture_villes || [];
  const currentTypeCfg = HEATMAP_TYPES.find(h => h.key === heatmapType);

  const exportCSV = () => {
    const rows = [['lat', 'lon', 'count', 'weight']];
    typedPoints.forEach(p => rows.push([p.lat, p.lon, p.count || 1, p.weight || 1]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap_${heatmapType}_${periode}j_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const zoomToVille = (ville) => {
    const c = VILLES_COORDS[ville];
    if (c && mapRef.current) mapRef.current.flyTo(c, 12, { duration: 1 });
    setFiltreVille(ville);
  };

  const totalPoints = typedPoints.length;
  const hotCells = heatGrid.filter(c => c.intensity > 0.5).length;
  const moyenneWeight = totalPoints > 0 ? (typedPoints.reduce((s, p) => s + (p.weight || 1), 0) / totalPoints).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2 className="page-title text-gradient">{t('heatmap')}</h2>
        </div>
        <div className="glass-card" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={32} className="spin" style={{ opacity: 0.4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-4">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={26} /> {t('hm_title')}
          </h2>
          <p className="page-subtitle">{t('hm_title')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchHeatmap} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {t('common_retry')}
          </button>
          <button onClick={exportCSV} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> {t('export_csv')}
          </button>
        </div>
      </div>

      {/* Selecteur de type de heatmap */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {HEATMAP_TYPES.map(ht => {
          const Icon = ht.icon;
          const active = heatmapType === ht.key;
          return (
            <button key={ht.key} onClick={() => setHeatmapType(ht.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, border: `1px solid ${active ? ht.color : 'rgba(255,255,255,0.1)'}`,
                background: active ? `${ht.color}22` : 'rgba(255,255,255,0.03)',
                color: active ? ht.color : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
                transition: 'all 0.15s',
              }}>
              <Icon size={14} /> {t(ht.i18nKey)}
            </button>
          );
        })}
        {/* Filtre periode */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {PERIODES.map(p => (
            <button key={p.value} onClick={() => setPeriode(p.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: `1px solid ${periode === p.value ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: periode === p.value ? 'rgba(34,197,94,0.12)' : 'transparent',
                color: periode === p.value ? '#22c55e' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12,
              }}>
              {t(p.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KPI icon={currentTypeCfg?.icon || Package} label={t('hm_data_points')} value={totalPoints} color={currentTypeCfg?.color || '#3b82f6'} />
        <KPI icon={Store} label={t('hm_stores')} value={boutiquesFiltrees.length} sub={`${new Set(boutiquesFiltrees.map(b => b.ville)).size} ${t('hm_cities_count')}`} color="#10b981" />
        <KPI icon={Target} label={t('hm_avg_value')} value={moyenneWeight} color="#f59e0b" />
        <KPI icon={TrendingUp} label={t('hm_hot_zones')} value={hotCells} sub={t('hm_intensity_50')} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem' }}>
        {/* Carte */}
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden', height: 620 }}>
          {/* Barre de filtres */}
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="glass-input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={{ width: 170, padding: '5px 10px', fontSize: 12 }}>
              <option value="">{t('adm_all_status')}</option>
              {Object.keys(STATUT_COLORS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className="glass-input" value={filtreVille} onChange={e => setFiltreVille(e.target.value)}
              style={{ width: 160, padding: '5px 10px', fontSize: 12 }}>
              <option value="">{t('cl_all_cities')}</option>
              {Object.keys(VILLES_COORDS).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
              {[
                { state: showHeatmap, set: setShowHeatmap, label: t('hm_layer_heatmap'), color: 'rgba(239,68,68,0.2)', activeColor: '#fca5a5' },
                { state: showBoutiques, set: setShowBoutiques, label: t('hm_layer_stores'), color: 'rgba(16,185,129,0.2)', activeColor: '#86efac' },
                { state: showRayons, set: setShowRayons, label: t('hm_layer_radius'), color: 'rgba(59,130,246,0.2)', activeColor: '#93c5fd' },
              ].map(btn => (
                <button key={btn.label} onClick={() => btn.set(s => !s)}
                  style={{ padding: '5px 9px', fontSize: 10, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: btn.state ? btn.color : 'rgba(255,255,255,0.06)',
                    color: btn.state ? btn.activeColor : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                  {btn.state ? <Eye size={10} /> : <EyeOff size={10} />} {btn.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-secondary)' }}>
              {t('hm_grid')} :
              <input type="range" min="0.005" max="0.05" step="0.005" value={gridSize}
                onChange={e => setGridSize(parseFloat(e.target.value))} style={{ width: 70 }} />
            </div>
          </div>

          <MapContainer center={[33.5731, -7.5898]} zoom={6}
            style={{ height: 'calc(100% - 50px)', width: '100%' }}
            ref={mapRef}
            whenCreated={(m) => { mapRef.current = m; }}>
            <LayersControl position="topright">
              <BaseLayer name="Streets (MapTiler)">
                <TileLayer
                  url={`https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                  attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
                />
              </BaseLayer>
              <BaseLayer name="Satellite (MapTiler)">
                <TileLayer
                  url={`https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                  attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
                />
              </BaseLayer>
              <BaseLayer checked name="Sombre (MapTiler)">
                <TileLayer
                  url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                  attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
                />
              </BaseLayer>
            </LayersControl>

            {/* Cellules heatmap */}
            {showHeatmap && heatGrid.map((cell, i) => (
              <CircleMarker key={`h-${i}`} center={[cell.lat, cell.lon]}
                radius={5 + cell.intensity * 18}
                fillColor={heatColor(cell.intensity, currentTypeCfg?.color)}
                color={heatColor(cell.intensity, currentTypeCfg?.color)}
                fillOpacity={0.45} stroke={false}>
                <Popup>
                  <strong>Zone {currentTypeCfg?.label}</strong><br />
                  {cell.count} point{cell.count > 1 ? 's' : ''}<br />
                  Valeur cumulée : {Math.round(cell.weight)}
                </Popup>
              </CircleMarker>
            ))}

            {/* Boutiques */}
            {showBoutiques && boutiquesFiltrees.map(b => (
              <React.Fragment key={`b-${b.id}`}>
                <CircleMarker center={[b.lat, b.lon]} radius={7}
                  fillColor={b.is_open ? '#10b981' : '#64748b'}
                  color="#fff" weight={2} fillOpacity={0.9}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <strong>{b.nom}</strong><br />
                      <span style={{ fontSize: 11 }}>{b.ville}</span><br />
                      <span style={{ fontSize: 11 }}>{b.nb_commandes} commandes</span>
                    </div>
                  </Popup>
                </CircleMarker>
                {showRayons && (
                  <Circle center={[b.lat, b.lon]} radius={(b.rayon_km || 5) * 1000}
                    pathOptions={{ color: b.is_open ? '#10b981' : '#64748b', fillOpacity: 0.04, weight: 1, dashArray: '4 4' }} />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        {/* Panneau couverture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Legende */}
          <div className="glass-card animate-fade-in">
            <h4 style={{ margin: '0 0 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={14} /> {t('hm_legend')} — {currentTypeCfg ? t(currentTypeCfg.i18nKey) : ''}
            </h4>
            <div style={{ fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { color: '#3b82f6', label: t('hm_zone_cold') },
                { color: '#10b981', label: t('hm_zone_moderate') },
                { color: '#f59e0b', label: t('hm_zone_active') },
                { color: '#ef4444', label: t('hm_zone_hot') },
              ].map(l => (
                <div key={l.color} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, background: l.color, borderRadius: '50%', flexShrink: 0 }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Couverture territoriale */}
          <div className="glass-card animate-fade-in" style={{ flex: 1, overflowY: 'auto', maxHeight: 460 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} /> {t('hm_coverage')}
            </h4>
            {couverture.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: 12 }}>
                <AlertCircle size={20} style={{ opacity: 0.4 }} />
                <div style={{ marginTop: 8 }}>{t('dash_no_data')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {couverture.map((v, i) => {
                  const score = v.score_couverture || 0;
                  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={i} onClick={() => zoomToVille(v.ville)}
                      style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: filtreVille === v.ville ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${filtreVille === v.ville ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = filtreVille === v.ville ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <strong style={{ fontSize: 13 }}>📍 {v.ville || 'Autre'}</strong>
                        <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor, background: `${scoreColor}22`, padding: '2px 8px', borderRadius: 6 }}>
                          {score}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <span>🏪 {v.nb_boutiques}</span>
                        <span>📦 {v.nb_commandes || 0}</span>
                        <span>👥 {v.nb_clients || 0}</span>
                      </div>
                      <div style={{ marginTop: 5, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${scoreColor}99, ${scoreColor})`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapPage;
