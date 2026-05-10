// ============================================================
// THAILAND POLITICAL SIMULATION — legislation.js
// STEP 44: Legislative Gridlock / Amendment Phase Engine
//
// When a bill is close to failing (within 21 votes of majority),
// the vote is PAUSED and the player enters the "Amendment Phase"
// — a high-stakes decision point where they must choose how to
// save (or abandon) the bill.
// ============================================================


// ──────────────────────────────────────────────────────────────
// SECTION 1: GRIDLOCK STATE
// ──────────────────────────────────────────────────────────────

/**
 * Tracks the currently gridlocked bill for the Amendment Phase.
 * Null when no gridlock is active.
 */
let gridlockState = null;


// ──────────────────────────────────────────────────────────────
// SECTION 2: AMENDMENT PHASE ENTRY
// ──────────────────────────────────────────────────────────────

/**
 * showAmendmentPhase(voteResult) — Triggers the Amendment Phase UI.
 *
 * Called by executeVote() when proposeLaw() returns isGridlock = true.
 * Stores the gridlock state and renders the amendment modal.
 *
 * @param {Object} voteResult — The full result from proposeLaw()
 */
function showAmendmentPhase(voteResult) {
  // Store gridlock state for resolution
  gridlockState = {
    lawId: voteResult.lawId,
    lawName: voteResult.lawName,
    lawIcon: voteResult.lawIcon || '📄',
    lawEffects: voteResult.lawEffects,
    yesVotes: voteResult.yesVotes,
    noVotes: voteResult.noVotes,
    missingVotes: voteResult.missingVotes,
    partyVotes: voteResult.partyVotes,
    majorityNeeded: voteResult.majorityNeeded,
    totalSeats: voteResult.totalSeats,
    resolved: false
  };

  _renderAmendmentModal();
  console.log(`[legislation.js] STEP 44 — Gridlock triggered for "${voteResult.lawName}". Missing ${voteResult.missingVotes} votes.`);
}


// ──────────────────────────────────────────────────────────────
// SECTION 3: AMENDMENT PHASE RENDERING
// ──────────────────────────────────────────────────────────────

/**
 * _renderAmendmentModal() — Builds and displays the Amendment Phase overlay.
 */
function _renderAmendmentModal() {
  const overlay = document.getElementById('amendment-phase-overlay');
  if (!overlay || !gridlockState) return;

  const gs = gridlockState;
  const yesPct = Math.round((gs.yesVotes / gs.totalSeats) * 100);

  // Build the tally bar
  const yesBarWidth = (gs.yesVotes / gs.totalSeats) * 100;
  const noBarWidth = (gs.noVotes / gs.totalSeats) * 100;
  const thresholdPos = (gs.majorityNeeded / gs.totalSeats) * 100;

  // Cost calculations for pork barrel
  const porkCostPerVote = 50;
  const totalPorkCost = gs.missingVotes * porkCostPerVote;
  const canAffordPork = gameState.budget >= totalPorkCost;

  document.getElementById('amendment-content').innerHTML = `
    <div class="amendment-header">
      <div class="amendment-header__icon">⚖️</div>
      <div class="amendment-header__text">
        <div class="amendment-header__title">LEGISLATIVE GRIDLOCK</div>
        <div class="amendment-header__subtitle">สภาถึงทางตัน — The House Is Deadlocked</div>
      </div>
    </div>

    <div class="amendment-bill-info">
      <span class="amendment-bill-icon">${gs.lawIcon}</span>
      <span class="amendment-bill-name">${gs.lawName}</span>
    </div>

    <div class="amendment-tally">
      <div class="amendment-tally__bar">
        <div class="amendment-tally__yes" style="width:${yesBarWidth}%">
          <span>${gs.yesVotes}</span>
        </div>
        <div class="amendment-tally__no" style="width:${noBarWidth}%">
          <span>${gs.noVotes}</span>
        </div>
        <div class="amendment-tally__threshold" style="left:${thresholdPos}%">
          <span class="amendment-tally__threshold-label">${gs.majorityNeeded}</span>
        </div>
      </div>
      <div class="amendment-tally__labels">
        <span class="amendment-tally__label-yes">YES: ${gs.yesVotes}</span>
        <span class="amendment-tally__label-gap">
          ⚠️ <strong>${gs.missingVotes}</strong> votes short
        </span>
        <span class="amendment-tally__label-no">NO: ${gs.noVotes}</span>
      </div>
    </div>

    <div class="amendment-narrative">
      The vote counting has ground to a halt. Aides rush between benches, 
      whispering frantically. Your bill is <strong>${gs.missingVotes} votes short</strong> 
      of the ${gs.majorityNeeded}-seat majority. The Speaker has called a 30-minute recess.
      Every faction is watching. What will you do?
    </div>

    <div class="amendment-options" id="amendment-options">
      <!-- Rendered by _renderAmendmentOptions() -->
    </div>
  `;

  _renderAmendmentOptions(gs, totalPorkCost, canAffordPork);

  overlay.style.display = 'flex';
}


