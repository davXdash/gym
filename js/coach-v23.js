const COACH_HISTORY='gym-coach-history-v23';
const TRACKING_HISTORY='gym-tracking-history-v18';
const TRACKING_DRAFT='gym-tracking-draft-v18';
const ACTIVE='gym-active-workout-v11';

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

function variantName(card){return q('[data-name]',card)?.textContent.trim()||q('h3',card)?.textContent.trim()||''}
function rows(card){return qa('.set-row:not(.header)',card)}
function value(row,selector){return q(selector,row)?.value??''}
function checked(row){return Boolean(q('[data-warmup]',row)?.checked)}
function meaningful(row){return Boolean(value(row,'[data-weight]')||value(row,'[data-reps]')||value(row,'[data-rir]')||checked(row))}
function fire(input,type='input'){input?.dispatchEvent(new Event(type,{bubbles:true}))}

function fillRow(row,set,{markGenerated=true,inheritWarmup=false}={}){
  const pairs=[['[data-weight]',set?.weight],['[data-reps]',set?.reps],['[data-rir]',set?.rir]];
  for(const [selector,v] of pairs){const input=q(selector,row);if(!input||v===undefined||v===null||v==='')continue;input.value=String(v);if(markGenerated)input.dataset.coachGenerated='1';fire(input)}
  const warm=q('[data-warmup]',row);
  if(warm){
    // Ein neuer Satz ist standardmäßig ein Arbeitssatz. Warm-up wird nur beim
    // Wiederherstellen einer früheren Einheit übernommen, nie durch "+ Satz".
    warm.checked=inheritWarmup?Boolean(set?.warmup):false;
    if(markGenerated)warm.dataset.coachGenerated='1';
    fire(warm,'change');
  }
}

function currentSavedSets(card){return rows(card).map(r=>({weight:value(r,'[data-weight]'),reps:value(r,'[data-reps]'),rir:value(r,'[data-rir]'),warmup:checked(r)}))}
function latestSets(name){const coach=read(COACH_HISTORY,{});if(coach[name]?.sets?.length)return coach[name].sets;const old=read(TRACKING_HISTORY,{});return old[name]?.sets||[]}

function forceDraftSave(card){
  if(!card?.dataset?.code)return;
  const all=read(TRACKING_DRAFT,{}),key=`${card.dataset.code}:${Number(card.dataset.index)}`;
  all[key]={variantIndex:card._variantIndex||0,sets:currentSavedSets(card),updatedAt:new Date().toISOString()};
  write(TRACKING_DRAFT,all);
}

function prefillCard(card){
  if(!card?.dataset?.v18)return;
  const existing=rows(card);if(!existing.length||existing.some(meaningful))return;
  const previous=latestSets(variantName(card));if(!previous.length)return;
  existing.forEach((row,i)=>fillRow(row,previous[i]||previous.at(-1),{inheritWarmup:true}));
  card.dataset.coachPrefilled='1';forceDraftSave(card);
}

function clonePreviousIntoNew(card,beforeCount,previous){
  const all=rows(card);if(all.length<=beforeCount)return;
  const added=all.at(-1);
  fillRow(added,previous||{},{inheritWarmup:false});
  forceDraftSave(card);
}

function propagateTrusted(input){
  if(!input.isTrusted)return;
  const selector=input.matches('[data-weight]')?'[data-weight]':input.matches('[data-reps]')?'[data-reps]':input.matches('[data-rir]')?'[data-rir]':null;
  const card=input.closest('.exercise-card');
  if(selector){
    input.dataset.userEdited='1';
    const all=rows(card),index=all.indexOf(input.closest('.set-row'));
    for(let i=index+1;i<all.length;i++){
      const next=q(selector,all[i]);
      if(!next||next.dataset.userEdited==='1')continue;
      next.value=input.value;next.dataset.coachGenerated='1';fire(next);
    }
  }
  if(card)forceDraftSave(card);
}

function rememberBeforeCompletion(){
  const active=read(ACTIVE,null);if(!active?.code)return;
  const cards=qa('#exercise-list .exercise-card[data-v18]');if(!cards.length)return;
  const history=read(COACH_HISTORY,{});
  cards.forEach(card=>{
    forceDraftSave(card);
    const name=variantName(card),sets=currentSavedSets(card).filter(s=>s.weight||s.reps||s.rir||s.warmup);
    if(name&&sets.length)history[name]={date:new Date().toISOString(),sets};
  });
  write(COACH_HISTORY,history);
}

function enhanceVisibleCards(){qa('#exercise-list .exercise-card[data-v18]').forEach(prefillCard)}

document.addEventListener('click',event=>{
  const add=event.target.closest('[data-add-set]');
  if(add){
    const card=add.closest('.exercise-card'),all=rows(card),last=all.at(-1);
    const previous=last?{weight:value(last,'[data-weight]'),reps:value(last,'[data-reps]'),rir:value(last,'[data-rir]')}:{ };
    const count=all.length;
    setTimeout(()=>clonePreviousIntoNew(card,count,previous),20);
    return;
  }
  if(event.target.closest('.tracking-toggle,[data-prev],[data-next],[data-workout],#start-workout'))setTimeout(enhanceVisibleCards,60);
  if(event.target.closest('#complete-workout'))rememberBeforeCompletion();
},true);

document.addEventListener('input',event=>propagateTrusted(event.target),true);
document.addEventListener('change',event=>{const card=event.target.closest?.('.exercise-card');if(card)forceDraftSave(card)},true);
window.addEventListener('load',()=>setTimeout(enhanceVisibleCards,700));
