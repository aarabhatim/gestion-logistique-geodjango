import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { getNonLues, marquerLue, toutMarquerLu } from '../services/api';
import { ThemeToggle } from '../contexts/ThemeContext';

const Header = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNonLues();
      setNotifications(res.data.results || res.data || []);
    } catch (error) {
      console.error("Erreur chargement notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarquerLue = async (id, e) => {
    e.stopPropagation();
    setLoading(true);
    try { await marquerLue(id); await fetchNotifications(); }
    finally { setLoading(false); }
  };

  const handleToutMarquerLu = async () => {
    setLoading(true);
    try { await toutMarquerLu(); await fetchNotifications(); setShowDropdown(false); }
    finally { setLoading(false); }
  };

  const getIconColor = (type) => {
    switch(type) {
      case 'success': return 'var(--success-color)';
      case 'warning': return 'var(--warning-color)';
      case 'danger': return 'var(--danger-color)';
      default: return 'var(--accent-primary)';
    }
  };

  return (
    <header className="top-header glass-card">
      <div className="header-search">
        <input type="text" className="glass-input" placeholder="Rechercher une commande, un client..." />
      </div>
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ThemeToggle />
        <div className="notifications-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="btn btn-icon" onClick={() => setShowDropdown(!showDropdown)}
            style={{ position: 'relative', background: 'transparent', border: '1px solid var(--glass-border)' }}>
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="badge-pulse" style={{
                position: 'absolute', top: '-5px', right: '-5px',
                background: 'var(--danger-color)', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 'bold'
              }}>{notifications.length > 9 ? '9+' : notifications.length}</span>
            )}
          </button>

          {showDropdown && (
            <div className="notifications-dropdown glass-card animate-fade-in" style={{
              position: 'absolute', top: '120%', right: '0', width: '320px',
              padding: '0', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div className="dropdown-header" style={{
                padding: '1rem', borderBottom: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h4 style={{ margin: 0 }}>Notifications</h4>
                {notifications.length > 0 && (
                  <button className="btn btn-sm" onClick={handleToutMarquerLu} disabled={loading}
                    style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '12px' }}>
                    <Check size={14} style={{ marginRight: '4px' }}/> Tout lire
                  </button>
                )}
              </div>
              <div className="dropdown-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Aucune nouvelle notification
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="notification-item" onClick={(e) => handleMarquerLue(n.id, e)} style={{
                      padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer', display: 'flex', gap: '10px'
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getIconColor(n.type_notif), marginTop: '6px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{n.titre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.message}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          {new Date(n.date_creation).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
