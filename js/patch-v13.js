import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const $=s=>document.querySelector(s);
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const pd=s=>new Date(`${s}T12:00:00`);
const addDays=(date,n)=>{const d=pd(date);d.setDate(d.getDate()+n);return iso(d)};
const snap=()=>read(SNAP,{schedule:[],completed:[],workouts:{}});

const EXERCISES={
 'Schrägbankdrückmaschine dual':{img:'IMG_3046.png',alts:['Schrägbankmaschine sitzend','Kurzhantel-Schrägbankdrücken','Bankdrückmaschine sitzend dual']},
 'Kurzhantel-Schrägbankdrücken':{img:'IMG_3046.png',alts:['Schrägbankdrückmaschine dual','Schrägbankmaschine sitzend']},
 'Latzugstation mit Oberschenkelpolster':{img:'IMG_3052.png',alts:['Rückenzugmaschine dual','Rückenzugmaschine','High Row dual']},
 'Brustpresse sitzend':{img:'IMG_3065.png',alts:['Bankdrückmaschine sitzend dual','Innere Brustpresse','Bankdrückmaschine liegend dual']},
 'Rudermaschine mit Brustpolster':{img:'IMG_3050.png',alts:['Low Row dual','Rudermaschine sitzend dual','High Row dual']},
 'High Row dual':{img:'IMG_3056.png',alts:['Rückenzugmaschine dual','Rudermaschine mit Brustpolster','Low Row dual']},
 'Low Row dual':{img:'IMG_3052.png',alts:['Rudermaschine mit Brustpolster','Rudermaschine sitzend dual','High Row dual']},
 'Seithebemaschine ohne Armpolster':{img:'IMG_3045.png',alts:['Seithebemaschine dual ohne Armpolster','Kabelzug-Seitheben','Kurzhantel-Seitheben']},
 'Butterfly reverse mit Griffen':{img:'IMG_3066.png',alts:['Butterfly Reverse dual','Kabelzug Reverse Butterfly','Butterfly reverse mit Pads']},
 'Butterfly mit Griffen':{img:'IMG_3066.png',alts:['Butterfly dual','Butterfly mit Pads','Kabelzug Fliegende stehend']},
 'Trizepsmaschine Überkopf':{img:'IMG_3043.png',alts:['Trizepsmaschine horizontal','Trizeps Dip Maschine sitzend dual','Kabelzug Trizeps über Kopf']},
 'Bizepsmaschine':{img:'IMG_3064.png',alts:['Bizepsmaschine dual','Bizepsmaschine Plateloaded','Scott Curler sitzend']},
 'Bauchmuskelmaschine':{img:'IMG_3070.png',alts:['Klappsitz Bauchmaschine sitzend','Bauchmuskelmaschine Crunch liegend','Beinhebestation']}
};

function compactHeader(){
 const top=$('.topbar'),line=$('.status-line');if(!top||!line||top.querySelector('.topbar-status'))return;
 const wrap=document.createElement('div');wrap.className='topbar-status';
 const offline=$('#offline-toggle'),sync=$('#sync-now'),connection=$('#connection-status'),count=$('#sync-count');
 if(offline){offline.textContent='Offline';wrap.append(offline)}
 if(sync){sync.textContent='Sync';wrap.append(sync)}
 if(connection)wrap.append(connection);if(count)wrap.append(count);
 top.insertBefore(wrap,$('#theme-toggle'));line.remove();
}

