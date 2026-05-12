// ============================================================
// THAILAND POLITICAL SIMULATION (TPS) — main.js
// UI Binding: DOM manipulation, event listeners, game loop
// ============================================================

// ─── DOM ELEMENT REFERENCES ─────────────────────────────────
const DOM = {
  // Screens
  startScreen: document.getElementById("start-screen"),
  gameScreen: document.getElementById("game-screen"),
  gameoverScreen: document.getElementById("gameover-screen"),

  // Start screen
  btnNewGame: document.getElementById("btn-new-game"),
  btnLoadGame: document.getElementById("btn-load-game"),

  // Header
  turnNumber: document.getElementById("turn-number"),
  turnDate: document.getElementById("turn-date"),
  btnSave: document.getElementById("btn-save"),
  btnMenu: document.getElementById("btn-menu"),

  // Status bar
  valPopularity: document.getElementById("val-popularity"),
  valBudget: document.getElementById("val-budget"),
  valGrowth: document.getElementById("val-growth"),
  valUnrest: document.getElementById("val-unrest"),
  valMilitary: document.getElementById("val-military"),
  valCoalition: document.getElementById("val-coalition"),
  barPopularity: document.getElementById("bar-popularity"),
  barBudget: document.getElementById("bar-budget"),
  barGrowth: document.getElementById("bar-growth"),
  barUnrest: document.getElementById("bar-unrest"),
  barMilitary: document.getElementById("bar-military"),
  barCoalition: document.getElementById("bar-coalition"),
  statPopularity: document.getElementById("stat-popularity"),
  statBudget: document.getElementById("stat-budget"),
  statUnrest: document.getElementById("stat-unrest"),
  statMilitary: document.getElementById("stat-military"),
  coalitionSeatsBadge: document.getElementById("coalition-seats-badge"),

  // Parliament
  parliamentChart: document.getElementById("parliament-chart"),
  partyList: document.getElementById("party-list"),

  // Main content panels
  warningTicker: document.getElementById("warning-ticker"),
  warningText: document.getElementById("warning-text"),
  crisisPanel: document.getElementById("crisis-panel"),
  crisisTurn: document.getElementById("crisis-turn"),
  crisisTitle: document.getElementById("crisis-title"),
  crisisDescription: document.getElementById("crisis-description"),
  crisisChoices: document.getElementById("crisis-choices"),
  outcomePanel: document.getElementById("outcome-panel"),
  outcomeText: document.getElementById("outcome-text"),
  outcomeEffects: document.getElementById("outcome-effects"),
  btnEndTurn: document.getElementById("btn-end-turn"),
  reportPanel: document.getElementById("report-panel"),
  reportTurn: document.getElementById("report-turn"),
  reportStats: document.getElementById("report-stats"),
  reportLaws: document.getElementById("report-laws"),
  reportWarnings: document.getElementById("report-warnings"),
  btnNextMonth: document.getElementById("btn-next-month"),
  idlePanel: document.getElementById("idle-panel"),
  btnStartMonth: document.getElementById("btn-start-month"),
  votePanel: document.getElementById("vote-panel"),
  voteResultBadge: document.getElementById("vote-result-badge"),
  voteLawName: document.getElementById("vote-law-name"),
  tallyYes: document.getElementById("tally-yes"),
  tallyNo: document.getElementById("tally-no"),
  tallyYesLabel: document.getElementById("tally-yes-label"),
  tallyNoLabel: document.getElementById("tally-no-label"),
  votePartyBreakdown: document.getElementById("vote-party-breakdown"),
  voteMessage: document.getElementById("vote-message"),
  btnCloseVote: document.getElementById("btn-close-vote"),

  // Laws
  lawsList: document.getElementById("laws-list"),

  // Event log
  eventLog: document.getElementById("event-log"),

  // Game over
  gameoverIcon: document.getElementById("gameover-icon"),
  gameoverTitle: document.getElementById("gameover-title"),
  gameoverReason: document.getElementById("gameover-reason"),
  victoryScore: document.getElementById("victory-score"),
  victoryGrade: document.getElementById("victory-grade"),
  victoryTitleText: document.getElementById("victory-title-text"),
  scoreBreakdown: document.getElementById("score-breakdown"),
  goMonths: document.getElementById("go-months"),
  goLaws: document.getElementById("go-laws"),
  goApproval: document.getElementById("go-approval"),
  btnRestart: document.getElementById("btn-restart"),

  // Modal
  modalOverlay: document.getElementById("modal-overlay"),
  modalBox: document.getElementById("modal-box"),
  modalContent: document.getElementById("modal-content"),
  modalClose: document.getElementById("modal-close"),

  // Toast
  toastContainer: document.getElementById("toast-container"),

  // Cabinet Room (v1.0.2)
  cabinetOverlay: document.getElementById("cabinet-modal-overlay"),
  cabinetSlotsA: document.getElementById("cabinet-slots-a"),
  cabinetSlotsB: document.getElementById("cabinet-slots-b"),
  cabinetSlotsC: document.getElementById("cabinet-slots-c"),
  cabinetPartyList: document.getElementById("cabinet-party-list"),
  cabinetSatisfaction: document.getElementById("cabinet-satisfaction-preview"),
  cabinetUnassignedCount: document.getElementById("cabinet-unassigned-count"),
  btnCabinetAuto: document.getElementById("btn-cabinet-auto"),
  btnCabinetReset: document.getElementById("btn-cabinet-reset"),
  btnCabinetForm: document.getElementById("btn-cabinet-form"),

  // Diplomacy (v1.0.2)
  diplomacyContacts: document.getElementById("diplomacy-contacts"),

  // PM Actions (v1.0.2 Step 9)
  powerDecayIndicator: document.getElementById("power-decay-indicator"),
  decayPhaseIcon: document.getElementById("decay-phase-icon"),
  decayPhaseName: document.getElementById("decay-phase-name"),
  decayPhaseMult: document.getElementById("decay-phase-mult"),
  pmActionsGrid: document.getElementById("pm-actions-grid"),

  // STEP 34: Pre-Month Lock targets
  pmActionsPanel: document.getElementById("pm-actions-panel"),
  legislationSection: document.getElementById("legislation-section"),
  idleDescription: document.getElementById("idle-description"),

  // STEP 215: Ministry Control
  ministryControlPanel: document.getElementById("ministry-control-panel"),
  ministryControlContainer: document.getElementById("ministry-control-container")
};

// ─── STEP 34: MONTH STATE FLAG ──────────────────────────────
let isMonthActive = false;

// ─── STEP 38: ACTIVE PANEL STATE TRACKER ────────────────────
// Tracks which panel is currently showing so we can restore after interruption.
// Values: 'idle' | 'crisis' | 'outcome' | 'report' | 'vote'
let activePanelState = 'idle';

// Cache the unresolved crisis event data for re-rendering
let cachedCrisisEvent = null;

// ─── SCREEN MANAGEMENT ──────────────────────────────────────

