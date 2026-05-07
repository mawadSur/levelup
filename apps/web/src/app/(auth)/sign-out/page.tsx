'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';
import { auth } from '@/lib/api';

const STUB_TOKEN_KEY = 'levelup_dev_access_token';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // Best-effort audit-log on the API; fire-and-forget.
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

  return <div className="text-sm text-muted-foreground">Signing you out…</div>;
}
