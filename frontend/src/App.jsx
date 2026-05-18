import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Truck } from 'lucide-react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AdminShell } from './components/layout/AdminShell';
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
import Scoring from './pages/Scoring';
import Tickets from './pages/Tickets';
import Contrats from './pages/Contrats';
import ClientDashboard from './pages/client/ClientDashboard';
import ChauffeurDashboard from './pages/chauffeur/ChauffeurDashboard';
import SignalerIncident from './pages/chauffeur/SignalerIncident';

import './index.css';
import './pages/Pages.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/client" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboard /></ProtectedRoute>} />
      <Route path="/chauffeur" element={<ProtectedRoute allowedRoles={['TRANSPORTEUR']}><ChauffeurDashboard /></ProtectedRoute>} />
      <Route path="/chauffeur/signaler-incident" element={<ProtectedRoute allowedRoles={['TRANSPORTEUR']}><AdminShell><SignalerIncident /></AdminShell></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminShell><Dashboard /></AdminShell></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminShell fullBleed><MapPage /></AdminShell></ProtectedRoute>} />
      <Route path="/commandes" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminShell><Commandes /></AdminShell></ProtectedRoute>} />
      <Route path="/boutiques" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Boutiques /></AdminShell></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Incidents /></AdminShell></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Clients /></AdminShell></ProtectedRoute>} />
      <Route path="/transporteurs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Transporteurs /></AdminShell></ProtectedRoute>} />
      <Route path="/scoring" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Scoring /></AdminShell></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR', 'TRANSPORTEUR', 'CLIENT']}><AdminShell><Tickets /></AdminShell></ProtectedRoute>} />
      <Route path="/contrats" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Contrats /></AdminShell></ProtectedRoute>} />
      <Route path="/rapports" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell><Rapports /></AdminShell></ProtectedRoute>} />
      <Route path="/heatmap" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShell fullBleed><HeatmapPage /></AdminShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}><AdminShell><SettingsPage /></AdminShell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <NotificationProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
