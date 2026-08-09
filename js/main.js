async function load(path,label){
  try{
    await import(path);
    console.info(`[GYM] ${label} loaded`);
    return true;
  }catch(error){
    console.error(`[GYM] ${label} failed`,error);
    return false;
  }
}

function stylesheet(path){
  if(document.querySelector(`link[data-live-style="${path}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=path;
  link.dataset.liveStyle=path;
  document.head.append(link);
}

stylesheet('./css/workout.css');

await load('./app-v53.js','workout data engine');
await load('./app-v54.js','workout add/reorder actions');
await load('./app-v55.js','device history');
await load('./workout.js','approved workout interface');

function installWorkoutTakeover(){
  const dialog=document.querySelector('#workout-dialog');
  if(!dialog||dialog.dataset.approvedTakeover==='1')return;
  dialog.dataset.approvedTakeover='1';

  let kickTimer=null;
  const takeOver=()=>{
    if(!dialog.open)return;
    dialog.classList.add('workout-approved');
    const engine=dialog.querySelector('#exercise-list');
    if(engine)engine.classList.add('wo-engine');

    const first=engine?.querySelector('[data-select-ex-v53]');
    if(first&&!dialog.querySelector('.wo-app')){
      first.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    }
  };

  const kick=()=>{
    clearTimeout(kickTimer);
    [0,40,100,220,450,800].forEach(ms=>setTimeout(takeOver,ms));
    kickTimer=setTimeout(takeOver,1200);
  };

  new MutationObserver(()=>{
    if(dialog.open)takeOver();
  }).observe(dialog,{childList:true,subtree:true});

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-workout],#start-workout'))kick();
  },true);

  dialog.addEventListener('close',()=>{
    clearTimeout(kickTimer);
  });

  if(dialog.open)kick();
}

installWorkoutTakeover();

await load('./studio-page-v35.js','studio');
await load('./device-photo-v36.js','device photos');
await load('./progress-live-v62.js','progress charts');
await load('./status-fix-v26.js','shell polish');
await load('./sync-policy-v22.js','sync policy');
await load('./schedule-v69.js','schedule rotation');
