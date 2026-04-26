-- =====================================================================
-- Cofoundr — initial schema (multi-tenant, RLS-enforced)
-- =====================================================================
-- Convention:
--   - Every tenant-owned row carries `workspace_id uuid not null`.
--   - RLS policies check membership via `workspace_members`.
--   - `auth.uid()` is the Supabase-issued user id (UUID).
--   - `service_role` bypasses RLS — use only in server admin code paths.
-- =====================================================================

-- ----- extensions ----------------------------------------------------
create extension if not exists pgcrypto;       -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- ----- helpers -------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- 1. PROFILES — public-facing user profile, 1:1 with auth.users
-- =====================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);


-- =====================================================================
-- 2. WORKSPACES — the tenant boundary. Every business is a workspace.
-- =====================================================================
create table public.workspaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  jurisdiction    text,                       -- e.g. 'CA-ON', 'US-DE'
  business_stage  text,                       -- 'idea' | 'forming' | 'launched' | 'operating'
  owner_id        uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index workspaces_owner_idx on public.workspaces(owner_id);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();


-- =====================================================================
-- 3. WORKSPACE_MEMBERS — who can access which workspace, at what role
-- =====================================================================
create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');

create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          public.workspace_role not null default 'owner',
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members(user_id);

-- Helper: is the current user a member of this workspace?
create or replace function public.is_workspace_member(w uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.workspace_members
    where workspace_id = w and user_id = auth.uid()
  );
$$;


-- ---- RLS for workspaces + members ----------------------------------
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;

create policy "workspaces: members read"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "workspaces: owner write"
  on public.workspaces for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "workspace_members: members read"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members: owner manages"
  on public.workspace_members for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );


-- =====================================================================
-- 4. BUSINESS_IDEAS — output of the launch wizard's idea-discovery step
-- =====================================================================
create table public.business_ideas (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  title         text not null,
  summary       text,
  jurisdiction  text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index business_ideas_workspace_idx on public.business_ideas(workspace_id);
create trigger business_ideas_set_updated_at
before update on public.business_ideas
for each row execute function public.set_updated_at();

alter table public.business_ideas enable row level security;
create policy "business_ideas: tenant access"
  on public.business_ideas for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));


-- =====================================================================
-- 5. CONTACTS — light CRM
-- =====================================================================
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  full_name     text not null,
  email         text,
  phone         text,
  company       text,
  notes         text,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index contacts_workspace_idx on public.contacts(workspace_id);
create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
create policy "contacts: tenant access"
  on public.contacts for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));


-- =====================================================================
-- 6. DOCUMENTS — Document Vault (legal, contracts, generated outputs)
-- =====================================================================
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  title         text not null,
  kind          text not null,                -- 'nda', 'contractor', 'tos', 'privacy', 'other'
  storage_path  text,                         -- supabase storage object path
  content_md    text,                         -- markdown source if generated
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index documents_workspace_idx on public.documents(workspace_id);
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;
create policy "documents: tenant access"
  on public.documents for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));


-- =====================================================================
-- 7. AI_MESSAGES — conversation history with the Cofoundr agent
-- =====================================================================
create table public.ai_messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid references public.profiles(id),
  role          text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content       text not null,
  model         text,
  tokens_in     integer,
  tokens_out    integer,
  cost_cents    integer,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index ai_messages_workspace_idx on public.ai_messages(workspace_id, created_at desc);

alter table public.ai_messages enable row level security;
create policy "ai_messages: tenant read"
  on public.ai_messages for select
  using (public.is_workspace_member(workspace_id));
-- writes only via server actions / service role.


-- =====================================================================
-- 8. WAITLIST — pre-launch signups (no auth required)
-- =====================================================================
create table public.waitlist (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  full_name       text,
  jurisdiction    text,
  intent          text,                        -- 'starting' | 'running' | 'agency'
  source          text,                        -- utm_source, referral, etc.
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Anyone can submit (anon role allowed insert), but no one can read or update
-- through RLS. Reads happen via service_role from the admin dashboard.
create policy "waitlist: anyone can join"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);


-- =====================================================================
-- 9. AUDIT_LOG — append-only mutation log (security & SOC 2 evidence)
-- =====================================================================
create table public.audit_log (
  id            bigserial primary key,
  workspace_id  uuid,
  actor_id      uuid,                          -- usually auth.uid(); null for system
  action        text not null,                 -- 'document.create', 'workspace.invite', etc.
  target_type   text,
  target_id     text,
  payload       jsonb not null default '{}'::jsonb,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index audit_log_workspace_idx on public.audit_log(workspace_id, created_at desc);

alter table public.audit_log enable row level security;
-- No SELECT policy = nobody but service_role reads. By design.
-- Inserts also restricted to service_role; the AI gateway logs through it.
