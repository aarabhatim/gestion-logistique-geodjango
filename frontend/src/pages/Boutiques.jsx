import React, { useState, useEffect } from 'react';
import { Store, MapPin, Star, Clock, Check, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { fondateursApi } from '../services/api';

const CATEGORIE_COLORS = {
  SUPERMARCHE: '#10b981',
  PHARMACIE:   '#3b82f6',
  RESTAURATION:'#f59e0b',
  BOUTIQUE:    '#ec4899',
  ELECTRONIQUE:'#8b5cf6',
};

const CATEGORIE_ICONS = {
  SUPERMARCHE:  '🛒',
  PHARMACIE:    '💊',
  RESTAURATION: '🍽️',
  BOUTIQUE:     '👗',
  ELECTRONIQUE: '📱',
};

const StarRating = ({ note }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={12} fill={i <= Math.round(note) ? '#f59e0b' : 'transparent'} color={i <= Math.round(note) ? '#f59e0b' : '#64748b'} />
    ))}
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '3px' }}>{note?.toFixed(1)}</span>
  </div>
);

const BoutiqueCard = ({ b, onValider }) => {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORIE_COLORS[b.categorie] || '#64748b';

  return (
    <div className="glass-card animate-fade-in" style={{ borderLeft: `4px solid ${color}`, transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '28px' }}>{CATEGORIE_ICONS[b.categorie] || '🏪'}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{b.nom_boutique}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{b.user_email || b.user}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {b.is_verified ? (
            <span className="badge badge-success" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Check size={11} /> Vérifié
            </span>
          ) : (
            <span className="badge badge-warning" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              En attente
            </span>
          )}
          {b.is_open ? (
            <span className="badge badge-success">Ouvert</span>
          ) : (
            <span className="badge badge-danger">Fermé</span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '12px' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)' }}>Catégorie</div>
          <div style={{ fontWeight: 600, color }}>{b.categorie}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)' }}>Commandes</div>
          <div style={{ fontWeight: 600 }}>{b.nombre_commandes || 0}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)' }}>Note</div>
          <StarRating note={b.note_moyenne || 0} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        <MapPin size={12} /> {b.adresse} {b.ville ? `· ${b.ville}` : ''}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <span>Rayon: {b.rayon_livraison_km} km · Frais: {b.frais_livraison_base} MAD · Min: {b.commande_minimum} MAD</span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{b.description}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!b.is_verified && (
              <button className="btn btn-sm btn-primary" onClick={() => onValider(b.id, 'valider')}>
                <Check size={14} /> Valider
              </button>
            )}
            <button className="btn btn-sm btn-secondary" style={{ color: '#ef4444' }} onClick={() => onValider(b.id, 'rejeter')}>
              <X size={14} /> {b.is_verified ? 'Désactiver' : 'Rejeter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Boutiques = () => {
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [count, setCount] = useState(0);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategorie) params.categorie = filterCategorie;
      if (filterVerified !== '') params.is_verified = filterVerified;
      const res = await fondateursApi.adminListe(params);
      const results = res.data.results || res.data || [];
      setBoutiques(results);
      setCount(res.data.count || results.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);
  useEffect(() => { fetch(); }, [filterCategorie, filterVerified]);

  const handleValider = async (id, action) => {
    try {
      await fondateursApi.adminValider(id, action);
      fetch();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const categories = ['SUPERMARCHE', 'PHARMACIE', 'RESTAURATION', 'BOUTIQUE', 'ELECTRONIQUE'];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Gestion des Boutiques</h2>
          <p className="page-subtitle">{count} boutiques sur la plateforme</p>
        </div>
        <button className="btn btn-secondary" onClick={fetch}><RefreshCw size={16} /> Actualiser</button>
      </div>

      {/* Stats par catégorie */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const n = boutiques.filter(b => b.categorie === cat).length;
          return (
            <button key={cat} onClick={() => setFilterCategorie(filterCategorie === cat ? '' : cat)}
              className={`glass-card`} style={{
                padding: '0.6rem 1rem', cursor: 'pointer', border: 'none',
                borderLeft: `3px solid ${CATEGORIE_COLORS[cat]}`,
                opacity: filterCategorie && filterCategorie !== cat ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
              }}>
              <span>{CATEGORIE_ICONS[cat]}</span>
              <span style={{ fontWeight: 600 }}>{cat}</span>
              <span className="badge badge-info" style={{ fontSize: '11px' }}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="glass-card animate-fade-in" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <select className="glass-input" value={filterVerified} onChange={e => setFilterVerified(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Toutes</option>
          <option value="true">Vérifiées</option>
          <option value="false">En attente</option>
        </select>
        <select className="glass-input" value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterVerified || filterCategorie) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilterVerified(''); setFilterCategorie(''); }}>
            × Effacer filtres
          </button>
        )}
      </div>

      {/* Grille de boutiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass-card" style={{ height: '180px', opacity: 0.4 }} />
          ))
        ) : boutiques.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Store size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <div>Aucune boutique trouvée</div>
          </div>
        ) : boutiques.map(b => (
          <BoutiqueCard key={b.id} b={b} onValider={handleValider} />
        ))}
      </div>
    </div>
  );
};

export default Boutiques;
