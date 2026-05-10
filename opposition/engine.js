// ═══════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /opposition/engine.js
// STEP 103: The 48-Month Opposition Engine
// ═══════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Manages the 4-year (48-month) opposition term after failing
//   to form a government. The player builds Credibility (0-100)
//   which acts as a modifier for the next election campaign.
//
// localStorage keys (opposition-specific):
//   tps_opp_month, tps_opp_credibility, tps_opp_intel
//   tps_opp_targets (JSON — shadow targets with scandal/isExposed state)
//   tps_opp_sabotage (Coalition sabotage count for PM Firewall)
//
// localStorage keys (shared across modules):
//   tps_funds, tps_capital
//
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// SECTION 1: STATE INITIALIZATION
// ──────────────────────────────────────────────────────────────────

/** Opposition-specific state */
let oppState = {
  month: parseInt(localStorage.getItem('tps_opp_month')) || 1,
  credibility: parseInt(localStorage.getItem('tps_opp_credibility')) || 50,
  intelPoints: parseInt(localStorage.getItem('tps_opp_intel')) || 0,
  ap: parseInt(localStorage.getItem('tps_opp_ap')) || 3,            // STEP 118: Action Points (max 3 per month)
  hasFundraised: localStorage.getItem('tps_opp_fundraised') === 'true', // STEP 118: 1x/month fundraise limit
  sabotagedFirewall: parseInt(localStorage.getItem('tps_opp_sabotage')) || 0, // STEP 145: Coalition sabotage count
  deepInvestigateCount: parseInt(localStorage.getItem('tps_opp_investigate_count')) || 0, // STEP 172: 2/month limit
  fileMotionCount: parseInt(localStorage.getItem('tps_opp_motion_count')) || 0 // STEP 172: 2/month limit
};

// STEP 175: Action cooldown timers (months remaining)
if (typeof oppState.cooldowns === 'undefined') {
  const savedCooldowns = localStorage.getItem('tps_opp_cooldowns');
  oppState.cooldowns = savedCooldowns ? JSON.parse(savedCooldowns) : { publicHearing: 0, crossParty: 0, pressLeak: 0 };
}

// STEP 187: Media Blitz monthly usage counter
if (typeof oppState.mediaBlitzCount === 'undefined') oppState.mediaBlitzCount = parseInt(localStorage.getItem('tps_opp_media_blitz_count')) || 0;

/** Shared resources — carried over from failed campaign/parliament */
let playerStats = {
  funds: parseInt(localStorage.getItem('tps_funds')) || 0,
  capital: parseInt(localStorage.getItem('tps_capital')) || 50
};

/** STEP 110: Activity log — persisted in localStorage */
let oppLog = JSON.parse(localStorage.getItem('tps_opp_logs') || '[]');

/** STEP 104: Currently selected minister target (by ID) */
let activeTargetId = null;

/** STEP 107: shadowTargets — loaded from localStorage or generated from defaults */
let shadowTargets = [];

/**
 * STEP 150: loadAffiliation()
 * Reads the player's selected party from localStorage (tps_player_party)
 * and updates the nav bar affiliation badge with name + color.
 */
function loadAffiliation() {
  const savedPartyData = localStorage.getItem('tps_player_party');
  const partyNameEl = document.getElementById('opp-party-name');
  const partyColorEl = document.getElementById('opp-party-color');

  if (savedPartyData && partyNameEl && partyColorEl) {
    try {
      const party = JSON.parse(savedPartyData);
      partyNameEl.innerText = party.name || 'Opposition Coalition';

      // Apply party color if it exists, otherwise default orange
      const color = party.color || '#f97316';
      partyColorEl.style.backgroundColor = color;
      partyColorEl.style.boxShadow = `0 0 8px ${color}`;
    } catch (e) {
      console.error('[STEP 150] Failed to parse party data:', e);
    }
  }
}

/**
 * STEP 118: updateAPDisplay()
 * Dynamically injects or updates the AP badge in the Oversight Actions header.
 * Shows remaining action points as "⚡ AP: X/3".
 */
function updateAPDisplay() {
  let apBadge = document.getElementById('ap-display-badge');
  if (!apBadge) {
    // Inject next to the Oversight Actions title
    const title = document.querySelector('.center-col h3');
    if (title) {
      title.insertAdjacentHTML('beforeend',
        `<span id="ap-display-badge" style="
          float: right;
          background: ${oppState.ap > 0 ? '#fbbf24' : '#ef4444'};
          color: #000;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          transition: background 0.3s ease;
        ">⚡ AP: ${oppState.ap}/3</span>`);
      apBadge = document.getElementById('ap-display-badge');
    }
  }
  if (apBadge) {
    apBadge.textContent = `⚡ AP: ${oppState.ap}/3`;
    apBadge.style.background = oppState.ap > 0 ? '#fbbf24' : '#ef4444';
  }
}

// ──────────────────────────────────────────────────────────────────
// SECTION 1B: CABINET FIREWALL (Boss Mechanic)
// STEP 125: The PM is the final boss. They cannot be investigated
//           until at least 2 other ministers have been exposed.
// ──────────────────────────────────────────────────────────────────

/** PM target ID — used across firewall logic */
const PM_TARGET_ID = 'pm';

/** Required number of exposed ministers before PM becomes vulnerable */
const PM_FIREWALL_THRESHOLD = 10;

/**
 * STEP 125: getExposedMinistersCount()
 * Counts how many NON-PM ministers have been exposed (resigned).
 * Used to determine if the PM's Cabinet Firewall is still active.
 */
function getExposedMinistersCount() {
  return shadowTargets.filter(t => t.isExposed && t.id !== PM_TARGET_ID).length;
}

/**
 * STEP 125/145: isPMShielded()
 * Returns true if the PM's Cabinet Firewall is active.
 * Effective defeats = exposed ministers + coalition sabotage (defections).
 * When true, all targeted actions against the PM are blocked.
 */
function isPMShielded() {
  const effectiveDefeats = getExposedMinistersCount() + (oppState.sabotagedFirewall || 0);
  return effectiveDefeats < PM_FIREWALL_THRESHOLD;
}

/**
 * STEP 165: getEffectiveFirewall()
 * Returns the total effective firewall breaches (exposed ministers + sabotage).
 * Used for PM targeting checks and UI display.
 */
function getEffectiveFirewall() {
  return getExposedMinistersCount() + (oppState.sabotagedFirewall || 0);
}

// ──────────────────────────────────────────────────────────────────
// SECTION 2: GOVERNMENT MINISTERS (Shadow Targets)
// STEP 107: Persistent target data — loaded/generated via
//           loadOrGenerateTargets(), saved via saveTargets().
// ──────────────────────────────────────────────────────────────────

/** Default minister templates — used when no saved data exists */
const DEFAULT_MINISTERS = [
  { id: 'pm', name: 'นายกรัฐมนตรี (PM)', ministry: 'Office of the PM', corruption: 60, popularity: 55, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'finance', name: 'รมว.คลัง', ministry: 'Finance', corruption: 45, popularity: 40, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'interior', name: 'รมว.มหาดไทย', ministry: 'Interior', corruption: 70, popularity: 35, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'defense', name: 'รมว.กลาโหม', ministry: 'Defense', corruption: 50, popularity: 45, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'education', name: 'รมว.ศึกษาธิการ', ministry: 'Education', corruption: 30, popularity: 60, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'health', name: 'รมว.สาธารณสุข', ministry: 'Public Health', corruption: 25, popularity: 65, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'commerce', name: 'รมว.พาณิชย์', ministry: 'Commerce', corruption: 55, popularity: 38, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false },
  { id: 'transport', name: 'รมว.คมนาคม', ministry: 'Transport', corruption: 65, popularity: 42, investigated: false, scandalLevel: 0, isExposed: false, hasShadow: false }
];

/**
 * STEP 107: loadOrGenerateTargets()
 * Loads shadow targets from localStorage if saved, otherwise generates
 * a fresh set from DEFAULT_MINISTERS with randomized popularity.
 */
function loadOrGenerateTargets() {
  const saved = localStorage.getItem('tps_opp_targets');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        shadowTargets = parsed;
        // STEP 152: Safe-patch for old saves missing hasShadow
        shadowTargets.forEach(t => {
          if (typeof t.hasShadow === 'undefined') t.hasShadow = false;
          // STEP 161: Safe-patch for old saves missing investigatedTimer
          if (typeof t.investigatedTimer === 'undefined') t.investigatedTimer = 0;
        });
        console.log(`[engine.js] STEP 107 — Loaded ${shadowTargets.length} targets from localStorage.`);
        shadowTargets.forEach(t => {
          console.log(`  → ${t.name} | Scandal: ${t.scandalLevel}/10 | Exposed: ${t.isExposed} | Shadow: ${t.hasShadow}`);
        });
        return;
      }
    } catch (e) {
      console.warn('[engine.js] STEP 107 — Failed to parse saved targets:', e);
    }
  }

  // No saved data — generate from defaults with slight pop randomization
  shadowTargets = DEFAULT_MINISTERS.map(m => ({
    ...m,
    popularity: m.popularity + Math.floor(Math.random() * 11) - 5  // ±5 jitter
  }));
  saveTargets();
  console.log(`[engine.js] STEP 107 — Generated ${shadowTargets.length} fresh targets.`);
}

/**
 * STEP 107: saveTargets()
 * Persists the current shadowTargets array (with scandal, isExposed, etc.)
 * to localStorage so progress survives page refresh.
 */
function saveTargets() {
  localStorage.setItem('tps_opp_targets', JSON.stringify(shadowTargets));
}

// ──────────────────────────────────────────────────────────────────
// SECTION 3: OPPOSITION ACTIONS (Tactics Grid)
// ──────────────────────────────────────────────────────────────────

const OPP_ACTIONS = {
  file_motion: {
    id: 'file_motion', label: 'File Motion', labelTH: 'ยื่นญัตติ', icon: '📋',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by executeAction in standalone fn
    needsTarget: true,
    description: 'File a motion. 5 Cap, 1 AP. Max 2/month.',
    execute(minister) {
      // Delegate to standalone function
      actionFileMotion();
      return { success: true, msg: '' }; // Toast handled by standalone
    }
  },
  deep_investigate: {
    id: 'deep_investigate', label: 'Deep Investigate', labelTH: 'สอบสวนลึก', icon: '🔬',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by executeAction in standalone fn
    needsTarget: true,
    description: 'Marks target for +10% DMG for 4 months. Intel +1-2.',
    execute(minister) {
      // Delegate to standalone function
      actionDeepInvestigate();
      return { success: true, msg: '' }; // Toast handled by standalone
    }
  },
  press_leak: {
    id: 'press_leak', label: 'Press Leak', labelTH: 'ปล่อยข่าว', icon: '📰',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by standalone
    needsTarget: true,
    description: 'Leak findings to press. CD: 2mo.',
    execute(minister) {
      actionPressLeak();
      return { success: true, msg: '' };
    }
  },
  public_hearing: {
    id: 'public_hearing', label: 'Public Hearing', labelTH: 'ประชาพิจารณ์', icon: '🗣️',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by standalone
    needsTarget: false,
    description: 'Public hearing. +10 Cap, +2 Cred. CD: 4mo.',
    execute() {
      actionPublicHearing();
      return { success: true, msg: '' };
    }
  },
  cross_party: {
    id: 'cross_party', label: 'Cross-Party Alliance', labelTH: 'พันธมิตรข้ามพรรค', icon: '🤝',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by standalone
    needsTarget: false,
    description: 'Build alliances. +3 Cred, +2 Scandal. CD: 6mo.',
    execute() {
      actionCrossPartyAlliance();
      return { success: true, msg: '' };
    }
  },
  commission_poll: {
    id: 'commission_poll', label: 'Commission Poll', labelTH: 'จ้างสำรวจโพล', icon: '📊',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by standalone
    needsTarget: false,
    description: 'Commission a public opinion poll. Nerfed credibility.',
    execute() {
      actionCommissionPoll();
      return { success: true, msg: '' };
    }
  },
  fundraise: {
    id: 'fundraise', label: 'Fundraise', labelTH: 'ระดมทุน', icon: '💵',
    costFunds: 0, costCapital: 0, costIntel: 0,
    needsTarget: false,
    description: 'Raise funds for opposition operations. (1x per month)',
    // STEP 122: preCheck runs BEFORE AP/cost deduction
    preCheck() {
      if (oppState.hasFundraised) {
        return { pass: false, msg: '💵 You can only fundraise once per month. Wait for next month.' };
      }
      return { pass: true };
    },
    execute() {
      // STEP 120: Buffed yield — old: 30-80M, new: 45-120M (+50%)
      const raised = 45 + Math.floor(Math.random() * 76);
      playerStats.funds += raised;
      oppState.hasFundraised = true;
      localStorage.setItem('tps_opp_fundraised', 'true');
      return { success: true, msg: `💵 Fundraising raised ฿${raised}M for opposition operations. (Limit reached for this month)` };
    }
  },
  media_blitz: {
    id: 'media_blitz', label: 'Media Blitz', labelTH: 'บุกสื่อ', icon: '📺',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled by standalone
    needsTarget: false,
    description: 'National media campaign. 1/month. +3 Intel. No scandal.',
    execute(minister) {
      actionMediaBlitz();
      return { success: true, msg: '' };
    }
  },
  // ═══════════════════════════════════════════════════════════════
  // STEP 106: THE NO-CONFIDENCE VOTE — The Ultimate Strike
  // Requires Scandal 10/10. On success, minister is marked isExposed
  // (neutralized/resigned). Massive +20 Credibility reward.
  // ═══════════════════════════════════════════════════════════════
  no_confidence: {
    id: 'no_confidence', label: 'No-Confidence Vote', labelTH: 'อภิปรายไม่ไว้วางใจ', icon: '⚖️',
    costFunds: 0, costCapital: 0, costIntel: 0, // Costs handled manually in actionNoConfidence
    needsTarget: true,
    description: 'The ultimate weapon. Costs 3 AP, ฿100M, 20 Cap, 10 Intel. Requires max Scandal.',
    preCheck(minister) {
      // Redirect to standalone function — preCheck just validates scandal
      const requiredScandal = (minister.id === PM_TARGET_ID) ? 50 : 30;
      if (minister.scandalLevel < requiredScandal) {
        return { pass: false, msg: `⚖️ Need ${requiredScandal}/${requiredScandal} Scandal! Current: ${minister.scandalLevel}/${requiredScandal}.` };
      }
      return { pass: true };
    },
    execute(minister) {
      // Delegate to standalone function for manual cost enforcement
      actionNoConfidence();
      return { success: true, msg: '' }; // Toast handled by actionNoConfidence
    }
  }
};

// ──────────────────────────────────────────────────────────────────
// SECTION 4: CORE ENGINE FUNCTIONS
// ──────────────────────────────────────────────────────────────────

/**
 * STEP 156.5: applySidebarUIFix()
 * Injects CSS hotfix to prevent target cards from being squished.
 * Makes the left column scrollable with a sleek dark scrollbar.
 */
function applySidebarUIFix() {
  if (document.getElementById('tps-sidebar-hotfix')) return;

  const style = document.createElement('style');
  style.id = 'tps-sidebar-hotfix';
  style.innerHTML = `
    /* 1. Make the left column scrollable and set a max height */
    .left-col {
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      padding-right: 12px;
      display: flex;
      flex-direction: column;
    }

    /* 2. FORBID the cards from shrinking and ensure minimum height */
    .minister-card {
      flex-shrink: 0 !important;
      min-height: 95px !important;
      margin-bottom: 12px !important;
    }

    /* 3. Sleek Dark Mode Scrollbar Styling */
    .left-col::-webkit-scrollbar {
      width: 6px;
    }
    .left-col::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
    }
    .left-col::-webkit-scrollbar-thumb {
      background: #4b5563;
      border-radius: 10px;
    }
    .left-col::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
  `;
  document.head.appendChild(style);
}

/** STEP 109: Initialize the opposition module — called on window.onload */
function initOpposition() {
  // STEP 156.5: Apply sidebar layout fix BEFORE any rendering
  applySidebarUIFix();
  console.log('[opposition/engine.js] STEP 109 — Initializing Opposition HQ');

  // STEP 107: Load or generate shadow targets from localStorage
  loadOrGenerateTargets();

  console.log(`  Month: ${oppState.month}/48 | Credibility: ${oppState.credibility} | Intel: ${oppState.intelPoints}`);
  console.log(`  Funds: ฿${playerStats.funds}M | Capital: ${playerStats.capital} | AP: ${oppState.ap}/3`);
  console.log(`  Targets: ${shadowTargets.length} loaded | Exposed: ${shadowTargets.filter(t => t.isExposed).length}`);

  // STEP 113: Inject the Crisis Modal into the DOM (if not already present)
  injectCrisisModal();

  // STEP 135: Inject the Judicial Strike button below the action grid
  injectJudicialButton();

  // STEP 138: Inject the Draft Shadow Bill button in the Command Center
  injectDraftBillButton();

  // STEP 108: Render the target cards (replaces "Minister data loading..." placeholder)
  renderTargetMinisters();
  renderActionGrid();

  // STEP 146: Inject sabotage button AFTER renderActionGrid (so it isn't overwritten)
  injectSabotageButton();

  // STEP 160: Inject Shadow Cabinet panel button
  injectShadowCabinetButton();

  renderLogs();  // STEP 110: Restore log entries from localStorage
  loadAffiliation(); // STEP 150: Populate party badge from localStorage
  updateUI();
  updateActionButtonsUI(); // STEP 123: Apply AP exhaustion state on boot
  updateParliamentScheduleUI(); // STEP 137: Apply recess state on boot
  applyButtonTextHotfixes(); // STEP 158: Fix button text labels
  updateShadowBillButtonUI(); // STEP 185: Update shadow bill button UI
}

/**
 * STEP 173: applyButtonTextHotfixes() — Aggressive 4-Button Override
 * Forcefully rewrites HTML and onclick for Fundraise, No-Confidence,
 * Deep Investigate, and File Motion to remove "FREE" bugs and ensure
 * correct routing to standalone functions.
 */
