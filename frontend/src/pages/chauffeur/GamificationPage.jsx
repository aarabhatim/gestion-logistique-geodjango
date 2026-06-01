/**
 * Page Gamification du chauffeur — thème Transporteur orange.
 * Route : /chauffeur/gamification
 */
import { useState, useEffect } from 'react';
import { Trophy, Star, Award, Users, RefreshCw, Zap } from 'lucide-react';
import { chauffeurApi } from '../../services/api';
import { useI18n } from '../../contexts/I18nContext';
import { motion } from 'framer-motion';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#0B0B0B',
  surface: '#161616',
  primary: '#FF8A00',
  primary2:'#FF6B00',
  text:    '#FFFFFF',
  text2:   '#A3A3A3',
  border:  'rgba(255,255,255,0.05)',
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#FACC15',
};
const gradient   = `linear-gradient(90deg, ${T.primary}, ${T.primary2})`;
const glowOrange = `0 8px 24px rgba(255,138,0,0.2)`;

// Niveau → couleur orange dégradée
const NIVEAU_COLORS = {
  BRONZE:  '#CD7F32',
  ARGENT:  '#C0C0C0',
  OR:      '#FBBF24',
  PLATINE: T.primary,
};
const NIVEAU_EMOJIS = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', PLATINE: '💎' };

// ─── Circular gauge ───────────────────────────────────────────────────────────
function JaugeCirculaire({ pct = 0, niveau, size = 130 }) {
  const r    = 48;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  const c    = NIVEAU_COLORS[niveau] || T.primary;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={c} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${c}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ fontSize: 26 }}>{NIVEAU_EMOJIS[niveau] || '🏅'}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: c }}>{niveau}</div>
        <div style={{ fontSize: 10, color: T.text2 }}>{pct}%</div>
      </div>
    </div>
  );
}

