const RECENCY_KEY='gym-workout-variant-recency-v1';

const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const canon=value=>String(value||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();

function remember(name){
  if(!name)return;
  const recency=read(RECENCY_KEY,{});
  recency[canon(name)]={name,usedAt:Date.now()};
  write(RECENCY_KEY,recency);
}

function currentDeviceName(){
  return document.querySelector('#workout-dialog .wo-device-main h2')?.textContent?.trim()||'';
}

function prioritize(container){
  if(!container||container.dataset.recencySorting==='1')return;
  const buttons=[...container.querySelectorAll('.wo-variant')];
  if(buttons.length<2)return;
  const recency=read(RECENCY_KEY,{});
  const scored=buttons.map((button,index)=>({
    button,
    index,
    score:recency[canon(button.querySelector('strong')?.textContent)]?.usedAt||0
  }));
  if(!scored.some(x=>x.score))return;
  scored.sort((a,b)=>b.score-a.score||a.index-b.index);
  container.dataset.recencySorting='1';
  for(const item of scored)container.append(item.button);
  container.scrollLeft=0;
  delete container.dataset.recencySorting;
}

function prioritizeAll(){
  document.querySelectorAll('#workout-dialog .wo-variants').forEach(prioritize);
}

document.addEventListener('click',event=>{
  const variant=event.target.closest('#workout-dialog .wo-variant[data-action="variant"]');
  if(variant){
    remember(variant.querySelector('strong')?.textContent?.trim());
    setTimeout(prioritizeAll,0);
    return;
  }
  const completed=event.target.closest('#workout-dialog [data-action="complete-exercise"]');
  if(completed){
    remember(currentDeviceName());
    setTimeout(prioritizeAll,0);
  }
},true);

const observer=new MutationObserver(()=>queueMicrotask(prioritizeAll));
observer.observe(document.documentElement,{subtree:true,childList:true});
prioritizeAll();
