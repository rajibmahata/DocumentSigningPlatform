/**
 * Shown by Next.js while /dashboard/page.tsx is loading (first visit after login).
 * Uses the same layout structure as the real page so the transition is seamless.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-7 w-10 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent envelopes skeleton */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-8 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
