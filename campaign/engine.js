// ═══════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /campaign/engine.js
// Election Engine: Constituency + Party-List Math, Coalition, Win/Loss
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// UTILITY
// ──────────────────────────────────────────────────────────────────

function clampVal(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * getDiffScale() — Returns difficulty multipliers from TPSGlobalState.
 * All game mechanics reference this to adjust costs, gains, and AI behavior.
 *
 *   costMult:     Multiplies action costs (rally/IO/banYai)
 *   scrutinyMult: Multiplies scrutiny gains on player actions
 *   fundsReturnMult: Multiplies fundraise returns
 *   aiIntensity:  Multiplies AI campaign target count
 *   lobbyChanceMult: Multiplies lobbyist event trigger %
 *   electionScrutinyMult: Scrutiny penalty amplifier in election math
 */
function getDiffScale() {
  const d = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal';
  const scales = {
    easy:   { costMult: 0.75, scrutinyMult: 0.6,  fundsReturnMult: 1.4, aiIntensity: 0.7, lobbyChanceMult: 0.7, electionScrutinyMult: 0.5 },
    normal: { costMult: 1.0,  scrutinyMult: 1.0,  fundsReturnMult: 1.0, aiIntensity: 1.0, lobbyChanceMult: 1.0, electionScrutinyMult: 1.0 },
    hard:   { costMult: 1.35, scrutinyMult: 1.6,  fundsReturnMult: 0.7, aiIntensity: 1.5, lobbyChanceMult: 1.5, electionScrutinyMult: 1.8 }
  };
  return scales[d] || scales.normal;
}

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
  const ds = getDiffScale();
  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === campaignState.playerPartyId) return;

    // AI picks random districts weighted by their regional strength
    // Difficulty scales AI aggressiveness: more targets on hard
    const targetCount = Math.round((3 + Math.floor(Math.random() * 5)) * ds.aiIntensity);
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
 * Small random drift in national polls each week.
 * STEP 55: Also applies natural scrutiny decay (-2/week)
 */
function applyPollDrift() {
  CAMPAIGN_PARTIES.forEach(party => {
    const drift = (Math.random() - 0.5) * 2;
    campaignState.nationalPollShare[party.id] = Math.max(3,
      campaignState.nationalPollShare[party.id] + drift
    );
  });
  // Normalize to 100 (uses shared helper)
  _normalizePolls();

  // STEP 55: Natural scrutiny decay — media attention fades over time
  if (campaignState.playerScrutiny > 0) {
    campaignState.playerScrutiny = Math.max(0, campaignState.playerScrutiny - 2);
  }
}

// ── Player campaign actions ─────────────────────────────────────

/**
 * Player holds a rally in a province (affects all districts in that province)
 */
function actionRally(provinceId) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const ds = getDiffScale();
  const cost = Math.round(50 * ds.costMult);
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dists = getDistrictsByProvince(provinceId);
  if (dists.length === 0) return { success: false, message: "Province not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(1 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  // DIMINISHING RETURNS: effectiveness drops with repeated visits
  // First visit = full buff, subsequent visits lose 15% each time
  const avgVisits = dists.reduce((sum, d) => sum + d.visitCount, 0) / dists.length;
  const diminishFactor = Math.max(0.25, 1 - (avgVisits * 0.15));
  const baseBuff = 8 + Math.random() * 7;
  const buff = baseBuff * diminishFactor;

  dists.forEach(d => {
    d.campaignBuffs.rally += buff;
    d.visitCount++;
  });

  const prov = getProvinceById(provinceId);
  const diminishNote = diminishFactor < 0.85 ? ` (diminished: ×${diminishFactor.toFixed(2)})` : '';
  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "rally",
    message: `Held rally in ${prov.name} (+${buff.toFixed(1)} buff to ${dists.length} districts, cost ฿${cost}M)${diminishNote}`
  });

  return { success: true, buff, districts: dists.length, province: prov.name, diminishFactor };
}

/**
 * Player runs an IO (Information Operation) campaign targeting a region
 */
function actionIO(region) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const ds = getDiffScale();
  const cost = Math.round(80 * ds.costMult);
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dists = getDistrictsByRegion(region);
  if (dists.length === 0) return { success: false, message: "Region not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(5 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  const party = CAMPAIGN_PARTIES.find(p => p.id === campaignState.playerPartyId);
  const ioMult = (party.ioStrength || 20) / 30;

  // DIMINISHING RETURNS: IO is less effective at high scrutiny
  // Above 40% scrutiny, IO effectiveness drops as media catches on
  const scrutinyPenalty = campaignState.playerScrutiny > 40
    ? Math.max(0.3, 1 - ((campaignState.playerScrutiny - 40) / 100))
    : 1;
  const baseBuff = (5 + Math.random() * 5) * ioMult;
  const buff = baseBuff * scrutinyPenalty;

  dists.forEach(d => { d.campaignBuffs.io += buff; });

  const diminishNote = scrutinyPenalty < 0.95 ? ` (scrutiny penalty: ×${scrutinyPenalty.toFixed(2)})` : '';
  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "io",
    message: `IO campaign in ${REGIONS[region]} (+${buff.toFixed(1)} IO buff, scrutiny +${scrutinyGain}, cost ฿${cost}M)${diminishNote}`
  });

  return { success: true, buff, districts: dists.length, region: REGIONS[region], scrutinyPenalty };
}

/**
 * Player deploys Ban Yai (local boss network) in a specific district
 * HIGH RISK: adds scrutiny, but guarantees strong constituency performance
 */
function actionBanYai(districtId) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const ds = getDiffScale();
  const cost = Math.round(120 * ds.costMult);
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dist = getDistrictById(districtId);
  if (!dist) return { success: false, message: "District not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(10 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  const bonus = 25 + Math.random() * 15;
  dist.banYaiBonus += bonus;
  dist.banYaiOwner = campaignState.playerPartyId;

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "ban_yai",
    message: `Deployed Ban Yai in ${dist.displayName} (+${bonus.toFixed(0)} bonus, scrutiny +${scrutinyGain}, cost ฿${cost}M)`
  });

  return { success: true, bonus, district: dist.displayName };
}

/**
 * STEP 75: Scrutiny-Based Fundraising with Difficulty Scaling
 * Player fundraises — yield is penalized by EC Scrutiny.
 * High scrutiny = donors are scared = less money.
 *
 * Formula:
 *   baseFundraise = 100 + random(0-50)  (in millions ฿)
 *   scrutinyPenalty = floor(ecScrutiny × diffMultiplier)
 *     Easy:   diffMultiplier = 0.5  (mild penalty)
 *     Normal: diffMultiplier = 1.0  (standard)
 *     Hard:   diffMultiplier = 1.5  (brutal penalty)
 *   finalYield = max(10, baseFundraise - scrutinyPenalty) × fundsReturnMult
 *
 * At 80% scrutiny on Hard: penalty = 80 × 1.5 = 120 → yield = max(10, ...) = 10M฿
 * At 20% scrutiny on Easy: penalty = 20 × 0.5 = 10  → yield ≈ 130M฿
 */
