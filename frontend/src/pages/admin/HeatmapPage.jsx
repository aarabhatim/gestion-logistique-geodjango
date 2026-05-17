import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, MapPin, Layers, RefreshCw, Store, Package, Target,
  TrendingUp, AlertCircle, Eye, EyeOff, Printer, Download,
} from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { useI18n } from '../../contexts/I18nContext';

const { BaseLayer, Overlay } = LayersControl;

// Coordonnées centre des principales villes marocaines (pour zoom rapide)
const VILLES_COORDS = {
  'Casablanca':  [33.5731, -7.5898],
  'Rabat':       [34.0209, -6.8416],
  'Marrakech':   [31.6295, -7.9811],
  'Fès':         [34.0181, -5.0078],
  'Tanger':      [35.7595, -5.8340],
  'Agadir':      [30.4278, -9.5981],
  'Meknès':      [33.8935, -5.5547],
  'Oujda':       [34.6814, -1.9086],
  'Kénitra':     [34.2610, -6.5802],
  'Tétouan':     [35.5785, -5.3683],
};

const STATUT_COLORS = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#3b82f6', EN_PREPARATION: '#8b5cf6',
  EN_ROUTE: '#06b6d4', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

// ─── Heat color : du bleu froid au rouge chaud ─────────────────────────────
const heatColor = (intensity) => {
  // intensity 0..1
  const t = Math.max(0, Math.min(1, intensity));
  if (t < 0.25) return '#3b82f6';   // bleu (froid)
  if (t < 0.5)  return '#10b981';   // vert
  if (t < 0.75) return '#f59e0b';   // orange
  return '#ef4444';                  // rouge (très chaud)
};

