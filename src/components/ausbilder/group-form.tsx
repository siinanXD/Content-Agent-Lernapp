"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { getAccessToken } from "@/lib/auth/browser-client";
import { checkGroupInput } from "@/lib/ausbilder/gruppe";

/** Gruppe anlegen (SIN-356): Name, Schwerpunkt, optional Kursbeginn und Prüfungstermin. */
export function GroupForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [schwerpunkt, setSchwerpunkt] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const input = checkGroupInput({ name, schwerpunkt, startsOn, examDate });
    if (!input.ok) return setError(input.error);
    setError("");
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/ausbilder/gruppe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input.value),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) return onCreated();
      setError(data?.error ?? "Die Gruppe konnte nicht angelegt werden.");
    } catch {
      setError("Die Gruppe konnte nicht angelegt werden. Bitte versuchen Sie es noch einmal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="gruppe-anlegen-titel"
      className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-8"
    >
      <h2
        id="gruppe-anlegen-titel"
        className="text-lg font-medium"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Gruppe anlegen
      </h2>
      <TextField
        id="gruppe-name"
        label="Name der Gruppe"
        value={name}
        maxLength={80}
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
        required
      />
      <TextField
        id="gruppe-schwerpunkt"
        label="Schwerpunkt"
        value={schwerpunkt}
        maxLength={200}
        autoComplete="off"
        onChange={(e) => setSchwerpunkt(e.target.value)}
        required
      />
      <TextField
        id="gruppe-beginn"
        label="Kursbeginn (optional)"
        type="date"
        value={startsOn}
        onChange={(e) => setStartsOn(e.target.value)}
      />
      <TextField
        id="gruppe-pruefung"
        label="Prüfungstermin (optional)"
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
      />
      <p role="alert" className="min-h-5 text-sm text-[var(--color-feedback-danger)]">
        {error}
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? "Wird angelegt …" : "Gruppe anlegen"}
      </Button>
    </form>
  );
}
