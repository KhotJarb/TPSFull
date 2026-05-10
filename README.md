# 🏛️ Thailand Political Simulation (TPS) — Version 1.0.2 "Burden of Power"

> **An advanced political RPG where you navigate the full lifecycle of Thai politics — from campaign trails to parliament floors, governing crises, and leading the opposition.**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](#license)
[![Version](https://img.shields.io/badge/Version-1.0.2-crimson.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-Browser_(Zero_Install)-green.svg)](#getting-started)
[![Language](https://img.shields.io/badge/Language-🇬🇧_EN_|_🇹🇭_TH-orange.svg)](#localization)
[![Modules](https://img.shields.io/badge/Modules-5_Playable-blue.svg)](#the-player-journey)

---

## 📖 Overview

**Thailand Political Simulation (TPS)** is a standalone, browser-based political strategy game built entirely in vanilla JavaScript — no frameworks, no build tools, no installation required. Open `index.html` and play.

You begin as a rising political figure navigating the treacherous landscape of Thai politics. Lead your party through an 8-week national campaign, win seats in the House of Representatives, survive live parliamentary debates, form a governing coalition — or, if you fail, lead the opposition and fight your way back to power in an infinite political cycle.

---

## 🎮 Play Now

👉 **[Play Thailand Political Simulation](https://khotjarb.github.io/TPSFull2/)**

No downloads. No installs. Just click and play.

---

## 🎮 The Player Journey

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  📢 CAMPAIGN    │     │  🏛️ PARLIAMENT   │     │  👔 GOVERNING   │
│  MODULE         │────▶│     MODULE       │────▶│     MODULE      │
│                 │     │                  │     │                 │
│ • Choose Party  │     │ • Live Debates   │     │ • Crisis Events │
│ • 8-Week Race   │     │ • Point of Order │     │ • Propose Laws  │
│ • Rallies & IO  │     │ • Vote on Bills  │     │ • Coalition Mgmt│
│ • Election Day  │     │ • Interpellations│     │ • 48-Month Term │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │ DEFEAT                                         │
         ▼                                                │
┌─────────────────┐                                       │
│  👁️ OPPOSITION  │◀──────────────────────────────────────┘
│  MODULE (NEW!)  │         (if coalition fails)
│                 │
│ • Shadow Cabinet│     ┌─────────────────┐
│ • PM Boss Fight │     │  🔄 NEXT CYCLE  │
│ • 48-Month Term │────▶│  Election +4yrs │──▶ Back to Campaign
│ • Grand Finale  │     │  Legacy Buffs   │    (2031, 2035, ...)
└─────────────────┘     └─────────────────┘
```

---

## 🆕 What's New in v1.0.2 — "Burden of Power"

### 👁️ NEW MODULE: The Opposition (48-Month Term)

The flagship feature of v1.0.2. When you fail to form a government after the election, you don't get a game over — you become **Leader of the Opposition**.

#### Shadow Cabinet System
- **Appoint Shadow Ministers** — Mirror the government's cabinet with your own shadow team. Each appointment costs AP, Funds, and Political Capital.
- **Passive Intel Generation** — Each shadow minister generates **+3 Intel/month** passively.
- **Active Damage Bonus** — Shadow ministers grant **+3 Scandal damage** when attacking their counterpart.
- **Dynamic PM Cost** — Appointing a Shadow PM costs **100 Capital** (ministers cost 50).

#### 9 Tactical Actions
| Action | Cost | Effect | Limit |
|--------|------|--------|-------|
| 📋 **File Motion** | 5 Cap + 1 AP | +1 Cred, +1 Scandal | 2/month |
| 🔬 **Deep Investigate** | ฿30M + 1 AP | +2 Scandal, +1-2 Intel, sets 4-month DMG buff | 2/month |
| 📰 **Press Leak** | ฿20M + 3 Intel + 1 AP | +2 Cred, +3 Scandal | CD 2 months |
| 🗣️ **Public Hearing** | ฿40M + 5 Cap + 1 AP | +10 Cap, +2 Cred, +2 Scandal | CD 4 months |
| 🤝 **Cross-Party Alliance** | 8 Cap + 1 AP | +3 Cred, +2 Scandal | CD 6 months |
| 💰 **Fundraise** | 1 AP | +฿50-150M | 1/month |
| 🐍 **Lobby Coalition** | 8 Cap + 1 AP | Sabotages PM Firewall | Unlimited |
| ⚖️ **Judicial Strike** | 50-60 Intel + 50-75 Cap + 1 AP | Breaks PM shield OR instant minister takedown | Unlimited |
| ⚖️ **No-Confidence Vote** | ฿100M + 20 Cap + 10 Intel + 3 AP | Exposes target (PM: +50 Cred) | Requires 30+ Scandal |

#### PM Boss Fight — 3-Phase Encounter
```
Phase 1: LOCKED (Firewall 0-6)
  └─ Cannot even select the PM. Break 7+ minister layers first.

Phase 2: SHIELDED (Firewall 7-9)
  └─ PM selectable but immune to normal actions.
  └─ Only Judicial Strike can shatter the remaining shield.

Phase 3: VULNERABLE (Firewall 10)
  └─ PM fully exposed. Build Scandal to 30+, then No-Confidence.
  └─ Victory: +50 Credibility, Grand Finale with PM Defeated bonus.
```

#### Grand Finale & Grading System
| Grade | Title | Credibility Required |
|-------|-------|---------------------|
| **S+** | สุดยอดฝ่ายค้าน — The Shadow Premier | 90+ |
| **A** | ฝ่ายค้านคุณภาพ — The Watchdog | 70-89 |
| **B** | ฝ่ายค้านมีผลงาน — The Challenger | 50-69 |
| **C** | ฝ่ายค้านพอใช้ — The Placeholder | 30-49 |
| **F** | ฝ่ายค้านไร้ผลงาน — The Ineffective Opposition | 0-29 |

#### Crisis & Event System
- **Government Retaliation** — The government fights back with random crisis events each month.
- **Budget Events** — Manage opposition party finances under pressure.
- **Shadow Bill** — Propose alternative legislation with a chance for a +20% resource buff for 8 months.

---

### 🔄 Infinite Campaign Loop

The game never ends. Defeat loops you into Opposition; completing Opposition sends you back to the next election.

| Feature | Detail |
|---------|--------|
| **Dynamic Year Tracking** | Election years advance by 4: 2027 → 2031 → 2035 → ... |
| **Legacy Buffs** | Opposition performance grants starting poll and fund bonuses for the next campaign |
| **Party Persistence** | Your chosen party carries over automatically (no re-selection needed) |
| **Fresh State Guarantee** | All previous save data is aggressively wiped on each transition |
| **Scrutiny Reset** | EC Scrutiny resets to 0% for each new campaign cycle |

#### Loop Flow
```
Campaign (2027) ──DEFEAT──▶ Opposition Intro ──▶ Opposition (48mo)
                                                        │
Campaign (2031) ◀──LEGACY BUFFS + FRESH STATE───────────┘
       │
       ▼
Campaign (2035) ... ∞
```

---

### 🏛️ Parliament Module Enhancements

#### Legislative Gridlock & Amendment System
- **Gridlock Events** — Random procedural disruptions during debates (quorum challenges, filibusters, walkouts).
- **Amendment Proposals** — Modify bills mid-debate with rider amendments that carry political risk.
- **Mid-Session Random Events** — Unexpected political developments that force real-time strategic decisions.

#### Bill Lifecycle Improvements
- **Second Reading Resolution Fix** — Bills now consistently resolve with proper statistical rewards and toast notifications.
- **Committee Phase Polish** — NGO vs Lobbyist choice paths fully functional with permanent reputation consequences.

---

### ⚖️ Opposition Balance Patch (Steps 161–178)

#### Scandal System Overhaul
| Change | Before | After |
|--------|--------|-------|
| Base Scandal Damage | 1x | **2x** |
| Deep Investigate Combo | None | **+10% DMG for 4 months** |
| Shadow Active Bonus | +1 per shadow | **+3 per shadow** |
| Shadow Passive Intel | +1/month per shadow | **+3/month per shadow** |
| PM Scandal Cap | 10 (hardcoded bug) | **50 (dynamic)** |
| Minister Scandal Cap | 10 (hardcoded bug) | **30 (dynamic)** |

#### Global Credibility Nerf (50% Reduction)
All credibility gains and losses across the entire Opposition module were halved to prevent runaway scaling:

| Source | Old | New |
|--------|-----|-----|
| `executeAction` effects | 100% | **50% (ceil)** |
| Sabotage Success | +5 | **+2** |
| Sabotage Failure | -12 | **-6** |
| Shadow Appointment | +5 | **+2** |
| Crisis/Budget events | 100% | **50% (dynamic halver)** |

#### Resource & Economy Rebalance
| Change | Before | After |
|--------|--------|-------|
| Monthly Capital | +5 | **+20** |
| Capital Gain Boost | 1x | **1.5x** (via `executeAction`) |
| Deep Investigate Intel | 2-5 | **1-2** |
| Deep Investigate Credibility | 1-3 | **0** (removed) |
| File Motion Credibility | 3-6 (RNG) | **1** (guaranteed) |

#### Action Cooldowns & Limits
| Action | Limit Type |
|--------|-----------|
| Deep Investigate | **2/month** |
| File Motion | **2/month** |
| Fundraise | **1/month** |
| Public Hearing | **4-month cooldown** |
| Cross-Party Alliance | **6-month cooldown** |
| Press Leak | **2-month cooldown** |

#### Judicial Strike Rebalance
| Cost | Old (Minister/PM) | New (Minister/PM) |
|------|-------------------|-------------------|
| Intel | 15 / 25 | **50 / 60** |
| Capital | 10 / 15 | **50 / 75** |

---

### 🎨 UI/UX Improvements

#### Opposition Dashboard
- **Target Card System** — Visual minister cards with scandal meters, shadow status indicators, and exposure state.
- **Surgical Button UI** — All action buttons use emoji resource indicators (⚡ Capital, 🔎 Intel, ฿ Funds).
- **Visual Cooldown States** — Buttons on cooldown or at usage limits show `opacity: 0.2`, `grayscale(100%)`, `pointer-events: none`.
- **Activity Log** — Scrollable, color-coded log of all player actions (last 30 entries, persisted to localStorage).
- **Toast Notification System** — Non-blocking popup notifications for action results.

#### Main Menu
- **Opposition Start Button** — New red-themed button with oversight eye icon on the main landing page.
- **Module Hub Redesign** — Clear visual separation between Campaign, Opposition, and Governing modules.

#### Grand Finale Screen
- **Cinematic End Screen** — Full-screen overlay with animated grade reveal, stat summary, and legacy buff preview.
- **Dynamic Navigation** — Context-aware buttons: "Continue to Campaign" (loop mode) or "New Game" / "Main Menu" (standalone mode).

---

### 🌐 Dynamic Localization Engine (Step 212-213)

#### Translation Middleware
- **`t(text)` Function** — Runtime translation middleware that intercepts all dynamic English strings and replaces them with Thai when `tps_language = 'TH'`.
- **50+ Dictionary Entries** — Covers boss fight alerts, shadow bill messages, grand finale UI, loop buttons, action feedback, and more.
- **Output Interception** — `showToast()`, `logAction()`, and `triggerGrandFinale()` all route through `t()` automatically.

#### Coverage
| Category | Entries |
|----------|---------|
| Action & Resource Gating | 9 |
| PM Boss Fight | 8 |
| Shadow Bill | 4 |
| Actions & Combat | 5 |
| Month Advance | 4 |
| No-Confidence | 2 |
| Grand Finale | 12 |
| Loop UI & Legacy | 6 |

---

## 🐛 Bug Fixes in v1.0.2

| Bug | Resolution |
|-----|------------|
| PM Scandal capped at 10 (ghost code `Math.min(10, ...)`) | Replaced with dynamic cap: PM=50, Ministers=30 |
| `resolveEvent` scandal using hardcoded `Math.min(10)` | Fixed to use `maxScandal` based on target type |
| Opposition affiliation showing "Independent" | Fixed `tps_player_party` to save as JSON object instead of plain string |
| Old Opposition save loading Month 48 on loop return | Added aggressive `tps_opp_*`, `tps_shadow_*`, `tps_legacy_*` wipe on defeat redirect |
| Old Campaign save loading Day 56 on loop return | Added `startNewCampaignLoop()` wipe function + fresh `initCampaignState()` |
| EC Scrutiny persisting at 100% across campaign cycles | Added `tps_scrutiny` (and related stat keys) wipe before `initCampaignState()` |
| "FREE" text appearing on action buttons | Surgical regex replacement via `updateActionButtonsUI()` |
| No-Confidence double-deducting AP | Standalone `actionNoConfidence()` bypasses `executeOppAction` pipeline |
| Deep Investigate calling wrong cost path | Standalone `actionDeepInvestigate()` with `executeAction()` delegation |
| Bill resolution not triggering in Second Reading | Unified `btn-begin-session` / `btn-enter-parliament` entry-point logic |
| Mixed Thai/English debate dialogues | Restructured templates into `{ en: [...], th: [...] }` with `_getDebateLang()` |
| UI resetting to Party Select on language change | `localStorage`-based UI state persistence (`campaign_ui_state`) |
| Campaign timeline resetting after Parliament return | `saveCampaignState()` / `loadCampaignState()` with dual-layer persistence |

---

## 📁 Project Structure

```
TPSFull2/
├── index.html                  # Landing page / module hub
├── style.css                   # Global landing page styles
├── README.md                   # This file
│
├── campaign/                   # 📢 Election Campaign Module
│   ├── index.html              #   Party Select → Dashboard → Election
│   ├── style.css               #   Dark theme with gold accents
│   ├── data.js                 #   Parties, constituencies, state schema
│   ├── engine.js               #   Election math, actions, save/load
│   ├── events.js               #   Campaign random events
│   ├── timeline.js             #   Daily calendar, parliament bridging
│   └── main.js                 #   UI bindings, boot sequence, loop logic
│
├── parliament-test/            # 🏛️ Parliament RPG Module
│   ├── index.html              #   Three-pane dashboard layout
│   ├── style.css               #   Bloomberg Terminal aesthetics
│   ├── data.js                 #   MPs, topics, state management
│   ├── timeline.js             #   Weekly schedule engine
│   ├── debate.js               #   Live debate engine, AI speeches
│   ├── engine.js               #   Bill lifecycle, Influence, Party Whip
│   ├── legislation.js          #   Legislative gridlock, amendments
│   └── main.js                 #   UI orchestration, callbacks
│
├── main-game/                  # 👔 Governing Simulation Module
│   ├── index.html              #   Start → Dashboard → Game Over
│   ├── style.css               #   Governing dashboard theme
│   ├── data.js                 #   Parties, laws, crisis events
│   ├── engine.js               #   Game loop, monthly processing
│   ├── main.js                 #   UI, save/load, modals
│   ├── cabinet.js              #   Cabinet management system
│   ├── diplomacy.js            #   Foreign relations engine
│   ├── legislation.js          #   Law proposal & repeal system
│   └── README.md               #   Governing module documentation
│
├── opposition/                 # 👁️ Opposition Module (NEW in v1.0.2)
│   ├── intro.html              #   Party select / loop bypass screen
│   ├── index.html              #   Opposition dashboard
│   ├── style.css               #   Red-accented dark theme
│   └── engine.js               #   Full opposition engine (150KB+)
│                               #     • State management & persistence
│                               #     • 9 tactical actions + standalone fns
│                               #     • PM Boss Fight (3-phase)
│                               #     • Shadow Cabinet system
│                               #     • Crisis & event system
│                               #     • Grand Finale & grading
│                               #     • Dynamic localization (t() engine)
│                               #     • Campaign loop wipe protocol
│
└── shared/                     # 🔧 Cross-Module Utilities
    ├── localization.js          #   i18n engine, static translation dict
    ├── settings.js              #   Settings modal, global state, wipe
    └── news.js                  #   News ticker / shared events
```

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome 90+, Firefox 85+, Edge 90+, Safari 14+)
- That's it. No Node.js, no npm, no build tools.

### Running Locally

**Option A — Direct File Open:**
```
Double-click index.html
```

**Option B — Local HTTP Server (recommended):**
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx http-server . -p 8080

# Then open http://localhost:8080/
```

**Option C — GitHub Pages:**
Push the entire `TPSFull2/` directory to a GitHub repo and enable Pages. Zero configuration needed.

---

## 🎯 How to Play

### Campaign Module (`/campaign/`)
1. **Choose Your Party** — Select from 5 Thai political parties, each with unique strengths and regional bases.
2. **Set Difficulty** — Easy, Normal, or Hard. This choice is permanent.
3. **Campaign for 8 Weeks** — Each day brings new choices:
   - **Rally** — Boost regional support (costs funds, increases scrutiny)
   - **Information Operations** — Social media campaigns (cheaper, riskier)
   - **Ban Yai Network** — Activate local power brokers (high cost, high reward)
   - **Fundraise** — Replenish campaign war chest
4. **Parliament Days** (Wed/Thu/Fri) — Enter the Parliament module for debates or skip.
5. **Election Day** — After 56 days, constituency + party-list election determines seats.
6. **Form a Coalition** — Negotiate to reach the 251-seat majority threshold.
7. **If You Fail** — Redirected to the Opposition module (v1.0.2 infinite loop begins).

### Parliament Module (`/parliament-test/`)
1. **Begin Session** — A random bill is selected for debate.
2. **Watch the Debate** — AI MPs deliver speeches with unique personalities.
3. **Raise Protests** — Point of Order (slander, off-topic, misleading).
4. **Deliver Your Speech** — Choose your stance (Aggressive, Technical, Diplomatic).
5. **Cast Your Vote** — Aye, Nay, or Abstain on the final bill.

### Governing Module (`/main-game/`)
1. **Survive 48 Months** — Each month brings a crisis requiring a difficult choice.
2. **Manage 6 Stats** — Approval, Budget, Growth, Unrest, Military Patience, Coalition Stability.
3. **Propose Laws** — Navigate parliamentary voting to pass or repeal legislation.
4. **Cabinet Management** — Appoint and shuffle ministers.
5. **Diplomacy** — Manage foreign relations and international pressure.
6. **Avoid Game Over** — Unrest 100%, bankruptcy, coup, or coalition collapse end your term.

### Opposition Module (`/opposition/`) — NEW!
1. **Build Credibility** — Start at 50/100. Your performance determines legacy buffs.
2. **Appoint Shadow Ministers** — Build your shadow cabinet for passive Intel and active damage.
3. **Target Government Ministers** — Investigate, file motions, leak to press.
4. **Break the PM's Firewall** — Expose 7+ ministers, then use Judicial Strike to shatter the shield.
5. **Defeat the PM** — Build scandal to 30+, then call a No-Confidence Vote.
6. **Grand Finale** — After 48 months (or PM defeat), receive your grade and legacy buffs.

---

## 🌍 Localization

> [!WARNING]
> **Thai language support (TH) is not yet 100% functional.** Some UI elements, dynamic text, and newer modules may still display in English when Thai is selected. This feature is actively being developed and will be fully completed in a future update. English (EN) is fully supported and recommended for the best experience.

TPS supports bilingual operation across all modules:

| Feature | English (EN) | Thai (TH) |
|---------|-------------|-----------|
| All static UI labels | ✅ | ✅ |
| Settings modal | ✅ | ✅ |
| Debate dialogues | ✅ | ✅ |
| Crisis events | ✅ | ✅ |
| Opposition toasts & logs | ✅ | ✅ |
| Grand Finale UI | ✅ | ✅ |
| Loop navigation buttons | ✅ | ✅ |

Switch languages via:
- ⚙️ **Settings Gear** (bottom-right, all pages)
- 🔤 **EN / TH Toggle** (Parliament header bar)

---

## 🔧 Technical Notes

- **Zero Dependencies** — Pure vanilla HTML/CSS/JavaScript. No React, no Vue, no Tailwind.
- **No Build Step** — Open and play. No `npm install`, no webpack, no compilation.
- **State Management** — `localStorage` for persistent cross-module state, `sessionStorage` for tab-scoped snapshots.
- **Cross-Module Bridge** — `tps_campaign_loop`, `tps_current_election_year`, `tps_player_party`, and `tps_apply_legacy` flags in `localStorage`.
- **D3.js** — Used only in the Campaign module for the interactive electoral map.
- **Modular Architecture** — Each module is self-contained with its own `data.js` → `engine.js` → `main.js` pipeline.
- **Shared Layer** — `/shared/localization.js`, `/shared/settings.js`, and `/shared/news.js` loaded by all modules.
- **Dynamic Localization** — Opposition module uses a runtime `t(text)` middleware for translating JS-generated strings.
- **Key Namespacing** — All cross-module variables use the `tps_` prefix for clean wipe protocols.

### localStorage Key Architecture
| Prefix | Module | Purpose |
|--------|--------|---------|
| `tps_opp_*` | Opposition | Month, credibility, AP, targets, cooldowns |
| `tps_shadow_*` | Opposition | Shadow cabinet state |
| `tps_legacy_*` | Loop | Legacy poll/fund buffs between cycles |
| `tps_campaign_loop` | Loop | Infinite loop active flag |
| `tps_current_election_year` | Loop | Dynamic year tracking (2027, 2031, ...) |
| `tps_player_party` | Shared | JSON party object for cross-module persistence |
| `tps_apply_legacy` | Loop | Flag to trigger legacy buff consumption |
| `tps_language` | Shared | Current language ('EN' or 'TH') |
| `tps_scrutiny` | Campaign | EC scrutiny level |
| `campaign_*` | Campaign | Campaign state, party, UI state |

---

## 📜 Changelog

### v1.0.2 "Burden of Power" (May 2026)
- **Added**: Complete Opposition Module — 48-month term as Leader of the Opposition
- **Added**: Shadow Cabinet system with passive Intel (+3/mo) and active DMG (+3) bonuses
- **Added**: 9 tactical actions with cooldowns, usage limits, and standalone function architecture
- **Added**: PM Boss Fight — 3-phase encounter (Locked → Shielded → Vulnerable)
- **Added**: Grand Finale cinematic end screen with S+ through F grading
- **Added**: Infinite Campaign Loop — defeat → opposition → next election cycle
- **Added**: Legacy Buff system — opposition performance buffs next campaign
- **Added**: Dynamic election year tracking (2027 → 2031 → 2035 → ...)
- **Added**: Dynamic localization engine (`t()` middleware) with 50+ Thai translations
- **Added**: Opposition crisis/event system with government retaliation mechanics
- **Added**: Shadow Bill mechanic with +20% resource buff for 8 months
- **Added**: Visual cooldown/disabled states for action buttons
- **Added**: Surgical UI update system (regex-based, preserves custom HTML icons)
- **Added**: Legislative Gridlock & Amendment system for Parliament debates
- **Added**: Mid-Session Random Events during parliamentary proceedings
- **Balanced**: Global 50% credibility nerf across all Opposition sources
- **Balanced**: 2x base scandal damage with dynamic caps (PM: 50, Ministers: 30)
- **Balanced**: Deep Investigate combo buff (+10% DMG for 4 months)
- **Balanced**: Shadow Cabinet massive buff (Intel: 1→3, DMG: 1→3)
- **Balanced**: Monthly Capital income buffed (5→20)
- **Balanced**: Judicial Strike costs increased (Intel: 15/25→50/60, Capital: 10/15→50/75)
- **Balanced**: Credibility-to-poll and PM-defeat rewards nerfed to prevent runaway scaling
- **Fixed**: PM Scandal hardcoded cap of 10 (ghost code `Math.min(10)`)
- **Fixed**: Opposition affiliation defaulting to "Independent" (JSON parse issue)
- **Fixed**: Old saves persisting across loop transitions (aggressive wipe protocol)
- **Fixed**: EC Scrutiny not resetting on new campaign cycles
- **Fixed**: "FREE" text on action buttons
- **Fixed**: No-Confidence double AP deduction
- **Fixed**: Second Reading bill resolution not triggering
- **Fixed**: Mixed-language debate dialogues

### v1.0.1 Test (April 2026)
- Added: Universal TH/EN localization system
- Added: Settings modal with language, debate speed, difficulty display
- Added: Parliament RPG module with live debate, protests, voting
- Added: Legislative depth (bill proposals, committee phase)
- Added: Persistent campaign state across module transitions
- Added: Permanent difficulty system (Easy/Normal/Hard)
- Fixed: UI state reset on language change
- Fixed: Campaign timeline amnesia after parliament return
- Fixed: Mixed-language debate dialogues
- Fixed: Wipe Save Data routing

### v1.0.0 (March 2026)
- Initial release: Campaign module, Governing module
- Basic party system with 5 Thai political parties
- 400-constituency + 100-party-list election engine
- 48-month governing simulation with crisis events

---

## 📄 License

This project is released under the **MIT License**.

Built with 🇹🇭 by the TPS Development Team.

---

<p align="center">
  <strong>🏛️ Thailand Political Simulation — สถาบันจำลองการเมืองไทย</strong><br>
  <em>"ในการเมือง ไม่มีมิตรแท้ ไม่มีศัตรู์ถาวร มีแต่ผลประโยชน์ร่วม"</em><br>
  <sub>"In politics, there are no permanent friends, no permanent enemies — only permanent interests."</sub>
</p>
