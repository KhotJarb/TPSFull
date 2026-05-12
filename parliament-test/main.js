// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/main.js
// v.1.0.1 Test: "The Parliament RPG" — UI Orchestration & DOM Bindings
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   This is the GLUE between the engines (data.js, timeline.js, debate.js)
//   and the DOM (index.html + style.css). It:
//
//   1. Initializes the game state on page load
//   2. Binds event listeners to all buttons
//   3. Registers timeline & debate callbacks to update the UI
//   4. Manages modal windows (protest rulings, events, interpellations)
//   5. Auto-scrolls the transcript feed as AI MPs speak
//   6. Orchestrates the macro ↔ parliament phase transition
//
// DEPENDENCIES:
//   - data.js     (loaded first — state, constants, helpers)
//   - timeline.js (loaded second — advanceTime, callbacks)
//   - debate.js   (loaded third — runDebate, raiseProtest, playerSpeak)
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: DOM ELEMENT REFERENCES
// Cache all DOM elements on load for performance.
// ──────────────────────────────────────────────────────────────────────────

const DOM = {};

// STEP 91: Per-session lobbying cap
let _lobbyCount = 0;
const MAX_LOBBY_PER_SESSION = 10;

/**
 * _cacheDOMElements() — Grabs all interactive elements by ID and
 * caches them in the DOM object for fast access.
 */
