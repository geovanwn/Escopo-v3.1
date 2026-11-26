import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  glow?: boolean;
  icon?: React.ElementType;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  glow = false,
  icon: Icon,
  onClick,
  style
}) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
      bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 
      ${glow ? 'shadow-md border-green-500 ring-1 ring-green-500' : 'shadow-sm'} 
      relative overflow-hidden transition-colors duration-300
      ${className}
    `}>

      {(title || action || Icon) && (
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="p-2 bg-[var(--bg-secondary)] text-green-600 rounded-lg shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-lg font-black text-[var(--text-primary)] tracking-wide">{title}</h3>}
              {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="text-[var(--text-primary)]">
        {children}
      </div>
    </div>
  );
};