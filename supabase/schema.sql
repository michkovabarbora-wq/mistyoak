-- ============================================================
-- MistyOak – Databázové schéma
-- Spusť v Supabase SQL editoru (Dashboard → SQL Editor)
-- ============================================================

-- Rozšíření
create extension if not exists "uuid-ossp";

-- ─── Zákazníci ────────────────────────────────────────────────────────────────
create table zakaznici (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  jmeno       text not null,
  telefon     text,
  email       text,
  adresa      text,
  poznamka    text
);

-- ─── Zakázky ──────────────────────────────────────────────────────────────────
create type stav_zakazky as enum (
  'poptavka', 'zamereni', 'navrh', 'naceneni',
  'schvaleno', 'vyroba', 'montaz', 'hotovo', 'storno'
);

create type priorita_zakazky as enum ('nizka', 'normal', 'vysoka', 'urgent');

create type typ_zakazky as enum (
  'kuchyne', 'satna', 'obyvak', 'koupelna', 'loznice', 'pracovna', 'jine'
);

create type zdroj_poptavky as enum (
  'doporuceni', 'instagram', 'facebook', 'web', 'telefon', 'jine'
);

create type faze_vyroby as enum (
  'pripraven', 'objednan_material', 'rezani', 'olepovani',
  'cnc_vrtani', 'kompletace', 'pripraveno_k_montazi', 'hotovo'
);

create table zakazky (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  cislo           text unique not null,
  zakaznik_id     uuid references zakaznici(id) on delete set null,
  typ             typ_zakazky not null default 'kuchyne',
  stav            stav_zakazky not null default 'poptavka',
  priorita        priorita_zakazky not null default 'normal',
  zdroj           zdroj_poptavky,
  termin          date,
  adresa_montaze  text,
  poznamka        text,
  -- Denormalizovaná kalkulace pro rychlý přehled
  cena_zakaznik   numeric(12,2),
  naklady_celkem  numeric(12,2),
  zisk            numeric(12,2),
  faze_vyroby     faze_vyroby
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger zakazky_updated_at
  before update on zakazky
  for each row execute function update_updated_at();

-- ─── Materiály ────────────────────────────────────────────────────────────────
create type kategorie_materialu as enum (
  'korpus', 'dvírka', 'pracovni_deska', 'hrany', 'kovani', 'spotrebice', 'jine'
);

create table materialy (
  id          uuid primary key default uuid_generate_v4(),
  zakazka_id  uuid references zakazky(id) on delete cascade,
  kategorie   kategorie_materialu not null default 'jine',
  nazev       text not null,
  dodavatel   text,
  cena_ks     numeric(10,2),
  pocet       numeric(10,3) not null default 1,
  jednotka    text not null default 'ks',
  objednano   boolean not null default false,
  poznamka    text
);

-- ─── Kalkulace ────────────────────────────────────────────────────────────────
create table kalkulace (
  id              uuid primary key default uuid_generate_v4(),
  zakazka_id      uuid references zakazky(id) on delete cascade unique,
  polozky         jsonb not null default '[]',
  marze_procent   numeric(5,2) not null default 30,
  sleva           numeric(12,2) not null default 0,
  dph_procent     numeric(5,2) not null default 21,
  naklady_celkem  numeric(12,2) not null default 0,
  cena_bez_dph    numeric(12,2) not null default 0,
  cena_s_dph      numeric(12,2) not null default 0,
  zisk            numeric(12,2) not null default 0,
  updated_at      timestamptz default now()
);

-- ─── Dokumenty ────────────────────────────────────────────────────────────────
create type typ_dokumentu as enum (
  'vizualizace', 'pro100', 'foto_zamereni', 'foto_montaz', 'pdf_navrh', 'jine'
);

create table dokumenty (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  zakazka_id  uuid references zakazky(id) on delete cascade,
  typ         typ_dokumentu not null,
  nazev       text not null,
  url         text not null,
  verze       int not null default 1,
  je_finalni  boolean not null default false
);

-- ─── Úkoly ────────────────────────────────────────────────────────────────────
create table ukoly (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  zakazka_id  uuid references zakazky(id) on delete cascade,
  text        text not null,
  splneno     boolean not null default false,
  datum       date,
  priorita    priorita_zakazky not null default 'normal'
);

-- ─── Komunikace ───────────────────────────────────────────────────────────────
create table komunikace (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  zakazka_id  uuid references zakazky(id) on delete cascade,
  typ         text not null default 'poznamka',
  obsah       text not null,
  autor       text
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Zatím vypnuto pro vývoj – zapni před produkčním nasazením
alter table zakaznici enable row level security;
alter table zakazky enable row level security;
alter table materialy enable row level security;
alter table kalkulace enable row level security;
alter table dokumenty enable row level security;
alter table ukoly enable row level security;
alter table komunikace enable row level security;

-- Politiky pro přihlášeného uživatele (jednouživatelský systém)
create policy "Authenticated full access" on zakaznici for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on zakazky for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on materialy for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on kalkulace for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on dokumenty for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on ukoly for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on komunikace for all using (auth.role() = 'authenticated');

-- ─── Demo data ────────────────────────────────────────────────────────────────
-- Odkomentuj pro testovací data
/*
insert into zakaznici (jmeno, telefon, email, adresa) values
  ('Tomáš Novák',      '+420 601 234 567', 'novak@email.cz',      'Rybná 4, Brno-střed'),
  ('Eva Procházková',  '+420 732 456 789', 'prochazka@email.cz',  'Dejvická 12, Praha 6'),
  ('Jana Horáková',    '+420 775 321 654', 'horak@email.cz',      'Na Příkopě 12, Praha 1');

insert into zakazky (cislo, zakaznik_id, typ, stav, priorita, termin, faze_vyroby, cena_zakaznik, naklady_celkem, zisk)
select
  'ZAK-2025-047',
  id, 'kuchyne', 'vyroba', 'urgent',
  (current_date + interval '3 days')::date,
  'rezani', 148500, 104200, 26260
from zakaznici where jmeno = 'Tomáš Novák';
*/
