import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function GET(_req: NextRequest) {
  try {
    const upstream = await fetch(`${API_URL}/api/health`, {
      cache: 'no-store',
    });

    const body: unknown = await upstream.json();

    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: 'error', message: 'API unreachable' }, { status: 503 });
  }
}
