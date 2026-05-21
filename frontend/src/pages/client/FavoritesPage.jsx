import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

/**
 * FavoritesPage — Page favoris client (boutiques + produits)
 * Route : /client/favoris
 * Ajouter dans le router : <Route path="/client/favoris" element={<FavoritesPage />} />
 */

const HeartIcon = ({ filled, onClick, className = '' }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    className={`transition-all duration-200 ${className}`}
  >
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  </button>
);

const FavoritesPage = () => {
  const [tab, setTab] = useState('boutiques');
  const [favoriBoutiques, setFavoriBoutiques] = useState([]);
  const [favorisProduits, setFavorisProduits] = useState([]);
  const [boutiquesData, setBoutiquesData] = useState({});
  const [produitsData, setProduitsData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoris = async () => {
      setLoading(true);
      try {
        const [boutiqueRes, produitRes] = await Promise.all([
          api.get('/favoris/boutiques/'),
          api.get('/favoris/produits/'),
        ]);
        setFavoriBoutiques(boutiqueRes.data);
        setFavorisProduits(produitRes.data);

        // Fetch boutique details
        const boutiqueIds = boutiqueRes.data.map(f => f.boutique_id);
        const boutiqueDetails = {};
        await Promise.all(
          boutiqueIds.map(id =>
            api.get(`/fondateurs/boutiques/${id}/`)
              .then(r => { boutiqueDetails[id] = r.data; })
              .catch(() => {})
          )
        );
        setBoutiquesData(boutiqueDetails);

        // Fetch produit details
        const produitIds = produitRes.data.map(f => f.produit_id);
        const produitDetails = {};
        await Promise.all(
          produitIds.map(id =>
            api.get(`/fondateurs/produits/${id}/`)
              .then(r => { produitDetails[id] = r.data; })
              .catch(() => {})
          )
        );
        setProduitsData(produitDetails);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFavoris();
  }, []);

  const toggleBoutique = async (boutiqueId) => {
    await api.post(`/favoris/boutiques/${boutiqueId}/toggle/`);
    setFavoriBoutiques(prev => prev.filter(f => f.boutique_id !== boutiqueId));
  };

  const toggleProduit = async (produitId) => {
    await api.post(`/favoris/produits/${produitId}/toggle/`);
    setFavorisProduits(prev => prev.filter(f => f.produit_id !== produitId));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">❤️</span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] font-heading">Mes Favoris</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {favoriBoutiques.length} boutique{favoriBoutiques.length > 1 ? 's' : ''} · {favorisProduits.length} produit{favorisProduits.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-surface-alt)] rounded-xl w-fit mb-6">
        {[
          { key: 'boutiques', label: '🏪 Boutiques', count: favoriBoutiques.length },
          { key: 'produits',  label: '🍔 Produits',  count: favorisProduits.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tab === 'boutiques' ? (
        favoriBoutiques.length === 0 ? (
          <EmptyState
            type="favorites"
            title="Aucune boutique favorite"
            description="Parcourez le catalogue et appuyez sur ❤️ pour sauvegarder vos boutiques préférées."
            action={() => window.location.href = '/client'}
            actionLabel="Explorer le catalogue"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriBoutiques.map(fav => {
              const boutique = boutiquesData[fav.boutique_id] || {};
              return (
                <div
                  key={fav.id}
                  className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="relative h-32 bg-gradient-to-br from-[var(--color-primary-10)] to-[var(--color-surface-alt)]">
                    {boutique.photo_principale && (
                      <img
                        src={boutique.photo_principale}
                        alt={boutique.nom}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <HeartIcon
                      filled
                      onClick={() => toggleBoutique(fav.boutique_id)}
                      className="absolute top-2 right-2 text-[var(--color-danger)] bg-white rounded-full p-1.5 shadow-sm"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-[var(--color-text)] truncate">
                      {boutique.nom || `Boutique #${fav.boutique_id}`}
                    </h3>
                    {boutique.categorie && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{boutique.categorie}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {boutique.note_moyenne && (
                        <span className="text-xs text-[var(--color-warning)] font-medium">★ {boutique.note_moyenne}</span>
                      )}
                      {boutique.ville && (
                        <span className="text-xs text-[var(--color-text-secondary)]">📍 {boutique.ville}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        favorisProduits.length === 0 ? (
          <EmptyState
            type="favorites"
            title="Aucun produit favori"
            description="Ajoutez des produits à vos favoris en cliquant sur ❤️ dans le catalogue."
            action={() => window.location.href = '/client'}
            actionLabel="Explorer le catalogue"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorisProduits.map(fav => {
              const produit = produitsData[fav.produit_id] || {};
              return (
                <div
                  key={fav.id}
                  className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-all hover:-translate-y-0.5"
                >
                  <div className="relative h-24 bg-gradient-to-br from-orange-50 to-amber-50">
                    {produit.image && (
                      <img src={produit.image} alt={produit.nom} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <HeartIcon
                      filled
                      onClick={() => toggleProduit(fav.produit_id)}
                      className="absolute top-2 right-2 text-[var(--color-danger)] bg-white rounded-full p-1.5 shadow-sm"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--color-text)] text-sm truncate">
                        {produit.nom || `Produit #${fav.produit_id}`}
                      </h3>
                      {produit.prix && (
                        <p className="text-[var(--color-primary)] font-semibold text-sm mt-0.5">
                          {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(produit.prix)}
                        </p>
                      )}
                    </div>
                    <button className="ml-2 bg-[var(--color-primary)] text-white text-xs px-2 py-1 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors flex-shrink-0">
                      + Panier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default FavoritesPage;
