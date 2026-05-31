import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Phone, MessageSquare, Package, CheckCircle, Clock, Truck, AlertCircle, MapPin, Star } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { commandesApi } from '../../services/api';
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
  warning: '#f59e0b',
  error:   '#ef4444',
  blue:    '#3b82f6',
};

/* ── Étapes de suivi ─────────────────────────────────────────────────────── */
const ETAPES_SUIVI = [
  { statut: 'EN_ATTENTE',     icon: '📋', labelKey: 'ot_step_received',  descKey: 'ot_step_received_desc' },
  { statut: 'VALIDEE',        icon: '✅', labelKey: 'status_VALIDEE',    descKey: 'ot_step_validated_desc' },
  { statut: 'EN_PREPARATION', icon: '👨‍🍳', labelKey: 'status_EN_PREPARATION', descKey: 'ot_step_prep_desc' },
  { statut: 'ASSIGNEE',       icon: '🚴', labelKey: 'ot_step_assigned',  descKey: 'ot_step_assigned_desc' },
  { statut: 'EN_ROUTE',       icon: '🛵', labelKey: 'status_EN_ROUTE',   descKey: 'ot_step_enroute_desc' },
  { statut: 'LIVREE',         icon: '🎉', labelKey: 'status_LIVREE',     descKey: 'ot_step_delivered_desc' },
];

const STATUT_ORDER = ['EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION', 'ASSIGNEE', 'EN_ROUTE', 'LIVREE'];

function getEtapeIndex(statut) {
  const i = STATUT_ORDER.indexOf(statut);
  return i === -1 ? 0 : i;
}

/* ── Icônes Leaflet ──────────────────────────────────────────────────────── */
const makeIcon = (color, emoji, size = 36) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid rgba(255,255,255,0.85);box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.45)}px">${emoji}</div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
});
const ICON_CLIENT  = makeIcon('#3b82f6', '🏠', 34);
const ICON_LIVREUR = makeIcon('#E30613', '🛵', 38);
const ICON_BOUTIQUE= makeIcon('#f59e0b', '🏪', 34);

