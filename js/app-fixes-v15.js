import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const MOVE='gym-fast-move-v15';
const $=s=>document.querySelector(s);
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const pd=s=>new Date(`${s}T12:00:00`);
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const addDays=(date,n)=>{const d=pd(date);d.setDate(d.getDate()+n);return iso(d)};
const snap=()=>read(SNAP,{schedule:[],completed:[],workouts:{}});

const INFO={
 'Schrägbankdrückmaschine dual':{image:'IMG_3046.png',device:'Schrägbankdrückmaschine dual',setup:'Sitz so einstellen, dass die Griffe etwa auf Höhe der oberen Brust liegen. Schulterblätter an der Lehne lassen und beide Seiten kontrolliert drücken.',alts:['Schrägbankmaschine sitzend','Kurzhantel-Schrägbankdrücken bei 20–30°','Bankdrückmaschine sitzend dual']},
 'Kurzhantel-Schrägbankdrücken':{image:'IMG_3046.png',device:'Verstellbare Bank und Kurzhanteln',setup:'Bank auf 20–30° stellen. Hanteln seitlich der oberen Brust absenken. Allein nicht bis zu einem unsicheren Fehlversuch gehen.',alts:['Schrägbankdrückmaschine dual','Schrägbankmaschine sitzend','Bankdrückmaschine sitzend dual']},
 'Latzugstation mit Oberschenkelpolster':{image:'pics_johnreed/IMG_3052.png',device:'Latzugstation mit Oberschenkelpolster',setup:'Mittleren neutralen oder leicht schulterbreiten Griff verwenden. Vor den Körper bis zur oberen Brust ziehen. Ellbogen Richtung Hosentaschen führen. Nicht in den Nacken ziehen und nicht zurückschwingen.',alts:['Rückenzugmaschine dual','Rückenzugmaschine mit neutralem Griff','High Row dual']},
 'Brustpresse sitzend':{image:'IMG_3065.png',device:'Brustpresse sitzend',setup:'Sitz so einstellen, dass die Griffe auf mittlerer Brusthöhe liegen. Schulterblätter an der Lehne halten und Ellbogen nicht extrem weit ausstellen.',alts:['Bankdrückmaschine sitzend dual','Innere Brustpresse','Bankdrückmaschine liegend dual']},
 'Rudermaschine mit Brustpolster':{image:'IMG_3050.png',device:'Rudermaschine mit Brustpolster',setup:'Brust während des Satzes am Polster lassen. Neutral greifen, Ellbogen zum unteren Rippenbogen führen und vorne kontrolliert strecken.',alts:['Low Row dual','Rudermaschine sitzend dual','High Row dual']},
 'Seithebemaschine ohne Armpolster':{image:'IMG_3045.png',device:'Seithebemaschine ohne Armpolster',setup:'Griffe seitlich führen, Ellbogen leicht gebeugt. Bis ungefähr Schulterhöhe heben. Oberkörper und Nacken bleiben ruhig.',alts:['Seithebemaschine dual ohne Armpolster','Einarmiges Kabelzug-Seitheben','Kurzhantel-Seitheben']},
 'Butterfly reverse mit Griffen':{image:'IMG_3066.png',device:'Butterfly reverse mit Griffen',setup:'Mit der Brust zur Lehne sitzen. Griffe auf Schulterhöhe fassen, Schultern unten lassen und kontrolliert nach außen führen.',alts:['Butterfly Reverse dual','Kabelzug Reverse Butterfly','Butterfly reverse mit Pads']},
 'Bauchmuskelmaschine':{image:'IMG_3070.png',device:'Bauchmuskelmaschine',setup:'Brustkorb kontrolliert Richtung Becken einrollen. Nicht nur aus der Hüfte klappen und langsam zurückführen.',alts:['Klappsitz-Bauchmaschine sitzend','Bauchmuskelmaschine Crunch liegend','Kabel-Crunch']},
 'High Row dual':{image:'pics_johnreed/IMG_3056.png',device:'High Row dual',setup:'Brust am Polster halten. Griffe von oben nach hinten und leicht unten ziehen. Die Bewegung mit den Ellbogen führen.',alts:['Rückenzugmaschine dual','Rudermaschine mit Brustpolster','Latzug mit neutralem Griff']},
 'Butterfly mit Griffen':{image:'IMG_3066.png',device:'Butterfly mit Griffen',setup:'Hände und Ellbogen etwa auf Brusthöhe. Kontrolliert öffnen und vorne zusammenführen, ohne die Schultern vorzuschieben.',alts:['Butterfly dual','Butterfly mit Pads','Kabelzug Fliegende stehend']},
 'Low Row dual':{image:'pics_johnreed/IMG_3052.png',device:'Low Row dual',setup:'Brust stabil halten. Griffe zum oberen Bauch ziehen. Nicht zurücklehnen oder reißen.',alts:['Rudermaschine mit Brustpolster','Rudermaschine sitzend dual','High Row dual']},
 'Trizepsmaschine Überkopf':{image:'IMG_3043.png',device:'Trizepsmaschine Überkopf',setup:'Oberarme möglichst stabil neben dem Kopf halten. Ellbogen kontrolliert beugen und strecken. Schultern nicht hochziehen.',alts:['Trizepsmaschine horizontal','Trizeps Dip Maschine sitzend dual','Kabelzug-Trizeps über Kopf']},
 'Bizepsmaschine':{image:'IMG_3064.png',device:'Bizepsmaschine',setup:'Oberarme vollständig auf dem Polster lassen. Unten kontrolliert strecken und nicht mit dem Oberkörper nachhelfen.',alts:['Bizepsmaschine dual','Bizepsmaschine Plateloaded','Scott Curler sitzend']}
};

