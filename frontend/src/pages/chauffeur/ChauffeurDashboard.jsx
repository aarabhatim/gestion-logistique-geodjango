import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Navigation, Star, CheckCircle, Clock, LogOut, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCommandes } from '../../services/api';
import api from '../../services/api';
import MapComponent from '../../components/MapComponent';
import { useNavigate } from 'react-router-dom';

const ChauffeurDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [positionStatus, setPositionStatus] = useState('idle'); // idle | loading | success | error
  const [loading, setLoading] = useState(true);

  const profile = user?.chauffeur_profile;

  const fetchMissions = async () => {
    try {
      const res = await getCommandes({ statut: 'en_cours' });
      const features = res.data.features || res.data.results?.features || [];
      setCommandes(features);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMissions(); }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUpdatePosition = () => {
    setPositionStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('auth/position/', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setPositionStatus('success');
          setTimeout(() => setPositionStatus('idle'), 3000);
        } catch {
          setPositionStatus('error');
        }
      },
      () => { setPositionStatus('error'); },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Bar */}
      <div className="top-header glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-icon"><Truck size={22} color="white" /></div>
          <span className="logo-text text-gradient" style={{ fontSize: '1.3rem', fontWeight: 800 }}>LogisTrack</span>
          <span className="badge badge-success">Espace Chauffeur</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Bonjour, <strong style={{ color: 'var(--text-primary)' }}>{user?.first_name}</strong></span>
          <button className="btn btn-secondary" onClick={handleLogout}><LogOut size={16} /> Déconnexion</button>
        </div>
      </div>

      <div className="dashboard-main-grid">
        {/* Left Column — Infos chauffeur + Missions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Carte de profil chauffeur */}
          <div className="glass-card animate-fade-in">
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Mon Profil</h3>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div className="client-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.first_name} {user?.last_name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</div>
                {profile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', marginTop: '6px' }}>
                    <Star size={14} fill="#f59e0b" />
                    <strong>{profile.note_moyenne}/5</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>note moyenne</span>
                  </div>
                )}
              </div>
            </div>
            {profile && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>PERMIS</div>
                  <div style={{ fontWeight: 700 }}>{profile.permis || 'N/A'}</div>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>STATUT</div>
                  <span className={`badge ${profile.disponible ? 'badge-success' : 'badge-warning'}`}>
                    {profile.disponible ? 'Disponible' : 'En mission'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mon Véhicule */}
          {profile?.vehicule && (
            <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>Mon Véhicule</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="stat-icon-wrapper icon-primary"><Truck size={22} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{profile.vehicule_immatriculation}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{profile.vehicule_type}</div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton Position GPS */}
          <div className="glass-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Ma Position GPS</h3>
            <button
              className={`btn btn-full ${positionStatus === 'success' ? 'btn-success' : 'btn-primary'}`}
              onClick={handleUpdatePosition}
              disabled={positionStatus === 'loading'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {positionStatus === 'loading' && <span>📡 Localisation en cours...</span>}
              {positionStatus === 'idle' && <><Navigation size={18} /> Mettre à jour ma position</>}
              {positionStatus === 'success' && <><CheckCircle size={18} /> Position envoyée !</>}
              {positionStatus === 'error' && <span>❌ Erreur, réessayez</span>}
            </button>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.75rem', textAlign: 'center' }}>
              Votre position est partagée avec l'admin en temps réel.
            </p>
          </div>
        </div>

        {/* Right Column — Missions + Carte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Missions */}
          <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Mes Missions en cours</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Destination</th>
                  <th>Marchandise</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>Chargement...</td></tr>
                ) : commandes.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune mission en cours.</td></tr>
                ) : commandes.map(cmd => (
                  <tr key={cmd.id}>
                    <td><strong>{cmd.properties.reference}</strong></td>
                    <td>{cmd.properties.adresse_destination}</td>
                    <td>{cmd.properties.type_marchandise}</td>
                    <td><span className="badge badge-primary"><Truck size={12} /> En cours</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Carte */}
          <div className="glass-card animate-fade-in" style={{ padding: '0.5rem', animationDelay: '0.3s' }}>
            <div style={{ padding: '1rem 1rem 0.5rem' }}>
              <h3 className="card-title">Itinéraire</h3>
            </div>
            <div style={{ height: '350px' }}>
              <MapComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChauffeurDashboard;
