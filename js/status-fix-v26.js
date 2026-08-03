const ACTIVE='gym-active-workout-v11';
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

function updateExerciseStatus(button){
  const active=read(ACTIVE,null);
  if(!active)return;
  active.statuses=active.statuses||{};
  active.statuses[button.dataset.ex]=button.dataset.state;
  write(ACTIVE,active);

  const actions=button.closest('.exercise-actions');
  if(actions){
    actions.querySelectorAll('[data-ex]').forEach(item=>{
      const selected=item===button;
      item.classList.toggle('selected',selected);
      item.setAttribute('aria-pressed',selected?'true':'false');
    });
  }
}

window.addEventListener('click',event=>{
  const button=event.target.closest?.('#exercise-list [data-ex]');
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  updateExerciseStatus(button);
},true);
