// ═══════════════════════════════════════════════════════════════════════════
// TPS — /shared/news.js  (v1.0.2)
// Global Narrative News Engine — Reports on player actions with public polls
// ═══════════════════════════════════════════════════════════════════════════
// Self-injecting module. Loaded after settings.js on every page.
// Provides publishNews() globally and renders a slide-in news ticker.
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: NEWS FEED STATE
// ──────────────────────────────────────────────────────────────────────────

const _newsFeedState = {
  articles: [],          // { id, headline, headlineThai, body, category, sentiment, timestamp, poll }
  maxArticles: 30,
  isOpen: false,
  unreadCount: 0
};

// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: NEWS HEADLINE TEMPLATES
// Organized by category. {player}, {party}, {value}, {topic} are replaced.
// ──────────────────────────────────────────────────────────────────────────

const NEWS_TEMPLATES = {
  protest_sustained: {
    positive: [
      { en: "BREAKING: {player} Stuns Parliament — Protest Sustained Against {target}", th: "ด่วน: {player} สร้างเซอร์ไพรส์สภา — คำประท้วงฟังขึ้น" },
      { en: "Order in the House! {player}'s Sharp Protest Silences {target}", th: "ความสงบในสภา! คำประท้วงของ {player} ทำให้ {target} เงียบ" }
    ]
  },
  protest_overruled: {
    negative: [
      { en: "{player}'s Protest Overruled — Speaker Sides with {target}", th: "คำประท้วงของ {player} ฟังไม่ขึ้น — ประธานสภาเข้าข้าง {target}" },
      { en: "Embarrassment for {player}: Baseless Protest Costs Political Capital", th: "น่าอาย! คำประท้วงไร้มูลของ {player} เสียทุนทางการเมือง" }
    ]
  },
  speech_success: {
    positive: [
      { en: "Standing Ovation: {player}'s {style} Speech Moves the House", th: "ปรบมือกึกก้อง: สุนทรพจน์{style}ของ {player} ทำให้สภาประทับใจ" },
      { en: "\"{player} Was On Fire\" — Pundits React to Powerful House Speech", th: "\"{player} เผาสภา\" — นักวิจารณ์ตอบรับสุนทรพจน์ทรงพลัง" }
    ]
  },
  speech_fail: {
    negative: [
      { en: "Flat Performance: {player}'s Speech Falls on Deaf Ears", th: "น่าผิดหวัง: สุนทรพจน์ของ {player} ไม่มีใครฟัง" },
      { en: "\"Weak and Unfocused\" — Critics Slam {player}'s House Speech", th: "\"อ่อนและกระจัดกระจาย\" — นักวิจารณ์โจมตีสุนทรพจน์ของ {player}" }
    ]
  },
  vote_passed: {
    neutral: [
      { en: "BILL PASSED: {topic} Clears Parliament {ayes}-{nays}", th: "ผ่านแล้ว: {topic} ผ่านสภา {ayes}-{nays}" },
      { en: "Victory for Proponents: {topic} Passes After Heated Debate", th: "ชัยชนะ: {topic} ผ่านหลังอภิปรายร้อนแรง" }
    ]
  },
  vote_defeated: {
    neutral: [
      { en: "BILL DEFEATED: {topic} Fails to Pass {ayes}-{nays}", th: "ตกไป: {topic} ไม่ผ่านสภา {ayes}-{nays}" },
      { en: "Government Setback: {topic} Voted Down in Dramatic Session", th: "รัฐบาลพ่ายแพ้: {topic} ถูกโหวตคว่ำ" }
    ],
    negative: [
      { en: "🚨 GOVERNMENT CRISIS: Coalition Fractures as {topic} DEFEATED {ayes}-{nays}", th: "🚨 วิกฤตรัฐบาล: แตกแถว! {topic} ถูกคว่ำ {ayes}-{nays}" },
      { en: "BREAKING: Government Humiliated — {topic} Voted Down, Coalition in Chaos", th: "ด่วน: รัฐบาลอับอาย — {topic} ไม่ผ่าน สั่นคลอนเสถียรภาพ" },
      { en: "Coalition Cracks: {topic} REJECTED — PM Faces No-Confidence Whispers", th: "พรรคร่วมรัฐบาลแตก: {topic} ถูกคว่ำ — นายกฯ เผชิญกระแสอภิปรายไม่ไว้วางใจ" }
    ]
  },
  interpellation_success: {
    positive: [
      { en: "{player} Grills {target} — Minister Left Speechless", th: "{player} ซักฟอก {target} — รัฐมนตรีพูดไม่ออก" },
      { en: "DEVASTATING: {player} Completely Destroys {target} in Live Broadcast!", th: "สะเทือน! {player} ถล่ม {target} ในถ่ายทอดสด!" },
      { en: "\"The Minister Had No Answer\" — {player}'s Interpellation Goes Viral", th: "\"รัฐมนตรีตอบไม่ได้\" — กระทู้ของ {player} แชร์กระหน่ำ" },
      { en: "Clip of {player} Grilling {target} Reaches 5 Million Views Overnight", th: "คลิป {player} ซัก {target} ยอดวิว 5 ล้านข้ามคืน" }
    ]
  },
  interpellation_fail: {
    negative: [
      { en: "{target} Deflects {player}'s Question With Ease", th: "{target} ปัดคำถาม {player} อย่างง่ายดาย" },
      { en: "Awkward Moment: {player}'s Interpellation Backfires as {target} Dominates", th: "น่าอาย: กระทู้ {player} ย้อนกลับ {target} ครองเกม" },
      { en: "{target} Turns the Tables — {player}'s Question Session Falls Flat", th: "{target} กลับสถานการณ์ — กระทู้ของ {player} ไม่เข้าเป้า" }
    ]
  },
  constituency_event: {
    neutral: [
      { en: "{player} Visits {district} — Constituents React", th: "{player} ลงพื้นที่ {district} — ชาวบ้านตอบรับ" }
    ]
  },
  bill_proposed: {
    positive: [
      { en: "New Legislation: {player} Tables '{topic}' Bill", th: "กฎหมายใหม่: {player} เสนอร่าง '{topic}'" },
      { en: "BOLD MOVE: {player} Proposes Sweeping '{topic}' Reform", th: "กล้าหาญ! {player} เสนอร่าง '{topic}' ปฏิรูปครั้งใหญ่" },
      { en: "Parliament Buzzes as {player} Introduces '{topic}' Bill", th: "สภาแตก! {player} เสนอร่าง '{topic}'" },
      { en: "\"{topic}\" Bill Filed: {player} Takes Center Stage in Parliament", th: "ยื่นร่าง \"{topic}\": {player} ขึ้นเวทีกลางสภา" }
    ]
  },
  bill_poll: {
    positive: [
      { en: "📊 POLL: {approval}% of Public Supports '{topic}' Proposed by {party}", th: "📊 โพล: ประชาชน {approval}% สนับสนุน '{topic}' ที่เสนอโดย {party}" },
      { en: "Survey Shows Strong Public Backing for {party}'s '{topic}' Bill — {approval}% Approve", th: "สำรวจพบประชาชนหนุน '{topic}' ของ {party} — {approval}% เห็นด้วย" }
    ],
    negative: [
      { en: "📊 POLL: Only {approval}% Support '{topic}' — Public Skeptical of {party}'s Proposal", th: "📊 โพล: เพียง {approval}% หนุน '{topic}' — ประชาชนไม่เชื่อมั่นร่างของ {party}" }
    ]
  },
  campaign_action: {
    neutral: [
      { en: "{player}'s Campaign Makes Waves in {region}", th: "แคมเปญของ {player} สร้างกระแสใน{region}" }
    ]
  }
};

// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: POLL GENERATOR
// Generates realistic approval/disapproval polls based on player stats.
// ──────────────────────────────────────────────────────────────────────────

const POLL_SOURCES = [
  "Nida Poll", "Suan Dusit Poll", "Bangkok Poll", "Super Poll",
  "Thai PBS Survey", "Matichon Public Opinion", "Nation Survey"
];

function _generatePoll(sentiment, context) {
  const source = POLL_SOURCES[Math.floor(Math.random() * POLL_SOURCES.length)];
  let approve, disapprove, undecided;

  if (sentiment === 'positive') {
    approve = 45 + Math.floor(Math.random() * 25);    // 45-69%
    disapprove = 15 + Math.floor(Math.random() * 20);  // 15-34%
  } else if (sentiment === 'negative') {
    approve = 15 + Math.floor(Math.random() * 20);     // 15-34%
    disapprove = 40 + Math.floor(Math.random() * 30);  // 40-69%
  } else {
    approve = 30 + Math.floor(Math.random() * 25);     // 30-54%
    disapprove = 25 + Math.floor(Math.random() * 25);  // 25-49%
  }
  undecided = Math.max(5, 100 - approve - disapprove);

  // Adjust totals to 100
  const total = approve + disapprove + undecided;
  if (total !== 100) {
    undecided = 100 - approve - disapprove;
    if (undecided < 0) { disapprove += undecided; undecided = 0; }
  }

  return {
    source,
    approve: Math.max(0, approve),
    disapprove: Math.max(0, disapprove),
    undecided: Math.max(0, undecided),
    question: context || "this action",
    sampleSize: 800 + Math.floor(Math.random() * 700)
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: CORE API — publishNews()
// Called from any module to push a news article into the feed.
// ──────────────────────────────────────────────────────────────────────────

/**
 * publishNews() — Publishes a news headline to the global feed.
 *
 * @param {string} category  — Key from NEWS_TEMPLATES (e.g. "protest_sustained")
 * @param {Object} vars      — Template variables: { player, target, topic, style, ayes, nays, region, district }
 * @param {Object} options   — { sentiment: 'positive'|'negative'|'neutral', showPoll: true, pollContext: string }
 * @returns {Object} The created article
 */
function publishNews(category, vars = {}, options = {}) {
  const templates = NEWS_TEMPLATES[category];
  if (!templates) {
    console.warn(`[news.js] Unknown category: "${category}"`);
    return null;
  }

  // Determine sentiment
  const sentiment = options.sentiment || Object.keys(templates)[0];
  const pool = templates[sentiment] || templates[Object.keys(templates)[0]];
  if (!pool || pool.length === 0) return null;

  // Pick random template
  const tmpl = pool[Math.floor(Math.random() * pool.length)];
  const lang = (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.language === 'TH') ? 'th' : 'en';
  let headline = tmpl[lang] || tmpl.en;

  // Substitute variables
  for (const [key, val] of Object.entries(vars)) {
    headline = headline.replace(new RegExp(`\\{${key}\\}`, 'g'), val || '');
  }

  // Generate poll if requested
  let poll = null;
  if (options.showPoll !== false) {
    poll = _generatePoll(sentiment, options.pollContext || headline);
  }

  // Build article
  const article = {
    id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    headline,
    headlineOriginal: tmpl.en,
    category,
    sentiment,
    poll,
    timestamp: Date.now(),
    vars: { ...vars }
  };

  // Push to state
  _newsFeedState.articles.unshift(article);
  if (_newsFeedState.articles.length > _newsFeedState.maxArticles) {
    _newsFeedState.articles.pop();
  }
  _newsFeedState.unreadCount++;

  // Update badge
  _updateNewsBadge();

  // Show the slide-in notification
  _showNewsAlert(article);

  console.log(`[news.js] 📰 Published: "${headline}"`);
  return article;
}

/**
 * getNewsFeed() — Returns all articles.
 */
function getNewsFeed() {
  return [..._newsFeedState.articles];
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: SELF-INJECTING UI — News Ticker + Panel
// Injects a floating news button and slide-out feed panel.
// ──────────────────────────────────────────────────────────────────────────

function _injectNewsCSS() {
  const style = document.createElement('style');
  style.id = 'tps-news-css';
  style.textContent = `
    /* ── News FAB Button ── */
    #tps-news-fab {
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid rgba(255, 215, 0, 0.3);
      color: #FFD700;
      font-size: 1.4rem;
      cursor: pointer;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    #tps-news-fab:hover {
      transform: scale(1.1);
      border-color: #FFD700;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    }

    /* ── Unread Badge ── */
    #tps-news-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background: #E63946;
      color: #fff;
      font-size: 0.6rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      font-family: 'Inter', sans-serif;
      display: none;
    }
    #tps-news-badge.has-unread { display: flex; }

    /* ── News Slide Alert (top banner) ── */
    #tps-news-alert {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 19000;
      transform: translateY(-100%);
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }
    #tps-news-alert.visible {
      transform: translateY(0);
      pointer-events: auto;
    }
    .news-alert-inner {
      margin: 0 auto;
      max-width: 720px;
      padding: 10px 20px;
      background: linear-gradient(135deg, rgba(10,14,26,0.97) 0%, rgba(22,33,62,0.97) 100%);
      border-bottom: 2px solid rgba(255, 215, 0, 0.4);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .news-alert-inner:hover { border-bottom-color: #FFD700; }
    .news-alert__breaking {
      font-size: 0.55rem;
      font-weight: 800;
      color: #E63946;
      background: rgba(230,57,70,0.15);
      padding: 2px 8px;
      border-radius: 3px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      white-space: nowrap;
      animation: news-pulse 1.5s ease-in-out infinite;
    }
    @keyframes news-pulse {
      0%,100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .news-alert__headline {
      font-size: 0.82rem;
      font-weight: 600;
      color: #e8eaf0;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'Inter', sans-serif;
    }
    .news-alert__sentiment {
      font-size: 1rem;
      flex-shrink: 0;
    }

    /* ── News Panel (slide-out) ── */
    #tps-news-panel-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 18000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #tps-news-panel-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    #tps-news-panel {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 380px;
      max-width: 90vw;
      background: linear-gradient(180deg, #0f1528 0%, #0a0e1a 100%);
      border-right: 1px solid rgba(255,215,0,0.15);
      z-index: 18001;
      transform: translateX(-100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      font-family: 'Inter', sans-serif;
    }
    #tps-news-panel-overlay.open #tps-news-panel {
      transform: translateX(0);
    }

    .news-panel__header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,215,0,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .news-panel__title {
      font-size: 1rem;
      font-weight: 800;
      color: #FFD700;
      letter-spacing: 0.5px;
    }
    .news-panel__close {
      background: none;
      border: 1px solid rgba(255,255,255,0.1);
      color: #9ba3b8;
      width: 28px; height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .news-panel__close:hover {
      color: #fff;
      border-color: rgba(255,255,255,0.3);
    }

    .news-panel__feed {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .news-panel__feed::-webkit-scrollbar { width: 4px; }
    .news-panel__feed::-webkit-scrollbar-track { background: transparent; }
    .news-panel__feed::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.2); border-radius: 2px; }

    .news-panel__empty {
      text-align: center;
      color: #6b748a;
      padding: 40px 20px;
      font-size: 0.85rem;
    }

    /* ── Individual News Card ── */
    .news-card {
      padding: 12px 14px;
      margin-bottom: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      border-left: 3px solid #6b748a;
      transition: background 0.15s;
    }
    .news-card:hover { background: rgba(255,255,255,0.06); }
    .news-card.positive { border-left-color: #28A745; }
    .news-card.negative { border-left-color: #E63946; }
    .news-card.neutral  { border-left-color: #457B9D; }

    .news-card__time {
      font-size: 0.6rem;
      color: #6b748a;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 4px;
    }
    .news-card__headline {
      font-size: 0.82rem;
      font-weight: 700;
      color: #e8eaf0;
      line-height: 1.4;
      margin-bottom: 6px;
    }

    /* ── Poll Bar ── */
    .news-poll {
      margin-top: 8px;
      padding: 8px 10px;
      background: rgba(0,0,0,0.3);
      border-radius: 6px;
    }
    .news-poll__source {
      font-size: 0.58rem;
      color: #6b748a;
      margin-bottom: 6px;
      font-style: italic;
    }
    .news-poll__bars {
      display: flex;
      height: 14px;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .news-poll__bar-approve {
      background: linear-gradient(90deg, #28A745, #34d058);
      height: 100%;
      transition: width 0.6s ease;
    }
    .news-poll__bar-disapprove {
      background: linear-gradient(90deg, #E63946, #ff6b7a);
      height: 100%;
      transition: width 0.6s ease;
    }
    .news-poll__bar-undecided {
      background: rgba(108,117,125,0.4);
      height: 100%;
      flex: 1;
    }
    .news-poll__labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.6rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .news-poll__labels .approve { color: #4ADE80; }
    .news-poll__labels .disapprove { color: #FF6B7A; }
    .news-poll__labels .undecided { color: #6b748a; }
  `;
  document.head.appendChild(style);
}

function _injectNewsDOM() {
  // FAB Button
  const fab = document.createElement('button');
  fab.id = 'tps-news-fab';
  fab.title = 'News Feed — ข่าวสาร';
  fab.innerHTML = `📰<span id="tps-news-badge"></span>`;
  fab.addEventListener('click', _toggleNewsPanel);
  document.body.appendChild(fab);

  // Alert Banner
  const alert = document.createElement('div');
  alert.id = 'tps-news-alert';
  alert.innerHTML = `<div class="news-alert-inner">
    <span class="news-alert__breaking">BREAKING</span>
    <span class="news-alert__headline" id="tps-news-alert-text"></span>
    <span class="news-alert__sentiment" id="tps-news-alert-icon"></span>
  </div>`;
  alert.querySelector('.news-alert-inner').addEventListener('click', () => {
    alert.classList.remove('visible');
    _toggleNewsPanel();
  });
  document.body.appendChild(alert);

  // Panel Overlay
  const overlay = document.createElement('div');
  overlay.id = 'tps-news-panel-overlay';
  overlay.innerHTML = `
    <div id="tps-news-panel">
      <div class="news-panel__header">
        <span class="news-panel__title">📰 TPS News — ข่าวสาร</span>
        <button class="news-panel__close" id="tps-news-close" title="Close">✕</button>
      </div>
      <div class="news-panel__feed" id="tps-news-feed">
        <div class="news-panel__empty">No news yet.<br>Actions generate headlines.</div>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeNewsPanel();
  });
  document.body.appendChild(overlay);

  document.getElementById('tps-news-close').addEventListener('click', _closeNewsPanel);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: UI HELPERS
// ──────────────────────────────────────────────────────────────────────────

let _newsAlertTimer = null;

function _showNewsAlert(article) {
  const el = document.getElementById('tps-news-alert');
  if (!el) return;

  const textEl = document.getElementById('tps-news-alert-text');
  const iconEl = document.getElementById('tps-news-alert-icon');

  textEl.textContent = article.headline;
  iconEl.textContent = article.sentiment === 'positive' ? '📈' :
                       article.sentiment === 'negative' ? '📉' : '📊';

  el.classList.add('visible');

  if (_newsAlertTimer) clearTimeout(_newsAlertTimer);
  _newsAlertTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 6000);
}

function _updateNewsBadge() {
  const badge = document.getElementById('tps-news-badge');
  if (!badge) return;
  if (_newsFeedState.unreadCount > 0) {
    badge.textContent = _newsFeedState.unreadCount > 9 ? '9+' : _newsFeedState.unreadCount;
    badge.classList.add('has-unread');
  } else {
    badge.classList.remove('has-unread');
  }
}

function _toggleNewsPanel() {
  const overlay = document.getElementById('tps-news-panel-overlay');
  if (!overlay) return;
  if (overlay.classList.contains('open')) {
    _closeNewsPanel();
  } else {
    _openNewsPanel();
  }
}

function _openNewsPanel() {
  const overlay = document.getElementById('tps-news-panel-overlay');
  if (!overlay) return;
  _newsFeedState.unreadCount = 0;
  _updateNewsBadge();
  _renderNewsFeed();
  overlay.classList.add('open');
  _newsFeedState.isOpen = true;
}

function _closeNewsPanel() {
  const overlay = document.getElementById('tps-news-panel-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  _newsFeedState.isOpen = false;
}

function _renderNewsFeed() {
  const feed = document.getElementById('tps-news-feed');
  if (!feed) return;

  if (_newsFeedState.articles.length === 0) {
    feed.innerHTML = '<div class="news-panel__empty">No news yet.<br>Your actions generate headlines.</div>';
    return;
  }

  feed.innerHTML = '';
  _newsFeedState.articles.forEach(article => {
    const card = document.createElement('div');
    card.className = `news-card ${article.sentiment}`;

    const timeStr = new Date(article.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });

    let pollHTML = '';
    if (article.poll) {
      const p = article.poll;
      pollHTML = `
        <div class="news-poll">
          <div class="news-poll__source">${p.source} (n=${p.sampleSize.toLocaleString()})</div>
          <div class="news-poll__bars">
            <div class="news-poll__bar-approve" style="width:${p.approve}%"></div>
            <div class="news-poll__bar-disapprove" style="width:${p.disapprove}%"></div>
            <div class="news-poll__bar-undecided"></div>
          </div>
          <div class="news-poll__labels">
            <span class="approve">👍 ${p.approve}%</span>
            <span class="undecided">🤷 ${p.undecided}%</span>
            <span class="disapprove">👎 ${p.disapprove}%</span>
          </div>
        </div>`;
    }

    card.innerHTML = `
      <div class="news-card__time">${timeStr} — ${article.category.replace(/_/g, ' ').toUpperCase()}</div>
      <div class="news-card__headline">${article.headline}</div>
      ${pollHTML}
    `;
    feed.appendChild(card);
  });
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: INITIALIZATION
// ──────────────────────────────────────────────────────────────────────────

(function _initNewsEngine() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      _injectNewsCSS();
      _injectNewsDOM();
    });
  } else {
    _injectNewsCSS();
    _injectNewsDOM();
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("[shared/news.js] Global News Engine loaded (v1.0.2).");
  console.log("  → publishNews(category, vars, options) ready");
  console.log("  → Categories:", Object.keys(NEWS_TEMPLATES).join(', '));
  console.log("═══════════════════════════════════════════════════════════");
})();
