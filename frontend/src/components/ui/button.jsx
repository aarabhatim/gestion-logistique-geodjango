import React from 'react';

/**
 * Bouton unifié DeliverMap
 * Usage: <Button variant="primary" size="md" loading={false} icon={<Icon/>}>Texte</Button>
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconRight = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const base = `
    inline-flex items-center justify-center gap-2 font-medium rounded-lg
    transition-all duration-150 cursor-pointer select-none border-0
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-[var(--color-primary)] text-white
      hover:bg-[var(--color-primary-dark)] active:scale-95
      focus:ring-[var(--color-primary)]
    `,
    secondary: `
      bg-[var(--color-surface)] text-[var(--color-text)]
      border border-[var(--color-border)]
      hover:bg-[var(--color-surface-alt)] active:scale-95
      focus:ring-[var(--color-primary)]
    `,
    danger: `
      bg-[var(--color-danger)] text-white
      hover:bg-[var(--color-danger-light)] active:scale-95
      focus:ring-[var(--color-danger)]
    `,
    ghost: `
      bg-transparent text-[var(--color-text-secondary)]
      hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]
      focus:ring-[var(--color-primary)]
    `,
    accent: `
      bg-[var(--color-accent)] text-white
      hover:bg-[var(--color-accent-light)] active:scale-95
      focus:ring-[var(--color-accent)]
    `,
  };

  const sizes = {
    xs:  'px-2 py-1 text-xs',
    sm:  'px-3 py-1.5 text-sm',
    md:  'px-4 py-2 text-sm',
    lg:  'px-5 py-2.5 text-base',
    xl:  'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {!loading && icon && !iconRight && icon}
      {children}
      {!loading && icon && iconRight && icon}
    </button>
  );
};
// Named exports for shadcn compatibility (@/components/ui/button)
export { Button };
export const buttonVariants = (props) => props?.variant || '';

export default Button;
