const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

const SET_TARGETS={
  'Schrägbankdrückmaschine dual':3,
  'Latzugstation mit Oberschenkelpolster':3,
  'Brustpresse sitzend':2,
  'Rudermaschine mit Brustpolster':3,
  'Seithebemaschine ohne Armpolster':4,
  'Butterfly reverse mit Griffen':3,
  'Bauchmuskelmaschine':3,
  'Kurzhantel-Schrägbankdrücken':3,
  'High Row dual':3,
  'Butterfly mit Griffen':2,
  'Low Row dual':3,
  'Trizepsmaschine Überkopf':2,
  'Bizepsmaschine':2,
  'Rückenstreckermaschine':3
};

function desiredSets(card){
  const name=card.querySelector('h3')?.textContent.trim();
  return SET_TARGETS[name]||3;
}

function normalizeSetRows(card){
  if(!card?.dataset?.v18)return;
  const target=desiredSets(card);
  const table=card.querySelector('.set-table');
  if(!table)return;
  let rows=[...table.querySelectorAll('.set-row:not(.header)')];
  const add=card.querySelector('[data-add-set]');
  // Nur fehlende Ausgangszeilen ergänzen. Niemals zusätzliche oder bereits
  // ausgefüllte Sätze löschen; Warm-up-Sätze zählen nicht gegen Arbeitssätze.
  const workRows=()=>rows.filter(r=>!r.querySelector('[data-warmup]')?.checked);
  while(workRows().length<target&&add){
    add.click();
    rows=[...table.querySelectorAll('.set-row:not(.header)')];
    const newest=rows.at(-1)?.querySelector('[data-warmup]');
    if(newest)newest.checked=false;
  }
  const meta=card.querySelector('.exercise-v18-head p');
  if(meta){
    const current=meta.textContent;
    meta.textContent=current.match(/\d+\s*×/)?current.replace(/\d+\s*×/,`${target} ×`):`${target} Arbeitssätze`;
  }
}

function normalizeAll(){$$('#exercise-list .exercise-card').forEach(normalizeSetRows)}
function cleanOverloadCopy(){$$('.overload-note').forEach(x=>x.remove())}
function updateHeader(){
  const title=$('#page-title');
  if(title&&title.textContent==='Dashboard')title.textContent='Dashboard Dave';
  const offline=$('#offline-toggle');
  if(offline){offline.textContent='Offline';offline.title='Manuellen Offline-Modus ein- oder ausschalten';offline.setAttribute('aria-label','Manuellen Offline-Modus umschalten')}
  const connection=$('#connection-status');
  if(connection&&connection.textContent==='Offline manuell')connection.textContent='Online';
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-workout],#start-workout'))setTimeout(()=>{normalizeAll();cleanOverloadCopy()},80);
  if(e.target.closest('[data-page="dashboard"]'))setTimeout(updateHeader,0);
},true);
window.addEventListener('load',()=>{updateHeader();setTimeout(()=>{normalizeAll();cleanOverloadCopy();updateHeader()},500)});
