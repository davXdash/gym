-- GYM web app – Supabase schema
-- Run this complete file once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text,
  equipment text,
  studio text,
  image_path text,
  notes text,
  is_shared_catalogue boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_owner_required check (is_shared_catalogue or owner_id is not null)
);
create unique index if not exists exercises_owner_name_unique on public.exercises(owner_id, lower(name)) where owner_id is not null;

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name, version)
);

create table if not exists public.plan_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  code text not null,
  title text not null,
  focus text,
  sequence_position integer not null check (sequence_position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, code), unique(plan_id, sequence_position)
);

create table if not exists public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_workout_id uuid not null references public.plan_workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  exercise_order integer not null check (exercise_order > 0),
  target_sets integer not null check (target_sets > 0),
  rep_min integer check (rep_min is null or rep_min > 0),
  rep_max integer check (rep_max is null or rep_max >= rep_min),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  instructions text,
  failure_rule text,
  is_core_exercise boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_workout_id, exercise_order)
);

create table if not exists public.exercise_alternatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_exercise_id uuid not null references public.plan_exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises(id),
  priority integer not null default 1 check (priority > 0),
  created_at timestamptz not null default now(),
  unique(plan_exercise_id, alternative_exercise_id)
);

create table if not exists public.user_plan_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_plan_id uuid references public.training_plans(id) on delete set null,
  next_plan_workout_id uuid references public.plan_workouts(id) on delete set null,
  active_workout_id uuid,
  preferred_weekdays smallint[] not null default array[2,4,6]::smallint[],
  minimum_rest_hours integer not null default 36 check (minimum_rest_hours >= 0),
  updated_at timestamptz not null default now(),
  constraint valid_weekdays check (preferred_weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
);

create table if not exists public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_workout_id uuid not null references public.plan_workouts(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned','confirmed','started','completed','postponed','skipped')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, scheduled_date)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.training_plans(id) on delete set null,
  plan_workout_id uuid references public.plan_workouts(id) on delete set null,
  scheduled_workout_id uuid references public.scheduled_workouts(id) on delete set null,
  workout_date date not null default current_date,
  started_at timestamptz,
  finished_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  status text not null default 'draft' check (status in ('draft','active','paused','completed','partial','discarded')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_plan_state drop constraint if exists user_plan_state_active_workout_id_fkey;
alter table public.user_plan_state add constraint user_plan_state_active_workout_id_fkey foreign key (active_workout_id) references public.workouts(id) on delete set null;

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  plan_exercise_id uuid references public.plan_exercises(id) on delete set null,
  exercise_id uuid not null references public.exercises(id),
  exercise_order integer not null check (exercise_order > 0),
  status text not null default 'pending' check (status in ('pending','completed','skipped','not_completed')),
  skip_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workout_id, exercise_order)
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  repetitions integer check (repetitions is null or repetitions >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  rir integer check (rir is null or rir between 0 and 10),
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workout_exercise_id, set_number)
);

create table if not exists public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2) not null check (weight_kg between 30 and 300),
  toilet_status text check (toilet_status in ('before','after','unknown')),
  food_status text check (food_status in ('fasted','ate','unknown')),
  late_meal text check (late_meal in ('none','small','normal','large','unknown')),
  unusual_time boolean not null default false,
  trained_previous_day boolean,
  sleep_quality text check (sleep_quality in ('poor','normal','good','unknown')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  waist_cm numeric(5,1) check (waist_cm is null or waist_cm > 0),
  chest_cm numeric(5,1) check (chest_cm is null or chest_cm > 0),
  upper_arm_left_cm numeric(4,1) check (upper_arm_left_cm is null or upper_arm_left_cm > 0),
  upper_arm_right_cm numeric(4,1) check (upper_arm_right_cm is null or upper_arm_right_cm > 0),
  shoulder_cm numeric(5,1) check (shoulder_cm is null or shoulder_cm > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  view text not null check (view in ('front','side_left','side_right','back','other')),
  storage_path text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, storage_path)
);

create or replace function public.enforce_same_user()
returns trigger language plpgsql security invoker set search_path = public as $$
declare parent_user uuid;
begin
  if tg_table_name = 'plan_workouts' then select user_id into parent_user from public.training_plans where id = new.plan_id;
  elsif tg_table_name = 'plan_exercises' then select user_id into parent_user from public.plan_workouts where id = new.plan_workout_id;
  elsif tg_table_name = 'exercise_alternatives' then select user_id into parent_user from public.plan_exercises where id = new.plan_exercise_id;
  elsif tg_table_name = 'scheduled_workouts' then select user_id into parent_user from public.plan_workouts where id = new.plan_workout_id;
  elsif tg_table_name = 'workout_exercises' then select user_id into parent_user from public.workouts where id = new.workout_id;
  elsif tg_table_name = 'workout_sets' then select user_id into parent_user from public.workout_exercises where id = new.workout_exercise_id;
  end if;
  if parent_user is distinct from new.user_id then raise exception 'user_id does not match parent record'; end if;
  return new;
