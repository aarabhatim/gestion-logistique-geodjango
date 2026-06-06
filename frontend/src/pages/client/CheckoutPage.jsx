import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ShoppingCart, MapPin, Tag, CreditCard, CheckCircle,
  Minus, Plus, Trash2, Package, Truck, ChevronRight, Loader,
  AlertCircle, Gift, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../../stores/cartStore';
import { commandesApi, promotionsApi } from '../../services/api';
import { mediaUrl } from '../../services/api';
import { useI18n } from '../../contexts/I18nContext';

/* ── Thème ───────────────────────────────────────────────────────────────── */
const C = {
  bg:      '#0f172a',
  surface: '#1e293b',
  card:    '#263048',
  primary: '#E30613',
  text:    '#f1f5f9',
  text2:   '#94a3b8',
  border:  'rgba(255,255,255,0.08)',
  success: '#22c55e',
  error:   '#ef4444',
  warning: '#f59e0b',
};

/* ── Frais livraison fictifs (en production → appel API zone) ─────────────── */
const FRAIS_LIVRAISON = 15;

/* ── Étapes du tunnel ─────────────────────────────────────────────────────── */
const ETAPES_DEFS = [
  { id: 'panier',       labelKey: 'ck_step_cart',      icon: ShoppingCart },
  { id: 'adresse',      labelKey: 'ck_step_address',   icon: MapPin },
  { id: 'promo',        labelKey: 'ck_step_recap',     icon: Tag },
  { id: 'paiement',     labelKey: 'ck_step_payment',   icon: CreditCard },
  { id: 'confirmation', labelKey: 'ck_step_confirmed', icon: CheckCircle },
];

