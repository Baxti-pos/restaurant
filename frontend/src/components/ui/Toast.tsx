import React from 'react';
import { Toaster, toast as sonnerToast } from 'sonner';
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: 'Inter, sans-serif'
        },
        duration: 3000
      }} />);


}
export const toast = {
  success: (msg = 'Saqlandi') => sonnerToast.success(msg),
  error: (message = 'Xatolik yuz berdi. Qayta urinib ko') =>
  sonnerToast.error(message),
  deleted: (message = "Muvaffaqiyatli o'chirildi") =>
  sonnerToast.success(message, {
    icon: '🗑️'
  }),
  info: (msg: string) => sonnerToast(msg)
};