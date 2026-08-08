import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const EDIT='gym-v53-edit';
const OFFLINE='gym-offline-v11';
const PENDING='gym-v67-schedule-pending';
const ACTIVE_STATUSES=new Set(['planned','confirmed','started']);
const q=(s,r=document)=>r.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const pd=v=>new Date(`${v}T12:00:00`);
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const addDays=(v,n)=>{const d=pd(v);d.setDate(d.getDate()+n);return iso(d)};
const daysBetween=(a,b)=>Math.round((pd(a)-pd(b))/86400000);
const online=()=>navigator.onLine&&localStorage.getItem(OFFLINE)!=='1';
const snap=()=>read(SNAP,{plan:{},workouts:{},schedule:[],completed:[]});
const other=code=>code==='A'?'B':'A';

function doneKeys(s){return new Set((s.completed||[]).map(x=>`${x.date}|${x.code}`))}
function unresolved(s=snap()){
  const done=doneKeys(s);
  return (s.schedule||[]).filter(x=>ACTIVE_STATUSES.has(x.status)&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date));
}
function actionable(s=snap()){return unresolved(s)[0]||null}
function missed(s=snap()){const t=today();return unresolved(s).find(x=>x.date<t)||null}
function formatDate(v){return new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(pd(v))}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

function renderHero(){
  const item=actionable();
  const title=q('#next-workout'),date=q('#next-date'),start=q('#start-workout'),label=title?.closest('.hero')?.querySelector('small');
  if(!title||!date||!start)return;
  if(!item){setText(label,'Als Nächstes');setText(title,'Training planen');setText(date,'');delete start.dataset.workout;return}
  const t=today();
  setText(label,item.date<t?'Offenes Training':item.date===t?'Heute':'Als Nächstes');
  setText(title,`Training ${item.code}`);
  setText(date,item.date<t?`${formatDate(item.date)} · noch nicht geklärt`:item.date===t?`Heute · ${formatDate(item.date)}`:formatDate(item.date));
  start.dataset.workout=item.code;start.dataset.scheduleId=item.id||'';start.dataset.scheduleDate=item.date;
}

function ensureStyle(){
  if(q('#schedule-v67-style'))return;
  const s=document.createElement('style');s.id='schedule-v67-style';s.textContent=`#missed-dialog-v67{width:min(92vw,520px);border:0;border-radius:24px;padding:0;color:var(--text,#171b18);background:var(--surface,#fff)}#missed-dialog-v67::backdrop{background:rgba(17,24,20,.46);backdrop-filter:blur(5px)}.missed67{padding:20px}.missed67 header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.missed67 header small{letter-spacing:.16em;color:var(--muted,#70766f)}.missed67 h2{margin:.2rem 0 0;font-size:1.55rem}.missed67 p{color:var(--muted,#70766f);line-height:1.45}.missed67-actions{display:grid;gap:9px}.missed67-actions button,.missed67-form button{min-height:48px;border-radius:14px;border:1px solid var(--line,#d9ded9);font:inherit;font-weight:750}.missed67-primary{background:#47745a;color:#fff;border-color:#47745a!important}.missed67-secondary{background:var(--surface-2,#f3f5f2);color:inherit}.missed67-form{display:grid;gap:10px;margin-top:14px}.missed67-form label{display:grid;gap:6px;font-weight:700}.missed67-form input,.missed67-form select{min-height:46px;border:1px solid var(--line,#d9ded9);border-radius:12px;background:var(--surface-2,#f3f5f2);color:inherit;padding:0 11px;font-size:16px}.missed67-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.missed67-status{min-height:20px;font-size:.85rem}.missed67-close{border:0;background:transparent;font-size:1.5rem}`;document.head.append(s)
}

