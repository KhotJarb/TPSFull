// ═══════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /campaign/engine.js
// Election Engine: Constituency + Party-List Math, Coalition, Win/Loss
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// UTILITY
// ──────────────────────────────────────────────────────────────────

function clampVal(v, min, max) { return Math.max(min, Math.min(max, v)); }

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ──────────────────────────────────────────────────────────────────
// SECTION 1: CAMPAIGN WEEK ACTIONS
// ──────────────────────────────────────────────────────────────────

/**
 * Advances to the next campaign week.
 * Resets action points and triggers AI campaign actions.
 */
function advanceWeek() {
  if (campaignState.currentWeek >= campaignState.maxWeeks) {
    return { done: true, message: "Campaign is over. Time to hold the election." };
  }

  campaignState.currentWeek++;
  campaignState.actionPointsRemaining = campaignState.actionPointsPerWeek;
  campaignState.weeklyActions = [];

  // AI parties campaign automatically
  runAICampaigns();

  // Natural poll drift
  applyPollDrift();

  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "week_start",
    message: `Week ${campaignState.currentWeek} of the ${campaignState.electionYear} campaign begins.`
  });

  return { done: false, week: campaignState.currentWeek };
}

/**
 * AI parties run their campaign activities each week
 */
function runAICampaigns() {
  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === campaignState.playerPartyId) return;

    // AI picks random districts weighted by their regional strength
    const targetCount = 3 + Math.floor(Math.random() * 5);
    const shuffled = shuffleArray(DISTRICTS);

    for (let i = 0; i < Math.min(targetCount, shuffled.length); i++) {
      const dist = shuffled[i];
      const regionStr = party.regionalStrength[dist.region] || 15;
      const buffAmount = (regionStr / 100) * (5 + Math.random() * 10);

      // AI applies campaign buffs
      if (party.banYaiNetwork > 30 && Math.random() < 0.3) {
        // Ban Yai operation
        dist.banYaiBonus += buffAmount * 0.5;
        if (!dist.banYaiOwner || Math.random() < 0.4) {
          dist.banYaiOwner = party.id;
        }
      } else {
        // Normal campaigning
        const buffType = ["rally", "canvass", "io", "policy"][Math.floor(Math.random() * 4)];
        dist.campaignBuffs[buffType] += buffAmount;
      }
    }
  });
}

/**
 * Small random drift in national polls each week
 */
function applyPollDrift() {
  let total = 0;
  CAMPAIGN_PARTIES.forEach(party => {
    const drift = (Math.random() - 0.5) * 2;
    campaignState.nationalPollShare[party.id] = Math.max(3,
      campaignState.nationalPollShare[party.id] + drift
    );
    total += campaignState.nationalPollShare[party.id];
  });
  // Normalize to 100
  CAMPAIGN_PARTIES.forEach(party => {
    campaignState.nationalPollShare[party.id] =
      Math.round((campaignState.nationalPollShare[party.id] / total) * 100);
  });
}

// ── Player campaign actions ─────────────────────────────────────

/**
 * Player holds a rally in a province (affects all districts in that province)
 */
function actionRally(provinceId) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const cost = 50;
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dists = getDistrictsByProvince(provinceId);
  if (dists.length === 0) return { success: false, message: "Province not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + 1);

  const buff = 8 + Math.random() * 7;
  dists.forEach(d => {
    d.campaignBuffs.rally += buff;
    d.visitCount++;
  });

  const prov = getProvinceById(provinceId);
  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "rally",
    message: `Held rally in ${prov.name} (+${buff.toFixed(1)} rally buff to ${dists.length} districts)`
  });

  return { success: true, buff, districts: dists.length, province: prov.name };
}

/**
 * Player runs an IO (Information Operation) campaign targeting a region
 */
function actionIO(region) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const cost = 80;
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dists = getDistrictsByRegion(region);
  if (dists.length === 0) return { success: false, message: "Region not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + 5);

  const party = CAMPAIGN_PARTIES.find(p => p.id === campaignState.playerPartyId);
  const ioMult = (party.ioStrength || 20) / 30;
  const buff = (5 + Math.random() * 5) * ioMult;

  dists.forEach(d => { d.campaignBuffs.io += buff; });

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "io",
    message: `IO campaign in ${REGIONS[region]} (+${buff.toFixed(1)} IO buff, scrutiny +5)`
  });

  return { success: true, buff, districts: dists.length, region: REGIONS[region] };
}

