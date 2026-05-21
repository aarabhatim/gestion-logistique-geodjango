import React from 'react';

/**
 * État vide illustré avec SVG et call-to-action
 * Usage: <EmptyState type="orders" title="Aucune commande" action={() => {}} actionLabel="Commencer" />
 */

const illustrations = {
  orders: (
    <svg viewBox="0 0 200 160" className="w-48 h-36 mx-auto">
      <rect x="40" y="20" width="120" height="120" rx="12" fill="#F0F2F8" />
      <rect x="60" y="45" width="80" height="8" rx="4" fill="#C8CEDE" />
      <rect x="60" y="63" width="60" height="8" rx="4" fill="#C8CEDE" />
      <rect x="60" y="81" width="70" height="8" rx="4" fill="#C8CEDE" />
      <circle cx="150" cy="130" r="22" fill="#FF6B35" opacity=".15" />
      <path d="M140 130h20M150 120v20" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  favorites: (
    <svg viewBox="0 0 200 160" className="w-48 h-36 mx-auto">
      <path d="M100 130 C60 100, 20 70, 20 45 C20 28, 33 15, 50 15 C64 15, 75 23, 100 38 C125 23, 136 15, 150 15 C167 15, 180 28, 180 45 C180 70, 140 100, 100 130Z" fill="#FF6B35" opacity=".15" />
      <path d="M100 115 C68 88, 35 64, 35 44 C35 31, 44 22, 55 22" stroke="#FF6B35" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 160" className="w-48 h-36 mx-auto">
      <circle cx="90" cy="75" r="45" fill="#F0F2F8" stroke="#C8CEDE" strokeWidth="2" />
      <circle cx="90" cy="75" r="30" fill="none" stroke="#C8CEDE" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="125" y1="110" x2="160" y2="145" stroke="#C8CEDE" strokeWidth="4" strokeLinecap="round" />
      <path d="M78 75h24M90 63v24" stroke="#C8CEDE" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 200 160" className="w-48 h-36 mx-auto">
      <path d="M100 20 C75 20, 55 40, 55 65 L55 100 L40 115 L160 115 L145 100 L145 65 C145 40, 125 20, 100 20Z" fill="#F0F2F8" stroke="#C8CEDE" strokeWidth="1.5" />
      <rect x="88" y="115" width="24" height="12" rx="6" fill="#C8CEDE" />
      <circle cx="145" cy="35" r="12" fill="#FF6B35" opacity=".8" />
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 200 160" className="w-48 h-36 mx-auto">
      <rect x="50" y="30" width="100" height="100" rx="16" fill="#F0F2F8" />
      <path d="M85 80 L100 65 L115 80" stroke="#C8CEDE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="100" y1="65" x2="100" y2="95" stroke="#C8CEDE" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

const EmptyState = ({
  type = 'generic',
  title = 'Aucun résultat',
  description = '',
  action = null,
  actionLabel = 'Commencer',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      {illustrations[type] || illustrations.generic}
      <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)] max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          <button
            onClick={action}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--color-primary, #FF6B35)' }}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