function applyButtonTextHotfixes() {
  const buttons = document.querySelectorAll('.center-col button, .center-col .action-btn, #opposition-action-grid button, .action-btn.opp-action');
  buttons.forEach(btn => {
    const htmlStr = btn.innerHTML;

    // Fix Fundraise Button
    if (htmlStr.includes('Fundraise') || htmlStr.includes('ระดมทุน')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">💰</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">Fundraise</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">ระดมทุน &bull; <span style="color:#fbbf24;">1 AP</span></div></div>`;
      btn.setAttribute('onclick', "executeOppAction('fundraise')");
    }

    // Fix No-Confidence Button
    if (htmlStr.includes('No-Confidence') || htmlStr.includes('อภิปรายไม่ไว้วางใจ')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">⚖️</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">No-Confidence Vote</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">อภิปราย &bull; ฿100M &bull; 20 Cap &bull; 10 Intel &bull; <span style="color:#fbbf24;">3 AP</span></div></div>`;
      btn.setAttribute('onclick', 'actionNoConfidence()');
    }

    // Fix Deep Investigate Button
    if (htmlStr.includes('Deep Investigate') || htmlStr.includes('สอบสวนลึก')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">🔬</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">Deep Investigate</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">สอบสวนลึก &bull; ฿30M &bull; <span style="color:#fbbf24;">1 AP</span></div></div>`;
      btn.setAttribute('onclick', 'actionDeepInvestigate()');
    }

    // Fix File Motion Button
    if (htmlStr.includes('File Motion') || htmlStr.includes('ยื่นญัตติ')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">📋</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">File Motion</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">ยื่นญัตติ &bull; 5 Cap &bull; <span style="color:#fbbf24;">1 AP</span></div></div>`;
      btn.setAttribute('onclick', 'actionFileMotion()');
    }

    // Fix Press Leak Button
    if (htmlStr.includes('Press Leak') || htmlStr.includes('ปล่อยข่าว')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">📰</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">Press Leak</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">ปล่อยข่าว &bull; ฿20M &bull; 3 Intel &bull; <span style="color:#fbbf24;">1 AP</span> &bull; <span style="color:#f87171;">CD 2mo</span></div></div>`;
      btn.setAttribute('onclick', 'actionPressLeak()');
    }

    // Fix Public Hearing Button
    if (htmlStr.includes('Public Hearing') || htmlStr.includes('ประชาพิจารณ์')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">🗣️</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">Public Hearing</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">ประชาพิจารณ์ &bull; ฿40M &bull; 5 Cap &bull; <span style="color:#fbbf24;">1 AP</span> &bull; <span style="color:#f87171;">CD 4mo</span></div></div>`;
      btn.setAttribute('onclick', 'actionPublicHearing()');
    }

    // Fix Cross-Party Alliance Button
    if (htmlStr.includes('Cross-Party') || htmlStr.includes('พันธมิตร')) {
      btn.innerHTML = `<div style="font-size:1.4rem;">🤝</div><div style="text-align:center;"><div style="margin:0;font-size:0.85rem;font-weight:700;color:#e5e7eb;">Cross-Party Alliance</div><div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">พันธมิตร &bull; 8 Cap &bull; <span style="color:#fbbf24;">1 AP</span> &bull; <span style="color:#f87171;">CD 6mo</span></div></div>`;
      btn.setAttribute('onclick', 'actionCrossPartyAlliance()');
    }
  });
}

/** STEP 111: Advance to the next month — with monthly income & smart decay */
function advanceMonth() {
  if (oppState.month >= 48) {
    triggerGrandFinale(false); // STEP 192: Normal end of term
    return;
  }

  // ── STEP 115: Government Retaliation check (25% chance) ──
  // Must resolve crisis BEFORE the month advances.
  // _eventResolved flag prevents infinite loop when resolveEvent() re-calls advanceMonth().
  if (_eventResolved) {
    _eventResolved = false; // Reset flag — proceed to advance normally
  } else if (checkMonthlyEvents()) {
    return; // Event fired — modal is open, month paused until player resolves
  }

  oppState.month++;

  // ── STEP 161: Decay investigatedTimer on all targets ──
  shadowTargets.forEach(t => {
    if (t.investigatedTimer > 0) t.investigatedTimer--;
  });
  saveTargets();

  oppState.ap = 3;                // Reset Action Points
  oppState.hasFundraised = false; // Reset Fundraise limit
  oppState.deepInvestigateCount = 0; // STEP 172: Reset investigate uses
  oppState.fileMotionCount = 0;      // STEP 172: Reset file motion uses
  oppState.mediaBlitzCount = 0;      // STEP 187: Reset media blitz uses

  localStorage.setItem('tps_opp_ap', '3');
  localStorage.setItem('tps_opp_fundraised', 'false');
  localStorage.setItem('tps_opp_investigate_count', '0');
  localStorage.setItem('tps_opp_motion_count', '0');
  localStorage.setItem('tps_opp_media_blitz_count', '0');

  // STEP 175: Decrement action cooldowns
  if (oppState.cooldowns.publicHearing > 0) oppState.cooldowns.publicHearing--;
  if (oppState.cooldowns.crossParty > 0) oppState.cooldowns.crossParty--;
  if (oppState.cooldowns.pressLeak > 0) oppState.cooldowns.pressLeak--;
  localStorage.setItem('tps_opp_cooldowns', JSON.stringify(oppState.cooldowns));

  // STEP 184: Decrement Shadow Bill buff timer
  if (typeof oppState.shadowBillBuffTimer === 'undefined') oppState.shadowBillBuffTimer = parseInt(localStorage.getItem('tps_opp_shadow_buff_timer')) || 0;
  if (oppState.shadowBillBuffTimer > 0) {
    oppState.shadowBillBuffTimer--;
    localStorage.setItem('tps_opp_shadow_buff_timer', String(oppState.shadowBillBuffTimer));
    if (oppState.shadowBillBuffTimer === 0) showToast('📉 Shadow Bill Resource Buff has expired.', 'info');
  }

  // ── Monthly opposition party allowance ──
  const monthlyFunds = 50;
  const monthlyCapital = 20; // STEP 161: BUFFED from 5 → 20
  playerStats.funds += monthlyFunds;
  playerStats.capital = Math.min(100, playerStats.capital + monthlyCapital);

  // ── Credibility decay: passive erosion every 3 months (public forgets) ──
  if (oppState.month % 3 === 0) {
    const decay = 1 + Math.floor(Math.random() * 2);
    oppState.credibility = Math.max(0, oppState.credibility - decay);
    logAction(`⏳ Public memory fades. Credibility -${decay} (passive decay).`, 'info');
  }

  // ── High-credibility natural decay (hard to stay above 70) ──
  if (oppState.credibility > 70 && Math.random() > 0.5) {
    oppState.credibility -= 1;
    logAction(`📉 Media attention shifts. Credibility -1 (high-cred decay).`, 'info');
  }

  // ── Intel decay every 6 months ──
  if (oppState.month % 6 === 0 && oppState.intelPoints > 0) {
    const decay = Math.floor(oppState.intelPoints * 0.1);
    oppState.intelPoints = Math.max(0, oppState.intelPoints - decay);
    if (decay > 0) logAction(`🔍 Old intel expired. Intel -${decay}.`, 'info');
  }

  // ── STEP 134: EVENT OVERRIDE LOGIC ──
  // Every 12th month is an Annual Budget Debate — overrides normal RNG events
  if (oppState.month % 12 === 0) {
    const fiscalYear = Math.ceil(oppState.month / 12);
    logAction(`⏩ Started Month ${oppState.month}. AP restored! Received party funding (+฿${monthlyFunds}M, +${monthlyCapital} Capital).`, 'info');
    logAction(`📊 FISCAL YEAR ${fiscalYear} BUDGET SESSION — The annual budget debate is upon you!`, 'warning');

    // ── STEP 156: Shadow Cabinet Passive Buffs ──
    const activeShadows156a = shadowTargets.filter(t => t.hasShadow && !t.isExposed).length;
    if (activeShadows156a > 0) {
      // STEP 178: BUFFED — 3 Intel per shadow minister (was 1)
      const intelGained = activeShadows156a * 3;
      oppState.intelPoints = Math.min(100, oppState.intelPoints + intelGained);
      logAction(`👤 Shadow Cabinet gathered +${intelGained} Intel this month.`, 'info');
      if (activeShadows156a >= 4) {
        oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 2);
        logAction(`👑 Government-in-Waiting Synergy: The public sees you as a viable alternative. Credibility +2.`, 'success');
        if (oppState.month % 3 === 0) showToast('👑 Shadow Cabinet is providing passive Credibility!', 'success');
      }
    }

    saveState();
    updateUI();
    updateActionButtonsUI();
    updateParliamentScheduleUI(); // STEP 137

    // Fire the mandatory budget modal AFTER state is saved
    showBudgetModal();
  } else {
    // Normal months: standard random event (30% chance)
    if (Math.random() < 0.30) {
      triggerRandomEvent();
    }

    logAction(`⏩ Started Month ${oppState.month}. AP restored! Received party funding (+฿${monthlyFunds}M, +${monthlyCapital} Capital).`, 'info');

    // ── STEP 156: Shadow Cabinet Passive Buffs ──
    const activeShadows156b = shadowTargets.filter(t => t.hasShadow && !t.isExposed).length;
    if (activeShadows156b > 0) {
      // STEP 178: BUFFED — 3 Intel per shadow minister (was 1)
      const intelGained = activeShadows156b * 3;
      oppState.intelPoints = Math.min(100, oppState.intelPoints + intelGained);
      logAction(`👤 Shadow Cabinet gathered +${intelGained} Intel this month.`, 'info');
      if (activeShadows156b >= 4) {
        oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 2);
        logAction(`👑 Government-in-Waiting Synergy: The public sees you as a viable alternative. Credibility +2.`, 'success');
        if (oppState.month % 3 === 0) showToast('👑 Shadow Cabinet is providing passive Credibility!', 'success');
      }
    }

    saveState();
    updateUI();
    updateActionButtonsUI(); // STEP 123: Re-enable buttons after AP reset
    updateShadowBillButtonUI(); // STEP 185: Update shadow bill UI
    updateParliamentScheduleUI(); // STEP 137
  }
}

/** STEP 105: Execute an opposition action — uses ID-based targeting + isExposed check */
function executeOppAction(actionId) {
  const action = OPP_ACTIONS[actionId];
  if (!action) { showToast('Unknown action.', 'error'); return; }

  // STEP 119: Action Points gate — every action costs 1 AP
  if (oppState.ap <= 0) {
    showToast('⚡ Out of Action Points! Advance to next month to reset.', 'error');
    return;
  }

  // Cost validation
  if (playerStats.funds < (action.costFunds || 0)) {
    showToast(`Insufficient funds. Need ฿${action.costFunds}M.`, 'error'); return;
  }
  if (playerStats.capital < (action.costCapital || 0)) {
    showToast(`Insufficient capital. Need ${action.costCapital}.`, 'error'); return;
  }
  if (oppState.intelPoints < (action.costIntel || 0)) {
    showToast(`Insufficient intel. Need ${action.costIntel}.`, 'error'); return;
  }

  // STEP 104: Target validation — ID-based lookup
  let minister = null;
  if (action.needsTarget) {
    if (!activeTargetId) {
      showToast('Select a Shadow Target first!', 'warning'); return;
    }
    minister = shadowTargets.find(t => t.id === activeTargetId);
    if (!minister) {
      showToast('Target not found.', 'error'); return;
    }
    // STEP 106: Block actions on neutralized targets
    if (minister.isExposed) {
      showToast(`${minister.name} has already been neutralized.`, 'info'); return;
    }

    // STEP 196: BOSS FIGHT PHASE 1 — Only block PM if firewall < 7
    // Phase 2 (fw 7-9) allows actions but executeAction nullifies scandal damage.
    if (minister.id === PM_TARGET_ID && getEffectiveFirewall() < 7) {
      showToast(`🛡️ The PM is unreachable! Break at least 7 layers first. (Current: ${getEffectiveFirewall()}/10)`, 'error');
      return; // EXIT — zero AP/resources consumed
    }
  }

  // STEP 122: Custom preCheck gate — runs BEFORE any AP/cost deduction
  // This prevents wasting AP on actions that will fail due to custom conditions
  // (e.g., scandal < 10 for No-Confidence, hasFundraised for Fundraise)
  if (typeof action.preCheck === 'function') {
    const check = action.preCheck(minister);
    if (!check.pass) {
      showToast(check.msg, 'warning');
      return; // EXIT — zero resources consumed
    }
  }

  // Deduct costs + 1 AP (only after ALL validations pass)
  oppState.ap -= 1; // STEP 119: Consume 1 Action Point
  playerStats.funds -= (action.costFunds || 0);
  playerStats.capital -= (action.costCapital || 0);
  oppState.intelPoints -= (action.costIntel || 0);

  // Execute
  const result = action.execute(minister);
  logAction(result.msg, result.success ? 'success' : 'fail');
  showToast(result.msg, result.success ? 'success' : 'error');

  saveState();
  saveTargets(); // STEP 107: Persist scandal/isExposed changes
  updateUI();    // Updates top bar stats + AP badge
  updateActionButtonsUI(); // STEP 123: Check if AP exhausted
  renderTargetMinisters(); // refresh scandal levels + resigned state
}

/**
 * STEP 157: executeAction() — Standalone action executor with custom AP costs
 * and dynamic Scandal caps (PM = 50, Ministers = 30).
 * Used by rebalanced actions (No-Confidence, etc.) that need flexible AP costs.
 *
 * @param {string} actionName — Display name for toasts
 * @param {Object} costs — { funds, capital, intel }
 * @param {Object} effects — { intelGain, fundsGain, credibilityGain, scandalGain }
 * @param {boolean} needsTarget — Whether a target must be selected
 * @param {number} apCost — Custom AP cost (default 1)
 * @returns {boolean} — Whether the action executed successfully
 */
function executeAction(actionName, costs, effects, needsTarget = true, apCost = 1) {
  if (needsTarget && !activeTargetId) {
    showToast(`Select a Shadow Target before using ${actionName}.`, 'warning');
    return false;
  }

  const target = needsTarget ? shadowTargets.find(t => t.id === activeTargetId) : null;
  if (needsTarget && target && target.isExposed) {
    showToast('This minister is already neutralized.', 'info');
    return false;
  }

  // AP gate
  if (oppState.ap < apCost) {
    showToast(`Not enough AP! Need ${apCost} AP.`, 'error');
    return false;
  }

  // Resource gates
  if ((costs.funds && playerStats.funds < costs.funds) ||
    (costs.capital && playerStats.capital < costs.capital) ||
    (costs.intel && (oppState.intelPoints || 0) < costs.intel)) {
    showToast(`Not enough resources for ${actionName}.`, 'error');
    return false;
  }

  // STEP 166: PM PHASE 2 IMMUNITY — normal actions can't touch PM until FW fully broken
  if (needsTarget && target && target.id === PM_TARGET_ID && getEffectiveFirewall() < 10) {
    showToast("The PM's inner firewall is still active! You must use Judicial Strike to shatter the remaining defenses.", 'warning');
    return false;
  }

  // Deduct
  oppState.ap -= apCost;
  if (costs.funds) playerStats.funds = Math.max(0, playerStats.funds - costs.funds);
  if (costs.capital) playerStats.capital = Math.max(0, playerStats.capital - costs.capital);
  if (costs.intel) oppState.intelPoints = Math.max(0, oppState.intelPoints - costs.intel);

  // Apply effects
  let iGain = effects.intelGain || 0;
  let fGain = effects.fundsGain || 0;
  let cGain = effects.capitalGain ? Math.ceil(effects.capitalGain * 1.5) : 0; // Base 1.5x capital buff

  // STEP 184: Shadow Bill 20% Resource Buff (never buffs scandal)
  if (oppState.shadowBillBuffTimer > 0) {
    iGain = Math.ceil(iGain * 1.2);
    fGain = Math.ceil(fGain * 1.2);
    cGain = Math.ceil(cGain * 1.2);
  }

  if (iGain > 0) oppState.intelPoints = Math.min(100, (oppState.intelPoints || 0) + iGain);
  if (fGain > 0) playerStats.funds += fGain;
  if (cGain > 0) playerStats.capital = Math.min(100, playerStats.capital + cGain);

  // STEP 166: Global 50% Credibility nerf
  if (effects.credibilityGain) {
    const halvedCred = Math.ceil(effects.credibilityGain / 2);
    oppState.credibility = Math.min(100, oppState.credibility + halvedCred);
  }

  // Scandal Damage (NOT buffed by Shadow Bill — intentionally excluded)
  if (needsTarget && target && effects.scandalGain) {
    // 1. Double the base damage
    let baseScandal = effects.scandalGain * 2;
    // 2. Deep Investigate Combo: +10% if investigatedTimer active
    if (target.investigatedTimer > 0) baseScandal = Math.ceil(baseScandal * 1.10);

    // 3. Shadow Cabinet Bonus — STEP 178: BUFFED to +3
    let bonus = target.hasShadow ? 3 : 0;
    let totalScandal = baseScandal + bonus;

    // ── STEP 194: BOSS FIGHT PHASE 2 — PM DAMAGE IMMUNITY ──
    if (target.id === PM_TARGET_ID && getEffectiveFirewall() < 10) {
      totalScandal = 0;
      setTimeout(() => showToast("🛡️ The PM's inner firewall deflected the scandal! You MUST use Judicial Strike to break the final layers!", 'warning'), 500);
    }

    // ── STEP 198: EXPLICIT SCANDAL CAP (no Math.min chain) ──
    const maxScandal = (target.id === PM_TARGET_ID) ? 50 : 30;

    // Apply damage: add first, then hard-clamp
    target.scandalLevel = target.scandalLevel + totalScandal;
    if (target.scandalLevel > maxScandal) {
      target.scandalLevel = maxScandal;
    }

    if (bonus > 0 && totalScandal > 0) {
      setTimeout(() => showToast(`🎯 Shadow Bonus: +3 Scandal!`, 'info'), 1000);
    }
  }

  localStorage.setItem('tps_opp_ap', oppState.ap);
  saveState();
  saveTargets();
  updateUI();
  updateActionButtonsUI();
  if (needsTarget) renderTargetMinisters();
  return true;
}

/**
 * STEP 140: tryEnterParliament() — Parliament Gatekeeper
 * Intercepts navigation to check recess schedule before allowing entry.
 * During recess: shows error toast, logs attempt, blocks navigation.
 * During session: saves state and navigates to /parliament-test/.
 */
function tryEnterParliament() {
  const monthInYear = ((oppState.month - 1) % 12) + 1;
  const isRecess = [5, 6, 11, 12].includes(monthInYear);

  if (isRecess) {
    const monthNames = { 5: 'May', 6: 'June', 11: 'November', 12: 'December' };
    showToast(`🔒 Parliament is in RECESS (${monthNames[monthInYear]}). Sessions resume next open month.`, 'error');
    logAction(`🏛️ Attempted to enter Parliament, but the session is closed (Month ${monthInYear} — Recess).`, 'warning');
    return;
  }

  // Save everything before leaving the opposition module
  saveState();
  saveTargets();
  window.location.href = '../parliament-test/index.html';
}

