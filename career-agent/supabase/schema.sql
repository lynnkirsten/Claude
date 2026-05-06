-- ════════════════════════════════════════
-- AI Career Agent Platform – Supabase Schema
-- Run this in your Supabase SQL Editor
-- ════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── profiles ───────────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  email       text,
  avatar_url  text,
  style_dna   jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

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

-- Auto-create profile on signup
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

-- ─── experiences ────────────────────────
create table public.experiences (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  job_title   text not null,
  company     text not null,
  start_date  date,
  end_date    date,
  current     boolean default false,
  description text,
  skills      text[] default '{}',
  location    text,
  created_at  timestamptz default now()
);

alter table public.experiences enable row level security;

create policy "Users can manage own experiences"
  on public.experiences for all
  using (auth.uid() = user_id);

-- ─── education ──────────────────────────
create table public.education (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  degree      text not null,
  institution text not null,
  field       text,
  start_date  date,
  end_date    date,
  description text,
  created_at  timestamptz default now()
);

alter table public.education enable row level security;

create policy "Users can manage own education"
  on public.education for all
  using (auth.uid() = user_id);

-- ─── applications ───────────────────────
create table public.applications (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  company_name   text,
  job_title      text,
  job_description text,
  match_score    integer check (match_score >= 0 and match_score <= 100),
  cover_letter   text,
  status         text default 'draft' check (status in ('draft','sent','interview','rejected','offer')),
  notes          text,
  applied_at     timestamptz,
  created_at     timestamptz default now()
);

alter table public.applications enable row level security;

create policy "Users can manage own applications"
  on public.applications for all
  using (auth.uid() = user_id);

-- ─── uploaded_documents ─────────────────
create table public.uploaded_documents (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  content     text not null,
  doc_type    text default 'cover_letter' check (doc_type in ('cover_letter','cv','other')),
  created_at  timestamptz default now()
);

alter table public.uploaded_documents enable row level security;

create policy "Users can manage own documents"
  on public.uploaded_documents for all
  using (auth.uid() = user_id);

-- ─── chat_messages ──────────────────────
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

-- ─── Indexes ────────────────────────────
create index on public.experiences(user_id);
create index on public.applications(user_id);
create index on public.chat_messages(user_id, application_id);
create index on public.uploaded_documents(user_id);
