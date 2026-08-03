const $=s=>document.querySelector(s);

const VARIANTS={
 'Schrägbankdrückmaschine dual':[
  {role:'Standard',name:'Schrägbankdrückmaschine dual',image:'IMG_3062.png'},
  {role:'Alternative 1',name:'Schrägbankmaschine sitzend',image:'IMG_3063.png'},
  {role:'Alternative 2',name:'Kurzhantel Schrägbankdrücken',image:'IMG_3071.png'},
  {role:'Alternative 3',name:'Bankdrückmaschine sitzend dual',image:'IMG_3048.png'}
 ],
 'Kurzhantel-Schrägbankdrücken':[
  {role:'Standard',name:'Kurzhantel Schrägbankdrücken',image:'IMG_3071.png'},
  {role:'Alternative 1',name:'Schrägbankdrückmaschine dual',image:'IMG_3062.png'},
  {role:'Alternative 2',name:'Schrägbankmaschine sitzend',image:'IMG_3063.png'}
 ],
 'Brustpresse sitzend':[
  {role:'Standard',name:'Brustpresse sitzend',image:'IMG_3047.png'},
  {role:'Alternative 1',name:'Bankdrückmaschine sitzend dual',image:'IMG_3048.png'},
  {role:'Alternative 2',name:'Bankdrückmaschine liegend dual',image:'IMG_3049.png'}
 ],
 'Butterfly mit Griffen':[
  {role:'Standard',name:'Butterfly mit Griffen',image:'IMG_3050.png'},
  {role:'Alternative 1',name:'Butterfly mit Pads',image:'IMG_3051.png'}
 ],
 'Seithebemaschine ohne Armpolster':[
  {role:'Standard',name:'Seithebemaschine ohne Armpolster',image:'IMG_3064.png'},
  {role:'Alternative 1',name:'Seithebemaschine dual ohne Armpolster',image:'IMG_3065.png'},
  {role:'Alternative 2',name:'Kurzhantel Seitheben sitzend',image:'IMG_3069.png'},
  {role:'Alternative 3',name:'Kurzhantel Seitheben stehend',image:'IMG_3070.png'}
 ],
 'Trizepsmaschine Überkopf':[
  {role:'Standard',name:'Trizepsmaschine über Kopf',image:'IMG_3066.png'},
  {role:'Alternative 1',name:'Trizepsmaschine horizontal',image:'IMG_3067.png'},
  {role:'Alternative 2',name:'Trizeps Dip Maschine sitzend dual',image:'IMG_3068.png'}
 ],
 'Bizepsmaschine':[
  {role:'Standard',name:'Bizepsmaschine',image:'IMG_3044.png'},
  {role:'Alternative 1',name:'Bizepsmaschine Plate loaded',image:'IMG_3045.png'},
  {role:'Alternative 2',name:'Scott Curler sitzend',image:'IMG_3046.png'}
 ],
 'Bauchmuskelmaschine':[
  {role:'Standard',name:'Bauchmuskelmaschine',image:'IMG_3040.png'},
  {role:'Alternative 1',name:'Bauchmuskelmaschine Crunch liegend',image:'IMG_3041.png'},
  {role:'Alternative 2',name:'Klappsitz Bauchmaschine sitzend',image:'IMG_3042.png'},
  {role:'Alternative 3',name:'Klappsitz Bauchmaschine liegend, Plate loaded',image:'IMG_3043.png'}
 ],
 'Latzugstation mit Oberschenkelpolster':[
  {role:'Standard',name:'Latzugstation mit Oberschenkelpolster',image:null},
  {role:'Alternative 1',name:'Rückenzugmaschine dual',image:null},
  {role:'Alternative 2',name:'High Row dual',image:null}
 ],
 'Rudermaschine mit Brustpolster':[
  {role:'Standard',name:'Rudermaschine mit Brustpolster',image:null},
  {role:'Alternative 1',name:'Low Row dual',image:null},
  {role:'Alternative 2',name:'High Row dual',image:null}
 ],
 'High Row dual':[
  {role:'Standard',name:'High Row dual',image:null},
  {role:'Alternative 1',name:'Rückenzugmaschine dual',image:null},
  {role:'Alternative 2',name:'Rudermaschine mit Brustpolster',image:null}
 ],
 'Low Row dual':[
  {role:'Standard',name:'Low Row dual',image:null},
  {role:'Alternative 1',name:'Rudermaschine mit Brustpolster',image:null},
  {role:'Alternative 2',name:'High Row dual',image:null}
 ],
 'Butterfly reverse mit Griffen':[
  {role:'Standard',name:'Butterfly reverse mit Griffen',image:null},
  {role:'Alternative 1',name:'Butterfly reverse mit Pads',image:null}
 ]
};

function parseSetCount(card){
 const text=[...card.querySelectorAll('p')].map(p=>p.textContent).find(t=>/\d+\s*×/.test(t))||'';
 const match=text.match(/(\d+)\s*×/);return match?Number(match[1]):3;
}

