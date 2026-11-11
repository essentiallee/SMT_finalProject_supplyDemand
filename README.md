# Democratizing Policy Simulations

A collaborative SMT simulation exploring how housing supply, competing demand, financing, and policy affect a neighborhood over 20 years. Users act as policymakers and compare tenant retention, affordability, rents, apartment values, and development possibilities with a no-policy scenario. Ridgewood is the provisional reference case; the model is illustrative and has not been empirically validated.

## Model mathematics: base conditions → simulated possibilities

The following equations describe the implemented code, including its simplifications. Behavioral coefficients are assumptions, not research estimates. There are two connected visual layers: a monthly household model and an immediately adjustable fictional building model. Spatial geometry does **not** currently determine household-model housing supply.

### 1. Variables, units, and starting conditions

Time advances in monthly steps `m = 0…240`, with `t = m / 12` years. Household counts are continuous cohort weights, so fractional households are allowed. One household occupies one unit.

| Symbol / code field | Meaning | Default |
|---|---|---:|
| U₀ / `units` | Initial completed units | 1,000 |
| O₀ | Initial original households | 800 |
| N₀ | Initial newcomer households | 0 |
| W₀ | Initial waiting applicant households | 0 |
| q₀ / `occupancy` | Initial occupied share | 0.80 |
| R₀ / `rent` | Initial nominal monthly market rent | $1,648 |
| gR / `annualRentGrowth` | Baseline annual rent growth | 0.083 |
| gY / `incomeGrowth` | Annual income growth | 0.033 |
| A / `annualArrivals` | New applicants per year | 60 |
| θ / `pressureThreshold` | Excess-demand threshold above full capacity | 0.05 |
| k / `pressureSlope` | Rent-premium response coefficient | 0.20 |
| pmax / `maxPremium` | Maximum additional annual rent growth | 0.10 |
| L / `constructionLag` | Construction delay | 3 years |
| B / `annualBuildLimit` | Base completion rate after delay | 50 units/year |
| i₀ / `marketInterest` | Inactive interest-policy loan rate | 5% |

Rent grows by the assumed **8.3% annually**, not by a separately compounded 3.3% and 5%. Without additional demand pressure, rent after 20 years is approximately `R₀ × 4.9`.

Policy slider values use whole percentages: `20` means 20%. Below, `a = affordable / 100`, `s = subsidy / 100`, and `d = density / 100`; `i` remains in percentage points, e.g. `5`.

### 2. Original tenants, newcomer groups, and income

Original/new identify arrival cohorts. Both contain six income bands.

| Band | Original starting weight | Representative annual income | New applicant share |
|---|---:|---:|---:|
| 1 | 19.1 | $24,720 | 0% |
| 2 | 15.6 | $41,200 | 2% |
| 3 | 24.2 | $65,920 | 8% |
| 4 | 18.7 | $98,880 | 25% |
| 5 | 12.9 | $135,960 | 35% |
| 6 | 9.6 | $160,000 | 30% |

Weights sum to 100.1 and are normalized:

```text
O[j,0] = U₀ × q₀ × weight[j] / Σ weight
N[j,0] = W[j,0] = 0
Y[j,t] = Y[j,0] × (1 + gY)^t
```

The first five income proxies come from the team's table: `affordable monthly rent × 12 / 0.30`. The open-ended final band uses an invented $160,000 representative income. These are not verified local income estimates or official HUD category thresholds. The table's population counts are not converted into household counts.

### 3. Applicants and competing demand

At each monthly step, waiting applicants undergo abandonment before new arrivals are added:

```text
W[j] ← W[j] × (1 − 0.25)^(1/12) + (A / 12) × entrantShare[j]
cumulativeArrivals ← cumulativeArrivals + A / 12
pressure = max(0, (Σ O[j] + Σ N[j] + Σ W[j]) / U − 1 − θ)
premium = min(pmax, k × pressure)
```

Demand pressure starts above 105% of completed housing capacity. It includes housed households and waiting applicants, rather than treating every newcomer as additional unmet demand. This calculation uses occupancy and supply before this month's departures, admissions, and completions.

### 4. Market rent, affordable rent, and subsidy

```text
R ← R × (1 + gR + premium)^(1/12)
protectedRent[t] = R₀ × (1 + gY)^t
effectiveRent[t] = (1 − a) × R + a × min(R, protectedRent[t])
supportedIncome[j,t] = Y[j,t] × (1 + s)
rentBurden[j,t] = 12 × effectiveRent[t] / supportedIncome[j,t]
```

