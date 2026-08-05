const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];

let scheduled=false;
let observer=null;
let observedList=null;

function loadCss(){
  const href='css/mobile-workout-v56.css';
  if(q(`link[href="${href}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  document.head.append(link);
}

function scheduleEnhance(delay=0){
  if(scheduled)return;
  scheduled=true;
  setTimeout(()=>{
    scheduled=false;
    enhanceWorkout();
  },delay);
}

function disconnectObserver(){
  observer?.disconnect();
}

function connectObserver(){
  const list=q('#exercise-list');
  if(!list)return;
  if(!observer){
    observer=new MutationObserver(()=>scheduleEnhance(0));
  }
  if(observedList!==list)observedList=list;
  observer.observe(list,{childList:true});
}

function activeExerciseMeta(dialog){
  const active=q('.overview-item-v53.active',dialog);
  const all=qa('[data-select-ex-v53]',dialog);
  const index=Math.max(0,all.indexOf(active));
  const article=q('.training-exercise-v53',dialog);
  const name=q('.exercise-title-v53 h3',article)?.textContent.trim()||'Training';
  return {index,total:Math.max(1,all.length),name};
}

function ensureHeader(dialog){
  const head=q('.dialog-head',dialog);
  const close=q('#close-dialog',dialog);
  const titleBlock=q('.dialog-head>div',dialog);
  const timer=q('.timer-panel',dialog);
  if(!head||!close||!titleBlock||!timer)return;

  head.classList.add('v56-head');
  titleBlock.classList.add('v56-title');
  timer.classList.add('timer-header-v56');
  close.setAttribute('aria-label','Training schließen');
  close.title='Training schließen';

  let finish=q('.v56-finish',head);
  if(!finish){
    finish=document.createElement('button');
    finish.type='button';
    finish.className='v56-finish';
    finish.textContent='Fertig';
    finish.addEventListener('click',()=>q('#complete-workout',dialog)?.click());
  }

  head.replaceChildren(close,titleBlock,timer,finish);
}

function ensureProgress(dialog){
  const list=q('#exercise-list',dialog);
  const meta=activeExerciseMeta(dialog);
  if(!list)return;

  let progress=q('.v56-progress',list);
  if(!progress){
    progress=document.createElement('div');
    progress.className='v56-progress';
    progress.innerHTML=`<button type="button" class="v56-overview-button"><span>☷</span><span>Übungen</span></button><div class="v56-progress-track"><i></i></div><strong></strong>`;
    list.prepend(progress);
    q('.v56-overview-button',progress).addEventListener('click',()=>openOverview(dialog));
  }

  progress.style.setProperty('--v56-progress',`${Math.round(((meta.index+1)/meta.total)*100)}%`);
  q('strong',progress).textContent=`${meta.index+1} / ${meta.total}`;
}

function ensureSheet(dialog){
  let sheet=q('.v56-sheet',dialog);
  if(sheet)return sheet;

  sheet=document.createElement('section');
  sheet.className='v56-sheet';
  sheet.innerHTML=`<div class="v56-sheet-card"><header class="v56-sheet-head"><div><small>TRAINING HEUTE</small><h3>Übungsübersicht</h3></div><button type="button" class="v56-sheet-close">Schließen</button></header><div class="v56-sheet-body"></div></div>`;
  dialog.append(sheet);

  q('.v56-sheet-close',sheet).addEventListener('click',()=>closeOverview(dialog));
  sheet.addEventListener('click',event=>{
    if(event.target===sheet)closeOverview(dialog);
    if(event.target.closest('[data-select-ex-v53]'))setTimeout(()=>closeOverview(dialog),20);
  });

  return sheet;
}

function moveOverviewIntoSheet(dialog){
  const details=q('#exercise-list>.training-overview-v53',dialog);
  if(!details)return;
  const sheet=ensureSheet(dialog);
  const body=q('.v56-sheet-body',sheet);
  body.replaceChildren(details);
  details.open=true;
}

function openOverview(dialog){
  moveOverviewIntoSheet(dialog);
  q('.v56-sheet',dialog)?.classList.add('open');
}

function closeOverview(dialog){
  q('.v56-sheet',dialog)?.classList.remove('open');
}

function ensureDock(dialog){
  const nav=q('.training-exercise-v53 .exercise-nav-v53',dialog);
  if(!nav)return;

  let dock=q('.v56-dock',dialog);
  if(!dock){
    dock=document.createElement('nav');
    dock.className='v56-dock';
    dialog.append(dock);
  }

  const previous=q('[data-prev-ex-v53]',nav);
  const next=q('[data-next-ex-v53]',nav);
  let overview=q('.v56-dock-overview',dock);
  if(!overview){
    overview=document.createElement('button');
    overview.type='button';
    overview.className='v56-dock-overview';
    overview.textContent='☷';
    overview.setAttribute('aria-label','Übungsübersicht öffnen');
    overview.addEventListener('click',()=>openOverview(dialog));
  }

  dock.replaceChildren(previous,overview,next);
}

function normalizeLabels(dialog){
  const title=q('#dialog-title',dialog);
  if(title){
    const code=title.textContent.match(/\b([AB])\b/)?.[1];
    if(code)title.textContent=`Training ${code}`;
  }

  qa('.device-history-v55 button span',dialog).forEach(span=>{
    span.textContent=span.textContent.replace('Noch nicht verwendet','Noch keine Werte');
  });

  const skip=q('[data-status-v53="skipped"]',dialog);
  if(skip)skip.textContent='Heute auslassen';
}

function enhanceWorkout(){
  const dialog=q('#workout-dialog');
  if(!dialog?.open)return;

  disconnectObserver();
  try{
    dialog.classList.add('workout-v56');
    ensureHeader(dialog);
    moveOverviewIntoSheet(dialog);
    ensureProgress(dialog);
    ensureDock(dialog);
    normalizeLabels(dialog);
  }finally{
    connectObserver();
  }
}

function install(){
  loadCss();

  const dialog=q('#workout-dialog');
  if(dialog){
    dialog.addEventListener('toggle',()=>{
      if(dialog.open){
        [40,140,320,700].forEach(delay=>scheduleEnhance(delay));
      }else{
        closeOverview(dialog);
      }
    });
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-workout],#start-workout')){
      [40,160,420,760].forEach(delay=>scheduleEnhance(delay));
    }

    if(event.target.closest('[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-device-index-v55],[data-variant-prev-v53],[data-variant-next-v53],[data-add-set-v53],[data-remove-set-v53],#order-toggle-v53,[data-order-up-v53],[data-order-down-v53],[data-add-name-v54]')){
      scheduleEnhance(60);
    }
  },true);

  window.addEventListener('resize',()=>scheduleEnhance(40));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')scheduleEnhance(80);
  });

  if(dialog?.open)scheduleEnhance(0);
}

if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',install,{once:true});
else install();
