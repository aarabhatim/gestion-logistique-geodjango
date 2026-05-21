import React from 'react';

/**
 * Carte glass réutilisable
 * Usage: <Card glass hoverable padding="md">Contenu</Card>
 */
const Card = ({
  children,
  glass = false,
  hoverable = false,
  padding = 'md',
  className = '',
  onClick,
  ...props
}) => {
  const paddings = {
    none: '',
    sm:   'p-3',
    md:   'p-5',
    lg:   'p-6',
    xl:   'p-8',
  };

  const base = `
    rounded-xl border border-[var(--color-border)]
    transition-all duration-200
  `;

  const glassStyle = glass
    ? 'bg-white/70 backdrop-blur-md shadow-[var(--shadow-md)]'
    : 'bg-[var(--color-surface)] shadow-[var(--shadow-sm)]';

  const hoverStyle = hoverable
    ? 'hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 cursor-pointer'
    : '';

  return (
    <div
      className={`${base} ${glassStyle} ${hoverStyle} ${paddings[padding]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};
// Sub-components for shadcn compatibility
const CardHeader = ({ children, className = '', ...props }) => (
  <div className={"flex flex-col space-y-1.5 p-4 pb-2 " + className} {...props}>{children}</div>
);

const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={"text-lg font-semibold leading-none tracking-tight text-[var(--color-text)] " + className} {...props}>{children}</h3>
);

const CardDescription = ({ children, className = '', ...props }) => (
  <p className={"text-sm text-[var(--color-text-secondary)] " + className} {...props}>{children}</p>
);

const CardContent = ({ children, className = '', ...props }) => (
  <div className={"p-4 pt-0 " + className} {...props}>{children}</div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div className={"flex items-center p-4 pt-0 " + className} {...props}>{children}</div>
);

// Named exports for shadcn compatibility (@/components/ui/card)
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

export default Card;
