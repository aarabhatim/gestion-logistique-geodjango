import React, { useEffect } from 'react';
import useCartStore from '../stores/cartStore';

/**
 * CartSlideover — Panier panneau latéral slide-over (mobile-first)
 * Remplace le panier page dédiée par un slide-over depuis la droite.
 *
 * Usage dans ClientDashboard :
 *   import CartSlideover from '../../components/CartSlideover';
 *   const [cartOpen, setCartOpen] = useState(false);
 *   <CartSlideover open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={openCheckout} />
 */

const CartSlideover = ({ open, onClose, onCheckout }) => {
  const rawItems   = useCartStore(s => s.items || []);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQty  = useCartStore(s => s.updateQuantite);
  const clearCart  = useCartStore(s => s.clearCart);

  // Normaliser vers { id, nom, prix, image, quantite, fondateurId }
  const items = rawItems.map(i => ({
    id:          i.produit?.id,
    nom:         i.produit?.nom || 'Produit',
    prix:        parseFloat(i.produit?.prix_effectif || i.produit?.prix || 0),
    image:       i.produit?.image || null,
    quantite:    i.quantite,
    fondateurId: i.fondateurId,
  }));

  // Bloquer le scroll quand ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const total = items.reduce((acc, item) => acc + item.prix * item.quantite, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ zIndex: 'var(--z-modal, 300)' }}
        onClick={onClose}
      />

      {/* Panneau */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-sm bg-[var(--color-surface)] shadow-2xl
          flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ zIndex: 'calc(var(--z-modal, 300) + 1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text)] text-lg font-heading">
            Mon panier ({items.length})
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl transition-colors">✕</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-5xl mb-3">🛍️</span>
              <p className="font-semibold text-[var(--color-text)]">Votre panier est vide</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ajoutez des articles pour commencer</p>
              <button onClick={onClose} className="mt-4 text-[var(--color-primary)] text-sm font-medium">Explorer le catalogue →</button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-alt)]">
                {item.image ? (
                  <img src={item.image} alt={item.nom} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[var(--color-border)] flex-shrink-0 flex items-center justify-center text-2xl">🍔</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">{item.nom}</p>
                  <p className="text-[var(--color-primary)] text-sm font-medium">
                    {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(item.prix)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => item.quantite <= 1 ? removeItem(item.id, item.fondateurId) : updateQty(item.id, item.fondateurId, item.quantite - 1)}
                    className="w-7 h-7 rounded-full bg-[var(--color-border)] text-[var(--color-text)] text-sm font-bold flex items-center justify-center hover:bg-[var(--color-danger-10)] transition-colors"
                  >−</button>
                  <span className="w-5 text-center text-sm font-semibold">{item.quantite}</span>
                  <button
                    onClick={() => updateQty(item.id, item.fondateurId, item.quantite + 1)}
                    className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center hover:bg-[var(--color-primary-dark)] transition-colors"
                  >+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[var(--color-border)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-secondary)]">Total</span>
              <span className="text-lg font-bold text-[var(--color-text)]">
                {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(total)}
              </span>
            </div>
            <button
              onClick={() => { onClose(); onCheckout?.(); }}
              className="w-full bg-[var(--color-primary)] text-white py-3.5 rounded-xl font-semibold hover:bg-[var(--color-primary-dark)] transition-colors text-sm"
            >
              Commander — {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(total)}
            </button>
            <button
              onClick={clearCart}
              className="w-full text-[var(--color-text-muted)] text-xs hover:text-[var(--color-danger)] transition-colors"
            >
              Vider le panier
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSlideover;
