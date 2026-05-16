import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, Package, Map as MapIcon, Settings, BarChart2, AlertTriangle, LogOut } from 'lucide-react';

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin pages
import Dashboard from './pages/Dashboard';
import Commandes from './pages/Commandes';
import Clients from './pages/Clients';
import Transporteurs from './pages/Transporteurs';
import MapPage from './pages/MapPage';
import Rapports from './pages/Rapports';
import Incidents from './pages/Incidents';
import Header from './components/Header';

// Role-specific pages
import ClientDashboard from './pages/client/ClientDashboard';
import ChauffeurDashboard from './pages/chauffeur/ChauffeurDashboard';

// Store (Fondateur) pages
import StoreLayout from './layouts/StoreLayout';
import StoreDash from './pages/store/StoreDash';
import StoreProducts from './pages/store/Products';
import StoreOrders from './pages/store/Orders';
import StoreAnalytics from './pages/store/Analytics';

import './App.css';
import './pages/Pages.css';

// ─── Protected Route ─────────────────────────────────────────────────────────
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
    // Redirect to the user's own space
    if (user.role === 'CLIENT') return <Navigate to="/client" replace />;
    if (user.role === 'TRANSPORTEUR') return <Navigate to="/chauffeur" replace />;
    if (user.role === 'FONDATEUR') return <Navigate to="/store" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/" replace />;
  }
  return children;
};

// ─── Admin Layout ─────────────────────────────────────────────────────────────
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
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon"><Truck size={24} color="white" /></div>
          <h1 className="logo-text text-gradient">LogisTrack</h1>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">MENU PRINCIPAL</div>
        <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" />
        <SidebarItem icon={MapIcon} label="Carte & Suivi" path="/map" />
        <SidebarItem icon={Package} label="Commandes" path="/commandes" />
        <SidebarItem icon={AlertTriangle} label="Incidents" path="/incidents" />
        <div className="nav-section mt-4">GESTION</div>
        <SidebarItem icon={Users} label="Clients" path="/clients" />
        <SidebarItem icon={Truck} label="Flotte" path="/transporteurs" />
        <div className="nav-section mt-4">ANALYSE</div>
        <SidebarItem icon={BarChart2} label="Rapports" path="/rapports" />
        <SidebarItem icon={Settings} label="Paramètres" path="/settings" />
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar">A</div>
            <div className="user-info">
              <div className="user-name">{user?.first_name || 'Admin'}</div>
              <div className="user-role">Administrateur</div>
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

const AdminLayout = ({ children }) => (
  <div className="app-layout">
    <AdminSidebar />
    <div className="main-wrapper">
      <Header />
      <main className="main-content">{children}</main>
    </div>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Client routes */}
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['CLIENT']}>
          <ClientDashboard />
        </ProtectedRoute>
      } />

      {/* Chauffeur routes */}
      <Route path="/chauffeur" element={
        <ProtectedRoute allowedRoles={['TRANSPORTEUR']}>
          <ChauffeurDashboard />
        </ProtectedRoute>
      } />

      {/* Store routes */}
      <Route path="/store" element={
        <ProtectedRoute allowedRoles={['FONDATEUR']}>
          <StoreLayout><StoreDash /></StoreLayout>
        </ProtectedRoute>
      } />
      <Route path="/store/products" element={
        <ProtectedRoute allowedRoles={['FONDATEUR']}>
          <StoreLayout><StoreProducts /></StoreLayout>
        </ProtectedRoute>
      } />
      <Route path="/store/orders" element={
        <ProtectedRoute allowedRoles={['FONDATEUR']}>
          <StoreLayout><StoreOrders /></StoreLayout>
        </ProtectedRoute>
      } />
      <Route path="/store/analytics" element={
        <ProtectedRoute allowedRoles={['FONDATEUR']}>
          <StoreLayout><StoreAnalytics /></StoreLayout>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><Dashboard /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/map" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><MapPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/commandes" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><Commandes /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/incidents" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><Incidents /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><Clients /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/transporteurs" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><Transporteurs /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/rapports" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><Rapports /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminLayout><div className="animate-fade-in dashboard-container"><h2 className="text-gradient">Paramètres (À venir)</h2></div></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
