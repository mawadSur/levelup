import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { ssrGet } from '@/lib/api/server-fetch';
import { ApiError } from '@/lib/api/errors';
import type { LabSummary } from '@/lib/api/labs';

export const metadata: Metadata = {
  title: 'Hands-On Labs',
};

export default async function LabsIndexPage() {
  let labs: LabSummary[] | null = null;
  let loadError: { status: number; message: string } | null = null;

  try {
    labs = await ssrGet<LabSummary[]>('/labs');
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = { status: err.status, message: err.message };
    } else {
      loadError = {
        status: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="space-y-3">
        <MonoLabel>HANDS-ON LABS</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">
          Practice in a safe sandbox.
        </h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          Each lab puts you in a real-world scenario with an AI counterpart. Make your moves, submit
          your attempt, and the grader scores you on what mattered. Pass labs to earn XP and advance
          your streak.
        </p>
      </header>

      {!labs ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-body-sm text-paper-300">
              {loadError?.status === 401
                ? 'You need to sign in to view labs.'
                : 'Labs are unavailable right now. Refresh in a moment.'}
            </p>
            {loadError && (
              <p className="font-mono text-mono-sm text-paper-500">
                HTTP {loadError.status} · {loadError.message}
              </p>
            )}
          </CardContent>
        </Card>
      ) : labs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              MORE LABS COMING SOON
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {labs.map((lab) => (
            <LabTile key={lab.id} lab={lab} />
          ))}
        </div>
      )}
    </div>
  );
}

function LabTile({ lab }: { lab: LabSummary }) {
  return (
    <Link
      href={`/labs/${encodeURIComponent(lab.slug)}`}
      className="group block rounded-md border border-ink-700 bg-ink-800 p-5 transition-colors hover:border-signal/50"
    >
      <div className="flex items-start justify-between gap-3">
        <MonoLabel tone="signal">LAB</MonoLabel>
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          {lab.estimatedMinutes} MIN
        </span>
      </div>
      <h3 className="mt-4 font-serif text-h3 italic text-paper-100">{lab.title}</h3>
      <p className="mt-2 text-body-sm text-paper-300">{lab.brief}</p>
      <p className="mt-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        START LAB →
      </p>
    </Link>
  );
}
