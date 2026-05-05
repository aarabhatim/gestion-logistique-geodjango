import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, Package, Map as MapIcon, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Commandes from './pages/Commandes';
import Clients from './pages/Clients';
import Transporteurs from './pages/Transporteurs';
import './App.css';
import './pages/Pages.css';

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

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">
            <Truck size={24} color="white" />
          </div>
          <h1 className="logo-text text-gradient">LogisTrack</h1>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">MENU PRINCIPAL</div>
        <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" />
        <SidebarItem icon={MapIcon} label="Carte & Suivi" path="/map" />
        <SidebarItem icon={Package} label="Commandes" path="/commandes" />
        
        <div className="nav-section mt-4">GESTION</div>
        <SidebarItem icon={Users} label="Clients" path="/clients" />
        <SidebarItem icon={Truck} label="Transporteurs" path="/transporteurs" />
        
        <div className="nav-section mt-4">SYSTÈME</div>
        <SidebarItem icon={Settings} label="Paramètres" path="/settings" />
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">A</div>
          <div className="user-info">
            <div className="user-name">Admin</div>
            <div className="user-role">Super Utilisateur</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = () => {
  return (
    <header className="top-header glass-card">
      <div className="header-search">
        <input type="text" className="glass-input" placeholder="Rechercher une commande, un client..." />
      </div>
      <div className="header-actions">
        <button className="btn btn-primary">Nouvelle Commande</button>
      </div>
    </header>
  );
};

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-wrapper">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/map" element={<div className="animate-fade-in"><h2 className="text-gradient">Carte (À venir)</h2></div>} />
              <Route path="/commandes" element={<Commandes />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/transporteurs" element={<Transporteurs />} />
              <Route path="/settings" element={<div className="animate-fade-in"><h2 className="text-gradient">Paramètres (À venir)</h2></div>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
