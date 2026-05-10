// ═══════════════════════════════════════════════════════════════════
// TPS CAMPAIGN MODULE — main.js
// UI Binding: Party select, Dashboard, D3 Map, Roster, Election
// ═══════════════════════════════════════════════════════════════════

// ─── SCREEN MANAGEMENT ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ─── VARIABLES ──────────────────────────────────────────────────
let selectedPartyId = null;
let selectedDifficulty = 'normal';  // Default difficulty
let currentAction = null;
let editingMpId = null;
let mapProjection = null;
let mapPath = null;
let geoData = null;

// ═══════════════════════════════════════════════════════════════════
// SCREEN 1: PARTY SELECT
// ═══════════════════════════════════════════════════════════════════

function renderPartyCards() {
  const container = document.getElementById('party-cards');
  container.innerHTML = '';
  CAMPAIGN_PARTIES.forEach(p => {
    const card = document.createElement('div');
    card.className = 'party-card';
    card.dataset.partyId = p.id;
    card.style.setProperty('--pc', p.color);
    card.querySelector;
    card.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${p.color}"></div>
      <div class="pc-top">
        <div class="pc-dot" style="background:${p.color};color:${p.color}"></div>
        <span class="pc-name">${p.name}</span>
        <span class="pc-short">${p.shortName}</span>
      </div>
      <div class="pc-ideology">${p.ideology} · ${p.thaiName}</div>
      <div class="pc-leader">Leader: <strong>${p.leader}</strong></div>
      <div class="pc-desc">${p.description}</div>
      <div class="pc-stats">
        <span class="pc-stat">📊 ${p.basePopularity}% base</span>
        <span class="pc-stat">💰 ฿${p.campaignFunds}M</span>
        <span class="pc-stat">🏘️ Ban Yai: ${p.banYaiNetwork}%</span>
        <span class="pc-stat">📱 IO: ${p.ioStrength}%</span>
      </div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.party-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPartyId = p.id;
      document.getElementById('btn-start-campaign').disabled = false;
    });
    container.appendChild(card);
  });
}

document.getElementById('btn-start-campaign').addEventListener('click', () => {
  if (!selectedPartyId) return;

  // ── STEP 24: Intercept — If we came from Main Game "New Game", redirect back ──
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('return_to') === 'cabinet') {
    // Save the selected party to localStorage (source of truth for all modules)
    localStorage.setItem('campaign_party_id', selectedPartyId);
    console.log(`[campaign/main.js] STEP 24 — Party selected for Cabinet: "${selectedPartyId}"`);

    // STEP 27: Flag entry mode so main-game knows to use RNG seats (not campaign results)
    localStorage.setItem('game_entry_mode', 'quick_start');

    // Signal main-game boot sequence to open Cabinet Formation on arrival
    localStorage.setItem('maingame_ui_state', 'cabinet_formation');

    // Redirect BACK to main-game — boot sequence will detect 'cabinet_formation'
    window.location.href = '../main-game/index.html';
    return; // ← Prevent normal campaign loop from starting
  }

  // ── STEP 151: Opposition Mode Crossroads ──
  // If the player entered from the Opposition intro, save party data and redirect
  const gameMode = localStorage.getItem('tps_game_mode');
  if (gameMode === 'opposition') {
    const party = CAMPAIGN_PARTIES.find(p => p.id === selectedPartyId);
    if (party) {
      // Save party data for the Opposition module's Affiliation badge (STEP 150)
      localStorage.setItem('tps_player_party', JSON.stringify({
        id: party.id,
        name: party.name,
        shortName: party.shortName,
        color: party.color
      }));
    }
    localStorage.setItem('campaign_party_id', selectedPartyId);

    // Consume the game mode flag to prevent sticky routing on future visits
    localStorage.removeItem('tps_game_mode');

    console.log(`[campaign/main.js] STEP 151 — Opposition mode: Party "${selectedPartyId}" selected. Redirecting to Opposition HQ.`);
    window.location.href = '../opposition/index.html';
    return; // ← Prevent normal campaign loop from starting
  }

  // ── Normal campaign flow (unchanged) ──
  // Save difficulty permanently to localStorage
  localStorage.setItem('tps_difficulty', selectedDifficulty);
  TPSGlobalState.difficulty = selectedDifficulty;
  console.log(`[campaign/main.js] Difficulty locked: ${selectedDifficulty}`);

  // ── STEP 66: Persist balance mode ──
  const balanceModeEl = document.querySelector('input[name="balanceMode"]:checked');
  const selectedBalanceMode = balanceModeEl ? balanceModeEl.value : 'default';
  localStorage.setItem('tps_balance_mode', selectedBalanceMode);
  console.log(`[campaign/main.js] Balance mode locked: ${selectedBalanceMode}`);

  initCampaignState(selectedPartyId);
  const party = CAMPAIGN_PARTIES.find(p => p.id === selectedPartyId);
  campaignState.playerFunds = party.campaignFunds;

  // STEP 76: Lock in base 50/50 shared stats for new game
  // Both politicalCapital and localPopularity start at 50 (from INITIAL_CAMPAIGN_STATE)
  // Write immediately so Parliament module reads the exact same baseline
  campaignState.politicalCapital = 50;
  campaignState.localPopularity = 50;
  campaignState.influence = 50; // STEP 82: starting influence
  localStorage.setItem('tps_funds', String(campaignState.playerFunds));
  localStorage.setItem('tps_capital', '50');
  localStorage.setItem('tps_local_pop', '50');
  localStorage.setItem('tps_scrutiny', '0');
  localStorage.setItem('tps_influence', '50'); // STEP 82
  console.log('[campaign/main.js] STEP 76/79 — Base shared stats locked: Capital=50, LocalPop=50, Influence=40, Funds=' + campaignState.playerFunds);

  // Initialize the Unified Time Engine (Part 2)
  initCampaignTimeline();

  // ── STEP 2 FIX: Persist UI state so language reload doesn't reset ──
  localStorage.setItem('campaign_ui_state', 'dashboard');
  localStorage.setItem('campaign_party_id', selectedPartyId);
  _saveCampaignToStorage();
  console.log('[campaign/main.js] UI state saved: dashboard');

  showScreen('screen-campaign');
  renderDashboard();
  initMap();
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN 2: CAMPAIGN DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function renderDashboard() {
  // Header
  document.getElementById('week-number').textContent = CampaignCalendar.getWeek();
  document.getElementById('year-badge').textContent = `${campaignState.electionYear} Election — Day ${CampaignCalendar.currentDay}`;
  document.getElementById('val-funds').textContent = campaignState.playerFunds;
  document.getElementById('val-scrutiny').textContent = campaignState.playerScrutiny;
  document.getElementById('val-ap').textContent = campaignState.actionPointsRemaining;

  // STEP 53: Update AP badge in command grid
  const apBadge = document.getElementById('ap-badge');
  if (apBadge) apBadge.textContent = `${campaignState.actionPointsRemaining} AP`;

  // ── STEP 55: EC Scrutiny Warning Bar ──
  _updateScrutinyBar(campaignState.playerScrutiny);

  // ── STEP 18: Active Party Identity Indicator ──
  const partyId = selectedPartyId || localStorage.getItem('campaign_party_id');
  if (partyId) {
    const party = CAMPAIGN_PARTIES.find(p => p.id === partyId);
    if (party) {
      const dot = document.getElementById('player-party-color-dot');
      const nameEl = document.getElementById('player-party-name');
      if (dot) dot.style.background = party.color;
      if (nameEl) nameEl.textContent = party.name;
    }
  }

  // Show election button on final day
  const isCampaignOver = CampaignCalendar.isLastDay();
  document.getElementById('btn-next-day').style.display = isCampaignOver ? 'none' : '';
  document.getElementById('btn-end-week').style.display = isCampaignOver ? 'none' : '';
  document.getElementById('btn-hold-election').style.display = isCampaignOver ? '' : 'none';

  // ── STEP 55: Per-button cost validation (disable if can't afford) ──
  _updateActionButtonStates();

  renderPolls();
  renderCampaignLog();
  renderRoster();
  renderCalendarStrip();
  updateMap();

  // STEP 2 FIX: Auto-save state after every dashboard render
  _saveCampaignToStorage();
}

/**
 * _updateScrutinyBar() — STEP 55/58: Dynamically updates the EC Scrutiny warning bar
 * with color-coded thresholds and danger labels.
 *
 * STEP 58 Thresholds (aligned with user spec):
 *   0–49%:  SAFE (green)  — Normal operations
 *   50–79%: WARNING (amber/orange) — Media asking questions
 *   80–99%: CRITICAL (flashing red) — EC investigation imminent
 *   100%:   GUILLOTINE (handled by evaluateScrutiny in engine.js)
 *
 * @param {number} scrutiny — Current scrutiny value (0-100)
 */
function _updateScrutinyBar(scrutiny) {
  const container = document.getElementById('scrutiny-container');
  const fill = document.getElementById('scrutiny-bar-fill');
  const label = document.getElementById('scrutiny-label');
  if (!container || !fill || !label) return;

  // Determine level based on STEP 58 thresholds
  let level, labelText, tooltipText;
  if (scrutiny < 50) {
    level = 'safe';
    labelText = 'SAFE';
    tooltipText = 'EC Scrutiny — Low risk. Campaign is clean.';
  } else if (scrutiny < 80) {
    level = 'caution';
    labelText = '⚠ WARNING';
    tooltipText = 'EC Scrutiny — Media is watching. Be careful with risky actions.';
  } else {
    level = 'critical';
    labelText = '🔴 CRITICAL';
    tooltipText = 'EC Scrutiny — DANGER! EC investigation imminent. 100% = ใบเหลือง!';
  }

  // Update container level class
  container.className = `resource resource-scrutiny level-${level}`;
  container.title = tooltipText;

  // Update fill bar
  fill.style.width = `${Math.min(100, scrutiny)}%`;
  fill.className = `scrutiny-bar-fill fill-${level}`;

  // Update label
  label.textContent = labelText;
  label.className = `scrutiny-label label-${level}`;

  // Update number color + shake effect at critical
  const valEl = document.getElementById('val-scrutiny');
  if (valEl) {
    if (level === 'safe') {
      valEl.style.color = 'var(--green)';
      valEl.classList.remove('scrutiny-shake');
    } else if (level === 'caution') {
      valEl.style.color = 'var(--amber)';
      valEl.classList.remove('scrutiny-shake');
    } else {
      valEl.style.color = '#ff2d55';
      valEl.classList.add('scrutiny-shake');
    }
  }
}

/**
 * _updateActionButtonStates() — STEP 55: Individually enables/disables
 * each action button based on whether the player can afford its cost.
 * Uses CAMPAIGN_ACTIONS data for cost lookup.
 */
function _updateActionButtonStates() {
  const ap = campaignState.actionPointsRemaining;
  const funds = campaignState.playerFunds;
  const ds = (typeof getDiffScale === 'function') ? getDiffScale() : { costMult: 1 };

  document.querySelectorAll('#action-buttons .action-btn').forEach(btn => {
    const actionId = btn.dataset.action;
    const actionData = (typeof CAMPAIGN_ACTIONS !== 'undefined') ? CAMPAIGN_ACTIONS[actionId] : null;

    if (!actionData) {
      // Fallback: just check AP
      btn.disabled = ap <= 0;
      return;
    }

    const fundsCost = Math.round((actionData.costFunds || 0) * ds.costMult);
    const canAfford = ap >= actionData.costAP && funds >= fundsCost;
    btn.disabled = !canAfford;

    // Update cost display with difficulty-adjusted values
    const costEl = btn.querySelector('.act-cost');
    if (costEl && fundsCost > 0) {
      const costParts = [];
      if (fundsCost > 0) costParts.push(`-${fundsCost}M฿`);
      if (actionData.costCapital > 0) costParts.push(`-${actionData.costCapital} Cap`);
      costParts.push(`-${actionData.costAP} AP`);
      costEl.textContent = costParts.join(' · ');
    }
  });
}

// ─── Polls ──────────────────────────────────────────────────────
function renderPolls() {
  const container = document.getElementById('poll-bars');
  container.innerHTML = '';
  const sorted = CAMPAIGN_PARTIES.map(p => ({
    ...p, share: campaignState.nationalPollShare[p.id] || 0
  })).sort((a, b) => b.share - a.share);

  sorted.forEach(p => {
    const isPlayer = p.id === campaignState.playerPartyId;
    // STEP 72: Format decimal polls cleanly
    const displayPoll = Number.isInteger(p.share) ? `${p.share}%` : `${p.share.toFixed(1)}%`;
    const row = document.createElement('div');
    row.className = 'poll-row';
    row.innerHTML = `
      <span class="poll-name" style="color:${p.color}">${p.shortName}</span>
      <div class="poll-track">
        <div class="poll-fill" style="width:${p.share}%;background:${p.color}${isPlayer ? '' : '99'}">${displayPoll}</div>
      </div>
      <span class="poll-pct">${displayPoll}</span>
    `;
    container.appendChild(row);
  });
}

// ─── Campaign Log ───────────────────────────────────────────────
function renderCampaignLog() {
  const container = document.getElementById('campaign-log');
  if (campaignState.campaignLog.length === 0) {
    container.innerHTML = '<div class="log-empty">Campaign begins. Choose your actions wisely.</div>';
    return;
  }
  container.innerHTML = '';
  [...campaignState.campaignLog].reverse().slice(0, 20).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-week">W${entry.week}</span> ${entry.message}`;
    container.appendChild(div);
  });
}

