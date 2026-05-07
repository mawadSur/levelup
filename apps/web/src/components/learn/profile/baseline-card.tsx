import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
} from '@levelup/ui';
import type { MyAssessment } from '@/lib/api/assessments';

interface BaselineCardProps {
  assessments: MyAssessment[];
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  };
  return map[level] ?? level;
}

function levelVariant(level: string): 'default' | 'secondary' | 'outline' {
  if (level === 'ADVANCED') return 'default';
  if (level === 'INTERMEDIATE') return 'secondary';
  return 'outline';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BaselineCard({ assessments }: BaselineCardProps) {
  const baseline = assessments.find((a) => a.type === 'BASELINE') ?? assessments[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baseline assessment</CardTitle>
        <CardDescription>
          Your AI proficiency level, used to personalise your learning path.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {baseline ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={levelVariant(baseline.recommendedLevel)}
                className="text-sm px-3 py-1"
              >
                {levelLabel(baseline.recommendedLevel)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {baseline.score}% &middot; Taken {formatDate(baseline.completedAt)}
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/assessment">Retake assessment</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              You have not taken the baseline assessment yet.
            </p>
            <Button asChild className="mt-4">
              <Link href="/assessment">Take the baseline assessment</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
