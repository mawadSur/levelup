import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
} from '@levelup/ui';
import type { Certificate } from '@/lib/api/certificates';

interface CertificatesListProps {
  certificates: Certificate[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CertificatesList({ certificates }: CertificatesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Certificates</CardTitle>
        <CardDescription>Credentials earned by completing learning paths.</CardDescription>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center">
            <svg
              className="mx-auto mb-3 h-8 w-8 text-paper-300/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            <p className="text-sm text-paper-300">
              Complete a learning path to earn your first certificate.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {certificates.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-paper-100">{cert.pathTitle}</p>
                    <Badge variant="secondary" className="text-xs">
                      Certificate
                    </Badge>
                  </div>
                  <p className="text-xs text-paper-300">
                    Issued {formatDate(cert.issuedAt)}
                    {cert.expiresAt && ` · Expires ${formatDate(cert.expiresAt)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`/api/certificates/${cert.id}/download`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">
                      Verify
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
