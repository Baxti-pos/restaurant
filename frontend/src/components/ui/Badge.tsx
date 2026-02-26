import React from 'react';
import { clsx } from 'clsx';
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'primary' | 'secondary' | 'info';
  size?: 'sm' | 'md';
}
export function Badge({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    primary: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    secondary: 'bg-slate-100 text-slate-600 border-slate-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200'
  };
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}>

      {children}
    </span>);

}