/** Legacy alias — redirects to the new gatekeeper */
function goToParliament() {
  tryEnterParliament();
}

/**
 * STEP 112: triggerElectionPrep() — The Campaign Bridge
 * Fires when month exceeds 48. Calculates legacy buffs from final
 * Credibility, cleans up opposition localStorage, and redirects
 * to the campaign module for a new election cycle.
 */
function triggerElectionPrep() {
  const finalCred = oppState.credibility;
  const exposedCount = shadowTargets.filter(t => t.isExposed).length;

  // ── 1. Calculate Legacy Buffs based on final Credibility ──
  let startingPollBuff = 0;
  let startingFundsBuff = 0;

  if (finalCred >= 80) {
    startingPollBuff = 10;   // Massive +10% to starting polls
    startingFundsBuff = 500; // ฿500M war chest
  } else if (finalCred >= 60) {
    startingPollBuff = 5;
    startingFundsBuff = 200;
  } else if (finalCred >= 40) {
    startingPollBuff = 2;
    startingFundsBuff = 50;
  } else if (finalCred <= 30) {
    startingPollBuff = -5;   // Penalty for terrible opposition work
    startingFundsBuff = -100;
  }

  // Bonus for each minister taken down
  startingPollBuff += exposedCount * 2;
  startingFundsBuff += exposedCount * 50;

  // ── 2. Save legacy buffs for the Campaign module to read ──
  localStorage.setItem('tps_legacy_poll_buff', String(startingPollBuff));
  localStorage.setItem('tps_legacy_funds_buff', String(startingFundsBuff));
  localStorage.setItem('tps_opp_credibility_final', String(finalCred));
  localStorage.setItem('tps_opp_ministers_exposed', String(exposedCount));

  // ── 3. Clear opposition-specific saves to reset the cycle ──
  localStorage.removeItem('tps_opp_month');
  localStorage.removeItem('tps_opp_credibility');
  localStorage.removeItem('tps_opp_intel');
  localStorage.removeItem('tps_opp_targets');
  localStorage.removeItem('tps_opp_logs');

  // ── 4. Log final summary ──
  console.log(`[engine.js] STEP 112 — END OF OPPOSITION TERM`);
  console.log(`  Final Credibility: ${finalCred}/100`);
  console.log(`  Ministers Exposed: ${exposedCount}/${shadowTargets.length}`);
  console.log(`  Legacy Poll Buff: ${startingPollBuff > 0 ? '+' : ''}${startingPollBuff}%`);
  console.log(`  Legacy Funds Buff: ${startingFundsBuff > 0 ? '+' : ''}฿${startingFundsBuff}M`);

  // ── 5. Alert the player and redirect ──
  const resultEmoji = finalCred >= 60 ? '🏆' : finalCred >= 40 ? '📊' : '💀';
  alert(
    `${resultEmoji} END OF TERM!\n\n` +
    `Your 4 years as Opposition Leader are over.\n` +
    `Final Credibility: ${finalCred}/100\n` +
    `Ministers Exposed: ${exposedCount}\n\n` +
    `━━━ Legacy Effects for Next Election ━━━\n` +
    `Starting Polls: ${startingPollBuff > 0 ? '+' : ''}${startingPollBuff}%\n` +
    `Starting Funds: ${startingFundsBuff > 0 ? '+' : ''}฿${startingFundsBuff}M`
  );

  window.location.href = '../campaign/index.html';
}

// ──────────────────────────────────────────────────────────────────
// SECTION 5: RANDOM EVENTS
// ──────────────────────────────────────────────────────────────────

const RANDOM_EVENTS = [
  { msg: '📰 Government corruption scandal leaked by whistleblower!', effect() { oppState.credibility = Math.min(100, oppState.credibility + 3); oppState.intelPoints += 2; } },
  { msg: '🏛️ PM makes popular policy announcement — public approves.', effect() { oppState.credibility = Math.max(0, oppState.credibility - 2); } },
  { msg: '💰 Anonymous donor supports opposition cause!', effect() { playerStats.funds += 40; } },
  { msg: '⚡ Coalition infighting — government weakened.', effect() { oppState.credibility = Math.min(100, oppState.credibility + 2); playerStats.capital = Math.min(100, playerStats.capital + 3); } },
  { msg: '📺 Government-friendly media runs smear campaign against you.', effect() { oppState.credibility = Math.max(0, oppState.credibility - 3); } },
  { msg: '🤝 Former government ally defects to opposition!', effect() { oppState.credibility = Math.min(100, oppState.credibility + 4); playerStats.capital = Math.min(100, playerStats.capital + 5); } },
  { msg: '⚖️ Constitutional Court rules in government favor on disputed law.', effect() { oppState.credibility = Math.max(0, oppState.credibility - 1); } },
  { msg: '🔍 Opposition research team uncovers hidden budget irregularities.', effect() { oppState.intelPoints += 4; oppState.credibility = Math.min(100, oppState.credibility + 2); } }
];

function triggerRandomEvent() {
  const evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  evt.effect();
  logAction(`🎲 EVENT: ${evt.msg}`, 'info');
}

// ──────────────────────────────────────────────────────────────────
// SECTION 6: PERSISTENCE
// ──────────────────────────────────────────────────────────────────

function saveState() {
  localStorage.setItem('tps_opp_month', String(oppState.month));
  localStorage.setItem('tps_opp_credibility', String(oppState.credibility));
  localStorage.setItem('tps_opp_intel', String(oppState.intelPoints));
  localStorage.setItem('tps_opp_ap', String(oppState.ap));                 // STEP 118: Persist AP
  localStorage.setItem('tps_opp_fundraised', String(oppState.hasFundraised)); // STEP 118: Persist fundraise flag
  localStorage.setItem('tps_opp_sabotage', String(oppState.sabotagedFirewall || 0)); // STEP 145: Persist sabotage count
  localStorage.setItem('tps_funds', String(playerStats.funds));
  localStorage.setItem('tps_capital', String(playerStats.capital));
  saveTargets(); // STEP 107: Always persist target state alongside core state
}

// ──────────────────────────────────────────────────────────────────
// SECTION 7: UI RENDERING
// ──────────────────────────────────────────────────────────────────

function updateUI() {
  // Turn counter
  const year = Math.ceil(oppState.month / 12);
  const el = (id) => document.getElementById(id);

  if (el('opp-year')) el('opp-year').textContent = year;
  if (el('opp-month-num')) el('opp-month-num').textContent = oppState.month;
  if (el('opp-funds')) el('opp-funds').textContent = `฿${playerStats.funds}M`;
  if (el('opp-capital')) el('opp-capital').textContent = playerStats.capital;
  if (el('opp-intel')) el('opp-intel').textContent = oppState.intelPoints;
  if (el('opp-credibility')) el('opp-credibility').textContent = oppState.credibility;

  // Credibility bar fill
  const credFill = el('cred-bar-fill');
  if (credFill) credFill.style.width = `${oppState.credibility}%`;

  // STEP 118: AP badge
  updateAPDisplay();

  // Log count
  if (el('log-count')) el('log-count').textContent = `${oppLog.length} entries`;
}

/**
 * STEP 104/128: renderTargetMinisters() — Renders minister cards with:
 *   - ID-based selection (active-target highlight)
 *   - Scandal bar (0-10 visual meter)
 *   - RESIGNED stamp for isExposed ministers (greyed out, non-clickable)
 *   - STEP 128: PM Boss Card with Cabinet Firewall shield status
 */
function renderTargetMinisters() {
  const container = document.getElementById('target-ministers-list');
  if (!container) return;

  container.innerHTML = shadowTargets.map(m => {
    const isActive = activeTargetId === m.id;
    const isPM = m.id === PM_TARGET_ID;
    // STEP 159: Dynamic Scandal caps (PM = 50, Ministers = 30)
    const maxScandal = isPM ? 50 : 30;
    const scandalPct = (m.scandalLevel / maxScandal) * 100;
    const scandalColor = m.scandalLevel >= (maxScandal * 0.8) ? '#ef4444' : m.scandalLevel >= (maxScandal * 0.5) ? '#f59e0b' : '#42a5f5';

    // STEP 106: Resigned/neutralized state
    if (m.isExposed) {
      return `
        <div class="minister-card" id="target-${m.id}"
             style="opacity:0.35; pointer-events:none; border-color:rgba(34,197,94,0.3);">
          <div class="mc-top">
            <div class="mc-avatar">❌</div>
            <div>
              <div class="mc-name" style="text-decoration:line-through;">${m.name}</div>
              <div class="mc-ministry">${m.ministry}</div>
            </div>
          </div>
          <div class="mc-stats">
            <span class="mc-stat" style="background:rgba(34,197,94,0.15);color:#22c55e;font-weight:800;">✅ RESIGNED</span>
          </div>
        </div>`;
    }

    // STEP 197: PM Boss Card — Phase-aware selection & styling
    if (isPM) {
      const fw = getEffectiveFirewall();
      const isPhase1Locked = fw < 7; // Phase 1: Cannot select at all

      // Dynamic click handler & cursor based on phase
      let clickHandler, cursorStyle, bossCardStyle, bossOverlay;

      if (isPhase1Locked) {
        // PHASE 1 (fw 0-6): Locked card — not-allowed cursor, blocking toast
        clickHandler = `showToast('🛡️ Cabinet Firewall active! Break at least 7 layers first. (Current: ${fw}/10)','error')`;
        cursorStyle = 'cursor: not-allowed;';
        bossCardStyle = 'border: 2px solid rgba(251,191,36,0.4); background: linear-gradient(135deg, #111827 0%, #1a1520 100%);';
        bossOverlay = '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);border-radius:8px;pointer-events:none;"></div>';
      } else {
        // PHASE 2+ (fw 7+): Selectable — pointer cursor, selectTarget binding
        clickHandler = `selectTarget('${m.id}')`;
        cursorStyle = 'cursor: pointer;';
        bossCardStyle = 'border: 2px solid #ef4444; background: linear-gradient(135deg, #111827 0%, #2a0a0a 100%); box-shadow: 0 0 15px rgba(239,68,68,0.15);';
        bossOverlay = '';
      }

      // Shield status indicator (always shows progress)
      const shieldStatusHTML = fw < 10
        ? `<div style="display:flex;align-items:center;gap:5px;margin-top:6px;padding:3px 8px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:4px;width:fit-content;">
            <span style="font-size:0.7rem;color:#fbbf24;font-weight:700;">🛡️ FIREWALL: ${fw}/10 BROKEN</span>
          </div>`
        : `<div style="display:flex;align-items:center;gap:5px;margin-top:6px;padding:3px 8px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:4px;width:fit-content;animation:pulse 2s infinite;">
            <span style="font-size:0.7rem;color:#ef4444;font-weight:800;">🔥 FULLY VULNERABLE</span>
          </div>`;

      return `
      <div class="minister-card ${isActive && !isPhase1Locked ? 'selected active-target' : ''}"
           onclick="${clickHandler}"
           id="target-${m.id}" style="position:relative;${bossCardStyle}${cursorStyle}">
        ${bossOverlay}
        <div class="mc-top">
          <div class="mc-avatar" style="font-size:1.2rem;">👑</div>
          <div>
            <div class="mc-name" style="color:#fbbf24;font-weight:800;">${m.name}</div>
            <div class="mc-ministry" style="color:#ef4444;font-weight:600;">${m.ministry}</div>
          </div>
        </div>
        ${shieldStatusHTML}
        <div style="margin:4px 0 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:.6rem;color:#9e98b8;font-weight:700;">🔥 SCANDAL</span>
            <span style="font-size:.65rem;font-weight:800;color:${scandalColor};margin-left:auto;">${m.scandalLevel}/${maxScandal}</span>
          </div>
          <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${Math.min(100, scandalPct)}%;background:${scandalColor};border-radius:3px;transition:width .4s ease;${m.scandalLevel >= maxScandal ? 'box-shadow:0 0 8px rgba(239,68,68,0.5);' : ''}"></div>
          </div>
        </div>
        <div class="mc-stats">
          <span class="mc-stat popularity">👥 Pop: ${m.popularity}%</span>
          ${m.investigated ? '<span class="mc-stat" style="color:#42a5f5">✓ Investigated</span>' : ''}
          ${m.scandalLevel >= maxScandal && !isPhase1Locked ? '<span class="mc-stat" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:800;">⚖️ READY FOR VOTE</span>' : ''}
        </div>
        ${m.hasShadow
          ? `<div style="background:rgba(52,211,153,0.1);border:1px solid #34d399;padding:6px;border-radius:4px;margin-top:8px;font-size:0.7rem;color:#34d399;">
              👤 <strong style="color:white;">Shadow Appointed</strong><br>
              <span style="opacity:0.8;">Passive: +3 Intel | Active: +3 DMG</span>
            </div>`
          : ''}
      </div>`;
    }

    // Normal minister card (unchanged)
    return `
      <div class="minister-card ${isActive ? 'selected active-target' : ''}"
           onclick="selectTarget('${m.id}')" id="target-${m.id}">
        <div class="mc-top">
          <div class="mc-avatar">${m.investigated ? '🔓' : '🔒'}</div>
          <div>
            <div class="mc-name">${m.name}</div>
            <div class="mc-ministry">${m.ministry}</div>
          </div>
        </div>
        <div style="margin:4px 0 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:.6rem;color:#9e98b8;font-weight:700;">🔥 SCANDAL</span>
            <span style="font-size:.65rem;font-weight:800;color:${scandalColor};margin-left:auto;">${m.scandalLevel}/${maxScandal}</span>
          </div>
          <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${Math.min(100, scandalPct)}%;background:${scandalColor};border-radius:3px;transition:width .4s ease;${m.scandalLevel >= maxScandal ? 'box-shadow:0 0 8px rgba(239,68,68,0.5);' : ''}"></div>
          </div>
        </div>
        <div class="mc-stats">
          <span class="mc-stat popularity">👥 Pop: ${m.popularity}%</span>
          ${m.investigated ? '<span class="mc-stat" style="color:#42a5f5">✓ Investigated</span>' : ''}
          ${m.scandalLevel >= maxScandal ? '<span class="mc-stat" style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:800;">⚖️ READY FOR VOTE</span>' : ''}
        </div>
        ${m.hasShadow
        ? `<div style="background:rgba(52,211,153,0.1);border:1px solid #34d399;padding:6px;border-radius:4px;margin-top:8px;font-size:0.7rem;color:#34d399;">
              👤 <strong style="color:white;">Shadow Appointed</strong><br>
              <span style="opacity:0.8;">Passive: +3 Intel | Active: +3 DMG</span>
            </div>`
        : ''}
      </div>`;
  }).join('');
}

/**
 * STEP 196: selectTarget() — Purged & Rewritten.
 * Phase 1 Lock: Blocks PM selection if firewall < 7.
 * Phase 2 (fw 7-9): Selection ALLOWED — damage immunity handled in executeAction.
 * No ghost isPMShielded() checks remain.
 */