/**
 * _renderAmendmentOptions() — Renders the 4 resolution buttons.
 * STEP 45 will populate these with full trade-off mechanics.
 */
function _renderAmendmentOptions(gs, totalPorkCost, canAffordPork) {
  const container = document.getElementById('amendment-options');
  if (!container) return;

  const options = [
    {
      id: 'water_down',
      icon: '📝',
      label: 'ยอมแก้ร่าง/ประนีประนอม',
      labelEn: 'Water Down Bill',
      description: 'Gut the controversial clauses to win centrist votes. The bill passes — but its effects are halved.',
      cost: '🎯 Popularity -8',
      tradeoff: 'Bill effects reduced by 50%',
      enabled: true,
      color: 'var(--amber-400)'
    },
    {
      id: 'pork_barrel',
      icon: '💰',
      label: 'ล็อบบี้/แจกกล้วย',
      labelEn: 'Pork Barrel / Lobby',
      description: `Buy the missing ${gs.missingVotes} votes with constituency funding. Full bill effects preserved.`,
      cost: `฿${totalPorkCost}B`,
      tradeoff: 'Risk of corruption scandal',
      enabled: canAffordPork,
      color: 'var(--green-400)'
    },
    {
      id: 'force_whip',
      icon: '🔨',
      label: 'ใช้บารมีนายกฯ บีบ',
      labelEn: 'Force PM Whip',
      description: 'Invoke your authority to force coalition partners into line. The bill passes — but resentment festers.',
      cost: '⚡ All partner loyalty -15%',
      tradeoff: 'Coalition fracture risk',
      enabled: true,
      color: 'var(--red-400)'
    },
    {
      id: 'withdraw',
      icon: '🏳️',
      label: 'ยอมถอย',
      labelEn: 'Withdraw Bill',
      description: 'Pull the bill before the final tally. Save your political capital for another day.',
      cost: '📉 Popularity -5',
      tradeoff: 'No bill effects applied',
      enabled: true,
      color: 'var(--text-muted)'
    }
  ];

  container.innerHTML = '';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `amendment-option ${opt.enabled ? '' : 'disabled'}`;
    btn.disabled = !opt.enabled;
    btn.innerHTML = `
      <div class="amendment-option__header">
        <span class="amendment-option__icon">${opt.icon}</span>
        <div class="amendment-option__labels">
          <div class="amendment-option__label-th">${opt.label}</div>
          <div class="amendment-option__label-en">${opt.labelEn}</div>
        </div>
        <span class="amendment-option__cost" style="color:${opt.color}">${opt.cost}</span>
      </div>
      <div class="amendment-option__desc">${opt.description}</div>
      <div class="amendment-option__tradeoff">⚠️ ${opt.tradeoff}</div>
    `;

    btn.addEventListener('click', () => {
      if (opt.enabled) resolveAmendment(opt.id);
    });

    container.appendChild(btn);
  });
}


// ──────────────────────────────────────────────────────────────
// SECTION 4: AMENDMENT RESOLUTION (Stub — populated in STEP 45)
// ──────────────────────────────────────────────────────────────

/**
 * resolveAmendment(choice) — Handles the player's amendment choice.
 * Full implementation in STEP 45.
 *
 * @param {string} choice — 'water_down' | 'pork_barrel' | 'force_whip' | 'withdraw'
 */
function resolveAmendment(choice) {
  if (!gridlockState || gridlockState.resolved) return;
  gridlockState.resolved = true;

  const gs = gridlockState;
  let result;

  switch (choice) {
    case 'water_down':
      result = _resolveWaterDown(gs);
      break;
    case 'pork_barrel':
      result = _resolvePorkBarrel(gs);
      break;
    case 'force_whip':
      result = _resolveForceWhip(gs);
      break;
    case 'withdraw':
      result = _resolveWithdraw(gs);
      break;
    default:
      console.error('[legislation.js] Unknown amendment choice:', choice);
      return;
  }

  // Close the amendment overlay
  const overlay = document.getElementById('amendment-phase-overlay');
  if (overlay) overlay.style.display = 'none';

  // Show the result in the generic modal
  if (typeof showModal === 'function') {
    showModal(result.html);
  }

  // Refresh all UI
  if (typeof updateStatusBar === 'function') updateStatusBar();
  if (typeof renderParliament === 'function') renderParliament();
  if (typeof renderLaws === 'function') renderLaws();
  if (typeof renderDiplomacyContacts === 'function') renderDiplomacyContacts();

  // Clear gridlock state
  gridlockState = null;

  console.log(`[legislation.js] STEP 44 — Amendment resolved: "${choice}" for "${gs.lawName}".`);
}


