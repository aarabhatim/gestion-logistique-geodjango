import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';

const StoreProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('produits/');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient">Catalogue Produits</h1>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Nouveau Produit
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th className="p-3">Image</th>
                <th className="p-3">Nom</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Prix</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-secondary">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="p-3">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].image} alt={p.nom} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium">{p.nom}</td>
                    <td className="p-3">{p.categorie}</td>
                    <td className="p-3">{p.prix} MAD</td>
                    <td className="p-3">
                      <span style={{ color: p.stock < 5 ? 'var(--danger-color)' : 'inherit' }}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`badge ${p.disponible ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {p.disponible ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-icon" title="Modifier"><Edit2 size={16} /></button>
                        <button className="btn btn-icon" style={{ color: 'var(--danger-color)' }} title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StoreProducts;
