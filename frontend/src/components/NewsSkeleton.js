export function NewsSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse overflow-hidden rounded-2xl border border-[var(--border)] bg-white/70 ${
            i === 0 ? 'sm:col-span-2' : ''
          }`}
        >
          <div className={`bg-[var(--chip)] ${i === 0 ? 'h-72' : 'h-48'}`} />
          <div className="space-y-3 p-5">
            <div className="h-3 w-2/5 rounded bg-[var(--chip)]" />
            <div className="h-4 w-full rounded bg-[var(--chip)]" />
            <div className="h-3 w-5/6 rounded bg-[var(--chip)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
