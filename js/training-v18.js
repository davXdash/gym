import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11',ACTIVE='gym-active-workout-v11',DRAFT='gym-tracking-draft-v18',PENDING='gym-tracking-pending-v18',HISTORY='gym-tracking-history-v18',QUEUE='gym-queue-v11',OFF='gym-offline-v11';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());

const VARIANTS={
 'Schrägbankdrückmaschine dual':[
  {role:'Standard',name:'Schrägbankdrückmaschine dual',image:'IMG_3062.png'},
  {role:'Alternative 1',name:'Schrägbankmaschine sitzend',image:'IMG_3063.png'},
  {role:'Alternative 2',name:'Kurzhantel Schrägbankdrücken',image:'IMG_3071.png'},
  {role:'Alternative 3',name:'Bankdrückmaschine sitzend dual',image:'IMG_3048.png'}],
 'Kurzhantel-Schrägbankdrücken':[
  {role:'Standard',name:'Kurzhantel Schrägbankdrücken',image:'IMG_3071.png'},
  {role:'Alternative 1',name:'Schrägbankdrückmaschine dual',image:'IMG_3062.png'},
  {role:'Alternative 2',name:'Schrägbankmaschine sitzend',image:'IMG_3063.png'}],
 'Brustpresse sitzend':[
  {role:'Standard',name:'Brustpresse sitzend',image:'IMG_3047.png'},
  {role:'Alternative 1',name:'Bankdrückmaschine sitzend dual',image:'IMG_3048.png'},
  {role:'Alternative 2',name:'Bankdrückmaschine liegend dual',image:'IMG_3049.png'}],
 'Butterfly mit Griffen':[
  {role:'Standard',name:'Butterfly mit Griffen',image:'IMG_3050.png'},
  {role:'Alternative 1',name:'Butterfly mit Pads',image:'IMG_3051.png'}],
 'Seithebemaschine ohne Armpolster':[
  {role:'Standard',name:'Seithebemaschine ohne Armpolster',image:'IMG_3064.png'},
  {role:'Alternative 1',name:'Seithebemaschine dual ohne Armpolster',image:'IMG_3065.png'},
  {role:'Alternative 2',name:'Kurzhantel Seitheben sitzend',image:'IMG_3069.png'},
  {role:'Alternative 3',name:'Kurzhantel Seitheben stehend',image:'IMG_3070.png'}],
 'Trizepsmaschine Überkopf':[
  {role:'Standard',name:'Trizepsmaschine über Kopf',image:'IMG_3066.png'},
  {role:'Alternative 1',name:'Trizepsmaschine horizontal',image:'IMG_3067.png'},
  {role:'Alternative 2',name:'Trizeps Dip Maschine sitzend dual',image:'IMG_3068.png'}],
 'Bizepsmaschine':[
  {role:'Standard',name:'Bizepsmaschine',image:'IMG_3044.png'},
  {role:'Alternative 1',name:'Bizepsmaschine Plate loaded',image:'IMG_3045.png'},
  {role:'Alternative 2',name:'Scott Curler sitzend',image:'IMG_3046.png'}],
 'Bauchmuskelmaschine':[
  {role:'Standard',name:'Bauchmuskelmaschine',image:'IMG_3040.png'},
  {role:'Alternative 1',name:'Bauchmuskelmaschine Crunch liegend',image:'IMG_3041.png'},
  {role:'Alternative 2',name:'Klappsitz Bauchmaschine sitzend',image:'IMG_3042.png'},
  {role:'Alternative 3',name:'Klappsitz Bauchmaschine liegend, Plate loaded',image:'IMG_3043.png'}],
 'Latzugstation mit Oberschenkelpolster':[
  {role:'Standard',name:'Latzugstation mit Oberschenkelpolster',image:null},
  {role:'Alternative 1',name:'Rückenzugmaschine dual',image:null},
  {role:'Alternative 2',name:'High Row dual',image:null}],
 'Rudermaschine mit Brustpolster':[
  {role:'Standard',name:'Rudermaschine mit Brustpolster',image:null},
  {role:'Alternative 1',name:'Low Row dual',image:null},
  {role:'Alternative 2',name:'High Row dual',image:null}],
 'High Row dual':[
  {role:'Standard',name:'High Row dual',image:null},
  {role:'Alternative 1',name:'Rückenzugmaschine dual',image:null},
  {role:'Alternative 2',name:'Rudermaschine mit Brustpolster',image:null}],
 'Low Row dual':[
  {role:'Standard',name:'Low Row dual',image:null},
  {role:'Alternative 1',name:'Rudermaschine mit Brustpolster',image:null},
  {role:'Alternative 2',name:'High Row dual',image:null}],
 'Butterfly reverse mit Griffen':[
  {role:'Standard',name:'Butterfly reverse mit Griffen',image:null},
  {role:'Alternative 1',name:'Butterfly reverse mit Pads',image:null}]
};

