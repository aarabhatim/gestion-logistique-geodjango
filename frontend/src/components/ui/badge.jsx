import React from 'react';

/**
 * Badge coloré unifié
 * Usage: <Badge variant="success">Livré</Badge>
 */
const Badge = ({ children, variant = 'default', size = 'md', dot = false, className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-[var(--color-primary-10)] text-[var(--color-primary)]',
    success: 'bg-[var(--color-success-10)] text-[var(--color-success)]',
    danger:  'bg-[var(--color-danger-10)] text-[var(--color-danger)]',
    warning: 'bg-[var(--color-warning-10)] text-[var(--color-warning)]',
    accent:  'bg-teal-50 text-teal-700',
    dark:    'bg-[var(--color-secondary)] text-white',
  };

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
};
// Named exports for shadcn compatibility (@/components/ui/badge)
export { Badge };
export const badgeVariants = (props) => props?.variant || '';

export default Badge;
