import React from 'react';
import MapComponent from '../components/MapComponent';

const MapPage = () => {
  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="dashboard-header animate-fade-in" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title text-gradient">Carte des Opérations</h2>
          <p className="page-subtitle">Suivi en direct de votre flotte, des entrepôts et des clients.</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in" style={{ flex: 1, padding: '0.5rem', animationDelay: '0.1s', position: 'relative' }}>
        <MapComponent />
      </div>
    </div>
  );
};

export default MapPage;
