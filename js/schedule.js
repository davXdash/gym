import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const OFF='gym-offline-v11';
const EDIT='gym-v53-edit';
const ACTIVE=new Set(['planned','confirmed','started']);
const NORMALIZED='gym-schedule-clean-v1';
const BLOCKED='gym-schedule-blocked-days';
const HORIZON_DAYS=32;
const SUMMER_END='2026-09-01';

const q=(s,r=document)=>r.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const pd=v=>new Date(`${v}T12:00:00`);
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const add=(v,n)=>{const d=pd(v);d.setDate(d.getDate()+n);return iso(d)};
const fmt=v=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(pd(v));
const other=c=>c==='A'?'B':'A';
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';
const snap=()=>read(SNAP,{workouts:{},schedule:[],completed:[]});
const doneKeys=s=>new Set((s.completed||[]).filter(x=>x.code).map(x=>`${x.date}|${x.code}`));
const completed=s=>[...(s.completed||[])].filter(x=>x.code==='A'||x.code==='B').sort((a,b)=>a.date.localeCompare(b.date));
const expectedCode=s=>{const d=completed(s);return d.length?other(d.at(-1).code):'A'};
const activeRows=s=>{const done=doneKeys(s);return (s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date))};
const blocked=()=>new Set(read(BLOCKED,[]));
const actionable=s=>{const expected=expectedCode(s),rows=activeRows(s);return rows.find(x=>x.code===expected)||rows[0]||null};

function isMonday(date){return pd(date).getDay()===1}
function avoidDate(date){
  let out=date;const b=blocked();
  for(let guard=0;guard<14;guard++){
    const monday=out>SUMMER_END&&isMonday(out);
    if(!monday&&!b.has(out))return out;
    out=add(out,1);
  }
  return out;
}
function following(date){return avoidDate(add(date,2))}
function horizonEnd(){return add(today(),HORIZON_DAYS)}
function planIds(s){return Object.fromEntries(Object.values(s.workouts||{}).map(w=>[w.code,w.id]))}
function build(anchorDate,anchorCode,endDate=horizonEnd()){
  const rows=[];let date=avoidDate(anchorDate),code=anchorCode;
  while(date<=endDate&&rows.length<40){rows.push({date,code});date=following(date);code=other(code)}
  return rows;
}
function needsRepair(s,rows){
  if(localStorage.getItem(NORMALIZED)!=='1')return true;
  const b=blocked(),future=rows.filter(x=>x.date>=today());
  if(!future.length)return true;
  if(future.some(x=>b.has(x.date)))return true;
  for(let i=1;i<future.length;i++){
    const gap=Math.round((pd(future[i].date)-pd(future[i-1].date))/86400000);
    if(gap>4||future[i].code===future[i-1].code)return true;
  }
  return false;
}
async function user(){const r=await supabase.auth.getSession();if(r.error||!r.data.session)throw new Error('Bitte neu anmelden.');return r.data.session.user}

function renderHero(){
  const s=snap(),item=actionable(s),expected=expectedCode(s),title=q('#next-workout'),date=q('#next-date'),start=q('#start-workout');if(!title||!date||!start)return;
  const label=title.closest('.hero')?.querySelector('small');
  if(!item){if(label)label.textContent='Als Nächstes';title.textContent=`Training ${expected}`;date.textContent='Noch kein Termin festgelegt';start.dataset.workout=expected;delete start.dataset.scheduleDate;return}
  const late=item.date<today();
  if(label)label.textContent=late?'Offenes Training':item.date===today()?'Heute':'Als Nächstes';
  title.textContent=`Training ${expected}`;
  date.textContent=late?`${fmt(item.date)} · nicht erledigt`:item.date===today()?`Heute · ${fmt(item.date)}`:fmt(item.date);
  start.dataset.workout=expected;start.dataset.scheduleDate=item.date;
}

