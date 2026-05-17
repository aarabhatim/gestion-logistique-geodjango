import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, Package, Map as MapIcon,
  Settings, BarChart2, AlertTriangle, LogOut, Store, Activity,
} from 'lucide-react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import SettingsPage from './pages/admin/SettingsPage';
import HeatmapPage from './pages/admin/HeatmapPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import Dashboard from './pages/Dashboard';
import Commandes from './pages/Commandes';
import Clients from './pages/Clients';
import Transporteurs from './pages/Transporteurs';
import Boutiques from './pages/Boutiques';
import MapPage from './pages/MapPage';
import Rapports from './pages/Rapports';
import Incidents from './pages/Incidents';
import Header from './components/Header';
import ChatbotWidget from './components/ChatbotWidget';

import ClientDashboard from './pages/client/ClientDashboard';
import ChauffeurDashboard from './pages/chauffeur/ChauffeurDashboard';

import './App.css';
import './pages/Pages.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ margin: '0 auto 1rem' }}><Truck size={28} color="white" /></div>
          <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'CLIENT') return <Navigate to="/client" replace />;
    if (user.role === 'TRANSPORTEUR') return <Navigate to="/chauffeur" replace />;
    if (user.role === 'FONDATEUR') return <Navigate to="/" replace />;
  }
  return children;
};

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

const AdminSidebar = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'A' : 'A';
  const roleLabel = { ADMIN: 'Administrateur', FONDATEUR: 'Fondateur', TRANSPORTEUR: 'Transporteur', CLIENT: 'Client' };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon"><Truck size={24} color="white" /></div>
          <h1 className="logo-text text-gradient">DeliverMap</h1>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">{t('nav_overview')}</div>
        <SidebarItem icon={LayoutDashboard} label={t('dashboard')} path="/" />
        <SidebarItem icon={MapIcon} label={t('map_tracking')} path="/map" />
        <div className="nav-section mt-4">{t('nav_operations')}</div>
        <SidebarItem icon={Package} label={t('commandes')} path="/commandes" />
        <SidebarItem icon={Store} label={t('boutiques')} path="/boutiques" />
        <SidebarItem icon={AlertTriangle} label={t('incidents')} path="/incidents" />
        <div className="nav-section mt-4">{t('nav_management')}</div>
        <SidebarItem icon={Users} label={t('clients')} path="/clients" />
        <SidebarItem icon={Truck} label={t('transporteurs')} path="/transporteurs" />
        <div className="nav-section mt-4">{t('nav_analysis')}</div>
        <SidebarItem icon={BarChart2} label={t('reports')} path="/rapports" />
        <SidebarItem icon={Activity} label={t('heatmap')} path="/heatmap" />
        <SidebarItem icon={Settings} label={t('settings')} path="/settings" />
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar" style={{ background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {initials}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.first_name} {user?.last_name}</div>
              <div className="user-role">{roleLabel[user?.role] || user?.role}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-icon"
            style={{ background: 'transparent', color: 'var(--danger-color)' }} title="Déconnexion">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const AdminLayout = ({ children }) => {
  const { setAdminRole, setDefaultRole } = useTheme();
  const navigate = useNavigate();
  useEffect(() => {
    setAdminRole();
    return () => setDefaultRole();
  }, [setAdminRole, setDefaultRole]);
  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">{children}</main>
      </div>
      <ChatbotWidget onNavigate={(path) => navigate(path)} />
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/client" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboard /></ProtectedRoute>} />
      <Route path="/chauffeur" element={<ProtectedRoute allowedRoles={['TRANSPORTEUR']}><ChauffeurDashboard /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminLayout><MapPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/commandes" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminLayout><Commandes /></AdminLayout></ProtectedRoute>} />
      <Route path="/boutiques" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout><Boutiques /></AdminLayout></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout><Incidents /></AdminLayout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout><Clients /></AdminLayout></ProtectedRoute>} />
      <Route path="/transporteurs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout><Transporteurs /></AdminLayout></ProtectedRoute>} />
      <Route path="/rapports" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout><Rapports /></AdminLayout></ProtectedRoute>} />
      <Route path="/heatmap" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout><HeatmapPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminLayout><SettingsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
