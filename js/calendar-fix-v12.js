import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const ACTIVE='gym-active-workout-v11';
const MOVE_KEY='gym-calendar-move-v12';
const $=s=>document.querySelector(s);
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const iso=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+days);return iso(d)};
const isOnline=()=>navigator.onLine&&localStorage.getItem('gym-offline-v11')!=='1';

function banner(title,message){
  const stack=$('#error-stack'); if(!stack)return;
  const item=document.createElement('article');item.className='error-banner';
  item.innerHTML=`<strong>${title}</strong><p>${message}</p><button aria-label="Meldung schließen">×</button>`;
  item.querySelector('button').onclick=()=>item.remove();stack.prepend(item);
}
function setBusy(on,text='Kalender wird aktualisiert …'){
  let el=$('#calendar-busy-v12');
  if(on&&!el){el=document.createElement('article');el.id='calendar-busy-v12';el.className='error-banner';el.innerHTML=`<strong>${text}</strong><p>Bitte einen Moment warten und nicht mehrfach tippen.</p>`;$('#error-stack')?.prepend(el)}
  if(!on)el?.remove();
}
function snapshot(){return read(SNAP,{schedule:[],workouts:{},plan:{},completed:[]})}
function plannedRows(s){return (s.schedule||[]).filter(x=>['planned','confirmed','started'].includes(x.status));}
function workoutIds(s){return {A:s.workouts?.A?.id,B:s.workouts?.B?.id};}
function alternatingRows(startDate,startCode,count,ids,userId){
  const rows=[];let code=startCode;
  for(let i=0;i<count;i++){
    rows.push({user_id:userId,plan_workout_id:ids[code],scheduled_date:addDays(startDate,i*2),status:'planned'});
    code=code==='A'?'B':'A';
  }
  return rows;
}
async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('Sitzung nicht verfügbar.');return data.user;}
async function deleteIds(ids){if(!ids.length)return;const {error}=await supabase.from('scheduled_workouts').delete().in('id',ids);if(error)throw error;}
async function insertRows(rows){if(!rows.length)return;const {error}=await supabase.from('scheduled_workouts').insert(rows);if(error)throw error;}

async function rebuildTail(sourceId,newDate){
  const s=snapshot(),source=(s.schedule||[]).find(x=>x.id===sourceId);if(!source)throw new Error('Der ausgewählte Termin wurde nicht gefunden.');
  const tail=plannedRows(s).filter(x=>x.date>=source.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(!tail.length)throw new Error('Keine nachfolgenden Termine gefunden.');
  const earlier=plannedRows(s).filter(x=>x.date<source.date);
  if(earlier.some(x=>x.date===newDate))throw new Error('An diesem Tag liegt bereits ein früherer Termin.');
  const ids=workoutIds(s);if(!ids.A||!ids.B)throw new Error('Training A oder B fehlt im geladenen Plan.');
  const user=await currentUser();
  const rows=alternatingRows(newDate,source.code,tail.length,ids,user.id);
  const occupied=new Set(earlier.map(x=>x.date));
  if(rows.some(x=>occupied.has(x.scheduled_date)))throw new Error('Die neue Rotation überschneidet sich mit einem früheren Termin.');
  await deleteIds(tail.map(x=>x.id));
  try{await insertRows(rows)}catch(err){banner('Kalender unvollständig','Die alten Folgetermine wurden entfernt, die neue Rotation konnte aber nicht vollständig angelegt werden. Bitte Seite neu laden.');throw err;}
}

async function reconcileAfterCompletion(active){
  const s=snapshot(),w=s.workouts?.[active.code];if(!w?.id)throw new Error('Trainingsplan konnte nicht zugeordnet werden.');
  const states=active.statuses||{},values=Object.values(states);
  if(values.length<(w.exercises||[]).length&&!confirm('Nicht alle Übungen sind bewertet. Training trotzdem teilweise abschließen?'))return false;
  const user=await currentUser();
  const elapsed=(active.elapsed||0)+(active.running&&active.lastStart?Date.now()-active.lastStart:0);
  const payload={user_id:user.id,plan_id:s.plan.id,plan_workout_id:w.id,workout_date:iso(),started_at:new Date(Date.now()-elapsed).toISOString(),finished_at:new Date().toISOString(),elapsed_seconds:Math.max(0,Math.floor(elapsed/1000)),status:values.length===(w.exercises||[]).length&&values.every(x=>x==='completed')?'completed':'partial'};
  const {error:workoutError}=await supabase.from('workouts').insert(payload);if(workoutError)throw workoutError;

  const future=plannedRows(s).sort((a,b)=>a.date.localeCompare(b.date));
  const count=Math.max(future.length,18);
  const ids=workoutIds(s);if(!ids.A||!ids.B)throw new Error('Training A oder B fehlt im Plan.');
  await deleteIds(future.map(x=>x.id));
  const nextCode=active.code==='A'?'B':'A';
  const nextDate=addDays(iso(),2);
  await insertRows(alternatingRows(nextDate,nextCode,count,ids,user.id));
  localStorage.removeItem(ACTIVE);
  return true;
}

function prepareText(){
  document.querySelectorAll('#page-calendar .page-head p').forEach(p=>p.textContent='Die gesamte A/B-Rotation wird mit einem trainingsfreien Tag dazwischen verschoben.');
}
prepareText();

// "Termin verschieben" übernimmt ab hier die robuste Rotationslogik.
document.addEventListener('click',async e=>{
  const move=e.target.closest('#planning-move');
  if(move){
    e.preventDefault();e.stopImmediatePropagation();
    const date=$('#planning-dialog')?.dataset.date;const s=snapshot();const item=(s.schedule||[]).find(x=>x.date===date&&['planned','confirmed','started'].includes(x.status));
    if(!item){banner('Termin nicht gefunden','Bitte Kalender neu laden und erneut versuchen.');return;}
    sessionStorage.setItem(MOVE_KEY,item.id);$('#planning-dialog')?.close();
    banner('Neuen Tag auswählen',`Training ${item.code} ist markiert. Tippe jetzt den gewünschten neuen Tag an.`);return;
  }

  const day=e.target.closest('[data-calendar-grid] [data-date]');
  const sourceId=sessionStorage.getItem(MOVE_KEY);
  if(day&&sourceId){
    e.preventDefault();e.stopImmediatePropagation();sessionStorage.removeItem(MOVE_KEY);setBusy(true);
    try{await rebuildTail(sourceId,day.dataset.date);location.reload();}
    catch(err){setBusy(false);banner('Termin konnte nicht verschoben werden',err.message||String(err));}
    return;
  }

  const complete=e.target.closest('#complete-workout');
  if(complete&&isOnline()){
    e.preventDefault();e.stopImmediatePropagation();
    const active=read(ACTIVE,null);if(!active){banner('Kein aktives Training','Starte zunächst ein Training.');return;}
    setBusy(true,'Training wird abgeschlossen …');
    try{const done=await reconcileAfterCompletion(active);if(done)location.reload();else setBusy(false);}
    catch(err){setBusy(false);banner('Training konnte nicht abgeschlossen werden',err.message||String(err));}
  }
},true);
