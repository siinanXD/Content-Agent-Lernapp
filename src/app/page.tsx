"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { MobileShell } from "@/components/learner/mobile-shell";
import { saveSession } from "@/lib/learner/session";

type Variant = "pruefung" | "weiterbildung";

export default function StartPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("Maschinen- und Anlagenführer");
  const [variant, setVariant] = useState<Variant>("pruefung");

  function startCourse() {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    saveSession({
      keyword: trimmed,
      variant,
      streakDays: 7,
      totalPoints: 1720,
    });
    router.push("/lernpfad");
  }

  return (
    <MobileShell>
      <section
        className="flex flex-col gap-4 bg-gradient-to-br from-[var(--color-bg-hero)] to-[var(--color-brand-primary)] px-7 pb-10 pt-14"
        aria-labelledby="brand-title"
      >
        <h1
          id="brand-title"
          className="text-[34px] font-bold leading-10 text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Content-Agent-Lernapp
        </h1>
        <p
          className="text-xl font-medium leading-7 text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Aus einem Schlagwort wird dein MAF-Kurs.
        </p>
        <p className="text-[15px] leading-[22px] text-[#d9e8ed]">
          Offizielle AO und RLP. Einheiten à 5–10 Minuten. Du gibst nur das Ziel
          vor.
        </p>
      </section>

      <section className="flex flex-col gap-5 px-6 pb-8 pt-6">
        <TextField
          label="Schlagwort"
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Maschinen- und Anlagenführer"
        />

        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="mb-1 text-sm font-medium text-[var(--color-text-primary)]">
            Lernvariante
          </legend>
          <VariantCard
            selected={variant === "pruefung"}
            title="Prüfungsvorbereitung · 2 Monate"
            detail="40 Tage · ca. 2,5 h/Tag · Fokus Abschlussprüfung"
            onSelect={() => setVariant("pruefung")}
          />
          <VariantCard
            selected={variant === "weiterbildung"}
            title="Weiterbildung · 3 Monate"
            detail="60 Tage · ca. 2 h/Tag · volle Lernfelder"
            onSelect={() => setVariant("weiterbildung")}
          />
        </fieldset>

        <Button onClick={startCourse} disabled={!keyword.trim()}>
          Kurs erzeugen
        </Button>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Design laut Figma — Freigabe durch Sinan ausstehend (SIN-185).
        </p>
      </section>
    </MobileShell>
  );
}

function VariantCard({
  selected,
  title,
  detail,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] ${
        selected
          ? "border-2 border-[var(--color-brand-primary)]"
          : "border-[1.5px] border-[var(--color-border-subtle)]"
      }`}
    >
      <span
        className="text-[15px] font-medium text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </span>
      <span className="text-[13px] leading-[18px] text-[var(--color-text-secondary)]">
        {detail}
      </span>
    </button>
  );
}
