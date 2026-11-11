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
// Financing changes valuation even with no density policy or new construction.
const low=model.simulate({interest:3}),high=model.simulate({interest:10});
assert.deepEqual(model.simulate({interest:5}),base);
for(const i of [0,120,240]) {
 assert(low[i].apartmentPrice>base[i].apartmentPrice);
 assert(high[i].apartmentPrice<base[i].apartmentPrice);
 assert.equal(high[i].units,base[i].units);
 assert.equal(high[i].rent,base[i].rent);
 assert(Number.isFinite(high[i].apartmentPrice));
}
const zero=model.apartmentValuation(1648,.8,0);
assert(Number.isFinite(zero.apartmentPrice));
assert.equal(model.apartmentValuation(1648,0,5).apartmentPrice,0);
assert(model.apartmentValuation(2000,.8,5).apartmentPrice>model.apartmentValuation(1648,.8,5).apartmentPrice);
assert.equal(model.at(base,1.25).apartmentPrice,(base[15].apartmentPrice));
console.log('Apartment valuation checks passed. Initial prices by interest rate:',Object.fromEntries([3,5,10].map(interest=>[`${interest}%`,Math.round(model.simulate({interest})[0].apartmentPrice)])));
