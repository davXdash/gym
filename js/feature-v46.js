const V46_QUEUE='gym-queue-v11';
const V46_PENDING='gym-tracking-pending-v18';
const V46_OFFLINE='gym-offline-v11';
const v46=(s,r=document)=>r.querySelector(s);

function pendingCount46(){
  let queue=0;
  try{queue=(JSON.parse(localStorage.getItem(V46_QUEUE))||[]).length}catch{}
  return queue+(localStorage.getItem(V46_PENDING)?1:0);
}

function loadCss46(){
  const href='css/feature-v46.css';
  if(document.querySelector(`link[href="${href}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  document.head.append(link);
}

function placeStatus46(){
  const line=v46('.status-line');
  const dashboard=v46('#page-dashboard');
  if(!line||!dashboard)return;
  line.classList.add('status-dashboard-v46');
  const error=v46('#error-stack');
  if(error&&line.previousElementSibling!==error)error.insertAdjacentElement('afterend',line);
}

function statusText46(){
  const manual=localStorage.getItem(V46_OFFLINE)==='1';
  const pending=pendingCount46();
  if(manual)return 'Offline-Modus aktiv';
  if(!navigator.onLine)return pending?`${pending} Änderung${pending===1?'':'en'} lokal gespeichert`:'Offline';
  if(pending)return `${pending} Änderung${pending===1?'':'en'} wartet`;
  return 'Synchronisiert';
}

function renderStatus46(){
  placeStatus46();
  const offline=v46('#offline-toggle');
  const sync=v46('#sync-now');
  const connection=v46('#connection-status');
  const manual=localStorage.getItem(V46_OFFLINE)==='1';
  const pending=pendingCount46();
  if(offline){offline.textContent=manual?'Offline beenden':'Offline';offline.classList.toggle('manual-active',manual)}
  if(sync){sync.textContent=pending?`Sync (${pending})`:'Sync';sync.classList.toggle('is-idle',pending===0||manual||!navigator.onLine)}
  if(connection){connection.textContent=statusText46();connection.title=statusText46()}
  const title=v46('.topbar-title p');if(title)title.textContent='DEIN TRAINING';
}

function watchStorage46(){
  if(window.__gymStorageWatch46)return;
  window.__gymStorageWatch46=true;
  const originalSet=localStorage.setItem.bind(localStorage);
  const originalRemove=localStorage.removeItem.bind(localStorage);
  localStorage.setItem=(key,value)=>{originalSet(key,value);if([V46_QUEUE,V46_PENDING,V46_OFFLINE].includes(key))queueMicrotask(renderStatus46)};
  localStorage.removeItem=(key)=>{originalRemove(key);if([V46_QUEUE,V46_PENDING,V46_OFFLINE].includes(key))queueMicrotask(renderStatus46)};
}

loadCss46();watchStorage46();
document.addEventListener('DOMContentLoaded',renderStatus46);
window.addEventListener('load',()=>{renderStatus46();setTimeout(renderStatus46,500)});
window.addEventListener('online',renderStatus46);window.addEventListener('offline',renderStatus46);window.addEventListener('storage',renderStatus46);
document.addEventListener('click',event=>{if(event.target.closest('#offline-toggle,#sync-now,#settings-offline,#settings-sync,[data-page],[data-page-link],#menu-toggle'))setTimeout(renderStatus46,80)},true);
