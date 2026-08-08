import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const EDIT='gym-v53-edit';
const OFF='gym-offline-v11';
const ACTIVE=new Set(['planned','confirmed','started']);
const q=(s,r=document)=>r.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const pd=v=>new Date(`${v}T12:00:00`);
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const fmt=v=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(pd(v));
const other=c=>c==='A'?'B':'A';
const snap=()=>read(SNAP,{workouts:{},schedule:[],completed:[]});
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';

function completedSorted(s=snap()){
  return [...(s.completed||[])].filter(x=>x.code==='A'||x.code==='B').sort((a,b)=>a.date.localeCompare(b.date));
}
function expectedCode(s=snap()){
  const done=completedSorted(s);
  if(done.length)return other(done.at(-1).code);
  const first=(s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return first?.code||'A';
}
function doneKeys(s=snap()){
  return new Set((s.completed||[]).filter(x=>x.code).map(x=>`${x.date}|${x.code}`));
}
function openRows(s=snap()){
  const done=doneKeys(s);
  return (s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date));
}
function actionable(s=snap()){
  const expected=expectedCode(s),rows=openRows(s);
  return rows.find(x=>x.code===expected)||rows[0]||null;
}
function nextDate(date){
  const d=pd(date);
  d.setDate(d.getDate()+2); // exactly one full rest day between normal sessions
  return iso(d);
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function renderHero(){
  const s=snap(),item=actionable(s),expected=expectedCode(s),title=q('#next-workout'),date=q('#next-date'),start=q('#start-workout');
  if(!title||!date||!start)return;
  const label=title.closest('.hero')?.querySelector('small');
  if(!item){setText(label,'Als Nächstes');setText(title,`Training ${expected}`);setText(date,'Noch kein Termin festgelegt');start.dataset.workout=expected;return}
  const late=item.date<today();
  setText(label,late?'Offenes Training':item.date===today()?'Heute':'Als Nächstes');
  setText(title,`Training ${expected}`);
  setText(date,late?`${fmt(item.date)} · nicht erledigt`:item.date===today()?`Heute · ${fmt(item.date)}`:fmt(item.date));
  start.dataset.workout=expected;
  start.dataset.scheduleDate=item.date;
}

function ensureDialog(){
  let d=q('#missed-v69');if(d)return d;
  const style=document.createElement('style');
  style.textContent='#missed-v69{width:min(92vw,520px);border:0;border-radius:24px;padding:0;color:var(--text,#171b18);background:var(--surface,#fff)}#missed-v69::backdrop{background:rgba(12,18,14,.5);backdrop-filter:blur(5px)}.m69{padding:20px}.m69 header{display:flex;justify-content:space-between;gap:12px}.m69 h2{margin:.25rem 0}.m69 p{color:var(--muted,#737973);line-height:1.45}.m69 button,.m69 input{min-height:48px;border:1px solid var(--line,#d8ddd8);border-radius:14px;font:inherit}.m69 button{font-weight:750}.m69 .primary{background:#47745a;color:#fff;border-color:#47745a}.m69 .secondary{background:var(--surface-2,#f2f4f1);color:inherit}.m69-actions,.m69-form{display:grid;gap:9px}.m69-form{margin-top:12px}.m69-form label{display:grid;gap:6px;font-weight:700}.m69-form input{padding:0 12px;background:var(--surface-2,#f2f4f1);color:inherit;font-size:16px}.m69-close{border:0!important;background:transparent!important;font-size:24px}.m69-status{min-height:20px;font-size:.85rem}';
  document.head.append(style);
  d=document.createElement('dialog');d.id='missed-v69';
  d.innerHTML='<div class="m69"><header><div><small>TRAINING KLÄREN</small><h2 id="m69-title"></h2></div><button class="m69-close" type="button">×</button></header><p id="m69-copy"></p><div class="m69-actions" id="m69-question"><button class="primary" id="m69-yes" type="button">Ja, ich habe trainiert</button><button class="secondary" id="m69-no" type="button">Nein, nicht trainiert</button></div><div class="m69-form" id="m69-form" hidden><label>Wann machst du das nächste Training?<input id="m69-date" type="date"></label><button class="primary" id="m69-save" type="button">Termin übernehmen</button><p class="m69-status" id="m69-status"></p></div></div>';
  document.body.append(d);
  q('.m69-close',d).onclick=()=>d.close();
  q('#m69-no',d).onclick=()=>{q('#m69-question',d).hidden=true;q('#m69-form',d).hidden=false;const x=pd(today());x.setDate(x.getDate()+1);q('#m69-date',d).value=iso(x)};
  q('#m69-yes',d).onclick=()=>{const s=snap(),item=actionable(s),code=expectedCode(s);if(!item)return d.close();write(EDIT,{code,workout_date:item.date,workout_id:null,exercises:[]});d.close();q(`#workout-list [data-workout="${code}"]`)?.click()};
  q('#m69-save',d).onclick=()=>saveMissed(d);
  return d;
}
function maybeAsk(){
  const s=snap(),item=actionable(s);if(!item||item.date>=today())return;
  const d=ensureDialog();if(d.open)return;
  const code=expectedCode(s);
  q('#m69-title',d).textContent=`Training ${code} vom ${fmt(item.date)}`;
  q('#m69-copy',d).textContent=`Für ${fmt(item.date)} war Training ${code} geplant, aber es ist kein abgeschlossenes Training gespeichert. Hast du trainiert?`;
  q('#m69-question',d).hidden=false;q('#m69-form',d).hidden=true;q('#m69-status',d).textContent='';d.showModal();
}

async function user(){const r=await supabase.auth.getSession();if(r.error||!r.data.session)throw new Error('Bitte neu anmelden.');return r.data.session.user}

async function saveMissed(d){
  const date=q('#m69-date',d).value,status=q('#m69-status',d),button=q('#m69-save',d),s=snap(),code=expectedCode(s);
  if(!date||date<today()){status.textContent='Bitte heute oder ein zukünftiges Datum wählen.';return}
  button.disabled=true;status.textContent='Kalender wird korrigiert …';

  const done=doneKeys(s);
  const active=(s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date));
  const horizon=Math.max(active.length,12);
  const byCode=Object.fromEntries(Object.values(s.workouts||{}).map(w=>[w.code,w.id]));

  // The chosen date is the new anchor. Every following session gets exactly one rest day.
  // We do not preserve stale three-day gaps from the old calendar anymore.
  const assignments=[];
  let cursor=date,currentCode=code;
  for(let i=0;i<horizon;i++){
    const old=active[i]||null;
    assignments.push({id:old?.id||null,date:cursor,code:currentCode,plan_workout_id:byCode[currentCode]});
    cursor=nextDate(cursor);
    currentCode=other(currentCode);
  }

  const activeIds=new Set(active.map(x=>String(x.id)));
  s.schedule=(s.schedule||[]).filter(x=>!activeIds.has(String(x.id)));
  for(const a of assignments){
    s.schedule.push({id:a.id||`local-v69-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:a.date,scheduled_date:a.date,code:a.code,plan_workout_id:a.plan_workout_id,status:'planned'});
  }
  write(SNAP,s);renderHero();

  if(!online()){
    status.textContent='Offline gespeichert. Die Server-Synchronisierung erfolgt beim nächsten Online-Start.';
    button.disabled=false;d.close();return;
  }

  try{
    const u=await user();
    for(const old of active){
      if(!old.id||String(old.id).startsWith('local-'))continue;
      const r=await supabase.from('scheduled_workouts').delete().eq('id',old.id);
      if(r.error)throw r.error;
    }
    const rows=assignments.map(a=>({user_id:u.id,plan_workout_id:a.plan_workout_id,scheduled_date:a.date,status:'planned'}));
    if(rows.length){const r=await supabase.from('scheduled_workouts').insert(rows);if(r.error)throw r.error}
    localStorage.removeItem(SNAP);d.close();location.reload();
  }catch(e){status.textContent=`Speichern fehlgeschlagen: ${e.message}`;button.disabled=false}
}

function interceptStart(e){
  const b=e.target.closest('#start-workout');if(!b)return;
  const s=snap(),item=actionable(s),code=expectedCode(s);
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(item?.date<today()){maybeAsk();return}
  q(`#workout-list [data-workout="${code}"]`)?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}
function install(){
  renderHero();
  [250,700,1500].forEach(ms=>setTimeout(()=>{renderHero();maybeAsk()},ms));
  const hero=q('.hero');if(hero)new MutationObserver(()=>queueMicrotask(renderHero)).observe(hero,{subtree:true,childList:true,characterData:true});
}
document.addEventListener('click',interceptStart,true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderHero();setTimeout(maybeAsk,200)}});
window.addEventListener('pageshow',()=>{renderHero();setTimeout(maybeAsk,200)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