// ── Resolution Functions (STEP 45 — Full Implementation) ──

/**
 * _resolveWaterDown(gs) — ยอมแก้ร่าง/ประนีประนอม
 *
 * The bill PASSES — but gutted. All positive effects are halved.
 * Popularity takes a heavy hit (you betrayed your base).
 * Coalition stability gets a small boost (you showed pragmatism).
 */
function _resolveWaterDown(gs) {
  const law = laws.find(l => l.id === gs.lawId);
  if (!law) return { html: '<h3>Error: Law not found</h3>' };

  // Halve the bill's effects
  const halvedEffects = {};
  if (gs.lawEffects) {
    for (const [key, val] of Object.entries(gs.lawEffects)) {
      halvedEffects[key] = Math.round(val * 0.5);
    }
  }

  // Also halve monthly effects
  if (law.monthlyEffects) {
    const halvedMonthly = {};
    for (const [key, val] of Object.entries(law.monthlyEffects)) {
      halvedMonthly[key] = Math.round(val * 0.5);
    }
    law.monthlyEffects = halvedMonthly;
  }

  // Mark as passed with halved effects
  law.passed = true;
  law.wateredDown = true; // Flag for UI display
  gameState.passedLaws.push(gs.lawId);
  applyEffects(halvedEffects);

  // Trade-off: popularity drop + small stability gain
  applyEffects({ popularity: -8, coalitionStability: 5 });

  const narratives = [
    `After frantic backroom negotiations, you emerge with a "compromise" bill — a shadow of the original. The controversial clauses have been gutted, replaced with watered-down language that satisfies nobody but offends nobody enough to vote against. Your base is furious. "Sell-out!" trends on Twitter Thailand.`,
    `The amended bill reads like a different law entirely. Key provisions deleted, enforcement mechanisms weakened, timelines pushed back by years. Opposition leaders smirk. Your own party's idealists look at the floor. But the Speaker announces: "The ayes have it." A hollow victory.`,
    `You personally rewrite three critical sections during the recess, removing everything that made the bill meaningful. It passes — technically. But your core supporters already drafted their press release: "PM Caves to Establishment Pressure."`
  ];

  const effectsHtml = _buildEffectsHtml({
    ...halvedEffects,
    popularity: (halvedEffects.popularity || 0) - 8,
    coalitionStability: (halvedEffects.coalitionStability || 0) + 5
  });

  console.log(`[legislation.js] STEP 45 — Water Down: "${gs.lawName}" passed with halved effects.`);

  return {
    html: `
      <h3 style="color:var(--amber-400);margin-bottom:0.5rem;">📝 Bill Watered Down — Passed (Amended)</h3>
      <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:0.5rem;">
        "${gs.lawName}" has been <strong>enacted in weakened form</strong>. All effects reduced by 50%.
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>
      <div class="diplo-narrative">${narratives[Math.floor(Math.random() * narratives.length)]}</div>
      <div style="font-size:0.7rem;color:var(--amber-400);margin-top:0.5rem;">
        ⚠️ Your approval rating took a hit. Core voters feel betrayed.
      </div>
    `
  };
}


/**
 * _resolvePorkBarrel(gs) — ล็อบบี้/แจกกล้วย
 *
 * The bill PASSES with FULL effects. But it costs ฿50B per missing vote.
 * 40% chance of triggering a corruption scandal (unrest +12, popularity -5).
 */
