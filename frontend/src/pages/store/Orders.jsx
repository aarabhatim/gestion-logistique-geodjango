import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Package } from 'lucide-react';
import { commandesApi } from '../../services/api';
import '../../styles/marjane.css';
import { useI18n } from '../../contexts/I18nContext';

const Orders = () => {
  const { t, tStatus } = useI18n();
  const [orders, setOrders]   = useState([]);
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
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await commandesApi.updateStatus(id, { statut: newStatus });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const getOrdersByStatus = (status) => orders.filter(o => o.statut === status);

  const COLUMNS = [
    {
      titleKey: 'status_EN_ATTENTE',
      status: 'EN_ATTENTE',
      icon: Clock,
      color: '#D97706',
      bg: 'rgba(245,158,11,0.06)',
      border: 'rgba(245,158,11,0.2)',
      nextStatus: 'EN_PREPARATION',
      nextLabelKey: 'ord_accept_btn',
      nextLabelEmoji: '✅',
    },
    {
      titleKey: 'status_EN_PREPARATION',
      status: 'EN_PREPARATION',
      icon: Package,
      color: '#E30613',
      bg: 'rgba(227,6,19,0.04)',
      border: 'rgba(227,6,19,0.15)',
      nextStatus: 'VALIDEE',
      nextLabelKey: 'ord_ready_btn',
      nextLabelEmoji: '📦',
    },
    {
      titleKey: 'ord_col_ready',
      status: 'VALIDEE',
      icon: CheckCircle,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.04)',
      border: 'rgba(34,197,94,0.15)',
      nextStatus: null,
      nextLabelKey: null,
      nextLabelEmoji: null,
    },
  ];

  return (
    <div className="mj-page" style={{ padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontWeight: 800, fontSize: 22, margin: 0,
          color: 'var(--mj-text)', fontFamily: 'var(--mj-font)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Package size={22} color="var(--mj-red)" /> Gestion des Commandes
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--mj-text-3)' }}>
          Suivi en temps réel — actualisé toutes les 30 secondes
        </p>
      </div>

      {loading && orders.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60 }}>
          <div className="mj-spin" style={{
            width: 28, height: 28,
            border: '3px solid var(--mj-border)', borderTopColor: 'var(--mj-red)', borderRadius: '50%',
          }} />
          <span style={{ color: 'var(--mj-text-3)' }}>{t('ord_loading')}</span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}>
          {COLUMNS.map(col => {
            const columnOrders = getOrdersByStatus(col.status);
            return (
              <div key={col.status} style={{
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: `2px solid ${col.border}` }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: col.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <col.icon size={18} color={col.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
                      {t(col.titleKey)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mj-text-3)' }}>
                      {columnOrders.length}
                    </div>
                  </div>
                </div>

                {/* Orders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {columnOrders.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '24px 16px',
                      color: 'var(--mj-text-3)', fontSize: 13,
                    }}>
                      Aucune commande
                    </div>
                  ) : columnOrders.map(order => (
                    <div key={order.id} className="mj-card" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
                          Cmd #{order.reference || order.id}
                        </span>
                        <span style={{ color: 'var(--mj-text-3)', fontSize: 12 }}>
                          {new Date(order.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--mj-text-3)' }}>
                            {order.produits_commande?.length || 0} {(order.produits_commande?.length || 0) !== 1 ? t('ord_articles') : t('ord_article')}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#22C55E' }}>
                            {parseFloat(order.total_price || 0).toFixed(0)} MAD
                          </span>
                        </div>
                        {order.client_nom && (
                          <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 4 }}>
                            👤 {order.client_nom}
                          </div>
                        )}
                      </div>

                      {col.nextStatus && (
                        <button
                          className="mj-btn mj-btn-primary mj-btn-full"
                          style={{ fontSize: 13 }}
                          onClick={() => updateStatus(order.id, col.nextStatus)}
                        >
                          {col.nextLabelEmoji} {t(col.nextLabelKey)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
