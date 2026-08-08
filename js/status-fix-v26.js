const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

function fixShell(){
  const topSmall=$('.topbar-title p');if(topSmall)topSmall.textContent='DEIN TRAINING';
  const active=$('.page.active')?.id;
  const title=$('#page-title');
  if(title){
    const names={'page-dashboard':'Trainingsplan Dave','page-plan':'Trainingsplan Dave','page-calendar':'Kalender Dave','page-weight':'Gewicht Dave','page-measurements':'Umfänge Dave','page-progress':'Fortschritt Dave','page-photos':'Fotos Dave','page-studio':'Studio Dave','page-settings':'Einstellungen Dave'};
    title.textContent=names[active]||'Trainingsplan Dave';
  }
  const drawerLabel=$('.drawer-head small');if(drawerLabel)drawerLabel.textContent='TRAININGSPLAN';
  const drawerName=$('.drawer-head h2');if(drawerName)drawerName.textContent='Dave';
  const calendarCopy=$('#page-calendar .page-head p');
  if(calendarCopy)calendarCopy.textContent='Die Rotation läuft grundsätzlich mit einem freien Tag zwischen zwei Einheiten. Individuell verschobene Termine bleiben möglich.';
}

function twoDecimalCharts(){
  $$('#weight-chart text,#weight-chart-2 text').forEach(t=>{
    const raw=String(t.textContent).trim();
    if(!/^\d+[.,]\d+$/.test(raw))return;
    const n=Number(raw.replace(',','.'));
    if(Number.isFinite(n))t.textContent=n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  });
}

function install(){fixShell();twoDecimalCharts()}
document.addEventListener('DOMContentLoaded',install);
window.addEventListener('load',()=>{install();setTimeout(install,300)});
document.addEventListener('click',e=>{if(e.target.closest('[data-page],[data-page-link],#menu-toggle'))setTimeout(install,30)},true);