function selectTarget(targetId) {
  const fw = getEffectiveFirewall();

  // --- BOSS FIGHT PHASE 1: UNTOUCHABLE ---
  // ONLY block selection if the firewall is strictly less than 7.
  if (targetId === PM_TARGET_ID && fw < 7) {
    showToast(`The PM is unreachable! Break at least 7 layers of the Firewall first. (Current: ${fw}/10)`, 'error');
    return; // Abort selection
  }

  // --- GHOST CODE REMOVED ---
  // We intentionally DO NOT check if (fw < 10) here anymore.
  // Phase 2 (fw 7 to 9) allows selection, but executeAction() nullifies scandal.

  // Apply Selection
  activeTargetId = targetId;

  // Visual Updates
  document.querySelectorAll('.minister-card').forEach(card => card.classList.remove('selected', 'active-target'));
  const selectedCard = document.getElementById(`target-${targetId}`) || document.querySelector(`.target-card[onclick*="${targetId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected', 'active-target');
  }

  const targetData = shadowTargets.find(t => t.id === targetId);
  if (targetData) {
    logAction(`🎯 Target locked: Focusing on ${targetData.name}.`, 'info');
    showToast(`🎯 Target: ${targetData.name}`, 'warning');
  }

  // Refresh UI state
  renderTargetMinisters();
  updateActionButtonsUI();
}

function renderActionGrid() {
  const container = document.getElementById('opposition-action-grid');
  if (!container) return;

  container.innerHTML = Object.values(OPP_ACTIONS).map(a => {
    const costs = [];
    if (a.costFunds) costs.push(`฿${a.costFunds}M`);
    if (a.costCapital) costs.push(`⚡${a.costCapital}`);
    if (a.costIntel) costs.push(`🔍${a.costIntel}`);
    const costStr = costs.length ? costs.join(' · ') : 'FREE';

    return `
      <button class="action-btn opp-action" onclick="executeOppAction('${a.id}')"
              title="${a.description}" id="btn-${a.id}">
        <div class="act-icon">${a.icon}</div>
        <div class="act-label">${a.label}</div>
        <div class="act-cost">${a.labelTH} · ${costStr} · <span style="color:#fbbf24;font-weight:700;">1 AP</span></div>
      </button>`;
  }).join('');

  // Apply exhaustion state immediately after rendering
  updateActionButtonsUI();
}

/**
 * STEP 181: updateActionButtonsUI() — SURGICAL UI Master Function
 * Uses regex .replace() to swap text (Cap → ⚡, Intel → 🔎, FREE → AP cost)
 * WITHOUT destroying the existing innerHTML/icon structure.
 * Binds correct onclick handlers and applies visual disabled states.
 */
function updateActionButtonsUI() {
  const apExhausted = oppState.ap <= 0;
  const buttons = document.querySelectorAll('.center-col button, .center-col .action-btn, #opposition-action-grid button, .action-btn.opp-action');

  buttons.forEach(btn => {
    let htmlStr = btn.innerHTML;
    const textContent = btn.innerText || '';
    let isDisabled = apExhausted; // AP exhaustion as baseline

    // ── 1. SURGICAL TEXT REPLACEMENT (Preserves existing icons!) ──
    htmlStr = htmlStr.replace(/\bCap\b/g, '⚡').replace(/\bIntel\b/g, '🔎');

    // ── 2. ROUTING & STATE CHECKS ──
    if (textContent.includes('File Motion') || textContent.includes('ยื่นญัตติ')) {
      btn.setAttribute('onclick', 'actionFileMotion()');
      if ((oppState.fileMotionCount || 0) >= 2) isDisabled = true;
    }
    else if (textContent.includes('Deep Investigate') || textContent.includes('สอบสวนลึก')) {
      btn.setAttribute('onclick', 'actionDeepInvestigate()');
      if ((oppState.deepInvestigateCount || 0) >= 2) isDisabled = true;
      htmlStr = htmlStr.replace(/FREE/g, '1 AP');
    }
    else if (textContent.includes('Press Leak') || textContent.includes('ปล่อยข่าว')) {
      btn.setAttribute('onclick', 'actionPressLeak()');
      if (oppState.cooldowns && oppState.cooldowns.pressLeak > 0) isDisabled = true;
    }
    else if (textContent.includes('Public Hearing') || textContent.includes('ประชามติ') || textContent.includes('ประชาพิจารณ์')) {
      btn.setAttribute('onclick', 'actionPublicHearing()');
      if (oppState.cooldowns && oppState.cooldowns.publicHearing > 0) isDisabled = true;
    }
    else if (textContent.includes('Cross-Party') || textContent.includes('พันธมิตร')) {
      btn.setAttribute('onclick', 'actionCrossPartyAlliance()');
      if (oppState.cooldowns && oppState.cooldowns.crossParty > 0) isDisabled = true;
    }
    else if (textContent.includes('No-Confidence') || textContent.includes('อภิปราย')) {
      btn.setAttribute('onclick', 'actionNoConfidence()');
      htmlStr = htmlStr.replace(/FREE/g, '3 AP');
    }
    else if (textContent.includes('Fundraise') || textContent.includes('ระดมทุน')) {
      btn.setAttribute('onclick', "executeOppAction('fundraise')");
      htmlStr = htmlStr.replace(/FREE/g, '1 AP');
    }
    else if (textContent.includes('Lobby Coalition') || textContent.includes('ดึงงูเห่า')) {
      btn.setAttribute('onclick', 'actionSabotageCoalition()');
    }
    else if (textContent.includes('Media Blitz') || textContent.includes('บุกสื่อ')) {
      btn.setAttribute('onclick', 'actionMediaBlitz()');
      htmlStr = htmlStr.replace(/FREE/g, '฿60M · 4 ⚡');
      if ((oppState.mediaBlitzCount || 0) >= 1) isDisabled = true;
    }
    else if (textContent.includes('Commission Poll') || textContent.includes('สำรวจโพล')) {
      btn.setAttribute('onclick', 'actionCommissionPoll()');
      htmlStr = htmlStr.replace(/FREE/g, '฿50M');
    }

    // Update HTML only if changes were made (avoids unnecessary reflows)
    if (btn.innerHTML !== htmlStr) {
      btn.innerHTML = htmlStr;
    }

    // ── 3. APPLY VISUAL DISABLED STATE ──
    if (isDisabled) {
      btn.style.opacity = '0.2';
      btn.style.pointerEvents = 'none';
      btn.style.filter = 'grayscale(100%)';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.filter = 'none';
      btn.style.cursor = 'pointer';
    }
  });

  // ── 4. Handle injected special buttons (AP exhaustion only) ──
  const specialBtns = ['btn-judicial-strike', 'btn-draft-shadow-bill', 'btn-action-sabotage'];
  specialBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      // Surgical text fix on special buttons too
      const origHTML = btn.innerHTML;
      const fixedHTML = origHTML.replace(/\bCap\b/g, '⚡').replace(/\bIntel\b/g, '🔎');
      if (origHTML !== fixedHTML) btn.innerHTML = fixedHTML;

      if (apExhausted) {
        btn.style.opacity = '0.3';
        btn.style.pointerEvents = 'none';
        btn.style.filter = 'grayscale(100%)';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.style.filter = 'none';
        btn.style.cursor = 'pointer';
      }
    }
  });
}

/**
 * STEP 135: injectJudicialButton()
 * Dynamically injects the ultimate "Judicial Strike" button below the action grid.
 * This is the ONLY way to bypass the PM's Cabinet Firewall.
 * Idempotent — safe to call multiple times.
 */
function injectJudicialButton() {
  if (document.getElementById('btn-judicial-strike')) return; // Already injected

  const centerCol = document.querySelector('.center-col');
  if (!centerCol) return;

  const judicialHTML = `
  <button id="btn-judicial-strike" style="
    width: 100%;
    margin-top: 15px;
    background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
    border: 1px solid #ef4444;
    border-radius: 10px;
    padding: 16px 20px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255,255,255,0.05);
    font-family: inherit;
  " onclick="actionJudicialStrike()"
     onmouseenter="this.style.boxShadow='0 6px 25px rgba(239,68,68,0.35)';this.style.transform='translateY(-2px)';this.style.borderColor='#f87171'"
     onmouseleave="this.style.boxShadow='0 4px 15px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';this.style.transform='none';this.style.borderColor='#ef4444'">
    <div style="display:flex;align-items:center;justify-content:center;gap:15px;">
      <span style="font-size:1.8rem;">⚖️</span>
      <div style="text-align:left;">
        <div style="margin:0;font-size:1.05rem;font-weight:800;color:#fca5a5;text-transform:uppercase;letter-spacing:0.5px;">Judicial Strike (ยื่นองค์กรอิสระ)</div>
        <div style="margin:3px 0 0;font-size:0.72rem;color:#fecaca;">Bypass Parliament. Cost: 50 🔎 (60 for PM) &bull; 50 ⚡ (75 for PM) &bull; <span style="color:#fbbf24;font-weight:700;">1 AP</span></div>
      </div>
    </div>
  </button>`;

  centerCol.insertAdjacentHTML('beforeend', judicialHTML);
}

/**
 * STEP 146: injectSabotageButton()
 * Dynamically injects a "Lobby Coalition" button into the action grid.
 * This provides an alternative way to break the PM's Firewall by
 * bribing government coalition MPs to defect.
 * Idempotent — safe to call multiple times.
 */
function injectSabotageButton() {
  if (document.getElementById('btn-action-sabotage')) return; // Already injected

  const actionGrid = document.getElementById('opposition-action-grid');
  if (!actionGrid) return;

  const btnHTML = `
  <button id="btn-action-sabotage" class="action-btn" style="
    background: linear-gradient(135deg, #111827 0%, #1a0a2e 100%);
    border: 1px solid #7c3aed;
    border-radius: 8px;
    padding: 12px 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  " onclick="actionSabotageCoalition()"
     onmouseenter="this.style.borderColor='#a78bfa';this.style.boxShadow='0 4px 15px rgba(167,139,250,0.2)'"
     onmouseleave="this.style.borderColor='#7c3aed';this.style.boxShadow='none'">
    <div style="font-size:1.4rem;">🐍</div>
    <div style="text-align:center;">
      <div style="margin:0;font-size:0.85rem;font-weight:700;color:#c4b5fd;">Lobby Coalition</div>
      <div style="margin:2px 0 0;font-size:0.6rem;color:#9ca3af;">ดึงงูเห่า &bull; ฿80M &bull; 8 Cap &bull; <span style="color:#fbbf24;">2 AP</span></div>
    </div>
  </button>`;

  actionGrid.insertAdjacentHTML('beforeend', btnHTML);
  console.log('[engine.js] STEP 146 — Coalition Sabotage button injected.');
}

/**
 * STEP 147: actionSabotageCoalition()
 * High-risk, high-reward action — bribe government coalition MPs to defect.
 * This provides an alternative path to break the PM's Cabinet Firewall
 * without needing to expose ministers through No-Confidence votes.
 * Cost: ฿80M + 8 Capital + 1 AP
 * Success (40%): +1 sabotagedFirewall, +5 Credibility
 * Failure (60%): Caught bribing, -12 Credibility
 */
function actionSabotageCoalition() {
  // ── AP Gate (STEP 158: Now costs 2 AP) ──
  if (oppState.ap < 2) {
    showToast('⚡ Need 2 AP to Lobby Coalition!', 'error');
    return;
  }

  // ── Resource Gate ──
  if (playerStats.funds < 80 || playerStats.capital < 8) {
    showToast('⚠️ Insufficient resources! Need ฿80M and 8 Capital.', 'error');
    return;
  }

  // ── Firewall Already Broken Gate ──
  if (!isPMShielded()) {
    showToast('🛡️ The PM\'s Firewall is already broken. No need to sabotage further.', 'info');
    return;
  }

  // ── Confirmation ──
  if (!confirm('🐍 LOBBY COALITION DEFECTION\n\nCost: ฿80M + 8 Capital + 2 AP\nSuccess Rate: 40%\n\n⚠️ FAILURE: Bribery scandal exposed, -12 Credibility\n\nProceed with the backroom deal?')) {
    return;
  }

  // ── DEDUCT COSTS (STEP 158: 2 AP) ──
  oppState.ap -= 2;
  playerStats.funds = Math.max(0, parseInt(playerStats.funds) - 80);
  playerStats.capital = Math.max(0, parseInt(playerStats.capital) - 8);

  // ── RNG ROLL: 40% Success ──
  const roll = Math.random();
  const success = roll <= 0.40;

  if (success) {
    // ── SUCCESS: Coalition MP defects ──
    oppState.sabotagedFirewall = (oppState.sabotagedFirewall || 0) + 1;
    oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 2); // STEP 168: Halved from 5

    showToast('🐍 SUCCESS! Coalition MPs have secretly agreed to defect!', 'success');
    logAction(`🐍 COALITION SABOTAGED: Backroom deals secured defector votes. PM Firewall weakened (Sabotage: ${oppState.sabotagedFirewall}). Credibility +2.`, 'success');

    // ── Check if this sabotage just broke the firewall ──
    if (!isPMShielded()) {
      setTimeout(() => {
        showToast('🚨 THE FIREWALL HAS FALLEN! The PM is now VULNERABLE!', 'warning');
        logAction('🚨 FIREWALL DOWN: Coalition collapse leaves the PM exposed to investigation!', 'warning');
        renderTargetMinisters(); // Refresh PM card to show VULNERABLE state
      }, 1500);
    }
  } else {
    // ── FAILURE: Bribery exposed ──
    oppState.credibility = Math.max(0, parseInt(oppState.credibility) - 6); // STEP 168: Halved from 12

    showToast('❌ FAILED! Bribery rumors leaked to the media! Massive backlash.', 'error');
    logAction(`❌ SABOTAGE FAILED: The media caught wind of your backroom deals. Credibility -6. (Roll: ${(roll * 100).toFixed(0)}% — needed ≤40%)`, 'fail');
  }

  // ── PERSIST & UPDATE ──
  localStorage.setItem('tps_opp_sabotage', String(oppState.sabotagedFirewall || 0));
  saveState();
  updateUI();
  updateAPDisplay();
  updateActionButtonsUI();
  renderTargetMinisters();
}

/**
 * STEP 154: actionAppointShadow(targetId)
 * Assigns a shadow minister to monitor a government portfolio.
 * Cost: 2 AP, ฿40M Funds, 10 Capital
 * Reward: +3 Credibility (professional image)
 * Passive: +1 Intel/month per active shadow (applied in advanceMonth)
 * Active: +1 bonus Scandal damage when attacking shadowed targets
 */
function actionAppointShadow(targetId) {
  // ── AP Gate (costs 2) ──
  if (oppState.ap < 2) {
    showToast('⚡ Need 2 AP to appoint a Shadow Minister!', 'error');
    return;
  }

  // ── Resource Gate ──
  if (playerStats.funds < 40 || playerStats.capital < 10) {
    showToast('⚠️ Insufficient resources! Need ฿40M and 10 Capital.', 'error');
    return;
  }

  // ── Target Validation ──
  const target = shadowTargets.find(t => t.id === targetId);
  if (!target) {
    showToast('Target not found.', 'error');
    return;
  }
  if (target.isExposed) {
    showToast(`${target.name} has been neutralized. No need for a shadow.`, 'info');
    return;
  }
  if (target.hasShadow) {
    showToast(`A shadow minister is already monitoring ${target.ministry}.`, 'info');
    return;
  }

  // ── DEDUCT COSTS ──
  oppState.ap -= 2;
  playerStats.funds = Math.max(0, parseInt(playerStats.funds) - 40);
  playerStats.capital = Math.max(0, parseInt(playerStats.capital) - 10);

  // ── APPLY ──
  target.hasShadow = true;
  oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 3);

  // ── Count active shadows for feedback ──
  const activeShadows = shadowTargets.filter(t => t.hasShadow && !t.isExposed).length;

  showToast(`👤 Shadow Minister appointed to monitor ${target.ministry}!`, 'success');
  logAction(`👤 SHADOW CABINET: Assigned an expert to shadow ${target.name} (${target.ministry}). Credibility +3. Active shadows: ${activeShadows}/8.`, 'success');

  // Milestone toasts
  if (activeShadows === 4) {
    setTimeout(() => {
      showToast('👑 Government-in-Waiting! 4+ shadows unlock passive Credibility bonus!', 'success');
    }, 1200);
  } else if (activeShadows === 8) {
    setTimeout(() => {
      showToast('🏛️ FULL SHADOW CABINET! Maximum passive Intel & Credibility generation!', 'success');
    }, 1200);
  }

  // ── PERSIST & UPDATE ──
  saveState();
  saveTargets();
  updateUI();
  updateAPDisplay();
  updateActionButtonsUI();
  renderTargetMinisters();
}

/**
 * STEP 136: actionJudicialStrike()
 * The ultimate legal action — bypasses parliament AND the PM's Cabinet Firewall.
/**
 * STEP 167: actionJudicialStrike() — PM Shield Breaker / Minister Instant Takedown
 * PM: If firewall < 10, shatters remaining shield. If >= 10, blocked.
 * Ministers: Instant exposure with +10 Credibility (halved from 20).
 * Cost: 50 Intel (60 PM) + 50 Capital (75 PM) + 1 AP
 */
function actionJudicialStrike() {
  if (oppState.ap < 1) {
    showToast('⚡ Out of Action Points!', 'error');
    return;
  }
  if (!activeTargetId) {
    showToast('🎯 Select a Shadow Target first.', 'warning');
    return;
  }

  const target = shadowTargets.find(t => t.id === activeTargetId);
  if (!target || target.isExposed) {
    showToast('Target already neutralized.', 'info');
    return;
  }

  const isPM = target.id === PM_TARGET_ID;
  const intelCost = isPM ? 60 : 50;
  const capitalCost = isPM ? 75 : 50;

  if ((oppState.intelPoints || 0) < intelCost || playerStats.capital < capitalCost) {
    showToast(`Need ${intelCost} Intel and ${capitalCost} Capital!`, 'error');
    return;
  }

  // ── PM SHIELD BREAKER LOGIC ──
  if (isPM) {
    const currentFW = getEffectiveFirewall();
    if (currentFW >= 10) {
      showToast('Firewall already broken! Build Scandal and use No-Confidence to finish the PM.', 'info');
      return;
    }
    if (!confirm(`⚖️ JUDICIAL STRIKE: SHATTER PM FIREWALL\n\nCost: ${intelCost} Intel + ${capitalCost} Capital + 1 AP\n\nThis will destroy the PM's remaining ${10 - currentFW} firewall layers.\nProceed?`)) return;

    // Deduct
    oppState.ap -= 1;
    playerStats.capital = Math.max(0, playerStats.capital - capitalCost);
    oppState.intelPoints = Math.max(0, oppState.intelPoints - intelCost);

    // Shatter the shield (force effective FW to 10)
    oppState.sabotagedFirewall = (oppState.sabotagedFirewall || 0) + (10 - currentFW);

    showToast("⚖️ JUDICIAL STRIKE: The PM's final firewall has been shattered!", 'success');
    logAction("⚖️ COURT RULING: Legal maneuvers destroyed the PM's remaining defenses. PM is VULNERABLE!", 'warning');
  } else {
    // ── NORMAL MINISTER INSTANT TAKEDOWN ──
    if (!confirm(`⚖️ FILE JUDICIAL PETITION\n\nTarget: ${target.name}\nCost: ${intelCost} Intel + ${capitalCost} Capital + 1 AP\n\nThis will instantly remove the target from office.\nProceed?`)) return;

    // Deduct
    oppState.ap -= 1;
    playerStats.capital = Math.max(0, playerStats.capital - capitalCost);
    oppState.intelPoints = Math.max(0, oppState.intelPoints - intelCost);

    target.isExposed = true;
    oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 10); // Halved from 20
    oppState.intelPoints = Math.min(100, oppState.intelPoints + 10); // Domino intel

    showToast(`⚖️ JUDICIAL STRIKE SUCCESS! ${target.name} suspended!`, 'success');
    logAction(`⚖️ COURT ORDER: ${target.name} removed. Credibility +10, Intel +10.`, 'success');

    // Firewall break check
    if (getEffectiveFirewall() >= PM_FIREWALL_THRESHOLD) {
      setTimeout(() => {
        showToast('🚨 THE FIREWALL HAS FALLEN! The PM is now VULNERABLE!', 'warning');
        logAction('🚨 FIREWALL DOWN: The PM\'s inner circle has collapsed!', 'warning');
        renderTargetMinisters();
      }, 1500);
    }
  }

  // Persist & update
  localStorage.setItem('tps_opp_sabotage', String(oppState.sabotagedFirewall || 0));
  localStorage.setItem('tps_opp_ap', String(oppState.ap));
  saveState();
  saveTargets();
  updateUI();
  updateAPDisplay();
  updateActionButtonsUI();
  renderTargetMinisters();
}

/**
 * STEP 170: actionNoConfidence() — Bulletproof Standalone No-Confidence Vote
 * Strict guardrail ordering: Target → Scandal → Resources → Deduct → Apply
 * Manual cost: 3 AP, ฿100M, 20 Capital, 10 Intel
 * PM: +50 Credibility (guaranteed). Ministers: +7 Credibility (halved).
 */
