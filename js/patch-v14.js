import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const $=s=>document.querySelector(s);
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const snap=()=>read(SNAP,{schedule:[],completed:[],workouts:{}});
const pd=s=>new Date(`${s}T12:00:00`);

const EXERCISE_INFO={
  'Schrägbankdrückmaschine dual':{
    image:'IMG_3046.png',device:'Schrägbankdrückmaschine dual',setup:'Sitz so einstellen, dass die Griffe etwa auf Höhe der oberen Brust liegen. Beide Seiten gleichzeitig drücken; Schulterblätter bleiben an der Lehne.',alternatives:['Schrägbankmaschine sitzend','Kurzhantel-Schrägbankdrücken bei 20–30°','Bankdrückmaschine sitzend dual']},
  'Kurzhantel-Schrägbankdrücken':{
    image:'IMG_3046.png',device:'Verstellbare Bank + Kurzhanteln',setup:'Bank auf 20–30° stellen. Hanteln seitlich der oberen Brust absenken und kontrolliert nach oben drücken. Nicht allein bis zu einem unsicheren Fehlversuch gehen.',alternatives:['Schrägbankdrückmaschine dual','Schrägbankmaschine sitzend','Bankdrückmaschine sitzend dual']},
  'Latzugstation mit Oberschenkelpolster':{
    image:'pics_johnreed/IMG_3052.png',device:'Latzugstation mit Oberschenkelpolster',setup:'Mittleren neutralen oder leicht schulterbreiten Griff verwenden. Brust leicht anheben, Ellbogen nach unten Richtung Hosentaschen ziehen, Griff vor den Körper bis zur oberen Brust. Nicht in den Nacken ziehen und nicht zurückschwingen.',alternatives:['Rückenzugmaschine dual','Rückenzugmaschine mit neutralem Griff','High Row dual']},
  'Brustpresse sitzend':{
    image:'IMG_3065.png',device:'Brustpresse sitzend',setup:'Sitz so einstellen, dass die Griffe auf mittlerer Brusthöhe liegen. Schulterblätter an der Lehne halten; Ellbogen nicht extrem weit nach außen stellen.',alternatives:['Bankdrückmaschine sitzend dual','Innere Brustpresse','Bankdrückmaschine liegend dual']},
  'Rudermaschine mit Brustpolster':{
    image:'IMG_3050.png',device:'Rudermaschine mit Brustpolster',setup:'Brust während des gesamten Satzes am Polster lassen. Neutralen Griff verwenden und die Ellbogen nach hinten zum unteren Rippenbogen führen. Vorne kontrolliert vollständig strecken.',alternatives:['Low Row dual','Rudermaschine sitzend dual','High Row dual']},
  'Seithebemaschine ohne Armpolster':{
    image:'IMG_3045.png',device:'Seithebemaschine ohne Armpolster',setup:'Griffe seitlich führen, Ellbogen leicht gebeugt. Nur bis ungefähr Schulterhöhe heben; Oberkörper und Nacken ruhig halten.',alternatives:['Seithebemaschine dual ohne Armpolster','Einarmiges Kabelzug-Seitheben','Kurzhantel-Seitheben']},
  'Butterfly reverse mit Griffen':{
    image:'IMG_3066.png',device:'Butterfly reverse mit Griffen',setup:'Mit der Brust zur Lehne sitzen. Griffe auf Schulterhöhe fassen, Schultern unten lassen und Arme kontrolliert nach außen führen. Kopf nicht vorschieben.',alternatives:['Butterfly Reverse dual','Kabelzug Reverse Butterfly','Butterfly reverse mit Pads']},
  'Bauchmuskelmaschine':{
    image:'IMG_3070.png',device:'Bauchmuskelmaschine',setup:'Nicht nur aus der Hüfte klappen. Brustkorb kontrolliert Richtung Becken einrollen und anschließend langsam zurückführen.',alternatives:['Klappsitz-Bauchmaschine sitzend','Bauchmuskelmaschine Crunch liegend','Kabel-Crunch']},
  'High Row dual':{
    image:'pics_johnreed/IMG_3056.png',device:'High Row dual',setup:'Brust am Polster halten. Griffe von oben nach hinten und leicht unten ziehen; Bewegung mit den Ellbogen führen. Beide Arme arbeiten unabhängig.',alternatives:['Rückenzugmaschine dual','Rudermaschine mit Brustpolster','Latzug mit neutralem Griff']},
  'Butterfly mit Griffen':{
    image:'IMG_3066.png',device:'Butterfly mit Griffen',setup:'Sitz so einstellen, dass Hände und Ellbogen ungefähr auf Brusthöhe liegen. Weit, aber kontrolliert öffnen und vorne zusammenführen, ohne die Schultern vorzuschieben.',alternatives:['Butterfly dual','Butterfly mit Pads','Kabelzug Fliegende stehend']},
  'Low Row dual':{
    image:'pics_johnreed/IMG_3052.png',device:'Low Row dual',setup:'Brust stabil halten. Griffe zum oberen Bauch ziehen; Ellbogen eng bis moderat nach außen. Kein Zurücklehnen oder Reißen.',alternatives:['Rudermaschine mit Brustpolster','Rudermaschine sitzend dual','High Row dual']},
  'Trizepsmaschine Überkopf':{
    image:'IMG_3043.png',device:'Trizepsmaschine Überkopf',setup:'Oberarme möglichst stabil neben dem Kopf halten. Ellbogen vollständig kontrolliert beugen und strecken; Schulter nicht hochziehen.',alternatives:['Trizepsmaschine horizontal','Trizeps Dip Maschine sitzend dual','Kabelzug-Trizeps über Kopf']},
  'Bizepsmaschine':{
    image:'IMG_3064.png',device:'Bizepsmaschine',setup:'Oberarme vollständig auf dem Polster lassen. Unten kontrolliert strecken, ohne den Ellbogen hart durchzudrücken; nicht mit dem Oberkörper nachhelfen.',alternatives:['Bizepsmaschine dual','Bizepsmaschine Plateloaded','Scott Curler sitzend']}
};

