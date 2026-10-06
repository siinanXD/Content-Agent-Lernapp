export function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  /** Zweite Zeile unter dem Label (Figma 26), wird dem Schalter als Beschreibung zugeordnet */
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex min-h-11 items-center justify-between gap-3 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] text-[var(--color-text-primary)]">{label}</span>
        {description ? (
          <span
            id={`${id}-description`}
            className="text-[13px] text-[var(--color-text-secondary)]"
          >
            {description}
          </span>
        ) : null}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? `${id}-description` : undefined}
        onChange={(e) => onChange(e.target.checked)}
        className="h-11 w-11 shrink-0 accent-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      />
    </label>
  );
}