async function writeRotation(s,rotation){
  const ids=planIds(s);if(!ids.A||!ids.B)throw new Error('Trainingsplan A/B fehlt.');
  if(!online()){
    s.schedule=(s.schedule||[]).filter(x=>x.date<today()||!ACTIVE.has(x.status));
    rotation.forEach((r,i)=>s.schedule.push({id:`local-schedule-${Date.now()}-${i}`,date:r.date,scheduled_date:r.date,code:r.code,plan_workout_id:ids[r.code],status:'planned'}));
    write(SNAP,s);renderHero();return;
  }
  const u=await user();
  const del=await supabase.from('scheduled_workouts').delete().eq('user_id',u.id).gte('scheduled_date',today());
  if(del.error)throw del.error;
  if(rotation.length){
    const ins=await supabase.from('scheduled_workouts').insert(rotation.map(r=>({user_id:u.id,plan_workout_id:ids[r.code],scheduled_date:r.date,status:'planned'})));
    if(ins.error)throw ins.error;
  }
  localStorage.removeItem(SNAP);
}

async function normalizeAndExtend(force=false){
  const s=snap(),rows=activeRows(s),expected=expectedCode(s),future=rows.filter(x=>x.date>=today());
  const anchor=future.find(x=>x.code===expected)?.date||future[0]?.date||today();
  if(force||needsRepair(s,rows)){
    const rotation=build(anchor,expected);
    await writeRotation(s,rotation);
    localStorage.setItem(NORMALIZED,'1');
    if(online())location.reload();
    return;
  }
  const current=activeRows(s).filter(x=>x.date>=today());
  if(!current.length)return normalizeAndExtend(true);
  if(current.at(-1).date>=horizonEnd())return;
  const tail=current.at(-1),extra=build(following(tail.date),other(tail.code));if(!extra.length)return;
  const ids=planIds(s);
  if(online()){
    const u=await user();const res=await supabase.from('scheduled_workouts').insert(extra.map(r=>({user_id:u.id,plan_workout_id:ids[r.code],scheduled_date:r.date,status:'planned'})));if(res.error)throw res.error;localStorage.removeItem(SNAP);location.reload();
  }else{
    extra.forEach((r,i)=>s.schedule.push({id:`local-extra-${Date.now()}-${i}`,date:r.date,scheduled_date:r.date,code:r.code,plan_workout_id:ids[r.code],status:'planned'}));write(SNAP,s);renderHero();
  }
}

function ensureMissedDialog(){
  let d=q('#missed-clean');if(d)return d;
  d=document.createElement('dialog');d.id='missed-clean';d.innerHTML='<div style="padding:20px;min-width:min(88vw,430px)"><div style="display:flex;justify-content:space-between;gap:12px"><div><small>TRAINING KLÄREN</small><h2 data-missed-title style="margin:.25rem 0"></h2></div><button type="button" data-missed-close>×</button></div><p data-missed-copy style="color:#737973;line-height:1.45"></p><div data-missed-question style="display:grid;gap:9px"><button class="primary" type="button" data-missed-yes>Ja, durchgeführt</button><button class="secondary" type="button" data-missed-no>Nein, nicht gemacht</button></div><div data-missed-plan hidden style="display:grid;gap:9px;margin-top:12px"><label style="display:grid;gap:6px">Wann machst du das nächste Training?<input type="date" data-missed-date></label><button class="primary" type="button" data-missed-save>Termin übernehmen</button><small data-missed-status></small></div></div>';
  document.body.append(d);q('[data-missed-close]',d).onclick=()=>d.close();
  q('[data-missed-no]',d).onclick=()=>{q('[data-missed-question]',d).hidden=true;q('[data-missed-plan]',d).hidden=false;q('[data-missed-date]',d).value=add(today(),1)};
  q('[data-missed-yes]',d).onclick=()=>{const s=snap(),item=actionable(s),code=expectedCode(s);if(!item)return d.close();write(EDIT,{code,workout_date:item.date,workout_id:null,exercises:[]});d.close();q(`#workout-list [data-workout="${code}"]`)?.click()};
  q('[data-missed-save]',d).onclick=async()=>{const value=q('[data-missed-date]',d).value,status=q('[data-missed-status]',d);if(!value||value<today()){status.textContent='Bitte heute oder ein zukünftiges Datum wählen.';return}status.textContent='Kalender wird angepasst …';try{const s=snap(),rotation=build(value,expectedCode(s));await writeRotation(s,rotation);localStorage.setItem(NORMALIZED,'1');d.close();if(online())location.reload()}catch(e){status.textContent=e.message}};
  return d;
}
function maybeAskMissed(){
  const s=snap(),item=actionable(s);if(!item||item.date>=today())return;
  const d=ensureMissedDialog();if(d.open)return;const code=expectedCode(s);
  q('[data-missed-title]',d).textContent=`Training ${code} vom ${fmt(item.date)}`;
  q('[data-missed-copy]',d).textContent=`Für ${fmt(item.date)} war Training ${code} geplant, aber es ist kein abgeschlossenes Training gespeichert. Hast du trainiert?`;
  q('[data-missed-question]',d).hidden=false;q('[data-missed-plan]',d).hidden=true;q('[data-missed-status]',d).textContent='';d.showModal();
}
function interceptStart(e){
  const b=e.target.closest('#start-workout');if(!b)return;const s=snap(),item=actionable(s),code=expectedCode(s);
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(item?.date<today()){maybeAskMissed();return}
  q(`#workout-list [data-workout="${code}"]`)?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}

