import React, { forwardRef, useEffect, useState } from 'react';

import { clsx } from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  calendarPosition?: 'up' | 'down';
}

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string): string {
  const date = parseIsoDate(value);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function getCalendarDays(monthCursor: Date) {
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      iso: toIsoDate(date),
      inMonth: date.getMonth() === monthCursor.getMonth()
    };
  });
}

function DateInputField({
  inputRef,
  className,
  label,
  error,
  hint,
  placeholder,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  name,
  min,
  max,
  calendarPosition = 'down'
}: InputProps & {
  inputRef: React.ForwardedRef<HTMLInputElement>;
}) {
  const defaultTextValue =
  typeof defaultValue === 'string' ? defaultValue : '';
  const [internalValue, setInternalValue] = useState(defaultTextValue);
  const [open, setOpen] = useState(false);
  const initialValue = typeof value === 'string' ? value : defaultTextValue;
  const [monthCursor, setMonthCursor] = useState(
    parseIsoDate(initialValue) || new Date()
  );

  const isControlled = typeof value === 'string';
  const selectedValue = isControlled ? value : internalValue;
  const minDate = parseIsoDate(typeof min === 'string' ? min : undefined);
  const maxDate = parseIsoDate(typeof max === 'string' ? max : undefined);

  useEffect(() => {
    const parsed = parseIsoDate(selectedValue);
    if (parsed) {
      setMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [selectedValue]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-baxti-date-root]')) {
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

  const isDisabledDate = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

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
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    setOpen(false);
  };

  const monthTitle = monthCursor.toLocaleDateString('uz-UZ', {
    month: 'long',
    year: 'numeric'
  });
  const days = getCalendarDays(monthCursor);
  const displayValue = formatDisplayDate(selectedValue);
  const todayIso = toIsoDate(new Date());

  return (
    <div className="w-full" data-baxti-date-root>
      {label &&
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      }
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          name={name}
          value={selectedValue}
          required={required}
          min={typeof min === 'string' ? min : undefined}
          max={typeof max === 'string' ? max : undefined}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={clsx(
            'baxti-date-input flex h-11 w-full items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm transition-all duration-300 focus:outline-none focus:ring-[3px] focus:ring-indigo-500/30 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
            displayValue ? 'text-slate-700' : 'text-slate-400',
            error && 'border-red-400 focus:ring-red-500/30 focus:border-red-500',
            className
          )}>

          <span className="truncate text-left pr-6">
            {displayValue || placeholder || 'Sanani tanlang'}
          </span>
          <CalendarDays className="ml-auto h-4 w-4 text-indigo-500" />
        </button>

        {!required && displayValue && !disabled && (
          <button
            type="button"
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              emitChange('');
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open &&
        <div className={clsx(
          "absolute z-50 w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg",
          calendarPosition === 'up' ? "bottom-full mb-2" : "mt-2"
        )}>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">

                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-slate-800 capitalize">
                {monthTitle}
              </p>
              <button
                type="button"
                onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">

                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'].map((day) =>
              <div
                key={day}
                className="py-1 text-center text-xs font-medium text-slate-400">
                  {day}
                </div>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
              const isSelected = day.iso === selectedValue;
              const isToday = day.iso === todayIso;
              const disabledDate = !day.inMonth || isDisabledDate(day.date);
              return (
                <button
                  key={day.iso}
                  type="button"
                  disabled={disabledDate}
                  onClick={() => emitChange(day.iso)}
                  className={clsx(
                    'h-9 rounded-lg text-sm transition-colors',
                    isSelected &&
                    'bg-indigo-600 text-white font-semibold hover:bg-indigo-700',
                    !isSelected &&
                    !disabledDate &&
                    'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700',
                    disabledDate && 'text-slate-300 cursor-not-allowed',
                    isToday && !isSelected && 'ring-1 ring-indigo-200'
                  )}>

                    {day.date.getDate()}
                  </button>);

            })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                const today = new Date();
                if (!isDisabledDate(today)) {
                  setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  emitChange(toIsoDate(today));
                }
              }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700">

                Bugun
              </button>
              {!required &&
              <button
                type="button"
                onClick={() => emitChange('')}
                className="text-xs font-medium text-slate-500 hover:text-slate-700">
                  Tozalash
                </button>
              }
            </div>
          </div>
        }
      </div>
      {error &&
      <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
      }
      {hint && !error &&
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
      }
    </div>);
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, ...props }, ref) => {
    if (props.type === 'date') {
      return (
        <DateInputField
          inputRef={ref}
          className={className}
          label={label}
          error={error}
          hint={hint}
          {...props} />

      );
    }

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
              'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-[3px] focus:ring-indigo-500/30 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300',
              icon && 'pl-10',
              error && 'border-red-400 focus:ring-red-500/30 focus:border-red-500',
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
