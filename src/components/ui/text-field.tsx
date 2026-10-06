import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  id,
  className = "",
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Fehlertext unter dem Feld (Zustand „Fehler“); setzt aria-invalid. */
  error?: string;
}) {
  const fieldId = id ?? "field";
  const errorId = `${fieldId}-error`;
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label className="flex w-full flex-col gap-2" htmlFor={fieldId}>
        <span
          className="text-sm font-medium text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {label}
        </span>
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-[var(--radius-md)] border-[1.5px] bg-[var(--color-bg-surface)] px-3.5 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus-visible:border-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] ${
            error
              ? "border-[var(--color-feedback-danger)]"
              : "border-[var(--color-border-subtle)]"
          }`}
          style={{ fontFamily: "var(--font-body)" }}
          {...props}
        />
      </label>
      {error ? (
        <p
          id={errorId}
          className="text-sm text-[var(--color-feedback-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
