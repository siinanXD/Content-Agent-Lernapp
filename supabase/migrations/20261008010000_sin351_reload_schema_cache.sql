-- SIN-351: PostgREST kannte content_factory_runs nach 20261007020000 nicht (dort fehlte der Schema-Reload),
-- die Abfrage lieferte 404 und die Kennzahlen meldeten „Tabelle fehlt“. Nur Neuladen, keine Datenänderung.
notify pgrst, 'reload schema';
