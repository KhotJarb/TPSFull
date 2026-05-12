// ═══════════════════════════════════════════════════════════════════════════
// TPS — shared/party-creator.js
// Custom Party Creator — Balanced Party Generation for Multiplayer
// ═══════════════════════════════════════════════════════════════════════════
// Allows players to create their own political party for multiplayer lobbies
// when the 5 built-in factions are not enough (e.g., 6-8 player games).
//
// BALANCE SYSTEM:
//   Uses a "Power Budget" system where the total stat allocation is capped
//   relative to the average of existing CAMPAIGN_PARTIES (see data.js).
//   Higher Base Popularity forces lower BanYai/Funds, and vice versa.
//
// EXISTING PARTY BENCHMARKS:
//   basePopularity: 10–30  (avg 20)
//   banYaiNetwork:  5–45   (avg 24)
//   campaignFunds:  600–2000 (avg 1020)
//   ioStrength:     8–40   (avg 20.6)
// ═══════════════════════════════════════════════════════════════════════════


const tpsPartyCreator = (() => {

  // ──────────────────────────────────────────────────────────────────────
  // SECTION 1: BALANCE CONSTRAINTS
  // These values define the fair play boundaries for custom parties.
  // ──────────────────────────────────────────────────────────────────────

  const LIMITS = {
    basePopularity:  { min: 1,   max: 35,   default: 10 },
    banYaiNetwork:   { min: 0,   max: 100,  default: 20 },
    campaignFunds:   { min: 100, max: 1500, default: 800 },
    ioStrength:      { min: 0,   max: 50,   default: 15 },
    partyListStrength: { min: 5, max: 30,   default: 15 },
  };

  // Power budget: weighted sum of stats. Existing parties average ~110.
  // Custom parties should not exceed ~130 (generous but not broken).
  const MAX_POWER_BUDGET = 130;

  // Ideology mapping
  const IDEOLOGY_MAP = [
    { min: 0,  max: 25, label: 'Progressive',  icon: '🔵', id: 'progressive' },
    { min: 26, max: 45, label: 'Centre-Left',   icon: '🟢', id: 'centre_left' },
    { min: 46, max: 55, label: 'Centrist',       icon: '⚖️', id: 'centrist' },
    { min: 56, max: 75, label: 'Centre-Right',  icon: '🟠', id: 'centre_right' },
    { min: 76, max: 100, label: 'Conservative', icon: '🔴', id: 'conservative' },
  ];

  // Thai name pools for random candidate generation
  const RANDOM_FIRST_MALE = [
    'Somchai','Somsak','Prasert','Narong','Sompong','Suchart','Preecha',
    'Boonlert','Thawatchai','Kittisak','Wisanu','Pongsakorn','Anurak',
    'Chaiyaporn','Nattapong','Thanakorn','Panupong','Sirawit','Ekachai',
    'Krisada','Supachai','Teerawat','Apichart','Chatchai','Kriangsak'
  ];
  const RANDOM_FIRST_FEMALE = [
    'Somying','Suda','Nittaya','Pranee','Mayuree','Supaporn','Sasithorn',
    'Jintana','Kannika','Ladda','Narumon','Patcharee','Siriporn',
    'Thidarat','Wanida','Chutima','Rattana','Tasanee','Waraporn',
    'Achara','Benchawan','Duangporn','Kanjana','Raweewan','Tassanee'
  ];
  const RANDOM_LAST = [
    'Wongsawat','Srisawat','Charoensuk','Phanphruk','Buranasiri','Thonglor',
    'Jantarakul','Limcharoen','Petcharat','Rattanaporn','Singhanat',
    'Thammasat','Vivatsiri','Wattanawong','Bunditkul','Chairungsi',
    'Dangprasert','Junlaphan','Kittisunthorn','Lertvilai','Maneekhao',
    'Phanthong','Saengmani','Thongprasert','Wichitchai','Siriwattana'
  ];


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 2: STATE
  // ──────────────────────────────────────────────────────────────────────

  let formState = {
    thaiName: '',
    englishName: '',
    shortCode: '',
    color: '#f97316',
    basePopularity: 10,
    banYaiNetwork: 20,
    ideologyValue: 50,   // 0=Progressive, 100=Conservative
    campaignFunds: 800,
    description: '',
    candidates: [],       // Array of name strings
  };

  let DOM = {};
  let _eventsWired = false;
  let _showCandidateInput = false;


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 3: POWER BUDGET CALCULATOR
  // ──────────────────────────────────────────────────────────────────────

  /**
   * calculatePowerBudget() — Computes a normalized score for balance checking.
   * Weights:
   *   basePopularity × 1.5 (high impact on elections)
   *   banYaiNetwork  × 0.6 (powerful but risky)
   *   campaignFunds  / 25  (normalized from 0-1500 → 0-60)
   *   ioStrength     × 0.5 (auto-calculated)
   * @returns {number} Power score (0-~180, target: ≤130)
   */
  function calculatePowerBudget() {
    const p = formState;
    const ioStr = _deriveIOStrength(p.ideologyValue, p.basePopularity);
    return Math.round(
      (p.basePopularity * 1.5) +
      (p.banYaiNetwork * 0.6) +
      (p.campaignFunds / 25) +
      (ioStr * 0.5)
    );
  }

  /**
   * _deriveIOStrength() — Auto-calculates IO Strength based on ideology.
   * Progressive parties are more social-media-savvy (higher IO).
   * Conservative parties rely on traditional networks (lower IO).
   */
  function _deriveIOStrength(ideologyVal, basePop) {
    // Progressive = high IO, Conservative = low IO
    const ideologyBonus = Math.round(40 - (ideologyVal * 0.35)); // 40 at progressive → 5 at conservative
    const popBonus = Math.round(basePop * 0.2); // slight boost for popular parties
    return Math.max(LIMITS.ioStrength.min, Math.min(LIMITS.ioStrength.max, ideologyBonus + popBonus));
  }

  /**
   * _derivePartyListStrength() — Auto-calc from popularity and ideology.
   */
  function _derivePartyListStrength(basePop, ideologyVal) {
    // Urban/progressive parties tend to have stronger party lists
    const base = Math.round(basePop * 0.6);
    const ideologyMod = ideologyVal < 40 ? 5 : ideologyVal > 70 ? -3 : 0;
    return Math.max(LIMITS.partyListStrength.min, Math.min(LIMITS.partyListStrength.max, base + ideologyMod));
  }

  /**
   * _deriveRegionalStrength() — Generates regional strength map based on ideology.
   */
  function _deriveRegionalStrength(ideologyVal, basePop) {
    const isProgressive = ideologyVal < 35;
    const isConservative = ideologyVal > 65;

    if (isProgressive) {
      return {
        bangkok: 25 + Math.floor(basePop * 0.4),
        central: 15 + Math.floor(basePop * 0.2),
        north: 18 + Math.floor(basePop * 0.2),
        northeast: 12 + Math.floor(basePop * 0.15),
        east: 15 + Math.floor(basePop * 0.1),
        west: 10 + Math.floor(basePop * 0.1),
        south: 5 + Math.floor(basePop * 0.05)
      };
    } else if (isConservative) {
      return {
        bangkok: 10 + Math.floor(basePop * 0.15),
        central: 20 + Math.floor(basePop * 0.25),
        north: 8 + Math.floor(basePop * 0.1),
        northeast: 8 + Math.floor(basePop * 0.1),
        east: 18 + Math.floor(basePop * 0.2),
        west: 22 + Math.floor(basePop * 0.25),
        south: 25 + Math.floor(basePop * 0.35)
      };
    } else {
      // Centrist — spread evenly
      const base = Math.floor(basePop * 0.6);
      return {
        bangkok: 12 + base,
        central: 18 + base,
        north: 15 + base,
        northeast: 13 + base,
        east: 20 + base,
        west: 18 + base,
        south: 12 + base
      };
    }
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 4: RANDOM NAME GENERATOR
  // ──────────────────────────────────────────────────────────────────────

  function _randomThaiName() {
    const isFemale = Math.random() > 0.65;
    const pool = isFemale ? RANDOM_FIRST_FEMALE : RANDOM_FIRST_MALE;
    const first = pool[Math.floor(Math.random() * pool.length)];
    const last = RANDOM_LAST[Math.floor(Math.random() * RANDOM_LAST.length)];
    return `${first} ${last}`;
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 5: DOM MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────

  function _cacheDom() {
    DOM = {
      overlay:        document.getElementById('pc-overlay'),
      closeBtn:       document.getElementById('pc-close-btn'),
      // Text inputs
      inputThaiName:  document.getElementById('pc-thai-name'),
      inputEngName:   document.getElementById('pc-eng-name'),
      inputShortCode: document.getElementById('pc-short-code'),
      inputFunds:     document.getElementById('pc-funds'),
      inputDesc:      document.getElementById('pc-description'),
      // Color
      colorSwatch:    document.getElementById('pc-color-swatch'),
      colorInput:     document.getElementById('pc-color-input'),
      colorPreview:   document.getElementById('pc-color-preview'),
      // Sliders
      sliderPop:      document.getElementById('pc-slider-pop'),
      sliderBanYai:   document.getElementById('pc-slider-banyai'),
      sliderIdeology: document.getElementById('pc-slider-ideology'),
      valuePop:       document.getElementById('pc-value-pop'),
      valueBanYai:    document.getElementById('pc-value-banyai'),
      valueIdeology:  document.getElementById('pc-value-ideology'),
      ideologyLabel:  document.getElementById('pc-ideology-label'),
      ideologyIcon:   document.getElementById('pc-ideology-icon'),
      // Balance
      balanceFill:    document.getElementById('pc-balance-fill'),
      balanceStatus:  document.getElementById('pc-balance-status'),
      // Candidates
      candidateList:    document.getElementById('pc-candidate-list'),
      candidateCount:   document.getElementById('pc-candidate-count'),
      btnAddCandidate:  document.getElementById('pc-btn-add-candidate'),
      candidateInputRow: document.getElementById('pc-candidate-input-row'),
      candidateNameInput: document.getElementById('pc-candidate-name-input'),
      btnCandidateConfirm: document.getElementById('pc-btn-candidate-confirm'),
      btnCandidateRandom:  document.getElementById('pc-btn-candidate-random'),
      // Submit
      btnSubmit:      document.getElementById('pc-btn-submit'),
    };
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 6: UI RENDERING
  // ──────────────────────────────────────────────────────────────────────

  function _updateColorPreview() {
    if (DOM.colorSwatch) DOM.colorSwatch.style.background = formState.color;
    if (DOM.colorPreview) DOM.colorPreview.style.background = formState.color;
  }

  function _updateIdeologyLabel() {
    const v = formState.ideologyValue;
    const entry = IDEOLOGY_MAP.find(m => v >= m.min && v <= m.max) || IDEOLOGY_MAP[2];
    if (DOM.ideologyLabel) DOM.ideologyLabel.textContent = entry.label;
    if (DOM.ideologyIcon) DOM.ideologyIcon.textContent = entry.icon;
    if (DOM.valueIdeology) DOM.valueIdeology.textContent = v;
  }

  function _updateBalanceMeter() {
    const power = calculatePowerBudget();
    const pct = Math.min(100, Math.round((power / MAX_POWER_BUDGET) * 100));

    let statusClass, statusText;
    if (pct <= 75) {
      statusClass = 'balanced';
      statusText = '✅ BALANCED';
    } else if (pct <= 100) {
      statusClass = 'slightly-op';
      statusText = '⚠️ SLIGHTLY STRONG';
    } else {
      statusClass = 'overpowered';
      statusText = '🔴 OVERPOWERED';
    }

    if (DOM.balanceFill) {
      DOM.balanceFill.style.width = Math.min(100, pct) + '%';
      DOM.balanceFill.className = 'pc-balance-fill ' + statusClass;
    }
    if (DOM.balanceStatus) {
      DOM.balanceStatus.textContent = `${statusText} (${power}/${MAX_POWER_BUDGET})`;
      DOM.balanceStatus.className = 'pc-balance-status ' + statusClass;
    }
  }

  function _updateCandidateList() {
    if (DOM.candidateCount) {
      DOM.candidateCount.textContent = `${formState.candidates.length} added`;
    }

    if (DOM.candidateList) {
      if (formState.candidates.length === 0) {
        DOM.candidateList.innerHTML = '<div class="pc-candidate-empty">No custom candidates. Auto-generated names will be used.</div>';
      } else {
        DOM.candidateList.innerHTML = formState.candidates.map((name, i) =>
          `<div class="pc-candidate-row">
            <span class="pc-candidate-num">#${i + 1}</span>
            <span class="pc-candidate-name">${_escapeHtml(name)}</span>
            <button class="pc-candidate-remove" data-idx="${i}" title="Remove">✕</button>
          </div>`
        ).join('');

        // Bind remove buttons
        DOM.candidateList.querySelectorAll('.pc-candidate-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            formState.candidates.splice(idx, 1);
            _updateCandidateList();
          });
        });
      }
    }

    // Toggle input row visibility
    if (DOM.candidateInputRow) {
      DOM.candidateInputRow.style.display = _showCandidateInput ? 'flex' : 'none';
    }
  }

  function _updateAll() {
    _updateColorPreview();
    _updateIdeologyLabel();
    _updateBalanceMeter();
    _updateCandidateList();
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 7: EVENT WIRING
  // ──────────────────────────────────────────────────────────────────────

  function _wireEvents() {
    if (_eventsWired) return;
    _eventsWired = true;

    // Close button
    if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', close);

    // Overlay click-to-close
    if (DOM.overlay) {
      DOM.overlay.addEventListener('click', (e) => {
        if (e.target === DOM.overlay) close();
      });
    }

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.overlay && DOM.overlay.classList.contains('active')) close();
    });

    // Text inputs
    if (DOM.inputThaiName) DOM.inputThaiName.addEventListener('input', (e) => { formState.thaiName = e.target.value; });
    if (DOM.inputEngName) DOM.inputEngName.addEventListener('input', (e) => { formState.englishName = e.target.value; });
    if (DOM.inputShortCode) {
      DOM.inputShortCode.addEventListener('input', (e) => {
        formState.shortCode = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        e.target.value = formState.shortCode;
      });
    }
    if (DOM.inputFunds) {
      DOM.inputFunds.addEventListener('input', (e) => {
        let val = parseInt(e.target.value) || 0;
        val = Math.max(LIMITS.campaignFunds.min, Math.min(LIMITS.campaignFunds.max, val));
        formState.campaignFunds = val;
        _updateBalanceMeter();
      });
      DOM.inputFunds.addEventListener('blur', (e) => {
        e.target.value = formState.campaignFunds;
      });
    }
    if (DOM.inputDesc) DOM.inputDesc.addEventListener('input', (e) => { formState.description = e.target.value; });

    // Color picker
    if (DOM.colorSwatch) DOM.colorSwatch.addEventListener('click', () => { if (DOM.colorInput) DOM.colorInput.click(); });
    if (DOM.colorPreview) DOM.colorPreview.addEventListener('click', () => { if (DOM.colorInput) DOM.colorInput.click(); });
    if (DOM.colorInput) DOM.colorInput.addEventListener('input', (e) => {
      formState.color = e.target.value;
      _updateColorPreview();
    });

    // Sliders
    if (DOM.sliderPop) DOM.sliderPop.addEventListener('input', (e) => {
      formState.basePopularity = parseInt(e.target.value);
      if (DOM.valuePop) DOM.valuePop.textContent = formState.basePopularity + '%';
      _updateBalanceMeter();
    });
    if (DOM.sliderBanYai) DOM.sliderBanYai.addEventListener('input', (e) => {
      formState.banYaiNetwork = parseInt(e.target.value);
      if (DOM.valueBanYai) DOM.valueBanYai.textContent = formState.banYaiNetwork;
      _updateBalanceMeter();
    });
    if (DOM.sliderIdeology) DOM.sliderIdeology.addEventListener('input', (e) => {
      formState.ideologyValue = parseInt(e.target.value);
      _updateIdeologyLabel();
      _updateBalanceMeter();
    });

    // Candidate add button
    if (DOM.btnAddCandidate) DOM.btnAddCandidate.addEventListener('click', () => {
      _showCandidateInput = !_showCandidateInput;
      _updateCandidateList();
      if (_showCandidateInput && DOM.candidateNameInput) {
        DOM.candidateNameInput.value = '';
        DOM.candidateNameInput.focus();
      }
    });

    // Candidate confirm
    if (DOM.btnCandidateConfirm) DOM.btnCandidateConfirm.addEventListener('click', _addTypedCandidate);
    if (DOM.candidateNameInput) DOM.candidateNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _addTypedCandidate();
    });

    // Candidate random
    if (DOM.btnCandidateRandom) DOM.btnCandidateRandom.addEventListener('click', () => {
      const name = _randomThaiName();
      formState.candidates.push(name);
      _updateCandidateList();
    });

    // Submit
    if (DOM.btnSubmit) DOM.btnSubmit.addEventListener('click', _handleSubmit);

    console.log('[party-creator.js] Events wired.');
  }

  function _addTypedCandidate() {
    if (!DOM.candidateNameInput) return;
    const name = DOM.candidateNameInput.value.trim();
    if (!name) return;
    formState.candidates.push(name);
    DOM.candidateNameInput.value = '';
    DOM.candidateNameInput.focus();
    _updateCandidateList();
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 8: VALIDATION & SUBMISSION
  // ──────────────────────────────────────────────────────────────────────

  function _validate() {
    if (!formState.englishName.trim()) return 'Please enter an English party name.';
    if (!formState.shortCode || formState.shortCode.length < 2) return 'Short code must be 2-3 letters.';

    // Enforce funds cap
    if (formState.campaignFunds > LIMITS.campaignFunds.max) {
      formState.campaignFunds = LIMITS.campaignFunds.max;
    }

    // Power budget warning (soft block)
    const power = calculatePowerBudget();
    if (power > MAX_POWER_BUDGET + 20) {
      return `Party is too overpowered (${power}/${MAX_POWER_BUDGET}). Lower popularity, BanYai, or funds.`;
    }

    return null; // Valid
  }

  function _buildPartyObject() {
    const p = formState;
    const ideologyEntry = IDEOLOGY_MAP.find(m => p.ideologyValue >= m.min && p.ideologyValue <= m.max) || IDEOLOGY_MAP[2];
    const ioStr = _deriveIOStrength(p.ideologyValue, p.basePopularity);
    const plStr = _derivePartyListStrength(p.basePopularity, p.ideologyValue);
    const regStr = _deriveRegionalStrength(p.ideologyValue, p.basePopularity);

    // Generate a safe ID from the short code
    const id = 'custom_' + p.shortCode.toLowerCase() + '_' + Date.now().toString(36).slice(-4);

    return {
      id: id,
      name: p.englishName.trim(),
      shortName: p.shortCode.toUpperCase(),
      thaiName: p.thaiName.trim() || p.englishName.trim(),
      color: p.color,
      colorLight: p.color + '26', // 15% alpha hex
      ideology: ideologyEntry.id,
      leader: p.candidates.length > 0 ? p.candidates[0] : _randomThaiName(),
      description: p.description.trim() || `A custom political party created for multiplayer.`,
      slogan: '',
      basePopularity: p.basePopularity,
      partyListStrength: plStr,
      regionalStrength: regStr,
      banYaiNetwork: p.banYaiNetwork,
      ioStrength: ioStr,
      campaignFunds: p.campaignFunds,
      traits: ['custom_party', ideologyEntry.id],
      isCustom: true,
      customCandidateNames: [...p.candidates],
    };
  }

  function _handleSubmit() {
    const error = _validate();
    if (error) {
      _showToast(error, 'error');
      return;
    }

    const party = _buildPartyObject();

    // Store in localStorage for cross-module access
    const existing = JSON.parse(localStorage.getItem('tps_custom_parties') || '[]');
    existing.push(party);
    localStorage.setItem('tps_custom_parties', JSON.stringify(existing));

    // Fire a custom event so multiplayer.js / campaign modules can pick it up
    const event = new CustomEvent('tps:custom-party-created', { detail: party });
    document.dispatchEvent(event);

    console.log('[party-creator.js] Custom party created:', party);
    _showToast(`✨ "${party.name}" (${party.shortName}) created!`, 'success');

    // Close after brief delay
    setTimeout(close, 800);
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 9: TOAST
  // ──────────────────────────────────────────────────────────────────────

  function _showToast(msg, type = 'info') {
    // Re-use multiplayer toast container if available, otherwise fallback
    const container = document.getElementById('mp-toast-container') || document.getElementById('toast-container');
    if (!container) { alert(msg); return; }

    const el = document.createElement('div');
    el.className = `mp-toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 10: UTILITY
  // ──────────────────────────────────────────────────────────────────────

  function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 11: PUBLIC API
  // ──────────────────────────────────────────────────────────────────────

  function open() {
    _cacheDom();
    _wireEvents();
    if (DOM.overlay) DOM.overlay.classList.add('active');

    // ── MP MODE: Hide Base Popularity slider (forced Sovereign Equality) ──
    const isMPMode = localStorage.getItem('tps_game_mode') === 'multiplayer'
      || new URLSearchParams(window.location.search).get('mode') === 'mp';
    const popGroup = document.getElementById('pc-group-base-pop');
    if (isMPMode) {
      if (popGroup) popGroup.style.display = 'none';
      formState.basePopularity = 15; // Fixed average value in MP
      if (DOM.sliderPop) DOM.sliderPop.value = '15';
      if (DOM.valuePop) DOM.valuePop.textContent = '15%';
      console.log('[party-creator.js] MP mode — Base Popularity hidden (fixed at 15).');
    } else {
      if (popGroup) popGroup.style.display = '';
    }

    _updateAll();
    console.log('[party-creator.js] Creator opened.');
  }

  function close() {
    if (DOM.overlay) DOM.overlay.classList.remove('active');
    _showCandidateInput = false;
    console.log('[party-creator.js] Creator closed.');
  }

  /**
   * getCustomParties() — Returns all custom parties from localStorage.
   * @returns {Array} Array of party objects
   */
  function getCustomParties() {
    try {
      return JSON.parse(localStorage.getItem('tps_custom_parties') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * clearCustomParties() — Removes all custom parties from localStorage.
   */
  function clearCustomParties() {
    localStorage.removeItem('tps_custom_parties');
    console.log('[party-creator.js] Custom parties cleared.');
  }

  /**
   * resetForm() — Resets the form to defaults.
   */
  function resetForm() {
    formState = {
      thaiName: '',
      englishName: '',
      shortCode: '',
      color: '#f97316',
      basePopularity: 10,
      banYaiNetwork: 20,
      ideologyValue: 50,
      campaignFunds: 800,
      description: '',
      candidates: [],
    };
    // Reset DOM values
    if (DOM.inputThaiName) DOM.inputThaiName.value = '';
    if (DOM.inputEngName) DOM.inputEngName.value = '';
    if (DOM.inputShortCode) DOM.inputShortCode.value = '';
    if (DOM.inputFunds) DOM.inputFunds.value = '800';
    if (DOM.inputDesc) DOM.inputDesc.value = '';
    if (DOM.sliderPop) DOM.sliderPop.value = '10';
    if (DOM.sliderBanYai) DOM.sliderBanYai.value = '20';
    if (DOM.sliderIdeology) DOM.sliderIdeology.value = '50';
    if (DOM.colorInput) DOM.colorInput.value = '#f97316';
    _showCandidateInput = false;
    _updateAll();
  }


  return {
    open,
    close,
    getCustomParties,
    clearCustomParties,
    resetForm,
    get formState() { return { ...formState }; },
    calculatePowerBudget,
  };

})();


// ─── MODULE LOADED LOG ──────────────────────────────────────────────────
console.log('[party-creator.js] Custom Party Creator loaded.');
console.log('  → Use tpsPartyCreator.open() to show the creator modal.');
