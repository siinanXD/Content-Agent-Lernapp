"use client";

import { useState, type InputHTMLAttributes } from "react";
import { TextField } from "@/components/ui/text-field";

/** Passwortfeld mit „Passwort anzeigen“ (Kontrollkästchen: per Tastatur und Screenreader bedienbar). */
export function PasswortFeld({
  id,
  label = "Passwort",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; label?: string; error?: string }) {
  const [sichtbar, setSichtbar] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <TextField label={label} id={id} name={id} type={sichtbar ? "text" : "password"} required {...props} />
      <label className="flex items-center text-sm text-[var(--color-text-secondary)]">
        <input
          type="checkbox"
          checked={sichtbar}
          onChange={(e) => setSichtbar(e.target.checked)}
          className="checkbox-44 -ml-3"
        />
        Passwort anzeigen
      </label>
    </div>
  );
}