/* ── Timeline verticale ──────────────────────────────────────────────────── */
const Timeline = ({ statut }) => {
  const { t } = useI18n();
  const currentIdx = getEtapeIndex(statut);
  const isCancelled = statut === 'ANNULEE';
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '20px 18px', border: `1px solid ${C.border}` }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>{t('ot_tracking_title')}</div>
      {ETAPES_SUIVI.map((e, i) => {
        const done    = i <= currentIdx && !isCancelled;
        const active  = i === currentIdx && !isCancelled;
        const pending = i > currentIdx || isCancelled;
        return (
          <div key={e.statut} style={{ display: 'flex', gap: 14, position: 'relative' }}>
            {/* Ligne verticale */}
            {i < ETAPES_SUIVI.length - 1 && (
              <div style={{
                position: 'absolute', left: 19, top: 40, width: 2, height: 'calc(100% - 10px)',
                background: done && i < currentIdx ? C.success : C.border,
                transition: 'background 0.5s',
              }} />
            )}
            {/* Pastille */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: done ? (active ? C.primary : C.success) : C.surface,
              border: `2px solid ${done ? (active ? C.primary : C.success) : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'all 0.4s',
              boxShadow: active ? `0 0 16px ${C.primary}66` : 'none',
              zIndex: 1, position: 'relative',
            }}>
              {done && !active ? <CheckCircle size={18} color="#fff" /> : <span>{e.icon}</span>}
            </div>
            {/* Texte */}
            <div style={{ flex: 1, paddingBottom: 20 }}>
              <div style={{ fontWeight: active ? 700 : 600, fontSize: 14, color: done ? C.text : C.text2 }}>
                {t(e.labelKey)}
                {active && <span style={{ marginLeft: 8, fontSize: 11, background: `${C.primary}20`, color: C.primary, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{t('ot_in_progress')}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}></div>
            </div>
          </div>
        );
      })}
      {isCancelled && (
        <div style={{ background: `${C.error}18`, border: `1px solid ${C.error}44`, borderRadius: 10, padding: '10px 14px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.error }}>
          <AlertCircle size={14} /> {t('ot_cancelled_msg')}
        </div>
      )}
    </div>
  );
};

/* ── Carte de suivi ──────────────────────────────────────────────────────── */
const CarteTracking = ({ commande }) => {
  const { t } = useI18n();
  const livreurLat = commande?.tracking?.latitude;
  const livreurLon = commande?.tracking?.longitude;
  const hasMap = livreurLat && livreurLon;

  if (!hasMap) {
    return (
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text2 }}>
        <MapPin size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontWeight: 600, fontSize: 14 }}>{t('ot_map_not_ready')}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Statut actuel : {commande?.statut || '–'}</div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}`, height: 280 }}>
      <MapContainer center={[livreurLat, livreurLon]} zoom={14} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Marker position={[livreurLat, livreurLon]} icon={ICON_LIVREUR}>
          <Popup>🛵 {t('ot_your_driver')}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════════════ */
export default function OrderTrackingPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const [commande, setCommande] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showAvis, setShowAvis] = useState(false);
  const [avis, setAvis] = useState({ note: 5, commentaire: '' });
  const [avisSent, setAvisSent] = useState(false);
  const intervalRef = useRef(null);

  const fetchCommande = useCallback(async () => {
    try {
      const res = await commandesApi.detail(id);
      setCommande(res.data);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError('Impossible de charger la commande.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCommande();
    // Auto-rafraîchissement toutes les 20s si commande active
    intervalRef.current = setInterval(() => {
      if (commande?.statut !== 'LIVREE' && commande?.statut !== 'ANNULEE') {
        fetchCommande();
      }
    }, 20000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCommande]);

  const envoyerAvis = async () => {
    try {
      await commandesApi.creerAvis(id, avis);
      setAvisSent(true);
    } catch { /* silencieux */ }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${C.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 15, color: C.text2 }}>{t('ot_loading')}</div>
      </div>
    </div>
  );

  if (error || !commande) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text, padding: 24 }}>
      <AlertCircle size={48} color={C.error} style={{ marginBottom: 16 }} />
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t('ot_not_found')}</div>
      <div style={{ fontSize: 14, color: C.text2, marginBottom: 24 }}>{error}</div>
      <button onClick={() => navigate('/client')}
        style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, cursor: 'pointer' }}>
        {t('ot_back_home')}
      </button>
    </div>
  );

  const etapeIdx   = getEtapeIndex(commande.statut);
  const etapeActuelle = ETAPES_SUIVI[etapeIdx];
  const isLivree   = commande.statut === 'LIVREE';
  const isAnnulee  = commande.statut === 'ANNULEE';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/client')}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 10px', color: C.text, cursor: 'pointer' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{t('otp_order_title')} #{commande.reference || commande.id}</div>
          <div style={{ fontSize: 11, color: C.text2 }}>{t('common_updated_at')} : {lastRefresh.toLocaleTimeString()}</div>
        </div>
        <button onClick={fetchCommande}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px', color: C.text2, cursor: 'pointer' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Statut actuel – carte principale */}
        {!isAnnulee && (
          <div style={{
            background: isLivree ? `${C.success}15` : `${C.primary}12`,
            border: `1px solid ${isLivree ? C.success : C.primary}44`,
            borderRadius: 20, padding: '22px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>{etapeActuelle.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: isLivree ? C.success : C.primary, marginBottom: 4 }}>
              {etapeActuelle.label}
            </div>
            <div style={{ fontSize: 13, color: C.text2 }}>{etapeActuelle.desc}</div>
            {!isLivree && (
              <div style={{ fontSize: 12, color: C.text2, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Clock size={12} /> {t('otp_auto_refresh')}
              </div>
            )}
          </div>
        )}

        {/* Carte GPS */}
        <CarteTracking commande={commande} />

        {/* Timeline */}
        <Timeline statut={commande.statut} />

        {/* Infos commande */}
        <div style={{ background: C.card, borderRadius: 16, padding: '18px 18px', border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{t('otp_details')}</div>
          {[
            { labelKey: 'otp_shop_label', value: commande.fondateur_detail?.nom_boutique || '–' },
            { labelKey: 'otp_address_label', value: commande.adresse_livraison || '–' },
            { labelKey: 'otp_articles_label', value: `${commande.lignes?.length || 0} article(s)` },
            { labelKey: 'otp_total_label', value: `${parseFloat(commande.montant_total || 0).toFixed(2)} MAD` },
          ].map(r => (
            <div key={r.labelKey} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.text2 }}>{t(r.labelKey)}</span>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Livreur – contact */}
        {commande.transporteur_detail && (
          <div style={{ background: C.card, borderRadius: 16, padding: '16px 18px', border: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={16} color={C.primary} /> {t('ot_your_driver')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${C.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {commande.transporteur_detail.prenom} {commande.transporteur_detail.nom}
                </div>
                {commande.transporteur_detail.vehicule && (
                  <div style={{ fontSize: 12, color: C.text2 }}>{commande.transporteur_detail.vehicule}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Avis (si livrée) */}
        {isLivree && !avisSent && (
          <div style={{ background: C.card, borderRadius: 16, padding: '18px 18px', border: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{t('otp_rate_experience')}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setAvis(a => ({ ...a, note: n }))}
                  style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', opacity: n <= avis.note ? 1 : 0.3, transition: 'opacity 0.2s' }}>
                  ⭐
                </button>
              ))}
            </div>
            <textarea
              value={avis.commentaire}
              onChange={e => setAvis(a => ({ ...a, commentaire: e.target.value }))}
              placeholder={t('ot_comment_ph')}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <button onClick={envoyerAvis}
              style={{ width: '100%', marginTop: 12, background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {t('otp_send_review')}
            </button>
          </div>
        )}
        {avisSent && (
          <div style={{ background: `${C.success}15`, border: `1px solid ${C.success}44`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.success }}>
            <CheckCircle size={18} /> {t('otp_thanks_review')}
          </div>
        )}

        <button onClick={() => navigate('/client')}
          style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 0', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: 4 }}>
          {t('ot_back_home')}
        </button>
      </div>

      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
