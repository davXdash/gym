import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const STORAGE_KEY = 'gym-local-progress-v1';

const plans = {
  A:{title:'Training A',focus:'Brust · Rückenbreite · seitliche Schulter',exercises:[
    ['Schrägbankdrückmaschine dual','3 Sätze · 6–10 Wdh. · 150–180 Sek.','Letzter Satz bis keine vollständige saubere Wiederholung mehr möglich ist.'],
    ['Latzugstation mit Oberschenkelpolster','3 Sätze · 8–12 Wdh. · 120 Sek.','Brust leicht anheben, Ellbogen nach unten führen, nicht zurückschwingen.'],
    ['Brustpresse sitzend','3 Sätze · 8–12 Wdh. · 120 Sek.','Schulterblätter an der Lehne halten.'],
    ['Rudermaschine mit Brustpolster','3 Sätze · 8–12 Wdh. · 120 Sek.','Brust bleibt am Polster, vollständig kontrolliert strecken.'],
    ['Seithebemaschine ohne Armpolster','4 Sätze · 12–20 Wdh. · 75–90 Sek.','Letzte zwei Sätze bis zum sauberen Muskelversagen.'],
    ['Butterfly reverse mit Griffen','3 Sätze · 12–18 Wdh. · 90 Sek.','Schultern unten lassen, nicht mit dem Kopf nach vorne gehen.'],
    ['Bauchmuskelmaschine','3 Sätze · 10–15 Wdh. · 90 Sek.','Brustkorb Richtung Becken einrollen.']
  ]},
  B:{title:'Training B',focus:'obere Brust · Rückendicke · hintere Schulter · Arme',exercises:[
    ['Kurzhantel-Schrägbankdrücken','3 Sätze · 6–10 Wdh. · 180 Sek.','Bank 20–30°. Nicht unter den Hanteln scheitern.'],
    ['High Row dual','3 Sätze · 8–12 Wdh. · 120 Sek.','Brust am Polster, Ellbogen nach hinten und leicht unten.'],
    ['Butterfly mit Griffen','3 Sätze · 10–15 Wdh. · 90 Sek.','Weit und kontrolliert öffnen, Schulter nicht nach vorne werfen.'],
    ['Low Row dual','3 Sätze · 8–12 Wdh. · 120 Sek.','Griff Richtung oberer Bauch, nicht zurückreißen.'],
    ['Seithebemaschine ohne Armpolster','4 Sätze · 12–20 Wdh. · 75–90 Sek.','Letzte zwei Sätze bis zum sauberen Muskelversagen.'],
    ['Butterfly reverse mit Griffen','3 Sätze · 12–18 Wdh. · 90 Sek.','Kontrolliert nach außen führen.'],
    ['Trizepsmaschine Überkopf','2 Sätze · 10–15 Wdh. · 90 Sek.','Letzter Satz bis zum sauberen Muskelversagen.'],
    ['Bizepsmaschine','2 Sätze · 10–15 Wdh. · 90 Sek.','Oberarme stabil halten.']
  ]}
};

const els = {
  loading:document.querySelector('#loading'), login:document.querySelector('#login-screen'), dashboard:document.querySelector('#dashboard'),
  form:document.querySelector('#login-form'), error:document.querySelector('#login-error'), list:document.querySelector('#workout-list'),
  dialog:document.querySelector('#workout-dialog'), exercises:document.querySelector('#exercise-list'), dialogTitle:document.querySelector('#dialog-title'),
  next:document.querySelector('#next-workout'), completed:document.querySelector('#completed-count'), streak:document.querySelector('#streak-count'),
  week:document.querySelector('#week-count'), calendar:document.querySelector('#calendar-grid'), calendarTitle:document.querySelector('#calendar-title'),
  connection:document.querySelector('#connection-status'), complete:document.querySelector('#complete-workout')
};

let currentWorkout = 'A';
let viewedMonth = new Date();

function loadProgress(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {completed:[],next:'A'};}catch{return {completed:[],next:'A'};}
}
function saveProgress(progress){localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}
function showOnly(element){[els.loading,els.login,els.dashboard].forEach(el=>el.classList.add('hidden'));element.classList.remove('hidden');}
function isoDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(date);}

function renderPlans(){
  els.list.innerHTML=Object.entries(plans).map(([code,plan])=>`<article class="workout-card"><p class="eyebrow">EINHEIT ${code}</p><h3>${plan.title}</h3><p class="muted">${plan.focus}</p><div class="workout-meta"><span>${plan.exercises.length} Übungen</span><span>fortlaufende Rotation</span></div><button data-workout="${code}">Ansehen</button></article>`).join('');
}