function actionFundraise() {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };

  const ds = getDiffScale();

  // ── 1. Calculate difficulty multiplier for scrutiny penalty ──
  const diff = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal';
  let diffMultiplier = 1.0;
  if (diff === 'easy') diffMultiplier = 0.5;
  if (diff === 'hard') diffMultiplier = 1.5;

  // ── 2. Calculate base yield ──
  const baseFundraise = 100 + Math.floor(Math.random() * 50);

  // ── 3. Apply scrutiny penalty ──
  const scrutiny = campaignState.playerScrutiny || 0;
  const scrutinyPenalty = Math.floor(scrutiny * diffMultiplier);

  // ── 4. Final yield (floor of 10M฿, then scaled by difficulty return mult) ──
  const rawYield = Math.max(10, baseFundraise - scrutinyPenalty);
  const finalYield = Math.round(rawYield * ds.fundsReturnMult);

  // ── 5. Apply ──
  campaignState.playerFunds += finalYield;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(2 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  // ── 6. Build result message ──
  let msg = `💵 Fundraising raised ฿${finalYield}M`;
  const trustPenaltyApplied = scrutinyPenalty > 0;
  if (trustPenaltyApplied) {
    msg += ` (Trust penalty: -฿${scrutinyPenalty}M due to ${scrutiny}% scrutiny)`;
  }
  msg += ` · Scrutiny +${scrutinyGain}%`;

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "fundraise",
    message: msg
  });

  // STEP 73: Persist shared stats
  _syncStatsToStorage();

  console.log(`[campaign/engine.js] STEP 75 — Fundraise: base=${baseFundraise}, penalty=${scrutinyPenalty} (×${diffMultiplier}), final=${finalYield}M฿`);

  return {
    success: true,
    amount: finalYield,
    baseFundraise,
    scrutinyPenalty,
    diffMultiplier,
    trustPenaltyApplied,
    message: msg
  };
}


// ══════════════════════════════════════════════════════════════════
// STEP 54: EXPANDED CAMPAIGN ACTION DATA & DISPATCHER
// 9 political tactics — each with bilingual labels, costs, effects,
// RNG mechanics, and Zero-Sum poll integration.
// ══════════════════════════════════════════════════════════════════

/**
 * CAMPAIGN_ACTIONS — Master data for all 9 grid actions.
 * Legacy actions (rally, banyai, fundraise) still use their dedicated functions.
 * New actions route through executeAction().
 */
const CAMPAIGN_ACTIONS = {
  // ── Row 1: Core (legacy handlers) ──
  rally: {
    id: "rally",
    label: "Hold Rally", labelThai: "ปราศรัยใหญ่",
    icon: "📢",
    costFunds: 50, costAP: 1, costCapital: 0,
    scrutinyGain: 1,
    needsTarget: "province",
    description: "Hold a massive rally in a province to boost local popularity.",
    descThai: "จัดปราศรัยใหญ่ในจังหวัดเพื่อเพิ่มคะแนนนิยมท้องถิ่น"
  },
  banyai: {
    id: "banyai",
    label: "Deploy Ban Yai", labelThai: "ระดมบ้านใหญ่",
    icon: "🏘️",
    costFunds: 120, costAP: 1, costCapital: 0,
    scrutinyGain: 10,
    needsTarget: "district",
    description: "Deploy local boss networks. Massive local boost but extreme scrutiny.",
    descThai: "ส่งเครือข่ายบ้านใหญ่ลงพื้นที่ คะแนนพุ่ง แต่ กกต. จับตา"
  },
  fundraise: {
    id: "fundraise",
    label: "Fundraise", labelThai: "ระดมทุน",
    icon: "💵",
    costFunds: 0, costAP: 1, costCapital: 0,
    scrutinyGain: 2,
    needsTarget: null,
    description: "Hold fundraising events. Yield reduced by EC Scrutiny — clean campaigns raise more.",
    descThai: "จัดงานระดมทุน — ยิ่ง กกต. จับตามาก ยิ่งระดมทุนได้น้อย"
  },

  // ── Row 2: New Strategic Actions ──
  io_smear: {
    id: "io_smear",
    label: "IO Smear Campaign", labelThai: "ปล่อยข่าวสาดโคลน",
    icon: "🐍",
    costFunds: 80, costAP: 1, costCapital: 0,
    scrutinyGain: 10,
    needsTarget: "rival_party",
    description: "Launch disinformation campaign to smear a rival party. High risk.",
    descThai: "ปล่อย IO โจมตีพรรคคู่แข่ง เสี่ยงสูง กกต. จ้องจับ",
    effects: {
      rivalPollDrop: 1,       // -1% to target rival's national poll (nerfed from 2)
      scrutinyAdd: 10         // +10% EC_Scrutiny
    }
  },
  tv_debate: {
    id: "tv_debate",
    label: "Televised Debate", labelThai: "ดีเบตระดับชาติ",
    icon: "📺",
    costFunds: 0, costAP: 1, costCapital: 5,
    scrutinyGain: 0,
    needsTarget: null,
    description: "60% chance: +1.5% National Poll. 40% chance: -1% (blunder).",
    descThai: "60% โอกาสสำเร็จ: +1.5% คะแนนนิยม / 40% พลาด: -1%",
    effects: {
      successChance: 0.60,
      successPollGain: 1.5,
      failPollLoss: 1
    }
  },
  grassroots_relief: {
    id: "grassroots_relief",
    label: "Grassroots Relief", labelThai: "ลงพื้นที่แจกของ",
    icon: "🎁",
    costFunds: 80, costAP: 1, costCapital: 0,
    scrutinyGain: 3,
    needsTarget: null,
    description: "Distribute relief goods. Solid local boost + 20% EC complaint risk.",
    descThai: "แจกของในพื้นที่ คะแนนพุ่ง แต่มีโอกาส 20% ที่ฝ่ายตรงข้ามร้องเรียน กกต.",
    effects: {
      localBoost: 12,
      ecComplaintChance: 0.20,
      ecComplaintScrutiny: 8
    }
  },
  ec_petition: {
    id: "ec_petition",
    label: "File EC Petition", labelThai: "ยื่นร้องเรียน กกต.",
    icon: "⚖️",
    costFunds: 0, costAP: 1, costCapital: 8,
    scrutinyGain: 0,
    needsTarget: null,
    description: "File a formal complaint. 50% chance to freeze a rival's poll growth for 1 week.",
    descThai: "ยื่นร้องเรียน กกต. 50% โอกาสแช่แข็งคะแนนคู่แข่ง 1 สัปดาห์",
    effects: {
      freezeChance: 0.50,
      freezeDuration: 1    // weeks
    }
  },

  // ── Row 3: Economy & Media ──
  media_tour: {
    id: "media_tour",
    label: "Media Tour", labelThai: "ทัวร์สื่อ",
    icon: "🎥",
    costFunds: 40, costAP: 1, costCapital: 0,
    scrutinyGain: 2,
    needsTarget: null,
    description: "National media blitz. +0.75% to national poll share.",
    descThai: "บุกสื่อระดับชาติ +0.75% คะแนนนิยมแห่งชาติ",
    effects: {
      pollGain: 0.75
    }
  },
  commission_poll: {
    id: "commission_poll",
    label: "Commission Poll", labelThai: "จ้างโพลสำรวจ",
    icon: "📊",
    costFunds: 30, costAP: 1, costCapital: 0,
    scrutinyGain: 0,
    needsTarget: null,
    description: "Reveal hidden rival data. Shows true poll margins for 1 week.",
    descThai: "เปิดเผยข้อมูลคู่แข่ง แสดงคะแนนจริง 1 สัปดาห์",
    effects: {
      revealRivalData: true,
      smallPollBoost: 0.25  // tiny accuracy bonus (nerfed from 0.5)
    }
  }
};

