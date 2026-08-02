-- GYM web app – initial data for Dave
-- Run once after supabase/schema.sql. Safe to run again.

do $$
declare
  v_user uuid;
  v_plan uuid;
  v_a uuid;
  v_b uuid;
  v_ex uuid;
  v_date date;
  v_code text := 'A';
  v_counter integer := 0;
begin
  select id into v_user from auth.users where lower(email)=lower('Omm.Dav@gmail.com') limit 1;
  if v_user is null then raise exception 'Auth user Omm.Dav@gmail.com not found'; end if;

  insert into public.profiles(id, display_name)
  values(v_user,'Dave')
  on conflict(id) do update set display_name=excluded.display_name;

  insert into public.training_plans(user_id,name,goal,version,is_active)
  values(v_user,'Proportion & Muskelaufbau','Kräftiger, proportionaler Oberkörper mit Fokus auf Rücken, Schulter, Brust und Rumpfkontrolle',1,true)
  on conflict(user_id,name,version) do update set goal=excluded.goal,is_active=true,updated_at=now()
  returning id into v_plan;

  if v_plan is null then
    select id into v_plan from public.training_plans where user_id=v_user and name='Proportion & Muskelaufbau' and version=1;
  end if;

  insert into public.plan_workouts(user_id,plan_id,code,title,focus,sequence_position)
  values(v_user,v_plan,'A','Training A','Brust · Rückenbreite · seitliche Schulter',1)
  on conflict(plan_id,code) do update set title=excluded.title,focus=excluded.focus,sequence_position=excluded.sequence_position,updated_at=now()
  returning id into v_a;
  if v_a is null then select id into v_a from public.plan_workouts where plan_id=v_plan and code='A'; end if;

  insert into public.plan_workouts(user_id,plan_id,code,title,focus,sequence_position)
  values(v_user,v_plan,'B','Training B','obere Brust · Rückendicke · hintere Schulter · Arme',2)
  on conflict(plan_id,code) do update set title=excluded.title,focus=excluded.focus,sequence_position=excluded.sequence_position,updated_at=now()
  returning id into v_b;
  if v_b is null then select id into v_b from public.plan_workouts where plan_id=v_plan and code='B'; end if;

  -- Helper data: name, category, equipment, workout, order, sets, min, max, rest, instructions, failure rule, core
  create temporary table if not exists seed_exercises(
    name text, category text, equipment text, workout_code text, pos int, sets int, rep_min int, rep_max int, rest int, instructions text, failure_rule text, core boolean
  ) on commit drop;
  truncate seed_exercises;
  insert into seed_exercises values
  ('Schrägbankdrückmaschine dual','Brust','Maschine','A',1,3,6,10,180,'Kontrollierte volle Wiederholung; Schulterblätter stabil.','Letzter Satz bis keine saubere vollständige Wiederholung mehr möglich ist.',true),
  ('Latzugstation mit Oberschenkelpolster','Rücken','Kabelzug','A',2,3,8,12,120,'Brust leicht anheben; Ellbogen nach unten führen; nicht zurückschwingen.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Brustpresse sitzend','Brust','Maschine','A',3,3,8,12,120,'Schulterblätter an der Lehne halten.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Rudermaschine mit Brustpolster','Rücken','Maschine','A',4,3,8,12,120,'Brust bleibt am Polster; vollständig kontrolliert strecken.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Seithebemaschine ohne Armpolster','Schulter','Maschine','A',5,4,12,20,90,'Seitliche Schulter führen; Schwung vermeiden.','Letzte zwei Sätze bis zum sauberen Muskelversagen.',true),
  ('Butterfly reverse mit Griffen','Schulter','Maschine','A',6,3,12,18,90,'Schultern unten; Kopf nicht nach vorne schieben.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Bauchmuskelmaschine','Rumpf','Maschine','A',7,3,10,15,90,'Brustkorb Richtung Becken einrollen.','Letzter Satz bis zum sauberen Muskelversagen.',false),
  ('Kurzhantel-Schrägbankdrücken','Brust','Kurzhantel','B',1,3,6,10,180,'Bank 20–30 Grad; nicht unter den Hanteln scheitern.','Mit sauberer Technik vor unsicherem Versagen stoppen.',true),
  ('High Row dual','Rücken','Maschine','B',2,3,8,12,120,'Brust am Polster; Ellbogen nach hinten und leicht unten.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Butterfly mit Griffen','Brust','Maschine','B',3,3,8,12,90,'Weit und kontrolliert öffnen; Schulter nicht nach vorne werfen.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Low Row dual','Rücken','Maschine','B',4,3,8,12,120,'Griff Richtung oberer Bauch; nicht zurückreißen.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Seithebemaschine ohne Armpolster','Schulter','Maschine','B',5,4,12,20,90,'Seitliche Schulter führen; Schwung vermeiden.','Letzte zwei Sätze bis zum sauberen Muskelversagen.',true),
  ('Butterfly reverse mit Griffen','Schulter','Maschine','B',6,3,12,18,90,'Kontrolliert nach außen führen.','Letzter Satz bis zum sauberen Muskelversagen.',true),
  ('Trizepsmaschine Überkopf','Arme','Maschine','B',7,2,8,12,90,'Oberarme stabil halten.','Letzter Satz bis zum sauberen Muskelversagen.',false),
  ('Bizepsmaschine','Arme','Maschine','B',8,2,8,12,90,'Oberarme stabil halten.','Letzter Satz bis zum sauberen Muskelversagen.',false);

  for v_ex in select distinct null::uuid loop null; end loop;

  -- Create exercise catalogue rows for this user.
  insert into public.exercises(owner_id,name,category,equipment,studio,is_shared_catalogue,is_active)
  select v_user,s.name,s.category,s.equipment,'John Reed',false,true
  from (select distinct name,category,equipment from seed_exercises) s
  on conflict do nothing;

  -- Replace plan exercise assignments for this plan version.
  delete from public.plan_exercises where plan_workout_id in (v_a,v_b);

  insert into public.plan_exercises(user_id,plan_workout_id,exercise_id,exercise_order,target_sets,rep_min,rep_max,rest_seconds,instructions,failure_rule,is_core_exercise)
  select v_user,
         case when s.workout_code='A' then v_a else v_b end,
         e.id,s.pos,s.sets,s.rep_min,s.rep_max,s.rest,s.instructions,s.failure_rule,s.core
  from seed_exercises s
  join public.exercises e on e.owner_id=v_user and lower(e.name)=lower(s.name);

  insert into public.user_plan_state(user_id,active_plan_id,next_plan_workout_id,preferred_weekdays,minimum_rest_hours)
  values(v_user,v_plan,v_a,array[2,4,6]::smallint[],36)
  on conflict(user_id) do update set active_plan_id=excluded.active_plan_id,
    next_plan_workout_id=coalesce(public.user_plan_state.next_plan_workout_id,excluded.next_plan_workout_id),
    preferred_weekdays=excluded.preferred_weekdays,minimum_rest_hours=excluded.minimum_rest_hours,updated_at=now();

  -- Create the next 18 planned sessions only when none exist yet.
  if not exists(select 1 from public.scheduled_workouts where user_id=v_user and status in ('planned','confirmed','started')) then
    v_date := current_date;
    while extract(dow from v_date)::int not in (2,4,6) loop v_date := v_date + 1; end loop;
    while v_counter < 18 loop
      insert into public.scheduled_workouts(user_id,plan_workout_id,scheduled_date,status)
      values(v_user,case when v_code='A' then v_a else v_b end,v_date,'planned')
      on conflict(user_id,scheduled_date) do nothing;
      v_counter := v_counter + 1;
      v_code := case when v_code='A' then 'B' else 'A' end;
      v_date := v_date + 1;
      while extract(dow from v_date)::int not in (2,4,6) loop v_date := v_date + 1; end loop;
    end loop;
  end if;
end $$;
