import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const de=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
function dateLabel(v){
  if(!v)return'';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(5,10).split('-').reverse().join('.');
  return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(d);
}

function chart(rows,key,unit){
  const vals=rows.map(r=>({v:num(r[key]),d:r.measured_at||r.workout_date||r.created_at})).filter(x=>x.v!=null).sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  if(!vals.length)return'<div class="chart-empty">Noch keine Daten</div>';
  const raw=vals.map(x=>x.v),low=Math.min(...raw),high=Math.max(...raw);
  const pad=Math.max((high-low)*0.22,unit==='kg'?0.25:0.5),min=Math.max(0,low-pad),max=high+pad,span=Math.max(0.1,max-min);
  const W=360,H=230,L=58,R=15,T=25,B=50;
  const x=i=>L+i*(W-L-R)/Math.max(1,vals.length-1);
  const y=v=>T+(max-v)/span*(H-T-B);
  let grid='';
  const ticks=4;
  for(let i=0;i<=ticks;i++){
    const value=max-(span/ticks)*i,Y=T+(H-T-B)/ticks*i;
    grid+=`<line class="grid" x1="${L}" y1="${Y}" x2="${W-R}" y2="${Y}"/><text class="ylabel" x="${L-7}" y="${Y+4}" text-anchor="end">${de(value)}</text>`;
  }
  const xlabels=vals.map((a,i)=>`<text class="xlabel" x="${x(i)}" y="${H-17}" text-anchor="middle">${dateLabel(a.d)}</text>`).join('');
  const points=vals.map((a,i)=>`<circle cx="${x(i)}" cy="${y(a.v)}" r="5"/><text class="point" x="${x(i)}" y="${Math.max(13,y(a.v)-10)}" text-anchor="middle">${de(a.v)}</text>`).join('');
  const poly=vals.map((a,i)=>`${x(i)},${y(a.v)}`).join(' ');
  return `<svg class="progress73-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf ${unit}">${grid}<line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><text class="unit" x="8" y="15">${unit}</text><polyline points="${poly}"/>${points}${xlabels}</svg>`;
}

function notes(row,key){try{return JSON.parse(row.notes||'{}')[key]??null}catch{return null}}
function measurementRows(rows,key){
  return rows.map(r=>({...r,value:key.startsWith('notes:')?notes(r,key.slice(6)):r[key]})).filter(r=>num(r.value)!=null).map(r=>({...r,value:num(r.value)}));
}
function extraCard(title,rows){return `<article class="chart-card card progress73-extra"><h3>${title}</h3><div>${chart(rows,'value','cm')}</div></article>`}

function renderProgress(){
  const s=read(SNAP,{weights:[],measurements:[]});
  const html=chart(s.weights||[],'weight_kg','kg');
  const w=q('#weight-chart'),w2=q('#weight-chart-2');
  if(w&&!q('.progress73-chart',w))w.innerHTML=html;
  if(w2&&!q('.progress73-chart',w2))w2.innerHTML=html;

  const page=q('#page-progress');if(!page)return;
  qa('.progress73-extra',page).forEach(x=>x.remove());
  const defs=[['Taille','waist_cm'],['Brust','chest_cm'],['Schulter','shoulder_cm'],['Oberarm links','upper_arm_left_cm'],['Oberarm rechts','upper_arm_right_cm'],['Bauch','notes:abdomen_cm']];
  for(const [title,key] of defs){const rows=measurementRows(s.measurements||[],key);if(rows.length)page.insertAdjacentHTML('beforeend',extraCard(title,rows))}
}

function weightList(){
  const page=q('#page-weight'),s=read(SNAP,{weights:[]});if(!page)return;
  let box=q('#weight-history-v62',page);if(!box){box=document.createElement('section');box.id='weight-history-v62';box.className='card weight73';page.append(box)}
  const rows=[...(s.weights||[])].sort((a,b)=>String(b.measured_at).localeCompare(String(a.measured_at)));
  box.innerHTML=`<h3>Gespeicherte Werte</h3>${rows.length?rows.map(r=>`<article data-id="${r.id||''}"><div><strong>${de(r.weight_kg)} kg</strong><small>${r.measured_at?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.measured_at)):''}</small></div><button data-edit>Bearbeiten</button><button data-delete>Löschen</button></article>`).join(''):'<p>Noch keine Werte.</p>'}`;
  box.onclick=async e=>{
    const row=e.target.closest('article');if(!row?.dataset.id)return;
    const item=rows.find(r=>String(r.id)===row.dataset.id);if(!item)return;
    if(e.target.closest('[data-edit]')){
      const value=prompt('Gewicht in kg',String(item.weight_kg).replace('.',','));if(value==null)return;
      const n=num(value);if(!(n>=30&&n<=300))return alert('Ungültiges Gewicht.');
      const res=await supabase.from('weigh_ins').update({weight_kg:n}).eq('id',item.id);if(res.error)return alert(res.error.message);
      localStorage.removeItem(SNAP);location.reload();
    }
    if(e.target.closest('[data-delete]')){
      if(!confirm(`${de(item.weight_kg)} kg vom ${dateLabel(item.measured_at)} löschen?`))return;
      const res=await supabase.from('weigh_ins').delete().eq('id',item.id);if(res.error)return alert(res.error.message);
      localStorage.removeItem(SNAP);location.reload();
    }
  };
}

function style(){
  if(q('#progress73-style'))return;
  const s=document.createElement('style');s.id='progress73-style';
  s.textContent='.progress73-chart{display:block;width:100%;height:auto;overflow:visible}.progress73-chart .grid{stroke:#e4e9e4;stroke-width:1}.progress73-chart .axis{stroke:#7c867e;stroke-width:1.2}.progress73-chart polyline{fill:none;stroke:#356b4d;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.progress73-chart circle{fill:#356b4d;stroke:#fff;stroke-width:2}.progress73-chart text{font-family:inherit}.progress73-chart .ylabel,.progress73-chart .xlabel,.progress73-chart .unit{fill:#717a73;font-size:10px}.progress73-chart .point{fill:#234f38;font-size:10px;font-weight:800}.weight73{margin-top:14px;padding:14px}.weight73 h3{margin-top:0}.weight73 article{display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.weight73 article small{display:block;color:var(--muted);font-size:.7rem;margin-top:2px}.weight73 article button{min-height:38px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);color:inherit;padding:0 9px}';
  document.head.append(s);
}

let defending=false;
function enhance(force=false){
  style();
  if(force){q('#weight-chart')?.querySelector('.progress73-chart')?.remove();q('#weight-chart-2')?.querySelector('.progress73-chart')?.remove()}
  renderProgress();weightList();
}
function defend(){
  if(defending)return;defending=true;
  requestAnimationFrame(()=>{defending=false;const page=q('#page-progress');if(page?.classList.contains('active')&&!q('#weight-chart-2 .progress73-chart'))enhance(true)});
}

window.addEventListener('load',()=>setTimeout(()=>enhance(true),500));
document.addEventListener('click',e=>{if(e.target.closest('[data-page="progress"],[data-page="weight"],[data-page-link="weight"],#save-weight,#save-measurement))setTimeout(()=>enhance(true),180)},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>enhance(true),120)});
const observer=new MutationObserver(defend);observer.observe(document.documentElement,{subtree:true,childList:true});
