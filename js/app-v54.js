import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const SNAP='gym-snapshot-v11';
const ACTIVE='gym-active-workout-v11';
const DRAFT='gym-v53-draft';
const HISTORY='gym-v53-device-history';
const OFFLINE='gym-offline-v11';
const QUEUE='gym-queue-v11';
const PENDING='gym-v53-pending-sessions';
const CAL_PENDING='gym-v53-calendar-pending';
const STUDIO='gym-studio-profile-v35';
const HISTORY_STAMP='gym-v54-history-stamp';

let retrying=false;
let autofilling=false;
let historyRequest=null;
let catalog=[];

const canonical=value=>String(value||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const meaningful=set=>Boolean(String(set?.weight??'').trim()||String(set?.reps??'').trim()||String(set?.rir??'').trim()||set?.warmup);

function loadCss(){
  const href='css/app-v54.css';
  if(q(`link[href="${href}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=href;document.head.append(link);
}

function snapshot(){return read(SNAP,{workouts:{},schedule:[]})}
function currentCode(){
  const active=read(ACTIVE,null)?.code;
  if(active)return active;
  const title=q('#dialog-title')?.textContent?.match(/\b([AB])\b/)?.[1];
  if(title)return title;
  return snapshot().schedule?.filter(row=>['planned','confirmed','started'].includes(row.status)).sort((a,b)=>a.date.localeCompare(b.date))[0]?.code||null;
}
function exerciseKey(ex,index){return String(ex?.id||ex?.plan_exercise_id||`${index}:${ex?.name||'Übung'}`)}
function findPlanButton(code){return q(`#workout-list [data-workout="${code}"], [data-workout="${code}"]`)}

function ensurePlanButtons(){
  qa('#workout-list .workout-card').forEach(card=>{
    const code=card.querySelector('small')?.textContent.match(/\b([AB])\b/)?.[1];
    const button=card.querySelector('button');
    if(code&&button&&!button.dataset.workout)button.dataset.workout=code;
  });
}

function arrangeTrainingHeader(){
  const dialog=q('#workout-dialog');
  if(!dialog?.open)return;
  const head=q('.dialog-head',dialog),timer=q('.timer-panel',dialog),close=q('#close-dialog',dialog);
  if(!head||!timer||!close)return;
  dialog.classList.add('workout-v53','workout-v54');
  timer.classList.add('timer-header-v54');
  if(timer.parentElement!==head)head.insertBefore(timer,close);
  const toggle=q('#timer-toggle',timer);
  if(toggle){toggle.setAttribute('aria-label','Trainingstimer starten oder pausieren');toggle.title='Trainingstimer starten oder pausieren'}
  ensureAddExerciseButton();
}

function triggerModernRender(code,{force=false}={}){
  const dialog=q('#workout-dialog');
  if(!dialog?.open||!code)return;
  if(q('.training-overview-v53',dialog)&&dialog.classList.contains('workout-v53')){
    arrangeTrainingHeader();
    prefillVisibleExercise();
    return;
  }
  if(retrying&&!force)return;
  const button=findPlanButton(code);
  if(!button)return;
  retrying=true;
  button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  setTimeout(()=>{
    retrying=false;
    arrangeTrainingHeader();
    ensureAddExerciseButton();
    prefillVisibleExercise();
  },260);
}

function scheduleModernRender(code){
  [40,180,420].forEach((delay,index)=>setTimeout(()=>{
    const dialog=q('#workout-dialog');
    if(!dialog?.open)return;
    if(index===2&&!q('.training-overview-v53',dialog))triggerModernRender(code,{force:true});
    else triggerModernRender(code);
  },delay));
}

function historyByName(name){
  const all=read(HISTORY,{}),key=canonical(name);
  return all[name]||Object.entries(all).find(([candidate])=>canonical(candidate)===key)?.[1]||null;
}
function workSets(row){return (row?.sets||[]).filter(set=>!set.warmup&&(String(set.weight??'').trim()||String(set.reps??'').trim()))}
function blankState(state){return !state?.sets?.some(meaningful)}

function expandHistoryAliases(latest){
  const candidates=new Set();
  Object.values(snapshot().workouts||{}).forEach(workout=>(workout.exercises||[]).forEach(ex=>candidates.add(ex.name)));
  const profile=read(STUDIO,read('gym-studio-profile-v32',{devices:{}}));
  Object.keys(profile?.devices||{}).forEach(name=>candidates.add(name));
  const expanded={...latest};
  for(const candidate of candidates){
    const row=Object.entries(latest).find(([name])=>canonical(name)===canonical(candidate))?.[1];
    if(row)expanded[candidate]=row;
  }
  return expanded;
}

function prefillDraftsFromHistory(){
  const snap=snapshot(),allDrafts=read(DRAFT,{}),history=read(HISTORY,{});
  let changed=false;
  for(const [code,workout] of Object.entries(snap.workouts||{})){
    const draft=allDrafts[code]||{};
    (workout.exercises||[]).forEach((ex,index)=>{
      const key=exerciseKey(ex,index),existing=draft[key];
      if(existing&&!blankState(existing))return;
      const row=history[ex.name]||Object.entries(history).find(([name])=>canonical(name)===canonical(ex.name))?.[1];
      const previous=workSets(row);if(!previous.length)return;
      const count=Math.max(Number(ex.target_sets)||3,previous.length);
      draft[key]={
        variantIndex:existing?.variantIndex||0,
        status:existing?.status||'pending',
        sets:Array.from({length:count},(_,setIndex)=>{
          const source=previous[setIndex]||previous.at(-1);
          return {weight:source?.weight??'',reps:source?.reps??'',rir:source?.rir??'',warmup:false};
        })
      };
      changed=true;
    });
    allDrafts[code]=draft;
  }
  if(changed)write(DRAFT,allDrafts);
}

async function hydrateDeviceHistory({force=false}={}){
  if(!navigator.onLine||localStorage.getItem(OFFLINE)==='1')return;
  const last=Number(localStorage.getItem(HISTORY_STAMP)||0);
  if(!force&&Date.now()-last<30_000)return;
  if(historyRequest)return historyRequest;
  historyRequest=(async()=>{
    try{
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError||!session)return;
      const workouts=await supabase.from('workouts').select('id,workout_date').eq('user_id',session.user.id).in('status',['completed','partial']).order('workout_date',{ascending:false}).order('created_at',{ascending:false}).limit(50);
      if(workouts.error||!workouts.data?.length)return;
      const workoutIds=workouts.data.map(row=>row.id),dateMap=Object.fromEntries(workouts.data.map(row=>[row.id,row.workout_date]));
      const workoutOrder=Object.fromEntries(workouts.data.map((row,index)=>[row.id,index]));
      const exercises=await supabase.from('workout_exercises').select('id,workout_id,exercise_id').in('workout_id',workoutIds);
      if(exercises.error||!exercises.data?.length)return;
      const exerciseIds=[...new Set(exercises.data.map(row=>row.exercise_id).filter(Boolean))];
      const names=exerciseIds.length?await supabase.from('exercises').select('id,name').in('id',exerciseIds):{data:[],error:null};
      if(names.error)return;
      const nameMap=Object.fromEntries((names.data||[]).map(row=>[row.id,row.name]));
      const sets=await supabase.from('workout_sets').select('workout_exercise_id,set_number,weight_kg,repetitions,rir,notes').in('workout_exercise_id',exercises.data.map(row=>row.id)).order('set_number');
      if(sets.error)return;
      const latest={};
      const sorted=[...exercises.data].sort((a,b)=>(workoutOrder[a.workout_id]??999)-(workoutOrder[b.workout_id]??999));
      for(const row of sorted){
        const name=nameMap[row.exercise_id];if(!name||latest[name])continue;
        const values=sets.data.filter(set=>set.workout_exercise_id===row.id).map(set=>({weight:set.weight_kg??'',reps:set.repetitions??'',rir:set.rir??'',warmup:set.notes==='warmup'}));
        if(values.some(meaningful))latest[name]={date:dateMap[row.workout_id],sets:values};
      }
      write(HISTORY,expandHistoryAliases(latest));
      localStorage.setItem(HISTORY_STAMP,String(Date.now()));
      prefillDraftsFromHistory();
      refreshOpenTrainingFromHistory();
    }finally{historyRequest=null}
  })();
  return historyRequest;
}

function refreshOpenTrainingFromHistory(){
  const dialog=q('#workout-dialog');if(!dialog?.open||!q('.training-overview-v53',dialog))return;
  const current=q('.overview-item-v53.active',dialog)||q('[data-select-ex-v53]',dialog);
  current?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  setTimeout(()=>{arrangeTrainingHeader();ensureAddExerciseButton();prefillVisibleExercise()},80);
}

function prefillVisibleExercise(){
  const card=q('#workout-dialog.workout-v53 .training-exercise-v53');if(!card)return;
  const name=q('.device-nav-v53 strong',card)?.textContent.trim(),previous=workSets(historyByName(name));
  if(!previous.length)return;
  const rows=qa('.set-row-v53',card);
  autofilling=true;
  try{
    rows.forEach((row,index)=>{
      if(q('[data-field-v53="warmup"]',row)?.checked)return;
      const fields=['weight','reps','rir'],inputs=fields.map(field=>q(`[data-field-v53="${field}"]`,row));
      if(inputs.some(input=>String(input?.value??'').trim()))return;
      const source=previous[index]||previous.at(-1);if(!source)return;
      fields.forEach((field,fieldIndex)=>{
        const input=inputs[fieldIndex],value=source[field];
        if(!input||value===undefined||value===null||value==='')return;
        input.value=String(value);
        input.dispatchEvent(new Event('input',{bubbles:true}));
      });
    });
  }finally{autofilling=false}
}

function propagateEntry(event){
  if(autofilling||!event.isTrusted)return;
  const input=event.target.closest('#workout-dialog.workout-v53 [data-field-v53="weight"],#workout-dialog.workout-v53 [data-field-v53="reps"],#workout-dialog.workout-v53 [data-field-v53="rir"]');
  if(!input)return;
  const row=input.closest('.set-row-v53');
  if(q('[data-field-v53="warmup"]',row)?.checked)return;
  const rows=qa('.set-row-v53',input.closest('.sets-v53')),index=rows.indexOf(row),field=input.dataset.fieldV53;
  autofilling=true;
  try{
    for(let next=index+1;next<rows.length;next++){
      const targetRow=rows[next];
      if(q('[data-field-v53="warmup"]',targetRow)?.checked)continue;
      const target=q(`[data-field-v53="${field}"]`,targetRow);
      if(!target||String(target.value).trim())continue;
      target.value=input.value;
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }finally{autofilling=false}
}

function ensureAddExerciseButton(){
  const toolbar=q('#workout-dialog.workout-v53 .overview-toolbar-v53');
  if(!toolbar||q('#add-exercise-v54',toolbar))return;
  const button=document.createElement('button');
  button.type='button';button.id='add-exercise-v54';button.className='secondary';button.textContent='+ Übung hinzufügen';
  toolbar.append(button);
}

async function loadCatalog(){
  const names=new Set();
  Object.values(snapshot().workouts||{}).forEach(workout=>(workout.exercises||[]).forEach(ex=>names.add(ex.name)));
  const profile=read(STUDIO,read('gym-studio-profile-v32',{devices:{}}));
  Object.keys(profile?.devices||{}).forEach(name=>names.add(name));
  try{
    const result=await supabase.from('exercises').select('name').eq('is_active',true).order('name').limit(500);
    if(!result.error)(result.data||[]).forEach(row=>names.add(row.name));
  }catch{}
  catalog=[...names].filter(Boolean).sort((a,b)=>a.localeCompare(b,'de'));
  return catalog;
}

function ensureAddSheet(){
  let sheet=q('#exercise-sheet-v54');if(sheet)return sheet;
  sheet=document.createElement('section');sheet.id='exercise-sheet-v54';sheet.className='exercise-sheet-v54 hidden';
  sheet.innerHTML=`<div class="exercise-sheet-card-v54"><header><div><small>TRAINING ANPASSEN</small><h3>Übung hinzufügen</h3></div><button type="button" id="exercise-sheet-close-v54">Schließen</button></header><div class="exercise-sheet-search-v54"><input id="exercise-search-v54" type="search" placeholder="Gerät oder Übung suchen"><button type="button" id="exercise-custom-v54">Freien Namen hinzufügen</button></div><div id="exercise-results-v54"></div></div>`;
  q('#workout-dialog').append(sheet);
  q('#exercise-sheet-close-v54').onclick=()=>sheet.classList.add('hidden');
  q('#exercise-search-v54').addEventListener('input',renderExerciseResults);
  q('#exercise-custom-v54').onclick=()=>addExerciseToSession(q('#exercise-search-v54').value);
  return sheet;
}

function renderExerciseResults(){
  const root=q('#exercise-results-v54');if(!root)return;
  const term=canonical(q('#exercise-search-v54')?.value),rows=catalog.filter(name=>!term||canonical(name).includes(term)).slice(0,40);
  root.innerHTML=rows.length?rows.map(name=>`<button type="button" data-add-name-v54="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><span>Hinzufügen</span></button>`).join(''):'<p>Keine passende Übung gefunden. Du kannst den eingegebenen Namen frei hinzufügen.</p>';
}

async function openAddExercise(){
  const sheet=ensureAddSheet();sheet.classList.remove('hidden');
  q('#exercise-search-v54').value='';q('#exercise-results-v54').innerHTML='<p>Übungsliste wird geladen …</p>';
  await loadCatalog();renderExerciseResults();q('#exercise-search-v54').focus({preventScroll:true});
}

function addExerciseToSession(rawName){
  const name=String(rawName||'').trim();if(!name)return;
  const code=currentCode(),snap=snapshot(),workout=snap.workouts?.[code];if(!code||!workout)return;
  workout.exercises=workout.exercises||[];
  workout.exercises.push({
    plan_exercise_id:`extra-${crypto.randomUUID()}`,
    exercise_id:null,
    name,
    image_path:null,
    target_sets:3,
    rep_min:8,
    rep_max:12,
    rest_seconds:90,
    instructions:'Persönlich ergänzte Übung für diese Einheit.',
    failure_rule:'Saubere Technik und kontrollierte Wiederholungen priorisieren.'
  });
  write(SNAP,snap);
  q('#exercise-sheet-v54')?.classList.add('hidden');
  const current=q('#workout-dialog [data-select-ex-v53]');
  current?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  setTimeout(()=>{
    const items=qa('#workout-dialog [data-select-ex-v53]');
    items.at(-1)?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    arrangeTrainingHeader();ensureAddExerciseButton();
  },100);
}

function stabilizeStatus(){
  const line=q('.status-line'),offline=q('#offline-toggle'),sync=q('#sync-now'),connection=q('#connection-status'),count=q('#sync-count');
  if(connection)connection.hidden=true;if(count)count.hidden=true;
  if(offline){offline.textContent=localStorage.getItem(OFFLINE)==='1'?'Offline beenden':'Offline';offline.title='Notfall-Offline-Modus'}
  const pending=(read(QUEUE,[])||[]).length+(read(PENDING,[])||[]).length+(read(CAL_PENDING,[])||[]).length;
  if(sync){sync.hidden=!pending||!navigator.onLine;sync.textContent=pending?`Sync ${pending}`:'Sync'}
  if(line)line.classList.toggle('has-pending-v54',Boolean(pending));
}

function postTrainingAction(){
  setTimeout(()=>{arrangeTrainingHeader();ensureAddExerciseButton();prefillVisibleExercise()},60);
}

loadCss();
window.addEventListener('load',()=>{
  ensurePlanButtons();stabilizeStatus();
  const dialog=q('#workout-dialog');
  dialog?.addEventListener('toggle',()=>{if(dialog.open){scheduleModernRender(currentCode());arrangeTrainingHeader();hydrateDeviceHistory()} });
  setTimeout(()=>hydrateDeviceHistory({force:true}),700);
  setTimeout(()=>{ensurePlanButtons();stabilizeStatus();arrangeTrainingHeader()},1200);
});
window.addEventListener('online',()=>{stabilizeStatus();hydrateDeviceHistory({force:true})});
window.addEventListener('offline',stabilizeStatus);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){stabilizeStatus();arrangeTrainingHeader();hydrateDeviceHistory()}});

document.addEventListener('click',event=>{
  const opener=event.target.closest('[data-workout],#start-workout');
  if(opener){const code=opener.dataset.workout||currentCode();scheduleModernRender(code);hydrateDeviceHistory()}
  if(event.target.closest('#add-exercise-v54')){event.preventDefault();openAddExercise();return}
  const addName=event.target.closest('[data-add-name-v54]');if(addName){addExerciseToSession(addName.dataset.addNameV54);return}
  if(event.target.closest('[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-variant-prev-v53],[data-variant-next-v53],[data-add-set-v53],[data-remove-set-v53],#order-toggle-v53,[data-order-up-v53],[data-order-down-v53]'))postTrainingAction();
  if(event.target.closest('[data-page="plan"],[data-page-link="plan"]'))setTimeout(ensurePlanButtons,80);
  if(event.target.closest('#offline-toggle,#sync-now,[data-page],[data-page-link],#menu-toggle'))setTimeout(stabilizeStatus,20);
},true);
document.addEventListener('input',propagateEntry,true);
