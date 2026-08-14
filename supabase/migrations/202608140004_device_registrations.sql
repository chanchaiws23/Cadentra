create table public.device_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('web','android')),
  endpoint text not null,
  registration jsonb not null,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now()
);

alter table public.device_registrations enable row level security;
alter table public.notification_deliveries enable row level security;
create policy "owners manage device registrations" on public.device_registrations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owners read notification deliveries" on public.notification_deliveries for select to authenticated using ((select auth.uid()) = user_id);
create index notification_deliveries_user_day_idx on public.notification_deliveries(user_id, sent_at desc);
