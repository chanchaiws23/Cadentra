alter table public.habits add column if not exists idempotency_key text;
alter table public.point_transactions add column if not exists idempotency_key text;
alter table public.focus_sessions add column if not exists idempotency_key text;

create unique index if not exists habits_user_idempotency_idx
  on public.habits(user_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists point_transactions_user_idempotency_idx
  on public.point_transactions(user_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists focus_sessions_user_idempotency_idx
  on public.focus_sessions(user_id, idempotency_key) where idempotency_key is not null;
