import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const STORAGE_KEY='gym-local-progress-v3';
const THEME_KEY='gym-theme';
const preferredDays=[2,4,6]; // Dienstag, Donnerstag, Samstag

const plans={
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
  ['Butterfly mit Griffen','3 Sätze · 8–12 Wdh. · 90 Sek.','Weit und kontrolliert öffnen, Schulter nicht nach vorne werfen.'],
  ['Low Row dual','3 Sätze · 8–12 Wdh. · 120 Sek.','Griff Richtung oberer Bauch, nicht zurückreißen.'],
  ['Seithebemaschine ohne Armpolster','4 Sätze · 12–20 Wdh. · 75–90 Sek.','Letzte zwei Sätze bis zum sauberen Muskelversagen.'],
  ['Butterfly reverse mit Griffen','3 Sätze · 12–18 Wdh. · 90 Sek.','Kontrolliert nach außen führen.'],
  ['Trizepsmaschine Überkopf','2 Sätze · 8–12 Wdh. · 90 Sek.','Letzter Satz bis zum sauberen Muskelversagen.'],
  ['Bizepsmaschine','2 Sätze · 8–12 Wdh. · 90 Sek.','Oberarme stabil halten.']
 ]}
};

const $=selector=>document.querySelector(selector);
const els={loading:$('#loading'),login:$('#login-screen'),dashboard:$('#dashboard'),form:$('#login-form'),error:$('#login-error'),list:$('#workout-list'),dialog:$('#workout-dialog'),exercises:$('#exercise-list'),dialogTitle:$('#dialog-title'),next:$('#next-workout'),nextDate:$('#next-date'),completed:$('#completed-count'),streak:$('#streak-count'),week:$('#week-count'),calendar:$('#calendar-grid'),calendarTitle:$('#calendar-title'),calendarHelp:$('#calendar-help'),connection:$('#connection-status'),complete:$('#complete-workout'),timer:$('#workout-timer'),completionHint:$('#completion-hint'),toast:$('#toast')};
let currentWorkout='A',viewedMonth=new Date(),selectedPlannedIndex=null,timerId=null,startedAt=null;

function isoDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(date);}
function parseDate(value){return new Date(`${value}T12:00:00`);}
function loadProgress(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(saved?.schedule?.length)return saved;
 }catch{}
 const initial={completed:[],next:'A',schedule:buildSchedule(new Date(), 'A',12),active:null};
 saveProgress(initial);return initial;
}
function saveProgress(p){localStorage.setItem(STORAGE_KEY,JSON.stringify(p));}
function nextPreferredDate(after){const d=new Date(after);d.setDate(d.getDate()+1);while(!preferredDays.includes(d.getDay()))d.setDate(d.getDate()+1);return d;}
function buildSchedule(start,firstCode,count){
 let d=new Date(start);if(d.getDay()===1||!preferredDays.includes(d.getDay()))d=nextPreferredDate(new Date(d.getFullYear(),d.getMonth(),d.getDate()-1));
 const rows=[];let code=firstCode;
 for(let i=0;i<count;i++){rows.push({date:isoDate(d),code,id:crypto.randomUUID()});code=code==='A'?'B':'A';d=nextPreferredDate(d);}
 return rows;
}
function rebuildAfterMove(progress,index,newDate){
 const moved=progress.schedule[index];
 const before=progress.schedule.slice(0,index);
 const start=parseDate(newDate);
 const replacement=[{...moved,date:newDate}];
 let code=moved.code==='A'?'B':'A',d=start;
 for(let i=index+1;i<progress.schedule.length;i++){d=nextPreferredDate(d);replacement.push({date:isoDate(d),code,id:progress.schedule[i].id});code=code==='A'?'B':'A';}
 progress.schedule=[...before,...replacement];
}
function showOnly(el){[els.loading,els.login,els.dashboard].forEach(x=>x.classList.add('hidden'));el.classList.remove('hidden');}
function toast(message){els.toast.textContent=message;els.toast.classList.add('show');setTimeout(()=>els.toast.classList.remove('show'),2300);}
function renderPlans(){els.list.innerHTML=Object.entries(plans).map(([code,p])=>`<article class="workout-card"><p class="eyebrow">EINHEIT ${code}</p><h3>${p.title}</h3><p class="muted">${p.focus}</p><div class="workout-meta"><span>${p.exercises.length} Übungen</span><span>fortlaufende Rotation</span></div><button data-workout="${code}">Ansehen</button></article>`).join('');}
function weekKey(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));return `${d.getUTCFullYear()}-${Math.ceil((((d-ys)/86400000)+1)/7)}`;}
function stats(p){els.completed.textContent=p.completed.length;const now=new Date();els.week.textContent=p.completed.filter(x=>weekKey(parseDate(x.date))===weekKey(now)).length;const weeks=[...new Set(p.completed.map(x=>weekKey(parseDate(x.date))))];let streak=0,cursor=new Date(now);while(weeks.includes(weekKey(cursor))){streak++;cursor.setDate(cursor.getDate()-7);}els.streak.textContent=streak;}
function renderCalendar(p){
 const y=viewedMonth.getFullYear(),m=viewedMonth.getMonth();els.calendarTitle.textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(viewedMonth);
 const first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),done=new Map(p.completed.map(x=>[x.date,x.code])),planned=new Map(p.schedule.map((x,i)=>[x.date,{...x,index:i}]));
 const cells=[];for(let i=0;i<offset;i++)cells.push('<span class="calendar-day empty"></span>');
 for(let day=1;day<=days;day++){
  const date=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,info=planned.get(date),classes=['calendar-day'];
  const dow=parseDate(date).getDay();if(date===isoDate())classes.push('today');if(done.has(date))classes.push('completed');if(info)classes.push('planned');if(info?.index===selectedPlannedIndex)classes.push('selected');if(dow===1)classes.push('monday');
  cells.push(`<button class="${classes.join(' ')}" data-date="${date}" ${date<isoDate()&&!done.has(date)?'disabled':''}><span>${day}</span>${done.has(date)?`<small class="plan-badge">${done.get(date)}</small>`:info?`<small class="plan-badge">${info.code}</small>`:''}</button>`);
 }
 els.calendar.innerHTML=cells.join('');
}
function refresh(){const p=loadProgress();const first=p.schedule[0];p.next=first?.code||p.next;saveProgress(p);els.next.textContent=`Training ${p.next}`;els.nextDate.textContent=first?`Vorgeschlagen: ${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(parseDate(first.date))}`:'';stats(p);renderCalendar(p);}
function updateCompletionState(){const checks=[...els.exercises.querySelectorAll('.exercise-check')],done=checks.filter(x=>x.checked).length;els.complete.disabled=done!==checks.length;els.completionHint.textContent=`${done} von ${checks.length} Übungen erledigt`;}
function startTimer(){clearInterval(timerId);startedAt=Date.now();const draw=()=>{const s=Math.floor((Date.now()-startedAt)/1000),min=Math.floor(s/60),sec=s%60;els.timer.textContent=`Trainingszeit ${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;};draw();timerId=setInterval(draw,1000);}
function openWorkout(code){currentWorkout=code;const p=plans[code];els.dialogTitle.textContent=p.title;els.exercises.innerHTML=p.exercises.map(([name,prescription,notes],i)=>`<article class="exercise-card" data-exercise="${i}"><input class="exercise-check" type="checkbox" aria-label="${name} erledigt"><div class="exercise-body"><h3>${name}</h3><p class="exercise-prescription">${prescription}</p><p class="exercise-notes">${notes}</p></div></article>`).join('');els.exercises.querySelectorAll('.exercise-check').forEach(c=>c.addEventListener('change',()=>{c.closest('.exercise-card').classList.toggle('done',c.checked);updateCompletionState();}));updateCompletionState();startTimer();els.dialog.showModal();}
function completeWorkout(){
 const checks=[...els.exercises.querySelectorAll('.exercise-check')];if(checks.some(x=>!x.checked)){toast('Bitte zuerst alle Übungen abhaken.');return;}
 const duration=Math.floor((Date.now()-startedAt)/60000);if(duration<15&&!confirm(`Das Training lief erst ${duration} Minuten. Trotzdem als vollständig speichern?`))return;
 const p=loadProgress(),today=isoDate();if(p.completed.some(x=>x.date===today&&x.code===currentWorkout)){toast('Diese Einheit wurde heute bereits gespeichert.');return;}
 p.completed.push({date:today,code:currentWorkout,id:crypto.randomUUID(),duration_minutes:duration});
 const idx=p.schedule.findIndex(x=>x.code===currentWorkout);if(idx>=0)p.schedule.splice(idx,1);while(p.schedule.length<12){const last=parseDate(p.schedule.at(-1)?.date||today),code=p.schedule.at(-1)?.code==='A'?'B':'A';p.schedule.push({date:isoDate(nextPreferredDate(last)),code,id:crypto.randomUUID()});}
 p.next=p.schedule[0]?.code||(currentWorkout==='A'?'B':'A');saveProgress(p);clearInterval(timerId);els.dialog.close();refresh();toast(`Training ${currentWorkout} gespeichert.`);
}
function updateConnection(){const on=navigator.onLine;els.connection.textContent=on?'Online':'Offline – lokal';els.connection.classList.toggle('offline',!on);}
function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#0f1115':'#f4f6f8';}
async function initialise(){setTheme(localStorage.getItem(THEME_KEY)||'light');renderPlans();refresh();updateConnection();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});const{data:{session}}=await supabase.auth.getSession();showOnly(session?els.dashboard:els.login);}

els.form.addEventListener('submit',async e=>{e.preventDefault();els.error.textContent='';const email=$('#email').value.trim(),password=$('#password').value;const{error}=await supabase.auth.signInWithPassword({email,password});if(error){els.error.textContent='Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.';return;}$('#password').value='';showOnly(els.dashboard);});
$('#logout').addEventListener('click',async()=>{await supabase.auth.signOut();showOnly(els.login);});
$('#theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
$('#start-workout').addEventListener('click',()=>openWorkout(loadProgress().next));
els.list.addEventListener('click',e=>{const b=e.target.closest('[data-workout]');if(b)openWorkout(b.dataset.workout);});
$('#close-dialog').addEventListener('click',()=>{clearInterval(timerId);els.dialog.close();});
els.complete.addEventListener('click',completeWorkout);
els.calendar.addEventListener('click',e=>{const day=e.target.closest('[data-date]');if(!day||day.disabled)return;const date=day.dataset.date,p=loadProgress(),index=p.schedule.findIndex(x=>x.date===date);if(selectedPlannedIndex===null){if(index>=0){selectedPlannedIndex=index;els.calendarHelp.textContent=`Training ${p.schedule[index].code} gewählt. Tippe jetzt auf den neuen Tag.`;renderCalendar(p);}else{rebuildAfterMove(p,0,date);saveProgress(p);refresh();toast('Nächstes Training verschoben.');}}else{if(date<isoDate()){toast('Ein Training kann nicht in die Vergangenheit verschoben werden.');return;}rebuildAfterMove(p,selectedPlannedIndex,date);saveProgress(p);selectedPlannedIndex=null;els.calendarHelp.textContent='Vorgeschlagen: Dienstag, Donnerstag und Samstag. Tippe eine geplante Einheit und danach den neuen Tag an.';refresh();toast('Termin und Folgeeinheiten angepasst.');}});
$('#prev-month').addEventListener('click',()=>{viewedMonth=new Date(viewedMonth.getFullYear(),viewedMonth.getMonth()-1,1);renderCalendar(loadProgress());});
$('#next-month').addEventListener('click',()=>{viewedMonth=new Date(viewedMonth.getFullYear(),viewedMonth.getMonth()+1,1);renderCalendar(loadProgress());});
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
supabase.auth.onAuthStateChange((_event,session)=>showOnly(session?els.dashboard:els.login));
initialise().catch(()=>{els.error.textContent='Die App konnte nicht vollständig geladen werden.';showOnly(els.login);});