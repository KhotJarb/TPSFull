# 🏛️ Thailand Political Simulation (TPS) — Version 1.0.2.5 "Multiplayer Test Update"

> **An advanced political RPG where you navigate the full lifecycle of Thai politics — from campaign trails to parliament floors, governing crises, and leading the opposition. Now with real-time P2P Multiplayer.**

[![Version](https://img.shields.io/badge/Version-1.0.2.5_Test-crimson.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-Browser_(Zero_Install)-green.svg)](#getting-started)
[![Language](https://img.shields.io/badge/Language-🇬🇧_EN_|_🇹🇭_TH-orange.svg)](#localization)
[![Modules](https://img.shields.io/badge/Modules-5_Playable-blue.svg)](#the-player-journey)
[![Multiplayer](https://img.shields.io/badge/Multiplayer-P2P_PeerJS-purple.svg)](#-new-in-v1025--multiplayer-test)

---

## 📖 Overview

**Thailand Political Simulation (TPS)** is a standalone, browser-based political strategy game built entirely in vanilla JavaScript — no frameworks, no build tools, no installation required. Open `index.html` and play.

You begin as a rising political figure navigating the treacherous landscape of Thai politics. Lead your party through an 8-week national campaign, win seats in the House of Representatives, survive live parliamentary debates, form a governing coalition — or, if you fail, lead the opposition and fight your way back to power in an infinite political cycle.

**v1.0.2.5** introduces **real-time peer-to-peer multiplayer**, allowing 2-8 players to compete head-to-head in the Campaign module with synchronized turns, interactive coalition negotiations, and live chat.

---

## 🎮 Play Now

👉 **[Play Thailand Political Simulation](https://khotjarb.github.io/TPSFull/)**

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

## 🆕 NEW in v1.0.2.5 — "Multiplayer Test"

### 🌐 Real-Time P2P Multiplayer Campaign

The headline feature of v1.0.2.5. Up to 8 players compete in the same Campaign module in real-time using **PeerJS WebRTC** for direct browser-to-browser communication — no server required.

#### Lobby & Party Selection
- **Create or Join Rooms** — Host generates a 6-character room code; joiners enter the code to connect.
- **Custom Party Creator** — Design your own party with custom name, color, ideology, and regional base.
- **Exclusive Party Lock** — Each party can only be selected by one player. Selections sync in real-time.
- **Ready Check** — All players must ready up before the host can start the campaign.
- **Difficulty & Balance Settings** — Host configures difficulty and balance mode for the session.

#### Synchronized Campaign
- **Turn Barrier System** — "Next Day", "Hold General Election", and "Proceed to Coalition" buttons all require **all players** to press before the action proceeds. A live counter shows `Waiting... (2/4)` progress.
- **Polls & Map Sync** — National poll shares and the D3.js electoral map update across all clients after each day advance.
- **Parliament Majority Vote** — When a Parliament day occurs, all players vote "Enter" or "Ignore". The majority decision applies to everyone. Minority voters receive a stat penalty.
- **Shared State Persistence** — All MP session data persists in `localStorage` across module transitions (Campaign ↔ Parliament).

#### Player-Only Elections (No AI Parties)
- In multiplayer, **only player-selected parties** compete in the election.
- All 500 seats are distributed exclusively among human players based on polls and performance.
- AI parties are completely excluded from election results, coalition offers, and seat calculations.
- Single-player mode is unaffected — all 5 parties compete as before.

#### Interactive Coalition Negotiation
The old AI willingness system is replaced with a fully interactive, turn-based P2P negotiation:

```
1st Place Party → Formation Leader (2 attempts max)
  ├─ Select parties to invite (checkbox UI)
  ├─ Send invitations → invited players see Accept/Reject
  ├─ If coalition ≥ 251 seats → COALITION FORMED ✅
  ├─ If < 251 seats → Attempt 2 (retry with new selections)
  └─ If both attempts fail → Turn passes to 2nd place
2nd Place Party → Same 2-attempt process
  └─ If all attempts fail → MINORITY GOVERNMENT ⚖️
```

| Player Role | Screen |
|------------|--------|
| **Formation Leader** | Checkbox selection of parties + "Send Invitations" button |
| **Invited Player** | Accept / Reject prompt with leader's party info |
| **Other Player** | Waiting screen with live status updates |

#### Post-Coalition Routing

| Outcome | Coalition Members | Non-Members |
|---------|------------------|-------------|
| **Coalition Formed** | → Victory → Government | → Opposition |
| **Minority Government** | Leader → Government | → Opposition |

#### 💬 Real-Time Chat System
- **Cross-Module Persistence** — Chat works across Campaign, Parliament, and all module transitions.
- **Self-Injecting Architecture** — The chat module auto-injects a floating action button (💬) and slide-out drawer on every page.
- **Separate PeerJS Channel** — Uses a dedicated `CHAT_` peer ID prefix, independent of the game coordinator.
- **System Messages** — Game events (EC Red Flag penalties, etc.) are broadcast as system messages visible to all players.
- **Unread Badge** — Shows unread count when the chat drawer is closed.
- **100-Message History** — Messages persist in `localStorage` and survive page navigation.

#### Room & Session Management
- **Leave Room** — Players can leave at any time; their data is wiped from the session.
- **Host Disconnect** — If the host leaves, all players are notified and redirected to the main menu with full data wipe.
- **Force Wipe** — Host leaving triggers a `force_wipe` broadcast to clean all clients.

---

### 🐛 Bug Fixes in v1.0.2.5

| Bug | Resolution |
|-----|------------|
| "Next Day" button stuck on "Waiting" with 1 player | Host self-evaluates barrier immediately |
| "Skip to Weekend" button appearing in multiplayer | Hidden when `_isMultiplayer` is true |
| Poll data not saving after Parliament return (MP) | `saveCampaignState()` called before module transition |
| Affiliation showing "Loading..." in MP | Party selection synced via `tps_mp_party_selections` |
| National Polls resetting after Parliament (MP) | Polls persisted to `localStorage` and restored on return |
| Parliament popup not using majority vote system | Replaced with majority vote: all players vote → majority decides |
| "Ignore" button inconsistent styling on repeat days | Unified button state reset on each Parliament day |
| EC Red Flag penalty not appearing in MP | Added `_checkAndShowGuillotine()` to MP day-advanced handler |
| Campaign "New Game" bypassing party select in loop mode | Detects `tps_campaign_loop` flag and skips party select |
| Election results including AI parties in MP | `_getElectionParties()` filters to player-only parties |

### ⚖️ Minor Balance Adjustments (pre-MP)

| Change | Detail |
|--------|--------|
| EC Red Flag poll penalty | Nerfed from -5% to **-2.5%** |
| Fundraise trust penalty | Shows warning toast when scrutiny reduces yield |
| Capital-driven influence regen | High capital (75+) grants +20 influence/week |
| Rest day scrutiny drift | Small random ±1 scrutiny on rest days (30% chance) |

---

## 🔁 Previous Features (v1.0.2 "Burden of Power")

### 👁️ Opposition Module (48-Month Term)
- **Shadow Cabinet** — Appoint shadow ministers for passive Intel (+3/mo) and active DMG (+3) bonuses
- **9 Tactical Actions** — File Motion, Deep Investigate, Press Leak, Public Hearing, Cross-Party Alliance, Fundraise, Lobby Coalition, Judicial Strike, No-Confidence Vote
- **PM Boss Fight** — 3-phase encounter (Locked → Shielded → Vulnerable)
- **Grand Finale** — S+ through F grading with legacy buff rewards
- **Crisis & Event System** — Government retaliation and budget pressure events

### 🔄 Infinite Campaign Loop
- Dynamic year tracking (2027 → 2031 → 2035 → ...)
- Legacy buffs carry over from Opposition to next Campaign
- Aggressive wipe protocol ensures fresh state each cycle

### 🏛️ Parliament Enhancements
- Legislative Gridlock & Amendment system
- Mid-Session Random Events
- Bill lifecycle improvements (Second Reading fix)

### ⚖️ Opposition Balance Patch
- 2x base scandal damage with dynamic caps
- Global 50% credibility nerf
- Monthly Capital buffed (5→20)
- Judicial Strike costs increased (Intel: 50/60, Capital: 50/75)

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
│   ├── main.js                 #   UI bindings, boot sequence, loop logic
│   └── mp-campaign-coordinator.js  # 🌐 MP: P2P turn barriers, coalition, sync
│
├── parliament-test/            # 🏛️ Parliament RPG Module
│   ├── index.html / style.css / data.js / timeline.js
│   ├── debate.js               #   Live debate engine, AI speeches
│   ├── engine.js               #   Bill lifecycle, Influence, Party Whip
│   ├── legislation.js          #   Legislative gridlock, amendments
│   └── main.js                 #   UI orchestration, callbacks
│
├── main-game/                  # 👔 Governing Simulation Module
│   ├── index.html / style.css / data.js
│   ├── engine.js / main.js / cabinet.js / diplomacy.js / legislation.js
│   └── README.md               #   Governing module documentation
│
├── opposition/                 # 👁️ Opposition Module
│   ├── intro.html / index.html / style.css
│   └── engine.js               #   Full opposition engine (150KB+)
│
└── shared/                     # 🔧 Cross-Module Utilities
    ├── localization.js          #   i18n engine, static translation dict
    ├── settings.js              #   Settings modal, global state, wipe
    ├── news.js                  #   News ticker / shared events
    ├── multiplayer.js           #   🌐 MP lobby: room create/join, PeerJS
    ├── multiplayer.css          #   🌐 MP lobby styles
    ├── mp-chat.js               #   🌐 Real-time P2P chat (self-injecting)
    ├── party-creator.js         #   🌐 Custom party designer
    └── party-creator.css        #   Custom party designer styles
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

**Option B — Local HTTP Server (recommended for multiplayer):**
```bash
python -m http.server 8080
# or
npx http-server . -p 8080
# Then open http://localhost:8080/
```

**Option C — GitHub Pages:**
Push the entire `TPSFull2/` directory to a GitHub repo and enable Pages.

### Starting a Multiplayer Game
1. Click **"Multiplayer"** on the main landing page
2. **Host:** Click "Create Room" → share the 6-character room code
3. **Joiners:** Enter the room code → click "Join Room"
4. Each player selects a unique party (or creates a custom one)
5. All players click "Ready" → Host clicks "Start Game"

---

## 🎯 How to Play

### Campaign Module (`/campaign/`)
1. **Choose Your Party** — Select from 5 Thai political parties (or create a custom one in MP)
2. **Set Difficulty** — Easy, Normal, or Hard (permanent per session)
3. **Campaign for 8 Weeks** — Rally, IO operations, Ban Yai networks, fundraising
4. **Parliament Days** — Enter Parliament for debates or skip (majority vote in MP)
5. **Election Day** — Constituency + party-list seats determined by polls and performance
6. **Form a Coalition** — Negotiate to reach the 251-seat majority (interactive in MP)

### Parliament Module (`/parliament-test/`)
1. Begin Session → Watch AI debate → Raise protests → Deliver speech → Cast vote

### Governing Module (`/main-game/`)
1. Survive 48 months of crises → Manage 6 stats → Propose laws → Manage cabinet

### Opposition Module (`/opposition/`)
1. Build credibility → Shadow cabinet → Target ministers → Break PM's firewall → Grand Finale

---

## 🌍 Localization

> [!WARNING]
> **Thai language support (TH) is not yet 100% functional.** Some UI elements may still display in English when Thai is selected. English (EN) is fully supported and recommended.

Switch languages via ⚙️ Settings Gear (bottom-right) or 🔤 EN/TH Toggle (Parliament header).

---

## 🔧 Technical Notes

- **Zero Dependencies** — Pure vanilla HTML/CSS/JavaScript
- **No Build Step** — Open and play
- **P2P Multiplayer** — PeerJS WebRTC for direct browser-to-browser communication
- **State Management** — `localStorage` for persistent cross-module state
- **D3.js** — Interactive electoral map (Campaign module only)
- **Modular Architecture** — Each module: `data.js` → `engine.js` → `main.js`
- **Shared Layer** — `/shared/` utilities loaded by all modules
- **Chat Architecture** — Separate PeerJS peer (`CHAT_` prefix) for chat isolation

### Multiplayer Message Types
| Category | Messages |
|----------|----------|
| **Sync** | `mp_sync`, `mp_reconnect` |
| **Party** | `party_selected`, `party_deselected`, `custom_party_created` |
| **Barriers** | `day_ready`, `election_ready`, `coalition_ready` + `_update` / `_go` |
| **Parliament** | `parliament_vote`, `parliament_vote_update`, `parliament_vote_result` |
| **Coalition** | `coalition_invite`, `coalition_response`, `coalition_result`, `coalition_turn_pass`, `coalition_minority` |
| **Lifecycle** | `player_leave`, `host_left`, `force_wipe` |

### localStorage Key Architecture
| Prefix | Module | Purpose |
|--------|--------|---------|
| `tps_mp_session` | MP | Room code, player ID, host flag, player list |
| `tps_mp_party_selections` | MP | `{ playerId: partyId }` mapping |
| `tps_mp_election_results` | MP | Seat map for coalition calculation |
| `tps_mp_chat_*` | MP Chat | Message history per room |
| `tps_game_mode` | MP | `'multiplayer'` flag |
| `tps_opp_*` / `tps_shadow_*` | Opposition | Month, credibility, targets, cooldowns |
| `tps_legacy_*` | Loop | Legacy poll/fund buffs between cycles |
| `tps_campaign_loop` | Loop | Infinite loop active flag |
| `tps_current_election_year` | Loop | Dynamic year tracking |
| `campaign_*` | Campaign | Campaign state, party, UI state |

---

## 📜 Changelog

### v1.0.2.5 "Multiplayer Test" (May 2026)
- **Added**: Real-time P2P multiplayer campaign (2-8 players via PeerJS WebRTC)
- **Added**: Multiplayer lobby with room creation, joining, and party selection sync
- **Added**: Custom Party Creator — design parties with custom name, color, ideology
- **Added**: Turn barrier system for Next Day, Election, and Coalition buttons
- **Added**: Player-only election engine (no AI parties in MP)
- **Added**: Interactive P2P coalition negotiation (formation leader → invite → accept/reject)
- **Added**: Minority government fallback when all coalition attempts fail
- **Added**: Parliament majority vote system (all vote → majority decides)
- **Added**: Real-time cross-module P2P chat with system messages
- **Added**: EC Red Flag system chat notification in multiplayer
- **Added**: Room management (leave room, host disconnect, force wipe)
- **Fixed**: EC Red Flag penalty not triggering in multiplayer mode
- **Fixed**: "Next Day" stuck on "Waiting" with single player
- **Fixed**: "Skip to Weekend" button appearing in multiplayer
- **Fixed**: Polls/map not saving after Parliament return in MP
- **Fixed**: Affiliation showing "Loading..." in multiplayer
- **Fixed**: Election including AI parties in multiplayer results
- **Fixed**: Campaign "New Game" bypassing party select in loop mode

### v1.0.2 "Burden of Power" (May 2026)
- **Added**: Complete Opposition Module (48-month term, shadow cabinet, PM boss fight)
- **Added**: Infinite Campaign Loop with legacy buffs
- **Added**: Dynamic localization engine (`t()` middleware)
- **Added**: Legislative Gridlock & Amendment system
- **Balanced**: Global 50% credibility nerf, 2x scandal damage, resource rebalance
- **Fixed**: PM Scandal cap, Opposition affiliation, save persistence, scrutiny reset

### v1.0.1 Test (April 2026)
- Added: Universal TH/EN localization, Settings modal, Parliament RPG module
- Fixed: UI state reset, campaign timeline amnesia, mixed-language debates

### v1.0.0 (March 2026)
- Initial release: Campaign module, Governing module, 5-party election engine

---

## 📄 License

This is a personal educational project. The political events are fictionalized and simplified for gameplay purposes. No endorsement of any real political party, institution, or ideology is intended.

Built with 🇹🇭 by the TPS Development Team.

---

<p align="center">
  <strong>🏛️ Thailand Political Simulation — สถาบันจำลองการเมืองไทย</strong><br>
  <em>"ในการเมือง ไม่มีมิตรแท้ ไม่มีศัตรู์ถาวร มีแต่ผลประโยชน์ร่วม"</em><br>
  <sub>"In politics, there are no permanent friends, no permanent enemies — only permanent interests."</sub>
</p>
