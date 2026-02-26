import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const mainEl = document.querySelector('main') as HTMLElement | null;
    if (isOpen) {
      document.addEventListener('keydown', handler);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const sizeClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-xl',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-[80vw] md:w-[80vw]'
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose} />

      <div
        className={clsx(
          'relative w-full bg-white flex flex-col',
          // Mobile: bottom sheet — auto height, rounded top corners, max 85vh
          'rounded-t-2xl max-h-[85vh]',
          // Desktop: centered modal with max-height
          'md:rounded-2xl md:shadow-2xl md:max-h-[90vh]',
          sizeClasses[size]
        )}>

        {/* Drag handle on mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div className="text-base font-semibold text-slate-900 flex-1 min-w-0">
            {title}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">

            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>);

}