function showScreen(screenId) {
  [DOM.startScreen, DOM.gameScreen, DOM.gameoverScreen].forEach(s => {
    s.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

// ─── MODAL ──────────────────────────────────────────────────

function showModal(htmlContent) {
  DOM.modalContent.innerHTML = htmlContent;
  DOM.modalOverlay.style.display = "flex";
}

function hideModal() {
  DOM.modalOverlay.style.display = "none";
  DOM.modalContent.innerHTML = "";
}

// ─── UPDATE STATUS BAR ──────────────────────────────────────

function updateStatusBar() {
  // Popularity
  DOM.valPopularity.textContent = `${Math.round(gameState.popularity)}%`;
  DOM.barPopularity.style.width = `${gameState.popularity}%`;

  // Budget
  const budgetDisplay = gameState.budget >= 0
    ? `฿${gameState.budget.toLocaleString()}B`
    : `-฿${Math.abs(gameState.budget).toLocaleString()}B`;
  DOM.valBudget.textContent = budgetDisplay;
  DOM.barBudget.style.width = `${clamp(gameState.budget / 20, 0, 100)}%`;

  // Growth
  DOM.valGrowth.textContent = `${gameState.growth}%`;
  DOM.barGrowth.style.width = `${clamp(gameState.growth * 10, 0, 100)}%`;

  // Unrest
  DOM.valUnrest.textContent = `${Math.round(gameState.unrest)}%`;
  DOM.barUnrest.style.width = `${gameState.unrest}%`;

  // Military Patience
  DOM.valMilitary.textContent = Math.round(gameState.militaryPatience);
  DOM.barMilitary.style.width = `${gameState.militaryPatience}%`;

  // Coalition Stability
  DOM.valCoalition.textContent = `${Math.round(gameState.coalitionStability)}%`;
  DOM.barCoalition.style.width = `${gameState.coalitionStability}%`;

  // Warning classes for unrest
  DOM.statUnrest.classList.remove("warning", "danger");
  if (gameState.unrest >= 70) {
    DOM.statUnrest.classList.add("danger");
  } else if (gameState.unrest >= 50) {
    DOM.statUnrest.classList.add("warning");
  }

  // Warning for budget
  DOM.statBudget.classList.remove("warning", "danger");
  if (gameState.budget < 100) {
    DOM.statBudget.classList.add("danger");
  } else if (gameState.budget < 300) {
    DOM.statBudget.classList.add("warning");
  }

  // Military patience reveal — becomes visible once it drops below 50
  if (gameState.militaryPatience < 50) {
    DOM.statMilitary.classList.remove("stat-hidden");
  } else {
    DOM.statMilitary.classList.add("stat-hidden");
  }

  // Update coalition seats
  const coalSeats = getCoalitionSeats();
  DOM.coalitionSeatsBadge.textContent = `${coalSeats} / ${PARLIAMENT_TOTAL_SEATS}`;
}

// ─── UPDATE HEADER ──────────────────────────────────────────

function updateHeader() {
  DOM.turnNumber.textContent = gameState.turn;
  DOM.turnDate.textContent = getTurnLabel(gameState.turn);
}

// ─── RENDER PARLIAMENT ──────────────────────────────────────

function renderParliament() {
  // Seat chart (proportional bar)
  DOM.parliamentChart.innerHTML = "";
  parties.forEach(party => {
    const pct = (party.seats / PARLIAMENT_TOTAL_SEATS) * 100;
    const seg = document.createElement("div");
    seg.className = "parliament-segment";
    seg.style.width = `${pct}%`;
    seg.style.backgroundColor = party.color;
    if (!party.inCoalition) {
      seg.style.opacity = "0.5";
      seg.style.backgroundImage = "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 6px)";
    }
    const tooltip = document.createElement("span");
    tooltip.className = "seg-tooltip";
    tooltip.textContent = `${party.shortName}: ${party.seats} seats`;
    seg.appendChild(tooltip);
    DOM.parliamentChart.appendChild(seg);
  });

  // Party cards
  DOM.partyList.innerHTML = "";
  parties.forEach(party => {
    const card = document.createElement("div");
    card.className = "party-card";

    const relationClass = party.relation > 10
      ? "relation-positive"
      : party.relation < -10
        ? "relation-negative"
        : "relation-neutral";

    const relationSign = party.relation > 0 ? "+" : "";

    card.innerHTML = `
      <div class="party-dot" style="background:${party.color}"></div>
      <div class="party-card-info">
        <div class="party-card-name">${party.name}</div>
        <div class="party-card-meta">
          ${party.inCoalition ? '<span class="party-coalition-badge">Coalition</span>' : '<span style="color:var(--text-muted);font-size:0.65rem">Opposition</span>'}
          · ${party.ideology}
        </div>
      </div>
      <div class="party-card-seats">${party.seats}</div>
      <div class="party-card-relation ${relationClass}">${relationSign}${party.relation}</div>
    `;

    DOM.partyList.appendChild(card);
  });
}

// ─── RENDER LAWS LIST ───────────────────────────────────────

function renderLaws() {
  DOM.lawsList.innerHTML = "";
  laws.forEach(law => {
    const card = document.createElement("div");
    card.className = `law-card ${law.passed ? "passed" : ""}`;
    card.id = `law-${law.id}`;

    card.innerHTML = `
      <div class="law-card-header">
        <span class="law-card-icon">${law.icon}</span>
        <span class="law-card-name">${law.name}</span>
        <span class="law-status ${law.passed ? "active" : "available"}">${law.passed ? "Active" : "Propose"}</span>
      </div>
      <div class="law-card-desc">${law.description}</div>
    `;

    card.addEventListener("click", () => handleLawClick(law.id));
    DOM.lawsList.appendChild(card);
  });
}

// ─── HANDLE LAW CLICK ───────────────────────────────────────

function handleLawClick(lawId) {
  const law = laws.find(l => l.id === lawId);
  if (!law) return;

  // Build effect preview
  const effectsHtml = Object.entries(law.effects)
    .map(([key, val]) => {
      const sign = val > 0 ? "+" : "";
      const cls = val > 0 ? "effect-positive" : "effect-negative";
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return `<span class="effect-chip ${cls}">${label}: ${sign}${val}</span>`;
    })
    .join(" ");

  const monthlyHtml = law.monthlyEffects
    ? Object.entries(law.monthlyEffects)
      .map(([key, val]) => {
        const sign = val > 0 ? "+" : "";
        const cls = val > 0 ? "effect-positive" : "effect-negative";
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return `<span class="effect-chip ${cls}">${label}: ${sign}${val}/mo</span>`;
      })
      .join(" ")
    : "";

  const action = law.passed ? "Repeal" : "Propose";
  const actionClass = law.passed ? "btn-danger" : "btn-primary";

  const html = `
    <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">${law.icon} ${law.name}</h3>
    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem; line-height:1.6;">${law.description}</p>
    <div style="margin-bottom:0.5rem;">
      <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.3rem; font-weight:600;">Immediate Effects</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">${effectsHtml}</div>
    </div>
    ${monthlyHtml ? `
    <div style="margin-bottom:1rem;">
      <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.3rem; font-weight:600;">Monthly Effects</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">${monthlyHtml}</div>
    </div>` : ""}
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn ${actionClass} btn-md" id="modal-law-action">${action} in Parliament</button>
      <button class="btn btn-secondary btn-md" id="modal-law-cancel">Cancel</button>
    </div>
  `;

  showModal(html);

  document.getElementById("modal-law-action").addEventListener("click", () => {
    hideModal();
    if (law.passed) {
      executeRepeal(lawId);
    } else {
      executeVote(lawId);
    }
  });
  document.getElementById("modal-law-cancel").addEventListener("click", hideModal);
}

// ─── EXECUTE PARLIAMENTARY VOTE ─────────────────────────────

function executeVote(lawId) {
  const result = proposeLaw(lawId);
  if (!result) return;

  if (result.alreadyPassed) {
    showToast(result.message, "warning");
    return;
  }

  // ── STEP 44: Intercept gridlock — redirect to Amendment Phase ──
  if (result.isGridlock && typeof showAmendmentPhase === 'function') {
    hideModal(); // Close the law proposal modal first
    showAmendmentPhase(result);
    return; // Do NOT show the standard vote result screen
  }

  showVoteResult(result);
  updateStatusBar();
  renderParliament();
  renderLaws();
}

function executeRepeal(lawId) {
  const result = repealLaw(lawId);
  if (!result) return;

  showVoteResult(result);
  updateStatusBar();
  renderParliament();
  renderLaws();
}

function showVoteResult(result) {
  // STEP 38: Remember what panel was active before the vote
  // so we can restore it when the vote panel closes
  const preVoteState = activePanelState;
  activePanelState = 'vote';
  // Store pre-vote state on the DOM for the close handler
  DOM.votePanel.dataset.preVoteState = preVoteState;

  // Hide other panels
  hideAllMainPanels();
  DOM.votePanel.style.display = "block";

  // Badge
  DOM.voteResultBadge.className = `vote-badge ${result.passed ? "passed" : "rejected"}`;
  DOM.voteResultBadge.textContent = result.passed ? "✅ PASSED" : "❌ REJECTED";

  // Law name
  DOM.voteLawName.textContent = result.lawName || "";

  // Tally bar
  if (result.yesVotes !== undefined) {
    const total = result.yesVotes + result.noVotes;
    const yesPct = (result.yesVotes / total) * 100;
    const noPct = (result.noVotes / total) * 100;
    DOM.tallyYes.style.width = `${yesPct}%`;
    DOM.tallyYes.textContent = result.yesVotes;
    DOM.tallyNo.style.width = `${noPct}%`;
    DOM.tallyNo.textContent = result.noVotes;
    DOM.tallyYesLabel.textContent = `${result.yesVotes} Yes`;
    DOM.tallyNoLabel.textContent = `${result.noVotes} No`;
  }

  // Party breakdown
  DOM.votePartyBreakdown.innerHTML = "";
  if (result.partyVotes) {
    result.partyVotes.forEach(pv => {
      const party = getPartyById(pv.partyId);
      const row = document.createElement("div");
      row.className = "vote-party-row";
      row.title = pv.voteReason || '';

      // STEP 43: Show loyalty-based vote reason for coalition partners
      const reasonTag = (pv.voteReason && pv.inCoalition)
        ? `<span style="font-size:0.55rem;color:var(--text-muted);margin-left:0.3rem;font-style:italic">${pv.voteReason}</span>`
        : '';

      row.innerHTML = `
        <div class="vote-party-dot" style="background:${party ? party.color : '#666'}"></div>
        <span class="vote-party-name">${pv.shortName || pv.partyName}${reasonTag}</span>
        <span class="vote-party-seats">${pv.seats} seats</span>
        <span class="vote-party-verdict ${pv.votedYes ? "verdict-yes" : "verdict-no"}">${pv.votedYes ? "YES" : "NO"}</span>
      `;
      DOM.votePartyBreakdown.appendChild(row);
    });
  }

  // Message
  DOM.voteMessage.textContent = result.message;
  DOM.voteMessage.style.color = result.passed ? "var(--green-400)" : "var(--red-400)";
}

// ─── HIDE ALL MAIN PANELS ───────────────────────────────────

function hideAllMainPanels() {
  DOM.crisisPanel.style.display = "none";
  DOM.outcomePanel.style.display = "none";
  DOM.reportPanel.style.display = "none";
  DOM.idlePanel.style.display = "none";
  DOM.votePanel.style.display = "none";
  DOM.warningTicker.style.display = "none";
}

// ─── SHOW CRISIS EVENT ──────────────────────────────────────

function showCrisisEvent() {
  const event = triggerCrisisEvent();
  if (!event) return;

  // STEP 38: Cache crisis event for restoration after interruption
  cachedCrisisEvent = event;
  activePanelState = 'crisis';

  _renderCrisisPanel(event);
}

/**
 * _renderCrisisPanel(event) — STEP 38: Renders a crisis event to the DOM.
 * Separated from showCrisisEvent() so it can be called for initial render
 * AND for restoring an interrupted crisis.
 */
function _renderCrisisPanel(event) {
  hideAllMainPanels();
  DOM.crisisPanel.style.display = "block";

  // STEP 47: Bilingual rendering — pick correct language strings
  const currentLang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'EN';
  const isTH = currentLang === 'TH';

  const eventTitle = isTH ? (event.titleTH || event.title) : (event.titleEN || event.title);
  const eventDesc = isTH ? (event.descTH || event.description) : (event.descEN || event.description);

  DOM.crisisTurn.textContent = getTurnLabel(gameState.turn);
  DOM.crisisTitle.textContent = eventTitle;
  DOM.crisisDescription.textContent = eventDesc;

  // Render choice buttons with bilingual labels
  DOM.crisisChoices.innerHTML = "";
  event.choices.forEach((choice, index) => {
    const buttonText = isTH ? (choice.labelTH || choice.label) : (choice.labelEN || choice.label);
    const btn = document.createElement("button");
    btn.className = "btn btn-choice";
    btn.textContent = buttonText;
    btn.addEventListener("click", () => handleCrisisChoice(index));
    DOM.crisisChoices.appendChild(btn);
  });
}

// ─── HANDLE CRISIS CHOICE ───────────────────────────────────

function handleCrisisChoice(choiceIndex) {
  const result = resolveCrisisChoice(choiceIndex);
  if (!result) return;

  // STEP 38: Crisis resolved — clear cached event
  cachedCrisisEvent = null;
  activePanelState = 'outcome';

  hideAllMainPanels();
  DOM.outcomePanel.style.display = "block";

  // Outcome text
  DOM.outcomeText.textContent = result.outcome;

  // Effect chips (STEP 48: bilingual stat labels)
  DOM.outcomeEffects.innerHTML = "";

  if (result.effects) {
    const currentLang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'EN';
    const isTH = currentLang === 'TH';
    const labelMap = isTH ? {
      popularity: "คะแนนนิยม",
      budget: "งบประมาณ",
      unrest: "ความไม่สงบ",
      growth: "เศรษฐกิจ",
      militaryPatience: "กองทัพ",
      coalitionStability: "เสถียรภาพ"
    } : {
      popularity: "Approval",
      budget: "Budget",
      unrest: "Unrest",
      growth: "Growth",
      militaryPatience: "Military",
      coalitionStability: "Coalition"
    };

    Object.entries(result.effects).forEach(([key, val]) => {
      const sign = val > 0 ? "+" : "";
      // For unrest, positive is bad; for others positive is good
      const isGood = key === "unrest" || key === "militaryPatience"
        ? val < 0
        : (key === "budget" ? val > 0 : val > 0);
      // Special: militaryPatience going up is good
      const goodCheck = key === "militaryPatience" ? val > 0 : isGood;
      const cls = goodCheck ? "effect-positive" : "effect-negative";
      const label = labelMap[key] || key;
      const chip = document.createElement("span");
      chip.className = `effect-chip ${cls}`;
      chip.textContent = `${label}: ${sign}${val}`;
      DOM.outcomeEffects.appendChild(chip);
    });
  }

  if (result.partyEffects) {
    Object.entries(result.partyEffects).forEach(([partyId, val]) => {
      const party = getPartyById(partyId);
      if (!party) return;
      const sign = val > 0 ? "+" : "";
      const cls = val > 0 ? "effect-positive" : "effect-negative";
      const chip = document.createElement("span");
      chip.className = `effect-chip ${cls}`;
      chip.textContent = `${party.shortName}: ${sign}${val}`;
      DOM.outcomeEffects.appendChild(chip);
    });
  }

  // Update all UI
  updateStatusBar();
  updateHeader();
  renderParliament();
  updateEventLog();
}

// ─── HANDLE END TURN ────────────────────────────────────────

function handleEndTurn() {
  const report = endTurn();

  // Check game over
  if (report.gameOver) {
    showGameOver(report.gameOverReason);
    return;
  }

  // Show monthly report
  hideAllMainPanels();
  DOM.reportPanel.style.display = "block";
  activePanelState = 'report'; // STEP 38

  DOM.reportTurn.textContent = getTurnLabel(gameState.turn - 1);

  // Stat changes
  DOM.reportStats.innerHTML = "";
  const statLabels = {
    popularity: { label: "Approval Change", icon: "📊" },
    budget: { label: "Budget Change", icon: "💰" },
    unrest: { label: "Unrest Change", icon: "⚠️" },
    growth: { label: "Growth Impact", icon: "📈" }
  };

  Object.entries(report.statChanges).forEach(([key, val]) => {
    if (val === 0 || !statLabels[key]) return;
    const sign = val > 0 ? "+" : "";
    const isGood = key === "unrest" ? val < 0 : val > 0;
    const line = document.createElement("div");
    line.className = "report-stat-line";
    line.innerHTML = `
      <span class="report-stat-label">${statLabels[key].icon} ${statLabels[key].label}</span>
      <span class="report-stat-value ${isGood ? "positive" : "negative"}">${sign}${val}</span>
    `;
    DOM.reportStats.appendChild(line);
  });

  // Law effects
  DOM.reportLaws.innerHTML = "";
  if (report.lawEffects.length > 0) {
    const header = document.createElement("div");
    header.style.cssText = "font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; margin-bottom:0.3rem;";
    header.textContent = "Active Law Effects";
    DOM.reportLaws.appendChild(header);
    report.lawEffects.forEach(le => {
      const line = document.createElement("div");
      line.className = "report-law-line";
      line.textContent = `${le.icon} ${le.lawName}`;
      DOM.reportLaws.appendChild(line);
    });
  }

  // Warnings
  DOM.reportWarnings.innerHTML = "";
  report.warnings.forEach(w => {
    const line = document.createElement("div");
    line.className = "report-warning-line";
    line.textContent = w;
    DOM.reportWarnings.appendChild(line);
  });

  // ── STEP 43: Loyalty crisis section in monthly report ──
  if (report.loyaltyCrises && report.loyaltyCrises.length > 0) {
    const crisisSection = document.createElement("div");
    crisisSection.style.cssText = `
      margin-top: 0.75rem; padding: 0.75rem; border-radius: 8px;
      background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25);
    `;

    const crisisTitle = document.createElement("div");
    crisisTitle.style.cssText = "font-weight:800; color:var(--red-400); font-size:0.85rem; margin-bottom:0.4rem;";
    crisisTitle.textContent = "🚨 COALITION CRISIS — Partner Threatens Withdrawal";
    crisisSection.appendChild(crisisTitle);

    report.loyaltyCrises.forEach(crisis => {
      const crisisLine = document.createElement("div");
      crisisLine.style.cssText = `
        display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0;
        font-size:0.78rem; color:var(--text-secondary);
      `;
      crisisLine.innerHTML = `
        <span style="width:4px;height:20px;border-radius:2px;background:${crisis.color};flex-shrink:0"></span>
        <strong style="color:var(--text-primary)">${crisis.partyName}</strong>
        <span style="color:var(--red-400);font-weight:700">${crisis.loyalty}% loyalty</span>
        <span style="color:var(--text-muted)">(${crisis.seats} seats at risk)</span>
      `;
      crisisSection.appendChild(crisisLine);
    });

    // War Room button
    const warRoomBtn = document.createElement("button");
    warRoomBtn.className = "btn btn-primary btn-sm";
    warRoomBtn.style.cssText = "margin-top:0.5rem; font-size:0.72rem;";
    warRoomBtn.innerHTML = "⚔️ Open War Room";
    warRoomBtn.addEventListener("click", () => {
      if (typeof openWarRoom === 'function') openWarRoom();
    });
    crisisSection.appendChild(warRoomBtn);

    DOM.reportWarnings.appendChild(crisisSection);
  }

  // Update all UI
  updateStatusBar();
  updateHeader();
  renderParliament();
  renderLaws();
  renderDiplomacyContacts(); // v1.0.2

  // v1.0.2: Tick diplomacy cooldowns
  if (typeof tickDiplomacyCooldowns === 'function') {
    tickDiplomacyCooldowns();
  }
  // v1.0.2: Tick PM action cooldowns
  if (typeof tickPMActionCooldowns === 'function') {
    tickPMActionCooldowns();
  }
  // STEP 215: Reset ministry per-turn flags for the new month
  if (typeof resetMinistryTurns === 'function') {
    resetMinistryTurns();
  }

  // STEP 40: Update phase badge immediately when the month advances
  updatePowerDecayIndicator();
  renderPMActions();
  renderMinistryControl(); // STEP 215
}

// ─── HANDLE NEXT MONTH ─────────────────────────────────────

function handleNextMonth() {
  // STEP 34: Re-lock dashboard for the new month before showing crisis
  relockMonth();
  // Then immediately unlock + trigger crisis (player sees the unlock briefly)
  unlockMonth();
  showCrisisEvent();

  // STEP 40: Ensure phase badge reflects the new month immediately
  updatePowerDecayIndicator();
}

// ─── HANDLE START MONTH ─────────────────────────────────────

function handleStartMonth() {
  // STEP 34: Unlock the dashboard before triggering the crisis
  unlockMonth();
  showCrisisEvent();
}


// ─── STEP 34: MONTH STATE TRANSITION ────────────────────────

/**
 * unlockMonth() — Transitions the dashboard from "Pre-Month" to "Active Month".
 * Removes lock classes, plays unlock animation, updates idle text,
 * hides the Begin button, and reveals the Honeymoon badge.
 */
function unlockMonth() {
  isMonthActive = true;
  console.log('[main.js] STEP 34 — Month unlocked.');

  // 1. Unlock PM Actions panel
  if (DOM.pmActionsPanel) {
    DOM.pmActionsPanel.classList.remove('locked-pre-month');
    DOM.pmActionsPanel.classList.add('month-unlocked');
  }

  // 1B. STEP 215: Unlock Ministry Control panel
  if (DOM.ministryControlPanel) {
    DOM.ministryControlPanel.classList.remove('locked-pre-month');
    DOM.ministryControlPanel.classList.add('month-unlocked');
  }

  // 2. Unlock Legislation section
  if (DOM.legislationSection) {
    DOM.legislationSection.classList.remove('locked-pre-month');
    DOM.legislationSection.classList.add('month-unlocked');
  }

  // 3. Reveal Power Decay / Honeymoon badge
  if (DOM.powerDecayIndicator) {
    DOM.powerDecayIndicator.classList.remove('hidden-pre-month');
  }

  // 4. Hide the "Begin This Month" button
  if (DOM.btnStartMonth) {
    DOM.btnStartMonth.style.display = 'none';
  }

  // 5. Idle description — no longer modified here.
  // The crisis panel takes over immediately when the month begins,
  // so the "Month is Active" badge is unnecessary and caused bugs
  // with the propose-bills system.

  // STEP 40: Sync phase badge data when it becomes visible
  updatePowerDecayIndicator();
}

/**
 * relockMonth() — Transitions the dashboard back to "Pre-Month" state.
 * Re-applies lock classes, shows the Begin button, resets idle text.
 * Called when returning to idle after the monthly report.
 */
function relockMonth() {
  isMonthActive = false;
  console.log('[main.js] STEP 34 — Month re-locked for next turn.');

  // 1. Re-lock PM Actions panel
  if (DOM.pmActionsPanel) {
    DOM.pmActionsPanel.classList.remove('month-unlocked');
    DOM.pmActionsPanel.classList.add('locked-pre-month');
  }

  // 1B. STEP 215: Re-lock Ministry Control panel
  if (DOM.ministryControlPanel) {
    DOM.ministryControlPanel.classList.remove('month-unlocked');
    DOM.ministryControlPanel.classList.add('locked-pre-month');
  }

  // 2. Re-lock Legislation section
  if (DOM.legislationSection) {
    DOM.legislationSection.classList.remove('month-unlocked');
    DOM.legislationSection.classList.add('locked-pre-month');
  }

  // 3. Hide Power Decay badge again
  if (DOM.powerDecayIndicator) {
    DOM.powerDecayIndicator.classList.add('hidden-pre-month');
  }

  // 4. Show the "Begin This Month" button again
  if (DOM.btnStartMonth) {
    DOM.btnStartMonth.style.display = '';
  }

  // 5. Reset idle description text
  if (DOM.idleDescription) {
    DOM.idleDescription.textContent = 'Your coalition awaits your leadership, Prime Minister.';
  }
}

// ─── PM ACTIONS UI CONTROLLER (v1.0.2 — Step 9) ───────────────

/**
 * updatePowerDecayIndicator() — Updates the phase badge in the idle panel.
 */
function updatePowerDecayIndicator() {
  if (!DOM.decayPhaseIcon || typeof getPowerDecayPhase !== 'function') return;

  const phase = getPowerDecayPhase();
  const mult = getPowerDecayMultiplier();

  DOM.decayPhaseIcon.textContent = phase.icon;
  DOM.decayPhaseName.textContent = phase.name;
  DOM.decayPhaseName.style.color = phase.color;
  DOM.decayPhaseMult.textContent = `×${mult.toFixed(2)}`;

  if (DOM.powerDecayIndicator) {
    DOM.powerDecayIndicator.title = phase.desc || '';
    DOM.powerDecayIndicator.style.borderColor = phase.color;
  }
}

/**
 * renderPMActions() — Renders the PM exclusive action cards in the idle panel.
 */
function renderPMActions() {
  if (!DOM.pmActionsGrid || typeof PM_ACTIONS === 'undefined') return;

  DOM.pmActionsGrid.innerHTML = '';

  const actionIds = ['tvAddress', 'overseasDiplomacy', 'emergencyDecree'];

  actionIds.forEach(actionId => {
    const status = getPMActionStatus(actionId);
    if (!status) return;

    const isOnCooldown = status.cooldown > 0;
    const isDisabled = !status.canUse;

    const card = document.createElement('div');
    card.className = `pm-action-card ${isDisabled ? 'disabled' : ''} ${isOnCooldown ? 'cooldown' : ''}`;

    // Build effect chips
    const effectChips = Object.entries(status.effects).map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const isGood = (key === 'unrest' || key === 'militaryPatience')
        ? (key === 'militaryPatience' ? val > 0 : val < 0)
        : val > 0;
      const cls = isGood ? 'positive' : 'negative';
      const labels = { popularity: 'Pop', budget: 'Budget', unrest: 'Unrest', growth: 'GDP', militaryPatience: 'Military', coalitionStability: 'Stab' };
      return `<span class="pm-effect-chip ${cls}">${labels[key] || key} ${sign}${val}</span>`;
    }).join('');

    card.innerHTML = `
      <span class="pm-action-card__icon">${status.icon}</span>
      <div class="pm-action-card__name">${status.name}</div>
      <div class="pm-action-card__thai">${status.nameThai}</div>
      <div class="pm-action-card__desc">${status.description}</div>
      <div class="pm-action-card__effects">${effectChips}</div>
      <div class="pm-action-card__footer">
        ${status.cost > 0
        ? `<span class="pm-action-card__cost budget">฿${status.cost}B</span>`
        : `<span class="pm-action-card__cost free">FREE</span>`
      }
        ${isOnCooldown
        ? `<span class="pm-action-card__cooldown-badge">${status.cooldown}mo CD</span>`
        : ''
      }
      </div>
    `;

    if (!isDisabled) {
      card.addEventListener('click', () => handlePMAction(actionId));
    }

    DOM.pmActionsGrid.appendChild(card);
  });
}

/**
 * handlePMAction() — Executes a PM action and shows the result modal.
 */
function handlePMAction(actionId) {
  const result = executePMAction(actionId);

  if (!result.success) {
    showToast(result.message, 'warning');
    return;
  }

  // Build effect chips
  let effectsHtml = '';
  if (result.effects) {
    const entries = Object.entries(result.effects).filter(([k, v]) => typeof v === 'number' && v !== 0);
    effectsHtml = entries.map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const isGood = (key === 'unrest') ? val < 0
        : (key === 'militaryPatience' || key === 'coalitionStability') ? val > 0
          : val > 0;
      const cls = isGood ? 'effect-positive' : 'effect-negative';
      const labels = { budget: 'Budget', popularity: 'Approval', unrest: 'Unrest', growth: 'GDP Growth', militaryPatience: 'Military', coalitionStability: 'Stability' };
      return `<span class="effect-chip ${cls}">${labels[key] || key}: ${sign}${val}</span>`;
    }).join(' ');
  }

  const html = `
    <h3 style="margin-bottom:0.5rem; font-size:1.1rem; color:var(--gold-400)">${result.message}</h3>
    ${effectsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>` : ''}
    ${result.narrative ? `<div class="diplo-narrative">${result.narrative}</div>` : ''}
  `;

  showModal(html);

  // Refresh UI
  updateStatusBar();
  updateEventLog();
  renderPMActions();
  renderMinistryControl(); // STEP 215
  updatePowerDecayIndicator();
}

// ─── STEP 215: MINISTRY CONTROL UI ─────────────────────────────

/**
 * renderMinistryControl() — Dynamically injects ministry cards into the UI.
 * Shows each ministry as a card with party alignment, policy name, cost, and status.
 */
function renderMinistryControl() {
  const container = DOM.ministryControlContainer;
  if (!container || !govState.ministries || govState.ministries.length === 0) return;

  let html = `<div class="ministry-control__title">🏛️ Ministry Control <span class="ministry-control__title-th">การจัดการกระทรวง</span></div>`;
  html += `<div class="ministry-control__grid">`;

  govState.ministries.forEach(min => {
    const status = (typeof getMinistryStatus === 'function') ? getMinistryStatus(min.id) : min;
    const isOwn = status.isOwnParty;
    const isBribed = status.isBribed;
    const acted = status.actedThisTurn;

    // Resolve holding party for color
    const holdingParty = (typeof getPartyById === 'function' && status.holdingPartyId)
      ? getPartyById(status.holdingPartyId)
      : null;
    const partyColor = holdingParty ? holdingParty.color : (isOwn ? '#3b82f6' : '#8b5cf6');
    const partyLabel = isOwn ? 'พรรคของคุณ' : (holdingParty ? holdingParty.shortName : 'พรรคร่วม');

    // Status text
    let statusBadge = '';
    if (acted) {
      statusBadge = `<span class="ministry-card__status acted">ดำเนินการแล้ว</span>`;
    } else if (!isOwn && isBribed) {
      statusBadge = `<span class="ministry-card__status bribed">ควบคุมได้</span>`;
    } else if (!isOwn) {
      statusBadge = `<span class="ministry-card__status locked">ต้องติดสินบน</span>`;
    } else {
      statusBadge = `<span class="ministry-card__status ready">พร้อมสั่งการ</span>`;
    }

    // Tier badge
    const tierColors = { A: '#fbbf24', B: '#60a5fa', C: '#9ca3af' };
    const tierColor = tierColors[status.tier] || '#9ca3af';

    html += `
    <div class="ministry-card ${acted ? 'ministry-card--acted' : ''} ${isOwn ? 'ministry-card--own' : 'ministry-card--coalition'}"
         data-ministry-id="${min.id}"
         onclick="handleMinistryClick('${min.id}')"
         style="--party-color: ${partyColor}">
      <div class="ministry-card__header">
        <span class="ministry-card__icon">${status.icon || '🏢'}</span>
        <div class="ministry-card__title-group">
          <div class="ministry-card__name">${status.name}</div>
          <div class="ministry-card__name-en">${status.nameEN}</div>
        </div>
        <span class="ministry-card__tier" style="color:${tierColor}">T${status.tier}</span>
      </div>
      <div class="ministry-card__body">
        <div class="ministry-card__policy">${status.actionName}</div>
        <div class="ministry-card__meta">
          <span class="ministry-card__cost">฿${status.budgetCost}B</span>
          <span class="ministry-card__gain">+${status.approvalGain}%</span>
        </div>
      </div>
      <div class="ministry-card__footer">
        <span class="ministry-card__party" style="border-color: ${partyColor}; color: ${partyColor}">${isOwn ? '🏛️' : '🤝'} ${partyLabel}</span>
        ${statusBadge}
      </div>
    </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

