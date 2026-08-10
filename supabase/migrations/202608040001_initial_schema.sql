create extension if not exists pgcrypto;

create type public.item_status as enum ('planned', 'in_progress', 'done', 'skipped');
create type public.proposal_status as enum ('draft', 'accepted', 'rejected', 'applied', 'undone');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Bangkok',
  locale text not null default 'th',
  gamification_enabled boolean not null default true,
  health_ai_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, target_date date, status item_status not null default 'planned',
  created_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null, parent_id uuid references public.tasks(id) on delete cascade,
  title text not null, notes text, category text not null default 'general', priority text not null default 'medium' check (priority in ('low','medium','high')),
  status item_status not null default 'planned', starts_at timestamptz, ends_at timestamptz,
  timezone text not null default 'Asia/Bangkok', recurrence_rule text, idempotency_key text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (ends_at is null or starts_at is null or ends_at > starts_at), unique(user_id, idempotency_key)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, cue text, target numeric not null default 1 check (target > 0), unit text not null default 'ครั้ง',
  recurrence_rule text not null default 'FREQ=DAILY', freeze_balance integer not null default 0,
  created_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade, local_date date not null,
  value numeric not null default 1, mood smallint check (mood between 1 and 5), energy smallint check (energy between 1 and 5), note text,
  recorded_at timestamptz not null default now(), recorded_retroactively boolean not null default false,
  unique(habit_id, local_date)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null, planned_minutes integer not null check (planned_minutes > 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0), started_at timestamptz, ended_at timestamptz,
  interruption_count integer not null default 0, created_at timestamptz not null default now()
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('daily','weekly')), local_date date not null, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(user_id, period, local_date)
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null, source_id uuid, amount integer not null, reason text not null,
  created_at timestamptz not null default now()
);

create table public.ai_proposals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  status proposal_status not null default 'draft', reason text not null, changes jsonb not null default '[]'::jsonb,
  input_snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), applied_at timestamptz
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')), provider_account_id text not null,
  encrypted_token_ref text not null, sync_cursor text, sync_status text not null default 'idle', last_synced_at timestamptz,
  created_at timestamptz not null default now(), unique(user_id, provider, provider_account_id)
);

create table public.external_event_links (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  external_event_id text not null, task_id uuid references public.tasks(id) on delete cascade,
  external_version text, read_only boolean not null default true, unique(connection_id, external_event_id)
);

create table public.daily_health_aggregates (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null, steps integer, sleep_minutes integer, exercise_minutes integer,
  source text not null default 'health_connect', created_at timestamptz not null default now(), unique(user_id, local_date, source)
);

create table public.audit_events (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null, entity_id text not null, action text not null, before_data jsonb, after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.reflections enable row level security;
alter table public.point_transactions enable row level security;
alter table public.ai_proposals enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.external_event_links enable row level security;
alter table public.daily_health_aggregates enable row level security;
alter table public.audit_events enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','goals','tasks','habits','habit_checkins','focus_sessions','reflections','point_transactions','ai_proposals','calendar_connections','external_event_links','daily_health_aggregates','audit_events']
  loop
    execute format('create policy "owners can read %1$s" on public.%1$I for select to authenticated using ((select auth.uid()) = %2$I)', table_name, case when table_name = 'profiles' then 'id' else 'user_id' end);
    execute format('create policy "owners can insert %1$s" on public.%1$I for insert to authenticated with check ((select auth.uid()) = %2$I)', table_name, case when table_name = 'profiles' then 'id' else 'user_id' end);
    execute format('create policy "owners can update %1$s" on public.%1$I for update to authenticated using ((select auth.uid()) = %2$I) with check ((select auth.uid()) = %2$I)', table_name, case when table_name = 'profiles' then 'id' else 'user_id' end);
    execute format('create policy "owners can delete %1$s" on public.%1$I for delete to authenticated using ((select auth.uid()) = %2$I)', table_name, case when table_name = 'profiles' then 'id' else 'user_id' end);
  end loop;
end $$;

create index tasks_user_schedule_idx on public.tasks(user_id, starts_at) where deleted_at is null;
create index habits_user_idx on public.habits(user_id) where deleted_at is null;
create index habit_checkins_user_date_idx on public.habit_checkins(user_id, local_date desc);
create index focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create index audit_events_user_created_idx on public.audit_events(user_id, created_at desc);

