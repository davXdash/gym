-- GYM v20 – configurable progression and equipment variants
-- Run once in Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.exercise_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  name text not null,
  role text not null default 'alternative' check (role in ('standard','alternative')),
  sort_order integer not null default 0 check (sort_order >= 0),
  image_path text,
  studio text,
  increment_kg numeric(5,2) check (increment_kg is null or increment_kg > 0),
  available_weights_kg numeric(6,2)[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, exercise_id, name)
);

alter table public.plan_exercises
  add column if not exists progression_mode text not null default 'double_progression'
    check (progression_mode in ('double_progression','conservative_double_progression','manual')),
  add column if not exists target_rir_min integer check (target_rir_min is null or target_rir_min between 0 and 10),
  add column if not exists target_rir_max integer check (target_rir_max is null or target_rir_max between 0 and 10),
  add column if not exists progression_notes text;

alter table public.workout_exercises
  add column if not exists exercise_variant_id uuid references public.exercise_variants(id) on delete set null;

create index if not exists exercise_variants_user_exercise_idx on public.exercise_variants(user_id, exercise_id);
create index if not exists workout_exercises_variant_idx on public.workout_exercises(exercise_variant_id);

alter table public.exercise_variants enable row level security;
drop policy if exists exercise_variants_own_all on public.exercise_variants;
create policy exercise_variants_own_all on public.exercise_variants
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.exercise_variants to authenticated;

-- Conservative progression for shoulder isolation; normal double progression elsewhere.
update public.plan_exercises pe
set progression_mode = case
      when lower(e.name) like '%seithebe%' then 'conservative_double_progression'
      else 'double_progression'
    end,
    target_rir_min = case when lower(e.name) like '%seithebe%' then 1 else 0 end,
    target_rir_max = case when lower(e.name) like '%seithebe%' then 3 else 2 end
from public.exercises e
where pe.exercise_id = e.id;