function actionNoConfidence() {
  // Guardrail 0: Target selection
  if (!activeTargetId) {
    showToast('Select a target first!', 'warning');
    return;
  }

  const target = shadowTargets.find(t => t.id === activeTargetId);
  if (!target || target.isExposed) {
    showToast('Target already neutralized.', 'info');
    return;
  }

  const isPM = target.id === PM_TARGET_ID;
  const requiredScandal = isPM ? 50 : 30;

  // Guardrail 1: Scandal threshold (checked BEFORE any resource deductions)
  if (target.scandalLevel < requiredScandal) {
    showToast(`Need ${requiredScandal}/${requiredScandal} Scandal! Current: ${target.scandalLevel}`, 'error');
    return;
  }

  // Guardrail 2: Strict resource check (checked BEFORE any deductions)
  if (oppState.ap < 3 || playerStats.funds < 100 || playerStats.capital < 20 || (oppState.intelPoints || 0) < 10) {
    showToast('Insufficient Resources! Need 3 AP, ฿100M, 20 Cap, 10 Intel.', 'error');
    return;
  }

  // ALL checks passed — now deduct everything at once
  oppState.ap -= 3;
  playerStats.funds -= 100;
  playerStats.capital -= 20;
  oppState.intelPoints -= 10;
  target.isExposed = true;

  if (isPM) {
    // STEP 195: GUARANTEED +50 CREDIBILITY — The Executioner's Strike
    oppState.credibility = Math.min(100, (oppState.credibility || 0) + 50);

    showToast('🔥 THE GOVERNMENT HAS FALLEN! PM forced to resign! Credibility +50!', 'success');
    logAction('🔥 CENSURE DEBATE: The Prime Minister has been defeated! Historic victory! Credibility +50', 'success');

    // Save state immediately before triggering end screen
    localStorage.setItem('tps_opp_ap', String(oppState.ap));
    saveState();
    saveTargets();
    updateUI();
    updateAPDisplay();
    updateActionButtonsUI();
    renderTargetMinisters();

    // Trigger Grand Finale after dramatic 2-second delay
    if (typeof triggerGrandFinale === 'function') {
      setTimeout(() => { triggerGrandFinale(true); }, 2000);
    }
    return; // Skip the normal save/update below
  } else {
    oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 7); // Halved
    oppState.intelPoints = Math.min(100, (oppState.intelPoints || 0) + 10); // Domino intel
    showToast(`🔥 CENSURE SUCCESS: ${target.name} forced out! Credibility +7.`, 'success');
    logAction(`🔥 CENSURE: ${target.name} destroyed. Credibility +7, Intel +10.`, 'success');

    // Firewall break check
    if (getEffectiveFirewall() >= PM_FIREWALL_THRESHOLD) {
      setTimeout(() => {
        showToast('🚨 FIREWALL DESTROYED! PM is vulnerable!', 'warning');
        logAction('🚨 FIREWALL DOWN: Coalition crumbles!', 'warning');
        renderTargetMinisters();
      }, 1500);
    }
  }

  localStorage.setItem('tps_opp_ap', String(oppState.ap));
  saveState();
  saveTargets();
  updateUI();
  updateAPDisplay();
  updateActionButtonsUI();
  renderTargetMinisters();
}

/**
 * STEP 176: actionDeepInvestigate() — Restored Scandal Damage + 2/month Limit
 * Intel gain: 1-2. Scandal gain: 2 (RESTORED). Credibility gain: 0.
 * Cost: ฿30M + 1 AP. Sets investigatedTimer = 4 (+10% DMG for 4 months).
 */
function actionDeepInvestigate() {
  if (oppState.deepInvestigateCount >= 2) {
    showToast('Limit reached: Deep Investigate (Max 2/month).', 'warning');
    return;
  }
  if (!activeTargetId) {
    showToast('Select a Shadow Target first!', 'warning');
    return;
  }

  const target = shadowTargets.find(t => t.id === activeTargetId);
  if (!target || target.isExposed) {
    showToast('Target already neutralized.', 'info');
    return;
  }

  const intelGain = Math.floor(Math.random() * 2) + 1;

  // RESTORED SCANDAL DAMAGE (scandalGain: 2)
  if (executeAction('Deep Investigate', { funds: 30 }, { intelGain: intelGain, scandalGain: 2 }, true, 1)) {
    oppState.deepInvestigateCount++;
    localStorage.setItem('tps_opp_investigate_count', String(oppState.deepInvestigateCount));

    target.investigatedTimer = 4;
    saveTargets();
    const msg = `🔎 Deep Investigation! Found ${intelGain} Intel. Target marked 'Investigated' for 4 months (+10% DMG)!`;
    showToast(msg, 'info');
    logAction(msg, 'info');
    renderTargetMinisters();
  }
}

/**
 * STEP 174: actionFileMotion() — Nerfed with 2/month Limit
 * Cost: 5 Capital + 1 AP. Reward: 1 base Scandal, 1 Credibility.
 * Max 2 uses per month.
 */
function actionFileMotion() {
  if (oppState.fileMotionCount >= 2) {
    showToast('Limit reached: File Motion can only be used 2 times per month.', 'warning');
    return;
  }
  if (!activeTargetId) {
    showToast('Select a Shadow Target first!', 'warning');
    return;
  }

  const target = shadowTargets.find(t => t.id === activeTargetId);
  if (!target || target.isExposed) {
    showToast('Target already neutralized.', 'info');
    return;
  }

  // Costs 5 Cap, 1 AP. Rewards: 1 base Scandal, 1 Credibility.
  if (executeAction('File Motion', { capital: 5 }, { scandalGain: 1, credibilityGain: 1 }, true, 1)) {
    oppState.fileMotionCount++;
    localStorage.setItem('tps_opp_motion_count', String(oppState.fileMotionCount));

    const msg = `⚖️ Motion filed against ${target.name}. Scandal increased! Credibility +1.`;
    showToast(msg, 'warning');
    logAction(msg, 'warning');
  }
}

/**
 * STEP 183: actionPublicHearing() — Cooldown 4 months
 * Cost: ฿40M + 5 Cap + 1 AP. Reward: +10 Capital, +2 Credibility. NO scandal.
 */
function actionPublicHearing() {
  if (oppState.cooldowns.publicHearing > 0) {
    showToast(`Public Hearing is on CD for ${oppState.cooldowns.publicHearing} months.`, 'warning');
    return;
  }

  // needsTarget = false. No scandal damage.
  if (executeAction('Public Hearing', { funds: 40, capital: 5 }, { capitalGain: 10, credibilityGain: 2 }, false, 1)) {
    oppState.cooldowns.publicHearing = 4;
    localStorage.setItem('tps_opp_cooldowns', JSON.stringify(oppState.cooldowns));
    showToast('🗣️ Public Hearing held! Gained Capital and Credibility.', 'success');
    logAction('Public Hearing held. Gathered massive capital support.', 'info');
  }
}

/**
 * STEP 183: actionCrossPartyAlliance() — Cooldown 6 months
 * Cost: 8 Cap + 1 AP. Reward: +3 Credibility. NO scandal.
 */
function actionCrossPartyAlliance() {
  if (oppState.cooldowns.crossParty > 0) {
    showToast(`Cross-Party Alliance is on CD for ${oppState.cooldowns.crossParty} months.`, 'warning');
    return;
  }

  // needsTarget = false. No scandal damage.
  if (executeAction('Cross-Party Alliance', { capital: 8 }, { credibilityGain: 3 }, false, 1)) {
    oppState.cooldowns.crossParty = 6;
    localStorage.setItem('tps_opp_cooldowns', JSON.stringify(oppState.cooldowns));
    showToast('🤝 Cross-Party Alliance formed! Credibility boosted.', 'success');
    logAction('Formed a temporary alliance. Credibility boosted.', 'info');
  }
}

/**
 * STEP 183: actionPressLeak() — Cooldown 2 months
 * Cost: ฿20M + 3 Intel + 1 AP. Reward: +2 Credibility. NO scandal.
 */
function actionPressLeak() {
  if (oppState.cooldowns.pressLeak > 0) {
    showToast(`Press Leak is on CD for ${oppState.cooldowns.pressLeak} months.`, 'warning');
    return;
  }

  // needsTarget = false. No scandal damage.
  if (executeAction('Press Leak', { funds: 20, intel: 3 }, { credibilityGain: 2 }, false, 1)) {
    oppState.cooldowns.pressLeak = 2;
    localStorage.setItem('tps_opp_cooldowns', JSON.stringify(oppState.cooldowns));
    showToast('📰 Press Leak successful! Gained Credibility.', 'success');
    logAction('Leaked documents to the press. Gained credibility.', 'info');
  }
}

/**
 * STEP 188: actionMediaBlitz() — 1/month Limit, Buffed with Intel
 * Cost: ฿60M + 4 Cap + 1 AP. Reward: +3 Intel, +3 Scandal (targeted).
 * Max 1 use per month.
 */
function actionMediaBlitz() {
  if ((oppState.mediaBlitzCount || 0) >= 1) {
    showToast('Limit reached: Media Blitz (Max 1/month).', 'warning');
    return;
  }

  // NO scandal damage, NO target required. Pure Intel + Credibility action.
  if (executeAction('Media Blitz', { funds: 60, capital: 4 }, { intelGain: 3 }, false, 1)) {
    oppState.mediaBlitzCount++;
    localStorage.setItem('tps_opp_media_blitz_count', String(oppState.mediaBlitzCount));
    showToast('📺 Media Blitz launched! Gained 3 Intel.', 'success');
    logAction('Media Blitz executed. Gathered Intel from media coverage.', 'info');
  }
}

/**
 * STEP 188: actionCommissionPoll() — Nerfed Credibility with Rich Flavor
 * Cost: ฿50M + 1 AP. Reward: +2 Credibility (halved further by global nerf).
 * Generates RNG government approval rating for immersive feedback.
 * No target required.
 */
function actionCommissionPoll() {
  // NERF: Reduced base credibilityGain to 2 (halved further globally → +1 effective)
  if (executeAction('Commission Poll', { funds: 50 }, { credibilityGain: 2 }, false, 1)) {
    const govApproval = 30 + Math.floor(Math.random() * 30); // 30-59%
    const flavorText = govApproval < 45
      ? 'Public discontent benefits opposition!'
      : 'Government still popular.';
    showToast(`📊 Poll: Government approval at ${govApproval}%. ${flavorText} Credibility +1`, 'success');
    logAction(`📊 Poll: Gov approval ${govApproval}%. ${flavorText}`, 'info');
  }
}

/**
 * STEP 137/141: updateParliamentScheduleUI()
 * Enforces Thailand's parliamentary calendar VISUALLY.
 * Parliament recess: months 5, 6, 11, 12 of each year cycle.
 * During recess: Button is visually locked but STILL CLICKABLE
 * (tryEnterParliament handles the actual blocking with a toast).
 * Called in initOpposition() and advanceMonth().
 */
function updateParliamentScheduleUI() {
  const parlBtn = document.getElementById('btn-enter-parliament');
  if (!parlBtn) return;

  // Calculate current month within the 1-12 year cycle
  const monthInYear = ((oppState.month - 1) % 12) + 1;

  // Recess months: May(5), June(6), November(11), December(12)
  const isRecess = [5, 6, 11, 12].includes(monthInYear);

  if (isRecess) {
    // STEP 141: Visually locked but physically clickable (no pointer-events: none)
    parlBtn.style.opacity = '0.5';
    parlBtn.style.filter = 'grayscale(80%)';
    parlBtn.style.borderColor = '#7f1d1d';
    parlBtn.style.background = '#1a0505';
    // Update inner content to show recess
    const iconEl = parlBtn.querySelector('.massive-icon');
    const labelEl = parlBtn.querySelector('.massive-label');
    const subEl = parlBtn.querySelector('.massive-sub');
    const glowEl = parlBtn.querySelector('.massive-btn-glow');
    if (iconEl) iconEl.textContent = '🔒';
    if (labelEl) labelEl.textContent = 'PARLIAMENT IN RECESS';
    if (subEl) {
      subEl.textContent = 'ปิดสมัยประชุมสภา';
      subEl.style.color = '#ef4444';
    }
    if (glowEl) glowEl.style.background = 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)';
  } else {
    parlBtn.style.opacity = '1';
    parlBtn.style.filter = 'none';
    parlBtn.style.borderColor = '';
    parlBtn.style.background = '';
    const iconEl = parlBtn.querySelector('.massive-icon');
    const labelEl = parlBtn.querySelector('.massive-label');
    const subEl = parlBtn.querySelector('.massive-sub');
    const glowEl = parlBtn.querySelector('.massive-btn-glow');
    if (iconEl) iconEl.textContent = '🏛️';
    if (labelEl) labelEl.textContent = 'ENTER PARLIAMENT SESSION';
    if (subEl) {
      subEl.textContent = 'เข้าสู่การประชุมสภา';
      subEl.style.color = '';
    }
    if (glowEl) glowEl.style.background = '';
  }
}

/**
 * STEP 138: injectDraftBillButton()
 * Dynamically injects a "Draft Shadow Bill" button after the Next Month button
 * in the Command Center (right column). Costs 2 AP, ฿30M, 5 Capital.
 * Idempotent — safe to call multiple times.
 */
function injectDraftBillButton() {
  if (document.getElementById('btn-draft-shadow-bill')) return; // Already injected

  const nextMonthBtn = document.getElementById('btn-next-month');
  if (!nextMonthBtn) return;

  const draftBtnHTML = `
  <button id="btn-draft-shadow-bill" style="
    width: 100%;
    margin-top: 12px;
    background: linear-gradient(135deg, #111827 0%, #0c1a2e 100%);
    border: 1px solid #3b82f6;
    border-radius: 10px;
    padding: 14px 18px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    font-family: inherit;
  " onclick="actionDraftShadowBill()"
     onmouseenter="this.style.boxShadow='0 6px 20px rgba(59,130,246,0.3)';this.style.transform='translateY(-2px)';this.style.borderColor='#60a5fa'"
     onmouseleave="this.style.boxShadow='0 4px 12px rgba(59,130,246,0.15)';this.style.transform='none';this.style.borderColor='#3b82f6'">
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
      <div style="font-size:1.3rem;">📝</div>
      <div style="text-align:left;">
        <div style="margin:0;font-size:0.95rem;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.5px;">Draft Shadow Bill</div>
        <div style="margin:2px 0 0;font-size:0.7rem;color:#9ca3af;">ร่างกฎหมายฝ่ายค้าน · ฿30M · 5 Cap · <span style="color:#fbbf24;font-weight:700;">2 AP</span></div>
      </div>
    </div>
  </button>`;

  nextMonthBtn.insertAdjacentHTML('afterend', draftBtnHTML);
  console.log('[engine.js] STEP 138 — Draft Shadow Bill button injected.');
}

/**
 * STEP 185: actionDraftShadowBill() — RNG Resource Buff Mechanic
 * Cost: ฿100M + 20 Capital + 3 AP.
 * 50% chance to activate a 20% resource gain buff for 8 months.
 * Does NOT stack — just resets timer to 8 on success.
 */
function actionDraftShadowBill() {
  if (oppState.ap < 3) {
    showToast('Need 3 AP to draft a bill!', 'error');
    return;
  }
  if (playerStats.funds < 100 || playerStats.capital < 20) {
    showToast('Need ฿100M and 20 ⚡ Capital.', 'error');
    return;
  }

  // Deduct Costs
  oppState.ap -= 3;
  playerStats.funds -= 100;
  playerStats.capital -= 20;

  // 50% Chance RNG
  const rng = Math.random();
  if (rng <= 0.50) {
    oppState.shadowBillBuffTimer = 8; // Buff for 8 months (resets, does not stack)
    localStorage.setItem('tps_opp_shadow_buff_timer', '8');

    showToast('📝 SUCCESS! Shadow Bill gained traction! Resource gains +20% for 8 months.', 'success');
    logAction('DRAFTED BILL: Policy resonated well! +20% resource gains for 8 months.', 'success');
  } else {
    showToast('❌ FAILED! The Shadow Bill was ignored by the media and public.', 'error');
    logAction('DRAFTED BILL: Failed to gain traction. Resources wasted.', 'error');
  }

  localStorage.setItem('tps_opp_ap', oppState.ap);
  saveState();
  updateUI();
  updateAPDisplay();
  updateActionButtonsUI();
  updateShadowBillButtonUI();
}

/**
 * STEP 185: updateShadowBillButtonUI() — Dynamic UI for Shadow Bill button
 * Updates button text to show new costs and visual feedback when buff is active.
 */
