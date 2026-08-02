import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const SNAP='gym-snapshot-v7',THEME='gym-theme';
let session=null,snapshot=null,viewed=new Date(),currentCode='A';
const iso=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const pd=v=>new Date(`${v}T12:00:00`);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const showOnly=el=>{['#loading','#login-screen','#dashboard'].forEach(s=>$(s)?.classList.add('hidden'));el?.classList.remove('hidden')};
const toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2800)};

const fallback={
 plan:{id:null,name:'Dave'},
 workouts:{
  A:{id:null,code:'A',title:'Training A',focus:'Brust · Rückenbreite · seitliche Schulter',sequence_position:1,exercises:[
   ['Schrägbankdrückmaschine dual',3,6,10,180],['Latzugstation mit Oberschenkelpolster',3,8,12,120],['Brustpresse sitzend',3,8,12,120],['Rudermaschine mit Brustpolster',3,8,12,120],['Seithebemaschine ohne Armpolster',4,12,20,90],['Butterfly reverse mit Griffen',3,12,18,90],['Bauchmuskelmaschine',3,10,15,90]
  ].map((x,i)=>({id:`fa${i}`,exercise_id:null,name:x[0],target_sets:x[1],rep_min:x[2],rep_max:x[3],rest_seconds:x[4]}))},
  B:{id:null,code:'B',title:'Training B',focus:'obere Brust · Rückendicke · hintere Schulter · Arme',sequence_position:2,exercises:[
   ['Kurzhantel-Schrägbankdrücken',3,6,10,180],['High Row dual',3,8,12,120],['Butterfly mit Griffen',3,8,12,90],['Low Row dual',3,8,12,120],['Seithebemaschine ohne Armpolster',4,12,20,90],['Butterfly reverse mit Griffen',3,12,18,90],['Trizepsmaschine Überkopf',2,8,12,90],['Bizepsmaschine',2,8,12,90]
  ].map((x,i)=>({id:`fb${i}`,exercise_id:null,name:x[0],target_sets:x[1],rep_min:x[2],rep_max:x[3],rest_seconds:x[4]}))}
 },schedule:[],completed:[],latestWeight:null,offlineFallback:true
};
function buildFallbackSchedule(){const out=[];let d=new Date(),code='A';while(out.length<18){if([2,4,6].includes(d.getDay())){out.push({id:`local-${out.length}`,date:iso(d),status:'planned',code});code=code==='A'?'B':'A'}d.setDate(d.getDate()+1)}return out}
fallback.schedule=buildFallbackSchedule();

