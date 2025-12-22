'use client';

import { useEffect, useState } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useUIStore } from '@/store/ui-store';

export function Toaster() {
  const { activeToast, hideToast } = useUIStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (activeToast) {
      setOpen(true);
      const timer = setTimeout(() => {
        setOpen(false);
        setTimeout(hideToast, 150);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeToast, hideToast]);

  if (!activeToast) return null;

  return (
    <ToastProvider>
      <Toast open={open} onOpenChange={setOpen}>
        <div className="grid gap-1">
          <ToastTitle>
            {activeToast.type === 'success' && '✓ Success'}
            {activeToast.type === 'error' && '✗ Error'}
            {activeToast.type === 'info' && 'ℹ Info'}
          </ToastTitle>
          <ToastDescription>{activeToast.message}</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
