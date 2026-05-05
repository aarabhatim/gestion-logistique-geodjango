import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getCommandes, getClients } from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon paths in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom destination icon
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapComponent = () => {
  // Center on Morocco (Tanger region roughly)
  const [position, setPosition] = useState([35.7595, -5.8340]);
  const [commandes, setCommandes] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const [cmdRes, cliRes] = await Promise.all([
          getCommandes(), getClients()
        ]);
        const getFeatures = (res) => {
          if (res.data.features) return res.data.features;
          if (res.data.results && res.data.results.features) return res.data.results.features;
          return [];
        };

        setCommandes(getFeatures(cmdRes));
        setClients(getFeatures(cliRes));
      } catch (error) {
        console.error("Erreur chargement carte", error);
      }
    };
    fetchMapData();
  }, []);

  return (
    <MapContainer 
      center={position} 
      zoom={11} 
      style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 1 }}
    >
      {/* Premium dark map theme */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      {/* Clients (Destinations potentielles) */}
      {clients.map(client => {
        if (!client.geometry || !client.geometry.coordinates) return null;
        // GeoJSON uses [lon, lat], Leaflet uses [lat, lon]
        const [lon, lat] = client.geometry.coordinates;
        return (
          <Marker key={`client-${client.id}`} position={[lat, lon]} icon={destIcon}>
            <Popup>
              <div style={{ color: '#000' }}>
                <strong>Client: {client.properties.prenom} {client.properties.nom}</strong><br/>
                {client.properties.adresse}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Commandes (Points de départ) */}
      {commandes.map(cmd => {
        // Here we assume point_depart is stored in GeoJSON geometry if serialized properly
        // GeoFeatureModelSerializer uses point_destination by default based on our config.
        // Let's use the main geometry.
        if (!cmd.geometry || !cmd.geometry.coordinates) return null;
        const [lon, lat] = cmd.geometry.coordinates;
        return (
          <Marker key={`cmd-${cmd.id}`} position={[lat, lon]} icon={truckIcon}>
            <Popup>
              <div style={{ color: '#000' }}>
                <strong>Commande: {cmd.properties.reference}</strong><br/>
                Statut: {cmd.properties.statut}<br/>
                Marchandise: {cmd.properties.type_marchandise}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
