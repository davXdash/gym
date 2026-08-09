const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const canon=v=>String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim();

function dialog(){return q('#workout-dialog')}
function detail(){return q('#exercise-list .training-exercise-v53',dialog())}
function engineItems(){return qa('#exercise-list [data-select-ex-v53]',dialog())}
function activeIndex(){const all=engineItems(),i=all.findIndex(x=>x.classList.contains('active'));return i<0?0:i}
function engineVariants(){return qa('.device-history-v55 button',detail())}
function engineRows(){return qa('.set-row-v53',detail())}
function engineField(row,name){return q(`[data-field-v53="${name}"]`,row)}
function shell(){return q('.wo-app',dialog())}
function visibleDevice(){return q('.wo-device-main h2',dialog())?.textContent?.trim()||q('.device-nav-v53 strong',detail())?.textContent?.trim()||''}

function ensureModal(){
  let m=q('#wo-controls-modal');
  if(m)return m;
  m=document.createElement('dialog');
  m.id='wo-controls-modal';
  m.innerHTML='<div class="wo-controls-card"><header><h2></h2><button type="button" data-wc-close>Schließen</button></header><div class="wo-controls-body"></div></div>';
  document.body.append(m);
  q('[data-wc-close]',m).onclick=()=>m.close();
  return m;
}
function openModal(title,html,bind){const m=ensureModal();q('h2',m).textContent=title;q('.wo-controls-body',m).innerHTML=html;if(!m.open)m.showModal();bind?.(m)}

function selectExercise(index){
  const all=engineItems();
  if(index<0||index>=all.length)return;
  all[index].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  setTimeout(()=>{const s=shell();if(s)s.scrollTo({top:0,behavior:'instant'});},70);
}
function previous(){selectExercise(activeIndex()-1)}
function next(){selectExercise(activeIndex()+1)}

function openOverview(){
  const d=dialog(),all=engineItems();
  const toggle=q('#order-toggle-v53',d);
  if(toggle&&!q('[data-order-up-v53]',d))toggle.click();
  setTimeout(()=>{
    const rows=engineItems();
    openModal('Übungsübersicht',rows.map((it,i)=>`<div class="wc-order"><b>${i+1}</b><button type="button" data-wc-select="${i}">${q('strong',it)?.textContent||`Übung ${i+1}`}</button><div><button type="button" data-wc-up="${i}" ${i===0?'disabled':''}>↑</button><button type="button" data-wc-down="${i}" ${i===rows.length-1?'disabled':''}>↓</button></div></div>`).join('')+'<button type="button" class="wc-action" data-wc-add>+ Übung hinzufügen</button><button type="button" class="wc-secondary" data-wc-order-done>Reihenfolge übernehmen</button>',m=>{
      qa('[data-wc-select]',m).forEach(b=>b.onclick=()=>{m.close();selectExercise(Number(b.dataset.wcSelect))});
      qa('[data-wc-up]',m).forEach(b=>b.onclick=()=>{q(`[data-order-up-v53="${b.dataset.wcUp}"]`,d)?.click();setTimeout(()=>{m.close();openOverview()},90)});
      qa('[data-wc-down]',m).forEach(b=>b.onclick=()=>{q(`[data-order-down-v53="${b.dataset.wcDown}"]`,d)?.click();setTimeout(()=>{m.close();openOverview()},90)});
      q('[data-wc-add]',m).onclick=()=>{m.close();q('#add-exercise-v54',d)?.click()};
      q('[data-wc-order-done]',m).onclick=()=>{q('#order-toggle-v53',d)?.click();m.close()};
    });
  },80);
}

function chooseVariant(button){
  const name=q('strong',button)?.textContent?.trim();
  if(!name)return;
  const target=engineVariants().find(b=>canon(q('strong',b)?.textContent)===canon(name));
  target?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}

function openInfo(){
  const d=dialog(),name=q('.wo-hero h1',d)?.textContent?.trim()||'Übung',device=visibleDevice();
  const coach=q('.wo-coachbox',d)?.innerText?.trim()||'';
  const stats=qa('.wo-coachstats article',d).map(x=>x.innerText.trim()).join('\n\n');
  openModal(`Info · ${name}`,`<p><strong>Gerät:</strong> ${device}</p><div class="wc-text">${coach.replaceAll('\n','<br>')}</div><div class="wc-stats">${stats.replaceAll('\n',' · ')}</div>`);
}

