import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Image as ImageIcon, ToggleLeft, ToggleRight,
  Package, AlertTriangle, Save, X, Bell, RefreshCw,
} from 'lucide-react';
import { fondateursApi } from '../../services/api';
import '../../styles/marjane.css';

const StoreProducts = () => {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [alertes, setAlertes]         = useState([]);
  const [showAlertes, setShowAlertes] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [editProd, setEditProd]       = useState(null);
  const [toggling, setToggling]       = useState(null);

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
    <div className="mj-page" style={{ padding: '0 0 40px' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} color="var(--mj-red)" /> Catalogue Produits
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--mj-text-3)' }}>
            Gérez vos produits, stocks et disponibilités.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setShowAlertes(!showAlertes); fetchAlertes(); }}
            className={`mj-btn mj-btn-sm ${alertes.length > 0 ? 'mj-btn-primary' : 'mj-btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
          >
            <Bell size={14} /> Alertes stock
            {alertes.length > 0 && (
              <span style={{
                background: 'white', color: 'var(--mj-red)', borderRadius: '50%',
                width: 18, height: 18, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'absolute', top: -6, right: -6,
              }}>
                {alertes.length}
              </span>
            )}
          </button>
          <button onClick={fetchProducts} className="mj-btn mj-btn-secondary mj-btn-sm">
            <RefreshCw size={14} className={loading ? 'mj-spin' : ''} />
          </button>
          <button
            className="mj-btn mj-btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Nouveau Produit
          </button>
        </div>
      </div>

      {/* ── Panneau alertes ── */}
      {showAlertes && alertes.length > 0 && (
        <div className="mj-card mj-fade-in" style={{ marginBottom: 20, borderLeft: '3px solid #E30613' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: '#E30613' }}>
              <AlertTriangle size={14} /> {alertes.length} alerte{alertes.length > 1 ? 's' : ''} de stock
            </h4>
            <button
              onClick={() => setShowAlertes(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mj-text-3)' }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertes.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 12px', background: 'var(--mj-red-light)',
                borderRadius: 8, fontSize: 13,
              }}>
                <AlertTriangle size={12} color="#E30613" />
                <span style={{ color: 'var(--mj-text)' }}>
                  <strong>{a.nom || a.produit_nom}</strong> — Stock : <strong style={{ color: '#E30613' }}>{a.stock}</strong>
                </span>
                {a.stock === 0 && (
                  <span className="mj-badge mj-badge-red" style={{ fontSize: 10, marginLeft: 'auto' }}>Rupture</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="mj-card" style={{ overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="mj-spin" style={{
              width: 28, height: 28, margin: '0 auto',
              border: '3px solid var(--mj-border)', borderTopColor: 'var(--mj-red)', borderRadius: '50%',
            }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontFamily: 'var(--mj-font)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--mj-border)' }}>
                {['Image', 'Produit', 'Catégorie', 'Prix', 'Stock', 'Disponible', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700,
                    color: 'var(--mj-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mj-text-3)', fontSize: 14 }}>
                    Aucun produit. Créez votre premier produit !
                  </td>
                </tr>
              ) : products.map((p) => {
                const hasAlert = stockAlerteIds.has(p.id) || p.stock <= (p.seuil_alerte || 5);
                const isEditingThisStock = editingStock?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--mj-border)',
                      background: p.stock === 0 ? 'rgba(227,6,19,0.03)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = p.stock === 0 ? 'rgba(227,6,19,0.05)' : 'var(--mj-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = p.stock === 0 ? 'rgba(227,6,19,0.03)' : 'transparent'}
                  >
                    {/* Image */}
                    <td style={{ padding: '10px 12px' }}>
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].image} alt={p.nom}
                          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--mj-border)' }} />
                      ) : (
                        <div style={{
                          width: 44, height: 44, background: 'var(--mj-bg)', borderRadius: 10,
                          border: '1px solid var(--mj-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ImageIcon size={16} style={{ color: 'var(--mj-text-3)' }} />
                        </div>
                      )}
                    </td>
                    {/* Produit */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mj-text)' }}>{p.nom}</div>
                      {p.description && (
                        <div style={{ fontSize: 11, color: 'var(--mj-text-3)', marginTop: 2 }}>
                          {p.description.slice(0, 45)}…
                        </div>
                      )}
                    </td>
                    {/* Catégorie */}
                    <td style={{ padding: '10px 12px' }}>
                      {p.categorie && (
                        <span className="mj-cat-chip" style={{ fontSize: 12 }}>{p.categorie}</span>
                      )}
                    </td>
                    {/* Prix */}
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 14, color: 'var(--mj-text)' }}>
                      {parseFloat(p.prix).toFixed(2)} MAD
                    </td>
                    {/* Stock */}
                    <td style={{ padding: '10px 12px' }}>
                      {isEditingThisStock ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            value={editingStock.value}
                            onChange={e => setEditingStock(s => ({ ...s, value: e.target.value }))}
                            className="mj-input"
                            style={{ width: 64, padding: '4px 8px', fontSize: 13 }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleMajStock(p.id, editingStock.value);
                              if (e.key === 'Escape') setEditingStock(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => handleMajStock(p.id, editingStock.value)}
                            className="mj-btn mj-btn-primary" style={{ padding: '4px 8px' }}>
                            <Save size={11} />
                          </button>
                          <button onClick={() => setEditingStock(null)}
                            className="mj-btn mj-btn-secondary" style={{ padding: '4px 8px' }}>
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontWeight: 700,
                            color: p.stock === 0 ? '#E30613' : hasAlert ? '#D97706' : 'var(--mj-text)',
                            fontSize: 14,
                          }}>
                            {p.stock}
                          </span>
                          {hasAlert && <AlertTriangle size={12} color={p.stock === 0 ? '#E30613' : '#D97706'} />}
                          <button
                            onClick={() => setEditingStock({ id: p.id, value: p.stock })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mj-text-3)', padding: 2 }}
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                    {/* Disponible */}
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => handleToggleDisponibilite(p.id)}
                        disabled={toggling === p.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: p.disponible ? '#22C55E' : 'var(--mj-text-3)',
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                        }}
                      >
                        {p.disponible
                          ? <><ToggleRight size={22} color="#22C55E" /> Actif</>
                          : <><ToggleLeft size={22} color="#94a3b8" /> Inactif</>}
                      </button>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setEditProd(p)}
                          className="mj-btn mj-btn-secondary mj-btn-sm"
                          style={{ padding: '5px 8px' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="mj-btn mj-btn-secondary mj-btn-sm"
                          style={{ padding: '5px 8px', color: '#E30613' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ── */}
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
    <div className="mj-modal-overlay">
      <div className="mj-card mj-fade-in" style={{ width: 460, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            {produit ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mj-text-3)', fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'nom',          label: 'Nom *',               type: 'text',   placeholder: 'Nom du produit' },
            { key: 'categorie',    label: 'Catégorie',           type: 'text',   placeholder: 'Alimentation, Électronique…' },
            { key: 'prix',         label: 'Prix (MAD) *',        type: 'number', placeholder: '0.00' },
            { key: 'stock',        label: 'Stock initial',       type: 'number', placeholder: '0' },
            { key: 'seuil_alerte', label: 'Seuil alerte stock',  type: 'number', placeholder: '5' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--mj-text-3)', marginBottom: 6, fontWeight: 600 }}>
                {f.label}
              </label>
              <input
                type={f.type}
                className="mj-input"
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--mj-text-3)', marginBottom: 6, fontWeight: 600 }}>
              Description
            </label>
            <textarea
              className="mj-input"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description du produit…"
              style={{ width: '100%', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--mj-red-light)', borderRadius: 10,
              fontSize: 13, color: '#E30613', border: '1px solid rgba(227,6,19,0.2)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} className="mj-btn mj-btn-secondary">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting} className="mj-btn mj-btn-primary">
              {submitting ? 'Sauvegarde…' : produit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProducts;
