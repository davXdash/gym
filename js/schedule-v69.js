import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11',EDIT='gym-v53-edit',OFF='gym-offline-v11',MIG='gym-v74-cadence-migrated',RECOVERY='gym-v74-august-recovered';
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
const days=(a,b)=>Math.round((pd(b)-pd(a))/86400000);

function completedSorted(s=snap()){return [...(s.completed||[])].filter(x=>x.code==='A'||x.code==='B').sort((a,b)=>a.date.localeCompare(b.date))}
function expectedCode(s=snap()){
  const done=completedSorted(s);if(done.length)return other(done.at(-1).code);
  const first=(s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return first?.code||'A';
}
function doneKeys(s=snap()){return new Set((s.completed||[]).filter(x=>x.code).map(x=>`${x.date}|${x.code}`))}
function openRows(s=snap()){
  const done=doneKeys(s);
  return (s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date));
}
function actionable(s=snap()){
  const expected=expectedCode(s),rows=openRows(s);return rows.find(x=>x.code===expected)||rows[0]||null;
}
function nextDate(date){const d=pd(date);d.setDate(d.getDate()+2);return iso(d)}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function renderHero(){
  const s=snap(),item=actionable(s),expected=expectedCode(s),title=q('#next-workout'),date=q('#next-date'),start=q('#start-workout');if(!title||!date||!start)return;
  const label=title.closest('.hero')?.querySelector('small');
  if(!item){setText(label,'Als Nächstes');setText(title,`Training ${expected}`);setText(date,'Noch kein Termin festgelegt');start.dataset.workout=expected;return}
  const late=item.date<today();
  setText(label,late?'Offenes Training':item.date===today()?'Heute':'Als Nächstes');setText(title,`Training ${expected}`);
  setText(date,late?`${fmt(item.date)} · nicht erledigt`:item.date===today()?`Heute · ${fmt(item.date)}`:fmt(item.date));
  start.dataset.workout=expected;start.dataset.scheduleDate=item.date;
}

async function user(){const r=await supabase.auth.getSession();if(r.error||!r.data.session)throw new Error('Bitte neu anmelden.');return r.data.session.user}

function buildRotation(s,anchorDate,anchorCode,count){
  const byCode=Object.fromEntries(Object.values(s.workouts||{}).map(w=>[w.code,w.id]));
  const out=[];let date=anchorDate,code=anchorCode;
  for(let i=0;i<count;i++){out.push({date,code,plan_workout_id:byCode[code]});date=nextDate(date);code=other(code)}
  return out;
}

async function replaceOpenRotation(s,anchorDate,anchorCode,count,statusEl=null){
  const done=doneKeys(s);
  const active=(s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date));
  const rotation=buildRotation(s,anchorDate,anchorCode,Math.max(count,active.length,30));
  const byCode=Object.fromEntries(Object.values(s.workouts||{}).map(w=>[w.code,w.id]));
  if(!byCode.A||!byCode.B){if(statusEl)statusEl.textContent='Trainingsplan A/B konnte nicht aufgelöst werden.';return false}

  // Local view first, but do not destroy the database until all writes succeeded.
  const activeIds=new Set(active.map(x=>String(x.id)));
  s.schedule=(s.schedule||[]).filter(x=>!activeIds.has(String(x.id)));
  rotation.forEach((a,i)=>s.schedule.push({id:active[i]?.id||`local-v74-${Date.now()}-${i}`,date:a.date,scheduled_date:a.date,code:a.code,plan_workout_id:a.plan_workout_id,status:'planned'}));
  write(SNAP,s);renderHero();
  if(!online()){if(statusEl)statusEl.textContent='Offline gespeichert. Synchronisierung folgt online.';return true}

  try{
    const u=await user();
    // 1) Update existing rows in place.
    for(let i=0;i<Math.min(active.length,rotation.length);i++){
      const old=active[i],a=rotation[i];
      if(!old.id||String(old.id).startsWith('local-'))continue;
      const r=await supabase.from('scheduled_workouts').update({plan_workout_id:a.plan_workout_id,scheduled_date:a.date,status:'planned'}).eq('id',old.id);
      if(r.error)throw r.error;
    }
    // 2) Insert missing rows.
    const missing=rotation.slice(active.length).map(a=>({user_id:u.id,plan_workout_id:a.plan_workout_id,scheduled_date:a.date,status:'planned'}));
    if(missing.length){const r=await supabase.from('scheduled_workouts').insert(missing);if(r.error)throw r.error}
    // 3) Only after successful update/insert remove surplus rows.
    for(const old of active.slice(rotation.length)){
      if(!old.id||String(old.id).startsWith('local-'))continue;
      const r=await supabase.from('scheduled_workouts').delete().eq('id',old.id);if(r.error)throw r.error;
    }
    localStorage.removeItem(SNAP);return true;
  }catch(e){if(statusEl)statusEl.textContent=`Speichern fehlgeschlagen: ${e.message}`;console.error(e);return false}
}

function looksLikeLegacyThreeDayBug(rows){
  const future=rows.filter(x=>x.date>=today()).slice(0,5);if(future.length<4)return false;
  const gaps=future.slice(1).map((x,i)=>days(future[i].date,x.date));
  return gaps.slice(0,3).every(g=>g===3);
}
async function migrateLegacyCadence(){
  if(localStorage.getItem(MIG)==='1')return;
  const s=snap(),rows=openRows(s);
  if(!looksLikeLegacyThreeDayBug(rows)){localStorage.setItem(MIG,'1');return}
  const first=rows.find(x=>x.date>=today())||rows[0];if(!first)return;
  const ok=await replaceOpenRotation(s,first.date,first.code,rows.length);
  if(ok){localStorage.setItem(MIG,'1');if(online())location.reload()}
}