Affordable units are represented as a portfolio-wide weighted rent, applied to all households. The model does not allocate individual protected apartments. Housing subsidy increases the housing budget of both cohorts; it does not increase reported income, provide construction funding, or directly change asking rent.

### 5. Density capacity and financed construction

```text
unitCapacity = U₀ × (1 + d)
i = activated interest rate, otherwise i₀
financeFactor = clamp(((1 + i₀/100) / (1 + i/100))
                      × exp((i₀ − i) × 0.08), 0.10, 2.00)
```

After `t > 3` years, if `U < unitCapacity`:

```text
completedThisMonth = min(unitCapacity − U, (B / 12) × financeFactor)
U ← U + completedThisMonth
```

The first potential completion is month 37. Interest changes build-out speed but cannot create permitted units without a density bonus. This is a completion rule, not a developer profit-maximization decision. Density bonus does not directly rebuild the spatial geometry.

### 6. Affordability exits and admissions

For each income band and both housed cohorts:

```text
annualExit = min(0.85, max(0, rentBurden − 0.30) × 0.80)
monthlyExit = 1 − (1 − annualExit)^(1/12)
O[j] ← O[j] × (1 − monthlyExit)
N[j] ← N[j] × (1 − monthlyExit)
vacancies = max(0, U − Σ O[j] − Σ N[j])
```

Applicants are admitted in descending income order, band 6 to band 1:

```text
monthlyBudget[j] = Y[j,t] × (1 + s) × 0.40 / 12
if monthlyBudget[j] >= effectiveRent:
    admitted = min(vacancies, W[j])
    N[j] ← N[j] + admitted
    W[j] ← W[j] − admitted
    vacancies ← vacancies − admitted
```

Exits are affordability-related departure proxies, not measured evictions. Exited households are not placed back in the waiting queue. No ordinary turnover, household formation, births, income mobility, or returning original households is implemented.

### 7. Estimated apartment price and interest

This is an income-supported rental-apartment valuation proxy, not an observed sale price or an owner-occupier affordability estimate.

```text
r = i / 100 / 12
n = 30 × 12 = 360 months
annualMortgageConstant = 12r / (1 − (1+r)^(-n))
# At zero interest: annualMortgageConstant = 12 / n

q = occupied / U
NOI = effectiveRent × 12 × q × (1 − 0.30)
requiredYield = 0.80 × annualMortgageConstant + 0.20 × 0.06
apartmentPrice = NOI / requiredYield
priceDifferencePercent = 100 × (scenarioPrice / noPolicyPrice − 1)
```

Assumptions: 80% loan-to-value, a 30-year amortizing loan, 30% operating costs, and 6% required annual equity cash yield. Higher interest lowers supported value at fixed rent and occupancy. The policy applies from year zero, so valuation can change immediately. Activating interest at the baseline 5% correctly gives no difference.

Apartment price does not feed back into rent, migration, or construction decisions. Interest separately affects the construction rule above. Transaction costs, capital expenditure, resale, and appreciation expectations are absent. The displayed price difference combines all active policies, not just interest.

### 8. Reported outcomes

Let `occupied = Σ O[j] + Σ N[j]`.

| Output | Calculation |
|---|---|
| Monthly market rent | R |
| Estimated apartment price | NOI / requiredYield |
| Original tenants retained | 100 × Σ O[j] / 800 |
| Occupancy | 100 × occupied / U |
| New tenant share | 100 × Σ N[j] / occupied |
| Rent-burdened households | 100 × Σ((O[j]+N[j]) × indicator(rentBurden[j] > 0.30)) / occupied |
| Housing supply | U |
| Unmet demand | Σ W[j] |
| Vacancies | max(0, U − occupied) |
| Mean nominal annual income | Σ((O[j]+N[j]) × Y[j,t]) / occupied |
| Snapshot demand ratio | (occupied + Σ W[j]) / U |

Share and mean-income outputs return zero when there are no occupied households. Snapshot demand ratio is recorded after exits and admissions; rent's pressure calculation happens earlier in the month. The bottom scene summary shows rent, occupancy, and original retention alongside cohort counts and the composition bar.

### 9. Fictional building geometry

