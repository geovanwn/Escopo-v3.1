import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-green-600 text-white shadow-sm hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5 border border-transparent active:translate-y-0",
    secondary: "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm",
    outline: "bg-transparent border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-transparent",
    danger: "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-100 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4 mr-2" />
      )}
      {children}
    </button>
  );
};