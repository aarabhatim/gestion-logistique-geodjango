/**
 * DeliverMap — Design Tokens
 * Source unique de vérité pour toutes les couleurs, rayons et dégradés.
 * Importez T dans chaque page/composant au lieu de redéfinir les couleurs localement.
 *
 * Usage :
 *   import { T, grad } from '../../styles/tokens';
 *   style={{ background: T.card, color: T.primary }}
 */

export const T = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:       '#0B0B0B',
  surface:  '#111111',
  card:     '#161616',
  card2:    '#1C1C1C',

  // ── Brand ──────────────────────────────────────────────────────────────────
  primary:  '#FF8A00',
  primary2: '#FF6B00',

  // ── Text ───────────────────────────────────────────────────────────────────
  text:  '#FFFFFF',
  text2: '#888888',

  // ── Borders ────────────────────────────────────────────────────────────────
  border: 'rgba(255,255,255,0.06)',

  // ── Semantic ───────────────────────────────────────────────────────────────
  danger:  '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info:    '#4F8CFF',

  // ── Border-radius ──────────────────────────────────────────────────────────
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

/** Dégradé principal (boutons, badges, avatars) */
export const grad = `linear-gradient(135deg, ${T.primary}, ${T.primary2})`;

/** Ombre orange pour les éléments accent */
export const glowOrange = `0 8px 24px rgba(255,138,0,0.25)`;

/**
 * Retourne un style inline de carte standard.
 * @param {object} overrides - propriétés CSS supplémentaires
 */
export const cardStyle = (overrides = {}) => ({
  background:   T.card,
  borderRadius: T.radius.lg,
  border:       `1px solid ${T.border}`,
  padding:      '20px 24px',
  ...overrides,
});

/**
 * Retourne un style inline de badge coloré.
 * @param {'danger'|'success'|'warning'|'info'|'primary'} variant
 */
export const badgeStyle = (variant = 'primary') => ({
  display:      'inline-flex',
  alignItems:   'center',
  gap:          4,
  padding:      '3px 10px',
  borderRadius: T.radius.full,
  fontSize:     11,
  fontWeight:   700,
  background:   `${T[variant] || T.primary}20`,
  color:        T[variant] || T.primary,
});

export default T;