function snapshot(){return read(SNAP,{workouts:{}})}
function active(){return read(ACTIVE,null)}
function draft(){return read(DRAFT,{})}
function draftKey(code,index){return `${code}:${index}`}
function history(){return read(HISTORY,{})}
function banner(title,message){const s=$('#error-stack');if(!s)return;const e=document.createElement('article');e.className='error-banner';e.innerHTML=`<strong>${title}</strong><p>${message}</p><button>×</button>`;e.querySelector('button').onclick=()=>e.remove();s.prepend(e)}
function exerciseData(code,index){return snapshot().workouts?.[code]?.exercises?.[index]||null}
function countFromMeta(text){return Number(text.match(/(\d+)\s*×/)?.[1]||3)}
function blankSet(){return {weight:'',reps:'',rir:'',warmup:false}}
function formatLast(row){if(!row?.sets?.length)return 'noch keine Daten';return row.sets.map(s=>`${Number(s.weight||0).toLocaleString('de-DE',{maximumFractionDigits:2})} kg × ${s.reps||0}`).join(' · ')}

function saveCard(card){const code=card.dataset.code,index=Number(card.dataset.index),key=draftKey(code,index),d=draft();d[key]={variantIndex:card._variantIndex||0,sets:[...card.querySelectorAll('.set-row:not(.header)')].map(r=>({weight:r.querySelector('[data-weight]').value,reps:r.querySelector('[data-reps]').value,rir:r.querySelector('[data-rir]').value,warmup:r.querySelector('[data-warmup]')?.checked||false})),updatedAt:new Date().toISOString()};write(DRAFT,d)}
function addSet(card,value=blankSet()){const table=card.querySelector('.set-table'),row=document.createElement('div');row.className='set-row';row.innerHTML=`<span class="set-label"></span><input data-weight inputmode="decimal" placeholder="kg" value="${value.weight??''}"><input data-reps inputmode="numeric" placeholder="Wdh" value="${value.reps??''}"><input data-rir inputmode="decimal" placeholder="RIR" value="${value.rir??''}"><label class="warmup-mini"><input data-warmup type="checkbox" ${value.warmup?'checked':''}> W</label>`;table.append(row);renumber(card);row.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>saveCard(card)))}
function renumber(card){card.querySelectorAll('.set-row:not(.header)').forEach((r,i)=>r.querySelector('.set-label').textContent=String(i+1));card.querySelector('[data-remove-set]').disabled=card.querySelectorAll('.set-row:not(.header)').length<=1}
function updateHistory(card){const v=card._variants[card._variantIndex],h=history(),same=h[v.name],standard=h[card._variants[0].name];card.querySelector('[data-last-device]').textContent=formatLast(same);card.querySelector('[data-last-standard]').textContent=formatLast(standard)}
function renderVariant(card){const v=card._variants[card._variantIndex];card.querySelector('[data-role]').textContent=v.role;card.querySelector('[data-name]').textContent=v.name;card.querySelector('[data-count]').textContent=`${card._variantIndex+1} / ${card._variants.length}`;card.querySelector('[data-media]').innerHTML=v.image?`<img src="${v.image}" alt="${v.name}">`:`<div class="no-image">Für dieses Gerät wurde noch kein Screenshot benannt.</div>`;card.querySelector('[data-prev]').disabled=card._variantIndex===0;card.querySelector('[data-next]').disabled=card._variantIndex===card._variants.length-1;updateHistory(card);saveCard(card)}

