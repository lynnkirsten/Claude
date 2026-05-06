-- ════════════════════════════════════════
-- AI Career Agent Platform – Supabase Schema
-- Plak dit VOLLEDIG in Supabase → SQL Editor → Run
--
-- Wat dit doet:
-- We maken een database met 6 tabellen die samen jouw
-- loopbaancoach-platform aandrijven. Elke tabel slaat
-- een ander stukje van jouw profiel en sollicitatieproces op.
-- ════════════════════════════════════════

-- UUID is een uniek ID-systeem (zoals een vingerafdruk per rij).
-- Supabase heeft dit nodig om elke gebruiker en elk record uniek te maken.
create extension if not exists "uuid-ossp";

-- ─── TABEL 1: profiles ──────────────────
-- Dit is jouw persoonlijk profiel.
-- Hier slaan we op: naam, e-mail en het "Schrijfstijl DNA" —
-- een JSON-object dat de AI gebruikt om te begrijpen hoe jij schrijft.
-- Elke gebruiker heeft precies één profiel.
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  email       text,
  avatar_url  text,
  style_dna   jsonb default '{}'::jsonb,  -- Jouw schrijfstijl, geanalyseerd door de AI
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Row Level Security (RLS) = jij kunt alleen jouw eigen data zien.
-- Andere gebruikers hebben GEEN toegang tot jouw profiel.
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Dit is een automatische actie (trigger):
-- Zodra iemand zich registreert via de loginpagina,
-- wordt er automatisch een profiel aangemaakt in deze tabel.
-- Je hoeft dit zelf nooit handmatig te doen.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── TABEL 2: experiences ───────────────
-- Dit is jouw werkervaring — het hart van je CV.
-- De AI-agent gebruikt deze tabel om te vergelijken
-- wat een vacature vraagt versus wat jij al hebt gedaan (gap-analyse).
-- Per baan sla je op: functietitel, bedrijf, periode, omschrijving en skills.
create table public.experiences (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  job_title   text not null,           -- Bijv. "Marketingmanager"
  company     text not null,           -- Bijv. "Albert Heijn"
  start_date  date,
  end_date    date,
  current     boolean default false,   -- true = je werkt er nu nog
  description text,                    -- Wat deed je precies in deze baan?
  skills      text[] default '{}',     -- Bijv. ["Excel", "SEO", "teamleiding"]
  location    text,
  created_at  timestamptz default now()
);

alter table public.experiences enable row level security;

create policy "Users can manage own experiences"
  on public.experiences for all
  using (auth.uid() = user_id);

-- ─── TABEL 3: education ─────────────────
-- Jouw opleidingen — voor het CV-gedeelte.
-- Denk aan: HBO Communicatie, MBO Administratie, cursussen, etc.
-- Ook dit gebruikt de AI bij de gap-analyse als een vacature
-- een bepaald opleidingsniveau vraagt.
create table public.education (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  degree      text not null,           -- Bijv. "Bachelor", "MBO niveau 4"
  institution text not null,           -- Bijv. "Hogeschool Utrecht"
  field       text,                    -- Bijv. "Communicatie & Media"
  start_date  date,
  end_date    date,
  description text,
  created_at  timestamptz default now()
);

alter table public.education enable row level security;

create policy "Users can manage own education"
  on public.education for all
  using (auth.uid() = user_id);

-- ─── TABEL 4: applications ──────────────
-- Elke sollicitatie die je doet wordt hier opgeslagen.
-- De AI schrijft de motivatiebrief en berekent een match-score (0–100):
-- hoe goed past de vacature bij jouw ervaring?
-- Je kunt ook bijhouden in welke fase je zit: concept → verstuurd → gesprek → aanbieding.
create table public.applications (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  company_name    text,
  job_title       text,
  job_description text,                -- De vacaturetekst die je in de chat plakt
  match_score     integer check (match_score >= 0 and match_score <= 100), -- AI-score
  cover_letter    text,                -- De gegenereerde motivatiebrief
  status          text default 'draft' check (status in ('draft','sent','interview','rejected','offer')),
  notes           text,                -- Jouw eigen aantekeningen
  applied_at      timestamptz,         -- Wanneer heb je verstuurd?
  created_at      timestamptz default now()
);

alter table public.applications enable row level security;

create policy "Users can manage own applications"
  on public.applications for all
  using (auth.uid() = user_id);

-- ─── TABEL 5: uploaded_documents ────────
-- Hier bewaren we de motivatiebrieven die jij uploadt
-- voor de Schrijfstijl DNA-analyse.
-- De AI leest deze documenten om te leren hoe jij schrijft:
-- welke woorden gebruik je, hoe lang zijn je zinnen, hoe open je een brief?
-- Na de analyse wordt het resultaat opgeslagen in profiles.style_dna.
create table public.uploaded_documents (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,           -- Bijv. "Motivatiebrief Jumbo 2023"
  content     text not null,           -- De volledige tekst van het document
  doc_type    text default 'cover_letter' check (doc_type in ('cover_letter','cv','other')),
  created_at  timestamptz default now()
);

alter table public.uploaded_documents enable row level security;

create policy "Users can manage own documents"
  on public.uploaded_documents for all
  using (auth.uid() = user_id);

-- ─── TABEL 6: chat_messages ─────────────
-- Elk gesprek met de AI-agent wordt hier opgeslagen.
-- Zo kun je later terugkijken wat er besproken is per sollicitatie.
-- role = 'user' betekent jouw bericht, 'assistant' = antwoord van de AI.
create table public.chat_messages (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  application_id uuid references public.applications(id) on delete cascade,
  role           text not null check (role in ('user','assistant')),
  content        text not null,
  created_at     timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can manage own messages"
  on public.chat_messages for all
  using (auth.uid() = user_id);

-- ─── Indexes (snelheid) ──────────────────
-- Indexes zorgen dat de database snel kan zoeken.
-- Zonder index zou het zoeken op gebruiker steeds langzamer worden
-- naarmate er meer data is. Dit voorkomt dat.
create index on public.experiences(user_id);
create index on public.applications(user_id);
create index on public.chat_messages(user_id, application_id);
create index on public.uploaded_documents(user_id);
