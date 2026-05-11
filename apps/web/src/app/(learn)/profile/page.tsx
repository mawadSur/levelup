import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  MonoLabel,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@levelup/ui';
import { auth, certificates, assessments } from '@/lib/api';
import { apiGet } from '@/lib/api';
import { getSessionUser } from '@/lib/auth-client';
import { ProfileHeader } from '@/components/learn/profile/profile-header';
import { EditProfileForm } from '@/components/learn/profile/edit-profile-form';
import { BaselineCard } from '@/components/learn/profile/baseline-card';
import { CertificatesList } from '@/components/learn/profile/certificates-list';
import { BadgeWall } from '@/components/learn/achievements/badge-wall';

export const metadata: Metadata = {
  title: 'Profile',
};

// ---------------------------------------------------------------------------
// Backend badge shape (mirrors the Badge model)
// ---------------------------------------------------------------------------
interface BackendBadge {
  id: string;
  userId: string;
  slug: string;
  label: string;
  awardedAt: string; // ISO string from JSON
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  xpReward: number;
  description: string;
  iconKey: string;
}

export default async function ProfilePage() {
  const [sessionResult, meResult, certsResult, assessmentsResult, badgesResult] =
    await Promise.allSettled([
      getSessionUser(),
      auth.me(),
      certificates.listMyCerts(),
      assessments.listMyAssessments(),
      // TODO: Replace with a dedicated /users/me/badges endpoint once the
      // backend exposes it. For now we attempt the call defensively; if it
      // 404s or errors the badge wall still renders (all locked).
      apiGet<BackendBadge[]>('/users/me/badges'),
    ]);

  const session = sessionResult.status === 'fulfilled' ? sessionResult.value : null;
  const me = meResult.status === 'fulfilled' ? meResult.value : null;
  const certs = certsResult.status === 'fulfilled' ? certsResult.value : [];
  const myAssessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];

  // Badge data — falls back to empty array on any error (endpoint may not exist yet)
  const rawBadges: BackendBadge[] =
    badgesResult.status === 'fulfilled' ? (badgesResult.value ?? []) : [];
  const badgesUnavailable = badgesResult.status === 'rejected';

  const earnedBadges = rawBadges.map((b) => ({
    slug: b.slug,
    awardedAt: b.awardedAt ? new Date(b.awardedAt) : undefined,
  }));

  // Merge session + me data for display
  const displayName = me?.name ?? session?.name ?? session?.email ?? 'Unknown';

  // The me() response validates against sessionUserSchema which lacks aiLevel.
  // The server may return it as an extra field; we cast to access it safely.
  const meExt = me as (typeof me & { aiLevel?: string }) | null;

  // We need a SessionUser-shaped object for ProfileHeader
  const sessionId = session?.id ?? session?.userId ?? '';
  const profileUser = {
    id: sessionId,
    userId: sessionId,
    organizationId: session?.organizationId ?? '',
    role: (session?.role ?? 'EMPLOYEE') as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
    email: session?.email ?? '',
    name: displayName,
  };

  return (
    <div className="mx-auto max-w-content space-y-8 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>YOUR PROFILE</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Profile</h1>
      </header>

      <ProfileHeader user={profileUser} aiLevel={meExt?.aiLevel} department={null} />

      {/* Tabbed sections */}
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ---- Profile tab ---- */}
        <TabsContent value="profile" className="space-y-6">
          {/* Edit profile */}
          <EditProfileForm initialName={displayName} />

          {/* Baseline assessment */}
          <BaselineCard assessments={myAssessments} />

          {/* Certificates */}
          <CertificatesList certificates={certs} />
        </TabsContent>

        {/* ---- Achievements tab ---- */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>Badges you&apos;ve earned on your learning journey.</CardDescription>
            </CardHeader>
            <CardContent>
              {badgesUnavailable && (
                <p className="mb-4 text-xs text-paper-300 italic">
                  Badge data coming soon — earned badges will appear here once the endpoint is live.
                </p>
              )}
              <BadgeWall earnedBadges={earnedBadges} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Activity tab ---- */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Your recent lesson completions and quiz attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center">
                <p className="text-sm text-paper-300">
                  Detailed activity log is coming soon. Your progress is tracked and will appear
                  here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