// ─── Roster ─────────────────────────────────────────────────────
function renderRoster(query = '') {
  const list = document.getElementById('roster-list');
  const roster = query ? searchPlayerMPs(query) : getPlayerRoster();
  document.getElementById('roster-count').textContent = `${roster.length} / ${TOTAL_SEATS}`;

  // Virtual scroll: only render first 50 for performance
  const visible = roster.slice(0, 50);
  list.innerHTML = '';
  visible.forEach(mp => {
    const row = document.createElement('div');
    row.className = `mp-row${mp.isEdited ? ' edited' : ''}`;
    row.innerHTML = `
      <img class="mp-avatar" src="${mp.portraitUrl}" alt="${mp.nickname}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23141c36%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2225%22 text-anchor=%22middle%22 fill=%22%239ba3b8%22 font-size=%2214%22>👤</text></svg>'">
      <div class="mp-info">
        <div class="mp-name-text">${mp.name}</div>
        <div class="mp-meta">"${mp.nickname}" · ${mp.gender === 'female' ? '♀' : '♂'} · ${mp.age}y</div>
      </div>
      <span class="mp-slot">#${mp.slotIndex + 1}</span>
    `;
    row.addEventListener('click', () => openMPEditor(mp.id));
    list.appendChild(row);
  });
  if (roster.length > 50) {
    const more = document.createElement('div');
    more.className = 'log-empty';
    more.textContent = `+ ${roster.length - 50} more MPs. Use search to find specific candidates.`;
    list.appendChild(more);
  }
}

document.getElementById('roster-search-input').addEventListener('input', e => {
  renderRoster(e.target.value);
});

// ─── MP Editor Modal ────────────────────────────────────────────
function openMPEditor(mpId) {
  const mp = getMPById(mpId);
  if (!mp) return;
  editingMpId = mpId;
  document.getElementById('mp-portrait').src = mp.portraitUrl;
  document.getElementById('mp-name-input').value = mp.name;
  document.getElementById('mp-portrait-input').value = mp._portraitOverridden ? mp.portraitUrl : '';
  document.getElementById('mp-edit-title').textContent = `Edit: ${mp.nickname}`;
  document.getElementById('mp-age').textContent = mp.age;
  document.getElementById('mp-influence').textContent = mp.localInfluence;
  document.getElementById('mp-charisma').textContent = mp.charisma;
  document.getElementById('mp-modal').style.display = 'flex';
}

