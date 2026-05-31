/**
 * StateDisplay.jsx — Composants réutilisables pour états vides, loading et erreur
 *
 * Usage:
 *   <EmptyState icon={Package} title="Aucune commande" desc="Vos commandes apparaîtront ici." />
 *   <LoadingState message="Chargement des commandes…" />
 *   <ErrorState message="Impossible de charger les données." onRetry={fetch} />
 *   <SkeletonTable rows={5} cols={4} />
 */
import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import {
  Package, AlertCircle, RefreshCw, Inbox,
  SearchX, WifiOff, ShieldOff, FileX,
} from 'lucide-react';

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export function Spinner({ size = 28, color = 'var(--primary, #E30613)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  );
}

/* ── État chargement ─────────────────────────────────────────────────────── */
export function LoadingState({ message, size = 'md' }) {
  const { t } = useI18n();
  const msg = message ?? t('state_loading');
  const pad = size === 'sm' ? 24 : size === 'lg' ? 80 : 48;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: pad, gap: 14,
      color: 'var(--text-secondary, #94a3b8)',
    }}>
      <Spinner />
      <span style={{ fontSize: 14 }}>{msg}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── État vide ───────────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  desc = '',
  action = null,   // { label, onClick }
  size = 'md',
}) {
  const { t } = useI18n();
  const displayTitle = title ?? t('state_no_data');
  const iconSize = size === 'sm' ? 36 : size === 'lg' ? 72 : 52;
  const pad      = size === 'sm' ? 20 : size === 'lg' ? 80 : 48;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: pad, gap: 10,
      color: 'var(--text-secondary, #94a3b8)', textAlign: 'center',
    }}>
      <Icon size={iconSize} style={{ opacity: 0.25 }} />
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #f1f5f9)', marginTop: 6 }}>{displayTitle}</div>
      {desc && <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.5 }}>{desc}</div>}
      {action && (
        <button onClick={action.onClick}
          className="btn btn-primary"
          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ── État erreur ─────────────────────────────────────────────────────────── */
export function ErrorState({
  message,
  onRetry = null,
  icon: Icon = AlertCircle,
}) {
  const { t } = useI18n();
  const msg = message ?? t('state_error');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 48, gap: 10, textAlign: 'center',
    }}>
      <Icon size={48} color="var(--danger, #ef4444)" style={{ opacity: 0.7 }} />
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #f1f5f9)', marginTop: 6 }}>
        {t('err_loading_title')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)', maxWidth: 320, lineHeight: 1.5 }}>
        {msg}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary"
          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> {t('common_retry')}
        </button>
      )}
    </div>
  );
}

/* ── Skeleton tableau ────────────────────────────────────────────────────── */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 8 }}>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} style={{ height: 14, background: 'var(--border, rgba(255,255,255,0.08))', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 12, opacity: 1 - r * 0.1 }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} style={{ height: 18, background: 'var(--border, rgba(255,255,255,0.06))', borderRadius: 6, animation: `pulse 1.4s ease-in-out ${c * 0.1}s infinite` }} />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

/* ── Skeleton carte ──────────────────────────────────────────────────────── */
export function SkeletonCard({ height = 100 }) {
  return (
    <div style={{
      height, borderRadius: 14, background: 'var(--glass-bg, rgba(30,41,59,0.5))',
      border: '1px solid var(--border, rgba(255,255,255,0.08))',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

/* ── Pré-sets vides courants ─────────────────────────────────────────────── */
export const EMPTY_PRESETS = {
  commandes:     { icon: Package,     titleKey: 'ep_commandes_title', descKey: 'ep_commandes_desc' },
  incidents:     { icon: AlertCircle, titleKey: 'ep_incidents_title', descKey: 'ep_incidents_desc' },
  tickets:       { icon: FileX,       titleKey: 'ep_tickets_title',   descKey: 'ep_tickets_desc' },
  notifications: { icon: Inbox,       titleKey: 'ep_notif_title',     descKey: 'ep_notif_desc' },
  recherche:     { icon: SearchX,     titleKey: 'ep_search_title',    descKey: 'ep_search_desc' },
  connexion:     { icon: WifiOff,     titleKey: 'ep_connexion_title', descKey: 'ep_connexion_desc' },
  acces:         { icon: ShieldOff,   titleKey: 'ep_acces_title',     descKey: 'ep_acces_desc' },
};

export default { LoadingState, EmptyState, ErrorState, SkeletonTable, SkeletonCard, Spinner, EMPTY_PRESETS };
