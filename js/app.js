import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11',QUEUE='gym-queue-v11',OFF='gym-offline-v11',THEME='gym-theme';
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const iso=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(d);
const pd=s=>new Date(`${s}T12:00:00`);
const EMPTY={plan:{},workouts:{},schedule:[],completed:[],weights:[],measurements:[]};
let session=null,snapshot=read(SNAP,EMPTY),viewed=new Date(),manualOffline=localStorage.getItem(OFF)==='1',planningItem=null,refreshing=false;
const hasCache=()=>Object.keys(snapshot.workouts||{}).length>0||snapshot.schedule?.length||snapshot.completed?.length||snapshot.weights?.length||snapshot.measurements?.length;
const online=()=>navigator.onLine&&!manualOffline;

function showOnly(el){['#loading','#login-screen','#dashboard'].forEach(s=>q(s)?.classList.add('hidden'));el?.classList.remove('hidden')}
function status(extra=''){const n=read(QUEUE,[]).length;const label=extra||(!navigator.onLine?'Offline':manualOffline?'Offline manuell':'Online');if(q('#connection-status'))q('#connection-status').textContent=label;q('#offline-toggle')?.classList.toggle('active',manualOffline);q('#sync-count')?.classList.toggle('hidden',!n);if(q('#sync-count'))q('#sync-count').textContent=n?`${n} offen`:'';if(q('#settings-queue'))q('#settings-queue').textContent=n}
function error(title,message){const host=q('#error-stack');if(!host)return;const existing=[...host.querySelectorAll('.error-banner')].find(x=>x.dataset.key===`${title}:${message}`);if(existing)return;const el=document.createElement('article');el.className='error-banner';el.dataset.key=`${title}:${message}`;el.innerHTML=`<strong>${title}</strong><p>${message}</p><button>×</button>`;el.querySelector('button').onclick=()=>el.remove();host.append(el)}
function queue(item){const list=read(QUEUE,[]);list.push({...item,queued_at:new Date().toISOString()});write(QUEUE,list);status()}
function isJwtClockError(e){return /jwt issued at future|issued at future|not yet valid/i.test(String(e?.message||e||''))}

async function currentSession(){
  try{
    let r=await supabase.auth.getSession();
    if(r.error&&isJwtClockError(r.error)&&navigator.onLine){const rr=await supabase.auth.refreshSession();if(!rr.error)r=rr}
    if(r.error)return null;
    return r.data?.session||null;
  }catch{return null}
}

async function loadData(){
 if(!session)throw new Error('Keine aktive Sitzung');
 const uid=session.user.id;
 const p=await supabase.from('training_plans').select('*').eq('user_id',uid).eq('is_active',true).order('version',{ascending:false}).limit(1);if(p.error)throw p.error;if(!p.data?.length)throw new Error('Kein aktiver Plan');
 const plan=p.data[0],w=await supabase.from('plan_workouts').select('*').eq('user_id',uid).eq('plan_id',plan.id).order('sequence_position');if(w.error)throw w.error;
 const ids=w.data.map(x=>x.id),pe=ids.length?await supabase.from('plan_exercises').select('*').eq('user_id',uid).in('plan_workout_id',ids).order('exercise_order'):{data:[],error:null};if(pe.error)throw pe.error;
 const exIds=[...new Set((pe.data||[]).map(x=>x.exercise_id).filter(Boolean))],ex=exIds.length?await supabase.from('exercises').select('id,name,image_path').in('id',exIds):{data:[],error:null};if(ex.error)throw ex.error;
 const em=Object.fromEntries((ex.data||[]).map(x=>[x.id,x])),workouts={};
 w.data.forEach(x=>workouts[x.code]={...x,exercises:(pe.data||[]).filter(y=>y.plan_workout_id===x.id).map(y=>({...y,name:em[y.exercise_id]?.name||'Übung',image_path:em[y.exercise_id]?.image_path||null}))});
 const [s,c,wi,me]=await Promise.all([
   supabase.from('scheduled_workouts').select('*').eq('user_id',uid).order('scheduled_date'),
   supabase.from('workouts').select('*').eq('user_id',uid).in('status',['completed','partial']).order('workout_date'),
   supabase.from('weigh_ins').select('*').eq('user_id',uid).order('measured_at'),
   supabase.from('body_measurements').select('*').eq('user_id',uid).order('measured_at')
 ]);
 for(const r of[s,c,wi,me])if(r.error)throw r.error;
 const code=Object.fromEntries(w.data.map(x=>[x.id,x.code]));
 snapshot={plan,workouts,schedule:s.data.map(x=>({...x,date:x.scheduled_date,code:code[x.plan_workout_id]||null})),completed:c.data.map(x=>({...x,date:x.workout_date,code:code[x.plan_workout_id]||null})),weights:wi.data,measurements:me.data};
 write(SNAP,snapshot);
}

