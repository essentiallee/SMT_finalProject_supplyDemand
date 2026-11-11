/* Pure spatial model. All dimensions and build-out factors are illustrative. */
(function (root) {
  'use strict';
  const baseline = Object.freeze({ height: 12, coverage: 70, lots: 1, far: 8 });
  function build(policies = {}) {
    const s = { ...baseline, ...policies };
    const merge = Math.max(1, Math.min(5, Math.round(s.lots)));
    const coverage = Math.max(.25, Math.min(.9, s.coverage / 100));
    const cap = Math.max(3, Math.min(30, s.height));
    const far = Math.max(1, Math.min(15, s.far));
    const buildings = [];
    for (let by = 0; by < 5; by++) for (let bx = 0; bx < 5; bx++) {
      for (let row = 0; row < 2; row++) for (let col = 0; col < 10; col += merge) {
        const count = Math.min(merge, 10 - col);
        let factor = 0;
        for (let j = 0; j < count; j++) factor += .45 + ((bx * 71 + by * 113 + row * 37 + (col + j) * 19) % 101) / 200;
        factor /= count;
        const floors = Math.max(1, Math.floor(Math.min(cap, far / coverage) * factor));
        const k = Math.sqrt(coverage), land = count * 400;
        buildings.push({ id: `${bx + 1}${by + 1}-${row + 1}-${col + 1}`,
          x: bx * 120 + col * 10 + count * 10 * (1 - k) / 2,
          y: by * 100 + row * 40 + 40 * (1 - k) / 2,
          w: count * 10 * k, d: 40 * k, h: floors * 3, floors,
          land, footprint: land * coverage, count });
      }
    }
    return buildings;
  }
  function measure(buildings) {
    const land = buildings.reduce((sum, b) => sum + b.land, 0);
    const footprint = buildings.reduce((sum, b) => sum + b.footprint, 0);
    const area = buildings.reduce((sum, b) => sum + b.footprint * b.floors, 0);
    return { parcels: buildings.length, land, area, far: area / land, open: 100 * (1 - footprint / land) };
  }
  // Aggregate affordability share applied uniformly; no per-building allocation exists.
  function indicators(building, policies = {}, snapshot = null, reference = null) {
    const rules={...baseline,...policies};
    const realizedFAR=building.footprint*building.floors/building.land;
    const occupancy=snapshot ? snapshot.occupancy/100 : 1;
    const affordableFAR=realizedFAR*Math.max(0,Math.min(1,(policies.affordable || 0)/100))*occupancy;
    const capacityFAR=Math.min(rules.height*rules.coverage/100,rules.far)*(1+(policies.density || 0)/100);
    const valueRatio=snapshot?.apartmentPrice && reference?.apartmentPrice ? snapshot.apartmentPrice/reference.apartmentPrice : 1;
    const opportunity=capacityFAR>0?Math.max(0,Math.min(1,(capacityFAR-realizedFAR)/capacityFAR*valueRatio)):0;
    return {realizedFAR,affordableFAR,capacityFAR,opportunity};
  }
  function color(score,shade=1) {
    const t=Math.max(0,Math.min(1,score));
    const pale=[255,255,255],navy=[24,46,83];
    return `rgb(${pale.map((v,i)=>Math.round(Math.max(0,Math.min(255,(v+(navy[i]-v)*t)*(1-(1-shade)*(.15+.85*t)))))).join(',')})`;
  }
  const api = { baseline, build, measure, indicators, color };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SpatialModel = api;
})(globalThis);