/* ── Stepper ─────────────────────────────────────────────────────────────── */
const Stepper = ({ current }) => {
  const { t } = useI18n();
  const ETAPES = ETAPES_DEFS.map(e => ({ ...e, label: t(e.labelKey) }));
  const ci = ETAPES.findIndex(e => e.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
      {ETAPES.map((e, i) => {
        const done = i < ci;
        const active = i === ci;
        const Icon = e.icon;
        return (
          <React.Fragment key={e.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: done ? C.success : active ? C.primary : C.card,
                border: `2px solid ${done ? C.success : active ? C.primary : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: active ? `0 0 16px ${C.primary}55` : 'none',
              }}>
                {done
                  ? <CheckCircle size={18} color="#fff" />
                  : <Icon size={16} color={active ? '#fff' : C.text2} />
                }
              </div>
              <span style={{
                fontSize: 11, marginTop: 6, fontWeight: active ? 700 : 400,
                color: active ? C.text : done ? C.success : C.text2,
                whiteSpace: 'nowrap',
              }}>{e.label}</span>
            </div>
            {i < ETAPES.length - 1 && (
              <div style={{
                flex: 1, height: 2, minWidth: 20, marginTop: -18,
                background: i < ci ? C.success : C.border,
                transition: 'background 0.4s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Carte produit panier ────────────────────────────────────────────────── */
const CartItemRow = ({ item, onQty, onRemove }) => {
  const prix = item.produit.prix_effectif ?? item.produit.prix ?? 0;
  const img  = mediaUrl(item.produit.image);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: C.card, borderRadius: 12, padding: '12px 14px',
      border: `1px solid ${C.border}`, marginBottom: 10,
    }}>
      {img
        ? <img src={img} alt={item.produit.nom} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }} />
        : <div style={{ width: 52, height: 52, borderRadius: 8, background: `${C.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>
      }
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2 }}>{item.produit.nom}</div>
        <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>{prix.toFixed(2)} MAD</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onQty(item.produit.id, item.fondateurId, item.quantite - 1)}
          style={{ width: 28, height: 28, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={12} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, minWidth: 20, textAlign: 'center' }}>{item.quantite}</span>
        <button onClick={() => onQty(item.produit.id, item.fondateurId, item.quantite + 1)}
          style={{ width: 28, height: 28, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={12} />
        </button>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, minWidth: 60, textAlign: 'right' }}>
        {(prix * item.quantite).toFixed(2)} MAD
      </div>
      <button onClick={() => onRemove(item.produit.id, item.fondateurId)}
        style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', padding: 4, borderRadius: 6 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

/* ── Champ de saisie ─────────────────────────────────────────────────────── */
const Input = ({ label, placeholder, value, onChange, type = 'text', required, error }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 6 }}>
      {label} {required && <span style={{ color: C.primary }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px', background: C.card,
        border: `1px solid ${error ? C.error : C.border}`, borderRadius: 10,
        color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = C.primary}
      onBlur={e => e.target.style.borderColor = error ? C.error : C.border}
    />
    {error && <div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>{error}</div>}
  </div>
);

/* ── Récapitulatif commande (montants) ───────────────────────────────────── */
const RecapMontants = ({ sousTotal, frais, reduction, total }) => {
  const { t } = useI18n();
  return (
  <div style={{ background: C.card, borderRadius: 12, padding: '16px 18px', border: `1px solid ${C.border}` }}>
    {[
      { label: t('co_subtotal') || 'Sous-total', val: sousTotal.toFixed(2) },
      { label: t('ck_delivery_fees'), val: `+${frais.toFixed(2)}` },
      reduction > 0 && { label: t('lbl_promo_discount') || 'Réduction promo', val: `-${reduction.toFixed(2)}`, color: C.success },
    ].filter(Boolean).map(r => (
      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: C.text2 }}>{r.label}</span>
        <span style={{ fontSize: 13, color: r.color || C.text, fontWeight: 600 }}>{r.val} MAD</span>
      </div>
    ))}
    <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{t('ck_total')}</span>
      <span style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>{total.toFixed(2)} MAD</span>
    </div>
  </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════════════ */
export default function CheckoutPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { items, fondateurs, updateQuantite, removeItem, clearCart, codesPromos, appliquerCodePromo, retirerCodePromo } = useCartStore();

  const [etape, setEtape] = useState('panier');
  const [adresse, setAdresse] = useState({ rue: '', ville: '', quartier: '', details: '' });
  const [adresseErrors, setAdresseErrors] = useState({});
  const [codePromo, setCodePromo] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null);
  const [modePaiement, setModePaiement] = useState('CARTE');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [commandeCreee, setCommandeCreee] = useState(null);
  const etapes = ETAPES_DEFS.map(e => ({ ...e, label: t(e.labelKey) }));

  /* Grouper par boutique */
  const groupsBoutique = Object.keys(fondateurs).map(fid => ({
    fondateur: fondateurs[fid],
    items: items.filter(i => String(i.fondateurId) === String(fid)),
  })).filter(g => g.items.length > 0);

  /* Calculs financiers pour la première boutique (simplifié pour mono-boutique) */
  const firstGroup = groupsBoutique[0];
  const fondateurId = firstGroup?.fondateur?.id;
  const promo = fondateurId ? codesPromos[fondateurId] : null;

  const sousTotal = items.reduce((s, i) => s + (i.produit.prix_effectif ?? i.produit.prix ?? 0) * i.quantite, 0);
  const reduction  = promo?.reduction ?? 0;
  const total      = Math.max(0, sousTotal + FRAIS_LIVRAISON - reduction);

  /* ── Valider adresse ────────────────────────────────────────────────────── */
  const validerAdresse = () => {
    const errors = {};
    if (!adresse.rue.trim())    errors.rue   = 'Adresse requise';
    if (!adresse.ville.trim())  errors.ville = 'Ville requise';
    setAdresseErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Appliquer code promo ───────────────────────────────────────────────── */
  const appliquerPromo = async () => {
    if (!codePromo.trim() || !fondateurId) return;
    setPromoLoading(true);
    setPromoMsg(null);
    try {
      const res = await fondateursApiProxy.verifierCode({ code: codePromo, fondateur: fondateurId });
      const montantReduc = res.data.reduction || 0;
      appliquerCodePromo(fondateurId, codePromo, montantReduc);
      setPromoMsg({ type: 'success', text: `Code appliqué ! Réduction de ${montantReduc.toFixed(2)} MAD` });
    } catch {
      setPromoMsg({ type: 'error', text: t('ck_promo_invalid') });
    } finally {
      setPromoLoading(false);
    }
  };

  /* Import dynamique pour éviter la circularité */
  const fondateursApiProxy = { verifierCode: (data) => import('../../services/api').then(m => m.fondateursApi.verifierCode(data)) };

  /* ── Créer la commande ──────────────────────────────────────────────────── */
  const passerCommande = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    const adresseComplete = [adresse.rue, adresse.quartier, adresse.ville].filter(Boolean).join(', ');
    try {
      // Une commande par boutique
      const promises = groupsBoutique.map(g => {
        const lignes = g.items.map(i => ({
          produit: i.produit.id,
          quantite: i.quantite,
          prix_unitaire: i.produit.prix_effectif ?? i.produit.prix,
        }));
        const promoG = codesPromos[g.fondateur.id];
        return commandesApi.create({
          fondateur: g.fondateur.id,
          adresse_livraison: adresseComplete,
          details_adresse: adresse.details,
          lignes,
          mode_paiement: modePaiement,
          code_promo: promoG?.code || null,
        });
      });
      const results = await Promise.all(promises);
      clearCart();
      setCommandeCreee(results[0].data);
      setEtape('confirmation');
    } catch (err) {
      setSubmitError(err.response?.data?.detail || t('ck_error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && etape !== 'confirmation') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: C.text }}>
        <ShoppingCart size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t('ck_empty_cart')}</div>
        <div style={{ fontSize: 14, color: C.text2, marginBottom: 24 }}>{t('ck_empty_sub')}</div>
        <button onClick={() => navigate('/client')}
          style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Explorer les boutiques
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => etape === 'panier' ? navigate('/client') : setEtape(etapes[etapes.findIndex(e => e.id === etape) - 1]?.id || 'panier')}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 10px', color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Commande</div>
          <div style={{ fontSize: 12, color: C.text2 }}>{items.reduce((s, i) => s + i.quantite, 0)} article(s)</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>{total.toFixed(2)} MAD</div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {etape !== 'confirmation' && <Stepper current={etape} />}

        {/* ── ÉTAPE 1 : Panier ─────────────────────────────────────────── */}
        {etape === 'panier' && (
          <>
            {groupsBoutique.map(g => (
              <div key={g.fondateur.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Package size={16} color={C.primary} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{g.fondateur.nom_boutique || g.fondateur.nom}</span>
                </div>
                {g.items.map(item => (
                  <CartItemRow
                    key={`${item.produit.id}-${item.fondateurId}`}
                    item={item}
                    onQty={(pid, fid, qty) => updateQuantite(pid, fid, qty)}
                    onRemove={(pid, fid) => removeItem(pid, fid)}
                  />
                ))}
              </div>
            ))}

            <RecapMontants sousTotal={sousTotal} frais={FRAIS_LIVRAISON} reduction={reduction} total={total} />

            <button
              onClick={() => setEtape('adresse')}
              style={{
                width: '100%', marginTop: 20, background: C.primary, color: '#fff',
                border: 'none', borderRadius: 14, padding: '16px 0', fontWeight: 800,
                fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                boxShadow: `0 8px 24px ${C.primary}44`,
              }}>
              {t('common_continue')} — {t('ck_step_address')} <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* ── ÉTAPE 2 : Adresse ────────────────────────────────────────── */}
        {etape === 'adresse' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} color={C.primary} /> Adresse de livraison
            </div>

            <Input label={t('lbl_street')} placeholder={t('ck_address_ph1')} value={adresse.rue}
              onChange={v => setAdresse(a => ({ ...a, rue: v }))} required error={adresseErrors.rue} />
            <Input label={t('lbl_district')} placeholder={t('ck_address_ph3')} value={adresse.quartier}
              onChange={v => setAdresse(a => ({ ...a, quartier: v }))} />
            <Input label={t('lbl_city')} placeholder={t('ck_address_ph2')} value={adresse.ville}
              onChange={v => setAdresse(a => ({ ...a, ville: v }))} required error={adresseErrors.ville} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Informations complémentaires</label>
              <textarea value={adresse.details} onChange={e => setAdresse(a => ({ ...a, details: e.target.value }))}
                placeholder={t('ck_address_ph4')}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <button onClick={() => { if (validerAdresse()) setEtape('promo'); }}
              style={{ width: '100%', marginTop: 8, background: C.primary, color: '#fff', border: 'none', borderRadius: 14, padding: '16px 0', fontWeight: 800, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {t('common_continue')} — {t('ck_step_recap')} <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* ── ÉTAPE 3 : Code promo + récap ─────────────────────────────── */}
        {etape === 'promo' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} color={C.primary} /> Récapitulatif & Code promo
            </div>

            {/* Récap adresse */}
            <div style={{ background: C.card, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>📍 Adresse de livraison</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {[adresse.rue, adresse.quartier, adresse.ville].filter(Boolean).join(', ')}
              </div>
              {adresse.details && <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{adresse.details}</div>}
            </div>

            {/* Code promo */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>
                <Gift size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Code promotionnel
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={codePromo}
                  onChange={e => setCodePromo(e.target.value.toUpperCase())}
                  placeholder="PROMO2025"
                  style={{ flex: 1, padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
                {promo
                  ? <button onClick={() => { retirerCodePromo(fondateurId); setCodePromo(''); setPromoMsg(null); }}
                      style={{ background: C.error, color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <X size={14} /> Retirer
                    </button>
                  : <button onClick={appliquerPromo} disabled={promoLoading || !codePromo.trim()}
                      style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', cursor: promoLoading ? 'wait' : 'pointer', fontWeight: 600, opacity: !codePromo.trim() ? 0.5 : 1 }}>
                      {promoLoading ? <Loader size={14} className="spin" /> : 'Appliquer'}
                    </button>
                }
              </div>
              {promoMsg && (
                <div style={{ fontSize: 12, marginTop: 6, color: promoMsg.type === 'success' ? C.success : C.error, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {promoMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {promoMsg.text}
                </div>
              )}
            </div>

            {/* Récap montants */}
            <RecapMontants sousTotal={sousTotal} frais={FRAIS_LIVRAISON} reduction={reduction} total={total} />

            {/* Délai estimé */}
            <div style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}40`, borderRadius: 12, padding: '12px 16px', marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Truck size={18} color={C.primary} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t('ck_delivery_estimate')}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{t('ck_delivery_time')}</div>
              </div>
            </div>

            <button onClick={() => setEtape('paiement')}
              style={{ width: '100%', marginTop: 20, background: C.primary, color: '#fff', border: 'none', borderRadius: 14, padding: '16px 0', fontWeight: 800, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {t('common_continue')} — {t('ck_step_payment')} <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* ── ÉTAPE 4 : Paiement ───────────────────────────────────────── */}
        {etape === 'paiement' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} color={C.primary} /> Mode de paiement
            </div>

            {[
              { id: 'CARTE', icon: '💳', label: t('ck_card_label'), desc: t('ck_card_desc') },
              { id: 'CASH',  icon: '💵', label: t('ck_cash_label'), desc: t('ck_cash_desc') },
            ].map(m => (
              <div key={m.id} onClick={() => setModePaiement(m.id)}
                style={{
                  background: modePaiement === m.id ? `${C.primary}18` : C.card,
                  border: `2px solid ${modePaiement === m.id ? C.primary : C.border}`,
                  borderRadius: 14, padding: '16px 18px', marginBottom: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all 0.2s ease',
                }}>
                <div style={{ fontSize: 28 }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{m.desc}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${modePaiement === m.id ? C.primary : C.border}`,
                  background: modePaiement === m.id ? C.primary : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {modePaiement === m.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </div>
            ))}

            {modePaiement === 'CARTE' && (
              <div style={{ background: C.card, borderRadius: 14, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <Input label={t('ck_card_number')} placeholder="1234 5678 9012 3456" value="" onChange={() => {}} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Input label={t('ck_expiry')} placeholder="MM/AA" value="" onChange={() => {}} />
                  <Input label="CVV" placeholder="123" value="" onChange={() => {}} type="password" />
                </div>
                <div style={{ fontSize: 12, color: C.text2, textAlign: 'center', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {t('ck_simulated')}
                </div>
              </div>
            )}

            <RecapMontants sousTotal={sousTotal} frais={FRAIS_LIVRAISON} reduction={reduction} total={total} />

            {submitError && (
              <div style={{ background: `${C.error}18`, border: `1px solid ${C.error}44`, borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 13, color: C.error, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} /> {submitError}
              </div>
            )}

            <button onClick={passerCommande} disabled={submitting}
              style={{
                width: '100%', marginTop: 20, background: submitting ? C.text2 : C.primary,
                color: '#fff', border: 'none', borderRadius: 14, padding: '16px 0',
                fontWeight: 800, fontSize: 16, cursor: submitting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: submitting ? 'none' : `0 8px 24px ${C.primary}44`,
                transition: 'all 0.3s',
              }}>
              {submitting
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Traitement en cours…</>
                : <><CheckCircle size={18} /> {t('action_confirm')} — {total.toFixed(2)} MAD</>
              }
            </button>
          </>
        )}

        {/* ── ÉTAPE 5 : Confirmation ───────────────────────────────────── */}
        {etape === 'confirmation' && (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: `${C.success}20`, border: `3px solid ${C.success}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', boxShadow: `0 0 32px ${C.success}44`,
            }}>
              <CheckCircle size={52} color={C.success} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>{t('ck_confirm_title')}</div>
            {commandeCreee && (
              <div style={{ fontSize: 14, color: C.text2, marginBottom: 24 }}>
                Référence : <strong style={{ color: C.text }}>#{commandeCreee.reference || commandeCreee.id}</strong>
              </div>
            )}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 28, textAlign: 'left', border: `1px solid ${C.border}` }}>
              {[
                { icon: '📦', label: t('ck_order_registered') },
                { icon: '✅', label: t('ck_store_validate') },
                { icon: '🚚', label: t('ck_driver_assigned') },
                { icon: '🔔', label: t('ck_notified') },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: C.text }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {commandeCreee && (
                <button onClick={() => navigate(`/client/suivi/${commandeCreee.id}`)}
                  style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: `0 8px 24px ${C.primary}44` }}>
                  📍 Suivre ma commande en temps réel
                </button>
              )}
              <button onClick={() => navigate('/client')}
                style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 0', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                {t('ot_back_home')}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