function updateShadowBillButtonUI() {
  const billBtn = document.getElementById('btn-draft-shadow-bill');
  if (billBtn) {
    billBtn.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
      <span style="font-size: 1.8rem;">📝</span>
      <div style="text-align: left;">
        <h4 style="margin: 0; font-size: 1rem; color: #60a5fa; text-transform: uppercase;">Draft Shadow Bill</h4>
        <p style="margin: 0; font-size: 0.7rem; color: #9ca3af;">ร่างกฎหมายทางเลือก &bull; ฿100M &bull; 20 ⚡ &bull; <span style="color:#fbbf24; font-weight:bold;">3 AP</span></p>
      </div>
    </div>`;

    // Visual feedback if buff is active
    if (oppState.shadowBillBuffTimer > 0) {
      billBtn.style.border = '1px solid #34d399';
      billBtn.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.2)';
    } else {
      billBtn.style.border = '1px solid #3b82f6';
      billBtn.style.boxShadow = 'none';
    }
  }
}

/**
 * STEP 190: calculateEndGameStats(isPMDefeated)
 * Calculates final grade (S/A/B/C/F), legacy buffs (polls % + funds),
 * and saves them to localStorage for the next campaign cycle.
 * Called by triggerGrandFinale().
 */
function calculateEndGameStats(isPMDefeated) {
  const exposedCount = shadowTargets.filter(t => t.isExposed && t.id !== PM_TARGET_ID).length;
  const cred = oppState.credibility || 0;

  // --- ULTRA NERFED: Total max polls capped around 20% ---
  // Credibility divided by 15 (Max ~6%) + 1% per minister (Max 7%)
  let legacyPolls = Math.floor(cred / 15) + exposedCount;

  // Funds slightly nerfed to balance the economy in the next game
  let legacyFunds = playerStats.capital + Math.floor(playerStats.funds / 10);

  if (isPMDefeated) {
    legacyPolls += 7;   // Nerfed from 15% to 7%
    legacyFunds += 300; // Nerfed from 500M to 300M
  }

  // Determine Grade
  let grade = 'F';
  let title = 'ฝ่ายค้านไร้ผลงาน — The Ineffective Opposition';
  let color = '#9ca3af';

  if (isPMDefeated || (cred >= 90 && exposedCount >= 5)) {
    grade = 'S'; title = 'สุดยอดฝ่ายค้าน — The Shadow Premier'; color = '#fbbf24';
  } else if (cred >= 75 && exposedCount >= 3) {
    grade = 'A'; title = 'ผู้ตรวจสอบที่ทรงพลัง — The Formidable Force'; color = '#34d399';
  } else if (cred >= 50 && exposedCount >= 1) {
    grade = 'B'; title = 'ปากเสียงประชาชน — The Voice of the People'; color = '#60a5fa';
  } else if (cred >= 30) {
    grade = 'C'; title = 'ฝ่ายค้านไม้ประดับ — The Token Opposition'; color = '#f87171';
  }

  // Save legacy buffs for the next campaign
  localStorage.setItem('tps_legacy_polls', String(legacyPolls));
  localStorage.setItem('tps_legacy_funds', String(legacyFunds));
  localStorage.setItem('tps_next_election_year', '2031');

  return { exposedCount, cred, legacyPolls, legacyFunds, grade, title, color, isPMDefeated };
}

/**
 * STEP 191: triggerGrandFinale(isPMDefeated)
 * Injects a full-screen cinematic end screen with grade, stats, and legacy buffs.
 * Two buttons: "New Game" (restart) and "Main Menu" (return to index).
 */
function triggerGrandFinale(isPMDefeated = false) {
  // Prevent double trigger
  if (document.getElementById('grand-finale-screen')) return;

  const stats = calculateEndGameStats(isPMDefeated);

  const narrativeText = isPMDefeated
    ? 'Outstanding! You successfully brought down the Prime Minister before the term ended. The public views your party as the true leaders of the nation.'
    : 'Congratulations! You have survived a full 4-year term as the Leader of the Opposition. You held the government accountable and endured.';

  // STEP 206: Dynamic buttons based on campaign loop state
  const isCampaignLoop = localStorage.getItem('tps_campaign_loop') === 'true';
  let currentYear = parseInt(localStorage.getItem('tps_current_election_year')) || 2027;
  let nextYear = currentYear + 4;

  let actionButtonsHTML = '';

  if (isCampaignLoop) {
    // Campaign Loop Mode: Show "Continue to Campaign" with save wipe
    actionButtonsHTML = `
      <button class="finale-btn" onclick="startNewCampaignLoop(${nextYear})" style="
        background: linear-gradient(135deg, #d97706 0%, #b45309 100%); border: 1px solid #fbbf24;
        padding: 16px 28px; border-radius: 10px; color: white; font-weight: 700; cursor: pointer;
        transition: all 0.3s ease; display: flex; align-items: center; gap: 10px; font-size: 0.95rem;
        box-shadow: 0 4px 20px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);">
        🗳️ Continue to Campaign (${nextYear}) ➡️
      </button>`;
  } else {
    // Standalone Mode: Show New Game + Main Menu
    actionButtonsHTML = `
      <button class="finale-btn" onclick="window.location.href='intro.html'" style="
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); padding: 16px 28px;
        border-radius: 10px; color: #d1d5db; font-weight: 600; cursor: pointer; transition: all 0.3s ease;
        display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
        🔄 New Game
      </button>
      <button class="finale-btn" onclick="window.location.href='../index.html'" style="
        background: linear-gradient(135deg, #d97706 0%, #b45309 100%); border: 1px solid #fbbf24;
        padding: 16px 28px; border-radius: 10px; color: white; font-weight: 700; cursor: pointer;
        transition: all 0.3s ease; display: flex; align-items: center; gap: 10px; font-size: 0.95rem;
        box-shadow: 0 4px 20px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);">
        🏠 Main Menu
      </button>`;
  }

  const finaleHTML = `
  <div id="grand-finale-screen" style="
    position: fixed; inset: 0; background: linear-gradient(180deg, #0b0f19 0%, #111827 50%, #0f172a 100%);
    z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: white; font-family: 'Inter', sans-serif; animation: fadeIn 1s ease-out;
    overflow-y: auto; padding: 40px 20px;">

    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes gradeReveal { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 15px rgba(251,191,36,0.5)); } 50% { filter: drop-shadow(0 0 30px rgba(251,191,36,0.8)); } }
      #grand-finale-screen .finale-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.4); }
    </style>

    <div style="font-size: 4rem; margin-bottom: 15px; animation: pulseGlow 2s ease-in-out infinite;">🏛️</div>
    <h1 style="font-size: 2.5rem; margin: 0 0 8px 0; color: #fbbf24; letter-spacing: 3px; text-transform: uppercase; text-shadow: 0 0 20px rgba(251,191,36,0.3);">
      ${isPMDefeated ? 'VICTORY!' : 'TERM COMPLETED'}
    </h1>
    <div style="width: 80px; height: 3px; background: linear-gradient(to right, transparent, #fbbf24, transparent); margin-bottom: 20px;"></div>

    <p style="color: #9ca3af; text-align: center; max-width: 550px; line-height: 1.7; margin-bottom: 35px; font-size: 0.95rem; animation: slideUp 0.8s ease-out 0.3s both;">
      ${narrativeText}
    </p>

    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(251,191,36,0.2); border-radius: 16px; padding: 35px 40px; width: 100%; max-width: 580px; box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05); animation: slideUp 0.8s ease-out 0.5s both;">

      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 6rem; font-weight: 900; line-height: 1; color: ${stats.color}; text-shadow: 0 0 30px ${stats.color}50; animation: gradeReveal 0.6s ease-out 0.8s both;">${stats.grade}</div>
        <div style="color: ${stats.color}; font-weight: 700; margin-top: 10px; font-size: 1.05rem; letter-spacing: 0.5px;">${stats.title}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.35); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
          <span style="color:#9ca3af;">Final Credibility</span><strong style="color:white; font-size: 1rem;">${stats.cred}/100</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.35); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
          <span style="color:#9ca3af;">Ministers Exposed</span><strong style="color:white; font-size: 1rem;">${stats.exposedCount}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(251,191,36,0.05); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(251,191,36,0.15);">
          <span style="color:#fbbf24;">Legacy: Polls</span><strong style="color:#fbbf24; font-size: 1rem;">+${stats.legacyPolls}%</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(74,222,128,0.05); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(74,222,128,0.15);">
          <span style="color:#4ade80;">Legacy: Funds</span><strong style="color:#4ade80; font-size: 1rem;">+฿${stats.legacyFunds}M</strong>
        </div>
      </div>

      ${isPMDefeated ? '<div style="text-align:center; margin-top: 18px; padding: 10px; background: rgba(251,191,36,0.08); border-radius: 8px; border: 1px solid rgba(251,191,36,0.2);"><span style="color: #fbbf24; font-weight: 700;">🔥 PM DEFEATED BONUS: +7% Polls, +฿300M Funds</span></div>' : ''}
    </div>

    <div style="display: flex; gap: 20px; margin-top: 35px; animation: slideUp 0.8s ease-out 0.7s both;">
      ${actionButtonsHTML}
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', finaleHTML);
}

/**
 * STEP 110: logAction() — Persisted log system.
 * Adds entries to oppLog, saves to localStorage, and renders to the UI.
 * @param {string} message — The log message
 * @param {string} type — 'info' | 'success' | 'fail' | 'warning'
 */
function logAction(message, type = 'info') {
  oppLog.unshift({ month: oppState.month, message, type, time: Date.now() });

  // Keep only the last 30 logs to prevent bloat
  if (oppLog.length > 30) oppLog.pop();

  // Persist to localStorage
  localStorage.setItem('tps_opp_logs', JSON.stringify(oppLog));

  // Render
  renderLogs();
}

/**
 * STEP 110: renderLogs() — Draws log entries into #opposition-log.
 * Color-coded by type: success=green, fail/error=red, warning=amber, info=slate.
 */
function renderLogs() {
  const container = document.getElementById('opposition-log');
  if (!container) return;

  if (oppLog.length === 0) {
    container.innerHTML = '<div class="log-empty">No activities recorded yet. Begin your oversight campaign.</div>';
    if (document.getElementById('log-count')) {
      document.getElementById('log-count').textContent = '0 entries';
    }
    return;
  }

  container.innerHTML = oppLog.map(e => {
    // Map type to CSS class (matches style.css .log-entry.success/.fail/.info)
    let typeClass = e.type || 'info';
    if (typeClass === 'error') typeClass = 'fail'; // normalize

    return `<div class="log-entry ${typeClass}">
      <span class="log-month">M${e.month}</span> ${e.message}
    </div>`;
  }).join('');

  if (document.getElementById('log-count')) {
    document.getElementById('log-count').textContent = `${oppLog.length} entries`;
  }
}

// ──────────────────────────────────────────────────────────────────
// SECTION 8: TOAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────

function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ──────────────────────────────────────────────────────────────────
// SECTION 9: CRISIS EVENT SYSTEM (Government Retaliation)
// STEP 113: Dynamic Crisis Modal — injected into DOM at runtime.
// ──────────────────────────────────────────────────────────────────

/**
 * STEP 113: injectCrisisModal()
 * Creates the crisis/emergency event modal overlay and appends it to
 * document.body. Safe to call multiple times — skips if already present.
 * Called once during initOpposition().
 */