/**
 * handleMinistryClick(minId) — Opens the ministry action modal.
 * Shows different options depending on whether it's own-party or coalition.
 */
function handleMinistryClick(minId) {
  if (!govState.ministries) return;
  const min = govState.ministries.find(m => m.id === minId);
  if (!min) return;

  if (min.actedThisTurn) {
    showToast('กระทรวงนี้ดำเนินการไปแล้วในเดือนนี้', 'warning');
    return;
  }

  // Resolve holding party
  const holdingParty = (typeof getPartyById === 'function' && min.holdingPartyId)
    ? getPartyById(min.holdingPartyId) : null;
  const partyColor = holdingParty ? holdingParty.color : (min.isOwnParty ? '#3b82f6' : '#8b5cf6');
  const partyName = holdingParty ? holdingParty.name : (min.isOwnParty ? 'พรรคของคุณ' : 'พรรคร่วมรัฐบาล');

  // Corruption earnings estimate
  const corruptEstimate = '50–100';

  let actionsHtml = '';

  // ── OWN PARTY or BRIBED: Show Execute Policy + Corrupt ──
  if (min.isOwnParty || min.isBribed) {
    actionsHtml = `
      <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:0.75rem;">
        <button class="btn btn-primary btn-md" id="modal-ministry-policy" style="text-align:left; padding:0.6rem 1rem;">
          <div style="font-weight:700;">📜 ดำเนินนโยบาย — ${min.actionName}</div>
          <div style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin-top:0.2rem;">ใช้งบ ฿${min.budgetCost}B → คะแนนนิยม +${min.approvalGain}%</div>
        </button>
        <button class="btn btn-danger btn-md" id="modal-ministry-corrupt" style="text-align:left; padding:0.6rem 1rem;">
          <div style="font-weight:700;">💰 คอร์รัปชันงบประมาณ</div>
          <div style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin-top:0.2rem;">เข้ากองทุนพรรค +฿${corruptEstimate}M | ความเสี่ยงสูง!</div>
        </button>
        <button class="btn btn-secondary btn-sm" id="modal-ministry-cancel">ยกเลิก</button>
      </div>
    `;
  }
  // ── COALITION PARTY (NOT BRIBED): Show Bribe option ──
  else {
    actionsHtml = `
      <div style="margin-top:0.75rem; padding:0.6rem; background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.2); border-radius:6px;">
        <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">
          ⚠️ นี่คือกระทรวงของ <strong style="color:${partyColor}">${partyName}</strong><br>
          คุณไม่สามารถสั่งการได้โดยตรง — ต้อง "ยัดเงิน" ก่อน
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:0.75rem;">
        <button class="btn btn-primary btn-md" id="modal-ministry-bribe" style="text-align:left; padding:0.6rem 1rem; background:linear-gradient(135deg, #7c3aed, #a855f7);">
          <div style="font-weight:700;">🤫 ยัดเงิน — ซื้อสิทธิ์สั่งการ 1 เทิร์น</div>
          <div style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin-top:0.2rem;">ใช้งบ ฿${typeof MINISTRY_BRIBE_COST !== 'undefined' ? MINISTRY_BRIBE_COST : 40}B จากงบแผ่นดิน</div>
        </button>
        <button class="btn btn-secondary btn-sm" id="modal-ministry-cancel">ยกเลิก</button>
      </div>
    `;
  }

  const bribedTag = min.isBribed ? `<span style="display:inline-block;font-size:0.6rem;font-weight:700;background:rgba(16,185,129,0.12);color:#10b981;padding:2px 8px;border-radius:4px;margin-left:6px;">ติดสินบนแล้ว</span>` : '';

  const html = `
    <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.75rem;">
      <span style="font-size:1.5rem;">${min.icon || '🏢'}</span>
      <div>
        <h3 style="margin:0; font-size:1.05rem; color:var(--text-primary);">${min.name}${bribedTag}</h3>
        <div style="font-size:0.72rem; color:var(--text-muted);">${min.nameEN} — ${min.portfolio}</div>
      </div>
    </div>
    <div style="display:flex; gap:0.4rem; align-items:center; margin-bottom:0.5rem;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${partyColor};"></span>
      <span style="font-size:0.72rem;color:var(--text-secondary);">${min.isOwnParty ? '🏛️ พรรคของคุณ — Own Party' : `🤝 ${partyName}`}</span>
    </div>
    ${actionsHtml}
  `;

  showModal(html);

  // Wire up action buttons
  const policyBtn = document.getElementById('modal-ministry-policy');
  const corruptBtn = document.getElementById('modal-ministry-corrupt');
  const bribeBtn = document.getElementById('modal-ministry-bribe');
  const cancelBtn = document.getElementById('modal-ministry-cancel');

  if (policyBtn) {
    policyBtn.addEventListener('click', () => {
      hideModal();
      const result = executeMinistryAction(minId, 'policy');
      _showMinistryResult(result);
    });
  }

  if (corruptBtn) {
    corruptBtn.addEventListener('click', () => {
      hideModal();
      const result = executeMinistryAction(minId, 'corrupt');
      _showMinistryResult(result);
    });
  }

  if (bribeBtn) {
    bribeBtn.addEventListener('click', () => {
      hideModal();
      const result = executeMinistryAction(minId, 'bribe');
      _showMinistryResult(result);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideModal);
  }
}

/**
 * _showMinistryResult(result) — Displays the result of a ministry action.
 */
function _showMinistryResult(result) {
  if (!result.success) {
    showToast(result.message, 'warning');
    return;
  }

  // Build effect chips
  let effectsHtml = '';
  if (result.effects) {
    const entries = Object.entries(result.effects).filter(([k, v]) => typeof v === 'number' && v !== 0);
    effectsHtml = entries.map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const isGood = (key === 'unrest') ? val < 0 : val > 0;
      const cls = isGood ? 'effect-positive' : 'effect-negative';
      const labels = { budget: 'Budget', popularity: 'Approval', unrest: 'Unrest', growth: 'GDP' };
      return `<span class="effect-chip ${cls}">${labels[key] || key}: ${sign}${val}</span>`;
    }).join(' ');
  }

  const html = `
    <h3 style="margin-bottom:0.5rem; font-size:1.1rem; color:var(--gold-400)">${result.message}</h3>
    ${effectsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>` : ''}
    ${result.narrative ? `<div class="diplo-narrative">${result.narrative}</div>` : ''}
  `;

  showModal(html);

  // Refresh all UI
  updateStatusBar();
  updateEventLog();
  renderPMActions();
  renderMinistryControl();
  updatePowerDecayIndicator();
}

// ─── UPDATE EVENT LOG ───────────────────────────────────────

function updateEventLog() {
  // STEP 48: Bilingual event log
  const currentLang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'EN';
  const isTH = currentLang === 'TH';
  const emptyMsg = isTH ? 'ยังไม่มีเหตุการณ์' : 'No events yet.';
  const monthLabel = isTH ? 'เดือน' : 'Month';

  if (gameState.eventHistory.length === 0) {
    DOM.eventLog.innerHTML = `<div class="log-empty">${emptyMsg}</div>`;
    return;
  }

  DOM.eventLog.innerHTML = "";
  // Show most recent events first, limit to 15
  const recent = [...gameState.eventHistory].reverse().slice(0, 15);
  recent.forEach(entry => {
    const title = isTH ? (entry.eventTitleTH || entry.eventTitle) : (entry.eventTitleEN || entry.eventTitle);
    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `
      <div class="log-entry-turn">${monthLabel} ${entry.turn}</div>
      <div class="log-entry-title">${title}</div>
    `;
    DOM.eventLog.appendChild(div);
  });
}

// ─── SHOW WARNING TICKER ────────────────────────────────────

function showWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    DOM.warningTicker.style.display = "none";
    return;
  }
  DOM.warningTicker.style.display = "flex";
  DOM.warningText.innerHTML = warnings.join("<br>");
}

// ─── GAME OVER ──────────────────────────────────────────────

function showGameOver(reason) {
  showScreen("gameover-screen");

  // STEP 3 FIX: Clear UI state — game is over
  localStorage.removeItem('maingame_ui_state');

  const isVictory = reason === "VICTORY";

  DOM.gameoverIcon.textContent = isVictory ? "🏆" : "💥";
  DOM.gameoverTitle.textContent = isVictory ? "TERM COMPLETED!" : "GAME OVER";
  DOM.gameoverTitle.className = `gameover-title ${isVictory ? "victory" : "coup"}`;

  if (isVictory) {
    DOM.gameoverReason.textContent = "Congratulations! You have survived a full 4-year term as Prime Minister of Thailand — a feat few achieve. The people may not all love you, but you endured.";

    // Show victory score
    DOM.victoryScore.style.display = "block";
    const scores = calculateVictoryScore();
    DOM.victoryGrade.textContent = scores.grade;
    DOM.victoryTitleText.textContent = scores.title;

    DOM.scoreBreakdown.innerHTML = "";
    const scoreLabels = {
      popularity: "Approval Rating",
      stability: "National Stability",
      economy: "Budget Health",
      growth: "Economic Growth",
      legislation: "Laws Passed",
      coalitionBonus: "Coalition Intact",
      militaryBonus: "Military Stable"
    };
    Object.entries(scoreLabels).forEach(([key, label]) => {
      const row = document.createElement("div");
      row.className = "score-row";
      row.innerHTML = `
        <span class="score-row-label">${label}</span>
        <span class="score-row-value">${Math.round(scores[key])}</span>
      `;
      DOM.scoreBreakdown.appendChild(row);
    });
    const totalRow = document.createElement("div");
    totalRow.className = "score-row";
    totalRow.style.cssText = "border-top:1px solid var(--border-normal); margin-top:0.3rem; padding-top:0.4rem; grid-column:span 2;";
    totalRow.innerHTML = `
      <span class="score-row-label" style="font-weight:700; color:var(--text-primary);">TOTAL SCORE</span>
      <span class="score-row-value" style="font-size:1.1rem;">${Math.round(scores.total)}</span>
    `;
    DOM.scoreBreakdown.appendChild(totalRow);
  } else {
    DOM.gameoverReason.textContent = reason;
    DOM.victoryScore.style.display = "none";
  }

  // Stats
  DOM.goMonths.textContent = gameState.turn - 1;
  DOM.goLaws.textContent = gameState.passedLaws.length;
  DOM.goApproval.textContent = `${Math.round(gameState.popularity)}%`;

  // Delete save on game over
  deleteSave();
}

// ─── INIT GAME ──────────────────────────────────────────────

function initGame(loadSave = false) {
  if (loadSave && hasSavedGame()) {
    loadGame();
    showToast("Game loaded successfully!", "success");
  } else {
    initializeGameState();
    resetCabinet(); // v1.0.2: Reset cabinet for new game
    if (typeof resetDiplomacy === 'function') resetDiplomacy(); // v1.0.2
    if (typeof resetPMActions === 'function') resetPMActions(); // v1.0.2

    // STEP 28: Generate dynamic seat allocations based on entry mode
    const coreId = getPlayerCorePartyId();
    if (coreId && typeof generateCabinetSeats === 'function') {
      generateCabinetSeats(coreId);
    }
  }

  showScreen("game-screen");

  // STEP 3 FIX: Persist UI state so language reload doesn't reset to start screen
  localStorage.setItem('maingame_ui_state', 'dashboard');
  console.log('[main-game/main.js] UI state saved: dashboard');

  // Update all UI elements
  updateStatusBar();
  updateHeader();
  renderParliament();
  renderLaws();
  updateEventLog();
  renderDiplomacyContacts(); // v1.0.2
  renderPMActions(); // v1.0.2
  renderMinistryControl(); // STEP 215
  updatePowerDecayIndicator(); // v1.0.2

  // ── STEP 25: Populate Active Party Identity Indicator ──
  _populateMainGamePartyIndicator();

  // STEP 215: Initialize ministry data (restores from save or waits for cabinet)
  if (typeof initMinistries === 'function') {
    initMinistries();
    renderMinistryControl();
  }

  // v1.0.2: On new game, show Cabinet Formation before gameplay
  if (!loadSave && !getCabinetState().isFormed) {
    openCabinetRoom();
    return; // Don't show idle panel yet — cabinet first
  }

  // Show idle panel to start
  hideAllMainPanels();
  DOM.idlePanel.style.display = "flex";
}

// ─── STEP 25: ACTIVE PARTY IDENTITY INDICATOR ───────────────

/**
 * _populateMainGamePartyIndicator() — Reads the player's party from
 * localStorage and fills the header identity display.
 *
 * STEP 30: Now uses getPlayerCorePartyId() for robust ID resolution
 * instead of a duplicate inline map (which had wrong IDs for STK/PTR).
 */
function _populateMainGamePartyIndicator() {
  // Use the robust resolver from cabinet.js (handles all 5 parties + edge cases)
  const mainGameId = (typeof getPlayerCorePartyId === 'function')
    ? getPlayerCorePartyId()
    : localStorage.getItem('campaign_party_id');

  if (!mainGameId) return;

  const party = (typeof PARTIES !== 'undefined') ? PARTIES.find(p => p.id === mainGameId) : null;

  const dot = document.getElementById('player-party-color-dot');
  const nameEl = document.getElementById('player-party-name');

  if (party) {
    if (dot) {
      dot.style.background = party.color;
      dot.style.boxShadow = `0 0 8px ${party.color}`;
    }
    if (nameEl) nameEl.textContent = party.name;
    console.log(`[main-game/main.js] Party indicator: "${party.name}" (${party.color})`);
  } else {
    // Fallback: show the raw ID
    if (nameEl) nameEl.textContent = mainGameId.replace(/_/g, ' ');
    console.warn(`[main-game/main.js] Could not find party for indicator: "${mainGameId}"`);
  }
}

// ─── STEP 49: LIVE LANGUAGE TOGGLE SYNC ─────────────────────
// When the user toggles language while a crisis event is on screen,
// re-render the active panel so text switches instantly.
window.addEventListener('tpsLangChanged', () => {
  console.log('[main.js] STEP 49 — Language changed, refreshing dynamic panels...');

  // 1. If a crisis event is currently displayed, re-render it in the new language
  if (activePanelState === 'crisis' && cachedCrisisEvent) {
    _renderCrisisPanel(cachedCrisisEvent);
  }

  // 2. Always refresh the event log sidebar (it uses stored bilingual titles)
  if (typeof updateEventLog === 'function') {
    updateEventLog();
  }

  // 3. Refresh status bar labels (they use data-i18n handled by applyTranslations)
  if (typeof updateStatusBar === 'function') {
    updateStatusBar();
  }

  // 4. Refresh header
  if (typeof updateHeader === 'function') {
    updateHeader();
  }
});

// ─── EVENT LISTENERS ────────────────────────────────────────

// STEP 23: "New Game" — behavior depends on entry mode
DOM.btnNewGame.addEventListener("click", () => {
  const entryMode = localStorage.getItem('game_entry_mode');

  if (entryMode === 'campaign_finished') {
    // Coming from campaign election win — party is already selected
    // Skip party select, go directly to government dashboard
    console.log('[main-game/main.js] Campaign party already set — skipping party select, launching game directly.');
    initGame(false);
  } else {
    // Quick Start (no campaign) — redirect to campaign for party selection
    console.log('[main-game/main.js] STEP 23 — Redirecting to Campaign for party selection...');
    window.location.href = '../campaign/index.html?return_to=cabinet';
  }
});
DOM.btnLoadGame.addEventListener("click", () => initGame(true));

// Game buttons
DOM.btnStartMonth.addEventListener("click", handleStartMonth);
DOM.btnEndTurn.addEventListener("click", handleEndTurn);
DOM.btnNextMonth.addEventListener("click", handleNextMonth);
DOM.btnCloseVote.addEventListener("click", () => {
  // STEP 38: Restore the panel that was active before the vote
  const preVoteState = DOM.votePanel.dataset.preVoteState || 'idle';
  console.log(`[main.js] STEP 38 — Vote closed, restoring: "${preVoteState}"`);

  hideAllMainPanels();

  if (preVoteState === 'crisis' && cachedCrisisEvent) {
    // Restore the interrupted crisis event with working buttons
    _renderCrisisPanel(cachedCrisisEvent);
    activePanelState = 'crisis';
  } else if (preVoteState === 'outcome') {
    // Outcome was showing — re-show outcome panel
    DOM.outcomePanel.style.display = "block";
    activePanelState = 'outcome';
  } else if (preVoteState === 'report') {
    // Monthly report was showing — restore it so player can click "Next Month"
    DOM.reportPanel.style.display = "block";
    activePanelState = 'report';
  } else {
    // Default: return to idle (pre-month state)
    DOM.idlePanel.style.display = "flex";
    activePanelState = 'idle';
  }

  renderPMActions();
  renderMinistryControl(); // STEP 215
  updatePowerDecayIndicator();
});

// Save
DOM.btnSave.addEventListener("click", () => {
  saveGame();
  showToast("Game saved!", "success");
});

// Menu button
DOM.btnMenu.addEventListener("click", () => {
  showModal(`
    <h3 style="margin-bottom:1rem; font-size:1.1rem;">☰ Menu</h3>
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      <button class="btn btn-secondary btn-md" id="menu-save">💾 Save Game</button>
      <button class="btn btn-secondary btn-md" id="menu-howto">📖 How to Play</button>
      <button class="btn btn-danger btn-md" id="menu-quit">🚪 Quit to Title</button>
    </div>
  `);
  document.getElementById("menu-save").addEventListener("click", () => {
    saveGame();
    showToast("Game saved!", "success");
    hideModal();
  });
  document.getElementById("menu-howto").addEventListener("click", () => {
    showHowToPlay();
  });
  document.getElementById("menu-quit").addEventListener("click", () => {
    hideModal();
    // STEP 3 FIX: Clear UI state on quit
    localStorage.removeItem('maingame_ui_state');
    showScreen("start-screen");
  });
});

// Modal close
DOM.modalClose.addEventListener("click", hideModal);
DOM.modalOverlay.addEventListener("click", (e) => {
  if (e.target === DOM.modalOverlay) hideModal();
});

// Restart
DOM.btnRestart.addEventListener("click", () => {
  // STEP 3 FIX: Clear UI state on restart
  localStorage.removeItem('maingame_ui_state');
  showScreen("start-screen");
});

// ─── HOW TO PLAY ────────────────────────────────────────────

function showHowToPlay() {
  showModal(`
    <h3 style="margin-bottom:0.75rem; font-size:1.1rem;">📖 How to Play</h3>
    <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.7;">
      <p style="margin-bottom:0.75rem;">You are the <strong style="color:var(--gold-400);">Prime Minister of Thailand</strong>. Each turn represents one month of your 4-year term (48 months).</p>
      
      <p style="margin-bottom:0.5rem; font-weight:600; color:var(--text-primary);">Each Month:</p>
      <ol style="margin-left:1.2rem; margin-bottom:0.75rem;">
        <li>A <strong>Crisis Event</strong> occurs — you must choose how to respond</li>
        <li>Your choice affects Approval, Budget, Unrest, and Party Relations</li>
        <li>Monthly effects from active laws are applied</li>
        <li>Coalition stability is evaluated</li>
      </ol>
      
      <p style="margin-bottom:0.5rem; font-weight:600; color:var(--text-primary);">You Can Also:</p>
      <ul style="margin-left:1.2rem; margin-bottom:0.75rem;">
        <li>Propose or repeal <strong>Laws</strong> — Parliament votes based on ideology & loyalty</li>
        <li>Monitor your <strong>Coalition</strong> — parties may join or defect</li>
      </ul>
      
      <p style="margin-bottom:0.5rem; font-weight:600; color:var(--red-400);">Game Over If:</p>
      <ul style="margin-left:1.2rem; margin-bottom:0.75rem;">
        <li>🔴 Social Unrest reaches 100% → Military Coup</li>
        <li>🎖️ Military Patience hits 0 → Coup</li>
        <li>💰 Budget runs out → National Bankruptcy</li>
        <li>🏛️ Coalition loses majority → Vote of No Confidence</li>
        <li>📉 Approval hits 0% → Forced Resignation</li>
      </ul>
      
      <p style="color:var(--gold-400); font-weight:600;">Survive all 48 months to win! 🏆</p>
    </div>
  `);
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// STEP 41: DIPLOMACY WAR ROOM
// Full-screen modal for coalition partner management with loyalty bars.
// ═══════════════════════════════════════════════════════════════════

let _expandedWarroomPartyId = null;

/**
 * openWarRoom() — Opens the Diplomacy War Room modal.
 */
function openWarRoom() {
  const overlay = document.getElementById('diplomacy-war-room');
  if (!overlay) return;
  overlay.style.display = 'flex';
  renderWarRoomCards();
  console.log('[main.js] STEP 41 — War Room opened.');
}

/**
 * closeWarRoom() — Closes the Diplomacy War Room modal.
 */
function closeWarRoom() {
  const overlay = document.getElementById('diplomacy-war-room');
  if (overlay) overlay.style.display = 'none';
  _expandedWarroomPartyId = null;
}

/**
 * _getLoyaltyColor(loyalty) — Returns the color class for a loyalty value.
 * Red < 30%, Yellow 30-60%, Green > 60%
 */
function _getLoyaltyColor(loyalty) {
  if (loyalty >= 60) return 'green';
  if (loyalty >= 30) return 'yellow';
  return 'red';
}

/**
 * renderWarRoomCards() — Renders the War Room coalition stats and party cards.
 */
function renderWarRoomCards() {
  const statsContainer = document.getElementById('warroom-coalition-stats');
  const cardsContainer = document.getElementById('warroom-party-cards');
  if (!statsContainer || !cardsContainer) return;

  // Get the player's core party ID
  const corePartyId = localStorage.getItem('selectedPartyId') || '';

  // Filter: coalition partners only (exclude player's core party)
  const coalitionPartners = parties.filter(p =>
    p.inCoalition && p.id !== corePartyId
  );

  // ── Coalition Stats Summary ──
  const totalCoalitionSeats = parties
    .filter(p => p.inCoalition)
    .reduce((sum, p) => sum + p.seats, 0);
  const avgLoyalty = coalitionPartners.length > 0
    ? Math.round(coalitionPartners.reduce((sum, p) => sum + (p.coalitionLoyalty || 50), 0) / coalitionPartners.length)
    : 0;
  const dangerCount = coalitionPartners.filter(p => (p.coalitionLoyalty || 50) < 30).length;

  const loyaltyColorClass = _getLoyaltyColor(avgLoyalty);
  const seatsClass = totalCoalitionSeats >= MAJORITY_THRESHOLD ? 'good' : 'danger';

  statsContainer.innerHTML = `
    <div class="warroom-stat">
      🏛️ Coalition Seats:
      <span class="warroom-stat__value ${seatsClass}">${totalCoalitionSeats} / ${PARLIAMENT_TOTAL_SEATS}</span>
    </div>
    <div class="warroom-stat">
      🎯 Majority: <span class="warroom-stat__value ${seatsClass}">${totalCoalitionSeats >= MAJORITY_THRESHOLD ? '✅ YES' : '❌ NO'}</span>
    </div>
    <div class="warroom-stat">
      💛 Avg Loyalty:
      <span class="warroom-stat__value ${loyaltyColorClass === 'green' ? 'good' : loyaltyColorClass === 'yellow' ? 'warning' : 'danger'}">${avgLoyalty}%</span>
    </div>
    ${dangerCount > 0 ? `
    <div class="warroom-stat">
      🚨 At Risk: <span class="warroom-stat__value danger">${dangerCount} partner${dangerCount > 1 ? 's' : ''}</span>
    </div>` : ''}
    <div class="warroom-stat">
      💰 Budget: <span class="warroom-stat__value">${gameState.budget}B</span>
    </div>
  `;

  // ── Party Cards ──
  cardsContainer.innerHTML = '';

  if (coalitionPartners.length === 0) {
    cardsContainer.innerHTML = `
      <div class="warroom-empty">
        <span class="warroom-empty__icon">🏚️</span>
        No coalition partners to negotiate with.
      </div>
    `;
    return;
  }

  coalitionPartners.forEach(party => {
    const loyalty = party.coalitionLoyalty || 50;
    const loyaltyColor = _getLoyaltyColor(loyalty);
    const isExpanded = _expandedWarroomPartyId === party.id;
    const isDanger = loyalty < 30;
    const status = typeof getPartyDiplomacyStatus === 'function'
      ? getPartyDiplomacyStatus(party.id) : null;

    // Build card
    const card = document.createElement('div');
    card.className = `warroom-card ${isExpanded ? 'expanded' : ''} ${isDanger ? 'danger-card' : ''}`;

    // Threat badge
    let threatBadge = '';
    if (status && status.threatCount > 0) {
      const isCritical = status.threatDanger;
      threatBadge = `<span class="diplo-threat-badge ${isCritical ? 'critical' : ''}">${status.threatCount}/${status.threatMax} ⚡</span>`;
    }

    // Header
    const header = document.createElement('div');
    header.className = 'warroom-card__header';
    header.innerHTML = `
      <div class="warroom-card__color-bar" style="background:${party.color}"></div>
      <div class="warroom-card__info">
        <div class="warroom-card__name">${party.name} ${threatBadge}</div>
        <div class="warroom-card__leader">
          ${party.leader || 'Unknown Leader'} — ${party.leaderTitle || 'Leader'} · ${party.ideology}
        </div>
      </div>
      <div class="warroom-card__seats">${party.seats} seats</div>
      <div class="warroom-card__chevron">▼</div>
    `;

    header.addEventListener('click', () => {
      _expandedWarroomPartyId = isExpanded ? null : party.id;
      renderWarRoomCards();
    });

    // Loyalty Bar
    const loyaltySection = document.createElement('div');
    loyaltySection.className = 'warroom-card__loyalty';
    loyaltySection.innerHTML = `
      <div class="warroom-loyalty">
        <span class="warroom-loyalty__label">Loyalty</span>
        <div class="warroom-loyalty__track">
          <div class="warroom-loyalty__fill loyalty-${loyaltyColor}"
               style="width:${Math.max(2, loyalty)}%"></div>
        </div>
        <span class="warroom-loyalty__value loyalty-value-${loyaltyColor}">${loyalty}%</span>
      </div>
    `;

    // Actions panel (uses existing diplomacy buttons)
    const actions = document.createElement('div');
    actions.className = 'warroom-card__actions';

    if (status) {
      // ── STEP 42: New War Room Actions ──

      // Action A: Pork Barrel Funding
      const porkBtn = _createDiploButton({
        action: 'placate', icon: '💰',
        label: 'จัดสรรงบลงพื้นที่ (Pork Barrel)',
        cost: `฿${status.porkBarrelCost}B`,
        enabled: status.canPorkBarrel,
        cooldown: status.porkBarrelCooldown,
        meta: 'Loyalty +25%, Unrest +8'
      });
      porkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _handleWarRoomAction('porkBarrel', party.id);
      });

      // Action B: Demand Whip Compliance
      const whipBtn = _createDiploButton({
        action: 'threaten', icon: '🗳️',
        label: 'ขอคำมั่นสัญญาโหวต (Whip Vote)',
        cost: status.isWhipped ? '✅ WHIPPED' : 'FREE',
        enabled: status.canWhipCompliance,
        cooldown: status.whipComplianceCooldown,
        meta: status.isWhipped ? '✅ Will vote YES' : 'Loyalty -10%'
      });
      whipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _handleWarRoomAction('whipCompliance', party.id);
      });

      // Action C: Coalition Gala Dinner
      const galaBtn = _createDiploButton({
        action: 'renegotiate', icon: '🍽️',
        label: 'งานเลี้ยงกระชับมิตร (Gala Dinner)',
        cost: `฿${status.galaDinnerCost}B`,
        enabled: status.canGalaDinner,
        cooldown: status.galaDinnerCooldown,
        meta: `RNG — ${gameState.popularity >= 40 ? '85%' : '30%'} success`
      });
      galaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _handleWarRoomAction('galaDinner', party.id);
      });

      actions.appendChild(porkBtn);
      actions.appendChild(whipBtn);
      actions.appendChild(galaBtn);
    }

    card.appendChild(header);
    card.appendChild(loyaltySection);
    card.appendChild(actions);
    cardsContainer.appendChild(card);
  });
}

/**
 * _handleWarRoomAction() — Executes a STEP 42 War Room diplomacy action,
 * shows the result in a modal, and refreshes all relevant UI.
 */
function _handleWarRoomAction(action, partyId) {
  let result;

  // Route to the correct STEP 42 function
  switch (action) {
    case 'porkBarrel':
      result = porkBarrelFunding(partyId);
      break;
    case 'whipCompliance':
      result = demandWhipCompliance(partyId);
      break;
    case 'galaDinner':
      result = coalitionGalaDinner(partyId);
      break;
    default:
      // Fall back to original sidebar actions
      _handleDiplomacyAction(action, partyId);
      setTimeout(() => renderWarRoomCards(), 100);
      return;
  }

  // Handle failure
  if (!result.success) {
    showToast(result.message, 'warning');
    return;
  }

  // Build result modal
  const actionLabels = {
    porkBarrel:      { title: '💰 Pork Barrel Funding', color: 'var(--green-400)' },
    whipCompliance:  { title: '🗳️ Whip Compliance Demanded', color: 'var(--amber-400)' },
    galaDinner:      {
      title: result.galaSuccess ? '🍽️ Gala Dinner — Success!' : '🍽️ Gala Dinner — Backfired',
      color: result.galaSuccess ? 'var(--green-400)' : 'var(--red-400)'
    }
  };

  const label = actionLabels[action] || { title: action, color: 'var(--text-primary)' };

  // Effect chips
  let effectsHtml = '';
  if (result.effects) {
    const effectEntries = Object.entries(result.effects).filter(([k, v]) => typeof v === 'number');
    effectsHtml = effectEntries.map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const isGood = (key === 'coalitionLoyalty' || key === 'relation' || key === 'coalitionStability') ? val > 0 :
        (key === 'budget') ? val > 0 :
          (key === 'unrest') ? val < 0 : val > 0;
      const cls = isGood ? 'effect-positive' : 'effect-negative';
      const labelMap = {
        budget: 'Budget', coalitionLoyalty: 'Loyalty', relation: 'Relation',
        coalitionStability: 'Stability', unrest: 'Unrest'
      };
      return `<span class="effect-chip ${cls}">${labelMap[key] || key}: ${sign}${val}</span>`;
    }).join(' ');

    // Special whip status chip
    if (result.effects.whipStatus) {
      effectsHtml += ` <span class="effect-chip effect-positive">${result.effects.whipStatus}</span>`;
    }
  }

  const html = `
    <h3 style="margin-bottom:0.5rem; font-size:1.1rem; color:${label.color}">${label.title}</h3>
    <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.75rem;">${result.message}</p>
    ${effectsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>` : ''}
    ${result.warning ? `<div style="font-size:0.8rem;color:var(--amber-400);margin-bottom:0.5rem;">${result.warning}</div>` : ''}
    ${result.narrative ? `<div class="diplo-narrative">${result.narrative}</div>` : ''}
  `;

  showModal(html);

  // Refresh all UI
  updateStatusBar();
  renderParliament();
  renderDiplomacyContacts();
  renderWarRoomCards();
}

