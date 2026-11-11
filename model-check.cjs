const assert=require('node:assert/strict');
const model=require('./housing-model.js');
const base=model.simulate();
assert.equal(base.length,241);
assert.equal(base[0].occupancy,80);
assert.equal(base[0].retention,100);
assert.deepEqual(base,model.simulate({}));
for(const policy of [{},{density:25},{density:100,interest:3,affordable:30,subsidy:20},{interest:25},{affordable:50},{subsidy:50}]) {
 const history=model.simulate(policy);
 history.forEach((s,i)=>{
  for(const v of Object.values(s)) if(typeof v==='number') assert(Number.isFinite(v));
  assert(s.occupied<=s.units+1e-7);
  assert(s.occupancy>=0 && s.occupancy<=100+1e-7);
  assert(s.retention>=0 && s.retention<=100+1e-7);
  if(i) assert(s.original<=history[i-1].original+1e-7);
 });
 assert.equal(history[36].units,1000);
}
assert(model.simulate({density:25})[240].units>1000);
assert(model.simulate({affordable:50})[240].retention>base[240].retention);
assert(model.simulate({subsidy:50})[240].retention>base[240].retention);
assert.deepEqual(model.at(base,4.3),model.at(model.simulate(),4.3));
console.log('Model checks passed. Year 20 baseline:',JSON.stringify(base[240]));
