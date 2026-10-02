export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p
        className="text-sm font-medium tracking-wide"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Content-Agent-Lernapp
      </p>
      <h1
        className="text-4xl font-semibold tracking-tight"
        style={{
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-display)",
        }}
      >
        Kurs aus einem Schlagwort — aus amtlichen Quellen.
      </h1>
      <p
        className="text-lg leading-8"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Scaffold für den autonomen Kurs-Generator. Pilotberuf: Maschinen- und
        Anlagenführer. Inhalte kommen über die Pipeline-API; Design folgt der
        freigegebenen Figma-Datei.
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Status: AP-07 Design-Tokens (Freigabe Sinan ausstehend). Siehe
        docs/design/FIGMA.md.
      </p>
    </main>
  );
}