function openWorkout(code){
  currentWorkout=code;
  const plan=plans[code];
  els.dialogTitle.textContent=plan.title;
  els.exercises.innerHTML=plan.exercises.map(([name,prescription,notes])=>`<article class="exercise-card"><div class="exercise-image">Bildzuordnung folgt</div><div class="exercise-body"><h3>${name}</h3><p class="exercise-prescription">${prescription}</p><p class="exercise-notes">${notes}</p></div></article>`).join('');
  els.dialog.showModal();
}

function weekKey(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return `${d.getUTCFullYear()}-${Math.ceil((((d-yearStart)/86400000)+1)/7)}`;
}

function stats(progress){
  els.completed.textContent=progress.completed.length;
  const now=new Date();
  els.week.textContent=progress.completed.filter(x=>weekKey(new Date(`${x.date}T12:00:00`))===weekKey(now)).length;
  const weeks=[...new Set(progress.completed.map(x=>weekKey(new Date(`${x.date}T12:00:00`))))].sort().reverse();
  let streak=0; let cursor=new Date(now);
  while(weeks.includes(weekKey(cursor))){streak++;cursor.setDate(cursor.getDate()-7);}
  els.streak.textContent=streak;
}

function renderCalendar(progress){
  const year=viewedMonth.getFullYear(),month=viewedMonth.getMonth();
  els.calendarTitle.textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(viewedMonth);
  const first=new Date(year,month,1); const offset=(first.getDay()+6)%7; const days=new Date(year,month+1,0).getDate();
  const completedDates=new Set(progress.completed.map(x=>x.date)); const today=isoDate();
  const cells=[]; for(let i=0;i<offset;i++)cells.push('<span class="calendar-day empty"></span>');
  for(let day=1;day<=days;day++){
    const date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const classes=['calendar-day']; if(date===today)classes.push('today'); if(completedDates.has(date))classes.push('completed');
    cells.push(`<span class="${classes.join(' ')}" title="${date}">${day}</span>`);
  }
  els.calendar.innerHTML=cells.join('');
}

function refresh(){
  const progress=loadProgress();
  els.next.textContent=`Training ${progress.next}`;
  stats(progress); renderCalendar(progress);
}

function completeWorkout(){
  const progress=loadProgress();
  progress.completed.push({date:isoDate(),code:currentWorkout,id:crypto.randomUUID()});
  progress.next=currentWorkout==='A'?'B':'A';
  saveProgress(progress); els.dialog.close(); refresh();
}

function updateConnection(){
  const online=navigator.onLine; els.connection.textContent=online?'Online':'Offline – lokal gespeichert'; els.connection.classList.toggle('offline',!online);
}

async function initialise(){
  renderPlans(); refresh(); updateConnection();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}
  const {data:{session}}=await supabase.auth.getSession(); showOnly(session?els.dashboard:els.login);
}

els.form.addEventListener('submit',async event=>{
  event.preventDefault(); els.error.textContent='';
  const email=document.querySelector('#email').value.trim(); const password=document.querySelector('#password').value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error){els.error.textContent='Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.';return;}
  document.querySelector('#password').value=''; showOnly(els.dashboard);
});
document.querySelector('#logout').addEventListener('click',async()=>{await supabase.auth.signOut();showOnly(els.login);});
document.querySelector('#start-workout').addEventListener('click',()=>openWorkout(loadProgress().next));
els.list.addEventListener('click',event=>{const button=event.target.closest('[data-workout]');if(button)openWorkout(button.dataset.workout);});
document.querySelector('#close-dialog').addEventListener('click',()=>els.dialog.close());
els.complete.addEventListener('click',completeWorkout);
document.querySelector('#prev-month').addEventListener('click',()=>{viewedMonth=new Date(viewedMonth.getFullYear(),viewedMonth.getMonth()-1,1);renderCalendar(loadProgress());});
document.querySelector('#next-month').addEventListener('click',()=>{viewedMonth=new Date(viewedMonth.getFullYear(),viewedMonth.getMonth()+1,1);renderCalendar(loadProgress());});
window.addEventListener('online',updateConnection); window.addEventListener('offline',updateConnection);
supabase.auth.onAuthStateChange((_event,session)=>showOnly(session?els.dashboard:els.login));
initialise().catch(()=>{els.error.textContent='Die App konnte nicht vollständig geladen werden.';showOnly(els.login);});
