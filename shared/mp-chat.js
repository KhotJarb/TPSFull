// ═══════════════════════════════════════════════════════════════════════════
// TPS — shared/mp-chat.js (v1.0.2)
// Multiplayer Real-Time Chat — Self-Injecting Cross-Module P2P Chat
// ═══════════════════════════════════════════════════════════════════════════
// Self-injecting module. Only activates when tps_game_mode === 'multiplayer'.
// Uses a dedicated PeerJS peer (CHAT_ prefix) separate from game coordinator.
// Messages persist in localStorage across module transitions.
// ═══════════════════════════════════════════════════════════════════════════

(function _initMPChat() {
  'use strict';

  // ── Guard: Only activate in multiplayer ──
  const _isMPChat = localStorage.getItem('tps_game_mode') === 'multiplayer'
    || new URLSearchParams(window.location.search).get('mode') === 'mp';
  if (!_isMPChat) return;

  // ── Session data ──
  let session = {};
  try { session = JSON.parse(localStorage.getItem('tps_mp_session') || '{}'); } catch(e) {}
  const roomCode = session.roomCode || new URLSearchParams(window.location.search).get('room') || '';
  const playerId = session.playerId || 'anon_' + Date.now().toString(36);
  const playerName = session.playerName || 'Player';
  const isHost = session.isHost || false;
  if (!roomCode) { console.log('[mp-chat] No room code — chat inactive.'); return; }

  // ── State ──
  const CHAT_PREFIX = 'CHAT_';
  const MAX_MESSAGES = 100;
  let _peer = null;
  let _connections = [];
  let _hostConn = null;
  let _isOpen = false;
  let _unread = 0;
  let _messages = _loadMessages();

  // ── Get party info for color ──
  function _getMyPartyColor() {
    try {
      const sel = JSON.parse(localStorage.getItem('tps_mp_party_selections') || '{}');
      const myPartyId = sel[playerId];
      if (myPartyId && typeof CAMPAIGN_PARTIES !== 'undefined') {
        const p = CAMPAIGN_PARTIES.find(x => x.id === myPartyId);
        if (p) return p.color;
      }
    } catch(e) {}
    return '#d4af37';
  }

  function _getPlayerPartyColor(pid) {
    try {
      const sel = JSON.parse(localStorage.getItem('tps_mp_party_selections') || '{}');
      const partyId = sel[pid];
      if (partyId && typeof CAMPAIGN_PARTIES !== 'undefined') {
        const p = CAMPAIGN_PARTIES.find(x => x.id === partyId);
        if (p) return p.color;
      }
    } catch(e) {}
    return '#6b748a';
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 1: MESSAGE PERSISTENCE
  // ══════════════════════════════════════════════════════════════════

  function _loadMessages() {
    try {
      const raw = localStorage.getItem('tps_mp_chat_' + roomCode);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  function _saveMessages() {
    try {
      // Keep only last MAX_MESSAGES
      if (_messages.length > MAX_MESSAGES) _messages = _messages.slice(-MAX_MESSAGES);
      localStorage.setItem('tps_mp_chat_' + roomCode, JSON.stringify(_messages));
    } catch(e) {}
  }

  function _addMessage(msg) {
    _messages.push(msg);
    _saveMessages();
    _renderMessages();
    if (!_isOpen) {
      _unread++;
      _updateBadge();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2: PEERJS CHAT NETWORKING
  // ══════════════════════════════════════════════════════════════════

  function _initPeer() {
    if (typeof Peer === 'undefined') {
      console.warn('[mp-chat] PeerJS not loaded.');
      return;
    }

    try {
      if (isHost) {
        _peer = new Peer(CHAT_PREFIX + roomCode, { debug: 0 });
        _peer.on('open', () => {
          console.log('[mp-chat] Host chat peer open:', _peer.id);
        });
        _peer.on('connection', (conn) => {
          _connections.push(conn);
          conn.on('data', (data) => _onReceive(data, conn));
          conn.on('close', () => {
            _connections = _connections.filter(c => c !== conn);
          });
        });
        _peer.on('error', (err) => {
          console.warn('[mp-chat] Host error:', err.type);
          if (err.type === 'unavailable-id') {
            setTimeout(() => {
              _peer = new Peer(CHAT_PREFIX + roomCode + '_c', { debug: 0 });
              _peer.on('open', () => console.log('[mp-chat] Host alt peer open'));
              _peer.on('connection', (conn) => {
                _connections.push(conn);
                conn.on('data', (data) => _onReceive(data, conn));
                conn.on('close', () => { _connections = _connections.filter(c => c !== conn); });
              });
            }, 500);
          }
        });
      } else {
        _peer = new Peer(undefined, { debug: 0 });
        _peer.on('open', () => {
          _hostConn = _peer.connect(CHAT_PREFIX + roomCode, { reliable: true });
          _hostConn.on('open', () => console.log('[mp-chat] Connected to host chat'));
          _hostConn.on('data', (data) => _onReceive(data, _hostConn));
          _hostConn.on('close', () => {
            // Try alternate ID
            _hostConn = _peer.connect(CHAT_PREFIX + roomCode + '_c', { reliable: true });
            _hostConn.on('open', () => console.log('[mp-chat] Connected to host alt chat'));
            _hostConn.on('data', (data) => _onReceive(data, _hostConn));
          });
        });
      }
    } catch(e) {
      console.warn('[mp-chat] Peer init failed:', e);
    }
  }

  function _broadcast(data) {
    if (isHost) {
      _connections.forEach(c => { try { c.send(data); } catch(e) {} });
    } else if (_hostConn) {
      try { _hostConn.send(data); } catch(e) {}
    }
  }

  function _onReceive(data, conn) {
    if (data.type === 'chat_msg') {
      _addMessage(data.msg);
      // Host relays to all other connections
      if (isHost) {
        _connections.forEach(c => {
          if (c !== conn) { try { c.send(data); } catch(e) {} }
        });
      }
    }
  }

  function _sendMessage(text) {
    if (!text.trim()) return;
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      senderId: playerId,
      senderName: playerName,
      color: _getMyPartyColor(),
      text: text.trim(),
      timestamp: Date.now(),
      isSystem: false
    };
    _addMessage(msg);
    _broadcast({ type: 'chat_msg', msg });
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3: CSS INJECTION
  // ══════════════════════════════════════════════════════════════════

  function _injectCSS() {
    const style = document.createElement('style');
    style.id = 'tps-chat-css';
    style.textContent = `
    /* ── Chat FAB ── */
    #tps-chat-fab {
      position: fixed; bottom: 136px; right: 24px;
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid rgba(100, 200, 255, 0.3);
      color: #64c8ff; font-size: 1.3rem; cursor: pointer;
      z-index: 9997; display: flex; align-items: center; justify-content: center;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      animation: tps-chat-fab-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both;
    }
    @keyframes tps-chat-fab-in {
      from { opacity:0; transform:scale(0.3); }
      to { opacity:1; transform:scale(1); }
    }
    #tps-chat-fab:hover {
      transform: scale(1.12);
      border-color: #64c8ff;
      box-shadow: 0 0 20px rgba(100,200,255,0.25);
    }
    #tps-chat-fab.chat-open {
      background: linear-gradient(135deg, #0d3b66 0%, #1a5276 100%);
      border-color: #64c8ff;
    }

    /* ── Unread Badge ── */
    #tps-chat-badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 18px; height: 18px; border-radius: 9px;
      background: #E63946; color: #fff;
      font-size: 0.6rem; font-weight: 800;
      display: none; align-items: center; justify-content: center;
      padding: 0 4px; font-family: 'Inter', sans-serif;
    }
    #tps-chat-badge.has-unread { display: flex; }

    /* ── Chat Drawer Overlay ── */
    #tps-chat-overlay {
      position: fixed; top:0; right:0; bottom:0; left:0;
      z-index: 18000; pointer-events: none;
      opacity: 0; transition: opacity 0.3s ease;
    }
    #tps-chat-overlay.open {
      pointer-events: auto; opacity: 1;
      background: rgba(0,0,0,0.25);
    }

    /* ── Chat Drawer ── */
    #tps-chat-drawer {
      position: absolute; top: 0; right: 0; bottom: 0;
      width: 320px; max-width: 85vw;
      background: linear-gradient(180deg, rgba(10,14,26,0.97) 0%, rgba(15,21,40,0.97) 100%);
      border-left: 1px solid rgba(100,200,255,0.15);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
      box-shadow: -8px 0 40px rgba(0,0,0,0.5);
    }
    #tps-chat-overlay.open #tps-chat-drawer {
      transform: translateX(0);
    }

    /* ── Header ── */
    .chat-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 8px;
      border-bottom: 1px solid rgba(100,200,255,0.1);
      background: rgba(0,0,0,0.2);
    }
    .chat-header__icon { font-size: 1.2rem; }
    .chat-header__title {
      flex: 1; font-size: 0.85rem; font-weight: 700;
      color: #e8eaf0; font-family: 'Inter', sans-serif;
    }
    .chat-header__room {
      font-size: 0.6rem; color: #6b748a;
      font-family: 'JetBrains Mono', monospace;
    }
    .chat-header__close {
      background: none; border: none; color: #6b748a;
      font-size: 1.1rem; cursor: pointer; padding: 4px;
      transition: color 0.2s;
    }
    .chat-header__close:hover { color: #e8eaf0; }

    /* ── Messages ── */
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .chat-messages::-webkit-scrollbar { width: 4px; }
    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(100,200,255,0.15); border-radius: 2px;
    }
    .chat-msg {
      padding: 8px 10px; border-radius: 8px;
      background: rgba(255,255,255,0.03);
      border-left: 3px solid var(--msg-color, #6b748a);
      animation: chat-msg-in 0.25s ease;
    }
    @keyframes chat-msg-in {
      from { opacity:0; transform:translateY(6px); }
      to { opacity:1; transform:translateY(0); }
    }
    .chat-msg__header {
      display: flex; align-items: center; gap: 6px; margin-bottom: 3px;
    }
    .chat-msg__name {
      font-size: 0.7rem; font-weight: 700;
      color: var(--msg-color, #6b748a);
    }
    .chat-msg__time {
      font-size: 0.55rem; color: #4a5068;
      font-family: 'JetBrains Mono', monospace; margin-left: auto;
    }
    .chat-msg__text {
      font-size: 0.8rem; color: #c8ccd8; line-height: 1.45;
      word-break: break-word;
    }
    .chat-msg.system {
      background: rgba(100,200,255,0.04);
      border-left-color: rgba(100,200,255,0.3);
      text-align: center;
    }
    .chat-msg.system .chat-msg__text {
      font-size: 0.7rem; color: #6b86a8; font-style: italic;
    }
    .chat-msg.self {
      background: rgba(100,200,255,0.06);
    }
    .chat-empty {
      text-align: center; color: #4a5068; font-size: 0.75rem;
      padding: 40px 20px; line-height: 1.6;
    }

    /* ── Input ── */
    .chat-input-bar {
      padding: 10px 12px; display: flex; gap: 8px;
      border-top: 1px solid rgba(100,200,255,0.1);
      background: rgba(0,0,0,0.25);
    }
    .chat-input {
      flex: 1; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(100,200,255,0.12);
      border-radius: 8px; padding: 8px 12px;
      color: #e8eaf0; font-size: 0.8rem;
      font-family: 'Inter', sans-serif;
      outline: none; transition: border-color 0.2s;
    }
    .chat-input::placeholder { color: #4a5068; }
    .chat-input:focus { border-color: rgba(100,200,255,0.4); }
    .chat-send-btn {
      width: 38px; height: 38px; border-radius: 8px;
      background: linear-gradient(135deg, #1a5276 0%, #0d3b66 100%);
      border: 1px solid rgba(100,200,255,0.25);
      color: #64c8ff; font-size: 1rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .chat-send-btn:hover {
      background: linear-gradient(135deg, #217dbb 0%, #1a5276 100%);
      border-color: #64c8ff;
    }
    .chat-send-btn:disabled { opacity: 0.3; cursor: default; }
    `;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 4: DOM INJECTION
  // ══════════════════════════════════════════════════════════════════

  function _injectDOM() {
    // FAB Button
    const fab = document.createElement('button');
    fab.id = 'tps-chat-fab';
    fab.title = 'Room Chat — แชท';
    fab.innerHTML = '💬<span id="tps-chat-badge"></span>';
    fab.addEventListener('click', _toggleChat);
    document.body.appendChild(fab);

    // Drawer Overlay
    const overlay = document.createElement('div');
    overlay.id = 'tps-chat-overlay';
    overlay.innerHTML = `
      <div id="tps-chat-drawer">
        <div class="chat-header">
          <span class="chat-header__icon">💬</span>
          <span class="chat-header__title">Room Chat</span>
          <span class="chat-header__room">${roomCode}</span>
          <button class="chat-header__close" id="tps-chat-close" title="Close">✕</button>
        </div>
        <div class="chat-messages" id="tps-chat-messages"></div>
        <div class="chat-input-bar">
          <input type="text" class="chat-input" id="tps-chat-input"
                 placeholder="Type a message..." maxlength="200" autocomplete="off">
          <button class="chat-send-btn" id="tps-chat-send" title="Send">➤</button>
        </div>
      </div>
    `;
    // Click on backdrop closes
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _closeChat();
    });
    document.body.appendChild(overlay);

    // Bind events
    document.getElementById('tps-chat-close').addEventListener('click', _closeChat);
    document.getElementById('tps-chat-send').addEventListener('click', _onSend);
    document.getElementById('tps-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _onSend(); }
    });

    // Initial render
    _renderMessages();
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5: UI LOGIC
  // ══════════════════════════════════════════════════════════════════

  function _toggleChat() {
    if (_isOpen) _closeChat(); else _openChat();
  }

  function _openChat() {
    const overlay = document.getElementById('tps-chat-overlay');
    const fab = document.getElementById('tps-chat-fab');
    if (!overlay) return;
    overlay.classList.add('open');
    if (fab) fab.classList.add('chat-open');
    _isOpen = true;
    _unread = 0;
    _updateBadge();
    // Auto-scroll and focus
    _scrollToBottom();
    setTimeout(() => {
      const input = document.getElementById('tps-chat-input');
      if (input) input.focus();
    }, 350);
  }

  function _closeChat() {
    const overlay = document.getElementById('tps-chat-overlay');
    const fab = document.getElementById('tps-chat-fab');
    if (!overlay) return;
    overlay.classList.remove('open');
    if (fab) fab.classList.remove('chat-open');
    _isOpen = false;
  }

  function _updateBadge() {
    const badge = document.getElementById('tps-chat-badge');
    if (!badge) return;
    if (_unread > 0) {
      badge.textContent = _unread > 9 ? '9+' : _unread;
      badge.classList.add('has-unread');
    } else {
      badge.classList.remove('has-unread');
    }
  }

  function _renderMessages() {
    const container = document.getElementById('tps-chat-messages');
    if (!container) return;

    if (_messages.length === 0) {
      container.innerHTML = '<div class="chat-empty">No messages yet.<br>Say hello to your opponents! 👋</div>';
      return;
    }

    container.innerHTML = '';
    _messages.forEach(msg => {
      const el = document.createElement('div');
      const isSelf = msg.senderId === playerId;
      el.className = 'chat-msg' + (msg.isSystem ? ' system' : '') + (isSelf ? ' self' : '');
      el.style.setProperty('--msg-color', msg.color || '#6b748a');

      const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });

      if (msg.isSystem) {
        el.innerHTML = `<div class="chat-msg__text">⚙️ ${_escapeHTML(msg.text)}</div>`;
      } else {
        el.innerHTML = `
          <div class="chat-msg__header">
            <span class="chat-msg__name">${isSelf ? '🔵 You' : '● ' + _escapeHTML(msg.senderName)}</span>
            <span class="chat-msg__time">${time}</span>
          </div>
          <div class="chat-msg__text">${_escapeHTML(msg.text)}</div>
        `;
      }
      container.appendChild(el);
    });
    _scrollToBottom();
  }

  function _scrollToBottom() {
    const container = document.getElementById('tps-chat-messages');
    if (container) {
      requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }
  }

  function _onSend() {
    const input = document.getElementById('tps-chat-input');
    if (!input || !input.value.trim()) return;
    _sendMessage(input.value);
    input.value = '';
    input.focus();
  }

  function _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 6: PUBLIC API (for system messages)
  // ══════════════════════════════════════════════════════════════════

  function postSystemMessage(text) {
    const msg = {
      id: 'sys_' + Date.now().toString(36),
      senderId: '__system__',
      senderName: 'System',
      color: 'rgba(100,200,255,0.5)',
      text: text,
      timestamp: Date.now(),
      isSystem: true
    };
    _addMessage(msg);
    _broadcast({ type: 'chat_msg', msg });
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 7: BOOT
  // ══════════════════════════════════════════════════════════════════

  function _boot() {
    _injectCSS();
    _injectDOM();
    _initPeer();
    console.log('[mp-chat] Chat system active for room:', roomCode);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  // Expose public API
  window.tpsMPChat = {
    postSystemMessage,
    sendMessage: _sendMessage,
    open: _openChat,
    close: _closeChat,
  };

})();
