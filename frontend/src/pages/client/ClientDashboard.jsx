import React, { useState, useEffect } from 'react';
import { Package, MapPin, Plus, Clock, CheckCircle, TruckIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCommandes, createCommande } from '../../services/api';
import MapComponent from '../../components/MapComponent';
import { useNavigate } from 'react-router-dom';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    adresse_depart: '', adresse_destination: '',
    type_marchandise: 'electronique', poids_kg: '', notes_client: '',
  });

  const fetchCommandes = async () => {
    try {
      const res = await getCommandes();
      const features = res.data.features || res.data.results?.features || [];
      setCommandes(features);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommandes(); }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSubmitCommande = async (e) => {
    e.preventDefault();
    try {
      await createCommande({
        ...form,
        poids_kg: parseFloat(form.poids_kg),
        point_depart: { type: 'Point', coordinates: [-5.8, 35.7] },
        point_destination: { type: 'Point', coordinates: [-5.9, 35.75] },
        date_souhaitee: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
      setShowForm(false);
      fetchCommandes();
    } catch (err) {
      alert("Erreur: " + JSON.stringify(err.response?.data));
    }
  };

  const getStatutBadge = (statut) => {
    const map = {
      en_attente: { cls: 'badge-warning', label: 'En attente', icon: <Clock size={12} /> },
      validee: { cls: 'badge-info', label: 'Validée', icon: <CheckCircle size={12} /> },
      en_cours: { cls: 'badge-primary', label: 'En cours', icon: <TruckIcon size={12} /> },
      livree: { cls: 'badge-success', label: 'Livrée', icon: <CheckCircle size={12} /> },
      annulee: { cls: 'badge-danger', label: 'Annulée', icon: null },
    };
    const s = map[statut] || { cls: 'badge-secondary', label: statut };
    return <span className={`badge ${s.cls}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{s.icon}{s.label}</span>;
  };

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Bar */}
      <div className="top-header glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-icon"><TruckIcon size={22} color="white" /></div>
          <span className="logo-text text-gradient" style={{ fontSize: '1.3rem', fontWeight: 800 }}>LogisTrack</span>
          <span className="badge badge-info">Espace Client</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Bonjour, <strong style={{ color: 'var(--text-primary)' }}>{user?.first_name}</strong></span>
          <button className="btn btn-secondary" onClick={handleLogout}><LogOut size={16} /> Déconnexion</button>
        </div>
      </div>

      {/* Stats Rapides */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Mes commandes', value: commandes.length, color: 'icon-primary' },
          { label: 'En cours', value: commandes.filter(c => c.properties.statut === 'en_cours').length, color: 'icon-warning' },
          { label: 'Livrées', value: commandes.filter(c => c.properties.statut === 'livree').length, color: 'icon-success' },
          { label: 'En attente', value: commandes.filter(c => c.properties.statut === 'en_attente').length, color: 'icon-danger' },
        ].map((s) => (
          <div key={s.label} className="glass-card stat-card animate-fade-in">
            <div className="stat-header">
              <div>
                <h3 className="stat-title">{s.label}</h3>
                <div className="stat-value">{s.value}</div>
              </div>
              <div className={`stat-icon-wrapper ${s.color}`}><Package size={22} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        {/* Mes Commandes */}
        <div className="glass-card animate-fade-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="card-title">Mes Commandes</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} /> Nouvelle commande
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmitCommande} className="form-grid glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <div className="form-group full-width">
                <label>Adresse de départ</label>
                <input required type="text" className="glass-input" value={form.adresse_depart}
                  onChange={e => setForm({ ...form, adresse_depart: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Adresse de destination</label>
                <input required type="text" className="glass-input" value={form.adresse_destination}
                  onChange={e => setForm({ ...form, adresse_destination: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Type de marchandise</label>
                <select className="glass-input" value={form.type_marchandise}
                  onChange={e => setForm({ ...form, type_marchandise: e.target.value })}>
                  <option value="electronique">Électronique</option>
                  <option value="textile">Textile</option>
                  <option value="alimentaire">Alimentaire</option>
                  <option value="mobilier">Mobilier</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label>Poids (kg)</label>
                <input required type="number" step="0.1" className="glass-input" value={form.poids_kg}
                  onChange={e => setForm({ ...form, poids_kg: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Notes</label>
                <input type="text" className="glass-input" placeholder="Instructions pour le chauffeur..." value={form.notes_client}
                  onChange={e => setForm({ ...form, notes_client: e.target.value })} />
              </div>
              <div className="form-actions full-width">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Envoyer la demande</button>
              </div>
            </form>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Marchandise</th>
                <th>Destination</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>Chargement...</td></tr>
              ) : commandes.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune commande pour le moment.</td></tr>
              ) : commandes.map(cmd => (
                <tr key={cmd.id}>
                  <td><strong>{cmd.properties.reference}</strong></td>
                  <td>{cmd.properties.type_marchandise}</td>
                  <td><MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />{cmd.properties.adresse_destination}</td>
                  <td>{getStatutBadge(cmd.properties.statut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Carte */}
        <div className="glass-card animate-fade-in" style={{ padding: '0.5rem', animationDelay: '0.1s' }}>
          <div style={{ padding: '1rem 1rem 0.5rem' }}>
            <h3 className="card-title">Suivi en Direct</h3>
          </div>
          <div style={{ height: '400px' }}>
            <MapComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
