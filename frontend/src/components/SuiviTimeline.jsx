/**
 * Timeline verticale animée du suivi de livraison — partie Client.
 * Affiche les étapes de la commande, le chauffeur assigné, l'ETA,
 * et une animation confetti lors de la livraison réussie.
 *
 * Usage :
 *   <SuiviTimeline commande={cmd} livraison={liv} onContact={() => {}} />
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Package, Truck, MapPin, Phone, MessageSquare, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Config des étapes ────────────────────────────────────────────────────────
const ETAPES = [
  {
    statuts: ['EN_ATTENTE'],
    label: 'Commande reçue',
    desc: 'Votre commande a été enregistrée et est en attente de validation.',
    icon: Package,
    color: '#f59e0b',
  },
  {
    statuts: ['VALIDEE', 'EN_PREPARATION'],
    label: 'En préparation',
    desc: 'La boutique prépare votre commande.',
    icon: Package,
    color: '#8b5cf6',
  },
  {
    statuts: ['EN_ROUTE'],
    label: 'En route',
    desc: 'Votre commande est en cours de livraison.',
    icon: Truck,
    color: '#06b6d4',
  },
  {
    statuts: ['LIVREE'],
    label: 'Livrée',
    desc: 'Votre commande a été livrée avec succès !',
    icon: CheckCircle,
    color: '#10b981',
  },
];

function getEtapeIndex(statut) {
  return ETAPES.findIndex(e => e.statuts.includes(statut));
}

// ─── Confetti simple CSS ───────────────────────────────────────────────────────
function Confetti({ active }) {
  const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];
  if (!active) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: Math.random() * window.innerWidth, opacity: 1, rotate: 0 }}
          animate={{ y: window.innerHeight + 20, rotate: Math.random() * 720, opacity: 0 }}
          transition={{ duration: 2.5 + Math.random() * 1.5, delay: Math.random() * 0.8, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: 8 + Math.random() * 8,
            height: 8 + Math.random() * 8,
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            background: colors[Math.floor(Math.random() * colors.length)],
          }}
        />
      ))}
    </div>
  );
}

// ─── Barre ETA ────────────────────────────────────────────────────────────────
function ETABar({ eta }) {
  const [minutesLeft, setMinutesLeft] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!eta) return;
    const update = () => {
      const now = Date.now();
      const etaMs = new Date(eta).getTime();
      const diffMs = etaMs - now;
      const mins = Math.max(0, Math.ceil(diffMs / 60000));
      setMinutesLeft(mins);
      // assume ~30 min total pour la progression
      const totalMs = 30 * 60 * 1000;
      const pct = Math.min(100, Math.max(0, (1 - diffMs / totalMs) * 100));
      setProgress(pct);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [eta]);

  if (!eta || minutesLeft === null) return null;

  return (
    <div style={{
      padding: '0.75rem 1rem',
      background: 'rgba(6,182,212,0.08)',
      borderRadius: 12,
      border: '1px solid rgba(6,182,212,0.2)',
      marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} /> Arrivée estimée
        </span>
        <span style={{ color: 'white', fontWeight: 700 }}>
          {minutesLeft === 0 ? 'Imminent !' : `~${minutesLeft} min`}
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', borderRadius: 3 }}
        />
      </div>
    </div>
  );
}

// ─── Carte chauffeur ──────────────────────────────────────────────────────────
function CardChauffeur({ transporteur, onContact }) {
  if (!transporteur) return null;
  const nom = transporteur.nom_complet || `${transporteur.first_name || ''} ${transporteur.last_name || ''}`.trim() || 'Chauffeur';
  const note = transporteur.note_moyenne || transporteur.rating;
  const vehicule = transporteur.vehicule_type || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0.875rem 1rem',
        background: 'rgba(16,185,129,0.08)',
        borderRadius: 14,
        border: '1px solid rgba(16,185,129,0.2)',
        marginBottom: '1rem',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
        boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
      }}>
        🚗
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 2 }}>{nom}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
          {note !== undefined && note !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#f59e0b' }}>
              <Star size={11} fill="#f59e0b" /> {Number(note).toFixed(1)}
            </span>
          )}
          {vehicule && <span>{vehicule}</span>}
        </div>
      </div>

      {onContact && (
        <button
          onClick={onContact}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20,
            background: 'rgba(16,185,129,0.2)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <MessageSquare size={13} /> Contacter
        </button>
      )}
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SuiviTimeline({ commande, livraison, onContact }) {
  const statut = commande?.statut || 'EN_ATTENTE';
  const etapeActive = getEtapeIndex(statut);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevStatut = useRef(statut);

  // Déclencher confetti quand la commande passe à LIVREE
  useEffect(() => {
    if (prevStatut.current !== 'LIVREE' && statut === 'LIVREE') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
    prevStatut.current = statut;
  }, [statut]);

  const eta = livraison?.eta;
  const transporteur = commande?.transporteur_detail;

  return (
    <div>
      <Confetti active={showConfetti} />

      {/* ETA bar */}
      {statut === 'EN_ROUTE' && <ETABar eta={eta} />}

      {/* Carte chauffeur */}
      {(statut === 'EN_ROUTE' || statut === 'EN_PREPARATION') && transporteur && (
        <CardChauffeur transporteur={transporteur} onContact={onContact} />
      )}

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        {/* Ligne verticale */}
        <div style={{
          position: 'absolute', left: 11, top: 8,
          width: 2, bottom: 8,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
        }} />
        {/* Progression de la ligne */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${(etapeActive / (ETAPES.length - 1)) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            position: 'absolute', left: 11, top: 8,
            width: 2,
            background: 'linear-gradient(180deg, #6366f1, #10b981)',
            borderRadius: 2, transformOrigin: 'top',
          }}
        />

        {ETAPES.map((etape, idx) => {
          const done = idx < etapeActive;
          const active = idx === etapeActive;
          const Icon = etape.icon;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              style={{
                position: 'relative',
                marginBottom: idx < ETAPES.length - 1 ? '1.5rem' : 0,
              }}
            >
              {/* Dot */}
              <div style={{
                position: 'absolute',
                left: -26,
                top: 0,
                width: 22, height: 22,
                borderRadius: '50%',
                background: done || active ? etape.color : 'rgba(255,255,255,0.08)',
                border: `2px solid ${done || active ? etape.color : 'rgba(255,255,255,0.12)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? `0 0 0 4px ${etape.color}25` : 'none',
                transition: 'all 0.3s',
                zIndex: 1,
              }}>
                {done ? (
                  <CheckCircle size={12} color="white" />
                ) : active ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    <Icon size={11} color="white" />
                  </motion.div>
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                )}
              </div>

              {/* Contenu */}
              <div style={{
                opacity: done || active ? 1 : 0.35,
                transition: 'opacity 0.3s',
              }}>
                <div style={{
                  fontWeight: active ? 700 : 600,
                  fontSize: active ? 15 : 13,
                  color: active ? etape.color : (done ? 'white' : 'var(--text-secondary)'),
                  marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {etape.label}
                  {active && statut !== 'LIVREE' && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: etape.color,
                      }}
                    />
                  )}
                  {active && statut === 'LIVREE' && <span>🎉</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {etape.desc}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Photo preuve de livraison */}
      {statut === 'LIVREE' && livraison?.photo_preuve && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '1rem' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            📷 Photo de preuve de livraison
          </div>
          <img
            src={livraison.photo_preuve}
            alt="Preuve de livraison"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </motion.div>
      )}
    </div>
  );
}
