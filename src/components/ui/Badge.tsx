import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'orange' | 'neutral' | 'owner' | 'member' | 'trial';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    orange:
      'bg-accent-orange/10 text-accent-orange border-accent-orange/25',
    neutral:
      'bg-white/[0.04] text-text-secondary border-white/10',
    owner:
      'bg-role-owner/10 text-role-owner border-role-owner/30',
    member:
      'bg-role-member/10 text-role-member border-role-member/30',
    trial:
      'bg-role-trial/10 text-role-trial border-role-trial/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
