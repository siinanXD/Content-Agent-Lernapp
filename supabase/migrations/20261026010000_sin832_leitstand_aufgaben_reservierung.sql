-- SIN-832 (Leitstand #294): dauerhafte issueweite Reservierung und providerübergreifender Reparaturzähler. Nur hinzufügen.
-- Wortlaut wie Leitstand-Migration 20261019200000_aufgaben_reservierung; hier, weil nur dieses Repo Migrationen anwendet (SIN-848).
-- Muss vor dem Merge von Leitstand #294 angewendet sein, sonst kann der Leitstand-Dispatcher nicht reservieren und startet nichts.
-- Der Aufgaben-Spiegel (Leitstand scripts/push/ausloeser.ts) schreibt diese Spalten nie; sein Upsert lässt sie unverändert.
alter table public.leitstand_aufgaben add column if not exists claim_revision integer not null default 0 check (claim_revision >= 0);
alter table public.leitstand_aufgaben add column if not exists claim_provider text check (claim_provider is null or claim_provider in ('claude', 'codex'));
alter table public.leitstand_aufgaben add column if not exists claim_id text;
alter table public.leitstand_aufgaben add column if not exists claim_at timestamptz;
alter table public.leitstand_aufgaben add column if not exists reparaturen integer not null default 0 check (reparaturen >= 0);
alter table public.leitstand_aufgaben add column if not exists claim_nachweis text;