function injectCrisisModal() {
  if (document.getElementById('opp-crisis-modal')) return;

  const modalHTML = `
  <div id="opp-crisis-modal" class="modal-overlay" style="
    display: none;
    align-items: center;
    justify-content: center;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.3s ease;
  ">
    <div class="modal-content" style="
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border: 2px solid #ef4444;
      border-radius: 12px;
      width: 520px;
      max-width: 90vw;
      padding: 28px;
      color: white;
      box-shadow: 0 10px 40px rgba(239, 68, 68, 0.25), 0 0 80px rgba(239, 68, 68, 0.08);
      transform: scale(1);
      animation: modalPop 0.3s ease;
    ">
      <div style="display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #374151; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="
          width: 44px; height: 44px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        ">
          <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 1.4rem;"></i>
        </div>
        <div>
          <h3 id="crisis-title" style="margin: 0; color: #ef4444; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 1px;">EMERGENCY</h3>
          <span style="font-size: 0.7rem; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px;">Government Retaliation — Month <span id="crisis-month">?</span></span>
        </div>
      </div>
      <p id="crisis-desc" style="font-size: 0.95rem; line-height: 1.6; color: #d1d5db; margin-bottom: 25px;">Description here.</p>
      <div id="crisis-choices" style="display: flex; flex-direction: column; gap: 10px;"></div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log('[engine.js] STEP 113 — Crisis Modal injected into DOM.');
}

/**
 * STEP 114: oppCrises[] — Government Retaliation Database
 * Each crisis represents a counter-attack from the ruling government.
 * Choices escalate from costly-but-positive → free-but-devastating.
 * The "free" option always carries a heavy Credibility penalty.
 */
const oppCrises = [
  {
    id: 'slapp_suit',
    title: 'Defamation Lawsuit (ฟ้องปิดปาก)',
    desc: 'The Government has filed a massive defamation lawsuit against your party spokesperson regarding recent investigation leaks. Respond immediately or face the consequences.',
    choices: [
      { text: '⚖️ Hire Top Lawyers (Cost: ฿50M)', costFunds: 50, costCap: 0, costIntel: 0, effectCred: 2, log: '⚖️ Top lawyers fought off the SLAPP suit. The public sees your resilience. Credibility +2.' },
      { text: '🤝 Use Political Leverage (Cost: 10 Capital)', costFunds: 0, costCap: 10, costIntel: 0, effectCred: 0, log: '🤝 Used backchannel deals to quietly drop the lawsuit. No public impact.' },
      { text: '😞 Apologize & Retract (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -15, log: '😞 Forced to issue public apology and retract statements. Massive blow to credibility. -15.' }
    ]
  },
  {
    id: 'io_smear',
    title: 'State Media Smear Campaign (ไอโอโจมตี)',
    desc: 'State-sponsored media and IO networks are running a 24/7 smear campaign accusing your party of foreign interference and lèse-majesté. The narrative is spreading fast.',
    choices: [
      { text: '📺 Counter-Media Blitz (Cost: ฿80M)', costFunds: 80, costCap: 0, costIntel: 0, effectCred: 5, log: '📺 Counter-campaign successfully debunked the fake news. Public trust restored. Credibility +5.' },
      { text: '🔍 Release Distracting Intel (Cost: 5 Intel)', costFunds: 0, costCap: 0, costIntel: 5, effectCred: 0, log: '🔍 Burned intel reserves to shift the news cycle. Smear campaign overshadowed.' },
      { text: '🤷 Ignore It (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -10, log: '🤷 The smear campaign went unchallenged. Public opinion plummeted. Credibility -10.' }
    ]
  },
  {
    id: 'party_ban_threat',
    title: 'Party Dissolution Threat (ขู่ยุบพรรค)',
    desc: 'The Election Commission is threatening to file a party dissolution case, citing alleged illegal campaign financing during your last election. Your legal team needs direction.',
    choices: [
      { text: '🏛️ Full Legal Defense (Cost: ฿100M, 5 Capital)', costFunds: 100, costCap: 5, costIntel: 0, effectCred: 3, log: '🏛️ Mounted a full constitutional defense. EC backed down. Credibility +3 — seen as untouchable.' },
      { text: '📄 Negotiate Settlement (Cost: ฿40M)', costFunds: 40, costCap: 0, costIntel: 0, effectCred: -3, log: '📄 Settled with EC — paid fine and accepted restrictions. Public sees it as admission of guilt. Credibility -3.' },
      { text: '🏳️ Accept Restrictions (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -12, log: '🏳️ Accepted all EC restrictions without a fight. Party appears weak and cornered. Credibility -12.' }
    ]
  },
  {
    id: 'key_member_bribed',
    title: 'Key Member Defection (ซื้อตัว ส.ส.)',
    desc: 'Government operatives have bribed one of your senior MPs with a cabinet position offer. They are about to publicly defect and take damaging insider information with them.',
    choices: [
      { text: '💰 Counter-Offer to Stay (Cost: ฿60M, 8 Capital)', costFunds: 60, costCap: 8, costIntel: 0, effectCred: 1, log: '💰 Counter-offer accepted. MP stayed loyal — for now. Party unity preserved. Credibility +1.' },
      { text: '🔥 Pre-Emptive Expulsion (Cost: 3 Capital)', costFunds: 0, costCap: 3, costIntel: 0, effectCred: -4, log: '🔥 Expelled the traitor before they could defect. Lost a seat but controlled the narrative. Credibility -4.' },
      { text: '😶 Let Them Go (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -10, log: '😶 Senior MP defected to government with insider knowledge. Devastating public spectacle. Credibility -10.' }
    ]
  },
  {
    id: 'protest_crackdown',
    title: 'Pro-Democracy Protest Crisis (สลายการชุมนุม)',
    desc: 'Pro-democracy protesters aligned with your party are rallying at Government House. The PM is threatening a crackdown. Your response will define your legacy.',
    choices: [
      { text: '🛡️ Mobilize Legal Observers (Cost: ฿70M, 5 Capital)', costFunds: 70, costCap: 5, costIntel: 0, effectCred: 6, log: '🛡️ Deployed legal observers and medics. Crackdown averted. International media praised your leadership. Credibility +6.' },
      { text: '📢 Condemn from Parliament Floor (Cost: 5 Capital)', costFunds: 0, costCap: 5, costIntel: 0, effectCred: 2, log: '📢 Made a powerful speech condemning the crackdown threat. Some impact but protesters felt abandoned. Credibility +2.' },
      { text: '🙈 Distance Yourself (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -14, log: '🙈 Stayed silent while protesters were dispersed. Your base feels betrayed. Credibility -14.' }
    ]
  },
  {
    id: 'cyber_attack',
    title: 'Party Database Breach (แฮ็กฐานข้อมูลพรรค)',
    desc: 'Government-linked hackers have breached your party database. They are threatening to release doctored donor records and internal communications to discredit you.',
    choices: [
      { text: '🔐 Hire Cybersecurity Firm (Cost: ฿55M, 3 Intel)', costFunds: 55, costCap: 0, costIntel: 3, effectCred: 3, log: '🔐 Cybersecurity team traced the attack to government actors. Counter-narrative published. Credibility +3.' },
      { text: '📰 Pre-Emptive Transparency (Cost: 5 Intel)', costFunds: 0, costCap: 0, costIntel: 5, effectCred: 1, log: '📰 Released authentic records first, neutralizing the doctored leaks. Credibility +1.' },
      { text: '🤐 Hope It Blows Over (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -11, log: '🤐 Doctored records published. Media frenzy destroyed public trust. Credibility -11.' }
    ]
  },
  {
    id: 'coalition_split',
    title: 'Coalition Partner Pressure (พันธมิตรถูกกดดัน)',
    desc: 'The government is pressuring your minor coalition partners to abandon you. Two small parties are wavering. Without them, your parliamentary influence collapses.',
    choices: [
      { text: '🤝 Emergency Coalition Meeting (Cost: ฿45M, 7 Capital)', costFunds: 45, costCap: 7, costIntel: 0, effectCred: 4, log: '🤝 Emergency summit held. Coalition partners reaffirmed loyalty after concessions. Credibility +4.' },
      { text: '📋 Offer Committee Seats (Cost: 10 Capital)', costFunds: 0, costCap: 10, costIntel: 0, effectCred: -1, log: '📋 Gave up key committee positions to keep coalition intact. Internal grumbling but unity held. Credibility -1.' },
      { text: '💔 Let the Coalition Fracture (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -13, log: '💔 Coalition partners defected to government bloc. Opposition dramatically weakened. Credibility -13.' }
    ]
  },
  {
    id: 'royal_institution',
    title: 'Monarchy Accusation (ถูกกล่าวหาล้มเจ้า)',
    desc: 'Government-aligned media is insinuating that your party harbors anti-monarchy sentiment. In Thailand, this is a politically lethal accusation that must be addressed immediately.',
    choices: [
      { text: '🇹🇭 Formal Loyalty Declaration + PR (Cost: ฿90M, 5 Capital)', costFunds: 90, costCap: 5, costIntel: 0, effectCred: 4, log: '🇹🇭 Issued formal loyalty declaration with national TV coverage. Accusation neutralized. Credibility +4.' },
      { text: '📜 Quiet Diplomatic Channels (Cost: 8 Capital, 3 Intel)', costFunds: 0, costCap: 8, costIntel: 3, effectCred: 0, log: '📜 Used diplomatic backchannel to resolve the accusation quietly. No public damage.' },
      { text: '🔇 Stay Silent (Free)', costFunds: 0, costCap: 0, costIntel: 0, effectCred: -18, log: '🔇 Silence interpreted as guilt. Devastating blow to legitimacy. Public support cratered. Credibility -18.' }
    ]
  }
];

console.log(`[engine.js] STEP 114 — ${oppCrises.length} Crisis Events loaded.`);

/**
 * STEP 129: oppOpportunities[] — Golden Opportunities Database
 * Positive RNG events that reward the player with Intel, Credibility,
 * or free Scandal points on random ministers.
 * Choices: expensive-but-rewarding → moderate → free (no benefit).
 */
const oppOpportunities = [
  {
    id: 'deep_throat',
    title: 'The Whistleblower (สายลับวงใน)',
    desc: 'A high-ranking official has approached your party with a flash drive containing highly classified evidence of corruption. This could be a goldmine — or a trap.',
    choices: [
      { text: '💾 Buy the Intel (Cost: ฿60M)', costFunds: 60, costCap: 0, rewardIntel: 15, rewardCred: 0, rewardScandal: 0, log: '💾 Purchased the flash drive. Massive Intel gained (+15). The investigation accelerates.' },
      { text: '🤝 Offer Political Protection (Cost: 10 Cap)', costFunds: 0, costCap: 10, rewardIntel: 0, rewardCred: 3, rewardScandal: 2, log: '🤝 Protected the whistleblower. Public trust grew (+3 Cred) and dirt was exposed (+2 Scandal).' },
      { text: '🚫 Turn Them Away (Free)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 0, rewardScandal: 0, log: '🚫 Turned away the whistleblower. A missed opportunity — nothing gained.' }
    ]
  },
  {
    id: 'viral_protest',
    title: 'Viral Organic Movement (กระแสมวลชน)',
    desc: 'A grassroots student movement has gone viral overnight, protesting against the government\'s recent policies. The hashtag is trending #1 nationally.',
    choices: [
      { text: '💰 Fund the Movement (Cost: ฿40M)', costFunds: 40, costCap: 0, rewardIntel: 0, rewardCred: 5, rewardScandal: 0, log: '💰 Secretly funded the protests. Opposition credibility surged (+5 Cred).' },
      { text: '📢 Speak at the Rally (Cost: 5 Cap)', costFunds: 0, costCap: 5, rewardIntel: 0, rewardCred: 4, rewardScandal: 1, log: '📢 Rallied the crowd. Gained momentum (+4 Cred) and exposed government flaws (+1 Scandal).' },
      { text: '🤷 Stay Out of It (Free)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 0, rewardScandal: 0, log: '🤷 Avoided the protests to play it safe. The movement faded without you.' }
    ]
  },
  {
    id: 'leaked_budget',
    title: 'Leaked Budget Documents (เอกสารงบลับ)',
    desc: 'An anonymous source has leaked classified budget allocation documents showing massive discrepancies between reported and actual spending across multiple ministries.',
    choices: [
      { text: '🔬 Commission Full Analysis (Cost: ฿50M, 3 Cap)', costFunds: 50, costCap: 3, rewardIntel: 10, rewardCred: 3, rewardScandal: 2, log: '🔬 Budget analysis revealed systemic corruption. Intel +10, Cred +3, exposed a minister (+2 Scandal).' },
      { text: '📰 Leak to Friendly Media (Cost: 5 Cap)', costFunds: 0, costCap: 5, rewardIntel: 0, rewardCred: 4, rewardScandal: 1, log: '📰 Media ran the budget story. Public outrage grew (+4 Cred, +1 Scandal on random minister).' },
      { text: '📁 File It Away (Free)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 0, rewardScandal: 0, log: '📁 Filed the documents without action. The evidence gathers dust.' }
    ]
  },
  {
    id: 'foreign_ngo',
    title: 'International NGO Support (องค์กรระหว่างประเทศ)',
    desc: 'A respected international governance watchdog has offered to publish a damning report on the Thai government — but they need your party\'s cooperation and data.',
    choices: [
      { text: '🌍 Full Cooperation (Cost: ฿30M, 5 Intel)', costFunds: 30, costCap: 0, rewardIntel: 0, rewardCred: 6, rewardScandal: 2, log: '🌍 International report published. Massive credibility boost (+6 Cred) and government exposed (+2 Scandal).' },
      { text: '📋 Share Limited Data (Cost: 3 Intel)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 3, rewardScandal: 1, log: '📋 Shared limited data. Report had moderate impact (+3 Cred, +1 Scandal).' },
      { text: '🙅 Decline Involvement (Free)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 0, rewardScandal: 0, log: '🙅 Declined NGO cooperation. Feared government backlash.' }
    ]
  },
  {
    id: 'defecting_aide',
    title: 'Government Aide Defection (เลขาฯ แปรพักตร์)',
    desc: 'A senior aide to a cabinet minister has secretly contacted your party, offering to defect and bring insider knowledge about ongoing corruption schemes.',
    choices: [
      { text: '🏠 Provide Safe House + Salary (Cost: ฿45M, 5 Cap)', costFunds: 45, costCap: 5, rewardIntel: 12, rewardCred: 2, rewardScandal: 3, log: '🏠 Aide defected successfully. Treasure trove of intel (+12 Intel, +2 Cred, +3 Scandal on their boss).' },
      { text: '📞 Phone Debriefing Only (Cost: ฿15M)', costFunds: 15, costCap: 0, rewardIntel: 5, rewardCred: 0, rewardScandal: 1, log: '📞 Quick phone debrief. Some useful intel (+5 Intel, +1 Scandal).' },
      { text: '❌ Too Risky — Decline (Free)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 0, rewardScandal: 0, log: '❌ Declined the defection. Too risky — the aide went underground.' }
    ]
  },
  {
    id: 'auditor_report',
    title: 'State Auditor\'s Bombshell (สตง.เปิดโปง)',
    desc: 'The Office of the Auditor General has independently discovered irregularities in government procurement. They are willing to share findings with your party before going public.',
    choices: [
      { text: '📊 Joint Press Conference (Cost: ฿35M, 3 Cap)', costFunds: 35, costCap: 3, rewardIntel: 5, rewardCred: 5, rewardScandal: 2, log: '📊 Joint press conference shook the government. Massive public impact (+5 Cred, +5 Intel, +2 Scandal).' },
      { text: '🔍 Use as Investigation Fuel (Cost: 5 Cap)', costFunds: 0, costCap: 5, rewardIntel: 8, rewardCred: 2, rewardScandal: 1, log: '🔍 Used auditor data to fuel investigations (+8 Intel, +2 Cred, +1 Scandal).' },
      { text: '🤐 Let the Auditor Handle It (Free)', costFunds: 0, costCap: 0, rewardIntel: 0, rewardCred: 1, rewardScandal: 0, log: '🤐 Let the auditor publish independently. Minor credibility boost (+1 Cred).' }
    ]
  }
];

console.log(`[engine.js] STEP 129 — ${oppOpportunities.length} Golden Opportunities loaded.`);

// ──────────────────────────────────────────────────────────────────
// SECTION 9B: ANNUAL BUDGET WAR (Every 12 months)
// STEP 132: Mandatory fiscal event — overrides normal RNG events
// ──────────────────────────────────────────────────────────────────

/**
 * STEP 132: budgetOptions[]
 * Choices for the Annual Budget Debate. Higher cost = higher reward.
 * The "free" option carries a credibility penalty for failing to scrutinize.
 */
const budgetOptions = [
  {
    text: '✂️ Cut Defense Procurement (Cost: 10 Intel, 10 Cap)',
    costFunds: 0, costCap: 10, costIntel: 10, effectCred: 15,
    log: '✂️ Successfully cut unnecessary military spending! Public praises the Opposition. Credibility +15.'
  },

  {
    text: '🏗️ Expose Infrastructure Pork-Barrel (Cost: ฿50M, 5 Intel)',
    costFunds: 50, costCap: 0, costIntel: 5, effectCred: 10,
    log: '🏗️ Exposed inflated infrastructure budgets. Scrutiny successful. Credibility +10.'
  },

  {
    text: '🗣️ General Policy Critique (Cost: 5 Capital)',
    costFunds: 0, costCap: 5, costIntel: 0, effectCred: 3,
    log: '🗣️ Delivered a standard critique of the budget. It passed with minor changes. Credibility +3.'
  },

  {
    text: '🚫 Abstain / Let it Pass (Free)',
    costFunds: 0, costCap: 0, costIntel: 0, effectCred: -8,
    log: '🚫 Failed to properly scrutinize the budget. The public is disappointed. Credibility -8.'
  }
];

/**
 * STEP 132: showBudgetModal()
 * Displays the Annual Budget Debate using the shared crisis modal,
 * reskinned with a Cyan/Blue fiscal theme.
 * Called from advanceMonth() on months 12, 24, 36, 48.
 */
function showBudgetModal() {
  activeEventType = 'budget';
  const modal = document.getElementById('opp-crisis-modal');
  if (!modal) { console.error('Event modal not found for Budget!'); return; }

  const fiscalYear = Math.ceil(oppState.month / 12);

  // ── Dynamic Cyan/Blue Styling ──
  const accentColor = '#06b6d4';

  const contentDiv = modal.querySelector('[style*="border-radius: 16px"]') || modal.querySelector('div > div');
  if (contentDiv) {
    contentDiv.style.border = `2px solid ${accentColor}`;
    contentDiv.style.boxShadow = `0 10px 40px rgba(6, 182, 212, 0.25), 0 0 80px rgba(6, 182, 212, 0.08)`;
  }

  const iconCircle = modal.querySelector('div[style*="border-radius: 50%"]');
  if (iconCircle) {
    iconCircle.style.background = 'rgba(6, 182, 212, 0.15)';
    iconCircle.innerHTML = `<span style="font-size:1.4rem;">📊</span>`;
  }

  const titleEl = document.getElementById('crisis-title');
  titleEl.textContent = 'ANNUAL BUDGET DEBATE (ศึกชำแหละงบประมาณ)';
  titleEl.style.color = accentColor;

  const monthLabel = modal.querySelector('span[style*="letter-spacing: 1.5px"]');
  if (monthLabel) {
    monthLabel.innerHTML = `Fiscal Year ${fiscalYear} — Month <span id="crisis-month">${oppState.month}</span>`;
  }

  document.getElementById('crisis-desc').textContent =
    `The Government has proposed the Year ${fiscalYear} fiscal budget totaling ฿${(3000 + Math.floor(Math.random() * 500))}B. ` +
    `It is your duty as the Opposition to scrutinize and cut wasteful spending. How will you attack the budget?`;

  // ── Build choice buttons ──
  let choicesHTML = '';
  budgetOptions.forEach((choice, index) => {
    const canAfford =
      playerStats.funds >= (choice.costFunds || 0) &&
      playerStats.capital >= (choice.costCap || 0) &&
      oppState.intelPoints >= (choice.costIntel || 0);

    const isFreeOption = (choice.costFunds === 0 && choice.costCap === 0 && choice.costIntel === 0);

    // Button styles
    let btnBg, btnBorder, btnOpacity, btnCursor;
    if (!canAfford) {
      btnBg = '#111827'; btnBorder = '#374151'; btnOpacity = '0.4'; btnCursor = 'not-allowed';
    } else if (isFreeOption && choice.effectCred < 0) {
      // Free option = danger
      btnBg = 'rgba(239, 68, 68, 0.1)'; btnBorder = '#7f1d1d'; btnOpacity = '1'; btnCursor = 'pointer';
    } else {
      // Paid options = cyan-tinted
      btnBg = 'rgba(6, 182, 212, 0.05)'; btnBorder = '#155e75'; btnOpacity = '1'; btnCursor = 'pointer';
    }

    // Cost breakdown
    const costs = [];
    if (choice.costFunds) costs.push(`฿${choice.costFunds}M`);
    if (choice.costCap) costs.push(`⚡${choice.costCap} Capital`);
    if (choice.costIntel) costs.push(`🔍${choice.costIntel} Intel`);
    const costTag = costs.length > 0
      ? `<span style="font-size:0.7rem;color:#9ca3af;">${costs.join(' · ')}</span>`
      : `<span style="font-size:0.7rem;color:#ef4444;">FREE — Dereliction of duty</span>`;

    // Effect preview
    const effectColor = choice.effectCred > 0 ? '#4ade80' : '#ef4444';
    const effectText = `<span style="font-size:0.7rem;color:${effectColor};float:right;">Cred: ${choice.effectCred > 0 ? '+' : ''}${choice.effectCred}</span>`;

    choicesHTML += `
    <button id="budget-choice-${index}" style="
      padding: 14px 16px;
      text-align: left;
      color: white;
      border-radius: 8px;
      transition: all 0.2s ease;
      background: ${btnBg};
      border: 1px solid ${btnBorder};
      opacity: ${btnOpacity};
      cursor: ${btnCursor};
      font-family: inherit;
    " ${canAfford ? `onclick="resolveBudget(${index})"` : 'disabled'}
       ${canAfford ? `onmouseenter="this.style.borderColor='#06b6d4';this.style.transform='translateX(4px)'" onmouseleave="this.style.borderColor='${btnBorder}';this.style.transform='none'"` : ''}>
      <div style="font-weight:600;margin-bottom:4px;">${choice.text}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        ${costTag}
        ${effectText}
      </div>
      ${!canAfford ? '<div style="font-size:0.65rem;color:#ef4444;margin-top:4px;">⚠ Insufficient resources</div>' : ''}
    </button>`;
  });

  document.getElementById('crisis-choices').innerHTML = choicesHTML;

  // Show the modal
  modal.style.display = 'flex';
  console.log(`[engine.js] STEP 132 — Budget Debate modal displayed (Year ${fiscalYear}, Month ${oppState.month})`);
}

/**
 * STEP 133: resolveBudget()
 * Processes the player's budget debate choice.
 * Deducts costs (strict parseInt), applies credibility effect,
 * shows detailed toast, and updates UI.
 * NOTE: Budget fires AFTER month increments (end-of-year event),
 * so it does NOT re-call advanceMonth().
 */
function resolveBudget(choiceIndex) {
  const choice = budgetOptions[choiceIndex];
  if (!choice) { console.error('[BUDGET] Choice not found:', choiceIndex); return; }

  const fiscalYear = Math.ceil(oppState.month / 12);

  // DEBUG: Log state BEFORE
  console.log(`[BUDGET] BEFORE — Funds: ${playerStats.funds}, Capital: ${playerStats.capital}, Intel: ${oppState.intelPoints}, Cred: ${oppState.credibility}`);

  // STRICT parseInt deductions
  playerStats.funds = Math.max(0, parseInt(playerStats.funds) - parseInt(choice.costFunds || 0));
  playerStats.capital = Math.max(0, parseInt(playerStats.capital) - parseInt(choice.costCap || 0));
  oppState.intelPoints = Math.max(0, parseInt(oppState.intelPoints) - parseInt(choice.costIntel || 0));

  // STEP 168: Apply credibility effect HALVED (clamped 0-100)
  let rawBudgetCred = parseInt(choice.effectCred || 0);
  let halvedBudgetCred = rawBudgetCred > 0 ? Math.ceil(rawBudgetCred / 2) : Math.floor(rawBudgetCred / 2);
  oppState.credibility = Math.max(0, Math.min(100, parseInt(oppState.credibility) + halvedBudgetCred));

  // DEBUG: Log state AFTER
  console.log(`[BUDGET] AFTER  — Funds: ${playerStats.funds}, Capital: ${playerStats.capital}, Intel: ${oppState.intelPoints}, Cred: ${oppState.credibility}`);

  // Close the modal
  document.getElementById('opp-crisis-modal').style.display = 'none';

  // ── Detailed toast ──
  const costParts = [];
  if (choice.costFunds) costParts.push(`-฿${choice.costFunds}M`);
  if (choice.costCap) costParts.push(`-${choice.costCap} Cap`);
  if (choice.costIntel) costParts.push(`-${choice.costIntel} Intel`);
  const costStr = costParts.length > 0 ? costParts.join(', ') : 'Free';

  const credStr = choice.effectCred > 0 ? `+${choice.effectCred}` : `${choice.effectCred}`;
  const toastType = choice.effectCred < 0 ? 'error' : 'success';
  showToast(`📊 Budget Debate Y${fiscalYear}: (${costStr} | ${credStr} Cred)`, toastType);

  // Log the narrative outcome
  const logType = choice.effectCred >= 0 ? 'success' : 'fail';
  logAction(`📊 BUDGET WAR Y${fiscalYear}: ${choice.log}`, logType);

  // Save and update everything
  saveState();
  updateUI();
  updateActionButtonsUI();
}

/** Tracks whether the current modal event is a 'crisis', 'opportunity', or 'budget' */
let activeEventType = null;

/**
 * STEP 130: checkMonthlyEvents()
 * Unified event trigger — replaces checkMonthlyCrisis().
 * Single RNG roll: 0–25% = Crisis, 25–40% = Opportunity, 40–100% = Nothing.
 * Returns true if any event fires (halting month advancement).
 */
function checkMonthlyEvents() {
  const rng = Math.random();

  // 25% chance — Government Retaliation (Crisis)
  if (rng < 0.25) {
    const crisis = oppCrises[Math.floor(Math.random() * oppCrises.length)];
    console.log(`[engine.js] STEP 130 — Crisis triggered: ${crisis.id}`);
    showEventModal(crisis, 'crisis');
    return true;
  }
  // 15% chance — Golden Opportunity (if no crisis)
  else if (rng < 0.40) {
    const opp = oppOpportunities[Math.floor(Math.random() * oppOpportunities.length)];
    console.log(`[engine.js] STEP 130 — Opportunity triggered: ${opp.id}`);
    showEventModal(opp, 'opportunity');
    return true;
  }

  return false; // No events this month
}

/**
 * STEP 130: showEventModal()
 * Unified modal display — dynamically reskins for crisis (red) or opportunity (gold/green).
 * Replaces the old showCrisisModal().
 */
function showEventModal(eventData, type) {
  activeEventType = type;
  const modal = document.getElementById('opp-crisis-modal');
  if (!modal) { console.error('Event modal not found!'); return; }

  const isCrisis = type === 'crisis';

  // ── Dynamic header styling ──
  const accentColor = isCrisis ? '#ef4444' : '#fbbf24';
  const headerIcon = isCrisis ? '⚠️' : '⭐';
  const headerLabel = isCrisis ? 'Government Retaliation' : 'Golden Opportunity';

  // Restyle the modal content container
  const contentDiv = modal.querySelector('[style*="border-radius: 16px"]') || modal.querySelector('div > div');
  if (contentDiv) {
    contentDiv.style.border = `2px solid ${accentColor}`;
    contentDiv.style.boxShadow = `0 10px 40px ${isCrisis ? 'rgba(239, 68, 68, 0.25)' : 'rgba(251, 191, 36, 0.25)'}, 0 0 80px ${isCrisis ? 'rgba(239, 68, 68, 0.08)' : 'rgba(251, 191, 36, 0.08)'}`;
  }

  // Restyle the icon circle
  const iconCircle = modal.querySelector('div[style*="border-radius: 50%"]');
  if (iconCircle) {
    iconCircle.style.background = isCrisis ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)';
    iconCircle.innerHTML = `<span style="font-size:1.4rem;">${headerIcon}</span>`;
  }

  // Populate header text
  const titleEl = document.getElementById('crisis-title');
  titleEl.textContent = eventData.title;
  titleEl.style.color = accentColor;

  const monthLabel = modal.querySelector('span[style*="letter-spacing: 1.5px"]');
  if (monthLabel) {
    monthLabel.innerHTML = `${headerLabel} — Month <span id="crisis-month">${oppState.month}</span>`;
  }

  document.getElementById('crisis-desc').textContent = eventData.desc;

  // ── Build choice buttons ──
  let choicesHTML = '';
  eventData.choices.forEach((choice, index) => {
    const canAfford =
      playerStats.funds >= (choice.costFunds || 0) &&
      playerStats.capital >= (choice.costCap || 0) &&
      oppState.intelPoints >= (choice.costIntel || 0);

    const isFreeOption = (choice.costFunds === 0 && choice.costCap === 0 && (choice.costIntel || 0) === 0);

    // Button styles depend on type and affordability
    let btnBg, btnBorder, btnOpacity, btnCursor;
    if (!canAfford) {
      btnBg = '#111827'; btnBorder = '#374151'; btnOpacity = '0.4'; btnCursor = 'not-allowed';
    } else if (isCrisis && isFreeOption && (choice.effectCred || 0) < 0) {
      // Crisis free option = danger red
      btnBg = 'rgba(239, 68, 68, 0.1)'; btnBorder = '#7f1d1d'; btnOpacity = '1'; btnCursor = 'pointer';
    } else if (!isCrisis && !isFreeOption) {
      // Opportunity paid option = gold-tinted
      btnBg = 'rgba(251, 191, 36, 0.05)'; btnBorder = '#92400e'; btnOpacity = '1'; btnCursor = 'pointer';
    } else {
      btnBg = '#374151'; btnBorder = '#4b5563'; btnOpacity = '1'; btnCursor = 'pointer';
    }

    // Cost breakdown
    const costs = [];
    if (choice.costFunds) costs.push(`฿${choice.costFunds}M`);
    if (choice.costCap) costs.push(`⚡${choice.costCap} Capital`);
    if (choice.costIntel) costs.push(`🔍${choice.costIntel} Intel`);

    let costTag;
    if (costs.length > 0) {
      costTag = `<span style="font-size:0.7rem;color:#9ca3af;">${costs.join(' · ')}</span>`;
    } else if (isCrisis) {
      costTag = `<span style="font-size:0.7rem;color:#ef4444;">FREE — but at what cost?</span>`;
    } else {
      costTag = `<span style="font-size:0.7rem;color:#6b7280;">FREE — No cost, no reward</span>`;
    }

    // Reward/Effect preview
    let effectText = '';
    if (isCrisis) {
      // Crisis: show credibility effect
      const effectCred = choice.effectCred || 0;
      if (effectCred !== 0) {
        const effectColor = effectCred > 0 ? '#4ade80' : '#ef4444';
        effectText = `<span style="font-size:0.7rem;color:${effectColor};float:right;">Cred: ${effectCred > 0 ? '+' : ''}${effectCred}</span>`;
      }
    } else {
      // Opportunity: show rewards
      const rewards = [];
      if (choice.rewardCred) rewards.push(`+${choice.rewardCred} Cred`);
      if (choice.rewardIntel) rewards.push(`+${choice.rewardIntel} Intel`);
      if (choice.rewardScandal) rewards.push(`+${choice.rewardScandal} Scandal`);
      if (rewards.length > 0) {
        effectText = `<span style="font-size:0.7rem;color:#4ade80;float:right;">${rewards.join(', ')}</span>`;
      }
    }

    const hoverBorderColor = isCrisis ? '#60a5fa' : '#fbbf24';

    choicesHTML += `
    <button id="event-choice-${index}" style="
      padding: 14px 16px;
      text-align: left;
      color: white;
      border-radius: 8px;
      transition: all 0.2s ease;
      background: ${btnBg};
      border: 1px solid ${btnBorder};
      opacity: ${btnOpacity};
      cursor: ${btnCursor};
      font-family: inherit;
    " ${canAfford ? `onclick="resolveEvent(${index}, '${eventData.id}')"` : 'disabled'}
       ${canAfford ? `onmouseenter="this.style.borderColor='${hoverBorderColor}';this.style.transform='translateX(4px)'" onmouseleave="this.style.borderColor='${btnBorder}';this.style.transform='none'"` : ''}>
      <div style="font-weight:600;margin-bottom:4px;">${choice.text}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        ${costTag}
        ${effectText}
      </div>
      ${!canAfford ? '<div style="font-size:0.65rem;color:#ef4444;margin-top:4px;">⚠ Insufficient resources</div>' : ''}
    </button>`;
  });

  document.getElementById('crisis-choices').innerHTML = choicesHTML;

  // Show the modal
  modal.style.display = 'flex';
  console.log(`[engine.js] STEP 130 — ${type} modal displayed: ${eventData.title}`);
}

/**
 * STEP 131: resolveEvent() — Unified event resolution (replaces resolveCrisis)
 * Handles both crisis (deductions + credibility penalty) and opportunity (costs + rewards).
 * Uses activeEventType to branch logic. Strict parseInt on all arithmetic.
 */
function resolveEvent(choiceIndex, eventId) {
  const isCrisis = activeEventType === 'crisis';

  // Look up the event from the correct database
  let eventData;
  if (isCrisis) {
    eventData = oppCrises.find(c => c.id === eventId);
  } else {
    eventData = oppOpportunities.find(o => o.id === eventId);
  }
  if (!eventData) { console.error(`[EVENT] ${activeEventType} not found:`, eventId); return; }

  const choice = eventData.choices[choiceIndex];
  if (!choice) { console.error('[EVENT] Choice not found:', choiceIndex); return; }

  // DEBUG: Log state BEFORE
  console.log(`[EVENT] ${activeEventType.toUpperCase()} BEFORE — Funds: ${playerStats.funds}, Capital: ${playerStats.capital}, Intel: ${oppState.intelPoints}, Cred: ${oppState.credibility}`);

  // ── DEDUCTIONS (both crisis and opportunity can have costs) ──
  playerStats.funds = Math.max(0, parseInt(playerStats.funds) - parseInt(choice.costFunds || 0));
  playerStats.capital = Math.max(0, parseInt(playerStats.capital) - parseInt(choice.costCap || 0));

  // Intel cost (crises may cost intel)
  if (choice.costIntel) {
    oppState.intelPoints = Math.max(0, parseInt(oppState.intelPoints) - parseInt(choice.costIntel));
  }

  // ── EFFECTS / REWARDS ──
  if (isCrisis) {
    // STEP 168: Crisis credibility effect HALVED
    let rawCrisisCred = parseInt(choice.effectCred || 0);
    let halvedCrisisCred = rawCrisisCred > 0 ? Math.ceil(rawCrisisCred / 2) : Math.floor(rawCrisisCred / 2);
    oppState.credibility = Math.max(0, Math.min(100, parseInt(oppState.credibility) + halvedCrisisCred));
  } else {
    // Opportunity: apply rewards — STEP 168: Credibility HALVED
    if (choice.rewardCred) {
      let rawOppCred = parseInt(choice.rewardCred);
      let halvedOppCred = rawOppCred > 0 ? Math.ceil(rawOppCred / 2) : Math.floor(rawOppCred / 2);
      oppState.credibility = Math.max(0, Math.min(100, parseInt(oppState.credibility) + halvedOppCred));
    }
    if (choice.rewardIntel) {
      oppState.intelPoints = Math.min(100, parseInt(oppState.intelPoints) + parseInt(choice.rewardIntel));
    }
    // STEP 131/164: Dynamic Scandal targeting — apply to a random active minister
    if (choice.rewardScandal && choice.rewardScandal > 0) {
      const validTargets = shadowTargets.filter(t => !t.isExposed && !(t.id === PM_TARGET_ID && isPMShielded()));
      if (validTargets.length > 0) {
        const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
        // STEP 164: Dynamic max scandal cap (BUG FIX — was hardcoded at 10)
        const maxScandal = (randomTarget.id === PM_TARGET_ID) ? 50 : 30;
        randomTarget.scandalLevel = Math.min(maxScandal, randomTarget.scandalLevel + choice.rewardScandal);
        showToast(`🔥 Bonus! ${randomTarget.name} took +${choice.rewardScandal} Scandal from the event!`, 'success');
        saveTargets();
      }
    }
  }

  // DEBUG: Log state AFTER
  console.log(`[EVENT] ${activeEventType.toUpperCase()} AFTER  — Funds: ${playerStats.funds}, Capital: ${playerStats.capital}, Intel: ${oppState.intelPoints}, Cred: ${oppState.credibility}`);

  // Close the modal
  document.getElementById('opp-crisis-modal').style.display = 'none';

  // ── DETAILED TOAST (STEP 124 style) ──
  const costParts = [];
  if (choice.costFunds) costParts.push(`-฿${choice.costFunds}M`);
  if (choice.costCap) costParts.push(`-${choice.costCap} Cap`);
  if (choice.costIntel) costParts.push(`-${choice.costIntel} Intel`);
  const costStr = costParts.length > 0 ? costParts.join(', ') : 'Free';

  let rewardStr = '';
  if (isCrisis) {
    const eff = choice.effectCred || 0;
    if (eff > 0) rewardStr = ` | +${eff} Cred`;
    else if (eff < 0) rewardStr = ` | ${eff} Cred`;
  } else {
    const parts = [];
    if (choice.rewardCred) parts.push(`+${choice.rewardCred} Cred`);
    if (choice.rewardIntel) parts.push(`+${choice.rewardIntel} Intel`);
    if (choice.rewardScandal) parts.push(`+${choice.rewardScandal} Scandal`);
    if (parts.length > 0) rewardStr = ` | ${parts.join(', ')}`;
  }

  const toastIcon = isCrisis ? '🚨' : '⭐';
  const toastLabel = isCrisis ? 'Crisis Resolved' : 'Opportunity Seized';
  const toastType = isCrisis && (choice.effectCred || 0) < 0 ? 'error' : (isCrisis ? 'info' : 'success');
  showToast(`${toastIcon} ${toastLabel}: (${costStr}${rewardStr})`, toastType);

  // Log the narrative outcome
  const logIcon = isCrisis ? '🚨' : '⭐';
  const logLabel = isCrisis ? 'CRISIS RESOLVED' : 'OPPORTUNITY SEIZED';
  const logType = isCrisis ? ((choice.effectCred || 0) >= 0 ? 'warning' : 'fail') : 'success';
  logAction(`${logIcon} ${logLabel}: ${choice.log}`, logType);

  // CRUCIAL: Save, update UI, refresh targets and button states
  saveState();
  updateUI();
  updateActionButtonsUI();
  renderTargetMinisters(); // Refresh scandal changes from opportunity

  // Resume the month advancement that was paused by the event
  _eventResolved = true;
  advanceMonth();
}

/** Internal flag to skip event check on the resumed advanceMonth() call */
let _eventResolved = false;

// ──────────────────────────────────────────────────────────────────
// STEP 160: SHADOW CABINET GRAND PANEL
// ──────────────────────────────────────────────────────────────────

/**
 * STEP 160: injectShadowCabinetButton()
 * Adds a Shadow Cabinet button to the action grid.
 */
function injectShadowCabinetButton() {
  if (document.getElementById('btn-open-shadow-panel')) return;
  const actionGrid = document.getElementById('opposition-action-grid') || document.querySelector('.action-grid');
  if (!actionGrid) return;

  actionGrid.insertAdjacentHTML('beforeend', `
  <button id="btn-open-shadow-panel" class="action-btn" style="
    background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
    border: 1px solid #34d399;
    border-radius: 8px;
    padding: 12px 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  " onclick="openShadowCabinetModal()"
     onmouseenter="this.style.borderColor='#6ee7b7';this.style.boxShadow='0 4px 15px rgba(52,211,153,0.2)'"
     onmouseleave="this.style.borderColor='#34d399';this.style.boxShadow='none'">
    <div style="font-size:1.4rem;">👤</div>
    <div style="text-align:center;">
      <div style="margin:0;font-size:0.85rem;font-weight:700;color:#6ee7b7;">Shadow Cabinet</div>
      <div style="margin:2px 0 0;font-size:0.6rem;color:#a7f3d0;">จัดตั้งรัฐมนตรีเงา</div>
    </div>
  </button>`);

  console.log('[engine.js] STEP 160 — Shadow Cabinet button injected.');
}

/**
 * STEP 160: openShadowCabinetModal()
 * Opens the Grand Shadow Cabinet management modal.
 * Lists all non-neutralized targets with appoint/appointed status.
 */
function openShadowCabinetModal() {
  // Inject modal shell if not already present
  if (!document.getElementById('shadow-panel-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
    <div id="shadow-panel-modal" class="modal-overlay" style="display:none;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;">
      <div class="modal-content" style="background:#111827;border:2px solid #34d399;border-radius:12px;width:600px;max-width:90vw;padding:25px;color:white;box-shadow:0 10px 25px rgba(52,211,153,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #374151;padding-bottom:15px;margin-bottom:20px;">
          <h3 style="margin:0;color:#34d399;font-size:1.3rem;">👤 SHADOW CABINET COMMAND</h3>
          <button onclick="document.getElementById('shadow-panel-modal').style.display='none'" style="background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>
        </div>
        <p style="font-size:0.85rem;color:#9ca3af;margin-bottom:20px;">Appointing a Shadow Minister costs <strong style="color:#fbbf24;">3 AP</strong>, <strong style="color:#f87171;">฿400M</strong>, and <strong style="color:#60a5fa;">50 Capital</strong>. They generate passive Intel and boost Scandal damage.</p>
        <div id="shadow-panel-list" style="display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;padding-right:10px;"></div>
      </div>
    </div>`);
  }

  // Count active shadows for header
  const activeShadows = shadowTargets.filter(t => t.hasShadow && !t.isExposed).length;

  let listHTML = '';
  shadowTargets.forEach(target => {
    // Skip neutralized targets
    if (target.isExposed) return;

    // STEP 163: Dynamic cost — PM costs 100 Capital, Ministers cost 50
    const costCap = (target.id === PM_TARGET_ID) ? 100 : 50;
    const canAfford = (playerStats.funds >= 400) && (playerStats.capital >= costCap) && (oppState.ap >= 3);
    let btnHTML = '';

    if (target.hasShadow) {
      btnHTML = `<span style="color:#34d399;font-weight:bold;padding:8px 15px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);border-radius:6px;font-size:0.8rem;">✓ Appointed</span>`;
    } else {
      btnHTML = `<button style="padding:8px 15px;border-radius:6px;border:none;font-weight:bold;font-size:0.8rem;cursor:${canAfford ? 'pointer' : 'not-allowed'};background:${canAfford ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : '#374151'};color:${canAfford ? '#000' : '#6b7280'};transition:0.2s;" ${canAfford ? `onclick="actionAppointShadowFromModal('${target.id}')"` : 'disabled'}>Appoint (${costCap} Cap)</button>`;
    }

    listHTML += `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#1f2937;border:1px solid ${target.hasShadow ? 'rgba(52,211,153,0.3)' : '#374151'};border-radius:8px;">
      <div>
        <h4 style="margin:0;font-size:0.95rem;color:${target.hasShadow ? '#e5e7eb' : '#9ca3af'};">${target.name}</h4>
        <span style="font-size:0.7rem;color:#6b7280;">${target.ministry}</span>
      </div>
      ${btnHTML}
    </div>`;
  });

  document.getElementById('shadow-panel-list').innerHTML = listHTML;
  document.getElementById('shadow-panel-modal').style.display = 'flex';
}