function banner(title,message){
 const stack=$('#error-stack');if(!stack)return;
 const el=document.createElement('article');el.className='error-banner';
 el.innerHTML=`<strong>${title}</strong><p>${message}</p><button aria-label="Schließen">×</button>`;
 el.querySelector('button').onclick=()=>el.remove();stack.prepend(el);
}

function compactHeader(){
 const top=$('.topbar'),line=$('.status-line');if(!top||top.querySelector('.topbar-status'))return;
 const wrap=document.createElement('div');wrap.className='topbar-status';
 for(const [id,text] of [['offline-toggle','Offline'],['sync-now','Sync'],['connection-status',null],['sync-count',null]]){
  const el=$(`#${id}`);if(!el)continue;if(text)el.textContent=text;wrap.append(el);
 }
 top.insertBefore(wrap,$('#theme-toggle'));line?.remove();
}

function renderExerciseMedia(){
 document.querySelectorAll('#exercise-list .exercise-card').forEach(card=>{
  if(card.dataset.mediaReady==='1')return;
  const name=card.querySelector('h3')?.textContent.trim(),info=INFO[name];if(!info)return;
  card.dataset.mediaReady='1';
  const media=document.createElement('figure');media.className='exercise-media';
  media.innerHTML=`<img src="${info.image}" alt="${info.device}" loading="eager"><figcaption>${info.device}</figcaption>`;
  const guide=document.createElement('div');guide.className='exercise-guidance-v14';
  guide.innerHTML=`<strong>So führst du sie aus</strong><p>${info.setup}</p>`;
  const alternatives=document.createElement('div');alternatives.className='exercise-alternatives-v14';
  alternatives.innerHTML=`<strong>Falls besetzt: Alternative</strong>${info.alts.map((x,i)=>`<span>${i+1}. ${x}</span>`).join('')}`;
  card.prepend(media);card.querySelector('.exercise-actions')?.before(guide,alternatives);
 });
}

function repaintCalendars(){
 const s=snap();
 document.querySelectorAll('[data-calendar-grid]').forEach(grid=>{
  grid.querySelectorAll('.calendar-day').forEach(day=>{
   const date=day.dataset.date;
   const planned=s.schedule.find(x=>x.date===date&&['planned','confirmed','started'].includes(x.status));
   const completed=s.completed.find(x=>x.date===date);
   day.classList.toggle('planned',!!planned&&!completed);day.classList.toggle('completed',!!completed);
   day.dataset.id=planned?.id||'';
   day.querySelector('.plan-badge')?.remove();
   if(completed||planned){const badge=document.createElement('small');badge.className='plan-badge';badge.textContent=completed?`${completed.code} ✓`:planned.code;day.append(badge)}
  });
 });
}

