import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { LayoutDashboard, Package, ShoppingBag, BarChart2, LogOut } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, path }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  return (
    <Link to={path} className={`sidebar-item ${isActive ? 'active' : ''}`}>
      <Icon className="sidebar-icon" size={20} />
      <span className="sidebar-label">{label}</span>
      {isActive && <div className="sidebar-active-indicator" />}
    </Link>
  );
};

const StoreSidebar = () => {
  const { user, logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon"><ShoppingBag size={24} color="white" /></div>
          <h1 className="logo-text text-gradient">Boutique</h1>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">MENU FONDATEUR</div>
        <SidebarItem icon={LayoutDashboard} label="Tableau de bord" path="/store" />
        <SidebarItem icon={Package} label="Catalogue" path="/store/products" />
        <SidebarItem icon={ShoppingBag} label="Commandes (Kanban)" path="/store/orders" />
        <SidebarItem icon={BarChart2} label="Analytiques" path="/store/analytics" />
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar">F</div>
            <div className="user-info">
              <div className="user-name">{user?.username || 'Fondateur'}</div>
              <div className="user-role">Fondateur</div>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="btn btn-icon" 
            style={{ background: 'transparent', color: 'var(--danger-color)' }}
            title="Se déconnecter"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const StoreLayout = ({ children }) => (
  <div className="app-layout">
    <StoreSidebar />
    <div className="main-wrapper">
      <Header />
      <main className="main-content">{children}</main>
    </div>
  </div>
);

export default StoreLayout;
