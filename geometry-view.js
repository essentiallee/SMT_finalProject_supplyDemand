(function () {
  'use strict';
  const mount = document.getElementById('model-mount');
  mount.innerHTML = `<div class="model-heading"><h1>A NEIGHBORHOOD OF POSSIBILITIES</h1><p>25 fictional blocks / 500 original lots<br>Spatial capacity, not a development forecast.</p></div>
    <div class="model-toolbar"><button id="tenant-mode" aria-pressed="false">AMI cloud</button><button id="tenant-original" aria-pressed="true">Original</button><button id="tenant-new" aria-pressed="true">New</button><button id="geometry-baseline" aria-pressed="false">View baseline</button><button id="rotate-left" aria-label="Rotate left">↶</button><button id="rotate-right" aria-label="Rotate right">↷</button><button id="zoom-in" aria-label="Zoom in">＋</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="reset-view">Reset view</button></div>
    <div class="tenant-legend"><span class="original-key">● Original tenants</span><span class="new-key">● New tenants</span><span>1 point = 1 household · partial points fade</span></div><div class="tenant-summary" aria-label="Live scenario summary" aria-live="off"></div><canvas id="neighborhood-canvas" tabindex="0" aria-label="Fictional neighborhood. Drag or use left and right arrow keys to rotate. Scroll or use plus and minus to zoom."></canvas>
    <div class="model-inspector" hidden></div><details class="scene-stats"><summary>Spatial statistics</summary><div class="model-stats" aria-label="Spatial results"></div></details>
    <p class="model-caption">Drag to rotate · Scroll to zoom · Click a building<br><span id="geometry-status">Scenario / baseline spatial rules</span><br>Points follow the household model and year. Spatial controls change illustrative placement; they do not change household outcomes. In AMI view, height = income / inflation-adjusted reference AMI.</p>
    <details class="model-notes"><summary>Spatial model / assumptions</summary><div class="notes-body"><p>All geometry is synthetic: 5 × 5 blocks, each 100 × 80 m, with twenty 10 × 40 m lots. Streets are 20 m wide; each floor is 3 m tall. This is not a real NYC neighborhood or a zoning-compliance model.</p><p>Baseline: 12-floor height limit, 70% lot coverage, unmerged lots, maximum FAR 8. Coverage sets the footprint. Floors = floor(min(height limit, FAR / coverage fraction) × build-out factor), with a minimum of one floor.</p><p>Each original lot has a fixed illustrative factor of 0.45–0.95. Merged lots average their factors. Merging joins adjacent lots within a block row; any remainder stays as a smaller parcel. Land area is conserved.</p><p>Spatial policies combine simultaneously, not in chain order. Removing a policy restores its baseline parameter. Realized FAR is gross floor area divided by parcel land area, excluding streets. Uncovered land is not necessarily public space.</p><p>Interest, affordable units, density bonus and subsidy affect the separate 20-year household model. Height, coverage, lot merging and FAR affect this geometry only. Geometry does not feed housing-unit counts or rent. The household model includes illustrative construction timing and affordability exits; neither model is a validated forecast.</p></div></details>`;
  const panelControls=document.createElement('nav');
  panelControls.className='scene-panel-controls';
  panelControls.setAttribute('aria-label','Scene panels');
  panelControls.innerHTML='<button id="toggle-policies" aria-pressed="true">Policies</button><button id="scene-focus" aria-pressed="false">Focus view</button><button id="toggle-results" aria-pressed="true">Results</button>';
  document.body.append(panelControls);
  const left=document.querySelector('.tool-panel'),right=document.querySelector('.right-column');
  left.id='policy-panel';right.id='results-panel';
  document.getElementById('toggle-policies').setAttribute('aria-controls',left.id);
  document.getElementById('toggle-results').setAttribute('aria-controls',right.id);
  let focusRestore=null;
  function syncPanels(){
    const lh=document.body.classList.contains('scene-hide-left'),rh=document.body.classList.contains('scene-hide-right');
    left.inert=lh;right.inert=rh;
    left.setAttribute('aria-hidden',String(lh));right.setAttribute('aria-hidden',String(rh));
    document.getElementById('toggle-policies').setAttribute('aria-pressed',String(!lh));
    document.getElementById('toggle-results').setAttribute('aria-pressed',String(!rh));
    document.getElementById('scene-focus').setAttribute('aria-pressed',String(lh&&rh));
    document.getElementById('scene-focus').textContent=lh&&rh?'Show panels':'Focus view';
  }
  document.getElementById('toggle-policies').onclick=()=>{document.body.classList.toggle('scene-hide-left');syncPanels();};
  document.getElementById('toggle-results').onclick=()=>{document.body.classList.toggle('scene-hide-right');syncPanels();};
  document.getElementById('scene-focus').onclick=()=>{
    if(document.body.classList.contains('scene-hide-left')&&document.body.classList.contains('scene-hide-right')){
      document.body.classList.toggle('scene-hide-left',focusRestore?.left??false);
      document.body.classList.toggle('scene-hide-right',focusRestore?.right??false);
    }else{
      focusRestore={left:document.body.classList.contains('scene-hide-left'),right:document.body.classList.contains('scene-hide-right')};
      document.body.classList.add('scene-hide-left','scene-hide-right');
    }syncPanels();
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('scene-hide-left','scene-hide-right');syncPanels();}});
  syncPanels();
  const canvas = document.getElementById('neighborhood-canvas'), ctx = canvas.getContext('2d');
  const inspector = mount.querySelector('.model-inspector');
  let snapshots=null, cloud=false, showOriginal=true, showNew=true, pointHits=[];
  let policies = {}, baseline = false, angle = -.65, zoom = 1, hits = [], selected = null;
  const baseMetrics = SpatialModel.measure(SpatialModel.build());
  function draw() {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = box.width, H = box.height, scale = Math.max(.02, Math.min(W / 760, H / (cloud ? 690 : 460))) * zoom;
    const co = Math.cos(angle), si = Math.sin(angle);
    const project = (x, y, z = 0) => { x -= 290; y -= 240; return [W / 2 + (x * co - y * si) * scale, (cloud ? H * .65 : H * .54) + (x * si + y * co) * .48 * scale - z * scale]; };
    hits = []; pointHits=[];
    function poly(vertices, color, b) {
      const points = vertices.map(v => project(...v));
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = b?.id === selected ? '#35495c' : '#68758255'; ctx.lineWidth = b?.id === selected ? 1.6 : .45; ctx.stroke();
      if (b) hits.push({ points, b });
    }
    poly([[-16,-16],[596,-16],[596,496],[-16,496]], '#c5cbd1');
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) poly([[x*120-3,y*100-3],[x*120+103,y*100-3],[x*120+103,y*100+83],[x*120-3,y*100+83]], '#e6e9ec');
    const bs = SpatialModel.build(baseline ? {} : policies);
    bs.sort((a,b) => ((a.x+a.w/2)*si+(a.y+a.d/2)*co)-((b.x+b.w/2)*si+(b.y+b.d/2)*co));
    for (const b of bs) {
      const {x,y,w,d,h} = b;
      if(cloud) { poly([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],'#e4e8ec99',b); continue; }
      const faces = [ [[x,y,0],[x+w,y,0],[x+w,y,h],[x,y,h]], [[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]], [[x+w,y+d,0],[x,y+d,0],[x,y+d,h],[x+w,y+d,h]], [[x,y+d,0],[x,y,0],[x,y,h],[x,y+d,h]] ];
      // Visible Y face is determined by cos(angle), X face by sin(angle).
      // Swapping these tests renders back faces and makes the boxes look broken.
      poly(co < 0 ? faces[0] : faces[2], '#8d99a5', b);
      poly(si > 0 ? faces[1] : faces[3], '#b1bbc4', b);
      poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]], '#edf0f3', b);
    }
    const snapshot=snapshots?.[baseline?'baseline':'scenario'];
    if(snapshot) {
      const all=TenantPoints.points(snapshot,bs,HousingModel.metadata);
      const visible=all.filter(p=>(p.cohort==='original'?showOriginal:showNew));
      const sorted=visible.map(p=>({...p,screen:project(p.x,p.y,cloud?p.ami*1.45:p.buildingZ)})).sort((a,b)=>a.screen[1]-b.screen[1]);
      // Points overlay translucent building massing to expose internal occupancy.
      for(const p of sorted) {
        const [px,py]=p.screen;
        ctx.globalAlpha=p.weight*.88;ctx.beginPath();ctx.arc(px,py,Math.max(1.5,2.8*Math.sqrt(scale)),0,Math.PI*2);
        ctx.fillStyle=p.cohort==='original'?'#b2ef35':'#368bfa';ctx.fill();ctx.strokeStyle=p.cohort==='original'?'#648b20':'#2362ae';ctx.lineWidth=.45;ctx.stroke();
        pointHits.push({...p,px,py});
      }
      ctx.globalAlpha=1;
      if(cloud) {
        const origin=project(-30,-25,0), top=project(-30,-25,190*1.45);
        ctx.strokeStyle='#7b8490';ctx.fillStyle='#59636f';ctx.lineWidth=1;ctx.font='10px monospace';ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(...top);ctx.stroke();
        [0,30,50,80,120,165].forEach(t=>{const [x,y]=project(-30,-25,t*1.45);ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.stroke();ctx.fillText(`${t}%`,x+7,y+3);});
        ctx.fillText('AMI %',top[0]-4,top[1]-9);
      }
      const vacancy=Math.max(0,snapshot.units-snapshot.occupied);
      const shares=[snapshot.original,snapshot.newcomers,vacancy].map(n=>n/snapshot.units*100);
      mount.querySelector('.tenant-summary').innerHTML=`<div class="tenant-counts">YEAR ${snapshot.year.toFixed(1)} · ${baseline?'NO POLICY':'YOUR SCENARIO'}<br><span class="original-key">${Math.round(snapshot.original)} original</span> · <span class="new-key">${Math.round(snapshot.newcomers)} new</span> · ${Math.round(vacancy)} vacant</div><div class="tenant-composition" aria-label="Housing composition"><i style="width:${shares[0]}%;background:#b2ef35"></i><i style="width:${shares[1]}%;background:#368bfa"></i><i style="width:${shares[2]}%;background:#d8dde2"></i></div><div class="scene-live-metrics"><div><span>RENT / MO</span><strong>$${Math.round(snapshot.rent).toLocaleString('en-US')}</strong></div><div><span>OCCUPANCY</span><strong>${snapshot.occupancy.toFixed(1)}%</strong></div><div><span>ORIGINAL RETAINED</span><strong>${snapshot.retention.toFixed(1)}%</strong></div></div>`;
      canvas.dataset.pointWeight=all.reduce((n,p)=>n+p.weight,0).toFixed(6);
      canvas.dataset.original=String(snapshot.original);canvas.dataset.newcomers=String(snapshot.newcomers);
    }
    const m = SpatialModel.measure(bs), fmt = n => n.toLocaleString(undefined,{maximumFractionDigits:1});
    const delta = (n,b,u='') => Math.abs(n-b)<.01 ? 'Same as baseline' : `${n>b?'+':''}${fmt(n-b)}${u} vs baseline`;
    mount.querySelector('.model-stats').innerHTML = [ [m.parcels,'BUILDING PARCELS',delta(m.parcels,baseMetrics.parcels)], [m.far.toFixed(2),'REALIZED GROSS FAR',delta(m.far,baseMetrics.far,'×')], [fmt(Math.round(m.area)),'GROSS FLOOR AREA / M²',delta(m.area,baseMetrics.area)], [fmt(m.open)+'%','UNCOVERED LOT AREA',delta(m.open,baseMetrics.open,' pp')] ].map(([v,l,d])=>`<div class="model-stat"><strong>${v}</strong><span>${l}</span><small>${d}</small></div>`).join('');
    document.getElementById('geometry-status').textContent = baseline ? 'BASELINE / spatial policies excluded' : `SCENARIO / ${Object.keys(policies).filter(k=>k in SpatialModel.baseline).length} active spatial rules`;
    const picked = bs.find(b=>b.id===selected); inspector.hidden = !picked;
    if (picked) inspector.innerHTML = `<b>PARCEL ${picked.id}</b><br>${picked.count} original lot(s)<br>${picked.floors} floors / ${picked.h} m<br>${fmt(picked.land)} m² land<br>${fmt(picked.footprint)} m² footprint`;
  }
  document.addEventListener('simulation:update', e => { policies = e.detail.policies; snapshots=e.detail.results; draw(); });
  document.getElementById('tenant-mode').onclick=e=>{cloud=!cloud;e.currentTarget.setAttribute('aria-pressed',String(cloud));e.currentTarget.textContent=cloud?'Buildings':'AMI cloud';selected=null;draw();};
  document.getElementById('tenant-original').onclick=e=>{showOriginal=!showOriginal;e.currentTarget.setAttribute('aria-pressed',String(showOriginal));draw();};
  document.getElementById('tenant-new').onclick=e=>{showNew=!showNew;e.currentTarget.setAttribute('aria-pressed',String(showNew));draw();};
  document.getElementById('geometry-baseline').onclick = e => { baseline = !baseline; e.currentTarget.setAttribute('aria-pressed',String(baseline)); e.currentTarget.textContent = baseline ? 'View scenario' : 'View baseline'; draw(); };
  const rotate = d => { angle += d; draw(); }, magnify = d => { zoom = Math.max(.5,Math.min(2.5,zoom*d)); draw(); };
  document.getElementById('rotate-left').onclick = ()=>rotate(-.25); document.getElementById('rotate-right').onclick = ()=>rotate(.25);
  document.getElementById('zoom-in').onclick = ()=>magnify(1.15); document.getElementById('zoom-out').onclick = ()=>magnify(1/1.15);
  document.getElementById('reset-view').onclick = ()=>{angle=-.65;zoom=1;selected=null;draw();};
  let drag = null;
  canvas.onpointerdown = e => { if(e.button!==0)return; drag={x:e.clientX,y:e.clientY,last:e.clientX,moved:false}; canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = e => { if(!drag)return; drag.moved ||= Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5; angle+=(e.clientX-drag.last)*.008;drag.last=e.clientX;draw(); };
  const inside = (p,vs) => { let yes=false;for(let i=0,j=vs.length-1;i<vs.length;j=i++){const a=vs[i],b=vs[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes; };
  canvas.onpointerup = e => { if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(); const px=e.clientX-r.left,py=e.clientY-r.top;
      const point=[...pointHits].reverse().find(p=>Math.hypot(p.px-px,p.py-py)<7);
      selected=[...hits].reverse().find(f=>inside([px,py],f.points))?.b.id??null;draw();
      if(point){inspector.hidden=false;inspector.innerHTML=`<b>${point.cohort==='original'?'ORIGINAL':'NEW'} HOUSEHOLD</b><br>${point.ami.toFixed(1)}% reference AMI<br>$${Math.round(point.income).toLocaleString()} annual income<br>Illustrative location · band ${point.band+1}`;}}drag=null; };
  canvas.onpointercancel = canvas.onlostpointercapture = ()=>{drag=null;};
  canvas.addEventListener('wheel',e=>{e.preventDefault();magnify(Math.exp(-e.deltaY*.001));},{passive:false});
  canvas.onkeydown = e => { if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();if(e.key.startsWith('Arrow'))rotate(e.key==='ArrowLeft'?-.15:.15);else magnify(e.key==='+'?1.1:1/1.1);} };
  new ResizeObserver(draw).observe(canvas); draw();
})();
