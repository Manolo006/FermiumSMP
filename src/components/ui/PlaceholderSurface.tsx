import React from 'react';
import { Image, User } from 'lucide-react';

interface PlaceholderSurfaceProps {
  title?: string;
  subtitle?: string;
  type?: 'image' | 'member';
  accentColor?: 'orange' | 'owner' | 'member' | 'trial';
  className?: string;
}

export const PlaceholderSurface: React.FC<PlaceholderSurfaceProps> = ({
  title,
  subtitle,
  type = 'image',
  accentColor = 'orange',
  className = '',
}) => {
  const glowMap = {
    orange: 'from-accent-orange/10 via-transparent to-transparent',
    owner: 'from-role-owner/15 via-transparent to-transparent',
    member: 'from-role-member/15 via-transparent to-transparent',
    trial: 'from-role-trial/15 via-transparent to-transparent',
  };

  const iconColorMap = {
    orange: 'text-accent-orange/70 border-accent-orange/20 bg-accent-orange/[0.06]',
    owner: 'text-role-owner/80 border-role-owner/25 bg-role-owner/[0.08]',
    member: 'text-role-member/80 border-role-member/25 bg-role-member/[0.08]',
    trial: 'text-role-trial/80 border-role-trial/25 bg-role-trial/[0.08]',
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-[#13161C] pattern-dots select-none ${className}`}
    >
      {/* Subtle radial ambient wash */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${glowMap[accentColor]} pointer-events-none`}
      />

      <div className="relative z-10 flex flex-col items-center max-w-xs">
        <div
          className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 ${iconColorMap[accentColor]}`}
        >
          {type === 'member' ? (
            <User className="w-5 h-5 stroke-[1.75]" />
          ) : (
            <Image className="w-5 h-5 stroke-[1.75]" />
          )}
        </div>

        {title && (
          <span className="text-xs sm:text-sm font-heading font-medium text-text-primary/90">
            {title}
          </span>
        )}
        {subtitle && (
          <span className="text-[11px] text-text-secondary/75 mt-1 leading-relaxed">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
