import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}
export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm focus-visible:ring-indigo-500/30',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400/30',
    outline:
    'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400/30',
    ghost: 'hover:bg-slate-100 text-slate-600 focus-visible:ring-slate-400/30',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm focus-visible:ring-red-500/30'
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-lg',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-12 px-6 text-base rounded-xl',
    icon: 'h-9 w-9 rounded-lg flex items-center justify-center'
  };
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}>

      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>);

}