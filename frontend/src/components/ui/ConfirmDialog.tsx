import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Tasdiqlash',
  message = 'Bu amalni bajarishni tasdiqlaysizmi?',
  confirmText = "O'chirish",
  cancelText = 'Bekor qilish',
  isLoading = false
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-slate-600 text-sm leading-relaxed pt-2">
            {message}
          </p>
        </div>
        <div className="flex space-x-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}>

            {cancelText}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}>

            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>);

}