/**
 * executeAction() — Central dispatcher for STEP 54+ campaign actions.
 * Validates costs, applies effects, updates polls via Zero-Sum, logs results.
 *
 * @param {string} actionId — Key from CAMPAIGN_ACTIONS
 * @param {string} [target] — Optional target (rival party ID, province, etc.)
 * @returns {Object} { success, message, effects }
 */
function executeAction(actionId, target) {
  const action = CAMPAIGN_ACTIONS[actionId];
  if (!action) return { success: false, message: `Unknown action: "${actionId}"` };

  const ds = getDiffScale();
  const pid = campaignState.playerPartyId;

  // ── Validate AP ──
  if (campaignState.actionPointsRemaining < action.costAP) {
    return { success: false, message: "No action points remaining." };
  }

  // ── Validate Funds ──
  const fundsCost = Math.round((action.costFunds || 0) * ds.costMult);
  if (campaignState.playerFunds < fundsCost) {
    return { success: false, message: `Insufficient funds. Need ฿${fundsCost}M.` };
  }

  // ── Validate Political Capital (uses scrutiny as proxy if no capital stat) ──
  // Capital is deducted from funds as a prestige cost
  const capitalCost = action.costCapital || 0;

  // ── Deduct costs ──
  campaignState.playerFunds -= fundsCost;
  campaignState.actionPointsRemaining -= action.costAP;
  const scrutinyGain = Math.round((action.scrutinyGain || 0) * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  // ── Execute action-specific logic ──
  let resultMsg = '';
  const appliedEffects = {};

  switch (actionId) {

    // ════════════════════════════════════════════════
    // IO SMEAR CAMPAIGN — Targets a rival's polls
    // ════════════════════════════════════════════════
    case 'io_smear': {
      const rivalId = target;
      const rival = CAMPAIGN_PARTIES.find(p => p.id === rivalId);
      if (!rival) return { success: false, message: "Invalid rival target." };

      const drop = action.effects.rivalPollDrop;
      const oldPoll = campaignState.nationalPollShare[rivalId] || 15;
      campaignState.nationalPollShare[rivalId] = Math.max(3, oldPoll - drop);
      // Zero-sum: player gains half of what rival loses
      campaignState.nationalPollShare[pid] = Math.min(50,
        (campaignState.nationalPollShare[pid] || 20) + Math.round(drop * 0.5));
      _normalizePolls();

      appliedEffects.rivalDrop = drop;
      appliedEffects.targetParty = rival.shortName;
      resultMsg = `🐍 IO Smear vs ${rival.shortName}: -${drop}% polls! (Scrutiny +${scrutinyGain}%)`;
      break;
    }

    // ════════════════════════════════════════════════
    // TELEVISED DEBATE — 60/40 RNG gamble
    // ════════════════════════════════════════════════
    case 'tv_debate': {
      const roll = Math.random();
      if (roll < action.effects.successChance) {
        // SUCCESS
        const gain = action.effects.successPollGain;
        campaignState.nationalPollShare[pid] = Math.min(50,
          (campaignState.nationalPollShare[pid] || 20) + gain);
        _normalizePolls();
        appliedEffects.pollChange = `+${gain}%`;
        appliedEffects.outcome = 'success';
        resultMsg = `📺 TV Debate WIN! +${gain}% national polls! The crowd loved it.`;
      } else {
        // FAIL — blunder
        const loss = action.effects.failPollLoss;
        campaignState.nationalPollShare[pid] = Math.max(3,
          (campaignState.nationalPollShare[pid] || 20) - loss);
        _normalizePolls();
        appliedEffects.pollChange = `-${loss}%`;
        appliedEffects.outcome = 'fail';
        resultMsg = `📺 TV Debate BLUNDER! -${loss}% national polls. An embarrassing gaffe went viral.`;
      }
      break;
    }

    // ════════════════════════════════════════════════
    // GRASSROOTS RELIEF — Local boost + EC complaint risk
    // ════════════════════════════════════════════════
    case 'grassroots_relief': {
      const boost = action.effects.localBoost;
      // Apply to random districts
      const shuffled = shuffleArray(DISTRICTS);
      const count = Math.min(15, shuffled.length);
      for (let i = 0; i < count; i++) {
        shuffled[i].campaignBuffs.rally += boost;
      }
      appliedEffects.districtsBuffed = count;
      appliedEffects.boost = boost;
      resultMsg = `🎁 Grassroots Relief: +${boost} buff to ${count} districts.`;

      // 20% EC complaint risk
      if (Math.random() < action.effects.ecComplaintChance) {
        const extraScrutiny = Math.round(action.effects.ecComplaintScrutiny * ds.scrutinyMult);
        campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + extraScrutiny);
        appliedEffects.ecComplaint = true;
        resultMsg += ` ⚠️ Opposition filed an EC complaint! (+${extraScrutiny}% scrutiny)`;
      }
      break;
    }

    // ════════════════════════════════════════════════
    // FILE EC PETITION — Freeze rival poll growth
    // ════════════════════════════════════════════════
    case 'ec_petition': {
      const roll = Math.random();
      if (roll < action.effects.freezeChance) {
        // Pick the leading rival
        const rivals = CAMPAIGN_PARTIES
          .filter(p => p.id !== pid)
          .sort((a, b) => (campaignState.nationalPollShare[b.id] || 0) - (campaignState.nationalPollShare[a.id] || 0));
        const topRival = rivals[0];
        if (topRival) {
          // Freeze: drop their poll by 1% as a penalty
          campaignState.nationalPollShare[topRival.id] = Math.max(3,
            (campaignState.nationalPollShare[topRival.id] || 15) - 1);
          _normalizePolls();
          appliedEffects.frozenParty = topRival.shortName;
          appliedEffects.outcome = 'success';
          resultMsg = `⚖️ EC Petition SUCCESS! ${topRival.shortName} under investigation. -1% polls, growth frozen.`;
        }
      } else {
        appliedEffects.outcome = 'fail';
        resultMsg = `⚖️ EC Petition dismissed. Insufficient evidence. Capital wasted.`;
      }
      break;
    }

    // ════════════════════════════════════════════════
    // MEDIA TOUR — Steady national poll boost
    // ════════════════════════════════════════════════
    case 'media_tour': {
      const gain = action.effects.pollGain;
      campaignState.nationalPollShare[pid] = Math.min(50,
        (campaignState.nationalPollShare[pid] || 20) + gain);
      _normalizePolls();
      appliedEffects.pollGain = gain;
      resultMsg = `🎥 Media Tour: +${gain}% national polls. Coverage on 5 major networks.`;
      break;
    }

    // ════════════════════════════════════════════════
    // COMMISSION POLL — Intelligence gathering
    // ════════════════════════════════════════════════
    case 'commission_poll': {
      const boost = action.effects.smallPollBoost;
      campaignState.nationalPollShare[pid] = Math.min(50,
        (campaignState.nationalPollShare[pid] || 20) + boost);
      _normalizePolls();

      // Build rival intelligence string
      const rivals = CAMPAIGN_PARTIES
        .filter(p => p.id !== pid)
        .sort((a, b) => (campaignState.nationalPollShare[b.id] || 0) - (campaignState.nationalPollShare[a.id] || 0));
      const intel = rivals.map(r =>
        `${r.shortName}: ${campaignState.nationalPollShare[r.id] || 0}%`
      ).join(' | ');

      appliedEffects.revealedData = true;
      appliedEffects.intel = intel;
      resultMsg = `📊 Poll Results: ${intel}. Your edge: +${boost}% accuracy bonus.`;
      break;
    }

    default:
      return { success: false, message: `Action "${actionId}" not implemented in engine.` };
  }

  // ── Log to campaign log ──
  campaignState.campaignLog.push({
    week: campaignState.currentWeek || CampaignCalendar?.getWeek() || 1,
    type: actionId,
    message: resultMsg
  });

  console.log(`[campaign/engine.js] STEP 54 — ${resultMsg}`);

  // ── STEP 57: EC Guillotine check ──
  const guillotine = evaluateScrutiny();

  // STEP 73: Persist shared stats to localStorage
  _syncStatsToStorage();

  return {
    success: true,
    message: resultMsg,
    effects: appliedEffects,
    action: action,
    ecGuillotine: guillotine  // null if safe, penalty object if triggered
  };
}

