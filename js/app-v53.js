import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const SNAP='gym-snapshot-v11';
const ACTIVE='gym-active-workout-v11';
const OFFLINE='gym-offline-v11';
const QUEUE='gym-queue-v11';
const DRAFT='gym-v53-draft';
const ORDER='gym-v53-order';
const HISTORY='gym-v53-device-history';
const EDIT='gym-v53-edit';
const PENDING='gym-v53-pending-sessions';
const CAL_PENDING='gym-v53-calendar-pending';
const STUDIO='gym-studio-profile-v35';

let selectedIndex=0;
let orderMode=false;
let moveSource=null;
let saving=false;

const VARIANTS={
  'Schrägbankdrückmaschine dual':[
    ['Schrägbankdrückmaschine dual','IMG_3062.png'],['Schrägbankmaschine sitzend','IMG_3063.png'],['Kurzhantel Schrägbankdrücken','IMG_3071.png'],['Bankdrückmaschine sitzend dual','IMG_3048.png']
  ],
  'Kurzhantel-Schrägbankdrücken':[
    ['Kurzhantel Schrägbankdrücken','IMG_3071.png'],['Schrägbankdrückmaschine dual','IMG_3062.png'],['Schrägbankmaschine sitzend','IMG_3063.png']
  ],
  'Kurzhantel Schrägbankdrücken':[
    ['Kurzhantel Schrägbankdrücken','IMG_3071.png'],['Schrägbankdrückmaschine dual','IMG_3062.png'],['Schrägbankmaschine sitzend','IMG_3063.png']
  ],
  'Brustpresse sitzend':[
    ['Brustpresse sitzend','IMG_3047.png'],['Bankdrückmaschine sitzend dual','IMG_3048.png'],['Bankdrückmaschine liegend dual','IMG_3049.png']
  ],
  'Butterfly mit Griffen':[
    ['Butterfly mit Griffen','IMG_3050.png'],['Butterfly mit Pads','IMG_3051.png']
  ],
  'Seithebemaschine ohne Armpolster':[
    ['Seithebemaschine ohne Armpolster','IMG_3064.png'],['Seithebemaschine dual ohne Armpolster','IMG_3065.png'],['Kurzhantel Seitheben sitzend','IMG_3069.png'],['Kurzhantel Seitheben stehend','IMG_3070.png']
  ],
  'Trizepsmaschine Überkopf':[
    ['Trizepsmaschine über Kopf','IMG_3066.png'],['Trizepsmaschine horizontal','IMG_3067.png'],['Trizeps Dip Maschine sitzend dual','IMG_3068.png']
  ],
  'Trizepsmaschine über Kopf':[
    ['Trizepsmaschine über Kopf','IMG_3066.png'],['Trizepsmaschine horizontal','IMG_3067.png'],['Trizeps Dip Maschine sitzend dual','IMG_3068.png']
  ],
  'Bizepsmaschine':[
    ['Bizepsmaschine','IMG_3044.png'],['Bizepsmaschine Plate loaded','IMG_3045.png'],['Scott Curler sitzend','IMG_3046.png']
  ],
  'Bauchmuskelmaschine':[
    ['Bauchmuskelmaschine','IMG_3040.png'],['Bauchmuskelmaschine Crunch liegend','IMG_3041.png'],['Klappsitz Bauchmaschine sitzend','IMG_3042.png'],['Klappsitz Bauchmaschine liegend, Plate loaded','IMG_3043.png']
  ],
  'Latzugstation mit Oberschenkelpolster':[
    ['Latzugstation mit Oberschenkelpolster',null],['Rückenzugmaschine dual',null],['High Row dual',null]
  ],
  'Rudermaschine mit Brustpolster':[
    ['Rudermaschine mit Brustpolster',null],['Low Row dual',null],['High Row dual',null]
  ],
  'High Row dual':[
    ['High Row dual',null],['Rückenzugmaschine dual',null],['Rudermaschine mit Brustpolster',null]
  ],
  'Low Row dual':[
    ['Low Row dual',null],['Rudermaschine mit Brustpolster',null],['High Row dual',null]
  ],
  'Butterfly reverse mit Griffen':[
    ['Butterfly reverse mit Griffen',null],['Butterfly reverse mit Pads',null]
  ],
  'Rückenstreckermaschine':[['Rückenstreckermaschine',null]]
};

const TARGETS={
  'Schrägbankdrückmaschine dual':{sets:3,min:6,max:10,rir:'1–2'},
  'Kurzhantel-Schrägbankdrücken':{sets:3,min:6,max:10,rir:'1–2'},
  'Kurzhantel Schrägbankdrücken':{sets:3,min:6,max:10,rir:'1–2'},
  'Latzugstation mit Oberschenkelpolster':{sets:3,min:8,max:12,rir:'1–2'},
  'Brustpresse sitzend':{sets:2,min:8,max:12,rir:'1–2'},
  'Rudermaschine mit Brustpolster':{sets:3,min:8,max:12,rir:'1–2'},
  'High Row dual':{sets:3,min:8,max:12,rir:'1–2'},
  'Low Row dual':{sets:3,min:8,max:12,rir:'1–2'},
  'Butterfly mit Griffen':{sets:2,min:10,max:15,rir:'1–2'},
  'Seithebemaschine ohne Armpolster':{sets:4,min:12,max:20,rir:'2–3',conservative:true},
  'Butterfly reverse mit Griffen':{sets:3,min:12,max:20,rir:'1–2'},
  'Bauchmuskelmaschine':{sets:3,min:12,max:20,rir:'1–2'},
  'Trizepsmaschine Überkopf':{sets:2,min:8,max:12,rir:'1–2'},
  'Bizepsmaschine':{sets:2,min:8,max:12,rir:'1–2'},
  'Rückenstreckermaschine':{sets:3,min:12,max:20,rir:'2–3',conservative:true}
};