document.getElementById('mp-modal-close').addEventListener('click', () => {
  document.getElementById('mp-modal').style.display = 'none';
});
document.getElementById('mp-modal').addEventListener('click', e => {
  if (e.target.id === 'mp-modal') document.getElementById('mp-modal').style.display = 'none';
});

document.getElementById('btn-save-mp').addEventListener('click', () => {
  if (!editingMpId) return;
  const name = document.getElementById('mp-name-input').value.trim();
  const portrait = document.getElementById('mp-portrait-input').value.trim();
  if (name) editMPName(editingMpId, name);
  if (portrait) editMPPortrait(editingMpId, portrait);
  toast('MP updated!', 'success');
  document.getElementById('mp-modal').style.display = 'none';
  renderRoster();
});

document.getElementById('btn-reset-mp').addEventListener('click', () => {
  if (!editingMpId) return;
  resetMP(editingMpId);
  toast('MP reset to default', 'warning');
  document.getElementById('mp-modal').style.display = 'none';
  renderRoster();
});

// ─── Campaign Actions (STEP 53: Expanded 9-action grid) ─────────
// STEP 55: Track previous scrutiny for threshold warnings
let _prevScrutiny = 0;

document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    _prevScrutiny = campaignState.playerScrutiny; // snapshot before action

    // ── Direct-execute actions (no target required) ──
    if (action === 'fundraise') {
      const result = actionFundraise();
      if (result.success) {
        // STEP 75: Show trust penalty warning if scrutiny is eating into fundraise yield
        const toastType = result.trustPenaltyApplied ? 'warning' : 'success';
        toast(result.message || `Raised ฿${result.amount}M!`, toastType);
      }
      else toast(result.message, 'error');
      _checkScrutinyWarning();
      _checkAndShowGuillotine(); // STEP 57
      renderDashboard();
      return;
    }

    // STEP 54+55 actions — direct execute via engine
    if (['tv_debate', 'grassroots_relief', 'ec_petition', 'media_tour', 'commission_poll'].includes(action)) {
      if (typeof executeAction === 'function') {
        const result = executeAction(action);
        if (result && result.success) {
          const toastType = (result.effects && result.effects.outcome === 'fail') ? 'warning' : 'success';
          toast(result.message || 'Action completed!', toastType);
          // STEP 57: Check guillotine from engine result
          if (result.ecGuillotine) {
            _showECGuillotineModal(result.ecGuillotine);
          }
        }
        else if (result) toast(result.message || 'Not enough resources.', 'error');
      } else {
        toast('Action not yet implemented.', 'warning');
      }
      _checkScrutinyWarning();
      renderDashboard();
      return;
    }

    // ── Target-required actions (show dropdown) ──
    currentAction = action;
    const sel = document.getElementById('target-selector');
    const drop = document.getElementById('target-dropdown');
    const label = document.getElementById('target-label');
    sel.style.display = 'flex';
    drop.innerHTML = '';

    if (action === 'rally') {
      label.textContent = 'Select Province:';
      THAILAND_PROVINCES.forEach(prov => {
        const opt = document.createElement('option');
        opt.value = prov.id;
        opt.textContent = `${prov.name} (${prov.districts} districts)`;
        drop.appendChild(opt);
      });
    } else if (action === 'io_smear') {
      label.textContent = 'Select Rival Party:';
      CAMPAIGN_PARTIES.filter(p => p.id !== campaignState.playerPartyId).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.shortName})`;
        drop.appendChild(opt);
      });
    } else if (action === 'banyai') {
      label.textContent = 'Select District:';
      DISTRICTS.slice(0, 100).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.displayName;
        drop.appendChild(opt);
      });
    }
  });
});

document.getElementById('btn-confirm-action').addEventListener('click', () => {
  const target = document.getElementById('target-dropdown').value;
  _prevScrutiny = campaignState.playerScrutiny; // snapshot
  let result;
  if (currentAction === 'rally') result = actionRally(target);
  else if (currentAction === 'io_smear' && typeof executeAction === 'function') {
    result = executeAction('io_smear', target);
  } else if (currentAction === 'io') result = actionIO(target);
  else if (currentAction === 'banyai') result = actionBanYai(target);
  if (result && result.success) toast(result.message || 'Action completed!', 'success');
  else if (result) toast(result.message, 'error');
  document.getElementById('target-selector').style.display = 'none';
  currentAction = null;
  _checkScrutinyWarning();
  // STEP 57: Guillotine check (from engine result or standalone)
  if (result && result.ecGuillotine) {
    _showECGuillotineModal(result.ecGuillotine);
  } else {
    _checkAndShowGuillotine();
  }
  renderDashboard();
});

document.getElementById('btn-cancel-action').addEventListener('click', () => {
  document.getElementById('target-selector').style.display = 'none';
  currentAction = null;
});

/**
 * _checkScrutinyWarning() — STEP 55: Fires escalating toast warnings
 * when EC Scrutiny crosses danger thresholds after an action.
 *
 * Thresholds:
 *   50% → CAUTION warning (amber)
 *   75% → DANGER warning (error)
 *   90% → CRITICAL warning (error, mentions disqualification)
 */
function _checkScrutinyWarning() {
  const now = campaignState.playerScrutiny;
  const prev = _prevScrutiny;

  if (now >= 90 && prev < 90) {
    setTimeout(() => toast('⚠️ CRITICAL: EC Scrutiny at 90%! Disqualification risk is imminent!', 'error'), 500);
  } else if (now >= 75 && prev < 75) {
    setTimeout(() => toast('🔴 DANGER: EC Scrutiny at 75%! The Election Commission is watching closely.', 'error'), 500);
  } else if (now >= 50 && prev < 50) {
    setTimeout(() => toast('🟡 CAUTION: EC Scrutiny at 50%. Media is asking questions.', 'warning'), 500);
  }
}

/**
 * _checkAndShowGuillotine() — STEP 57: Standalone guillotine check
 * for legacy actions (rally, banyai, fundraise) that don't return
 * ecGuillotine from executeAction(). Calls evaluateScrutiny() directly.
 */
function _checkAndShowGuillotine() {
  if (typeof evaluateScrutiny !== 'function') return;
  const result = evaluateScrutiny();
  if (result && result.triggered) {
    _showECGuillotineModal(result);
  }
}

/**
 * _showECGuillotineModal() — STEP 57: Displays a dramatic blocking modal
 * when the EC Guillotine fires. Shows bilingual penalty breakdown.
 *
 * @param {Object} guillotine — Result from evaluateScrutiny()
 */
function _showECGuillotineModal(guillotine) {
  const modal = document.getElementById('parliament-modal');
  const box = modal.querySelector('.modal-box');

  if (!modal._originalHTML) {
    modal._originalHTML = box.innerHTML;
  }

  const penalties = guillotine.penalties;

  box.innerHTML = `
    <div style="padding:28px;text-align:center;max-height:80vh;overflow-y:auto;">
      <div style="font-size:4rem;margin-bottom:12px;animation:scrutiny-flash 0.8s ease-in-out infinite;">
        ${guillotine.icon}
      </div>
      <h2 style="color:#ff2d55;font-size:1.3rem;font-weight:900;margin-bottom:4px;text-transform:uppercase;letter-spacing:2px;">
        ${guillotine.titleEN}
      </h2>
      <p style="color:#FFB347;font-size:.85rem;font-style:italic;margin-bottom:20px;">
        ${guillotine.titleTH}
      </p>

      <div style="background:rgba(255,45,85,.08);border:1px solid rgba(255,45,85,.3);border-radius:10px;padding:16px;margin-bottom:20px;text-align:left;">
        <p style="color:#e8eaf0;font-size:.85rem;line-height:1.7;margin-bottom:12px;">
          ${guillotine.messageEN.replace(/\\n/g, '<br>')}
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.06);margin:12px 0;">
        <p style="color:#9ba3b8;font-size:.78rem;line-height:1.7;font-style:italic;">
          ${guillotine.messageTH.replace(/\\n/g, '<br>')}
        </p>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
        <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:8px 14px;text-align:center;">
          <div style="font-size:1.1rem;font-weight:900;color:#FF6B7A;">-฿${penalties.legalFees}M</div>
          <div style="font-size:.6rem;color:#9ba3b8;text-transform:uppercase;">Legal Fees</div>
        </div>
        <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:8px 14px;text-align:center;">
          <div style="font-size:1.1rem;font-weight:900;color:#FF6B7A;">-${penalties.pollLoss}%</div>
          <div style="font-size:.6rem;color:#9ba3b8;text-transform:uppercase;">National Polls</div>
        </div>
        <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:8px 14px;text-align:center;">
          <div style="font-size:1.1rem;font-weight:900;color:#FFB347;">→ ${penalties.scrutinyReset}%</div>
          <div style="font-size:.6rem;color:#9ba3b8;text-transform:uppercase;">Scrutiny Reset</div>
        </div>
      </div>

      <button id="btn-dismiss-guillotine" class="btn btn-gold btn-lg" style="width:100%;max-width:300px;">
        ยอมรับผลลัพธ์ · Accept Penalty
      </button>
    </div>
  `;

  // Bind dismiss button
  document.getElementById('btn-dismiss-guillotine').addEventListener('click', () => {
    modal.style.display = 'none';
    _restoreParliamentModal();
    renderDashboard();
  });

  modal.style.display = 'flex';
}

// ─── Daily Advancement (NEW — Part 2) ───────────────────────────

/**
 * renderCalendarStrip() — Renders the unified 7-day calendar strip
 * showing the current week with day type coloring.
 */
function renderCalendarStrip() {
  const container = document.getElementById('cal-strip-days');
  if (!container) return;

  const weekDays = getCurrentWeekCalendarData();
  container.innerHTML = '';

  weekDays.forEach(day => {
    const cell = document.createElement('div');
    cell.className = `cal-day-cell type-${day.type}`;
    if (day.isCurrent) cell.classList.add('is-current');
    if (day.isPast) cell.classList.add('is-past');
    cell.style.position = 'relative';

    cell.innerHTML = `
      <span class="cal-dow">${day.dayName}</span>
      <span class="cal-icon">${day.icon}</span>
      <span class="cal-num">${day.day}</span>
      <span class="cal-type">${day.isParliament ? '🏛️' : day.type === 'rest' ? '🌙' : ''}</span>
    `;
    container.appendChild(cell);
  });
}

// ─── Next Day Button ─────────────────────────────────────────────
document.getElementById('btn-next-day').addEventListener('click', () => {
  const result = advanceCampaignDay();
  if (!result) return;

  if (result.type === 'campaign_end') {
    toast(result.message, 'warning');
    document.getElementById('btn-next-day').style.display = 'none';
    document.getElementById('btn-end-week').style.display = 'none';
    document.getElementById('btn-hold-election').style.display = '';
    renderDashboard();
    return;
  }

  // Parliament Day? Show modal
  if (result.isParliament) {
    _showParliamentModal(result);
  } else {
    // v1.0.2: Check for Campaign Random Event FIRST (higher priority)
    const randomEvt = (typeof rollCampaignEvent === 'function')
      ? rollCampaignEvent(CampaignCalendar.getWeek())
      : null;

    if (randomEvt) {
      _showCampaignEventModal(randomEvt);
    } else {
      // Fall back to lobbyist event
      const event = rollLobbyistEvent(25);
      if (event) {
        _showLobbyistModal(event);
      } else {
        toast(`☀️ ${result.dayName} (${result.dayNameThai}) — ${result.dayType.label}`, 'info');
      }
    }
  }

  // STEP 74: Show stat penalty warnings
  if (result.statPenalties && result.statPenalties.length > 0) {
    result.statPenalties.forEach(p => {
      toast(p.message, 'warning');
    });
  }

  renderDashboard();
});

// ─── Skip to Week End Button ─────────────────────────────────────
document.getElementById('btn-end-week').addEventListener('click', () => {
  let lastResult = null;
  let hitParliament = false;

  while (true) {
    if (CampaignCalendar.isLastDay()) break;

    const result = advanceCampaignDay();
    lastResult = result;

    if (result.isParliament) {
      hitParliament = true;
      _showParliamentModal(result);
      break;
    }

    if (result.dayOfWeek === 6) break;
  }

  if (!hitParliament && lastResult) {
    toast(`Fast-forwarded to ${lastResult.dayName}. Week ${lastResult.week}.`, 'info');
  }

  renderDashboard();
});

// ─── Parliament Day Modal ────────────────────────────────────────
function _showParliamentModal(dayResult) {
  const modal = document.getElementById('parliament-modal');
  const title = document.getElementById('parl-modal-title');
  const desc = document.getElementById('parl-modal-desc');

  title.textContent = `🏛️ ${dayResult.dayName} — ${dayResult.dayNameThai}`;

  if (dayResult.dayType.type === 'urgent') {
    desc.textContent = 'An urgent censure motion has been called! The House demands your attendance. Ignoring this will be extremely costly.';
  } else {
    desc.textContent = 'Today is a Parliament session day. As an elected MP, you have a duty to attend. The Speaker is calling the House to order.';
  }

  // STEP 78: Dynamically update the penalty warning text
  const penaltyEl = document.getElementById('parl-modal-penalty');
  if (penaltyEl && typeof getParliamentIgnorePenalty === 'function') {
    const capitalPenalty = getParliamentIgnorePenalty();
    const diff = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty
      : (localStorage.getItem('tps_difficulty') || 'normal');
    const diffLabel = diff === 'easy' ? '🟢 Easy' : diff === 'hard' ? '🔴 Hard' : '🟡 Normal';
    penaltyEl.textContent = `⚠️ Penalty for ignoring: -${capitalPenalty} Political Capital, +3% Scrutiny (${diffLabel})`;
  }

  modal.style.display = 'flex';
}

document.getElementById('btn-enter-parliament').addEventListener('click', () => {
  const choice = handleParliamentChoice('enter');
  document.getElementById('parliament-modal').style.display = 'none';

  if (choice.action === 'redirect') {
    // STEP 3 FIX: Save campaign state to localStorage BEFORE leaving
    saveCampaignState();
    toast(choice.message, 'success');
    setTimeout(() => {
      window.location.href = choice.target;
    }, 800);
  }
});

document.getElementById('btn-ignore-parliament').addEventListener('click', () => {
  const choice = handleParliamentChoice('ignore');
  document.getElementById('parliament-modal').style.display = 'none';

  toast(choice.message, 'warning');
  renderDashboard();
});

// ─── Lobbyist Event Modal ────────────────────────────────────────
function _showLobbyistModal(event) {
  const modal = document.getElementById('parliament-modal');
  const box = modal.querySelector('.modal-box');

  // Store original HTML for restoration
  if (!modal._originalHTML) {
    modal._originalHTML = box.innerHTML;
  }

  box.innerHTML = `
    <div class="lobby-modal-content">
      <h2>${event.title}</h2>
      <p>${event.description}</p>
      <div class="lobby-choices" id="lobby-choices"></div>
    </div>
  `;

  const container = box.querySelector('#lobby-choices');
  event.choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'lobby-choice-btn';

    let effectsHTML = '';
    for (const [key, val] of Object.entries(choice.effects || {})) {
      if (typeof val === 'boolean') continue;
      if (typeof val === 'string') continue;
      const isPos = val > 0;
      // STEP 72: Format decimal values cleanly
      const displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
      effectsHTML += `<span class="${isPos ? 'lobby-effect-pos' : 'lobby-effect-neg'}">${isPos ? '+' : ''}${displayVal} ${key}</span>`;
    }

    btn.innerHTML = `
      <span class="lobby-choice-label">${choice.label}</span>
      <span class="lobby-choice-risk">Risk: ${choice.risk}</span>
      <div class="lobby-choice-effects">${effectsHTML}</div>
    `;

    btn.addEventListener('click', () => {
      applyLobbyistChoice(choice);
      modal.style.display = 'none';
      _restoreParliamentModal();
      toast(`${choice.label} — Applied!`, 'success');
      renderDashboard();
    });

    container.appendChild(btn);
  });

  modal.style.display = 'flex';
}

function _restoreParliamentModal() {
  const modal = document.getElementById('parliament-modal');
  const box = modal.querySelector('.modal-box');
  if (modal._originalHTML) {
    box.innerHTML = modal._originalHTML;
    // Re-bind buttons
    document.getElementById('btn-enter-parliament').addEventListener('click', () => {
      const choice = handleParliamentChoice('enter');
      modal.style.display = 'none';
      if (choice.action === 'redirect') {
        // STEP 3 FIX: Save campaign state to localStorage BEFORE leaving
        saveCampaignState();
        toast(choice.message, 'success');
        setTimeout(() => { window.location.href = choice.target; }, 800);
      }
    });
    document.getElementById('btn-ignore-parliament').addEventListener('click', () => {
      const choice = handleParliamentChoice('ignore');
      modal.style.display = 'none';
      toast(choice.message, 'warning');
      renderDashboard();
    });
  }
}


// ─── v1.0.2: Campaign Random Event Modal ─────────────────────────
function _showCampaignEventModal(event) {
  const modal = document.getElementById('parliament-modal');
  const box = modal.querySelector('.modal-box');

  // Store original HTML for restoration
  if (!modal._originalHTML) {
    modal._originalHTML = box.innerHTML;
  }

  // Build choices HTML
  let choicesHTML = '';
  event.choices.forEach((choice, idx) => {
    let effectsHTML = '';
    for (const [key, val] of Object.entries(choice.effects || {})) {
      if (typeof val === 'boolean') continue; // Skip flags like ioRetaliation
      if (typeof val === 'string') continue;  // Skip string values like localBoost regions
      const isPos = val > 0;
      // STEP 72: Format decimal values cleanly
      const displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .replace('Poll Boost', '📊 Poll')
        .replace('Poll Penalty', '📉 Poll')
        .replace('Rival Penalty', '⚔️ Rival');
      effectsHTML += `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:.7rem;margin:2px;
        background:${isPos ? 'rgba(40,167,69,0.15)' : 'rgba(230,57,70,0.15)'};
        color:${isPos ? '#4ADE80' : '#FF6B7A'}">${isPos ? '+' : ''}${displayVal} ${label}</span>`;
    }

    choicesHTML += `
      <button class="lobby-choice-btn" data-choice-idx="${idx}" style="text-align:left;padding:12px 16px;margin-bottom:8px;width:100%;
        background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;
        cursor:pointer;transition:all 0.15s;color:#e8eaf0;font-family:inherit;">
        <div style="font-weight:700;font-size:.88rem;margin-bottom:4px;">${choice.label}</div>
        <div style="font-size:.72rem;color:#9ba3b8;margin-bottom:6px;">${choice.labelThai || ''}</div>
        <div style="margin-bottom:4px;">${effectsHTML}</div>
        <div style="font-size:.65rem;color:${choice.risk.includes('EXTREME') ? '#FF6B7A' : choice.risk.includes('High') || choice.risk.includes('Very') ? '#FFB347' : '#6b748a'};">
          ⚠️ Risk: ${choice.risk}
        </div>
      </button>
    `;
  });

  box.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:2.5rem;margin-bottom:8px;">${event.icon || '⚡'}</div>
        <div style="display:inline-block;padding:3px 12px;border-radius:12px;font-size:.6rem;font-weight:800;
          letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;
          background:rgba(230,57,70,0.15);color:#FF6B7A;">${event.category.replace(/_/g, ' ')}</div>
        <h2 style="color:var(--gold);font-size:1.1rem;margin-bottom:4px;">${event.title}</h2>
        <p style="color:#9ba3b8;font-size:.72rem;font-style:italic;">${event.titleThai || ''}</p>
      </div>
      <p style="color:#c8cad0;font-size:.85rem;line-height:1.6;margin-bottom:20px;text-align:center;">
        ${event.description}
      </p>
      <div style="font-size:.68rem;font-weight:700;color:#6b748a;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
        Choose Your Response:
      </div>
      <div id="campaign-event-choices">${choicesHTML}</div>
    </div>
  `;

  // Bind choice buttons
  box.querySelectorAll('[data-choice-idx]').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,215,0,0.08)';
      btn.style.borderColor = 'rgba(255,215,0,0.3)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255,255,255,0.03)';
      btn.style.borderColor = 'rgba(255,255,255,0.08)';
    });
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.choiceIdx);
      const choice = event.choices[idx];
      const result = applyCampaignEventChoice(choice, event);

      modal.style.display = 'none';
      _restoreParliamentModal();

      if (result.success) {
        toast(`⚡ ${choice.label} — ${choice.narrative || 'Applied!'}`, 'info');
      } else {
        toast(`⚠️ ${result.error || 'Something went wrong.'}`, 'error');
      }
      renderDashboard();
    });
  });

  modal.style.display = 'flex';
}


document.getElementById('btn-hold-election').addEventListener('click', () => {
  const results = runElection();
  showScreen('screen-election');
  renderElectionResults(results);
});

// ═══════════════════════════════════════════════════════════════════
// D3.js MAP
// ═══════════════════════════════════════════════════════════════════

const GEOJSON_URL = 'https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json';

function initMap() {
  const container = document.getElementById('map-container');
  const svg = d3.select('#thailand-map');
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 400;
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // Render legend
  const legend = document.getElementById('map-legend');
  legend.innerHTML = CAMPAIGN_PARTIES.map(p =>
    `<span class="leg-item"><span class="leg-dot" style="background:${p.color}"></span>${p.shortName}</span>`
  ).join('');

  d3.json(GEOJSON_URL).then(data => {
    geoData = data;
    mapProjection = d3.geoMercator().fitSize([width, height], data);
    mapPath = d3.geoPath().projection(mapProjection);

    svg.selectAll('path')
      .data(data.features)
      .join('path')
      .attr('d', mapPath)
      .attr('fill', '#141c36')
      .attr('stroke', 'rgba(212,175,55,0.15)')
      .attr('stroke-width', 0.5)
      .attr('class', 'map-province')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('stroke', 'var(--gold)').attr('stroke-width', 1.5);
        showMapTooltip(event, d);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke', 'rgba(212,175,55,0.15)').attr('stroke-width', 0.5);
        hideMapTooltip();
      })
      .on('click', function(event, d) {
        const name = d.properties.name || d.properties.NAME_1 || '';
        const prov = THAILAND_PROVINCES.find(p =>
          p.name.toLowerCase() === name.toLowerCase() ||
          name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
        );
        if (prov && currentAction === 'rally') {
          document.getElementById('target-dropdown').value = prov.id;
        }
      });

    updateMap();
  }).catch(err => {
    console.warn('Failed to load GeoJSON:', err);
    svg.append('text').attr('x', width/2).attr('y', height/2)
      .attr('text-anchor', 'middle').attr('fill', '#6b748a').attr('font-size', '12')
      .text('Map data unavailable — using data tables');
  });
}

function updateMap() {
  if (!geoData) return;
  const svg = d3.select('#thailand-map');
  svg.selectAll('.map-province').attr('fill', function(d) {
    const name = d.properties.name || d.properties.NAME_1 || '';
    const prov = THAILAND_PROVINCES.find(p =>
      p.name.toLowerCase() === name.toLowerCase() ||
      name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );
    if (!prov) return '#141c36';
    // Color by leading party
    let maxLean = 0, leadParty = null;
    for (const pid in prov.politicalLean) {
      const val = (prov.politicalLean[pid] || 0) + (campaignState.nationalPollShare[pid] || 0) * 0.3;
      if (val > maxLean) { maxLean = val; leadParty = pid; }
    }
    const party = CAMPAIGN_PARTIES.find(p => p.id === leadParty);
    return party ? party.color + '88' : '#141c36';
  });
}

function showMapTooltip(event, d) {
  const tip = document.getElementById('map-tooltip');
  const name = d.properties.name || d.properties.NAME_1 || 'Unknown';
  const prov = THAILAND_PROVINCES.find(p =>
    p.name.toLowerCase() === name.toLowerCase() ||
    name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
  );
  let html = `<strong style="color:var(--gold)">${name}</strong>`;
  if (prov) {
    html += `<br><span style="color:var(--text3)">${prov.districts} districts · Pop: ${prov.basePop}k</span>`;
    const lean = prov.politicalLean;
    const sorted = Object.entries(lean).sort((a,b) => b[1] - a[1]);
    const top = sorted[0];
    const topParty = CAMPAIGN_PARTIES.find(p => p.id === top[0]);
    if (topParty) html += `<br>Leading: <span style="color:${topParty.color}">${topParty.shortName}</span> (${top[1]}%)`;
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  tip.style.left = (event.offsetX + 12) + 'px';
  tip.style.top = (event.offsetY - 10) + 'px';
}

function hideMapTooltip() {
  document.getElementById('map-tooltip').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN 3: ELECTION NIGHT
// ═══════════════════════════════════════════════════════════════════

function renderElectionResults(results) {
  document.getElementById('election-title').textContent =
    `${campaignState.electionYear} General Election Results`;

  // Results table
  const summary = getElectionSummary();
  const table = document.getElementById('results-table');
  table.innerHTML = `
    <div class="rt-row" style="background:transparent;border:none;font-size:.7rem;color:var(--text3)">
      <div class="rt-dot" style="visibility:hidden"></div>
      <div class="rt-name">Party</div>
      <div class="rt-const"><span class="rt-label">Constituency</span></div>
      <div class="rt-pl"><span class="rt-label">Party List</span></div>
      <div class="rt-total"><span class="rt-label">Total</span></div>
    </div>
  `;
  summary.forEach(p => {
    const row = document.createElement('div');
    row.className = `rt-row${p.isPlayer ? ' player' : ''}`;
    row.innerHTML = `
      <div class="rt-dot" style="background:${p.color}"></div>
      <div class="rt-name">${p.shortName}</div>
      <div class="rt-const"><span class="rt-val">${p.constituencySeats}</span></div>
      <div class="rt-pl"><span class="rt-val">${p.partyListSeats}</span></div>
      <div class="rt-total"><span class="rt-val">${p.totalSeats}</span></div>
    `;
    table.appendChild(row);
  });

  // Donut chart
  renderDonut(summary);

  // Legend
  const legend = document.getElementById('counter-legend');
  legend.innerHTML = '';
  summary.forEach(p => {
    legend.innerHTML += `<div class="leg-row">
      <div class="leg-color" style="background:${p.color}"></div>
      <span class="leg-name">${p.shortName}</span>
      <span class="leg-seats">${p.totalSeats}</span>
    </div>`;
  });
}

function renderDonut(summary) {
  const svg = d3.select('#seat-donut');
  svg.selectAll('*').remove();
  const w = 200, h = 200, r = 80, inner = 55;
  const g = svg.append('g').attr('transform', `translate(${w/2},${h/2})`);
  const pie = d3.pie().value(d => d.totalSeats).sort(null);
  const arc = d3.arc().innerRadius(inner).outerRadius(r);
  g.selectAll('path')
    .data(pie(summary))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => d.data.color)
    .attr('stroke', 'var(--bg)')
    .attr('stroke-width', 2);
  // Center text
  g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em')
    .attr('fill', 'var(--gold)').attr('font-size', '24').attr('font-weight', '800')
    .text('500');
  g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
    .attr('fill', 'var(--text3)').attr('font-size', '10').text('TOTAL SEATS');
}

document.getElementById('btn-to-coalition').addEventListener('click', () => {
  showScreen('screen-coalition');
  renderCoalition();
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN 4: COALITION
// ═══════════════════════════════════════════════════════════════════

function renderCoalition() {
  const coal = coalitionPhase();
  recalcCoalitionSeats();

  document.getElementById('player-seats-display').textContent = coal.playerSeats;
  document.getElementById('seats-needed').textContent = coal.targetSeats;
  updateCoalitionMeter();

  const container = document.getElementById('coalition-offers');
  container.innerHTML = '';
  coal.offers.forEach(offer => {
    const willClass = offer.willingness > 60 ? 'high' : offer.willingness > 35 ? 'mid' : 'low';
    const card = document.createElement('div');
    card.className = 'offer-card';
    card.id = `offer-${offer.partyId}`;
    card.innerHTML = `
      <div class="oc-top">
        <div class="oc-dot" style="background:${offer.color}"></div>
        <span class="oc-name">${offer.partyName}</span>
        <span class="oc-will ${willClass}">${offer.willingness}% willing</span>
        <span class="oc-seats">${offer.seats} <span class="oc-seats-label">seats</span></span>
      </div>
      <div class="oc-demands"><strong>Demands:</strong> ${offer.ministryDemands.join(', ') || 'None'}</div>
      ${offer.conditions.length ? `<div class="oc-conditions">⚠️ ${offer.conditions.join(' · ')}</div>` : ''}
      <div class="oc-btns">
        <button class="btn btn-gold btn-md" onclick="handleAccept('${offer.partyId}')">Accept Alliance</button>
        <button class="btn btn-ghost btn-md" onclick="handleReject('${offer.partyId}')">Decline</button>
      </div>
      <span class="oc-status"></span>
    `;
    container.appendChild(card);
  });
}

function handleAccept(partyId) {
  const result = acceptCoalitionPartner(partyId);
  const card = document.getElementById(`offer-${partyId}`);
  if (result.success) {
    card.classList.add('accepted');
    card.querySelector('.oc-status').textContent = '✅ JOINED';
    toast(result.message, 'success');
  } else {
    card.classList.add('rejected');
    card.querySelector('.oc-status').textContent = '❌ REFUSED';
    toast(result.message, 'error');
  }
  updateCoalitionMeter();
}

function handleReject(partyId) {
  rejectCoalitionPartner(partyId);
  const card = document.getElementById(`offer-${partyId}`);
  card.classList.add('rejected');
  card.querySelector('.oc-status').textContent = '— DECLINED';
}

function updateCoalitionMeter() {
  recalcCoalitionSeats();
  const total = campaignState.coalitionSeats;
  const pct = (total / 500) * 100;
  document.getElementById('coalition-fill').style.width = `${pct}%`;
  document.getElementById('coalition-fill').style.background =
    total >= MAJORITY_THRESHOLD ? 'linear-gradient(90deg,var(--green),#16a34a)' : '';
  document.getElementById('coalition-total').textContent = total;
}

document.getElementById('btn-finalize-coalition').addEventListener('click', () => {
  const result = checkWinLoss();
  showScreen('screen-result');
  renderResult(result);
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN 5: RESULT
// ═══════════════════════════════════════════════════════════════════

function renderResult(result) {
  const isVictory = result.result === 'victory';
  document.getElementById('result-icon').textContent = isVictory ? '🏛️' : '📉';
  const title = document.getElementById('result-title');
  title.textContent = isVictory ? 'GOVERNMENT FORMED!' : 'OPPOSITION BENCHES';
  title.className = `result-title ${isVictory ? 'victory' : 'defeat'}`;
  document.getElementById('result-message').textContent = result.message;

  // Stats
  document.getElementById('result-stats').innerHTML = `
    <div class="rs-item"><div class="rs-label">Coalition Seats</div><div class="rs-val">${result.seats}</div></div>
    <div class="rs-item"><div class="rs-label">Needed</div><div class="rs-val">${result.needed}</div></div>
    <div class="rs-item"><div class="rs-label">${isVictory ? 'Surplus' : 'Deficit'}</div>
      <div class="rs-val" style="color:${isVictory ? 'var(--green)' : 'var(--red)'}">
        ${isVictory ? '+' + result.surplus : '-' + result.deficit}
      </div>
    </div>
  `;

  const btn = document.getElementById('btn-result-action');
  if (isVictory) {
    btn.textContent = 'Enter Government House →';
    btn.className = 'btn btn-gold btn-lg';
    btn.onclick = () => winGame();
  } else {
    btn.textContent = `Lead the Opposition →`;
    btn.className = 'btn btn-danger btn-lg';
    btn.onclick = () => {
      // STEP 205: Enable the infinite campaign loop flag
      localStorage.setItem('tps_campaign_loop', 'true');

      // Ensure baseline election year exists
      if (!localStorage.getItem('tps_current_election_year')) {
        localStorage.setItem('tps_current_election_year', String(campaignState.electionYear || 2027));
      }

      // Persist the player's party for the Opposition module to consume
      // Must be JSON object with {id, name, shortName, color} for loadAffiliation()
      const playerParty = CAMPAIGN_PARTIES.find(p => p.id === campaignState.playerPartyId);
      if (playerParty) {
        localStorage.setItem('tps_player_party', JSON.stringify({
          id: playerParty.id,
          name: playerParty.name,
          shortName: playerParty.shortName,
          color: playerParty.color
        }));
      }

      // STEP 210: WIPE OLD OPPOSITION SAVES (Forces a fresh Month 1)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('tps_opp_') ||
          key.startsWith('tps_shadow_') ||
          key.startsWith('tps_legacy_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log(`[campaign/main.js] STEP 210 — Wiped ${keysToRemove.length} opposition save keys.`);

      // Send to Opposition intro screen
      window.location.href = '../opposition/intro.html';
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════

/**
 * _checkReturnFromParliament() — Step 2 fix.
 * If the player is returning from Parliament, skip Party Select
 * and jump straight to the active Campaign Dashboard.
 * Consumes parliament return data (bonus capital, etc.) from sessionStorage.
 */
function _checkReturnFromParliament() {
  if (localStorage.getItem('returnFromParliament') !== 'true') return false;

  console.log('[campaign/main.js] Return from Parliament detected — bypassing Party Select.');
  localStorage.removeItem('returnFromParliament');

  // STEP 3 FIX: Try loadCampaignState() from localStorage FIRST (most reliable)
  let restored = false;
  if (typeof loadCampaignState === 'function') {
    restored = loadCampaignState();
    if (restored) {
      console.log('[campaign/main.js] Campaign state restored from localStorage (engine.js).');
    }
  }

  // Fallback: try sessionStorage
  if (!restored) {
    try {
      const savedState = sessionStorage.getItem('tps_campaign_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        Object.assign(campaignState, parsed);
        restored = true;
        console.log('[campaign/main.js] Campaign state restored from sessionStorage (fallback).');
        // STEP 86: Re-apply localStorage stats to override stale session values
        if (typeof _loadStatsFromStorage === 'function') _loadStatsFromStorage();
      }
    } catch (e) {
      console.warn('[campaign/main.js] Could not restore campaign state:', e);
    }
  }

  // Last resort: init with default party
  if (!restored) {
    const defaultParty = CAMPAIGN_PARTIES[0];
    initCampaignState(defaultParty.id);
    campaignState.playerFunds = defaultParty.campaignFunds;
    initCampaignTimeline();
    console.log('[campaign/main.js] No saved state found — initialized with default party.');
  } else if (!restored || typeof CampaignCalendar === 'undefined') {
    // Only re-init timeline if loadCampaignState didn't set the calendar
    initCampaignTimeline();
    if (campaignState._calendarDay) {
      CampaignCalendar.currentDay = campaignState._calendarDay;
    }
  }

  // Consume parliament return data (bonus effects)
  try {
    const parlReturn = sessionStorage.getItem('tps_parliament_to_campaign');
    if (parlReturn) {
      const data = JSON.parse(parlReturn);
      sessionStorage.removeItem('tps_parliament_to_campaign');

      // Apply capital bonus (earned from debates/protests/votes)
      if (data.capitalChange) {
        // Convert parliament capital to campaign scrutiny reduction
        const scrutinyReduction = Math.floor(data.capitalChange / 3);
        campaignState.playerScrutiny = Math.max(0, campaignState.playerScrutiny - scrutinyReduction);
        console.log(`[campaign/main.js] Parliament capital → Scrutiny reduced by ${scrutinyReduction}`);
      }

      // Log the return
      campaignState.campaignLog.push({
        week: CampaignCalendar.getWeek(),
        type: 'parliament',
        message: `🏛️ Returned from Parliament — ${data.debatesCompleted || 0} debates, ${data.protestsWon || 0} protests won, ${data.votesAttended || 0} votes`
      });

      toast(`🏛️ Welcome back! Parliament results applied.`, 'success');
    }
  } catch (e) {
    console.warn('[campaign/main.js] Could not consume parliament return data:', e);
  }

  // Skip to dashboard
  showScreen('screen-campaign');
  renderDashboard();
  initMap();

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 209: Return from Opposition — The Inheritance Protocol
// If tps_apply_legacy is set, start a FRESH campaign with legacy buffs.
// ═══════════════════════════════════════════════════════════════════

function _checkReturnFromOpposition() {
  if (localStorage.getItem('tps_apply_legacy') !== 'true') return false;

  console.log('[campaign/main.js] STEP 209 — Return from Opposition detected. Starting fresh campaign with legacy buffs.');

  // 1. Consume the flag immediately (prevent double-fire on refresh)
  localStorage.removeItem('tps_apply_legacy');

  // 2. Read the saved party (JSON object from campaign defeat handler)
  let partyId = null;
  try {
    const partyData = localStorage.getItem('tps_player_party');
    if (partyData) {
      const parsed = JSON.parse(partyData);
      partyId = parsed.id || null;
    }
  } catch (e) {
    console.warn('[campaign/main.js] Could not parse tps_player_party:', e);
  }

  // Fallback: use campaign_party_id or first party
  if (!partyId) {
    partyId = localStorage.getItem('campaign_party_id') || CAMPAIGN_PARTIES[0].id;
  }

  // 3. WIPE stale shared stats (prevents _loadStatsFromStorage from reloading old scrutiny)
  localStorage.removeItem('tps_scrutiny');
  localStorage.removeItem('tps_capital');
  localStorage.removeItem('tps_local_pop');
  localStorage.removeItem('tps_influence');
  localStorage.removeItem('tps_funds');

  // 4. Initialize a FRESH campaign state (Day 1, Week 1)
  initCampaignState(partyId);
  const party = CAMPAIGN_PARTIES.find(p => p.id === partyId);
  if (party) {
    campaignState.playerFunds = party.campaignFunds;
  }

  // 4. Apply legacy buffs (these were saved by calculateEndGameStats in opposition)
  const legacyFunds = parseInt(localStorage.getItem('tps_legacy_funds')) || 0;
  const legacyPolls = parseInt(localStorage.getItem('tps_legacy_polls')) || 0;

  if (legacyFunds > 0) {
    campaignState.playerFunds += legacyFunds;
    console.log(`[campaign/main.js] STEP 209 — Legacy funds buff: +฿${legacyFunds}M → Total: ฿${campaignState.playerFunds}M`);
  }

  if (legacyPolls > 0 && partyId) {
    campaignState.nationalPollShare[partyId] =
      (campaignState.nationalPollShare[partyId] || 20) + legacyPolls;

    // Re-normalize all poll shares to 100%
    const totalPoll = Object.values(campaignState.nationalPollShare).reduce((a, b) => a + b, 0);
    if (totalPoll > 0) {
      for (const pid in campaignState.nationalPollShare) {
        campaignState.nationalPollShare[pid] = Math.round((campaignState.nationalPollShare[pid] / totalPoll) * 1000) / 10;
      }
    }
    console.log(`[campaign/main.js] STEP 209 — Legacy polls buff: +${legacyPolls}% → Player: ${campaignState.nationalPollShare[partyId]}%`);
  }

  // 5. Set the dynamic election year
  const storedYear = localStorage.getItem('tps_current_election_year');
  if (storedYear) {
    campaignState.electionYear = parseInt(storedYear) || 2027;
  }

  // 6. Clean up consumed keys
  localStorage.removeItem('tps_legacy_funds');
  localStorage.removeItem('tps_legacy_polls');

  // 7. Set globals
  selectedPartyId = partyId;
  selectedDifficulty = localStorage.getItem('tps_difficulty') || 'normal';
  TPSGlobalState.difficulty = selectedDifficulty;

  // 8. Initialize timeline (fresh Day 1)
  initCampaignTimeline();

  // 9. Save the fresh state & persist UI flag
  localStorage.setItem('campaign_ui_state', 'dashboard');
  localStorage.setItem('campaign_party_id', partyId);
  _saveCampaignToStorage();

  // 10. Show the dashboard
  showScreen('screen-campaign');
  renderDashboard();
  initMap();

  // 11. Show legacy toast (delayed so UI is ready)
  setTimeout(() => {
    const yearLabel = campaignState.electionYear || '2027';
    let msg = `🏛️ ${yearLabel} Election — Fresh Campaign Started!`;
    if (legacyFunds > 0 || legacyPolls > 0) {
      msg += ` Legacy: +฿${legacyFunds}M Funds, +${legacyPolls}% Polls`;
    }
    toast(msg, 'success');
  }, 800);

  console.log(`[campaign/main.js] STEP 209 — Fresh ${campaignState.electionYear} campaign initialized for ${partyId}.`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2 FIX: Save/Restore helpers for campaign state persistence
// ═══════════════════════════════════════════════════════════════════

/**
 * _saveCampaignToStorage() — Serializes campaignState to sessionStorage.
 * Called after each state-changing action and on "Begin Campaign".
 */
function _saveCampaignToStorage() {
  try {
    if (campaignState) {
      // Save to sessionStorage (for same-tab restores)
      sessionStorage.setItem('tps_campaign_state', JSON.stringify(campaignState));
      // STEP 3 FIX: Also save to localStorage (survives tab close + parliament trips)
      saveCampaignState();
    }
  } catch (e) {
    console.warn('[campaign/main.js] Could not save campaign state:', e);
  }
}

/**
 * _restoreDashboardFromStorage() — Restores the campaign dashboard
 * after a language-change page reload. Reads from localStorage
 * (UI state flag + party ID) and sessionStorage (full campaign state).
 * @returns {boolean} true if dashboard was restored
 */
function _restoreDashboardFromStorage() {
  if (localStorage.getItem('campaign_ui_state') !== 'dashboard') return false;

  const savedPartyId = localStorage.getItem('campaign_party_id');
  if (!savedPartyId) return false;

  console.log('[campaign/main.js] Restoring dashboard after reload...');

  // STEP 3 FIX: Try loadCampaignState() from localStorage FIRST
  // This is the most reliable source — survives tab closes and parliament trips.
  let restored = false;
  if (typeof loadCampaignState === 'function') {
    restored = loadCampaignState();
    if (restored) {
      console.log('[campaign/main.js] Full campaign state restored from localStorage (engine.js).');
    }
  }

  // Fallback: try sessionStorage (for backward compat)
  if (!restored) {
    try {
      const savedState = sessionStorage.getItem('tps_campaign_state');
      if (savedState) {
        initCampaignState(savedPartyId);
        Object.assign(campaignState, JSON.parse(savedState));
        restored = true;
        console.log('[campaign/main.js] Campaign state restored from sessionStorage (fallback).');
      }
    } catch (e) {
      console.warn('[campaign/main.js] Could not restore session data:', e);
    }
  }

  // Last resort: re-initialize with saved party
  if (!restored) {
    initCampaignState(savedPartyId);
    const party = CAMPAIGN_PARTIES.find(p => p.id === savedPartyId);
    if (party) campaignState.playerFunds = party.campaignFunds;
    console.log('[campaign/main.js] No saved data — re-initialized with saved party.');
  }

  // Set globals
  selectedPartyId = savedPartyId;
  selectedDifficulty = localStorage.getItem('tps_difficulty') || 'normal';
  TPSGlobalState.difficulty = selectedDifficulty;

  // Initialize timeline (won't reset calendar if loadCampaignState already set it)
  if (!restored || typeof CampaignCalendar === 'undefined') {
    initCampaignTimeline();
  }

  // Show dashboard
  showScreen('screen-campaign');
  renderDashboard();
  initMap();

  console.log('[campaign/main.js] Dashboard restored successfully.');
  return true;
}

/**
 * clearCampaignUIState() — Clears all campaign persistence.
 * Call this when the player resets progress or returns to main menu.
 */
function clearCampaignUIState() {
  localStorage.removeItem('campaign_ui_state');
  localStorage.removeItem('campaign_party_id');
  sessionStorage.removeItem('tps_campaign_state');
  console.log('[campaign/main.js] Campaign UI state cleared.');
}

// ═══════════════════════════════════════════════════════════════════
// BOOT SEQUENCE — Determines which screen to show on page load.
// Priority: 0) ?return_to=cabinet → Force Party Select (STEP 24)
//           1) Return from Parliament → Dashboard
//           2) Saved UI state → Dashboard (language reload)
//           3) STRICT FALLBACK → Party Select (default/wipe)
// ═══════════════════════════════════════════════════════════════════

// ── STEP 24: If redirected from main-game "New Game", force party selection ──
const _bootUrlParams = new URLSearchParams(window.location.search);
if (_bootUrlParams.get('return_to') === 'cabinet') {
  console.log('[campaign/main.js] STEP 24 — Arrived from Main Game "New Game". Forcing Party Select for Cabinet route.');
  showScreen('screen-party-select');
  renderPartyCards();
  _initDifficultySelector();

  // Update button text to match context — player is selecting for government, not campaign
  const beginBtn = document.getElementById('btn-start-campaign');
  if (beginBtn) {
    beginBtn.textContent = 'Select Party →';
  }
} else if (!_checkReturnFromParliament()) {
  if (!_checkReturnFromOpposition()) {
    if (!_restoreDashboardFromStorage()) {
      // ── STRICT FALLBACK: Force Party Select screen ──
      // This runs when:
      //   - Fresh first visit (no saved state)
      //   - After Wipe Save Data (all state keys cleared)
      //   - After game completion / manual reset
      console.log('[campaign/main.js] No saved state found — showing Party Select.');
      showScreen('screen-party-select');
      renderPartyCards();
      _initDifficultySelector();
    }
  }
}

console.log('[campaign/main.js] UI initialized.');

// ═══════════════════════════════════════════════════════════════════
// DIFFICULTY SELECTOR — Binds the 3-button group on Party Select
// ═══════════════════════════════════════════════════════════════════

/**
 * _initDifficultySelector() — Binds click handlers to Easy/Normal/Hard
 * buttons. Defaults to 'normal'. Selection is final once "Begin Campaign"
 * is clicked (saved to localStorage, never changeable again).
 */
function _initDifficultySelector() {
  const group = document.getElementById('diff-btn-group');
  if (!group) return;

  const buttons = group.querySelectorAll('.diff-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      buttons.forEach(b => b.classList.remove('active'));
      // Set this one active
      btn.classList.add('active');
      selectedDifficulty = btn.dataset.difficulty;
      console.log(`[campaign/main.js] Difficulty selected: ${selectedDifficulty}`);
    });
  });
}
