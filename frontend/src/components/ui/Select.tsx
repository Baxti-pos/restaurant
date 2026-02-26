import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
interface SelectOption {
  value: string;
  label: string;
}
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label &&
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        }
        <select
          ref={ref}
          className={clsx(
            'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none',
            error && 'border-red-400 focus:ring-red-500',
            className
          )}
          {...props}>

          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) =>
          <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )}
        </select>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>);

  }
);
Select.displayName = 'Select';