// War Room DOM refs & listeners (attached at bottom of file)
document.getElementById('btn-close-warroom')?.addEventListener('click', closeWarRoom);

// ═══════════════════════════════════════════════════════════════════
// COALITION DIPLOMACY UI CONTROLLER (v1.0.2 — Step 8)
// Renders contact cards and handles diplomatic actions.
// ═══════════════════════════════════════════════════════════════════

let _expandedDiploPartyId = null;

/**
 * renderDiplomacyContacts() — Renders the coalition contacts sidebar.
 */
function renderDiplomacyContacts() {
  if (!DOM.diplomacyContacts || typeof getPartyDiplomacyStatus !== 'function') return;
  if (!parties) return;

  const coalitionParties = parties.filter(p => p.inCoalition);
  DOM.diplomacyContacts.innerHTML = '';

  if (coalitionParties.length === 0) {
    DOM.diplomacyContacts.innerHTML = '<div style="font-size:0.72rem;color:var(--text-muted);padding:0.5rem;font-style:italic">No coalition partners.</div>';
    return;
  }

  coalitionParties.forEach(party => {
    const status = getPartyDiplomacyStatus(party.id);
    if (!status) return;

    const isExpanded = _expandedDiploPartyId === party.id;
    const relationSign = party.relation > 0 ? '+' : '';
    const relationClass = party.relation > 10 ? 'positive' : party.relation < -10 ? 'negative' : 'neutral';
    const isDanger = party.relation < -20 || status.threatDanger;

    const card = document.createElement('div');
    card.className = `diplo-contact ${isExpanded ? 'expanded' : ''} ${isDanger ? 'danger' : ''}`;

    // Threat badge HTML
    let threatBadge = '';
    if (status.threatCount > 0) {
      const isCritical = status.threatDanger;
      threatBadge = `<span class="diplo-threat-badge ${isCritical ? 'critical' : ''}">${status.threatCount}/${status.threatMax} ⚡</span>`;
    }

    // Header
    const header = document.createElement('div');
    header.className = 'diplo-contact__header';
    header.innerHTML = `
      <div class="diplo-contact__dot" style="background:${party.color}"></div>
      <div class="diplo-contact__info">
        <div class="diplo-contact__name">${party.shortName} ${threatBadge}</div>
        <div class="diplo-contact__meta">${party.seats} seats · ${party.ideology}</div>
      </div>
      <div class="diplo-contact__relation ${relationClass}">${relationSign}${party.relation}</div>
      <div class="diplo-contact__chevron">▼</div>
    `;

    header.addEventListener('click', () => {
      _expandedDiploPartyId = isExpanded ? null : party.id;
      renderDiplomacyContacts();
    });

    // Actions panel
    const actions = document.createElement('div');
    actions.className = 'diplo-contact__actions';

    // Placate button
    const placateBtn = _createDiploButton({
      action: 'placate',
      icon: '🎁',
      label: 'Placate Leader',
      cost: `฿${status.placateCost}B`,
      enabled: status.canPlacate,
      cooldown: status.placateCooldown,
      meta: status.placateUses >= status.placateMaxUses ? 'Exhausted' : `${status.placateUses}/${status.placateMaxUses} used`
    });
    placateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _handleDiplomacyAction('placate', party.id);
    });

    // Renegotiate button
    const renegBtn = _createDiploButton({
      action: 'renegotiate',
      icon: '🔄',
      label: 'Renegotiate Deal',
      cost: `฿${status.renegotiateCost}B`,
      enabled: status.canRenegotiate,
      cooldown: status.renegotiateCooldown,
      meta: 'Swap ministries'
    });
    renegBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _handleDiplomacyAction('renegotiate', party.id);
    });

    // Threaten button
    const threatBtn = _createDiploButton({
      action: 'threaten',
      icon: '⚡',
      label: 'Threaten Expulsion',
      cost: 'FREE',
      enabled: status.canThreaten,
      cooldown: status.threatCooldown,
      meta: status.threatDanger ? '🚨 FINAL WARNING' : `${status.threatCount}/${status.threatMax} used`
    });
    threatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _handleDiplomacyAction('threaten', party.id);
    });

    actions.appendChild(placateBtn);
    actions.appendChild(renegBtn);
    actions.appendChild(threatBtn);

    card.appendChild(header);
    card.appendChild(actions);
    DOM.diplomacyContacts.appendChild(card);
  });
}

