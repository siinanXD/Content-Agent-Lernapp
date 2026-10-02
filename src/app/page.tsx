export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-zinc-600">
        Content-Agent-Lernapp
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
        Kurs aus einem Schlagwort — aus amtlichen Quellen.
      </h1>
      <p className="text-lg leading-8 text-zinc-700">
        Scaffold für den autonomen Kurs-Generator. Pilotberuf: Maschinen- und
        Anlagenführer. Inhalte kommen über die Pipeline-API; Design folgt der
        freigegebenen Figma-Datei.
      </p>
      <p className="text-sm text-zinc-500">
        Status: AP-01 Repo &amp; Build. Siehe docs/PRODUCT.md.
      </p>
    </main>
  );
}