function ensureDialog(){
  let d=q('#missed-dialog-v67');if(d)return d;ensureStyle();
  d=document.createElement('dialog');d.id='missed-dialog-v67';d.innerHTML=`<div class="missed67"><header><div><small>TRAINING KLÄREN</small><h2 id="missed67-title">Offenes Training</h2></div><button class="missed67-close" type="button">×</button></header><p id="missed67-copy"></p><div class="missed67-actions" id="missed67-question"><button type="button" class="missed67-primary" id="missed67-did">Ja, Training nachtragen</button><button type="button" class="missed67-secondary" id="missed67-no">Nein, nicht trainiert</button></div><div class="missed67-form" id="missed67-form" hidden><label>Nächstes Training<input type="date" id="missed67-date"></label><div class="missed67-quick"><button type="button" data-quick="today">Heute</button><button type="button" data-quick="tomorrow">Morgen</button></div><label>Was soll mit den folgenden Terminen passieren?<select id="missed67-mode"><option value="keep">Bestehende Trainingstage behalten, nur A/B ab hier korrigieren</option><option value="shift">Alle folgenden Trainingstage mitverschieben</option></select></label><button type="button" class="missed67-primary" id="missed67-save">Übernehmen</button><p class="missed67-status" id="missed67-status"></p></div></div>`;document.body.append(d);
  q('.missed67-close',d).onclick=()=>d.close();
  q('#missed67-no',d).onclick=()=>{q('#missed67-question',d).hidden=true;q('#missed67-form',d).hidden=false};
  q('[data-quick="today"]',d).onclick=()=>q('#missed67-date',d).value=today();
  q('[data-quick="tomorrow"]',d).onclick=()=>q('#missed67-date',d).value=addDays(today(),1);
  q('#missed67-did',d).onclick=()=>{
    const item=missed();if(!item)return d.close();
    write(EDIT,{code:item.code,workout_date:item.date,workout_id:null,exercises:[]});d.close();
    q(`#workout-list [data-workout="${item.code}"]`)?.click();
  };
  q('#missed67-save',d).onclick=()=>resolveFromDialog(d);
  return d
}

function showMissed(force=false){
  const item=missed();if(!item)return;
  const d=ensureDialog();if(d.open&&!force)return;
  q('#missed67-title',d).textContent=`Training ${item.code} vom ${formatDate(item.date)}`;
  q('#missed67-copy',d).textContent='Für diesen geplanten Termin ist kein abgeschlossenes Training gespeichert. Hast du trainiert?';
  q('#missed67-question',d).hidden=false;q('#missed67-form',d).hidden=true;q('#missed67-status',d).textContent='';
  q('#missed67-date',d).value=addDays(today(),1);
  if(!d.open)d.showModal();
}

function buildOperation(item,nextDate,mode,s){
  const open=unresolved(s).filter(x=>x.date>item.date);
  const deletes=[item.id].filter(Boolean);let rows=[];let insert=null;
  const byCode=Object.fromEntries(Object.values(s.workouts||{}).map(w=>[w.code,w.id]));
  if(mode==='keep'){
    const before=open.filter(x=>x.date<nextDate);before.forEach(x=>x.id&&deletes.push(x.id));
    const usable=open.filter(x=>x.date>=nextDate);
    if(usable.length){rows=usable.map((r,i)=>({id:r.id,newDate:i===0?nextDate:r.date,newCode:i%2===0?item.code:other(item.code),planWorkoutId:byCode[i%2===0?item.code:other(item.code)]}))}
    else insert={date:nextDate,code:item.code,planWorkoutId:byCode[item.code]};
  }else{
    if(open.length){const delta=daysBetween(nextDate,open[0].date);rows=open.map((r,i)=>({id:r.id,newDate:addDays(r.date,delta),newCode:i%2===0?item.code:other(item.code),planWorkoutId:byCode[i%2===0?item.code:other(item.code)]}))}
    else insert={date:nextDate,code:item.code,planWorkoutId:byCode[item.code]};
  }
  return {deletes:[...new Set(deletes.map(String))],rows,insert}
}

function applyLocal(operation){
  const s=snap(),del=new Set(operation.deletes.map(String));s.schedule=(s.schedule||[]).filter(x=>!del.has(String(x.id)));
  for(const u of operation.rows){const row=s.schedule.find(x=>String(x.id)===String(u.id));if(row){row.date=u.newDate;row.scheduled_date=u.newDate;row.code=u.newCode;row.plan_workout_id=u.planWorkoutId;row.status='planned'}}
  if(operation.insert)s.schedule.push({id:`local-v67-${Date.now()}`,date:operation.insert.date,scheduled_date:operation.insert.date,code:operation.insert.code,plan_workout_id:operation.insert.planWorkoutId,status:'planned'});
  write(SNAP,s);renderHero();
}

