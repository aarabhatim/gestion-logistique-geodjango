/**
 * Page Gamification du chauffeur.
 * Route : /chauffeur/gamification
 *
 * Affiche :
 *  - Niveau actuel (Bronze → Platine) avec jauge circulaire
 *  - 4 jauges linéaires des sous-dimensions du score
 *  - Grille des badges obtenus (avec effet brillance sur les récents)
 *  - Grille de tous les badges disponibles (grisés si non obtenus)
 *  - Classement top 20 transporteurs
 */
import { useState, useEffect } from 'react';
import { Trophy, Star, Award, Users, RefreshCw, Zap } from 'lucide-react';
import { chauffeurApi } from '../../services/api';
import { motion } from 'framer-motion';

// ─── Jauge circulaire SVG ─────────────────────────────────────────────────────
function JaugeCirculaire({ pct = 0, niveau, couleur, size = 120 }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  const NIVEAU_COLORS = {
    BRONZE: '#cd7f32', ARGENT: '#c0c0c0', OR: '#fbbf24', PLATINE: '#818cf8',
  };
  const NIVEAU_EMOJIS = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', PLATINE: '💎' };
  const c = NIVEAU_COLORS[niveau] || couleur || '#6366f1';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={c} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <div style={{ fontSize: 24 }}>{NIVEAU_EMOJIS[niveau] || '🏅'}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{niveau}</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{pct}%</div>
      </div>
    </div>
  );
}

// ─── Jauge linéaire ───────────────────────────────────────────────────────────
function JaugeLineaire({ label, valeur, max = 100, couleur }) {
  const pct = Math.min(100, Math.round((valeur / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: couleur, fontWeight: 700 }}>{valeur?.toFixed ? valeur.toFixed(1) : valeur}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ height: '100%', background: couleur, borderRadius: 3 }}
        />
      </div>
    </div>
  );
}

// ─── Badge Card ───────────────────────────────────────────────────────────────
function BadgeCard({ badge, obtenu, estNouveau }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.04 }}
      style={{
        background: obtenu ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${obtenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 12,
        padding: '0.875rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        filter: obtenu ? 'none' : 'grayscale(0.8)',
        opacity: obtenu ? 1 : 0.5,
      }}
    >
      {/* Effet brillance pour les nouveaux badges */}
      {estNouveau && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.5, repeat: 3, repeatDelay: 0.5 }}
          style={{
            position: 'absolute', inset: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      {estNouveau && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: '#f59e0b', color: 'black', fontSize: 8, fontWeight: 800,
          padding: '2px 5px', borderRadius: 4,
        }}>
          NOUVEAU
        </div>
      )}

      <div style={{ fontSize: 32, marginBottom: 4 }}>{badge.icone}</div>
      <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>{badge.nom}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{badge.description}</div>
      {obtenu && badge.obtenu_le && (
        <div style={{ fontSize: 9, color: '#6366f1', marginTop: 6 }}>
          {new Date(badge.obtenu_le).toLocaleDateString('fr-FR')}
        </div>
      )}
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function GamificationPage() {
  const [badges, setBadges] = useState(null);
  const [niveau, setNiveau] = useState(null);
  const [classement, setClassement] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' | 'classement'
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [bRes, nRes, cRes] = await Promise.all([
          chauffeurApi.badges(),
          chauffeurApi.niveau(),
          chauffeurApi.classement({ periode: 'mois' }),
        ]);
        setBadges(bRes.data);
        setNiveau(nRes.data);
        setClassement(cRes.data?.classement || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const verifierBadges = async () => {
    setVerifying(true);
    try {
      const res = await chauffeurApi.badgesVerifier();
      if (res.data.nb_nouveaux > 0) {
        // Recharger les badges
        const bRes = await chauffeurApi.badges();
        setBadges(bRes.data);
        const nRes = await chauffeurApi.niveau();
        setNiveau(nRes.data);
      }
      alert(res.data.message);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const niveauColors = {
    BRONZE: '#cd7f32', ARGENT: '#c0c0c0', OR: '#fbbf24', PLATINE: '#818cf8',
  };
  const nc = niveau ? niveauColors[niveau.niveau] || '#6366f1' : '#6366f1';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="spin" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🏆 Gamification & Badges</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Progression, badges et classement
          </p>
        </div>
        <button
          onClick={verifierBadges}
          disabled={verifying}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            border: '1px solid rgba(251,191,36,0.3)',
            background: 'rgba(251,191,36,0.1)', color: '#fbbf24',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
          {verifying ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
          Vérifier mes badges
        </button>
      </div>

      {/* Niveau + progression */}
      {niveau && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <JaugeCirculaire
              pct={niveau.progression_pct}
              niveau={niveau.niveau}
              couleur={nc}
              size={130}
            />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: nc, marginBottom: 4 }}>
                Niveau {niveau.niveau}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {niveau.points?.toLocaleString()} points
                {niveau.prochain_niveau && ` · ${niveau.points_vers_prochain} pts vers ${niveau.prochain_niveau}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(niveau.avantages || []).map((av, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ color: nc }}>✓</span> {av}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {[
          { key: 'badges', label: `🏅 Mes badges (${badges?.total_obtenus || 0})` },
          { key: 'tous', label: `📋 Tous (${badges?.total_disponibles || 0})` },
          { key: 'classement', label: `🏆 Classement` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: activeTab === t.key ? '#818cf8' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: activeTab === t.key ? 700 : 400,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Badges obtenus */}
      {activeTab === 'badges' && (
        <>
          {(badges?.obtenus || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏅</div>
              <div style={{ fontWeight: 600 }}>Aucun badge obtenu pour l'instant</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Continuez vos livraisons pour débloquer vos premiers badges !</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.875rem' }}>
              {(badges?.obtenus || []).map(b => (
                <BadgeCard key={b.id} badge={b} obtenu estNouveau={b.est_nouveau} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Tous les badges */}
      {activeTab === 'tous' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.875rem' }}>
          {(badges?.tous || []).map(b => (
            <BadgeCard key={b.id} badge={b} obtenu={b.obtenu} estNouveau={false} />
          ))}
        </div>
      )}

      {/* Classement */}
      {activeTab === 'classement' && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Top 20 ce mois
          </div>
          {classement.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Aucune donnée</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {classement.map((t, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const niveauC = niveauColors[t.niveau] || '#64748b';
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '0.625rem 0.875rem',
                      background: i < 3 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 10,
                      border: i < 3 ? '1px solid rgba(251,191,36,0.12)' : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 13, color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {i < 3 ? medals[i] : t.rang}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                        <span>⭐ {t.note_moyenne?.toFixed(1)}</span>
                        <span>{t.livraisons_periode} livraisons ce mois</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: niveauC,
                      background: `${niveauC}15`, border: `1px solid ${niveauC}25`,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      {t.niveau}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
