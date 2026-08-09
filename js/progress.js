import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const val=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2});
const date=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(5,10).split('-').reverse().join('.'):new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(d)};

function chart(rows,key,unit){
  const data=rows.map(r=>({value:num(r[key]),date:r.measured_at||r.created_at||r.workout_date})).filter(x=>x.value!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!data.length)return '<div class="clean-chart-empty">Noch keine Daten</div>';
  const values=data.map(x=>x.value),lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.25,unit==='kg'?.25:.5),min=Math.max(0,lo-pad),max=hi+pad,span=Math.max(.1,max-min);
  const W=390,H=240,L=62,R=16,T=24,B=52,x=i=>L+i*(W-L-R)/Math.max(1,data.length-1),y=v=>T+(max-v)/span*(H-T-B);
  let grid='';for(let i=0;i<5;i++){const yy=T+i*(H-T-B)/4,v=max-i*span/4;grid+=`<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="y" x="${L-8}" y="${yy+4}" text-anchor="end">${val(v)}</text>`}
  const path=data.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
  const points=data.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5"/><text class="point" x="${x(i)}" y="${Math.max(13,y(p.value)-10)}" text-anchor="middle">${val(p.value)}</text>`).join('');
  const labels=data.map((p,i)=>`<text class="x" x="${x(i)}" y="${H-18}" text-anchor="middle">${date(p.date)}</text>`).join('');
  return `<svg class="clean-chart" viewBox="0 0 ${W} ${H}" role="img"><text class="unit" x="8" y="14">${unit}</text>${grid}<line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><polyline points="${path}"/>${points}${labels}</svg>`;
}
function notes(row,key){try{return JSON.parse(row.notes||'{}')[key]??null}catch{return null}}
function measurement(rows,key){return rows.map(r=>({...r,value:key.startsWith('notes:')?notes(r,key.slice(6)):r[key]})).filter(r=>num(r.value)!=null)}
function card(title,rows){return `<article class="chart-card card clean-extra"><h3>${title}</h3><div>${chart(rows,'value','cm')}</div></article>`}

function renderCharts(){
  const s=read(SNAP,{weights:[],measurements:[]}),weight=chart(s.weights||[],'weight_kg','kg');
  if(q('#weight-chart'))q('#weight-chart').innerHTML=weight;
  if(q('#weight-chart-2'))q('#weight-chart-2').innerHTML=weight;
  const page=q('#page-progress');if(!page)return;qa('.clean-extra',page).forEach(x=>x.remove());
  const defs=[['Taille','waist_cm'],['Brust','chest_cm'],['Schulter','shoulder_cm'],['Oberarm links','upper_arm_left_cm'],['Oberarm rechts','upper_arm_right_cm'],['Bauch','notes:abdomen_cm']];
  for(const [title,key] of defs){const rows=measurement(s.measurements||[],key);if(rows.length)page.insertAdjacentHTML('beforeend',card(title,rows))}
}
function weightHistory(){
  const page=q('#page-weight'),s=read(SNAP,{weights:[]});if(!page)return;let box=q('#clean-weight-history',page);if(!box){box=document.createElement('section');box.id='clean-weight-history';box.className='card clean-weight-history';page.append(box)}
  const rows=[...(s.weights||[])].sort((a,b)=>String(b.measured_at||'').localeCompare(String(a.measured_at||'')));
  box.innerHTML=`<h3>Gespeicherte Werte</h3>${rows.length?rows.map(r=>`<article data-id="${r.id||''}"><div><strong>${val(r.weight_kg)} kg</strong><small>${r.measured_at?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.measured_at)):''}</small></div><button data-edit>Bearbeiten</button><button data-delete>Löschen</button></article>`).join(''):'<p>Noch keine Werte.</p>'}`;
  box.onclick=async e=>{const row=e.target.closest('article'),item=rows.find(r=>String(r.id)===row?.dataset.id);if(!item)return;if(e.target.closest('[data-edit]')){const raw=prompt('Gewicht in kg',String(item.weight_kg).replace('.',','));if(raw==null)return;const n=num(raw);if(!(n>=30&&n<=300))return alert('Ungültiges Gewicht.');const res=await supabase.from('weigh_ins').update({weight_kg:n}).eq('id',item.id);if(res.error)return alert(res.error.message);localStorage.removeItem(SNAP);location.reload()}if(e.target.closest('[data-delete]')){if(!confirm(`${val(item.weight_kg)} kg löschen?`))return;const res=await supabase.from('weigh_ins').delete().eq('id',item.id);if(res.error)return alert(res.error.message);localStorage.removeItem(SNAP);location.reload()}};
}
function style(){if(q('#clean-progress-style'))return;const s=document.createElement('style');s.id='clean-progress-style';s.textContent='.clean-chart{display:block;width:100%;height:auto;overflow:visible}.clean-chart .grid{stroke:#e2e8e2;stroke-width:1}.clean-chart .axis{stroke:#778279;stroke-width:1.2}.clean-chart polyline{fill:none;stroke:#356b4d;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.clean-chart circle{fill:#356b4d;stroke:#fff;stroke-width:2}.clean-chart text{font-family:inherit}.clean-chart .x,.clean-chart .y,.clean-chart .unit{fill:#707a72;font-size:10px}.clean-chart .point{fill:#244f38;font-size:10px;font-weight:800}.clean-chart-empty{display:grid;place-items:center;min-height:180px;color:#737973}.clean-weight-history{margin-top:14px;padding:14px}.clean-weight-history article{display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.clean-weight-history small{display:block;color:var(--muted);font-size:.7rem;margin-top:2px}.clean-weight-history button{min-height:38px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);padding:0 9px}';document.head.append(s)}
function enhance(){style();renderCharts();weightHistory()}
function schedule(){setTimeout(enhance,0);setTimeout(enhance,120);setTimeout(enhance,500)}
document.addEventListener('click',e=>{if(e.target.closest('[data-page="progress"],[data-page="weight"],[data-page-link="weight"],#save-weight,#save-measurement))schedule()},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
