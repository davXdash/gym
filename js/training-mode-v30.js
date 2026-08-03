const ACTIVE_KEY='gym-active-workout-v11';
const DRAFT_KEY='gym-tracking-draft-v18';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let currentIndex=0;

function cards(){return qa('#exercise-list .exercise-card[data-v18]')}
function activeState(){return read(ACTIVE_KEY,{statuses:{}})}
function saveState(state){write(ACTIVE_KEY,state)}
function exerciseStatus(index){return activeState().statuses?.[index]||'pending'}

function ensureProgress(){
  const list=q('#exercise-list');if(!list)return null;
  let nav=q('.exercise-progress-v30',list);
  if(!nav){nav=document.createElement('nav');nav.className='exercise-progress-v30';nav.setAttribute('aria-label','Übungsfortschritt');list.prepend(nav)}
  return nav;
}

function labelFor(card,index){
  const name=q('h3',card)?.textContent.trim()||`Übung ${index+1}`;
  return `${index+1}. ${name}`;
}

function renderProgress(){
  const list=cards(),nav=ensureProgress();if(!nav||!list.length)return;
  nav.innerHTML=list.map((card,index)=>{
    const status=exerciseStatus(index);
    const cls=[index===currentIndex?'active':'',status==='completed'?'done':'',status==='skipped'?'skipped':''].filter(Boolean).join(' ');
    const mark=status==='completed'?'✓':status==='skipped'?'–':String(index+1);
    return `<button type="button" class="${cls}" data-jump-v30="${index}" aria-label="${labelFor(card,index)}">${mark}</button>`;
  }).join('');
}

function renameStatusButtons(){
  cards().forEach(card=>{
    const skipped=q('[data-state="skipped"]',card);if(skipped)skipped.textContent='Heute auslassen';
  });
}

function ensureCardNavigation(card,index,total){
  let nav=q('.exercise-nav-v30',card);if(nav)return;
  nav=document.createElement('div');nav.className='exercise-nav-v30';
  nav.innerHTML=`<button type="button" class="secondary" data-prev-ex-v30 ${index===0?'disabled':''}>‹ Vorherige</button><button type="button" class="secondary" data-next-ex-v30 ${index===total-1?'disabled':''}>Nächste ›</button>`;
  card.append(nav);
}

function showExercise(index,{scroll=true}={}){
  const list=cards();if(!list.length)return;
  currentIndex=Math.max(0,Math.min(index,list.length-1));
  list.forEach((card,i)=>card.classList.toggle('active-v30',i===currentIndex));
  renderProgress();
  if(scroll){q('#exercise-list')?.scrollTo({top:0,behavior:'smooth'})}
}

function nextUnfinished(from){
  const list=cards();
  for(let step=1;step<=list.length;step++){
    const idx=(from+step)%list.length;
    if(exerciseStatus(idx)==='pending')return idx;
  }
  return Math.min(from+1,list.length-1);
}

function interceptStatus(event){
  const button=event.target.closest('#exercise-list [data-ex][data-state]');if(!button)return;
  const card=button.closest('.exercise-card');const list=cards();const index=list.indexOf(card);if(index<0)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const state=activeState();state.statuses=state.statuses||{};
  const nextValue=button.dataset.state;
  state.statuses[index]=state.statuses[index]===nextValue?'pending':nextValue;
  saveState(state);
  qa('[data-ex]',card).forEach(x=>x.classList.toggle('selected',state.statuses[index]===x.dataset.state));
  renderProgress();
  if(state.statuses[index]!=='pending')showExercise(nextUnfinished(index));
}

function attachUI(){
  const list=cards();if(!list.length)return;
  renameStatusButtons();
  list.forEach((card,index)=>ensureCardNavigation(card,index,list.length));
  const state=activeState();
  const firstPending=list.findIndex((_,i)=>(state.statuses?.[i]||'pending')==='pending');
  if(!list[currentIndex]?.classList.contains('active-v30'))currentIndex=firstPending>=0?firstPending:0;
  showExercise(currentIndex,{scroll:false});
}

function simplifyConnection(){
  const el=q('#connection-status');if(!el)return;
  const offline=!navigator.onLine||localStorage.getItem('gym-offline-v11')==='1';
  el.classList.toggle('offline-v30',offline);
  el.textContent='';
  el.title=offline?'Offline – Änderungen werden lokal gespeichert':'Online';
  el.setAttribute('aria-label',el.title);
}

function observeCards(){
  const list=q('#exercise-list');if(!list)return;
  const observer=new MutationObserver(()=>requestAnimationFrame(attachUI));
  observer.observe(list,{childList:true,subtree:true});
}

window.addEventListener('click',interceptStatus,true);
document.addEventListener('click',event=>{
  const jump=event.target.closest('[data-jump-v30]');if(jump){showExercise(Number(jump.dataset.jumpV30));return}
  const prev=event.target.closest('[data-prev-ex-v30]');if(prev){showExercise(currentIndex-1);return}
  const next=event.target.closest('[data-next-ex-v30]');if(next){showExercise(currentIndex+1);return}
  if(event.target.closest('[data-workout],#start-workout'))setTimeout(attachUI,120);
},true);
window.addEventListener('online',simplifyConnection);
window.addEventListener('offline',simplifyConnection);
window.addEventListener('load',()=>{setTimeout(()=>{attachUI();simplifyConnection();observeCards()},700)});
setInterval(simplifyConnection,10000);
