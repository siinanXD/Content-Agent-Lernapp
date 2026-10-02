export function Progress({
  value,
  label = "Fortschritt",
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-border-subtle)]"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--color-brand-primary)] transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
