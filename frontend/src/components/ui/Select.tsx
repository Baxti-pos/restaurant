import React, { forwardRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
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
  (
    {
      label,
      error,
      options,
      placeholder,
      className,
      value,
      defaultValue,
      onChange,
      required,
      disabled,
      name,
      ...props
    },
    ref
  ) => {
    const defaultTextValue =
    typeof defaultValue === 'string' ? defaultValue : '';
    const [internalValue, setInternalValue] = useState(defaultTextValue);
    const [open, setOpen] = useState(false);
    const isControlled = typeof value === 'string';
    const selectedValue = isControlled ? value : internalValue;
    const selectedOption = options.find((opt) => opt.value === selectedValue);
    const selectLabel = selectedOption?.label || placeholder || 'Tanlang';

    useEffect(() => {
      if (!open) return;
      const closeOnOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('[data-baxti-select-root]')) {
          setOpen(false);
        }
      };
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', closeOnOutside);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
        document.removeEventListener('mousedown', closeOnOutside);
        document.removeEventListener('keydown', closeOnEscape);
      };
    }, [open]);

    const emitChange = (nextValue: string) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }
      if (onChange) {
        const syntheticEvent = {
          target: {
            value: nextValue,
            name
          },
          currentTarget: {
            value: nextValue,
            name
          }
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
      setOpen(false);
    };

    return (
      <div className="w-full" data-baxti-select-root>
        {label &&
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        }
        <div className="relative">
          <select
            ref={ref}
            name={name}
            value={selectedValue}
            required={required}
            onChange={() => {}}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            {...props}>

            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) =>
            <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )}
          </select>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            className={clsx(
              'baxti-select flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-all focus-visible:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
              !selectedOption && 'text-slate-400',
              error && 'border-red-400 focus:ring-red-500 focus:border-red-500',
              className
            )}>

            <span className="truncate text-left">{selectLabel}</span>
            <ChevronDown
              className={clsx(
                'h-4 w-4 text-indigo-500 transition-transform',
                open && 'rotate-180'
              )} />
          </button>

          {open &&
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="max-h-64 overflow-y-auto py-1">
                {options.map((opt) => {
                const isActive = opt.value === selectedValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => emitChange(opt.value)}
                    className={clsx(
                      'w-full px-3 py-2.5 text-left text-sm transition-colors',
                      isActive ?
                      'bg-indigo-50 text-indigo-700 font-medium' :
                      'text-slate-700 hover:bg-slate-50'
                    )}>

                      {opt.label}
                    </button>);

              })}
              </div>
            </div>
          }
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>);

  }
);
Select.displayName = 'Select';
