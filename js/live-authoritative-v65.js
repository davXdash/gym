const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const canon=v=>String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();
let timer=null;

function todayCode(){
  const day=$('#page-dashboard .calendar-day.today')||$('#page-calendar .calendar-day.today');
  const badge=$('.plan-badge',day);
  const code=badge?.textContent?.trim()?.match(/[AB]/)?.[0]||null;
  return {day,code};
}

function fixHero(){
  const {day,code}=todayCode();
  if(!day||!code)return;
  const title=$('#next-workout'),date=$('#next-date'),hero=title?.closest('.hero'),label=$('small',hero),start=$('#start-workout');
  if(label)label.textContent='Heute';
  if(title)title.textContent=`Training ${code}`;
  if(date){
    const d=day.dataset.date;
    date.textContent=d?`Heute · ${new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(`${d}T12:00:00`))}`:'Heute';
  }
  if(start){start.dataset.workout=code;start.dataset.todayCode=code;}
}

function openTodayFromStart(event){
  const start=event.target.closest('#start-workout');
  if(!start)return;
  const {code}=todayCode();
  if(!code)return;
  const planButton=$(`#workout-list [data-workout="${code}"]`);
  if(!planButton)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  planButton.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}

function fixDock(){
  const d=$('#workout-dialog');if(!d?.open)return;
  const dock=$('.v61-dock',d);if(!dock)return;
  const prev=$('[data-prev-ex-v53]',dock),next=$('[data-next-ex-v53]',dock),mid=$('.v61-list',dock);
  if(prev)prev.textContent='‹ Vorherige';
  if(next)next.textContent='Nächste ›';
  if(mid){mid.textContent='☷';mid.setAttribute('aria-label','Übungsübersicht');}
  $$(':scope > *',dock).forEach(el=>{if(el.textContent?.trim()==='null')el.textContent='';});
}

function fixButterfly(){
  const d=$('#workout-dialog');if(!d?.open)return;
  const imgPath='pics_johnreed/IMG_3452.jpeg';
  $$('.device-history-v55 button,.v61-variants button',d).forEach(btn=>{
    const name=$('strong',btn)?.textContent||'';const key=canon(name);
    if(key==='butterfly mit pads'){btn.hidden=true;btn.style.display='none';return;}
    if(key==='butterfly mit griffen'){
      let img=$('img',btn);if(img){img.src=imgPath;img.hidden=false;}
    }
  });
  const card=$('.training-exercise-v53',d),current=canon($('.device-nav-v53 strong',card)?.textContent||'');
  if(current==='butterfly mit griffen'){
    const img=$('.device-image-v53 img',card);if(img){img.src=imgPath;img.hidden=false;}
  }
}

function fixAll(){fixHero();fixDock();fixButterfly();}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(fixAll,ms)}

document.addEventListener('click',openTodayFromStart,true);
document.addEventListener('click',e=>{if(e.target.closest('[data-page],[data-page-link],[data-workout],[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-device-index-v55],[data-variant-prev-v53],[data-variant-next-v53]'))schedule(60)},true);
window.addEventListener('load',()=>{schedule(50);setTimeout(fixAll,300);setTimeout(fixAll,1000)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(50)});
new MutationObserver(()=>schedule(40)).observe(document.documentElement,{subtree:true,childList:true,characterData:true});

export {};
