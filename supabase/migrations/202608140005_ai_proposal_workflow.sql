create or replace function public.apply_ai_proposal(p_proposal_id uuid, p_change_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare proposal_row public.ai_proposals; change jsonb; task_row public.tasks;
begin
  select * into proposal_row from public.ai_proposals where id = p_proposal_id and user_id = (select auth.uid()) for update;
  if not found or proposal_row.status not in ('draft','accepted') then raise exception 'Proposal cannot be applied'; end if;
  for change in select value from jsonb_array_elements(proposal_row.changes) loop
    if (change->>'id')::uuid = any(p_change_ids) and change->>'action' in ('move','resize') then
      select * into task_row from public.tasks where id = (change->>'taskId')::uuid and user_id = (select auth.uid()) for update;
      if not found then raise exception 'Task not found'; end if;
      insert into public.audit_events(user_id, entity_type, entity_id, action, before_data, after_data)
      values ((select auth.uid()), 'task', task_row.id::text, 'ai_schedule_apply', jsonb_build_object('start', task_row.starts_at, 'end', task_row.ends_at), change->'after');
      update public.tasks set starts_at = (change->'after'->>'start')::timestamptz, ends_at = (change->'after'->>'end')::timestamptz, updated_at = now() where id = task_row.id;
    end if;
  end loop;
  update public.ai_proposals set status = 'applied', applied_at = now(), changes = (select jsonb_agg(case when (value->>'id')::uuid = any(p_change_ids) then jsonb_set(value, '{accepted}', 'true') else value end) from jsonb_array_elements(changes)) where id = p_proposal_id;
end; $$;

create or replace function public.undo_ai_proposal(p_proposal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare proposal_row public.ai_proposals; change jsonb;
begin
  select * into proposal_row from public.ai_proposals where id = p_proposal_id and user_id = (select auth.uid()) and status = 'applied' for update;
  if not found then raise exception 'Applied proposal not found'; end if;
  for change in select value from jsonb_array_elements(proposal_row.changes) loop
    if coalesce((change->>'accepted')::boolean, false) and change->'before' is not null then
      update public.tasks set starts_at = (change->'before'->>'start')::timestamptz, ends_at = (change->'before'->>'end')::timestamptz, updated_at = now() where id = (change->>'taskId')::uuid and user_id = (select auth.uid());
      insert into public.audit_events(user_id, entity_type, entity_id, action, before_data, after_data) values ((select auth.uid()), 'task', change->>'taskId', 'ai_schedule_undo', change->'after', change->'before');
    end if;
  end loop;
  update public.ai_proposals set status = 'undone' where id = p_proposal_id;
end; $$;

revoke all on function public.apply_ai_proposal(uuid, uuid[]) from public;
revoke all on function public.undo_ai_proposal(uuid) from public;
grant execute on function public.apply_ai_proposal(uuid, uuid[]) to authenticated;
grant execute on function public.undo_ai_proposal(uuid) to authenticated;
