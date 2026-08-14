create table public.calendar_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

create table public.calendar_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now()
);

create table public.external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  external_event_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  external_version text,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(connection_id, external_event_id)
);

alter table public.calendar_oauth_states enable row level security;
alter table public.calendar_oauth_tokens enable row level security;
alter table public.external_calendar_events enable row level security;

create policy "owners can read imported calendar events" on public.external_calendar_events
for select to authenticated using ((select auth.uid()) = user_id);

create index external_calendar_events_user_time_idx on public.external_calendar_events(user_id, starts_at) where deleted_at is null;
create index calendar_oauth_states_expiry_idx on public.calendar_oauth_states(expires_at);