function _resolvePorkBarrel(gs) {
  const law = laws.find(l => l.id === gs.lawId);
  if (!law) return { html: '<h3>Error: Law not found</h3>' };

  const costPerVote = 50;
  const totalCost = gs.missingVotes * costPerVote;

  // Mark as passed with full effects
  law.passed = true;
  gameState.passedLaws.push(gs.lawId);
  applyEffects(gs.lawEffects);

  // Pay the bribe cost
  gameState.budget -= totalCost;

  // 40% chance of corruption scandal
  const scandalRoll = Math.random();
  const scandalTriggered = scandalRoll < 0.4;

  let scandalHtml = '';
  if (scandalTriggered) {
    applyEffects({ unrest: 12, popularity: -5 });
    scandalHtml = `
      <div style="margin-top:0.75rem;padding:0.6rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;">
        <div style="font-weight:800;color:var(--red-400);font-size:0.8rem;margin-bottom:0.3rem;">
          🚨 CORRUPTION SCANDAL ERUPTS
        </div>
        <div style="font-size:0.72rem;color:var(--text-secondary);">
          A leaked bank transfer links your office to "constituency development payments" made hours before the vote. 
          Opposition files a NACC complaint. Social media erupts with #PorkBarrelPM. 
          <strong>Unrest +12, Popularity -5.</strong>
        </div>
      </div>
    `;
  }

  const narratives = [
    `Envelopes change hands in the parliamentary canteen. "Development funds" are promised to key constituencies. Missing MPs suddenly appear. The vote swings. ฿${totalCost}B well spent — or so you tell yourself.`,
    `Your chief whip makes the rounds with a tablet showing budget allocation spreadsheets. "Your province gets the new hospital," he tells one MP. "Yours gets the highway extension," he tells another. ${gs.missingVotes} MPs switch their votes within the hour.`,
    `A convoy of lobbyists descends on Parliament with briefcases full of "project proposals." By the time the recess ends, every holdout has a reason to vote yes. The opposition leader mutters: "Money politics never dies in this country."`
  ];

  const allEffects = { ...gs.lawEffects, budget: -totalCost };
  if (scandalTriggered) {
    allEffects.unrest = (allEffects.unrest || 0) + 12;
    allEffects.popularity = (allEffects.popularity || 0) - 5;
  }
  const effectsHtml = _buildEffectsHtml(allEffects);

  console.log(`[legislation.js] STEP 45 — Pork Barrel: "${gs.lawName}" passed. Cost: ฿${totalCost}B. Scandal: ${scandalTriggered}`);

  return {
    html: `
      <h3 style="color:var(--green-400);margin-bottom:0.5rem;">💰 Lobby Successful — Bill Passed!</h3>
      <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:0.5rem;">
        "${gs.lawName}" passed with full effects after ฿${totalCost}B in "constituency development."
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>
      <div class="diplo-narrative">${narratives[Math.floor(Math.random() * narratives.length)]}</div>
      ${scandalHtml}
    `
  };
}


/**
 * _resolveForceWhip(gs) — ใช้บารมีนายกฯ บีบ
 *
 * The bill PASSES with FULL effects. But ALL coalition partners
 * lose 15% loyalty. Coalition stability drops by 10.
 */
function _resolveForceWhip(gs) {
  const law = laws.find(l => l.id === gs.lawId);
  if (!law) return { html: '<h3>Error: Law not found</h3>' };

  // Mark as passed with full effects
  law.passed = true;
  gameState.passedLaws.push(gs.lawId);
  applyEffects(gs.lawEffects);

  // Whip penalty: ALL coalition partners lose loyalty
  const corePartyId = (typeof localStorage !== 'undefined' && localStorage.getItem('selectedPartyId')) || '';
  const loyaltyPenalty = 15;
  let affectedParties = [];

  parties.forEach(party => {
    if (party.inCoalition && party.id !== corePartyId) {
      const prevLoyalty = party.coalitionLoyalty || 50;
      party.coalitionLoyalty = Math.max(0, prevLoyalty - loyaltyPenalty);
      party.relation = Math.max(-100, party.relation - 5);
      affectedParties.push({
        name: party.shortName,
        color: party.color,
        prevLoyalty,
        newLoyalty: party.coalitionLoyalty
      });
    }
  });

  // Coalition stability hit
  applyEffects({ coalitionStability: -10 });

  const narratives = [
    `You stride to the podium and invoke Article 159 of the coalition agreement — the nuclear option. "Vote yes, or your party is out of government by morning." The chamber falls silent. One by one, reluctant hands rise. The bill passes. But the cold stares from your own coalition benches say everything.`,
    `Behind closed doors, you deliver the ultimatum: "I made you ministers. I can unmake you." The party whips scramble to enforce discipline. MPs who planned to rebel suddenly find their committee assignments "under review." The vote passes — through fear, not loyalty.`,
    `Your chief of staff delivers sealed letters to each coalition party leader: vote yes or face a cabinet reshuffle by Friday. The message is unmistakable. The bill passes with mechanical precision. But in the parliament café afterward, no one from your coalition will sit at your table.`
  ];

  // Build loyalty damage display
  let loyaltyHtml = affectedParties.map(p =>
    `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.68rem;padding:0.15rem 0;">
      <span style="width:4px;height:14px;border-radius:2px;background:${p.color}"></span>
      <span style="color:var(--text-primary)">${p.name}</span>
      <span style="color:var(--red-400)">${p.prevLoyalty}% → ${p.newLoyalty}%</span>
      <span style="color:var(--text-muted)">(-${loyaltyPenalty}%)</span>
    </div>`
  ).join('');

  const effectsHtml = _buildEffectsHtml({ ...gs.lawEffects, coalitionStability: -10 });

  console.log(`[legislation.js] STEP 45 — Force Whip: "${gs.lawName}" passed. ${affectedParties.length} parties penalized -${loyaltyPenalty}% loyalty.`);

  return {
    html: `
      <h3 style="color:var(--red-400);margin-bottom:0.5rem;">🔨 PM Authority Invoked — Bill Forced Through!</h3>
      <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:0.5rem;">
        "${gs.lawName}" passed with full effects — but at devastating cost to coalition trust.
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>
      <div style="margin-bottom:0.75rem;padding:0.5rem;background:rgba(239,68,68,0.06);border-radius:6px;">
        <div style="font-weight:700;color:var(--red-400);font-size:0.72rem;margin-bottom:0.3rem;">
          ⚡ Coalition Loyalty Damage
        </div>
        ${loyaltyHtml}
      </div>
      <div class="diplo-narrative">${narratives[Math.floor(Math.random() * narratives.length)]}</div>
      <div style="font-size:0.7rem;color:var(--red-400);margin-top:0.5rem;">
        🚨 All coalition partners are now more likely to defect. Consider diplomatic action immediately.
      </div>
    `
  };
}


