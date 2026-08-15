import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const OFF='gym-offline-v11';
const BLOCKED='gym-schedule-blocked-days';
const NORMALIZED='gym-schedule-clean-v1';
const ACTIVE=new Set(['planned','confirmed','started']);
const HORIZON_DAYS=32;
const SUMMER_END='2026-09-01';

const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const pd=v=>new Date(`${v}T12:00:00`);
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const add=(v,n)=>{const d=pd(v);d.setDate(d.getDate()+n);return iso(d)};
const other=c=>c==='A'?'B':'A';
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';
const blocked=()=>new Set(read(BLOCKED,[]));

function completed(snapshot){
  return [...(snapshot.completed||[])].filter(x=>x.code==='A'||x.code==='B').sort((a,b)=>a.date.localeCompare(b.date));
}
function expectedCode(snapshot){
  const done=completed(snapshot);
  return done.length?other(done.at(-1).code):'A';
}
function activeRows(snapshot){
  const done=new Set((snapshot.completed||[]).filter(x=>x.code).map(x=>`${x.date}|${x.code}`));
  return (snapshot.schedule||[]).filter(x=>ACTIVE.has(x.status)&&(x.code==='A'||x.code==='B')&&!done.has(`${x.date}|${x.code}`)).sort((a,b)=>a.date.localeCompare(b.date));
}
function missedRow(snapshot){
  const expected=expectedCode(snapshot),rows=activeRows(snapshot).filter(x=>x.date<today());
  return rows.find(x=>x.code===expected)||rows[0]||null;
}
function avoidDate(date){
  let out=date,b=blocked();
  for(let guard=0;guard<14;guard++){
    const monday=out>SUMMER_END&&pd(out).getDay()===1;
    if(!monday&&!b.has(out))return out;
    out=add(out,1);
  }
  return out;
}
function following(date){return avoidDate(add(date,2))}
function build(anchorDate,anchorCode){
  const rows=[],end=add(today(),HORIZON_DAYS);let date=avoidDate(anchorDate),code=anchorCode;
  while(date<=end&&rows.length<40){rows.push({date,code});date=following(date);code=other(code)}
  return rows;
}
function planIds(snapshot){return Object.fromEntries(Object.values(snapshot.workouts||{}).map(w=>[w.code,w.id]))}
function localApply(snapshot,missed,rotation){
  const t=today(),ids=planIds(snapshot);
  snapshot.schedule=(snapshot.schedule||[]).filter(row=>{
    if(missed&&String(row.id)===String(missed.id))return false;
    if(missed&&row.date===missed.date&&row.code===missed.code)return false;
    if(row.date>=t&&ACTIVE.has(row.status))return false;
    return true;
  });
  rotation.forEach((r,i)=>snapshot.schedule.push({id:`local-reschedule-${Date.now()}-${i}`,date:r.date,scheduled_date:r.date,code:r.code,plan_workout_id:ids[r.code],status:'planned'}));
  snapshot.schedule.sort((a,b)=>a.date.localeCompare(b.date));
  write(SNAP,snapshot);
}

async function persist(snapshot,missed,rotation){
  const ids=planIds(snapshot);
  if(!ids.A||!ids.B)throw new Error('Trainingsplan A/B fehlt.');
  if(!online()){
    localApply(snapshot,missed,rotation);
    return;
  }
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session)throw error||new Error('Bitte neu anmelden.');
  const uid=session.user.id;
  if(missed?.id){
    const delMissed=await supabase.from('scheduled_workouts').delete().eq('user_id',uid).eq('id',missed.id);
    if(delMissed.error)throw delMissed.error;
  }else if(missed?.date){
    const delMissed=await supabase.from('scheduled_workouts').delete().eq('user_id',uid).eq('scheduled_date',missed.date);
    if(delMissed.error)throw delMissed.error;
  }
  const delFuture=await supabase.from('scheduled_workouts').delete().eq('user_id',uid).gte('scheduled_date',today()).in('status',[...ACTIVE]);
  if(delFuture.error)throw delFuture.error;
  if(rotation.length){
    const ins=await supabase.from('scheduled_workouts').insert(rotation.map(r=>({user_id:uid,plan_workout_id:ids[r.code],scheduled_date:r.date,status:'planned'})));
    if(ins.error)throw ins.error;
  }
  localApply(snapshot,missed,rotation);
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('#missed-clean [data-missed-save]');
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const dialog=document.querySelector('#missed-clean');
  const input=dialog?.querySelector('[data-missed-date]');
  const status=dialog?.querySelector('[data-missed-status]');
  const value=input?.value||'';
  if(!value||value<today()){
    if(status)status.textContent='Bitte heute oder ein zukünftiges Datum wählen.';
    return;
  }
  const snapshot=read(SNAP,{workouts:{},schedule:[],completed:[]});
  const missed=missedRow(snapshot);
  const code=missed?.code||expectedCode(snapshot);
  const rotation=build(value,code);
  if(status)status.textContent='Kalender wird angepasst …';
  button.disabled=true;
  try{
    await persist(snapshot,missed,rotation);
    localStorage.setItem(NORMALIZED,'1');
    dialog?.close();
    window.dispatchEvent(new CustomEvent('gym:schedule-refresh'));
  }catch(error){
    console.error('[GYM missed reschedule]',error);
    if(status)status.textContent=error?.message||String(error);
  }finally{
    button.disabled=false;
  }
},true);
