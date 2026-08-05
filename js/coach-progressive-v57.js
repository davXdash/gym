const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const HISTORY='gym-v55-device-history';
let rendering=false;

const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const fmt=v=>num(v)==null?'–':num(v).toLocaleString('de-DE',{maximumFractionDigits:2});
const canon=v=>String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function currentCard(){return q('#workout-dialog.workout-v53 .training-exercise-v53')}
function deviceName(card){return q('.device-nav-v53 strong',card)?.textContent.trim()||''}
function historyFor(name){const all=read(HISTORY,{}),key=canon(name);return all[name]||Object.entries(all).find(([candidate])=>canon(candidate)===key)?.[1]||null}
function targetRange(card){const text=q('.exercise-title-v53 p',card)?.textContent||'';const match=text.match(/(\d+)\s*[–-]\s*(\d+)/);return match?{min:Number(match[1]),max:Number(match[2])}:{min:8,max:12}}
function currentSets(card){return qa('.set-row-v53',card).map((row,index)=>({
 index:index+1,
 weight:num(q('[data-field-v53="weight"]',row)?.value),
 reps:num(q('[data-field-v53="reps"]',row)?.value),
 rir:num(q('[data-field-v53="rir"]',row)?.value),
 warmup:Boolean(q('[data-field-v53="warmup"]',row)?.checked)
})).filter(set=>!set.warmup&&set.weight!=null&&set.reps!=null)}
function historicSets(name){return (historyFor(name)?.sets||[]).map((set,index)=>({index:index+1,weight:num(set.weight),reps:num(set.reps),rir:num(set.rir),warmup:Boolean(set.warmup)})).filter(set=>!set.warmup&&set.weight!=null&&set.reps!=null)}

function workingSets(sets){
 if(!sets.length)return [];
 const highest=Math.max(...sets.map(set=>set.weight));
 return sets.filter(set=>set.weight===highest);
}

function classifyEarlierSets(sets){
 if(!sets.length)return [];
 const highest=Math.max(...sets.map(set=>set.weight));
 return sets.filter(set=>set.weight<highest).map(set=>({
  ...set,
  role:(set.rir!=null&&set.rir>=3)||set.weight<=highest*.9?'Einstieg/Test':'leichter Arbeitssatz'
 }));
}

function nextFromLatest(set,range,{sameSession=false}={}){
 const rir=set.rir;
 if(rir!=null&&rir>=3&&set.reps>=range.max){
  return {weight:set.weight,target:`nächster verfügbarer Gewichtsschritt`,rir:'1–2',title:'Gewicht erhöhen',note:`${fmt(set.weight)} kg × ${set.reps} mit RIR ${rir} war deutlich zu leicht. Nicht wiederholen.`};
 }
 if(rir!=null&&rir>=3){
  return {weight:set.weight,target:`${Math.min(range.max,set.reps+2)}–${range.max} Wdh. oder Gewicht erhöhen`,rir:'1–2',title:'Belastung erhöhen',note:'Die vorhandene Reserve ist zu groß für einen relevanten Arbeitssatz.'};
 }
 if(rir===0){
  const low=sameSession?Math.max(range.min,set.reps-1):set.reps;
  const high=sameSession?set.reps:Math.min(range.max,set.reps+1);
  return {weight:set.weight,target:`${low}${high!==low?`–${high}`:''} Wdh.`,rir:sameSession?'0–1':'1',title:`${fmt(set.weight)} kg beibehalten`,note:sameSession?'Nach dem Satz bis zum Versagen nicht erneut steigern. Durch Vorermüdung ist eine Wiederholung weniger normal.':'Dasselbe Gewicht zuerst kontrollierter bestätigen; danach Wiederholungen steigern.'};
 }
 if(rir!=null&&rir<=2){
  const target=Math.min(range.max,set.reps+1);
  return {weight:set.weight,target:`${target} Wdh.`,rir:'1–2',title:`${fmt(set.weight)} kg beibehalten`,note:target>set.reps?'Eine saubere Wiederholung mehr anstreben.':'Oberes Wiederholungsziel erreicht; nächsten Gewichtsschritt erst bei stabiler Ausführung testen.'};
 }
 return {weight:set.weight,target:`${set.reps}–${Math.min(range.max,set.reps+1)} Wdh.`,rir:'1–2',title:`${fmt(set.weight)} kg beibehalten`,note:'Zuerst eine belastbare RIR-Angabe setzen und die Leistung bestätigen.'};
}

