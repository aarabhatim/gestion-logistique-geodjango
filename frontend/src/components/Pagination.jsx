import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Composant Pagination universel
 * Props:
 *   page        : numéro de page courante (1-indexed)
 *   pageSize    : nombre d'éléments par page
 *   total       : nombre total d'éléments
 *   onPageChange: (newPage: number) => void
 *   onPageSizeChange: (newSize: number) => void  (optionnel)
 *   pageSizeOptions: number[]  (optionnel, défaut [10, 20, 50])
 */
const Pagination = ({
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  // Génère les numéros de pages visibles (max 7 boutons)
  const getPageNums = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  };

  const btnStyle = (active, disabled) => ({
    minWidth: 32, height: 32, borderRadius: 8, border: active
      ? '1px solid var(--accent-primary)'
      : '1px solid var(--glass-border)',
    background: active ? 'var(--accent-primary)' : 'transparent',
    color: active ? 'white' : disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s',
    padding: '0 6px',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12, padding: '12px 4px', marginTop: 8,
    }}>
      {/* Info comptage */}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Affichage <strong style={{ color: 'var(--text-primary)' }}>{start}–{end}</strong> sur{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{total}</strong>
      </div>

      {/* Boutons navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={btnStyle(false, page === 1)} disabled={page === 1}
          onClick={() => onPageChange(1)} title="Première page">
          <ChevronsLeft size={14} />
        </button>
        <button style={btnStyle(false, page === 1)} disabled={page === 1}
          onClick={() => onPageChange(page - 1)} title="Page précédente">
          <ChevronLeft size={14} />
        </button>

        {getPageNums().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-secondary)', fontSize: 14 }}>…</span>
          ) : (
            <button key={p} style={btnStyle(p === page, false)}
              onClick={() => onPageChange(p)}>
              {p}
            </button>
          )
        )}

        <button style={btnStyle(false, page === totalPages)} disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)} title="Page suivante">
          <ChevronRight size={14} />
        </button>
        <button style={btnStyle(false, page === totalPages)} disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)} title="Dernière page">
          <ChevronsRight size={14} />
        </button>
      </div>

      {/* Sélecteur taille de page */}
      {onPageSizeChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>Lignes :</span>
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="glass-input"
            style={{ padding: '4px 8px', fontSize: 13, height: 32, minWidth: 70 }}>
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
