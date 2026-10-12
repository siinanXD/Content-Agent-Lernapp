# SIN-479: Content-Fabrik für die 6 weiteren MAF-Schwerpunkte

- Issue: https://linear.app/sinan-kahraman/issue/SIN-479
- Verwandt: https://linear.app/sinan-kahraman/issue/SIN-217 (AP-20 gemeinsame Module), `docs/decisions/SIN-431-indkfl-fabrik.md`, `docs/content/README.md`

## Entscheidung

- `MAP_COURSES` enthält jetzt auch `maf-kunststoff`, `maf-textil`, `maf-textilveredelung`, `maf-lebensmittel`, `maf-druckverarbeitung`, `maf-packmittel`. Die Kurs-Kennungen vergab die Datenbank zufällig (AP-20-Migration), sie stehen nicht im Repo. Darum löst `resolveCourseId()` den Kurs über das Stichwort `Maschinen- und Anlagenführer – Schwerpunkt <X>` (nicht Mock) zur Laufzeit auf. Keine neue Migration, keine Kopie von Kursen.
- Gemeinsame Module erzeugt nur MAF Metall. `buildQueue()` führt ein neutrales Shared-Modul (heute laut `neutralSharedModuleIds`) nur in der ersten MAF-Map; die Schwerpunkte zeigen es per `course_shared_modules`. Der Test belegt, dass kein Schwerpunkt ein Shared-Modul in der Queue hat.
- `chooseRunMap()`: Metall und Industriekaufleute wechseln sich wie bisher ab (Metall mit unberührten Modulen zuerst). Erst wenn beide nichts mehr offen haben, kommt der erste Schwerpunkt mit offenen Einheiten in der Reihenfolge Kunststoff, Textil, Textilveredelung, Lebensmittel, Druckverarbeitung, Packmittel; ein Schwerpunkt wird fertig, bevor der nächste beginnt.
- Schalter: Die Schwerpunkte erzeugt die Fabrik nur mit `CONTENT_GROW_SCHWERPUNKTE=1`. Ohne ihn sind sie nicht `supported`, der Trockenlauf plant sie trotzdem mit. Grund: Sinan verlangt den Start erst nach dem Modellvergleich `ab-haiku-sonnet`, und die Workflows sollen dafür nicht geändert werden (Risiko `high`).
- Lauf-Bericht (`RunReport.mapPlan`, Trockenlauf-Tabelle, Linear-Kommentar): je Map Ziel, vorhanden, geteilt, neu. Geteilt = Einheiten der Shared-Module, die nicht in der Queue der Map stehen. Neu = nicht veröffentlicht und nicht verworfen.

## Annahmen

- Die Kurse der Schwerpunkte existieren in Supabase mit dem Stichwort aus der AP-20-Migration. Fehlt einer, warnt der Lauf (`::warning::Kurs fehlt`) und lässt die Map aus.
- Geteilt wird nur, was `checkSharedModule` als neutral einstuft (D-40, bisher M0). „Jahr 1 der betrieblichen Achse“ ist laut `docs/content/README.md` gleich, steckt aber nicht in einem eigenen Modul mit gleichem Fingerabdruck; es wird nicht zusätzlich geteilt, bis `checkSharedModule` es als neutral erkennt. Folge-Issue, falls der Trockenlauf zu viele doppelte Einheiten zeigt.
- Verknüpfung (`shared_modules`, `course_shared_modules`) über M0 hinaus entsteht erst, wenn Metall die Einheiten erzeugt hat (Quellkurs braucht Einheiten mit `shared_module_key`). Das ist nicht Teil dieses PR.
- Kosten laut Issue: etwa 0,085 € je Einheit, 650-750 neue Einheiten je Schwerpunkt, also 55-65 € je Schwerpunkt; Deckel je Lauf (20 €) und je Woche (60 €) bleiben.
