const ACTIVE_KEY='gym-active-workout-v11';

const readActive=()=>{
  try{return JSON.parse(localStorage.getItem(ACTIVE_KEY))||null}catch{return null}
};
const writeActive=value=>localStorage.setItem(ACTIVE_KEY,JSON.stringify(value));

// The original app-v11 handler rebuilds the complete exercise list after each
// status click. Capture the event first and update only the affected card.
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

  // Preserve all tracking fields, photos, sliders and the current scroll state.
},true);
