create table if not exists public.notification_rules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:00',
  daily_limit integer not null default 6 check (daily_limit between 1 and 20),
  focus_break_minutes integer not null default 45 check (focus_break_minutes between 15 and 180),
  updated_at timestamptz not null default now()
);

alter table public.notification_rules enable row level security;
create policy "owners manage notification rules" on public.notification_rules
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
