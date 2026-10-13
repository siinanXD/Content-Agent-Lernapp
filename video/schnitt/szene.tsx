/** @jsxImportSource @revideo/2d/lib */
import { Img, Rect, Txt, Video, makeScene2D } from "@revideo/2d";
import { all, createRef, useScene, waitFor } from "@revideo/core";

// Titel (3 s) → Handy-Aufnahme im Rahmen, Schritt-Text daneben (nie über der App, SIN-522) → Abspann mit Logo und KI-Hinweis (3 s).
// Farben und Texte kommen als Variablen aus den Design-Tokens (render.mjs), nichts ist hier fest.
const INTRO = 3;
const OUTRO = 3;

export default makeScene2D("szene", function* (view) {
  const v = useScene().variables;
  const schritte = v.get("schritte", [] as { titel: string; text: string; startMs: number }[])();
  const aufnahmeSek = v.get("aufnahmeSek", 10)();
  const f = v.get("farben", {} as Record<string, string>)();
  const hinweis = v.get("hinweis", "")();
  const schrift = "Geist, Helvetica, Arial, sans-serif";

  view.fill(f.hero);

  // Werbeclip (SIN-520): KI-Clip in voller Größe, dauerhaft mit Hinweis „Mit KI erstellt“, kein Titel, kein Abspann.
  const werbe = v.get("werbeclip", null as { sekunden: number; text: string } | null)();
  if (werbe) {
    const ki = createRef<Video>();
    view.add(<Video ref={ki} src="/aufnahme.mp4" size={[1280, 720]} play />);
    view.add(
      <Rect width={260} height={48} x={500} y={320} fill={f.hero} opacity={0.92} layout justifyContent="center" alignItems="center">
        <Txt text={werbe.text} fontFamily={schrift} fontSize={24} fill={f.textAufDunkel} />
      </Rect>,
    );
    yield* waitFor(werbe.sekunden);
    return;
  }

  // Titel
  const titel = createRef<Txt>();
  view.add(<Txt ref={titel} text="Lern-App: so funktioniert es" fontFamily={schrift} fontSize={64} fill={f.textAufDunkel} />);
  yield* waitFor(INTRO);
  titel().remove();

  // Aufnahme
  const HOEHE = 1000;
  const BREITE = Math.round((HOEHE * 390) / 844);
  const clip = createRef<Video>();
  const rahmen = createRef<Rect>();
  const spalte = createRef<Rect>();
  const zeile = createRef<Txt>();
  const kopf = createRef<Txt>();
  view.add(<Rect ref={rahmen} x={-560} width={BREITE + 24} height={HOEHE + 24} radius={36} stroke={f.akzent} lineWidth={6} fill={f.hero} />);
  yield view.add(<Video ref={clip} src="/aufnahme.mp4" size={[BREITE, HOEHE]} x={-560} radius={24} clip play />);
  view.add(
    <Rect ref={spalte} x={330} width={900} layout direction="column" alignItems="start" gap={24}>
      <Txt ref={kopf} text="" fontFamily={schrift} fontSize={32} fill={f.akzent} />
      <Txt ref={zeile} text="" fontFamily={schrift} fontSize={60} fill={f.textAufDunkel} width={900} textWrap />
    </Rect>,
  );
  yield* all(
    (function* () {
      let vorher = 0;
      for (let i = 0; i < schritte.length; i++) {
        const s = schritte[i];
        yield* waitFor(Math.max(0, s.startMs / 1000 - vorher));
        vorher = s.startMs / 1000;
        kopf().text(`Schritt ${i + 1} von ${schritte.length} · ${s.titel}`);
        zeile().text(s.text);
      }
      yield* waitFor(Math.max(0, aufnahmeSek - vorher));
    })(),
  );
  clip().remove();
  rahmen().remove();
  spalte().remove();

  // Abspann: Logo und Hinweis
  const logo = createRef<Img>();
  const tag = createRef<Txt>();
  yield view.add(<Img ref={logo} src="/logo.svg" width={160} y={-60} />);
  view.add(<Txt ref={tag} text={hinweis} fontFamily={schrift} fontSize={32} y={100} fill={f.textAufDunkel} />);
  yield* waitFor(OUTRO);
});
