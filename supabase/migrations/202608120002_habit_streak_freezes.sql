alter table public.habit_checkins
  add column if not exists is_freeze boolean not null default false;

update public.habits set freeze_balance = 1 where freeze_balance = 0;

create or replace function public.use_habit_freeze(p_habit_id uuid, p_local_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_freeze boolean;
begin
  if p_local_date > current_date then
    raise exception 'A streak freeze cannot be used for a future date.';
  end if;

  if not exists (select 1 from public.habits where id = p_habit_id and user_id = (select auth.uid())) then
    raise exception 'Habit not found.';
  end if;

  select is_freeze into existing_freeze
  from public.habit_checkins
  where user_id = (select auth.uid()) and habit_id = p_habit_id and local_date = p_local_date;

  if found and existing_freeze then
    return;
  elsif found then
    raise exception 'This habit already has a check-in for the selected date.';
  end if;

  update public.habits
  set freeze_balance = freeze_balance - 1
  where id = p_habit_id and user_id = (select auth.uid()) and freeze_balance > 0;

  if not found then
    raise exception 'No streak freeze is available.';
  end if;

  insert into public.habit_checkins (user_id, habit_id, local_date, value, is_freeze, recorded_retroactively)
  values ((select auth.uid()), p_habit_id, p_local_date, 0, true, p_local_date <> current_date);
end;
$$;

revoke all on function public.use_habit_freeze(uuid, date) from public;
grant execute on function public.use_habit_freeze(uuid, date) to authenticated;
