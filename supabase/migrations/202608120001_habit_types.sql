alter table public.habits
  add column if not exists habit_type text not null default 'boolean'
  check (habit_type in ('boolean', 'count', 'duration', 'number'));

comment on column public.habits.habit_type is
  'How daily progress is recorded: boolean, count, duration, or number.';
