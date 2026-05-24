import React, { useState, useEffect } from 'react';
import api, { mediaUrl } from '../../services/api';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import '../../styles/marjane.css';

/**
 * FavoritesPage — Page favoris client (boutiques + produits)
 * Route : /client/favoris
 */

const HeartIcon = ({ filled, onClick }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    style={{
      background: 'white',
      border: 'none',
      borderRadius: '50%',
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      transition: 'transform 0.2s ease',
      flexShrink: 0,
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    title="Retirer des favoris"
  >
    <svg viewBox="0 0 24 24" width="16" height="16"
      fill={filled ? '#E30613' : 'none'}
      stroke={filled ? '#E30613' : '#999'}
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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

  const formatPrice = (price) =>
    new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(price);

  return (
    <div className="mj-page" style={{ minHeight: '100vh', background: 'var(--mj-bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 28,
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'var(--mj-red-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}>
            ❤️
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--mj-text)',
              fontFamily: 'var(--mj-font)',
            }}>
              Mes Favoris
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--mj-text-3)', marginTop: 2 }}>
              {favoriBoutiques.length} boutique{favoriBoutiques.length !== 1 ? 's' : ''} · {favorisProduits.length} produit{favorisProduits.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--mj-border)',
          borderRadius: 14,
          width: 'fit-content',
          marginBottom: 24,
        }}>
          {[
            { key: 'boutiques', label: '🏪 Boutiques', count: favoriBoutiques.length },
            { key: 'produits',  label: '🛒 Produits',  count: favorisProduits.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--mj-font)',
                transition: 'all 0.2s ease',
                background: tab === t.key ? 'var(--mj-white)' : 'transparent',
                color: tab === t.key ? 'var(--mj-red)' : 'var(--mj-text-3)',
                boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t.label}
              <span style={{
                marginLeft: 6,
                background: tab === t.key ? 'var(--mj-red)' : 'var(--mj-text-3)',
                color: 'white',
                borderRadius: 20,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="mj-grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mj-card" style={{ overflow: 'hidden' }}>
                <div className="mj-skeleton" style={{ height: 140, borderRadius: 0, marginBottom: 12 }} />
                <div style={{ padding: '0 16px 16px' }}>
                  <div className="mj-skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                  <div className="mj-skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'boutiques' ? (
          favoriBoutiques.length === 0 ? (
            <div className="mj-empty">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
                Aucune boutique favorite
              </h3>
              <p style={{ margin: '0 0 20px', color: 'var(--mj-text-3)', fontSize: 14 }}>
                Parcourez le catalogue et appuyez sur ❤️ pour sauvegarder vos boutiques préférées.
              </p>
              <button
                className="mj-btn mj-btn-primary"
                onClick={() => window.location.href = '/client'}
              >
                Explorer le catalogue
              </button>
            </div>
          ) : (
            <div className="mj-grid-3 mj-fade-in">
              {favoriBoutiques.map(fav => {
                const boutique = boutiquesData[fav.boutique_id] || {};
                return (
                  <div
                    key={fav.id}
                    className="mj-card mj-card-hover"
                    style={{ overflow: 'hidden', cursor: 'pointer', padding: 0 }}
                  >
                    {/* Cover image */}
                    <div style={{
                      position: 'relative',
                      height: 140,
                      background: 'linear-gradient(135deg, var(--mj-red-light) 0%, #fff5f5 100%)',
                      overflow: 'hidden',
                    }}>
                      {boutique.photo_principale ? (
                        <img
                          src={boutique.photo_principale}
                          alt={boutique.nom}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 40,
                        }}>
                          🏪
                        </div>
                      )}
                      {/* Heart button */}
                      <div style={{ position: 'absolute', top: 10, right: 10 }}>
                        <HeartIcon filled onClick={() => toggleBoutique(fav.boutique_id)} />
                      </div>
                      {/* Category badge */}
                      {boutique.categorie && (
                        <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                          <span className="mj-badge" style={{
                            background: 'rgba(255,255,255,0.92)',
                            color: 'var(--mj-text)',
                            backdropFilter: 'blur(4px)',
                          }}>
                            {boutique.categorie}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: 16 }}>
                      <h3 style={{
                        margin: '0 0 6px',
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--mj-text)',
                        fontFamily: 'var(--mj-font)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {boutique.nom || `Boutique #${fav.boutique_id}`}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {boutique.note_moyenne && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 13,
                            color: '#F59E0B',
                            fontWeight: 600,
                          }}>
                            ★ {boutique.note_moyenne}
                          </span>
                        )}
                        {boutique.ville && (
                          <span style={{ fontSize: 12, color: 'var(--mj-text-3)' }}>
                            📍 {boutique.ville}
                          </span>
                        )}
                      </div>

                      <button
                        className="mj-btn mj-btn-outline-red mj-btn-full"
                        style={{ marginTop: 12 }}
                        onClick={() => window.location.href = `/client/boutique/${fav.boutique_id}`}
                      >
                        Voir la boutique
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Produits tab */
          favorisProduits.length === 0 ? (
            <div className="mj-empty">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
                Aucun produit favori
              </h3>
              <p style={{ margin: '0 0 20px', color: 'var(--mj-text-3)', fontSize: 14 }}>
                Ajoutez des produits à vos favoris en cliquant sur ❤️ dans le catalogue.
              </p>
              <button
                className="mj-btn mj-btn-primary"
                onClick={() => window.location.href = '/client'}
              >
                Explorer le catalogue
              </button>
            </div>
          ) : (
            <div className="mj-grid-3 mj-fade-in">
              {favorisProduits.map(fav => {
                const produit = produitsData[fav.produit_id] || {};
                return (
                  <div
                    key={fav.id}
                    className="mj-product-card"
                    style={{ position: 'relative' }}
                  >
                    {/* Image area */}
                    <div style={{
                      position: 'relative',
                      height: 160,
                      background: 'linear-gradient(135deg, #fff8f0 0%, #fff5f5 100%)',
                      borderRadius: '12px 12px 0 0',
                      overflow: 'hidden',
                      marginBottom: 12,
                    }}>
                      {mediaUrl(produit.image_principale || produit.image) ? (
                        <img
                          src={mediaUrl(produit.image_principale || produit.image)}
                          alt={produit.nom}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 36,
                        }}>
                          🛒
                        </div>
                      )}
                      {/* Heart remove */}
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <HeartIcon filled onClick={() => toggleProduit(fav.produit_id)} />
                      </div>
                    </div>

                    {/* Product info */}
                    <div style={{ padding: '0 4px 4px' }}>
                      <h3 style={{
                        margin: '0 0 6px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--mj-text)',
                        fontFamily: 'var(--mj-font)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {produit.nom || `Produit #${fav.produit_id}`}
                      </h3>

                      {produit.boutique_nom && (
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--mj-text-3)' }}>
                          🏪 {produit.boutique_nom}
                        </p>
                      )}

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 8,
                      }}>
                        {produit.prix ? (
                          <div>
                            <span className="mj-product-price">
                              {formatPrice(produit.prix)}
                            </span>
                            {produit.prix_original && produit.prix_original > produit.prix && (
                              <span style={{
                                fontSize: 11,
                                color: 'var(--mj-text-3)',
                                textDecoration: 'line-through',
                                marginLeft: 6,
                              }}>
                                {formatPrice(produit.prix_original)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--mj-text-3)' }}>—</span>
                        )}

                        <button
                          className="mj-btn mj-btn-primary mj-btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => window.location.href = '/client'}
                        >
                          + Panier
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