async function fastRotate(sourceId,newDate){
 const s=snap(),source=s.schedule.find(x=>String(x.id)===String(sourceId));if(!source)throw new Error('Termin nicht gefunden.');
 const future=s.schedule.filter(x=>x.date>=source.date&&['planned','confirmed','started'].includes(x.status)).sort((a,b)=>a.date.localeCompare(b.date));
 const earlier=s.schedule.filter(x=>x.date<source.date&&['planned','confirmed','started'].includes(x.status));
 if(earlier.some(x=>x.date===newDate))throw new Error('An diesem Tag liegt bereits ein Termin.');
 let code=source.code;
 future.forEach((x,i)=>{x.date=addDays(newDate,i*2);x.code=code;code=code==='A'?'B':'A'});
 write(SNAP,s);repaintCalendars();$('#planning-dialog')?.close();banner('Kalender aktualisiert','Die Anzeige ist sofort angepasst. Die Speicherung läuft im Hintergrund.');
 const {data:userData,error:userError}=await supabase.auth.getUser();if(userError||!userData.user)throw userError||new Error('Nicht angemeldet.');
 const ids={A:s.workouts?.A?.id,B:s.workouts?.B?.id};
 const oldIds=future.map(x=>x.id).filter(x=>!String(x).startsWith('local-'));
 if(oldIds.length){const del=await supabase.from('scheduled_workouts').delete().in('id',oldIds);if(del.error)throw del.error}
 const rows=future.map(x=>({user_id:userData.user.id,plan_workout_id:ids[x.code],scheduled_date:x.date,status:'planned'}));
 const ins=await supabase.from('scheduled_workouts').insert(rows);if(ins.error)throw ins.error;
 setTimeout(()=>location.reload(),250);
}

async function deleteCompletion(entry,restore){
 const r=await supabase.from('workouts').delete().eq('id',entry.id);if(r.error)throw r.error;
 if(restore){const s=snap(),w=s.workouts?.[entry.code];const {data}=await supabase.auth.getUser();const ins=await supabase.from('scheduled_workouts').insert({user_id:data.user.id,plan_workout_id:w.id,scheduled_date:entry.date,status:'planned'});if(ins.error)throw ins.error}
 localStorage.removeItem(SNAP);location.reload();
}

function completedDialog(entry){
 let d=$('#completed-actions-v15');if(!d){d=document.createElement('dialog');d.id='completed-actions-v15';document.body.append(d)}
 d.innerHTML=`<div class="dialog-head"><div><small>ABGESCHLOSSEN</small><h2>Training ${entry.code}</h2></div><button class="dialog-close" data-close>Schließen</button></div><p>${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(pd(entry.date))}</p><div class="form-grid"><button class="secondary" data-restore>Abschluss rückgängig machen</button><button class="danger" data-delete>Testeintrag vollständig löschen</button></div>`;
 d.querySelector('[data-close]').onclick=()=>d.close();
 d.querySelector('[data-restore]').onclick=()=>deleteCompletion(entry,true).catch(e=>banner('Fehler',e.message));
 d.querySelector('[data-delete]').onclick=()=>deleteCompletion(entry,false).catch(e=>banner('Fehler',e.message));d.showModal();
}

document.addEventListener('click',e=>{
 const workout=e.target.closest('[data-workout],#start-workout');if(workout)setTimeout(renderExerciseMedia,0);
 const completed=e.target.closest('[data-calendar-grid] .calendar-day.completed');
 if(completed){e.preventDefault();e.stopImmediatePropagation();const entry=snap().completed.filter(x=>x.date===completed.dataset.date).at(-1);if(entry)completedDialog(entry);return}
 const move=e.target.closest('#planning-move');
 if(move){e.preventDefault();e.stopImmediatePropagation();const date=$('#planning-dialog')?.dataset.date;const item=snap().schedule.find(x=>x.date===date&&['planned','confirmed','started'].includes(x.status));if(!item)return banner('Fehler','Termin nicht gefunden.');sessionStorage.setItem(MOVE,item.id);$('#planning-dialog')?.close();banner('Neuen Tag auswählen',`Training ${item.code} ist markiert.`);return}
 const day=e.target.closest('[data-calendar-grid] .calendar-day');const id=sessionStorage.getItem(MOVE);
 if(day&&id){e.preventDefault();e.stopImmediatePropagation();sessionStorage.removeItem(MOVE);fastRotate(id,day.dataset.date).catch(err=>{banner('Termin konnte nicht gespeichert werden',err.message);location.reload()});}
},true);

window.addEventListener('load',()=>{compactHeader();setTimeout(compactHeader,250)});
