export function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white/55 px-6 py-14 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-ink)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}
