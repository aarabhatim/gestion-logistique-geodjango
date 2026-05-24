import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, Check, RefreshCw, Filter, X, Eye,
  MapPin, Clock, User, Package, Camera,
} from 'lucide-react';
import { incidentsApi } from '../services/api';

const TYPE_CONFIG = {
  accident:        { label: 'Accident',          color: '#ef4444', emoji: '🚨' },
  panne:           { label: 'Panne vehicule',     color: '#f59e0b', emoji: '🔧' },
  vol:             { label: 'Vol / Tentative',    color: '#22c55e', emoji: '🔓' },
  colis_endommage: { label: 'Colis endommagé',   color: '#f97316', emoji: '📦' },
  retard:          { label: 'Retard majeur',      color: '#06b6d4', emoji: '⏱' },
  client_absent:   { label: 'Client absent',     color: '#64748b', emoji: '🚪' },
  adresse_introuvable: { label: 'Adresse introuvable', color: '#84cc16', emoji: '🗺' },
  autre:           { label: 'Autre',              color: '#94a3b8', emoji: '❓' },
};

const STATUT_CONFIG = {
  ouvert:      { label: 'Ouvert',       class: 'badge-danger'  },
  en_cours:    { label: 'En cours',     class: 'badge-warning' },
  resolu:      { label: 'Résolu',       class: 'badge-success' },
};

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreType, setFiltreType] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchAll = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const [incRes, statsRes] = await Promise.all([
        incidentsApi.list({
          statut: filtreStatut || undefined,
          type_incident: filtreType || undefined,
          page: p,
          page_size: ps,
        }),
        incidentsApi.stats(),
      ]);
      const data = incRes.data;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      setTotal(data.count ?? items.length);
      setIncidents(items);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); fetchAll(1, pageSize); }, [filtreStatut, filtreType]);

  const handlePrendreEnCharge = async (id) => {
    try {
      await incidentsApi.prendreEnCharge(id);
      fetchAll();
    } catch { alert('Erreur'); }
  };

  const handleResoudre = async (id) => {
    if (!resolveNotes.trim()) { alert('Veuillez saisir des notes de resolution'); return; }
    setResolving(true);
    try {
      await incidentsApi.resoudre(id, { notes_resolution: resolveNotes });
      setShowDetail(false);
      setSelected(null);
      setResolveNotes('');
      fetchAll();
    } catch { alert('Erreur lors de la resolution'); }
    finally { setResolving(false); }
  };

  // Incidents with valid coords for map
  const incidentsGeo = useMemo(() => {
    return incidents.filter(inc => {
      const coords = inc.geometry?.coordinates;
      return coords && coords.length === 2 && coords[0] !== 0;
    });
  }, [incidents]);

  const getProps = (inc) => inc.properties || inc;
  const getCoords = (inc) => inc.geometry?.coordinates; // [lon, lat]

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={24} /> Gestion des Incidents
          </h2>
          <p className="page-subtitle">Suivez et résolvez les incidents de livraison en temps réel.</p>
        </div>
        <button onClick={fetchAll} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Total', value: stats.total || 0, color: '#3b82f6' },
            { label: 'Ouverts', value: stats.ouverts || 0, color: '#ef4444' },
            { label: 'En cours', value: stats.en_cours || 0, color: '#f59e0b' },
            { label: 'Résolus', value: stats.resolus || 0, color: '#10b981' },
          ].map(k => (
            <div key={k.label} className="glass-card" style={{ padding: '0.85rem 1rem', borderLeft: `3px solid ${k.color}` }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="glass-card animate-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
        <select className="glass-input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          style={{ width: 160, padding: '5px 10px', fontSize: 13 }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="glass-input" value={filtreType} onChange={e => setFiltreType(e.target.value)}
          style={{ width: 180, padding: '5px 10px', fontSize: 13 }}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        {(filtreStatut || filtreType) && (
          <button onClick={() => { setFiltreStatut(''); setFiltreType(''); }}
            className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={12} /> Effacer filtres
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
          {incidents.length} incident{incidents.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem' }}>
        {/* Carte */}
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden', height: 560 }}>
          <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={12} /> Carte des incidents ({incidentsGeo.length} avec position GPS)
          </div>
          <MapContainer center={[33.5731, -7.5898]} zoom={6} style={{ height: 'calc(100% - 38px)', width: '100%' }}>
            <TileLayer attribution='&copy; CartoDB'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
            {incidentsGeo.map((inc) => {
              const props = getProps(inc);
              const coords = getCoords(inc);
              const cfg = TYPE_CONFIG[props.type_incident] || TYPE_CONFIG.autre;
              return (
                <CircleMarker key={inc.id || props.id}
                  center={[coords[1], coords[0]]}
                  radius={props.statut === 'resolu' ? 6 : 10}
                  fillColor={cfg.color}
                  color={props.statut === 'resolu' ? '#64748b' : cfg.color}
                  fillOpacity={props.statut === 'resolu' ? 0.4 : 0.85}
                  weight={2}
                  eventHandlers={{ click: () => { setSelected(inc); setShowDetail(true); } }}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <strong>{cfg.emoji} {cfg.label}</strong><br />
                      <span style={{ fontSize: 11 }}>Commande : {props.commande_reference || props.commande}</span><br />
                      <span style={{ fontSize: 11 }}>Statut : <b>{STATUT_CONFIG[props.statut]?.label || props.statut}</b></span><br />
                      <span style={{ fontSize: 11 }}>{props.description?.slice(0, 80)}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Panel liste / detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 560, overflowY: 'auto' }}>
          {showDetail && selected ? (
            <IncidentDetail
              inc={selected}
              resolveNotes={resolveNotes}
              setResolveNotes={setResolveNotes}
              resolving={resolving}
              onResoudre={() => handleResoudre(selected.id || getProps(selected).id)}
              onPrendreEnCharge={() => handlePrendreEnCharge(selected.id || getProps(selected).id)}
              onClose={() => { setShowDetail(false); setSelected(null); }}
            />
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 0.25rem' }}>
                Cliquez sur un incident pour voir le detail
              </div>
              {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <RefreshCw size={20} className="spin" style={{ opacity: 0.5 }} />
                </div>
              ) : incidents.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 13 }}>
                  Aucun incident trouvé.
                </div>
              ) : (
                incidents.map((inc) => {
                  const props = getProps(inc);
                  const cfg = TYPE_CONFIG[props.type_incident] || TYPE_CONFIG.autre;
                  const statCfg = STATUT_CONFIG[props.statut] || {};
                  return (
                    <div key={inc.id || props.id}
                      className="glass-card"
                      onClick={() => { setSelected(inc); setShowDetail(true); }}
                      style={{ cursor: 'pointer', padding: '0.75rem 1rem', borderLeft: `3px solid ${cfg.color}`,
                        transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{cfg.emoji} {cfg.label}</span>
                        <span className={`badge ${statCfg.class || 'badge-secondary'}`} style={{ fontSize: 10 }}>
                          {statCfg.label || props.statut}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Package size={10} style={{ marginRight: 4 }} />
                        {props.commande_reference || props.commande}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {props.description?.slice(0, 60)}{props.description?.length > 60 ? '...' : ''}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                        <Clock size={9} style={{ marginRight: 3 }} />
                        {props.date_signalement ? new Date(props.date_signalement).toLocaleString('fr-FR') : ''}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => { setPage(p); fetchAll(p, pageSize); }}
        onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); fetchAll(1, ps); }}
      />
    </div>
  );
};

const IncidentDetail = ({ inc, resolveNotes, setResolveNotes, resolving, onResoudre, onPrendreEnCharge, onClose }) => {
  const props = inc.properties || inc;
  const cfg = TYPE_CONFIG[props.type_incident] || TYPE_CONFIG.autre;
  const statCfg = STATUT_CONFIG[props.statut] || {};

  return (
    <div className="glass-card animate-fade-in" style={{ borderLeft: `3px solid ${cfg.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Eye size={14} /> Détail de l&apos;incident
        </h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Type</span>
          <strong>{cfg.emoji} {cfg.label}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Statut</span>
          <span className={`badge ${statCfg.class || 'badge-secondary'}`}>{statCfg.label || props.statut}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Commande</span>
          <strong>{props.commande_reference || props.commande}</strong>
        </div>
        {props.chauffeur_nom && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Chauffeur</span>
            <span><User size={11} style={{ marginRight: 3 }} />{props.chauffeur_nom}</span>
          </div>
        )}
        <div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Description</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 6, fontSize: 12, lineHeight: 1.5 }}>
            {props.description}
          </div>
        </div>
        {props.notes_resolution && (
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Notes de résolution</div>
            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '8px 10px', borderRadius: 6, fontSize: 12, lineHeight: 1.5, borderLeft: '2px solid #10b981' }}>
              {props.notes_resolution}
            </div>
          </div>
        )}
        {props.photos && props.photos.length > 0 && (
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Camera size={11} /> Photos ({props.photos.length})
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {props.photos.slice(0, 4).map((ph, i) => (
                <img key={i} src={ph.image} alt={ph.legende || 'Photo'} style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {props.statut !== 'resolu' && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          {props.statut === 'ouvert' && (
            <button onClick={onPrendreEnCharge} className="btn btn-secondary"
              style={{ width: '100%', marginBottom: 8, fontSize: 12 }}>
              Prendre en charge
            </button>
          )}
          <textarea
            value={resolveNotes}
            onChange={e => setResolveNotes(e.target.value)}
            placeholder="Notes de résolution..."
            className="glass-input"
            style={{ width: '100%', minHeight: 70, marginBottom: 8, fontSize: 12, resize: 'vertical' }}
          />
          <button onClick={onResoudre} className="btn btn-success"
            disabled={resolving}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}>
            <Check size={14} /> {resolving ? 'En cours...' : 'Marquer comme résolu'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Incidents;
