-- SIN-416: Admin-Rolle für Organisationen und Zugänge. Nur hinzufügen, nichts löschen.
-- Die Rolle `admin` steht in app_metadata und lässt sich nur mit dem Service-Role-Key setzen.
-- Admin-Routen laufen auf dem Server mit dem Service-Role-Key, nachdem sie die Rolle geprüft haben;
-- anon und authenticated bekommen weiterhin keinen Zugriff auf diese Tabellen.

-- Ansprechperson der Organisation (geschäftliche E-Mail, keine Daten von Lernenden).
alter table public.organisations
  add column if not exists contact_email text
  check (contact_email is null or char_length(contact_email) between 3 and 254);

notify pgrst, 'reload schema';
