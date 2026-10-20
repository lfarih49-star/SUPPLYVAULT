import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'teal' | 'blue' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
}) => {
  const styles = {
    gold: 'bg-blue-950/60 text-blue-300 border-blue-800/80',
    emerald: 'bg-blue-950/60 text-blue-300 border-blue-800/80',
    teal: 'bg-teal-950/60 text-teal-300 border-teal-800/80',
    blue: 'bg-blue-950/60 text-blue-300 border-blue-800/80',
    success: 'bg-blue-950/60 text-blue-300 border-blue-800/80',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
    neutral: 'bg-navy-800 text-slate-300 border-slate-700',
  };

  const dotColors = {
    gold: 'bg-blue-600',
    emerald: 'bg-blue-600',
    teal: 'bg-teal-500',
    blue: 'bg-blue-500',
    success: 'bg-blue-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles[variant]} ${sizes[size]} tracking-wide`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

