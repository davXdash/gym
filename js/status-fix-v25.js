import './training-mode-v30.js?v=51';
import './coach-v31.js?v=51';
import './studio-page-v35.js?v=51';
import './device-photo-v36.js?v=51';
import './feature-v46.js?v=51';
import './history-coach-v48.js?v=51';
import './stability-v50.js?v=51';

const ACTIVE_KEY='gym-active-workout-v11';

const readActive=()=>{
  try{return JSON.parse(localStorage.getItem(ACTIVE_KEY))||null}catch{return null}
};
const writeActive=value=>localStorage.setItem(ACTIVE_KEY,JSON.stringify(value));

// Preserve tracking fields when an exercise is marked complete or skipped.
document.addEventListener('click',event=>{
  const button=event.target.closest('#exercise-list [data-ex][data-state]');
  if(!button)return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const active=readActive();
  if(!active)return;
  active.statuses=active.statuses||{};
  active.statuses[button.dataset.ex]=button.dataset.state;
  writeActive(active);

  const card=button.closest('.exercise-card');
  card?.querySelectorAll('[data-ex][data-state]').forEach(item=>{
    item.classList.toggle('selected',item===button);
    item.setAttribute('aria-pressed',item===button?'true':'false');
  });
},true);
