import './progress-live-v62.js';

const SNAP='gym-snapshot-v11';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const canon=v=>String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const formatDate=value=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(`${value}T12:00:00`));
let timer=null;

function patchDashboardNext(){
  const title=$('#next-workout'),date=$('#next-date'),start=$('#start-workout');
  if(!title||!date||!start)return;
  const snap=read(SNAP,{schedule:[],completed:[]}),day=today();
  const activeStatuses=new Set(['planned','confirmed','started']);
  const completedToday=new Set((snap.completed||[]).filter(x=>x.date===day).map(x=>x.code));
  const open=(snap.schedule||[]).filter(x=>activeStatuses.has(x.status)&&x.date>=day).sort((a,b)=>a.date.localeCompare(b.date));
  let next=open.find(x=>x.date===day&&!completedToday.has(x.code));
  if(!next)next=open.find(x=>x.date>day);
  if(!next)return;
  const hero=title.closest('.hero');
  const label=hero?.querySelector('small');
  const isToday=next.date===day;
  if(label)label.textContent=isToday?'Heute':'Als Nächstes';
  title.textContent=`Training ${next.code}`;
  date.textContent=isToday?`Heute · ${formatDate(next.date)}`:formatDate(next.date);
  start.dataset.workout=next.code;
  start.dataset.date=next.date;
}

function patchDock(){
  const dialog=$('#workout-dialog');
  if(!dialog?.open)return;
  const dock=$('.v61-dock',dialog);
  if(!dock)return;
  const prev=$('[data-prev-ex-v53]',dock),next=$('[data-next-ex-v53]',dock),list=$('.v61-list',dock);
  if(prev)prev.textContent='‹ Vorherige';
  if(next)next.textContent='Nächste ›';
  if(list){list.textContent='☷';list.setAttribute('aria-label','Übungsübersicht');}
}

function patchButterflyImage(){
  const dialog=$('#workout-dialog');
  if(!dialog?.open)return;
  const imagePath='pics_johnreed/IMG_3452.jpeg';
  $$('.device-history-v55 button,.v61-variants button',dialog).forEach(button=>{
    const name=$('strong',button)?.textContent||'';
    if(canon(name)!=='butterfly mit griffen')return;
    const img=$('img',button);
    if(img){img.src=imagePath;img.hidden=false;}
  });
  const card=$('.training-exercise-v53',dialog);
  const currentName=$('.device-nav-v53 strong',card)?.textContent||'';
  if(canon(currentName)==='butterfly mit griffen'){
    const current=$('.device-image-v53 img',card);
    if(current)current.src=imagePath;
  }
}

function patchAll(){
  patchDashboardNext();
  patchDock();
  patchButterflyImage();
}
function schedulePatch(delay=30){clearTimeout(timer);timer=setTimeout(patchAll,delay)}

window.addEventListener('load',()=>{schedulePatch(100);setTimeout(patchAll,500)});
window.addEventListener('online',()=>schedulePatch(100));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedulePatch(80)});
document.addEventListener('click',event=>{
  if(event.target.closest('[data-page="dashboard"],[data-workout],#start-workout,[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-device-index-v55],[data-variant-prev-v53],[data-variant-next-v53]'))schedulePatch(80);
},true);
const observer=new MutationObserver(()=>schedulePatch(60));
observer.observe(document.documentElement,{childList:true,subtree:true});

export {};