function trackingMarkup(setCount){
 const rows=Array.from({length:setCount},(_,i)=>`<div class="set-row"><span class="set-label">${i+1}</span><input inputmode="decimal" placeholder="kg" aria-label="Gewicht Satz ${i+1}"><input inputmode="numeric" placeholder="Wdh" aria-label="Wiederholungen Satz ${i+1}"><input inputmode="decimal" placeholder="RIR" aria-label="RIR Satz ${i+1}"></div>`).join('');
 return `<button type="button" class="tracking-toggle">Tracking öffnen</button><section class="tracking-panel"><div class="tracking-last"><div><small>Zuletzt an diesem Gerät</small><strong>noch keine Daten</strong></div><div><small>Zuletzt Standard</small><strong>noch keine Daten</strong></div></div><div class="warmup-row"><label><input type="checkbox"> Warm-up-Satz</label><span>optional</span></div><div class="set-table"><div class="set-row header"><span>Satz</span><span>Gewicht</span><span>Wdh.</span><span>RIR</span></div>${rows}</div><p class="tracking-note">Vorschau: Diese Eingaben werden in dieser Version noch nicht gespeichert.</p></section>`;
}

function renderVariant(card){
 const variants=card._variants||[],index=card._variantIndex||0,v=variants[index];if(!v)return;
 card.querySelector('[data-role]').textContent=v.role;
 card.querySelector('[data-variant-name]').textContent=v.name;
 card.querySelector('[data-counter]').textContent=`${index+1} / ${variants.length}`;
 const media=card.querySelector('[data-variant-media]');
 media.innerHTML=v.image?`<img src="${v.image}" alt="${v.name}" loading="eager">`:`<div class="no-image">Bildzuordnung für dieses Rückengerät folgt.</div>`;
 card.querySelector('[data-prev]').disabled=index===0;
 card.querySelector('[data-next]').disabled=index===variants.length-1;
}

function enhanceCard(card){
 if(card.dataset.trackingV16==='1')return;
 const heading=card.querySelector('h3');if(!heading)return;
 const exerciseName=heading.textContent.trim();const variants=VARIANTS[exerciseName];if(!variants)return;
 card.dataset.trackingV16='1';card._variants=variants;card._variantIndex=0;
 const meta=[...card.querySelectorAll('p')].map(p=>p.textContent).find(t=>/\d+\s*×/.test(t))||'';
 const actions=card.querySelector('.exercise-actions');
 card.querySelectorAll('.exercise-media,.exercise-guidance-v14,.exercise-alternatives-v14').forEach(x=>x.remove());
 [...card.children].forEach(el=>{if(el!==actions)el.remove()});
 const head=document.createElement('div');head.className='exercise-v16-head';head.innerHTML=`<h3>${exerciseName}</h3><div class="exercise-v16-meta">${meta}</div>`;
 const shell=document.createElement('section');shell.className='variant-shell';shell.innerHTML=`<div class="variant-nav"><button type="button" class="variant-arrow" data-prev aria-label="Vorherige Variante">‹</button><div class="variant-label"><small data-role>Standard</small><strong data-variant-name></strong><div class="variant-counter" data-counter></div></div><button type="button" class="variant-arrow" data-next aria-label="Nächste Variante">›</button></div><figure class="variant-media" data-variant-media></figure><div class="variant-swipe-hint">Nach links oder rechts wischen</div>${trackingMarkup(parseSetCount(card))}`;
 card.prepend(shell);card.prepend(head);if(actions)card.append(actions);
 shell.querySelector('[data-prev]').onclick=()=>{card._variantIndex=Math.max(0,card._variantIndex-1);renderVariant(card)};
 shell.querySelector('[data-next]').onclick=()=>{card._variantIndex=Math.min(card._variants.length-1,card._variantIndex+1);renderVariant(card)};
 shell.querySelector('.tracking-toggle').onclick=e=>{const panel=shell.querySelector('.tracking-panel');panel.classList.toggle('open');e.currentTarget.textContent=panel.classList.contains('open')?'Tracking schließen':'Tracking öffnen'};
 let startX=null;shell.addEventListener('touchstart',e=>{startX=e.touches[0].clientX},{passive:true});shell.addEventListener('touchend',e=>{if(startX===null)return;const dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>45){card._variantIndex=Math.max(0,Math.min(card._variants.length-1,card._variantIndex+(dx<0?1:-1)));renderVariant(card)}startX=null},{passive:true});
 renderVariant(card);
}

function enhanceOpenWorkout(){document.querySelectorAll('#exercise-list .exercise-card').forEach(enhanceCard)}

document.addEventListener('click',e=>{if(e.target.closest('[data-workout],#start-workout'))setTimeout(enhanceOpenWorkout,30)},true);
window.addEventListener('load',()=>setTimeout(enhanceOpenWorkout,500));
