import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const SNAP='gym-snapshot-v11';
const ACTIVE_STATUSES=new Set(['planned','confirmed','started']);
const canon=v=>String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const atNoon=s=>new Date(`${s}T12:00:00`);
const fmtDate=s=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Europe/Berlin'}).format(atNoon(s));
const addDays=(s,n)=>{const d=atNoon(s);d.setDate(d.getDate()+n);return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d)};
let timer=null,recoveryBusy=false;

function snap(){return read(SNAP,{plan:{},workouts:{},schedule:[],completed:[]})}
function completedKeySet(s){return new Set((s.completed||[]).map(x=>`${x.date}|${x.code}`))}
function openSchedule(s){return (s.schedule||[]).filter(x=>ACTIVE_STATUSES.has(x.status)).sort((a,b)=>a.date.localeCompare(b.date))}
function unresolvedMissed(s=snap()){
  const done=completedKeySet(s),today=day();
  return openSchedule(s).filter(x=>x.date<today&&!done.has(`${x.date}|${x.code}`));
}
function lastCompletedCode(s=snap()){
  const rows=[...(s.completed||[])].sort((a,b)=>a.date.localeCompare(b.date));
  return rows.at(-1)?.code||null;
}
function expectedCode(s=snap()){
  const missed=unresolvedMissed(s);
  if(missed.length)return missed[0].code;
  const last=lastCompletedCode(s);
  if(last==='A')return'B';if(last==='B')return'A';
  return openSchedule(s).find(x=>x.date>=day())?.code||'A';
}
function effectiveNext(s=snap()){
  const missed=unresolvedMissed(s);
  if(missed.length)return {...missed[0],missed:true};
  const expected=expectedCode(s),future=openSchedule(s).filter(x=>x.date>=day());
  const exact=future.find(x=>x.code===expected)||future[0];
  return exact?{...exact,code:expected,missed:false}:null;
}

function fixHero(){
  const next=effectiveNext();
  const title=$('#next-workout'),date=$('#next-date'),start=$('#start-workout'),hero=title?.closest('.hero'),label=$('small',hero);
  if(!title||!date||!start)return;
  if(!next){if(label)label.textContent='Als Nächstes';title.textContent='Training planen';date.textContent='';return;}
  if(label)label.textContent=next.missed?'Nachholen':next.date===day()?'Heute':'Als Nächstes';
  title.textContent=`Training ${next.code}`;
  date.textContent=next.missed?`Geplant: ${fmtDate(next.date)}`:next.date===day()?`Heute · ${fmtDate(next.date)}`:fmtDate(next.date);
  start.dataset.workout=next.code;start.dataset.date=next.date;
}

function openCorrectWorkout(event){
  const start=event.target.closest('#start-workout');if(!start)return;
  const next=effectiveNext();if(!next)return;
  const planButton=$(`#workout-list [data-workout="${next.code}"]`);if(!planButton)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  planButton.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}

function fixDock(){
  const d=$('#workout-dialog');if(!d?.open)return;
  const dock=$('.v61-dock',d)||$('.mobile-workout-dock',d)||$('.workout-nav-v53',d);if(!dock)return;
  const prev=$('[data-prev-ex-v53]',dock),next=$('[data-next-ex-v53]',dock),mid=$('.v61-list,[data-overview-v53]',dock);
  if(prev)prev.textContent='‹ Vorherige';
  if(next)next.textContent='Nächste ›';
  if(mid){mid.textContent='☷';mid.setAttribute('aria-label','Übungsübersicht');}
  $$('*',dock).forEach(el=>{if(el.children.length===0&&el.textContent?.trim()==='null')el.textContent='';});
}

function fixButterfly(){
  const d=$('#workout-dialog');if(!d?.open)return;
  const imgPath='pics_johnreed/IMG_3452.jpeg';
  const candidates=$$('.device-history-v55 button,.v61-variants button,[data-device-index-v55],.variant-card-v53,.device-card-v53',d);
  candidates.forEach(el=>{
    const name=$('strong',el)?.textContent||el.getAttribute('aria-label')||'';const key=canon(name);
    if(key==='butterfly mit pads'){el.hidden=true;el.style.display='none';return;}
    if(key==='butterfly mit griffen'){const img=$('img',el);if(img){img.src=imgPath;img.hidden=false;}}
  });
  $$('strong',d).forEach(strong=>{
    if(canon(strong.textContent)!=='butterfly mit pads')return;
    const card=strong.closest('button,.variant-card-v53,.device-card-v53');if(card){card.hidden=true;card.style.display='none';}
  });
  const card=$('.training-exercise-v53',d),current=canon($('.device-nav-v53 strong',card)?.textContent||'');
  if(current==='butterfly mit griffen'){const img=$('.device-image-v53 img',card);if(img){img.src=imgPath;img.hidden=false;}}
}