async function refresh({manual=false}={}){
 if(refreshing)return;refreshing=true;
 try{
   snapshot=read(SNAP,snapshot);
   if(online()&&session){
     try{await loadData();status()}
     catch(e){snapshot=read(SNAP,snapshot);status(isJwtClockError(e)?'Offline-Daten':'Zwischengespeichert');if(manual&&!hasCache())error('Synchronisierung',e.message||String(e))}
   }
   render();
 }finally{refreshing=false}
}

function monthHtml(){const y=viewed.getFullYear(),m=viewed.getMonth(),off=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),planned=new Map((snapshot.schedule||[]).filter(x=>['planned','confirmed','started'].includes(x.status)).map(x=>[x.date,x])),done=new Map((snapshot.completed||[]).map(x=>[x.date,x]));let html='';for(let i=0;i<off;i++)html+='<span></span>';for(let d=1;d<=days;d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,p=planned.get(date),c=done.get(date);html+=`<button class="calendar-day ${date===iso()?'today':''} ${c?'completed':p?'planned':''}" data-date="${date}" data-id="${p?.id||''}"><span>${d}</span>${c?`<small class="plan-badge">${c.code} ✓</small>`:p?`<small class="plan-badge">${p.code}</small>`:''}</button>`}return html}
function measurementChart(el,rows,key){if(!el)return;if(!rows?.length){el.innerHTML='<div class="chart-empty">Noch keine Daten</div>';return}const vals=rows.map(x=>Number(x[key])).filter(Number.isFinite);if(!vals.length){el.innerHTML='<div class="chart-empty">Noch keine Daten</div>';return}const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1,w=320,h=145,p=18,pts=vals.map((v,i)=>`${p+i*(w-2*p)/Math.max(1,vals.length-1)},${h-p-(v-min)/span*(h-2*p)}`).join(' ');el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" class="chart"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3"/></svg>`}
function render(){snapshot=read(SNAP,snapshot);const title=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(viewed);qa('[data-calendar-title]').forEach(x=>x.textContent=title);qa('[data-calendar-grid]').forEach(x=>x.innerHTML=monthHtml());if(q('#completed-count'))q('#completed-count').textContent=(snapshot.completed||[]).length;if(q('#week-count'))q('#week-count').textContent=(snapshot.completed||[]).filter(x=>Math.abs(new Date()-pd(x.date))<7*864e5).length;if(q('#streak-count'))q('#streak-count').textContent='0';const list=q('#workout-list');if(list)list.innerHTML=Object.values(snapshot.workouts||{}).sort((a,b)=>a.sequence_position-b.sequence_position).map(w=>`<article class="workout-card"><small>EINHEIT ${w.code}</small><h3>${w.title}</h3><p>${w.focus||''}</p><button class="secondary" data-workout="${w.code}">Plan öffnen</button></article>`).join('');measurementChart(q('#waist-chart'),snapshot.measurements,'waist_cm');measurementChart(q('#waist-chart-2'),snapshot.measurements,'waist_cm');status()}

function setPage(name){qa('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${name}`));qa('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===name));const title={dashboard:'Dashboard',plan:'Trainingsplan',calendar:'Kalender',weight:'Gewicht',measurements:'Umfänge',progress:'Fortschritt',photos:'Fotos',settings:'Einstellungen',studio:'Studio'}[name]||'Dave';if(q('#page-title'))q('#page-title').textContent=title;closeDrawer();scrollTo(0,0)}
function openDrawer(){q('#drawer')?.classList.add('open');q('#drawer-backdrop')?.classList.remove('hidden')}
function closeDrawer(){q('#drawer')?.classList.remove('open');q('#drawer-backdrop')?.classList.add('hidden')}
function planning(date,id){snapshot=read(SNAP,snapshot);planningItem=id?(snapshot.schedule||[]).find(x=>String(x.id)===String(id)):null;q('#planning-date').textContent=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long'}).format(pd(date));q('#planning-dialog').dataset.date=date;q('#planning-new').classList.toggle('hidden',!!planningItem);q('#planning-existing').classList.toggle('hidden',!planningItem);if(planningItem)q('#planning-current').textContent=`Training ${planningItem.code} am ${date}`;q('#planning-dialog').showModal()}
function localCreate(code,date){const w=snapshot.workouts[code];snapshot.schedule=(snapshot.schedule||[]).filter(x=>x.date!==date);snapshot.schedule.push({id:`local-${crypto.randomUUID()}`,date,scheduled_date:date,code,status:'planned',plan_workout_id:w.id});write(SNAP,snapshot);render()}
async function createSchedule(code,date){localCreate(code,date);if(!online()||!session){queue({type:'createSchedule',code,date});return}try{const w=snapshot.workouts[code],r=await supabase.from('scheduled_workouts').insert({user_id:session.user.id,plan_workout_id:w.id,scheduled_date:date,status:'planned'});if(r.error)throw r.error;await refresh()}catch{queue({type:'createSchedule',code,date})}}
async function deleteSchedule(id){const row=(snapshot.schedule||[]).find(x=>String(x.id)===String(id));snapshot.schedule=(snapshot.schedule||[]).filter(x=>String(x.id)!==String(id));write(SNAP,snapshot);render();if(!online()||!session||String(id).startsWith('local-')){queue({type:'deleteSchedule',id,date:row?.date,plan_workout_id:row?.plan_workout_id});return}try{const r=await supabase.from('scheduled_workouts').delete().eq('user_id',session.user.id).eq('id',id);if(r.error)throw r.error}catch{queue({type:'deleteSchedule',id,date:row?.date,plan_workout_id:row?.plan_workout_id})}}
async function moveSchedule(id,date){const row=(snapshot.schedule||[]).find(x=>String(x.id)===String(id));if(row){row.date=date;row.scheduled_date=date;row.status='planned';write(SNAP,snapshot);render()}if(!online()||!session||String(id).startsWith('local-')){queue({type:'moveSchedule',id,date,plan_workout_id:row?.plan_workout_id});return}try{const r=await supabase.from('scheduled_workouts').update({scheduled_date:date,status:'planned'}).eq('user_id',session.user.id).eq('id',id);if(r.error)throw r.error}catch{queue({type:'moveSchedule',id,date,plan_workout_id:row?.plan_workout_id})}}

const number=id=>{const v=Number(q(id).value.replace(',','.'));return Number.isFinite(v)&&v>0?v:null};
async function saveMeasurement(){if(!session&&!hasCache()){q('#measurement-status').textContent='Keine lokale Sitzung verfügbar.';return}const payload={user_id:session?.user?.id||null,measured_at:new Date().toISOString(),chest_cm:number('#m-chest'),waist_cm:number('#m-waist'),shoulder_cm:number('#m-shoulder'),upper_arm_left_cm:number('#m-arm-left'),upper_arm_right_cm:number('#m-arm-right'),notes:JSON.stringify({abdomen_cm:number('#m-abdomen'),hip_cm:number('#m-hip'),thigh_left_cm:number('#m-thigh-left'),thigh_right_cm:number('#m-thigh-right'),neck_cm:number('#m-neck')})};snapshot.measurements=[...(snapshot.measurements||[]),payload];write(SNAP,snapshot);if(!online()||!session)queue({type:'measurement',payload});else{const r=await supabase.from('body_measurements').insert({...payload,user_id:session.user.id});if(r.error)queue({type:'measurement',payload})}q('#measurement-status').textContent='Gespeichert.';render()}

async function sync(){
 if(!navigator.onLine){status('Offline');return}
 if(!session)session=await currentSession();
 if(!session){status('Offline-Daten');return}
 const list=read(QUEUE,[]),rest=[];
 for(const item of list){
   try{
     if(item.type==='weight')await supabase.from('weigh_ins').insert({...item.payload,user_id:session.user.id}).throwOnError();
     else if(item.type==='measurement')await supabase.from('body_measurements').insert({...item.payload,user_id:session.user.id}).throwOnError();
     else if(item.type==='deleteSchedule'){
       let r=supabase.from('scheduled_workouts').delete().eq('user_id',session.user.id);
       if(item.id&&!String(item.id).startsWith('local-'))r=r.eq('id',item.id);else if(item.date&&item.plan_workout_id)r=r.eq('scheduled_date',item.date).eq('plan_workout_id',item.plan_workout_id);
       await r.throwOnError();
     }else if(item.type==='moveSchedule'){
       if(item.id&&!String(item.id).startsWith('local-'))await supabase.from('scheduled_workouts').update({scheduled_date:item.date,status:'planned'}).eq('user_id',session.user.id).eq('id',item.id).throwOnError();
     }else if(item.type==='createSchedule'){
       const w=read(SNAP,snapshot).workouts?.[item.code];if(w)await supabase.from('scheduled_workouts').insert({user_id:session.user.id,plan_workout_id:w.id,scheduled_date:item.date,status:'planned'}).throwOnError();
     }else rest.push(item);
   }catch(e){rest.push(item);if(isJwtClockError(e))break}
 }
 write(QUEUE,rest);status(rest.length?'Zwischengespeichert':'Online');if(!rest.length)await refresh({manual:true})
}

function bind(){q('#menu-toggle')?.addEventListener('click',openDrawer);q('#drawer-close')?.addEventListener('click',closeDrawer);q('#drawer-backdrop')?.addEventListener('click',closeDrawer);qa('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));qa('[data-page-link]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.pageLink)));q('#theme-toggle')?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem(THEME,next)});q('#settings-theme')?.addEventListener('click',()=>q('#theme-toggle')?.click());q('#offline-toggle')?.addEventListener('click',()=>{manualOffline=!manualOffline;localStorage.setItem(OFF,manualOffline?'1':'0');status()});q('#settings-offline')?.addEventListener('click',()=>q('#offline-toggle')?.click());q('#sync-now')?.addEventListener('click',()=>sync());q('#settings-sync')?.addEventListener('click',()=>sync());q('#save-measurement')?.addEventListener('click',saveMeasurement);q('#planning-close')?.addEventListener('click',()=>q('#planning-dialog').close());qa('[data-plan-code]').forEach(b=>b.addEventListener('click',async()=>{await createSchedule(b.dataset.planCode,q('#planning-dialog').dataset.date);q('#planning-dialog').close()}));q('#planning-delete')?.addEventListener('click',async()=>{if(planningItem){await deleteSchedule(planningItem.id);q('#planning-dialog').close()}});q('#planning-move')?.addEventListener('click',async()=>{if(!planningItem)return;const date=prompt('Neues Datum (JJJJ-MM-TT)',planningItem.date);if(date){await moveSchedule(planningItem.id,date);q('#planning-dialog').close()}});document.addEventListener('click',e=>{const day=e.target.closest('.calendar-day');if(day)planning(day.dataset.date,day.dataset.id||null)});qa('[data-prev-month]').forEach(b=>b.addEventListener('click',()=>{viewed=new Date(viewed.getFullYear(),viewed.getMonth()-1,1);render()}));qa('[data-next-month]').forEach(b=>b.addEventListener('click',()=>{viewed=new Date(viewed.getFullYear(),viewed.getMonth()+1,1);render()}));q('#logout')?.addEventListener('click',async()=>{await supabase.auth.signOut();showOnly(q('#login-screen'))});window.addEventListener('online',()=>{status('Online');setTimeout(()=>sync(),1800)});window.addEventListener('offline',()=>status('Offline'));window.addEventListener('gym:schedule-refresh',()=>{snapshot=read(SNAP,snapshot);render()});window.addEventListener('gym:snapshot-hydrated',()=>{snapshot=read(SNAP,snapshot);render()})}

async function boot(){
 document.documentElement.dataset.theme=localStorage.getItem(THEME)||'light';bind();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
 snapshot=read(SNAP,EMPTY);
 if(hasCache()){showOnly(q('#dashboard'));render();status(navigator.onLine?'Zwischengespeichert':'Offline')}
 else showOnly(q('#loading'));
 session=await currentSession();
 if(session){if(!hasCache())showOnly(q('#dashboard'));render();if(online())setTimeout(()=>refresh(),200)}
 else if(!hasCache())showOnly(q('#login-screen'));
 q('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();q('#login-error').textContent='';const r=await supabase.auth.signInWithPassword({email:q('#email').value,password:q('#password').value});if(r.error){q('#login-error').textContent=r.error.message;return}session=r.data.session;showOnly(q('#dashboard'));await refresh({manual:true})});
}
boot();
