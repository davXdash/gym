-- GYM v19: unterschiedliche Ziel-Satzanzahl je Übung
-- Sicher wiederholbar. Verändert nur target_sets im aktiven Plan des angemeldeten Dave-Benutzers.

update public.plan_exercises pe
set target_sets = case lower(e.name)
  when lower('Schrägbankdrückmaschine dual') then 3
  when lower('Latzugstation mit Oberschenkelpolster') then 3
  when lower('Brustpresse sitzend') then 2
  when lower('Rudermaschine mit Brustpolster') then 3
  when lower('Seithebemaschine ohne Armpolster') then 4
  when lower('Butterfly reverse mit Griffen') then 3
  when lower('Bauchmuskelmaschine') then 2
  when lower('Kurzhantel-Schrägbankdrücken') then 3
  when lower('High Row dual') then 3
  when lower('Butterfly mit Griffen') then 2
  when lower('Low Row dual') then 3
  when lower('Trizepsmaschine Überkopf') then 2
  when lower('Bizepsmaschine') then 2
  else pe.target_sets
end,
updated_at = now()
from public.exercises e
join public.plan_workouts pw on pw.id = pe.plan_workout_id
join public.training_plans tp on tp.id = pw.plan_id
where e.id = pe.exercise_id
  and tp.is_active = true
  and tp.user_id = (select id from auth.users where lower(email)=lower('Omm.Dav@gmail.com') limit 1);