function enhanceExercises(){
 document.querySelectorAll('#exercise-list .exercise-card').forEach(card=>{
  if(card.dataset.enhancedV13)return;
  const h=card.querySelector('h3');if(!h)return;const cfg=EXERCISES[h.textContent.trim()];if(!cfg)return;
  card.dataset.enhancedV13='1';
  const existing=[...card.childNodes];const body=document.createElement('div');body.className='exercise-content-v13';existing.forEach(n=>body.append(n));
  const media=document.createElement('div');media.className='exercise-media';media.innerHTML=`<img src="${cfg.img}" alt="${h.textContent.trim()} bei John Reed" loading="lazy">`;
  const details=document.createElement('details');details.className='exercise-alternatives';details.innerHTML=`<summary>Alternative Geräte</summary><ul>${cfg.alts.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  body.append(details);card.append(media,body);
 });
}

async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw error||new Error('Nicht angemeldet');return data.user}
async function replaceFuture(startDate,startCode,count=18){
 const s=snap(),ids={A:s.workouts?.A?.id,B:s.workouts?.B?.id};if(!ids.A||!ids.B)throw new Error('Trainingsplan nicht vollständig geladen.');
 const user=await currentUser();const future=(s.schedule||[]).filter(x=>x.date>=startDate&&['planned','confirmed','started'].includes(x.status));
 if(future.length){const {error}=await supabase.from('scheduled_workouts').delete().in('id',future.map(x=>x.id));if(error)throw error}
 const rows=[];let code=startCode;for(let i=0;i<Math.max(count,future.length);i++){rows.push({user_id:user.id,plan_workout_id:ids[code],scheduled_date:addDays(startDate,i*2),status:'planned'});code=code==='A'?'B':'A'}
 const {error}=await supabase.from('scheduled_workouts').insert(rows);if(error)throw error;
}

function completedDialog(entry){
 let d=$('#completed-actions-v13');if(!d){d=document.createElement('dialog');d.id='completed-actions-v13';d.className='completed-actions-dialog';document.body.append(d)}
 d.innerHTML=`<div class="dialog-head"><div><small>ABGESCHLOSSEN</small><h2>Training ${entry.code}</h2></div><button class="dialog-close" data-close>Schließen</button></div><p>${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long'}).format(pd(entry.date))}</p><div class="form-grid"><button class="secondary" data-undo>Abschluss rückgängig machen</button><button class="danger" data-remove>Aus Kalender entfernen</button></div>`;
 d.querySelector('[data-close]').onclick=()=>d.close();
 d.querySelector('[data-undo]').onclick=async()=>{try{const {error}=await supabase.from('workouts').delete().eq('id',entry.id);if(error)throw error;const s=snap();const exists=(s.schedule||[]).some(x=>x.date===entry.date);if(!exists){const user=await currentUser();const wid=s.workouts?.[entry.code]?.id;const r=await supabase.from('scheduled_workouts').insert({user_id:user.id,plan_workout_id:wid,scheduled_date:entry.date,status:'planned'});if(r.error)throw r.error}location.reload()}catch(e){alert(e.message)}};
 d.querySelector('[data-remove]').onclick=async()=>{try{const {error}=await supabase.from('workouts').delete().eq('id',entry.id);if(error)throw error;await replaceFuture(addDays(entry.date,2),entry.code==='A'?'B':'A');location.reload()}catch(e){alert(e.message)}};
 d.showModal();
}

async function repairNextAfterLatestCompletion(){
 const s=snap(),done=(s.completed||[]).slice().sort((a,b)=>b.date.localeCompare(a.date))[0];if(!done)return;
 const future=(s.schedule||[]).filter(x=>x.date>done.date&&['planned','confirmed','started'].includes(x.status)).sort((a,b)=>a.date.localeCompare(b.date));
 const expectedDate=addDays(done.date,2),expectedCode=done.code==='A'?'B':'A';
 if(future[0]&&(future[0].date!==expectedDate||future[0].code!==expectedCode)){
  try{await replaceFuture(expectedDate,expectedCode,Math.max(18,future.length));location.reload()}catch(e){console.error('Kalenderreparatur fehlgeschlagen',e)}
 }
}

document.addEventListener('click',e=>{
 const day=e.target.closest('[data-calendar-grid] .calendar-day.completed');if(day){e.preventDefault();e.stopImmediatePropagation();const entry=(snap().completed||[]).find(x=>x.date===day.dataset.date);if(entry)completedDialog(entry)}
},true);

const observer=new MutationObserver(()=>enhanceExercises());observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>{compactHeader();enhanceExercises();setTimeout(repairNextAfterLatestCompletion,1000)});
setTimeout(()=>{compactHeader();enhanceExercises()},300);
