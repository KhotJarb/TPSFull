// ═══════════════════════════════════════════════════════════════════════════
// TPS — /main-game/diplomacy.js  (v1.0.2 — Part 3: The Burden of Power)
// Coalition Diplomacy: Placate, Renegotiate, Threaten
// ═══════════════════════════════════════════════════════════════════════════
// Loaded after cabinet.js and before engine.js.
// Provides 3 diplomatic actions the player can use on coalition partners.
// Each action has costs, risks, and lasting consequences.
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: DIPLOMACY STATE
// ──────────────────────────────────────────────────────────────────────────

let diplomacyState = {
  cooldowns: {},          // { partyId: { action: turnsRemaining } }
  threatHistory: {},      // { partyId: count } — permanent trust damage tracker
  placateHistory: {},     // { partyId: count } — diminishing returns tracker
  renegotiationCount: 0   // total mid-term reshuffles
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: ACTION COSTS & CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────

const DIPLOMACY_CONFIG = {
  placate: {
    baseCost: 40,             // Budget cost in billions ฿
    baseRelationGain: 15,     // Relation boost
    loyaltyBoost: 8,          // Coalition stability boost
    cooldownTurns: 2,         // Cannot placate same party for 2 months
    diminishingFactor: 0.7,   // Each repeat: 70% as effective
    maxUses: 4                // After 4 uses, they're "over it"
  },
  renegotiate: {
    baseCost: 60,             // Budget cost
    stabilityPenalty: -12,    // Immediate coalition stability hit
    relationGain: 10,         // Relation gain with target party
    otherPartyPenalty: -8,    // Other coalition parties lose relation
    cooldownTurns: 6,         // 6 months between reshuffles
    unrestGain: 5             // Public sees instability
  },
  threaten: {
    baseCost: 0,              // Free — but risky
    immediateRelationLoss: -10, // Initial trust damage
    permanentTrustDecay: -5,  // Permanent per-use trust modifier
    voteComplianceBonus: 25,  // Massive short-term voting loyalty
    complianceDuration: 2,    // Lasts 2 months
    defectionRiskMult: 1.5,   // 50% more likely to defect after threat
    cooldownTurns: 4,         // 4 months between threats to same party
    maxThreats: 3             // After 3 threats, they leave automatically
  },

  // ── STEP 42: WAR ROOM ACTIONS ──────────────────────────────
  porkBarrel: {
    baseCost: 150,              // ฿150B — massive budget drain
    loyaltyGain: 25,            // Guaranteed +25% coalitionLoyalty
    unrestGain: 8,              // Corruption rumors fuel public anger
    stabilityGain: 5,           // Slight global stability boost
    cooldownTurns: 3,           // 3-month cooldown per party
    description: 'Funnel development funds to key constituencies.'
  },
  whipCompliance: {
    loyaltyCost: 10,            // -10% coalitionLoyalty (resentment)
    cooldownTurns: 2,           // 2-month cooldown per party
    complianceDuration: 1,      // willVoteYesOnNextBill lasts 1 bill
    description: 'Force the party whip to guarantee a YES vote.'
  },
  galaDinner: {
    baseCost: 50,               // ฿50B — modest cost
    loyaltyGainPopular: 15,     // If PM is popular → loyalty +15%
    loyaltyLossUnpopular: -5,   // If PM is unpopular → loyalty -5%
    popularityThreshold: 40,    // Below 40% approval = "unpopular"
    cooldownTurns: 2,           // 2-month cooldown per party
    description: 'Host a lavish dinner to strengthen personal bonds.'
  }
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2B: STEP 42 — WAR ROOM ACTION IMPLEMENTATIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * porkBarrelFunding(partyId) — จัดสรรงบลงพื้นที่ (Pork Barrel Funding)
 *
 * Mechanics:
 *  - Costs ฿150B (massive)
 *  - Guaranteed coalitionLoyalty +25% for target party
 *  - Unrest +8 (corruption rumors)
 *  - Coalition stability +5
 *  - 3-month cooldown per party
 *
 * @param {string} partyId — Target coalition party ID
 * @returns {Object} Result { success, message, effects, narrative }
 */
function porkBarrelFunding(partyId) {
  const party = getPartyById(partyId);
  if (!party) return { success: false, message: "Party not found." };
  if (!party.inCoalition) return { success: false, message: `${party.name} is not in your coalition.` };

  const cfg = DIPLOMACY_CONFIG.porkBarrel;

  // Check cooldown
  const cd = _getCooldown(partyId, 'porkBarrel');
  if (cd > 0) {
    return { success: false, message: `${party.shortName} already received funding. Wait ${cd} more month${cd > 1 ? 's' : ''}.` };
  }

  // Check budget
  if (gameState.budget < cfg.baseCost) {
    return { success: false, message: `Insufficient budget. Need ฿${cfg.baseCost}B for constituency development.` };
  }

  // Apply effects
  gameState.budget -= cfg.baseCost;
  const prevLoyalty = party.coalitionLoyalty || 50;
  party.coalitionLoyalty = Math.min(100, prevLoyalty + cfg.loyaltyGain);
  gameState.unrest = Math.min(100, gameState.unrest + cfg.unrestGain);
  gameState.coalitionStability = Math.min(100, gameState.coalitionStability + cfg.stabilityGain);
  party.relation = Math.min(100, party.relation + 10);

  // Set cooldown
  _setCooldown(partyId, 'porkBarrel', cfg.cooldownTurns);

  const narratives = [
    `฿${cfg.baseCost}B in "special development funds" flows into provinces held by ${party.shortName} MPs. New roads, hospitals, and a suspiciously timed school renovation project appear overnight. Opposition media screams "corruption!" but the MPs are all smiles.`,
    `You announce a "regional economic stimulus package" — everyone knows it's a targeted payoff to ${party.shortName}'s constituencies. The party leader nods approvingly. Social media explodes with accusations.`,
    `A convoy of budget allocations arrives at ${party.shortName}'s heartland provinces. Infrastructure projects that were "pending review" for years are suddenly fast-tracked. The party whip calls to express "deep gratitude."`,
  ];
  const narrative = narratives[Math.floor(Math.random() * narratives.length)];

  console.log(`[diplomacy.js] STEP 42 — Pork Barrel to ${party.shortName}: loyalty ${prevLoyalty}→${party.coalitionLoyalty}, budget -${cfg.baseCost}`);

  return {
    success: true,
    message: `${party.shortName} loyalty boosted to ${party.coalitionLoyalty}%. Budget -฿${cfg.baseCost}B.`,
    effects: {
      budget: -cfg.baseCost,
      coalitionLoyalty: cfg.loyaltyGain,
      unrest: cfg.unrestGain,
      coalitionStability: cfg.stabilityGain,
      relation: +10
    },
    narrative,
    warning: gameState.unrest > 60 ? '🚨 Unrest is dangerously high — corruption rumors are making it worse!' : null,
    partyId,
    action: 'porkBarrel'
  };
}


/**
 * demandWhipCompliance(partyId) — ขอคำมั่นสัญญาโหวต (Demand Whip Compliance)
 *
 * Mechanics:
 *  - FREE (no budget cost)
 *  - Sets party.willVoteYesOnNextBill = true (consumed on next vote)
 *  - Costs -10% coalitionLoyalty (you're forcing their hand)
 *  - 2-month cooldown per party
 *
 * @param {string} partyId — Target coalition party ID
 * @returns {Object} Result { success, message, effects, narrative }
 */
function demandWhipCompliance(partyId) {
  const party = getPartyById(partyId);
  if (!party) return { success: false, message: "Party not found." };
  if (!party.inCoalition) return { success: false, message: `${party.name} is not in your coalition.` };

  const cfg = DIPLOMACY_CONFIG.whipCompliance;

  // Check cooldown
  const cd = _getCooldown(partyId, 'whipCompliance');
  if (cd > 0) {
    return { success: false, message: `${party.shortName} was recently whipped. Wait ${cd} more month${cd > 1 ? 's' : ''}.` };
  }

  // Apply effects
  const prevLoyalty = party.coalitionLoyalty || 50;
  party.coalitionLoyalty = Math.max(0, prevLoyalty - cfg.loyaltyCost);
  party.willVoteYesOnNextBill = true;

  // Set cooldown
  _setCooldown(partyId, 'whipCompliance', cfg.cooldownTurns);

  const narratives = [
    `You call ${party.shortName}'s party leader into your private office. "I need your MPs to vote YES on the next bill. All of them. No exceptions." The leader's jaw tightens, but they nod. The whip goes out — but resentment simmers beneath the surface.`,
    `A late-night phone call to ${party.shortName}'s chief whip: "Line your members up. I don't care about their objections — I need that vote." Compliance is guaranteed, but at what cost to trust?`,
    `You invoke the coalition agreement clause on legislative discipline. ${party.shortName}'s leader publicly agrees, but the backbenchers whisper about "authoritarian tendencies." The vote is locked — the relationship is not.`,
  ];
  const narrative = narratives[Math.floor(Math.random() * narratives.length)];

  console.log(`[diplomacy.js] STEP 42 — Whip Compliance on ${party.shortName}: loyalty ${prevLoyalty}→${party.coalitionLoyalty}, willVoteYes=true`);

  return {
    success: true,
    message: `${party.shortName} will vote YES on next bill. Loyalty dropped to ${party.coalitionLoyalty}%.`,
    effects: {
      coalitionLoyalty: -cfg.loyaltyCost,
      whipStatus: '✅ Guaranteed YES'
    },
    narrative,
    warning: party.coalitionLoyalty < 30
      ? `🚨 ${party.shortName}'s loyalty is critically low! They may defect.`
      : party.coalitionLoyalty < 50
        ? `⚠️ ${party.shortName} is growing resentful of your demands.`
        : null,
    partyId,
    action: 'whipCompliance'
  };
}


/**
 * coalitionGalaDinner(partyId) — งานเลี้ยงกระชับมิตร (Coalition Gala Dinner)
 *
 * Mechanics:
 *  - Costs ฿50B (modest — catering, venue, gifts)
 *  - RNG based on PM's current approval rating:
 *    · If popularity >= 40: Loyalty +15% (they enjoy the PM's company)
 *    · If popularity < 40: Loyalty -5% (they snub the dinner, embarrassing)
 *  - 2-month cooldown per party
 *
 * @param {string} partyId — Target coalition party ID
 * @returns {Object} Result { success, message, effects, narrative }
 */
function coalitionGalaDinner(partyId) {
  const party = getPartyById(partyId);
  if (!party) return { success: false, message: "Party not found." };
  if (!party.inCoalition) return { success: false, message: `${party.name} is not in your coalition.` };

  const cfg = DIPLOMACY_CONFIG.galaDinner;

  // Check cooldown
  const cd = _getCooldown(partyId, 'galaDinner');
  if (cd > 0) {
    return { success: false, message: `${party.shortName} was recently wined & dined. Wait ${cd} more month${cd > 1 ? 's' : ''}.` };
  }

  // Check budget
  if (gameState.budget < cfg.baseCost) {
    return { success: false, message: `Insufficient budget. Need ฿${cfg.baseCost}B for the gala event.` };
  }

  // Apply budget cost regardless
  gameState.budget -= cfg.baseCost;

  // RNG: Roll based on approval + some variance
  const isPopular = gameState.popularity >= cfg.popularityThreshold;
  // Add some randomness: even popular PMs can have awkward evenings
  const roll = Math.random();
  const actualSuccess = isPopular ? (roll > 0.15) : (roll > 0.7);
  // 85% success if popular, 30% success if unpopular

  const prevLoyalty = party.coalitionLoyalty || 50;

  let narrative, loyaltyChange;
  if (actualSuccess) {
    loyaltyChange = cfg.loyaltyGainPopular;
    party.coalitionLoyalty = Math.min(100, prevLoyalty + loyaltyChange);
    party.relation = Math.min(100, party.relation + 5);

    const successNarratives = [
      `The ballroom at the Mandarin Oriental glitters with crystal and champagne. ${party.shortName}'s leader raises a toast: "To the finest PM Thailand has seen in a decade." Photos of the warm handshake dominate tomorrow's headlines.`,
      `A private riverside dinner at the Chao Phraya. Over som tum and single malt, genuine laughter fills the air. ${party.shortName}'s leaders leave feeling valued and heard. Loyalty solidified.`,
      `The gala is a triumph — live classical music, a Thai celebrity host, and genuine warmth between coalition leaders. ${party.shortName}'s MPs post selfies with you on social media. The coalition has never looked stronger.`,
    ];
    narrative = successNarratives[Math.floor(Math.random() * successNarratives.length)];
  } else {
    loyaltyChange = cfg.loyaltyLossUnpopular;
    party.coalitionLoyalty = Math.max(0, prevLoyalty + loyaltyChange);
    party.relation = Math.max(-100, party.relation - 3);

    const failNarratives = [
      `The gala is a disaster. ${party.shortName}'s leader sends a "deputy" — a junior MP who spends the evening on their phone. The empty VIP seat is photographed by reporters. "Coalition cracks?" reads the morning headline.`,
      `Half of ${party.shortName}'s invited MPs don't show up. Those who do leave early, citing "urgent constituency matters." Your ฿${cfg.baseCost}B buys you cold lobster and warm embarrassment.`,
      `The dinner starts well, but a leaked poll showing your ${gameState.popularity}% approval becomes the evening's real topic. ${party.shortName}'s leader is polite but distant. "Perhaps when things improve," they say, excusing themselves before dessert.`,
    ];
    narrative = failNarratives[Math.floor(Math.random() * failNarratives.length)];
  }

  // Set cooldown
  _setCooldown(partyId, 'galaDinner', cfg.cooldownTurns);

  console.log(`[diplomacy.js] STEP 42 — Gala Dinner with ${party.shortName}: ${actualSuccess ? 'SUCCESS' : 'FAILED'}, loyalty ${prevLoyalty}→${party.coalitionLoyalty}`);

  return {
    success: true,
    message: actualSuccess
      ? `The gala was a success! ${party.shortName} loyalty +${cfg.loyaltyGainPopular}%.`
      : `The gala backfired. ${party.shortName} snubbed you. Loyalty ${loyaltyChange}%.`,
    effects: {
      budget: -cfg.baseCost,
      coalitionLoyalty: loyaltyChange,
      relation: actualSuccess ? +5 : -3
    },
    narrative,
    galaSuccess: actualSuccess,
    warning: !actualSuccess ? `😬 The embarrassment strengthens opposition narratives.` : null,
    partyId,
    action: 'galaDinner'
  };
}

// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: CORE DIPLOMACY ACTIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * placateLeader(partyId) — Spend budget to boost a coalition partner's loyalty.
 *
 * Mechanics:
 *  - Costs ฿40B (base)
 *  - Boosts relation by +15 (base, with diminishing returns)
 *  - 2-month cooldown per party
 *  - After 4 uses on same party, they're "over your gifts"
 *
 * @param {string} partyId — Target coalition party ID
 * @returns {Object} Result { success, message, effects, narrative }
 */
function placateLeader(partyId) {
  const party = getPartyById(partyId);
  if (!party) return { success: false, message: "Party not found." };
  if (!party.inCoalition) return { success: false, message: `${party.name} is not in your coalition.` };

  const cfg = DIPLOMACY_CONFIG.placate;

  // Check cooldown
  const cd = _getCooldown(partyId, 'placate');
  if (cd > 0) {
    return { success: false, message: `${party.shortName} was recently placated. Wait ${cd} more month${cd > 1 ? 's' : ''}.` };
  }

  // Check max uses
  const prevUses = diplomacyState.placateHistory[partyId] || 0;
  if (prevUses >= cfg.maxUses) {
    return { success: false, message: `${party.name} is tired of empty gestures. Placation no longer works.` };
  }

  // Check budget
  if (gameState.budget < cfg.baseCost) {
    return { success: false, message: `Insufficient budget. Need ฿${cfg.baseCost}B.` };
  }

  // Calculate effectiveness with diminishing returns
  const effectiveness = Math.pow(cfg.diminishingFactor, prevUses);
  const actualRelationGain = Math.round(cfg.baseRelationGain * effectiveness);
  const actualLoyaltyBoost = Math.round(cfg.loyaltyBoost * effectiveness);

  // Apply effects
  gameState.budget -= cfg.baseCost;
  party.relation = Math.max(-100, Math.min(100, party.relation + actualRelationGain));
  gameState.coalitionStability = Math.max(0, Math.min(100,
    gameState.coalitionStability + actualLoyaltyBoost));

  // Track usage
  diplomacyState.placateHistory[partyId] = prevUses + 1;
  _setCooldown(partyId, 'placate', cfg.cooldownTurns);

  // Build narrative
  const narratives = [
    `You invite ${party.shortName} leader to a private dinner at Government House. Over lobster and champagne, promises are made about future budget allocations for their constituencies.`,
    `A discreet meeting at a Sukhumvit hotel suite. You offer ${party.shortName} additional committee chairmanships and assure them their policy priorities will be fast-tracked.`,
    `You personally call ${party.shortName}'s leader, spending an hour flattering their legislative contributions and hinting at a larger role in the upcoming cabinet reshuffle.`,
    `A generous "development fund" is quietly allocated to provinces controlled by ${party.shortName} MPs. Everyone understands what this means.`
  ];

  const narrative = narratives[prevUses % narratives.length];
  const isWeak = prevUses >= 2;

  console.log(`[diplomacy.js] Placated ${party.shortName}: relation +${actualRelationGain}, stability +${actualLoyaltyBoost}, effectiveness ${Math.round(effectiveness * 100)}%`);

  return {
    success: true,
    message: `${party.shortName} placated. Relation +${actualRelationGain}, Stability +${actualLoyaltyBoost}.`,
    effects: {
      budget: -cfg.baseCost,
      relation: actualRelationGain,
      coalitionStability: actualLoyaltyBoost
    },
    narrative,
    warning: isWeak ? `⚠️ Diminishing returns — ${party.shortName} is growing cynical about your generosity.` : null,
    partyId,
    action: 'placate'
  };
}


/**
 * renegotiateDeal(partyId) — Swap ministries mid-term to satisfy a partner.
 *
 * Mechanics:
 *  - Costs ฿60B (political cost of reshuffling)
 *  - Grants target party a Tier upgrade in their cabinet portfolio
 *  - Causes -12 coalition stability (instability signal)
 *  - Other coalition partners lose -8 relation (jealousy)
 *  - +5 unrest (public sees chaos)
 *  - 6-month cooldown
 *
 * @param {string} partyId — Target coalition party ID
 * @returns {Object} Result { success, message, effects, narrative }
 */
function renegotiateDeal(partyId) {
  const party = getPartyById(partyId);
  if (!party) return { success: false, message: "Party not found." };
  if (!party.inCoalition) return { success: false, message: `${party.name} is not in your coalition.` };

  const cfg = DIPLOMACY_CONFIG.renegotiate;

  // Check cooldown
  const cd = _getCooldown(partyId, 'renegotiate');
  if (cd > 0) {
    return { success: false, message: `Cabinet was recently reshuffled. Wait ${cd} more month${cd > 1 ? 's' : ''}.` };
  }

  // Check budget
  if (gameState.budget < cfg.baseCost) {
    return { success: false, message: `Insufficient budget. Need ฿${cfg.baseCost}B for political costs.` };
  }

  // Find a ministry to upgrade for this party
  const currentPortfolio = getPartyPortfolio(partyId);
  const hasTierA = currentPortfolio.some(m => m.tier === 'A');

  let swapDescription = '';

  if (!hasTierA) {
    // Try to give them a Tier A ministry from whoever has the most
    const tierAMinistries = getMinistriesByTier('A');
    const availableSwap = tierAMinistries.find(m => {
      const holder = getMinistryHolder(m.id);
      return holder && holder !== partyId;
    });

    if (availableSwap) {
      const oldHolder = getMinistryHolder(availableSwap.id);
      assignMinistry(partyId, availableSwap.id);
      swapDescription = `${availableSwap.name} transferred to ${party.shortName}`;

      // Give the old holder a Tier B/C ministry as compensation
      const unassigned = getUnallocatedMinistries();
      if (unassigned.length > 0 && oldHolder) {
        assignMinistry(oldHolder, unassigned[0].id);
      }
    } else {
      swapDescription = `Additional portfolio committee seats assigned to ${party.shortName}`;
    }
  } else {
    swapDescription = `${party.shortName}'s existing portfolios expanded with additional oversight powers`;
  }

  // Apply effects
  gameState.budget -= cfg.baseCost;
  party.relation = Math.max(-100, Math.min(100, party.relation + cfg.relationGain));
  gameState.coalitionStability = Math.max(0, Math.min(100,
    gameState.coalitionStability + cfg.stabilityPenalty));
  gameState.unrest = Math.max(0, Math.min(100, gameState.unrest + cfg.unrestGain));

  // Penalize other coalition partners
  const otherParties = parties.filter(p => p.inCoalition && p.id !== partyId);
  otherParties.forEach(p => {
    p.relation = Math.max(-100, Math.min(100, p.relation + cfg.otherPartyPenalty));
  });

  // Track
  diplomacyState.renegotiationCount++;
  _setCooldown(partyId, 'renegotiate', cfg.cooldownTurns);

  const narrative = `Emergency cabinet reshuffle announced at midnight. ${swapDescription}. Opposition leaders mock the "musical chairs government." Coalition allies exchange uneasy glances — who's next to lose their portfolio?`;

  console.log(`[diplomacy.js] Renegotiated with ${party.shortName}: relation +${cfg.relationGain}, stability ${cfg.stabilityPenalty}, other parties ${cfg.otherPartyPenalty}`);

  return {
    success: true,
    message: `Deal renegotiated with ${party.shortName}. Relation +${cfg.relationGain}, but stability hit.`,
    effects: {
      budget: -cfg.baseCost,
      relation: cfg.relationGain,
      coalitionStability: cfg.stabilityPenalty,
      unrest: cfg.unrestGain,
      otherPartyRelation: cfg.otherPartyPenalty
    },
    narrative,
    warning: otherParties.length > 0
      ? `⚠️ ${otherParties.map(p => p.shortName).join(', ')} are unhappy about the reshuffle (${cfg.otherPartyPenalty} relation each).`
      : null,
    swapDescription,
    partyId,
    action: 'renegotiate'
  };
}


/**
 * threatenExpulsion(partyId) — Nuclear option: force compliance through intimidation.
 *
 * Mechanics:
 *  - FREE (no budget cost)
 *  - Target immediately loses -10 relation (fear + resentment)
 *  - Permanent trust decay: -5 per historical use (stacks)
 *  - Target votes with you for 2 months (compliance bonus)
 *  - 50% more likely to defect after threat
 *  - After 3 threats to same party: AUTOMATIC DEFECTION
 *  - 4-month cooldown
 *
 * @param {string} partyId — Target coalition party ID
 * @returns {Object} Result { success, message, effects, narrative }
 */
function threatenExpulsion(partyId) {
  const party = getPartyById(partyId);
  if (!party) return { success: false, message: "Party not found." };
  if (!party.inCoalition) return { success: false, message: `${party.name} is not in your coalition.` };

  const cfg = DIPLOMACY_CONFIG.threaten;

  // Check cooldown
  const cd = _getCooldown(partyId, 'threaten');
  if (cd > 0) {
    return { success: false, message: `${party.shortName} was recently threatened. Wait ${cd} more month${cd > 1 ? 's' : ''}.` };
  }

  // Check threat count
  const prevThreats = diplomacyState.threatHistory[partyId] || 0;

  // NUCLEAR: After max threats, party leaves immediately
  if (prevThreats >= cfg.maxThreats) {
    party.inCoalition = false;
    party.relation = Math.max(-100, party.relation - 30);

    const narrative = `"ENOUGH!" ${party.shortName}'s leader storms out of Government House, flanked by 30 MPs. On the steps, facing a wall of cameras, they announce: "We will no longer be bullied. The coalition is dead to us." Your majority just evaporated.`;

    return {
      success: true,
      message: `🚨 ${party.name} has LEFT the coalition! (${party.seats} seats lost)`,
      effects: { relation: -30, defected: true },
      narrative,
      isDefection: true,
      partyId,
      action: 'threaten'
    };
  }

  // Apply immediate effects
  const permanentDecay = cfg.permanentTrustDecay * (prevThreats + 1);
  const totalRelationLoss = cfg.immediateRelationLoss + permanentDecay;

  party.relation = Math.max(-100, Math.min(100, party.relation + totalRelationLoss));

  // Track threat history
  diplomacyState.threatHistory[partyId] = prevThreats + 1;
  _setCooldown(partyId, 'threaten', cfg.cooldownTurns);

  // Build narrative based on severity
  const narratives = [
    `You summon ${party.shortName}'s leader to your office. The door closes. "I can destroy your party with a single phone call to the EC. Fall in line." The leader's face drains of color. They nod — for now.`,
    `A "leaked" dossier of ${party.shortName} financial irregularities lands on their leader's desk with a Post-it note: "Keep this between us." The message is unmistakable.`,
    `You deliver the final ultimatum in a clipped voice: "Vote with us or I will personally ensure every one of your MPs faces re-election without coalition backing." The air in the room turns to ice.`
  ];

  const warningsRemaining = cfg.maxThreats - (prevThreats + 1);
  const narrative = narratives[prevThreats % narratives.length];

  console.log(`[diplomacy.js] Threatened ${party.shortName}: relation ${totalRelationLoss}, threats=${prevThreats + 1}/${cfg.maxThreats}`);

  return {
    success: true,
    message: `${party.shortName} coerced into compliance. Relation ${totalRelationLoss}. ⚠️ ${warningsRemaining} warning${warningsRemaining !== 1 ? 's' : ''} remain before defection.`,
    effects: {
      relation: totalRelationLoss,
      complianceBonus: cfg.voteComplianceBonus,
      complianceDuration: cfg.complianceDuration,
      defectionRiskMult: cfg.defectionRiskMult
    },
    narrative,
    warning: warningsRemaining <= 1
      ? `🚨 CRITICAL: One more threat and ${party.shortName} WILL defect from the coalition!`
      : `⚠️ ${warningsRemaining} warnings remaining before ${party.shortName} leaves.`,
    threatsUsed: prevThreats + 1,
    threatsMax: cfg.maxThreats,
    partyId,
    action: 'threaten'
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: COOLDOWN MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────

/**
 * _getCooldown() — Returns remaining cooldown turns for a party+action.
 */
function _getCooldown(partyId, action) {
  if (!diplomacyState.cooldowns[partyId]) return 0;
  return diplomacyState.cooldowns[partyId][action] || 0;
}

/**
 * _setCooldown() — Sets a cooldown for a party+action.
 */
function _setCooldown(partyId, action, turns) {
  if (!diplomacyState.cooldowns[partyId]) {
    diplomacyState.cooldowns[partyId] = {};
  }
  diplomacyState.cooldowns[partyId][action] = turns;
}

/**
 * tickDiplomacyCooldowns() — Decrements all cooldowns by 1. Call at end of turn.
 */
function tickDiplomacyCooldowns() {
  for (const partyId of Object.keys(diplomacyState.cooldowns)) {
    for (const action of Object.keys(diplomacyState.cooldowns[partyId])) {
      if (diplomacyState.cooldowns[partyId][action] > 0) {
        diplomacyState.cooldowns[partyId][action]--;
      }
    }
  }
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: QUERY FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * getPartyDiplomacyStatus(partyId) — Returns the diplomatic status of a party.
 * Used by the UI to show cooldowns, threat warnings, and available actions.
 */
function getPartyDiplomacyStatus(partyId) {
  const party = getPartyById(partyId);
  if (!party) return null;

  const threatCount = diplomacyState.threatHistory[partyId] || 0;
  const placateCount = diplomacyState.placateHistory[partyId] || 0;
  const cfg = DIPLOMACY_CONFIG;

  return {
    partyId,
    partyName: party.name,
    shortName: party.shortName,
    relation: party.relation,
    inCoalition: party.inCoalition,
    seats: party.seats,
    color: party.color,

    // Placate status
    canPlacate: party.inCoalition
      && _getCooldown(partyId, 'placate') === 0
      && placateCount < cfg.placate.maxUses
      && gameState.budget >= cfg.placate.baseCost,
    placateCooldown: _getCooldown(partyId, 'placate'),
    placateUses: placateCount,
    placateMaxUses: cfg.placate.maxUses,
    placateCost: cfg.placate.baseCost,

    // Renegotiate status
    canRenegotiate: party.inCoalition
      && _getCooldown(partyId, 'renegotiate') === 0
      && gameState.budget >= cfg.renegotiate.baseCost,
    renegotiateCooldown: _getCooldown(partyId, 'renegotiate'),
    renegotiateCost: cfg.renegotiate.baseCost,

    // Threaten status
    canThreaten: party.inCoalition
      && _getCooldown(partyId, 'threaten') === 0,
    threatCooldown: _getCooldown(partyId, 'threaten'),
    threatCount,
    threatMax: cfg.threaten.maxThreats,
    threatDanger: threatCount >= cfg.threaten.maxThreats - 1,

    // ── STEP 42: War Room action statuses ──
    // Pork Barrel
    canPorkBarrel: party.inCoalition
      && _getCooldown(partyId, 'porkBarrel') === 0
      && gameState.budget >= cfg.porkBarrel.baseCost,
    porkBarrelCooldown: _getCooldown(partyId, 'porkBarrel'),
    porkBarrelCost: cfg.porkBarrel.baseCost,

    // Whip Compliance
    canWhipCompliance: party.inCoalition
      && _getCooldown(partyId, 'whipCompliance') === 0
      && !party.willVoteYesOnNextBill,
    whipComplianceCooldown: _getCooldown(partyId, 'whipCompliance'),
    isWhipped: !!party.willVoteYesOnNextBill,

    // Gala Dinner
    canGalaDinner: party.inCoalition
      && _getCooldown(partyId, 'galaDinner') === 0
      && gameState.budget >= cfg.galaDinner.baseCost,
    galaDinnerCooldown: _getCooldown(partyId, 'galaDinner'),
    galaDinnerCost: cfg.galaDinner.baseCost,

    // Loyalty
    coalitionLoyalty: party.coalitionLoyalty || 50
  };
}

/**
 * getDiplomacyState() — Returns the full diplomacy state (for save/load).
 */
function getDiplomacyState() {
  return { ...diplomacyState };
}

/**
 * resetDiplomacy() — Clears all diplomacy state for a new game.
 */
function resetDiplomacy() {
  diplomacyState = {
    cooldowns: {},
    threatHistory: {},
    placateHistory: {},
    renegotiationCount: 0
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[diplomacy.js] Coalition Diplomacy module loaded (v1.0.2).");
console.log("  → Actions: placateLeader, renegotiateDeal, threatenExpulsion");
console.log("═══════════════════════════════════════════════════════════");
