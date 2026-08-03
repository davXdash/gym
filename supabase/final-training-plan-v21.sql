-- GYM v21 – finaler Oberkörperplan für Dave
-- Ziele: athletischer Muskelaufbau, Oberkörperproportionen, Schultergürtel/Rücken priorisieren.
-- Sicher mehrfach ausführbar. Keine bestehenden Trainingsdaten werden gelöscht.

do $$
declare
  v_user uuid;
  v_plan uuid;
  v_b uuid;
  v_back uuid;
begin
  select id into v_user from auth.users where lower(email)=lower('Omm.Dav@gmail.com') limit 1;
  if v_user is null then raise exception 'Benutzer nicht gefunden'; end if;

  select id into v_plan from public.training_plans
  where user_id=v_user and is_active=true order by version desc limit 1;
  if v_plan is null then raise exception 'Aktiver Trainingsplan nicht gefunden'; end if;

  -- Konkrete Parameter je Standardübung. Arbeitssätze; Aufwärmsätze zählen nicht mit.
  update public.plan_exercises pe set
    target_sets = v.sets,
    rep_min = v.rep_min,
    rep_max = v.rep_max,
    rest_seconds = v.rest_seconds,
    progression_mode = v.progression_mode,
    target_rir_min = v.rir_min,
    target_rir_max = v.rir_max,
    progression_notes = v.notes,
    failure_rule = v.failure_rule,
    updated_at = now()
  from public.exercises e
  join (values
    ('Schrägbankdrückmaschine dual',3,6,10,180,'double_progression',1,2,'Gewicht halten, bis alle Arbeitssätze 10 saubere Wiederholungen erreichen; danach nächster real verfügbarer Gewichtsschritt.','Regulär 1–2 RIR; letzter Satz an der sicheren Maschine optional 0–1 RIR.'),
    ('Latzugstation mit Oberschenkelpolster',3,8,12,150,'double_progression',1,2,'Gewicht halten, bis alle drei Arbeitssätze 12 saubere Wiederholungen erreichen.','1–2 RIR; letzter Satz optional 0–1 RIR bei stabiler Technik.'),
    ('Brustpresse sitzend',2,8,12,150,'double_progression',1,2,'Zwei harte Ergänzungssätze; Gewicht erst erhöhen, wenn beide 12 erreichen.','1–2 RIR; letzter Satz optional 0–1 RIR.'),
    ('Rudermaschine mit Brustpolster',3,8,12,150,'double_progression',1,2,'Brust am Polster; Wiederholungen vor Gewicht steigern.','1–2 RIR; kein Schwung.'),
    ('Seithebemaschine ohne Armpolster',4,12,20,90,'conservative_double_progression',2,3,'Schulter konservativ: zuerst kontrollierte Wiederholungen bis 20; Gewicht nur manuell und schmerzfrei erhöhen.','2–3 RIR; niemals durch Gelenkschmerz trainieren.'),
    ('Butterfly reverse mit Griffen',3,12,20,90,'double_progression',1,2,'Hintere Schulter/Schulterblattkontrolle; erst Wiederholungen, dann kleiner Gewichtsschritt.','1–2 RIR; technisch saubere Endposition.'),
    ('Bauchmuskelmaschine',3,12,20,90,'double_progression',1,2,'Volle kontrollierte Rumpfbeugung; Gewicht erst erhöhen, wenn alle Sätze 20 erreichen.','1–2 RIR; kein Hüftschwung.'),
    ('Kurzhantel-Schrägbankdrücken',3,6,10,180,'double_progression',1,2,'Je Hantel tracken; erst bei 10/10/10 auf das nächste vorhandene Hantelpaar wechseln.','1–2 RIR; ohne Spotter kein unsicheres Muskelversagen.'),
    ('High Row dual',3,8,12,150,'double_progression',1,2,'Beide Seiten kontrolliert; erst Wiederholungen, dann Gewicht.','1–2 RIR.'),
    ('Butterfly mit Griffen',2,10,15,105,'double_progression',1,2,'Zwei harte Brust-Isolationssätze; bei 15/15 Gewicht erhöhen.','1–2 RIR; letzter Satz optional 0–1 RIR.'),
    ('Low Row dual',3,8,12,150,'double_progression',1,2,'Zum oberen Bauch ziehen; Wiederholungen vor Gewicht steigern.','1–2 RIR.'),
    ('Trizepsmaschine Überkopf',2,8,12,105,'double_progression',1,2,'Bei 12/12 nächster realer Gewichtsschritt.','1–2 RIR; Ellbogen stabil.'),
    ('Bizepsmaschine',2,8,12,105,'double_progression',1,2,'Bei 12/12 nächster realer Gewichtsschritt.','1–2 RIR; ohne Schwung.')
  ) as v(name,sets,rep_min,rep_max,rest_seconds,progression_mode,rir_min,rir_max,notes,failure_rule)
    on lower(e.name)=lower(v.name)
  where pe.exercise_id=e.id
    and pe.plan_workout_id in (select id from public.plan_workouts where plan_id=v_plan);

  -- Rückenstrecker als gezielte Rumpf-/Hüftstreckung in Einheit B.
  insert into public.exercises(owner_id,name,category,equipment,studio,is_shared_catalogue,is_active,notes)
  values(v_user,'Rückenstreckermaschine','Rumpf','Maschine','John Reed',false,true,
    'Neutraler Rücken; Bewegung kontrolliert über Hüfte/Rumpf. Keine Überstreckung.')
  on conflict do nothing;
  select id into v_back from public.exercises
    where owner_id=v_user and lower(name)=lower('Rückenstreckermaschine') limit 1;
  select id into v_b from public.plan_workouts where plan_id=v_plan and code='B' limit 1;

  if not exists(select 1 from public.plan_exercises where plan_workout_id=v_b and exercise_id=v_back) then
    insert into public.plan_exercises(
      user_id,plan_workout_id,exercise_id,exercise_order,target_sets,rep_min,rep_max,
      rest_seconds,instructions,failure_rule,is_core_exercise,progression_mode,
      target_rir_min,target_rir_max,progression_notes)
    values(
      v_user,v_b,v_back,9,3,12,20,120,
      'Becken stabil positionieren. Aus der kontrollierten Beugung bis zur neutralen Körperlinie aufrichten; nicht ins Hohlkreuz überstrecken.',
      '2–3 RIR. Belastung sofort reduzieren, wenn die Lendenwirbelsäule statt der Muskulatur unangenehm reagiert.',
      true,'conservative_double_progression',2,3,
      'Zuerst kontrollierte Wiederholungen bis 20; Gewicht nur erhöhen, wenn alle drei Sätze sauber und beschwerdefrei sind.'
    );
  else
    update public.plan_exercises set target_sets=3,rep_min=12,rep_max=20,rest_seconds=120,
      exercise_order=9,progression_mode='conservative_double_progression',target_rir_min=2,target_rir_max=3,
      instructions='Becken stabil positionieren. Aus der kontrollierten Beugung bis zur neutralen Körperlinie aufrichten; nicht ins Hohlkreuz überstrecken.',
      failure_rule='2–3 RIR. Belastung sofort reduzieren, wenn die Lendenwirbelsäule statt der Muskulatur unangenehm reagiert.',
      progression_notes='Zuerst kontrollierte Wiederholungen bis 20; Gewicht nur erhöhen, wenn alle drei Sätze sauber und beschwerdefrei sind.',updated_at=now()
    where plan_workout_id=v_b and exercise_id=v_back;
  end if;

  insert into public.exercise_variants(user_id,exercise_id,name,role,sort_order,studio,increment_kg,is_active)
  values(v_user,v_back,'Rückenstreckermaschine','standard',0,'John Reed',5,true)
  on conflict(user_id,exercise_id,name) do update set role='standard',sort_order=0,is_active=true,updated_at=now();
end $$;
