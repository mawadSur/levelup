'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface MissionLoadingBarProps extends React.HTMLAttributes<HTMLDivElement> {
  visible?: boolean;
}

const MissionLoadingBar = React.forwardRef<HTMLDivElement, MissionLoadingBarProps>(
  ({ visible = true, className, ...props }, ref) => {
    if (!visible) return null;
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-busy="true"
        aria-label="Loading"
        className={cn(
          'fixed left-0 right-0 top-0 z-[100] h-[2px] overflow-hidden bg-ink-800',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0 h-full w-[30%] bg-signal',
            'animate-loading-bar motion-reduce:animate-none',
          )}
        />
      </div>
    );
  },
);
MissionLoadingBar.displayName = 'MissionLoadingBar';

export { MissionLoadingBar };
