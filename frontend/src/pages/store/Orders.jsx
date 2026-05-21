import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Package } from 'lucide-react';
import { commandesApi } from '../../services/api';

const StoreOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await commandesApi.list({ statuts: 'EN_ATTENTE,EN_PREPARATION,VALIDEE', page_size: 100 });
      const items = res.data.results ?? (Array.isArray(res.data) ? res.data : []);
      setOrders(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // In a real app, use WebSocket here for live updates
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`commandes/${id}/update_status/`, { statut: newStatus });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const getOrdersByStatus = (status) => orders.filter(o => o.statut === status);

  const KanbanColumn = ({ title, status, icon: Icon, color, nextStatus, nextLabel }) => {
    const columnOrders = getOrdersByStatus(status);
    return (
      <div className="kanban-column" style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ borderBottom: `2px solid ${color}`, paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon size={18} color={color} /> {title} ({columnOrders.length})
        </h3>
        
        <div className="kanban-items" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {columnOrders.map(order => (
            <div key={order.id} className="card kanban-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="font-bold">Cmd #{order.id}</span>
                <span className="text-secondary text-sm">{new Date(order.created_at).toLocaleTimeString()}</span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <p className="text-sm">Total: <strong>{order.total_price} MAD</strong></p>
                <p className="text-sm text-secondary">{order.produits_commande?.length || 0} articles</p>
              </div>
              
              {nextStatus && (
                <button 
                  className="btn btn-primary w-full" 
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                  onClick={() => updateStatus(order.id, nextStatus)}
                >
                  {nextLabel}
                </button>
              )}
            </div>
          ))}
          {columnOrders.length === 0 && (
            <p className="text-secondary text-center text-sm mt-4">Aucune commande</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <h1 className="text-gradient mb-4">Gestion des Commandes</h1>
      
      {loading && orders.length === 0 ? (
        <p>Chargement des commandes...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          <KanbanColumn 
            title="Nouvelles (En attente)" 
            status="EN_ATTENTE" 
            icon={Clock} 
            color="var(--warning-color)"
            nextStatus="EN_PREPARATION"
            nextLabel="Accepter & Préparer"
          />
          <KanbanColumn 
            title="En Préparation" 
            status="EN_PREPARATION" 
            icon={Package} 
            color="var(--primary-color)"
            nextStatus="VALIDEE"
            nextLabel="Marquer comme Prête"
          />
          <KanbanColumn 
            title="Prêtes (En attente livreur)" 
            status="VALIDEE" 
            icon={CheckCircle} 
            color="var(--success-color)"
            // No next status for Store, driver will take it and change to EN_ROUTE
          />
        </div>
      )}
    </div>
  );
};

export default StoreOrders;
