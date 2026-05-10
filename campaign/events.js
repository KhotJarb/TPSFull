// ═══════════════════════════════════════════════════════════════════════════
// TPS — /campaign/events.js  (v1.0.2)
// Campaign Random Events Engine — High-Stakes Choices with Trade-Offs
// ═══════════════════════════════════════════════════════════════════════════
// Injected into the campaign module. Fires during advanceDay() alongside
// the existing Lobbyist events, adding deeper strategic unpredictability.
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: CAMPAIGN RANDOM EVENT POOL
// Each event has: id, title, titleThai, category, description, rarity,
// minWeek (earliest it can fire), and choices with clear trade-offs.
// ──────────────────────────────────────────────────────────────────────────

const CAMPAIGN_RANDOM_EVENTS = [

  // ═══ IO / DISINFORMATION ATTACKS ═══
  {
    id: "evt_io_attack_rival",
    title: "🎯 IO Attack on Your Campaign",
    titleThai: "ปฏิบัติการข้อมูลข่าวสารโจมตีพรรค",
    category: "io_attack",
    icon: "🎯",
    description: "A rival party has launched a coordinated disinformation campaign against you on social media. Deepfake videos are circulating. Your poll numbers are dropping.",
    rarity: "common",
    minWeek: 2,
    choices: [
      {
        label: "Counter-Attack with IO",
        labelThai: "ตอบโต้ด้วย IO",
        effects: { funds: -100, scrutiny: 8, pollBoost: 1, ioRetaliation: true },
        risk: "High cost + scrutiny",
        narrative: "You fight fire with fire. Your IO team produces counter-content. The media notices both sides are mudslinging.",
        sentiment: "negative"
      },
      {
        label: "Hold Press Conference (Deny & Clarify)",
        labelThai: "แถลงข่าวชี้แจง",
        effects: { funds: -30, scrutiny: -3, pollBoost: 0.5 },
        risk: "Moderate cost",
        narrative: "You take the high road with a transparent press conference. Some voters are moved by your honesty.",
        sentiment: "positive"
      },
      {
        label: "Ignore It Completely",
        labelThai: "เพิกเฉย",
        effects: { pollPenalty: 2 },
        risk: "Poll damage",
        narrative: "You stay silent. The fake news spreads unchecked. Your base is demoralized.",
        sentiment: "negative"
      }
    ]
  },
  {
    id: "evt_deepfake_scandal",
    title: "📱 Deepfake Scandal Surfaces",
    titleThai: "วิดีโอ Deepfake หลุด",
    category: "io_attack",
    icon: "📱",
    description: "A convincing deepfake video of your party leader making inflammatory statements goes viral. It's fake, but millions have already seen it.",
    rarity: "rare",
    minWeek: 3,
    choices: [
      {
        label: "Sue for Defamation (Legal Route)",
        labelThai: "ฟ้องหมิ่นประมาท",
        effects: { funds: -150, scrutiny: -5, pollBoost: 1.5 },
        risk: "Very costly, slow",
        narrative: "Your lawyers file a high-profile defamation case. The court of public opinion turns sympathetic.",
        sentiment: "positive"
      },
      {
        label: "Release the Real Footage",
        labelThai: "ปล่อยคลิปจริง",
        effects: { funds: -40, scrutiny: 2, pollBoost: 1 },
        risk: "Moderate",
        narrative: "You release timestamped, verified original footage. Tech-savvy voters appreciate the transparency.",
        sentiment: "positive"
      },
      {
        label: "Accuse Rival Party Publicly",
        labelThai: "กล่าวหาพรรคคู่แข่ง",
        effects: { funds: -20, scrutiny: 10, rivalPenalty: 1.5 },
        risk: "High scrutiny",
        narrative: "You point fingers publicly. It becomes a mudslinging match. The EC takes notice.",
        sentiment: "negative"
      }
    ]
  },

  // ═══ PROTESTS & CIVIL UNREST ═══
  {
    id: "evt_street_protest",
    title: "✊ Mass Street Protest",
    titleThai: "การชุมนุมประท้วงใหญ่",
    category: "protest",
    icon: "✊",
    description: "Thousands of citizens take to the streets demanding economic reform. Your party must decide: join the protestors or maintain establishment credibility.",
    rarity: "uncommon",
    minWeek: 2,
    choices: [
      {
        label: "Join the Protestors on Stage",
        labelThai: "ร่วมขึ้นเวทีประท้วง",
        effects: { funds: -50, scrutiny: 6, pollBoost: 2.5, localBoost: "central" },
        risk: "High scrutiny, Bangkok boost",
        narrative: "Your leader takes the megaphone. The crowd roars. The military establishment is watching closely.",
        sentiment: "positive"
      },
      {
        label: "Express Support from a Distance",
        labelThai: "แสดงความสนับสนุนจากระยะไกล",
        effects: { scrutiny: 2, pollBoost: 1 },
        risk: "Lukewarm impact",
        narrative: "You issue a supportive statement without physically joining. Moderates approve, but the crowd is unimpressed.",
        sentiment: "neutral"
      },
      {
        label: "Condemn the Disruption",
        labelThai: "ประณามการชุมนุม",
        effects: { scrutiny: -3, pollPenalty: 1.5, establishmentBoost: true },
        risk: "Lose progressive voters",
        narrative: "You side with law and order. Conservative voters and the military nod approvingly. Youth voters are furious.",
        sentiment: "negative"
      }
    ]
  },
  {
    id: "evt_farmer_march",
    title: "🌾 Farmer's March to Bangkok",
    titleThai: "เกษตรกรเดินขบวนเข้ากรุง",
    category: "protest",
    icon: "🌾",
    description: "Thousands of rice farmers march to Bangkok demanding higher crop subsidies. They've set up camp outside Government House.",
    rarity: "uncommon",
    minWeek: 3,
    choices: [
      {
        label: "Promise Subsidy Increase (+฿150M)",
        labelThai: "สัญญาเพิ่มเงินอุดหนุน",
        effects: { funds: -150, pollBoost: 2, localBoost: "northeast" },
        risk: "Very costly, NE boost",
        narrative: "You pledge a massive subsidy increase. Isan farmers rally behind you. Budget hawks are nervous.",
        sentiment: "positive"
      },
      {
        label: "Meet Leaders, Promise Committee Review",
        labelThai: "พบผู้นำ สัญญาตั้งคณะกรรมการ",
        effects: { funds: -20, pollBoost: 0.5, scrutiny: 1 },
        risk: "Moderate",
        narrative: "You meet the march leaders personally. Promises are vague but the optics are good.",
        sentiment: "neutral"
      },
      {
        label: "Blame Government, Stay Out of It",
        labelThai: "โทษรัฐบาล ไม่ยุ่ง",
        effects: { scrutiny: -2, pollPenalty: 1 },
        risk: "Lose rural voters",
        narrative: "You blame the current government but offer nothing. Farmers feel betrayed by all politicians.",
        sentiment: "negative"
      }
    ]
  },

  // ═══ EC / LEGAL CRISES ═══
  {
    id: "evt_ec_raid",
    title: "🔍 EC Investigation — Campaign Finance Audit",
    titleThai: "กกต. ตรวจสอบการเงินหาเสียง",
    category: "ec_crisis",
    icon: "🔍",
    description: "The Election Commission announces a formal audit of your campaign finances. Irregularities have been flagged. If found guilty, your party could face dissolution.",
    rarity: "rare",
    minWeek: 4,
    choices: [
      {
        label: "Full Cooperation (Open Books)",
        labelThai: "เปิดเผยข้อมูลทั้งหมด",
        effects: { funds: -80, scrutiny: -15 },
        risk: "Costly but safe",
        narrative: "You cooperate fully and hire independent auditors. The EC clears you after a thorough review. Your credibility soars.",
        sentiment: "positive"
      },
      {
        label: "Hire Top Lawyers (Fight Back)",
        labelThai: "จ้างทนายชั้นนำ",
        effects: { funds: -200, scrutiny: 5 },
        risk: "Extremely costly",
        narrative: "Your legal team challenges the EC's jurisdiction. The case drags on but stays out of the headlines. For now.",
        sentiment: "neutral"
      },
      {
        label: "Destroy Evidence",
        labelThai: "ทำลายหลักฐาน",
        effects: { scrutiny: 25, pollPenalty: 2.5 },
        risk: "EXTREME RISK",
        narrative: "You order records destroyed. Whistleblowers leak the cover-up. It's front-page news. The party is in crisis.",
        sentiment: "negative"
      }
    ]
  },

  // ═══ MEDIA / SCANDAL ═══
  {
    id: "evt_candidate_scandal",
    title: "💥 Candidate Scandal Exposed",
    titleThai: "อื้อฉาวผู้สมัครพรรค",
    category: "scandal",
    icon: "💥",
    description: "A key candidate in your party has been caught on video accepting an envelope of cash from a local businessman. The footage is going viral.",
    rarity: "uncommon",
    minWeek: 2,
    choices: [
      {
        label: "Expel the Candidate Immediately",
        labelThai: "ขับออกจากพรรคทันที",
        effects: { scrutiny: -8, pollBoost: 1, rosterPenalty: true },
        risk: "Lose a candidate slot",
        narrative: "Swift, decisive action. The party's integrity is preserved, but you lose a strong regional candidate.",
        sentiment: "positive"
      },
      {
        label: "Internal Investigation (Stall)",
        labelThai: "ตั้งกรรมการสอบภายใน",
        effects: { scrutiny: 5, pollPenalty: 0.5 },
        risk: "Moderate scrutiny",
        narrative: "You announce an internal investigation. Critics say you're stalling. The story stays in the news cycle.",
        sentiment: "neutral"
      },
      {
        label: "Defend the Candidate (Deny Everything)",
        labelThai: "ปกป้องผู้สมัคร",
        effects: { scrutiny: 15, pollPenalty: 2 },
        risk: "Very high scrutiny",
        narrative: "You claim the video is doctored. But more evidence surfaces. Your credibility takes a massive hit.",
        sentiment: "negative"
      }
    ]
  },
  {
    id: "evt_viral_moment",
    title: "⭐ Viral Campaign Moment",
    titleThai: "ช่วงเวลาไวรัลของแคมเปญ",
    category: "opportunity",
    icon: "⭐",
    description: "A candid video of your party leader helping flood victims has gone viral. 10 million views and counting. The public mood is strongly in your favor.",
    rarity: "rare",
    minWeek: 1,
    choices: [
      {
        label: "Capitalize — Rush Ads to Match the Moment",
        labelThai: "ใช้โอกาส — ยิงโฆษณาเพิ่ม",
        effects: { funds: -120, pollBoost: 3, scrutiny: 4 },
        risk: "Costly, some scrutiny",
        narrative: "You flood social media with professional ads building on the viral moment. Polls surge, but the EC notes the ad spend.",
        sentiment: "positive"
      },
      {
        label: "Ride the Wave Organically",
        labelThai: "ปล่อยให้กระแสไหลไปเอง",
        effects: { pollBoost: 1.5, scrutiny: 0 },
        risk: "None",
        narrative: "You let the organic momentum carry you. The moment fades faster than if you'd amplified it, but there's zero backlash.",
        sentiment: "positive"
      },
      {
        label: "Hold a Follow-Up Charity Event",
        labelThai: "จัดงานการกุศลต่อเนื่อง",
        effects: { funds: -60, pollBoost: 2, localBoost: "central", scrutiny: 1 },
        risk: "Moderate cost",
        narrative: "You organize a major charity event. The media covers it extensively. Your humanitarian brand is cemented.",
        sentiment: "positive"
      }
    ]
  },

  // ═══ MILITARY / ESTABLISHMENT ═══
  {
    id: "evt_military_warning",
    title: "⚔️ Military \"Concerns\" Leaked",
    titleThai: "ทหารส่งสัญญาณ \"ห่วงใย\"",
    category: "military",
    icon: "⚔️",
    description: "A senior military commander has privately expressed \"concerns\" about your party's platform. Anonymous sources leak the warning to the press. This is Thai politics' most dangerous signal.",
    rarity: "rare",
    minWeek: 5,
    choices: [
      {
        label: "Meet the Commander Privately",
        labelThai: "พบนายพลเป็นการส่วนตัว",
        effects: { funds: -50, scrutiny: 3, establishmentBoost: true, pollPenalty: 1 },
        risk: "Perceived as submissive",
        narrative: "You meet discreetly. Reassurances are exchanged. Progressive voters question your spine.",
        sentiment: "neutral"
      },
      {
        label: "Publicly Affirm Democracy",
        labelThai: "ยืนยันหลักประชาธิปไตย",
        effects: { pollBoost: 2, scrutiny: 2, militaryRisk: true },
        risk: "Provoke the military",
        narrative: "Your fiery pro-democracy speech electrifies the base. But powerful people in khaki uniforms are now watching very closely.",
        sentiment: "positive"
      },
      {
        label: "Stay Silent, Change Nothing",
        labelThai: "นิ่งเฉย ไม่เปลี่ยนแปลง",
        effects: { scrutiny: -2, pollPenalty: 0.5 },
        risk: "Minor poll hit",
        narrative: "You pretend it didn't happen. The political class reads this as weakness. But no one escalates. For now.",
        sentiment: "neutral"
      }
    ]
  },

  // ═══ ECONOMIC EVENTS ═══
  {
    id: "evt_economic_crisis",
    title: "📉 Sudden Economic Downturn",
    titleThai: "วิกฤตเศรษฐกิจกะทันหัน",
    category: "economy",
    icon: "📉",
    description: "A major export market has collapsed. The Baht is falling. Unemployment claims spike. Voters demand answers from all parties.",
    rarity: "uncommon",
    minWeek: 3,
    choices: [
      {
        label: "Announce Bold Economic Plan",
        labelThai: "ประกาศแผนเศรษฐกิจกล้าหาญ",
        effects: { funds: -80, pollBoost: 2.5, scrutiny: 3 },
        risk: "Costly, scrutiny",
        narrative: "You unveil a comprehensive economic recovery plan. Economists debate it, but the public sees leadership.",
        sentiment: "positive"
      },
      {
        label: "Blame the Current Government",
        labelThai: "โทษรัฐบาลปัจจุบัน",
        effects: { pollBoost: 1, rivalPenalty: 1, scrutiny: 2 },
        risk: "Moderate",
        narrative: "You hammer the government's mismanagement. It resonates with angry voters, but you offer no alternative.",
        sentiment: "neutral"
      },
      {
        label: "Promise Free Cash Handouts",
        labelThai: "สัญญาแจกเงินสด",
        effects: { pollBoost: 3, scrutiny: 10, funds: -60 },
        risk: "Very high scrutiny",
        narrative: "Digital wallet for all! The promise is wildly popular but fiscally questionable. The EC flags it as vote-buying.",
        sentiment: "negative"
      }
    ]
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: EVENT ROLLER
// ──────────────────────────────────────────────────────────────────────────

/**
 * rollCampaignEvent() — Rolls for a random campaign event.
 * Respects rarity weights, minWeek thresholds, and cooldowns.
 *
 * @param {number} currentWeek — Current campaign week
 * @returns {Object|null} — Event object or null if nothing triggers
 */
const _eventCooldowns = {};  // { eventId: lastFiredWeek }

function rollCampaignEvent(currentWeek) {
  if (!currentWeek) return null;

  // Base trigger chance: 30% per day, scaled by difficulty
  const ds = (typeof getDiffScale === 'function') ? getDiffScale() : { lobbyChanceMult: 1 };
  const triggerChance = 30 * (ds.lobbyChanceMult || 1);

  if (Math.random() * 100 > triggerChance) return null;

  // Filter eligible events
  const eligible = CAMPAIGN_RANDOM_EVENTS.filter(evt => {
    // Min week check
    if (currentWeek < evt.minWeek) return false;
    // Cooldown: same event can't fire twice in 2 weeks
    if (_eventCooldowns[evt.id] && (currentWeek - _eventCooldowns[evt.id]) < 2) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Weight by rarity
  const weights = eligible.map(evt => {
    if (evt.rarity === 'common') return 4;
    if (evt.rarity === 'uncommon') return 2;
    if (evt.rarity === 'rare') return 1;
    return 2;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      const event = { ...eligible[i] };
      _eventCooldowns[event.id] = currentWeek;
      console.log(`[campaign/events.js] 🎲 Event triggered: "${event.title}" (week ${currentWeek})`);
      return event;
    }
  }

  return null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: EFFECT APPLICATOR
// ──────────────────────────────────────────────────────────────────────────

/**
 * applyCampaignEventChoice() — Applies the effects of a campaign event choice.
 *
 * @param {Object} choice — The chosen option from the event
 * @param {Object} event — The parent event (for logging)
 * @returns {Object} Result summary
 */
function applyCampaignEventChoice(choice, event) {
  if (!choice || !choice.effects || typeof campaignState === 'undefined') {
    return { error: "Invalid choice or missing campaign state." };
  }

  const effects = choice.effects;
  const results = {};
  const ds = (typeof getDiffScale === 'function') ? getDiffScale() : { scrutinyMult: 1 };

  // Funds
  if (effects.funds) {
    campaignState.playerFunds = Math.max(0, campaignState.playerFunds + effects.funds);
    results.funds = effects.funds;
  }

  // Scrutiny
  if (effects.scrutiny) {
    const scaledScrutiny = Math.round(effects.scrutiny * (effects.scrutiny > 0 ? ds.scrutinyMult : 1));
    campaignState.playerScrutiny = clampVal(campaignState.playerScrutiny + scaledScrutiny, 0, 100);
    results.scrutiny = scaledScrutiny;
  }

  // Poll boost
  if (effects.pollBoost) {
    const pid = campaignState.playerPartyId;
    campaignState.nationalPollShare[pid] = Math.min(50,
      (campaignState.nationalPollShare[pid] || 20) + effects.pollBoost);
    results.pollBoost = effects.pollBoost;
  }

  // Poll penalty
  if (effects.pollPenalty) {
    const pid = campaignState.playerPartyId;
    campaignState.nationalPollShare[pid] = Math.max(5,
      (campaignState.nationalPollShare[pid] || 20) - effects.pollPenalty);
    results.pollPenalty = effects.pollPenalty;
  }

  // Rival penalty
  if (effects.rivalPenalty) {
    const rivals = (typeof CAMPAIGN_PARTIES !== 'undefined')
      ? CAMPAIGN_PARTIES.filter(p => p.id !== campaignState.playerPartyId)
      : [];
    if (rivals.length > 0) {
      const target = rivals[Math.floor(Math.random() * rivals.length)];
      campaignState.nationalPollShare[target.id] = Math.max(3,
        (campaignState.nationalPollShare[target.id] || 15) - effects.rivalPenalty);
      results.rivalPenalty = { target: target.shortName, amount: effects.rivalPenalty };
    }
  }

  // Regional boost
  if (effects.localBoost && typeof DISTRICTS !== 'undefined') {
    const region = effects.localBoost;
    const dists = DISTRICTS.filter(d => d.region === region);
    const buff = 5 + Math.random() * 8;
    dists.forEach(d => { d.campaignBuffs.rally += buff; });
    results.localBoost = { region, districts: dists.length, buff: buff.toFixed(1) };
  }

  // Log to campaign
  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "random_event",
    message: `⚡ ${event.title}: ${choice.label} — ${JSON.stringify(results)}`
  });

  // Publish news if available
  if (typeof publishNews === 'function') {
    publishNews('campaign_action', {
      player: 'Your Party',
      region: event.category
    }, {
      sentiment: choice.sentiment || 'neutral',
      pollContext: event.title
    });
  }

  console.log(`[campaign/events.js] ✅ Applied: "${choice.label}"`, results);

  // STEP 73: Persist shared stats to localStorage after event effects
  if (typeof _syncStatsToStorage === 'function') _syncStatsToStorage();

  return { success: true, applied: results, narrative: choice.narrative };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: MODULE INIT
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[campaign/events.js] Random Events Engine loaded (v1.0.2).");
console.log(`  → ${CAMPAIGN_RANDOM_EVENTS.length} events in pool`);
console.log("  → rollCampaignEvent(week) ready");
console.log("  → applyCampaignEventChoice(choice, event) ready");
console.log("═══════════════════════════════════════════════════════════");
