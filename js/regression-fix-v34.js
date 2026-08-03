import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const QUEUE='gym-queue-v11';
const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};

function calmHeader(){
  const title=$('#page-title');if(title&&!/Dave$/.test(title.textContent))title.textContent=`${title.textContent} Dave`;
  const offline=$('#offline-toggle');if(offline)offline.textContent='Offline';
  const sync=$('#sync-now');if(sync)sync.textContent='Sync';
  const count=read(QUEUE,[]).length;
  sync?.classList.toggle('v34-needed',count>0);
  if(sync)sync.style.display=count>0?'inline-flex':'none';
  const connection=$('#connection-status');if(connection)connection.hidden=true;
}

function scheduleSequenceFromDom(){
  return $$('[data-calendar-grid] .calendar-day.planned').map(b=>({date:b.dataset.date,code:b.querySelector('.plan-badge')?.textContent.trim().charAt(0)})).filter(x=>x.code);
}
function invalidSchedule(rows){
  if(rows.length<2)return false;
  for(let i=1;i<rows.length;i++){
    const days=Math.round((new Date(rows[i].date+'T12:00:00')-new Date(rows[i-1].date+'T12:00:00'))/86400000);
    if(rows[i].code===rows[i-1].code||days<3)return true;
  }
  return false;
}
function showRepair(){
  if($('#schedule-repair-v34'))return;
  const stack=$('#error-stack');if(!stack)return;
  const box=document.createElement('article');box.id='schedule-repair-v34';box.className='error-banner';
  box.innerHTML='<strong>Kalenderfolge fehlerhaft</strong><p>Die geplanten A/B-Termine enthalten Doppelungen oder liegen zu dicht hintereinander.</p><button type="button" id="repair-schedule-v34">Folge reparieren</button><button type="button" class="close-v34">×</button>';
  box.querySelector('.close-v34').onclick=()=>box.remove();
  box.querySelector('#repair-schedule-v34').onclick=repairSchedule;
  stack.prepend(box);
}
async function repairSchedule(){
  const btn=$('#repair-schedule-v34');if(btn){btn.disabled=true;btn.textContent='Repariere …'}
  try{
    const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Bitte neu anmelden.');
    const plans=await supabase.from('training_plans').select('id').eq('is_active',true).order('version',{ascending:false}).limit(1).single();if(plans.error)throw plans.error;
    const pws=await supabase.from('plan_workouts').select('id,code').eq('plan_id',plans.data.id);if(pws.error)throw pws.error;
    const byCode=Object.fromEntries(pws.data.map(x=>[x.code,x.id]));
    const completed=await supabase.from('workouts').select('workout_date,plan_workout_id').in('status',['completed','partial']).order('workout_date',{ascending:false}).limit(1);if(completed.error)throw completed.error;
    const latest=completed.data?.[0];
    let start=new Date();let nextCode='A';
    if(latest){start=new Date(latest.workout_date+'T12:00:00');start.setDate(start.getDate()+3);const lastCode=pws.data.find(x=>x.id===latest.plan_workout_id)?.code;nextCode=lastCode==='A'?'B':'A'}
    else{start.setHours(12,0,0,0);start.setDate(start.getDate()+1)}
    const del=await supabase.from('scheduled_workouts').delete().in('status',['planned','confirmed','started']);if(del.error)throw del.error;
    const rows=[];for(let i=0;i<20;i++){const d=new Date(start);d.setDate(start.getDate()+i*3);const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);const code=i%2===0?nextCode:(nextCode==='A'?'B':'A');rows.push({user_id:session.user.id,plan_workout_id:byCode[code],scheduled_date:date,status:'planned'})}
    const ins=await supabase.from('scheduled_workouts').insert(rows);if(ins.error)throw ins.error;
    localStorage.removeItem('gym-snapshot-v11');location.reload();
  }catch(e){if(btn){btn.disabled=false;btn.textContent='Noch einmal versuchen'};const p=$('#schedule-repair-v34 p');if(p)p.textContent=e.message||String(e)}
}
function inspectSchedule(){const rows=scheduleSequenceFromDom();if(invalidSchedule(rows))showRepair()}

const observer=new MutationObserver(()=>{calmHeader();inspectSchedule()});
window.addEventListener('load',()=>{calmHeader();inspectSchedule();observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>document.documentElement.classList.add('v34-ready'),500)});
window.addEventListener('online',calmHeader);window.addEventListener('offline',calmHeader);
