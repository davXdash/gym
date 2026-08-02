-- Fix for: permission denied for table training_plans
-- Run once in Supabase SQL Editor.
-- RLS remains active; these grants only allow authenticated requests to reach the RLS policies.

begin;

grant usage on schema public to authenticated;

-- User-owned application tables. RLS still limits every row to auth.uid().
grant select, insert, update, delete on table
  public.profiles,
  public.exercises,
  public.training_plans,
  public.plan_workouts,
  public.plan_exercises,
  public.exercise_alternatives,
  public.user_plan_state,
  public.scheduled_workouts,
  public.workouts,
  public.workout_exercises,
  public.workout_sets,
  public.weigh_ins,
  public.body_measurements,
  public.progress_photos
to authenticated;

-- Keep anonymous visitors blocked.
revoke all on table
  public.profiles,
  public.exercises,
  public.training_plans,
  public.plan_workouts,
  public.plan_exercises,
  public.exercise_alternatives,
  public.user_plan_state,
  public.scheduled_workouts,
  public.workouts,
  public.workout_exercises,
  public.workout_sets,
  public.weigh_ins,
  public.body_measurements,
  public.progress_photos
from anon;

-- Future identity/serial columns, should any be added later.
grant usage, select on all sequences in schema public to authenticated;
revoke all on all sequences in schema public from anon;

commit;

-- Diagnostic result: every listed table should show privileges for authenticated.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in (
    'training_plans','plan_workouts','plan_exercises','exercises',
    'scheduled_workouts','workouts','workout_exercises','workout_sets',
    'weigh_ins','body_measurements','progress_photos','profiles','user_plan_state','exercise_alternatives'
  )
order by table_name, privilege_type;
