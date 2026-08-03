import './studio-page-v35.js';
import './device-photo-v36.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const QUEUE='gym-queue-v11';
const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};

function fixHeader(){
  const line=$('.status-line');
  if(line) line.style.setProperty('display','none','important');
  ['#offline-toggle','#sync-now','#connection-status','#sync-count'].forEach(s=>{const el=$(s);if(el)el.style.setProperty('display','none','important')});
  const title=$('#page-title');
  if(title){
    const base=title.textContent.replace(/\s+Dave$/,'').replace(/^Dave\s*[·-]\s*/,'').trim()||'Dashboard';
    title.textContent=`${base} Dave`;
  }
}

function ensureStudioEntry(){
  const nav=$('#drawer nav');
  if(!nav)return;
  if(!nav.querySelector('[data-page="studio"]')){
    const b=document.createElement('button');b.type='button';b.dataset.page='studio';b.textContent='Studio';
    const settings=nav.querySelector('[data-page="settings"]');nav.insertBefore(b,settings||null);
  }
}

function forcePhotos(){
  const page=$('#page-photos');if(!page)return;
  const placeholder=page.querySelector('.photo-placeholder');
  if(placeholder&&!page.querySelector('.photo-studio-v36'))placeholder.remove();
  window.dispatchEvent(new Event('load'));
}

function validateCalendar(){
  const rows=$$('[data-calendar-grid]:first-of-type .calendar-day.planned').map(b=>({date:b.dataset.date,code:b.querySelector('.plan-badge')?.textContent.trim().charAt(0)})).filter(x=>x.code);
  let bad=false;
  for(let i=1;i<rows.length;i++){
    const days=Math.round((new Date(rows[i].date+'T12:00:00')-new Date(rows[i-1].date+'T12:00:00'))/86400000);
    if(rows[i].code===rows[i-1].code||days<3){bad=true;break}
  }
  document.documentElement.classList.toggle('calendar-invalid-v37',bad);
}

function install(){fixHeader();ensureStudioEntry();forcePhotos();validateCalendar()}
let scheduled=false;
const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;install()})});
observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('DOMContentLoaded',install);
window.addEventListener('load',()=>{install();setTimeout(install,200);setTimeout(install,1000)});
window.addEventListener('online',fixHeader);window.addEventListener('offline',fixHeader);
setInterval(()=>{fixHeader();ensureStudioEntry()},5000);