/**
 * Player deploys Ban Yai (local boss network) in a specific district
 * HIGH RISK: adds scrutiny, but guarantees strong constituency performance
 */
function actionBanYai(districtId) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const cost = 120;
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dist = getDistrictById(districtId);
  if (!dist) return { success: false, message: "District not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + 10);

  const bonus = 25 + Math.random() * 15;
  dist.banYaiBonus += bonus;
  dist.banYaiOwner = campaignState.playerPartyId;

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "ban_yai",
    message: `Deployed Ban Yai in ${dist.displayName} (+${bonus.toFixed(0)} bonus, scrutiny +10)`
  });

  return { success: true, bonus, district: dist.displayName };
}

/**
 * Player fundraises (gain funds, increase scrutiny slightly)
 */
function actionFundraise() {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };

  const amount = 100 + Math.floor(Math.random() * 150);
  campaignState.playerFunds += amount;
  campaignState.actionPointsRemaining--;
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + 2);

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "fundraise",
    message: `Fundraising event raised ฿${amount}M (scrutiny +2)`
  });

  return { success: true, amount };
}


// ──────────────────────────────────────────────────────────────────
// SECTION 2: runElection()
// Simulates 400 constituency races + 100 party-list seats
// ──────────────────────────────────────────────────────────────────

/**
 * Main election function.
 * 1) Runs 400 constituency seats (FPTP — highest score wins)
 * 2) Runs 100 party-list seats (Largest Remainder Method)
 * 3) Stores results in campaignState
 *
 * BAN YAI MECHANIC:
 *   - Ban Yai bonus ADDS to constituency score (helps win the seat)
 *   - Ban Yai bonus SUBTRACTS from national party-list tally
 *     (corrupt local operations turn off ideological voters nationally)
 *
 * @returns {Object} Full election results
 */
