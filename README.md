# Thailand Political Simulation (TPS)
## Module 2: High-Stakes Election Campaign

A deep, data-driven political strategy simulation module architectured with Vanilla JS, D3.js, and CSS. This module challenges you to navigate the ruthless complexity of the Thai electoral system.

### The Win Condition
Secure a majority of **251+ seats** out of 500 to form a government. Manage 400 constituency seats (First-Past-The-Post) and 100 Party-List seats (Largest Remainder Method).

---

### The 10 Active Campaign Actions & Synergies
Mastering these exact actions is the key to executing effective campaign strategies:

1. **Host Elite Fundraise Gala**
   - *Mechanic*: Huge +Funds, ideology shifts to Conservative, +15 EC Scrutiny.
   - *Synergy*: Use this early when EC Scrutiny is low to build a massive war chest for late-game `megaRegionalRally` spam.

2. **Lawfare Petition**
   - *Mechanic*: High cost. RNG chance to drastically reduce a rival's Popularity. Backfires (-5 Popularity) if failed.
   - *Synergy*: Vital weapon against massive populist fronts. Best used when a specific opponent crosses a dangerous majority threshold in polling.

3. **Mobilize Flash Mobs**
   - *Mechanic*: +Popularity (Youth/Urban), +Social Unrest.
   - *Synergy*: Cheap popularity boost for progressive parties, but monitor Social Unrest so the Military doesn't trigger a coup state in the main game later.

4. **Deploy Cyber IO**
   - *Mechanic*: Cheaply lowers specific rival's popularity. High RNG risk of a Scandal causing massive EC Scrutiny to your party.
   - *Synergy*: A high-risk, high-reward alternative to Lawfare.

5. **Buy Ban Yai Loyalty**
   - *Mechanic*: Massive cost. Targets a D3 Map District. Instantly applies +100% `banYaiBonus`.
   - *Synergy*: The ultimate ace for swing districts in tightly contested regions. It practically guarantees the First-Past-The-Post victory for that local MP.

6. **Overseas Consultation**
   - *Mechanic*: Skips the turn, +30 EC Scrutiny. Instantly restores ALL your MPs' loyalty to 100%. 
   - *Synergy*: Emergency ripcord when your coalition is fracturing and MPs are planning to defect to rival factions.

7. **Arrange Party-List (Passive Engine)**
   - *Mechanic*: 
     - "Tycoons" generate weekly passive +Funds but lose -Popularity over time.
     - "Activists" generate weekly passive +Popularity but burn -Funds.
   - *Synergy*: Flip to "Tycoons" in weeks 1-4 to stockpile money. Flip to "Activists" in weeks 5-8 to ride a popularity wave into Election Night.

8. **Pre-Election Secret Pact**
   - *Mechanic*: RNG event to secure an AI party's seats for the post-election coalition early. If leaked, you suffer massive (-20) nationalPopularity drop.
   - *Synergy*: Risky structural prep if you are trailing behind 251 seats. Securing major conservative holds early ensures your coalition phase survives.

9. **Mega Regional Rally**
   - *Mechanic*: Spend massive funds to significantly buff the `basePopularity` of *all* candidates in a manually selected D3 Region block.
   - *Synergy*: A powerhouse closer. Best used on Week 8 in a contested block like Isan just before hitting **Initiate Election Night**.

10. **Deploy Election Watchdogs**
    - *Mechanic*: Targets a specific district. Cancels out an AI’s `banYaiBonus` auto-generation.
    - *Synergy*: Use defensively against heavyweight tycoons dominating specific safe-seats. Nullifies their local stronghold, turning it into a fair popularity contest.

---

### Acquiring the `thailand.topojson`
Due to GitHub file size limitations and licensing bounds, the exact district-level TopoJSON mapping 400 modern electoral zones is best sourced externally:

1. Download a Thailand Administrative Map (Amphoe/District level) via sources like *Humanitarian Data Exchange (HDX)* or *OpenStreetMap*.
2. Use **Mapshaper** (`mapshaper.org`) to convert the GeoJSON or Shapefiles down to `< 5MB` TopoJSON format.
3. Ensure the mapped properties contain an ID that aligns sequentially (e.g., `D1`, `D2`, up to `D400`).
4. Place the generated file strictly at: `/campaign/thailand.topojson`. 
*(Note: If the file is missing, the game falls back natively to the dynamic structural War Room UI placeholder matrix built into `map.js`, preventing any fatal rendering errors).*

---

### Single-Repo Folder Architecture & Deployment
This application operates completely on a local, fully client-side static browser model. No backend Node.js code is required.

```text
TPSREAL/
├── index.html        (Splash Screen / Main Menu)
├── campaign/         (← Campaign Module)
│   ├── index.html    (War Room UI)
│   ├── style.css     
│   ├── data.js       (Political Architecture / State)
│   ├── engine.js     (Simulation Execution)
│   ├── map.js        (D3.js Visualization)
│   └── thailand.topojson
└── main-game/        (Governing & Coalition Phase / POST WIN)
    └── index.html 
```

**To Deploy to GitHub Pages:**
1. Push the entire `TPSREAL` folder setup to your GitHub Repository.
2. In your GitHub Repo, navigate to **Settings > Pages**.
3. Under "Build and deployment", point the Source branch to `main`, root `/` folder.
4. Hit Save. Your election simulator is now live worldwide. All `.js` files operate smoothly via ES6 Modules (`type="module"`) over the browser.
