import { MissionLoadingBar, MonoLabel, Skeleton } from '@levelup/ui';

export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <MissionLoadingBar />
      <header className="space-y-3">
        <MonoLabel>ADMIN / DASHBOARD</MonoLabel>
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-5 w-1/2 max-w-md" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-md" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>

      <Skeleton className="h-44 w-full rounded-md" />
      <Skeleton className="h-40 w-full rounded-md" />
    </div>
  );
}
