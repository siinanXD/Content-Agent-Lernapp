import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  const fieldId = id ?? "field";
  return (
    <label className={`flex w-full flex-col gap-2 ${className}`} htmlFor={fieldId}>
      <span
        className="text-sm font-medium text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {label}
      </span>
      <input
        id={fieldId}
        className="w-full rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus-visible:border-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        style={{ fontFamily: "var(--font-body)" }}
        {...props}
      />
    </label>
  );
}
