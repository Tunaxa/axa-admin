'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import * as React from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (opts: { title: string; description?: string; variant?: ToastVariant }) => {
      const id = Math.random().toString(36).slice(2);
      const toast: Toast = { id, variant: 'default', ...opts };
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => dismiss(id), DEFAULT_DURATION);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) => push({ title, description, variant: 'success' }),
      error: (title, description) => push({ title, description, variant: 'error' }),
      info: (title, description) => push({ title, description, variant: 'info' }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon =
    toast.variant === 'success'
      ? CheckCircle2
      : toast.variant === 'error'
        ? AlertCircle
        : toast.variant === 'info'
          ? Info
          : null;

  const tone =
    toast.variant === 'success'
      ? 'border-emerald-500/40 bg-emerald-50/90 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950/70 dark:text-emerald-100'
      : toast.variant === 'error'
        ? 'border-destructive/50 bg-destructive/10 text-destructive-foreground dark:text-destructive-foreground'
        : toast.variant === 'info'
          ? 'border-sky-500/40 bg-sky-50/90 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-100'
          : 'bg-popover/95 border-border text-popover-foreground';

  return (
    <div
      role="status"
      className={`pointer-events-auto fade-in-up shadow-pop flex items-start gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-md ${tone}`}
    >
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-snug opacity-80">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
