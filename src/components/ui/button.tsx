import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)] hover:opacity-95",
  secondary:
    "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[1.5px] border-[var(--color-border-subtle)]",
  ghost:
    "bg-transparent text-[var(--color-brand-primary)] underline-offset-4 hover:underline",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] px-5 py-3.5 text-base font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      style={{ fontFamily: "var(--font-display)" }}
      {...props}
    >
      {children}
    </button>
  );
}
