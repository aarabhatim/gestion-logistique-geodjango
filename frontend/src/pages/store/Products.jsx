import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Image as ImageIcon, ToggleLeft, ToggleRight,
  Package, AlertTriangle, Save, X, Bell, RefreshCw,
} from 'lucide-react';
import { fondateursApi } from '../../services/api';

const StoreProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertes, setAlertes] = useState([]);
  const [showAlertes, setShowAlertes] = useState(false);
  const [editingStock, setEditingStock] = useState(null); // { id, value }
  const [showCreate, setShowCreate] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [toggling, setToggling] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fondateursApi.mesProduits();
      const items = res.data.results || res.data;
      setProducts(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertes = async () => {
    try {
      const res = await fondateursApi.stockAlertes();
      setAlertes(res.data.alertes || res.data || []);
    } catch { setAlertes([]); }
  };

  useEffect(() => {
    fetchProducts();
    fetchAlertes();
  }, []);

  const handleToggleDisponibilite = async (id) => {
    setToggling(id);
    try {
      await fondateursApi.toggleDisponibilite(id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, disponible: !p.disponible } : p));
    } catch { alert('Erreur.'); }
    finally { setToggling(null); }
  };

  const handleMajStock = async (id, newStock) => {
    const val = parseInt(newStock);
    if (isNaN(val) || val < 0) { alert('Stock invalide'); return; }
    try {
      await fondateursApi.majStock(id, { stock: val });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: val } : p));
      setEditingStock(null);
      fetchAlertes();
    } catch { alert('Erreur lors de la mise à jour du stock.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await fondateursApi.deleteProduit(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { alert('Erreur lors de la suppression.'); }
  };

  const stockAlerteIds = new Set(alertes.map(a => a.id || a.produit_id));

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} /> Catalogue Produits
          </h2>
          <p className="page-subtitle">Gérez vos produits, stocks et disponibilités.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Alertes stock */}
          <button onClick={() => { setShowAlertes(!showAlertes); fetchAlertes(); }}
            className={`btn ${alertes.length > 0 ? 'btn-danger' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
            <Bell size={14} />
            Alertes stock
            {alertes.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'absolute', top: -6, right: -6 }}>
                {alertes.length}
              </span>
            )}
          </button>
          <button onClick={fetchProducts} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Nouveau Produit
          </button>
        </div>
      </div>

      {/* Panneau alertes */}
      {showAlertes && alertes.length > 0 && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: '1.25rem', borderLeft: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
              <AlertTriangle size={14} /> {alertes.length} alerte{alertes.length > 1 ? 's' : ''} de stock
            </h4>
            <button onClick={() => setShowAlertes(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertes.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                background: 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 12 }}>
                <AlertTriangle size={12} color="#f87171" />
                <span><strong>{a.nom || a.produit_nom}</strong> — Stock : <strong style={{ color: '#f87171' }}>{a.stock}</strong></span>
                {a.stock === 0 && <span className="badge badge-danger" style={{ fontSize: 10 }}>Rupture</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={22} className="spin" style={{ opacity: 0.5 }} />
          </div>
        ) : (
          <table className="data-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Disponible</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 13 }}>
                    Aucun produit. Créez votre premier produit !
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const hasAlert = stockAlerteIds.has(p.id) || p.stock <= (p.seuil_alerte || 5);
                  const isEditingThisStock = editingStock?.id === p.id;
                  return (
                    <tr key={p.id} style={{ background: p.stock === 0 ? 'rgba(239,68,68,0.04)' : '' }}>
                      <td>
                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0].image} alt={p.nom}
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.08)', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={16} style={{ opacity: 0.4 }} />
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.description.slice(0, 45)}...</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.categorie}</td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{parseFloat(p.prix).toFixed(2)} MAD</td>
                      <td>
                        {isEditingThisStock ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input type="number" value={editingStock.value}
                              onChange={e => setEditingStock(s => ({ ...s, value: e.target.value }))}
                              className="glass-input"
                              style={{ width: 60, padding: '4px 6px', fontSize: 12 }}
                              onKeyDown={e => { if (e.key === 'Enter') handleMajStock(p.id, editingStock.value); if (e.key === 'Escape') setEditingStock(null); }}
                              autoFocus />
                            <button onClick={() => handleMajStock(p.id, editingStock.value)}
                              className="btn btn-success" style={{ padding: '3px 6px' }}>
                              <Save size={11} />
                            </button>
                            <button onClick={() => setEditingStock(null)}
                              className="btn btn-secondary" style={{ padding: '3px 6px' }}>
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: p.stock === 0 ? '#ef4444' : hasAlert ? '#f59e0b' : 'inherit', fontSize: 13 }}>
                              {p.stock}
                            </span>
                            {hasAlert && <AlertTriangle size={12} color={p.stock === 0 ? '#ef4444' : '#f59e0b'} />}
                            <button onClick={() => setEditingStock({ id: p.id, value: p.stock })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}>
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleDisponibilite(p.id)}
                          disabled={toggling === p.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            color: p.disponible ? '#10b981' : '#64748b',
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          {p.disponible
                            ? <><ToggleRight size={22} color="#10b981" /> Actif</>
                            : <><ToggleLeft size={22} color="#64748b" /> Inactif</>}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setEditProd(p)} className="btn btn-secondary"
                            style={{ padding: '4px 8px' }}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="btn btn-secondary"
                            style={{ padding: '4px 8px', color: '#ef4444' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editProd) && (
        <ProduitModal
          produit={editProd}
          onClose={() => { setShowCreate(false); setEditProd(null); }}
          onSaved={() => { setShowCreate(false); setEditProd(null); fetchProducts(); }}
        />
      )}
    </div>
  );
};

const ProduitModal = ({ produit, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nom: produit?.nom || '',
    description: produit?.description || '',
    prix: produit?.prix || '',
    stock: produit?.stock ?? 0,
    categorie: produit?.categorie || '',
    seuil_alerte: produit?.seuil_alerte || 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.prix) { setError('Nom et prix obligatoires.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (produit) {
        await fondateursApi.updateProduit(produit.id, form);
      } else {
        await fondateursApi.creerProduit(fd);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-card animate-fade-in" style={{ width: 440, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{produit ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[
            { key: 'nom', label: 'Nom *', type: 'text', placeholder: 'Nom du produit' },
            { key: 'categorie', label: 'Catégorie', type: 'text', placeholder: 'Alimentation, Electronique...' },
            { key: 'prix', label: 'Prix (MAD) *', type: 'number', placeholder: '0.00' },
            { key: 'stock', label: 'Stock initial', type: 'number', placeholder: '0' },
            { key: 'seuil_alerte', label: 'Seuil alerte stock', type: 'number', placeholder: '5' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{f.label}</label>
              <input type={f.type} className="glass-input" value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Description</label>
            <textarea className="glass-input" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description du produit..."
              style={{ width: '100%', minHeight: 70, resize: 'vertical', fontSize: 13 }} />
          </div>
          {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 12, color: '#fca5a5' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
              {submitting ? 'Sauvegarde...' : produit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProducts;