async function loadRemote(){
 const q=async(table,select,fn=x=>x)=>{const r=fn(supabase.from(table).select(select));if(r.error)throw r.error;return r.data||[]};
 const {data:plans,error:pErr}=await supabase.from('training_plans').select('id,name,goal,version').eq('is_active',true).order('version',{ascending:false}).limit(1);if(pErr)throw pErr;if(!plans?.length)throw new Error('Kein aktiver Trainingsplan in Supabase gefunden');
 const plan=plans[0];
 const {data:pws,error:wErr}=await supabase.from('plan_workouts').select('id,code,title,focus,sequence_position').eq('plan_id',plan.id).order('sequence_position');if(wErr)throw wErr;if(!pws?.length)throw new Error('Training A/B fehlen in Supabase');
 const ids=pws.map(x=>x.id);
 const {data:pes,error:peErr}=await supabase.from('plan_exercises').select('id,plan_workout_id,exercise_id,exercise_order,target_sets,rep_min,rep_max,rest_seconds,instructions').in('plan_workout_id',ids).order('exercise_order');if(peErr)throw peErr;
 const exIds=[...new Set((pes||[]).map(x=>x.exercise_id))];
 let exs=[];if(exIds.length){const r=await supabase.from('exercises').select('id,name,image_path,equipment').in('id',exIds);if(r.error)throw r.error;exs=r.data||[]}
 const exMap=Object.fromEntries(exs.map(x=>[x.id,x]));const workouts={};
 for(const w of pws)workouts[w.code]={...w,exercises:(pes||[]).filter(x=>x.plan_workout_id===w.id).map(x=>({...x,name:exMap[x.exercise_id]?.name||'Übung',image_path:exMap[x.exercise_id]?.image_path||null}))};
 const [sr,dr,wr]=await Promise.all([
  supabase.from('scheduled_workouts').select('id,plan_workout_id,scheduled_date,status').order('scheduled_date'),
  supabase.from('workouts').select('id,plan_workout_id,workout_date,status').in('status',['completed','partial']).order('workout_date',{ascending:false}).limit(100),
  supabase.from('weigh_ins').select('id,measured_at,weight_kg').order('measured_at',{ascending:false}).limit(1)
 ]);if(sr.error)throw sr.error;if(dr.error)throw dr.error;if(wr.error)throw wr.error;
 const code=Object.fromEntries(pws.map(x=>[x.id,x.code]));
 snapshot={plan,workouts,schedule:(sr.data||[]).map(x=>({id:x.id,date:x.scheduled_date,status:x.status,code:code[x.plan_workout_id]||'?'})),completed:(dr.data||[]).map(x=>({id:x.id,date:x.workout_date,status:x.status,code:code[x.plan_workout_id]||'?'})),latestWeight:wr.data?.[0]||null};
 write(SNAP,snapshot);return snapshot;
}
function renderCalendar(){const grid=$('#calendar-grid');if(!grid||!snapshot)return;const y=viewed.getFullYear(),m=viewed.getMonth();$('#calendar-title').textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(viewed);const off=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),planned=new Map(snapshot.schedule.map(x=>[x.date,x])),done=new Map(snapshot.completed.map(x=>[x.date,x]));let html='';for(let i=0;i<off;i++)html+='<span class="calendar-day empty"></span>';for(let d=1;d<=days;d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,p=planned.get(date),a=done.get(date);html+=`<button class="calendar-day ${date===iso()?'today':''} ${a?'completed':p?'planned':''}" data-date="${date}"><span>${d}</span>${a?`<small class="plan-badge">${a.code} ✓</small>`:p?`<small class="plan-badge">${p.code}</small>`:''}</button>`}grid.innerHTML=html}
function render(){const next=snapshot.schedule.find(x=>['planned','confirmed','started'].includes(x.status))||snapshot.schedule[0];$('#next-workout').textContent=next?`Training ${next.code}`:'Training planen';$('#next-date').textContent=next?new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(pd(next.date)):'';$('#completed-count').textContent=snapshot.completed.length;$('#week-count').textContent=snapshot.completed.filter(x=>{const d=pd(x.date),n=new Date();return Math.abs(n-d)<7*864e5}).length;$('#streak-count').textContent='0';$('#latest-weight').textContent=snapshot.latestWeight?`${Number(snapshot.latestWeight.weight_kg).toFixed(1)} kg`:'Noch kein Gewicht';$('#workout-list').innerHTML=Object.values(snapshot.workouts).sort((a,b)=>a.sequence_position-b.sequence_position).map(w=>`<article class="workout-card"><p class="eyebrow">EINHEIT ${w.code}</p><h3>${w.title}</h3><p class="muted">${w.focus||''}</p><div class="workout-meta"><span>${w.exercises.length} Übungen</span></div><button data-workout="${w.code}">Plan ansehen</button></article>`).join('');renderCalendar();$('#connection-status').textContent=snapshot.offlineFallback?'Lokaler Plan':'Online'}
function openWorkout(code){const w=snapshot?.workouts?.[code];if(!w)return toast('Training konnte nicht geöffnet werden.');currentCode=code;$('#dialog-title').textContent=w.title;$('#exercise-list').innerHTML=w.exercises.map(ex=>`<article class="exercise-card"><div class="exercise-image">${ex.image_path?`<img src="${ex.image_path}" alt="${ex.name}">`:'Gerätebild folgt'}</div><div class="exercise-body"><h3>${ex.name}</h3><p class="exercise-prescription">${ex.target_sets} × ${ex.rep_min}–${ex.rep_max} · ${ex.rest_seconds} Sek.</p></div></article>`).join('');$('#completion-hint').textContent='Tracking wird im nächsten stabilen Schritt wieder aktiviert.';$('#complete-workout').disabled=true;$('#workout-dialog').showModal()}
async function enter(){showOnly($('#loading'));let remoteError=null;try{await loadRemote()}catch(e){remoteError=e;snapshot=read(SNAP,null)||structuredClone(fallback)}showOnly($('#dashboard'));render();if(remoteError){$('#connection-status').textContent='Datenbankfehler';toast(`Supabase: ${remoteError.message||'unbekannter Fehler'}`)}}
async function boot(){document.documentElement.dataset.theme=localStorage.getItem(THEME)||'light';if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});const r=await supabase.auth.getSession();session=r.data.session;if(session)await enter();else showOnly($('#login-screen'))}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();$('#login-error').textContent='';const r=await supabase.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(r.error){$('#login-error').textContent=`Anmeldung fehlgeschlagen: ${r.error.message}`;return}session=r.data.session;await enter()});
$('#logout').onclick=async()=>{await supabase.auth.signOut();session=null;showOnly($('#login-screen'))};
$('#theme-toggle').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem(THEME,t)};
$('#start-workout').onclick=()=>openWorkout((snapshot.schedule.find(x=>['planned','confirmed','started'].includes(x.status))||snapshot.schedule[0])?.code||'A');
$('#workout-list').onclick=e=>{const b=e.target.closest('[data-workout]');if(b)openWorkout(b.dataset.workout)};$('#close-dialog').onclick=()=>$('#workout-dialog').close();
$('#prev-month').onclick=()=>{viewed=new Date(viewed.getFullYear(),viewed.getMonth()-1,1);renderCalendar()};$('#next-month').onclick=()=>{viewed=new Date(viewed.getFullYear(),viewed.getMonth()+1,1);renderCalendar()};
$('#open-weight').onclick=()=>$('#weight-dialog').showModal();$('#close-weight').onclick=()=>$('#weight-dialog').close();$('#save-weight').onclick=async()=>{const v=Number(String($('#weight-input').value).replace(',','.'));if(!v||v<30||v>300)return $('#weight-status').textContent='Ungültiges Gewicht';const r=await supabase.from('weigh_ins').insert({user_id:session.user.id,weight_kg:v,toilet_status:$('#weight-toilet').value,food_status:$('#weight-food').value,late_meal:$('#weight-late').value,unusual_time:$('#weight-unusual').checked,trained_previous_day:$('#weight-trained').checked});if(r.error)return $('#weight-status').textContent=r.error.message;$('#weight-dialog').close();await enter();toast('Gewicht gespeichert.')};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===`tab-${b.dataset.tab}`))});
supabase.auth.onAuthStateChange((_e,s)=>{session=s;if(!s)showOnly($('#login-screen'))});boot();