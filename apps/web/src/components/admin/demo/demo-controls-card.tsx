'use client';

import * as React from 'react';
import { Button } from '@levelup/ui';
import { DemoResetDialog } from './demo-reset-dialog';

/**
 * Client island rendered inside the server-side DemoControls card.
 * Keeps dialog open/close state local so the server component stays pure.
 */
export function DemoControlsCard() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="border-warning text-warning hover:bg-warning/15 dark:border-warning dark:text-warning dark:hover:bg-warning/15"
        onClick={() => setOpen(true)}
      >
        Reset demo data…
      </Button>

      <DemoResetDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
