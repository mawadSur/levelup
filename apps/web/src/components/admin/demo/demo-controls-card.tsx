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
        className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
        onClick={() => setOpen(true)}
      >
        Reset demo data…
      </Button>

      <DemoResetDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
