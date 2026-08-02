import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const CACHE_KEY = 'gym-snapshot-v5';
const ACTIVE_KEY = 'gym-active-workout-v5';
const QUEUE_KEY = 'gym-sync-queue-v5';
const THEME_KEY = 'gym-theme';
const preferredDays = [2,4,6];

const $ = s => document.querySelector(s);
const els = {
  loading: $('#loading'), login: $('#login-screen'), dashboard: $('#dashboard'), form: $('#login-form'), error: $('#login-error'),
  list: $('#workout-list'), dialog: $('#workout-dialog'), exercises: $('#exercise-list'), dialogTitle: $('#dialog-title'),
  next: $('#next-workout'), nextDate: $('#next-date'), completed: $('#completed-count'), streak: $('#streak-count'), week: $('#week-count'),
  calendar: $('#calendar-grid'), calendarTitle: $('#calendar-title'), calendarHelp: $('#calendar-help'), connection: $('#connection-status'),
  complete: $('#complete-workout'), timer: $('#workout-timer'), completionHint: $('#completion-hint'), toast: $('#toast'), timerToggle: $('#timer-toggle')
};

let session = null;
let snapshot = null;
let currentCode = 'A';
let viewedMonth = new Date();
let selectedScheduleIndex = null;
let timerInterval = null;

const iso = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
const parseDate = v => new Date(`${v}T12:00:00`);
const safeJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const toast = message => { els.toast.textContent = message; els.toast.classList.add('show'); setTimeout(() => els.toast.classList.remove('show'), 2400); };
const showOnly = el => { [els.loading, els.login, els.dashboard].forEach(x => x.classList.add('hidden')); el.classList.remove('hidden'); };

function normaliseSnapshot(plan, schedule, workouts) {
  const workoutMap = {};
  for (const w of plan.plan_workouts || []) {
    workoutMap[w.code] = {
      id: w.id,
      code: w.code,
      title: w.title,
      focus: w.focus,
      exercises: (w.plan_exercises || []).sort((a,b) => a.exercise_order - b.exercise_order).map(pe => ({
        id: pe.id,
        exercise_id: pe.exercise_id,
        name: pe.exercises?.name || 'Übung',
        image_path: pe.exercises?.image_path || null,
        equipment: pe.exercises?.equipment || null,
        sets: pe.target_sets,
        rep_min: pe.rep_min,
        rep_max: pe.rep_max,
        rest: pe.rest_seconds,
        instructions: pe.instructions,
        failure_rule: pe.failure_rule,
        core: pe.is_core_exercise
      }))
    };
  }
  return {
    plan: { id: plan.id, name: plan.name, goal: plan.goal },
    workouts: workoutMap,
    schedule: (schedule || []).map(x => ({ id:x.id, date:x.scheduled_date, status:x.status, plan_workout_id:x.plan_workout_id, code:x.plan_workouts?.code || '?' })),
    completed: (workouts || []).filter(x => ['completed','partial'].includes(x.status)).map(x => ({ id:x.id, date:x.workout_date, code:x.plan_workouts?.code || '?', status:x.status }))
  };
}

async function loadRemoteSnapshot() {
  const { data: plans, error: planError } = await supabase
    .from('training_plans')
    .select(`id,name,goal,plan_workouts(id,code,title,focus,sequence_position,plan_exercises(id,exercise_id,exercise_order,target_sets,rep_min,rep_max,rest_seconds,instructions,failure_rule,is_core_exercise,exercises(id,name,image_path,equipment)))`)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1);
  if (planError) throw planError;
  if (!plans?.length) throw new Error('Kein aktiver Trainingsplan gefunden.');

  const [{ data: schedule, error: scheduleError }, { data: workouts, error: workoutsError }] = await Promise.all([
    supabase.from('scheduled_workouts').select('id,scheduled_date,status,plan_workout_id,plan_workouts(code)').order('scheduled_date'),
    supabase.from('workouts').select('id,workout_date,status,plan_workout_id,plan_workouts(code)').order('workout_date', { ascending:false }).limit(100)
  ]);
  if (scheduleError) throw scheduleError;
  if (workoutsError) throw workoutsError;
  snapshot = normaliseSnapshot(plans[0], schedule, workouts);
  saveJson(CACHE_KEY, snapshot);
  return snapshot;
}

function loadCachedSnapshot() {
  snapshot = safeJson(CACHE_KEY, null);
  return snapshot;
}

function setConnectionLabel() {
  const pending = safeJson(QUEUE_KEY, []).length;
  if (!navigator.onLine) els.connection.textContent = pending ? `Offline · ${pending} offen` : 'Offline';
  else els.connection.textContent = pending ? `Online · ${pending} werden synchronisiert` : 'Online';
}

