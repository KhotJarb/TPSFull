// ═══════════════════════════════════════════════════════════════════════════
// TPS — /main-game/cabinet.js  (v1.0.2 — Part 3: The Burden of Power)
// Cabinet Formation & Ministry Quota System
// ═══════════════════════════════════════════════════════════════════════════
// Loaded after data.js and before engine.js.
// Provides the Cabinet Room mechanic where the player allocates ministries
// to coalition partners. AI parties have demands based on their seat count.
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: MINISTRY DEFINITIONS
// Ministries are divided into 3 tiers by political value.
// Tier A = most demanded, Tier C = least valuable.
// ──────────────────────────────────────────────────────────────────────────

const MINISTRIES = [
  // ── TIER A: The Crown Jewels — every big party wants these ──
  {
    id: "interior",
    name: "Ministry of Interior",
    nameThai: "กระทรวงมหาดไทย",
    tier: "A",
    icon: "🏢",
    description: "Controls provincial governors, local budgets, and land management. The most powerful ministry.",
    value: 30,
    preferredBy: ["peoples_populist", "thai_unity"]
  },
  {
    id: "transport",
    name: "Ministry of Transport",
    nameThai: "กระทรวงคมนาคม",
    tier: "A",
    icon: "🚄",
    description: "Oversees mega-projects: rail, roads, airports. Billions in procurement contracts.",
    value: 28,
    preferredBy: ["thai_unity", "peoples_populist"]
  },
  {
    id: "commerce",
    name: "Ministry of Commerce",
    nameThai: "กระทรวงพาณิชย์",
    tier: "A",
    icon: "💼",
    description: "Controls trade policy, rice exports, and business licensing. A goldmine for patronage networks.",
    value: 26,
    preferredBy: ["peoples_populist", "thai_unity"]
  },
  {
    id: "finance",
    name: "Ministry of Finance",
    nameThai: "กระทรวงการคลัง",
    tier: "A",
    icon: "🏦",
    description: "Manages the national budget, tax policy, and state enterprises. The treasury of the nation.",
    value: 30,
    preferredBy: ["thai_unity"]
  },

  // ── TIER B: Important but less contested ──
  {
    id: "education",
    name: "Ministry of Education",
    nameThai: "กระทรวงศึกษาธิการ",
    tier: "B",
    icon: "📚",
    description: "Oversees schools, universities, and curriculum reform. Important but low procurement value.",
    value: 18,
    preferredBy: ["progressive_move", "southern_pact"]
  },
  {
    id: "health",
    name: "Ministry of Public Health",
    nameThai: "กระทรวงสาธารณสุข",
    tier: "B",
    icon: "🏥",
    description: "Manages hospitals, the 30-baht scheme, and drug policy. High public visibility.",
    value: 20,
    preferredBy: ["peoples_populist", "progressive_move"]
  },
  {
    id: "digital",
    name: "Ministry of Digital Economy",
    nameThai: "กระทรวงดิจิทัลเพื่อเศรษฐกิจฯ",
    tier: "B",
    icon: "💻",
    description: "Regulates internet, data privacy, and tech startups. Critical for the future.",
    value: 16,
    preferredBy: ["progressive_move"]
  },
  {
    id: "agriculture",
    name: "Ministry of Agriculture",
    nameThai: "กระทรวงเกษตรและสหกรณ์",
    tier: "B",
    icon: "🌾",
    description: "Manages farm subsidies, irrigation, and rural development. Essential for Isan votes.",
    value: 18,
    preferredBy: ["peoples_populist", "southern_pact"]
  },

  // ── TIER C: Lower value, useful for appeasement ──
  {
    id: "culture",
    name: "Ministry of Culture",
    nameThai: "กระทรวงวัฒนธรรม",
    tier: "C",
    icon: "🎭",
    description: "Oversees cultural heritage, temples, and national identity projects. Low budget, high symbolism.",
    value: 10,
    preferredBy: ["national_heritage"]
  },
  {
    id: "tourism",
    name: "Ministry of Tourism & Sports",
    nameThai: "กระทรวงการท่องเที่ยวและกีฬา",
    tier: "C",
    icon: "🏖️",
    description: "Manages Thailand's tourism industry and sports development. Visible but not powerful.",
    value: 12,
    preferredBy: ["thai_unity", "southern_pact"]
  },
  {
    id: "labor",
    name: "Ministry of Labour",
    nameThai: "กระทรวงแรงงาน",
    tier: "C",
    icon: "👷",
    description: "Manages employment, migrant workers, and social security. Essential but unglamorous.",
    value: 10,
    preferredBy: ["peoples_populist"]
  },
  {
    id: "social_dev",
    name: "Ministry of Social Development",
    nameThai: "กระทรวงการพัฒนาสังคมฯ",
    tier: "C",
    icon: "👨‍👩‍👧‍👦",
    description: "Handles welfare, children's rights, and elderly care. The 'conscience' portfolio.",
    value: 8,
    preferredBy: ["progressive_move", "southern_pact"]
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: CABINET STATE
// ──────────────────────────────────────────────────────────────────────────

let cabinetState = {
  isFormed: false,
  allocations: {},          // { ministryId: partyId }
  playerMinistries: [],     // ministries kept by the player's party
  partySatisfaction: {},    // { partyId: 0-100 satisfaction score }
  lastFormationTurn: 0,
  corePartyId: null         // STEP 24: The player's locked "Core Party"
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2B: CORE PARTY IDENTITY (STEP 24)
// Reads the player's party from localStorage and locks it as the
// dominant partner in cabinet formation. All ministry allocations
// default to this party unless explicitly reassigned.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Campaign → Main-Game party ID mapping
 *
 * STEP 30 FIX: Corrected mappings for ALL 5 parties.
 * Campaign IDs (from campaign/data.js):
 *   khana_pracharat    → KPR (progressive)
 *   phak_pracha_niyom  → PNP (populist)
 *   palang_ratthaniyom → PRP (royalist)
 *   setthakij_thai     → STK (centrist)       ← was incorrectly "sahaphan_thai_klang"
 *   pak_tai_ruamjai    → PTR (regional)        ← was incorrectly "phak_thai_ruam"
 *
 * Main-Game IDs (from main-game/data.js):
 *   progressive_move, peoples_populist, national_heritage, thai_unity, southern_pact
 */
const CAMPAIGN_TO_CABINET_MAP = {
  // ── Correct campaign ID → main-game ID ──
  khana_pracharat:     'progressive_move',    // KPR → PMP
  phak_pracha_niyom:   'peoples_populist',    // PNP → PPP
  palang_ratthaniyom:  'national_heritage',   // PRP → NHP
  setthakij_thai:      'thai_unity',          // STK → TUP  ← FIXED
  pak_tai_ruamjai:     'southern_pact',       // PTR → SPC  ← FIXED
};

/** Reverse map: main-game ID → campaign ID (for bidirectional lookup) */
const CABINET_TO_CAMPAIGN_MAP = {};
for (const [campaignId, cabinetId] of Object.entries(CAMPAIGN_TO_CABINET_MAP)) {
  CABINET_TO_CAMPAIGN_MAP[cabinetId] = campaignId;
}

/** ShortName → main-game ID fallback map */
const SHORTNAME_TO_CABINET_MAP = {
  'KPR': 'progressive_move',
  'PNP': 'peoples_populist',
  'PRP': 'national_heritage',
  'STK': 'thai_unity',
  'PTR': 'southern_pact',
  // Main-game shortNames
  'PMP': 'progressive_move',
  'PPP': 'peoples_populist',
  'NHP': 'national_heritage',
  'TUP': 'thai_unity',
  'SPC': 'southern_pact',
};

/**
 * getPlayerCorePartyId() — Returns the main-game party ID of the player.
 *
 * STEP 30: Robust multi-strategy matching:
 *   1. Direct map (campaign ID → cabinet ID)
 *   2. Identity check (already a main-game ID?)
 *   3. ShortName lookup (e.g., "STK" → "thai_unity")
 *   4. Case-insensitive search in PARTIES array
 *
 * @returns {string|null}
 */
function getPlayerCorePartyId() {
  if (cabinetState.corePartyId) return cabinetState.corePartyId;

  const savedId = localStorage.getItem('campaign_party_id');
  if (!savedId) return null;

  let resolved = null;

  // Strategy 1: Direct campaign → cabinet map
  if (CAMPAIGN_TO_CABINET_MAP[savedId]) {
    resolved = CAMPAIGN_TO_CABINET_MAP[savedId];
    console.log(`[cabinet.js] Core Party resolved via direct map: "${savedId}" → "${resolved}"`);
  }

  // Strategy 2: Already a main-game ID? (e.g., "progressive_move")
  if (!resolved && typeof PARTIES !== 'undefined') {
    const directMatch = PARTIES.find(p => p.id === savedId);
    if (directMatch) {
      resolved = savedId;
      console.log(`[cabinet.js] Core Party resolved via identity match: "${savedId}"`);
    }
  }

  // Strategy 3: ShortName lookup (e.g., "STK", "PTR", "PMP")
  if (!resolved && SHORTNAME_TO_CABINET_MAP[savedId.toUpperCase()]) {
    resolved = SHORTNAME_TO_CABINET_MAP[savedId.toUpperCase()];
    console.log(`[cabinet.js] Core Party resolved via shortName: "${savedId}" → "${resolved}"`);
  }

  // Strategy 4: Case-insensitive search across PARTIES
  if (!resolved && typeof PARTIES !== 'undefined') {
    const lowerSaved = savedId.toLowerCase();
    const fuzzy = PARTIES.find(p =>
      p.id.toLowerCase() === lowerSaved ||
      p.shortName.toLowerCase() === lowerSaved ||
      p.name.toLowerCase().includes(lowerSaved)
    );
    if (fuzzy) {
      resolved = fuzzy.id;
      console.log(`[cabinet.js] Core Party resolved via fuzzy match: "${savedId}" → "${resolved}"`);
    }
  }

  // ── FAILURE: Log detailed diagnostics ──
  if (!resolved) {
    console.error(`[cabinet.js] ⛔ CORE PARTY RESOLUTION FAILED!`);
    console.error(`  savedId from localStorage: "${savedId}"`);
    console.error(`  CAMPAIGN_TO_CABINET_MAP keys:`, Object.keys(CAMPAIGN_TO_CABINET_MAP));
    if (typeof PARTIES !== 'undefined') {
      console.error(`  PARTIES IDs:`, PARTIES.map(p => `${p.id} (${p.shortName})`));
    }
    console.error(`  → The savedId does not match any known party. Check campaign/data.js IDs.`);
    return null;
  }

  cabinetState.corePartyId = resolved;
  console.log(`[cabinet.js] ✅ Core Party locked: "${resolved}" (from saved: "${savedId}")`);
  return resolved;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2C: DYNAMIC SEAT GENERATION ENGINE (STEP 28)
// Generates parliament seat allocations based on entry mode.
// Quick Start = RNG (player #1). Campaign = exact saved results.
// ──────────────────────────────────────────────────────────────────────────

/** Stores the current parliament seat breakdown for the UI */
let currentParliamentSeats = null;

/**
 * generateCabinetSeats(selectedPartyId) — Creates parliament seat data.
 *
 * MODE 'quick_start':
 *   - Player's party gets 140–160 seats (always highest)
 *   - Remaining seats distributed among 4 AI parties
 *   - No AI party exceeds the player's seat count
 *   - Total always equals exactly 500
 *   - All 5 parties start in coalition for Quick Start
 *
 * MODE 'campaign_finished':
 *   - Reads exact election_results from localStorage
 *   - Uses saved seat counts and coalition membership
 *   - Does NOT randomize
 *
 * @param {string} selectedPartyId — The main-game party ID of the player
 * @returns {Array} Array of { id, name, shortName, color, seats, inCoalition, isPlayer }
 */
function generateCabinetSeats(selectedPartyId) {
  const mode = localStorage.getItem('game_entry_mode');
  console.log(`[cabinet.js] STEP 28 — Generating seats. Mode: "${mode}", Player: "${selectedPartyId}"`);

  if (mode === 'campaign_finished') {
    // ── CAMPAIGN MODE: Use exact saved election results ──
    try {
      const raw = localStorage.getItem('election_results');
      if (raw) {
        const saved = JSON.parse(raw);

        // STEP 31: election_results uses CAMPAIGN IDs — map to main-game IDs
        currentParliamentSeats = saved.map(p => {
          const mainGameId = CAMPAIGN_TO_CABINET_MAP[p.id] || p.id;
          const mainGameParty = (typeof PARTIES !== 'undefined')
            ? PARTIES.find(mp => mp.id === mainGameId)
            : null;

          return {
            id: mainGameId,
            name: mainGameParty ? mainGameParty.name : p.name,
            shortName: mainGameParty ? mainGameParty.shortName : (p.shortName || mainGameId),
            color: mainGameParty ? mainGameParty.color : (p.color || '#888'),
            seats: p.seats,
            inCoalition: p.inCoalition !== undefined ? p.inCoalition : true,
            isPlayer: mainGameId === selectedPartyId
          };
        });

        // Apply to the live `parties` array (from engine.js)
        _applySeatsToParties(currentParliamentSeats);

        console.log('[cabinet.js] STEP 31 — Campaign seats loaded:', currentParliamentSeats.map(p => `${p.shortName}: ${p.seats} (${p.id})`).join(', '));
        return currentParliamentSeats;
      }
    } catch (e) {
      console.warn('[cabinet.js] Could not parse election_results, falling back to RNG:', e);
    }
  }

  // ── QUICK START MODE (default): RNG with player guaranteed #1 ──
  const TOTAL_SEATS = 500;

  // Player gets 140–160 seats (always the highest)
  const playerSeats = 140 + Math.floor(Math.random() * 21); // 140..160

  // Remaining seats to distribute among 4 AI parties
  const remaining = TOTAL_SEATS - playerSeats;

  // STEP 31: Get all 5 party objects from data.js and verify completeness
  const allParties = JSON.parse(JSON.stringify(PARTIES));
  console.log(`[cabinet.js] STEP 31 — PARTIES pool: ${allParties.length} parties: [${allParties.map(p => p.id).join(', ')}]`);

  if (allParties.length < 5) {
    console.error(`[cabinet.js] ⛔ PARTIES array has only ${allParties.length} entries! Expected 5. Check main-game/data.js.`);
  }

  // STEP 31: Find player party with robust matching
  let playerParty = allParties.find(p => p.id === selectedPartyId);

  if (!playerParty) {
    // Fallback: try shortName or fuzzy name match
    const lowerSaved = selectedPartyId.toLowerCase();
    playerParty = allParties.find(p =>
      p.shortName.toLowerCase() === lowerSaved ||
      p.name.toLowerCase().includes(lowerSaved)
    );
    if (playerParty) {
      console.warn(`[cabinet.js] STEP 31 — Player party "${selectedPartyId}" not found by ID, but matched via fuzzy to "${playerParty.id}"`);
    } else {
      console.error(`[cabinet.js] ⛔ STEP 31 — Player party "${selectedPartyId}" NOT FOUND in PARTIES!`);
      console.error(`  Available IDs: [${allParties.map(p => `${p.id} (${p.shortName})`).join(', ')}]`);
      console.error(`  → Falling back to first party as player.`);
      playerParty = allParties[0];
    }
  }

  const aiParties = allParties.filter(p => p.id !== playerParty.id);

  // Distribute remaining seats: weighted random, each capped below player
  const aiSeats = _distributeSeats(remaining, aiParties.length, playerSeats - 1);

  // Build the result array
  currentParliamentSeats = [];

  // Add player party
  currentParliamentSeats.push({
    id: playerParty.id,
    name: playerParty.name,
    shortName: playerParty.shortName,
    color: playerParty.color,
    seats: playerSeats,
    inCoalition: true,
    isPlayer: true
  });

  // Add AI parties with distributed seats
  aiParties.forEach((party, i) => {
    currentParliamentSeats.push({
      id: party.id,
      name: party.name,
      shortName: party.shortName,
      color: party.color,
      seats: aiSeats[i],
      inCoalition: true, // Quick Start: all parties in coalition
      isPlayer: false
    });
  });

  // Sort by seats descending (player should be first)
  currentParliamentSeats.sort((a, b) => b.seats - a.seats);

  // Apply to the live `parties` array
  _applySeatsToParties(currentParliamentSeats);

  console.log('[cabinet.js] STEP 28 — Quick Start seats generated:', currentParliamentSeats.map(p => `${p.shortName}: ${p.seats}`).join(', '));
  console.log(`[cabinet.js] Total: ${currentParliamentSeats.reduce((s, p) => s + p.seats, 0)} seats`);

  return currentParliamentSeats;
}

/**
 * _distributeSeats() — Distributes N seats among K parties.
 * Each party gets at least minPerParty seats, and none exceeds maxPerParty.
 * Uses weighted random distribution.
 *
 * @param {number} totalSeats — Total seats to distribute
 * @param {number} partyCount — Number of parties
 * @param {number} maxPerParty — Maximum seats any one party can have
 * @returns {number[]} Array of seat counts
 */
function _distributeSeats(totalSeats, partyCount, maxPerParty) {
  const minPerParty = 30; // Every party gets at least 30 seats
  const seats = new Array(partyCount).fill(minPerParty);
  let distributed = minPerParty * partyCount;
  let remaining = totalSeats - distributed;

  // Random weights for each party
  const weights = [];
  for (let i = 0; i < partyCount; i++) {
    weights.push(0.5 + Math.random()); // 0.5..1.5
  }
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  // Distribute proportionally
  for (let i = 0; i < partyCount; i++) {
    const share = Math.floor((weights[i] / totalWeight) * remaining);
    const capped = Math.min(share, maxPerParty - seats[i]);
    seats[i] += Math.max(0, capped);
  }

  // Fix any remainder to hit exact total
  let currentTotal = seats.reduce((s, v) => s + v, 0);
  let diff = totalSeats - currentTotal;

  // Distribute remainder one seat at a time
  let idx = 0;
  while (diff > 0) {
    if (seats[idx] < maxPerParty) {
      seats[idx]++;
      diff--;
    }
    idx = (idx + 1) % partyCount;
  }
  // Remove excess if overshot
  while (diff < 0) {
    if (seats[idx] > minPerParty) {
      seats[idx]--;
      diff++;
    }
    idx = (idx + 1) % partyCount;
  }

  return seats;
}

/**
 * _applySeatsToParties() — Writes seat data from currentParliamentSeats
 * into the live `parties` array used by the game engine.
 * This ensures all game logic (voting, defection, etc.) uses correct seats.
 *
 * @param {Array} seatData — Array of { id, seats, inCoalition }
 */
function _applySeatsToParties(seatData) {
  if (typeof parties === 'undefined' || !parties) {
    console.warn('[cabinet.js] `parties` array not available yet — skipping seat apply.');
    return;
  }

  seatData.forEach(entry => {
    const party = parties.find(p => p.id === entry.id);
    if (party) {
      party.seats = entry.seats;
      party.inCoalition = entry.inCoalition;
      console.log(`[cabinet.js]   → ${party.shortName}: ${entry.seats} seats, coalition: ${entry.inCoalition}`);
    }
  });
}

/**
 * getCurrentParliamentSeats() — Public getter for the UI.
 * @returns {Array|null}
 */
function getCurrentParliamentSeats() {
  return currentParliamentSeats;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: DEMAND CALCULATION
// AI parties demand ministries proportional to their seat contribution.
// A party with 141/358 coalition seats (39%) expects ~39% of the value.
// ──────────────────────────────────────────────────────────────────────────

/**
 * computePartyDemands() — Calculates what each coalition party expects.
 * Returns an array of { partyId, demandScore, expectedTier, minTierA, idealMinistries[] }
 *
 * @param {Array} coalitionParties — Parties currently in coalition
 * @returns {Array} Demand objects for each party
 */
function computePartyDemands(coalitionParties) {
  if (!coalitionParties || coalitionParties.length === 0) return [];

  const totalCoalitionSeats = coalitionParties.reduce((s, p) => s + p.seats, 0);
  const totalMinistryValue = MINISTRIES.reduce((s, m) => s + m.value, 0);

  return coalitionParties.map(party => {
    const seatShare = party.seats / totalCoalitionSeats;
    const expectedValue = seatShare * totalMinistryValue;

    // Calculate how many Tier A ministries they expect
    const tierACount = Math.ceil(seatShare * 4); // 4 Tier A ministries total
    const minTierA = Math.max(0, Math.min(tierACount, 2)); // Cap at 2

    // Find preferred ministries
    const idealMinistries = MINISTRIES
      .filter(m => m.preferredBy.includes(party.id))
      .sort((a, b) => b.value - a.value)
      .map(m => m.id);

    return {
      partyId: party.id,
      partyName: party.name,
      shortName: party.shortName,
      color: party.color,
      seats: party.seats,
      seatShare: Math.round(seatShare * 100),
      demandScore: Math.round(expectedValue),
      expectedValue,
      minTierA,
      idealMinistries,
      icon: party.shortName === 'PMP' ? '🔥' :
            party.shortName === 'PPP' ? '🌾' :
            party.shortName === 'TUP' ? '🤝' :
            party.shortName === 'SPC' ? '🕌' : '🏛️'
    };
  });
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: MINISTRY ALLOCATION ENGINE
// ──────────────────────────────────────────────────────────────────────────

/**
 * assignMinistry() — Assigns a ministry to a coalition party.
 * @param {string} partyId — ID of the coalition party
 * @param {string} ministryId — ID of the ministry
 * @returns {Object} Result { success, message }
 */
function assignMinistry(partyId, ministryId) {
  const ministry = MINISTRIES.find(m => m.id === ministryId);
  if (!ministry) return { success: false, message: "Ministry not found." };

  // Check if ministry is already assigned
  const currentHolder = cabinetState.allocations[ministryId];
  if (currentHolder === partyId) {
    return { success: false, message: `${ministry.name} is already assigned to this party.` };
  }

  // Assign (overwrite previous holder)
  cabinetState.allocations[ministryId] = partyId;

  return {
    success: true,
    message: `${ministry.name} assigned to ${partyId}.`,
    ministry,
    partyId
  };
}

/**
 * unassignMinistry() — Removes a party from a ministry slot.
 * @param {string} ministryId — ID of the ministry
 */
function unassignMinistry(ministryId) {
  delete cabinetState.allocations[ministryId];
}

/**
 * getMinistryHolder() — Returns the party ID holding a ministry, or null.
 */
function getMinistryHolder(ministryId) {
  return cabinetState.allocations[ministryId] || null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: SATISFACTION CALCULATOR
// Determines how happy each party is with their ministry allocation.
// ──────────────────────────────────────────────────────────────────────────

/**
 * calculateCabinetSatisfaction() — Scores each party's satisfaction (0-100).
 *
 * Factors:
 *  - Did they get Tier A ministries? (big positive)
 *  - Did they get their preferred ministries? (moderate positive)
 *  - Does the total value they received match their seat-share expectation? (linear)
 *  - Did they get NOTHING? (catastrophic penalty)
 *
 * @param {Array} coalitionParties — Current coalition parties
 * @returns {Object} { partyId: satisfactionScore, ... }
 */
function calculateCabinetSatisfaction(coalitionParties) {
  const demands = computePartyDemands(coalitionParties);
  const satisfaction = {};

  demands.forEach(demand => {
    let score = 50; // Neutral baseline

    // Get all ministries assigned to this party
    const assignedMinistries = Object.entries(cabinetState.allocations)
      .filter(([mId, pId]) => pId === demand.partyId)
      .map(([mId]) => MINISTRIES.find(m => m.id === mId))
      .filter(Boolean);

    // CATASTROPHE: Got nothing at all
    if (assignedMinistries.length === 0) {
      score = 10; // Critically low — near-defection territory
      satisfaction[demand.partyId] = score;
      return;
    }

    // Factor 1: Total value received vs expected
    const receivedValue = assignedMinistries.reduce((s, m) => s + m.value, 0);
    const valueRatio = receivedValue / Math.max(1, demand.expectedValue);
    score += Math.round((valueRatio - 1) * 30); // ±30 swing based on value match

    // Factor 2: Tier A allocation
    const tierAReceived = assignedMinistries.filter(m => m.tier === 'A').length;
    if (demand.minTierA > 0) {
      if (tierAReceived >= demand.minTierA) {
        score += 15; // Met expectations
      } else if (tierAReceived > 0) {
        score += 5;  // Partially met
      } else {
        score -= 20; // Expected Tier A, got none → angry
      }
    }

    // Factor 3: Got preferred ministries?
    const preferredReceived = assignedMinistries.filter(m =>
      m.preferredBy.includes(demand.partyId)
    ).length;
    score += preferredReceived * 8; // +8 per preferred ministry

    // Factor 4: Number of portfolios (more = happier, up to a point)
    score += Math.min(assignedMinistries.length * 3, 12);

    // Clamp
    score = Math.max(5, Math.min(100, score));

    satisfaction[demand.partyId] = score;
  });

  return satisfaction;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: CABINET FINALIZATION
// When the player presses "Form Government", this runs.
// ──────────────────────────────────────────────────────────────────────────

/**
 * finalizeCabinet() — Locks in the cabinet allocation and applies effects.
 *
 * @param {Array} coalitionParties — Parties in the coalition
 * @returns {Object} Formation result with satisfaction scores and effects
 */
function finalizeCabinet(coalitionParties) {
  const satisfaction = calculateCabinetSatisfaction(coalitionParties);
  cabinetState.partySatisfaction = satisfaction;
  cabinetState.isFormed = true;
  cabinetState.lastFormationTurn = gameState ? gameState.turn : 1;

  // Track which ministries the player's Core Party kept (STEP 24)
  const coreId = getPlayerCorePartyId() || 'player';
  const allAssigned = Object.values(cabinetState.allocations);
  cabinetState.playerMinistries = MINISTRIES
    .filter(m => !allAssigned.includes(m.id) || cabinetState.allocations[m.id] === coreId || cabinetState.allocations[m.id] === 'player')
    .map(m => m.id);

  // Apply satisfaction to party relations
  const relationChanges = {};
  const warnings = [];

  for (const [partyId, satScore] of Object.entries(satisfaction)) {
    const party = coalitionParties.find(p => p.id === partyId);
    if (!party) continue;

    let relationDelta = 0;

    if (satScore >= 80) {
      relationDelta = +15;  // Very happy
    } else if (satScore >= 60) {
      relationDelta = +5;   // Content
    } else if (satScore >= 40) {
      relationDelta = -5;   // Unhappy but staying
    } else if (satScore >= 25) {
      relationDelta = -15;  // Very unhappy — defection risk
      warnings.push(`⚠️ ${party.name} is deeply unhappy with their portfolio allocation!`);
    } else {
      relationDelta = -25;  // Furious — immediate crisis
      warnings.push(`🚨 ${party.name} is FURIOUS — they may defect from the coalition!`);
    }

    party.relation = Math.max(-100, Math.min(100, party.relation + relationDelta));
    relationChanges[partyId] = { delta: relationDelta, newRelation: party.relation, satisfaction: satScore };
  }

  // Coalition stability impact
  const avgSatisfaction = Object.values(satisfaction).reduce((s, v) => s + v, 0)
    / Math.max(1, Object.values(satisfaction).length);
  const stabilityDelta = Math.round((avgSatisfaction - 50) * 0.4); // ±20 range

  if (gameState) {
    gameState.coalitionStability = Math.max(0, Math.min(100,
      gameState.coalitionStability + stabilityDelta));
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("[cabinet.js] Cabinet formed!");
  console.log("  Satisfaction:", satisfaction);
  console.log("  Avg satisfaction:", Math.round(avgSatisfaction));
  console.log("  Stability delta:", stabilityDelta);
  console.log("═══════════════════════════════════════════════════════════");

  return {
    satisfaction,
    relationChanges,
    warnings,
    avgSatisfaction: Math.round(avgSatisfaction),
    stabilityDelta,
    isFormed: true
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: UTILITY & QUERY FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * getMinistriesByTier() — Returns ministries grouped by tier.
 */
function getMinistriesByTier(tier) {
  return MINISTRIES.filter(m => m.tier === tier);
}

/**
 * getAllocatedMinistries() — Returns all currently allocated ministries.
 */
function getAllocatedMinistries() {
  return Object.entries(cabinetState.allocations).map(([ministryId, partyId]) => ({
    ministry: MINISTRIES.find(m => m.id === ministryId),
    partyId
  })).filter(entry => entry.ministry);
}

/**
 * getUnallocatedMinistries() — Returns ministries not yet assigned.
 */
function getUnallocatedMinistries() {
  const allocated = Object.keys(cabinetState.allocations);
  return MINISTRIES.filter(m => !allocated.includes(m.id));
}

/**
 * getPartyPortfolio() — Returns all ministries assigned to a party.
 */
function getPartyPortfolio(partyId) {
  return Object.entries(cabinetState.allocations)
    .filter(([mId, pId]) => pId === partyId)
    .map(([mId]) => MINISTRIES.find(m => m.id === mId))
    .filter(Boolean);
}

/**
 * resetCabinet() — Clears all allocations (for reshuffling).
 */
function resetCabinet() {
  cabinetState.allocations = {};
  cabinetState.playerMinistries = [];
  cabinetState.partySatisfaction = {};
  cabinetState.isFormed = false;
  cabinetState.corePartyId = null; // STEP 24: Clear Core Party on reset
}

/**
 * getCabinetState() — Returns the current cabinet state.
 */
function getCabinetState() {
  return { ...cabinetState };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[cabinet.js] Cabinet Formation module loaded (v1.0.2).");
console.log(`  → ${MINISTRIES.length} ministries defined`);
console.log(`  → Tier A: ${getMinistriesByTier('A').length}, Tier B: ${getMinistriesByTier('B').length}, Tier C: ${getMinistriesByTier('C').length}`);
console.log("═══════════════════════════════════════════════════════════");
