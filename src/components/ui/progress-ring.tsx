const SIZE = 76;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * ProgressRing (Figma, Stil E): Tagesziel als Ring, Wert „2/4“ in Geist Mono.
 * Orange Fortschritt auf hellem Track, beginnt oben und läuft im Uhrzeigersinn.
 */
export function ProgressRing({
  done,
  total,
  label = "heute",
  onDark = false,
  showLabel = true,
}: {
  done: number;
  total: number;
  label?: string;
  /** Auf dunkler Karte (Figma 22 „Tagesziel-Karte“): dunkler Track, heller Wert */
  onDark?: boolean;
  /** Beschriftung unter dem Wert sichtbar; für Screenreader bleibt sie erhalten */
  showLabel?: boolean;
}) {
  const ratio = total <= 0 ? 0 : Math.max(0, Math.min(1, done / total));
  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="progressbar"
      aria-label={`Tagesziel ${label}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(done, total)}
      aria-valuetext={`${done} von ${total} ${label}`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={onDark ? "var(--color-track-on-dark)" : "var(--color-border-subtle)"}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-brand-primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className={`text-[18px] font-semibold ${
            onDark ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-primary)]"
          }`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {done}/{total}
        </span>
        {showLabel ? (
          <span
            className={`mt-1 text-[10px] ${
              onDark
                ? "text-[var(--color-text-soft-on-dark)]"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