function getActive() { return safeJson(ACTIVE_KEY, null); }
function saveActive(active) { active ? saveJson(ACTIVE_KEY, active) : localStorage.removeItem(ACTIVE_KEY); }
function elapsedMs(active) { return active ? (active.elapsed_ms || 0) + (active.running_since ? Date.now() - active.running_since : 0) : 0; }

function weekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-${Math.ceil((((d-yearStart)/86400000)+1)/7)}`;
}

function renderStats() {
  const completed = snapshot?.completed || [];
  els.completed.textContent = completed.length;
  els.week.textContent = completed.filter(x => weekKey(parseDate(x.date)) === weekKey(new Date())).length;
  const weeks = [...new Set(completed.map(x => weekKey(parseDate(x.date))))];
  let streak = 0; const cursor = new Date();
  while (weeks.includes(weekKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-7); }
  els.streak.textContent = streak;
}

function renderPlans() {
  if (!snapshot) return;
  els.list.innerHTML = Object.values(snapshot.workouts).sort((a,b) => a.code.localeCompare(b.code)).map(w => `
    <article class="workout-card">
      <p class="eyebrow">EINHEIT ${w.code}</p><h3>${w.title}</h3><p class="muted">${w.focus || ''}</p>
      <div class="workout-meta"><span>${w.exercises.length} Übungen</span></div>
      <button data-workout="${w.code}">Plan ansehen</button>
    </article>`).join('');
}

function renderCalendar() {
  if (!snapshot) return;
  const y=viewedMonth.getFullYear(), m=viewedMonth.getMonth();
  els.calendarTitle.textContent = new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(viewedMonth);
  const first = new Date(y,m,1), offset=(first.getDay()+6)%7, days=new Date(y,m+1,0).getDate();
  const completed = new Map(snapshot.completed.map(x => [x.date,x]));
  const planned = new Map(snapshot.schedule.map((x,i) => [x.date,{...x,index:i}]));
  const cells=[];
  for(let i=0;i<offset;i++) cells.push('<span class="calendar-day empty"></span>');
  for(let day=1;day<=days;day++) {
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const done=completed.get(date), plan=planned.get(date), classes=['calendar-day'];
    if(date===iso()) classes.push('today');
    if(done) classes.push('completed'); else if(plan) classes.push('planned');
    if(plan?.index===selectedScheduleIndex) classes.push('selected');
    if(parseDate(date).getDay()===1) classes.push('monday');
    cells.push(`<button class="${classes.join(' ')}" data-date="${date}"><span>${day}</span>${done?`<small class="plan-badge">${done.code} ✓</small>`:plan?`<small class="plan-badge">${plan.code}</small>`:''}</button>`);
  }
  els.calendar.innerHTML=cells.join('');
}

function refresh() {
  if (!snapshot) return;
  const next = snapshot.schedule.find(x => ['planned','confirmed','started'].includes(x.status)) || snapshot.schedule[0];
  els.next.textContent = next ? `Training ${next.code}` : 'Kein Termin';
  els.nextDate.textContent = next ? new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(parseDate(next.date)) : '';
  renderPlans(); renderStats(); renderCalendar(); setConnectionLabel();
}

function renderTimer() {
  const active=getActive(), ms=elapsedMs(active), s=Math.floor(ms/1000);
  els.timer.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  els.timerToggle.textContent=active?.running_since?'Pause':'Training starten';
}

function openWorkout(code) {
  currentCode=code;
  const workout=snapshot.workouts[code];
  if(!workout) return;
  els.dialogTitle.textContent=workout.title;
  const active=getActive();
  const states=active?.code===code ? active.states || {} : {};
  els.exercises.innerHTML=workout.exercises.map((ex,i)=>`
    <article class="exercise-card ${states[ex.id]||''}" data-exercise-id="${ex.id}">
      <div class="exercise-image">${ex.image_path?`<img src="${ex.image_path}" alt="${ex.name}">`:'Gerätebild folgt'}</div>
      <div class="exercise-body"><h3>${ex.name}</h3>
        <p class="exercise-prescription">${ex.sets} × ${ex.rep_min ?? ''}${ex.rep_max?`–${ex.rep_max}`:''} · ${ex.rest ?? 0} Sek.</p>
        <p class="exercise-notes">${ex.instructions || ''}</p>
        <div class="exercise-actions"><button class="mark-done">Erledigt</button><button class="skip">Nicht geschafft</button></div>
      </div>
    </article>`).join('');
  updateCompletion(); renderTimer(); els.dialog.showModal();
}

function ensureActive() {
  let active=getActive();
  if(!active || active.code!==currentCode) active={id:crypto.randomUUID(),code:currentCode,date:iso(),elapsed_ms:0,running_since:null,states:{}};
  saveActive(active); return active;
}

function toggleTimer() {
  const active=ensureActive();
  if(active.running_since){active.elapsed_ms+=Date.now()-active.running_since;active.running_since=null;} else active.running_since=Date.now();
  saveActive(active); renderTimer();
}

function setExerciseState(id,state) {
  const active=ensureActive();
  active.states[id]=active.states[id]===state?null:state;
  saveActive(active);
  const card=els.exercises.querySelector(`[data-exercise-id="${id}"]`);
  card.classList.toggle('done',active.states[id]==='done');
  card.classList.toggle('skipped',active.states[id]==='skipped');
  updateCompletion();
}

function updateCompletion() {
  const workout=snapshot?.workouts[currentCode]; if(!workout) return;
  const active=getActive(); const states=active?.code===currentCode?active.states||{}:{};
  const resolved=workout.exercises.filter(ex=>['done','skipped'].includes(states[ex.id])).length;
  els.complete.disabled=resolved!==workout.exercises.length;
  els.completionHint.textContent=`${resolved} von ${workout.exercises.length} Übungen bewertet`;
}

async function persistCompletion(payload) {
  const workout=snapshot.workouts[payload.code];
  const scheduled=snapshot.schedule.find(x=>x.code===payload.code && x.date>=payload.date) || snapshot.schedule.find(x=>x.code===payload.code);
  const status=Object.values(payload.states).includes('skipped')?'partial':'completed';
  const {data: inserted,error}=await supabase.from('workouts').insert({
    user_id:session.user.id,plan_id:snapshot.plan.id,plan_workout_id:workout.id,scheduled_workout_id:scheduled?.id||null,
    workout_date:payload.date,started_at:payload.started_at,finished_at:payload.finished_at,elapsed_seconds:payload.elapsed_seconds,status
  }).select('id').single();
  if(error) throw error;
  const rows=workout.exercises.map((ex,index)=>({user_id:session.user.id,workout_id:inserted.id,plan_exercise_id:ex.id,exercise_id:ex.exercise_id,exercise_order:index+1,status:payload.states[ex.id]==='done'?'completed':'skipped'}));
  const {error:exError}=await supabase.from('workout_exercises').insert(rows); if(exError) throw exError;
  if(scheduled?.id) await supabase.from('scheduled_workouts').update({status:'completed'}).eq('id',scheduled.id);
}

function queueOperation(op) { const q=safeJson(QUEUE_KEY,[]); q.push(op); saveJson(QUEUE_KEY,q); }
async function syncQueue() {
  if(!navigator.onLine || !session) return;
  const queue=safeJson(QUEUE_KEY,[]), remaining=[];
  for(const op of queue){ try{ if(op.type==='complete') await persistCompletion(op.payload); else if(op.type==='schedule') await supabase.from('scheduled_workouts').upsert(op.payload); }catch{ remaining.push(op); } }
  saveJson(QUEUE_KEY,remaining); setConnectionLabel();
  if(queue.length!==remaining.length) await loadRemoteSnapshot().then(refresh).catch(()=>{});
}

async function completeWorkout() {
  const active=getActive(), workout=snapshot.workouts[currentCode];
  if(!active || active.code!==currentCode) return;
  const complete=workout.exercises.every(ex=>['done','skipped'].includes(active.states[ex.id]));
  if(!complete){toast('Bitte jede Übung bewerten.');return;}
  if(active.running_since){active.elapsed_ms+=Date.now()-active.running_since;active.running_since=null;}
  const payload={...active,started_at:new Date(Date.now()-active.elapsed_ms).toISOString(),finished_at:new Date().toISOString(),elapsed_seconds:Math.round(active.elapsed_ms/1000)};
  snapshot.completed.push({id:payload.id,date:payload.date,code:payload.code,status:Object.values(payload.states).includes('skipped')?'partial':'completed'});
  const idx=snapshot.schedule.findIndex(x=>x.code===payload.code && x.date>=payload.date);
  if(idx>=0) snapshot.schedule.splice(idx,1);
  saveJson(CACHE_KEY,snapshot); saveActive(null); els.dialog.close(); refresh();
  if(navigator.onLine){ try{await persistCompletion(payload);await loadRemoteSnapshot();refresh();toast('Training gespeichert.');}catch{queueOperation({type:'complete',payload});toast('Lokal gespeichert – Synchronisierung folgt.');} }
  else {queueOperation({type:'complete',payload});toast('Offline gespeichert.');}
}

function nextPreferredDate(after){const d=new Date(after);d.setDate(d.getDate()+1);while(!preferredDays.includes(d.getDay()))d.setDate(d.getDate()+1);return d;}
async function moveSchedule(index,newDate){
  const updated=snapshot.schedule.map(x=>({...x}));
  let d=parseDate(newDate), code=updated[index].code;
  for(let i=index;i<updated.length;i++){updated[i].date=iso(d);updated[i].code=code;code=code==='A'?'B':'A';d=nextPreferredDate(d);}
  snapshot.schedule=updated;saveJson(CACHE_KEY,snapshot);refresh();
  const payload=updated.slice(index).map(x=>({id:x.id,user_id:session.user.id,plan_workout_id:x.plan_workout_id,scheduled_date:x.date,status:x.status||'planned'}));
  if(navigator.onLine){const{error}=await supabase.from('scheduled_workouts').upsert(payload);if(error)queueOperation({type:'schedule',payload});else await loadRemoteSnapshot().then(refresh);}else queueOperation({type:'schedule',payload});
}

function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#171a17':'#f3f1ea';}

async function initialise() {
  setTheme(localStorage.getItem(THEME_KEY)||'light');
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  const {data:{session:s}}=await supabase.auth.getSession(); session=s;
  if(!session){showOnly(els.login);return;}
  showOnly(els.dashboard);
  if(navigator.onLine){try{await loadRemoteSnapshot();}catch{loadCachedSnapshot();}}else loadCachedSnapshot();
  if(!snapshot){toast('Plan konnte noch nicht geladen werden. Einmal mit Internet öffnen.');return;}
  refresh(); await syncQueue();
  clearInterval(timerInterval);timerInterval=setInterval(renderTimer,1000);
}

els.form.addEventListener('submit',async e=>{e.preventDefault();els.error.textContent='';const{data,error}=await supabase.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error){els.error.textContent='Anmeldung fehlgeschlagen.';return;}session=data.session;showOnly(els.dashboard);await loadRemoteSnapshot();refresh();});
$('#logout').onclick=async()=>{await supabase.auth.signOut();session=null;showOnly(els.login);};
$('#theme-toggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
$('#start-workout').onclick=()=>{const next=snapshot.schedule[0];openWorkout(next?.code||'A');};
els.list.onclick=e=>{const b=e.target.closest('[data-workout]');if(b)openWorkout(b.dataset.workout);};
$('#close-dialog').onclick=()=>els.dialog.close();
els.timerToggle.onclick=toggleTimer;
els.complete.onclick=completeWorkout;
els.exercises.onclick=e=>{const card=e.target.closest('[data-exercise-id]');if(!card)return;if(e.target.closest('.mark-done'))setExerciseState(card.dataset.exerciseId,'done');if(e.target.closest('.skip'))setExerciseState(card.dataset.exerciseId,'skipped');};
els.calendar.onclick=async e=>{const day=e.target.closest('[data-date]');if(!day)return;const date=day.dataset.date,idx=snapshot.schedule.findIndex(x=>x.date===date);if(selectedScheduleIndex===null){if(idx>=0){selectedScheduleIndex=idx;els.calendarHelp.textContent=`Training ${snapshot.schedule[idx].code} gewählt. Jetzt neuen Tag antippen.`;renderCalendar();}else{await moveSchedule(0,date);toast('Nächstes Training verschoben.');}}else{await moveSchedule(selectedScheduleIndex,date);selectedScheduleIndex=null;els.calendarHelp.textContent='Vorgeschlagen: Dienstag, Donnerstag und Samstag. Geplante Einheit antippen und danach den neuen Tag.';toast('Terminfolge angepasst.');}};
$('#prev-month').onclick=()=>{viewedMonth=new Date(viewedMonth.getFullYear(),viewedMonth.getMonth()-1,1);renderCalendar();};
$('#next-month').onclick=()=>{viewedMonth=new Date(viewedMonth.getFullYear(),viewedMonth.getMonth()+1,1);renderCalendar();};
window.addEventListener('online',async()=>{setConnectionLabel();await syncQueue();try{await loadRemoteSnapshot();refresh();}catch{}});
window.addEventListener('offline',setConnectionLabel);
supabase.auth.onAuthStateChange((_event,s)=>{session=s;showOnly(s?els.dashboard:els.login);});

initialise().catch(err=>{console.error(err);loadCachedSnapshot();if(snapshot){showOnly(els.dashboard);refresh();}else showOnly(els.login);});