async function sessionUser(){
  let r=await supabase.auth.getSession();
  if(r.error||!r.data.session){const fresh=await supabase.auth.refreshSession();if(fresh.error||!fresh.data.session)throw new Error('Bitte neu anmelden.');r=fresh}
  return r.data.session.user
}

async function persistOperation(operation){
  for(const id of operation.deletes){if(id.startsWith('local-'))continue;const del=await supabase.from('scheduled_workouts').delete().eq('id',id);if(del.error)throw del.error}
  const rows=operation.rows.filter(x=>x.id&&!String(x.id).startsWith('local-'));
  for(let i=0;i<rows.length;i++){const temp=`2098-12-${String(i+1).padStart(2,'0')}`;const r=await supabase.from('scheduled_workouts').update({scheduled_date:temp}).eq('id',rows[i].id);if(r.error)throw r.error}
  for(const row of rows){const r=await supabase.from('scheduled_workouts').update({scheduled_date:row.newDate,plan_workout_id:row.planWorkoutId,status:'planned'}).eq('id',row.id);if(r.error)throw r.error}
  if(operation.insert){const user=await sessionUser();const r=await supabase.from('scheduled_workouts').insert({user_id:user.id,plan_workout_id:operation.insert.planWorkoutId,scheduled_date:operation.insert.date,status:'planned'});if(r.error)throw r.error}
}

async function resolveFromDialog(d){
  const item=missed();if(!item)return d.close();
  const date=q('#missed67-date',d).value,mode=q('#missed67-mode',d).value,status=q('#missed67-status',d),button=q('#missed67-save',d);
  if(!date||date<today()){status.textContent='Bitte heute oder ein zukünftiges Datum wählen.';return}
  const operation=buildOperation(item,date,mode,snap());button.disabled=true;status.textContent='Kalender wird aktualisiert …';
  applyLocal(operation);
  if(!online()){
    const pending=read(PENDING,[]);pending.push(operation);write(PENDING,pending);status.textContent='Lokal gespeichert. Wird bei Verbindung synchronisiert.';setTimeout(()=>{d.close();location.reload()},450);return
  }
  try{await persistOperation(operation);localStorage.removeItem(SNAP);localStorage.removeItem(PENDING);d.close();location.reload()}
  catch(error){const pending=read(PENDING,[]);pending.push(operation);write(PENDING,pending);status.textContent=`Lokal übernommen, Synchronisierung folgt: ${error.message}`;button.disabled=false}
}

async function syncPending(){
  if(!online())return;const list=read(PENDING,[]);if(!list.length)return;const rest=[];
  for(const op of list){try{await persistOperation(op)}catch{rest.push(op)}}write(PENDING,rest);if(!rest.length)localStorage.removeItem(SNAP)
}

function interceptStart(event){
  const b=event.target.closest('#start-workout');if(!b)return;
  const item=actionable();if(!item)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(item.date<today()){showMissed(true);return}
  q(`#workout-list [data-workout="${item.code}"]`)?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}

function install(){
  ensureStyle();renderHero();syncPending();
  const hero=q('.hero');if(hero&&!hero.dataset.scheduleObservedV67){hero.dataset.scheduleObservedV67='1';new MutationObserver(()=>queueMicrotask(renderHero)).observe(hero,{subtree:true,childList:true,characterData:true})}
  [500,1200,2200].forEach(ms=>setTimeout(()=>{renderHero();if(!q('dialog[open]'))showMissed()},ms));
}

document.addEventListener('click',interceptStart,true);
document.addEventListener('click',e=>{if(e.target.closest('[data-page="dashboard"],[data-page-link="dashboard"],#planning-delete,#planning-move,[data-plan-code]'))setTimeout(()=>{renderHero();showMissed()},120)},true);
window.addEventListener('online',()=>{syncPending();setTimeout(renderHero,100)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderHero();setTimeout(()=>showMissed(),250)}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