/**
 * _createDiploButton() — Creates a styled diplomacy action button.
 */
function _createDiploButton({ action, icon, label, cost, enabled, cooldown, meta }) {
  const btn = document.createElement('button');
  btn.className = `diplo-action-btn ${action}`;
  btn.disabled = !enabled;

  if (cooldown > 0) {
    btn.innerHTML = `
      <span class="diplo-action-btn__icon">${icon}</span>
      <span class="diplo-action-btn__label">${label}</span>
      <span class="diplo-action-btn__cooldown">${cooldown}mo CD</span>
    `;
  } else {
    btn.innerHTML = `
      <span class="diplo-action-btn__icon">${icon}</span>
      <span class="diplo-action-btn__label">${label}</span>
      <span class="diplo-action-btn__cost">${cost}</span>
    `;
  }

  btn.title = meta || '';
  return btn;
}

/**
 * _handleDiplomacyAction() — Executes a diplomacy action and shows the result.
 */
function _handleDiplomacyAction(action, partyId) {
  let result;

  switch (action) {
    case 'placate':
      result = placateLeader(partyId);
      break;
    case 'renegotiate':
      result = renegotiateDeal(partyId);
      break;
    case 'threaten':
      result = threatenExpulsion(partyId);
      break;
    default:
      return;
  }

  if (!result.success && !result.isDefection) {
    showToast(result.message, 'warning');
    return;
  }

  // Build result modal
  const actionLabels = {
    placate: { title: '🎁 Leader Placated', color: 'var(--green-400)' },
    renegotiate: { title: '🔄 Deal Renegotiated', color: 'var(--amber-400)' },
    threaten: { title: result.isDefection ? '🚨 COALITION CRISIS' : '⚡ Expulsion Threatened', color: 'var(--red-400)' }
  };

  const label = actionLabels[action];

  // Effect chips
  let effectsHtml = '';
  if (result.effects) {
    const effectEntries = Object.entries(result.effects).filter(([k, v]) => typeof v === 'number');
    effectsHtml = effectEntries.map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const isGood = (key === 'relation' || key === 'coalitionStability' || key === 'complianceBonus') ? val > 0 :
        (key === 'budget') ? val > 0 :
          (key === 'unrest') ? val < 0 : val > 0;
      const cls = isGood ? 'effect-positive' : 'effect-negative';
      const labelMap = {
        budget: 'Budget', relation: 'Relation', coalitionStability: 'Stability',
        unrest: 'Unrest', complianceBonus: 'Vote Compliance',
        otherPartyRelation: 'Other Allies'
      };
      return `<span class="effect-chip ${cls}">${labelMap[key] || key}: ${sign}${val}</span>`;
    }).join(' ');
  }

  const html = `
    <h3 style="margin-bottom:0.5rem; font-size:1.1rem; color:${label.color}">${label.title}</h3>
    <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.75rem;">${result.message}</p>
    ${effectsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.75rem;">${effectsHtml}</div>` : ''}
    ${result.warning ? `<div style="font-size:0.8rem;color:var(--amber-400);margin-bottom:0.5rem;">${result.warning}</div>` : ''}
    ${result.narrative ? `<div class="diplo-narrative">${result.narrative}</div>` : ''}
  `;

  showModal(html);

  // Refresh everything
  updateStatusBar();
  renderParliament();
  renderDiplomacyContacts();

  // If defection occurred, check game over
  if (result.isDefection && !hasCoalitionMajority()) {
    setTimeout(() => {
      hideModal();
      showGameOver("VOTE OF NO CONFIDENCE — Your coalition has fractured below the 251-seat majority. Opposition parties file a no-confidence motion. It passes overwhelmingly. The Speaker dissolves Parliament.");
    }, 4000);
  }
}


// ═══════════════════════════════════════════════════════════════════
// CABINET ROOM UI CONTROLLER (v1.0.2 — Step 7)
// Manages the ministry allocation interface.
// ═══════════════════════════════════════════════════════════════════

let _selectedCabinetPartyId = null; // Currently selected party for assignment

/**
 * openCabinetRoom() — Opens the Cabinet Formation modal.
 * STEP 25: Resolves Core Party and locks it as the dominant partner.
 */
function openCabinetRoom() {
  if (!DOM.cabinetOverlay) return;

  // STEP 25: Resolve the Core Party from localStorage
  const corePartyId = getPlayerCorePartyId();
  console.log(`[main.js] Cabinet Room opened. Core Party: "${corePartyId || 'none'}"`);

  // Auto-select the player's party for assignment
  _selectedCabinetPartyId = corePartyId || null;
  DOM.cabinetOverlay.style.display = "flex";

  const coalitionParties = parties.filter(p => p.inCoalition);

  // STEP 25: Display Core Party identity in the cabinet header
  _renderCorePartyBanner(corePartyId, coalitionParties);

  renderCabinetSlots();
  renderCabinetRoster(coalitionParties);
  updateSatisfactionPreview(coalitionParties);
  _updateCabinetFooter();
}

/**
 * _renderCorePartyBanner() — STEP 29: Dynamically injects the PM's Party
 * identity banner into #pm-party-banner-container. Uses currentParliamentSeats
 * for accurate seat counts. Falls back to a generic message if no party is set.
 */
function _renderCorePartyBanner(corePartyId, coalitionParties) {
  const container = document.getElementById('pm-party-banner-container');
  if (!container) return;

  // Fallback: no core party selected
  if (!corePartyId) {
    container.innerHTML = `
      <span style="color:var(--text-muted);font-size:0.82rem">
        Allocate ministries to your coalition partners. Their satisfaction determines coalition loyalty.
      </span>
    `;
    return;
  }

  // Find the core party from the live parties array (name/color)
  let coreParty = coalitionParties.find(p => p.id === corePartyId);

  // STEP 31: Fallback — search full PARTIES array (party may not be in coalition yet)
  if (!coreParty && typeof PARTIES !== 'undefined') {
    coreParty = PARTIES.find(p => p.id === corePartyId);
    if (coreParty) console.log(`[main.js] STEP 31 — Core party found in PARTIES (not yet in coalition): "${corePartyId}"`);
  }

  // STEP 31: Second fallback — search currentParliamentSeats
  if (!coreParty && typeof getCurrentParliamentSeats === 'function') {
    const seatEntry = getCurrentParliamentSeats()?.find(p => p.id === corePartyId || p.isPlayer);
    if (seatEntry) {
      coreParty = { id: seatEntry.id, name: seatEntry.name, shortName: seatEntry.shortName, color: seatEntry.color, seats: seatEntry.seats };
      console.log(`[main.js] STEP 31 — Core party recovered from currentParliamentSeats: "${coreParty.name}"`);
    }
  }

  if (!coreParty) {
    console.error(`[main.js] ⛔ STEP 31 — Core party "${corePartyId}" not found anywhere!`);
    container.innerHTML = `
      <span style="color:var(--text-muted);font-size:0.82rem">
        Core Party not found in coalition. Allocate ministries below.
      </span>
    `;
    return;
  }

  // Get the dynamic seat count from currentParliamentSeats
  const seatData = (typeof getCurrentParliamentSeats === 'function') ? getCurrentParliamentSeats() : null;
  const playerSeatEntry = seatData ? seatData.find(p => p.id === corePartyId) : null;
  const seatCount = playerSeatEntry ? playerSeatEntry.seats : coreParty.seats;

  // Calculate total coalition seats
  const totalCoalitionSeats = coalitionParties.reduce((sum, p) => sum + p.seats, 0);

  container.innerHTML = `
    <div class="pm-banner" style="border-left:4px solid ${coreParty.color};padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:0 8px 8px 0;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${coreParty.color};box-shadow:0 0 10px ${coreParty.color}88;flex-shrink:0"></span>
        <strong style="color:#fff;font-size:0.95rem">Prime Minister's Party: ${coreParty.name}</strong>
        <span class="cabinet-core-badge">🔒 CORE PARTY</span>
      </div>
      <div style="display:flex;gap:16px;font-size:0.78rem;color:var(--text-muted);margin-top:2px">
        <span>🪑 <strong style="color:#fff">${seatCount}</strong> seats</span>
        <span>📊 <strong style="color:#fff">${Math.round((seatCount / 500) * 100)}%</strong> of parliament</span>
        <span>🏛️ Coalition: <strong style="color:#fff">${totalCoalitionSeats}</strong>/500</span>
      </div>
    </div>
    <span style="color:var(--text-muted);font-size:0.78rem">
      Allocate ministries to your coalition partners. Their satisfaction determines coalition loyalty.
    </span>
  `;
}

/**
 * closeCabinetRoom() — Hides the cabinet modal.
 */
function closeCabinetRoom() {
  if (DOM.cabinetOverlay) {
    DOM.cabinetOverlay.style.display = "none";
  }
  // Show idle panel after cabinet
  hideAllMainPanels();
  DOM.idlePanel.style.display = "flex";
  renderPMActions(); // v1.0.2
  renderMinistryControl(); // STEP 215
  updatePowerDecayIndicator(); // v1.0.2
}

/**
 * renderCabinetSlots() — Renders all ministry slots grouped by tier.
 * STEP 25: Core Party slots show a lock icon.
 */
function renderCabinetSlots() {
  const tiers = {
    A: DOM.cabinetSlotsA,
    B: DOM.cabinetSlotsB,
    C: DOM.cabinetSlotsC
  };

  const corePartyId = getPlayerCorePartyId();

  Object.entries(tiers).forEach(([tier, container]) => {
    if (!container) return;
    container.innerHTML = '';

    getMinistriesByTier(tier).forEach(ministry => {
      const holder = getMinistryHolder(ministry.id);
      const holderParty = holder ? parties.find(p => p.id === holder) : null;
      const isAssigned = !!holderParty;
      const isCoreHeld = holder === corePartyId;

      const slot = document.createElement('div');
      slot.className = `cabinet-slot ${isAssigned ? 'assigned' : ''} ${isCoreHeld ? 'core-locked' : ''}`;
      slot.dataset.ministryId = ministry.id;

      // STEP 25: Core Party slots get a lock icon
      const lockIcon = isCoreHeld ? '🔒 ' : '';

      slot.innerHTML = `
        <div class="cabinet-slot__header">
          <span class="cabinet-slot__icon">${ministry.icon}</span>
          <span class="cabinet-slot__name">${ministry.name}</span>
          <span class="cabinet-slot__tier-badge tier-${tier.toLowerCase()}">${tier}</span>
        </div>
        <div class="cabinet-slot__thai">${ministry.nameThai}</div>
        <div class="cabinet-slot__holder ${isAssigned ? 'filled' : 'empty'}" ${isAssigned ? `style="background:${holderParty.color}22; border:1px solid ${holderParty.color}44"` : ''}>
          ${isAssigned
          ? `<span class="cabinet-slot__holder-dot" style="background:${holderParty.color}"></span>${lockIcon}${holderParty.shortName}`
          : 'Click to assign'
        }
        </div>
      `;

      slot.addEventListener('click', () => _handleSlotClick(ministry.id));
      container.appendChild(slot);
    });
  });
}

/**
 * renderCabinetRoster() — STEP 29: Renders the coalition party list in the right panel.
 * Uses dynamic seat data from currentParliamentSeats (STEP 28).
 * Core Party pinned to top, all others sorted by seat count (high → low).
 */
function renderCabinetRoster(coalitionParties) {
  if (!DOM.cabinetPartyList) return;
  DOM.cabinetPartyList.innerHTML = '';

  const corePartyId = getPlayerCorePartyId();
  const demands = computePartyDemands(coalitionParties);

  // STEP 28/29: Get dynamic seat data for accurate counts
  const seatData = (typeof getCurrentParliamentSeats === 'function') ? getCurrentParliamentSeats() : null;

  // STEP 29: Sort — Core Party first, then by dynamic seats (highest to lowest)
  demands.sort((a, b) => {
    if (a.partyId === corePartyId) return -1;
    if (b.partyId === corePartyId) return 1;
    // Use dynamic seat data for sorting if available
    const aSeats = seatData ? (seatData.find(p => p.id === a.partyId)?.seats ?? a.seats) : a.seats;
    const bSeats = seatData ? (seatData.find(p => p.id === b.partyId)?.seats ?? b.seats) : b.seats;
    return bSeats - aSeats;
  });

  demands.forEach(demand => {
    const isCore = demand.partyId === corePartyId;
    const isSelected = _selectedCabinetPartyId === demand.partyId;

    // STEP 29: Get real seat count from dynamic data
    const dynamicEntry = seatData ? seatData.find(p => p.id === demand.partyId) : null;
    const realSeats = dynamicEntry ? dynamicEntry.seats : demand.seats;
    const realSeatShare = Math.round((realSeats / 500) * 100);

    const chip = document.createElement('div');
    chip.className = `cabinet-party-chip ${isSelected ? 'active' : ''} ${isCore ? 'core-party' : ''}`;
    chip.dataset.partyId = demand.partyId;

    const portfolio = getPartyPortfolio(demand.partyId);
    const portfolioText = portfolio.length > 0
      ? portfolio.map(m => m.icon).join(' ')
      : 'None';

    // STEP 25: Core Party gets a lock badge
    const coreBadge = isCore
      ? '<span class="cabinet-core-badge">🔒 YOUR PARTY</span>'
      : '';

    chip.innerHTML = `
      <div class="cabinet-party-chip__dot" style="background:${demand.color}"></div>
      <div class="cabinet-party-chip__info">
        <div class="cabinet-party-chip__name">${demand.partyName} ${coreBadge}</div>
        <div class="cabinet-party-chip__meta">
          ${realSeatShare}% seats · Wants ${demand.minTierA}× Tier A · ${portfolioText}
        </div>
      </div>
      <div class="cabinet-party-chip__seats">${realSeats}</div>
    `;

    chip.addEventListener('click', () => {
      _selectedCabinetPartyId = demand.partyId;
      renderCabinetRoster(coalitionParties);
    });

    DOM.cabinetPartyList.appendChild(chip);
  });
}

/**
 * updateSatisfactionPreview() — Shows live satisfaction meters.
 */
function updateSatisfactionPreview(coalitionParties) {
  if (!DOM.cabinetSatisfaction) return;

  const satisfaction = calculateCabinetSatisfaction(coalitionParties);

  let html = '<div class="satisfaction-preview__title">📊 Predicted Satisfaction</div>';

  coalitionParties.forEach(party => {
    const score = satisfaction[party.id] || 0;
    const level = score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low';
    const color = score >= 65 ? 'var(--green-400)' : score >= 40 ? 'var(--gold-400)' : 'var(--red-400)';

    html += `
      <div class="satisfaction-row">
        <span class="satisfaction-row__name">${party.shortName}</span>
        <div class="satisfaction-row__bar">
          <div class="satisfaction-row__fill ${level}" style="width:${score}%"></div>
        </div>
        <span class="satisfaction-row__value" style="color:${color}">${score}</span>
      </div>
    `;
  });

  DOM.cabinetSatisfaction.innerHTML = html;
}

/**
 * _handleSlotClick() — Assigns the selected party to a ministry slot.
 * STEP 25: Prevents unassigning ministries from the Core Party.
 */
function _handleSlotClick(ministryId) {
  if (!_selectedCabinetPartyId) {
    showToast("Select a party first from the right panel.", "warning");
    return;
  }

  const currentHolder = getMinistryHolder(ministryId);
  const corePartyId = getPlayerCorePartyId();

  // If clicking same assignment, unassign instead
  if (currentHolder === _selectedCabinetPartyId) {
    // STEP 25: Prevent unassigning the Core Party's ministries
    if (currentHolder === corePartyId) {
      showToast("Cannot remove your own party from a ministry. Assign another party to replace.", "warning");
      return;
    }
    unassignMinistry(ministryId);
  } else {
    assignMinistry(_selectedCabinetPartyId, ministryId);
  }

  const coalitionParties = parties.filter(p => p.inCoalition);
  renderCabinetSlots();
  renderCabinetRoster(coalitionParties);
  updateSatisfactionPreview(coalitionParties);
  _updateCabinetFooter();
}

/**
 * _updateCabinetFooter() — Updates unassigned count and enables/disables form button.
 */
function _updateCabinetFooter() {
  const unassigned = getUnallocatedMinistries().length;
  if (DOM.cabinetUnassignedCount) {
    DOM.cabinetUnassignedCount.textContent = unassigned;
  }

  // Enable form button when at least half are assigned
  if (DOM.btnCabinetForm) {
    const assigned = MINISTRIES.length - unassigned;
    DOM.btnCabinetForm.disabled = assigned < Math.ceil(MINISTRIES.length * 0.5);
  }
}

/**
 * autoAssignCabinet() — AI auto-assigns ministries based on party demands.
 * Greedy algorithm: largest party picks first from their preferred list.
 */
function autoAssignCabinet() {
  resetCabinet();

  const coalitionParties = parties.filter(p => p.inCoalition);
  const demands = computePartyDemands(coalitionParties)
    .sort((a, b) => b.seats - a.seats); // Largest party picks first

  const assigned = new Set();

  // Round 1: Each party gets their top preferred ministry
  demands.forEach(demand => {
    for (const mId of demand.idealMinistries) {
      if (!assigned.has(mId)) {
        assignMinistry(demand.partyId, mId);
        assigned.add(mId);
        break;
      }
    }
  });

  // Round 2: Distribute remaining by seat share
  demands.forEach(demand => {
    const targetCount = Math.max(1, Math.round(
      (demand.seatShare / 100) * MINISTRIES.length
    ));
    const currentCount = getPartyPortfolio(demand.partyId).length;

    for (let i = currentCount; i < targetCount; i++) {
      // Try preferred first
      for (const mId of demand.idealMinistries) {
        if (!assigned.has(mId)) {
          assignMinistry(demand.partyId, mId);
          assigned.add(mId);
          break;
        }
      }
    }
  });

  // Round 3: Assign remaining ministries to largest party
  MINISTRIES.forEach(m => {
    if (!assigned.has(m.id) && demands.length > 0) {
      // Give to largest party with fewest ministries
      const sorted = [...demands].sort((a, b) => {
        const aCount = getPartyPortfolio(a.partyId).length;
        const bCount = getPartyPortfolio(b.partyId).length;
        return aCount - bCount;
      });
      assignMinistry(sorted[0].partyId, m.id);
      assigned.add(m.id);
    }
  });

  // Refresh UI
  renderCabinetSlots();
  renderCabinetRoster(coalitionParties);
  updateSatisfactionPreview(coalitionParties);
  _updateCabinetFooter();

  showToast("Ministries auto-assigned based on party demands.", "info");
}

/**
 * handleCabinetFormation() — Finalizes cabinet and applies effects.
 */
function handleCabinetFormation() {
  const coalitionParties = parties.filter(p => p.inCoalition);
  const result = finalizeCabinet(coalitionParties);

  // Close cabinet
  closeCabinetRoom();

  // Show formation results
  result.warnings.forEach(w => showToast(w, "warning"));

  // Show summary toast
  if (result.avgSatisfaction >= 65) {
    showToast(`Cabinet formed! Avg satisfaction: ${result.avgSatisfaction}%. Coalition stable. ✅`, "success");
  } else if (result.avgSatisfaction >= 40) {
    showToast(`Cabinet formed. Avg satisfaction: ${result.avgSatisfaction}%. Some partners are unhappy. ⚠️`, "warning");
  } else {
    showToast(`Cabinet formed under protest! Avg satisfaction: ${result.avgSatisfaction}%. Defections likely! 🚨`, "error");
  }

  // Update all UI
  updateStatusBar();
  renderParliament();

  // STEP 215: Initialize Ministry Control state after cabinet is formed
  if (typeof initMinistries === 'function') {
    initMinistries();
    renderMinistryControl();
  }
}

// Cabinet button listeners
if (DOM.btnCabinetAuto) {
  DOM.btnCabinetAuto.addEventListener('click', autoAssignCabinet);
}
if (DOM.btnCabinetReset) {
  DOM.btnCabinetReset.addEventListener('click', () => {
    resetCabinet();
    _selectedCabinetPartyId = null;
    const coalitionParties = parties.filter(p => p.inCoalition);
    renderCabinetSlots();
    renderCabinetRoster(coalitionParties);
    updateSatisfactionPreview(coalitionParties);
    _updateCabinetFooter();
    showToast("All assignments cleared.", "info");
  });
}
if (DOM.btnCabinetForm) {
  DOM.btnCabinetForm.addEventListener('click', handleCabinetFormation);
}


// ═══════════════════════════════════════════════════════════════════
// BOOT SEQUENCE — Determines which screen to show on page load.
// Priority: 1) cabinet_formation → STEP 23: Return from party selection
//           2) Saved UI state = 'dashboard' → restore game
//           3) STRICT FALLBACK → Start Screen (default/wipe)
// ═══════════════════════════════════════════════════════════════════
(function onPageLoad() {
  const uiState = localStorage.getItem('maingame_ui_state');

  // ── STEP 23: Returning from Campaign party selection ──
  // campaign/main.js sets this state before redirecting back here
  if (uiState === 'cabinet_formation') {
    console.log('[main-game/main.js] STEP 23 — Returning from party selection → launching New Game + Cabinet Formation');
    localStorage.removeItem('maingame_ui_state');
    // initGame(false) will reset state, then openCabinetRoom() fires because cabinet isn't formed
    initGame(false);
    return;
  }

  // Check if we were on the dashboard (language-change reload)
  if (uiState === 'dashboard') {
    try {
      console.log('[main-game/main.js] Restoring dashboard after reload...');
      initGame(hasSavedGame());
      return;
    } catch (e) {
      // If restore fails (e.g. corrupt data after partial wipe), fall through to start screen
      console.warn('[main-game/main.js] Dashboard restore failed, falling back to start screen:', e);
      localStorage.removeItem('maingame_ui_state');
    }
  }

  // ── STRICT FALLBACK: Force Start Screen ──
  // This runs when:
  //   - Fresh first visit (no saved state)
  //   - After Wipe Save Data (all state keys cleared)
  //   - After game over / manual quit
  //   - After failed dashboard restore
  console.log('[main-game/main.js] No saved state — showing Start Screen.');

  // Show/hide Load Game button based on whether a save exists
  if (hasSavedGame()) {
    DOM.btnLoadGame.style.display = "inline-flex";
  } else {
    DOM.btnLoadGame.style.display = "none";
  }

  // Explicitly force start screen
  showScreen("start-screen");
})();

