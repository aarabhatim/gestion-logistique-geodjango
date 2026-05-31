import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
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
  const { t } = useI18n();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon"><ShoppingBag size={24} color="white" /></div>
          <h1 className="logo-text text-gradient">{t('store_boutique')}</h1>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">{t('store_menu_fondateur')}</div>
        <SidebarItem icon={LayoutDashboard} label={t('dashboard')} path="/store" />
        <SidebarItem icon={Package} label={t('catalogue')} path="/store/products" />
        <SidebarItem icon={ShoppingBag} label={t('store_orders_kanban')} path="/store/orders" />
        <SidebarItem icon={BarChart2} label={t('sb_analytiques')} path="/store/analytics" />
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar">F</div>
            <div className="user-info">
              <div className="user-name">{user?.username || t('sb_role_fondateur')}</div>
              <div className="user-role">{t('sb_role_fondateur')}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-icon"
            style={{ background: 'transparent', color: 'var(--danger-color)' }}
            title={t('logout')}
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