/**
 * _normalizePolls() — Ensures all national poll shares sum to 100%.
 * Called after any action that modifies poll shares (Zero-Sum enforcement).
 * STEP 72: Uses 1-decimal precision to preserve fractional poll values.
 * @private
 */
function _normalizePolls() {
  let total = 0;
  CAMPAIGN_PARTIES.forEach(p => {
    total += campaignState.nationalPollShare[p.id] || 0;
  });
  if (total <= 0) return;

  // Normalize with 1-decimal precision
  CAMPAIGN_PARTIES.forEach(p => {
    campaignState.nationalPollShare[p.id] =
      Math.round(((campaignState.nationalPollShare[p.id] || 0) / total * 100) * 10) / 10;
  });

  // Fix floating-point drift — adjust the largest party
  let newTotal = 0;
  let largestId = null;
  let largestVal = -1;
  CAMPAIGN_PARTIES.forEach(p => {
    const val = campaignState.nationalPollShare[p.id] || 0;
    newTotal += val;
    if (val > largestVal) { largestVal = val; largestId = p.id; }
  });
  const drift = Math.round((100 - newTotal) * 10) / 10;
  if (drift !== 0 && largestId) {
    campaignState.nationalPollShare[largestId] += drift;
  }
}


// ══════════════════════════════════════════════════════════════════
// STEP 74: CRITICAL LOW STAT PENALTIES — checkStatPenalties()
// Punishes the player for neglecting core resources.
// Called once per day in advanceCampaignDay().
// ══════════════════════════════════════════════════════════════════

/**
 * checkStatPenalties() — Evaluates player stats and applies minor
 * daily penalties when resources hit critical lows.
 *
 * Thresholds (using STEP 71 nerfed scale):
 *   Funds = 0:           -0.5% national polls (can't run ground ops)
 *   Political Capital < 15: -0.5% national polls (internal conflicts leak)
 *   Local Popularity < 15:  -1.0% national polls (Ban Yai defection threats)
 *
 * @returns {Array} Array of penalty objects, empty if no penalties triggered
 */
function checkStatPenalties() {
  if (!campaignState) return [];

  const penalties = [];
  const pid = campaignState.playerPartyId;

  // ── 1. Funds Depleted ──
  if (campaignState.playerFunds <= 0) {
    const pollHit = 0.5;
    campaignState.nationalPollShare[pid] = Math.max(3,
      (campaignState.nationalPollShare[pid] || 20) - pollHit);
    _normalizePolls();

    penalties.push({
      type: 'funds_depleted',
      pollLoss: pollHit,
      icon: '💸',
      message: `💸 Funds depleted! Campaign momentum stalls. Polls -${pollHit}%`,
      messageTH: `💸 เงินหมด! แคมเปญชะงัก คะแนนนิยม -${pollHit}%`
    });

    campaignState.campaignLog.push({
      week: campaignState.currentWeek,
      type: 'stat_penalty',
      message: `💸 Funds depleted! National Polls -${pollHit}%`
    });
  }

  // ── 2. Low Political Capital ──
  if ((campaignState.politicalCapital || 0) < 15) {
    const pollHit = 0.5;
    campaignState.nationalPollShare[pid] = Math.max(3,
      (campaignState.nationalPollShare[pid] || 20) - pollHit);
    _normalizePolls();

    penalties.push({
      type: 'low_capital',
      pollLoss: pollHit,
      icon: '🏛️',
      message: `🏛️ Low Political Capital: Party infighting leaks to press. Polls -${pollHit}%`,
      messageTH: `🏛️ ทุนการเมืองต่ำ: ความขัดแย้งภายในพรรคหลุดสู่สื่อ คะแนนนิยม -${pollHit}%`
    });

    campaignState.campaignLog.push({
      week: campaignState.currentWeek,
      type: 'stat_penalty',
      message: `🏛️ Low Political Capital — internal conflicts leak to press. Polls -${pollHit}%`
    });
  }

  // ── 3. Low Local Popularity ──
  if ((campaignState.localPopularity || 0) < 15) {
    const pollHit = 1.0;
    campaignState.nationalPollShare[pid] = Math.max(3,
      (campaignState.nationalPollShare[pid] || 20) - pollHit);
    _normalizePolls();

    penalties.push({
      type: 'low_local_pop',
      pollLoss: pollHit,
      icon: '🏘️',
      message: `🏘️ Low Local Popularity: Ban Yai factions threatening defection! Polls -${pollHit}%`,
      messageTH: `🏘️ คะแนนนิยมท้องถิ่นต่ำ: บ้านใหญ่ขู่ย้ายพรรค! คะแนนนิยม -${pollHit}%`
    });

    campaignState.campaignLog.push({
      week: campaignState.currentWeek,
      type: 'stat_penalty',
      message: `🏘️ Low Local Popularity — Ban Yai factions threatening defection! Polls -${pollHit}%`
    });
  }

  if (penalties.length > 0) {
    console.log(`[campaign/engine.js] STEP 74 — ${penalties.length} stat penalty/ies triggered:`);
    penalties.forEach(p => console.log(`  ${p.message}`));
  }

  return penalties;
}

