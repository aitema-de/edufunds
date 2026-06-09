export function ProgrammCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 md:p-8 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex gap-2 mb-2">
                <div className="w-20 h-5 rounded-full bg-slate-700" />
                <div className="w-24 h-5 rounded-full bg-slate-700" />
              </div>
              <div className="h-6 bg-slate-700 rounded w-3/4" />
            </div>
          </div>

          {/* Fördergeber */}
          <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />

          {/* Beschreibung */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-700 rounded w-5/6" />
          </div>

          {/* Details */}
          <div className="flex gap-4 mb-4">
            <div className="w-24 h-4 bg-slate-700 rounded" />
            <div className="w-28 h-4 bg-slate-700 rounded" />
            <div className="w-32 h-4 bg-slate-700 rounded" />
          </div>

          {/* Kategorien */}
          <div className="flex gap-2">
            <div className="w-20 h-6 bg-slate-700 rounded" />
            <div className="w-24 h-6 bg-slate-700 rounded" />
            <div className="w-16 h-6 bg-slate-700 rounded" />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 md:items-end">
          <div className="w-32 h-10 bg-slate-700 rounded-xl" />
          <div className="w-32 h-10 bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProgrammGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProgrammCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-4 text-center animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-slate-700 mx-auto mb-2" />
          <div className="h-8 bg-slate-700 rounded w-12 mx-auto mb-1" />
          <div className="h-3 bg-slate-700 rounded w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function FilterSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-700 rounded" />
          <div className="w-16 h-5 bg-slate-700 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
