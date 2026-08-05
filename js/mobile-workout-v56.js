const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];

let scheduled=false;
let observer=null;

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
  setTimeout(()=>{scheduled=false;enhanceWorkout()},delay);
}

function connectObserver(){
  const list=q('#exercise-list');
  if(!list)return;
  observer??=new MutationObserver(()=>scheduleEnhance(30));
  observer.disconnect();
  observer.observe(list,{childList:true});
}

function ensureHeader(dialog){
  const head=q('.dialog-head',dialog),close=q('#close-dialog',dialog),title=q('.dialog-head>div',dialog),timer=q('.timer-panel',dialog);
  if(!head||!close||!title||!timer)return;
  head.classList.add('v56-head');title.classList.add('v56-title');timer.classList.add('timer-header-v56');
  let finish=q('.v56-finish',head);
  if(!finish){finish=document.createElement('button');finish.type='button';finish.className='v56-finish';finish.textContent='Fertig';finish.onclick=()=>q('#complete-workout',dialog)?.click()}
  head.replaceChildren(close,title,timer,finish);
}

function ensureSheet(dialog){
  let sheet=q('.v56-sheet',dialog);if(sheet)return sheet;
  sheet=document.createElement('section');sheet.className='v56-sheet';
  sheet.innerHTML='<div class="v56-sheet-card"><header class="v56-sheet-head"><div><small>TRAINING HEUTE</small><h3>Übungsübersicht</h3></div><button type="button" class="v56-sheet-close">Schließen</button></header><div class="v56-sheet-body"></div></div>';
  dialog.append(sheet);q('.v56-sheet-close',sheet).onclick=()=>sheet.classList.remove('open');sheet.onclick=e=>{if(e.target===sheet)sheet.classList.remove('open')};return sheet;
}

function moveOverview(dialog){const details=q('#exercise-list>.training-overview-v53',dialog);if(!details)return;const body=q('.v56-sheet-body',ensureSheet(dialog));body.replaceChildren(details);details.open=true}
function openOverview(dialog){moveOverview(dialog);q('.v56-sheet',dialog)?.classList.add('open')}

function ensureProgress(dialog){
  const list=q('#exercise-list',dialog),items=qa('[data-select-ex-v53]',dialog),active=q('.overview-item-v53.active',dialog),index=Math.max(0,items.indexOf(active));if(!list)return;
  let p=q('.v56-progress',list);if(!p){p=document.createElement('div');p.className='v56-progress';p.innerHTML='<button type="button" class="v56-overview-button">☷ Übungen</button><div class="v56-progress-track"><i></i></div><strong></strong>';list.prepend(p);q('button',p).onclick=()=>openOverview(dialog)}
  p.style.setProperty('--v56-progress',`${Math.round(((index+1)/Math.max(1,items.length))*100)}%`);q('strong',p).textContent=`${index+1} / ${Math.max(1,items.length)}`;
}

function ensureDock(dialog){
  const nav=q('.training-exercise-v53 .exercise-nav-v53',dialog);if(!nav)return;let dock=q('.v56-dock',dialog);if(!dock){dock=document.createElement('nav');dock.className='v56-dock';dialog.append(dock)}
  const prev=q('[data-prev-ex-v53]',nav),next=q('[data-next-ex-v53]',nav);let overview=q('.v56-dock-overview',dock);if(!overview){overview=document.createElement('button');overview.type='button';overview.className='v56-dock-overview';overview.textContent='☷';overview.onclick=()=>openOverview(dialog)}dock.replaceChildren(prev,overview,next)
}

function enhanceWorkout(){
  const dialog=q('#workout-dialog');if(!dialog?.open)return;observer?.disconnect();
  dialog.classList.add('workout-v56');ensureHeader(dialog);moveOverview(dialog);ensureProgress(dialog);ensureDock(dialog);connectObserver();
}

function install(){loadCss();const dialog=q('#workout-dialog');dialog?.addEventListener('toggle',()=>{if(dialog.open)[40,160,420].forEach(scheduleEnhance)});document.addEventListener('click',e=>{if(e.target.closest('[data-workout],#start-workout,[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-device-index-v55],[data-variant-prev-v53],[data-variant-next-v53]'))scheduleEnhance(80)},true);if(dialog?.open)scheduleEnhance()}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',install,{once:true});else install();