function installBlockDays(){
  const page=q('#page-calendar');if(!page||q('#block-days-button',page))return;
  const head=q('.page-head>div:last-child',page)||q('.page-head',page),btn=document.createElement('button');btn.id='block-days-button';btn.className='secondary';btn.textContent='Blocktage';btn.style.marginLeft='8px';head.append(btn);
  let dialog=q('#block-days-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='block-days-dialog';dialog.innerHTML='<div style="padding:18px;min-width:min(88vw,420px)"><div style="display:flex;justify-content:space-between;align-items:center"><div><small>PLANUNG</small><h2 style="margin:.2rem 0">Blocktage</h2></div><button type="button" data-block-close>Schließen</button></div><p style="color:#737973">An diesen Tagen plant die App kein Krafttraining.</p><div style="display:grid;grid-template-columns:1fr auto;gap:8px"><input type="date" data-block-date><button type="button" class="primary" data-block-add>Hinzufügen</button></div><small data-block-status style="display:block;margin-top:8px;color:#737973"></small><div data-block-list style="display:grid;gap:8px;margin-top:12px"></div></div>';document.body.append(dialog)}
  const render=()=>{const list=q('[data-block-list]',dialog),days=[...blocked()].sort();list.innerHTML=days.length?days.map(d=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 10px;border:1px solid #d8ddd8;border-radius:12px"><span>${d}</span><button type="button" data-block-remove="${d}">Entfernen</button></div>`).join(''):'<small>Noch keine Blocktage.</small>';dialog.querySelectorAll('[data-block-remove]').forEach(b=>b.onclick=()=>{write(BLOCKED,[...blocked()].filter(d=>d!==b.dataset.blockRemove));localStorage.removeItem(NORMALIZED);q('[data-block-status]',dialog).textContent='Kalender wird beim Schließen neu geplant.';render()})};
  btn.onclick=()=>{q('[data-block-status]',dialog).textContent='';render();dialog.showModal()};q('[data-block-close]',dialog).onclick=()=>dialog.close();q('[data-block-add]',dialog).onclick=()=>{const value=q('[data-block-date]',dialog).value;if(!value)return;const set=blocked();if(set.has(value)){q('[data-block-status]',dialog).textContent='Dieser Tag ist bereits blockiert.';return}set.add(value);write(BLOCKED,[...set]);localStorage.removeItem(NORMALIZED);q('[data-block-status]',dialog).textContent='Kalender wird beim Schließen neu geplant.';render()};
  dialog.addEventListener('close',()=>setTimeout(()=>normalizeAndExtend(true).catch(e=>{console.error('[GYM block days]',e);alert(`Blocktage konnten nicht übernommen werden: ${e.message}`)}),80));
}

function install(){renderHero();installBlockDays();setTimeout(()=>normalizeAndExtend().catch(e=>console.error('[GYM schedule]',e)),900);[250,700,1400].forEach(ms=>setTimeout(()=>{renderHero();maybeAskMissed()},ms))}
document.addEventListener('click',interceptStart,true);
window.addEventListener('pageshow',()=>{renderHero();setTimeout(()=>{maybeAskMissed();normalizeAndExtend().catch(()=>{})},600)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderHero();setTimeout(()=>{maybeAskMissed();normalizeAndExtend().catch(()=>{})},600)}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();