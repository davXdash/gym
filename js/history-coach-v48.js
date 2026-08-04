import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const HISTORY='gym-tracking-history-v18';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const fmtDate=v=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${v}T12:00:00`));
const fmtNum=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2});

function ensureStyles(){
 if($('#history-v48-style'))return;
 const style=document.createElement('style');style.id='history-v48-style';style.textContent=`
 #history-dialog-v48{width:min(94vw,620px);max-height:88dvh;border:0;border-radius:24px;padding:0;background:var(--surface,#fff);color:var(--text,#172019)}
 #history-dialog-v48::backdrop{background:rgba(10,18,13,.55)}
 #history-dialog-v48 .history-body{padding:16px;overflow:auto;max-height:calc(88dvh - 88px);-webkit-overflow-scrolling:touch}
 #history-dialog-v48 .history-exercise{border:1px solid var(--line,#dce1dd);border-radius:18px;padding:14px;margin-bottom:12px;background:var(--surface-2,#f5f7f5)}
 #history-dialog-v48 .history-exercise h3{margin:0 0 4px;font-size:1.05rem}
 #history-dialog-v48 .history-exercise>p{margin:0 0 10px;color:var(--muted,#68716b)}
 #history-dialog-v48 .history-set{display:grid;grid-template-columns:52px 1fr 1fr 1fr;gap:8px;padding:8px 0;border-top:1px solid var(--line,#dce1dd);font-size:.92rem}
 #history-dialog-v48 .history-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
 .history-open-v48{margin-top:10px;width:100%}
 #workout-dialog[open]{overflow:hidden!important}
 #workout-dialog #exercise-list{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important}
 html[data-theme="dark"] #history-dialog-v48{background:#171b18;color:#f4f6f4}
 html[data-theme="dark"] #history-dialog-v48 .history-exercise{background:#242a25;border-color:#39423b}
 `;document.head.append(style);
}

function ensureDialog(){
 let d=$('#history-dialog-v48');if(d)return d;
 d=document.createElement('dialog');d.id='history-dialog-v48';
 d.innerHTML='<div class="dialog-head"><div><small>TRAININGSHISTORIE</small><h2 id="history-title-v48">Training</h2></div><button type="button" class="dialog-close" id="history-close-v48">Schließen</button></div><div class="history-body" id="history-body-v48"></div>';
 document.body.append(d);$('#history-close-v48').onclick=()=>d.close();return d;
}

async function getSession(){const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Bitte neu anmelden.');return data.session}

async function loadWorkout(date,code=null){
 const session=await getSession();
 let q=supabase.from('workouts').select('id,workout_date,status,plan_workout_id,started_at,finished_at,elapsed_seconds').eq('user_id',session.user.id).eq('workout_date',date).in('status',['completed','partial']).order('created_at',{ascending:false}).limit(1);
 const wr=await q;if(wr.error)throw wr.error;const workout=wr.data?.[0];if(!workout)throw new Error(`Für ${fmtDate(date)} wurde kein gespeichertes Training gefunden.`);
 const we=await supabase.from('workout_exercises').select('id,exercise_order,status,exercise_id,plan_exercise_id').eq('workout_id',workout.id).order('exercise_order');if(we.error)throw we.error;
 const exerciseIds=[...new Set((we.data||[]).map(x=>x.exercise_id).filter(Boolean))];
 const names=exerciseIds.length?await supabase.from('exercises').select('id,name').in('id',exerciseIds):{data:[],error:null};if(names.error)throw names.error;
 const nameMap=Object.fromEntries((names.data||[]).map(x=>[x.id,x.name]));
 const weIds=(we.data||[]).map(x=>x.id);
 const sets=weIds.length?await supabase.from('workout_sets').select('id,workout_exercise_id,set_number,weight_kg,repetitions,rir,completed,notes').in('workout_exercise_id',weIds).order('set_number'):{data:[],error:null};if(sets.error)throw sets.error;
 const exercises=(we.data||[]).map(x=>({
   ...x,
   name:nameMap[x.exercise_id]||`Übung ${x.exercise_order}`,
   sets:(sets.data||[]).filter(s=>s.workout_exercise_id===x.id)
 }));
 return {...workout,code,exercises};
}

function historyMarkup(row){
 const duration=row.elapsed_seconds?`${Math.floor(row.elapsed_seconds/60)} Min.`:'keine Zeit gespeichert';
 const exercises=row.exercises.length?row.exercises.map(ex=>{
   const setRows=ex.sets.length?ex.sets.map(s=>`<div class="history-set"><span>Satz ${s.set_number}</span><strong>${s.weight_kg==null?'–':`${fmtNum(s.weight_kg)} kg`}</strong><span>${s.repetitions==null?'–':`${s.repetitions} Wdh.`}</span><span>${s.notes==='warmup'?'Warm-up':s.rir==null?'':`RIR ${s.rir}`}</span></div>`).join(''):'<p>Keine Satzwerte gespeichert.</p>';
   return `<article class="history-exercise"><h3>${ex.exercise_order}. ${ex.name}</h3><p>${ex.status==='completed'?'Erledigt':ex.status==='skipped'?'Ausgelassen':'Teilweise / offen'}</p>${setRows}</article>`;
 }).join(''):'<p>Für dieses Training sind noch keine Übungs- oder Satzdaten gespeichert.</p>';
 return `<p><strong>${fmtDate(row.workout_date)}</strong> · ${row.status==='completed'?'abgeschlossen':'teilweise abgeschlossen'} · ${duration}</p>${exercises}<div class="history-actions"><button type="button" class="secondary" id="history-edit-v48">Training bearbeiten</button><button type="button" class="secondary" id="history-close-bottom-v48">Schließen</button></div>`;
}

async function openHistory(date,code=null){
 ensureStyles();const dialog=ensureDialog(),body=$('#history-body-v48');$('#history-title-v48').textContent=code?`Training ${code}`:'Gespeichertes Training';body.innerHTML='<p>Daten werden geladen …</p>';dialog.showModal();
 try{const row=await loadWorkout(date,code);body.innerHTML=historyMarkup(row);$('#history-close-bottom-v48').onclick=()=>dialog.close();$('#history-edit-v48').onclick=()=>{dialog.close();openEditable(row)}}catch(e){body.innerHTML=`<article class="error-banner"><strong>Training konnte nicht geladen werden</strong><p>${e.message}</p></article>`}
}

function openEditable(row){
 const snapshot=read(SNAP,{workouts:{}});const code=row.code||Object.values(snapshot.workouts||{}).find(w=>w.id===row.plan_workout_id)?.code;if(!code)return alert('Die Einheit A/B konnte nicht zugeordnet werden.');
 const history=read(HISTORY,{});row.exercises.forEach(ex=>{history[ex.name]={date:row.workout_date,sets:ex.sets.map(s=>({weight:s.weight_kg??'',reps:s.repetitions??'',rir:s.rir??'',warmup:s.notes==='warmup'}))}});write(HISTORY,history);
 document.querySelector(`[data-workout="${code}"]`)?.click();setTimeout(()=>{const dlg=$('#workout-dialog');if(dlg&&!dlg.open)dlg.showModal()},100);
}

async function hydrateCoach(){
 try{
  const session=await getSession();
  const wr=await supabase.from('workouts').select('id,workout_date').eq('user_id',session.user.id).in('status',['completed','partial']).order('workout_date',{ascending:false}).limit(10);if(wr.error||!wr.data?.length)return;
  const ids=wr.data.map(x=>x.id),dateMap=Object.fromEntries(wr.data.map(x=>[x.id,x.workout_date]));
  const we=await supabase.from('workout_exercises').select('id,workout_id,exercise_id').in('workout_id',ids);if(we.error||!we.data?.length)return;
  const exIds=[...new Set(we.data.map(x=>x.exercise_id).filter(Boolean))];const names=await supabase.from('exercises').select('id,name').in('id',exIds);if(names.error)return;const nameMap=Object.fromEntries(names.data.map(x=>[x.id,x.name]));
  const setRows=await supabase.from('workout_sets').select('workout_exercise_id,set_number,weight_kg,repetitions,rir,notes').in('workout_exercise_id',we.data.map(x=>x.id)).order('set_number');if(setRows.error)return;
  const latest={};
  for(const item of we.data){const name=nameMap[item.exercise_id];if(!name||latest[name])continue;const sets=setRows.data.filter(s=>s.workout_exercise_id===item.id).map(s=>({weight:s.weight_kg??'',reps:s.repetitions??'',rir:s.rir??'',warmup:s.notes==='warmup'}));if(sets.length)latest[name]={date:dateMap[item.workout_id],sets}}
  write(HISTORY,{...read(HISTORY,{}),...latest});
 }catch{}
}

function addPlanHistoryButtons(){
 const snapshot=read(SNAP,{completed:[]});
 $$('#workout-list .workout-card').forEach(card=>{
   const code=card.querySelector('[data-workout]')?.dataset.workout||card.querySelector('small')?.textContent.match(/[AB]/)?.[0];if(!code||card.querySelector('.history-open-v48'))return;
   const latest=(snapshot.completed||[]).filter(x=>x.code===code).sort((a,b)=>b.date.localeCompare(a.date))[0];
   const b=document.createElement('button');b.type='button';b.className='secondary history-open-v48';b.textContent=latest?`Letztes Training ${code} ansehen`:`Noch kein Training ${code}`;b.disabled=!latest;if(latest)b.onclick=()=>openHistory(latest.date,code);card.append(b);
 });
}

function removeTestLanguage(){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){if(/Testeintrag vollständig löschen/i.test(n.nodeValue||''))n.nodeValue='Training dauerhaft löschen';}
}

document.addEventListener('click',e=>{
 const day=e.target.closest('#page-calendar .calendar-day.completed,#page-dashboard .calendar-day.completed');if(day){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const code=day.querySelector('.plan-badge')?.textContent.trim().charAt(0)||null;openHistory(day.dataset.date,code);return}
 if(e.target.closest('[data-page="plan"]'))setTimeout(addPlanHistoryButtons,80);
},true);

window.addEventListener('load',()=>{ensureStyles();hydrateCoach().then(()=>{addPlanHistoryButtons();removeTestLanguage()});setTimeout(()=>{addPlanHistoryButtons();removeTestLanguage()},800)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')hydrateCoach()});
