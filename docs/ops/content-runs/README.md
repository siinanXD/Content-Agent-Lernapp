# Content-Läufe (AP-23)

Ein JSON je Lauf von `.github/workflows/content-grow.yml`, per PR eingereicht. Felder: `scripts/content-grow.ts` / `RunReport` in `src/lib/generate/content-grow.ts`.

Der nächste Lauf liest diese Berichte: `discardedUnitIds` (nicht erneut versuchen), `sourceRefresh.changeKeys` (Quellenänderung schon behandelt), `resumeModuleId` (vom Deckel unterbrochenes Modul zuerst) und die Kosten je Einheit. Berichte nicht von Hand ändern.

Lokal prüfen: `COURSE_STORAGE=supabase npm run content:grow:dry` (braucht die Secrets aus `docs/ENV.md`, ruft keine Claude-API auf).
