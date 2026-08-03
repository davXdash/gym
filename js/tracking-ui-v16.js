const $=s=>document.querySelector(s);

// Ausschließlich die vom Nutzer eindeutig benannten Screenshots.
// Nicht genannte Nummern werden weder geraten noch als Gerätebild verwendet.
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
 ]
};

function parsePrescription(card){
 const text=[...card.querySelectorAll('p')].map(p=>p.textContent.trim()).find(t=>/\d+\s*×/.test(t))||'';
 const match=text.match(/(\d+)\s*×/);
 return {text,setCount:match?Number(match[1]):3};
}

function trackingMarkup(setCount){
 const rows=Array.from({length:setCount},(_,i)=>`<div class="set-row">
  <span class="set-label">${i+1}</span>
  <input inputmode="decimal" placeholder="kg" aria-label="Gewicht Satz ${i+1}">
  <input inputmode="numeric" placeholder="Wdh" aria-label="Wiederholungen Satz ${i+1}">
  <input inputmode="decimal" placeholder="RIR" aria-label="RIR Satz ${i+1}">
 </div>`).join('');
 return `<button type="button" class="tracking-toggle" aria-expanded="false">Tracking öffnen</button>
 <section class="tracking-panel" aria-hidden="true">
  <div class="tracking-last">
   <div><small>Dieses Gerät zuletzt</small><strong>noch keine Daten</strong></div>
   <div><small>Standard zuletzt</small><strong>noch keine Daten</strong></div>
  </div>
  <label class="warmup-row"><span><input type="checkbox"> Warm-up-Satz</span><small>optional</small></label>
  <div class="set-table">
   <div class="set-row header"><span>Satz</span><span>Gewicht</span><span>Wdh.</span><span>RIR</span></div>
   ${rows}
  </div>
  <p class="tracking-note">Vorschau: Die Felder werden noch nicht gespeichert.</p>
 </section>`;
}

function renderVariant(card){
 const variants=card._variants||[];
 const index=card._variantIndex||0;
 const variant=variants[index];
 if(!variant)return;
 card.querySelector('[data-role]').textContent=variant.role;
 card.querySelector('[data-variant-name]').textContent=variant.name;
 card.querySelector('[data-counter]').textContent=variants.length>1?`${index+1} von ${variants.length}`:'Standard';
 const media=card.querySelector('[data-variant-media]');
 media.innerHTML=`<img src="${variant.image}" alt="${variant.name}" loading="eager"><figcaption>${variant.name}</figcaption>`;
 card.querySelector('[data-prev]').disabled=index===0;
 card.querySelector('[data-next]').disabled=index===variants.length-1;
 card.querySelector('.variant-swipe-hint').hidden=variants.length<2;
}

function buildKnownVariantCard(card,exerciseName,variants,prescription,actions){
 card._variants=variants;
 card._variantIndex=0;
 const head=document.createElement('header');
 head.className='exercise-card-head';
 head.innerHTML=`<div><small class="exercise-kicker">ÜBUNG</small><h3>${exerciseName}</h3><p>${prescription.text}</p></div>`;
 const body=document.createElement('section');
 body.className='variant-shell';
 body.innerHTML=`<div class="variant-nav">
  <button type="button" class="variant-arrow" data-prev aria-label="Vorherige Variante">‹</button>
  <div class="variant-label"><small data-role>Standard</small><strong data-variant-name></strong><span data-counter></span></div>
  <button type="button" class="variant-arrow" data-next aria-label="Nächste Variante">›</button>
 </div>
 <figure class="variant-media" data-variant-media></figure>
 <p class="variant-swipe-hint">Zum Gerätewechsel wischen oder Pfeile verwenden</p>
 ${trackingMarkup(prescription.setCount)}`;
 card.replaceChildren(head,body);
 if(actions)card.append(actions);
 body.querySelector('[data-prev]').onclick=()=>{card._variantIndex=Math.max(0,card._variantIndex-1);renderVariant(card)};
 body.querySelector('[data-next]').onclick=()=>{card._variantIndex=Math.min(card._variants.length-1,card._variantIndex+1);renderVariant(card)};
 const toggle=body.querySelector('.tracking-toggle');
 toggle.onclick=()=>{
  const panel=body.querySelector('.tracking-panel');
  const open=!panel.classList.contains('open');
  panel.classList.toggle('open',open);
  panel.setAttribute('aria-hidden',String(!open));
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Tracking schließen':'Tracking öffnen';
 };
 let startX=null;
 body.addEventListener('touchstart',event=>{startX=event.touches[0].clientX},{passive:true});
 body.addEventListener('touchend',event=>{
  if(startX===null||card._variants.length<2)return;
  const delta=event.changedTouches[0].clientX-startX;
  if(Math.abs(delta)>45){
   card._variantIndex=Math.max(0,Math.min(card._variants.length-1,card._variantIndex+(delta<0?1:-1)));
   renderVariant(card);
  }
  startX=null;
 },{passive:true});
 renderVariant(card);
}

function buildUnmappedCard(card,exerciseName,prescription,actions){
 const head=document.createElement('header');
 head.className='exercise-card-head';
 head.innerHTML=`<div><small class="exercise-kicker">ÜBUNG</small><h3>${exerciseName}</h3><p>${prescription.text}</p></div>`;
 const notice=document.createElement('section');
 notice.className='unmapped-device';
 notice.innerHTML=`<strong>${exerciseName}</strong><p>Für diese Übung wurde kein eindeutig benannter Gerätescreenshot hochgeladen. Es wird deshalb kein Bild und keine erfundene Alternative angezeigt.</p>${trackingMarkup(prescription.setCount)}`;
 card.replaceChildren(head,notice);
 if(actions)card.append(actions);
 const toggle=notice.querySelector('.tracking-toggle');
 toggle.onclick=()=>{
  const panel=notice.querySelector('.tracking-panel');
  const open=!panel.classList.contains('open');
  panel.classList.toggle('open',open);
  panel.setAttribute('aria-hidden',String(!open));
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Tracking schließen':'Tracking öffnen';
 };
}

function enhanceCard(card){
 if(card.dataset.trackingV17==='1')return;
 const heading=card.querySelector('h3');
 if(!heading)return;
 const exerciseName=heading.textContent.trim();
 const actions=card.querySelector('.exercise-actions');
 const prescription=parsePrescription(card);
 card.dataset.trackingV17='1';
 card.classList.add('exercise-card-v17');
 const variants=VARIANTS[exerciseName];
 if(variants?.length)buildKnownVariantCard(card,exerciseName,variants,prescription,actions);
 else buildUnmappedCard(card,exerciseName,prescription,actions);
}

function enhanceOpenWorkout(){
 document.querySelectorAll('#exercise-list .exercise-card').forEach(enhanceCard);
}

document.addEventListener('click',event=>{
 if(event.target.closest('[data-workout],#start-workout'))setTimeout(enhanceOpenWorkout,20);
},true);
window.addEventListener('load',()=>setTimeout(enhanceOpenWorkout,350));