The spatial model contains 25 blocks with 20 original lots per block: 500 original lots. Each lot is 10 × 40 m; blocks are 100 × 80 m, streets are 20 m, and floor height is 3 m. Baseline rules: height cap 12 floors, 70% coverage, unmerged lots, maximum FAR 8.

For each parcel:

```text
mergeCount = clamp(round(lots), 1, 5)
c = clamp(coverage / 100, 0.25, 0.90)
H = clamp(height, 3, 30)
F = clamp(far, 1, 15)
lotFactor = 0.45 + ((blockX×71 + blockY×113 + row×37 + column×19) mod 101) / 200
factor = average lotFactor across merged original lots
floors = max(1, floor(min(H, F/c) × factor))
land = mergedOriginalLotCount × 400
footprint = land × c
heightMetres = floors × 3
parcelWidth = mergedOriginalLotCount × 10 × sqrt(c)
parcelDepth = 40 × sqrt(c)
```

Original-lot factors use zero-based block, row, and column indices. Footprints are centered in their parcel. Merging joins neighboring lots within each row; the final parcel can be smaller. Land area is conserved.

```text
realizedGrossFAR = Σ(footprint × floors) / Σ land
uncoveredLandPercent = 100 × (1 − Σ footprint / Σ land)
```

Height and FAR are simultaneous constraints. Raising a nonbinding height limit can leave geometry unchanged. Uncovered land is not necessarily public space. Geometry responds immediately to policy settings, not construction over the 20-year timeline.

### 10. Building-color indicators

Colors run from white (low) to navy (high), with fixed scales.

```text
parcelFAR = footprint × floors / land
occupiedAffordableFAR = parcelFAR × a × q
permittedCapacityFAR = min(heightRule × coverageRule/100, farRule) × (1+d)
relativeValue = scenarioApartmentPrice / sameYearNoPolicyApartmentPrice
opportunityIndex = clamp((permittedCapacityFAR − parcelFAR)
                        / permittedCapacityFAR × relativeValue, 0, 1)
```

Affordable color score is `clamp(occupiedAffordableFAR / 4, 0, 1)`: legend 0–4+ FAR. Opportunity score is the index above: legend 0–100. If valuation data are unavailable, relative value defaults to one. Baseline comparison uses no-policy values and a relative value of one. Color interpolation before face shading is `white + score × (navy − white)`; white is RGB `(255,255,255)` and navy `(24,46,83)`.

The affordable share and occupancy are applied uniformly across buildings; there is no parcel-level affordable allocation dataset. Opportunity is an illustrative capacity-and-value index, not expected profit or a probability of development. Interest affects this index through apartment valuation. Colors update on policy changes and timeline playback. AMI view colors the footprints while keeping tenant points lime/blue.

### 11. Tenant points and AMI height

```text
referenceAMI[t] = 120100 × (1.033)^t
AMIpercent[j,t] = 100 × Y[j,t] / referenceAMI[t]
AMIcloudHeight = AMIpercent × 1.45   # display coordinates, not physical metres
```

Original households are lime; newcomers are blue. One point has one household of weight; the final point of each cohort-band group has fractional opacity so weights sum to the modeled household count. Stable cohort-band indices and deterministic positions locate points within fictional parcels. Building view distributes points across building heights as an x-ray overlay; AMI view places points by income height above footprints.

Because income and reference AMI grow at the same default rate, the six income layers stay at fixed heights while their populations change. Subsidy affects budgets, not income/AMI height. Locations are illustrative, not actual addresses. Aggregate newcomer identities are not individual tracked people. Changing lot configurations can move point locations.

### 12. Simulation order, comparison, and interpolation

Each month executes: queue abandonment and arrivals → demand pressure → rent growth → eligible completions → effective rent and income → affordability exits → income-ordered admissions → snapshot.

Both trajectories use the same initial cohorts and arrival assumptions. Only activated policy tiles enter the scenario. Changing a policy recomputes its entire trajectory from year zero; it does not introduce the policy at the current cursor year. The no-policy comparison also changes over time.

`HousingModel.at(history, year)` interpolates scalar outputs and cohort arrays between neighboring monthly snapshots. Playback spans 20 modeled years in 60 seconds. It reads cached trajectories; it does not solve an additional model on each animation frame. Scrubbing pauses playback. End-of-timeline play restarts from zero.

Spatial edits reveal the live scenario in Buildings view. Matching parcels transition for 320ms with cubic ease-out; topology changes from lot merging apply immediately. Reduced-motion preference disables interpolation. This transition is interface motion, not construction timing.