function openWarmup(){
  const rows=engineRows().filter(r=>engineField(r,'warmup')?.checked);
  openModal('Warm-up',`${rows.length?rows.map((r,i)=>`<div class="wc-warm"><span>Warm-up ${i+1}</span><strong>${engineField(r,'weight')?.value||'–'} kg × ${engineField(r,'reps')?.value||'–'}</strong></div>`).join(''):'<p>Noch kein Warm-up in dieser Einheit.</p>'}<button type="button" class="wc-action" data-wc-warm-add>+ Warm-up-Satz</button>`,m=>{
    q('[data-wc-warm-add]',m).onclick=()=>{
      q('[data-add-set-v53]',detail())?.click();
      setTimeout(()=>{const row=engineRows().at(-1),w=engineField(row,'warmup');if(w){w.checked=true;w.dispatchEvent(new Event('change',{bubbles:true}))}m.close();},80);
    };
  });
}

function addSet(){q('[data-add-set-v53]',detail())?.click()}
function removeSet(){q('[data-remove-set-v53]',detail())?.click()}
function addExercise(){q('#add-exercise-v54',dialog())?.click()}

function intercept(e){
  const d=dialog();
  if(!d?.open)return;
  const target=e.target;
  if(target.closest('.wo-next')){e.preventDefault();e.stopImmediatePropagation();next();return}
  if(target.closest('.wo-prev')){e.preventDefault();e.stopImmediatePropagation();previous();return}
  if(target.closest('.wo-menu')){e.preventDefault();e.stopImmediatePropagation();openOverview();return}
  const tab=target.closest('[data-wo-tab]');if(tab){e.preventDefault();e.stopImmediatePropagation();selectExercise(Number(tab.dataset.woTab));return}
  const variant=target.closest('[data-wo-variant]');if(variant){e.preventDefault();e.stopImmediatePropagation();chooseVariant(variant);return}
  if(target.closest('[data-wo-info]')){e.preventDefault();e.stopImmediatePropagation();openInfo();return}
  if(target.closest('[data-wo-warm-history]')){e.preventDefault();e.stopImmediatePropagation();openWarmup();return}
  if(target.closest('[data-wo-add]')){e.preventDefault();e.stopImmediatePropagation();addSet();return}
  if(target.closest('[data-wo-remove]')){e.preventDefault();e.stopImmediatePropagation();removeSet();return}
  if(target.closest('[data-wo-extra]')){e.preventDefault();e.stopImmediatePropagation();addExercise();return}
}

function style(){
  if(q('#wo-controls-style'))return;
  const s=document.createElement('style');s.id='wo-controls-style';s.textContent=`#wo-controls-modal{width:min(94vw,520px);max-height:88dvh;border:0;border-radius:22px;padding:0;background:#fff;color:#172019}#wo-controls-modal::backdrop{background:rgba(12,18,14,.45);backdrop-filter:blur(4px)}.wo-controls-card{padding:16px}.wo-controls-card>header{display:flex;justify-content:space-between;align-items:center;gap:10px}.wo-controls-card h2{margin:0}.wo-controls-card>header button,.wc-order button,.wc-action,.wc-secondary{min-height:42px;border:1px solid #d9e2da;border-radius:12px;background:#fff;color:#172019;font:inherit;font-weight:800}.wo-controls-body{display:grid;gap:9px;margin-top:14px;max-height:68dvh;overflow:auto}.wc-order{display:grid;grid-template-columns:32px 1fr auto;gap:8px;align-items:center;padding:8px;border:1px solid #d9e2da;border-radius:14px}.wc-order>b{display:grid;place-items:center;height:32px;border-radius:9px;background:#e3eee6}.wc-order>button{text-align:left;padding:0 10px}.wc-order>div{display:flex;gap:5px}.wc-order>div button{width:38px}.wc-action{width:100%;background:#356b4d;color:#fff;border-color:#356b4d}.wc-secondary{width:100%}.wc-text,.wc-stats,.wc-warm{padding:11px;border-radius:13px;background:#f6f8f5;line-height:1.45}.wc-warm{display:flex;justify-content:space-between;gap:12px}`;document.head.append(s);
}

function install(){style();document.addEventListener('click',intercept,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