function runElection() {
  const results = {
    constituency: {},    // partyId → { seats, districtWins[] }
    partyList: {},       // partyId → { seats, votes, quota, remainder }
    total: {},           // partyId → total seats
    districtDetails: [], // per-district breakdown
    banYaiPenalties: {}, // partyId → total ban yai penalty
    playerSeats: 0,
    timestamp: Date.now()
  };

  // Initialize result containers
  CAMPAIGN_PARTIES.forEach(p => {
    results.constituency[p.id] = { seats: 0, districtWins: [] };
    results.partyList[p.id] = { seats: 0, votes: 0, quota: 0, remainder: 0 };
    results.total[p.id] = 0;
    results.banYaiPenalties[p.id] = 0;
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: 400 CONSTITUENCY SEATS (First Past the Post)
  // ═══════════════════════════════════════════════════════════

  DISTRICTS.forEach(district => {
    const scores = {};

    CAMPAIGN_PARTIES.forEach(party => {
      // 1. Base lean score (political lean of the district)
      let score = district.politicalLean[party.id] || 15;

      // 2. Campaign buff bonuses (only for the party that campaigned)
      if (party.id === campaignState.playerPartyId) {
        score += (district.campaignBuffs.rally || 0) * 0.8;
        score += (district.campaignBuffs.canvass || 0) * 1.0;
        score += (district.campaignBuffs.io || 0) * 0.6;
        score += (district.campaignBuffs.infrastructure || 0) * 0.5;
        score += (district.campaignBuffs.policy || 0) * 0.7;
      }

      // 3. Ban Yai bonus (ONLY for the party that owns Ban Yai here)
      if (district.banYaiOwner === party.id) {
        score += district.banYaiBonus;
        // Track penalty for party-list deduction
        results.banYaiPenalties[party.id] += district.banYaiBonus * 0.5;
      }

      // 4. Party's regional strength modifier
      const regionStr = party.regionalStrength[district.region] || 15;
      score += regionStr * 0.3;

      // 5. Candidate quality (assign best MP for this party in this district)
      const roster = partyRosters[party.id];
      if (roster && roster.length > 0) {
        const mpIdx = district.globalIndex % roster.length;
        const mp = roster[mpIdx];
        if (mp) {
          score += (mp.localInfluence * 0.15) + (mp.charisma * 0.1);
        }
      }

      // 6. National poll share influence
      const nationShare = campaignState.nationalPollShare[party.id] || 15;
      score += nationShare * 0.2;

      // 7. Random variance (election uncertainty, ±8)
      score += (Math.random() - 0.5) * 16;

      // 8. Scrutiny penalty (only for player)
      if (party.id === campaignState.playerPartyId) {
        score -= campaignState.playerScrutiny * 0.1;
      }

      scores[party.id] = Math.max(0, score);
    });

    // Winner = highest score
    let winnerId = null;
    let highScore = -1;
    for (const pid in scores) {
      if (scores[pid] > highScore) {
        highScore = scores[pid];
        winnerId = pid;
      }
    }

    results.constituency[winnerId].seats++;
    results.constituency[winnerId].districtWins.push(district.id);

    results.districtDetails.push({
      districtId: district.id,
      provinceName: district.provinceName,
      displayName: district.displayName,
      winner: winnerId,
      scores: { ...scores },
      margin: highScore - Object.values(scores).sort((a, b) => b - a)[1],
      banYaiUsed: district.banYaiBonus > 0
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: 100 PARTY-LIST SEATS (Largest Remainder Method)
  // ═══════════════════════════════════════════════════════════

  // Calculate national party-list votes for each party
  let totalPartyListVotes = 0;

  CAMPAIGN_PARTIES.forEach(party => {
    // Base votes from national poll share and party-list strength
    const pollShare = campaignState.nationalPollShare[party.id] || 15;
    const plStrength = party.partyListStrength || 15;
    let votes = ((pollShare + plStrength) / 2) * 100000;

    // SUBTRACT Ban Yai penalty from party-list votes
    // (corrupt local politics reduces national ideological vote)
    const penalty = results.banYaiPenalties[party.id] || 0;
    votes -= penalty * 800;
    votes = Math.max(votes * 0.1, votes); // never drops below 10% floor

    results.partyList[party.id].votes = Math.round(votes);
    totalPartyListVotes += Math.round(votes);
  });

  // Largest Remainder Method
  const quota = totalPartyListVotes / PARTY_LIST_SEATS;
  let seatsAllocated = 0;
  const remainders = [];

  CAMPAIGN_PARTIES.forEach(party => {
    const votes = results.partyList[party.id].votes;
    const autoSeats = Math.floor(votes / quota);
    const remainder = votes - (autoSeats * quota);

    results.partyList[party.id].seats = autoSeats;
    results.partyList[party.id].quota = Math.round(quota);
    results.partyList[party.id].remainder = Math.round(remainder);
    seatsAllocated += autoSeats;

    remainders.push({ partyId: party.id, remainder });
  });

  // Distribute remaining seats by largest remainder
  remainders.sort((a, b) => b.remainder - a.remainder);
  let remainingSeats = PARTY_LIST_SEATS - seatsAllocated;

  for (let i = 0; i < remainingSeats && i < remainders.length; i++) {
    results.partyList[remainders[i].partyId].seats++;
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: TOTAL SEATS
  // ═══════════════════════════════════════════════════════════

  CAMPAIGN_PARTIES.forEach(party => {
    const total = results.constituency[party.id].seats + results.partyList[party.id].seats;
    results.total[party.id] = total;
    campaignState.constituencySeats[party.id] = results.constituency[party.id].seats;
    campaignState.partyListSeats[party.id] = results.partyList[party.id].seats;
    campaignState.totalSeats[party.id] = total;
  });

  results.playerSeats = results.total[campaignState.playerPartyId] || 0;
  campaignState.electionHeld = true;
  campaignState.electionResults = results;

  return results;
}


// ──────────────────────────────────────────────────────────────────
// SECTION 3: coalitionPhase()
// AI parties decide whether to join the player's coalition
// ──────────────────────────────────────────────────────────────────

/** Ministry definitions — AI parties demand these based on seat share */
const MINISTRIES = [
  { id: "defense", name: "Ministry of Defence", prestige: 10 },
  { id: "finance", name: "Ministry of Finance", prestige: 9 },
  { id: "interior", name: "Ministry of Interior", prestige: 9 },
  { id: "foreign", name: "Ministry of Foreign Affairs", prestige: 8 },
  { id: "commerce", name: "Ministry of Commerce", prestige: 7 },
  { id: "education", name: "Ministry of Education", prestige: 7 },
  { id: "transport", name: "Ministry of Transport", prestige: 7 },
  { id: "agriculture", name: "Ministry of Agriculture", prestige: 6 },
  { id: "health", name: "Ministry of Public Health", prestige: 6 },
  { id: "energy", name: "Ministry of Energy", prestige: 6 },
  { id: "digital", name: "Ministry of Digital Economy", prestige: 5 },
  { id: "labor", name: "Ministry of Labour", prestige: 5 },
  { id: "tourism", name: "Ministry of Tourism & Sports", prestige: 5 },
  { id: "justice", name: "Ministry of Justice", prestige: 5 },
  { id: "culture", name: "Ministry of Culture", prestige: 4 },
  { id: "social", name: "Ministry of Social Development", prestige: 4 },
  { id: "natural_resources", name: "Ministry of Natural Resources", prestige: 4 },
  { id: "higher_ed", name: "Ministry of Higher Education", prestige: 4 },
];

/**
 * Runs the coalition formation phase.
 * AI parties evaluate whether to join based on:
 *   - Ideology compatibility
 *   - Seats contributed (proportional ministry demands)
 *   - Whether the player is the largest party
 *
 * @returns {Object} Coalition options with demands
 */
function coalitionPhase() {
  const results = campaignState.electionResults;
  if (!results) return { error: "Election not yet held." };

  const playerPartyId = campaignState.playerPartyId;
  const playerSeats = results.total[playerPartyId];

  // Sort parties by seat count (descending)
  const sortedParties = CAMPAIGN_PARTIES
    .map(p => ({ ...p, seats: results.total[p.id] }))
    .sort((a, b) => b.seats - a.seats);

  const isLargestParty = sortedParties[0].id === playerPartyId;

  // If player is NOT the largest party, coalition is harder
  const coalitionOffers = [];

  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === playerPartyId) return;

    const partySeats = results.total[party.id];
    if (partySeats === 0) return;

    // Ideology compatibility score
    const playerParty = CAMPAIGN_PARTIES.find(p => p.id === playerPartyId);
    const compat = calculateIdeologyCompat(playerParty.ideology, party.ideology);

    // Willingness to join (0-100)
    let willingness = 50;
    willingness += compat * 20;
    willingness += isLargestParty ? 15 : -10;
    willingness += playerSeats > partySeats ? 10 : -5;

    // Parties with many seats are harder to recruit
    if (partySeats > 100) willingness -= 10;

    // Royalist party very unlikely to join progressive
    if (party.ideology === "royalist" && playerParty.ideology === "progressive") {
      willingness -= 30;
    }
    // Centrist party joins anyone
    if (party.ideology === "centrist") willingness += 15;

    willingness = clampVal(willingness, 5, 95);

    // Ministry demands: proportional to seats contributed
    const seatRatio = partySeats / TOTAL_SEATS;
    const ministriesWanted = Math.max(1, Math.ceil(seatRatio * MINISTRIES.length));

    // Pick most prestigious ministries they want
    const demands = MINISTRIES
      .filter(m => {
        // Filter by ideology preference
        if (party.ideology === "royalist") return ["defense", "interior", "justice"].includes(m.id) || m.prestige >= 6;
        if (party.ideology === "populist") return ["commerce", "agriculture", "transport", "health"].includes(m.id) || m.prestige >= 6;
        if (party.ideology === "progressive") return ["education", "digital", "justice", "foreign"].includes(m.id) || m.prestige >= 7;
        if (party.ideology === "regional") return ["interior", "agriculture", "education", "natural_resources"].includes(m.id) || m.prestige >= 5;
        return m.prestige >= 5;
      })
      .slice(0, ministriesWanted)
      .map(m => m.name);

    // Special conditions
    const conditions = [];
    if (party.ideology === "royalist") conditions.push("No constitutional reform agenda");
    if (party.ideology === "populist") conditions.push("Must implement rural subsidy program");
    if (party.ideology === "regional") conditions.push("Provincial autonomy bill within Year 1");
    if (party.ideology === "centrist") conditions.push("Infrastructure mega-project commitment");

    coalitionOffers.push({
      partyId: party.id,
      partyName: party.name,
      shortName: party.shortName,
      color: party.color,
      ideology: party.ideology,
      seats: partySeats,
      willingness: Math.round(willingness),
      ministryDemands: demands,
      conditions: conditions,
      accepted: false,
      rejected: false
    });
  });

  // Sort by willingness descending
  coalitionOffers.sort((a, b) => b.willingness - a.willingness);

  campaignState.coalitionOffers = coalitionOffers;

  return {
    playerSeats,
    isLargestParty,
    targetSeats: MAJORITY_THRESHOLD,
    seatsNeeded: Math.max(0, MAJORITY_THRESHOLD - playerSeats),
    offers: coalitionOffers
  };
}

/**
 * Returns ideology compatibility (-1 to 1)
 */
function calculateIdeologyCompat(ideology1, ideology2) {
  const matrix = {
    progressive:  { progressive: 1, populist: 0.3, centrist: 0.1, regional: 0.2, royalist: -0.8 },
    populist:     { progressive: 0.3, populist: 1, centrist: 0.4, regional: 0.3, royalist: -0.3 },
    royalist:     { progressive: -0.8, populist: -0.3, centrist: 0.3, regional: 0.1, royalist: 1 },
    centrist:     { progressive: 0.1, populist: 0.4, centrist: 1, regional: 0.3, royalist: 0.3 },
    regional:     { progressive: 0.2, populist: 0.3, centrist: 0.3, regional: 1, royalist: 0.1 }
  };
  return (matrix[ideology1] && matrix[ideology1][ideology2]) || 0;
}

/**
 * Player accepts a coalition partner
 */
function acceptCoalitionPartner(partyId) {
  const offer = campaignState.coalitionOffers.find(o => o.partyId === partyId);
  if (!offer) return { success: false, message: "No offer from this party." };

  // Check willingness — roll the dice
  const roll = Math.random() * 100;
  if (roll > offer.willingness) {
    offer.rejected = true;
    return {
      success: false,
      message: `${offer.partyName} refused to join! (Willingness: ${offer.willingness}%, Roll: ${Math.round(roll)}%)`
    };
  }

  offer.accepted = true;
  campaignState.coalitionPartners.push(partyId);

  // Recalculate coalition seats
  recalcCoalitionSeats();

  return {
    success: true,
    message: `${offer.partyName} joins the coalition! (+${offer.seats} seats)`,
    totalCoalitionSeats: campaignState.coalitionSeats
  };
}

/**
 * Player rejects a coalition partner
 */
function rejectCoalitionPartner(partyId) {
  const offer = campaignState.coalitionOffers.find(o => o.partyId === partyId);
  if (!offer) return { success: false };
  offer.rejected = true;
  return { success: true, message: `Declined alliance with ${offer.partyName}.` };
}

/**
 * Recalculates total coalition seats
 */
function recalcCoalitionSeats() {
  let total = campaignState.totalSeats[campaignState.playerPartyId] || 0;
  campaignState.coalitionPartners.forEach(pid => {
    total += campaignState.totalSeats[pid] || 0;
  });
  campaignState.coalitionSeats = total;
  return total;
}


// ──────────────────────────────────────────────────────────────────
// SECTION 4: checkWinLoss()
// Determines if player forms government or becomes opposition
// ──────────────────────────────────────────────────────────────────

/**
 * Checks the coalition outcome.
 *
 * WIN:  Coalition >= 251 seats → winGame() → redirect to governing module
 * LOSS: Coalition <  251 seats → becomeOpposition() → fast-forward 4 years, replay
 *
 * @returns {Object} { result: "victory"|"opposition", seats, needed }
 */
function checkWinLoss() {
  recalcCoalitionSeats();

  const coalitionSeats = campaignState.coalitionSeats;
  const needed = MAJORITY_THRESHOLD;

  if (coalitionSeats >= needed) {
    campaignState.gameResult = "victory";
    return {
      result: "victory",
      seats: coalitionSeats,
      needed: needed,
      surplus: coalitionSeats - needed,
      message: `🏛️ VICTORY! Your coalition has ${coalitionSeats} seats — a clear majority of ${coalitionSeats - needed} above the ${needed}-seat threshold. You will form the next government of Thailand!`
    };
  } else {
    campaignState.gameResult = "opposition";
    return {
      result: "opposition",
      seats: coalitionSeats,
      needed: needed,
      deficit: needed - coalitionSeats,
      message: `📉 DEFEAT. Your coalition has only ${coalitionSeats} seats — ${needed - coalitionSeats} short of the ${needed}-seat majority. You are banished to the opposition benches.`
    };
  }
}

/**
 * WIN: Redirect to the governing module
 * Stores election results in sessionStorage for the main-game to consume
 */
function winGame() {
  // Package election data for the governing module
  const handoff = {
    electionYear: campaignState.electionYear,
    playerPartyId: campaignState.playerPartyId,
    coalitionPartners: campaignState.coalitionPartners,
    totalSeats: { ...campaignState.totalSeats },
    coalitionSeats: campaignState.coalitionSeats,
    constituencySeats: { ...campaignState.constituencySeats },
    partyListSeats: { ...campaignState.partyListSeats },
    playerScrutiny: campaignState.playerScrutiny,
    timestamp: Date.now()
  };

  try {
    sessionStorage.setItem("tps_election_handoff", JSON.stringify(handoff));
  } catch (e) {
    console.warn("Could not save handoff data:", e);
  }

  // Redirect to the governing module
  window.location.href = "../main-game/index.html";
}

/**
 * LOSS: Fast-forward 4 years, reset campaign, loop back to Week 1
 * The player becomes opposition for one term, then tries again
 */
function becomeOpposition() {
  // Fast-forward election year by 4
  const newYear = campaignState.electionYear + 4;

  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "opposition",
    message: `Entered opposition. Fast-forwarding to ${newYear} election...`
  });

  // Reset campaign state but keep party choice
  const playerPartyId = campaignState.playerPartyId;
  initCampaignState(playerPartyId);

  // Set new election year
  campaignState.electionYear = newYear;

  // Slightly randomize party stats for the new cycle
  CAMPAIGN_PARTIES.forEach(p => {
    const drift = (Math.random() - 0.5) * 8;
    campaignState.nationalPollShare[p.id] = clampVal(
      campaignState.nationalPollShare[p.id] + drift, 5, 45
    );
  });

  // Regenerate all MP rosters for the new election
  generateAllPartyMPs();

  // Reset all district campaign data
  DISTRICTS.forEach(d => {
    d.banYaiBonus = 0;
    d.banYaiOwner = null;
    d.campaignBuffs = { rally: 0, canvass: 0, io: 0, infrastructure: 0, policy: 0 };
    d.isTargeted = false;
    d.visitCount = 0;
  });

  return {
    newYear: newYear,
    message: `It is now ${newYear}. A new election campaign begins. You have 8 weeks to win ${MAJORITY_THRESHOLD} seats.`
  };
}


// ──────────────────────────────────────────────────────────────────
// SECTION 5: ELECTION SUMMARY HELPERS
// ──────────────────────────────────────────────────────────────────

/**
 * Returns a formatted summary of election results
 */
function getElectionSummary() {
  if (!campaignState.electionResults) return null;
  const r = campaignState.electionResults;

  return CAMPAIGN_PARTIES.map(p => ({
    partyId: p.id,
    partyName: p.name,
    shortName: p.shortName,
    color: p.color,
    constituencySeats: r.constituency[p.id].seats,
    partyListSeats: r.partyList[p.id].seats,
    totalSeats: r.total[p.id],
    partyListVotes: r.partyList[p.id].votes,
    banYaiPenalty: Math.round(r.banYaiPenalties[p.id]),
    isPlayer: p.id === campaignState.playerPartyId,
    inCoalition: campaignState.coalitionPartners.includes(p.id) || p.id === campaignState.playerPartyId
  })).sort((a, b) => b.totalSeats - a.totalSeats);
}

/**
 * Gets the top contested districts (closest margins)
 */
function getContestedDistricts(limit = 20) {
  if (!campaignState.electionResults) return [];
  return campaignState.electionResults.districtDetails
    .sort((a, b) => a.margin - b.margin)
    .slice(0, limit);
}

/**
 * Gets districts won by a specific party
 */
function getDistrictsWonByParty(partyId) {
  if (!campaignState.electionResults) return [];
  return campaignState.electionResults.districtDetails
    .filter(d => d.winner === partyId);
}


console.log("[campaign/engine.js] Loaded successfully.");
console.log("  → Election engine ready (400 constituency + 100 party-list)");
console.log("  → Coalition phase with 18 ministries");
console.log("  → Win/Loss loop: 251-seat majority threshold");
