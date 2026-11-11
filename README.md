# Democratizing Policy Simulations

A collaborative SMT project exploring how policy changes supply, demand, tenant retention, and housing development on a lot over 20 years. Developers and tenants are the actors; the user acts as policymaker. This branch contains an illustrative scenario model, not an empirically validated forecast.

## Run

Open `index.html` using VS Code Live Server, or run `python3 -m http.server 8000` in this directory and open http://127.0.0.1:8000/index.html. No build dependencies. Work belongs on `Branch_Jae`; do not overwrite teammates' branches.

## Model and base condition

`housing-model.js` computes 240 monthly steps. `script.js` preserves policy drag/drop, panel motion, and timeline playback, and caches complete trajectories. Rewinding always reads the same trajectory. Policy changes recompute the scenario from year zero; they are not interventions introduced at the current cursor year. The no-policy comparison advances through time too.

| Parameter | Initial assumption |
|---|---|
| Housing supply | 1,000 units |
| Original households | 800, or 80% occupancy |
| Initial asking rent | $1,648/month, illustrative common rent anchored to the supplied table |
| Annual market rent growth | 8.3% (user assumption: 3.3% inflation + 5 percentage points) |
| Annual household income growth | 3.3%, illustrative |
| Incoming applicant households | 60/year, illustrative |
| Initial waiting applicants | Zero |
| Pressure threshold | Total occupied + waiting households above 105% of completed units |
| Additional annual rent premium | 0.20 × excess demand ratio, capped at 10 percentage points |

Annual rent growth is converted to a compounded monthly rate: `rent *= (1 + .083 + premium) ** (1/12)`. Demand is measured before monthly departures and admissions. Vacancies absorb applicants before unmet demand accumulates. Income growth compounds too. Without the premium, 20 years of 8.3% growth multiplies rent by roughly 4.9.

### Tenant cohorts and provisional table inputs

Original/new are arrival cohorts, each with six income bands, not synonyms for low/high income. Original households start with supplied Ridgewood shares `[19.1,15.6,24.2,18.7,12.9,9.6]`, normalized because they sum to 100.1%. Provisional representative annual incomes are inferred from the table's affordability rents using `monthly rent × 12 / 0.30`: `[24720,41200,65920,98880,135960,160000]`. The final open-ended band uses an explicitly invented $160,000 representative income. These are modeling proxies, not verified Ridgewood income estimates or HUD thresholds.

New applicants follow a higher-income mix `[0,2,8,25,35,30]%`. Household counts can be fractional: this is a deterministic cohort model, not individual agents. The table's population counts are not treated as household counts. Historical year, statistical geography (ZIP versus ZCTA), household size, income-band definitions, and source denominators need verification before empirical calibration.

### Monthly sequence

1. Retain waiting applicants with a 25% annual queue abandonment rate and add arrivals.
2. Calculate demand pressure and increase market rent.
3. Complete eligible additional housing after a three-year construction delay.
4. Calculate effective rent, income, and affordability exits for both cohorts.
5. Admit waiting households into vacant units, highest income first, if rent is no more than 40% of income plus support.
6. Record outcomes.

Annual affordability-exit probability is `min(.85, max(0, rentBurden-.30)*.8)`, converted to a monthly probability. This is an illustrative affordability departure proxy, not measured eviction, involuntary displacement, or a causal estimate. No ordinary turnover, births, household formation, household splitting, income mobility, or returning originals is modeled. Exited original households do not enter the incoming applicant queue.

## Policies

Only activated tiles affect the scenario.

| Tile | Current mechanism |
|---|---|
| Interest rate | Financing proxy that changes the pace of additional construction; inactive uses 5% market rate. Alone it adds no capacity. |
| Density bonus | Adds permitted units relative to initial supply. Completion starts after three years, at a base limit of 50 units/year modified by financing. |
| Affordable units | Simplified portfolio-wide protected fraction whose rent grows at 3.3%; remaining fraction pays market rent. Applies as an average rent to all households, not allocated individual units. |
| Housing subsidy | Increases effective housing purchasing capacity by the chosen percentage for both cohorts; it is not a construction subsidy. |

Construction is an illustrative financed build-out rule, not a developer profit optimization model. Affordable requirements do not currently reduce project feasibility. Policy fiscal costs and subsidy capitalization into landlord asking rent are not modeled. An interest-only scenario intentionally leaves tenant outcomes unchanged without a density bonus.

