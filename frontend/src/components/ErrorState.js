export function ErrorState({ message, onRetry }) {
  return (
    <div className="mb-4 rounded-xl border border-[rgba(180,35,24,0.2)] bg-[rgba(180,35,24,0.06)] px-4 py-3 text-sm text-[var(--danger)]">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-2">
          Retry
        </button>
      ) : null}
    </div>
  );
}
