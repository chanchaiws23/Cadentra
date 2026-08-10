alter table public.goals add column if not exists updated_at timestamptz not null default now();
alter table public.goals add column if not exists idempotency_key text;

create unique index if not exists goals_user_idempotency_idx
  on public.goals(user_id, idempotency_key) where idempotency_key is not null;

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  target_date date,
  status public.item_status not null default 'planned',
  sort_order integer not null default 0,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists milestones_user_idempotency_idx
  on public.milestones(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists milestones_goal_order_idx
  on public.milestones(goal_id, sort_order) where deleted_at is null;

alter table public.milestones enable row level security;

create policy "owners can read milestones" on public.milestones for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "owners can insert milestones" on public.milestones for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.goals where goals.id = goal_id and goals.user_id = (select auth.uid())
  ));
create policy "owners can update milestones" on public.milestones for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (
    select 1 from public.goals where goals.id = goal_id and goals.user_id = (select auth.uid())
  ));
create policy "owners can delete milestones" on public.milestones for delete to authenticated
  using ((select auth.uid()) = user_id);
