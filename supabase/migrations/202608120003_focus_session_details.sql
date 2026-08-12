alter table public.focus_sessions
  add column if not exists pause_seconds integer not null default 0 check (pause_seconds >= 0),
  add column if not exists interruptions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(interruptions) = 'array');

comment on column public.focus_sessions.interruptions is
  'A compact user-authored log of distraction reasons and their elapsed offsets.';
