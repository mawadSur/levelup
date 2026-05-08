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
            'group bg-ink-800 border border-ink-500 text-paper-100 rounded-md p-4 font-sans shadow-none',
          title: 'font-sans text-body font-medium text-paper-100',
          description: 'text-body-sm text-paper-300 mt-0.5',
          actionButton: 'bg-signal text-ink-900 rounded-sm px-3 py-1.5 text-body-sm font-medium',
          cancelButton:
            'bg-transparent border border-ink-500 text-paper-100 rounded-sm px-3 py-1.5 text-body-sm',
          success: 'border-l-2 border-l-success',
          error: 'border-l-2 border-l-danger',
          warning: 'border-l-2 border-l-warning',
          info: 'border-l-2 border-l-signal',
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