async function recoverBrokenAugust(){
  if(localStorage.getItem(RECOVERY)==='1'||today()!=='2026-08-08')return;
  const s=snap(),done=completedSorted(s),last=done.at(-1),rows=openRows(s);
  const firstFuture=rows.find(x=>x.date>=today());
  // Exact recovery for the state reported on 08.08.2026: A 03.08., B 05.08., then the future rotation vanished.
  if(last?.date==='2026-08-05'&&last?.code==='B'&&(!firstFuture||firstFuture.date>'2026-08-12')){
    const ok=await replaceOpenRotation(s,'2026-08-09','A',30);
    if(ok){localStorage.setItem(RECOVERY,'1');if(online())location.reload()}
  }else localStorage.setItem(RECOVERY,'1');
}

function ensureDialog(){
  let d=q('#missed-v69');if(d)return d;
  const style=document.createElement('style');style.textContent='#missed-v69{width:min(92vw,520px);border:0;border-radius:24px;padding:0;color:var(--text,#171b18);background:var(--surface,#fff)}#missed-v69::backdrop{background:rgba(12,18,14,.5);backdrop-filter:blur(5px)}.m69{padding:20px}.m69 header{display:flex;justify-content:space-between;gap:12px}.m69 h2{margin:.25rem 0}.m69 p{color:var(--muted,#737973);line-height:1.45}.m69 button,.m69 input{min-height:48px;border:1px solid var(--line,#d8ddd8);border-radius:14px;font:inherit}.m69 button{font-weight:750}.m69 .primary{background:#47745a;color:#fff;border-color:#47745a}.m69 .secondary{background:var(--surface-2,#f2f4f1);color:inherit}.m69-actions,.m69-form{display:grid;gap:9px}.m69-form{margin-top:12px}.m69-form label{display:grid;gap:6px;font-weight:700}.m69-form input{padding:0 12px;background:var(--surface-2,#f2f4f1);color:inherit;font-size:16px}.m69-close{border:0!important;background:transparent!important;font-size:24px}.m69-status{min-height:20px;font-size:.85rem}';document.head.append(style);
  d=document.createElement('dialog');d.id='missed-v69';d.innerHTML='<div class="m69"><header><div><small>TRAINING KLÄREN</small><h2 id="m69-title"></h2></div><button class="m69-close" type="button">×</button></header><p id="m69-copy"></p><div class="m69-actions" id="m69-question"><button class="primary" id="m69-yes" type="button">Ja, ich habe trainiert</button><button class="secondary" id="m69-no" type="button">Nein, nicht trainiert</button></div><div class="m69-form" id="m69-form" hidden><label>Wann machst du das nächste Training?<input id="m69-date" type="date"></label><button class="primary" id="m69-save" type="button">Termin übernehmen</button><p class="m69-status" id="m69-status"></p></div></div>';
  document.body.append(d);q('.m69-close',d).onclick=()=>d.close();
  q('#m69-no',d).onclick=()=>{q('#m69-question',d).hidden=true;q('#m69-form',d).hidden=false;const x=pd(today());x.setDate(x.getDate()+1);q('#m69-date',d).value=iso(x)};
  q('#m69-yes',d).onclick=()=>{const s=snap(),item=actionable(s),code=expectedCode(s);if(!item)return d.close();write(EDIT,{code,workout_date:item.date,workout_id:null,exercises:[]});d.close();q(`#workout-list [data-workout="${code}"]`)?.click()};
  q('#m69-save',d).onclick=()=>saveMissed(d);return d;
}
function maybeAsk(){
  const s=snap(),item=actionable(s);if(!item||item.date>=today())return;
  const d=ensureDialog();if(d.open)return;const code=expectedCode(s);
  q('#m69-title',d).textContent=`Training ${code} vom ${fmt(item.date)}`;q('#m69-copy',d).textContent=`Für ${fmt(item.date)} war Training ${code} geplant, aber es ist kein abgeschlossenes Training gespeichert. Hast du trainiert?`;
  q('#m69-question',d).hidden=false;q('#m69-form',d).hidden=true;q('#m69-status',d).textContent='';d.showModal();
}
async function saveMissed(d){
  const date=q('#m69-date',d).value,status=q('#m69-status',d),button=q('#m69-save',d),s=snap(),code=expectedCode(s);
  if(!date||date<today()){status.textContent='Bitte heute oder ein zukünftiges Datum wählen.';return}
  button.disabled=true;status.textContent='Kalender wird korrigiert …';
  const ok=await replaceOpenRotation(s,date,code,openRows(s).length,status);button.disabled=false;
  if(ok){d.close();if(online())location.reload()}
}
function interceptStart(e){
  const b=e.target.closest('#start-workout');if(!b)return;const s=snap(),item=actionable(s),code=expectedCode(s);
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(item?.date<today()){maybeAsk();return}
  q(`#workout-list [data-workout="${code}"]`)?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}
function install(){
  renderHero();setTimeout(recoverBrokenAugust,500);setTimeout(migrateLegacyCadence,1400);[250,700,1500].forEach(ms=>setTimeout(()=>{renderHero();maybeAsk()},ms));
  const hero=q('.hero');if(hero)new MutationObserver(()=>queueMicrotask(renderHero)).observe(hero,{subtree:true,childList:true,characterData:true});
}
document.addEventListener('click',interceptStart,true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderHero();setTimeout(maybeAsk,200)}});
window.addEventListener('pageshow',()=>{renderHero();setTimeout(maybeAsk,200)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