## Results

Every card compares no policy with the selected scenario at the same year: nominal monthly market rent; original household retention (initial 800 denominator); occupancy; newcomer share among housed households; households above 30% effective rent burden; completed units; and waiting applicants. The rent burden denominator includes subsidy support. Mean income, effective rent, demand ratio, premium, and cohort arrays are also available in `simulation:update` event results.

An area may have high occupancy while losing original tenants. More units need not guarantee their retention. Results express assumptions and enable policy comparison; they are not research findings.

## Geography and next phase

Ridgewood is the provisional calibration case. Transferring its mechanisms to NYC or the USA is a hypothesis to test, not an established equivalence. Future Census/HUD adapters should replace local income distributions, rents, household counts, income growth, arrivals, and development assumptions with geography- and year-specific inputs. No live Census/HUD connection exists yet.

Physical geometry is unchanged. A future renderer can consume `simulation:update` for tenant turnover, changing buildings, 3D candlesticks, or point density. `baseCondition` now contains `HousingModel.defaults`; `results` contains `baseline` and `scenario` snapshots, replacing the old A/B access/value fields.

## Validation

Run `node model-check.cjs` for initial occupancy, no-policy equivalence, finite/bounded results, conservation of capacity, nonincreasing original retention, policy effects, construction delay, and deterministic scrubbing checks. Behavioral assumptions require empirical validation beyond these computational checks.

## Geometry integration preserved from main

`geometry-model.js`, `geometry-view.js`, and `geometry.css` retain the fictional 25-block / 500-lot model. Height limit, lot coverage, lot merging and maximum FAR update geometry immediately. The four household policy tiles operate on the separate monthly housing model. Spatial controls do not affect its rent, capacity or household outputs; the year cursor does not phase geometry. Neither model represents observed buildings or validated zoning.

The page loads the housing engine, spatial engine, spatial view, then interface controller. Spatial view listens to `simulation:update` and uses its policies without depending on the removed A/B outputs. Manual, credits and household results notes are owned by HTML so the geometry adapter cannot replace them with outdated demo descriptions.

Merge resolution preserves main's geometry controls and unit-aware accessibility labels alongside Jae's cohort engine and seven results cards. Text files use LF line endings to avoid whole-file conflicts from CRLF conversion.

## Policy-responsive tenant points

Toggle Buildings / AMI cloud. Lime points represent original households, blue points newcomers. Both use the selected scenario from `simulation:update`; View baseline switches both points and geometry to the no-policy comparison at the same year. Affordable units, subsidy, density and financing change cohort counts through the household engine. Height, coverage, merging and FAR change geometry and point placement only; they do not create household capacity in this version.

One point has weight one household; the final point per income band fades by its fractional weight. The composition bar shows occupied original/new households and vacant completed units. Stable cohort-band indices and deterministic coordinates avoid random reshuffling during timeline playback. These are illustrative assignments, not observed addresses or persistent individual agents; newcomer turnover is aggregated. Spatial policy changes can reposition points within changed buildings. Building-view points are an x-ray overlay, not physical occlusion.

AMI cloud uses annual income / inflation-adjusted reference AMI × 100. Reference AMI is the supplied $120,100; both income and reference grow at 3.3%, so vertical band heights stay fixed while composition changes. Subsidy changes affordability, not reported household income or AMI. Six representative income values form six visible layers; no within-band income distribution is invented. Local representative incomes and regional reference AMI are different concepts. Fractional-month cohort arrays are interpolated consistently with totals. Click a point to inspect its cohort, representative income and AMI. Original/new filter buttons and baseline comparison are keyboard accessible; canvas rotation and zoom retain keyboard controls.

## Estimated apartment price and financing

A new result immediately below rent compares an illustrative per-unit income-supported value at the same year. It is not a sale-price observation, owner-occupier affordability measure, or a forecast of market clearing.

`NOI = effective monthly rent × 12 × occupancy fraction × (1 − 0.30)`

`annual mortgage constant = 12r / [1 − (1+r)^(-360)]`, where `r = annual interest / 100 / 12`; at zero interest it is `12/360`.

`apartment price = NOI / [0.80 × annual mortgage constant + 0.20 × 0.06]`