/**
 * STEP 160/163: actionAppointShadowFromModal(targetId)
 * Hardcore-cost appointment from the Grand Panel.
 * Cost: 3 AP, ฿400M, 50 Capital (100 for PM)
 * Reward: +5 Credibility
 */
function actionAppointShadowFromModal(targetId) {
  const target = shadowTargets.find(t => t.id === targetId);
  if (!target || target.hasShadow || target.isExposed) return;

  // STEP 163: Dynamic capital cost — PM costs 100, Ministers cost 50
  const costCap = (target.id === PM_TARGET_ID) ? 100 : 50;

  if (oppState.ap < 3 || playerStats.funds < 400 || playerStats.capital < costCap) {
    showToast(`⚠️ Insufficient resources! Need 3 AP, ฿400M, ${costCap} Capital.`, 'error');
    return;
  }

  // Deduct hardcore costs
  oppState.ap -= 3;
  playerStats.funds = Math.max(0, playerStats.funds - 400);
  playerStats.capital = Math.max(0, playerStats.capital - costCap);

  // Apply
  target.hasShadow = true;
  oppState.credibility = Math.min(100, parseInt(oppState.credibility) + 2); // STEP 168: Halved from 5

  const activeShadows = shadowTargets.filter(t => t.hasShadow && !t.isExposed).length;

  showToast(`👤 Appointed Shadow Minister for ${target.ministry}!`, 'success');
  logAction(`👤 SHADOW CABINET: Massive investment to shadow ${target.name} (${target.ministry}). Cost: ฿400M + ${costCap} Cap. Credibility +2. Active: ${activeShadows}/8.`, 'success');

  // Milestone toasts
  if (activeShadows === 4) {
    setTimeout(() => showToast('👑 Government-in-Waiting! Passive Credibility bonus unlocked!', 'success'), 1200);
  } else if (activeShadows === 8) {
    setTimeout(() => showToast('🏛️ FULL SHADOW CABINET! Maximum passive generation!', 'success'), 1200);
  }

  // Persist & refresh
  saveState();
  saveTargets();
  updateUI();
  updateAPDisplay();
  updateActionButtonsUI();
  renderTargetMinisters();

  // Refresh the modal to show updated state
  openShadowCabinetModal();
}

// ──────────────────────────────────────────────────────────────────
// STEP 208: Campaign Loop Transition — Wipe old saves before redirect
// ──────────────────────────────────────────────────────────────────
window.startNewCampaignLoop = function (nextYear) {
  // 1. Set the new election year
  localStorage.setItem('tps_current_election_year', String(nextYear));

  // 2. WIPE OLD CAMPAIGN SAVES (Forces a fresh Day 1)
  localStorage.removeItem('tps_campaign_save');
  localStorage.removeItem('tps_campaign_day');
  localStorage.removeItem('tps_campaign_week');
  localStorage.removeItem('tps_campaign_ap');
  localStorage.removeItem('returnFromParliament');

  // 3. Set the trigger flag for the Campaign module to apply legacy buffs
  localStorage.setItem('tps_apply_legacy', 'true');

  // 4. Redirect to Campaign
  window.location.href = '../campaign/index.html';
};

// ──────────────────────────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────────────────────────
window.onload = initOpposition;
