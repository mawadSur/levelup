import { apiGet } from './client';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface Certificate {
  id: string;
  userId: string;
  learningPathId: string;
  pathTitle: string;
  issuedAt: string;
  expiresAt: string | null;
  credentialUrl: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listMyCerts(): Promise<Certificate[]> {
  return apiGet<Certificate[]>('/certificates/me');
}

export async function getCert(id: string): Promise<Certificate> {
  return apiGet<Certificate>(`/certificates/${id}`);
}

export async function downloadCert(id: string): Promise<Blob> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window !== 'undefined' ? '' : 'http://localhost:4000');
  const url = `${apiBase}/api/certificates/${id}/download`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.blob();
}
