// ═══════════════════════════════════════════════════════════════════════════
// TPS — shared/multiplayer.js
// Multiplayer Session Manager — Lobby State, UI Controller & PeerJS P2P
// ═══════════════════════════════════════════════════════════════════════════
// This module is COMPLETELY ISOLATED from all single-player game logic.
// It manages the multiplayer lobby UI and real-time P2P networking
// using PeerJS (WebRTC). Zero server cost — browsers connect directly.
//
// ARCHITECTURE:
//   tpsMultiplayer = {
//     state:    lobby data (roomCode, players, readyState, etc.)
//     ui:       DOM references & rendering functions
//     net:      PeerJS P2P networking (host = relay, joiners = clients)
//     actions:  user-facing functions (host, join, ready, leave, start)
//   }
// ═══════════════════════════════════════════════════════════════════════════


const tpsMultiplayer = (() => {

  // ──────────────────────────────────────────────────────────────────────
  // SECTION 1: STATE
  // ──────────────────────────────────────────────────────────────────────

  const state = {
    roomCode: '',
    playerName: 'Player',
    playerId: _generateId(),
    isHost: false,
    isReady: false,
    isConnected: false,
    roomState: 'idle',       // 'idle' | 'lobby' | 'starting' | 'in_game'
    maxPlayers: 8,
    maxTurns: 8,
    players: [],             // [{ id, name, seat, isReady, isHost, isLocal }]
    gameMode: 'governing',   // 'governing' | 'campaign' | 'opposition'
  };


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 2: DOM REFERENCES
  // ──────────────────────────────────────────────────────────────────────

  let DOM = {};

  function _cacheDom() {
    DOM = {
      overlay:       document.getElementById('multiplayer-modal'),
      closeBtn:      document.getElementById('mp-close-btn'),

      // Dashboard cards
      dashStatus:    document.getElementById('mp-dash-status'),
      dashSeat:      document.getElementById('mp-dash-seat'),
      dashRoomState: document.getElementById('mp-dash-roomstate'),
      dashTurns:     document.getElementById('mp-dash-turns'),
      statusCard:    document.getElementById('mp-status-card'),

      // Quick Steps
      roomCodeInput: document.getElementById('mp-room-code-display'),
      btnCopyCode:   document.getElementById('mp-btn-copy-code'),
      btnCopyKey:    document.getElementById('mp-btn-copy-key'),
      btnCopyLink:   document.getElementById('mp-btn-copy-link'),

      // Lobby Actions
      inputName:     document.getElementById('mp-input-name'),
      inputCode:     document.getElementById('mp-input-code'),
      btnHost:       document.getElementById('mp-btn-host'),
      btnJoin:       document.getElementById('mp-btn-join'),
      btnMatch:      document.getElementById('mp-btn-matchmaking'),
      btnReady:      document.getElementById('mp-btn-ready'),
      btnLeave:      document.getElementById('mp-btn-leave'),
      btnStart:      document.getElementById('mp-btn-start'),

      // Player List
      playerList:    document.getElementById('mp-player-list'),

      // Toast
      toastContainer: document.getElementById('mp-toast-container'),
    };
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 3: CORE ACTIONS
  // ──────────────────────────────────────────────────────────────────────

  /**
   * hostRoom() — Creates a new room with a random 6-char code.
   * Adds the host player to Seat 1. Updates all UI.
   */
  function hostRoom() {
    // Read player name from input
    const name = DOM.inputName ? DOM.inputName.value.trim() : '';
    if (!name) {
      _showToast('Please enter your name first.', 'warning');
      if (DOM.inputName) DOM.inputName.focus();
      return;
    }

    state.playerName = name;
    state.roomCode = _generateRoomCode();
    state.isHost = true;
    state.isReady = false;
    state.isConnected = true;
    state.roomState = 'lobby';
    state.players = [];

    // Add host as Seat 1
    state.players.push({
      id: state.playerId,
      name: state.playerName,
      seat: 1,
      isReady: false,
      isHost: true,
      isLocal: true,
    });

    // Update UI
    _updateAllUI();
    _showToast(`Room ${state.roomCode} created! You are the Host.`, 'success');

    // Network hook: announce room creation
    net.connectToServer();
    net.broadcastState('room_created', {
      roomCode: state.roomCode,
      host: state.playerName,
    });

    console.log(`[multiplayer.js] Room hosted: ${state.roomCode} by "${state.playerName}"`);
  }

  /**
   * joinRoom(code) — Joins an existing room by code.
   * Validates the code format. Adds player to next available seat.
   */
  function joinRoom(code) {
    const name = DOM.inputName ? DOM.inputName.value.trim() : '';
    if (!name) {
      _showToast('Please enter your name first.', 'warning');
      if (DOM.inputName) DOM.inputName.focus();
      return;
    }

    // Use the provided code or read from input
    const roomCode = (code || (DOM.inputCode ? DOM.inputCode.value.trim() : '')).toUpperCase();
    if (!roomCode || roomCode.length < 4) {
      _showToast('Please enter a valid room code.', 'warning');
      if (DOM.inputCode) DOM.inputCode.focus();
      return;
    }

    state.playerName = name;
    state.roomCode = roomCode;
    state.isHost = false;
    state.isReady = false;
    state.isConnected = false; // Will become true when PeerJS connects
    state.roomState = 'lobby';
    state.players = []; // Host will send the real player list via sync_state

    _updateAllUI();
    _showToast(`Connecting to room ${state.roomCode}...`, 'info');

    // PeerJS: connect to host peer
    net.connectToServer();

    console.log(`[multiplayer.js] Joining room: ${state.roomCode} as "${state.playerName}"`);
  }

  /**
   * toggleReady() — Toggles the local player's ready state.
   */
  function toggleReady() {
    if (state.roomState !== 'lobby') {
      _showToast('You must be in a lobby to toggle ready.', 'warning');
      return;
    }

    state.isReady = !state.isReady;

    // Update local player in the players array
    const localPlayer = state.players.find(p => p.isLocal);
    if (localPlayer) {
      localPlayer.isReady = state.isReady;
    }

    _updateAllUI();
    _showToast(state.isReady ? 'You are Ready! ✅' : 'You are Not Ready.', state.isReady ? 'success' : 'warning');

    // Network hook: broadcast ready state
    net.broadcastState('player_ready', {
      playerId: state.playerId,
      isReady: state.isReady,
    });

    console.log(`[multiplayer.js] Ready: ${state.isReady}`);
  }

  /**
   * leaveRoom() — Leaves the current room and resets state.
   */
  function leaveRoom() {
    if (state.roomState === 'idle') return;

    const wasHost = state.isHost;
    const oldCode = state.roomCode;

    // Network hook: announce departure
    net.broadcastState('player_left', {
      playerId: state.playerId,
      wasHost: wasHost,
    });
    net.disconnectFromServer();

    // Reset state
    state.roomCode = '';
    state.isHost = false;
    state.isReady = false;
    state.isConnected = false;
    state.roomState = 'idle';
    state.players = [];

    _updateAllUI();
    _showToast(`Left room ${oldCode}.`, 'info');

    console.log(`[multiplayer.js] Left room: ${oldCode}`);
  }

  /**
   * startMatch() — Host-only. Starts the game if all players are ready.
   */
  function startMatch() {
    if (!state.isHost) {
      _showToast('Only the host can start the match!', 'warning');
      return;
    }

    if (state.players.length < 1) {
      _showToast('Need at least 1 player to start.', 'warning');
      return;
    }

    const allReady = state.players.every(p => p.isReady);
    if (!allReady) {
      const notReady = state.players.filter(p => !p.isReady).map(p => p.name);
      _showToast(`Waiting for: ${notReady.join(', ')}`, 'warning');
      return;
    }

    state.roomState = 'starting';
    _updateAllUI();
    _showToast('Starting match... 🚀', 'success');

    // Network hook: broadcast game start
    net.broadcastState('game_starting', {
      roomCode: state.roomCode,
      players: state.players,
      gameMode: state.gameMode,
    });
    net.onHostStartGame();

    console.log(`[multiplayer.js] Match starting! Room: ${state.roomCode}, Players: ${state.players.length}`);

    // ── GAME LAUNCH: Save MP session and redirect to Campaign party select ──
    setTimeout(() => {
      state.roomState = 'in_game';
      _updateAllUI();
      _showToast('Match started! Redirecting to game...', 'success');

      // Persist multiplayer session data so the campaign module can read it
      localStorage.setItem('tps_mp_session', JSON.stringify({
        roomCode: state.roomCode,
        players: state.players,
        gameMode: state.gameMode,
        maxTurns: state.maxTurns,
        isHost: state.isHost,
        playerId: state.playerId,
        playerName: state.playerName,
      }));
      localStorage.setItem('tps_game_mode', 'multiplayer');

      // Redirect to the campaign module for party selection
      setTimeout(() => {
        window.location.href = `./campaign/index.html?mode=mp&room=${state.roomCode}`;
      }, 600);
    }, 1500);
  }

  /**
   * matchmaking() — Placeholder for auto-matchmaking.
   */
  function matchmaking() {
    _showToast('Matchmaking is not yet available. Host or join a room manually.', 'warning');
    console.log('[multiplayer.js] Matchmaking requested — not yet implemented.');
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 4: NETWORK — PeerJS P2P (Free, zero-cost)
  // ──────────────────────────────────────────────────────────────────────
  // Architecture:
  //   HOST creates a Peer with ID = "TPS_" + roomCode
  //   JOINERS connect to that Peer ID using the room code
  //   All messages are JSON: { type: string, data: object }
  //   Host relays messages to all connected peers (star topology)
  // ──────────────────────────────────────────────────────────────────────

  let _peer = null;            // PeerJS Peer instance
  let _connections = [];       // Host: array of DataConnection to each joiner
  let _hostConnection = null;  // Joiner: DataConnection to the host

  const PEER_PREFIX = 'TPS_';  // Prefix for Peer IDs to avoid collisions

  const net = {
    /**
     * connectToServer() — HOST: Create a Peer with room code as ID.
     * The PeerJS cloud signaling server (free) helps peers find each other.
     */
    connectToServer() {
      if (_peer) { _peer.destroy(); _peer = null; }

      const peerId = PEER_PREFIX + state.roomCode;

      if (state.isHost) {
        // HOST: create peer and listen for incoming connections
        _peer = new Peer(peerId, { debug: 1 });

        _peer.on('open', (id) => {
          console.log(`[net/PeerJS] Host peer opened: ${id}`);
          state.isConnected = true;
          _updateAllUI();
        });

        _peer.on('connection', (conn) => {
          console.log(`[net/PeerJS] Incoming connection from: ${conn.peer}`);
          _connections.push(conn);

          conn.on('open', () => {
            // Send the joiner the current full state so they sync up
            conn.send({ type: 'sync_state', data: {
              players: state.players,
              roomCode: state.roomCode,
              roomState: state.roomState,
              maxTurns: state.maxTurns,
              gameMode: state.gameMode,
            }});
          });

          conn.on('data', (msg) => _handleMessage(msg, conn));

          conn.on('close', () => {
            // Find which player disconnected
            const idx = _connections.indexOf(conn);
            if (idx > -1) _connections.splice(idx, 1);
            // Remove the player from state by matching connection peer ID
            const leavingPlayer = state.players.find(p => p._connPeer === conn.peer);
            if (leavingPlayer) {
              state.players = state.players.filter(p => p.id !== leavingPlayer.id);
              _updateAllUI();
              _showToast(`${leavingPlayer.name} left the room.`, 'warning');
              // Relay updated player list to all remaining peers
              _broadcastToAll({ type: 'player_list', data: { players: state.players } });
            }
          });
        });

        _peer.on('error', (err) => {
          console.error('[net/PeerJS] Host error:', err);
          if (err.type === 'unavailable-id') {
            _showToast('Room code already in use! Try again.', 'error');
            state.roomState = 'idle';
            state.isConnected = false;
            _updateAllUI();
          } else {
            _showToast(`Network error: ${err.type}`, 'error');
          }
        });

      } else {
        // JOINER: create anonymous peer, then connect to the host
        _peer = new Peer(undefined, { debug: 1 });

        _peer.on('open', () => {
          console.log(`[net/PeerJS] Joiner peer opened: ${_peer.id}`);
          const hostPeerId = PEER_PREFIX + state.roomCode;
          _hostConnection = _peer.connect(hostPeerId, { reliable: true });

          _hostConnection.on('open', () => {
            console.log(`[net/PeerJS] Connected to host: ${hostPeerId}`);
            state.isConnected = true;
            _updateAllUI();

            // Tell the host about ourselves
            _hostConnection.send({ type: 'player_join', data: {
              id: state.playerId,
              name: state.playerName,
              seat: _getNextAvailableSeat(),
            }});
          });

          _hostConnection.on('data', (msg) => _handleMessage(msg, _hostConnection));

          _hostConnection.on('close', () => {
            console.log('[net/PeerJS] Disconnected from host.');
            _showToast('Lost connection to host.', 'error');
            state.isConnected = false;
            _updateAllUI();
          });

          _hostConnection.on('error', (err) => {
            console.error('[net/PeerJS] Connection error:', err);
            _showToast('Could not connect to host. Is the room code correct?', 'error');
          });
        });

        _peer.on('error', (err) => {
          console.error('[net/PeerJS] Joiner error:', err);
          if (err.type === 'peer-unavailable') {
            _showToast('Room not found! Check the code and try again.', 'error');
            state.isConnected = false;
            state.roomState = 'idle';
            state.players = [];
            _updateAllUI();
          } else {
            _showToast(`Network error: ${err.type}`, 'error');
          }
        });
      }
    },

    /**
     * disconnectFromServer() — Clean disconnect. Destroys the peer.
     */
    disconnectFromServer() {
      // Notify peers before disconnecting
      if (state.isHost) {
        _broadcastToAll({ type: 'host_left', data: {} });
        _connections.forEach(c => { try { c.close(); } catch(e){} });
        _connections = [];
      } else if (_hostConnection) {
        try {
          _hostConnection.send({ type: 'player_leave', data: { playerId: state.playerId } });
          _hostConnection.close();
        } catch(e) {}
        _hostConnection = null;
      }
      if (_peer) { try { _peer.destroy(); } catch(e){} _peer = null; }
      state.isConnected = false;
      console.log('[net/PeerJS] Disconnected.');
    },

    /**
     * broadcastState(eventType, data) — Send a message to all peers.
     * Host → sends to all connected joiners.
     * Joiner → sends to host (who relays to others).
     */
    broadcastState(eventType, data) {
      const msg = { type: eventType, data: data };

      if (state.isHost) {
        _broadcastToAll(msg);
      } else if (_hostConnection && _hostConnection.open) {
        _hostConnection.send(msg);
      }
      console.log(`[net/PeerJS] Sent: "${eventType}"`, data);
    },

    /**
     * onRemotePlayerJoin(player) — Called when a remote player joins.
     * Host-side: adds player to state and relays updated list.
     */
    onRemotePlayerJoin(player) {
      // Check if already in list
      if (state.players.find(p => p.id === player.id)) return;

      state.players.push({
        ...player,
        isReady: false,
        isHost: false,
        isLocal: false,
      });
      _updateAllUI();
      _showToast(`${player.name} joined! (Seat ${player.seat})`, 'success');

      // Relay the full player list to all peers
      _broadcastToAll({ type: 'player_list', data: { players: state.players } });
    },

    /**
     * onRemotePlayerLeave(playerId) — Called when a remote player disconnects.
     */
    onRemotePlayerLeave(playerId) {
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        const name = player.name;
        state.players = state.players.filter(p => p.id !== playerId);
        _updateAllUI();
        _showToast(`${name} left the room.`, 'warning');
        // Relay updated list
        if (state.isHost) {
          _broadcastToAll({ type: 'player_list', data: { players: state.players } });
        }
      }
    },

    /**
     * onRemotePlayerReady(playerId, isReady) — Toggle remote player ready.
     */
    onRemotePlayerReady(playerId, isReady) {
      const p = state.players.find(p => p.id === playerId);
      if (p) {
        p.isReady = isReady;
        _updateAllUI();
        _showToast(`${p.name} is ${isReady ? 'Ready ✅' : 'Not Ready'}`, isReady ? 'success' : 'warning');
        // Host relays to everyone
        if (state.isHost) {
          _broadcastToAll({ type: 'player_list', data: { players: state.players } });
        }
      }
    },

    /**
     * onHostStartGame() — Called on ALL clients when the host starts.
     */
    onHostStartGame() {
      console.log('[net/PeerJS] onHostStartGame() — Saving session & redirecting.');

      localStorage.setItem('tps_mp_session', JSON.stringify({
        roomCode: state.roomCode,
        players: state.players,
        gameMode: state.gameMode,
        maxTurns: state.maxTurns,
        isHost: state.isHost,
        playerId: state.playerId,
        playerName: state.playerName,
      }));
      localStorage.setItem('tps_game_mode', 'multiplayer');

      // Non-host clients redirect (host handles its own redirect in startMatch)
      if (!state.isHost) {
        state.roomState = 'in_game';
        _updateAllUI();
        _showToast('Host started the match! Joining game... 🚀', 'success');
        setTimeout(() => {
          window.location.href = `./campaign/index.html?mode=mp&room=${state.roomCode}`;
        }, 1200);
      }
    },

    /**
     * generateJoinKey() — Returns a formatted key for sharing.
     */
    generateJoinKey() {
      return `TPS-${state.roomCode}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    },

    /**
     * generateInviteLink() — Returns a shareable URL with room code embedded.
     */
    generateInviteLink() {
      const base = window.location.origin + window.location.pathname;
      return `${base}?join=${state.roomCode}`;
    },
  };

  // ── PeerJS Internal Helpers ──────────────────────────────────────

  /**
   * _broadcastToAll(msg) — Host sends msg to every connected joiner.
   */
  function _broadcastToAll(msg) {
    _connections.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch(e) {
          console.warn('[net/PeerJS] Failed to send to peer:', e);
        }
      }
    });
  }

  /**
   * _handleMessage(msg, conn) — Central message router.
   * Both host and joiners use this to process incoming messages.
   */
  function _handleMessage(msg, conn) {
    if (!msg || !msg.type) return;
    console.log(`[net/PeerJS] Received: "${msg.type}"`, msg.data);

    switch (msg.type) {
      // ── Host receives from a joiner ──
      case 'player_join':
        if (state.isHost) {
          const player = msg.data;
          player._connPeer = conn.peer; // Track which connection this player uses
          net.onRemotePlayerJoin(player);
        }
        break;

      case 'player_leave':
        if (state.isHost) {
          net.onRemotePlayerLeave(msg.data.playerId);
        }
        break;

      case 'player_ready':
        if (state.isHost) {
          net.onRemotePlayerReady(msg.data.playerId, msg.data.isReady);
        }
        break;

      // ── Joiner receives from host ──
      case 'sync_state':
        if (!state.isHost) {
          // Full state sync — update everything
          state.players = msg.data.players.map(p => ({
            ...p,
            isLocal: (p.id === state.playerId),
          }));
          state.roomState = msg.data.roomState || 'lobby';
          state.maxTurns = msg.data.maxTurns || 8;
          state.gameMode = msg.data.gameMode || 'campaign';
          _updateAllUI();
        }
        break;

      case 'player_list':
        if (!state.isHost) {
          // Updated player list from host
          state.players = msg.data.players.map(p => ({
            ...p,
            isLocal: (p.id === state.playerId),
          }));
          _updateAllUI();
        }
        break;

      case 'game_starting':
        if (!state.isHost) {
          net.onHostStartGame();
        }
        break;

      case 'host_left':
        if (!state.isHost) {
          _showToast('The host has left the room.', 'error');
          state.roomCode = '';
          state.isConnected = false;
          state.roomState = 'idle';
          state.players = [];
          _updateAllUI();
        }
        break;

      default:
        console.log(`[net/PeerJS] Unknown message type: "${msg.type}"`);
    }
  }



  // ──────────────────────────────────────────────────────────────────────
  // SECTION 5: UI RENDERING
  // ──────────────────────────────────────────────────────────────────────

  /**
   * _updateAllUI() — Refreshes every UI element in the modal.
   */
  function _updateAllUI() {
    _updateDashboardUI();
    _updateQuickStepsUI();
    _updatePlayerListUI();
    _updateButtonStates();
  }

  /**
   * _updateDashboardUI() — Updates the 4 status cards at the top.
   */
  function _updateDashboardUI() {
    // Status card
    if (DOM.dashStatus) {
      if (state.isConnected) {
        DOM.dashStatus.textContent = `Connected · Room ${state.roomCode}`;
        if (DOM.statusCard) {
          DOM.statusCard.classList.add('connected');
          DOM.statusCard.classList.remove('idle');
        }
      } else {
        DOM.dashStatus.textContent = 'Disconnected';
        if (DOM.statusCard) {
          DOM.statusCard.classList.remove('connected');
          DOM.statusCard.classList.add('idle');
        }
      }
    }

    // Seat
    if (DOM.dashSeat) {
      const localPlayer = state.players.find(p => p.isLocal);
      DOM.dashSeat.textContent = localPlayer ? localPlayer.seat : '—';
    }

    // Room State
    if (DOM.dashRoomState) {
      DOM.dashRoomState.textContent = state.roomState;
    }

    // Turns
    if (DOM.dashTurns) {
      DOM.dashTurns.textContent = `${state.maxTurns}/${state.maxTurns}`;
    }
  }

  /**
   * _updateQuickStepsUI() — Updates the room code display.
   */
  function _updateQuickStepsUI() {
    if (DOM.roomCodeInput) {
      DOM.roomCodeInput.value = state.roomCode ? `Room Code:  ${state.roomCode}` : 'No room';
    }
  }

  /**
   * _updatePlayerListUI() — Dynamically renders player rows.
   */
  function _updatePlayerListUI() {
    if (!DOM.playerList) return;

    let html = '';
    const readyCount = state.players.filter(p => p.isReady).length;

    // Render seated players
    state.players.forEach(p => {
      const statusClass = p.isReady ? 'ready' : 'not-ready';
      const statusText = p.isReady ? 'Ready' : 'Not Ready';
      const localClass = p.isLocal ? 'mp-player--local' : '';
      const youTag = p.isLocal ? '<span class="mp-you-tag">(You)</span>' : '';
      const hostTag = p.isHost ? ' 👑' : '';

      html += `
        <div class="mp-player-row ${localClass}">
          <span class="mp-player-row__seat">Seat ${p.seat}:</span>
          <span class="mp-player-row__name">${p.name}${hostTag} ${youTag}</span>
          <span class="mp-player-row__status ${statusClass}">${statusText}</span>
          <span class="mp-player-count">${readyCount}/${state.maxPlayers}</span>
        </div>`;
    });

    // Render empty seats
    for (let i = state.players.length + 1; i <= state.maxPlayers; i++) {
      html += `
        <div class="mp-player-row mp-player-row--empty">
          <span class="mp-player-row__seat">Seat ${i}:</span>
          <span class="mp-player-row__name">Empty</span>
          <span class="mp-player-row__status not-ready">—</span>
          <span class="mp-player-count">${readyCount}/${state.maxPlayers}</span>
        </div>`;
    }

    DOM.playerList.innerHTML = html;
  }

  /**
   * _updateButtonStates() — Enables/disables buttons based on state.
   */
  function _updateButtonStates() {
    const inLobby = state.roomState === 'lobby';
    const isIdle = state.roomState === 'idle';

    // Host/Join only available when idle
    if (DOM.btnHost) DOM.btnHost.disabled = !isIdle;
    if (DOM.btnJoin) DOM.btnJoin.disabled = !isIdle;
    if (DOM.btnMatch) DOM.btnMatch.disabled = !isIdle;

    // Ready/Leave only available when in lobby
    if (DOM.btnReady) {
      DOM.btnReady.disabled = !inLobby;
      DOM.btnReady.textContent = state.isReady ? '✅ Ready' : 'Set Ready';
      if (state.isReady) {
        DOM.btnReady.classList.remove('mp-btn--success');
        DOM.btnReady.classList.add('mp-btn--danger');
      } else {
        DOM.btnReady.classList.remove('mp-btn--danger');
        DOM.btnReady.classList.add('mp-btn--success');
      }
    }
    if (DOM.btnLeave) DOM.btnLeave.disabled = !inLobby;

    // Start: only for host, only when all ready
    if (DOM.btnStart) {
      const allReady = state.players.length > 0 && state.players.every(p => p.isReady);
      DOM.btnStart.disabled = !state.isHost || !allReady || !inLobby;
    }
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 6: MODAL OPEN/CLOSE
  // ──────────────────────────────────────────────────────────────────────

  function openModal() {
    _cacheDom();
    _wireEvents();
    if (DOM.overlay) DOM.overlay.classList.add('active');
    _updateAllUI();
    console.log('[multiplayer.js] Modal opened.');
  }

  function closeModal() {
    if (DOM.overlay) DOM.overlay.classList.remove('active');
    console.log('[multiplayer.js] Modal closed.');
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 7: EVENT WIRING
  // ──────────────────────────────────────────────────────────────────────

  let _eventsWired = false;

  function _wireEvents() {
    if (_eventsWired) return;
    _eventsWired = true;

    // Close button
    if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', closeModal);

    // Close on overlay click (outside modal)
    if (DOM.overlay) {
      DOM.overlay.addEventListener('click', (e) => {
        if (e.target === DOM.overlay) closeModal();
      });
    }

    // Action buttons
    if (DOM.btnHost) DOM.btnHost.addEventListener('click', hostRoom);
    if (DOM.btnJoin) DOM.btnJoin.addEventListener('click', () => joinRoom());
    if (DOM.btnMatch) DOM.btnMatch.addEventListener('click', matchmaking);
    if (DOM.btnReady) DOM.btnReady.addEventListener('click', toggleReady);
    if (DOM.btnLeave) DOM.btnLeave.addEventListener('click', leaveRoom);
    if (DOM.btnStart) DOM.btnStart.addEventListener('click', startMatch);

    // Copy buttons
    if (DOM.btnCopyCode) DOM.btnCopyCode.addEventListener('click', () => _copyToClipboard(state.roomCode, DOM.btnCopyCode, 'Code copied!'));
    if (DOM.btnCopyKey)  DOM.btnCopyKey.addEventListener('click', () => _copyToClipboard(net.generateJoinKey(), DOM.btnCopyKey, 'Join Key copied!'));
    if (DOM.btnCopyLink) DOM.btnCopyLink.addEventListener('click', () => _copyToClipboard(net.generateInviteLink(), DOM.btnCopyLink, 'Invite Link copied!'));

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.overlay && DOM.overlay.classList.contains('active')) {
        closeModal();
      }
    });

    console.log('[multiplayer.js] Events wired.');
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 8: UTILITIES
  // ──────────────────────────────────────────────────────────────────────

  /**
   * _generateRoomCode() — Returns a random 6-char alphanumeric code.
   */
  function _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding I,O,0,1 for readability
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * _generateId() — Returns a unique player ID.
   */
  function _generateId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /**
   * _getNextAvailableSeat() — Returns the next open seat number.
   */
  function _getNextAvailableSeat() {
    const taken = state.players.map(p => p.seat);
    for (let i = 1; i <= state.maxPlayers; i++) {
      if (!taken.includes(i)) return i;
    }
    return state.players.length + 1;
  }

  /**
   * _copyToClipboard(text, btn, successMsg) — Copies text and shows feedback.
   */
  function _copyToClipboard(text, btn, successMsg) {
    if (!text) {
      _showToast('Nothing to copy — create or join a room first.', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      _showToast(successMsg, 'success');
      if (btn) {
        btn.classList.add('copied');
        const orig = btn.textContent;
        btn.textContent = '✓ Copied';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = orig;
        }, 1500);
      }
    }).catch(() => {
      // Fallback: select-and-copy
      _showToast('Press Ctrl+C to copy.', 'warning');
    });
  }

  /**
   * _showToast(msg, type) — Shows a notification inside the modal.
   */
  function _showToast(msg, type = 'info') {
    if (!DOM.toastContainer) return;
    const el = document.createElement('div');
    el.className = `mp-toast ${type}`;
    el.textContent = msg;
    DOM.toastContainer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3000);
  }


  // ──────────────────────────────────────────────────────────────────────
  // SECTION 9: CHECK FOR AUTO-JOIN (URL parameter)
  // ──────────────────────────────────────────────────────────────────────

  function _checkAutoJoin() {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      console.log(`[multiplayer.js] Auto-join detected: ${joinCode}`);
      // Open the modal and pre-fill the code
      setTimeout(() => {
        openModal();
        if (DOM.inputCode) DOM.inputCode.value = joinCode;
        _showToast(`Room code ${joinCode} detected! Enter your name and click Join.`, 'info');
      }, 500);
    }
  }

  // Run auto-join check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _checkAutoJoin);
  } else {
    _checkAutoJoin();
  }


  // ──────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────

  return {
    // State (read-only access)
    get state() { return { ...state }; },

    // Modal control
    open: openModal,
    close: closeModal,

    // Player actions
    hostRoom,
    joinRoom,
    toggleReady,
    leaveRoom,
    startMatch,
    matchmaking,

    // Network hooks (expose so external code can override)
    net,

    // Utilities
    getPlayerCount: () => state.players.length,
    getRoomCode: () => state.roomCode,
    isInLobby: () => state.roomState === 'lobby',
  };

})();


// ─── MODULE LOADED LOG ──────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('[multiplayer.js] Multiplayer Session Manager loaded.');
console.log('  → Isolated from single-player. Zero impact on existing modules.');
console.log('  → Networking: PeerJS P2P (free, zero-cost, no server needed)');
console.log('═══════════════════════════════════════════════════════════');