function loadStyles(){
  for(const href of ['css/app-v53.css','css/studio-page-v35.css','css/device-photo-v36.css']){
    if(q(`link[href="${href}"]`))continue;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);
  }
}

const online=()=>navigator.onLine&&localStorage.getItem(OFFLINE)!=='1';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const dateAtNoon=value=>new Date(`${value}T12:00:00`);
const isoDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(date);
const number=value=>{const n=Number(String(value??'').replace(',','.'));return Number.isFinite(n)?n:null};
const fmtNumber=value=>number(value)==null?'–':number(value).toLocaleString('de-DE',{maximumFractionDigits:2});
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const canonical=value=>String(value||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();

function snapshot(){return read(SNAP,{plan:{},workouts:{},schedule:[],completed:[],weights:[],measurements:[]})}
function active(){return read(ACTIVE,null)}
function draftAll(){return read(DRAFT,{})}
function orderAll(){return read(ORDER,{})}
function historyAll(){return read(HISTORY,{})}
function exerciseKey(ex,index){return String(ex.id||ex.plan_exercise_id||`${index}:${ex.name}`)}
function workoutFor(code){return snapshot().workouts?.[code]||null}
function variantsFor(ex){return (VARIANTS[ex.name]||[[ex.name,ex.image_path||null]]).map(([name,image])=>({name,image}))}
function targetFor(ex){return TARGETS[ex.name]||{sets:Number(ex.target_sets)||3,min:Number(ex.rep_min)||8,max:Number(ex.rep_max)||12,rir:'1–2'}}

function currentOrder(code,exercises){
  const stored=orderAll()[code]||[];
  const keys=exercises.map(exerciseKey);
  const valid=stored.filter(key=>keys.includes(key));
  return [...valid,...keys.filter(key=>!valid.includes(key))];
}
function orderedExercises(code,exercises){
  const order=currentOrder(code,exercises);
  return order.map(key=>exercises.find((ex,index)=>exerciseKey(ex,index)===key)).filter(Boolean);
}
function saveOrder(code,exercises){const all=orderAll();all[code]=exercises.map(exerciseKey);write(ORDER,all)}

function editPayload(){return read(EDIT,null)}
function draftFor(code,exercises){
  const all=draftAll(),base=all[code]||{};
  const edit=editPayload();
  if(edit?.code===code&&!base.__editLoaded){
    const byPlan=Object.fromEntries((edit.exercises||[]).map(ex=>[String(ex.plan_exercise_id||''),ex]));
    const byOrder=Object.fromEntries((edit.exercises||[]).map(ex=>[String(ex.exercise_order),ex]));
    exercises.forEach((ex,index)=>{
      const old=byPlan[String(ex.id)]||byOrder[String(index+1)];if(!old)return;
      const variants=variantsFor(ex),oldName=old.name||ex.name,variantIndex=Math.max(0,variants.findIndex(v=>canonical(v.name)===canonical(oldName)));
      base[exerciseKey(ex,index)]={variantIndex:variantIndex<0?0:variantIndex,status:old.status==='completed'?'completed':old.status==='skipped'?'skipped':'pending',sets:(old.sets||[]).map(set=>({weight:set.weight_kg??'',reps:set.repetitions??'',rir:set.rir??'',warmup:set.notes==='warmup'}))};
    });
    base.__editLoaded=true;all[code]=base;write(DRAFT,all);
  }
  return base;
}
function saveExerciseDraft(code,key,data){const all=draftAll();all[code]??={};all[code][key]=data;write(DRAFT,all)}
function clearDraft(code){const all=draftAll();delete all[code];write(DRAFT,all)}

function defaultExerciseState(ex){
  const target=targetFor(ex);
  return {variantIndex:0,status:'pending',sets:Array.from({length:target.sets},()=>({weight:'',reps:'',rir:'',warmup:false}))};
}
function stateFor(code,ex,index){return draftFor(code,workoutFor(code)?.exercises||[])[exerciseKey(ex,index)]||defaultExerciseState(ex)}

function setupFor(name){
  const profile=read(STUDIO,read('gym-studio-profile-v32',{devices:{}}));
  const entry=Object.entries(profile?.devices||{}).find(([device])=>canonical(device)===canonical(name))?.[1];
  if(!entry)return [];
  const labels={seat:'Sitz',backrest:'Lehne',chest_pad:'Brustpolster',start_position:'Start',bench_angle:'Winkel',grip:'Griff',weight_steps:'Gewichtsschritte',notes:'Notiz'};
  return Object.entries(labels).filter(([key])=>String(entry.setup?.[key]||'').trim()).map(([key,label])=>({label,value:entry.setup[key]}));
}

function workSets(sets){return (sets||[]).filter(set=>!set.warmup&&number(set.weight)!=null&&number(set.reps)!=null)}
function exactHistory(name){return historyAll()[name]||null}
function coachFor(ex,variantName){
  const target=targetFor(ex),history=exactHistory(variantName),sets=workSets(history?.sets);
  if(!sets.length)return {title:'Erste Referenz setzen',detail:`Wähle ein Gewicht für ${target.min}–${target.max} saubere Wiederholungen bei ungefähr RIR ${target.rir}.`,last:'Noch keine Werte an diesem Gerät.'};
  const last=sets.map(set=>`${fmtNumber(set.weight)} kg × ${set.reps}`).join(' · ');
  const allTop=sets.length>=target.sets&&sets.slice(0,target.sets).every(set=>number(set.reps)>=target.max);
  if(allTop&&target.conservative)return {title:'Gewicht nur manuell prüfen',detail:'Oberes Wiederholungsziel erreicht. Bei dieser Übung nur erhöhen, wenn Technik und Schultergefühl stabil bleiben.',last};
  if(allTop)return {title:'Nächsten Geräteschritt prüfen',detail:`Alle Arbeitssätze erreichten mindestens ${target.max} Wiederholungen. Nutze beim nächsten Versuch den nächsthöheren tatsächlich verfügbaren Schritt.`,last};
  const goals=sets.slice(0,target.sets).map(set=>Math.min(target.max,number(set.reps)+1));
  return {title:'Gewicht beibehalten',detail:`Ziel für den nächsten Durchgang: ${goals.join(' / ')} Wiederholungen bei demselben Gewicht.`,last};
}

function renderOverview(code,exercises){
  const draft=draftFor(code,workoutFor(code)?.exercises||[]);
  return `<details class="training-overview-v53" open><summary><span><strong>Übungen heute</strong><small>${exercises.length} Übungen · Reihenfolge frei wählbar</small></span><span>⌄</span></summary><div class="overview-toolbar-v53"><button type="button" class="secondary" id="order-toggle-v53">${orderMode?'Reihenfolge speichern':'Reihenfolge ändern'}</button></div><div class="overview-grid-v53">${exercises.map((ex,index)=>{
    const state=draft[exerciseKey(ex,index)]||defaultExerciseState(ex),mark=state.status==='completed'?'✓':state.status==='skipped'?'–':String(index+1),target=targetFor(ex);
    return `<div class="overview-item-wrap-v53"><button type="button" class="overview-item-v53 ${index===selectedIndex?'active':''} ${state.status}" data-select-ex-v53="${index}"><span>${mark}</span><div><strong>${escapeHtml(ex.name)}</strong><small>${target.sets} Sätze · ${target.min}–${target.max} Wdh.</small></div></button>${orderMode?`<div class="order-controls-v53"><button type="button" data-order-up-v53="${index}" ${index===0?'disabled':''}>↑</button><button type="button" data-order-down-v53="${index}" ${index===exercises.length-1?'disabled':''}>↓</button></div>`:''}</div>`;
  }).join('')}</div></details>`;
}

function setRowMarkup(set,index){
  return `<div class="set-row-v53" data-set-index-v53="${index}"><span class="set-number-v53">${index+1}</span><label><span>kg</span><input data-field-v53="weight" inputmode="decimal" value="${escapeHtml(set.weight)}"></label><label><span>Wdh.</span><input data-field-v53="reps" inputmode="numeric" value="${escapeHtml(set.reps)}"></label><label><span>RIR</span><input data-field-v53="rir" inputmode="decimal" value="${escapeHtml(set.rir)}"></label><label class="warmup-v53"><input data-field-v53="warmup" type="checkbox" ${set.warmup?'checked':''}><span>W</span></label></div>`;
}

function renderExerciseDetail(code,ex,index){
  const key=exerciseKey(ex,index),state=stateFor(code,ex,index),variants=variantsFor(ex),variant=variants[Math.min(state.variantIndex||0,variants.length-1)],target=targetFor(ex),coach=coachFor(ex,variant.name),setup=setupFor(variant.name);
  return `<article class="training-exercise-v53" data-code-v53="${code}" data-ex-key-v53="${escapeHtml(key)}" data-ex-index-v53="${index}"><header class="exercise-title-v53"><div><small>ÜBUNG ${index+1} VON ${orderedExercises(code,workoutFor(code).exercises).length}</small><h3>${escapeHtml(ex.name)}</h3><p>${target.sets} Arbeitssätze · ${target.min}–${target.max} Wiederholungen · RIR ${target.rir}</p></div></header><section class="device-card-v53"><div class="device-nav-v53"><button type="button" data-variant-prev-v53 ${state.variantIndex<=0?'disabled':''}>‹</button><div><small>${state.variantIndex===0?'STANDARD':'ALTERNATIVE'}</small><strong>${escapeHtml(variant.name)}</strong><span>${state.variantIndex+1} / ${variants.length}</span></div><button type="button" data-variant-next-v53 ${state.variantIndex>=variants.length-1?'disabled':''}>›</button></div><figure class="device-image-v53">${variant.image?`<img src="${variant.image}" alt="${escapeHtml(variant.name)}">`:`<div><span>Kein Bild hinterlegt</span><small>${escapeHtml(variant.name)}</small></div>`}</figure>${setup.length?`<div class="setup-v53"><strong>Dein Geräte-Setup</strong><div>${setup.map(item=>`<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.value)}</span>`).join('')}</div></div>`:`<button type="button" class="setup-link-v53" data-open-studio-v53>Geräte-Setup ergänzen</button>`}</section><section class="coach-card-v53"><div class="coach-label-v53"><span>COACH</span><strong>${escapeHtml(coach.title)}</strong></div><div class="coach-grid-v53"><div><small>Letztes Mal an genau diesem Gerät</small><p>${escapeHtml(coach.last)}</p></div><div><small>Nächste Vorgabe</small><p>${escapeHtml(coach.detail)}</p></div></div></section><section class="tracking-card-v53"><div class="tracking-head-v53"><div><small>TRACKING</small><h4>Sätze eintragen</h4></div><div><button type="button" data-remove-set-v53 ${state.sets.length<=1?'disabled':''}>−</button><button type="button" data-add-set-v53>+</button></div></div><div class="sets-v53">${state.sets.map(setRowMarkup).join('')}</div><p class="rir-copy-v53"><strong>RIR</strong> = so viele saubere Wiederholungen wären noch möglich gewesen.</p></section><section class="exercise-status-v53"><button type="button" data-status-v53="completed" class="${state.status==='completed'?'active':''}">✓ Erledigt</button><button type="button" data-status-v53="skipped" class="${state.status==='skipped'?'active':''}">Heute auslassen</button></section><nav class="exercise-nav-v53"><button type="button" data-prev-ex-v53 ${index===0?'disabled':''}>‹ Vorherige</button><button type="button" data-overview-v53>Übersicht</button><button type="button" data-next-ex-v53 ${index===orderedExercises(code,workoutFor(code).exercises).length-1?'disabled':''}>Nächste ›</button></nav></article>`;
}

function renderTraining(code,{keepScroll=false}={}){
  const dialog=q('#workout-dialog'),list=q('#exercise-list'),workout=workoutFor(code);if(!dialog||!list||!workout)return;
  const exercises=orderedExercises(code,workout.exercises||[]);selectedIndex=Math.max(0,Math.min(selectedIndex,Math.max(0,exercises.length-1)));
  const scroll=dialog.scrollTop;
  dialog.classList.add('workout-v53');
  q('#dialog-title').textContent=editPayload()?.code===code?`Training ${code} korrigieren`:`Training ${code}`;
  q('#complete-workout').textContent=editPayload()?.code===code?'Änderungen speichern':'Training abschließen';
  list.innerHTML=`${renderOverview(code,exercises)}<div id="exercise-detail-v53">${renderExerciseDetail(code,exercises[selectedIndex],selectedIndex)}</div>`;
  if(keepScroll)dialog.scrollTop=scroll;
}

function ensureActiveCode(code){
  const current=active();if(current?.code===code)return;
  write(ACTIVE,{code,elapsed:0,running:false,lastStart:null,statuses:{}});
}
function openTrainingFromClick(button){
  const code=button.dataset.workout||snapshot().schedule.filter(item=>['planned','confirmed','started'].includes(item.status)).sort((a,b)=>a.date.localeCompare(b.date))[0]?.code;
  if(!code)return;
  ensureActiveCode(code);selectedIndex=0;orderMode=false;
  setTimeout(()=>renderTraining(code),30);
  setTimeout(()=>renderTraining(code),160);
}

function updateSelectedExercise(code,index){selectedIndex=index;renderTraining(code);requestAnimationFrame(()=>q('#exercise-detail-v53')?.scrollIntoView({block:'start',behavior:'smooth'}))}
function modifyState(card,mutator,{rerender=true}={}){
  const code=card.dataset.codeV53,key=card.dataset.exKeyV53,index=Number(card.dataset.exIndexV53),ex=orderedExercises(code,workoutFor(code).exercises)[index],state=structuredClone(stateFor(code,ex,index));mutator(state);saveExerciseDraft(code,key,state);if(rerender)renderTraining(code,{keepScroll:true});
}

function handleTrainingClick(event){
  const dialog=event.target.closest('#workout-dialog.workout-v53');if(!dialog)return;
  const card=event.target.closest('.training-exercise-v53');
  const select=event.target.closest('[data-select-ex-v53]');if(select){updateSelectedExercise(active()?.code,Number(select.dataset.selectExV53));return}
  if(event.target.closest('#order-toggle-v53')){orderMode=!orderMode;renderTraining(active()?.code,{keepScroll:true});return}
  const up=event.target.closest('[data-order-up-v53]'),down=event.target.closest('[data-order-down-v53]');if(up||down){const code=active()?.code,workout=workoutFor(code),list=orderedExercises(code,workout.exercises),index=Number((up||down).dataset[up?'orderUpV53':'orderDownV53']),next=index+(up?-1:1);[list[index],list[next]]=[list[next],list[index]];saveOrder(code,list);selectedIndex=next;renderTraining(code,{keepScroll:true});return}
  if(event.target.closest('[data-overview-v53]')){q('.training-overview-v53')?.setAttribute('open','');dialog.scrollTo({top:0,behavior:'smooth'});return}
  if(event.target.closest('[data-prev-ex-v53]')){updateSelectedExercise(active()?.code,selectedIndex-1);return}
  if(event.target.closest('[data-next-ex-v53]')){updateSelectedExercise(active()?.code,selectedIndex+1);return}
  if(event.target.closest('[data-open-studio-v53]')){dialog.close();q('[data-page="studio"]')?.click();return}
  if(!card)return;
  if(event.target.closest('[data-variant-prev-v53]')){modifyState(card,state=>state.variantIndex=Math.max(0,state.variantIndex-1));return}
  if(event.target.closest('[data-variant-next-v53]')){const ex=orderedExercises(card.dataset.codeV53,workoutFor(card.dataset.codeV53).exercises)[Number(card.dataset.exIndexV53)],max=variantsFor(ex).length-1;modifyState(card,state=>state.variantIndex=Math.min(max,state.variantIndex+1));return}
  if(event.target.closest('[data-add-set-v53]')){modifyState(card,state=>{const last=state.sets.at(-1)||{};state.sets.push({weight:last.weight||'',reps:last.reps||'',rir:last.rir||'',warmup:false})});return}
  if(event.target.closest('[data-remove-set-v53]')){modifyState(card,state=>{if(state.sets.length>1)state.sets.pop()});return}
  const status=event.target.closest('[data-status-v53]');if(status){modifyState(card,state=>state.status=state.status===status.dataset.statusV53?'pending':status.dataset.statusV53);return}
}

function handleTrainingInput(event){
  const input=event.target.closest('#workout-dialog.workout-v53 [data-field-v53]');if(!input)return;
  const card=input.closest('.training-exercise-v53'),code=card.dataset.codeV53,key=card.dataset.exKeyV53,index=Number(card.dataset.exIndexV53),ex=orderedExercises(code,workoutFor(code).exercises)[index],state=structuredClone(stateFor(code,ex,index)),setIndex=Number(input.closest('[data-set-index-v53]').dataset.setIndexV53),field=input.dataset.fieldV53;
  state.sets[setIndex][field]=field==='warmup'?input.checked:input.value;saveExerciseDraft(code,key,state);
}

function collectSession(code){
  const workout=workoutFor(code),exercises=orderedExercises(code,workout.exercises||[]),draft=draftFor(code,workout.exercises||[]),a=active()||{};
  return {code,planId:snapshot().plan?.id,planWorkoutId:workout.id,workoutDate:editPayload()?.workout_date||today(),workoutId:editPayload()?.workout_id||null,elapsedSeconds:Math.floor(((a.elapsed||0)+(a.running&&a.lastStart?Date.now()-a.lastStart:0))/1000),exercises:exercises.map((ex,index)=>{const state=draft[exerciseKey(ex,index)]||defaultExerciseState(ex),variant=variantsFor(ex)[state.variantIndex||0]||variantsFor(ex)[0];return {order:index+1,planExerciseId:ex.id,standardExerciseId:ex.exercise_id,standardName:ex.name,variantName:variant.name,status:state.status,sets:state.sets.filter(set=>set.weight||set.reps||set.rir||set.warmup)}})};
}

async function sessionUser(){const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Bitte neu anmelden.');return data.session.user}
async function ensureExercise(userId,exercise){
  if(exercise.standardExerciseId&&canonical(exercise.variantName)===canonical(exercise.standardName))return exercise.standardExerciseId;
  const existing=await supabase.from('exercises').select('id,name').ilike('name',exercise.variantName).limit(10);if(existing.error)throw existing.error;
  const exact=(existing.data||[]).find(row=>canonical(row.name)===canonical(exercise.variantName));if(exact)return exact.id;
  const inserted=await supabase.from('exercises').insert({owner_id:userId,name:exercise.variantName,studio:'John Reed Essen',equipment:'Gerätevariante',is_shared_catalogue:false,is_active:true}).select('id').single();if(inserted.error)throw inserted.error;return inserted.data.id;
}
async function replaceWorkoutDetails(userId,workoutId,sessionData){
  const old=await supabase.from('workout_exercises').select('id').eq('workout_id',workoutId);if(old.error)throw old.error;
  const oldIds=(old.data||[]).map(row=>row.id);if(oldIds.length){const delSets=await supabase.from('workout_sets').delete().in('workout_exercise_id',oldIds);if(delSets.error)throw delSets.error;const delEx=await supabase.from('workout_exercises').delete().eq('workout_id',workoutId);if(delEx.error)throw delEx.error}
  for(const exercise of sessionData.exercises){
    const exerciseId=await ensureExercise(userId,exercise);
    const inserted=await supabase.from('workout_exercises').insert({user_id:userId,workout_id:workoutId,plan_exercise_id:exercise.planExerciseId,exercise_id:exerciseId,exercise_order:exercise.order,status:exercise.status==='completed'?'completed':exercise.status==='skipped'?'skipped':'not_completed'}).select('id').single();if(inserted.error)throw inserted.error;
    const rows=exercise.sets.map((set,index)=>({user_id:userId,workout_exercise_id:inserted.data.id,set_number:index+1,weight_kg:number(set.weight),repetitions:number(set.reps),rir:number(set.rir)==null?null:Math.round(number(set.rir)),completed:Boolean(set.weight||set.reps),notes:set.warmup?'warmup':''}));
    if(rows.length){const setInsert=await supabase.from('workout_sets').insert(rows);if(setInsert.error)throw setInsert.error}
  }
}
async function persistSession(sessionData){
  const user=await sessionUser();const statuses=sessionData.exercises.map(ex=>ex.status),status=statuses.length&&statuses.every(value=>value==='completed')?'completed':'partial';let workoutId=sessionData.workoutId;
  if(workoutId){const update=await supabase.from('workouts').update({status,elapsed_seconds:sessionData.elapsedSeconds,finished_at:new Date().toISOString()}).eq('id',workoutId);if(update.error)throw update.error}
  else{
    const inserted=await supabase.from('workouts').insert({user_id:user.id,plan_id:sessionData.planId,plan_workout_id:sessionData.planWorkoutId,workout_date:sessionData.workoutDate,started_at:new Date(Date.now()-sessionData.elapsedSeconds*1000).toISOString(),finished_at:new Date().toISOString(),elapsed_seconds:sessionData.elapsedSeconds,status}).select('id').single();if(inserted.error)throw inserted.error;workoutId=inserted.data.id;
  }
  await replaceWorkoutDetails(user.id,workoutId,sessionData);
  return workoutId;
}
function storePendingSession(sessionData){const pending=read(PENDING,[]);pending.push({...sessionData,queuedAt:new Date().toISOString()});write(PENDING,pending);const snap=snapshot();snap.completed=snap.completed||[];if(!snap.completed.some(item=>item.date===sessionData.workoutDate&&item.code===sessionData.code))snap.completed.push({id:`local-${Date.now()}`,date:sessionData.workoutDate,code:sessionData.code,status:'completed'});write(SNAP,snap)}
async function syncPendingSessions(){if(!online())return;const pending=read(PENDING,[]),remaining=[];for(const item of pending){try{await persistSession(item)}catch{remaining.push(item)}}write(PENDING,remaining);if(!remaining.length&&pending.length)localStorage.removeItem(SNAP);renderConnection()}

async function completeTraining(event){
  const button=event.target.closest('#complete-workout');if(!button||!q('#workout-dialog')?.classList.contains('workout-v53'))return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(saving)return;
  const code=active()?.code;if(!code)return;const data=collectSession(code),incomplete=data.exercises.filter(ex=>ex.status==='pending').length;
  if(incomplete&&!confirm(`${incomplete} Übung${incomplete===1?' ist':'en sind'} noch offen. Training trotzdem teilweise speichern?`))return;
  saving=true;button.disabled=true;button.textContent='Wird gespeichert …';
  try{const wasOnline=online();if(wasOnline)await persistSession(data);else storePendingSession(data);clearDraft(code);localStorage.removeItem(ACTIVE);localStorage.removeItem(EDIT);q('#workout-dialog')?.close();if(wasOnline)localStorage.removeItem(SNAP);location.reload()}
  catch(error){alert(`Training konnte nicht gespeichert werden: ${error.message}`);button.disabled=false;button.textContent=editPayload()?.code===code?'Änderungen speichern':'Training abschließen'}finally{saving=false}
}

function ensureHistoryDialog(){
  let dialog=q('#history-dialog-v53');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='history-dialog-v53';dialog.innerHTML='<header><div><small>TRAININGSHISTORIE</small><h2 id="history-title-v53">Training</h2></div><button type="button" id="history-close-v53">Schließen</button></header><div id="history-body-v53"></div>';document.body.append(dialog);q('#history-close-v53').onclick=()=>dialog.close();return dialog;
}
async function loadHistory(date){
  const user=await sessionUser();const wr=await supabase.from('workouts').select('id,workout_date,status,plan_workout_id,elapsed_seconds').eq('user_id',user.id).eq('workout_date',date).in('status',['completed','partial']).order('created_at',{ascending:false}).limit(1);if(wr.error)throw wr.error;const workout=wr.data?.[0];if(!workout)throw new Error('Für diesen Tag wurde kein Training gefunden.');
  const we=await supabase.from('workout_exercises').select('id,exercise_order,status,exercise_id,plan_exercise_id').eq('workout_id',workout.id).order('exercise_order');if(we.error)throw we.error;const exIds=[...new Set((we.data||[]).map(row=>row.exercise_id).filter(Boolean))],names=exIds.length?await supabase.from('exercises').select('id,name').in('id',exIds):{data:[],error:null};if(names.error)throw names.error;const nameMap=Object.fromEntries((names.data||[]).map(row=>[row.id,row.name]));const ids=(we.data||[]).map(row=>row.id),sets=ids.length?await supabase.from('workout_sets').select('workout_exercise_id,set_number,weight_kg,repetitions,rir,notes').in('workout_exercise_id',ids).order('set_number'):{data:[],error:null};if(sets.error)throw sets.error;
  const code=Object.values(snapshot().workouts||{}).find(item=>item.id===workout.plan_workout_id)?.code||snapshot().completed?.find(item=>item.date===date)?.code||'';
  return {...workout,code,workout_id:workout.id,exercises:(we.data||[]).map(row=>({...row,name:nameMap[row.exercise_id]||`Übung ${row.exercise_order}`,sets:(sets.data||[]).filter(set=>set.workout_exercise_id===row.id)}))};
}
function historyMarkup(row){
  const duration=row.elapsed_seconds?`${Math.floor(row.elapsed_seconds/60)} Min.`:'keine Zeit gespeichert';
  return `<p class="history-meta-v53"><strong>${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(dateAtNoon(row.workout_date))}</strong><span>${row.status==='completed'?'Abgeschlossen':'Teilweise'} · ${duration}</span></p><div class="history-list-v53">${row.exercises.length?row.exercises.map(ex=>`<article><header><div><small>${ex.exercise_order}. ÜBUNG</small><h3>${escapeHtml(ex.name)}</h3></div><span>${ex.status==='completed'?'✓':ex.status==='skipped'?'–':'…'}</span></header>${ex.sets.length?ex.sets.map(set=>`<div class="history-set-v53"><span>Satz ${set.set_number}</span><strong>${set.weight_kg==null?'–':`${fmtNumber(set.weight_kg)} kg`}</strong><span>${set.repetitions==null?'–':`${set.repetitions} Wdh.`}</span><span>${set.notes==='warmup'?'Warm-up':set.rir==null?'':`RIR ${set.rir}`}</span></div>`).join(''):'<p>Keine Satzwerte gespeichert.</p>'}</article>`).join(''):'<p>Keine Übungsdaten gespeichert.</p>'}</div><div class="history-actions-v53"><button type="button" class="primary" id="history-edit-v53">Training korrigieren</button><button type="button" class="secondary" id="history-replan-v53">Erneut einplanen</button><button type="button" class="secondary" id="history-close-bottom-v53">Schließen</button></div><p class="history-note-v53">Zurücksetzen oder endgültig löschen wird erst aktiviert, wenn persönliche Bestwerte vor dem Löschen separat archiviert werden.</p>`;
}
async function openHistory(date){
  const dialog=ensureHistoryDialog(),body=q('#history-body-v53');body.innerHTML='<p class="loading-v53">Trainingsdaten werden geladen …</p>';dialog.showModal();
  try{const row=await loadHistory(date);q('#history-title-v53').textContent=`Training ${row.code}`;body.innerHTML=historyMarkup(row);q('#history-close-bottom-v53').onclick=()=>dialog.close();q('#history-edit-v53').onclick=()=>{write(EDIT,row);dialog.close();q(`[data-workout="${row.code}"]`)?.click()};q('#history-replan-v53').onclick=()=>replanHistory(row)}catch(error){body.innerHTML=`<article class="error-banner"><strong>Training konnte nicht geladen werden</strong><p>${escapeHtml(error.message)}</p></article>`}
}
async function replanHistory(row){const value=prompt('An welchem Datum soll Training erneut eingeplant werden? (JJJJ-MM-TT)',today());if(!value)return;try{const user=await sessionUser(),workout=workoutFor(row.code),insert=await supabase.from('scheduled_workouts').insert({user_id:user.id,plan_workout_id:workout.id,scheduled_date:value,status:'planned'});if(insert.error)throw insert.error;localStorage.removeItem(SNAP);location.reload()}catch(error){alert(error.message)}}

async function hydrateHistory(){
  if(!online())return;
  try{const user=await sessionUser(),wr=await supabase.from('workouts').select('id,workout_date').eq('user_id',user.id).in('status',['completed','partial']).order('workout_date',{ascending:false}).limit(30);if(wr.error||!wr.data?.length)return;const dateMap=Object.fromEntries(wr.data.map(row=>[row.id,row.workout_date])),we=await supabase.from('workout_exercises').select('id,workout_id,exercise_id').in('workout_id',wr.data.map(row=>row.id));if(we.error||!we.data?.length)return;const exIds=[...new Set(we.data.map(row=>row.exercise_id).filter(Boolean))],ex=await supabase.from('exercises').select('id,name').in('id',exIds);if(ex.error)return;const names=Object.fromEntries(ex.data.map(row=>[row.id,row.name])),sets=await supabase.from('workout_sets').select('workout_exercise_id,set_number,weight_kg,repetitions,rir,notes').in('workout_exercise_id',we.data.map(row=>row.id)).order('set_number');if(sets.error)return;const latest={};for(const row of we.data){const name=names[row.exercise_id];if(!name||latest[name])continue;const values=sets.data.filter(set=>set.workout_exercise_id===row.id).map(set=>({weight:set.weight_kg??'',reps:set.repetitions??'',rir:set.rir??'',warmup:set.notes==='warmup'}));if(values.length)latest[name]={date:dateMap[row.workout_id],sets:values}}write(HISTORY,latest)}catch{}
}

function renderConnection(){
  const line=q('.status-line'),dashboard=q('#page-dashboard');if(line&&dashboard&&line.parentElement!==dashboard)dashboard.prepend(line);
  const offline=q('#offline-toggle'),sync=q('#sync-now'),connection=q('#connection-status'),count=q('#sync-count');
  if(offline)offline.textContent=localStorage.getItem(OFFLINE)==='1'?'Offline-Modus beenden':'Offline-Modus';
  const pending=(read(QUEUE,[])||[]).length+(read(PENDING,[])||[]).length+(read(CAL_PENDING,[])||[]).length;
  if(sync){sync.textContent=pending?`Synchronisieren (${pending})`:'Synchronisieren';sync.hidden=!pending||!online()}
  if(connection)connection.hidden=true;if(count)count.hidden=true;
}
function enforceHeader(){const small=q('.topbar-title p'),title=q('#page-title'),drawerSmall=q('.drawer-head small'),drawerName=q('.drawer-head h2');if(small)small.textContent='DEIN TRAINING';if(title&&title.textContent!=='Trainingsplan Dave')title.textContent='Trainingsplan Dave';if(drawerSmall)drawerSmall.textContent='TRAININGSPLAN';if(drawerName)drawerName.textContent='Dave'}
function installHeaderObserver(){const title=q('#page-title');if(!title||title.dataset.observedV53)return;title.dataset.observedV53='1';new MutationObserver(enforceHeader).observe(title,{childList:true,characterData:true,subtree:true})}

function addDays(value,delta){const date=dateAtNoon(value);date.setDate(date.getDate()+delta);return isoDate(date)}
function startMove(){const date=q('#planning-dialog')?.dataset.date,item=snapshot().schedule.find(row=>row.date===date&&['planned','confirmed','started'].includes(row.status));if(!item)return;moveSource=item;q('#planning-dialog')?.close();alert(`Training ${item.code} ist markiert. Tippe jetzt im Kalender auf den neuen Tag.`)}
async function persistShift(operation){
  const rows=operation.rows.filter(row=>!String(row.id).startsWith('local-'));if(!rows.length)return;
  for(let index=0;index<rows.length;index++){const temp=addDays('2099-12-01',index),update=await supabase.from('scheduled_workouts').update({scheduled_date:temp}).eq('id',rows[index].id);if(update.error)throw update.error}
  for(const row of rows){const update=await supabase.from('scheduled_workouts').update({scheduled_date:row.newDate,status:'planned'}).eq('id',row.id);if(update.error)throw update.error}
}
async function shiftSchedule(targetDate){
  const snap=snapshot(),source=snap.schedule.find(row=>String(row.id)===String(moveSource.id));if(!source)return;const delta=Math.round((dateAtNoon(targetDate)-dateAtNoon(source.date))/86400000),future=snap.schedule.filter(row=>row.date>=source.date&&['planned','confirmed','started'].includes(row.status)).sort((a,b)=>a.date.localeCompare(b.date)),operation={rows:future.map(row=>({id:row.id,oldDate:row.date,newDate:addDays(row.date,delta)}))};operation.rows.forEach(change=>{const row=snap.schedule.find(item=>String(item.id)===String(change.id));if(row)row.date=change.newDate});write(SNAP,snap);moveSource=null;
  if(online()){try{await persistShift(operation);localStorage.removeItem(SNAP);location.reload()}catch(error){alert(`Termin konnte nicht verschoben werden: ${error.message}`);location.reload()}}
  else{const pending=read(CAL_PENDING,[]);pending.push(operation);write(CAL_PENDING,pending);location.reload()}
}
async function syncCalendarPending(){if(!online())return;const pending=read(CAL_PENDING,[]),remaining=[];for(const operation of pending){try{await persistShift(operation)}catch{remaining.push(operation)}}write(CAL_PENDING,remaining)}

function interceptCalendar(event){
  const completed=event.target.closest('.calendar-day.completed,.calendar-day.completed-v50');if(completed){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openHistory(completed.dataset.date);return true}
  if(event.target.closest('#planning-move')){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();startMove();return true}
  const day=event.target.closest('[data-calendar-grid] .calendar-day');if(day&&moveSource){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();shiftSchedule(day.dataset.date);return true}
  return false;
}

function delayedAuxiliaryModules(){
  setTimeout(()=>import('./studio-page-v35.js?v=53').catch(()=>{}),700);
  setTimeout(()=>import('./device-photo-v36.js?v=53').catch(()=>{}),1000);
}

loadStyles();
document.addEventListener('click',event=>{
  if(interceptCalendar(event))return;
  const open=event.target.closest('[data-workout],#start-workout');if(open)openTrainingFromClick(open);
  handleTrainingClick(event);
  if(event.target.closest('[data-page],[data-page-link],#menu-toggle,#offline-toggle,#sync-now'))setTimeout(()=>{enforceHeader();renderConnection()},0);
},true);
document.addEventListener('input',handleTrainingInput,true);
document.addEventListener('change',handleTrainingInput,true);
document.addEventListener('click',completeTraining,true);
window.addEventListener('online',()=>{renderConnection();syncPendingSessions();syncCalendarPending();hydrateHistory()});
window.addEventListener('offline',renderConnection);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){enforceHeader();renderConnection();syncPendingSessions();syncCalendarPending()}});
window.addEventListener('load',()=>{
  enforceHeader();installHeaderObserver();renderConnection();hydrateHistory();syncPendingSessions();syncCalendarPending();delayedAuxiliaryModules();
  setTimeout(()=>{enforceHeader();renderConnection()},500);
});
