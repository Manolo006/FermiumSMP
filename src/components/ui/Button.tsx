import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  href?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  href,
  target,
  rel,
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-heading font-medium rounded-xl transition-all duration-150 ease-out-Quart active:scale-[0.96] cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/70 disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-sm sm:text-base px-6 py-3.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-accent-orange text-[#101216] font-semibold hover:bg-accent-orange-hover shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset] hover:shadow-glow-orange',
    secondary:
      'bg-white/[0.05] text-text-primary border border-white/10 hover:bg-white/[0.09] hover:border-white/20 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]',
    outline:
      'bg-accent-orange/[0.06] text-accent-orange border border-accent-orange/35 hover:bg-accent-orange/15 hover:border-accent-orange/70',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.05]',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  const content = (
    <>
      {icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
        className={combinedClasses}
      >
        {content}
      </a>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {content}
    </button>
  );
};
