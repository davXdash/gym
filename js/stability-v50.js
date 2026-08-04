import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const HISTORY='gym-tracking-history-v18';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const fmtNum=v=>v==null?'–':Number(v).toLocaleString('de-DE',{maximumFractionDigits:2});
const fmtDate=v=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${v}T12:00:00`));

function installCss(){
 if($('#stability-v50-style'))return;
 const style=document.createElement('style');style.id='stability-v50-style';style.textContent=`
 .calendar-day.completed-v50{background:var(--accent,#4f745d)!important;color:#fff!important}
 .calendar-day.completed-v50 .plan-badge{color:inherit!important}
 .exercise-progress-v30{display:flex!important;gap:8px!important;overflow-x:auto!important;padding:4px 2px 10px!important;scrollbar-width:none}
 .exercise-progress-v30::-webkit-scrollbar{display:none}
 .exercise-progress-v30 button{flex:0 0 auto!important;width:auto!important;min-width:82px!important;height:auto!important;min-height:52px!important;padding:7px 10px!important;border-radius:16px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;text-align:left!important}
 .exercise-progress-v30 button strong{font-size:.82rem;line-height:1}
 .exercise-progress-v30 button small{display:block;max-width:128px;font-size:.68rem;line-height:1.15;margin-top:4px;white-space:normal}
 .topbar-status{display:none!important}
 .status-line.status-dashboard-v50{display:flex!important;position:static!important;margin:10px 24px 0!important;gap:8px!important;background:transparent!important;border:0!important;padding:0!important;min-height:36px!important}
 .status-line.status-dashboard-v50 #connection-status,.status-line.status-dashboard-v50 #sync-count{display:none!important}
 .status-line.status-dashboard-v50 #sync-now.is-idle-v50{display:none!important}
 #history-v50{width:min(94vw,650px);max-height:90dvh;border:0;border-radius:24px;padding:0;background:var(--surface,#fff);color:var(--text,#172019)}
 #history-v50::backdrop{background:rgba(8,14,10,.58)}
 #history-v50 .history-body{padding:16px;max-height:calc(90dvh - 84px);overflow:auto;-webkit-overflow-scrolling:touch}
 #history-v50 article{border:1px solid var(--line,#dce1dd);border-radius:18px;padding:14px;margin:0 0 12px;background:var(--surface-2,#f5f7f5)}
 #history-v50 article h3{margin:0 0 4px}
 #history-v50 .set-v50{display:grid;grid-template-columns:50px 1fr 1fr 1fr;gap:8px;padding:8px 0;border-top:1px solid var(--line,#dce1dd);font-size:.9rem}
 html[data-theme="dark"] #history-v50{background:#171b18;color:#f5f7f5}
 html[data-theme="dark"] #history-v50 article{background:#242a25;border-color:#39423b}
 `;document.head.append(style);
}

function stableStatus(){
 const dashboard=$('#page-dashboard'),line=$('.status-line');if(!dashboard||!line)return;
 line.classList.add('status-dashboard-v50');
 const errors=$('#error-stack');if(errors&&line.previousElementSibling!==errors)errors.insertAdjacentElement('afterend',line);
 const pending=(read('gym-queue-v11',[])||[]).length+(localStorage.getItem('gym-tracking-pending-v18')?1:0);
 const sync=$('#sync-now');if(sync){sync.textContent=pending?`Sync (${pending})`:'Sync';sync.classList.toggle('is-idle-v50',pending===0)}
 const off=$('#offline-toggle');if(off)off.textContent=localStorage.getItem('gym-offline-v11')==='1'?'Offline beenden':'Offline';
}

function markCompletedDays(){
 $$('.calendar-day.completed').forEach(day=>{day.classList.remove('completed');day.classList.add('completed-v50')});
}

function ensureHistoryDialog(){
 let d=$('#history-v50');if(d)return d;
 d=document.createElement('dialog');d.id='history-v50';d.innerHTML='<div class="dialog-head"><div><small>TRAININGSHISTORIE</small><h2 id="history-v50-title">Training</h2></div><button type="button" class="dialog-close">Schließen</button></div><div class="history-body" id="history-v50-body"></div>';
 document.body.append(d);d.querySelector('.dialog-close').onclick=()=>d.close();return d;
}

async function session(){const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Bitte neu anmelden.');return data.session}

async function loadHistory(date){
 const s=await session();
 const wr=await supabase.from('workouts').select('id,workout_date,status,plan_workout_id,elapsed_seconds').eq('user_id',s.user.id).eq('workout_date',date).in('status',['completed','partial']).order('created_at',{ascending:false}).limit(1);
 if(wr.error)throw wr.error;const workout=wr.data?.[0];if(!workout)throw new Error('Für diesen Tag wurde kein Training gefunden.');
 const we=await supabase.from('workout_exercises').select('id,exercise_order,status,exercise_id').eq('workout_id',workout.id).order('exercise_order');if(we.error)throw we.error;
 const exIds=[...new Set((we.data||[]).map(x=>x.exercise_id).filter(Boolean))];
 const ex=exIds.length?await supabase.from('exercises').select('id,name').in('id',exIds):{data:[],error:null};if(ex.error)throw ex.error;
 const names=Object.fromEntries((ex.data||[]).map(x=>[x.id,x.name]));const ids=(we.data||[]).map(x=>x.id);
 const sets=ids.length?await supabase.from('workout_sets').select('workout_exercise_id,set_number,weight_kg,repetitions,rir,notes').in('workout_exercise_id',ids).order('set_number'):{data:[],error:null};if(sets.error)throw sets.error;
 return {...workout,exercises:(we.data||[]).map(x=>({...x,name:names[x.exercise_id]||`Übung ${x.exercise_order}`,sets:(sets.data||[]).filter(s=>s.workout_exercise_id===x.id)}))};
}

function historyHtml(row){
 const code=read(SNAP,{completed:[]}).completed?.find(x=>x.date===row.workout_date)?.code||'';
 const cards=row.exercises.length?row.exercises.map(ex=>`<article><h3>${ex.exercise_order}. ${ex.name}</h3><p>${ex.status==='completed'?'Erledigt':ex.status==='skipped'?'Ausgelassen':'Teilweise'}</p>${ex.sets.length?ex.sets.map(s=>`<div class="set-v50"><span>Satz ${s.set_number}</span><strong>${fmtNum(s.weight_kg)} kg</strong><span>${s.repetitions??'–'} Wdh.</span><span>${s.notes==='warmup'?'Warm-up':s.rir==null?'':`RIR ${s.rir}`}</span></div>`).join(''):'<p>Keine Satzwerte gespeichert.</p>'}</article>`).join(''):'<p>Es wurden keine Übungsdaten gespeichert.</p>';
 return `<p><strong>Training ${code}</strong> · ${fmtDate(row.workout_date)}</p>${cards}<button type="button" class="secondary" id="history-v50-close-bottom">Schließen</button>`;
}

async function openHistory(date){
 const d=ensureHistoryDialog(),body=$('#history-v50-body');body.innerHTML='<p>Daten werden geladen …</p>';d.showModal();
 try{const row=await loadHistory(date);$('#history-v50-title').textContent=`Training ${read(SNAP,{completed:[]}).completed?.find(x=>x.date===date)?.code||''}`;body.innerHTML=historyHtml(row);$('#history-v50-close-bottom').onclick=()=>d.close()}catch(e){body.innerHTML=`<article><h3>Training konnte nicht geladen werden</h3><p>${e.message}</p></article>`}
}

async function hydrateExactDeviceHistory(){
 try{
  const s=await session();const wr=await supabase.from('workouts').select('id,workout_date').eq('user_id',s.user.id).in('status',['completed','partial']).order('workout_date',{ascending:false}).limit(20);if(wr.error||!wr.data?.length)return;
  const dateMap=Object.fromEntries(wr.data.map(x=>[x.id,x.workout_date]));const we=await supabase.from('workout_exercises').select('id,workout_id,exercise_id').in('workout_id',wr.data.map(x=>x.id));if(we.error||!we.data?.length)return;
  const exIds=[...new Set(we.data.map(x=>x.exercise_id).filter(Boolean))];const ex=await supabase.from('exercises').select('id,name').in('id',exIds);if(ex.error)return;const names=Object.fromEntries(ex.data.map(x=>[x.id,x.name]));
  const sets=await supabase.from('workout_sets').select('workout_exercise_id,set_number,weight_kg,repetitions,rir,notes').in('workout_exercise_id',we.data.map(x=>x.id)).order('set_number');if(sets.error)return;
  const exact={};for(const w of we.data){const name=names[w.exercise_id];if(!name||exact[name])continue;const rows=sets.data.filter(x=>x.workout_exercise_id===w.id).map(x=>({weight:x.weight_kg??'',reps:x.repetitions??'',rir:x.rir??'',warmup:x.notes==='warmup'}));if(rows.length)exact[name]={date:dateMap[w.workout_id],sets:rows}}
  write(HISTORY,exact);
 }catch{}
}

function refreshVariantCard(card){
 const name=$('[data-name]',card)?.textContent.trim();if(!name)return;const row=read(HISTORY,{})[name];
 const fmt=sets=>(sets||[]).filter(x=>!x.warmup).map(x=>`${fmtNum(x.weight)} kg × ${x.reps||0}`).join(' · ')||'Noch keine Daten an diesem Gerät.';
 const device=$('[data-last-device]',card);if(device)device.textContent=fmt(row?.sets);
 const old=$('.coach-v31',card);if(old)old.remove();
 setTimeout(()=>document.dispatchEvent(new CustomEvent('gym:variant-changed',{detail:{card}})),0);
}

function labelExerciseSteps(){
 const cards=$$('#exercise-list .exercise-card[data-v18]'),buttons=$$('.exercise-progress-v30 [data-jump-v30]');
 buttons.forEach((button,i)=>{const name=$('h3',cards[i])?.textContent.trim()||`Übung ${i+1}`;const state=button.classList.contains('done')?'✓':button.classList.contains('skipped')?'–':String(i+1);button.innerHTML=`<strong>${state}</strong><small>${name}</small>`});
}

function ensureMenu(){
 const nav=$('#drawer nav');if(nav&&!nav.querySelector('[data-page="studio"]')){const settings=nav.querySelector('[data-page="settings"]'),b=document.createElement('button');b.dataset.page='studio';b.textContent='Studio';settings?.before(b)}
 const label=$('.drawer-head small');if(label)label.textContent='TRAININGSPLAN';
}

function maintain(){installCss();stableStatus();markCompletedDays();labelExerciseSteps();ensureMenu()}

document.addEventListener('click',e=>{
 const day=e.target.closest('.calendar-day.completed-v50');if(day){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openHistory(day.dataset.date);return}
 const variant=e.target.closest('[data-prev],[data-next]');if(variant){const card=variant.closest('.exercise-card');setTimeout(()=>{refreshVariantCard(card);labelExerciseSteps()},80)}
 if(e.target.closest('[data-workout],#start-workout,[data-page="plan"]'))setTimeout(()=>{labelExerciseSteps();hydrateExactDeviceHistory().then(()=>$$('#exercise-list .exercise-card').forEach(refreshVariantCard))},180);
},true);

window.addEventListener('load',()=>{maintain();hydrateExactDeviceHistory();setTimeout(maintain,600)});
window.addEventListener('online',stableStatus);window.addEventListener('offline',stableStatus);
new MutationObserver(()=>requestAnimationFrame(maintain)).observe(document.documentElement,{subtree:true,childList:true});
