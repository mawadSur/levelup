'use client';

import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';
import type { ToasterProps } from 'sonner';

export type { ToasterProps };

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position={props.position ?? 'bottom-right'}
      offset={props.offset ?? 16}
      visibleToasts={3}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            'group bg-card border border-border/60 text-foreground shadow-lg rounded-lg p-4 font-sans',
          title: 'font-display text-base tracking-[-0.01em]',
          description: 'text-sm text-muted-foreground mt-0.5',
          actionButton:
            'bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium',
          cancelButton: 'bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm',
          success: 'border-l-4 border-l-primary',
          error: 'border-l-4 border-l-destructive',
          warning: 'border-l-4 border-l-[hsl(var(--accent-warm))]',
          info: 'border-l-4 border-l-muted-foreground',
        },
        ...(props.toastOptions ?? {}),
      }}
      {...props}
    />
  );
}

type ToastInput =
  | string
  | {
      title: string;
      description?: string;
      variant?: 'default' | 'destructive';
    };

function normalize(input: ToastInput): { message: string; opts?: { description?: string } } {
  if (typeof input === 'string') return { message: input };
  return {
    message: input.title,
    opts: input.description ? { description: input.description } : undefined,
  };
}

function toastFn(input: ToastInput) {
  const { message, opts } = normalize(input);
  if (typeof input === 'object' && input.variant === 'destructive') {
    return sonnerToast.error(message, opts);
  }
  return sonnerToast(message, opts);
}

toastFn.success = (input: ToastInput) => {
  const { message, opts } = normalize(input);
  return sonnerToast.success(message, opts);
};
toastFn.error = (input: ToastInput) => {
  const { message, opts } = normalize(input);
  return sonnerToast.error(message, opts);
};
toastFn.warning = (input: ToastInput) => {
  const { message, opts } = normalize(input);
  return sonnerToast.warning(message, opts);
};
toastFn.info = (input: ToastInput) => {
  const { message, opts } = normalize(input);
  return sonnerToast.info(message, opts);
};
toastFn.message = sonnerToast.message;
toastFn.promise = sonnerToast.promise;
toastFn.dismiss = sonnerToast.dismiss;

export const toast = toastFn;

export function useToast() {
  return { toast };
}
