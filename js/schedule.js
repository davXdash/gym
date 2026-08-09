import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const OFF='gym-offline-v11';
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
const other=c=>c==='A'?'B':'A';
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';
const snap=()=>read(SNAP,{workouts:{},schedule:[],completed:[]});
const doneKeys=s=>new Set((s.completed||[]).filter(x=>x.code).map(x=>`${x.date}|${x.code}`));
const completed=s=>[...(s.completed||[])].filter(x=>x.code==='A'||x.code==='B').sort((a,b)=>a.date.localeCompare(b.date));
const expectedCode=s=>{const d=completed(s);return d.length?other(d.at(-1).code):'A'};
const activeRows=s=>{const done=doneKeys(s);return (s.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date))};
const blocked=()=>new Set(read(BLOCKED,[]));

function isMonday(date){return pd(date).getDay()===1}
function avoidDate(date){
  let out=date;const b=blocked();
  for(let guard=0;guard<8;guard++){
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
  const future=rows.filter(x=>x.date>=today());
  if(!future.length)return true;
  if(future.at(-1).date<horizonEnd())return false;
  for(let i=1;i<future.length;i++){
    const gap=Math.round((pd(future[i].date)-pd(future[i-1].date))/86400000);
    if(gap>4)return true;
    if(future[i].code===future[i-1].code)return true;
  }
  return false;
}
async function user(){const r=await supabase.auth.getSession();if(r.error||!r.data.session)throw new Error('Bitte neu anmelden.');return r.data.session.user}

async function writeRotation(s,rotation,existing){
  const ids=planIds(s);if(!ids.A||!ids.B)throw new Error('Trainingsplan A/B fehlt.');
  if(!online()){
    const replaceIds=new Set(existing.map(x=>String(x.id)));
    s.schedule=(s.schedule||[]).filter(x=>!replaceIds.has(String(x.id)));
    rotation.forEach((r,i)=>s.schedule.push({id:`local-schedule-${Date.now()}-${i}`,date:r.date,scheduled_date:r.date,code:r.code,plan_workout_id:ids[r.code],status:'planned'}));
    write(SNAP,s);return;
  }
  const u=await user();
  for(let i=0;i<Math.min(existing.length,rotation.length);i++){
    const old=existing[i],r=rotation[i];if(!old.id||String(old.id).startsWith('local-'))continue;
    const res=await supabase.from('scheduled_workouts').update({plan_workout_id:ids[r.code],scheduled_date:r.date,status:'planned'}).eq('id',old.id);if(res.error)throw res.error;
  }
  const missing=rotation.slice(existing.length).map(r=>({user_id:u.id,plan_workout_id:ids[r.code],scheduled_date:r.date,status:'planned'}));
  if(missing.length){const res=await supabase.from('scheduled_workouts').insert(missing);if(res.error)throw res.error}
  for(const old of existing.slice(rotation.length)){
    if(!old.id||String(old.id).startsWith('local-'))continue;
    const res=await supabase.from('scheduled_workouts').delete().eq('id',old.id);if(res.error)throw res.error;
  }
  localStorage.removeItem(SNAP);
}

async function normalizeAndExtend(){
  const s=snap(),rows=activeRows(s),expected=expectedCode(s),future=rows.filter(x=>x.date>=today());
  const anchor=future.find(x=>x.code===expected)?.date||future[0]?.date||today();
  if(needsRepair(s,rows)){
    const rotation=build(anchor,expected);
    await writeRotation(s,rotation,rows);
    localStorage.setItem(NORMALIZED,'1');
    if(online())location.reload();
    return;
  }
  const current=activeRows(s).filter(x=>x.date>=today());
  if(!current.length||current.at(-1).date>=horizonEnd())return;
  const tail=current.at(-1),extra=build(following(tail.date),other(tail.code));
  if(!extra.length)return;
  const ids=planIds(s);
  if(online()){
    const u=await user();const res=await supabase.from('scheduled_workouts').insert(extra.map(r=>({user_id:u.id,plan_workout_id:ids[r.code],scheduled_date:r.date,status:'planned'})));if(res.error)throw res.error;localStorage.removeItem(SNAP);location.reload();
  }else{
    extra.forEach((r,i)=>s.schedule.push({id:`local-extra-${Date.now()}-${i}`,date:r.date,scheduled_date:r.date,code:r.code,plan_workout_id:ids[r.code],status:'planned'}));write(SNAP,s);
  }
}

function installBlockDays(){
  const page=q('#page-calendar');if(!page||q('#block-days-button',page))return;
  const head=q('.page-head>div:last-child',page)||q('.page-head',page);const btn=document.createElement('button');btn.id='block-days-button';btn.className='secondary';btn.textContent='Blocktage';btn.style.marginLeft='8px';head.append(btn);
  let dialog=q('#block-days-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='block-days-dialog';dialog.innerHTML='<div style="padding:18px;min-width:min(88vw,420px)"><div style="display:flex;justify-content:space-between;align-items:center"><div><small>PLANUNG</small><h2 style="margin:.2rem 0">Blocktage</h2></div><button type="button" data-block-close>Schließen</button></div><p style="color:#737973">An diesen Tagen plant die App kein Krafttraining.</p><div style="display:grid;grid-template-columns:1fr auto;gap:8px"><input type="date" data-block-date><button type="button" class="primary" data-block-add>Hinzufügen</button></div><div data-block-list style="display:grid;gap:8px;margin-top:12px"></div></div>';document.body.append(dialog)}
  const render=()=>{const list=q('[data-block-list]',dialog),days=[...blocked()].sort();list.innerHTML=days.length?days.map(d=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 10px;border:1px solid #d8ddd8;border-radius:12px"><span>${d}</span><button type="button" data-block-remove="${d}">Entfernen</button></div>`).join(''):'<small>Noch keine Blocktage.</small>';q('[data-block-remove]',dialog)?.focus?.({preventScroll:true});dialog.querySelectorAll('[data-block-remove]').forEach(b=>b.onclick=()=>{write(BLOCKED,[...blocked()].filter(d=>d!==b.dataset.blockRemove));localStorage.removeItem(NORMALIZED);render()})};
  btn.onclick=()=>{render();dialog.showModal()};q('[data-block-close]',dialog).onclick=()=>dialog.close();q('[data-block-add]',dialog).onclick=()=>{const value=q('[data-block-date]',dialog).value;if(!value)return;const set=blocked();set.add(value);write(BLOCKED,[...set]);localStorage.removeItem(NORMALIZED);render()};
}

function install(){installBlockDays();setTimeout(()=>normalizeAndExtend().catch(e=>console.error('[GYM schedule]',e)),900)}
window.addEventListener('pageshow',()=>setTimeout(()=>normalizeAndExtend().catch(()=>{}),600));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>normalizeAndExtend().catch(()=>{}),600)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