end; $$;

DO $$ BEGIN
  drop trigger if exists plan_workouts_same_user on public.plan_workouts;
  create trigger plan_workouts_same_user before insert or update on public.plan_workouts for each row execute function public.enforce_same_user();
  drop trigger if exists plan_exercises_same_user on public.plan_exercises;
  create trigger plan_exercises_same_user before insert or update on public.plan_exercises for each row execute function public.enforce_same_user();
  drop trigger if exists exercise_alternatives_same_user on public.exercise_alternatives;
  create trigger exercise_alternatives_same_user before insert or update on public.exercise_alternatives for each row execute function public.enforce_same_user();
  drop trigger if exists scheduled_workouts_same_user on public.scheduled_workouts;
  create trigger scheduled_workouts_same_user before insert or update on public.scheduled_workouts for each row execute function public.enforce_same_user();
  drop trigger if exists workout_exercises_same_user on public.workout_exercises;
  create trigger workout_exercises_same_user before insert or update on public.workout_exercises for each row execute function public.enforce_same_user();
  drop trigger if exists workout_sets_same_user on public.workout_sets;
  create trigger workout_sets_same_user before insert or update on public.workout_sets for each row execute function public.enforce_same_user();
END $$;

DO $$ declare t text; begin
  foreach t in array array['profiles','exercises','training_plans','plan_workouts','plan_exercises','user_plan_state','scheduled_workouts','workouts','workout_exercises','workout_sets'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.training_plans enable row level security;
alter table public.plan_workouts enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.exercise_alternatives enable row level security;
alter table public.user_plan_state enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;

DO $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('profiles','exercises','training_plans','plan_workouts','plan_exercises','exercise_alternatives','user_plan_state','scheduled_workouts','workouts','workout_exercises','workout_sets','weigh_ins','body_measurements','progress_photos') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy profiles_own_all on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy exercises_read on public.exercises for select to authenticated using (is_shared_catalogue or owner_id = auth.uid());
create policy exercises_own_insert on public.exercises for insert to authenticated with check (owner_id = auth.uid() and not is_shared_catalogue);
create policy exercises_own_update on public.exercises for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and not is_shared_catalogue);
create policy exercises_own_delete on public.exercises for delete to authenticated using (owner_id = auth.uid());
create policy training_plans_own_all on public.training_plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plan_workouts_own_all on public.plan_workouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plan_exercises_own_all on public.plan_exercises for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercise_alternatives_own_all on public.exercise_alternatives for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_plan_state_own_all on public.user_plan_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scheduled_workouts_own_all on public.scheduled_workouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_own_all on public.workouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_exercises_own_all on public.workout_exercises for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_sets_own_all on public.workout_sets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy weigh_ins_own_all on public.weigh_ins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_measurements_own_all on public.body_measurements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_photos_own_all on public.progress_photos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('progress-photos','progress-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists progress_photos_storage_select on storage.objects;
drop policy if exists progress_photos_storage_insert on storage.objects;
drop policy if exists progress_photos_storage_update on storage.objects;
drop policy if exists progress_photos_storage_delete on storage.objects;
create policy progress_photos_storage_select on storage.objects for select to authenticated using (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy progress_photos_storage_insert on storage.objects for insert to authenticated with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy progress_photos_storage_update on storage.objects for update to authenticated using (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy progress_photos_storage_delete on storage.objects for delete to authenticated using (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create index if not exists scheduled_workouts_user_date_idx on public.scheduled_workouts(user_id, scheduled_date);
create index if not exists workouts_user_date_idx on public.workouts(user_id, workout_date desc);
create index if not exists workout_exercises_workout_idx on public.workout_exercises(workout_id, exercise_order);
create index if not exists workout_sets_exercise_idx on public.workout_sets(workout_exercise_id, set_number);
create index if not exists weigh_ins_user_measured_at_idx on public.weigh_ins(user_id, measured_at desc);
create index if not exists body_measurements_user_measured_at_idx on public.body_measurements(user_id, measured_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))) on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,display_name)
select id,coalesce(raw_user_meta_data->>'display_name',split_part(email,'@',1)) from auth.users
on conflict(id) do nothing;
