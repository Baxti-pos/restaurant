import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label &&
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        }
        <div className="relative">
          {icon &&
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          }
          <input
            className={clsx(
              'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
              icon && 'pl-10',
              error && 'border-red-400 focus:ring-red-400',
              className
            )}
            ref={ref}
            {...props} />

        </div>
        {error &&
        <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        }
        {hint && !error &&
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
        }
      </div>);

  }
);
Input.displayName = 'Input';