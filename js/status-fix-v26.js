import './training-mode-v30.js';
import './coach-v31.js';
import './studio-page-v35.js';
import './device-photo-v36.js';
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

for(const href of [
  'css/training-mode-v30.css',
  'css/coach-studio-v32.css',
  'css/studio-page-v35.css',
  'css/device-photo-v36.css'
]){
  if(!document.querySelector(`link[href="${href}"]`)){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    document.head.append(link);
  }
}

function fixShell(){
  const status=$('.status-line');
  if(status)status.style.setProperty('display','none','important');
  const topSmall=$('.topbar-title p');
  if(topSmall)topSmall.textContent='DEIN TRAINING';
  const pageTitle=$('#page-title');
  const active=$('.page.active')?.id;
  if(pageTitle){
    const titles={
      'page-dashboard':'Dave',
      'page-plan':'Trainingsplan Dave',
      'page-calendar':'Kalender Dave',
      'page-weight':'Gewicht Dave',
      'page-measurements':'Umfänge Dave',
      'page-progress':'Fortschritt Dave',
      'page-photos':'Fotos Dave',
      'page-studio':'Studio Dave',
      'page-settings':'Einstellungen Dave'
    };
    pageTitle.textContent=titles[active]||'Dave';
  }
  const drawerLabel=$('.drawer-head small');
  if(drawerLabel)drawerLabel.textContent='TRAININGSPLAN';
  const drawerName=$('.drawer-head h2');
  if(drawerName)drawerName.textContent='Dave';
  const theme=$('#theme-toggle');
  if(theme){theme.style.width='44px';theme.style.height='44px';theme.style.minWidth='44px'}
}

function plannedRows(){
  const grid=$('[data-calendar-grid]');
  if(!grid)return [];
  return $$('.calendar-day.planned',grid).map(day=>({
    date:day.dataset.date,
    code:day.querySelector('.plan-badge')?.textContent?.trim()?.charAt(0)
  })).filter(x=>x.date&&x.code).sort((a,b)=>a.date.localeCompare(b.date));
}
function calendarInvalid(rows){
  for(let i=1;i<rows.length;i++){
    const gap=Math.round((new Date(`${rows[i].date}T12:00:00`)-new Date(`${rows[i-1].date}T12:00:00`))/86400000);
    if(rows[i].code===rows[i-1].code||gap<3)return true;
  }
  return false;
}
function ensureCalendarRepair(){
  const rows=plannedRows();
  const existing=$('#calendar-repair-v45');
  if(!calendarInvalid(rows)){existing?.remove();return}
  if(existing)return;
  const page=$('#page-calendar .page-head');
  if(!page)return;
  const box=document.createElement('section');
  box.id='calendar-repair-v45';
  box.className='error-banner';
  box.innerHTML='<strong>Dein Kalender muss korrigiert werden</strong><p>Einheiten liegen zu dicht zusammen oder die A/B-Folge ist unterbrochen.</p><button type="button" id="calendar-repair-start-v45">Nächstes Training festlegen</button>';
  page.insertAdjacentElement('afterend',box);
  $('#calendar-repair-start-v45').onclick=()=>openRepairDialog();
}
function openRepairDialog(){
  let dialog=$('#calendar-repair-dialog-v45');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='calendar-repair-dialog-v45';
    dialog.innerHTML='<div class="dialog-head"><div><small>KALENDER REPARIEREN</small><h2>Wann trainierst du als Nächstes?</h2></div><button type="button" class="dialog-close">Schließen</button></div><div class="form-grid" style="padding:18px"><label>Datum<input type="date" id="calendar-repair-date-v45"></label><p>Ab diesem Tag wird die Folge mit A/B-Wechsel und jeweils zwei freien Tagen neu aufgebaut.</p><button type="button" class="primary" id="calendar-repair-confirm-v45">Kalender reparieren</button><p id="calendar-repair-status-v45"></p></div>';
    document.body.append(dialog);
    dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
    $('#calendar-repair-confirm-v45').onclick=repairCalendar;
  }
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  $('#calendar-repair-date-v45').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(tomorrow);
  dialog.showModal();
}
async function repairCalendar(){
  const status=$('#calendar-repair-status-v45');
  const button=$('#calendar-repair-confirm-v45');
  try{
    button.disabled=true;status.textContent='Kalender wird repariert …';
    const startValue=$('#calendar-repair-date-v45').value;
    if(!startValue)throw new Error('Bitte ein Datum auswählen.');
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error('Bitte neu anmelden.');
    const plan=await supabase.from('training_plans').select('id').eq('is_active',true).order('version',{ascending:false}).limit(1).single();
    if(plan.error)throw plan.error;
    const pws=await supabase.from('plan_workouts').select('id,code').eq('plan_id',plan.data.id);
    if(pws.error)throw pws.error;
    const byCode=Object.fromEntries(pws.data.map(x=>[x.code,x.id]));
    const last=await supabase.from('workouts').select('workout_date,plan_workout_id').in('status',['completed','partial']).order('workout_date',{ascending:false}).limit(1);
    if(last.error)throw last.error;
    const lastRow=last.data?.[0];
    const lastCode=pws.data.find(x=>x.id===lastRow?.plan_workout_id)?.code;
    const firstCode=lastCode==='A'?'B':'A';
    const del=await supabase.from('scheduled_workouts').delete().in('status',['planned','confirmed','started']);
    if(del.error)throw del.error;
    const start=new Date(`${startValue}T12:00:00`),rows=[];
    for(let i=0;i<24;i++){
      const d=new Date(start);d.setDate(start.getDate()+i*3);
      const code=i%2===0?firstCode:(firstCode==='A'?'B':'A');
      rows.push({user_id:session.user.id,plan_workout_id:byCode[code],scheduled_date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d),status:'planned'});
    }
    const ins=await supabase.from('scheduled_workouts').insert(rows);
    if(ins.error)throw ins.error;
    localStorage.removeItem('gym-snapshot-v11');
    location.reload();
  }catch(error){status.textContent=error.message||String(error);button.disabled=false}
}

function twoDecimalCharts(){
  $$('#weight-chart text,#weight-chart-2 text').forEach(t=>{
    const n=Number(String(t.textContent).replace(',','.'));
    if(Number.isFinite(n))t.textContent=n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  });
}

function install(){fixShell();ensureCalendarRepair();twoDecimalCharts()}
let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;install()});
});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
document.addEventListener('DOMContentLoaded',install);
window.addEventListener('load',()=>{install();setTimeout(install,300);setTimeout(install,1200)});
document.addEventListener('click',event=>{
  if(event.target.closest('[data-page],[data-page-link],#menu-toggle'))setTimeout(install,20);
},true);