// ══════════════════════════════════════════════════════════════════
// STEP 57: THE EC GUILLOTINE — evaluateScrutiny()
// If EC Scrutiny hits 100%, the Election Commission drops the hammer.
// ══════════════════════════════════════════════════════════════════

/**
 * evaluateScrutiny() — Called after every action and day advance.
 * Checks if scrutiny has reached 100% (the "EC Red Line").
 * If triggered, applies catastrophic penalties:
 *
 *   1. Scrutiny reset to 50%
 *   2. -200M฿ legal fees
 *   3. -5% player national polls → redistributed to rivals (Zero-Sum)
 *   4. Logs the event in campaign log
 *
 * @returns {Object|null} — Penalty result if triggered, null if safe
 */
function evaluateScrutiny() {
  if (!campaignState || campaignState.playerScrutiny < 100) return null;

  console.log('[campaign/engine.js] ⚠⚠⚠ EC GUILLOTINE TRIGGERED ⚠⚠⚠');

  const ds = getDiffScale();
  const pid = campaignState.playerPartyId;
  const playerParty = CAMPAIGN_PARTIES.find(p => p.id === pid);
  const appliedPenalties = {};

  // ── 1. Reset scrutiny to 50% ──
  campaignState.playerScrutiny = 50;
  appliedPenalties.scrutinyReset = 50;

  // ── 2. Deduct legal fees (scaled by difficulty) ──
  const legalFees = Math.round(200 * ds.costMult);
  campaignState.playerFunds = Math.max(0, campaignState.playerFunds - legalFees);
  appliedPenalties.legalFees = legalFees;

  // ── 3. -5% player polls → distributed to rivals (Zero-Sum) ──
  const pollPenalty = 2.5; // STEP 71: nerfed from 5
  const oldPoll = campaignState.nationalPollShare[pid] || 20;
  campaignState.nationalPollShare[pid] = Math.max(3, oldPoll - pollPenalty);
  appliedPenalties.pollLoss = pollPenalty;

  // Distribute the lost polls evenly to rival parties
  const rivals = CAMPAIGN_PARTIES.filter(p => p.id !== pid);
  const perRivalGain = Math.round(pollPenalty / rivals.length);
  rivals.forEach(r => {
    campaignState.nationalPollShare[r.id] = Math.min(50,
      (campaignState.nationalPollShare[r.id] || 10) + perRivalGain);
  });
  _normalizePolls();

  // ── 4. Log the catastrophic event ──
  const week = campaignState.currentWeek || (typeof CampaignCalendar !== 'undefined' ? CampaignCalendar.getWeek() : 1);
  campaignState.campaignLog.push({
    week: week,
    type: 'ec_guillotine',
    message: `🚨 EC RED FLAG! ใบเหลือง กกต.! Party investigated — Lost ฿${legalFees}M in legal fees, -${pollPenalty}% national polls. Scrutiny reset to 50%.`
  });

  console.log(`[campaign/engine.js] EC Guillotine: -${legalFees}M฿, -${pollPenalty}% polls, scrutiny → 50%`);

  return {
    triggered: true,
    penalties: appliedPenalties,
    titleEN: 'EC Red Flag! — ใบเหลือง!',
    titleTH: 'กกต. แจกใบเหลือง!',
    messageEN: `Your party is under heavy investigation for campaign violations! The Election Commission has imposed sanctions.\n\n• Legal Fees: -฿${legalFees}M\n• National Polls: -${pollPenalty}%\n• Rival parties gain your lost support\n• Scrutiny reset to 50%`,
    messageTH: `พรรคของคุณถูกสอบสวนหนักจากการทำผิดกฎเลือกตั้ง! กกต. สั่งลงโทษแล้ว\n\n• ค่าทนายความ: -฿${legalFees} ล้าน\n• คะแนนนิยม: -${pollPenalty}%\n• พรรคคู่แข่งได้คะแนนที่สูญเสีย\n• ค่าจับตา กกต. ลดเหลือ 50%`,
    icon: '🚨'
  };
}


// ── Lobbyist Random Events (NEW — Part 2) ────────────────────────

/**
 * LOBBYIST_EVENTS — Random events that can trigger each day.
 * Lobbyists offer deals: funds in exchange for scrutiny, or
 * opportunities that cost money but reduce scrutiny.
 */
const LOBBYIST_EVENTS = [
  {
    id: "tycoon_donation",
    title: "🏗️ Tycoon Donation Offer",
    description: "A real estate mogul offers a generous campaign donation. The media may notice.",
    choices: [
      { label: "Accept the donation", effects: { funds: 200, scrutiny: 8 }, risk: "High scrutiny" },
      { label: "Decline politely", effects: { funds: 0, scrutiny: -2 }, risk: "None" }
    ]
  },
  {
    id: "media_interview",
    title: "📺 Prime-Time Interview Invitation",
    description: "A major TV network offers a live interview slot. Great exposure, but risky.",
    choices: [
      { label: "Accept the interview", effects: { pollBoost: 1.5, scrutiny: 5 }, risk: "Scrutiny increase" },
      { label: "Send a deputy instead", effects: { pollBoost: 0.5, scrutiny: 0 }, risk: "Smaller impact" }
    ]
  },
  {
    id: "grassroots_surge",
    title: "✊ Grassroots Volunteer Surge",
    description: "A wave of enthusiastic volunteers offers to help your campaign for free.",
    choices: [
      { label: "Deploy them in key provinces", effects: { rallyBoost: 12, funds: -20 }, risk: "Small cost" },
      { label: "Hold a coordinated rally", effects: { rallyBoost: 8, scrutiny: 2 }, risk: "Media attention" }
    ]
  },
  {
    id: "scandal_rumor",
    title: "⚠️ Opposition Scandal Leak",
    description: "An informant offers evidence of corruption in a rival party. Using it is risky.",
    choices: [
      { label: "Leak it to the press", effects: { rivalPenalty: 5, scrutiny: 10 }, risk: "Extreme scrutiny" },
      { label: "File it for later", effects: { scrutiny: 0 }, risk: "None" }
    ]
  },
  {
    id: "ec_warning",
    title: "🔍 EC Compliance Warning",
    description: "The Election Commission flags irregularities in your finance reports.",
    choices: [
      { label: "Hire forensic accountants", effects: { funds: -80, scrutiny: -10 }, risk: "Costly" },
      { label: "Ignore and hope for the best", effects: { scrutiny: 15 }, risk: "Very high scrutiny" }
    ]
  }
];

