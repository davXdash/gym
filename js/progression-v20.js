const HISTORY_KEY='gym-tracking-history-v18';
const $all=s=>[...document.querySelectorAll(s)];
const read=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};

const SETTINGS={
  'Kurzhantel Schrägbankdrücken':{increment:2,kind:'Kurzhantel'},
  'Kurzhantel Seitheben sitzend':{increment:2,kind:'Kurzhantel',conservative:true},
  'Kurzhantel Seitheben stehend':{increment:2,kind:'Kurzhantel',conservative:true},
  'Seithebemaschine ohne Armpolster':{kind:'Maschine',conservative:true},
  'Seithebemaschine dual ohne Armpolster':{kind:'Maschine',conservative:true}
};

function number(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null}
function fmt(n){return Number(n).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2})}
function repRange(card){
  const text=card.querySelector('.exercise-v18-head p')?.textContent||'';
  const m=text.match(/(\d+)\s*[–-]\s*(\d+)/);
  return m?{min:Number(m[1]),max:Number(m[2])}:{min:8,max:12};
}
function currentVariant(card){return card.querySelector('[data-name]')?.textContent.trim()||card.querySelector('h3')?.textContent.trim()||''}
function latestFor(name){return read(HISTORY_KEY,{})[name]||null}
function workSets(row){return (row?.sets||[]).filter(s=>!s.warmup&&number(s.weight)!==null&&number(s.reps)!==null)}

function recommendation(card){
  const name=currentVariant(card),last=latestFor(name),sets=workSets(last),range=repRange(card),cfg=SETTINGS[name]||{kind:'Gerät'};
  if(!sets.length)return {title:'Erster dokumentierter Durchgang',body:'Wähle ein kontrollierbares Startgewicht und trage die Arbeitssätze ein.',target:'Noch keine Zielwerte vorhanden.'};
  const allTop=sets.every(s=>number(s.reps)>=range.max);
  const weight=number(sets[0].weight);
  if(allTop&&cfg.conservative){
    return {title:'Oberes Wiederholungsziel erreicht',body:'Schulterübung: Gewicht nicht automatisch erhöhen. Technik, Beschwerdefreiheit und kontrollierte Wiederholungen zuerst prüfen.',target:`Zuletzt ${sets.map(s=>`${fmt(s.weight)} kg × ${s.reps}`).join(' · ')}`};
  }
  if(allTop){
    const next=cfg.increment&&weight!==null?weight+cfg.increment:null;
    return {title:'Gewichtssteigerung möglich',body:next!==null?`Nächster Versuch: ${fmt(next)} kg. Falls dieses Gewicht nicht verfügbar ist, den nächsthöheren realen Geräteschritt wählen.`:'Beim nächsten Training den nächsthöheren tatsächlich verfügbaren Gewichts­schritt wählen.',target:`Alle Arbeitssätze haben ${range.max} Wiederholungen erreicht.`};
  }
  const targets=sets.map(s=>Math.min(range.max,number(s.reps)+1));
  return {title:'Gewicht beibehalten',body:'Versuche heute bei demselben Gewicht mindestens eine zusätzliche saubere Wiederholung, ohne einen schlechten Trainingstag als Rückschritt zu werten.',target:`Ziel: ${targets.join(' / ')} Wiederholungen bei ${weight!==null?fmt(weight)+' kg':'dem letzten Gewicht'}.`};
}

function addRecommendation(card){
  const panel=card.querySelector('.tracking-panel');if(!panel)return;
  let box=panel.querySelector('.progression-card-v20');
  if(!box){box=document.createElement('section');box.className='progression-card-v20';panel.prepend(box)}
  const r=recommendation(card);
  box.innerHTML=`<small>EMPFEHLUNG HEUTE</small><strong>${r.title}</strong><p>${r.target}</p><span>${r.body}</span>`;
}

function addEquipmentStep(card){
  const panel=card.querySelector('.tracking-panel');if(!panel||panel.querySelector('.equipment-step-v20'))return;
  const wrap=document.createElement('details');wrap.className='equipment-step-v20';
  wrap.innerHTML=`<summary>Gewichtsschritte dieses Geräts</summary><div><label>Nächster Gewichtsschritt<input data-step-v20 inputmode="decimal" placeholder="z. B. 2, 2,5 oder 5 kg"></label><p>Wird zunächst nur lokal für dieses Gerät gespeichert und später mit Supabase synchronisiert.</p></div>`;
  panel.append(wrap);
  const input=wrap.querySelector('input'),key=`gym-equipment-step:${currentVariant(card)}`;input.value=localStorage.getItem(key)||'';input.addEventListener('change',()=>localStorage.setItem(key,input.value));
}

function enhance(){
  $all('#exercise-list .exercise-card[data-v18]').forEach(card=>{addRecommendation(card);addEquipmentStep(card)});
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-workout],#start-workout,.tracking-toggle,[data-prev],[data-next]'))setTimeout(enhance,80);
},true);
window.addEventListener('load',()=>setTimeout(enhance,700));