/**
 * _resolveWithdraw(gs) — ยอมถอย
 *
 * The bill is WITHDRAWN. No effects applied.
 * Moderate popularity hit (-5) from public embarrassment.
 * Small stability boost (+3) — you showed restraint.
 */
function _resolveWithdraw(gs) {
  // Do NOT mark the law as passed — it remains available for future votes
  applyEffects({ popularity: -5, coalitionStability: 3 });

  const narratives = [
    `You approach the Speaker's desk during the recess. "I am withdrawing the bill." The chamber buzzes. Opposition MPs cheer. Your own backbenchers stare at their shoes. The headline writes itself: "PM Backs Down on ${gs.lawName}." But you live to fight another day.`,
    `The withdrawal announcement comes via a terse press release: "The government has decided to postpone the ${gs.lawName} for further consultation." Everyone knows what "postpone" means. Your approval dips, but your coalition exhales with relief.`,
    `You pull the bill minutes before the final count. The Speaker nods. It's over. Walking back to your office, your aide whispers: "You can try again next month, sir." Maybe. But the political wound is fresh.`
  ];

  const effectsHtml = _buildEffectsHtml({ popularity: -5, coalitionStability: 3 });

  console.log(`[legislation.js] STEP 45 — Withdraw: "${gs.lawName}" withdrawn. No effects applied.`);

  return {
    html: `
      <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">🏳️ Bill Withdrawn</h3>
      <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:0.5rem;">
        "${gs.lawName}" has been <strong>withdrawn</strong> before the final vote. 
        No legislative effects applied. The bill can be proposed again later.
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>
      <div class="diplo-narrative">${narratives[Math.floor(Math.random() * narratives.length)]}</div>
    `
  };
}


// ──────────────────────────────────────────────────────────────
// SECTION 5: UTILITY — Effect Chip Builder
// ──────────────────────────────────────────────────────────────

/**
 * _buildEffectsHtml(effects) — Builds colored effect chip HTML from an effects object.
 */
function _buildEffectsHtml(effects) {
  if (!effects) return '';

  const labelMap = {
    popularity: 'Popularity', budget: 'Budget', unrest: 'Unrest',
    growth: 'Growth', militaryPatience: 'Military', coalitionStability: 'Stability'
  };

  return Object.entries(effects)
    .filter(([k, v]) => typeof v === 'number' && v !== 0)
    .map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const isGood = (key === 'popularity' || key === 'budget' || key === 'growth' || key === 'coalitionStability' || key === 'militaryPatience')
        ? val > 0
        : val < 0; // unrest: lower is better
      const cls = isGood ? 'effect-positive' : 'effect-negative';
      return `<span class="effect-chip ${cls}">${labelMap[key] || key}: ${sign}${val}</span>`;
    }).join(' ');
}