Assumptions: 30-year amortizing loan, 80% loan-to-value, 30% operating expense ratio, 6% required annual equity cash yield. Rent is the existing effective portfolio rent, and occupancy averages vacancy across all completed units. This is a rental-property underwriting proxy applied per apartment; units are homogeneous. It excludes taxes on transactions, resale, capital expenditure and appreciation expectations. Coefficients are illustrative.

The activated interest tile supplies the annual loan rate to both this valuation and the existing construction-finance rule. Inactive rate is 5%. Activating it at 5% correctly causes no difference. At fixed rent and occupancy, a higher rate lowers this supported price and a lower rate raises it. Rate changes reprice the scenario immediately, including at year zero; policies are assumed active from inception. More effective rent or occupancy raises value, while affordable-rent rules can reduce it. The displayed percent difference includes all active policy effects, not just interest. There is no feedback from this price into rent, migration, tenant income, or developer investment behavior.

## Immersive viewport

The canvas fills the viewport behind floating policy and results panels. Policies and Results buttons independently dismiss each overlay; Focus view hides both and restores the preceding panel state. Escape reveals both. Hidden overlays are inert and removed from the accessibility tree. Scene controls, tenant composition and compact statistics are independent overlays rather than items consuming canvas height. Spatial statistics expand from the bottom left; assumptions expand from the bottom right. Rotation, zoom, selection, timeline events, and policy calculations are retained. Mobile panels become full-width sheets; use the top panel buttons or Focus view to expose the scene.

## Building color modes

White → navy represents a higher value; fixed legends preserve comparisons. Affordable housing density = realized gross FAR × active affordable share, visualized on a 0–4 FAR scale (saturated above 4). The model has no actual affordable-unit allocation: the aggregate policy share is applied uniformly to every building. No active affordability policy means zero modeled affordable floor area; this does not claim there is no existing affordable housing in real neighborhoods.

Development opportunity = max(0, (capacity FAR − realized FAR) / capacity FAR), on a 0–100% scale. Capacity FAR = min(height limit × coverage fraction, maximum FAR) × (1 + density bonus). This indicates unused illustrative capacity, not profitability, construction probability or a time-based building forecast. Height, coverage, FAR, merging and density policy can affect these indicators. The density bonus adjusts the capacity indicator only; it does not automatically rebuild geometry. Color does not incorporate interest rates, apartment values or subsidy. Parcel inspection shows both numeric indicators. In AMI cloud view, footprints retain the selected color scale and tenant colors stay lime/blue. Baseline mode excludes active policies. Face shading adds depth; roof color is the unshaded reference.

## Live building-color revision

The color legend now shares the bottom population dock. Colors are recomputed from every `simulation:update`, using the selected same-year baseline or scenario. Affordable density is now occupied affordable FAR: realized FAR × active affordable share × occupancy fraction. It changes with housing occupancy over time. Allocation remains uniform and illustrative. White means no modeled affordable floor area; activating an affordable policy is necessary to color that mode.

Opportunity is an index, not a percentage of capacity: clamp(unused capacity fraction × scenario apartment value / same-year no-policy apartment value, 0, 1). This exposes the existing financing valuation response to interest without inventing a second interest coefficient. Without apartment valuation outputs the ratio defaults to one. Housing subsidy can affect the index indirectly via occupancy and income-supported property value. The index is a visualization proxy, not a calibrated development decision. Baseline uses baseline geometry and a value ratio of one. White now uses RGB 255/255/255 with gentler low-end face shading; navy retains depth shading. Fixed scales avoid normalizing away real policy differences.

## Live spatial policy editing

Activated height, coverage, merging, FAR and density controls update the renderer via `simulation:update`. Policy edits automatically exit baseline comparison; spatial edits return from AMI footprints to building view so massing changes are visible. Existing parcels interpolate dimensions and roof colors for 320ms, restarting from their displayed state on interrupted edits. Lot-merging topology changes apply immediately. Reduced-motion preference disables interpolation. Points use the same interpolated buildings. A toolbar status confirms policy updates.

The valid constraint remains min(height cap, FAR / coverage). Raising a nonbinding height cap may leave massing unchanged because FAR still limits it. Inactive policy sliders remain excluded until their tile is activated. Density changes opportunity capacity and the separate housing-supply model, not physical massing directly. Color mode still controls which metric is displayed: affordable mode is zero/white without an affordable-unit policy. Opportunity mode responds to spatial capacity and relative valuation. These rules avoid inventing geometric responses where the chosen limit has no effect.
