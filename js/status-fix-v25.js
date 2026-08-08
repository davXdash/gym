import './app-v55.js?v=67';
import './app-v53.js?v=67';
import './app-v54.js?v=67';
import './coach-progressive-v57.js?v=67';
import './mobile-workout-v56.js?v=67';
import './schedule-v67.js?v=67';

for(const href of ['css/coach-progressive-v57.css','css/mobile-workout-v56.css']){
  if(document.querySelector(`link[href="${href}"]`))continue;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  document.head.append(link);
}

export {};