## Policy controls and scope

| Tile | Range; initial slider value | Changes |
|---|---|---|
| Interest rate | 3–25%; 5% | Apartment valuation, financed build-out speed, opportunity color through value |
| Affordable units | 0–50%; 20% | Effective rent, affordability, departures/admissions, valuation, affordable-density color |
| Density bonus | 0–100%; 25% | Household unit capacity and spatial opportunity capacity; not physical massing |
| Housing subsidy | 0–50%; 10% | Household housing budgets and consequent occupancy/retention; indirect valuation/color effects |
| Height limit | 3–30 floors; 18 | Spatial height constraint and capacity |
| Lot coverage | 25–90%; 50% | Footprint and FAR/height relationship |
| Lot merging | 1–5 lots; 2 | Parcel count, dimensions, averaged lot factors |
| Maximum FAR | 1–15; 4 | Spatial floor-area constraint and capacity |

Slider defaults are not applied until the tile is activated. Removing a spatial tile restores its baseline spatial rule. Financial policy effects and spatial indicators are linked as described above; height/coverage/FAR/merging do not yet alter household units or rents.

## Functions and files

| File / function | Responsibility |
|---|---|
| `housing-model.js` / `simulate(policies, config)` | Return 241 monthly snapshots, including year zero |
| `housing-model.js` / internal `snapshot(year, premium)` | Calculate cohort outcomes, affordability, valuation, and band arrays |
| `housing-model.js` / `apartmentValuation(rent, occupancy, interest, config)` | Mortgage constant, NOI, required yield, and per-unit value |
| `housing-model.js` / `at(history, year)` | Read/interpolate a selected year |
| `script.js` / `movePolicy(id, zone)` | Activate/remove policy tiles |
| `script.js` / `demoModel(year)` | Cache scenario history and return same-year baseline/scenario; name retained from prototype |
| `script.js` / `render()` | Update results, timeline and `simulation:update` event |
| `script.js` / `setPlaying`, `advance`, `togglePlayback` | Shared timeline and focus-view playback |
| `geometry-model.js` / `build`, `measure` | Generate and summarize fictional buildings |
| `geometry-model.js` / `indicators`, `color` | Policy-linked scores and white-to-navy face colors |
| `tenant-points.js` / `TenantPoints.points` | Deterministic weighted tenant points and AMI |
| `geometry-view.js` / `draw()` | Render canvas geometry, points, legends, overlays, and selection |
| `style.css`, `geometry.css` | Glass panels, full-viewport scene, mobile layout and controls |
| `model-check.cjs` | Household-model and valuation checks |

`simulation:update.detail` contains `{ year, playing, baseCondition, policies, results: { baseline, scenario } }`. `baseCondition` exposes the housing defaults. Household snapshots contain `originalByBand` and `newcomersByBand`, enabling the point view without a separate population calculation.

## Interface and local preview

The scene fills the viewport. Policies and Results buttons independently hide their panels; Focus view hides both and restores the preceding panel state. Escape reveals them. Play/Pause beside AMI cloud shares the existing timeline. Rotate by dragging or arrow keys, zoom using the wheel or buttons, and click a building or point to inspect it. The bottom dock combines population change, live headline figures, and the building-color legend. Spatial statistics and assumptions expand from the corners.

Run from the repository folder:

```bash
python3 -m http.server 8001
```

Open http://127.0.0.1:8001/index.html and keep that terminal running. VS Code Live Server also works. No build dependencies are required. Develop in `Branch_Jae`, then review changes through pull requests into `main`.

## Verification and limitations

Run `node model-check.cjs`. Checks cover initial occupancy, deterministic trajectories, capacity bounds, original retention, construction delay, policy effects, valuation response to interest, and zero-interest/zero-occupancy valuation. Computational checks do not validate the assumptions against real behavior.

Ridgewood-to-NYC/USA transferability remains a hypothesis. Census/HUD integration, source years, ZIP versus ZCTA geography, household-size alignment, actual income distributions, rent regulation, development costs, fiscal costs, parcel-level occupancy, and affordable-unit allocation still require calibration. There is no live Census/HUD data connection. Subsidy capitalization, developer profit decisions, asset-price feedback into rent, and geometry-driven household supply are not implemented. The tool supports speculative comparison and discussion; it does not establish causal policy effects or produce a validated forecast.
