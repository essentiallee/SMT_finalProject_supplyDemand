 'use strict';
// Deterministic monthly scenario model. All behavioral parameters are illustrative.
const HousingModel = (() => {
  const defaults = Object.freeze({ units: 1000, occupancy: .8, rent: 1648,
    annualRentGrowth: .083, incomeGrowth: .033, annualArrivals: 60,
    pressureThreshold: .05, pressureSlope: .20, maxPremium: .10,
    constructionLag: 3, annualBuildLimit: 50, marketInterest: 5,
    loanYears: 30, loanToValue: .8, operatingExpenseShare: .30, equityYield: .06 });
  const shares = [19.1, 15.6, 24.2, 18.7, 12.9, 9.6];
  // Provisional local incomes inferred from table's affordable rents (30% income rule).
  // Open-ended upper band uses an explicit illustrative representative income.
  const incomes = [618*40, 1030*40, 1648*40, 2472*40, 3399*40, 160000];
  const sum = a => a.reduce((x,y) => x+y,0);
  // Income-supported per-apartment value: NOI funds mortgage service and equity return.
  // This is an illustrative underwriting proxy, not an observed transaction price.
  function apartmentValuation(monthlyRent, occupancy, annualInterest, config = defaults) {
    const c={...defaults,...config};
    const monthlyRate=annualInterest/100/12, months=c.loanYears*12;
    const mortgageConstant=monthlyRate===0 ? 12/months : 12*monthlyRate/(1-(1+monthlyRate)**(-months));
    const netOperatingIncome=monthlyRent*12*occupancy*(1-c.operatingExpenseShare);
    const requiredYield=c.loanToValue*mortgageConstant+(1-c.loanToValue)*c.equityYield;
    return {apartmentPrice:netOperatingIncome/requiredYield, netOperatingIncome, mortgageConstant, requiredYield};
  }
  function simulate(policies = {}, config = {}) {
    const c = {...defaults, ...config};
    const original = shares.map(s => c.units*c.occupancy*s/sum(shares));
    const initialOriginal = sum(original);
    const newcomers = incomes.map(() => 0);
    const waiting = incomes.map(() => 0);
    const entrantShares = [0, .02, .08, .25, .35, .30];
    let units = c.units, rent = c.rent, cumulativeArrivals = 0;
    const capacity = c.units*(1+(policies.density || 0)/100);
    const history = [];
    function snapshot(year, premium=0) {
      const growth = (1+c.incomeGrowth)**year;
      const protectedShare = (policies.affordable || 0)/100;
      const support = 1+(policies.subsidy || 0)/100;
      const protectedRent = c.rent*(1+c.incomeGrowth)**year;
      const effectiveRent = rent*(1-protectedShare)+Math.min(rent,protectedRent)*protectedShare;
      const occupied = sum(original)+sum(newcomers);
      let burdened = 0, incomeTotal = 0;
      incomes.forEach((income,i) => {
        const n = original[i]+newcomers[i];
        incomeTotal += n*income*growth;
        if(effectiveRent*12/(income*growth*support)>.30) burdened += n;
      });
      const interestRate=policies.interest ?? c.marketInterest;
      const valuation=apartmentValuation(effectiveRent,occupied/units,interestRate,c);
      return {...valuation, interestRate, year, units, rent, effectiveRent, original:sum(original), newcomers:sum(newcomers),
        retention:sum(original)/initialOriginal*100, occupied, occupancy:occupied/units*100,
        newcomerShare:occupied ? sum(newcomers)/occupied*100 : 0,
        burdened:occupied ? burdened/occupied*100 : 0, waiting:sum(waiting), cumulativeArrivals,
        demandRatio:(occupied+sum(waiting))/units, premium:premium*100,
        meanIncome:occupied ? incomeTotal/occupied : 0,
        originalByBand:[...original], newcomersByBand:[...newcomers]};
    }
    history.push(snapshot(0));
    for(let month=1;month<=240;month++) {
      const year=month/12;
      // Higher-income applicants enter a queue; unserved applicants may leave it.
      incomes.forEach((_,i) => { waiting[i] *= (1-.25)**(1/12); waiting[i] += c.annualArrivals/12*entrantShares[i]; });
      cumulativeArrivals += c.annualArrivals/12;
      const pressure = Math.max(0,(sum(original)+sum(newcomers)+sum(waiting))/units-1-c.pressureThreshold);
      const premium = Math.min(c.maxPremium,pressure*c.pressureSlope);
      rent *= (1+c.annualRentGrowth+premium)**(1/12);
      if(year>c.constructionLag && units<capacity) {
        const interest = policies.interest ?? c.marketInterest;
        const financing = Math.max(.1,Math.min(2,(1+c.marketInterest/100)/(1+interest/100)*Math.exp((c.marketInterest-interest)*.08)));
        units += Math.min(capacity-units,c.annualBuildLimit/12*financing);
      }
      const current=snapshot(year,premium);
      incomes.forEach((income,i) => {
        const burden=current.effectiveRent*12/(income*(1+c.incomeGrowth)**year*(1+(policies.subsidy || 0)/100));
        const annualExit=Math.min(.85,Math.max(0,burden-.30)*.8);
        const monthlyExit=1-(1-annualExit)**(1/12);
        original[i] *= 1-monthlyExit;
        newcomers[i] *= 1-monthlyExit;
      });
      let vacant=Math.max(0,units-sum(original)-sum(newcomers));
      // Higher purchasing power gets first access; entrants cannot exceed 40% burden.
      for(let i=incomes.length-1;i>=0;i--) {
        const budget=incomes[i]*(1+c.incomeGrowth)**year*(1+(policies.subsidy || 0)/100)*.4/12;
        if(budget<current.effectiveRent) continue;
        const admitted=Math.min(vacant,waiting[i]);
        newcomers[i]+=admitted; waiting[i]-=admitted; vacant-=admitted;
      }
      history.push(snapshot(year,premium));
    }
    return history;
  }
  function at(history,year) {
    const position=Math.max(0,Math.min(240,year*12));
    const low=Math.floor(position), high=Math.ceil(position), fraction=position-low;
    const result={...history[low]};
    Object.keys(result).forEach(key => {
      if(typeof result[key]==='number') result[key]+= (history[high][key]-result[key])*fraction;
      else if(Array.isArray(result[key])) result[key]=result[key].map((v,i)=>v+(history[high][key][i]-v)*fraction);
    });
    result.year=year; return result;
  }
  return {defaults,simulate,at,apartmentValuation, metadata: Object.freeze({incomes: Object.freeze([...incomes]), referenceAMI: 120100, incomeGrowth: defaults.incomeGrowth})};
})();
if(typeof module !== 'undefined') module.exports=HousingModel;
