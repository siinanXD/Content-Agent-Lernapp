/** @jsxImportSource @revideo/2d/lib */
import { Img, Rect, Txt, Video, makeScene2D } from "@revideo/2d";
import { all, createRef, useScene, waitFor } from "@revideo/core";

// Titel (3 s) → Aufnahme mit Texteinblendung je Schritt → Abspann mit Logo und KI-Hinweis (3 s).
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

  // Titel
  const titel = createRef<Txt>();
  view.add(<Txt ref={titel} text="Lern-App: so funktioniert es" fontFamily={schrift} fontSize={64} fill={f.textAufDunkel} />);
  yield* waitFor(INTRO);
  titel().remove();

  // Aufnahme
  const clip = createRef<Video>();
  const band = createRef<Rect>();
  const zeile = createRef<Txt>();
  const kopf = createRef<Txt>();
  yield view.add(<Video ref={clip} src="/aufnahme.mp4" size={[1280, 720]} play />);
  view.add(
    <Rect ref={band} width={1280} height={120} y={300} fill={f.hero} opacity={0.92} layout direction="column" justifyContent="center" alignItems="center" gap={4}>
      <Txt ref={kopf} text="" fontFamily={schrift} fontSize={22} fill={f.akzent} />
      <Txt ref={zeile} text="" fontFamily={schrift} fontSize={36} fill={f.textAufDunkel} />
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
  band().remove();

  // Abspann: Logo und Hinweis
  const logo = createRef<Img>();
  const tag = createRef<Txt>();
  yield view.add(<Img ref={logo} src="/logo.svg" width={160} y={-60} />);
  view.add(<Txt ref={tag} text={hinweis} fontFamily={schrift} fontSize={32} y={100} fill={f.textAufDunkel} />);
  yield* waitFor(OUTRO);
});