// ─── Linear gauge ─────────────────────────────────────────────────────────────
function JaugeLineaire({ label, valeur, max = 100, couleur }) {
  const pct = Math.min(100, Math.round((valeur / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: T.text2 }}>{label}</span>
        <span style={{ color: couleur, fontWeight: 700 }}>{valeur?.toFixed ? valeur.toFixed(1) : valeur}</span>
      </div>
      <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${couleur}, ${couleur}99)`, borderRadius: 4, boxShadow: `0 0 8px ${couleur}60` }}
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
        background: obtenu ? T.surface : 'rgba(255,255,255,0.02)',
        border: `1px solid ${obtenu ? `${T.primary}30` : T.border}`,
        borderRadius: 14, padding: '14px 12px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        cursor: 'default',
        filter: obtenu ? 'none' : 'grayscale(0.8)',
        opacity: obtenu ? 1 : 0.45,
        boxShadow: obtenu ? `0 4px 16px ${T.primary}10` : 'none',
      }}
    >
      {/* Shimmer for new badges */}
      {estNouveau && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.5, repeat: 3, repeatDelay: 0.5 }}
          style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', pointerEvents: 'none' }}
        />
      )}
      {estNouveau && (
        <div style={{ position: 'absolute', top: 7, right: 7, background: gradient, color: 'white', fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 5 }}>
          NOUVEAU
        </div>
      )}
      <div style={{ fontSize: 34, marginBottom: 6 }}>{badge.icone}</div>
      <div style={{ fontWeight: 700, fontSize: 11, color: T.text, marginBottom: 3 }}>{badge.nom}</div>
      <div style={{ fontSize: 10, color: T.text2, lineHeight: 1.4 }}>{badge.description}</div>
      {obtenu && badge.obtenu_le && (
        <div style={{ fontSize: 9, color: T.primary, marginTop: 7, fontWeight: 600 }}>
          {new Date(badge.obtenu_le).toLocaleDateString(undefined)}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GamificationPage() {
  const { t } = useI18n();
  const [badges, setBadges]         = useState(null);
  const [niveau, setNiveau]         = useState(null);
  const [classement, setClassement] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('badges');
  const [verifying, setVerifying]   = useState(false);

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
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const verifierBadges = async () => {
    setVerifying(true);
    try {
      const res = await chauffeurApi.badgesVerifier();
      if (res.data.nb_nouveaux > 0) {
        const [bRes, nRes] = await Promise.all([chauffeurApi.badges(), chauffeurApi.niveau()]);
        setBadges(bRes.data); setNiveau(nRes.data);
      }
      alert(res.data.message);
    } catch (e) { console.error(e); }
    finally { setVerifying(false); }
  };

  const nc = niveau ? NIVEAU_COLORS[niveau.niveau] || T.primary : T.primary;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: T.text2 }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: T.text }}>🏆 Gamification & Badges</h1>
          <p style={{ color: T.text2, fontSize: 13, margin: '5px 0 0' }}>{t('gam_subtitle')}</p>
        </div>
        <button
          onClick={verifierBadges}
          disabled={verifying}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 12,
            border: `1px solid ${T.warning}40`,
            background: `${T.warning}12`, color: T.warning,
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
            boxShadow: verifying ? 'none' : `0 4px 14px ${T.warning}20`,
          }}
        >
          {verifying
            ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
            : <Zap size={15} />}
          {t('gam_check_badges')}
        </button>
      </div>

      {/* ── Niveau card ── */}
      {niveau && (
        <div style={{
          borderRadius: 20, padding: '24px 28px',
          border: `1px solid ${nc}25`,
          background: `linear-gradient(135deg, ${T.surface}, ${nc}08)`,
        }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <JaugeCirculaire pct={niveau.progression_pct} niveau={niveau.niveau} size={140} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: nc, marginBottom: 6 }}>
                Niveau {niveau.niveau}
              </div>
              <div style={{ fontSize: 13, color: T.text2, marginBottom: 16 }}>
                <strong style={{ color: T.text }}>{niveau.points?.toLocaleString()}</strong> points
                {niveau.prochain_niveau && (
                  <span> · <span style={{ color: T.primary }}>{niveau.points_vers_prochain} pts</span> vers {niveau.prochain_niveau}</span>
                )}
              </div>

              {/* Sub-dimension gauges */}
              {niveau.scores_details && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {Object.entries(niveau.scores_details).map(([key, val]) => (
                    <JaugeLineaire key={key} label={key} valeur={val} max={100} couleur={T.primary} />
                  ))}
                </div>
              )}

              {/* Avantages */}
              {(niveau.avantages || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {niveau.avantages.map((av, i) => (
                    <span key={i} style={{ fontSize: 12, color: T.text2, background: `${nc}12`, border: `1px solid ${nc}20`, borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: nc }}>✓</span> {av}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, background: '#1A1A1A', borderRadius: 14, padding: 5, border: `1px solid ${T.border}` }}>
        {[
          { key: 'badges',      label: `🏅 ${t('gam_tab_mine')} (${badges?.total_obtenus || 0})` },
          { key: 'tous',        label: `📋 ${t('gam_tab_all')} (${badges?.total_disponibles || 0})` },
          { key: 'classement',  label: `🏆 ${t('gam_ranking')}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? gradient : 'transparent',
            color: activeTab === tab.key ? 'white' : T.text2,
            fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
            transition: 'all 0.2s',
            boxShadow: activeTab === tab.key ? glowOrange : 'none',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Badges obtenus ── */}
      {activeTab === 'badges' && (
        (badges?.obtenus || []).length === 0 ? (
          <div style={{ background: T.surface, borderRadius: 20, padding: '3rem', textAlign: 'center', color: T.text2, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏅</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{t('gam_no_badges')}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{t('gam_encourage')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
            {(badges?.obtenus || []).map(b => (
              <BadgeCard key={b.id} badge={b} obtenu estNouveau={b.est_nouveau} />
            ))}
          </div>
        )
      )}

      {/* ── Tous les badges ── */}
      {activeTab === 'tous' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          {(badges?.tous || []).map(b => (
            <BadgeCard key={b.id} badge={b} obtenu={b.obtenu} estNouveau={false} />
          ))}
        </div>
      )}

      {/* ── Classement ── */}
      {activeTab === 'classement' && (
        <div style={{ background: T.surface, borderRadius: 20, padding: '22px 24px', border: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color={T.primary} />
            </div>
            {t('gam_top20')}
          </div>

          {classement.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: T.text2 }}>{t('gam_no_data')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classement.map((entry, i) => {
                const medals  = ['🥇', '🥈', '🥉'];
                const niveauC = NIVEAU_COLORS[entry.niveau] || '#64748b';
                const isTop3  = i < 3;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 14,
                      background: isTop3 ? `${T.primary}08` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isTop3 ? `${T.primary}20` : T.border}`,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${T.primary}10`}
                    onMouseLeave={e => e.currentTarget.style.background = isTop3 ? `${T.primary}08` : 'rgba(255,255,255,0.02)'}
                  >
                    {/* Rank */}
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      {isTop3 ? (
                        <span style={{ fontSize: 22 }}>{medals[i]}</span>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text2 }}>{entry.rang}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: isTop3 ? gradient : '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {(entry.nom || '?')[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.nom}
                      </div>
                      <div style={{ fontSize: 11, color: T.text2, display: 'flex', gap: 10, marginTop: 2 }}>
                        <span>⭐ {entry.note_moyenne?.toFixed(1)}</span>
                        <span>📦 {entry.livraisons_periode} livraisons</span>
                      </div>
                    </div>

                    {/* Niveau badge */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: niveauC, background: `${niveauC}15`, border: `1px solid ${niveauC}30`, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {NIVEAU_EMOJIS[entry.niveau] || '🏅'} {entry.niveau}
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
