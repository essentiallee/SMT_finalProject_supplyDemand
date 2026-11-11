/* Stable illustrative household locations, not observed addresses or individual agents. */
(function(root) {
  'use strict';
  const hash = n => { const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v); };
  function points(snapshot,buildings,metadata) {
    if(!snapshot || !buildings.length) return [];
    const result=[];
    for(const [cohort,counts] of [['original',snapshot.originalByBand],['new',snapshot.newcomersByBand]]) {
      counts.forEach((count,band) => {
        // Last point has fractional opacity: visual weights equal exact cohort counts.
        for(let i=0;i<Math.ceil(count);i++) {
          const seed=band*100003+i*17+(cohort==='original'?7:900001);
          const lot=Math.floor(hash(seed)*500), bx=Math.floor(lot/20)%5, by=Math.floor(lot/100);
          const row=Math.floor(lot%20/10), col=lot%10;
          const b=buildings.find(b=> b.id.startsWith(`${bx+1}${by+1}-${row+1}-`) && col>=Number(b.id.split('-')[2])-1 && col<Number(b.id.split('-')[2])-1+b.count) || buildings[0];
          const x=b.x+b.w*(.12+.76*hash(seed+1)),y=b.y+b.d*(.12+.76*hash(seed+2));
          const nominalIncome=metadata.incomes[band]*(1+metadata.incomeGrowth)**snapshot.year;
          const referenceAMI=metadata.referenceAMI*(1+metadata.incomeGrowth)**snapshot.year;
          result.push({id:`${cohort}-${band}-${i}`,cohort,band,x,y,buildingZ:2+hash(seed+3)*Math.max(1,b.h-3),
            ami:nominalIncome/referenceAMI*100,income:nominalIncome,weight:Math.min(1,count-i)});
        }
      });
    }
    return result;
  }
  const api={points};if(typeof module!=='undefined')module.exports=api;else root.TenantPoints=api;
})(globalThis);
