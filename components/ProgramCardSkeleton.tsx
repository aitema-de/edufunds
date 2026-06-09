"use client";

// Loading Skeleton für Program Cards
export function ProgramCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 md:p-8 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="w-20 h-5 rounded-full bg-slate-700" />
                <div className="w-16 h-5 rounded-full bg-slate-700" />
              </div>
              <div className="h-7 w-3/4 rounded bg-slate-700" />
            </div>
          </div>

          {/* Fördergeber */}
          <div className="h-5 w-1/2 rounded bg-slate-700 mb-3" />

          {/* Beschreibung */}
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full rounded bg-slate-700" />
            <div className="h-4 w-5/6 rounded bg-slate-700" />
            <div className="h-4 w-4/6 rounded bg-slate-700" />
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="h-4 w-24 rounded bg-slate-700" />
            <div className="h-4 w-32 rounded bg-slate-700" />
            <div className="h-4 w-28 rounded bg-slate-700" />
          </div>

          {/* Kategorien */}
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-16 rounded bg-slate-700" />
            <div className="h-6 w-20 rounded bg-slate-700" />
            <div className="h-6 w-14 rounded bg-slate-700" />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 md:items-end">
          <div className="h-11 w-36 rounded-xl bg-slate-700" />
          <div className="h-11 w-36 rounded-xl bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

// Grid von Skeletons
export function ProgramCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProgramCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default ProgramCardSkeleton;
