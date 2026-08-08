const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const HISTORY='gym-v55-device-history';
const canon=v=>String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();
const read=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const meaningful=v=>v!==undefined&&v!==null&&String(v).trim()!=='';

function historyFor(name){
  const all=read(HISTORY,{}),key=canon(name);
  return all[name]||Object.entries(all).find(([candidate])=>canon(candidate)===key)?.[1]||null;
}
function workSets(name){
  return (historyFor(name)?.sets||[]).filter(set=>!set.warmup&&(meaningful(set.weight)||meaningful(set.reps)||meaningful(set.rir)));
}
function currentDevice(card){return q('.device-nav-v53 strong',card)?.textContent?.trim()||''}
function applySet(row,set){
  if(!row||!set)return;
  const values={weight:set.weight??'',reps:set.reps??'',rir:set.rir??''};
  for(const [field,value] of Object.entries(values)){
    const input=q(`[data-field-v53="${field}"]`,row);if(!input)continue;
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
}
function installPreviousButtons(card){
  const previous=workSets(currentDevice(card));
  qa('.set-row-v53',card).forEach((row,index)=>{
    let helper=row.nextElementSibling;
    if(!helper?.classList.contains('v61-suggest'))return;
    let button=q('.v61-previous',helper);
    if(!button){button=document.createElement('button');button.type='button';button.className='v61-previous';button.textContent='Vorwerte';helper.append(button)}
    const source=previous[index]||previous.at(-1)||null;
    button.disabled=!source;
    button.onclick=()=>applySet(row,source);
  });
}
function normalizeCoach(card){
  const coach=q('.coach-card-v53',card);if(!coach)return;
  const label=q('.coach-label-v53',coach),grid=q('.coach-grid-v53',coach);
  if(label)label.classList.add('live-coach-head');
  if(grid)grid.classList.add('live-coach-grid');
  qa('.coach-grid-v53>div',coach).forEach(block=>{
    const small=q('small',block),p=q('p',block);
    if(small)small.classList.add('live-coach-label');
    if(p)p.classList.add('live-coach-text');
  });
}
function ensureDock(dialog){
  const dock=q('.v61-dock',dialog);if(!dock)return;
  dock.style.position='fixed';dock.style.left='0';dock.style.right='0';dock.style.bottom='0';dock.style.zIndex='999';
}
function enhance(){
  const dialog=q('#workout-dialog');if(!dialog?.open)return;
  const card=q('.training-exercise-v53',dialog);if(card){normalizeCoach(card);installPreviousButtons(card)}
  ensureDock(dialog);
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
const observer=new MutationObserver(schedule);
function install(){
  const dialog=q('#workout-dialog');if(!dialog)return;
  observer.observe(dialog,{childList:true,subtree:true});
  dialog.addEventListener('toggle',schedule);
  document.addEventListener('click',schedule,true);
  document.addEventListener('input',schedule,true);
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
