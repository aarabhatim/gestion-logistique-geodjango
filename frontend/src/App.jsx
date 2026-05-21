import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Truck } from 'lucide-react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AdminShell } from './components/layout/AdminShell';

// Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin — existing
import Dashboard     from './pages/Dashboard';
import Commandes     from './pages/Commandes';
import Clients       from './pages/Clients';
import Transporteurs from './pages/Transporteurs';
import Boutiques     from './pages/Boutiques';
import MapPage       from './pages/MapPage';
import Rapports      from './pages/Rapports';
import Incidents     from './pages/Incidents';
import Scoring       from './pages/Scoring';
import Tickets       from './pages/Tickets';
import Contrats      from './pages/Contrats';
import SettingsPage  from './pages/admin/SettingsPage';
import HeatmapPage   from './pages/admin/HeatmapPage';

// Admin — nouvelles pages
import LiveDashboard    from './pages/admin/LiveDashboard';
import CalendrierPage   from './pages/admin/CalendrierPage';
import ZonesPage        from './pages/admin/ZonesPage';
import PromotionsPage   from './pages/admin/PromotionsPage';
import PrevisionsPage   from './pages/admin/PrevisionsPage';
import ImpersonationPage from './pages/admin/ImpersonationPage';
import BannieresPage    from './pages/admin/BannieresPage';
import BlacklistPage    from './pages/admin/BlacklistPage';

// Fondateur (boutique) — existing
import StoreDash  from './pages/store/StoreDash';
import Orders     from './pages/store/Orders';
import Products   from './pages/store/Products';
import Analytics  from './pages/store/Analytics';

// Fondateur — nouvelles pages
import GaleriePage from './pages/store/GaleriePage';
import AvisPage    from './pages/store/AvisPage';

// Chauffeur
import ChauffeurDashboard from './pages/chauffeur/ChauffeurDashboard';
import SignalerIncident   from './pages/chauffeur/SignalerIncident';

// Client
import ClientDashboard from './pages/client/ClientDashboard';

import './index.css';
import './pages/Pages.css';

// ── ProtectedRoute ────────────────────────────────────────────────────────────
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
    if (user.role === 'CLIENT')      return <Navigate to="/client"   replace />;
    if (user.role === 'TRANSPORTEUR') return <Navigate to="/chauffeur" replace />;
    if (user.role === 'FONDATEUR')   return <Navigate to="/boutique" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

// ── Page transition wrapper ───────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, scale: 0.99, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
};

// ── AdminShell wrappers ───────────────────────────────────────────────────────
const A  = (Page, opts = {}) => (
  <AdminShell {...opts}><Page /></AdminShell>
);

// ── All routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  const location = useLocation();
  const PR = (roles, Page, opts = {}) => (
    <ProtectedRoute allowedRoles={roles}>
      <AdminShell {...opts}><Page /></AdminShell>
    </ProtectedRoute>
  );
  const ADMIN = ['ADMIN'];
  const ADMIN_FOND = ['ADMIN', 'FONDATEUR'];
  const ALL = ['ADMIN', 'FONDATEUR', 'TRANSPORTEUR', 'CLIENT'];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Auth */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Client */}
        <Route path="/client" element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientDashboard />
          </ProtectedRoute>
        } />

        {/* Chauffeur */}
        <Route path="/chauffeur" element={
          <ProtectedRoute allowedRoles={['TRANSPORTEUR']}>
            <ChauffeurDashboard />
          </ProtectedRoute>
        } />
        <Route path="/chauffeur/signaler-incident" element={
          <ProtectedRoute allowedRoles={['TRANSPORTEUR']}>
            <AdminShell><SignalerIncident /></AdminShell>
          </ProtectedRoute>
        } />

        {/* Fondateur / boutique */}
        <Route path="/boutique"           element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><StoreDash /></AdminShell></ProtectedRoute>} />
        <Route path="/boutique/commandes" element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><Orders /></AdminShell></ProtectedRoute>} />
        <Route path="/boutique/produits"  element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><Products /></AdminShell></ProtectedRoute>} />
        <Route path="/boutique/analytics" element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><Analytics /></AdminShell></ProtectedRoute>} />
        <Route path="/boutique/galerie"   element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><GaleriePage /></AdminShell></ProtectedRoute>} />
        <Route path="/boutique/avis"      element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><AvisPage /></AdminShell></ProtectedRoute>} />

        {/* Admin — existant */}
        <Route path="/"             element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><Dashboard /></AdminShell></ProtectedRoute>} />
        <Route path="/map"          element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell fullBleed><MapPage /></AdminShell></ProtectedRoute>} />
        <Route path="/commandes"    element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><Commandes /></AdminShell></ProtectedRoute>} />
        <Route path="/boutiques"    element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Boutiques /></AdminShell></ProtectedRoute>} />
        <Route path="/incidents"    element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Incidents /></AdminShell></ProtectedRoute>} />
        <Route path="/clients"      element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Clients /></AdminShell></ProtectedRoute>} />
        <Route path="/transporteurs" element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Transporteurs /></AdminShell></ProtectedRoute>} />
        <Route path="/scoring"      element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Scoring /></AdminShell></ProtectedRoute>} />
        <Route path="/tickets"      element={<ProtectedRoute allowedRoles={ALL}><AdminShell><Tickets /></AdminShell></ProtectedRoute>} />
        <Route path="/contrats"     element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Contrats /></AdminShell></ProtectedRoute>} />
        <Route path="/rapports"     element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><Rapports /></AdminShell></ProtectedRoute>} />
        <Route path="/heatmap"      element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell fullBleed><HeatmapPage /></AdminShell></ProtectedRoute>} />
        <Route path="/settings"     element={<ProtectedRoute allowedRoles={ADMIN_FOND}><AdminShell><SettingsPage /></AdminShell></ProtectedRoute>} />

        {/* Admin — nouvelles pages */}
        <Route path="/live"           element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><LiveDashboard /></AdminShell></ProtectedRoute>} />
        <Route path="/calendrier"     element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><CalendrierPage /></AdminShell></ProtectedRoute>} />
        <Route path="/zones"          element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><ZonesPage /></AdminShell></ProtectedRoute>} />
        <Route path="/promotions"     element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><PromotionsPage /></AdminShell></ProtectedRoute>} />
        <Route path="/previsions"     element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><PrevisionsPage /></AdminShell></ProtectedRoute>} />
        <Route path="/impersonation"  element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><ImpersonationPage /></AdminShell></ProtectedRoute>} />
        <Route path="/bannieres"      element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><BannieresPage /></AdminShell></ProtectedRoute>} />
        <Route path="/blacklist"      element={<ProtectedRoute allowedRoles={ADMIN}><AdminShell><BlacklistPage /></AdminShell></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
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
