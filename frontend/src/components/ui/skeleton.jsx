import React from 'react';

/**
 * Skeleton shimmer — remplace les spinners RefreshCw sur les listes/tableaux
 *
 * Usage:
 *   <Skeleton />                        — ligne simple
 *   <Skeleton width="60%" height="1rem" />
 *   <SkeletonCard />                    — carte produit/boutique
 *   <SkeletonTable rows={5} cols={4} /> — tableau
 *   <SkeletonList rows={6} />           — liste verticale
 */

// Shimmer keyframes injectés une seule fois
const shimmerStyle = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .skeleton-shimmer {
    background: linear-gradient(90deg, #f0f2f8 25%, #e4e7ef 50%, #f0f2f8 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: var(--radius-sm, 6px);
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const style = document.createElement('style');
  style.id = 'skeleton-style';
  style.textContent = shimmerStyle;
  document.head.appendChild(style);
}

export const Skeleton = ({ width = '100%', height = '1rem', className = '' }) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{ width, height }}
    aria-hidden="true"
  />
);

export const SkeletonText = ({ lines = 3, lastWidth = '60%' }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? lastWidth : '100%'} height="0.875rem" />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
    <Skeleton height="10rem" className="rounded-lg" />
    <Skeleton width="70%" height="1.1rem" />
    <Skeleton width="45%" height="0.875rem" />
    <div className="flex gap-2 pt-1">
      <Skeleton width="4rem" height="1.5rem" />
      <Skeleton width="4rem" height="1.5rem" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-0 border border-[var(--color-border)] rounded-xl overflow-hidden">
    {/* Header */}
    <div className="grid gap-4 p-3 bg-[var(--color-surface-alt)]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="0.75rem" width="60%" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, row) => (
      <div
        key={row}
        className="grid gap-4 p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, col) => (
          <Skeleton key={col} height="0.875rem" width={col === 0 ? '80%' : '55%'} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ rows = 6 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <Skeleton width="2.5rem" height="2.5rem" className="rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton width="50%" height="0.875rem" />
          <Skeleton width="75%" height="0.75rem" />
        </div>
        <Skeleton width="4rem" height="1.5rem" />
      </div>
    ))}
  </div>
);

export default Skeleton;
