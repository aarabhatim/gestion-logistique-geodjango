import React, { useState, useEffect } from 'react';
import { Truck, Star, MapPin, CheckCircle, XCircle, RefreshCw, Bike, Car } from 'lucide-react';
import { transporteursApi } from '../services/api';

const VEHICULE_ICONS = {
  MOTO: '🛵',
  VOITURE: '🚗',
  CAMIONNETTE: '🚐',
  CAMION: '🚛',
};

const Transporteurs = () => {
  const [transporteurs, setTransporteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterDispo, setFilterDispo] = useState('');
  const [count, setCount] = useState(0);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.vehicule_type = filterType;
      if (filterDispo !== '') params.is_available = filterDispo;
      const res = await transporteursApi.adminListe(params);
      const results = res.data.results || res.data || [];
      setTransporteurs(results);
      setCount(res.data.count || results.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);
  useEffect(() => { fetch(); }, [filterType, filterDispo]);

  const StarRating = ({ note }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} fill={i <= Math.round(note) ? '#f59e0b' : 'transparent'} color={i <= Math.round(note) ? '#f59e0b' : '#64748b'} />
      ))}
      <span style={{ fontSize: '12px', marginLeft: '4px', color: 'var(--text-secondary)' }}>{note?.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Flotte de Transporteurs</h2>
          <p className="page-subtitle">{count} chauffeurs enregistrés sur la plateforme</p>
        </div>
        <button className="btn btn-secondary" onClick={fetch}><RefreshCw size={16} /> Actualiser</button>
      </div>

      {/* Filtres */}
      <div className="glass-card animate-fade-in" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="glass-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Tous les véhicules</option>
          <option value="MOTO">Moto</option>
          <option value="VOITURE">Voiture</option>
          <option value="CAMIONNETTE">Camionnette</option>
          <option value="CAMION">Camion</option>
        </select>
        <select className="glass-input" value={filterDispo} onChange={e => setFilterDispo(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Tous statuts</option>
          <option value="true">Disponibles</option>
          <option value="false">Non disponibles</option>
        </select>
        {/* Stats rapides */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
          {Object.entries(VEHICULE_ICONS).map(([type, icon]) => {
            const n = transporteurs.filter(t => t.vehicule_type === type).length;
            return n > 0 ? (
              <div key={type} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px' }}>{icon}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{n} {type.toLowerCase()}</div>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass-card" style={{ height: '160px', animation: 'pulse 1.5s infinite', opacity: 0.5 }} />
          ))
        ) : transporteurs.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Aucun transporteur trouvé.
          </div>
        ) : transporteurs.map(t => (
          <div key={t.id} className="glass-card animate-fade-in" style={{ padding: '1.25rem', position: 'relative', borderTop: `3px solid ${t.is_available ? '#10b981' : '#ef444440'}` }}>
            {/* Badge statut */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              {t.is_on_delivery ? (
                <span className="badge badge-warning">En livraison</span>
              ) : t.is_available ? (
                <span className="badge badge-success">Disponible</span>
              ) : (
                <span className="badge badge-danger">Indisponible</span>
              )}
            </div>

            {/* Nom + véhicule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '28px' }}>{VEHICULE_ICONS[t.vehicule_type] || '🚗'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  {t.user_first_name || t.user?.first_name} {t.user_last_name || t.user?.last_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t.vehicule_type} · {t.plaque}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Livraisons</div>
                <div style={{ fontWeight: 700 }}>{t.nombre_livraisons}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Capacité</div>
                <div style={{ fontWeight: 700 }}>{t.capacite_kg} kg</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Note</div>
                <StarRating note={t.note_moyenne} />
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Vérifié</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {t.is_verified ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                  <span style={{ fontSize: '12px' }}>{t.is_verified ? 'Oui' : 'Non'}</span>
                </div>
              </div>
            </div>

            {t.revenus_total && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Revenus totaux</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{Math.round(t.revenus_total).toLocaleString()} MAD</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transporteurs;
