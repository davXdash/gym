const SNAP='gym-snapshot-v11';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const val=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2});
const shortDate=v=>{if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(5,10).split('-').reverse().join('.');return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(d)};

function chart(rows,key,unit){
 const data=rows.map(r=>({value:num(r[key]),date:r.measured_at||r.created_at||r.date})).filter(x=>x.value!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(!data.length)return'<div class="clean-chart-empty">Noch keine Daten</div>';
 const values=data.map(x=>x.value),lo=Math.min(...values),hi=Math.max(...values),rawSpan=Math.max(.1,hi-lo),pad=Math.max(rawSpan*.28,.6),min=Math.max(0,lo-pad),max=hi+pad,span=Math.max(.1,max-min);
 const W=390,H=255,L=66,R=18,T=28,B=58,plotW=W-L-R,plotH=H-T-B,x=i=>L+i*plotW/Math.max(1,data.length-1),y=v=>T+(max-v)/span*plotH;
 let grid='';for(let i=0;i<5;i++){const yy=T+i*plotH/4,v=max-i*span/4;grid+=`<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="y" x="${L-9}" y="${yy+4}" text-anchor="end">${val(v)}</text>`}
 const path=data.map((p,i)=>`${x(i)},${y(p.value)}`).join(' '),points=data.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5"/><text class="point" x="${x(i)}" y="${Math.max(14,y(p.value)-11)}" text-anchor="middle">${val(p.value)}</text>`).join(''),every=Math.max(1,Math.ceil(data.length/5)),labels=data.map((p,i)=>i%every===0||i===data.length-1?`<text class="x" x="${x(i)}" y="${H-22}" text-anchor="middle">${shortDate(p.date)}</text>`:'').join('');
 return`<svg class="clean-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf ${unit}"><text class="axis-title-y" x="14" y="${T+plotH/2}" transform="rotate(-90 14 ${T+plotH/2})" text-anchor="middle">${unit}</text><text class="axis-title-x" x="${L+plotW/2}" y="${H-4}" text-anchor="middle">Datum</text>${grid}<line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><polyline points="${path}"/>${points}${labels}</svg>`;
}
function notes(row,key){try{return JSON.parse(row.notes||'{}')[key]??null}catch{return null}}
function measurement(rows,key){return rows.map(r=>({...r,value:key.startsWith('notes:')?notes(r,key.slice(6)):r[key]})).filter(r=>num(r.value)!=null)}
function card(title,rows){return`<article class="chart-card card clean-extra"><h3>${title}</h3><div>${chart(rows,'value','cm')}</div></article>`}
function render(){const s=read(SNAP,{measurements:[]}),measurements=s.measurements||[],waist=chart(measurement(measurements,'waist_cm'),'value','cm');if(q('#waist-chart'))q('#waist-chart').innerHTML=waist;if(q('#waist-chart-2'))q('#waist-chart-2').innerHTML=waist;const page=q('#page-progress');if(page){qa('.clean-extra',page).forEach(x=>x.remove());for(const [title,key] of [['Brust','chest_cm'],['Schulter','shoulder_cm'],['Oberarm links','upper_arm_left_cm'],['Oberarm rechts','upper_arm_right_cm'],['Bauch','notes:abdomen_cm']]){const rows=measurement(measurements,key);if(rows.length)page.insertAdjacentHTML('beforeend',card(title,rows))}}}
function style(){if(q('#clean-progress-style'))return;const s=document.createElement('style');s.id='clean-progress-style';s.textContent='.clean-chart{display:block;width:100%;height:auto;overflow:visible}.clean-chart .grid{stroke:var(--line,#e2e8e2);stroke-width:1}.clean-chart .axis{stroke:var(--muted,#778279);stroke-width:1.3}.clean-chart polyline{fill:none;stroke:#356b4d;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.clean-chart circle{fill:#356b4d;stroke:var(--surface,#fff);stroke-width:2}.clean-chart text{font-family:inherit}.clean-chart .x,.clean-chart .y,.clean-chart .axis-title-x,.clean-chart .axis-title-y{fill:var(--muted,#707a72);font-size:10px}.clean-chart .axis-title-x,.clean-chart .axis-title-y{font-weight:800}.clean-chart .point{fill:var(--text,#244f38);font-size:10px;font-weight:800}.clean-chart-empty{display:grid;place-items:center;min-height:180px;color:var(--muted,#737973)}';document.head.append(s)}
function install(){style();render();document.addEventListener('click',e=>{if(e.target.closest('[data-page="progress"],[data-page="measurements"],#save-measurement))setTimeout(render,80)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
