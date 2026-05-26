import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Search, UserX, Shield, RefreshCw, Download } from 'lucide-react';
import api from '../services/api';
import { exportCsv, CSV_COLUMNS } from '../utils/exportCsv';

const roleColor = (role) => {
  const map = { CLIENT: 'badge-info', ADMIN: 'badge-danger', FONDATEUR: 'badge-warning', TRANSPORTEUR: 'badge-success' };
  return map[role] || 'badge-secondary';
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const fetchClients = async (q = search, p = page) => {
    setLoading(true);
    try {
      const res = await api.get('auth/admin/users/', { params: { role: 'CLIENT', search: q, page: p } });
      const results = res.data.results || res.data || [];
      setClients(results);
      setCount(res.data.count || results.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    setPage(1);
    fetchClients(q, 1);
  };

  const initials = (u) => {
    const f = u.first_name?.[0] || '';
    const l = u.last_name?.[0] || '';
    return (f + l).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };

  const avatarColors = ['#22c55e', '#10b981', '#f59e0b', '#ef4444', '#16a34a', '#ec4899', '#06b6d4'];
  const avatarColor = (id) => avatarColors[id % avatarColors.length];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Gestion des Clients</h2>
          <p className="page-subtitle">{count} utilisateurs enregistrés sur DeliverMap</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportCsv({ data: clients, columns: CSV_COLUMNS.clients, filename: 'clients' })}>
            <Download size={16} /> Exporter CSV
          </button>
          <button className="btn btn-secondary" onClick={() => fetchClients()}>
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="glass-card animate-fade-in" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Search size={18} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="glass-input"
          placeholder="Rechercher par nom, email, téléphone..."
          value={search}
          onChange={handleSearch}
          style={{ flex: 1, maxWidth: '400px' }}
        />
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '13px' }}>
          {count} résultat{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau */}
      <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Rôle</th>
              <th>Localisation</th>
              <th>Statut</th>
              <th>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Chargement...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Aucun client trouvé.</td></tr>
            ) : clients.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: avatarColor(u.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '14px', color: 'white', flexShrink: 0,
                    }}>
                      {initials(u)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                      <Mail size={12} style={{ color: 'var(--text-secondary)' }} />
                      {u.email}
                    </div>
                    {u.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                        <Phone size={12} /> {u.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${roleColor(u.role)}`}>{u.role}</span>
                </td>
                <td>
                  {u.latitude ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <MapPin size={12} /> {u.latitude?.toFixed(3)}, {u.longitude?.toFixed(3)}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>
                  )}
                </td>
                <td>
                  {u.is_banned ? (
                    <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                      <UserX size={12} /> Banni
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                      <Shield size={12} /> Actif
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;