function buildCard(card,code,index){if(card.dataset.v18)return;const h=card.querySelector('h3'),name=h?.textContent.trim(),variants=VARIANTS[name];if(!variants)return;const data=exerciseData(code,index),meta=[...card.querySelectorAll('p')].find(p=>/\d+\s*×/.test(p.textContent))?.textContent||`${data?.target_sets||3} × ${data?.rep_min||''}–${data?.rep_max||''}`;const actions=card.querySelector('.exercise-actions');const saved=draft()[draftKey(code,index)]||{};card.dataset.v18='1';card.dataset.code=code;card.dataset.index=index;card._variants=variants;card._variantIndex=Math.min(saved.variantIndex||0,variants.length-1);card.innerHTML='';card.innerHTML=`<div class="exercise-v18-head"><div><h3>${name}</h3><p>${meta}</p></div><button type="button" class="info-button" aria-label="Übungsinformationen">i</button></div><div class="exercise-info-panel"><p>${data?.instructions||'Ausführungshinweise werden ergänzt.'}</p><p><strong>Intensität:</strong> ${data?.failure_rule||'Saubere Wiederholungen priorisieren.'}</p></div><section class="variant-shell"><div class="variant-nav"><button type="button" data-prev class="variant-arrow">‹</button><div class="variant-label"><small data-role></small><strong data-name></strong><span data-count></span></div><button type="button" data-next class="variant-arrow">›</button></div><figure data-media class="variant-media"></figure><div class="tracking-summary"><button type="button" class="tracking-toggle">Tracking öffnen</button><button type="button" class="rir-help">Was ist RIR?</button></div><div class="rir-explanation"><strong>RIR = Wiederholungen im Tank.</strong><p>RIR 2 bedeutet: Du hättest noch ungefähr zwei saubere Wiederholungen geschafft. RIR 0 bedeutet sauberes Muskelversagen.</p></div><section class="tracking-panel"><div class="tracking-last"><div><small>Letztes Mal an diesem Gerät</small><strong data-last-device></strong></div><div><small>Letztes Mal am Standard</small><strong data-last-standard></strong></div></div><div class="set-controls"><button type="button" data-add-set>+ Satz</button><button type="button" data-remove-set>− Satz</button></div><div class="set-table"><div class="set-row header"><span>Satz</span><span>Gewicht</span><span>Wdh.</span><span>RIR</span><span>Warm-up</span></div></div><p class="overload-note">Progressive Overload: Erst im Zielbereich Wiederholungen steigern. Wenn alle Arbeitssätze das obere Ende sauber erreichen, Gewicht beim nächsten Mal erhöhen.</p></section></section>`;if(actions)card.append(actions);const sets=saved.sets?.length?saved.sets:Array.from({length:countFromMeta(meta)},blankSet);sets.forEach(s=>addSet(card,s));
 card.querySelector('.info-button').onclick=()=>card.querySelector('.exercise-info-panel').classList.toggle('open');card.querySelector('.tracking-toggle').onclick=e=>{const p=card.querySelector('.tracking-panel');p.classList.toggle('open');e.currentTarget.textContent=p.classList.contains('open')?'Tracking schließen':'Tracking öffnen'};card.querySelector('.rir-help').onclick=()=>card.querySelector('.rir-explanation').classList.toggle('open');card.querySelector('[data-add-set]').onclick=()=>{addSet(card);saveCard(card)};card.querySelector('[data-remove-set]').onclick=()=>{const rows=card.querySelectorAll('.set-row:not(.header)');if(rows.length>1)rows[rows.length-1].remove();renumber(card);saveCard(card)};card.querySelector('[data-prev]').onclick=()=>{card._variantIndex=Math.max(0,card._variantIndex-1);renderVariant(card)};card.querySelector('[data-next]').onclick=()=>{card._variantIndex=Math.min(card._variants.length-1,card._variantIndex+1);renderVariant(card)};let x=null;card.querySelector('.variant-shell').addEventListener('touchstart',e=>x=e.touches[0].clientX,{passive:true});card.querySelector('.variant-shell').addEventListener('touchend',e=>{if(x===null)return;const d=e.changedTouches[0].clientX-x;if(Math.abs(d)>50){card._variantIndex=Math.max(0,Math.min(card._variants.length-1,card._variantIndex+(d<0?1:-1)));renderVariant(card)}x=null},{passive:true});renderVariant(card)}
function enhance(){const a=active(),code=a?.code||$('#dialog-title')?.textContent?.match(/\b([AB])\b/)?.[1];if(!code)return;$$('#exercise-list .exercise-card').forEach((c,i)=>buildCard(c,code,i))}

