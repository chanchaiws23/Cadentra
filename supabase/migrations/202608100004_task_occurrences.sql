create table if not exists public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  local_date date not null,
  status public.item_status not null default 'planned',
  updated_at timestamptz not null default now(),
  unique(task_id, local_date)
);

create index if not exists task_occurrences_user_date_idx on public.task_occurrences(user_id, local_date);
alter table public.task_occurrences enable row level security;

create policy "owners can read task occurrences" on public.task_occurrences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "owners can insert task occurrences" on public.task_occurrences for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.tasks where tasks.id = task_id and tasks.user_id = (select auth.uid())
  ));
create policy "owners can update task occurrences" on public.task_occurrences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (
    select 1 from public.tasks where tasks.id = task_id and tasks.user_id = (select auth.uid())
  ));
create policy "owners can delete task occurrences" on public.task_occurrences for delete to authenticated
  using ((select auth.uid()) = user_id);
