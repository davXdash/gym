const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];

function d(){return q('#workout-dialog')}
function detail(){return q('#exercise-list .training-exercise-v53',d())}
function items(){return qa('#exercise-list [data-select-ex-v53]',d())}
function active(){const a=items();const i=a.findIndex(x=>x.classList.contains('active'));return i<0?0:i}
function rows(){return qa('.set-row-v53',detail())}
function field(row,name){return q(`[data-field-v53="${name}"]`,row)}
function variants(){return qa('.device-history-v55 button',detail())}
function canon(v){return String(v||'').toLowerCase().replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replaceAll('ß','ss').replace(/[^a-z0-9]+/g,' ').trim()}
function rerenderTop(){setTimeout(()=>{const app=q('.wo-app',d());if(app)app.scrollTo({top:0,behavior:'auto'})},100)}

function chooseExercise(index){const a=items();if(index<0||index>=a.length)return;a[index].click();rerenderTop()}
function chooseVariant(btn){const name=q('strong',btn)?.textContent?.trim();if(!name)return;const target=variants().find(x=>canon(q('strong',x)?.textContent)===canon(name));if(target){target.click();setTimeout(()=>{},80)}}
function syncVisibleInput(input){const set=input.closest('.wo-set');if(!set)return;const index=Number(set.dataset.woRow);const row=rows()[index];if(!row)return;const target=field(row,input.dataset.woField);if(!target)return;target.value=input.value;target.dispatchEvent(new Event('input',{bubbles:true}))}
function syncTimer(){setTimeout(()=>{const dd=d();if(!dd)return;const vis=q('.wo-timer',dd),time=q('#workout-timer',dd)?.textContent?.trim(),label=q('#timer-toggle',dd)?.textContent?.trim();if(vis&&time)q('span',vis).textContent=time;if(vis&&label)q('small',vis).textContent=label},40)}

function act(e){const dd=d();if(!dd?.open)return;const t=e.target;
  if(t.closest('.wo-timer')){e.preventDefault();e.stopImmediatePropagation();q('#timer-toggle',dd)?.click();syncTimer();return}
  if(t.closest('.wo-next')){e.preventDefault();e.stopImmediatePropagation();chooseExercise(active()+1);return}
  if(t.closest('.wo-prev')){e.preventDefault();e.stopImmediatePropagation();chooseExercise(active()-1);return}
  const tab=t.closest('[data-wo-tab]');if(tab){e.preventDefault();e.stopImmediatePropagation();chooseExercise(Number(tab.dataset.woTab));return}
  const variant=t.closest('[data-wo-variant]');if(variant){e.preventDefault();e.stopImmediatePropagation();chooseVariant(variant);return}
  if(t.closest('[data-wo-add]')){e.preventDefault();e.stopImmediatePropagation();q('[data-add-set-v53]',detail())?.click();return}
  if(t.closest('[data-wo-remove]')){e.preventDefault();e.stopImmediatePropagation();q('[data-remove-set-v53]',detail())?.click();return}
}

function focusInput(e){const input=e.target.closest('.wo-set input[data-wo-field]');if(!input)return;input.removeAttribute('readonly');input.removeAttribute('disabled');input.style.pointerEvents='auto';input.focus({preventScroll:true})}
function inputChanged(e){const input=e.target.closest('.wo-set input[data-wo-field]');if(input)syncVisibleInput(input)}
function enableInputs(){qa('.wo-set input[data-wo-field]',d()).forEach(input=>{input.removeAttribute('readonly');input.removeAttribute('disabled');input.style.pointerEvents='auto';input.style.touchAction='manipulation';input.style.webkitUserSelect='text';input.style.userSelect='text'})}
function install(){document.addEventListener('click',act,true);document.addEventListener('pointerdown',focusInput,true);document.addEventListener('touchstart',focusInput,{capture:true,passive:true});document.addEventListener('input',inputChanged,true);const dd=d();if(dd)new MutationObserver(()=>{if(dd.open)enableInputs()}).observe(dd,{subtree:true,childList:true});setInterval(()=>{if(d()?.open){enableInputs();syncTimer()}},1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
