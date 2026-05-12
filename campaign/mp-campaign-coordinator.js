// ═══════════════════════════════════════════════════════════════════════════
// TPS — campaign/mp-campaign-coordinator.js
// Multiplayer Campaign Coordinator — PeerJS P2P for Election Race
// ═══════════════════════════════════════════════════════════════════════════
// Loaded AFTER main.js. Only activates when URL has ?mode=mp.
// Handles: PeerJS reconnection, party sync, ready states, turn barriers,
// polls/map sync, and leave room logic.
// ═══════════════════════════════════════════════════════════════════════════

const tpsMPCampaign = (() => {
  'use strict';

  // ── Detection: only run in multiplayer mode ──
  const _params = new URLSearchParams(window.location.search);
  const isMP = _params.get('mode') === 'mp';
  if (!isMP) {
    console.log('[mp-coordinator] Single-player mode — coordinator inactive.');
    return { isMP: false };
  }

  // ── Load session from localStorage ──
  let session = {};
  try { session = JSON.parse(localStorage.getItem('tps_mp_session') || '{}'); } catch(e) {}

  const roomCode = session.roomCode || _params.get('room') || '';
  const playerId = session.playerId || 'p_' + Date.now().toString(36);
  const playerName = session.playerName || 'Player';
  const isHost = session.isHost || false;
  const PEER_PREFIX = 'TPS_';

  // ── State ──
  let _peer = null;
  let _connections = [];       // Host: connections to joiners
  let _hostConnection = null;  // Joiner: connection to host
  let _connected = false;

  const mpState = {
    players: session.players || [],
    partySelections: {},    // { playerId: partyId }
    readyStates: {},        // { playerId: boolean }
    dayReadyPlayers: [],    // playerIds who clicked "Next Day"
    returnReadyPlayers: [], // playerIds who clicked "Return to Campaign"
    parliamentVotes: {},    // { playerId: 'enter' | 'ignore' }
    coalitionState: null,    // MP coalition negotiation state
    electionReadyPlayers: [], // playerIds who clicked "Hold Election"
    coalitionReadyPlayers: [], // playerIds who clicked "Proceed to Coalition"
    gameStarted: false,
    phase: 'party_select',  // 'party_select' | 'campaign' | 'parliament'
  };

  // ── Initialize ready states ──
  mpState.players.forEach(p => {
    mpState.readyStates[p.id] = false;
  });

  console.log(`[mp-coordinator] MP mode active. Room: ${roomCode}, Host: ${isHost}, Players: ${mpState.players.length}`);

  // ════════════════════════════════════════════════════════════════
  // SECTION 1: PeerJS Reconnection
  // ════════════════════════════════════════════════════════════════

  function _initPeerJS() {
    if (!roomCode) { console.warn('[mp-coordinator] No room code!'); return; }
    if (_peer) { try { _peer.destroy(); } catch(e){} _peer = null; }

    if (isHost) {
      _peer = new Peer(PEER_PREFIX + roomCode, { debug: 0 });

      _peer.on('open', () => {
        console.log(`[mp-coordinator] Host peer opened: ${_peer.id}`);
        _connected = true;
        _updateUI();
      });

      _peer.on('connection', (conn) => {
        _connections.push(conn);
        conn.on('open', () => {
          conn.send({ type: 'mp_sync', data: {
            players: mpState.players,
            partySelections: mpState.partySelections,
            readyStates: mpState.readyStates,
            phase: mpState.phase,
            gameStarted: mpState.gameStarted,
            dayReadyPlayers: mpState.dayReadyPlayers,
            returnReadyPlayers: mpState.returnReadyPlayers,
          }});
        });
        conn.on('data', (msg) => _handleMessage(msg, conn));
        conn.on('close', () => {
          _connections = _connections.filter(c => c !== conn);
          const left = mpState.players.find(p => p._connPeer === conn.peer);
          if (left) _handlePlayerLeave(left.id, left.name);
        });
      });

      _peer.on('error', (err) => {
        console.error('[mp-coordinator] Host error:', err);
        if (err.type === 'unavailable-id') {
          // Peer ID taken — try with a suffix
          setTimeout(() => {
            _peer = new Peer(PEER_PREFIX + roomCode + '_h', { debug: 0 });
            _peer.on('open', () => { _connected = true; _updateUI(); });
            _peer.on('connection', (conn) => {
              _connections.push(conn);
              conn.on('data', (msg) => _handleMessage(msg, conn));
            });
          }, 500);
        }
      });

    } else {
      // Joiner
      _peer = new Peer(undefined, { debug: 0 });
      _peer.on('open', () => {
        const hostId = PEER_PREFIX + roomCode;
        _hostConnection = _peer.connect(hostId, { reliable: true });

        _hostConnection.on('open', () => {
          _connected = true;
          _hostConnection.send({ type: 'mp_reconnect', data: { playerId, playerName } });
          _updateUI();
        });
        _hostConnection.on('data', (msg) => _handleMessage(msg, _hostConnection));
        _hostConnection.on('close', () => {
          _connected = false;
          // Try alternate host ID
          const altId = PEER_PREFIX + roomCode + '_h';
          _hostConnection = _peer.connect(altId, { reliable: true });
          _hostConnection.on('open', () => {
            _connected = true;
            _hostConnection.send({ type: 'mp_reconnect', data: { playerId, playerName } });
          });
          _hostConnection.on('data', (msg) => _handleMessage(msg, _hostConnection));
        });
        _hostConnection.on('error', () => {
          console.warn('[mp-coordinator] Could not connect to host.');
        });
      });

      _peer.on('error', (err) => {
        console.error('[mp-coordinator] Joiner error:', err);
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 2: Message Router
  // ════════════════════════════════════════════════════════════════

  function _broadcast(msg) {
    if (isHost) {
      _connections.forEach(c => { if (c.open) try { c.send(msg); } catch(e){} });
    } else if (_hostConnection && _hostConnection.open) {
      _hostConnection.send(msg);
    }
  }

  function _handleMessage(msg, conn) {
    if (!msg || !msg.type) return;
    const d = msg.data || {};

    switch (msg.type) {
      // ── Sync (joiner receives full state from host) ──
      case 'mp_sync':
        mpState.players = d.players || [];
        mpState.partySelections = d.partySelections || {};
        mpState.readyStates = d.readyStates || {};
        mpState.phase = d.phase || 'party_select';
        mpState.gameStarted = d.gameStarted || false;
        mpState.dayReadyPlayers = d.dayReadyPlayers || [];
        mpState.returnReadyPlayers = d.returnReadyPlayers || [];
        _updateUI();
        break;

      // ── Reconnect (host receives from joiner) ──
      case 'mp_reconnect':
        if (isHost) {
          const existing = mpState.players.find(p => p.id === d.playerId);
          if (existing) { existing._connPeer = conn.peer; }
          _broadcast({ type: 'mp_sync', data: { ...mpState } });
        }
        break;

      // ── Party Selection ──
      case 'party_selected':
        mpState.partySelections[d.playerId] = d.partyId;
        if (isHost) _broadcast({ type: 'party_selected', data: d });
        _updateUI();
        break;

      case 'party_deselected':
        delete mpState.partySelections[d.playerId];
        if (isHost) _broadcast({ type: 'party_deselected', data: d });
        _updateUI();
        break;

      // ── Ready State ──
      case 'player_ready':
        mpState.readyStates[d.playerId] = d.isReady;
        if (isHost) _broadcast({ type: 'player_ready', data: d });
        _updateUI();
        break;

      // ── Game Begin (host starts campaign) ──
      case 'mp_game_begin':
        mpState.gameStarted = true;
        mpState.phase = 'campaign';
        if (d.difficulty) localStorage.setItem('tps_difficulty', d.difficulty);
        if (d.balanceMode) localStorage.setItem('tps_balance_mode', d.balanceMode);
        _startCampaignLocally();
        break;

      // ── Day Barrier ──
      case 'day_ready':
        if (isHost) {
          if (!mpState.dayReadyPlayers.includes(d.playerId)) {
            mpState.dayReadyPlayers.push(d.playerId);
          }
          _broadcast({ type: 'day_ready_update', data: { count: mpState.dayReadyPlayers.length, total: mpState.players.length } });
          if (mpState.dayReadyPlayers.length >= mpState.players.length) {
            mpState.dayReadyPlayers = [];
            _broadcast({ type: 'advance_day', data: {} });
            _advanceDayLocally();
          }
        }
        break;

      case 'day_ready_update':
        _showBarrierStatus('btn-next-day', d.count, d.total, 'Waiting...');
        break;

      case 'advance_day':
        mpState.dayReadyPlayers = [];
        _advanceDayLocally();
        break;

      // ── Election Barrier ──
      case 'election_ready':
        if (isHost) {
          if (!mpState.electionReadyPlayers.includes(d.playerId)) {
            mpState.electionReadyPlayers.push(d.playerId);
          }
          _broadcast({ type: 'election_ready_update', data: { count: mpState.electionReadyPlayers.length, total: mpState.players.length } });
          if (mpState.electionReadyPlayers.length >= mpState.players.length) {
            mpState.electionReadyPlayers = [];
            _broadcast({ type: 'election_go', data: {} });
            // Also trigger locally on host
            if (typeof window._triggerElection === 'function') window._triggerElection();
          }
        }
        break;

      case 'election_ready_update':
        _showBarrierStatus('btn-hold-election', d.count, d.total, 'Waiting...');
        break;

      case 'election_go':
        mpState.electionReadyPlayers = [];
        if (typeof window._triggerElection === 'function') window._triggerElection();
        break;

      // ── Coalition Barrier ──
      case 'coalition_ready':
        if (isHost) {
          if (!mpState.coalitionReadyPlayers.includes(d.playerId)) {
            mpState.coalitionReadyPlayers.push(d.playerId);
          }
          _broadcast({ type: 'coalition_ready_update', data: { count: mpState.coalitionReadyPlayers.length, total: mpState.players.length } });
          if (mpState.coalitionReadyPlayers.length >= mpState.players.length) {
            mpState.coalitionReadyPlayers = [];
            _broadcast({ type: 'coalition_go', data: {} });
            if (typeof window._triggerCoalition === 'function') window._triggerCoalition();
          }
        }
        break;

      case 'coalition_ready_update':
        _showBarrierStatus('btn-to-coalition', d.count, d.total, 'Waiting...');
        break;

      case 'coalition_go':
        mpState.coalitionReadyPlayers = [];
        if (typeof window._triggerCoalition === 'function') window._triggerCoalition();
        break;

      // ── Polls & Map Sync ──
      case 'polls_update':
        if (!isHost && d.pollData && typeof _applyRemotePolls === 'function') {
          _applyRemotePolls(d.pollData);
        }
        break;

      case 'map_update':
        if (!isHost && d.mapData && typeof _applyRemoteMap === 'function') {
          _applyRemoteMap(d.mapData);
        }
        break;

      // ── Parliament Return Barrier ──
      case 'parliament_return_ready':
        if (isHost) {
          if (!mpState.returnReadyPlayers.includes(d.playerId)) {
            mpState.returnReadyPlayers.push(d.playerId);
          }
          _broadcast({ type: 'parliament_return_update', data: { count: mpState.returnReadyPlayers.length, total: mpState.players.length } });
          if (mpState.returnReadyPlayers.length >= mpState.players.length) {
            mpState.returnReadyPlayers = [];
            _broadcast({ type: 'parliament_return_go', data: {} });
          }
        }
        break;

      case 'parliament_return_update':
        _showBarrierStatus('btn-return-campaign', d.count, d.total, 'Waiting...');
        break;

      case 'parliament_return_go':
        mpState.returnReadyPlayers = [];
        // Actual redirect handled by parliament-test/main.js
        if (typeof _doReturnToCampaign === 'function') _doReturnToCampaign();
        break;

      // ── Custom Party ──
      case 'custom_party_created':
        if (d.partyData) {
          if (typeof CAMPAIGN_PARTIES !== 'undefined') {
            if (!CAMPAIGN_PARTIES.find(p => p.id === d.partyData.id)) {
              CAMPAIGN_PARTIES.push(d.partyData);
            }
          }
          if (typeof renderPartyCards === 'function') renderPartyCards();
          if (isHost) _broadcast({ type: 'custom_party_created', data: d });
        }
        break;

      // ── Player Leave ──
      case 'player_leave':
        if (isHost) _handlePlayerLeave(d.playerId, d.playerName);
        break;

      case 'host_left':
        alert('The host has left the room. Returning to main menu.');
        // Wipe all local data before redirecting
        if (typeof TPSGlobalState !== 'undefined') TPSGlobalState.wipeAllData();
        localStorage.removeItem('tps_mp_session');
        localStorage.removeItem('tps_game_mode');
        window.location.href = '../index.html';
        break;

      // ── Force Wipe (host wipes all players) ──
      case 'force_wipe':
        console.log('[mp-coordinator] Received force_wipe from host — wiping all data.');
        if (typeof TPSGlobalState !== 'undefined') TPSGlobalState.wipeAllData();
        localStorage.removeItem('tps_mp_session');
        localStorage.removeItem('tps_game_mode');
        alert('The host has ended the session. All game data has been wiped.');
        window.location.href = '../index.html';
        break;

      // ── Parliament Vote (majority decision system) ──
      case 'parliament_vote':
        if (isHost) {
          mpState.parliamentVotes[d.playerId] = d.vote;
          const voteCount = Object.keys(mpState.parliamentVotes).length;
          const totalPlayers = mpState.players.length;
          // Broadcast progress update to all
          _broadcast({ type: 'parliament_vote_update', data: { count: voteCount, total: totalPlayers } });
          // Check if all players have voted
          if (voteCount >= totalPlayers) {
            // Tally votes
            const votes = Object.values(mpState.parliamentVotes);
            const enterCount = votes.filter(v => v === 'enter').length;
            const ignoreCount = votes.filter(v => v === 'ignore').length;
            const decision = enterCount >= ignoreCount ? 'enter' : 'ignore';
            const result = { decision, enterCount, ignoreCount, totalVotes: votes.length };
            console.log(`[mp-coordinator] Parliament vote result: ${decision} (Enter: ${enterCount}, Ignore: ${ignoreCount})`);
            // Reset votes
            mpState.parliamentVotes = {};
            // Broadcast result to all players + apply locally
            _broadcast({ type: 'parliament_vote_result', data: result });
            if (typeof window._applyParliamentVoteResult === 'function') {
              window._applyParliamentVoteResult(result);
            }
          }
        }
        break;

      case 'parliament_vote_update':
        // Update the vote status indicator
        {
          const statusEl = document.getElementById('mp-parliament-vote-status');
          if (statusEl) {
            statusEl.style.display = '';
            statusEl.textContent = `⏳ Votes: ${d.count}/${d.total} — Waiting for all players...`;
          }
        }
        break;

      case 'parliament_vote_result':
        // Apply the majority decision
        if (typeof window._applyParliamentVoteResult === 'function') {
          window._applyParliamentVoteResult(d);
        }
        break;

      // ── Coalition Invite (leader → host → invited players) ──
      case 'coalition_invite':
        if (isHost) {
          // Store coalition state on host
          mpState.coalitionState = {
            leaderPlayerId: d.leaderPlayerId,
            leaderPartyId: d.leaderPartyId,
            invitedPartyIds: d.invitedPartyIds,
            attempt: d.attempt || 1,
            responses: {},
            expectedResponses: d.invitedPartyIds.length,
          };
          // Forward to all players
          _broadcast({ type: 'coalition_invite', data: d });
        }
        // All players: show invite UI
        if (typeof window._handleCoalitionInvite === 'function') {
          window._handleCoalitionInvite(d);
        }
        break;

      case 'coalition_response':
        if (isHost && mpState.coalitionState) {
          mpState.coalitionState.responses[d.partyId] = d.accepted;
          const cs = mpState.coalitionState;
          const responseCount = Object.keys(cs.responses).length;
          // Broadcast progress
          _broadcast({ type: 'coalition_response_update', data: { responses: cs.responses, count: responseCount, expected: cs.expectedResponses } });
          // Check if all invited parties have responded
          if (responseCount >= cs.expectedResponses) {
            // Calculate coalition
            const acceptedParties = Object.entries(cs.responses)
              .filter(([_, accepted]) => accepted)
              .map(([partyId]) => partyId);
            const allParties = [cs.leaderPartyId, ...acceptedParties];
            let totalSeats = 0;
            const results = JSON.parse(localStorage.getItem('tps_mp_election_results') || '{}');
            allParties.forEach(pid => { totalSeats += (results[pid] || 0); });
            const success = totalSeats >= 251;
            _broadcast({ type: 'coalition_result', data: {
              success,
              leaderPartyId: cs.leaderPartyId,
              leaderPlayerId: cs.leaderPlayerId,
              acceptedParties,
              rejectedParties: Object.entries(cs.responses).filter(([_, a]) => !a).map(([pid]) => pid),
              totalSeats,
              attempt: cs.attempt,
              allCoalitionParties: allParties
            }});
            if (typeof window._handleCoalitionResult === 'function') {
              window._handleCoalitionResult({ success, leaderPartyId: cs.leaderPartyId, leaderPlayerId: cs.leaderPlayerId, acceptedParties, totalSeats, attempt: cs.attempt, allCoalitionParties: allParties });
            }
          }
        }
        break;

      case 'coalition_response_update':
        if (typeof window._handleCoalitionResponseUpdate === 'function') {
          window._handleCoalitionResponseUpdate(d);
        }
        break;

      case 'coalition_result':
        if (typeof window._handleCoalitionResult === 'function') {
          window._handleCoalitionResult(d);
        }
        break;

      case 'coalition_turn_pass':
        // Formation right passes to next party
        if (isHost) _broadcast({ type: 'coalition_turn_pass', data: d });
        if (typeof window._handleCoalitionTurnPass === 'function') {
          window._handleCoalitionTurnPass(d);
        }
        break;

      case 'coalition_minority':
        // Deadlock: minority government
        if (isHost) _broadcast({ type: 'coalition_minority', data: d });
        if (typeof window._handleCoalitionMinority === 'function') {
          window._handleCoalitionMinority(d);
        }
        break;

      default:
        console.log(`[mp-coordinator] Unknown: "${msg.type}"`);
    }
  }

  function _handlePlayerLeave(pid, pname) {
    mpState.players = mpState.players.filter(p => p.id !== pid);
    delete mpState.partySelections[pid];
    delete mpState.readyStates[pid];
    mpState.dayReadyPlayers = mpState.dayReadyPlayers.filter(id => id !== pid);
    mpState.returnReadyPlayers = mpState.returnReadyPlayers.filter(id => id !== pid);
    if (isHost) _broadcast({ type: 'mp_sync', data: { ...mpState } });
    _updateUI();
    _toast(`${pname || 'A player'} left the room.`, 'warning');
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 3: UI Updates
  // ════════════════════════════════════════════════════════════════

  function _initUI() {
    // Show MP controls, hide SP button
    const mpControls = document.getElementById('mp-party-controls');
    const spBtn = document.getElementById('btn-start-campaign');
    if (mpControls) mpControls.style.display = '';
    if (spBtn) spBtn.style.display = 'none';

    // Room badge
    const roomBadge = document.getElementById('mp-room-badge');
    if (roomBadge) roomBadge.textContent = `Room: ${roomCode}`;

    // ── MP: Hide balance mode selector for ALL players (forced Sovereign Equality) ──
    const balSel = document.getElementById('balance-mode-selector');
    if (balSel) balSel.style.display = 'none';
    // Force equality mode in localStorage
    localStorage.setItem('tps_balance_mode', 'equality');

    // Hide difficulty for non-host
    if (!isHost) {
      const diffSel = document.getElementById('difficulty-selector');
      if (diffSel) diffSel.style.display = 'none';
    }

    // Hide "Skip to Week End" button in MP
    const skipBtn = document.getElementById('btn-end-week');
    if (skipBtn) skipBtn.style.display = 'none';

    // Ready button
    const readyBtn = document.getElementById('btn-mp-ready');
    if (readyBtn) {
      readyBtn.disabled = false;
      readyBtn.addEventListener('click', _onReadyClick);
    }

    // Begin Campaign button (host only)
    const startBtn = document.getElementById('btn-mp-start-campaign');
    if (startBtn) {
      if (!isHost) {
        startBtn.style.display = 'none';
      } else {
        startBtn.addEventListener('click', _onBeginCampaign);
      }
    }

    _updateUI();
  }

  function _updateUI() {
    _renderPlayerBar();
    _updateReadyButton();
    _updateStartButton();
    _updatePartyLocks();
  }

  function _renderPlayerBar() {
    const bar = document.getElementById('mp-player-status-bar');
    if (!bar) return;

    bar.innerHTML = mpState.players.map(p => {
      const partyId = mpState.partySelections[p.id];
      const party = partyId && typeof CAMPAIGN_PARTIES !== 'undefined'
        ? CAMPAIGN_PARTIES.find(pp => pp.id === partyId) : null;
      const ready = mpState.readyStates[p.id];
      const isMe = p.id === playerId;
      const hostBadge = p.isHost ? '<span class="mp-host-chip">HOST</span>' : '';
      const partyChip = party
        ? `<span class="mp-party-chip" style="background:${party.color}22;border-color:${party.color};color:${party.color}">${party.shortName}</span>`
        : '<span class="mp-party-chip mp-no-party">—</span>';
      const readyIcon = ready ? '✅' : '⏳';

      return `<div class="mp-player-chip ${isMe ? 'mp-player-chip--me' : ''} ${ready ? 'mp-player-chip--ready' : ''}">
        ${hostBadge}
        <span class="mp-player-chip__name">${p.name}${isMe ? ' (You)' : ''}</span>
        ${partyChip}
        <span class="mp-player-chip__status">${readyIcon}</span>
      </div>`;
    }).join('');
  }

  function _updateReadyButton() {
    const btn = document.getElementById('btn-mp-ready');
    if (!btn) return;
    const ready = mpState.readyStates[playerId];
    const hasParty = !!mpState.partySelections[playerId];
    btn.disabled = !hasParty;
    btn.textContent = ready ? '✅ Ready!' : '✋ Set Ready';
    btn.className = ready
      ? 'btn btn-lg mp-ready-btn mp-ready-btn--active'
      : 'btn btn-gold btn-lg mp-ready-btn';
  }

  function _updateStartButton() {
    const btn = document.getElementById('btn-mp-start-campaign');
    if (!btn || !isHost) return;
    const allReady = mpState.players.length > 0 &&
      mpState.players.every(p => mpState.readyStates[p.id]) &&
      mpState.players.every(p => mpState.partySelections[p.id]);
    btn.disabled = !allReady;
  }

  function _updatePartyLocks() {
    // Re-render party cards with lock overlays
    document.querySelectorAll('.party-card').forEach(card => {
      const pid = card.dataset.partyId;
      // Remove existing lock overlays
      const existing = card.querySelector('.mp-lock-overlay');
      if (existing) existing.remove();
      card.classList.remove('party-card--mp-locked');

      // Check if another player selected this party
      for (const [selPlayerId, selPartyId] of Object.entries(mpState.partySelections)) {
        if (selPartyId === pid && selPlayerId !== playerId) {
          const selPlayer = mpState.players.find(p => p.id === selPlayerId);
          card.classList.add('party-card--mp-locked');
          const overlay = document.createElement('div');
          overlay.className = 'mp-lock-overlay';
          overlay.innerHTML = `<span class="mp-lock-icon">🔒</span><span class="mp-lock-name">Selected by ${selPlayer ? selPlayer.name : 'another player'}</span>`;
          card.appendChild(overlay);
          break;
        }
      }
    });
  }

  function _showBarrierStatus(btnId, count, total, label) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.textContent = `${label} (${count}/${total})`;
      btn.disabled = true;
    }
  }

  function _toast(msg, type) {
    if (typeof toast === 'function') { toast(msg, type); return; }
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 4: Player Actions
  // ════════════════════════════════════════════════════════════════

  function _onReadyClick() {
    const current = mpState.readyStates[playerId] || false;
    mpState.readyStates[playerId] = !current;
    _broadcast({ type: 'player_ready', data: { playerId, isReady: !current } });
    _updateUI();
  }

  function _onBeginCampaign() {
    if (!isHost) return;
    const diffEl = document.querySelector('.diff-btn.active');
    const difficulty = diffEl ? diffEl.dataset.difficulty : 'normal';
    // MP: Always force Sovereign Equality balance mode
    const balanceMode = 'equality';

    mpState.gameStarted = true;
    mpState.phase = 'campaign';

    _broadcast({ type: 'mp_game_begin', data: { difficulty, balanceMode } });
    localStorage.setItem('tps_difficulty', difficulty);
    localStorage.setItem('tps_balance_mode', 'equality');
    _startCampaignLocally();
  }

  function selectParty(partyId) {
    // Deselect old
    const old = mpState.partySelections[playerId];
    if (old) {
      delete mpState.partySelections[playerId];
      _broadcast({ type: 'party_deselected', data: { playerId, partyId: old } });
    }
    // Select new
    mpState.partySelections[playerId] = partyId;
    mpState.readyStates[playerId] = false; // Reset ready on party change
    _broadcast({ type: 'party_selected', data: { playerId, playerName, partyId } });
    _updateUI();
  }

  function isPartyLocked(partyId) {
    for (const [pid, selId] of Object.entries(mpState.partySelections)) {
      if (selId === partyId && pid !== playerId) return true;
    }
    return false;
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 5: Campaign Phase Hooks
  // ════════════════════════════════════════════════════════════════

  function _startCampaignLocally() {
    const myPartyId = mpState.partySelections[playerId];
    if (!myPartyId) { _toast('You must select a party first!', 'warning'); return; }

    // Use the existing campaign init flow
    if (typeof selectedPartyId !== 'undefined') {
      // Set the global from main.js
      window.selectedPartyId = myPartyId;
    }
    if (typeof initCampaignState === 'function') {
      initCampaignState(myPartyId);
    }
    const party = typeof CAMPAIGN_PARTIES !== 'undefined'
      ? CAMPAIGN_PARTIES.find(p => p.id === myPartyId) : null;
    if (party && typeof campaignState !== 'undefined') {
      campaignState.playerFunds = party.campaignFunds;
    }

    // Initialize the Unified Time Engine
    if (typeof initCampaignTimeline === 'function') initCampaignTimeline();

    // Persist state so it survives parliament round-trips
    localStorage.setItem('campaign_ui_state', 'dashboard');
    localStorage.setItem('campaign_party_id', myPartyId);
    // Save MP party selections so polls can be restored after module transitions
    localStorage.setItem('tps_mp_party_selections', JSON.stringify(mpState.partySelections));

    if (typeof showScreen === 'function') showScreen('screen-campaign');
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof initMap === 'function') initMap();

    // Hide skip button in campaign
    const skipBtn = document.getElementById('btn-end-week');
    if (skipBtn) skipBtn.style.display = 'none';
  }

  /** Called by main.js Next Day handler when in MP */
  function signalDayReady() {
    if (!mpState.dayReadyPlayers.includes(playerId)) {
      mpState.dayReadyPlayers.push(playerId);
    }
    _broadcast({ type: 'day_ready', data: { playerId } });

    // Host self-evaluates barrier (critical for solo / last-click scenarios)
    if (isHost) {
      _broadcast({ type: 'day_ready_update', data: { count: mpState.dayReadyPlayers.length, total: mpState.players.length } });
      if (mpState.dayReadyPlayers.length >= mpState.players.length) {
        mpState.dayReadyPlayers = [];
        _broadcast({ type: 'advance_day', data: {} });
        _advanceDayLocally();
        return;
      }
    }
    _showBarrierStatus('btn-next-day', mpState.dayReadyPlayers.length, mpState.players.length, '⏳ Waiting...');
  }

  function signalElectionReady() {
    if (!mpState.electionReadyPlayers.includes(playerId)) {
      mpState.electionReadyPlayers.push(playerId);
    }
    _broadcast({ type: 'election_ready', data: { playerId } });

    // Host self-evaluates barrier
    if (isHost) {
      _broadcast({ type: 'election_ready_update', data: { count: mpState.electionReadyPlayers.length, total: mpState.players.length } });
      if (mpState.electionReadyPlayers.length >= mpState.players.length) {
        mpState.electionReadyPlayers = [];
        _broadcast({ type: 'election_go', data: {} });
        if (typeof window._triggerElection === 'function') window._triggerElection();
        return;
      }
    }
    _showBarrierStatus('btn-hold-election', mpState.electionReadyPlayers.length, mpState.players.length, '⏳ Waiting...');
  }

  function signalCoalitionReady() {
    if (!mpState.coalitionReadyPlayers.includes(playerId)) {
      mpState.coalitionReadyPlayers.push(playerId);
    }
    _broadcast({ type: 'coalition_ready', data: { playerId } });

    // Host self-evaluates barrier
    if (isHost) {
      _broadcast({ type: 'coalition_ready_update', data: { count: mpState.coalitionReadyPlayers.length, total: mpState.players.length } });
      if (mpState.coalitionReadyPlayers.length >= mpState.players.length) {
        mpState.coalitionReadyPlayers = [];
        _broadcast({ type: 'coalition_go', data: {} });
        if (typeof window._triggerCoalition === 'function') window._triggerCoalition();
        return;
      }
    }
    _showBarrierStatus('btn-to-coalition', mpState.coalitionReadyPlayers.length, mpState.players.length, '⏳ Waiting...');
  }

  function _advanceDayLocally() {
    // Reset button
    const btn = document.getElementById('btn-next-day');
    if (btn) { btn.textContent = '☀️ Next Day →'; btn.disabled = false; }
    // Trigger the actual day advance
    if (typeof advanceCampaignDay === 'function') {
      const result = advanceCampaignDay();
      if (result) {
        // Fire the standard event handling from main.js
        window.dispatchEvent(new CustomEvent('tps:mp-day-advanced', { detail: result }));
      }
    }
    if (typeof renderDashboard === 'function') renderDashboard();
    // Host broadcasts polls/map after advancing
    if (isHost) _broadcastSharedState();
  }

  function _broadcastSharedState() {
    // Broadcast poll data
    if (typeof campaignState !== 'undefined' && campaignState.polls) {
      _broadcast({ type: 'polls_update', data: { pollData: campaignState.polls } });
    }
    // Broadcast map data
    if (typeof campaignState !== 'undefined' && campaignState.mapData) {
      _broadcast({ type: 'map_update', data: { mapData: campaignState.mapData } });
    }
  }

  /** Called by parliament-test/main.js when Return to Campaign is clicked in MP */
  function signalReturnReady() {
    if (!mpState.returnReadyPlayers.includes(playerId)) {
      mpState.returnReadyPlayers.push(playerId);
    }
    _broadcast({ type: 'parliament_return_ready', data: { playerId } });

    // Host self-evaluates barrier (critical for solo / last-click scenarios)
    if (isHost) {
      _broadcast({ type: 'parliament_return_update', data: { count: mpState.returnReadyPlayers.length, total: mpState.players.length } });
      if (mpState.returnReadyPlayers.length >= mpState.players.length) {
        mpState.returnReadyPlayers = [];
        _broadcast({ type: 'parliament_return_go', data: {} });
        if (typeof _doReturnToCampaign === 'function') _doReturnToCampaign();
        return;
      }
    }
    _showBarrierStatus('btn-return-campaign', mpState.returnReadyPlayers.length, mpState.players.length, '⏳ Waiting...');
  }

  /** Called by main.js when a player votes on the Parliament notification in MP */
  function signalParliamentVote(vote) {
    mpState.parliamentVotes[playerId] = vote;
    _broadcast({ type: 'parliament_vote', data: { playerId, vote } });

    // Host self-evaluates barrier (critical for solo / last-click scenarios)
    if (isHost) {
      const voteCount = Object.keys(mpState.parliamentVotes).length;
      const totalPlayers = mpState.players.length;
      _broadcast({ type: 'parliament_vote_update', data: { count: voteCount, total: totalPlayers } });
      if (voteCount >= totalPlayers) {
        const votes = Object.values(mpState.parliamentVotes);
        const enterCount = votes.filter(v => v === 'enter').length;
        const ignoreCount = votes.filter(v => v === 'ignore').length;
        const decision = enterCount >= ignoreCount ? 'enter' : 'ignore';
        const result = { decision, enterCount, ignoreCount, totalVotes: votes.length };
        console.log(`[mp-coordinator] Parliament vote resolved: ${decision} (Enter: ${enterCount}, Ignore: ${ignoreCount})`);
        mpState.parliamentVotes = {};
        _broadcast({ type: 'parliament_vote_result', data: result });
        if (typeof window._applyParliamentVoteResult === 'function') {
          window._applyParliamentVoteResult(result);
        }
        return;
      }
    }
  }

  function leaveRoom() {
    if (isHost) {
      // Host: broadcast force_wipe to ALL players before leaving
      _broadcast({ type: 'force_wipe', data: {} });
      _broadcast({ type: 'host_left', data: {} });
    } else {
      _broadcast({ type: 'player_leave', data: { playerId, playerName } });
    }
    if (_peer) { try { _peer.destroy(); } catch(e){} }
    // Wipe ALL local save data (custom parties, campaign state, etc.)
    if (typeof TPSGlobalState !== 'undefined') TPSGlobalState.wipeAllData();
    localStorage.removeItem('tps_mp_session');
    localStorage.removeItem('tps_game_mode');
    localStorage.removeItem('tps_mp_locked_parties');
    console.log('[mp-coordinator] Room left — all save data wiped.');
    window.location.href = '../index.html';
  }

  function broadcastCustomParty(partyData) {
    _broadcast({ type: 'custom_party_created', data: { partyData } });
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 5B: Coalition Negotiation API
  // ════════════════════════════════════════════════════════════════

  function sendCoalitionInvite(leaderPartyId, invitedPartyIds, attempt) {
    _broadcast({ type: 'coalition_invite', data: {
      leaderPlayerId: playerId,
      leaderPartyId,
      invitedPartyIds,
      attempt: attempt || 1
    }});
    // Also handle locally on host
    if (isHost && typeof window._handleCoalitionInvite === 'function') {
      window._handleCoalitionInvite({
        leaderPlayerId: playerId,
        leaderPartyId,
        invitedPartyIds,
        attempt: attempt || 1
      });
    }
  }

  function sendCoalitionResponse(partyId, accepted) {
    _broadcast({ type: 'coalition_response', data: { playerId, partyId, accepted } });
  }

  function sendCoalitionTurnPass(nextLeaderPartyId) {
    _broadcast({ type: 'coalition_turn_pass', data: { nextLeaderPartyId } });
  }

  function sendCoalitionMinority(leaderPartyId) {
    _broadcast({ type: 'coalition_minority', data: { leaderPartyId } });
  }

  /** Store election seat results for coalition seat calculation */
  function storeElectionResults(seatMap) {
    localStorage.setItem('tps_mp_election_results', JSON.stringify(seatMap));
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 6: Boot
  // ════════════════════════════════════════════════════════════════

  function _boot() {
    _initPeerJS();
    _initUI();
    console.log('[mp-coordinator] Multiplayer Campaign Coordinator booted.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    // Small delay to ensure main.js has rendered party cards first
    setTimeout(_boot, 200);
  }

  // ── Public API ──
  return {
    isMP: true,
    isHost,
    playerId,
    playerName,
    roomCode,
    state: mpState,
    selectParty,
    isPartyLocked,
    signalDayReady,
    signalElectionReady,
    signalCoalitionReady,
    signalReturnReady,
    leaveRoom,
    signalParliamentVote,
    broadcastCustomParty,
    broadcastSharedState: _broadcastSharedState,
    // Coalition API
    sendCoalitionInvite,
    sendCoalitionResponse,
    sendCoalitionTurnPass,
    sendCoalitionMinority,
    storeElectionResults,
  };

})();

console.log('═══════════════════════════════════════════════════════════');
console.log('[mp-campaign-coordinator.js] Loaded.');
console.log(`  → Active: ${tpsMPCampaign.isMP}`);
console.log('═══════════════════════════════════════════════════════════');