function model(card){
 const name=deviceName(card),range=targetRange(card),today=currentSets(card),history=historicSets(name);
 if(today.length){
  const active=workingSets(today),latest=active.at(-1),earlier=classifyEarlierSets(today),next=nextFromLatest(latest,range,{sameSession:true});
  return {name,source:'Heute',sets:today,active,earlier,next,range};
 }
 if(history.length){
  const active=workingSets(history),latest=active.at(-1),earlier=classifyEarlierSets(history),next=nextFromLatest(latest,range,{sameSession:false});
  return {name,source:'Letztes Training',sets:history,active,earlier,next,range};
 }
 return {name,source:'Keine Daten',sets:[],active:[],earlier:[],next:null,range};
}

function render(){
 if(rendering)return;
 const card=currentCard(),box=card&&q('.coach-card-v53',card);if(!card||!box)return;
 const data=model(card);rendering=true;
 try{
  if(!data.next){
   box.innerHTML=`<div class="coach-label-v55"><span>COACH · ${esc(data.name)}</span><strong>Neue Gerätereferenz</strong></div><p class="coach-empty-v55">Noch keine belastbaren Arbeitssätze an diesem Gerät. Starte mit einem passenden Gewicht und steigere, wenn du den Zielbereich mit deutlich mehr als RIR 2 erreichst.</p>`;
   return;
  }
  const activeRows=data.active.map((set,index)=>`<article><span>Arbeit ${index+1}</span><div><small>${esc(data.source)}</small><strong>${fmt(set.weight)} kg × ${set.reps}${set.rir==null?'':` · RIR ${set.rir}`}</strong></div></article>`).join('');
  const ignored=data.earlier.length?`<div class="coach-ignored-v57"><strong>Nicht als Progressionsbasis</strong>${data.earlier.map(set=>`<span>${fmt(set.weight)} kg × ${set.reps}${set.rir==null?'':` · RIR ${set.rir}`} · ${esc(set.role)}</span>`).join('')}</div>`:'';
  box.innerHTML=`<div class="coach-label-v55"><span>COACH · ${esc(data.name)}</span><strong>${esc(data.next.title)}</strong></div>${ignored}<div class="coach-current-v57">${activeRows}</div><div class="coach-next-v57"><small>Nächster Satz</small><strong>${data.next.weight?`${fmt(data.next.weight)} kg · `:''}${esc(data.next.target)} · Ziel RIR ${esc(data.next.rir)}</strong><p>${esc(data.next.note)}</p></div><p class="coach-foot-v55">Progressionsbasis ist immer das höchste tatsächlich verwendete Arbeitsgewicht. Leichtere Einstiegs- oder Testsätze werden nicht als nächste Vorgabe wiederholt.</p>`;
 }finally{rendering=false}
}

function schedule(){[0,60,180].forEach(delay=>setTimeout(render,delay))}

document.addEventListener('input',event=>{if(event.target.closest('#workout-dialog.workout-v53 [data-field-v53]'))schedule()},true);
document.addEventListener('change',event=>{if(event.target.closest('#workout-dialog.workout-v53 [data-field-v53]'))schedule()},true);
document.addEventListener('click',event=>{if(event.target.closest('[data-select-ex-v53],[data-prev-ex-v53],[data-next-ex-v53],[data-variant-prev-v53],[data-variant-next-v53],[data-device-index-v55],[data-add-set-v53],[data-remove-set-v53]'))schedule()},true);
window.addEventListener('load',()=>{const dialog=q('#workout-dialog');dialog?.addEventListener('toggle',()=>{if(dialog.open)schedule()});schedule()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
