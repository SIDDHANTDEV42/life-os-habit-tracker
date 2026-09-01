export function HabitGridSkeleton() {
  const rows = 5;
  const cols = 10;

  return (
    <div className="min-h-0 flex-1 animate-pulse rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-auto">
      {/* Fake header row */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700 mr-4" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="mx-0.5 h-4 w-7 rounded bg-zinc-200 dark:bg-zinc-700 shrink-0" />
        ))}
      </div>

      {/* Fake data rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-0 items-center border-b border-zinc-100 dark:border-zinc-800 px-3 py-2 last:border-b-0">
          {/* Habit name */}
          <div className="w-40 mr-4 flex items-center gap-2 shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
            <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-700" style={{ width: `${60 + (row * 17) % 60}px` }} />
          </div>
          {/* Checkbox cells */}
          {Array.from({ length: cols }).map((_, col) => (
            <div key={col} className="mx-0.5 h-4 w-7 rounded-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  );
}