function collectPending(){const a=active();if(!a)return null;const d=draft(),s=snapshot(),w=s.workouts?.[a.code];return {code:a.code,planWorkoutId:w?.id,createdAt:new Date().toISOString(),exercises:(w?.exercises||[]).map((e,i)=>{const v=VARIANTS[e.name]?.[d[draftKey(a.code,i)]?.variantIndex||0]||{name:e.name};return {order:i+1,planExerciseId:e.id,standardExerciseId:e.exercise_id,variantName:v.name,status:a.statuses?.[i]||'pending',sets:(d[draftKey(a.code,i)]?.sets||[]).filter(x=>x.weight||x.reps||x.rir||x.warmup)}})}}
async function ensureExercise(userId,name,standardId){const ex=await supabase.from('exercises').select('id').eq('owner_id',userId).ilike('name',name).limit(1);if(ex.error)throw ex.error;if(ex.data?.[0])return ex.data[0].id;if(standardId&&name===undefined)return standardId;const ins=await supabase.from('exercises').insert({owner_id:userId,name,studio:'John Reed',equipment:'Gerätevariante',is_shared_catalogue:false,is_active:true}).select('id').single();if(ins.error)throw ins.error;return ins.data.id}
async function syncPending(){if(!online())return;const p=read(PENDING,null);if(!p)return;const {data:u,error:ue}=await supabase.auth.getUser();if(ue||!u.user)return;const wr=await supabase.from('workouts').select('id').eq('user_id',u.user.id).eq('plan_workout_id',p.planWorkoutId).eq('workout_date',today()).order('created_at',{ascending:false}).limit(1);if(wr.error||!wr.data?.length)return;const workoutId=wr.data[0].id;const existing=await supabase.from('workout_exercises').select('id').eq('workout_id',workoutId).limit(1);if(existing.data?.length){localStorage.removeItem(PENDING);localStorage.removeItem(DRAFT);return}for(const e of p.exercises){const exerciseId=await ensureExercise(u.user.id,e.variantName,e.standardExerciseId);const we=await supabase.from('workout_exercises').insert({user_id:u.user.id,workout_id:workoutId,plan_exercise_id:e.planExerciseId,exercise_id:exerciseId,exercise_order:e.order,status:e.status==='completed'?'completed':e.status==='skipped'?'skipped':'not_completed'}).select('id').single();if(we.error)throw we.error;const rows=e.sets.map((set,i)=>({user_id:u.user.id,workout_exercise_id:we.data.id,set_number:i+1,weight_kg:set.weight===''?null:Number(String(set.weight).replace(',','.')),repetitions:set.reps===''?null:Number(set.reps),rir:set.rir===''?null:Math.round(Number(String(set.rir).replace(',','.'))),completed:Boolean(set.weight||set.reps),notes:set.warmup?'warmup':''}));if(rows.length){const sr=await supabase.from('workout_sets').insert(rows);if(sr.error)throw sr.error}}
 const h=history();p.exercises.forEach(e=>{if(e.sets.length)h[e.variantName]={date:today(),sets:e.sets.map(x=>({weight:x.weight,reps:x.reps,rir:x.rir}))}});write(HISTORY,h);localStorage.removeItem(PENDING);localStorage.removeItem(DRAFT);banner('Tracking synchronisiert','Satzdaten und verwendete Geräte wurden gespeichert.')}

function patchWeight(){const latest=$('#latest-weight'),s=read(SNAP,{weights:[]}),last=s.weights?.at(-1);if(latest&&last)latest.textContent=`${Number(last.weight_kg).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} kg`;const label=[...$$('#page-weight small')].find(x=>x.textContent.trim()==='Späte Mahlzeit?');if(label){label.textContent='Nachts oder spät noch gegessen?';if(!label.parentElement.querySelector('.field-help'))label.insertAdjacentHTML('afterend','<p class="field-help">Gemeint ist Essen wenige Stunden vor dem Wiegen, etwa dein nächtliches Toast. Das kann den Messwert kurzfristig erhöhen.</p>')}}
function patchHeader(){if($('#page-title')?.textContent==='Trainingsplan')$('#page-title').textContent='Trainingsplan Dave';const off=$('#offline-toggle'),sync=$('#sync-now'),conn=$('#connection-status'),q=read(QUEUE,[]).length;if(off)off.textContent=localStorage.getItem(OFF)==='1'?'Online nutzen':'Offline erzwingen';if(sync)sync.textContent=q?`Sync (${q})`:'Sync';if(conn)conn.textContent=navigator.onLine?'Online':'Kein Netz'}

let completing=false;document.addEventListener('click',e=>{if(e.target.closest('[data-workout],#start-workout'))setTimeout(enhance,20);if(e.target.closest('[data-page="plan"]'))setTimeout(()=>{$('#page-title').textContent='Trainingsplan Dave'},20);const complete=e.target.closest('#complete-workout');if(complete&&!completing){e.preventDefault();e.stopImmediatePropagation();if(!confirm('Training wirklich abschließen? Danach wird die Einheit im Kalender als abgeschlossen gespeichert.'))return;const p=collectPending();if(p)write(PENDING,p);completing=true;complete.click();setTimeout(()=>completing=false,500)}},true);
window.addEventListener('load',()=>{patchWeight();patchHeader();setTimeout(()=>{patchWeight();patchHeader();enhance();syncPending().catch(e=>banner('Tracking noch nicht synchronisiert',e.message))},500)});window.addEventListener('online',()=>syncPending().catch(()=>{}));setInterval(patchHeader,1500);