function _cacheDOMElements() {
  // Top Bar
  DOM.topWeekBadge = document.getElementById('top-week-badge');
  DOM.topPhaseIndicator = document.getElementById('top-phase-indicator');
  DOM.topPhaseText = document.getElementById('top-phase-text');
  DOM.topPlayerName = document.getElementById('top-player-name');

  // Left Panel — Calendar (REMOVED in Step 1 — UI Cleanup)
  // Calendar grid and time indicator elements no longer exist in the HTML.
  DOM.leftDayBadge = document.getElementById('left-day-badge');

  // Left Panel — Stats
  DOM.statCapValue = document.getElementById('stat-cap-value');
  DOM.statCapBar = document.getElementById('stat-cap-bar');
  DOM.statPopValue = document.getElementById('stat-pop-value');
  DOM.statPopBar = document.getElementById('stat-pop-bar');
  DOM.statFundsValue = document.getElementById('stat-funds-value');
  DOM.statFundsBar = document.getElementById('stat-funds-bar');

  // STEP 82: Influence stat card
  DOM.statInfValue = document.getElementById('stat-inf-value');
  DOM.statInfBar = document.getElementById('stat-inf-bar');

  // Left Panel — Weekly Stats
  DOM.statDebatesVal = document.getElementById('stat-debates-val');
  DOM.statProtestsVal = document.getElementById('stat-protests-val');
  DOM.statVotesVal = document.getElementById('stat-votes-val');
  DOM.statInterpVal = document.getElementById('stat-interp-val');

  // Left Panel — Event Log
  DOM.eventLogList = document.getElementById('event-log-list');

  // Center Panel — Floor
  DOM.centerStatusBadge = document.getElementById('center-status-badge');
  DOM.topicBanner = document.getElementById('topic-banner');
  DOM.topicCategory = document.getElementById('topic-category');
  DOM.topicTitle = document.getElementById('topic-title');
  DOM.topicTitleThai = document.getElementById('topic-title-thai');
  DOM.currentSpeakerBar = document.getElementById('current-speaker-bar');
  DOM.speakerName = document.getElementById('speaker-name');
  DOM.speakerParty = document.getElementById('speaker-party');
  DOM.debateProgress = document.getElementById('debate-progress');
  DOM.progressLabel = document.getElementById('progress-label');
  DOM.progressFill = document.getElementById('progress-fill');
  DOM.progressRounds = document.getElementById('progress-rounds');
  DOM.transcriptFeed = document.getElementById('transcript-feed');
  DOM.noDebatePlaceholder = document.getElementById('no-debate-placeholder');
  DOM.typingIndicator = document.getElementById('typing-indicator');
  DOM.typingLabel = document.getElementById('typing-label');

  // Right Panel — Actions
  DOM.rightContextBadge = document.getElementById('right-context-badge');
  DOM.macroActions = document.getElementById('macro-actions');
  DOM.parliamentActions = document.getElementById('parliament-actions');

  // Macro Buttons (Time Control REMOVED — Step 1)
  DOM.btnBeginSession = document.getElementById('btn-begin-session');
  DOM.btnQueueInterp = document.getElementById('btn-queue-interp');
  DOM.interpQueueCount = document.getElementById('interp-queue-count');

  // Legislation UI (Step 4)
  DOM.btnProposeBill = document.getElementById('btn-propose-bill');
  DOM.billSlotsBadge = document.getElementById('bill-slots-badge');
  DOM.activeBillsList = document.getElementById('active-bills-list');
  DOM.influenceDisplay = document.getElementById('influence-display');
  DOM.btnBuyInfluence = document.getElementById('btn-buy-influence'); // STEP 87
  DOM.billProposalOverlay = document.getElementById('bill-proposal-overlay');
  DOM.billTemplatesContainer = document.getElementById('bill-templates-container');
  DOM.billProposalClose = document.getElementById('bill-proposal-close');
  DOM.modalInfluenceDisplay = document.getElementById('modal-influence-display');
  DOM.modalSlotsDisplay = document.getElementById('modal-slots-display');
  DOM.committeeOverlay = document.getElementById('committee-expert-overlay');
  DOM.committeeBillTitle = document.getElementById('committee-bill-title');
  DOM.committeeExpertsContainer = document.getElementById('committee-experts-container');
  DOM.committeeExpertClose = document.getElementById('committee-expert-close');

  // STEP 92: Bill Resolution Modal
  DOM.billResolutionOverlay = document.getElementById('bill-resolution-overlay');
  DOM.billResolutionResults = document.getElementById('bill-resolution-results');
  DOM.billResolutionClose = document.getElementById('bill-resolution-close');
  DOM.billResolutionOk = document.getElementById('bill-resolution-ok');

  // Parliament — Protest Buttons
  DOM.protestSection = document.getElementById('protest-section');
  DOM.btnProtestSlander = document.getElementById('btn-protest-slander');
  DOM.btnProtestOfftopic = document.getElementById('btn-protest-offtopic');
  DOM.btnProtestMisleading = document.getElementById('btn-protest-misleading');
  DOM.protestCooldownBar = document.getElementById('protest-cooldown-bar');

  // Parliament — Speech Buttons
  DOM.speechSection = document.getElementById('speech-section');
  DOM.btnSpeechAggressive = document.getElementById('btn-speech-aggressive');
  DOM.btnSpeechTechnical = document.getElementById('btn-speech-technical');
  DOM.btnSpeechDiplomatic = document.getElementById('btn-speech-diplomatic');

  // Parliament — Vote Buttons
  DOM.voteSection = document.getElementById('vote-section');
  DOM.btnVoteAye = document.getElementById('btn-vote-aye');
  DOM.btnVoteNay = document.getElementById('btn-vote-nay');
  DOM.btnVoteAbstain = document.getElementById('btn-vote-abstain');

  // Parliament — Interpellation
  DOM.interpParliamentButtons = document.getElementById('interp-parliament-buttons');

  // Modals
  DOM.rulingOverlay = document.getElementById('ruling-modal-overlay');
  DOM.rulingIcon = document.getElementById('ruling-icon');
  DOM.rulingVerdict = document.getElementById('ruling-verdict');
  DOM.rulingThai = document.getElementById('ruling-thai');
  DOM.rulingDetails = document.getElementById('ruling-details');
  DOM.rulingCapital = document.getElementById('ruling-capital');
  DOM.rulingModalClose = document.getElementById('ruling-modal-close');
  DOM.rulingModalOk = document.getElementById('ruling-modal-ok');

  DOM.eventOverlay = document.getElementById('event-modal-overlay');
  DOM.eventModalTitle = document.getElementById('event-modal-title');
  DOM.eventDescription = document.getElementById('event-description');
  DOM.eventChoicesContainer = document.getElementById('event-choices-container');
  DOM.eventModalClose = document.getElementById('event-modal-close');

  DOM.interpOverlay = document.getElementById('interp-modal-overlay');
  DOM.interpTopicsContainer = document.getElementById('interp-topics-container');
  DOM.interpModalClose = document.getElementById('interp-modal-close');

  DOM.parliamentNotifyOverlay = document.getElementById('parliament-notify-overlay');
  DOM.parliamentNotifyDay = document.getElementById('parliament-notify-day');
  DOM.parliamentNotifyTopic = document.getElementById('parliament-notify-topic');
  DOM.btnEnterParliament = document.getElementById('btn-enter-parliament');

  // Toast Container
  DOM.toastContainer = document.getElementById('toast-container');

  // v1.0.2: Pause/Play Debate Button
  DOM.btnPauseDebate = document.getElementById('btn-pause-debate');
  DOM.pauseLabel = document.getElementById('pause-label');

  // v1.0.2: Party Stance Banner
  DOM.stanceBanner = document.getElementById('party-stance-banner');
  DOM.stanceRoleBadge = document.getElementById('stance-role-badge');
  DOM.stanceRoleIcon = document.getElementById('stance-role-icon');
  DOM.stanceRoleLabel = document.getElementById('stance-role-label');
  DOM.stanceRecValue = document.getElementById('stance-rec-value');

  // v1.0.2: Whip Control
  DOM.btnEnforceWhip = document.getElementById('btn-enforce-whip');
  DOM.whipCoalitionVal = document.getElementById('whip-coalition-val');
  DOM.whipLoyaltyVal = document.getElementById('whip-loyalty-val');
  DOM.stanceWarning = document.getElementById('stance-warning');
  DOM.stanceWarningText = document.getElementById('stance-warning-text');

  // v1.0.2: Aftermath Modal
  DOM.aftermathOverlay = document.getElementById('aftermath-modal-overlay');
  DOM.aftermathVerdict = document.getElementById('aftermath-verdict');
  DOM.aftermathVerdictIcon = document.getElementById('aftermath-verdict-icon');
  DOM.aftermathVerdictLabel = document.getElementById('aftermath-verdict-label');
  DOM.aftermathVerdictBill = document.getElementById('aftermath-verdict-bill');
  DOM.aftermathVerdictThai = document.getElementById('aftermath-verdict-thai');
  DOM.aftermathVoteTally = document.getElementById('aftermath-vote-tally');
  DOM.aftermathPublicVal = document.getElementById('aftermath-public-val');
  DOM.aftermathLoyaltyVal = document.getElementById('aftermath-loyalty-val');
  DOM.aftermathCoalitionVal = document.getElementById('aftermath-coalition-val');
  DOM.aftermathPublicBar = document.getElementById('aftermath-public-bar');
  DOM.aftermathLoyaltyBar = document.getElementById('aftermath-loyalty-bar');
  DOM.aftermathCoalitionBar = document.getElementById('aftermath-coalition-bar');
  DOM.aftermathPillarPublic = document.getElementById('aftermath-pillar-public');
  DOM.aftermathPillarLoyalty = document.getElementById('aftermath-pillar-loyalty');
  DOM.aftermathPillarCoalition = document.getElementById('aftermath-pillar-coalition');
  DOM.aftermathReactionText = document.getElementById('aftermath-reaction-text');
  DOM.aftermathModalClose = document.getElementById('aftermath-modal-close');
  DOM.aftermathModalOk = document.getElementById('aftermath-modal-ok');

  console.log("[main.js] DOM elements cached.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: GAME INITIALIZATION
// Sets up the game state and renders the initial UI.
// ──────────────────────────────────────────────────────────────────────────

/**
 * initGame() — Master initialization function.
 * Called once on page load.
 */
function initGame() {
  console.log("[main.js] ═══ INITIALIZING PARLIAMENT RPG ═══");

  // 1. Cache DOM
  _cacheDOMElements();

  // 2. Check for campaign handoff data (Part 3 — Integration)
  let initConfig = {
    playerPartyId: "khana_pracharat",
    playerRole: "mp",
    playerAlignment: "opposition",
    playerName: "ท่านผู้เล่น",
    playerConstituency: "Bangkok District 7"
  };

  const campaignHandoff = _loadCampaignHandoff();
  if (campaignHandoff) {
    console.log("[main.js] Campaign handoff detected!", campaignHandoff);
    initConfig.playerPartyId = campaignHandoff.playerPartyId || initConfig.playerPartyId;
    initConfig._campaignDay = campaignHandoff.currentDay;
    initConfig._campaignWeek = campaignHandoff.currentWeek;
    initConfig._campaignFunds = campaignHandoff.playerFunds;
    initConfig._campaignScrutiny = campaignHandoff.playerScrutiny;
    initConfig._fromCampaign = true;
  }

  // 3. Initialize game state
  initParliamentState(initConfig);

  // Sync campaign data into parliament state if available
  if (campaignHandoff && parliamentState) {
    parliamentState._fromCampaign = true;
    parliamentState._campaignDay = campaignHandoff.currentDay;
    if (campaignHandoff.playerFunds) {
      parliamentState.playerFunds = Math.min(1000, campaignHandoff.playerFunds);
    }
  }

  // 4. Initialize extended resources (Part 2 — engine.js)
  //    STEP 84: This now also restores active bills from localStorage.
  if (typeof initExtendedResources === 'function') {
    initExtendedResources();
  }

  // 4b. STEP 84: Re-render legislation UI to show restored bills
  if (typeof _renderLegislationUI === 'function') {
    _renderLegislationUI();
  }

  // 5. Register timeline callbacks
  _registerTimelineCallbacks();

  // 6. Register debate callbacks
  _registerDebateCallbacks();

  // 7. Bind button events
  _bindButtonEvents();

  // 8. Bind modal events
  _bindModalEvents();

  // 9. Render initial UI
  _renderFullUI();

  // 10. Debug: print schedule
  debugPrintSchedule();

  console.log("[main.js] ═══ PARLIAMENT RPG READY ═══");

  // ── STEP 21: Populate Active Party Identity Indicator ──
  _populatePartyIndicator(initConfig.playerPartyId);

  if (campaignHandoff) {
    showToast("success", `🏛️ Entering Parliament from Campaign (Week ${campaignHandoff.currentWeek}, Day ${campaignHandoff.currentDay})`);
  } else {
    showToast("info", "🏛️ Welcome to the Thai Parliament, ท่านสมาชิก!");
  }

  // STEP 90: Clarity notification — explain Influence economy
  setTimeout(() => {
    if (parliamentState && (parliamentState.playerPoliticalCapital || 50) < 50) {
      showToast("info",
        "📉 Political Capital is below 50. You did not passively gain Influence this week. " +
        "Use debates, protests, and committee work to rebuild Capital."
      );
    }
  }, 1500);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: TIMELINE CALLBACK REGISTRATION
// Connects the timeline engine's events to UI updates.
// ──────────────────────────────────────────────────────────────────────────

function _registerTimelineCallbacks() {

  // ── On every phase change → refresh UI ──
  registerTimelineCallback('onPhaseChange', (dayIndex, timeIndex, phaseType) => {
    _renderFullUI();
  });

  // ── On day change → update calendar ──
  registerTimelineCallback('onDayChange', (dayIndex, daySchedule) => {
    _renderCalendar();
    _renderTimeIndicator();
  });

  // ── On week change → show toast ──
  registerTimelineCallback('onWeekChange', (weekNum) => {
    showToast("info", `📅 Week ${weekNum} begins. New opportunities await.`);
    _renderWeeklyStats();
  });

  // ── On Parliament Entry → show notification modal ──
  registerTimelineCallback('onParliamentEntry', (schedule, isUrgent) => {
    _showParliamentNotification(schedule, isUrgent);
  });

  // ── On Parliament Exit → return to macro UI ──
  registerTimelineCallback('onParliamentExit', (schedule) => {
    _switchToMacroUI();
    showToast("info", "🏛️ Parliament session concluded. Returning to macro view.");
  });

  // ── On Constituency Event → show event modal ──
  registerTimelineCallback('onConstituencyEvent', (event) => {
    _showEventModal(event, "constituency");
  });

  // ── On Committee Event → show event modal ──
  registerTimelineCallback('onCommitteeEvent', (event) => {
    _showEventModal(event, "committee");
  });

  // ── On Rest Day → brief notification ──
  registerTimelineCallback('onRestDay', (schedule) => {
    showToast("info", `🌙 ${schedule.dayName} — Rest day. ${schedule.description}`);
  });

  // ── On Local Pop Decay → warning toast ──
  registerTimelineCallback('onLocalPopDecay', (decay, newPop) => {
    showToast("warning", `⚠️ Local Popularity -${decay}! Your constituents miss you. (Now: ${newPop})`);
    _animateStatChange('stat-local-popularity', 'negative');
  });

  // ── On any state update → refresh stats ──
  registerTimelineCallback('onGameStateUpdate', (state) => {
    _renderPlayerStats();
    _renderWeeklyStats();
  });

  console.log("[main.js] Timeline callbacks registered.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: DEBATE CALLBACK REGISTRATION
// Connects the debate engine's events to the live transcript UI.
// ──────────────────────────────────────────────────────────────────────────

function _registerDebateCallbacks() {

  // ── New dialogue → append bubble + auto-scroll ──
  registerDebateCallback('onDialogueAdded', (entry) => {
    _appendDialogueBubble(entry);
    _autoScrollTranscript();
    _updateDebateProgress();
    _updateCurrentSpeakerBar(entry);

    // Show or hide typing indicator
    if (entry.type === 'ai_speech') {
      _showTypingIndicator(false);
    }
  });

  // ── Speaker change → show typing indicator briefly ──
  registerDebateCallback('onSpeakerChange', (speaker, entry) => {
    // Brief typing indicator before next speech
    setTimeout(() => {
      if (parliamentState && parliamentState.isDebateInProgress) {
        _showTypingIndicator(true, `${speaker.avatar} ${speaker.name} is preparing to speak...`);
      }
    }, 100);

    // Update protest button states
    _updateProtestButtons(entry);
  });

  // ── Protest result → show ruling modal + publish news ──
  registerDebateCallback('onProtestResult', (result) => {
    _showRulingModal(result);
    _showProtestCooldown();
    _renderPlayerStats();

    // v1.0.2: News Engine integration
    if (typeof publishNews === 'function') {
      const playerName = parliamentState ? parliamentState.playerName : 'Player';
      if (result.sustained) {
        publishNews('protest_sustained', {
          player: playerName,
          target: result.speakerName
        }, { sentiment: 'positive', pollContext: `${playerName}'s protest against ${result.speakerName}` });
      } else {
        publishNews('protest_overruled', {
          player: playerName,
          target: result.speakerName
        }, { sentiment: 'negative', pollContext: `${playerName}'s failed protest` });
      }
    }
  });

  // ── Player turn → switch action deck to speech mode ──
  registerDebateCallback('onPlayerTurn', (topic, snapshot) => {
    _showSpeechSection();
    _showTypingIndicator(false);
    showToast("warning", "🎤 It's YOUR turn to speak! Choose your stance.");
  });

  // ── Player speech result → publish news ──
  registerDebateCallback('onPlayerSpeechResult', (data) => {
    if (typeof publishNews === 'function') {
      const playerName = parliamentState ? parliamentState.playerName : 'Player';
      publishNews('speech_delivered', {
        player: playerName,
        style: data.style
      }, { sentiment: 'neutral' });
    }
  });

  // ── Debate start → switch to parliament UI ──
  registerDebateCallback('onDebateStart', (topic, snapshot) => {
    // UI already switched by parliament entry
  });

  // ── Debate end → show vote section ──
  registerDebateCallback('onDebateEnd', (topic, snapshot) => {
    _showVoteSection();
    _showTypingIndicator(false);
    showToast("info", "🗳️ Debate concluded. Cast your vote!");
  });

  // ── Vote result → show result, publish news, and return to macro ──
  registerDebateCallback('onVoteResult', (result) => {
    _renderPlayerStats();
    const emoji = result.passed ? "✅" : "❌";
    const marginTag = result.isNarrow ? ' (NARROW!)' : result.isLandslide ? ' (LANDSLIDE)' : '';
    const msg = result.passed
      ? `${emoji} PASSED ${result.ayes}-${result.nays}${marginTag}! ${result.topicTitle}`
      : `${emoji} DEFEATED ${result.ayes}-${result.nays}${marginTag}. ${result.topicTitle}`;
    showToast(result.passed ? "success" : "error", msg);

    // Show narrative after a beat
    if (result.narrative) {
      setTimeout(() => {
        showToast('info', `📜 ${result.narrative}`);
      }, 1500);
    }

    // Government crisis alert
    if (result.isGovCrisis) {
      setTimeout(() => {
        showToast('error', `🚨 GOVERNMENT CRISIS — Coalition Stability dropped to ${parliamentState ? parliamentState.coalitionStability : '???'}%!`);
      }, 3000);
    }

    // v1.0.2: News Engine — bill vote result
    if (typeof publishNews === 'function') {
      const cat = result.passed ? 'vote_passed' : 'vote_defeated';
      const sentiment = result.isGovCrisis ? 'negative' : 'neutral';
      publishNews(cat, {
        topic: result.topicTitle || 'the bill',
        ayes: String(result.ayes),
        nays: String(result.nays)
      }, { sentiment, pollContext: `${result.topicTitle} vote` });
    }

    // Update whip status with post-vote numbers
    _updateWhipStatus();

    // v1.0.2: Show Aftermath modal with trade-off dashboard
    setTimeout(() => {
      _showAftermathModal(result);
    }, result.isGovCrisis ? 4000 : 2000);
  });

  // ── Interpellation result + news ──
  registerDebateCallback('onInterpellationResult', (result) => {
    _renderPlayerStats();
    const emoji = result.success ? "✅" : "❌";
    showToast(result.success ? "success" : "warning",
      `${emoji} Interpellation: ${result.narrative}`);

    // v1.0.2: News Engine
    if (typeof publishNews === 'function') {
      const playerName = parliamentState ? parliamentState.playerName : 'Player';
      const cat = result.success ? 'interpellation_success' : 'interpellation_fail';
      publishNews(cat, {
        player: playerName,
        target: result.question?.target || 'the Minister'
      }, { sentiment: result.success ? 'positive' : 'negative' });
    }
  });

  // v1.0.2: Mid-session random events
  registerDebateCallback('onMidSessionEvent', (event) => {
    console.log(`[main.js] Mid-session event received: "${event.title}"`);
    _showMidSessionEventModal(event);
  });

  console.log("[main.js] Debate callbacks registered.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: BUTTON EVENT BINDINGS
// Wires up every interactive button to its respective engine function.
// ──────────────────────────────────────────────────────────────────────────

function _bindButtonEvents() {

  // ── Begin Parliament Session (Step 1 — replaces old Time Control) ──
  if (DOM.btnBeginSession) {
    DOM.btnBeginSession.addEventListener('click', () => {
      console.log('[main.js] Begin Session clicked — starting parliament session.');

      // Pick a random debate topic
      const topic = getRandomDebateTopic();

      // Switch to parliament UI
      _switchToParliamentUI();

      // Enter parliament formally
      const sessionInfo = enterParliamentSession();

      // Update topic banner
      DOM.topicCategory.textContent = topic.category.toUpperCase() + ' BILL';
      DOM.topicTitle.textContent = topic.title;
      DOM.topicTitleThai.textContent = topic.titleThai;

      // v1.0.2: Compute and render party stance
      _renderStanceBanner(topic);

      // Render any queued interpellations
      _renderParliamentInterpellations();

      // Start the debate!
      runDebate(topic);

      // v1.0.2: Publish news on bill proposal + public poll
      _publishBillProposalNews(topic);

      showToast('success', `🏛️ Parliament convened! Debating: ${topic.title}`);
    });
  }

  // ── Queue Interpellation ──
  if (DOM.btnQueueInterp) {
    DOM.btnQueueInterp.addEventListener('click', () => {
      _showInterpellationPicker();
    });
  }

  // ── Propose Bill (Step 4) ──
  if (DOM.btnProposeBill) {
    DOM.btnProposeBill.addEventListener('click', () => {
      _showBillProposalModal();
    });
  }

  // ── Protest Buttons ──
  DOM.btnProtestSlander.addEventListener('click', () => _handleProtest('slander'));
  DOM.btnProtestOfftopic.addEventListener('click', () => _handleProtest('off_topic'));
  DOM.btnProtestMisleading.addEventListener('click', () => _handleProtest('misleading'));

  // ── Speech Buttons ──
  DOM.btnSpeechAggressive.addEventListener('click', () => _handlePlayerSpeech('aggressive'));
  DOM.btnSpeechTechnical.addEventListener('click', () => _handlePlayerSpeech('technical'));
  DOM.btnSpeechDiplomatic.addEventListener('click', () => _handlePlayerSpeech('diplomatic'));

  // ── Vote Buttons ──
  DOM.btnVoteAye.addEventListener('click', () => _handleVote('aye'));
  DOM.btnVoteNay.addEventListener('click', () => _handleVote('nay'));
  DOM.btnVoteAbstain.addEventListener('click', () => _handleVote('abstain'));

  // ── v1.0.2: Enforce Party Whip ──
  if (DOM.btnEnforceWhip) {
    DOM.btnEnforceWhip.addEventListener('click', () => _enforcePartyWhip());
  }

  // ── Enter Parliament ──
  DOM.btnEnterParliament.addEventListener('click', () => {
    _closeModal(DOM.parliamentNotifyOverlay);
    _startParliamentSession();
  });
  // ── STEP 4: Language Toggle in Header ──
  const langToggleBtn = document.getElementById('btn-lang-toggle');
  if (langToggleBtn) {
    // Set initial active state from localStorage
    const currentLang = (localStorage.getItem('tps_language') || 'EN').toUpperCase();
    langToggleBtn.querySelectorAll('.lang-toggle__opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === currentLang);
    });

    langToggleBtn.addEventListener('click', () => {
      const current = (localStorage.getItem('tps_language') || 'EN').toUpperCase();
      const next = current === 'EN' ? 'TH' : 'EN';

      console.log(`[main.js] Language toggle: ${current} → ${next}`);

      // Update visual state immediately
      langToggleBtn.querySelectorAll('.lang-toggle__opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === next);
      });

      // Use the global changeLanguage if available (applies data-i18n + localStorage)
      if (typeof changeLanguage === 'function') {
        changeLanguage(next);
      } else {
        localStorage.setItem('tps_language', next);
      }

      // Reload page to refresh all runtime-generated content (debate transcript, etc.)
      // The debate engine's _getDebateLang() will pick up the new language on reload.
      setTimeout(() => {
        window.location.reload();
      }, 300);
    });
  }

  // ── v1.0.2: Pause / Play Debate ──
  if (DOM.btnPauseDebate) {
    DOM.btnPauseDebate.addEventListener('click', () => {
      _toggleDebatePause();
    });
  }

  // ── v1.0.2: Space bar shortcut for pause/play during debates ──
  document.addEventListener('keydown', (e) => {
    // Only trigger if no modal is open and a debate is running
    if (e.code === 'Space' && !e.target.closest('input, textarea, button, select')) {
      if (typeof getDebateSnapshot === 'function') {
        const snap = getDebateSnapshot();
        if (snap.isRunning) {
          e.preventDefault();
          _toggleDebatePause();
        }
      }
    }
  });

  // ── STEP 87: Buy Influence Button ──
  if (DOM.btnBuyInfluence) {
    DOM.btnBuyInfluence.addEventListener('click', () => buyInfluence());
  }

  console.log("[main.js] Button events bound.");
}


// ──────────────────────────────────────────────────────────────────────────
// STEP 87: BUY INFLUENCE — Money Sink for Lobbying
// ──────────────────────────────────────────────────────────────────────────

/**
 * buyInfluence() — Spends ฿10M Funds to gain +1 Influence.
 * STEP 91: Capped at 10 purchases per Parliament visit.
 * Syncs both values to localStorage and refreshes UI.
 */
function buyInfluence() {
  if (!parliamentState) return;

  // STEP 91: Enforce lobbying cap
  if (_lobbyCount >= MAX_LOBBY_PER_SESSION) {
    showToast('warning', `⚠️ Lobbying limit reached for this session (${MAX_LOBBY_PER_SESSION}/${MAX_LOBBY_PER_SESSION}).`);
    return;
  }

  const funds = parliamentState.playerFunds || 0;
  const influence = parliamentState.playerInfluence || 0;

  if (influence >= 100) {
    showToast('warning', '⚠️ Influence is already at maximum (100).');
    return;
  }
  if (funds < 10) {
    showToast('warning', '⚠️ Not enough Funds to lobby! Need ฿10M.');
    return;
  }

  // Deduct funds, add influence, increment counter
  parliamentState.playerFunds -= 10;
  parliamentState.playerInfluence = Math.min(100, influence + 1);
  _lobbyCount++;

  // Sync to localStorage
  localStorage.setItem('tps_funds', String(parliamentState.playerFunds));
  localStorage.setItem('tps_influence', String(parliamentState.playerInfluence));

  // Refresh UI
  _renderPlayerStats();
  if (typeof _renderLegislationUI === 'function') _renderLegislationUI();

  // Update button to show remaining quota
  const remaining = MAX_LOBBY_PER_SESSION - _lobbyCount;
  if (DOM.btnBuyInfluence) {
    const labelEl = DOM.btnBuyInfluence.querySelector('.action-btn__label');
    const subEl = DOM.btnBuyInfluence.querySelector('.action-btn__sub');
    if (labelEl) labelEl.textContent = `Lobby MPs — Buy Influence (${remaining} left)`;
    if (subEl) subEl.textContent = `วิ่งเต้น — Cost: ฿10M → +1 Influence`;
    if (remaining === 0) DOM.btnBuyInfluence.classList.add('disabled');
  }

  showToast('success', `💰 Lobbied MPs: +1 Influence (฿10M spent). ${remaining} lobbying attempts remaining.`);
  console.log(`[main.js] STEP 91 — Buy Influence: Funds ${parliamentState.playerFunds}, Influence ${parliamentState.playerInfluence}, Lobby ${_lobbyCount}/${MAX_LOBBY_PER_SESSION}`);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5B: PARTY STANCE ENGINE (v1.0.2)
// Computes and displays the player's party recommendation for each bill.
// ──────────────────────────────────────────────────────────────────────────

/** Tracks the current topic's computed stance for the player's party. */
let _currentPartyStance = null; // "support" | "oppose" | "abstain" | "free_vote"

/**
 * _computePartyStance() — Determines the player's party recommendation.
 *
 * Logic:
 *   - If player is Government aligned: use topic.governmentPosition
 *   - If player is Opposition aligned: use topic.oppositionPosition
 *   - "for" → "support", "against" → "oppose", "neutral" → "free_vote"
 *
 * @param {Object} topic — A DEBATE_TOPICS entry
 * @returns {string} "support" | "oppose" | "abstain" | "free_vote"
 */
function _computePartyStance(topic) {
  if (!parliamentState || !topic) return 'free_vote';

  const alignment = parliamentState.playerAlignment || 'opposition';
  const position = alignment === 'government'
    ? topic.governmentPosition
    : topic.oppositionPosition;

  switch (position) {
    case 'for': return 'support';
    case 'against': return 'oppose';
    case 'neutral': return 'free_vote';
    default: return 'free_vote';
  }
}

/**
 * _renderStanceBanner() — Updates the stance banner UI.
 * Shows/hides the banner and sets role badge + recommendation.
 *
 * @param {Object} topic — A DEBATE_TOPICS entry
 */
function _renderStanceBanner(topic) {
  if (!DOM.stanceBanner || !parliamentState) return;

  const alignment = parliamentState.playerAlignment || 'opposition';
  const stance = _computePartyStance(topic);
  _currentPartyStance = stance;

  // Show banner
  DOM.stanceBanner.classList.remove('hidden');

  // Role badge
  DOM.stanceRoleBadge.className = `stance-banner__role ${alignment}`;
  if (alignment === 'government') {
    DOM.stanceRoleIcon.textContent = '🏛️';
    DOM.stanceRoleLabel.textContent = 'GOVERNMENT';
  } else {
    DOM.stanceRoleIcon.textContent = '📣';
    DOM.stanceRoleLabel.textContent = 'OPPOSITION';
  }

  // Recommendation value
  const stanceLabels = {
    support: '✅ SUPPORT (สนับสนุน)',
    oppose: '❌ OPPOSE (คัดค้าน)',
    abstain: '⬜ ABSTAIN (งดออกเสียง)',
    free_vote: '🗳️ FREE VOTE (อิสระ)'
  };

  DOM.stanceRecValue.textContent = stanceLabels[stance] || 'FREE VOTE';
  DOM.stanceRecValue.className = `stance-rec__value ${stance.replace('_', '-')}`;

  // Hide warning initially (shown only during vote phase if misaligned)
  DOM.stanceWarning.classList.add('hidden');

  console.log(`[main.js] Stance computed: ${alignment} → "${stance}" for "${topic.title}"`);
}

/**
 * _checkVoteAlignment() — Compares the player's vote to the party stance.
 * Returns whether the vote aligns with the party recommendation.
 *
 * @param {string} vote — "aye" | "nay" | "abstain"
 * @returns {Object} { aligned: boolean, stancePenalty: number }
 */
function _checkVoteAlignment(vote) {
  if (!_currentPartyStance || _currentPartyStance === 'free_vote') {
    return { aligned: true, stancePenalty: 0 };
  }

  const stanceToVote = {
    support: 'aye',
    oppose: 'nay',
    abstain: 'abstain'
  };

  const expectedVote = stanceToVote[_currentPartyStance];
  const aligned = vote === expectedVote;

  return {
    aligned,
    stancePenalty: aligned ? 0 : -8,  // Voting against party line costs loyalty
    expectedVote,
    actualVote: vote
  };
}

/**
 * _showVoteAlignmentWarning() — Shows warning if vote diverges from party stance.
 * Called when the vote section appears to let the player know.
 */
function _showVoteAlignmentWarning() {
  if (!DOM.stanceWarning || !_currentPartyStance || _currentPartyStance === 'free_vote') {
    return;
  }

  const stanceToVote = { support: 'AYE ✅', oppose: 'NAY ❌', abstain: 'ABSTAIN ⬜' };
  const expected = stanceToVote[_currentPartyStance];

  DOM.stanceWarning.classList.remove('hidden');
  DOM.stanceWarningText.textContent =
    `Your party expects you to vote ${expected}. Defying the party line will cost -8 Party Loyalty.`;
}

/**
 * _enforcePartyWhip() — Player pays Political Capital to lock in party votes.
 * Costs -10 PC, sets whipUsedThisSession = true.
 */
function _enforcePartyWhip() {
  if (!parliamentState) return;
  if (parliamentState.whipUsedThisSession) {
    showToast('warning', '⚠️ Whip already enforced this session!');
    return;
  }
  if (parliamentState.playerPoliticalCapital < 10) {
    showToast('error', '❌ Not enough Political Capital! Need 10 PC.');
    return;
  }

  // Pay the cost
  applyEffects({ politicalCapital: -10, localPopularity: 0, funds: 0 });
  parliamentState.whipUsedThisSession = true;
  parliamentState.whipUsesTotal++;

  // Visual feedback
  if (DOM.btnEnforceWhip) {
    DOM.btnEnforceWhip.disabled = true;
    DOM.btnEnforceWhip.classList.add('enforced');
    const labelEl = DOM.btnEnforceWhip.querySelector('.whip-btn__label');
    if (labelEl) labelEl.textContent = '✅ WHIP ENFORCED';
  }

  showToast('success', '🔱 Party Whip enforced! Your MPs will vote in lockstep. (-10 PC, -5 Loyalty after vote)');
  _updateWhipStatus();

  console.log(`[main.js] Party whip enforced. Total uses: ${parliamentState.whipUsesTotal}`);
}

/**
 * _updateWhipStatus() — Updates the coalition/loyalty display.
 */
function _updateWhipStatus() {
  if (!parliamentState) return;
  if (DOM.whipCoalitionVal) {
    DOM.whipCoalitionVal.textContent = parliamentState.coalitionStability || 65;
  }
  if (DOM.whipLoyaltyVal) {
    DOM.whipLoyaltyVal.textContent = parliamentState.partyLoyalty || 70;
  }
}

/**
 * _showAftermathModal() — Displays the Legislative Aftermath modal.
 * Shows pass/fail verdict, applies impactProfile effects, animates pillars.
 *
 * @param {Object} result — Vote result from castVote()
 */
function _showAftermathModal(result) {
  if (!DOM.aftermathOverlay || !result) {
    // Fallback if modal doesn't exist
    setTimeout(() => _showReturnToMacroButton(), 1000);
    return;
  }

  const topic = DEBATE_TOPICS.find(t => t.id === result.topicId);
  const profile = topic && topic.impactProfile;
  const impact = profile ? (result.passed ? profile.ifPass : profile.ifFail) : null;

  // ── Verdict Banner ──
  DOM.aftermathVerdict.className = `aftermath__verdict${result.passed ? '' : ' defeated'}`;
  DOM.aftermathVerdictIcon.textContent = result.passed ? '✅' : '❌';
  DOM.aftermathVerdictLabel.textContent = result.passed ? 'BILL PASSED' : 'BILL DEFEATED';
  DOM.aftermathVerdictBill.textContent = result.topicTitle;
  DOM.aftermathVerdictThai.textContent = result.passed
    ? `${result.topicTitleThai || ''} — ผ่านสภา`
    : `${result.topicTitleThai || ''} — ตกไป`;
  DOM.aftermathVoteTally.textContent = `${result.ayes}-${result.nays}`;

  // ── Three Pillars ──
  const publicVal = impact ? impact.publicPopularity : 0;
  const loyaltyVal = impact ? impact.partyLoyalty : 0;
  const coalitionVal = impact ? impact.coalitionStability : 0;

  // Apply effects to state
  if (parliamentState && impact) {
    parliamentState.playerLocalPopularity = Math.max(0, Math.min(100,
      parliamentState.playerLocalPopularity + publicVal));
    parliamentState.partyLoyalty = Math.max(0, Math.min(100,
      parliamentState.partyLoyalty + loyaltyVal));
    parliamentState.coalitionStability = Math.max(0, Math.min(100,
      parliamentState.coalitionStability + coalitionVal));
  }

  // Helper to format and color values
  const _formatPillar = (val, valEl, barEl, pillarEl) => {
    const sign = val > 0 ? '+' : '';
    valEl.textContent = val === 0 ? '—' : `${sign}${val}`;
    valEl.className = `aftermath__pillar-value ${val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral'}`;
    pillarEl.className = `aftermath__pillar ${val > 0 ? 'positive' : val < 0 ? 'negative' : ''}`;

    // Reset bar then animate
    barEl.style.width = '0%';
    barEl.className = `aftermath__pillar-bar-fill ${val >= 0 ? 'positive' : 'negative'}`;
    setTimeout(() => {
      barEl.style.width = `${Math.min(100, Math.abs(val) * 5)}%`;
    }, 100);
  };

  _formatPillar(publicVal, DOM.aftermathPublicVal, DOM.aftermathPublicBar, DOM.aftermathPillarPublic);
  _formatPillar(loyaltyVal, DOM.aftermathLoyaltyVal, DOM.aftermathLoyaltyBar, DOM.aftermathPillarLoyalty);
  _formatPillar(coalitionVal, DOM.aftermathCoalitionVal, DOM.aftermathCoalitionBar, DOM.aftermathPillarCoalition);

  // ── Public Reaction ──
  if (impact) {
    const lang = (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.language === 'TH')
      ? 'thai' : 'en';
    DOM.aftermathReactionText.textContent = lang === 'thai'
      ? `"${impact.newsReactionThai}"`
      : `"${impact.newsReaction}"`;
  } else {
    DOM.aftermathReactionText.textContent = '"No significant public reaction."';
  }

  // ── Open Modal ──
  _openModal(DOM.aftermathOverlay);
  _renderPlayerStats();
  _updateWhipStatus();

  console.log(`[main.js] Aftermath shown: pub=${publicVal}, loy=${loyaltyVal}, coal=${coalitionVal}`);
}

/**
 * _hideStanceBanner() — Hides the stance banner (called when returning to macro).
 */
function _hideStanceBanner() {
  if (DOM.stanceBanner) {
    DOM.stanceBanner.classList.add('hidden');
  }
  _currentPartyStance = null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: MODAL EVENT BINDINGS
// Close buttons and backdrop clicks for all modals.
// ──────────────────────────────────────────────────────────────────────────

function _bindModalEvents() {
  // Ruling Modal
  DOM.rulingModalClose.addEventListener('click', () => _closeModal(DOM.rulingOverlay));
  DOM.rulingModalOk.addEventListener('click', () => _closeModal(DOM.rulingOverlay));

  // Event Modal
  DOM.eventModalClose.addEventListener('click', () => _closeModal(DOM.eventOverlay));

  // Interpellation Modal
  DOM.interpModalClose.addEventListener('click', () => _closeModal(DOM.interpOverlay));

  // Bill Proposal Modal (Step 4)
  if (DOM.billProposalClose) {
    DOM.billProposalClose.addEventListener('click', () => _closeModal(DOM.billProposalOverlay));
  }

  // Committee Expert Modal (Step 4)
  if (DOM.committeeExpertClose) {
    DOM.committeeExpertClose.addEventListener('click', () => _closeModal(DOM.committeeOverlay));

    // STEP 92: Bill Resolution modal bindings
    if (DOM.billResolutionClose) {
      DOM.billResolutionClose.addEventListener('click', () => _closeModal(DOM.billResolutionOverlay));
    }
    if (DOM.billResolutionOk) {
      DOM.billResolutionOk.addEventListener('click', () => _closeModal(DOM.billResolutionOverlay));
    }
  }

  // v1.0.2: Aftermath Modal
  if (DOM.aftermathModalClose) {
    DOM.aftermathModalClose.addEventListener('click', () => {
      _closeModal(DOM.aftermathOverlay);
      _showReturnToMacroButton();
    });
  }
  if (DOM.aftermathModalOk) {
    DOM.aftermathModalOk.addEventListener('click', () => {
      _closeModal(DOM.aftermathOverlay);
      _showReturnToMacroButton();
    });
  }

  // Click outside modal to close
  [DOM.rulingOverlay, DOM.eventOverlay, DOM.interpOverlay,
  DOM.billProposalOverlay, DOM.committeeOverlay, DOM.aftermathOverlay].forEach(overlay => {
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          _closeModal(overlay);
          // If aftermath, also show return button
          if (overlay === DOM.aftermathOverlay) {
            _showReturnToMacroButton();
          }
        }
      });
    }
  });

  console.log("[main.js] Modal events bound.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6B: PAUSE / PLAY DEBATE (v1.0.2)
// Toggles the debate stream on/off so the player can read and react.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _toggleDebatePause() — Toggles the debate between Paused and Playing.
 *
 * When PAUSED:
 *   - Clears the setInterval (no new dialogue ticks)
 *   - Updates the button icon to ▶️ PLAY
 *   - Shows a toast notification
 *
 * When RESUMED:
 *   - Restarts the setInterval at the current dialogueIntervalMs
 *   - Updates the button icon to ⏸️ PAUSE
 */
function _toggleDebatePause() {
  if (typeof getDebateSnapshot !== 'function') return;
  const snap = getDebateSnapshot();
  if (!snap.isRunning) return;

  // Access the internal debate state via the exposed pause/resume functions
  if (snap.isPaused) {
    // ── RESUME ──
    resumeDebate();

    // Restart the interval (resumeDebate only sets isPaused = false)
    // We need to re-kick the interval since we cleared it on pause
    if (typeof _debateState !== 'undefined' && !_debateState.intervalId) {
      _debateState.intervalId = setInterval(() => {
        if (_debateState.isPaused) return;
        _advanceDialogue();
      }, _debateState.dialogueIntervalMs);
    }

    // Update button visual
    if (DOM.btnPauseDebate) {
      DOM.btnPauseDebate.classList.remove('is-paused');
      DOM.btnPauseDebate.querySelector('.pause-icon').textContent = '⏸️';
      if (DOM.pauseLabel) DOM.pauseLabel.textContent = 'Pause';
    }

    showToast('info', '▶️ Debate resumed — dialogue feed is flowing.');
    console.log('[main.js] Debate RESUMED by player.');

  } else {
    // ── PAUSE ──
    pauseDebate();

    // Also clear the interval entirely for a clean pause
    if (typeof _debateState !== 'undefined' && _debateState.intervalId) {
      clearInterval(_debateState.intervalId);
      _debateState.intervalId = null;
    }

    // Update button visual
    if (DOM.btnPauseDebate) {
      DOM.btnPauseDebate.classList.add('is-paused');
      DOM.btnPauseDebate.querySelector('.pause-icon').textContent = '▶️';
      if (DOM.pauseLabel) DOM.pauseLabel.textContent = 'Play';
    }

    showToast('warning', '⏸️ Debate paused — take your time to read and act.');
    console.log('[main.js] Debate PAUSED by player.');
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: UI RENDERING FUNCTIONS
// Functions that update the DOM to reflect the current game state.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _renderFullUI() — Complete UI refresh. Called on init and major state changes.
 */
function _renderFullUI() {
  _renderTopBar();
  _renderPlayerStats();
  _renderWeeklyStats();
  _renderActionDeck();
  _renderLegislationUI();   // Step 4
}

/**
 * _renderTopBar() — Updates the top navigation bar.
 */
function _renderTopBar() {
  if (!parliamentState) return;
  const s = parliamentState;

  // Week badge
  DOM.topWeekBadge.textContent = `Week ${s.currentWeek} / 8`;

  // Phase indicator
  if (s.currentPhase === 'parliament') {
    DOM.topPhaseIndicator.className = 'top-bar__phase-indicator parliament';
    DOM.topPhaseText.textContent = 'PARLIAMENT SESSION';
  } else {
    DOM.topPhaseIndicator.className = 'top-bar__phase-indicator macro';
    DOM.topPhaseText.textContent = 'MACRO PHASE';
  }

  // Player name
  DOM.topPlayerName.textContent = `${s.playerName} • ${s.playerRole === 'mp' ? 'MP' : s.playerRole} • ${s.playerAlignment === 'government' ? 'Government' : 'Opposition'}`;
}

/**
 * _renderCalendar() — DISABLED (Step 1 UI Cleanup).
 * Calendar grid removed from HTML — this is now a no-op.
 */
function _renderCalendar() {
  // Calendar removed — no-op
}

/**
 * _renderTimeIndicator() — DISABLED (Step 1 UI Cleanup).
 * Time indicator removed from HTML — this is now a no-op.
 */
function _renderTimeIndicator() {
  // Time indicator removed — no-op
}

/**
 * _renderPlayerStats() — Updates the stat cards with current values.
 */
function _renderPlayerStats() {
  if (!parliamentState) return;
  const s = parliamentState;

  // Political Capital
  DOM.statCapValue.textContent = s.playerPoliticalCapital;
  DOM.statCapBar.style.width = `${s.playerPoliticalCapital}%`;

  // Local Popularity
  DOM.statPopValue.textContent = s.playerLocalPopularity;
  DOM.statPopBar.style.width = `${s.playerLocalPopularity}%`;

  // Funds
  DOM.statFundsValue.textContent = s.playerFunds;
  const fundsPercent = Math.min(100, (s.playerFunds / 1000) * 100);
  DOM.statFundsBar.style.width = `${fundsPercent}%`;

  // STEP 82: Influence
  const inf = s.playerInfluence || 0;
  if (DOM.statInfValue) DOM.statInfValue.textContent = Math.round(inf);
  if (DOM.statInfBar) DOM.statInfBar.style.width = `${Math.round(inf)}%`;

  // STEP 82: Also update the right-panel influence badge + modal
  if (DOM.influenceDisplay) DOM.influenceDisplay.textContent = `${Math.round(inf)}/100`;
  if (DOM.modalInfluenceDisplay) DOM.modalInfluenceDisplay.textContent = Math.round(inf);
}

/**
 * _renderWeeklyStats() — Updates the weekly stats grid.
 */
function _renderWeeklyStats() {
  if (!parliamentState) return;
  const ws = parliamentState.weeklyStats;

  DOM.statDebatesVal.textContent = ws.debatesParticipated;
  DOM.statProtestsVal.textContent = `${ws.protestsSucceeded}/${ws.protestsRaised}`;
  DOM.statVotesVal.textContent = ws.votesAttended;
  DOM.statInterpVal.textContent = ws.interpellationsFiled;
}

/**
 * _renderActionDeck() — Shows the correct action panel based on game phase.
 */
function _renderActionDeck() {
  if (!parliamentState) return;

  if (parliamentState.currentPhase === 'parliament') {
    DOM.macroActions.classList.add('hidden');
    DOM.parliamentActions.classList.remove('hidden');
    DOM.rightContextBadge.textContent = 'PARLIAMENT';
    DOM.rightContextBadge.style.background = 'var(--danger-bg)';
    DOM.rightContextBadge.style.color = 'var(--danger)';
  } else {
    DOM.macroActions.classList.remove('hidden');
    DOM.parliamentActions.classList.add('hidden');
    DOM.rightContextBadge.textContent = 'MACRO';
    DOM.rightContextBadge.style.background = 'var(--info-bg)';
    DOM.rightContextBadge.style.color = 'var(--info)';
  }

  // Update interpellation queue count
  const queueLen = parliamentState.interpellationQueue.filter(q => q.status === 'pending').length;
  DOM.interpQueueCount.textContent = queueLen;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: TRANSCRIPT / DIALOGUE BUBBLE RENDERING
// Builds and appends dialogue bubbles to the live feed.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _appendDialogueBubble() — Creates a DOM element for a dialogue entry
 * and appends it to the transcript feed.
 *
 * @param {Object} entry - A transcript entry from debate.js
 */
function _appendDialogueBubble(entry) {
  // Hide the "no debate" placeholder
  DOM.noDebatePlaceholder.classList.add('hidden');

  // Create the bubble container
  const bubble = document.createElement('div');
  bubble.className = 'dialogue-bubble';
  bubble.id = entry.id;

  // Determine alignment class
  if (entry.type === 'player_speech' || entry.type === 'player_protest') {
    bubble.classList.add('player');
  } else if (entry.type === 'procedural') {
    bubble.classList.add('procedural');
  } else if (entry.type === 'ruling') {
    bubble.classList.add('ruling');
    bubble.classList.add(entry.sustained ? 'sustained' : 'overruled');
  } else if (entry.type === 'vote_result') {
    bubble.classList.add('vote-result');
  } else if (entry.type === 'interpellation_question') {
    bubble.classList.add('player');
  } else if (entry.type === 'interpellation_answer') {
    bubble.classList.add('government');
  } else if (entry.speakerAlignment === 'government') {
    bubble.classList.add('government');
  } else if (entry.speakerAlignment === 'opposition') {
    bubble.classList.add('opposition');
  } else {
    bubble.classList.add('neutral');
  }

  // Add protestable flag
  if (entry.protestable) {
    bubble.classList.add('protestable');
  }

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'dialogue-bubble__avatar';
  avatar.textContent = entry.speakerAvatar || '🏛️';
  if (entry.speakerColor) {
    avatar.style.borderColor = entry.speakerColor;
  }

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'dialogue-bubble__content';

  // Header (name + party + role)
  const header = document.createElement('div');
  header.className = 'dialogue-bubble__header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'dialogue-bubble__name';
  nameSpan.textContent = entry.speakerName || 'Unknown';
  header.appendChild(nameSpan);

  if (entry.speakerPartyShort) {
    const partySpan = document.createElement('span');
    partySpan.className = 'dialogue-bubble__party';
    partySpan.textContent = entry.speakerPartyShort;
    header.appendChild(partySpan);
  }

  if (entry.speakerRole) {
    const roleSpan = document.createElement('span');
    roleSpan.className = 'dialogue-bubble__role';
    roleSpan.textContent = entry.speakerRole;
    header.appendChild(roleSpan);
  }

  content.appendChild(header);

  // Speech text
  const textDiv = document.createElement('div');
  textDiv.className = 'dialogue-bubble__text';
  textDiv.textContent = entry.text;
  content.appendChild(textDiv);

  // Timestamp
  const timeSpan = document.createElement('span');
  timeSpan.className = 'dialogue-bubble__timestamp';
  const now = new Date(entry.timestamp || Date.now());
  timeSpan.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  content.appendChild(timeSpan);

  // Assemble
  bubble.appendChild(avatar);
  bubble.appendChild(content);

  // Append to feed
  DOM.transcriptFeed.appendChild(bubble);
}

/**
 * _autoScrollTranscript() — Scrolls the transcript feed to the bottom
 * with a smooth animation, keeping the latest dialogue visible.
 */
function _autoScrollTranscript() {
  requestAnimationFrame(() => {
    DOM.transcriptFeed.scrollTop = DOM.transcriptFeed.scrollHeight;
  });
}

/**
 * _clearTranscript() — Removes all dialogue bubbles from the feed.
 */
function _clearTranscript() {
  // Remove all dialogue bubbles but keep the placeholder
  const bubbles = DOM.transcriptFeed.querySelectorAll('.dialogue-bubble');
  bubbles.forEach(b => b.remove());
  DOM.noDebatePlaceholder.classList.remove('hidden');
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 9: DEBATE UI STATE MANAGEMENT
// Functions that show/hide context-sensitive UI sections.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _updateCurrentSpeakerBar() — Updates the speaker highlight bar.
 */
function _updateCurrentSpeakerBar(entry) {
  if (entry.type === 'procedural' || entry.type === 'ruling' || entry.type === 'vote_result') {
    DOM.currentSpeakerBar.className = 'current-speaker-bar neutral';
    DOM.currentSpeakerBar.classList.remove('hidden');
    DOM.speakerName.textContent = entry.speakerName;
    DOM.speakerParty.textContent = '';
    return;
  }

  if (entry.speakerAlignment === 'government') {
    DOM.currentSpeakerBar.className = 'current-speaker-bar government';
  } else if (entry.speakerAlignment === 'opposition') {
    DOM.currentSpeakerBar.className = 'current-speaker-bar opposition';
  } else {
    DOM.currentSpeakerBar.className = 'current-speaker-bar neutral';
  }
  DOM.currentSpeakerBar.classList.remove('hidden');

  DOM.speakerName.textContent = entry.speakerThaiTitle || entry.speakerName || '—';
  DOM.speakerParty.textContent = entry.speakerPartyShort || '';
}

/**
 * _updateDebateProgress() — Updates the progress bar during debate.
 */
function _updateDebateProgress() {
  const snap = getDebateSnapshot();
  if (!snap || !snap.isRunning) return;

  DOM.progressLabel.textContent = `${snap.progress}%`;
  DOM.progressFill.style.width = `${snap.progress}%`;
  DOM.progressRounds.textContent = `${snap.roundsCompleted}/${snap.totalRounds}`;
}

/**
 * _updateProtestButtons() — Enables/disables protest buttons based on
 * whether the current dialogue is protestable and cooldown status.
 */
function _updateProtestButtons(entry) {
  const snap = getDebateSnapshot();
  const canProtest = snap && snap.canProtest;

  DOM.btnProtestSlander.disabled = !canProtest;
  DOM.btnProtestOfftopic.disabled = !canProtest;
  DOM.btnProtestMisleading.disabled = !canProtest;
}

/**
 * _showSpeechSection() — Shows the player speech buttons and hides protest.
 */
function _showSpeechSection() {
  DOM.speechSection.classList.remove('hidden');
  DOM.protestSection.classList.add('hidden');

  DOM.btnSpeechAggressive.disabled = false;
  DOM.btnSpeechTechnical.disabled = false;
  DOM.btnSpeechDiplomatic.disabled = false;
}

/**
 * _hideSpeechSection() — Hides speech buttons and shows protest buttons.
 */
function _hideSpeechSection() {
  DOM.speechSection.classList.add('hidden');
  DOM.protestSection.classList.remove('hidden');
}

/**
 * _showVoteSection() — Shows the voting buttons.
 */
function _showVoteSection() {
  DOM.voteSection.classList.remove('hidden');
  DOM.protestSection.classList.add('hidden');
  DOM.speechSection.classList.add('hidden');

  DOM.btnVoteAye.disabled = false;
  DOM.btnVoteNay.disabled = false;
  DOM.btnVoteAbstain.disabled = false;

  // v1.0.2: Show party alignment warning during vote
  _showVoteAlignmentWarning();

  // v1.0.2: Update whip status and reset button
  _updateWhipStatus();
  if (DOM.btnEnforceWhip) {
    DOM.btnEnforceWhip.disabled = false;
    DOM.btnEnforceWhip.classList.remove('enforced');
    const labelEl = DOM.btnEnforceWhip.querySelector('.whip-btn__label');
    if (labelEl) labelEl.textContent = 'ENFORCE PARTY WHIP';
  }
}

/**
 * _showTypingIndicator() — Shows/hides the "MP is typing..." indicator.
 */
function _showTypingIndicator(show, label) {
  if (show) {
    DOM.typingIndicator.classList.remove('hidden');
    if (label) DOM.typingLabel.textContent = label;
  } else {
    DOM.typingIndicator.classList.add('hidden');
  }
}

/**
 * _showProtestCooldown() — Shows the cooldown bar after a protest.
 */
function _showProtestCooldown() {
  const bar = DOM.protestCooldownBar;
  bar.classList.remove('hidden');

  // Reset animation
  const fill = bar.querySelector('.cooldown-bar__fill');
  fill.style.animation = 'none';
  // Force reflow
  void fill.offsetWidth;
  fill.style.animation = 'cooldown-drain 5s linear forwards';

  // Hide after cooldown
  setTimeout(() => {
    bar.classList.add('hidden');
  }, 5200);
}

/**
 * _showReturnToMacroButton() — After a vote, shows the "Return to Campaign HQ" button.
 * Step 2 Cleanup: "Stay in Parliament (Macro View)" button removed.
 * The only option is to return to Campaign HQ.
 */
function _showReturnToMacroButton() {
  // Replace vote section with the single return option
  DOM.voteSection.innerHTML = `
    <div class="action-section__title">
      <span class="action-section__title-dot" style="background: var(--player-primary);"></span>
      SESSION COMPLETE
    </div>
    <div class="action-buttons-group">
      <button class="action-btn advance" id="btn-return-campaign">
        <span class="action-btn__icon">🗳️</span>
        <div class="action-btn__content">
          <div class="action-btn__label">Return to Campaign HQ</div>
          <div class="action-btn__sub">กลับไปยังกองบัญชาการ — Continue the campaign</div>
        </div>
      </button>
    </div>
  `;

  // Return to Campaign button
  const btnCampaign = document.getElementById('btn-return-campaign');
  if (btnCampaign) {
    btnCampaign.addEventListener('click', () => {
      _saveParliamentReturnData();
      exitParliamentSession({
        capitalChange: _calculateSessionCapitalGain(),
        popularityChange: 0,
        debatesCompleted: 1
      });

      // ──────────────────────────────────────────────────────────────
      // STEP 85: FORCE SAVE — Write ALL shared stats to localStorage
      // before the redirect fires. This is the CRITICAL exit hook
      // that prevents stats from resetting to 50 on module transition.
      // ──────────────────────────────────────────────────────────────
      if (parliamentState) {
        const cap = Math.round(parliamentState.playerPoliticalCapital || 50);
        const pop = Math.round(parliamentState.playerLocalPopularity || 50);
        const inf = Math.round(parliamentState.playerInfluence || 50);
        const fund = Math.round(parliamentState.playerFunds || 0);

        localStorage.setItem('tps_capital', String(cap));
        localStorage.setItem('tps_local_pop', String(pop));
        localStorage.setItem('tps_influence', String(inf));
        localStorage.setItem('tps_funds', String(fund));

        // Also persist active bills one final time
        if (typeof saveActiveBills === 'function') saveActiveBills();

        console.log('[main.js] STEP 85 — EXIT SAVE to localStorage:');
        console.log(`  → Capital:    ${cap}`);
        console.log(`  → LocalPop:   ${pop}`);
        console.log(`  → Influence:  ${inf}`);
        console.log(`  → Funds:      ${fund}`);
        console.log(`  → Bills:      ${(parliamentState.activeBills || []).length}`);
      }

      // ── MULTIPLAYER: Turn barrier — wait for all players ──
      const _isMPMode = localStorage.getItem('tps_game_mode') === 'multiplayer'
        || new URLSearchParams(window.location.search).get('mode') === 'mp';

      if (_isMPMode && typeof tpsMPCampaign !== 'undefined' && tpsMPCampaign.signalReturnReady) {
        btnCampaign.disabled = true;
        btnCampaign.querySelector('.action-btn__label').textContent = '⏳ Waiting for other players...';
        tpsMPCampaign.signalReturnReady();
        // The redirect will be triggered by the coordinator when all are ready
        return;
      }

      // ── SINGLE-PLAYER: Immediate redirect (unchanged) ──
      // Step 2: Flag for campaign to bypass Party Select screen
      localStorage.setItem('returnFromParliament', 'true');
      showToast("success", "📋 Returning to Campaign HQ with session results...");
      setTimeout(() => {
        window.location.href = '../campaign/index.html';
      }, 800);
    });
  }
}

/**
 * _saveParliamentReturnData() — Saves parliament session results
 * to sessionStorage for the campaign module to consume.
 * Part 3: Campaign ← Parliament data bridge.
 */
function _saveParliamentReturnData() {
  if (!parliamentState) return;

  const returnData = {
    capitalChange: _calculateSessionCapitalGain(),
    influenceEarned: parliamentState.playerInfluence || 0,
    debatesCompleted: parliamentState.weeklyStats.debatesParticipated,
    protestsWon: parliamentState.weeklyStats.protestsSucceeded,
    votesAttended: parliamentState.weeklyStats.votesAttended,
    interpellationsFiled: parliamentState.weeklyStats.interpellationsFiled,
    currentDay: parliamentState._campaignDay || null,
    billsInProgress: (parliamentState.activeBills || []).length,
    legislativeRecord: parliamentState.legislativeRecord || null,
    timestamp: Date.now()
  };

  try {
    sessionStorage.setItem('tps_parliament_to_campaign', JSON.stringify(returnData));
    console.log('[main.js] Parliament return data saved:', returnData);
  } catch (e) {
    console.warn('[main.js] Could not save return data:', e);
  }
}

/**
 * _calculateSessionCapitalGain() — Calculates the net political capital
 * gained during this parliament session.
 */
function _calculateSessionCapitalGain() {
  if (!parliamentState) return 0;

  const ws = parliamentState.weeklyStats;
  let gain = 0;

  // +3 per debate participated
  gain += ws.debatesParticipated * 3;
  // +5 per successful protest
  gain += ws.protestsSucceeded * 5;
  // +2 per vote attended
  gain += ws.votesAttended * 2;
  // +4 per interpellation filed
  gain += ws.interpellationsFiled * 4;

  return gain;
}

/**
 * _loadCampaignHandoff() — Reads campaign state from sessionStorage
 * (saved by campaign/timeline.js when entering parliament).
 */
function _loadCampaignHandoff() {
  try {
    const data = sessionStorage.getItem('tps_campaign_to_parliament');
    if (data) {
      const parsed = JSON.parse(data);
      sessionStorage.removeItem('tps_campaign_to_parliament');
      return parsed;
    }
  } catch (e) {
    console.warn('[main.js] Could not load campaign handoff:', e);
  }
  return null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 10: PHASE TRANSITION HANDLERS
// Manage the macro ↔ parliament UI swap.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _switchToParliamentUI() — Swaps the UI into live debate mode.
 */
function _switchToParliamentUI() {
  // Action deck
  DOM.macroActions.classList.add('hidden');
  DOM.parliamentActions.classList.remove('hidden');

  // Center panel status
  DOM.centerStatusBadge.textContent = 'LIVE SESSION';
  DOM.centerStatusBadge.style.background = 'var(--danger-bg)';
  DOM.centerStatusBadge.style.color = 'var(--danger)';

  // Show debate UI elements
  DOM.topicBanner.classList.remove('hidden');
  DOM.currentSpeakerBar.classList.remove('hidden');
  DOM.debateProgress.classList.remove('hidden');

  // Reset sections
  DOM.protestSection.classList.remove('hidden');
  DOM.speechSection.classList.add('hidden');
  DOM.voteSection.classList.add('hidden');

  // Right panel badge
  DOM.rightContextBadge.textContent = 'PARLIAMENT';
  DOM.rightContextBadge.style.background = 'var(--danger-bg)';
  DOM.rightContextBadge.style.color = 'var(--danger)';

  // Top bar
  _renderTopBar();

  // Clear old transcript
  _clearTranscript();

  console.log("[main.js] UI switched to Parliament mode.");
}

/**
 * _switchToMacroUI() — Returns the UI to macro/timeline mode.
 */
function _switchToMacroUI() {
  // Action deck
  DOM.macroActions.classList.remove('hidden');
  DOM.parliamentActions.classList.add('hidden');

  // Center panel status
  DOM.centerStatusBadge.textContent = 'STANDBY';
  DOM.centerStatusBadge.style.background = 'var(--bg-hover)';
  DOM.centerStatusBadge.style.color = 'var(--text-muted)';

  // Hide debate UI elements
  DOM.topicBanner.classList.add('hidden');
  DOM.currentSpeakerBar.classList.add('hidden');
  DOM.debateProgress.classList.add('hidden');
  _showTypingIndicator(false);

  // v1.0.2: Hide stance banner
  _hideStanceBanner();

  // Right panel badge
  DOM.rightContextBadge.textContent = 'MACRO';
  DOM.rightContextBadge.style.background = 'var(--info-bg)';
  DOM.rightContextBadge.style.color = 'var(--info)';

  // Restore vote section HTML (might have been modified by _showReturnToMacroButton)
  _restoreVoteSection();

  // Top bar
  _renderTopBar();

  // Render full UI
  _renderFullUI();

  console.log("[main.js] UI switched to Macro mode.");
}

/**
 * _restoreVoteSection() — Restores the vote section to its default state.
 */
function _restoreVoteSection() {
  DOM.voteSection.innerHTML = `
    <div class="action-section__title">
      <span class="action-section__title-dot" style="background: var(--speaker-primary);"></span>
      🗳️ CAST YOUR VOTE
    </div>
    <div class="action-buttons-group" id="vote-buttons">
      <button class="action-btn vote-aye" id="btn-vote-aye" data-vote="aye">
        <span class="action-btn__icon">✅</span>
        <div class="action-btn__content">
          <div class="action-btn__label">AYE — เห็นด้วย</div>
          <div class="action-btn__sub">Vote in favor of the bill</div>
        </div>
      </button>
      <button class="action-btn vote-nay" id="btn-vote-nay" data-vote="nay">
        <span class="action-btn__icon">❌</span>
        <div class="action-btn__content">
          <div class="action-btn__label">NAY — ไม่เห็นด้วย</div>
          <div class="action-btn__sub">Vote against the bill</div>
        </div>
      </button>
      <button class="action-btn vote-abstain" id="btn-vote-abstain" data-vote="abstain">
        <span class="action-btn__icon">⬜</span>
        <div class="action-btn__content">
          <div class="action-btn__label">ABSTAIN — งดออกเสียง</div>
          <div class="action-btn__sub">Decline to vote (-1 Capital)</div>
        </div>
      </button>
    </div>
  `;

  // Re-cache and rebind
  DOM.btnVoteAye = document.getElementById('btn-vote-aye');
  DOM.btnVoteNay = document.getElementById('btn-vote-nay');
  DOM.btnVoteAbstain = document.getElementById('btn-vote-abstain');

  if (DOM.btnVoteAye) DOM.btnVoteAye.addEventListener('click', () => _handleVote('aye'));
  if (DOM.btnVoteNay) DOM.btnVoteNay.addEventListener('click', () => _handleVote('nay'));
  if (DOM.btnVoteAbstain) DOM.btnVoteAbstain.addEventListener('click', () => _handleVote('abstain'));
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 11: ACTION HANDLERS
// Process player actions and connect them to engine functions.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _handleAdvanceResult() — Processes the result of an advanceTime() call.
 * May trigger events or parliament transitions.
 */
function _handleAdvanceResult(result) {
  if (!result) return;

  // Parliament transition is handled by callbacks (onParliamentEntry)
  // Events are handled by callbacks (onConstituencyEvent, onCommitteeEvent)

  // Update the event log
  _addEventLogEntry(result);
}

/**
 * _handleProtest() — Handles a protest button click.
 * @param {string} reasonId - "slander" | "off_topic" | "misleading"
 */
function _handleProtest(reasonId) {
  const result = raiseProtest(reasonId);

  if (result.error) {
    showToast("warning", `⚠️ ${result.error}`);
    return;
  }

  // Result is handled by the onProtestResult callback
}

/**
 * _handlePlayerSpeech() — Handles a speech button click.
 * @param {string} stanceId - "aggressive" | "technical" | "diplomatic"
 */
function _handlePlayerSpeech(stanceId) {
  const result = playerSpeak(stanceId);

  if (result.error) {
    showToast("warning", `⚠️ ${result.error}`);
    return;
  }

  // Hide speech buttons
  _hideSpeechSection();

  // Show result toast
  if (result.success) {
    showToast("success", `🎤 ${result.narrative} (Capital: ${result.capitalChange > 0 ? '+' : ''}${result.capitalChange})`);
  } else {
    showToast("error", `🎤 ${result.narrative} (Capital: ${result.capitalChange > 0 ? '+' : ''}${result.capitalChange})`);
  }

  // v1.0.2: News Engine — player speech
  if (typeof publishNews === 'function') {
    const playerName = parliamentState ? parliamentState.playerName : 'Player';
    const cat = result.success ? 'speech_success' : 'speech_fail';
    publishNews(cat, {
      player: playerName,
      style: result.stanceLabel || stanceId
    }, { sentiment: result.success ? 'positive' : 'negative' });
  }
}

/**
 * _handleVote() — Handles a vote button click.
 * @param {string} vote - "aye" | "nay" | "abstain"
 */
function _handleVote(vote) {
  // Disable all vote buttons
  DOM.btnVoteAye.disabled = true;
  DOM.btnVoteNay.disabled = true;
  DOM.btnVoteAbstain.disabled = true;

  // v1.0.2: Check alignment with party stance
  const alignment = _checkVoteAlignment(vote);
  if (!alignment.aligned) {
    showToast('warning', `⚠️ You defied the party line! Party Loyalty -8`);
    // Apply penalty to political capital (represents party loyalty)
    if (typeof applyEffects === 'function') {
      applyEffects({ politicalCapital: alignment.stancePenalty, localPopularity: 0, funds: 0 });
    }
  } else if (_currentPartyStance && _currentPartyStance !== 'free_vote') {
    showToast('info', `✅ You voted with the party line.`);
  }

  const result = castVote(vote);

  if (result.error) {
    showToast("warning", `⚠️ ${result.error}`);
    return;
  }

  // v1.0.2: Handle legislative gridlock — show amendment modal
  if (result.gridlock) {
    _showAmendmentModal(result);
    return;
  }

  // Result is handled by the onVoteResult callback
}


/**
 * _showMidSessionEventModal() — v1.0.2: Shows a mid-session crisis event modal.
 * @param {Object} event — MID_SESSION_EVENTS entry
 */
function _showMidSessionEventModal(event) {
  // Remove existing if any
  const existing = document.getElementById('mid-session-event-overlay');
  if (existing) existing.remove();

  const lang = (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.language === 'TH') ? 'th' : 'en';

  const overlay = document.createElement('div');
  overlay.id = 'mid-session-event-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:fadeIn 0.3s ease;';

  // Build effect chips for each choice
  const buildEffectChips = (effects) => {
    return Object.entries(effects).map(([key, val]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const color = val > 0 ? '#22c55e' : '#ef4444';
      const sign = val > 0 ? '+' : '';
      return `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44;margin:2px;">${sign}${val} ${label}</span>`;
    }).join(' ');
  };

  overlay.innerHTML = `
    <div style="background:var(--bg-secondary, #1a1a2e);border:2px solid #ef4444;border-radius:16px;padding:2rem;max-width:680px;width:92%;max-height:90vh;overflow-y:auto;box-shadow:0 0 80px rgba(239,68,68,0.4);animation:slideUp 0.4s ease;">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="font-size:3rem;margin-bottom:0.3rem;animation:pulse 1.5s infinite;">${event.icon}</div>
        <h2 style="color:#ef4444;font-size:1.3rem;margin:0;text-transform:uppercase;letter-spacing:1px;">
          🚨 ${lang === 'th' ? event.titleThai : event.title}
        </h2>
        <p style="color:var(--text-secondary, #a0aec0);font-size:0.85rem;margin-top:0.75rem;line-height:1.5;max-width:550px;margin-left:auto;margin-right:auto;">
          ${lang === 'th' ? event.descriptionThai : event.description}
        </p>
        <div style="margin-top:0.5rem;font-size:0.75rem;color:#f59e0b;">⏸️ ${lang === 'th' ? 'การอภิปรายหยุดชั่วคราว — เลือกการตอบสนอง' : 'Debate paused — choose your response'}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;" id="mid-session-choices">
        ${event.choices.map(choice => `
          <button class="mid-session-choice-btn" data-event-id="${event.id}" data-choice-id="${choice.id}"
            style="background:var(--bg-tertiary, #16213e);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.2rem;cursor:pointer;text-align:left;transition:all 0.25s;color:var(--text-primary, #e2e8f0);"
            onmouseenter="this.style.borderColor='#ef4444';this.style.transform='translateX(6px)';this.style.boxShadow='0 0 20px rgba(239,68,68,0.2)';"
            onmouseleave="this.style.borderColor='rgba(255,255,255,0.1)';this.style.transform='translateX(0)';this.style.boxShadow='none';">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;">
              <span style="font-size:1.4rem;">${choice.icon}</span>
              <strong style="font-size:1rem;color:#f0f0f0;">${lang === 'th' ? choice.labelThai : choice.label}</strong>
            </div>
            <p style="margin:0;font-size:0.8rem;color:var(--text-secondary, #a0aec0);line-height:1.4;">
              ${choice.description}
            </p>
            <div style="margin-top:0.4rem;">
              ${buildEffectChips(choice.effects)}
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add animation keyframes if not present
  if (!document.getElementById('mid-session-animations')) {
    const style = document.createElement('style');
    style.id = 'mid-session-animations';
    style.textContent = `
      @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  // Bind click handlers
  overlay.querySelectorAll('.mid-session-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const eventId = btn.dataset.eventId;
      const choiceId = btn.dataset.choiceId;
      overlay.remove();

      const result = resolveMidSessionEvent(eventId, choiceId);

      if (result && result.success) {
        const choice = event.choices.find(c => c.id === choiceId);
        showToast('info', `${choice?.icon || '🚨'} ${result.narrative}`);
        _renderPlayerStats();
      }
    });
  });
}


/**
 * _showAmendmentModal() — v1.0.2: Shows the legislative gridlock/amendment phase modal.
 * @param {Object} gridlockResult — The pending vote result from castVote()
 */
function _showAmendmentModal(gridlockResult) {
  // Remove existing if any
  const existing = document.getElementById('amendment-overlay');
  if (existing) existing.remove();

  const lang = (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.language === 'TH') ? 'th' : 'en';
  const options = gridlockResult.options;

  const overlay = document.createElement('div');
  overlay.id = 'amendment-overlay';
  overlay.className = 'modal-overlay active';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML = `
    <div style="background:var(--bg-secondary, #1a1a2e);border:2px solid #f59e0b;border-radius:16px;padding:2rem;max-width:720px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 0 60px rgba(245,158,11,0.3);">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="font-size:2.5rem;margin-bottom:0.5rem;">⚖️</div>
        <h2 style="color:#f59e0b;font-size:1.4rem;margin:0;">LEGISLATIVE GRIDLOCK</h2>
        <p style="color:var(--text-secondary, #a0aec0);font-size:0.85rem;margin-top:0.5rem;">
          ${lang === 'th' ? 'ร่างกฎหมายตกด้วยคะแนนห่างเพียง' : 'The bill fails by only'}
          <strong style="color:#ef4444;">${Math.abs(gridlockResult.margin)}</strong>
          ${lang === 'th' ? 'เสียง — ต้องการอีก' : 'votes — need'}
          <strong style="color:#22c55e;">${gridlockResult.votesNeeded}</strong>
          ${lang === 'th' ? 'เสียงเพื่อผ่าน' : 'more to pass'}
        </p>
        <div style="display:flex;justify-content:center;gap:2rem;margin-top:0.75rem;">
          <span style="color:#22c55e;font-weight:700;">AYE: ${gridlockResult.ayes}</span>
          <span style="color:#ef4444;font-weight:700;">NAY: ${gridlockResult.nays}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;" id="amendment-options">
        ${Object.values(options).map(opt => `
          <button class="amendment-option-btn" data-choice="${opt.id}"
            style="background:var(--bg-tertiary, #16213e);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.2rem;cursor:pointer;text-align:left;transition:all 0.2s;color:var(--text-primary, #e2e8f0);"
            onmouseenter="this.style.borderColor='#f59e0b';this.style.transform='translateX(4px)';"
            onmouseleave="this.style.borderColor='rgba(255,255,255,0.1)';this.style.transform='translateX(0)';">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;">
              <span style="font-size:1.5rem;">${opt.icon}</span>
              <strong style="font-size:1.05rem;color:#f0f0f0;">${lang === 'th' ? opt.labelThai : opt.label}</strong>
            </div>
            <p style="margin:0;font-size:0.82rem;color:var(--text-secondary, #a0aec0);line-height:1.4;">
              ${lang === 'th' ? opt.descriptionThai : opt.description}
            </p>
            <p style="margin:0.3rem 0 0;font-size:0.75rem;color:#f59e0b;font-style:italic;">
              ⚖️ ${lang === 'th' ? opt.tradeoffThai : opt.tradeoff}
            </p>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Bind click handlers
  overlay.querySelectorAll('.amendment-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      overlay.remove();

      showToast('info', `⚖️ Amendment: ${options[choice]?.label || choice}`);
      const finalResult = resolveAmendment(choice);

      if (finalResult && !finalResult.error) {
        console.log(`[main.js] Amendment resolved: ${choice} → ${finalResult.passed ? 'PASSED' : 'DEFEATED'}`);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SECTION 12: MODAL MANAGEMENT
// Show/hide modals and populate their content.
// ──────────────────────────────────────────────────────────────────────────


/**
 * _openModal() — Shows a modal overlay.
 */
function _openModal(overlay) {
  overlay.classList.add('active');
}

/**
 * _closeModal() — Hides a modal overlay.
 */
function _closeModal(overlay) {
  overlay.classList.remove('active');
}

/**
 * _showRulingModal() — Displays the protest ruling modal.
 * @param {Object} result - From raiseProtest()
 */
function _showRulingModal(result) {
  DOM.rulingIcon.textContent = result.sustained ? '✅' : '❌';

  DOM.rulingVerdict.textContent = result.ruling;
  DOM.rulingVerdict.className = `ruling-modal__verdict ${result.sustained ? 'sustained' : 'overruled'}`;

  DOM.rulingThai.textContent = result.rulingThai;

  DOM.rulingDetails.innerHTML = result.sustained
    ? `Your protest against <strong>${result.speakerName}</strong> (${result.reasonLabel}) was <strong>sustained</strong> by the Speaker of the House.<br>The honorable member has been asked to withdraw their remarks.<br><span style="color:var(--text-muted); font-size:0.78rem;">${result.ruleReference}</span>`
    : `Your protest against <strong>${result.speakerName}</strong> (${result.reasonLabel}) was <strong>overruled</strong>.<br>The Speaker found no violation. The debate continues.<br><span style="color:var(--text-muted); font-size:0.78rem;">Success chance was ${result.successChance}%</span>`;

  DOM.rulingCapital.textContent = result.capitalChange > 0
    ? `+${result.capitalChange} Political Capital`
    : `${result.capitalChange} Political Capital`;
  DOM.rulingCapital.className = `ruling-modal__capital ${result.capitalChange >= 0 ? 'positive' : 'negative'}`;

  _openModal(DOM.rulingOverlay);
}

/**
 * _showEventModal() — Displays a constituency/committee event modal.
 * @param {Object} event - Event object from data.js
 * @param {string} type - "constituency" | "committee"
 */
function _showEventModal(event, type) {
  const icon = type === 'constituency' ? '🏘️' : '📋';
  DOM.eventModalTitle.textContent = `${icon} ${event.title}`;
  DOM.eventDescription.textContent = event.description;

  // Build choice buttons
  DOM.eventChoicesContainer.innerHTML = '';
  event.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.id = `event-choice-${idx}`;

    let effectsHTML = '';
    for (const [key, val] of Object.entries(choice.effects)) {
      const label = key === 'politicalCapital' ? 'Cap'
        : key === 'localPopularity' ? 'Pop'
          : key === 'funds' ? 'Funds'
            : key;
      const isPos = val > 0;
      effectsHTML += `<span class="event-choice-btn__effect ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : ''}${val} ${label}</span>`;
    }

    btn.innerHTML = `
      <div class="event-choice-btn__label">${choice.label}</div>
      <div class="event-choice-btn__label-thai">${choice.labelThai}</div>
      <div class="event-choice-btn__effects">${effectsHTML}</div>
    `;

    btn.addEventListener('click', () => {
      // Apply effects
      applyEffects(choice.effects);

      // Log the event
      logEvent(type, event.title, choice.narrative || choice.label, choice.effects);

      // Show narrative toast
      showToast("info", `📝 ${choice.narrative || choice.label}`);

      // Close modal
      _closeModal(DOM.eventOverlay);

      // Refresh stats
      _renderPlayerStats();

      // Add to event log in left panel
      _pushEventLogItem(event.title, choice.effects);
    });

    DOM.eventChoicesContainer.appendChild(btn);
  });

  _openModal(DOM.eventOverlay);
}

/**
 * _showParliamentNotification() — Shows the "Parliament is in session" modal.
 */
function _showParliamentNotification(schedule, isUrgent) {
  const s = parliamentState;
  const dayName = DAY_NAMES[s.currentDayIndex];
  const dayThai = DAY_NAMES_THAI[s.currentDayIndex];

  DOM.parliamentNotifyDay.textContent = `${dayName} — ${dayThai}`;

  const topic = getRandomDebateTopic();
  DOM.parliamentNotifyTopic.textContent = isUrgent
    ? `⚠️ URGENT: Censure debate or emergency motion expected today.`
    : `Today's agenda: ${topic.title}`;

  // Store the selected topic for session start
  DOM.parliamentNotifyOverlay._pendingTopic = topic;

  _openModal(DOM.parliamentNotifyOverlay);
}

/**
 * _startParliamentSession() — Begins the live debate.
 */
function _startParliamentSession() {
  // STEP 92: Resolve any bills that reached Second Reading
  // Returns the title of the last passed bill (if any) for debate injection
  const passedBillTitle = _processPendingBills();

  // Switch UI
  _switchToParliamentUI();

  // Enter parliament formally
  const sessionInfo = enterParliamentSession();

  // Get the pending topic
  const topic = DOM.parliamentNotifyOverlay._pendingTopic || getRandomDebateTopic();

  // STEP 92/93: If a bill just passed, override the topic banner
  if (passedBillTitle) {
    DOM.topicCategory.textContent = 'PASSED LEGISLATION';
    DOM.topicTitle.textContent = `Debating the passage of: ${passedBillTitle}`;
    DOM.topicTitleThai.textContent = `อภิปรายผลสำเร็จ: ${passedBillTitle}`;
  } else {
    // Normal topic
    DOM.topicCategory.textContent = topic.category.toUpperCase() + ' BILL';
    DOM.topicTitle.textContent = topic.title;
    DOM.topicTitleThai.textContent = topic.titleThai;
  }

  // v1.0.2: Compute and render party stance
  _renderStanceBanner(topic);

  // Render any queued interpellations in the parliament panel
  _renderParliamentInterpellations();

  // Start the debate!
  runDebate(topic);

  // v1.0.2: Publish news on bill proposal + public poll
  _publishBillProposalNews(topic);
}

/**
 * STEP 89/92: _processPendingBills() — Auto-resolves bills at SECOND_READING
 * when a new Parliament session begins. Rolls RNG against passChance,
 * applies buffed rewards if passed, builds a summary modal, and
 * returns the last passed bill’s title for debate topic injection.
 *
 * @returns {string|null} Title of last passed bill (for debate injection), or null
 */
function _processPendingBills() {
  if (!parliamentState || !parliamentState.activeBills) return null;
  if (typeof BILL_STAGES === 'undefined') return null;

  const pending = parliamentState.activeBills.filter(
    b => b.stage === BILL_STAGES.SECOND_READING
  );

  if (pending.length === 0) return null;

  console.log(`[main.js] STEP 92 — Processing ${pending.length} bill(s) at Second Reading...`);

  let summaryHTML = '';
  let lastPassedTitle = null;

  pending.forEach(bill => {
    const roll = Math.random() * 100;
    const passed = roll <= (bill.passChance || 50);

    // Delegate to engine.js resolveBill (handles rewards, stage update, save)
    if (typeof resolveBill === 'function') {
      const result = resolveBill(bill.id, passed);

      if (passed) {
        const capR = result.capitalReward || 0;
        const popR = result.popularityReward || 0;
        lastPassedTitle = bill.title;

        summaryHTML += `
          <div style="padding: 10px 12px; margin-bottom: 8px; background: rgba(76,175,80,0.1); border-left: 3px solid var(--success); border-radius: 4px;">
            <div style="font-weight: 700; font-size: 0.82rem; color: var(--success);">✅ ${bill.title} — PASSED</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 4px;">
              ${bill.titleThai || ''}
            </div>
            <div style="font-size: 0.72rem; margin-top: 6px; color: var(--text-bright);">
              Rewards: <strong>+${capR} Political Capital</strong>, <strong>+${popR} Local Popularity</strong>
            </div>
            <div style="font-size: 0.64rem; color: var(--text-muted); margin-top: 2px;">Pass chance was ${bill.passChance || 50}%</div>
          </div>`;
      } else {
        const flavor = result.flavor || 'The opposition held firm.';
        summaryHTML += `
          <div style="padding: 10px 12px; margin-bottom: 8px; background: rgba(244,67,54,0.08); border-left: 3px solid var(--danger); border-radius: 4px;">
            <div style="font-weight: 700; font-size: 0.82rem; color: var(--danger);">❌ ${bill.title} — DEFEATED</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 4px;">
              ${bill.titleThai || ''}
            </div>
            <div style="font-size: 0.72rem; margin-top: 6px; color: var(--text-bright);">
              ${flavor} <em>No penalties applied.</em>
            </div>
            <div style="font-size: 0.64rem; color: var(--text-muted); margin-top: 2px;">Pass chance was ${bill.passChance || 50}%</div>
          </div>`;
      }
    }
  });

  // Remove resolved bills from the active pipeline
  parliamentState.activeBills = parliamentState.activeBills.filter(
    b => b.stage !== BILL_STAGES.PASSED && b.stage !== BILL_STAGES.DEFEATED
  );

  // Persist cleaned pipeline
  if (typeof saveActiveBills === 'function') saveActiveBills();

  // Refresh legislation UI
  if (typeof _renderLegislationUI === 'function') _renderLegislationUI();
  _renderPlayerStats();

  // STEP 92: Show the resolution summary modal
  if (summaryHTML && DOM.billResolutionOverlay && DOM.billResolutionResults) {
    DOM.billResolutionResults.innerHTML = summaryHTML;
    _openModal(DOM.billResolutionOverlay);
  }

  return lastPassedTitle;
}

/**
 * _publishBillProposalNews() — v1.0.2: Publishes news headlines and polls when a bill is proposed.
 * @param {Object} topic — The DEBATE_TOPICS entry being debated
 */
function _publishBillProposalNews(topic) {
  if (typeof publishNews !== 'function' || !topic) return;

  const playerName = (parliamentState && parliamentState.playerName) || 'Player';
  const partyName = (parliamentState && parliamentState.playerPartyName) || 'Player Party';

  // 1. Immediate bill proposal headline
  publishNews('bill_proposed', {
    player: playerName,
    topic: topic.title
  }, { sentiment: 'positive' });

  // 2. Delayed poll reaction (1.5s later for dramatic effect)
  setTimeout(() => {
    // Generate approval based on publicInterest + some randomness
    const baseApproval = topic.publicInterest || 60;
    const variance = Math.floor(Math.random() * 20) - 10; // -10 to +10
    const approval = Math.max(25, Math.min(92, baseApproval + variance));
    const sentiment = approval >= 55 ? 'positive' : 'negative';

    publishNews('bill_poll', {
      topic: topic.title,
      party: partyName,
      approval: approval.toString()
    }, { sentiment, showPoll: true });

    console.log(`[main.js] Bill poll published: ${approval}% approval for "${topic.title}"`);
  }, 1500);
}

/**
 * _showInterpellationPicker() — Shows the interpellation topic selection modal.
 */
function _showInterpellationPicker() {
  const topics = getInterpellationTopics();
  const queued = parliamentState ? parliamentState.interpellationQueue.map(q => q.id) : [];

  DOM.interpTopicsContainer.innerHTML = '';

  topics.forEach(interp => {
    const isQueued = queued.includes(interp.id);

    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.disabled = isQueued;
    if (isQueued) btn.style.opacity = '0.4';

    btn.innerHTML = `
      <div class="event-choice-btn__label">${interp.question}</div>
      <div class="event-choice-btn__label-thai">${interp.questionThai}</div>
      <div class="event-choice-btn__effects">
        <span class="event-choice-btn__effect neutral" style="background: var(--info-bg); color: var(--info);">Target: ${interp.target}</span>
        <span class="event-choice-btn__effect ${interp.difficulty > 70 ? 'negative' : 'positive'}">Difficulty: ${interp.difficulty}%</span>
        ${isQueued ? '<span class="event-choice-btn__effect" style="background: var(--warning-bg); color: var(--warning);">QUEUED</span>' : ''}
      </div>
    `;

    if (!isQueued) {
      btn.addEventListener('click', () => {
        const result = queueInterpellation(interp.id);
        if (result.success) {
          showToast("success", `❓ Interpellation queued: "${interp.question.substring(0, 50)}..."`);
          _closeModal(DOM.interpOverlay);
          _renderActionDeck();
        } else {
          showToast("error", result.error);
        }
      });
    }

    DOM.interpTopicsContainer.appendChild(btn);
  });

  _openModal(DOM.interpOverlay);
}

/**
 * _renderParliamentInterpellations() — Populates the interpellation
 * buttons in the parliament action panel.
 */
function _renderParliamentInterpellations() {
  if (!parliamentState) return;

  const pending = parliamentState.interpellationQueue.filter(q => q.status === 'pending');

  if (pending.length === 0) {
    DOM.interpParliamentButtons.innerHTML = `
      <div style="font-size: 0.72rem; color: var(--text-muted); padding: 8px; text-align: center;">
        No interpellations queued for this session.
      </div>
    `;
    return;
  }

  DOM.interpParliamentButtons.innerHTML = '';
  pending.forEach(interp => {
    const btn = document.createElement('button');
    btn.className = 'action-btn interpellation';
    btn.innerHTML = `
      <span class="action-btn__icon">❓</span>
      <div class="action-btn__content">
        <div class="action-btn__label">${interp.question.substring(0, 40)}...</div>
        <div class="action-btn__sub">Target: ${interp.target}</div>
      </div>
    `;

    btn.addEventListener('click', () => {
      _showInterpellationResolutionModal(interp);
    });

    DOM.interpParliamentButtons.appendChild(btn);
  });
}

/**
 * _showInterpellationResolutionModal() — Mini-modal for resolving
 * an interpellation during a live session.
 */
function _showInterpellationResolutionModal(interp) {
  DOM.eventModalTitle.textContent = `❓ กระทู้ถามสด — Live Interpellation`;
  DOM.eventDescription.innerHTML = `
    <strong>Your question:</strong><br>
    ${interp.question}<br><br>
    <span class="font-thai">${interp.questionThai}</span><br><br>
    <span class="text-muted">Target: ${interp.target} | Difficulty: ${interp.difficulty}%</span>
  `;

  DOM.eventChoicesContainer.innerHTML = '';

  const stances = [
    { id: 'aggressive', label: '🔥 Press Hard (กดดัน)', desc: 'Aggressively demand specifics' },
    { id: 'diplomatic', label: '🤝 Seek Clarification (ขอความกระจ่าง)', desc: 'Politely but firmly' },
    { id: 'evade', label: '⬜ Accept Answer (ยอมรับคำตอบ)', desc: 'Accept and move on' }
  ];

  stances.forEach(stance => {
    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.innerHTML = `
      <div class="event-choice-btn__label">${stance.label}</div>
      <div class="event-choice-btn__label-thai">${stance.desc}</div>
    `;

    btn.addEventListener('click', () => {
      const result = resolveInterpellation(interp.id, stance.id);
      _closeModal(DOM.eventOverlay);

      if (result.error) {
        showToast("error", result.error);
      } else {
        _renderPlayerStats();
        _renderParliamentInterpellations();
      }
    });

    DOM.eventChoicesContainer.appendChild(btn);
  });

  _openModal(DOM.eventOverlay);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 13: EVENT LOG (LEFT PANEL)
// Small scrolling log of recent events.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _addEventLogEntry() — Adds a timeline advance entry to the event log.
 */
function _addEventLogEntry(result) {
  if (!result) return;

  const schedType = result.scheduleType;
  const text = schedType
    ? `${schedType.icon || '•'} ${result.dayName} ${result.timeName}: ${schedType.label}`
    : `${result.dayName} — ${result.timeName}`;

  _pushEventLogItem(text, null, 'neutral');
}

/**
 * _pushEventLogItem() — Pushes a formatted entry to the event log panel.
 */
function _pushEventLogItem(text, effects, type) {
  const item = document.createElement('div');
  item.className = 'event-log__item';

  if (effects) {
    const netEffect = (effects.politicalCapital || 0) + (effects.localPopularity || 0);
    if (netEffect > 0) item.classList.add('positive');
    else if (netEffect < 0) item.classList.add('negative');
    else item.classList.add('neutral');
  } else {
    item.classList.add(type || 'neutral');
  }

  item.textContent = text;

  DOM.eventLogList.insertBefore(item, DOM.eventLogList.firstChild);

  // Keep max 30 entries
  while (DOM.eventLogList.children.length > 30) {
    DOM.eventLogList.removeChild(DOM.eventLogList.lastChild);
  }
}

/**
 * _animateStatChange() — Adds a brief visual animation to a stat card.
 */
function _animateStatChange(statCardId, type) {
  const card = document.getElementById(statCardId);
  if (!card) return;

  card.classList.add('anim-shake');
  setTimeout(() => card.classList.remove('anim-shake'), 600);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 14: TOAST NOTIFICATION SYSTEM
// Shows temporary notification banners in the top-right corner.
// ──────────────────────────────────────────────────────────────────────────

/**
 * showToast() — Displays a toast notification.
 *
 * @param {string} type - "success" | "error" | "warning" | "info"
 * @param {string} message - The message to display
 * @param {number} duration - How long to show (ms, default 4000)
 */
function showToast(type, message, duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast__text">${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 15: LEGISLATION UI (Step 4)
// Handles bill proposal modal, committee modal, active bills rendering.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _showBillProposalModal() — Opens the bill proposal picker modal.
 * Renders available bill templates from legislation.js.
 */
function _showBillProposalModal() {
  if (typeof getLegislativeSummary !== 'function') {
    showToast('error', 'Legislation module not loaded.');
    return;
  }

  const summary = getLegislativeSummary();

  // Update modal header stats
  if (DOM.modalInfluenceDisplay) DOM.modalInfluenceDisplay.textContent = summary.currentInfluence;
  if (DOM.modalSlotsDisplay) DOM.modalSlotsDisplay.textContent = summary.slotsRemaining;

  // Build template cards
  DOM.billTemplatesContainer.innerHTML = '';

  if (summary.availableTemplates.length === 0) {
    DOM.billTemplatesContainer.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--text-muted); padding: 16px; text-align: center;">
        ${summary.slotsRemaining === 0 ? 'All bill slots are full. Complete or withdraw an existing bill.' : 'All available bills have been proposed.'}
      </div>
    `;
  } else {
    summary.availableTemplates.forEach(template => {
      const card = document.createElement('button');
      card.className = 'event-choice-btn';
      card.disabled = !template.canAfford;
      if (!template.canAfford) card.style.opacity = '0.5';

      const diffColor = template.difficulty > 60 ? 'negative' : template.difficulty > 40 ? '' : 'positive';

      card.innerHTML = `
        <div class="event-choice-btn__label">📜 ${template.title}</div>
        <div class="event-choice-btn__label-thai">${template.titleThai}</div>
        <div style="font-size: 0.72rem; color: var(--text-secondary); margin: 4px 0;">${template.description}</div>
        <div class="event-choice-btn__effects">
          <span class="event-choice-btn__effect ${template.canAfford ? '' : 'negative'}">🔮 ${template.influenceCost} Influence</span>
          <span class="event-choice-btn__effect">✍️ ${template.requiredSignatures} sigs needed</span>
          <span class="event-choice-btn__effect ${diffColor}">⚡ ${template.difficulty}% difficulty</span>
          <span class="event-choice-btn__effect positive">👥 ${template.publicApproval}% approval</span>
        </div>
      `;

      card.addEventListener('click', () => {
        const result = proposeBill(template.id);
        _closeModal(DOM.billProposalOverlay);

        if (result.success) {
          showToast(result.toastType, result.toastMessage);
          _renderLegislationUI();
          _renderPlayerStats();
        } else {
          showToast('error', `❌ ${result.error}`);
        }
      });

      DOM.billTemplatesContainer.appendChild(card);
    });
  }

  _openModal(DOM.billProposalOverlay);
}

/**
 * _showCommitteeExpertModal() — Opens the committee expert selection modal.
 * @param {string} billId — The bill entering committee
 */
function _showCommitteeExpertModal(billId) {
  if (typeof getCommitteeChoices !== 'function') {
    showToast('error', 'Legislation module not loaded.');
    return;
  }

  const bill = (parliamentState?.activeBills || []).find(b => b.id === billId);
  if (!bill) {
    showToast('error', 'Bill not found.');
    return;
  }

  // Set modal title
  if (DOM.committeeBillTitle) {
    DOM.committeeBillTitle.textContent = `${bill.title} — ${bill.titleThai}`;
  }

  // Build expert choice cards
  const choices = getCommitteeChoices(billId);
  DOM.committeeExpertsContainer.innerHTML = '';

  choices.forEach(expert => {
    const card = document.createElement('button');
    card.className = 'event-choice-btn';

    let effectsHTML = '';
    expert.effectsSummary.forEach(effect => {
      const isPos = effect.includes('+');
      const isNeg = effect.includes('-') || effect.includes('Risk');
      effectsHTML += `<span class="event-choice-btn__effect ${isPos ? 'positive' : isNeg ? 'negative' : ''}">${effect}</span>`;
    });

    card.innerHTML = `
      <div class="event-choice-btn__label">${expert.icon} ${expert.label}</div>
      <div class="event-choice-btn__label-thai">${expert.labelThai}</div>
      <div style="font-size: 0.72rem; color: var(--text-secondary); margin: 4px 0;">${expert.description}</div>
      <div class="event-choice-btn__effects">
        ${effectsHTML}
        <span class="event-choice-btn__effect ${expert.riskLevel.includes('No risk') ? 'positive' : 'negative'}">${expert.riskLevel}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      const result = runCommitteePhase(billId, expert.id);
      _closeModal(DOM.committeeOverlay);

      if (result.success) {
        showToast(result.toastType, result.toastMessage, 6000);
        if (result.scandalTriggered) {
          showToast('warning', `📰 ${result.narrative}`, 8000);
        }
        _renderLegislationUI();
        _renderPlayerStats();
      } else {
        showToast('error', `❌ ${result.error}`);
      }
    });

    DOM.committeeExpertsContainer.appendChild(card);
  });

  _openModal(DOM.committeeOverlay);
}

/**
 * _renderLegislationUI() — Updates all legislation-related UI elements.
 * Called after any legislative action.
 */
function _renderLegislationUI() {
  if (typeof getLegislativeSummary !== 'function') return;

  const summary = getLegislativeSummary();

  // Update influence display
  if (DOM.influenceDisplay) {
    DOM.influenceDisplay.textContent = `${summary.currentInfluence}/100`;
  }

  // Update bill slots badge
  if (DOM.billSlotsBadge) {
    DOM.billSlotsBadge.textContent = summary.slotsRemaining;
    DOM.billSlotsBadge.style.background = summary.slotsRemaining === 0 ? 'var(--danger)' : 'var(--warning)';
  }

  // Render active bills pipeline
  if (DOM.activeBillsList) {
    if (summary.activeBills.length === 0) {
      DOM.activeBillsList.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); padding: 8px; text-align: center;">
          No bills in the pipeline.
        </div>
      `;
    } else {
      DOM.activeBillsList.innerHTML = '';
      summary.activeBills.forEach(bill => {
        const card = document.createElement('div');
        card.className = 'stat-mini';
        card.style.cssText = 'padding: 6px 8px; margin-bottom: 4px; background: var(--bg-hover); border-radius: 6px; cursor: pointer;';

        // Stage color
        const stageColors = {
          signatures: 'var(--warning)',
          first_reading: 'var(--info)',
          committee: 'var(--speaker-primary)',
          second_reading: 'var(--success)',
          vote: 'var(--danger)',
          passed: 'var(--success)',
          defeated: 'var(--danger)'
        };
        const stageColor = stageColors[bill.stage] || 'var(--text-muted)';

        let actionHTML = '';
        if (bill.canGatherSignatures) {
          actionHTML = `<div style="font-size: 0.6rem; color: var(--warning); margin-top: 2px;">📝 ${bill.signatures}/${bill.requiredSignatures} signatures (${bill.signatureProgress}%) — Click to lobby</div>`;
        } else if (bill.canEnterCommittee) {
          actionHTML = `<div style="font-size: 0.6rem; color: var(--speaker-primary); margin-top: 2px;">⚖️ Ready for Committee — Click to choose expert</div>`;
        } else if (bill.isReadyForVote) {
          actionHTML = `<div style="font-size: 0.6rem; color: var(--success); margin-top: 2px;">🗳️ Pass chance: ${bill.passChance}% — Awaiting Second Reading debate</div>`;
        }

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-bright);">${bill.title}</span>
            <span style="font-size: 0.55rem; padding: 1px 6px; border-radius: 3px; background: ${stageColor}20; color: ${stageColor}; font-weight: 700; text-transform: uppercase;">${bill.stage}</span>
          </div>
          ${actionHTML}
        `;

        // Click handler for bill actions
        card.addEventListener('click', () => {
          if (bill.canGatherSignatures) {
            _handleSignatureLobby(bill.id);
          } else if (bill.canEnterCommittee) {
            _showCommitteeExpertModal(bill.id);
          }
        });

        DOM.activeBillsList.appendChild(card);
      });
    }
  }
}

/**
 * _handleSignatureLobby() — Handles a signature gathering attempt.
 * @param {string} billId — Active bill ID
 */
function _handleSignatureLobby(billId) {
  if (typeof runSignaturePhase !== 'function') {
    showToast('error', 'Legislation module not loaded.');
    return;
  }

  const result = runSignaturePhase(billId);

  if (result.success !== undefined) {
    showToast(result.toastType || 'info', result.toastMessage || result.message);

    if (result.stageAdvanced) {
      // Bill moved to committee — prompt for expert selection
      setTimeout(() => {
        _showCommitteeExpertModal(billId);
      }, 1500);
    }

    _renderLegislationUI();
    _renderPlayerStats();
  } else {
    showToast('error', `❌ ${result.error}`);
  }
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 15B: ACTIVE PARTY IDENTITY INDICATOR (STEP 21)
// Maps the player's party ID to a display name + color for the header.
// ──────────────────────────────────────────────────────────────────────────

/** Party display lookup — mirrors campaign/data.js CAMPAIGN_PARTIES
 *  STEP 30 FIX: Added correct campaign IDs for STK/PTR parties.
 */
const PARTY_DISPLAY_MAP = {
  // Correct campaign IDs (from campaign/data.js)
  khana_pracharat: { name: 'Khana Pracharat Party', color: '#FF6B2B' },
  phak_pracha_niyom: { name: 'Pracha Niyom Party', color: '#E63946' },
  palang_ratthaniyom: { name: 'Palang Ratthaniyom Party', color: '#1D3557' },
  setthakij_thai: { name: 'Setthakij Thai Party', color: '#2A9D8F' },  // STEP 30 FIX
  pak_tai_ruamjai: { name: 'Pak Tai Ruamjai Party', color: '#457B9D' },  // STEP 30 FIX
  // Legacy fallbacks (old incorrect IDs — kept for save compatibility)
  sahaphan_thai_klang: { name: 'Setthakij Thai Party', color: '#2A9D8F' },
  phak_thai_ruam: { name: 'Pak Tai Ruamjai Party', color: '#457B9D' },
  // Main-game party ID aliases
  progressive_move: { name: 'Progressive Move Party', color: '#FF6B2B' },
  peoples_populist: { name: "People's Populist Party", color: '#E63946' },
  national_heritage: { name: 'National Heritage Party', color: '#1D3557' },
  thai_unity: { name: 'Thai Unity Party', color: '#457B9D' },
  southern_pact: { name: 'Southern Pact Coalition', color: '#2A9D8F' },
};

/**
 * _populatePartyIndicator() — Fills the header party identity display.
 * @param {string} partyId — ID of the player's party
 */
function _populatePartyIndicator(partyId) {
  // Try campaign handoff ID, then localStorage
  const id = partyId || localStorage.getItem('campaign_party_id');
  if (!id) return;

  const info = PARTY_DISPLAY_MAP[id];
  if (!info) {
    console.warn(`[main.js] Unknown party ID for indicator: "${id}"`);
    return;
  }

  const dot = document.getElementById('player-party-color-dot');
  const nameEl = document.getElementById('player-party-name');
  if (dot) {
    dot.style.background = info.color;
    dot.style.boxShadow = `0 0 8px ${info.color}`;
  }
  if (nameEl) nameEl.textContent = info.name;

  console.log(`[main.js] Party indicator set: "${info.name}" (${info.color})`);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 16: BOOT
// Start the game when the page loads.
// ──────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initGame();
});


// ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
// SECTION 16: MULTIPLAYER — Return to Campaign (called by MP coordinator)
// ──────────────────────────────────────────────────────────────────────────

/**
 * _doReturnToCampaign() — Called by the MP coordinator when ALL players
 * have pressed "Return to Campaign". Performs the actual redirect.
 */
function _doReturnToCampaign() {
  localStorage.setItem('returnFromParliament', 'true');
  showToast("success", "📋 All players ready! Returning to Campaign HQ...");
  const session = JSON.parse(localStorage.getItem('tps_mp_session') || '{}');
  const room = session.roomCode || '';
  setTimeout(() => {
    window.location.href = `../campaign/index.html?mode=mp&room=${room}`;
  }, 800);
}

// ──────────────────────────────────────────────────────────────────────────
// SECTION 17: MODULE INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/main.js] UI Orchestrator loaded.");
console.log("  → Awaiting DOMContentLoaded to initialize game.");
console.log("═══════════════════════════════════════════════════════════");
