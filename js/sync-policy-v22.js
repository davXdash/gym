const QUEUE_KEY='gym-queue-v11';
const TRACKING_PENDING_KEY='gym-tracking-pending-v18';
const OFFLINE_KEY='gym-offline-v11';
const RETRY_MS=300_000;
let retryTimer=null;
let syncInFlight=false;

function readQueueLength(){try{return (JSON.parse(localStorage.getItem(QUEUE_KEY))||[]).length}catch{return 0}}
function hasPending(){return readQueueLength()>0||Boolean(localStorage.getItem(TRACKING_PENDING_KEY))}
function canSync(){return navigator.onLine&&localStorage.getItem(OFFLINE_KEY)!=='1'&&document.visibilityState==='visible'}
function syncButton(){return document.querySelector('#sync-now')}
function updateSyncLabel(){
  const button=syncButton();if(!button)return;
  const count=readQueueLength()+(localStorage.getItem(TRACKING_PENDING_KEY)?1:0);
  button.textContent=count?`Sync (${count})`:'Sync';button.disabled=syncInFlight;
}
function clearRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}
function scheduleRetry(){
  clearRetry();
  if(!hasPending()||!canSync())return;
  retryTimer=setTimeout(()=>requestSync('retry'),RETRY_MS);
}
async function requestSync(reason='manual'){
  if(syncInFlight||!hasPending()||!canSync()){updateSyncLabel();scheduleRetry();return}
  const button=syncButton();if(!button)return;
  syncInFlight=true;updateSyncLabel();
  try{
    button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    await new Promise(resolve=>setTimeout(resolve,1200));
  }finally{syncInFlight=false;updateSyncLabel();scheduleRetry()}
}

window.addEventListener('online',()=>requestSync('online'));
window.addEventListener('offline',()=>{clearRetry();updateSyncLabel()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')requestSync('visible');else clearRetry()});
window.addEventListener('storage',e=>{if([QUEUE_KEY,TRACKING_PENDING_KEY,OFFLINE_KEY].includes(e.key)){updateSyncLabel();scheduleRetry()}});
document.addEventListener('click',e=>{
  if(e.target.closest('#complete-workout'))setTimeout(()=>requestSync('workout-complete'),1500);
  if(e.target.closest('#sync-now'))setTimeout(()=>{updateSyncLabel();scheduleRetry()},1500);
},true);
window.addEventListener('load',()=>{updateSyncLabel();setTimeout(()=>requestSync('startup'),1200)});
