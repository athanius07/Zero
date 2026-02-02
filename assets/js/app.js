
async function loadData(){
  const res = await fetch('data/equipment.json');
  return await res.json();
}

function toCSV(rows){
  if(!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = v => '"'+String(v).replace(/"/g,'""')+'"';
  const lines = [cols.join(',')].concat(rows.map(r=>cols.map(c=>esc(r[c] ?? '')).join(',')));
  return lines.join('\n');
}

function normPower(p){
  const s = (p||'').toLowerCase();
  if(!s) return [];
  const parts = s.split(/[,/;+]|\s\+\s/).map(x=>x.trim()).filter(Boolean);
  return (parts.length?parts:[s]).map(x=>{
    if(x.includes('battery')) return {k:'Battery Electric', cls:'battery', label:'Battery'};
    if(x.includes('hydrogen fuel cell')||x==='hydrogen') return {k:'Hydrogen Fuel Cell', cls:'hydrogen-fc', label:'Hydrogen (FC)'};
    if(x.includes('hydrogen ice')||x.includes('h2 ice')) return {k:'Hydrogen ICE', cls:'hydrogen-ice', label:'Hydrogen (ICE)'};
    if(x.includes('methanol')) return {k:'Methanol', cls:'methanol', label:'Methanol'};
    if(x.includes('hybrid')) return {k:'Diesel Hybrid', cls:'hybrid', label:'Hybrid'};
    return {k:x, cls:'other', label:x.replace(/\b\w/g,c=>c.toUpperCase())};
  });
}

function chipsHTML(power){
  const items = normPower(power);
  if(!items.length) return '';
  return `<div class="chips">${items.map(it=>`<span class="chip ${it.cls}"><span class="dot"></span>${it.label}</span>`).join('')}</div>`;
}

function renderTable(rows){
  const tbody = document.querySelector('#equipTable tbody');
  tbody.innerHTML='';
  for(const r of rows){
    const types = ['Dump Truck','Bulldozer','Grader','Wheel Loader','Excavator']
      .filter(k=>r[k]).map(k=>k.replace(' Truck','')).join(', ');
    const source = r['Source Link'] ? `<a href="${r['Source Link']}" target="_blank" rel="noopener">Link</a>`+(r['Source Date']?` <small>(${r['Source Date']})</small>`:'') : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r['Machine Name']||''}</td>
      <td>${chipsHTML(r['Power Type'])}</td>
      <td>${r['OEM']||''}</td>
      <td>${r['Country of Origin']||''}</td>
      <td>${r['Class (tons)']||''}</td>
      <td>${r['Engine / Motor Power']||''}</td>
      <td>${r['Bucket Size (excavator/wheel loader)']||''}</td>
      <td>${types}</td>
      <td>${r['Year of Release']||''}</td>
      <td>${r['Status']||''}</td>
      <td>${source}</td>
    `;
    tbody.appendChild(tr);
  }
  document.getElementById('count').textContent = `${rows.length} machine(s)`;
}

function applyFilters(all){
  const q = document.getElementById('search').value.trim().toLowerCase();
  const p = document.getElementById('powerType').value;
  const fDump = document.getElementById('chkDump').checked;
  const fDozer = document.getElementById('chkDozer').checked;
  const fGrad = document.getElementById('chkGrader').checked;
  const fLoad = document.getElementById('chkLoader').checked;
  const fExc = document.getElementById('chkExc').checked;
  const fRel = document.getElementById('releasedOnly').checked;
  let out = all.filter(r=>{
    if(p){
      const labels = normPower(r['Power Type']).map(it=>it.k);
      if(!labels.includes(p)) return false;
    }
    if(fRel && !(r['Status']||'').toLowerCase().includes('released')) return false;
    const needTypes = [];
    if(fDump) needTypes.push('Dump Truck');
    if(fDozer) needTypes.push('Bulldozer');
    if(fGrad) needTypes.push('Grader');
    if(fLoad) needTypes.push('Wheel Loader');
    if(fExc) needTypes.push('Excavator');
    if(needTypes.length && !needTypes.every(k=>!!r[k])) return false;
    if(q){
      const hay = [
        r['Machine Name'], r['Power Type'], r['OEM'], r['Country of Origin'], r['Class (tons)'],
        r['Engine / Motor Power'], r['Bucket Size (excavator/wheel loader)'], r['Status'], r['Notes']
      ].map(v=>String(v||'').toLowerCase()).join(' | ');
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  return out;
}

function sortByKey(rows, key, asc=true){
  return rows.slice().sort((a,b)=>{
    const va = (a[key]||'').toString();
    const vb = (b[key]||'').toString();
    if(!isNaN(va) && !isNaN(vb)) return (parseFloat(va)-parseFloat(vb))*(asc?1:-1);
    return va.localeCompare(vb)*(asc?1:-1);
  });
}

(async function(){
  const all = await loadData();
  let current = all.slice();
  renderTable(current);

  const refilter = ()=>{ current = applyFilters(all); renderTable(current); };
  document.getElementById('search').addEventListener('input', refilter);
  document.getElementById('powerType').addEventListener('change', refilter);
  ['chkDump','chkDozer','chkGrader','chkLoader','chkExc','releasedOnly'].forEach(id=>
    document.getElementById(id).addEventListener('change', refilter));

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    document.getElementById('search').value='';
    document.getElementById('powerType').value='';
    ['chkDump','chkDozer','chkGrader','chkLoader','chkExc','releasedOnly']
      .forEach(id=>document.getElementById(id).checked=false);
    current = all.slice();
    renderTable(current);
  });

  document.getElementById('downloadCsv').addEventListener('click', ()=>{
    const normalized = current.map(r=>({
      ...r,
      'Power Type': normPower(r['Power Type']).map(it=>it.k).join(', ')
    }));
    const csv = toCSV(normalized);
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'equipment_export.csv';
    a.click();
  });

  const headers = document.querySelectorAll('#equipTable thead th[data-key]');
  headers.forEach(th=>{
    let asc = true;
    th.addEventListener('click', ()=>{
      const key = th.getAttribute('data-key');
      current = sortByKey(current, key, asc);
      asc = !asc;
      renderTable(current);
    });
  });
})();
