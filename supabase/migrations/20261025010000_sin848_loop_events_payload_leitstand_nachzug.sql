-- SIN-848 / SIN-830: Leitstand-Ledger funktionsfähig machen (additive only; no DROP/TRUNCATE/DELETE).
-- 1) loop_events.payload: Prüfer, Trend, Markt und Lern-Schleife im Leitstand schreiben ihr Ergebnis als `payload`
--    (Structured JSON). Die Spalte fehlte, PostgREST antwortete 400, die Belege gingen still verloren.
-- 2) Nachzug der Leitstand-Migrationen, die im Repo siinanXD/Leitstand liegen, aber nie angewendet wurden
--    (Leitstand prüft nur, wendet nicht an): loop_events.wirkung (SIN-637), kennzahlen_woche (SIN-630),
--    leitstand_einstellungen/leitstand_wochencheck (SIN-631), leitstand_aufgaben.haken_* (SIN-754), .bezug (SIN-814).
--    Wortlaut 1:1 aus dem Leitstand-Repo; nur `revoke truncate, references, trigger … from service_role`
--    entfällt (die Grants darunter geben service_role ohnehin nur select/insert/update).

alter table public.loop_events add column if not exists payload jsonb;

-- SIN-637: Wirkung je Rollen-Ereignis. Zielerreichung 0 bis 1.
alter table public.loop_events add column if not exists wirkung numeric check (wirkung is null or (wirkung >= 0 and wirkung <= 1));

-- SIN-630: Wochenwerte der drei Kennzahlen als Zähler/Nenner.
create table if not exists public.kennzahlen_woche (
  produkt text not null,
  kennzahl text not null check (kennzahl in ('verkaufsfertig', 'kosten_je_einheit', 'fehlgeschlagene_aenderungen')),
  woche date not null,
  zaehler numeric not null check (zaehler >= 0),
  nenner numeric not null check (nenner >= 0),
  aktualisiert_at timestamptz not null default now(),
  primary key (produkt, kennzahl, woche)
);

alter table public.kennzahlen_woche enable row level security;
alter table public.kennzahlen_woche force row level security;

create policy kennzahlen_woche_lesen_service on public.kennzahlen_woche for select to service_role using (true);
create policy kennzahlen_woche_schreiben on public.kennzahlen_woche for insert to service_role with check (true);
create policy kennzahlen_woche_aendern on public.kennzahlen_woche for update to service_role using (true) with check (true);
create policy kennzahlen_woche_lesen_nutzer on public.kennzahlen_woche for select to authenticated using (exists (select 1 from public.leitstand_nutzer));

revoke all on public.kennzahlen_woche from public, anon, authenticated;
grant select on public.kennzahlen_woche to authenticated;
grant select, insert, update on public.kennzahlen_woche to service_role;

-- SIN-631: Wochen-Check. Einstellungen (Push-Uhrzeit) und das Ergebnis je Sonntag.
create table if not exists public.leitstand_einstellungen (
  schluessel text primary key,
  wert text not null,
  aktualisiert_at timestamptz not null default now()
);

create table if not exists public.leitstand_wochencheck (
  tag date primary key,
  notiz text not null,
  erstellt_at timestamptz not null default now()
);

alter table public.leitstand_einstellungen enable row level security;
alter table public.leitstand_einstellungen force row level security;
alter table public.leitstand_wochencheck enable row level security;
alter table public.leitstand_wochencheck force row level security;

create policy leitstand_einstellungen_service on public.leitstand_einstellungen for all to service_role using (true) with check (true);
create policy leitstand_wochencheck_service on public.leitstand_wochencheck for all to service_role using (true) with check (true);

revoke all on public.leitstand_einstellungen, public.leitstand_wochencheck from public, anon, authenticated;
grant select, insert, update on public.leitstand_einstellungen, public.leitstand_wochencheck to service_role;

-- SIN-754: Fertig-Kriterien je Linear-Issue an der Aufgaben-Karte.
alter table public.leitstand_aufgaben add column if not exists haken_gesamt integer;
alter table public.leitstand_aufgaben add column if not exists haken_erledigt integer;

-- SIN-814: Eltern- und verwandte Linear-Issues je Aufgabe.
alter table public.leitstand_aufgaben add column if not exists bezug text[] not null default '{}';