/**
 * rollLobbyistEvent() — Called each day. Has a chance to trigger
 * a random lobbyist event.
 *
 * @param {number} triggerChance — % chance per day (default: 20%)
 * @returns {Object|null} Event object if triggered, null otherwise
 */
function rollLobbyistEvent(triggerChance = 20) {
  const ds = getDiffScale();
  const adjustedChance = triggerChance * ds.lobbyChanceMult;
  if (Math.random() * 100 > adjustedChance) return null;

  const event = LOBBYIST_EVENTS[Math.floor(Math.random() * LOBBYIST_EVENTS.length)];
  console.log(`[campaign/engine.js] Lobbyist event triggered: ${event.title} (chance: ${adjustedChance.toFixed(0)}%)`);
  return { ...event };
}

/**
 * applyLobbyistChoice() — Applies the effects of a lobbyist event choice.
 *
 * @param {Object} choice — The choice object from LOBBYIST_EVENTS
 * @returns {Object} Result with applied effects
 */
function applyLobbyistChoice(choice) {
  if (!choice || !choice.effects) return { error: "Invalid choice." };

  const effects = choice.effects;
  const results = {};

  if (effects.funds) {
    campaignState.playerFunds += effects.funds;
    results.funds = effects.funds;
  }
  if (effects.scrutiny) {
    campaignState.playerScrutiny = clampVal(campaignState.playerScrutiny + effects.scrutiny, 0, 100);
    results.scrutiny = effects.scrutiny;
  }
  if (effects.pollBoost) {
    const pid = campaignState.playerPartyId;
    campaignState.nationalPollShare[pid] = Math.min(50,
      (campaignState.nationalPollShare[pid] || 20) + effects.pollBoost);
    _normalizePolls();  // STEP 55: Zero-Sum enforcement
    results.pollBoost = effects.pollBoost;
  }
  if (effects.rallyBoost) {
    const shuffled = shuffleArray(DISTRICTS);
    const count = Math.min(10, shuffled.length);
    for (let i = 0; i < count; i++) {
      shuffled[i].campaignBuffs.rally += effects.rallyBoost;
    }
    results.rallyBoost = effects.rallyBoost;
  }
  if (effects.rivalPenalty) {
    const rivals = CAMPAIGN_PARTIES.filter(p => p.id !== campaignState.playerPartyId);
    const target = rivals[Math.floor(Math.random() * rivals.length)];
    if (target) {
      campaignState.nationalPollShare[target.id] = Math.max(3,
        (campaignState.nationalPollShare[target.id] || 15) - effects.rivalPenalty);
      _normalizePolls();  // STEP 55: Zero-Sum enforcement
      results.rivalPenalty = { target: target.shortName, amount: effects.rivalPenalty };
    }
  }

  // STEP 55: Human-readable log instead of raw JSON
  const logParts = [];
  if (results.funds) logParts.push(`${results.funds > 0 ? '+' : ''}${results.funds}M฿`);
  if (results.scrutiny) logParts.push(`Scrutiny ${results.scrutiny > 0 ? '+' : ''}${results.scrutiny}%`);
  if (results.pollBoost) logParts.push(`Polls +${results.pollBoost}%`);
  if (results.rallyBoost) logParts.push(`Rally +${results.rallyBoost}`);
  if (results.rivalPenalty) logParts.push(`${results.rivalPenalty.target} -${results.rivalPenalty.amount}%`);

  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "lobbyist",
    message: `🤝 ${choice.label}: ${logParts.join(' · ') || 'No effect'}`
  });

  // STEP 73: Persist shared stats to localStorage
  _syncStatsToStorage();

  return { success: true, applied: results };
}

// ──────────────────────────────────────────────────────────────────
// SECTION 1B: calculatePerformanceIndex()  (STEP 68)
// Computes the "Campaign Performance Index" for the 50/50 algorithm.
//   - Player score: capital + funds + local popularity − scrutiny penalty
//   - AI scores:    based on their poll share × random quality (0.7–1.3)
//   - All scores normalized to sum = 100%
// ──────────────────────────────────────────────────────────────────

/**
 * Calculates the Campaign Performance Index for all parties.
 * This feeds into the 50/50 election algorithm (50% polls + 50% performance).
 *
 * @returns {{
 *   playerRaw: number,
 *   playerShare: number,
 *   aiShares: Object.<string, number>,
 *   aiRaws: Object.<string, number>,
 *   breakdown: Object
 * }}
 */
