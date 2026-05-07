import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@levelup/ui';

interface SensitiveWarningBannerProps {
  reason?: string;
}

/**
 * Inline banner shown above an assistant message when the coach flags
 * sensitive data in the user's input. Visual only — toasts are fired
 * separately by the chat component.
 */
export function SensitiveWarningBanner({ reason }: SensitiveWarningBannerProps) {
  return (
    <Alert
      variant="destructive"
      className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-200 dark:[&>svg]:text-amber-300"
    >
      <ShieldAlert className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Sensitive data detected</AlertTitle>
      <AlertDescription>
        {reason ??
          'Your prompt looks like it may contain sensitive information (PII, secrets, or customer data). Consider redacting it before sharing with public AI tools.'}
      </AlertDescription>
    </Alert>
  );
}
