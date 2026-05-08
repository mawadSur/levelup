'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MonoLabel } from '@levelup/ui';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';
import { auth } from '@/lib/api';

const STUB_TOKEN_KEY = 'levelup_dev_access_token';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await auth.signOut().catch(() => undefined);
      } catch {
        // ignore
      }
      try {
        if (isSupabaseConfiguredOnClient()) {
          await getSupabaseBrowserClient().auth.signOut();
        } else {
          window.localStorage.removeItem(STUB_TOKEN_KEY);
        }
      } catch {
        // ignore — we still navigate to /sign-in below
      }
      if (!cancelled) {
        router.replace('/sign-in');
        router.refresh();
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="space-y-6 text-center">
      <MonoLabel className="block text-paper-500">MISSION BRIEF / SIGN OUT</MonoLabel>
      <h1 className="font-serif text-display-md text-paper-100">
        <em className="italic text-signal">Session terminated.</em>
      </h1>
      <p className="text-body-sm text-paper-300">
        Returning you to the sign-in console&hellip;
      </p>
      <div className="flex justify-center gap-2 pt-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-signal" />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-signal"
          style={{ animationDelay: '0.15s' }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-signal"
          style={{ animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
}