async function recoverJwt(){
  if(recoveryBusy)return;
  const banner=$$('.error-banner').find(x=>/JWT issued at future/i.test(x.textContent||''));if(!banner)return;
  const last=Number(sessionStorage.getItem('gym-jwt-recovery-v66')||0);if(Date.now()-last<120000)return;
  recoveryBusy=true;sessionStorage.setItem('gym-jwt-recovery-v66',String(Date.now()));
  try{
    const r=await supabase.auth.refreshSession();
    if(r.error)throw r.error;
    localStorage.removeItem(SNAP);banner.remove();
    const u=new URL(location.href);u.searchParams.set('sessionfix',Date.now());location.replace(u.toString());
  }catch(error){
    banner.querySelector('p').textContent='Anmeldung wird neu aufgebaut …';
    try{await supabase.auth.signOut({scope:'local'})}catch{}
    setTimeout(()=>location.reload(),250);
  }finally{recoveryBusy=false}
}

function ensureRecoveryDialog(){
  const s=snap(),missed=unresolvedMissed(s)[0];
  if(!missed)return;
  const dismissKey=`gym-missed-dismissed-${missed.id||missed.date}`;
  if(sessionStorage.getItem(dismissKey)==='1'||$('#missed-workout-dialog-v66'))return;
  const dialog=document.createElement('dialog');dialog.id='missed-workout-dialog-v66';dialog.className='missed-v66';
  const tomorrow=addDays(day(),1);
  dialog.innerHTML=`<div class="missed-v66-head"><div><small>TRAINING VERPASST</small><h2>Training ${missed.code} vom ${fmtDate(missed.date)}</h2></div><button type="button" data-close>×</button></div><p class="missed-v66-intro">Für diesen geplanten Termin ist kein abgeschlossenes Training gespeichert.</p><div class="missed-v66-question"><strong>Hast du das Training trotzdem durchgeführt?</strong><div class="missed-v66-actions"><button type="button" data-did="yes">Ja, durchgeführt</button><button type="button" data-did="no" class="primary">Nein</button></div></div><div data-reschedule hidden><strong>Wann trainierst du als Nächstes?</strong><div class="missed-v66-quick"><button type="button" data-date="${day()}">Heute</button><button type="button" data-date="${tomorrow}">Morgen</button></div><label>Datum<input type="date" data-next-date min="${day()}" value="${tomorrow}"></label><fieldset><legend>Was soll mit den folgenden Trainingstagen passieren?</legend><label><input type="radio" name="missed-mode" value="keep" checked> Bestehende Termine behalten, A/B-Folge korrigieren</label><label><input type="radio" name="missed-mode" value="shift"> Alle folgenden Termine um denselben Abstand verschieben</label></fieldset><button type="button" class="primary missed-v66-save" data-save>Plan aktualisieren</button><p data-status></p></div>`;
  document.body.append(dialog);
  const res=$('[data-reschedule]',dialog),input=$('[data-next-date]',dialog),status=$('[data-status]',dialog);
  $('[data-close]',dialog).onclick=()=>{sessionStorage.setItem(dismissKey,'1');dialog.close()};
  $('[data-did="no"]',dialog).onclick=()=>{res.hidden=false;input.focus()};
  $$('[data-date]',dialog).forEach(b=>b.onclick=()=>{res.hidden=false;input.value=b.dataset.date});
  $('[data-did="yes"]',dialog).onclick=async()=>{
    status.textContent='Training wird nachgetragen …';
    try{await markMissedPerformed(missed,s);dialog.close();localStorage.removeItem(SNAP);location.reload()}catch(e){status.textContent=e.message||String(e)}
  };
  $('[data-save]',dialog).onclick=async()=>{
    const target=input.value,mode=$('input[name="missed-mode"]:checked',dialog)?.value||'keep';
    if(!target)return status.textContent='Bitte Datum auswählen.';
    status.textContent='Kalender wird angepasst …';
    try{await rescheduleMissed(missed,target,mode,s);dialog.close();localStorage.removeItem(SNAP);location.reload()}catch(e){status.textContent=e.message||String(e)}
  };
  dialog.showModal();
}

