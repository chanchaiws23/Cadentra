create table public.personal_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  point_cost integer not null check (point_cost between 1 and 100000),
  redeemed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.personal_rewards enable row level security;
create policy "owners manage personal rewards" on public.personal_rewards
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.redeem_personal_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reward_row public.personal_rewards;
  available_points integer;
begin
  select * into reward_row from public.personal_rewards
  where id = p_reward_id and user_id = (select auth.uid()) and redeemed_at is null and deleted_at is null
  for update;
  if not found then raise exception 'Reward not found or already redeemed'; end if;
  select coalesce(sum(amount), 0) into available_points from public.point_transactions where user_id = (select auth.uid());
  if available_points < reward_row.point_cost then raise exception 'Not enough points'; end if;
  update public.personal_rewards set redeemed_at = now() where id = p_reward_id;
  insert into public.point_transactions(user_id, source_type, source_id, amount, reason, idempotency_key)
  values ((select auth.uid()), 'reward', reward_row.id, -reward_row.point_cost, 'personal_reward_redeemed', 'reward:' || reward_row.id::text);
end;
$$;

revoke all on function public.redeem_personal_reward(uuid) from public;
grant execute on function public.redeem_personal_reward(uuid) to authenticated;