function calculatePerformanceIndex() {
  const _ds = getDiffScale();
  const playerId = campaignState.playerPartyId;

  // ── Player Performance Score ──
  let playerPerf = 0;

  // 1. Political Capital (shows political clout)
  const capital = campaignState.politicalCapital || 0;
  const capitalBonus = capital * 1.5;
  playerPerf += capitalBonus;

  // 2. Leftover War Chest (กระสุน — funds management discipline)
  const funds = campaignState.playerFunds || 0;
  const fundsBonus = funds * 0.05;
  playerPerf += fundsBonus;

  // 3. Local Popularity / Ground Game
  //    Sum of all campaign buffs across all districts the player touched
  let localPopularity = 0;
  DISTRICTS.forEach(d => {
    const buffs = d.campaignBuffs || {};
    localPopularity += (buffs.rally || 0);
    localPopularity += (buffs.canvass || 0);
    localPopularity += (buffs.io || 0);
    localPopularity += (buffs.infrastructure || 0);
    localPopularity += (buffs.policy || 0);
  });
  playerPerf += localPopularity;

  // 4. EC Scrutiny Penalty (CRUCIAL — high scrutiny destroys performance)
  const scrutiny = campaignState.playerScrutiny || 0;
  let scrutinyPenalty = 0;
  if (scrutiny > 50) {
    scrutinyPenalty = scrutiny * 2 * _ds.electionScrutinyMult;
  } else if (scrutiny > 25) {
    scrutinyPenalty = scrutiny * 0.5;
  }
  playerPerf -= scrutinyPenalty;

  // Floor at 10 to prevent negative/zero scores
  playerPerf = Math.max(10, playerPerf);

  console.log(`[STEP 68] Player Performance Index:`);
  console.log(`  Capital: +${capitalBonus.toFixed(1)} | Funds: +${fundsBonus.toFixed(1)} | Local: +${localPopularity.toFixed(1)} | Scrutiny: -${scrutinyPenalty.toFixed(1)} | RAW: ${playerPerf.toFixed(1)}`);

  // ── AI Performance Scores ──
  // Simulated from their poll share × random "campaign quality" factor (0.7–1.3)
  const aiRaws = {};
  let totalPerf = playerPerf;

  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === playerId) return; // skip player

    const currentPoll = campaignState.nationalPollShare[party.id] || 15;
    const qualityFactor = 0.7 + (Math.random() * 0.6); // 0.7 to 1.3
    const aiScore = currentPoll * qualityFactor;
    aiRaws[party.id] = Math.max(5, aiScore); // floor at 5
    totalPerf += aiRaws[party.id];
  });

  // ── Normalize to 100% ──
  const playerShare = (playerPerf / totalPerf) * 100;
  const aiShares = {};
  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === playerId) return;
    aiShares[party.id] = (aiRaws[party.id] / totalPerf) * 100;
  });

  console.log(`[STEP 68] Performance Shares: Player=${playerShare.toFixed(1)}%`, 
    Object.entries(aiShares).map(([k,v]) => `${k}=${v.toFixed(1)}%`).join(' '));

  return {
    playerRaw: playerPerf,
    playerShare,
    aiShares,
    aiRaws,
    breakdown: {
      capital: capitalBonus,
      funds: fundsBonus,
      localPopularity,
      scrutinyPenalty,
      totalRaw: totalPerf
    }
  };
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
  // ── STEP 69: Calculate Performance Index for 50/50 algorithm ──
  const perfIndex = calculatePerformanceIndex();
  const playerId = campaignState.playerPartyId;

  const results = {
    constituency: {},    // partyId → { seats, districtWins[] }
    partyList: {},       // partyId → { seats, votes, quota, remainder }
    total: {},           // partyId → total seats
    districtDetails: [], // per-district breakdown
    banYaiPenalties: {}, // partyId → total ban yai penalty
    performanceIndex: perfIndex, // STEP 69: stored for UI/debug
    playerSeats: 0,
    timestamp: Date.now()
  };

  // Build per-party perfShare lookup for quick access
  const perfShareMap = {};
  CAMPAIGN_PARTIES.forEach(p => {
    if (p.id === playerId) {
      perfShareMap[p.id] = perfIndex.playerShare;
    } else {
      perfShareMap[p.id] = perfIndex.aiShares[p.id] || 15;
    }
  });

  console.log('[STEP 69] Performance shares wired into runElection:', 
    JSON.stringify(Object.fromEntries(
      Object.entries(perfShareMap).map(([k,v]) => [k, +v.toFixed(1)])
    ))
  );

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

      // 6. National poll share influence (50% of the 50/50 algo)
      const nationShare = campaignState.nationalPollShare[party.id] || 15;
      score += nationShare * 0.2;

      // 6b. STEP 69: Campaign Performance Index (the other 50%)
      //     Disciplined campaign → surge; sloppy campaign → underperform
      const perfShare = perfShareMap[party.id] || 15;
      score += perfShare * 0.3;

      // 7. Random variance (election uncertainty, ±8)
      score += (Math.random() - 0.5) * 16;

      // 8. Scrutiny penalty (only for player) — amplified by difficulty
      if (party.id === campaignState.playerPartyId) {
        const _ds = getDiffScale();
        score -= campaignState.playerScrutiny * 0.1 * _ds.electionScrutinyMult;
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

    // STEP 69: Blend in performance share (50/50 influence)
    const perfShare = perfShareMap[party.id] || 15;
    let votes = ((pollShare + plStrength + perfShare) / 3) * 100000;

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
  // PHASE 3: FINAL 50/50 SEAT ALLOCATION  (STEP 70)
  //   50% = Ending National Poll percentage
  //   50% = Campaign Performance Index (from calculatePerformanceIndex)
  //   Distributed via Largest Remainder method across 500 seats
  // ═══════════════════════════════════════════════════════════

  // 1. Calculate raw constituency + party-list from Phases 1 & 2
  //    These are the "mechanical" results — kept for reference
  const mechanicalSeats = {};
  CAMPAIGN_PARTIES.forEach(party => {
    mechanicalSeats[party.id] = results.constituency[party.id].seats + results.partyList[party.id].seats;
  });

  // 2. Calculate 50/50 final vote share for each party
  const fiftyFiftyData = [];
  CAMPAIGN_PARTIES.forEach(party => {
    const pollShare = campaignState.nationalPollShare[party.id] || 15;
    const perfShare = perfShareMap[party.id] || 15;

    // The core 50/50 rule
    const finalVoteShare = (pollShare * 0.5) + (perfShare * 0.5);

    fiftyFiftyData.push({
      partyId: party.id,
      pollShare,
      perfShare,
      finalVoteShare,
      rawSeats: (finalVoteShare / 100) * TOTAL_SEATS,
      floorSeats: 0,
      decimalRemainder: 0
    });
  });

  // 3. Normalize finalVoteShare to exactly 100% (handle float drift)
  const totalVoteShare = fiftyFiftyData.reduce((sum, d) => sum + d.finalVoteShare, 0);
  fiftyFiftyData.forEach(d => {
    d.finalVoteShare = (d.finalVoteShare / totalVoteShare) * 100;
    d.rawSeats = (d.finalVoteShare / 100) * TOTAL_SEATS;
    d.floorSeats = Math.floor(d.rawSeats);
    d.decimalRemainder = d.rawSeats - d.floorSeats;
  });

  // 4. Allocate floor seats
  let totalAllocated = fiftyFiftyData.reduce((sum, d) => sum + d.floorSeats, 0);

  // 5. Distribute remainder seats by largest decimal remainder
  const remainderQueue = [...fiftyFiftyData].sort((a, b) => b.decimalRemainder - a.decimalRemainder);
  let seatsToDistribute = TOTAL_SEATS - totalAllocated;

  for (let i = 0; i < seatsToDistribute && i < remainderQueue.length; i++) {
    remainderQueue[i].floorSeats++;
  }

  // 6. Write final seats into results
  fiftyFiftyData.forEach(d => {
    const finalSeats = d.floorSeats;

    // Distribute between constituency and party-list proportionally
    const mechTotal = mechanicalSeats[d.partyId] || 1;
    const constRatio = mechTotal > 0
      ? results.constituency[d.partyId].seats / mechTotal
      : 0.8; // default 80% constituency if no mechanical data

    const constSeats = Math.round(finalSeats * constRatio);
    const plSeats = finalSeats - constSeats;

    results.constituency[d.partyId].seats = constSeats;
    results.partyList[d.partyId].seats = plSeats;
    results.total[d.partyId] = finalSeats;

    campaignState.constituencySeats[d.partyId] = constSeats;
    campaignState.partyListSeats[d.partyId] = plSeats;
    campaignState.totalSeats[d.partyId] = finalSeats;
  });

  // Store the 50/50 diagnostic data for the election results screen
  results.fiftyFifty = fiftyFiftyData;

  console.log('[STEP 70] 50/50 Final Seat Allocation:');
  fiftyFiftyData.forEach(d => {
    const party = CAMPAIGN_PARTIES.find(p => p.id === d.partyId);
    console.log(`  ${party?.shortName || d.partyId}: Poll=${d.pollShare.toFixed(1)}% + Perf=${d.perfShare.toFixed(1)}% → FinalVote=${d.finalVoteShare.toFixed(1)}% → ${d.floorSeats} seats`);
  });
  console.log(`  Total: ${fiftyFiftyData.reduce((s, d) => s + d.floorSeats, 0)} / ${TOTAL_SEATS}`);

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

  // STEP 27: Flag entry mode so main-game uses real campaign seat data
  localStorage.setItem('game_entry_mode', 'campaign_finished');

  // STEP 27 + STEP 70: Save election results to localStorage for main-game seat allocation
  try {
    // Get 50/50 data if available
    const fiftyFifty = campaignState.electionResults?.fiftyFifty || [];
    const fiftyFiftyMap = {};
    fiftyFifty.forEach(d => { fiftyFiftyMap[d.partyId] = d; });

    const electionData = CAMPAIGN_PARTIES.map(p => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      color: p.color,
      seats: handoff.totalSeats[p.id] || 0,
      constituencySeats: handoff.constituencySeats[p.id] || 0,
      partyListSeats: handoff.partyListSeats[p.id] || 0,
      inCoalition: handoff.coalitionPartners.includes(p.id) || p.id === handoff.playerPartyId,
      // STEP 70: 50/50 breakdown
      pollShare: fiftyFiftyMap[p.id]?.pollShare || 0,
      perfShare: fiftyFiftyMap[p.id]?.perfShare || 0,
      finalVoteShare: fiftyFiftyMap[p.id]?.finalVoteShare || 0
    }));
    localStorage.setItem('election_results', JSON.stringify(electionData));
    console.log('[campaign/engine.js] STEP 70 — Election results (with 50/50) saved to localStorage.');
  } catch (e) {
    console.warn('[campaign/engine.js] Could not save election results:', e);
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



// ═══════════════════════════════════════════════════════════════════
// STEP 3 FIX: PERSISTENT CAMPAIGN SAVE/LOAD
// Uses localStorage (survives tab closes) instead of sessionStorage alone.
// Ensures campaign timeline + stats survive parliament round-trips.
// ═══════════════════════════════════════════════════════════════════

/**
 * saveCampaignState() — Bundles ALL campaign variables into a single
 * JSON object and saves to localStorage.
 *
 * MUST be called:
 *   - Before navigating to /parliament-test/
 *   - After each state-changing action (rally, next day, etc.)
 *   - On any dashboard render (via _saveCampaignToStorage in main.js)
 */
function saveCampaignState() {
  if (!campaignState) {
    console.warn('[campaign/engine.js] No campaignState to save.');
    return;
  }

  try {
    const saveData = {
      // Full campaign state (deep copy to avoid reference issues)
      state: JSON.parse(JSON.stringify(campaignState)),

      // Calendar position (CampaignCalendar is a separate object)
      calendarDay: (typeof CampaignCalendar !== 'undefined') ? CampaignCalendar.currentDay : 1,

      // Player selections (needed to rebuild UI)
      playerPartyId: campaignState.playerPartyId,
      difficulty: (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal',

      // Timestamp for debugging
      savedAt: Date.now()
    };

    localStorage.setItem('tps_campaign_save', JSON.stringify(saveData));
    console.log(`[campaign/engine.js] Campaign saved — Day ${saveData.calendarDay}, Week ${campaignState.currentWeek}, Funds ${campaignState.playerFunds}`);
  } catch (e) {
    console.warn('[campaign/engine.js] Could not save campaign state:', e);
  }
}

/**
 * loadCampaignState() — Restores campaign progress from localStorage.
 * Must be called during boot IF the player is returning to the dashboard.
 *
 * FLOW:
 *   1. Reads 'tps_campaign_save' from localStorage
 *   2. If valid, calls initCampaignState() with the saved partyId
 *   3. Overwrites the fresh state with the saved state
 *   4. Restores CampaignCalendar.currentDay
 *   5. Returns true if restore succeeded
 *
 * @returns {boolean} true if state was restored
 */
function loadCampaignState() {
  try {
    const raw = localStorage.getItem('tps_campaign_save');
    if (!raw) {
      console.log('[campaign/engine.js] No saved campaign data in localStorage.');
      return false;
    }

    const saveData = JSON.parse(raw);
    if (!saveData.state || !saveData.playerPartyId) {
      console.warn('[campaign/engine.js] Saved data is incomplete — ignoring.');
      return false;
    }

    // 1. Initialize with the saved party (builds MP roster, sets defaults)
    initCampaignState(saveData.playerPartyId);

    // 2. Overwrite with saved state (funds, scrutiny, poll shares, log, etc.)
    Object.assign(campaignState, saveData.state);

    // STEP 86: CRITICAL FIX — Re-apply localStorage stats AFTER Object.assign.
    // Without this, the stale values from tps_campaign_save overwrite the
    // fresh values that Parliament's exit save hook just wrote to localStorage.
    // localStorage is the AUTHORITATIVE source for shared stats.
    if (typeof _loadStatsFromStorage === 'function') {
      _loadStatsFromStorage();
      console.log('[campaign/engine.js] STEP 86 — localStorage stats re-applied after Object.assign (prevents reset).');
    }

    // 3. Restore calendar day
    if (typeof CampaignCalendar !== 'undefined' && saveData.calendarDay) {
      CampaignCalendar.currentDay = saveData.calendarDay;
    }

    // 4. Restore difficulty
    if (saveData.difficulty && typeof TPSGlobalState !== 'undefined') {
      TPSGlobalState.difficulty = saveData.difficulty;
    }

    console.log(`[campaign/engine.js] Campaign loaded — Day ${saveData.calendarDay}, Week ${campaignState.currentWeek}, Funds ${campaignState.playerFunds}`);
    return true;
  } catch (e) {
    console.warn('[campaign/engine.js] Could not load campaign state:', e);
    return false;
  }
}

/**
 * clearCampaignSave() — Removes the persistent save from localStorage.
 * Call on: game over, election held, or explicit wipe.
 */
function clearCampaignSave() {
  localStorage.removeItem('tps_campaign_save');
  console.log('[campaign/engine.js] Campaign save cleared.');
}


console.log("[campaign/engine.js] Loaded successfully.");
console.log("  → Election engine ready (400 constituency + 100 party-list)");
console.log("  → Coalition phase with 18 ministries");
console.log("  → Win/Loss loop: 251-seat majority threshold");
console.log("  → Save/Load functions ready (localStorage)");