async function authUser(){
  const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Bitte neu anmelden.');return data.session.user;
}
async function markMissedPerformed(missed,s){
  const user=await authUser(),w=s.workouts?.[missed.code];if(!w)throw new Error('Trainingseinheit nicht gefunden.');
  const existing=(s.completed||[]).some(x=>x.date===missed.date&&x.code===missed.code);
  if(!existing){const r=await supabase.from('workouts').insert({user_id:user.id,plan_id:s.plan.id,plan_workout_id:w.id,workout_date:missed.date,started_at:`${missed.date}T12:00:00`,finished_at:`${missed.date}T12:00:00`,elapsed_seconds:0,status:'partial'});if(r.error)throw r.error;}
  const u=await supabase.from('scheduled_workouts').update({status:'completed'}).eq('id',missed.id);if(u.error)throw u.error;
}
async function rescheduleMissed(missed,target,mode,s){
  await authUser();
  const active=openSchedule(s).filter(x=>x.date>=missed.date);
  const workoutId=code=>s.workouts?.[code]?.id;
  if(!workoutId('A')||!workoutId('B'))throw new Error('A/B-Trainingsplan unvollständig.');
  if(mode==='shift'){
    const delta=Math.round((atNoon(target)-atNoon(missed.date))/86400000);
    const rows=active;
    for(let i=0;i<rows.length;i++){const r=await supabase.from('scheduled_workouts').update({scheduled_date:`2098-12-${String(i+1).padStart(2,'0')}`}).eq('id',rows[i].id);if(r.error)throw r.error;}
    for(let i=0;i<rows.length;i++){const r=await supabase.from('scheduled_workouts').update({scheduled_date:addDays(rows[i].date,delta),status:'planned'}).eq('id',rows[i].id);if(r.error)throw r.error;}
    return;
  }
  const before=active.filter(x=>x.date<target),atTarget=active.find(x=>x.date===target),after=active.filter(x=>x.date>target);
  let first=atTarget;
  if(first){for(const row of before){const r=await supabase.from('scheduled_workouts').delete().eq('id',row.id);if(r.error)throw r.error;}}
  else{
    first=missed;
    for(const row of before){if(row.id===missed.id)continue;const r=await supabase.from('scheduled_workouts').delete().eq('id',row.id);if(r.error)throw r.error;}
    const m=await supabase.from('scheduled_workouts').update({scheduled_date:target,status:'planned'}).eq('id',first.id);if(m.error)throw m.error;
  }
  const rows=[first,...after];let code=missed.code;
  for(const row of rows){const r=await supabase.from('scheduled_workouts').update({plan_workout_id:workoutId(code),status:'planned'}).eq('id',row.id);if(r.error)throw r.error;code=code==='A'?'B':'A';}
}

function injectStyles(){if($('#missed-v66-style'))return;const st=document.createElement('style');st.id='missed-v66-style';st.textContent='.missed-v66{width:min(92vw,520px);border:0;border-radius:24px;padding:20px;background:var(--surface,#fff);color:var(--text,#171b18)}.missed-v66::backdrop{background:#1118;backdrop-filter:blur(3px)}.missed-v66-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.missed-v66-head h2{margin:4px 0 0;font-size:1.35rem}.missed-v66-head small{color:var(--muted,#777);letter-spacing:.12em}.missed-v66-head button{width:42px;height:42px;border:1px solid var(--line,#ddd);border-radius:50%;background:transparent;font-size:24px}.missed-v66-intro{color:var(--muted,#777)}.missed-v66-question,.missed-v66 [data-reschedule]{display:grid;gap:12px;margin-top:16px}.missed-v66-actions,.missed-v66-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.missed-v66 button,.missed-v66 input{min-height:46px;border:1px solid var(--line,#ddd);border-radius:13px;background:var(--surface-2,#f4f6f4);color:inherit;padding:0 12px;font-size:16px}.missed-v66 .primary{background:#477357;color:#fff;border-color:#477357;font-weight:800}.missed-v66 label{display:grid;gap:6px}.missed-v66 fieldset{border:1px solid var(--line,#ddd);border-radius:14px;padding:12px}.missed-v66 fieldset label{grid-template-columns:auto 1fr;align-items:start;margin:9px 0}.missed-v66 fieldset input{min-height:auto;width:18px;height:18px}';document.head.append(st)}

function fixAll(){fixHero();fixDock();fixButterfly();recoverJwt();}
function schedule(ms=40){clearTimeout(timer);timer=setTimeout(fixAll,ms)}

document.addEventListener('click',openCorrectWorkout,true);
document.addEventListener('click',e=>{if(e.target.closest('[data-page],[data-page-link],[data-workout],[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-device-index-v55],[data-variant-prev-v53],[data-variant-next-v53]'))schedule(60)},true);
window.addEventListener('load',()=>{injectStyles();schedule(50);setTimeout(fixAll,350);setTimeout(()=>{fixAll();ensureRecoveryDialog()},1100)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){schedule(50);setTimeout(ensureRecoveryDialog,500)}});
new MutationObserver(()=>schedule(50)).observe(document.documentElement,{subtree:true,childList:true,characterData:true});

export {};