// ─── Agrège les points en grille pour effet heatmap simulé ─────────────────
const aggregateGrid = (points, gridSize = 0.02) => {
  const cells = {};
  points.forEach(p => {
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

// ─── KPI Compact card ──────────────────────────────────────────────────────
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

// ─── Page principale ────────────────────────────────────────────────────────
const HeatmapPage = () => {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreVille, setFiltreVille] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showBoutiques, setShowBoutiques] = useState(true);
  const [showRayons, setShowRayons] = useState(false);
  const [gridSize, setGridSize] = useState(0.015);
  const mapRef = useRef(null);

  const fetch = () => {
    setLoading(true);
    analyticsApi.heatmap()
      .then(r => setData(r.data))
      .catch(err => {
        console.error(err);
        // Fallback : utilise les données admin si endpoint pas dispo
        setData({ commandes: [], boutiques: [], couverture_villes: [] });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  // Filtrage des points commandes
  const commandesFiltrees = useMemo(() => {
    if (!data?.commandes) return [];
    return data.commandes.filter(c => !filtreStatut || c.statut === filtreStatut);
  }, [data, filtreStatut]);

  // Boutiques filtrées par ville
  const boutiquesFiltrees = useMemo(() => {
    if (!data?.boutiques) return [];
    return data.boutiques.filter(b => !filtreVille || b.ville === filtreVille);
  }, [data, filtreVille]);

  // Grille de chaleur (agrégation des commandes)
  const heatGrid = useMemo(() => {
    const cells = aggregateGrid(commandesFiltrees, gridSize);
    const maxWeight = Math.max(1, ...cells.map(c => c.weight));
    return cells.map(c => ({ ...c, intensity: c.weight / maxWeight }));
  }, [commandesFiltrees, gridSize]);

  const couverture = data?.couverture_villes || [];

  // Statistiques globales
  const totalCommandes = commandesFiltrees.length;
  const totalBoutiques = boutiquesFiltrees.length;
  const villesUniques = new Set(boutiquesFiltrees.map(b => b.ville).filter(Boolean)).size;
  const moyenneCouverture = couverture.length
    ? (couverture.reduce((s, v) => s + (v.score_couverture || 0), 0) / couverture.length).toFixed(1)
    : 0;

  const zoomToVille = (ville) => {
    const c = VILLES_COORDS[ville];
    if (c && mapRef.current) {
      mapRef.current.flyTo(c, 12, { duration: 1 });
    }
    setFiltreVille(ville);
  };

  const exportCouvertureCSV = () => {
    const rows = [['Ville', 'Boutiques', 'Commandes', 'Clients', 'Score couverture (%)']];
    couverture.forEach(v => rows.push([v.ville, v.nb_boutiques, v.nb_commandes || 0, v.nb_clients || 0, v.score_couverture || 0]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `couverture_territoriale_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header"><h2 className="page-title text-gradient">🌍 {t('heatmap')}</h2></div>
        <div className="glass-card" style={{ height: '500px', opacity: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={32} className="spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={26} /> Heatmap & Couverture territoriale
          </h2>
          <p className="page-subtitle">Visualisation géographique des commandes et analyse de la couverture par ville</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetch} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <button onClick={exportCouvertureCSV} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export couverture CSV
          </button>
        </div>
      </div>

      {/* KPIs synthétiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KPI icon={Package} label="Commandes affichées" value={totalCommandes} color="#3b82f6" />
        <KPI icon={Store} label="Boutiques" value={totalBoutiques} sub={`${villesUniques} villes`} color="#10b981" />
        <KPI icon={Target} label="Score moyen couverture" value={`${moyenneCouverture}%`} sub="0 → 100" color="#f59e0b" />
        <KPI icon={TrendingUp} label="Zones chaudes" value={heatGrid.filter(c => c.intensity > 0.5).length} sub="cellules à forte densité" color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem' }}>
        {/* ── Carte ──────────────────────────────────────────────────── */}
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden', height: 620 }}>
          {/* Barre de filtres au-dessus de la carte */}
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="glass-input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={{ width: 180, padding: '5px 10px', fontSize: 12 }}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_COLORS).map(([k]) => <option key={k} value={k}>{k}</option>)}
            </select>

            <select className="glass-input" value={filtreVille} onChange={e => setFiltreVille(e.target.value)}
              style={{ width: 180, padding: '5px 10px', fontSize: 12 }}>
              <option value="">Toutes villes</option>
              {Object.keys(VILLES_COORDS).map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button onClick={() => setShowHeatmap(s => !s)}
                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: showHeatmap ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                  color: showHeatmap ? '#fca5a5' : 'var(--text-secondary)' }}>
                {showHeatmap ? <Eye size={11} /> : <EyeOff size={11} />} Heatmap
              </button>
              <button onClick={() => setShowBoutiques(s => !s)}
                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: showBoutiques ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  color: showBoutiques ? '#86efac' : 'var(--text-secondary)' }}>
                {showBoutiques ? <Eye size={11} /> : <EyeOff size={11} />} Boutiques
              </button>
              <button onClick={() => setShowRayons(s => !s)}
                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: showRayons ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                  color: showRayons ? '#93c5fd' : 'var(--text-secondary)' }}>
                {showRayons ? <Eye size={11} /> : <EyeOff size={11} />} Rayons
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
              Précision :
              <input type="range" min="0.005" max="0.05" step="0.005" value={gridSize}
                onChange={e => setGridSize(parseFloat(e.target.value))}
                style={{ width: 80 }} />
            </div>
          </div>

          <MapContainer
            center={[33.5731, -7.5898]} zoom={6}
            style={{ height: 'calc(100% - 50px)', width: '100%' }}
            whenCreated={(m) => { mapRef.current = m; }}>
            <LayersControl position="topright">
              <BaseLayer checked name="🗺️ OpenStreetMap">
                <TileLayer attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>
              <BaseLayer name="🛰️ Satellite (Esri)">
                <TileLayer attribution='&copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </BaseLayer>
              <BaseLayer name="🌙 Sombre (CartoDB)">
                <TileLayer attribution='&copy; CartoDB'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
              </BaseLayer>
            </LayersControl>

            {/* Cellules heatmap */}
            {showHeatmap && heatGrid.map((cell, i) => (
              <CircleMarker key={`h-${i}`} center={[cell.lat, cell.lon]}
                radius={5 + cell.intensity * 18}
                fillColor={heatColor(cell.intensity)}
                color={heatColor(cell.intensity)}
                fillOpacity={0.45} stroke={false}>
                <Popup>
                  <strong>Zone de chaleur</strong><br />
                  {cell.count} commande{cell.count > 1 ? 's' : ''}<br />
                  Poids cumulé : {Math.round(cell.weight)} MAD
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
                      <strong>🏪 {b.nom}</strong><br />
                      <span style={{ fontSize: 12 }}>📍 {b.ville}</span><br />
                      <span style={{ fontSize: 12 }}>📦 {b.nb_commandes} commandes</span><br />
                      <span style={{ fontSize: 12 }}>🎯 Rayon : {b.rayon_km} km</span><br />
                      <span style={{ fontSize: 11, color: b.is_open ? 'green' : 'gray' }}>
                        {b.is_open ? '● Ouvert' : '● Fermé'}
                      </span>
                    </div>
                  </Popup>
                </CircleMarker>
                {showRayons && (
                  <Circle center={[b.lat, b.lon]} radius={(b.rayon_km || 5) * 1000}
                    pathOptions={{ color: b.is_open ? '#10b981' : '#64748b', fillOpacity: 0.05, weight: 1, dashArray: '4 4' }} />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        {/* ── Panneau de droite : couverture territoriale ──────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Légende */}
          <div className="glass-card animate-fade-in">
            <h4 style={{ margin: '0 0 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={14} /> Légende
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: '#3b82f6', borderRadius: '50%' }} /> Zone froide (peu de commandes)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: '#10b981', borderRadius: '50%' }} /> Zone modérée
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: '#f59e0b', borderRadius: '50%' }} /> Zone active
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: '#ef4444', borderRadius: '50%' }} /> Zone très chaude
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%', border: '2px solid white' }} /> Boutique ouverte
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#64748b', borderRadius: '50%', border: '2px solid white' }} /> Boutique fermée
                </div>
              </div>
            </div>
          </div>

          {/* Couverture par ville */}
          <div className="glass-card animate-fade-in" style={{ flex: 1, overflowY: 'auto', maxHeight: 460 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} /> Analyse de couverture territoriale
            </h4>
            {couverture.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: 12 }}>
                <AlertCircle size={24} style={{ opacity: 0.4 }} />
                <div style={{ marginTop: 8 }}>Aucune donnée de couverture disponible</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {couverture.map((v, i) => {
                  const score = v.score_couverture || 0;
                  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                  const niveau = score >= 70 ? 'Excellent' : score >= 40 ? 'Modéré' : 'Faible';
                  return (
                    <div key={i} onClick={() => zoomToVille(v.ville)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: filtreVille === v.ville ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${filtreVille === v.ville ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = filtreVille === v.ville ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong style={{ fontSize: 13 }}>📍 {v.ville || 'Non renseignée'}</strong>
                        <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor, background: `${scoreColor}22`, padding: '2px 8px', borderRadius: 6 }}>
                          {score}% · {niveau}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <span>🏪 {v.nb_boutiques}</span>
                        <span>📦 {v.nb_commandes || 0}</span>
                        <span>👥 {v.nb_clients || 0}</span>
                      </div>
                      {/* Barre de score */}
                      <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${score}%`, height: '100%',
                          background: `linear-gradient(90deg, ${scoreColor}99, ${scoreColor})`,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Légende explicative en bas */}
      <div className="glass-card animate-fade-in" style={{ marginTop: '1rem', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-primary)' }}>📖 Comment lire cette carte :</strong>
        <ul style={{ marginTop: 6, paddingLeft: 20 }}>
          <li>La <strong>heatmap</strong> agrège les commandes en cellules. Plus la couleur tire vers le rouge, plus la zone est dense en activité.</li>
          <li>Le <strong>score de couverture</strong> compare le nombre de commandes à la population de clients connue dans la ville (0 = sous-desservie, 100 = excellente).</li>
          <li>Activez les <strong>rayons de livraison</strong> pour visualiser les zones théoriquement desservies par chaque boutique et détecter les <em>"zones blanches"</em>.</li>
          <li>Cliquez sur une ville dans le panneau de droite pour zoomer dessus et filtrer la carte.</li>
        </ul>
      </div>
    </div>
  );
};

export default HeatmapPage;
