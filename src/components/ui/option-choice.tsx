type State = "default" | "selected" | "correct" | "wrong";

const border: Record<State, string> = {
  default: "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]",
  selected: "border-[var(--color-brand-primary)] bg-[var(--color-bg-surface)]",
  correct: "border-[var(--color-feedback-success)] bg-[var(--color-bg-surface)]",
  wrong: "border-[var(--color-feedback-danger)] bg-[var(--color-bg-surface)]",
};

export function OptionChoice({
  label,
  state = "default",
  onSelect,
  disabled,
}: {
  label: string;
  state?: State;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-[52px] w-full items-center rounded-[var(--radius-md)] border-2 px-4 py-3 text-left text-[15px] text-[var(--color-text-primary)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:opacity-80 ${border[state]}`}
      style={{ fontFamily: "var(--font-body)" }}
      aria-pressed={state === "selected" || state === "correct"}
    >
      {label}
    </button>
  );
}
