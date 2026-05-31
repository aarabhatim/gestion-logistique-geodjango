import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { useI18n } from '../contexts/I18nContext';

/**
 * DrivingMode — Interface conduite haute visibilité pour chauffeurs
 *
 * Usage dans ChauffeurDashboard :
 *   import DrivingMode from '../components/DrivingMode';
 *   {missionActive && <DrivingMode mission={missionActive} onComplete={handleComplete} onSOS={handleSOS} />}
 *
 * Props :
 *   mission     — { commande_id, client_adresse, route: [[lat,lng],...], distance_km, duree_min }
 *   onComplete  — callback quand livraison confirmée
 *   onSOS       — callback bouton SOS
 */

const DARK_TILE = `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`;

const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 16, { animate: true });
  }, [position, map]);
  return null;
};

const DrivingMode = ({ mission, onComplete, onSOS }) => {
  const { t } = useI18n();
  const [position, setPosition] = useState(null);
  const [progress, setProgress] = useState(0); // 0-100%
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Calcul progression fictif (à remplacer par calcul OSRM)
  useEffect(() => {
    const total = (mission?.duree_min || 20) * 60;
    setProgress(Math.min(100, Math.round((elapsed / total) * 100)));
  }, [elapsed, mission]);

  const etaMin = Math.max(0, (mission?.duree_min || 20) - Math.floor(elapsed / 60));

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const defaultPosition = mission?.route?.[0] || [36.7369, 3.0865];

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col" style={{ zIndex: 500 }}>
      {/* Carte 80% */}
      <div className="flex-1 relative" style={{ minHeight: '60vh' }}>
        <MapContainer
          center={position || defaultPosition}
          zoom={16}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer url={DARK_TILE} attribution="&copy; MapTiler &copy; OpenStreetMap contributors" />
          {position && <RecenterMap position={position} />}

          {/* Route animée */}
          {mission?.route && (
            <Polyline
              positions={mission.route}
              color="#FF6B35"
              weight={6}
              opacity={0.9}
              dashArray="12 6"
              className="route-animation"
            />
          )}

          {/* Position chauffeur */}
          {position && (
            <Marker position={position} />
          )}
        </MapContainer>

        {/* ETA flottant en haut */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white rounded-2xl px-6 py-3 text-center shadow-xl">
          <p className="text-3xl font-black text-[#FF6B35]">{etaMin} min</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('drv_eta_remaining')}</p>
        </div>

        {/* SOS bouton flottant */}
        <button
          onClick={onSOS}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all"
        >
          SOS
        </button>
      </div>

      {/* Panneau bas 20% */}
      <div className="bg-gray-900 px-5 py-4 space-y-3">
        {/* Barre de progression trajet */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Trajet</span>
            <span>{progress}% · {mission?.distance_km?.toFixed(1)} km</span>
          </div>
          <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFA502] rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Adresse destination */}
        <div className="flex items-start gap-2 text-white">
          <span className="text-xl mt-0.5">📍</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Destination</p>
            <p className="font-bold text-base leading-tight">{mission?.client_adresse || 'Adresse client'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Temps</p>
            <p className="font-bold text-[#00C9A7]">{formatTime(elapsed)}</p>
          </div>
        </div>

        {/* Bouton Livraison confirmée */}
        <button
          onClick={onComplete}
          className="w-full bg-[#2ED573] hover:bg-[#57E891] active:scale-98 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg"
        >
          {t('drv_delivery_confirmed')}
        </button>
      </div>
    </div>
  );
};

export default DrivingMode;