function banner(title,message){
  const stack=$('#error-stack');if(!stack)return alert(`${title}: ${message}`);
  const item=document.createElement('article');item.className='error-banner';
  item.innerHTML=`<strong>${title}</strong><p>${message}</p><button aria-label="Schließen">×</button>`;
  item.querySelector('button').onclick=()=>item.remove();stack.prepend(item);
}

function addExerciseContent(){
  document.querySelectorAll('#exercise-list .exercise-card').forEach(card=>{
    const heading=card.querySelector('h3');if(!heading)return;
    const name=heading.textContent.trim();const info=EXERCISE_INFO[name];if(!info)return;
    card.querySelectorAll('.exercise-media,.exercise-guidance-v14,.exercise-alternatives-v14').forEach(x=>x.remove());
    const media=document.createElement('figure');media.className='exercise-media';
    media.innerHTML=`<img src="${info.image}" alt="John-Reed-Übersicht mit ${info.device}" loading="eager"><figcaption>${info.device}</figcaption>`;
    const guide=document.createElement('div');guide.className='exercise-guidance-v14';
    const dbInstruction=[...card.querySelectorAll('p')].map(x=>x.textContent).find(x=>x&&!x.includes('×'));
    guide.innerHTML=`<strong>So führst du sie aus</strong><p>${info.setup}</p>${dbInstruction?`<p class="db-note">Plan-Hinweis: ${dbInstruction}</p>`:''}`;
    const alternatives=document.createElement('div');alternatives.className='exercise-alternatives-v14';
    alternatives.innerHTML=`<strong>Falls besetzt: Alternative</strong>${info.alternatives.map((x,i)=>`<span>${i+1}. ${x}</span>`).join('')}`;
    card.prepend(media);card.querySelector('.exercise-actions')?.before(guide,alternatives);
  });
}

async function deleteCompletion(entry,restorePlan){
  const {error}=await supabase.from('workouts').delete().eq('id',entry.id);if(error)throw error;
  if(restorePlan){
    const s=snap();
    const existing=(s.schedule||[]).some(x=>x.date===entry.date);
    if(!existing){
      const {data:userData,error:userError}=await supabase.auth.getUser();if(userError||!userData.user)throw userError||new Error('Nicht angemeldet');
      const planWorkoutId=s.workouts?.[entry.code]?.id;if(!planWorkoutId)throw new Error('Training konnte nicht zugeordnet werden.');
      const {error:insertError}=await supabase.from('scheduled_workouts').insert({user_id:userData.user.id,plan_workout_id:planWorkoutId,scheduled_date:entry.date,status:'planned'});if(insertError)throw insertError;
    }
  }
  localStorage.removeItem(SNAP);
  location.reload();
}

function openCompleted(entry){
  let dialog=$('#completed-actions-v14');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='completed-actions-v14';document.body.append(dialog)}
  dialog.innerHTML=`<div class="dialog-head"><div><small>ABGESCHLOSSENES TRAINING</small><h2>Training ${entry.code}</h2></div><button class="dialog-close" data-close>Schließen</button></div><p>${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(pd(entry.date))}</p><p>Dieser Eintrag stammt aus der Tabelle der absolvierten Trainings. Deshalb muss er dort gelöscht werden – nicht nur aus der Terminplanung.</p><div class="form-grid"><button class="secondary" data-restore>Abschluss rückgängig machen und Training wieder einplanen</button><button class="danger" data-delete>Versehentlichen Eintrag vollständig löschen</button></div>`;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-restore]').onclick=async()=>{try{await deleteCompletion(entry,true)}catch(e){banner('Rückgängig machen fehlgeschlagen',e.message)}};
  dialog.querySelector('[data-delete]').onclick=async()=>{if(!confirm('Diesen abgeschlossenen Testeintrag wirklich vollständig löschen?'))return;try{await deleteCompletion(entry,false)}catch(e){banner('Löschen fehlgeschlagen',e.message)}};
  dialog.showModal();
}

document.addEventListener('click',e=>{
  const completed=e.target.closest('[data-calendar-grid] .calendar-day.completed');
  if(completed){
    e.preventDefault();e.stopImmediatePropagation();
    const entries=(snap().completed||[]).filter(x=>x.date===completed.dataset.date);
    if(!entries.length)return banner('Eintrag nicht gefunden','Bitte die Seite einmal neu laden.');
    openCompleted(entries.at(-1));
  }
},true);

const observer=new MutationObserver(()=>addExerciseContent());
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(addExerciseContent,250));
setTimeout(addExerciseContent,500);
