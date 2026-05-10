// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/debate.js
// v.1.0.1 Test: "The Parliament RPG" — Live Debate Engine
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Simulates a LIVE parliamentary debate inside the Thai House of
//   Representatives. AI MPs speak in a chat-like stream. The player
//   can interrupt with protests (Point of Order / ประท้วงตามข้อบังคับ),
//   file interpellations (กระทู้ถามสด), and choose how aggressively to
//   participate in the debate.
//
// CORE MECHANICS:
//   1. DEBATE STREAM: A setInterval pushes AI dialogue at ~3s intervals
//   2. PROTEST (Point of Order): Player interrupts a speaker, RNG outcome
//   3. INTERPELLATION: Player queues questions for the Government
//   4. PLAYER SPEECH: Player chooses Aggressive / Technical / Diplomatic
//   5. VOTING: After debate, MPs vote. Outcome based on accumulated capital
//
// THAI PARLIAMENTARY PROCEDURE REFERENCE:
//   - ประธานสภา (Speaker): "ท่านสมาชิกที่เคารพ เชิญท่านผู้อภิปรายต่อไปครับ"
//   - ประท้วง (Protest): "ขอประท้วงตามข้อบังคับ ข้อที่..."
//   - คำวินิจฉัย (Ruling): "คำประท้วงฟังขึ้น" / "คำประท้วงฟังไม่ขึ้น"
//   - กระทู้ถามสด (Live Interpellation): Opposition questions the PM/Ministers
//
// DEPENDENCIES:
//   - data.js (parliamentState, applyEffects, logEvent, clampStat)
//   - timeline.js (registerTimelineCallback for session lifecycle)
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 0: LANGUAGE HELPER
// Single source of truth for debate language. Reads from localStorage.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _getDebateLang() — Returns the current language code for debate text.
 * @returns {"en"|"th"}
 * @private
 */
function _getDebateLang() {
  const lang = (localStorage.getItem('tps_language') || 'EN').toUpperCase();
  return lang === 'TH' ? 'th' : 'en';
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: DEBATE TOPICS
// Bills and motions that can be debated on the Parliament floor.
// Each topic has metadata affecting how AI MPs respond and what
// protest opportunities arise.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DEBATE_TOPICS — The legislative agenda.
 *
 * Each topic defines:
 *   id:            Unique identifier
 *   title:         English title
 *   titleThai:     Thai title (for immersive UI)
 *   category:      "budget" | "reform" | "social" | "security" | "economic"
 *   description:   What this bill/motion is about
 *   controversy:   0-100. Higher = more heated debate, more protest opportunities
 *   governmentPosition: "for" | "against" | "neutral"
 *   oppositionPosition: "for" | "against" | "neutral"
 *   publicInterest: 0-100. How much the media/public cares
 *   estimatedDuration: Number of dialogue rounds before vote
 *   relatedMinistry: Which ministry is involved (for interpellation)
 */
const DEBATE_TOPICS = [
  {
    id: "agri_subsidy_bill",
    title: "Agriculture Subsidy Reform Bill",
    titleThai: "ร่าง พ.ร.บ. ปฏิรูปเงินอุดหนุนภาคเกษตร",
    category: "economic",
    description: "Overhauls the rice pledging scheme. Government wants market-based pricing. Opposition demands guaranteed minimum prices for farmers.",
    controversy: 72,
    governmentPosition: "for",
    oppositionPosition: "against",
    publicInterest: 85,
    estimatedDuration: 12,
    relatedMinistry: "Ministry of Agriculture and Cooperatives",
    impactProfile: {
      ifPass: {
        publicPopularity: -8,
        partyLoyalty: +5,
        coalitionStability: +6,
        newsReaction: "Farmers protest as market-based pricing replaces guaranteed subsidies.",
        newsReactionThai: "เกษตรกรประท้วงหลังราคาตลาดแทนที่เงินอุดหนุน"
      },
      ifFail: {
        publicPopularity: +5,
        partyLoyalty: -4,
        coalitionStability: -8,
        newsReaction: "Villagers celebrate as government fails to cut farm subsidies.",
        newsReactionThai: "ชาวบ้านเฮ! รัฐบาลล้มเหลวตัดเงินอุดหนุนเกษตร"
      }
    }
  },
  {
    id: "police_budget_cut",
    title: "Royal Thai Police Budget Reduction",
    titleThai: "ร่าง พ.ร.บ. งบประมาณ — ตัดงบสำนักงานตำรวจแห่งชาติ",
    category: "budget",
    description: "A proposal to cut the police budget by 15% and redirect funds to education. Deeply controversial — the police lobby is powerful.",
    controversy: 88,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 78,
    estimatedDuration: 15,
    relatedMinistry: "Royal Thai Police",
    impactProfile: {
      ifPass: {
        publicPopularity: +12,
        partyLoyalty: -6,
        coalitionStability: -15,
        newsReaction: "Historic: Police budget slashed. Education funding surges. Police unions furious.",
        newsReactionThai: "ประวัติศาสตร์: ตัดงบตำรวจ เพิ่มงบการศึกษา สมาคมตำรวจโกรธจัด"
      },
      ifFail: {
        publicPopularity: -5,
        partyLoyalty: +3,
        coalitionStability: +4,
        newsReaction: "Status quo preserved. Education advocates disappointed.",
        newsReactionThai: "สภาพเดิม: นักการศึกษาผิดหวัง ตำรวจยิ้ม"
      }
    }
  },
  {
    id: "digital_economy_act",
    title: "Digital Economy & AI Governance Act",
    titleThai: "ร่าง พ.ร.บ. เศรษฐกิจดิจิทัลและการกำกับดูแล AI",
    category: "economic",
    description: "Regulates AI, data privacy, and digital platforms. Tech companies lobby hard. Civil society demands stronger protections.",
    controversy: 55,
    governmentPosition: "for",
    oppositionPosition: "neutral",
    publicInterest: 60,
    estimatedDuration: 10,
    relatedMinistry: "Ministry of Digital Economy and Society",
    impactProfile: {
      ifPass: {
        publicPopularity: +4,
        partyLoyalty: +3,
        coalitionStability: +2,
        newsReaction: "Thailand enters the AI age with new regulatory framework. Tech stocks dip.",
        newsReactionThai: "ไทยเข้าสู่ยุค AI ด้วยกรอบกฎหมายใหม่"
      },
      ifFail: {
        publicPopularity: -2,
        partyLoyalty: -2,
        coalitionStability: -3,
        newsReaction: "Digital regulation stalls. Privacy advocates alarmed.",
        newsReactionThai: "กฎหมายดิจิทัลสะดุด นักรณรงค์ความเป็นส่วนตัวกังวล"
      }
    }
  },
  {
    id: "constitutional_amendment",
    title: "Constitutional Amendment (Section 256)",
    titleThai: "ร่างแก้ไขรัฐธรรมนูญ มาตรา 256",
    category: "reform",
    description: "Attempts to lower the threshold for future constitutional amendments. The establishment sees this as an existential threat. The opposition sees it as democratic necessity.",
    controversy: 95,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 92,
    estimatedDuration: 18,
    relatedMinistry: "Office of the Prime Minister",
    impactProfile: {
      ifPass: {
        publicPopularity: +18,
        partyLoyalty: -10,
        coalitionStability: -20,
        newsReaction: "Seismic shift! Constitution unlocked for reform. Military establishment issues warning.",
        newsReactionThai: "แผ่นดินไหวทางการเมือง! ปลดล็อกรัฐธรรมนูญ ทหารส่งสัญญาณเตือน"
      },
      ifFail: {
        publicPopularity: -12,
        partyLoyalty: +5,
        coalitionStability: +8,
        newsReaction: "Reform blocked. Youth protesters take to the streets in frustration.",
        newsReactionThai: "ปฏิรูปถูกสกัด! เยาวชนลงถนนประท้วง"
      }
    }
  },
  {
    id: "eec_expansion",
    title: "Eastern Economic Corridor (EEC) Phase 2",
    titleThai: "ร่าง พ.ร.บ. เขตพัฒนาพิเศษภาคตะวันออก ระยะที่ 2",
    category: "economic",
    description: "Massive infrastructure investment in Chon Buri, Rayong, and Chachoengsao. Big business loves it. Environmentalists and locals resist land grabs.",
    controversy: 65,
    governmentPosition: "for",
    oppositionPosition: "neutral",
    publicInterest: 55,
    estimatedDuration: 11,
    relatedMinistry: "Ministry of Industry",
    impactProfile: {
      ifPass: {
        publicPopularity: -3,
        partyLoyalty: +6,
        coalitionStability: +5,
        newsReaction: "EEC Phase 2 greenlit. Investors cheer, but Eastern communities fear displacement.",
        newsReactionThai: "EEC ระยะ 2 ผ่าน! นักลงทุนเฮ แต่ชาวบ้านกลัวถูกไล่ที่"
      },
      ifFail: {
        publicPopularity: +4,
        partyLoyalty: -3,
        coalitionStability: -6,
        newsReaction: "EEC expansion blocked. Environmentalists celebrate, investors flee.",
        newsReactionThai: "EEC ขยายไม่ผ่าน! นักอนุรักษ์ยิ้ม นักลงทุนถอนตัว"
      }
    }
  },
  {
    id: "military_conscription_reform",
    title: "Military Conscription Abolition Bill",
    titleThai: "ร่าง พ.ร.บ. ยกเลิกการเกณฑ์ทหาร",
    category: "security",
    description: "A progressive bill to end mandatory conscription. The military opposes it fiercely. Young voters overwhelmingly support it.",
    controversy: 90,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 88,
    estimatedDuration: 16,
    relatedMinistry: "Ministry of Defence",
    impactProfile: {
      ifPass: {
        publicPopularity: +20,
        partyLoyalty: -8,
        coalitionStability: -18,
        newsReaction: "HISTORIC: Conscription abolished! Young Thais celebrate. Military brass silent.",
        newsReactionThai: "ประวัติศาสตร์: ยกเลิกเกณฑ์ทหาร! เยาวชนเฮ นายทหารเงียบ"
      },
      ifFail: {
        publicPopularity: -10,
        partyLoyalty: +4,
        coalitionStability: +6,
        newsReaction: "Draft survives. Young voters furious. #ยกเลิกเกณฑ์ทหาร trends nationwide.",
        newsReactionThai: "เกณฑ์ทหารยังอยู่! เยาวชนโกรธ #ยกเลิกเกณฑ์ทหาร ติดเทรนด์"
      }
    }
  },
  {
    id: "universal_healthcare_upgrade",
    title: "Universal Healthcare Enhancement Act",
    titleThai: "ร่าง พ.ร.บ. ยกระดับหลักประกันสุขภาพถ้วนหน้า",
    category: "social",
    description: "Expands the 30-baht healthcare scheme to cover more treatments. Popular with the public but expensive for the treasury.",
    controversy: 45,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 75,
    estimatedDuration: 9,
    relatedMinistry: "Ministry of Public Health",
    impactProfile: {
      ifPass: {
        publicPopularity: +15,
        partyLoyalty: +4,
        coalitionStability: -3,
        newsReaction: "Villagers celebrate the new Welfare Bill. Healthcare coverage expanded nationwide.",
        newsReactionThai: "ชาวบ้านเฮ! ขยายหลักประกันสุขภาพทั่วประเทศ"
      },
      ifFail: {
        publicPopularity: -8,
        partyLoyalty: -2,
        coalitionStability: +2,
        newsReaction: "Healthcare expansion blocked. Rural communities feel abandoned.",
        newsReactionThai: "ขยายสุขภาพถ้วนหน้าไม่ผ่าน! ชาวชนบทรู้สึกถูกทอดทิ้ง"
      }
    }
  },
  {
    id: "decentralization_bill",
    title: "Provincial Decentralization Bill",
    titleThai: "ร่าง พ.ร.บ. กระจายอำนาจสู่ท้องถิ่น",
    category: "reform",
    description: "Transfers more budget and authority to provincial governments. Bangkok bureaucrats resist. Provincial politicians celebrate.",
    controversy: 70,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 50,
    estimatedDuration: 10,
    relatedMinistry: "Ministry of Interior",
    impactProfile: {
      ifPass: {
        publicPopularity: +6,
        partyLoyalty: -4,
        coalitionStability: -7,
        newsReaction: "Power shifts to provinces. Bangkok bureaucrats scramble as budgets are redirected.",
        newsReactionThai: "อำนาจกระจายสู่ท้องถิ่น! ข้าราชการกรุงเทพฯ ตื่นตัว"
      },
      ifFail: {
        publicPopularity: -4,
        partyLoyalty: +2,
        coalitionStability: +3,
        newsReaction: "Centralization holds. Provinces remain dependent on Bangkok.",
        newsReactionThai: "รวมศูนย์อำนาจยังอยู่ ท้องถิ่นยังต้องพึ่งกรุงเทพฯ"
      }
    }
  },
  {
    id: "cannabis_regulation",
    title: "Cannabis Regulation & Control Act",
    titleThai: "ร่าง พ.ร.บ. ควบคุมกัญชา",
    category: "social",
    description: "After the controversial legalization, this bill adds stricter controls on recreational use while protecting medical access.",
    controversy: 78,
    governmentPosition: "for",
    oppositionPosition: "against",
    publicInterest: 82,
    estimatedDuration: 13,
    relatedMinistry: "Ministry of Public Health",
    impactProfile: {
      ifPass: {
        publicPopularity: +5,
        partyLoyalty: +4,
        coalitionStability: +3,
        newsReaction: "Cannabis controls tightened. Medical users relieved, recreational users frustrated.",
        newsReactionThai: "คุมเข้มกัญชา! ผู้ป่วยสบายใจ ผู้ใช้เพื่อพักผ่อนโวย"
      },
      ifFail: {
        publicPopularity: -6,
        partyLoyalty: -3,
        coalitionStability: -5,
        newsReaction: "Cannabis chaos continues. Hospitals report surge in youth usage.",
        newsReactionThai: "กัญชาวุ่นวายต่อ! โรงพยาบาลรายงานเยาวชนใช้เพิ่มขึ้น"
      }
    }
  },
  {
    id: "wealth_tax_bill",
    title: "Progressive Wealth Tax Bill",
    titleThai: "ร่าง พ.ร.บ. ภาษีทรัพย์สินอัตราก้าวหน้า",
    category: "economic",
    description: "A 1-3% annual tax on net wealth above ฿100M. Tycoons threaten capital flight. Progressives call it long overdue.",
    controversy: 92,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 70,
    estimatedDuration: 14,
    relatedMinistry: "Ministry of Finance",
    impactProfile: {
      ifPass: {
        publicPopularity: +15,
        partyLoyalty: -12,
        coalitionStability: -14,
        newsReaction: "Investors flee as Tax Bill passes. Progressives celebrate 'historic justice'.",
        newsReactionThai: "นักลงทุนหนี! ภาษีทรัพย์สินผ่าน ฝ่ายก้าวหน้าเฮ 'ความเป็นธรรมทางประวัติศาสตร์'"
      },
      ifFail: {
        publicPopularity: -8,
        partyLoyalty: +6,
        coalitionStability: +5,
        newsReaction: "Wealth tax blocked. Tycoons breathe easy. Progressives vow to try again.",
        newsReactionThai: "ภาษีทรัพย์สินถูกสกัด! เศรษฐีสบายใจ ฝ่ายก้าวหน้าสัญญาจะกลับมา"
      }
    }
  },

  // ═══ v1.0.2 — EXPANDED TOPICS (Step 10) ═══════════════════════════════

  {
    id: "amnesty_bill",
    title: "Political Amnesty Bill",
    titleThai: "ร่าง พ.ร.บ. นิรโทษกรรมทางการเมือง",
    category: "reform",
    description: "Grants blanket amnesty for all political offenses since 2014. Deeply divisive — supporters call it national reconciliation, opponents call it a blank check for criminals.",
    controversy: 98,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 95,
    estimatedDuration: 20,
    relatedMinistry: "Ministry of Justice",
    impactProfile: {
      ifPass: {
        publicPopularity: +10,
        partyLoyalty: -15,
        coalitionStability: -25,
        newsReaction: "BOMBSHELL: Amnesty Bill passes. Exiles can return home. Establishment in shock.",
        newsReactionThai: "ระเบิดการเมือง! นิรโทษกรรมผ่าน ผู้ลี้ภัยกลับบ้านได้ ฝ่ายอนุรักษ์ตกตะลึง"
      },
      ifFail: {
        publicPopularity: -8,
        partyLoyalty: +6,
        coalitionStability: +5,
        newsReaction: "Amnesty blocked. Political prisoners remain behind bars. Youth groups stage vigil.",
        newsReactionThai: "นิรโทษกรรมถูกสกัด นักโทษการเมืองยังอยู่ในคุก เยาวชนจุดเทียนรำลึก"
      }
    }
  },
  {
    id: "casino_legalization",
    title: "Entertainment Complex (Casino) Legalization Act",
    titleThai: "ร่าง พ.ร.บ. สถานบันเทิงครบวงจร (กาสิโน)",
    category: "economic",
    description: "Legalizes integrated resort-casinos in 3 designated zones. Projected ฿200B annual revenue. Religious groups and anti-gambling activists fiercely oppose.",
    controversy: 82,
    governmentPosition: "for",
    oppositionPosition: "neutral",
    publicInterest: 88,
    estimatedDuration: 14,
    relatedMinistry: "Ministry of Finance",
    impactProfile: {
      ifPass: {
        publicPopularity: -5,
        partyLoyalty: +8,
        coalitionStability: +4,
        newsReaction: "Casino era begins! Tourism stocks surge. Buddhist groups condemn 'moral decay'.",
        newsReactionThai: "ยุคกาสิโนเริ่มต้น! หุ้นท่องเที่ยวพุ่ง กลุ่มพุทธประณาม 'ศีลธรรมเสื่อม'"
      },
      ifFail: {
        publicPopularity: +3,
        partyLoyalty: -4,
        coalitionStability: -3,
        newsReaction: "Casino dream dies. Underground gambling rings rejoice as legal alternative blocked.",
        newsReactionThai: "ฝันกาสิโนสลาย บ่อนใต้ดินยิ้ม ทางเลือกถูกกฎหมายถูกปิดกั้น"
      }
    }
  },
  {
    id: "marriage_equality",
    title: "Marriage Equality Act",
    titleThai: "ร่าง พ.ร.บ. สมรสเท่าเทียม",
    category: "social",
    description: "Grants same-sex couples equal legal rights to marriage, adoption, and inheritance. Thailand would be the first in ASEAN. Conservative groups mobilize.",
    controversy: 75,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 90,
    estimatedDuration: 12,
    relatedMinistry: "Ministry of Social Development",
    impactProfile: {
      ifPass: {
        publicPopularity: +14,
        partyLoyalty: -6,
        coalitionStability: -8,
        newsReaction: "HISTORIC: Thailand becomes first ASEAN nation with marriage equality! Global praise floods in.",
        newsReactionThai: "ประวัติศาสตร์! ไทยเป็นชาติแรกในอาเซียนที่มีสมรสเท่าเทียม โลกชื่นชม"
      },
      ifFail: {
        publicPopularity: -10,
        partyLoyalty: +3,
        coalitionStability: +4,
        newsReaction: "Marriage equality blocked. LGBTQ+ community devastated. International criticism mounts.",
        newsReactionThai: "สมรสเท่าเทียมถูกคว่ำ! ชุมชน LGBTQ+ เศร้า นานาชาติวิจารณ์"
      }
    }
  },
  {
    id: "land_reform_act",
    title: "Agricultural Land Reform & Redistribution Act",
    titleThai: "ร่าง พ.ร.บ. ปฏิรูปที่ดินเพื่อการเกษตร",
    category: "reform",
    description: "Caps individual land ownership at 50 rai. Excess land redistributed to landless farmers. Wealthy landowners threaten legal challenges.",
    controversy: 88,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 72,
    estimatedDuration: 16,
    relatedMinistry: "Ministry of Agriculture and Cooperatives",
    impactProfile: {
      ifPass: {
        publicPopularity: +16,
        partyLoyalty: -12,
        coalitionStability: -18,
        newsReaction: "Land revolution! Tycoons lose holdings. Farmers celebrate in the fields.",
        newsReactionThai: "ปฏิวัติที่ดิน! เศรษฐีเสียที่ เกษตรกรเฮในท้องนา"
      },
      ifFail: {
        publicPopularity: -6,
        partyLoyalty: +5,
        coalitionStability: +4,
        newsReaction: "Land reform blocked. Rural activists vow continued fight. Status quo preserved.",
        newsReactionThai: "ปฏิรูปที่ดินถูกสกัด! นักเคลื่อนไหวชนบทสัญญาจะสู้ต่อ"
      }
    }
  },
  {
    id: "anti_corruption_court",
    title: "Independent Anti-Corruption Court Establishment Act",
    titleThai: "ร่าง พ.ร.บ. จัดตั้งศาลพิเศษปราบทุจริต",
    category: "reform",
    description: "Creates a fast-track court exclusively for corruption cases. Politicians from ALL parties are terrified. The public overwhelmingly supports it.",
    controversy: 68,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 80,
    estimatedDuration: 11,
    relatedMinistry: "Office of the Judiciary",
    impactProfile: {
      ifPass: {
        publicPopularity: +18,
        partyLoyalty: -8,
        coalitionStability: -10,
        newsReaction: "Anti-corruption court established! Politicians scramble to clean their books.",
        newsReactionThai: "ตั้งศาลปราบทุจริตสำเร็จ! นักการเมืองรีบทำความสะอาดบัญชี"
      },
      ifFail: {
        publicPopularity: -12,
        partyLoyalty: +4,
        coalitionStability: +6,
        newsReaction: "Anti-corruption court killed. Public outrage at 'foxes guarding the henhouse'.",
        newsReactionThai: "ศาลปราบทุจริตถูกคว่ำ! ประชาชนโกรธ 'หมาป่าเฝ้าเล้าไก่'"
      }
    }
  },
  {
    id: "censorship_bill",
    title: "National Cybersecurity & Content Control Bill",
    titleThai: "ร่าง พ.ร.บ. ความมั่นคงปลอดภัยไซเบอร์และการควบคุมเนื้อหา",
    category: "security",
    description: "Grants government power to block websites, monitor social media, and arrest users for 'disinformation'. Tech companies and civil liberty groups strongly oppose.",
    controversy: 85,
    governmentPosition: "for",
    oppositionPosition: "against",
    publicInterest: 76,
    estimatedDuration: 13,
    relatedMinistry: "Ministry of Digital Economy and Society",
    impactProfile: {
      ifPass: {
        publicPopularity: -14,
        partyLoyalty: +7,
        coalitionStability: +5,
        newsReaction: "Internet crackdown! VPN usage skyrockets. International press condemns 'digital authoritarianism'.",
        newsReactionThai: "ปิดกั้นอินเทอร์เน็ต! การใช้ VPN พุ่ง สื่อนานาชาติประณาม 'เผด็จการดิจิทัล'"
      },
      ifFail: {
        publicPopularity: +8,
        partyLoyalty: -5,
        coalitionStability: -6,
        newsReaction: "Censorship bill defeated! Internet freedom advocates celebrate. Government embarrassed.",
        newsReactionThai: "กฎหมายเซ็นเซอร์ถูกคว่ำ! นักรณรงค์เสรีภาพเฮ รัฐบาลเสียหน้า"
      }
    }
  },
  {
    id: "minimum_wage_hike",
    title: "Minimum Wage Increase to ฿600/Day",
    titleThai: "ร่าง พ.ร.บ. ปรับค่าแรงขั้นต่ำ 600 บาท/วัน",
    category: "economic",
    description: "Nearly doubles the current minimum wage. Workers celebrate. The Federation of Thai Industries warns of mass layoffs and factory relocations to Vietnam.",
    controversy: 80,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 92,
    estimatedDuration: 12,
    relatedMinistry: "Ministry of Labour",
    impactProfile: {
      ifPass: {
        publicPopularity: +20,
        partyLoyalty: -6,
        coalitionStability: -10,
        newsReaction: "Workers rejoice! ฿600 minimum wage passes. Factory owners threaten exodus to neighbors.",
        newsReactionThai: "แรงงานเฮ! ค่าแรง 600 บาทผ่าน เจ้าของโรงงานขู่ย้ายฐาน"
      },
      ifFail: {
        publicPopularity: -10,
        partyLoyalty: +5,
        coalitionStability: +4,
        newsReaction: "Wage increase blocked. Labor unions threaten general strike. Social media erupts.",
        newsReactionThai: "ขึ้นค่าแรงไม่ผ่าน! สหภาพแรงงานขู่นัดหยุดงาน โซเชียลลุกเป็นไฟ"
      }
    }
  },
  {
    id: "senator_election",
    title: "Senate Reform: Direct Election of Senators",
    titleThai: "ร่างแก้ไขรัฐธรรมนูญ: เลือกตั้ง ส.ว. โดยตรง",
    category: "reform",
    description: "Replaces the appointed Senate with a directly elected one. The military-backed Senate fiercely resists. Reformists see this as the key to democracy.",
    controversy: 94,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 85,
    estimatedDuration: 18,
    relatedMinistry: "Office of the Senate",
    impactProfile: {
      ifPass: {
        publicPopularity: +22,
        partyLoyalty: -10,
        coalitionStability: -22,
        newsReaction: "DEMOCRATIC REVOLUTION: Senate elections mandated! Military establishment in crisis mode.",
        newsReactionThai: "ปฏิวัติประชาธิปไตย! บังคับเลือกตั้ง ส.ว. กองทัพเข้าโหมดวิกฤต"
      },
      ifFail: {
        publicPopularity: -14,
        partyLoyalty: +5,
        coalitionStability: +8,
        newsReaction: "Senate reform dies. Appointed senators cheer. Youth protesters blocked at Parliament gates.",
        newsReactionThai: "ปฏิรูปวุฒิสภาตาย! ส.ว. แต่งตั้งเฮ เยาวชนถูกกันหน้ารัฐสภา"
      }
    }
  },
  {
    id: "pollution_emergency",
    title: "PM2.5 Emergency Response & Clean Air Act",
    titleThai: "ร่าง พ.ร.บ. ฉุกเฉินฝุ่น PM2.5 และอากาศสะอาด",
    category: "social",
    description: "Bans crop burning, mandates factory emissions controls, and subsidizes electric vehicles. Northern Thailand chokes annually. Farmers say burning is their only option.",
    controversy: 60,
    governmentPosition: "for",
    oppositionPosition: "neutral",
    publicInterest: 78,
    estimatedDuration: 10,
    relatedMinistry: "Ministry of Natural Resources and Environment",
    impactProfile: {
      ifPass: {
        publicPopularity: +10,
        partyLoyalty: +2,
        coalitionStability: -4,
        newsReaction: "Clean Air Act passes! Northern Thailand breathes easier. Farmers protest burning ban.",
        newsReactionThai: "กฎหมายอากาศสะอาดผ่าน! ภาคเหนือหายใจสะดวก เกษตรกรประท้วงห้ามเผา"
      },
      ifFail: {
        publicPopularity: -6,
        partyLoyalty: -2,
        coalitionStability: +2,
        newsReaction: "Clean Air Act blocked. PM2.5 expected to hit record levels again. Hospitals brace.",
        newsReactionThai: "กฎหมายอากาศสะอาดไม่ผ่าน! PM2.5 จ่อสูงสุดเป็นประวัติการณ์ โรงพยาบาลเตรียมรับมือ"
      }
    }
  },
  {
    id: "military_budget_cut",
    title: "Military Budget Reduction & Transparency Act",
    titleThai: "ร่าง พ.ร.บ. ลดงบทหารและความโปร่งใส",
    category: "budget",
    description: "Cuts military spending by 25% and mandates full disclosure of defense procurement. Redirects savings to education and healthcare. Generals are furious.",
    controversy: 96,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 82,
    estimatedDuration: 17,
    relatedMinistry: "Ministry of Defence",
    impactProfile: {
      ifPass: {
        publicPopularity: +16,
        partyLoyalty: -14,
        coalitionStability: -20,
        newsReaction: "EXPLOSIVE: Military budget slashed 25%! Generals 'reviewing all options'. Coup watch activated.",
        newsReactionThai: "ระเบิด! ตัดงบทหาร 25% นายพล 'ทบทวนทุกทางเลือก' เฝ้าระวังรัฐประหาร"
      },
      ifFail: {
        publicPopularity: -8,
        partyLoyalty: +6,
        coalitionStability: +8,
        newsReaction: "Military budget untouched. Reformists cry foul. Defense contractors celebrate.",
        newsReactionThai: "งบทหารไม่ถูกแตะ! นักปฏิรูปโวย ผู้รับเหมากลาโหมเฮ"
      }
    }
  },

  // ═══ v1.0.2 — STEP 51 EXPANDED TOPICS ═════════════════════════════════

  {
    id: "telecom_monopoly_breakup",
    title: "Telecom Monopoly Breakup Act",
    titleThai: "ร่าง พ.ร.บ. แตกกิจการผูกขาดโทรคมนาคม",
    category: "economic",
    description: "Forces the 3 dominant telecom conglomerates to divest their infrastructure arms. Consumers cheer cheaper data; oligarchs threaten mass layoffs.",
    controversy: 80,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 75,
    estimatedDuration: 13,
    relatedMinistry: "National Broadcasting and Telecommunications Commission",
    impactProfile: {
      ifPass: {
        publicPopularity: +14,
        partyLoyalty: -10,
        coalitionStability: -12,
        newsReaction: "Telecom giants shattered! Data prices expected to drop 40%. Tycoons vow legal fight.",
        newsReactionThai: "แตกยักษ์โทรคมนาคม! ค่าเน็ตคาดลด 40% เจ้าสัวขู่ฟ้อง"
      },
      ifFail: {
        publicPopularity: -6,
        partyLoyalty: +5,
        coalitionStability: +4,
        newsReaction: "Monopoly holds. Thai consumers continue paying highest data prices in ASEAN.",
        newsReactionThai: "ผูกขาดยังอยู่! คนไทยจ่ายค่าเน็ตแพงสุดในอาเซียนต่อไป"
      }
    }
  },
  {
    id: "welfare_state_bill",
    title: "Comprehensive Welfare State Bill",
    titleThai: "ร่าง พ.ร.บ. รัฐสวัสดิการครบวงจร",
    category: "social",
    description: "Universal basic income of ฿3,000/month for all citizens over 18. Funded by a 3% corporate surtax. Business chambers warn of economic collapse.",
    controversy: 93,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 95,
    estimatedDuration: 18,
    relatedMinistry: "Ministry of Finance",
    impactProfile: {
      ifPass: {
        publicPopularity: +22,
        partyLoyalty: -15,
        coalitionStability: -22,
        newsReaction: "REVOLUTION: Thailand adopts universal basic income! Stock market crashes 8%. Villagers celebrate.",
        newsReactionThai: "ปฏิวัติ! ไทยรับ UBI! ตลาดหุ้นร่วง 8% ชาวบ้านเฮ"
      },
      ifFail: {
        publicPopularity: -15,
        partyLoyalty: +8,
        coalitionStability: +6,
        newsReaction: "Welfare dream crushed. Inequality protests erupt in 42 provinces.",
        newsReactionThai: "ฝันสวัสดิการสลาย! ม็อบความเหลื่อมล้ำปะทุ 42 จังหวัด"
      }
    }
  },
  {
    id: "emergency_decree_repeal",
    title: "Emergency Decree Repeal Motion",
    titleThai: "ญัตติยกเลิก พ.ร.ก. ฉุกเฉิน",
    category: "security",
    description: "Motion to repeal the government's use of emergency powers for 'maintaining order.' Human rights groups demand it. Security hawks say it's necessary.",
    controversy: 85,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 80,
    estimatedDuration: 14,
    relatedMinistry: "National Security Council",
    impactProfile: {
      ifPass: {
        publicPopularity: +16,
        partyLoyalty: -8,
        coalitionStability: -15,
        newsReaction: "Emergency powers revoked! Civil liberties restored. Security agencies warn of 'power vacuum'.",
        newsReactionThai: "ยกเลิก พ.ร.ก. ฉุกเฉิน! คืนเสรีภาพ หน่วยงานความมั่นคงเตือน 'สุญญากาศอำนาจ'"
      },
      ifFail: {
        publicPopularity: -10,
        partyLoyalty: +5,
        coalitionStability: +6,
        newsReaction: "Emergency decree stands. Protesters arrested under sweeping powers. International condemnation.",
        newsReactionThai: "พ.ร.ก.ฉุกเฉิน ยังอยู่! ผู้ประท้วงถูกจับ นานาชาติประณาม"
      }
    }
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: AI MP SPEAKER POOL
// The MPs who "speak" during debates. Each has personality traits
// that affect their rhetorical style, alignment, and protest vulnerability.
// ──────────────────────────────────────────────────────────────────────────

/**
 * AI_SPEAKERS — Pool of AI MPs who participate in debates.
 *
 * alignment:      "government" | "opposition"
 * party:          Fictionalized Thai party name
 * style:          "aggressive" | "technical" | "populist" | "legalistic" | "emotional"
 * speakingSkill:  0-100. Higher = harder to sustain protests against them
 * protestVulnerability: 0-100. Higher = more likely to say something protestable
 * thaiTitle:      Thai honorific used in the transcript
 */
const AI_SPEAKERS = [
  // ── Government Side ──
  {
    id: "gov_somchai",
    name: "Somchai Rattanaporn",
    thaiTitle: "ท่านสมชาย รัตนพร",
    party: "Palang Ratthaniyom",
    partyShort: "PRP",
    alignment: "government",
    role: "Deputy Prime Minister",
    style: "technical",
    speakingSkill: 75,
    protestVulnerability: 25,
    color: "#1D3557",
    avatar: "🧑‍💼"
  },
  {
    id: "gov_kritsada",
    name: "General Kritsada Buranasiri",
    thaiTitle: "พลเอก กฤษดา บูรณศิริ",
    party: "Palang Ratthaniyom",
    partyShort: "PRP",
    alignment: "government",
    role: "Prime Minister",
    style: "aggressive",
    speakingSkill: 60,
    protestVulnerability: 45,
    color: "#1D3557",
    avatar: "🎖️"
  },
  {
    id: "gov_anutin",
    name: "Anutin Charoensri",
    thaiTitle: "ท่านอนุทิน เจริญศรี",
    party: "Setthakij Thai",
    partyShort: "STK",
    alignment: "government",
    role: "Deputy PM / Health Minister",
    style: "populist",
    speakingSkill: 55,
    protestVulnerability: 50,
    color: "#2A9D8F",
    avatar: "💊"
  },
  {
    id: "gov_wiroj",
    name: "Wiroj Phanphruk",
    thaiTitle: "ท่านวิโรจน์ พันธ์ผรุก",
    party: "Pak Tai Ruamjai",
    partyShort: "PTR",
    alignment: "government",
    role: "Minister of Interior",
    style: "legalistic",
    speakingSkill: 70,
    protestVulnerability: 20,
    color: "#457B9D",
    avatar: "📜"
  },
  {
    id: "gov_nattapong",
    name: "Nattapong Siriwattana",
    thaiTitle: "ท่านณัฐพงศ์ ศิริวัฒนา",
    party: "Palang Ratthaniyom",
    partyShort: "PRP",
    alignment: "government",
    role: "Government Whip",
    style: "aggressive",
    speakingSkill: 65,
    protestVulnerability: 55,
    color: "#1D3557",
    avatar: "🔱"
  },

  // ── Opposition Side ──
  {
    id: "opp_thanawat",
    name: "Thanawat Siripong",
    thaiTitle: "ท่านธนวัฒน์ ศิริพงษ์",
    party: "Khana Pracharat",
    partyShort: "KPR",
    alignment: "opposition",
    role: "Opposition Leader",
    style: "aggressive",
    speakingSkill: 82,
    protestVulnerability: 30,
    color: "#FF6B2B",
    avatar: "🔥"
  },
  {
    id: "opp_siriporn",
    name: "Siriporn Wongsuwan",
    thaiTitle: "ท่านศิริพร วงศ์สุวรรณ",
    party: "Pracha Niyom",
    partyShort: "PNP",
    alignment: "opposition",
    role: "Shadow Finance Minister",
    style: "populist",
    speakingSkill: 78,
    protestVulnerability: 35,
    color: "#E63946",
    avatar: "💰"
  },
  {
    id: "opp_preecha",
    name: "Preecha Thammasat",
    thaiTitle: "ท่านปรีชา ธรรมศาสตร์",
    party: "Khana Pracharat",
    partyShort: "KPR",
    alignment: "opposition",
    role: "Constitutional Law Expert",
    style: "technical",
    speakingSkill: 90,
    protestVulnerability: 15,
    color: "#FF6B2B",
    avatar: "⚖️"
  },
  {
    id: "opp_kannika",
    name: "Kannika Maneekhao",
    thaiTitle: "ท่านกรรณิกา มณีขาว",
    party: "Pracha Niyom",
    partyShort: "PNP",
    alignment: "opposition",
    role: "Social Issues Spokesperson",
    style: "emotional",
    speakingSkill: 72,
    protestVulnerability: 40,
    color: "#E63946",
    avatar: "✊"
  },
  {
    id: "opp_rangsan",
    name: "Rangsan Intaraprasit",
    thaiTitle: "ท่านรังสรรค์ อินทรประสิทธิ์",
    party: "Khana Pracharat",
    partyShort: "KPR",
    alignment: "opposition",
    role: "Opposition Whip",
    style: "legalistic",
    speakingSkill: 68,
    protestVulnerability: 30,
    color: "#FF6B2B",
    avatar: "📋"
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: DIALOGUE TEMPLATES
// Pre-written argumentative dialogue lines organized by style and stance.
// These are combined dynamically to create realistic debate streams.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DIALOGUE_TEMPLATES — Lines spoken by AI MPs during debates.
 *
 * Organized by: alignment → style → stance (for/against/neutral)
 * Each entry is a template string with {topic} and {ministry} placeholders.
 *
 * Some lines are PROTESTABLE — they contain insults, lies, or off-topic content.
 * These are flagged with _protestable: true for the protest detection system.
 */
const DIALOGUE_TEMPLATES = {
  government: {
    technical: {
      for: {
        en: [
          { text: "If we examine the fiscal year projections, this bill will save the government ฿45 billion over five years. The opposition offers no alternative.", protestable: false },
          { text: "International best practices from Singapore and South Korea confirm our approach to {topic} is sound and evidence-based.", protestable: false },
          { text: "The committee spent 47 sessions reviewing this bill. Every clause has been vetted by legal experts. I urge the House to pass it.", protestable: false },
          { text: "The data clearly supports this {topic}. Our ministry's analysis shows a 23% improvement in efficiency.", protestable: false }
        ],
        th: [
          { text: "ท่านประธานที่เคารพ, หากพิจารณาประมาณการรายจ่ายประจำปี ร่างกฎหมายนี้จะช่วยรัฐบาลประหยัดได้ ฿45,000 ล้าน ใน 5 ปี ฝ่ายค้านไม่มีทางเลือกอื่น", protestable: false },
          { text: "แนวปฏิบัติสากลจากสิงคโปร์และเกาหลีใต้ยืนยันว่าแนวทางของเราในเรื่อง {topic} มีหลักฐานรองรับ", protestable: false },
          { text: "คณะกรรมาธิการใช้เวลา 47 ครั้งในการพิจารณาร่างกฎหมายนี้ ทุกมาตราผ่านการตรวจสอบจากผู้เชี่ยวชาญกฎหมาย ขอให้สภาผ่านร่างนี้", protestable: false },
          { text: "ข้อมูลสนับสนุน {topic} อย่างชัดเจน จากการวิเคราะห์ของกระทรวงเราพบว่าประสิทธิภาพดีขึ้น 23%", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "While I respect the intent behind this {topic}, the implementation timeline is unrealistic. We need at least 18 more months of study.", protestable: false },
          { text: "The treasury cannot absorb this cost. Our debt-to-GDP ratio is already at 62%. This bill would push us to 68%.", protestable: false }
        ],
        th: [
          { text: "แม้จะเคารพเจตนาของ {topic} แต่กรอบเวลาไม่สมจริง เราต้องการเวลาศึกษาอีกอย่างน้อย 18 เดือน", protestable: false },
          { text: "กระทรวงการคลังไม่สามารถรับภาระนี้ได้ อัตราหนี้ต่อ GDP อยู่ที่ 62% แล้ว ร่างนี้จะดันขึ้นไป 68%", protestable: false }
        ]
      }
    },
    aggressive: {
      for: {
        en: [
          { text: "The opposition has NOTHING to offer! They criticize our {topic} but where is THEIR plan? Where were THEY for 8 years?!", protestable: true, protestReason: "off_topic" },
          { text: "Anyone who votes against this bill is voting against the Thai people. It's that simple.", protestable: true, protestReason: "misleading" },
          { text: "We have a mandate from 14 million voters. This {topic} IS the will of the people!", protestable: false },
          { text: "The opposition member who just spoke clearly doesn't understand basic economics. Perhaps they should go back to school.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "ฝ่ายค้านไม่มีข้อเสนออะไรเลย! วิจารณ์ {topic} ของเรา แต่แผนของพวกท่านอยู่ไหน? 8 ปีที่ผ่านมาพวกท่านไปอยู่ที่ไหน?!", protestable: true, protestReason: "off_topic" },
          { text: "ใครที่โหวตคัดค้านร่างนี้ ก็คือโหวตคัดค้านประชาชน เรียบง่ายแค่นั้น", protestable: true, protestReason: "misleading" },
          { text: "เรามีฉันทามติจากประชาชน 14 ล้านคน {topic} นี้คือเจตจำนงของประชาชน!", protestable: false },
          { text: "สมาชิกฝ่ายค้านที่เพิ่งอภิปรายไป เห็นชัดว่าไม่เข้าใจเศรษฐศาสตร์พื้นฐาน บางทีควรกลับไปเรียนใหม่", protestable: true, protestReason: "slander" }
        ]
      },
      against: {
        en: [
          { text: "This so-called reform is nothing but a Trojan horse to destabilize the institutions that protect our nation!", protestable: true, protestReason: "misleading" },
          { text: "The honorable member is living in a fantasy world if they think this {topic} will work.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "การปฏิรูปที่เรียกกันนี้ ไม่ใช่อะไรเลยนอกจากม้าโทรจันที่จะทำลายสถาบันที่ปกป้องประเทศ!", protestable: true, protestReason: "misleading" },
          { text: "ท่านสมาชิกผู้ทรงเกียรติอยู่ในโลกแฟนตาซี ถ้าคิดว่า {topic} นี้จะประสบความสำเร็จ", protestable: true, protestReason: "slander" }
        ]
      }
    },
    populist: {
      for: {
        en: [
          { text: "I've walked through the rice fields of Isan. The farmers are BEGGING us to pass this {topic}.", protestable: false },
          { text: "Every baht we invest in this program returns ฿3 to the rural economy. This isn't spending — it's investing in our people.", protestable: false },
          { text: "My phone has 500 LINE messages from constituents who support this bill. The people have spoken!", protestable: false }
        ],
        th: [
          { text: "ท่านประธาน, ผมเดินผ่านท้องนาอีสาน ชาวนาร้องขอให้เราผ่าน {topic} นี้", protestable: false },
          { text: "ทุกบาทที่ลงทุนในโครงการนี้ จะคืนกลับมา ฿3 สู่เศรษฐกิจชนบท นี่ไม่ใช่ค่าใช้จ่าย — นี่คือการลงทุนในประชาชน", protestable: false },
          { text: "มือถือผมมีข้อความ LINE 500 ข้อความจากประชาชนในเขตที่สนับสนุนร่างนี้ ประชาชนได้พูดแล้ว!", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "The people in my constituency told me: 'Don't let Bangkok elites destroy our way of life.' I will honor their voices.", protestable: false }
        ],
        th: [
          { text: "ประชาชนในเขตของผมบอกว่า 'อย่าปล่อยให้คนกรุงเทพฯ ทำลายวิถีชีวิตของเรา' ผมจะเคารพเสียงของพวกเขา", protestable: false }
        ]
      }
    },
    legalistic: {
      for: {
        en: [
          { text: "Section 77 of the Constitution mandates that the State shall... and I quote... 'organize an efficient system of public administration.' This {topic} fulfills that mandate.", protestable: false },
          { text: "The Bill is consistent with Articles 152 through 157 of the Constitution. I have submitted a 40-page legal opinion to the Chair.", protestable: false }
        ],
        th: [
          { text: "มาตรา 77 ของรัฐธรรมนูญบัญญัติว่ารัฐต้อง... และผมขออ้าง... 'จัดระบบบริหารราชการอย่างมีประสิทธิภาพ' {topic} นี้เป็นไปตามบทบัญญัตินั้น", protestable: false },
          { text: "ร่างกฎหมายนี้สอดคล้องกับมาตรา 152 ถึง 157 ของรัฐธรรมนูญ ผมได้ส่งความเห็นทางกฎหมาย 40 หน้าถึงท่านประธานแล้ว", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "This bill may violate Section 256 of the Constitution. I request the Constitutional Court's advisory opinion before proceeding.", protestable: false }
        ],
        th: [
          { text: "ท่านประธาน, ร่างกฎหมายนี้อาจขัดมาตรา 256 ของรัฐธรรมนูญ ขอให้ส่งศาลรัฐธรรมนูญวินิจฉัยก่อนดำเนินการต่อ", protestable: false }
        ]
      }
    }
  },

  opposition: {
    technical: {
      for: {
        en: [
          { text: "Our research team has independently verified: this {topic} will benefit 12 million households. We support the principle but demand amendments.", protestable: false },
          { text: "The opposition caucus proposes 3 critical amendments to strengthen accountability mechanisms in this bill.", protestable: false }
        ],
        th: [
          { text: "ทีมวิจัยของเราตรวจสอบอิสระแล้ว: {topic} นี้จะเป็นประโยชน์ต่อ 12 ล้านครัวเรือน เราสนับสนุนหลักการแต่ต้องมีการแก้ไข", protestable: false },
          { text: "มติพรรคฝ่ายค้านเสนอ 3 ข้อแก้ไขที่สำคัญ เพื่อเสริมกลไกการตรวจสอบในร่างกฎหมายนี้", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "The government's own impact assessment contains 14 methodological errors. I have documented each one.", protestable: false },
          { text: "If we adjust for inflation and population growth, this {topic} actually REDUCES per-capita spending on public services by 8%.", protestable: false },
          { text: "The ministry's cost-benefit analysis conveniently omits environmental externalities worth ฿120 billion. This is intellectual dishonesty.", protestable: true, protestReason: "misleading" }
        ],
        th: [
          { text: "ท่านประธาน, รายงานผลกระทบของรัฐบาลเองมีข้อผิดพลาดเชิงระเบียบวิธี 14 จุด ผมได้บันทึกไว้ทุกจุด", protestable: false },
          { text: "หากปรับตามเงินเฟ้อและการเติบโตของประชากร {topic} นี้จะลดรายจ่ายต่อหัวด้านบริการสาธารณะลง 8%", protestable: false },
          { text: "การวิเคราะห์ต้นทุน-ผลตอบแทนของกระทรวงละเว้นปัจจัยภายนอกด้านสิ่งแวดล้อมมูลค่า ฿120,000 ล้าน นี่คือความไม่ซื่อสัตย์ทางปัญญา", protestable: true, protestReason: "misleading" }
        ]
      }
    },
    aggressive: {
      for: {
        en: [
          { text: "Even a broken clock is right twice a day. This government finally has ONE decent idea with this {topic}.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "นาฬิกาเสียก็ยังตรงวันละสองครั้ง ในที่สุดรัฐบาลก็มีไอเดียดีสักหนึ่งเรื่องกับ {topic}", protestable: true, protestReason: "slander" }
        ]
      },
      against: {
        en: [
          { text: "This government is ROBBING the people! This {topic} is nothing but a scheme to enrich their cronies!", protestable: true, protestReason: "slander" },
          { text: "The honorable Prime Minister should RESIGN if this is the best legislation they can produce!", protestable: true, protestReason: "off_topic" },
          { text: "Where did the ฿700 billion go?! Before we discuss any new bill, answer for the MISSING MONEY!", protestable: true, protestReason: "off_topic" },
          { text: "This government has NO moral authority to govern. Every policy they touch turns to ash!", protestable: true, protestReason: "misleading" },
          { text: "The Minister is LYING to this House! The real figures are hidden in a classified report!", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "รัฐบาลนี้กำลังปล้นประชาชน! {topic} ไม่ใช่อะไรเลยนอกจากแผนเอื้อพวกพ้อง!", protestable: true, protestReason: "slander" },
          { text: "ท่านนายกรัฐมนตรีควรลาออก ถ้ากฎหมายแบบนี้คือสิ่งที่ดีที่สุดที่ผลิตได้!", protestable: true, protestReason: "off_topic" },
          { text: "เงิน ฿700,000 ล้านหายไปไหน?! ก่อนจะอภิปรายร่างใหม่ ตอบเรื่องเงินที่หายไปก่อน!", protestable: true, protestReason: "off_topic" },
          { text: "รัฐบาลนี้ไม่มีความชอบธรรมทางศีลธรรมในการปกครอง ทุกนโยบายที่แตะ กลายเป็นเถ้าถ่าน!", protestable: true, protestReason: "misleading" },
          { text: "ท่านรัฐมนตรีกำลังโกหกสภาแห่งนี้! ตัวเลขจริงซ่อนอยู่ในรายงานลับ!", protestable: true, protestReason: "slander" }
        ]
      }
    },
    populist: {
      for: {
        en: [
          { text: "The people deserve this. After years of suffering, this is the LEAST this House can do.", protestable: false }
        ],
        th: [
          { text: "ประชาชนสมควรได้รับสิ่งนี้ หลังจากทุกข์ทรมานมาหลายปี นี่คือสิ่งน้อยที่สุดที่สภาแห่งนี้ทำได้", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "Go ask any grandmother in Udon Thani what she thinks of this bill. She'll tell you it's a SCAM.", protestable: false },
          { text: "15 million farmers will suffer if this passes. But what does this government care? They've never set foot in a rice field.", protestable: true, protestReason: "misleading" },
          { text: "The people didn't vote for THIS. They voted for change, and all they got was more of the same corruption.", protestable: false }
        ],
        th: [
          { text: "ไปถามยายคนไหนก็ได้ที่อุดรธานีว่าคิดยังไงกับร่างนี้ เขาจะบอกว่ามันเป็นแค่เรื่องหลอกลวง", protestable: false },
          { text: "เกษตรกร 15 ล้านคนจะเดือดร้อนถ้าร่างนี้ผ่าน แต่รัฐบาลสนใจหรือ? ไม่เคยแม้แต่จะย่ำเท้าเข้าท้องนา", protestable: true, protestReason: "misleading" },
          { text: "ประชาชนไม่ได้เลือกให้มาทำแบบนี้ พวกเขาเลือกการเปลี่ยนแปลง แต่ที่ได้คือคอร์รัปชันแบบเดิมๆ", protestable: false }
        ]
      }
    },
    emotional: {
      for: {
        en: [
          { text: "I have seen the faces of the children who will benefit from this. I cannot in good conscience vote against it.", protestable: false }
        ],
        th: [
          { text: "ผมได้เห็นใบหน้าของเด็กๆ ที่จะได้ประโยชน์จากสิ่งนี้ ด้วยจิตสำนึก ผมไม่สามารถโหวตคัดค้านได้", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "*voice breaking* ...I have met the families destroyed by this government's policies. They deserve better!", protestable: false },
          { text: "How can we sit here in air-conditioned comfort debating numbers while PEOPLE ARE DYING outside this building?!", protestable: true, protestReason: "off_topic" },
          { text: "I REFUSE to be silent. History will judge each of us by our vote today. Choose wisely.", protestable: false }
        ],
        th: [
          { text: "ท่านประธาน... *เสียงสั่น* ...ผมได้พบครอบครัวที่ถูกทำลายจากนโยบายของรัฐบาล พวกเขาสมควรได้รับสิ่งที่ดีกว่า!", protestable: false },
          { text: "เรานั่งอยู่ในห้องแอร์เย็นสบาย อภิปรายตัวเลข ในขณะที่คนกำลังล้มตายข้างนอกตึกนี้ได้อย่างไร?!", protestable: true, protestReason: "off_topic" },
          { text: "ผมปฏิเสธที่จะเงียบ! ประวัติศาสตร์จะตัดสินเราทุกคนจากการลงมติในวันนี้ เลือกให้ดี", protestable: false }
        ]
      }
    },
    legalistic: {
      for: {
        en: [
          { text: "The constitutional basis for this legislation is solid. We support it with reservations on Section 12, clause (b).", protestable: false }
        ],
        th: [
          { text: "พื้นฐานทางรัฐธรรมนูญของกฎหมายนี้มั่นคง เราสนับสนุนโดยมีข้อสงวนในมาตรา 12 ข้อ (ข)", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "This bill is UNCONSTITUTIONAL. Period. Section 77 requires a public hearing process that was NEVER conducted.", protestable: false },
          { text: "I formally request that this bill be referred to the Council of State for a legality review before second reading.", protestable: false },
          { text: "The government's legal team clearly didn't read their own Constitution. This violates at least 3 fundamental rights.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "ร่างกฎหมายนี้ขัดรัฐธรรมนูญ มาตรา 77 กำหนดให้ต้องมีกระบวนการรับฟังความคิดเห็นสาธารณะ ซึ่งไม่เคยจัด", protestable: false },
          { text: "ผมขอเสนออย่างเป็นทางการให้ส่งร่างนี้ไปยังคณะกรรมการกฤษฎีกาเพื่อตรวจสอบความชอบด้วยกฎหมายก่อนวาระที่สอง", protestable: false },
          { text: "ทีมกฎหมายของรัฐบาลไม่ได้อ่านรัฐธรรมนูญของตัวเอง ร่างนี้ละเมิดสิทธิขั้นพื้นฐานอย่างน้อย 3 ข้อ", protestable: true, protestReason: "slander" }
        ]
      }
    }
  }
};

/**
 * SPEAKER_PROCEDURAL_LINES — Lines spoken by the Speaker of the House
 * (ประธานสภา) during debate proceedings.
 * Used for transitions, rulings, and maintaining order.
 */
const SPEAKER_PROCEDURAL_LINES = {
  openSession: {
    en: [
      "The House is now in session. Today we shall consider the matter of {topic}.",
      "Order. The House shall convene. On the agenda: {topic}."
    ],
    th: [
      "ท่านสมาชิกที่เคารพ, ขอเปิดการประชุมสภาผู้แทนราษฎร ครั้งที่ {sessionNum}",
      "เปิดประชุม วาระวันนี้: {topic}"
    ]
  },
  callSpeaker: {
    en: [
      "The Chair recognizes {speakerName}.",
      "The floor is yielded to {speakerName}."
    ],
    th: [
      "ขอเชิญท่าน {speakerName} อภิปราย",
      "เชิญท่านสมาชิกอภิปรายต่อไปครับ"
    ]
  },
  orderInHouse: {
    en: [
      "Order! Order in the House!",
      "Members shall maintain order!"
    ],
    th: [
      "ขอให้สมาชิกรักษาความสงบเรียบร้อย!",
      "ท่านสมาชิก กรุณารักษาความสงบ!"
    ]
  },
  closeDebate: {
    en: [
      "Debate is now closed. Members shall prepare to vote.",
      "The debate has concluded. We shall now proceed to the division."
    ],
    th: [
      "สิ้นสุดการอภิปราย ขอให้สมาชิกเตรียมลงมติ",
      "ปิดอภิปราย — เชิญสมาชิกกดปุ่มลงคะแนน"
    ]
  },
  protestSustained: {
    en: [
      "The protest is SUSTAINED. The honorable member shall withdraw their remarks.",
      "Sustained. The speaker is directed to confine remarks to the matter at hand."
    ],
    th: [
      "คำประท้วงฟังขึ้น! ขอให้ท่านผู้อภิปรายระมัดระวังถ้อยคำ",
      "คำประท้วงฟังขึ้น — เชิญผู้อภิปรายกลับเข้าสู่ประเด็น"
    ]
  },
  protestOverruled: {
    en: [
      "The protest is OVERRULED. The speaker may continue.",
      "Overruled. The remarks are within parliamentary bounds."
    ],
    th: [
      "คำประท้วงฟังไม่ขึ้น เชิญผู้อภิปรายต่อครับ!",
      "คำประท้วงฟังไม่ขึ้น — ผู้อภิปรายอยู่ในประเด็น"
    ]
  },
  callVote: {
    en: [
      "The question is put. Members shall now vote: AYE or NAY.",
      "Division! Members shall cast their vote."
    ],
    th: [
      "ขอให้สมาชิกลงมติ: เห็นด้วย กดปุ่มเขียว ไม่เห็นด้วย กดปุ่มแดง",
      "ลงมติ! เห็นด้วย — ไม่เห็นด้วย — งดออกเสียง"
    ]
  }
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: PROTEST (POINT OF ORDER) SYSTEM
// The core "interrupt" mechanic. The player spots a rule violation
// and raises a formal protest with the Speaker of the House.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PROTEST_REASONS — The grounds on which a player can raise a protest.
 *
 * Each reason has:
 *   id:              Machine identifier
 *   label:           English display name
 *   labelThai:       Thai display name (for UI buttons)
 *   description:     Explanation shown to player
 *   baseSuccessRate: Base % chance the Speaker sustains the protest (0-100)
 *   capitalCostOnFail: Political Capital lost if overruled
 *   capitalGainOnSuccess: Political Capital gained if sustained
 *   speakerPenalty:   Penalty to the speaking MP's momentum if sustained
 *   correctMatch:     Which protestable reason this should match against
 */
const PROTEST_REASONS = [
  {
    id: "slander",
    label: "Slander / Personal Attack",
    labelThai: "หมิ่นประมาท / โจมตีส่วนตัว",
    description: "The speaker used language that personally attacks or defames another member.",
    ruleReference: "ข้อบังคับการประชุม ข้อ 69",
    baseSuccessRate: 55,
    capitalCostOnFail: 5,
    capitalGainOnSuccess: 8,
    speakerPenalty: 15,
    correctMatch: "slander"
  },
  {
    id: "off_topic",
    label: "Off-Topic / Irrelevant",
    labelThai: "นอกประเด็น / ไม่เกี่ยวข้อง",
    description: "The speaker has strayed from the topic being debated.",
    ruleReference: "ข้อบังคับการประชุม ข้อ 67",
    baseSuccessRate: 50,
    capitalCostOnFail: 4,
    capitalGainOnSuccess: 6,
    speakerPenalty: 10,
    correctMatch: "off_topic"
  },
  {
    id: "misleading",
    label: "Misleading / False Information",
    labelThai: "ให้ข้อมูลเท็จ / ชี้นำผิด",
    description: "The speaker is presenting false or deliberately misleading information to the House.",
    ruleReference: "ข้อบังคับการประชุม ข้อ 70",
    baseSuccessRate: 40,
    capitalCostOnFail: 6,
    capitalGainOnSuccess: 10,
    speakerPenalty: 20,
    correctMatch: "misleading"
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: DEBATE ENGINE STATE
// Internal state tracking for an active debate session.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _debateState — Internal engine state for the currently running debate.
 * Reset at the start of each debate via runDebate().
 * @private
 */
let _debateState = {
  isRunning: false,               // Is a debate currently active?
  intervalId: null,               // setInterval handle for the dialogue stream
  currentTopic: null,             // The DEBATE_TOPICS entry being debated
  currentSpeaker: null,           // The AI_SPEAKERS entry currently speaking
  currentDialogue: null,          // The current dialogue line object
  dialogueQueue: [],              // Pre-generated sequence of speakers + lines
  dialogueIndex: 0,               // Current position in the queue
  transcript: [],                 // Full debate transcript (array of dialogue objects)
  speakerMomentum: {},            // speakerId → momentum (affected by protests)
  protestCooldown: false,         // Prevents spam-protesting
  protestCooldownTimer: null,     // Timer for cooldown reset
  playerHasSpoken: false,         // Has the player spoken this round?
  playerTurnPending: false,       // Is it the player's turn to speak?
  roundsCompleted: 0,             // How many dialogue rounds have completed
  totalRounds: 0,                 // Total rounds for this debate
  dialogueIntervalMs: 3000,       // Milliseconds between AI speakers (default 3s)
  isPaused: false,                // Is the debate paused (e.g., during protest modal)?
  voteResult: null                // { ayes, nays, abstain, passed } after vote
};

/**
 * _debateCallbacks — UI callback registry for the debate engine.
 * main.js registers handlers to update the DOM when debate events occur.
 */
const _debateCallbacks = {
  onDialogueAdded: [],            // New dialogue line pushed to transcript
  onSpeakerChange: [],            // Speaker changed
  onProtestResult: [],            // Protest outcome resolved
  onPlayerTurn: [],               // It's the player's turn to speak
  onDebateStart: [],              // Debate begins
  onDebateEnd: [],                // Debate concludes
  onVoteStart: [],                // Voting phase begins
  onVoteResult: [],               // Vote tallied
  onInterpellationStart: [],      // Interpellation session begins
  onInterpellationResult: []      // Interpellation outcome
};

/**
 * registerDebateCallback() — Register a handler for debate events.
 * @param {string} eventName - Key from _debateCallbacks
 * @param {Function} handler - Callback function
 */
function registerDebateCallback(eventName, handler) {
  if (!_debateCallbacks[eventName]) {
    console.warn(`[debate.js] Unknown debate callback: "${eventName}"`);
    return;
  }
  _debateCallbacks[eventName].push(handler);
}

/**
 * _fireDebateCallback() — Internal: fires all handlers for a debate event.
 * @param {string} eventName
 * @param {...any} args
 * @private
 */
function _fireDebateCallback(eventName, ...args) {
  if (!_debateCallbacks[eventName]) return;
  _debateCallbacks[eventName].forEach(handler => {
    try {
      handler(...args);
    } catch (err) {
      console.error(`[debate.js] Error in "${eventName}" callback:`, err);
    }
  });
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: CORE DEBATE ENGINE — runDebate()
// Starts a live debate on a given topic. AI MPs speak on a timer.
// ──────────────────────────────────────────────────────────────────────────

/**
 * runDebate() — Starts a live parliamentary debate.
 *
 * This function:
 *   1. Selects the topic and builds a speaker queue
 *   2. Starts a setInterval that pushes dialogue every ~3 seconds
 *   3. Periodically inserts the player's turn to speak
 *   4. Ends the debate after all rounds, then triggers a vote
 *
 * @param {string|Object} topicOrId - A DEBATE_TOPICS id string, or topic object
 * @param {Object} options - Optional configuration
 * @param {number} options.intervalMs - Milliseconds between speakers (default 3000)
 * @param {boolean} options.autoStart - Start immediately? (default true)
 * @returns {Object} The debate state snapshot
 */
function runDebate(topicOrId, options = {}) {
  // ── Resolve the topic ──
  let topic;
  if (typeof topicOrId === "string") {
    topic = DEBATE_TOPICS.find(t => t.id === topicOrId);
    if (!topic) {
      console.error(`[debate.js] Unknown topic: "${topicOrId}"`);
      return null;
    }
  } else {
    topic = topicOrId;
  }

  // ── Guard: don't start if one is already running ──
  if (_debateState.isRunning) {
    console.warn("[debate.js] A debate is already in progress. End it first.");
    return null;
  }

  console.log(`[debate.js] ═══ STARTING DEBATE ═══`);
  console.log(`  → Topic: ${topic.title}`);
  console.log(`  → Thai: ${topic.titleThai}`);
  console.log(`  → Controversy: ${topic.controversy}/100`);

  // ── Reset debate state ──
  // Link debate speed to TPSGlobalState if available
  // v1.0.2: Base interval increased to 4500ms for better readability
  let intervalMs = options.intervalMs || 4500;
  if (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.debateSpeed) {
    // debateSpeed: 1 = 4500ms, 2 = 2250ms, 3 = 1500ms
    intervalMs = Math.round(4500 / TPSGlobalState.debateSpeed);
  }

  _debateState = {
    isRunning: true,
    intervalId: null,
    currentTopic: topic,
    currentSpeaker: null,
    currentDialogue: null,
    dialogueQueue: [],
    dialogueIndex: 0,
    transcript: [],
    speakerMomentum: {},
    protestCooldown: false,
    protestCooldownTimer: null,
    playerHasSpoken: false,
    playerTurnPending: false,
    roundsCompleted: 0,
    totalRounds: topic.estimatedDuration,
    dialogueIntervalMs: intervalMs,
    isPaused: false,
    voteResult: null
  };

  // v1.0.2: Reset dialogue repeat tracker for new debate
  _usedDialogueIndices = {};

  // v1.0.2: Reset mid-session event counters
  _midSessionEventCount = 0;
  _midSessionCooldown = 0;

  // Initialize speaker momentum
  AI_SPEAKERS.forEach(sp => {
    _debateState.speakerMomentum[sp.id] = 50; // Start at 50/100
  });

  // ── Build the dialogue queue ──
  _buildDialogueQueue(topic);

  // ── Mark state ──
  if (parliamentState) {
    parliamentState.isDebateInProgress = true;
    parliamentState.whipUsedThisSession = false; // v1.0.2: Reset whip for new session
  }

  // ── Fire start callback ──
  _fireDebateCallback("onDebateStart", topic, _debateState);

  // ── Push opening statement from the Speaker of the House ──
  _pushSpeakerProceduralLine("openSession", topic);

  // ── Start the dialogue interval ──
  if (options.autoStart !== false) {
    _startDialogueStream();
  }

  return getDebateSnapshot();
}

/**
 * _buildDialogueQueue() — Pre-generates the full sequence of speakers
 * and their dialogue lines for the debate.
 *
 * Algorithm:
 *   1. Alternate between government and opposition speakers
 *   2. Select speakers based on topic category and their style
 *   3. Pick dialogue lines matching their stance on the topic
 *   4. Insert player turn slots at regular intervals
 *   5. Randomize within constraints for variety
 *
 * @param {Object} topic - The DEBATE_TOPICS entry
 * @private
 */
function _buildDialogueQueue(topic) {
  const queue = [];
  const govSpeakers = AI_SPEAKERS.filter(s => s.alignment === "government");
  const oppSpeakers = AI_SPEAKERS.filter(s => s.alignment === "opposition");
  const totalRounds = topic.estimatedDuration;

  // Determine player turn insertion points (every 3-4 rounds)
  const playerTurnInterval = Math.floor(totalRounds / 3);

  for (let i = 0; i < totalRounds; i++) {
    // ── Check if this is a player turn slot ──
    if (playerTurnInterval > 0 && i > 0 && i % playerTurnInterval === 0) {
      queue.push({
        type: "player_turn",
        roundIndex: i,
        speakerId: null,
        speaker: null,
        dialogue: null
      });
    }

    // ── Alternate sides: even = government, odd = opposition ──
    const isGovTurn = (i % 2 === 0);
    const pool = isGovTurn ? govSpeakers : oppSpeakers;
    const speaker = pool[Math.floor(Math.random() * pool.length)];

    // ── Determine stance based on topic positions ──
    const sidePosition = isGovTurn ? topic.governmentPosition : topic.oppositionPosition;
    const stance = sidePosition || (isGovTurn ? "for" : "against");

    // ── Pick a dialogue line ──
    const line = _pickDialogueLine(speaker, stance);

    queue.push({
      type: "ai_speech",
      roundIndex: i,
      speakerId: speaker.id,
      speaker: speaker,
      dialogue: line,
      stance: stance,
      timestamp: null  // Set when actually delivered
    });
  }

  _debateState.dialogueQueue = queue;
  _debateState.totalRounds = queue.length;

  console.log(`[debate.js] Built dialogue queue: ${queue.length} entries (${totalRounds} AI + player turns)`);
}

/**
 * _pickDialogueLine() — Selects an appropriate dialogue line for a speaker.
 *
 * @param {Object} speaker - AI_SPEAKERS entry
 * @param {string} stance - "for" | "against" | "neutral"
 * @returns {Object} A dialogue template object { text, protestable, protestReason? }
 * @private
 */
function _pickDialogueLine(speaker, stance) {
  const alignment = speaker.alignment; // "government" | "opposition"
  const style = speaker.style;
  const lang = _getDebateLang(); // "en" | "th"

  // v1.0.2: Merge original templates with EXTRA_DIALOGUE_BANK
  let lines = [];
  const origLines = DIALOGUE_TEMPLATES[alignment]?.[style]?.[stance]?.[lang];
  if (origLines && origLines.length > 0) lines = [...origLines];

  // Also pull from extra bank if available
  const extraKey = `${alignment}_${style}_${stance}`;
  const extraLines = EXTRA_DIALOGUE_BANK[extraKey]?.[lang];
  if (extraLines && extraLines.length > 0) lines = lines.concat(extraLines);

  // Fallback: try the other stance
  if (lines.length === 0) {
    const fallbackStance = stance === "for" ? "against" : "for";
    const fb = DIALOGUE_TEMPLATES[alignment]?.[style]?.[fallbackStance]?.[lang];
    if (fb) lines = [...fb];
    const fbExtra = EXTRA_DIALOGUE_BANK[`${alignment}_${style}_${fallbackStance}`]?.[lang];
    if (fbExtra) lines = lines.concat(fbExtra);
  }

  // Fallback: try a different style in the same alignment
  if (lines.length === 0) {
    const styles = Object.keys(DIALOGUE_TEMPLATES[alignment] || {});
    for (const s of styles) {
      lines = DIALOGUE_TEMPLATES[alignment][s][stance]?.[lang] || DIALOGUE_TEMPLATES[alignment][s]["against"]?.[lang] || [];
      if (lines.length > 0) break;
    }
  }

  // Ultimate fallback
  if (lines.length === 0) {
    return {
      text: lang === 'th'
        ? 'ท่านประธาน, ผมขอแสดงจุดยืนในเรื่องนี้ต่อสภา'
        : 'I wish to express my position on this matter before the House.',
      protestable: false
    };
  }

  // v1.0.2: Session-level repeat prevention
  const poolKey = `${alignment}_${style}_${stance}_${lang}`;
  if (!_usedDialogueIndices[poolKey]) _usedDialogueIndices[poolKey] = [];
  let available = lines.filter((_, i) => !_usedDialogueIndices[poolKey].includes(i));
  if (available.length === 0) {
    _usedDialogueIndices[poolKey] = [];
    available = [...lines];
  }

  // Pick a random from available
  const availIdx = Math.floor(Math.random() * available.length);
  const line = available[availIdx];
  const origIdx = lines.indexOf(line);
  _usedDialogueIndices[poolKey].push(origIdx);

  // Apply speaker's protestVulnerability — maybe add extra protestable flavor
  if (!line.protestable && Math.random() * 100 < speaker.protestVulnerability) {
    const vulnText = lang === 'th'
      ? ' และพูดตรงๆ คนที่ไม่เห็นด้วยก็โง่หรือไม่ก็ฉ้อฉล!'
      : ' And frankly, those who disagree are either ignorant or corrupt!';
    return {
      ...line,
      text: line.text + vulnText,
      protestable: true,
      protestReason: "slander"
    };
  }

  return { ...line };
}

// v1.0.2: Session-level dialogue repeat tracker (reset per debate)
let _usedDialogueIndices = {};

/**
 * EXTRA_DIALOGUE_BANK — v1.0.2 Extended dialogue variety.
 * Keyed as: "alignment_style_stance" → { en: [...], th: [...] }
 * Supplements DIALOGUE_TEMPLATES to prevent repetition.
 */
const EXTRA_DIALOGUE_BANK = {
  // ── Government Aggressive ──
  government_aggressive_for: {
    en: [
      { text: "The opposition can shout all day — the NUMBERS don't lie! This {topic} will deliver results!", protestable: false },
      { text: "Every single day they delay this bill, REAL PEOPLE suffer! Enough obstruction!", protestable: true, protestReason: "misleading" },
      { text: "If the opposition cared half as much about policy as they do about Twitter, this country would be better off!", protestable: true, protestReason: "off_topic" }
    ],
    th: [
      { text: "ฝ่ายค้านจะตะโกนทั้งวันก็ได้ — แต่ตัวเลขไม่โกหก! {topic} นี้จะสร้างผลลัพธ์!", protestable: false },
      { text: "ทุกวันที่พวกท่านดีเลย์ร่างนี้ คนจริงๆ เดือดร้อน! พอได้แล้วกับการขัดขวาง!", protestable: true, protestReason: "misleading" },
      { text: "ถ้าฝ่ายค้านสนใจนโยบายสักครึ่งหนึ่งเท่าที่สนใจทวิตเตอร์ ประเทศจะดีกว่านี้!", protestable: true, protestReason: "off_topic" }
    ]
  },
  government_aggressive_against: {
    en: [
      { text: "This reckless proposal would set Thailand back 20 years! We will NOT let that happen!", protestable: false },
      { text: "The author of this bill should be ASHAMED. It betrays every principle of fiscal responsibility!", protestable: true, protestReason: "slander" }
    ],
    th: [
      { text: "ข้อเสนอไม่รอบคอบนี้จะดึงไทยถอยหลัง 20 ปี! เราจะไม่ปล่อยให้เกิดขึ้น!", protestable: false },
      { text: "ผู้เสนอร่างนี้ควรอาย ร่างนี้ทรยศทุกหลักการความรับผิดชอบทางการเงิน!", protestable: true, protestReason: "slander" }
    ]
  },
  // ── Government Technical ──
  government_technical_for: {
    en: [
      { text: "Our modeling shows a 17.3% ROI within 36 months. The economic case for this {topic} is airtight.", protestable: false },
      { text: "I refer the House to Appendix C of the committee report — the cost-benefit analysis leaves no room for doubt.", protestable: false },
      { text: "OECD comparisons with 12 peer economies confirm: Thailand is an outlier. This {topic} normalizes our position.", protestable: false }
    ],
    th: [
      { text: "โมเดลของเราแสดง ROI 17.3% ภายใน 36 เดือน เหตุผลทางเศรษฐกิจของ {topic} นี้ชัดเจน", protestable: false },
      { text: "ขอให้สภาดูภาคผนวก ค ของรายงานคณะกรรมาธิการ — การวิเคราะห์ต้นทุน-ผลตอบแทนไม่เหลือที่ว่างสำหรับข้อสงสัย", protestable: false },
      { text: "การเปรียบเทียบ OECD กับ 12 เศรษฐกิจเพื่อน ยืนยัน: ไทยเป็นข้อยกเว้น {topic} นี้ทำให้เราอยู่ในระดับปกติ", protestable: false }
    ]
  },
  // ── Opposition Aggressive ──
  opposition_aggressive_against: {
    en: [
      { text: "The Minister is a PUPPET! Someone else is writing these bills, and we all know WHO!", protestable: true, protestReason: "slander" },
      { text: "This is what happens when you let GENERALS write policy! Total incompetence disguised as reform!", protestable: true, protestReason: "off_topic" },
      { text: "How many MORE scandals before this government falls? History is watching!", protestable: false },
      { text: "The people are HUNGRY, and you're debating THIS?! Read the room!", protestable: true, protestReason: "off_topic" }
    ],
    th: [
      { text: "ท่านรัฐมนตรีเป็นแค่หุ่นเชิด! มีคนอื่นเขียนร่างเหล่านี้ และเราทุกคนรู้ว่าเป็นใคร!", protestable: true, protestReason: "slander" },
      { text: "นี่คือสิ่งที่เกิดขึ้นเมื่อปล่อยให้นายพลเขียนนโยบาย! ไร้ความสามารถปลอมตัวเป็นการปฏิรูป!", protestable: true, protestReason: "off_topic" },
      { text: "อีกกี่เรื่องอื้อฉาวรัฐบาลนี้ถึงจะล้ม? ประวัติศาสตร์กำลังจับตาดู!", protestable: false },
      { text: "ประชาชนหิวโหย แล้วท่านมานั่งอภิปรายเรื่องนี้?! อ่านบรรยากาศบ้าง!", protestable: true, protestReason: "off_topic" }
    ]
  },
  // ── Opposition Technical ──
  opposition_technical_against: {
    en: [
      { text: "Cross-referencing the ministry's own data with Bank of Thailand figures reveals a ฿47 billion discrepancy. Care to explain?", protestable: false },
      { text: "The regression analysis in our counter-report demonstrates a negative correlation between this policy and GDP growth at p < 0.01.", protestable: false },
      { text: "Three independent economic institutes have rated this {topic} as 'high risk'. The government is ignoring expert consensus.", protestable: false }
    ],
    th: [
      { text: "การอ้างอิงข้อมูลของกระทรวงเองกับตัวเลขธนาคารแห่งประเทศไทยพบความคลาดเคลื่อน ฿47,000 ล้าน อธิบายได้ไหม?", protestable: false },
      { text: "การวิเคราะห์การถดถอยในรายงานตอบโต้ของเราแสดงความสัมพันธ์เชิงลบกับ GDP ที่ p < 0.01", protestable: false },
      { text: "สถาบันเศรษฐกิจอิสระ 3 แห่งจัดอันดับ {topic} นี้ว่า 'เสี่ยงสูง' รัฐบาลเพิกเฉยฉันทามติผู้เชี่ยวชาญ", protestable: false }
    ]
  },
  // ── Opposition Populist ──
  opposition_populist_against: {
    en: [
      { text: "I brought a bag of rice from Udon Thani. THIS is what a farmer earns in a month. You want to take even THAT away?!", protestable: false },
      { text: "My constituents can't afford MEDICINE. And this government wants to spend billions on vanity projects?!", protestable: false }
    ],
    th: [
      { text: "ผมเอาถุงข้าวจากอุดรธานีมา นี่คือรายได้เกษตรกรหนึ่งเดือน ท่านจะเอาแม้แต่สิ่งนี้ไปอีกหรือ?!", protestable: false },
      { text: "ประชาชนในเขตผมซื้อยาไม่ได้ แล้วรัฐบาลจะใช้เงินหลายพันล้านกับโครงการโอ้อวด?!", protestable: false }
    ]
  },
  // ── Government Populist ──
  government_populist_for: {
    en: [
      { text: "I was in Chiang Rai last week. A mother held my hand and said, 'Please pass this bill.' How can I say no?", protestable: false },
      { text: "We promised the people. We WILL deliver. This {topic} is our commitment to every Thai family.", protestable: false }
    ],
    th: [
      { text: "ผมอยู่เชียงรายสัปดาห์ที่แล้ว แม่คนหนึ่งจับมือผมบอกว่า 'ช่วยผ่านร่างนี้' ผมจะปฏิเสธได้อย่างไร?", protestable: false },
      { text: "เราสัญญากับประชาชน เราจะทำตามสัญญา {topic} นี้คือคำมั่นของเราต่อทุกครอบครัวไทย", protestable: false }
    ]
  }
};

// ──────────────────────────────────────────────────────────────────────────
// SECTION 6B: DIALOGUE ARCHETYPES (STEP 51)
// Topic-agnostic lines for variety. The debate engine randomly injects these
// between regular speeches to break up repetition.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DIALOGUE_ARCHETYPES — Categorized pools of generic parliamentary dialogue.
 * Each array has bilingual entries. The engine picks randomly from these
 * to inject "flavor lines" between AI speeches.
 */
const DIALOGUE_ARCHETYPES = {
  /**
   * Aggressive — heated, confrontational interjections.
   */
  aggressive: {
    en: [
      { text: "This is a blatant lie to the public! I demand the Minister retract this statement!", protestable: true, protestReason: "misleading" },
      { text: "You are protecting the elite at the expense of the poor! Shame on this government!", protestable: true, protestReason: "off_topic" },
      { text: "How DARE you compare this to the 2540 crisis! That is a grotesque distortion of history!", protestable: false },
      { text: "The Minister should resign! This level of incompetence is criminal negligence!", protestable: true, protestReason: "slander" },
      { text: "We have EVIDENCE of backroom deals! Shall I read the leaked minutes to this House?!", protestable: false },
      { text: "The people of Isan didn't send me here to watch you line your pockets!", protestable: false },
      { text: "ENOUGH with the gaslighting! The numbers are right here — page 47 of YOUR own report!", protestable: false },
      { text: "You call this governance?! My grandmother runs her somtam stall with more transparency!", protestable: true, protestReason: "off_topic" }
    ],
    th: [
      { text: "นี่คือการโกหกประชาชนอย่างโจ่งแจ้ง! ผมขอให้ท่านรัฐมนตรีถอนคำพูด!", protestable: true, protestReason: "misleading" },
      { text: "ท่านปกป้องชนชั้นสูงโดยเอาคนจนเป็นเหยื่อ! น่าอายรัฐบาลนี้!", protestable: true, protestReason: "off_topic" },
      { text: "ท่านกล้าเปรียบเทียบเรื่องนี้กับวิกฤต 2540 ได้อย่างไร?! บิดเบือนประวัติศาสตร์!", protestable: false },
      { text: "ท่านรัฐมนตรีควรลาออก! ความไร้ความสามารถระดับนี้เข้าข่ายความผิดทางอาญา!", protestable: true, protestReason: "slander" },
      { text: "เรามีหลักฐานการเจรจาลับ! จะให้ผมอ่านบันทึกการประชุมที่รั่วไหลให้สภาฟังไหม?!", protestable: false },
      { text: "ประชาชนอีสานไม่ได้ส่งผมมาที่นี่เพื่อดูท่านเอาเงินเข้ากระเป๋า!", protestable: false },
      { text: "พอได้แล้วกับการบิดเบือน! ตัวเลขอยู่ตรงนี้ — หน้า 47 ของรายงานท่านเอง!", protestable: false },
      { text: "ท่านเรียกสิ่งนี้ว่าการบริหาร?! ยายผมขายส้มตำยังโปร่งใสกว่า!", protestable: true, protestReason: "off_topic" }
    ]
  },

  /**
   * Technical — data-driven, procedural, legal references.
   */
  technical: {
    en: [
      { text: "Section 42 clearly contradicts the Administrative Procedures Act. This bill is unconstitutional on its face.", protestable: false },
      { text: "The fiscal multiplier is negative here. Every baht spent returns only 0.6 baht. The math doesn't lie.", protestable: false },
      { text: "I refer the House to the World Bank's 2025 Governance Index. Thailand ranks 87th — this bill makes it worse.", protestable: false },
      { text: "The Environmental Impact Assessment was filed 3 days before the deadline. No independent review was possible.", protestable: false },
      { text: "Cross-referencing Tables 4 and 7 reveals a ฿12 billion unaccounted allocation. Where did it go?", protestable: false },
      { text: "The OECD recommends a 15% threshold. This bill proposes 8%. We are below international minimum standards.", protestable: false },
      { text: "According to the Bank of Thailand's Q3 forecast, this spending trajectory leads to a 4.2% deficit by 2028.", protestable: false },
      { text: "I have submitted a written amendment to Clause 14(b). The committee chair has a copy.", protestable: false }
    ],
    th: [
      { text: "มาตรา 42 ขัดกับ พ.ร.บ. วิธีปฏิบัติราชการทางปกครองอย่างชัดเจน ร่างนี้ขัดรัฐธรรมนูญ", protestable: false },
      { text: "ตัวคูณทางการคลังเป็นลบ ทุกบาทที่ใช้ได้คืนแค่ 0.6 บาท ตัวเลขไม่โกหก", protestable: false },
      { text: "ขอให้สภาดูดัชนีธรรมาภิบาลธนาคารโลก 2568 ไทยอยู่อันดับ 87 — ร่างนี้ทำให้แย่ลง", protestable: false },
      { text: "รายงาน EIA ยื่นก่อนกำหนด 3 วัน ไม่มีการทบทวนอิสระที่เป็นไปได้", protestable: false },
      { text: "การอ้างอิงตาราง 4 กับ 7 พบงบที่ไม่สามารถอธิบายได้ ฿12,000 ล้าน หายไปไหน?", protestable: false },
      { text: "OECD แนะนำเกณฑ์ 15% ร่างนี้เสนอ 8% เราต่ำกว่ามาตรฐานขั้นต่ำสากล", protestable: false },
      { text: "ตามประมาณการ ธปท. ไตรมาส 3 แนวทางการใช้จ่ายนี้นำไปสู่ขาดดุล 4.2% ภายในปี 2571", protestable: false },
      { text: "ผมยื่นแก้ไขเพิ่มเติมเป็นลายลักษณ์อักษรข้อ 14(ข) ประธานกรรมาธิการมีสำเนาแล้ว", protestable: false }
    ]
  },

  /**
   * Filler — procedural calls, time requests, neutral interjections.
   */
  filler: {
    en: [
      { text: "Mr. Speaker, I request the floor.", protestable: false },
      { text: "Point of order!", protestable: false },
      { text: "I yield the remainder of my time to the distinguished member from Chiang Mai.", protestable: false },
      { text: "Mr. Speaker, may I have an extension of 5 minutes?", protestable: false },
      { text: "I move to table this discussion until the committee report is finalized.", protestable: false },
      { text: "With respect to the previous speaker, I wish to offer a counter-point.", protestable: false },
      { text: "I ask that the Minister's response be entered into the official record.", protestable: false },
      { text: "The honorable member's time has expired. Please conclude your remarks.", protestable: false },
      { text: "I second the motion.", protestable: false },
      { text: "May I ask the Minister to repeat the figure? I believe the House did not hear clearly.", protestable: false }
    ],
    th: [
      { text: "ท่านประธาน ผมขอใช้สิทธิ์อภิปราย", protestable: false },
      { text: "ขอประท้วงตามข้อบังคับ!", protestable: false },
      { text: "ผมขอมอบเวลาที่เหลือให้ท่านสมาชิกผู้ทรงเกียรติจากเชียงใหม่", protestable: false },
      { text: "ท่านประธาน ขอขยายเวลา 5 นาทีครับ", protestable: false },
      { text: "ผมเสนอให้เลื่อนการอภิปรายนี้จนกว่ารายงานกรรมาธิการจะเสร็จสมบูรณ์", protestable: false },
      { text: "ด้วยความเคารพต่อผู้อภิปรายก่อนหน้า ผมขอเสนอมุมมองตรงข้าม", protestable: false },
      { text: "ขอให้บันทึกคำตอบของท่านรัฐมนตรีไว้ในรายงานการประชุม", protestable: false },
      { text: "เวลาของท่านสมาชิกหมดแล้ว กรุณาสรุปคำอภิปราย", protestable: false },
      { text: "ผมรับรองญัตตินี้", protestable: false },
      { text: "ขอให้ท่านรัฐมนตรีทวนตัวเลขอีกครั้ง สภาอาจไม่ได้ยินชัดเจน", protestable: false }
    ]
  }
};

/**
 * getRandomArchetypeLine() — Returns a random dialogue line from a specific archetype.
 * Used by the debate engine to inject variety between AI speeches.
 *
 * @param {string} archetype — "aggressive" | "technical" | "filler"
 * @param {string} [lang] — "en" | "th" (defaults to current debate lang)
 * @returns {Object|null} A dialogue object { text, protestable, protestReason? }
 */
function getRandomArchetypeLine(archetype, lang) {
  lang = lang || _getDebateLang();
  const pool = DIALOGUE_ARCHETYPES[archetype];
  if (!pool) return null;
  const lines = pool[lang] || pool.en;
  return lines[Math.floor(Math.random() * lines.length)];
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: DIALOGUE STREAM (setInterval)
// The heartbeat that pushes new dialogue to the UI.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _startDialogueStream() — Starts the setInterval that feeds dialogue
 * to the UI at regular intervals.
 * @private
 */
function _startDialogueStream() {
  if (_debateState.intervalId) {
    clearInterval(_debateState.intervalId);
  }

  _debateState.intervalId = setInterval(() => {
    // If paused (e.g., protest modal open), skip this tick
    if (_debateState.isPaused) return;

    // Advance to next dialogue
    _advanceDialogue();
  }, _debateState.dialogueIntervalMs);

  console.log(`[debate.js] Dialogue stream started (every ${_debateState.dialogueIntervalMs}ms)`);
}

/**
 * _advanceDialogue() — Processes the next item in the dialogue queue.
 * @private
 */
function _advanceDialogue() {
  if (!_debateState.isRunning) return;

  // v1.0.2: Check for mid-session random event (5% per tick)
  if (_checkMidSessionEvent()) {
    return; // Event triggered — debate is paused, skip normal dialogue
  }

  // v1.0.2 STEP 50: Check for Interpellation Showdown (10% per tick)
  if (_checkInterpellationShowdown()) {
    return; // Interpellation triggered — debate paused for showdown
  }

  const queue = _debateState.dialogueQueue;
  const idx = _debateState.dialogueIndex;

  // ── Check if debate is over ──
  if (idx >= queue.length) {
    _endDebate();
    return;
  }

  const entry = queue[idx];
  _debateState.dialogueIndex++;

  // ── Handle different entry types ──
  switch (entry.type) {
    case "ai_speech":
      _deliverAISpeech(entry);
      break;

    case "player_turn":
      _triggerPlayerTurn();
      break;

    default:
      console.warn(`[debate.js] Unknown queue entry type: "${entry.type}"`);
      break;
  }
}

/**
 * _deliverAISpeech() — Pushes an AI MP's speech to the transcript.
 *
 * @param {Object} entry - Dialogue queue entry
 * @private
 */
function _deliverAISpeech(entry) {
  const speaker = entry.speaker;
  const topic = _debateState.currentTopic;
  const lang = _getDebateLang();

  // ── Substitute placeholders in dialogue text (language-aware) ──
  const topicTitle = (lang === 'th' && topic?.titleThai) ? topic.titleThai : topic.title;
  let text = entry.dialogue.text
    .replace(/\{topic\}/g, topicTitle)
    .replace(/\{ministry\}/g, topic.relatedMinistry || (lang === 'th' ? 'กระทรวงที่เกี่ยวข้อง' : 'the relevant ministry'))
    .replace(/\{speakerName\}/g, (lang === 'th' && speaker.thaiTitle) ? speaker.thaiTitle : speaker.name);

  // ── Build the transcript entry ──
  const transcriptEntry = {
    id: `dlg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: "ai_speech",
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerThaiTitle: speaker.thaiTitle,
    speakerParty: speaker.party,
    speakerPartyShort: speaker.partyShort,
    speakerRole: speaker.role,
    speakerAlignment: speaker.alignment,
    speakerStyle: speaker.style,
    speakerColor: speaker.color,
    speakerAvatar: speaker.avatar,
    text: text,
    protestable: entry.dialogue.protestable || false,
    protestReason: entry.dialogue.protestReason || null,
    stance: entry.stance,
    timestamp: Date.now(),
    roundIndex: entry.roundIndex
  };

  // ── Update debate state ──
  _debateState.currentSpeaker = speaker;
  _debateState.currentDialogue = transcriptEntry;
  _debateState.transcript.push(transcriptEntry);
  _debateState.roundsCompleted++;

  console.log(`[debate.js] ${speaker.avatar} ${speaker.partyShort} | ${speaker.name}: "${text.substring(0, 60)}..."`);

  // ── Fire callbacks ──
  _fireDebateCallback("onDialogueAdded", transcriptEntry);
  _fireDebateCallback("onSpeakerChange", speaker, transcriptEntry);

  // ── STEP 51: Inject archetype flavor line (20% chance) ──
  if (Math.random() < 0.20 && typeof DIALOGUE_ARCHETYPES !== 'undefined') {
    const archetypeRoll = Math.random();
    let archetype;
    if (archetypeRoll < 0.40) archetype = 'filler';
    else if (archetypeRoll < 0.70) archetype = 'aggressive';
    else archetype = 'technical';

    const flavorLine = getRandomArchetypeLine(archetype);
    if (flavorLine) {
      // Pick a random different speaker for the interjection
      const otherSpeakers = (typeof AI_SPEAKERS !== 'undefined')
        ? AI_SPEAKERS.filter(s => s.id !== speaker.id)
        : [];
      const interjector = otherSpeakers.length > 0
        ? otherSpeakers[Math.floor(Math.random() * otherSpeakers.length)]
        : { id: 'backbench', name: 'Backbencher', thaiTitle: 'สมาชิก', party: '', partyShort: '—', alignment: 'neutral', color: '#999', avatar: '💬' };

      const lang = _getDebateLang();
      const flavorEntry = {
        id: `flavor_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: "ai_interjection",
        speakerId: interjector.id,
        speakerName: interjector.name,
        speakerThaiTitle: interjector.thaiTitle || interjector.name,
        speakerParty: interjector.party,
        speakerPartyShort: interjector.partyShort,
        speakerAlignment: interjector.alignment,
        speakerColor: interjector.color,
        speakerAvatar: interjector.avatar,
        text: flavorLine.text,
        protestable: flavorLine.protestable || false,
        protestReason: flavorLine.protestReason || null,
        archetype: archetype,
        timestamp: Date.now()
      };

      _debateState.transcript.push(flavorEntry);
      _fireDebateCallback("onDialogueAdded", flavorEntry);
    }
  }
}

/**
 * _triggerPlayerTurn() — Pauses the debate and signals the UI
 * that it's the player's turn to speak.
 * @private
 */
function _triggerPlayerTurn() {
  _debateState.isPaused = true;
  _debateState.playerTurnPending = true;
  _debateState.playerHasSpoken = false;

  console.log("[debate.js] ═══ PLAYER TURN ═══");

  // Push a procedural line from the Speaker
  _pushSpeakerProceduralLine("callSpeaker", _debateState.currentTopic, {
    speakerName: parliamentState ? parliamentState.playerName : "the honorable member"
  });

  _fireDebateCallback("onPlayerTurn", _debateState.currentTopic, getDebateSnapshot());
}

/**
 * _pushSpeakerProceduralLine() — Adds a procedural line from the Speaker
 * of the House to the transcript.
 *
 * @param {string} lineType - Key from SPEAKER_PROCEDURAL_LINES
 * @param {Object} topic - Current topic for placeholder substitution
 * @param {Object} vars - Additional variables for substitution
 * @private
 */
function _pushSpeakerProceduralLine(lineType, topic, vars = {}) {
  const lang = _getDebateLang();
  const langLines = SPEAKER_PROCEDURAL_LINES[lineType]?.[lang];
  if (!langLines || langLines.length === 0) return;

  let text = langLines[Math.floor(Math.random() * langLines.length)];

  // Use localized topic title
  const topicTitle = (lang === 'th' && topic?.titleThai) ? topic.titleThai : (topic?.title || (lang === 'th' ? 'เรื่องที่พิจารณา' : 'the matter at hand'));

  // Substitute placeholders
  text = text
    .replace(/\{topic\}/g, topicTitle)
    .replace(/\{sessionNum\}/g, parliamentState ? parliamentState.currentWeek : "1")
    .replace(/\{speakerName\}/g, vars.speakerName || (lang === 'th' ? 'ท่านสมาชิก' : 'the honorable member'));

  const entry = {
    id: `proc_${Date.now()}`,
    type: "procedural",
    speakerId: "speaker_of_house",
    speakerName: lang === 'th' ? "ประธานสภา" : "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerParty: null,
    speakerPartyShort: null,
    speakerRole: "ประธานสภาผู้แทนราษฎร",
    speakerAlignment: "neutral",
    speakerStyle: "procedural",
    speakerColor: "#DAA520",
    speakerAvatar: "🏛️",
    text: text,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(entry);
  _fireDebateCallback("onDialogueAdded", entry);
}



// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: PROTEST (POINT OF ORDER) MECHANIC
// The player interrupts a speaker by raising a formal protest.
// ──────────────────────────────────────────────────────────────────────────

/**
 * raiseProtest() — The player raises a Point of Order (ประท้วงตามข้อบังคับ).
 *
 * MECHANIC:
 *   1. Check if an AI is currently speaking (protestable window)
 *   2. Check if the selected reason MATCHES the speaker's violation
 *   3. Calculate success chance: baseRate + PoliticalCapital bonus + match bonus
 *   4. RNG roll → Sustained or Overruled
 *   5. Apply stat effects
 *
 * SUCCESS FACTORS:
 *   - Correct protest reason match: +20% bonus
 *   - Player's PoliticalCapital: +0.2% per point (max +20% at 100 cap)
 *   - Speaker's speakingSkill: -0.15% per point (max -15%)
 *   - Random variance: ±10%
 *
 * @param {string} reasonId - One of: "slander", "off_topic", "misleading"
 * @returns {Object} Result: { sustained, reason, speakerName, capitalChange, ruling }
 */
function raiseProtest(reasonId) {
  // ── Guards ──
  if (!_debateState.isRunning) {
    return { error: "No debate in progress." };
  }
  if (_debateState.protestCooldown) {
    return { error: "Protest cooldown active. Wait before protesting again." };
  }
  if (!_debateState.currentSpeaker) {
    return { error: "No one is currently speaking." };
  }
  if (_debateState.playerTurnPending) {
    return { error: "It's your turn to speak, not protest." };
  }

  // ── Find the protest reason ──
  const reason = PROTEST_REASONS.find(r => r.id === reasonId);
  if (!reason) {
    return { error: `Unknown protest reason: "${reasonId}"` };
  }

  // ── Pause the debate stream during protest resolution ──
  _debateState.isPaused = true;

  // ── Get current speaker and their dialogue ──
  const speaker = _debateState.currentSpeaker;
  const dialogue = _debateState.currentDialogue;

  console.log(`[debate.js] ═══ PROTEST RAISED ═══`);
  console.log(`  → Reason: ${reason.label} (${reason.labelThai})`);
  console.log(`  → Against: ${speaker.name}`);
  console.log(`  → Dialogue protestable: ${dialogue?.protestable}`);
  console.log(`  → Dialogue protest reason: ${dialogue?.protestReason}`);

  // ── Calculate success probability ──
  let successChance = reason.baseSuccessRate;

  // Bonus: Correct reason match (+20%)
  const reasonMatches = dialogue?.protestable && dialogue?.protestReason === reason.correctMatch;
  if (reasonMatches) {
    successChance += 20;
    console.log(`  → Correct match bonus: +20%`);
  } else if (dialogue?.protestable) {
    // Wrong reason but dialogue IS protestable — small bonus
    successChance += 5;
    console.log(`  → Partial match bonus: +5%`);
  } else {
    // Dialogue is NOT protestable — heavy penalty
    successChance -= 25;
    console.log(`  → No violation penalty: -25%`);
  }

  // Bonus: Player's Political Capital (+0.2 per point, max +20)
  const capBonus = (parliamentState?.playerPoliticalCapital || 50) * 0.2;
  successChance += capBonus;
  console.log(`  → Political Capital bonus: +${capBonus.toFixed(1)}%`);

  // Penalty: Speaker's skill (-0.15 per point, max -15)
  const skillPenalty = speaker.speakingSkill * 0.15;
  successChance -= skillPenalty;
  console.log(`  → Speaker skill penalty: -${skillPenalty.toFixed(1)}%`);

  // Random variance (±10%)
  const variance = (Math.random() * 20) - 10;
  successChance += variance;

  // Difficulty scaling: Easy = +12% bonus, Hard = -15% penalty
  if (typeof getParlDiffScale === 'function') {
    const pds = getParlDiffScale();
    // Easy: protestPenaltyMult=0.6 → bonus +12, Normal: 0, Hard: protestPenaltyMult=1.5 → penalty -15
    const diffAdjust = (1 - pds.protestPenaltyMult) * 30;
    successChance += diffAdjust;
  }

  // Clamp to 5-95% (nothing is ever 100% certain in politics)
  successChance = Math.max(5, Math.min(95, successChance));
  console.log(`  → Final success chance: ${successChance.toFixed(1)}%`);

  // ── ROLL THE DICE ──
  const roll = Math.random() * 100;
  const sustained = roll < successChance;

  console.log(`  → Roll: ${roll.toFixed(1)} vs ${successChance.toFixed(1)} → ${sustained ? "SUSTAINED ✅" : "OVERRULED ❌"}`);

  // ── Build the result ──
  const result = {
    sustained: sustained,
    reasonId: reason.id,
    reasonLabel: reason.label,
    reasonLabelThai: reason.labelThai,
    ruleReference: reason.ruleReference,
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerThaiTitle: speaker.thaiTitle,
    speakerParty: speaker.party,
    dialogueWasProtestable: dialogue?.protestable || false,
    reasonMatched: reasonMatches,
    successChance: Math.round(successChance),
    capitalChange: 0,
    ruling: "",
    rulingThai: ""
  };

  // ── Apply consequences ──
  if (sustained) {
    // PROTEST SUSTAINED — Player wins!
    result.capitalChange = reason.capitalGainOnSuccess;
    result.ruling = "Protest SUSTAINED";
    result.rulingThai = "คำประท้วงฟังขึ้น!";

    // Damage speaker's momentum
    _debateState.speakerMomentum[speaker.id] = Math.max(0,
      (_debateState.speakerMomentum[speaker.id] || 50) - reason.speakerPenalty
    );

    // Boost player stats
    applyEffects({ politicalCapital: reason.capitalGainOnSuccess });

    // Update weekly stats
    if (parliamentState) {
      parliamentState.weeklyStats.protestsRaised++;
      parliamentState.weeklyStats.protestsSucceeded++;
      parliamentState.totalStats.protestsRaised++;
      parliamentState.totalStats.protestsSucceeded++;
    }

    // Push Speaker's ruling to transcript
    _pushProtestRulingToTranscript(true, speaker, reason);

    logEvent("protest_sustained", `Protest Sustained: ${reason.label}`,
      `Your protest against ${speaker.name} was sustained by the Speaker. ${reason.ruleReference}.`,
      { politicalCapital: reason.capitalGainOnSuccess });

  } else {
    // Player loses capital (scaled by difficulty)
    let failCost = reason.capitalCostOnFail;
    if (typeof getParlDiffScale === 'function') {
      failCost = Math.round(failCost * getParlDiffScale().protestPenaltyMult);
    }
    result.capitalChange = -failCost;
    result.ruling = "Protest OVERRULED";
    result.rulingThai = "คำประท้วงฟังไม่ขึ้น!";

    // Player loses capital
    applyEffects({ politicalCapital: -failCost });

    // Update stats
    if (parliamentState) {
      parliamentState.weeklyStats.protestsRaised++;
      parliamentState.totalStats.protestsRaised++;
    }

    // Push Speaker's ruling
    _pushProtestRulingToTranscript(false, speaker, reason);

    logEvent("protest_overruled", `Protest Overruled: ${reason.label}`,
      `Your protest against ${speaker.name} was overruled. The Speaker found no violation.`,
      { politicalCapital: -reason.capitalCostOnFail });
  }

  // ── Record in protest history ──
  if (parliamentState) {
    parliamentState.protestHistory.push({
      day: parliamentState.totalDaysElapsed,
      week: parliamentState.currentWeek,
      topic: _debateState.currentTopic?.title,
      speakerName: speaker.name,
      reason: reason.id,
      reasonLabel: reason.label,
      sustained: sustained,
      capitalChange: result.capitalChange,
      timestamp: Date.now()
    });
  }

  // ── Start cooldown ──
  _debateState.protestCooldown = true;
  _debateState.protestCooldownTimer = setTimeout(() => {
    _debateState.protestCooldown = false;
    console.log("[debate.js] Protest cooldown expired.");
  }, 5000); // 5-second cooldown between protests

  // ── Resume debate after a dramatic pause ──
  setTimeout(() => {
    _debateState.isPaused = false;
  }, 2000); // 2-second pause for the ruling to sink in

  // ── Fire callbacks ──
  _fireDebateCallback("onProtestResult", result);

  return result;
}

/**
 * _pushProtestRulingToTranscript() — Adds the Speaker's ruling
 * to the debate transcript after a protest.
 *
 * @param {boolean} sustained - Was the protest sustained?
 * @param {Object} speaker - The AI speaker who was protested
 * @param {Object} reason - The PROTEST_REASONS entry
 * @private
 */
function _pushProtestRulingToTranscript(sustained, speaker, reason) {
  const lang = _getDebateLang();
  const lineType = sustained ? "protestSustained" : "protestOverruled";
  const langLines = SPEAKER_PROCEDURAL_LINES[lineType]?.[lang] || SPEAKER_PROCEDURAL_LINES[lineType]?.en;
  const text = langLines[Math.floor(Math.random() * langLines.length)];

  // Push the player's protest action first — language-aware
  const protestText = lang === 'th'
    ? `ขอประท้วงตามข้อบังคับ! ${reason.labelThai} — ${reason.ruleReference}`
    : `Point of Order! ${reason.label} — ${reason.ruleReference}`;

  const protestEntry = {
    id: `protest_${Date.now()}`,
    type: "player_protest",
    speakerId: "player",
    speakerName: parliamentState ? parliamentState.playerName : "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerParty: null,
    speakerRole: parliamentState ? parliamentState.playerRole : "MP",
    speakerAlignment: parliamentState ? parliamentState.playerAlignment : "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: "⚡",
    text: protestText,
    protestable: false,
    timestamp: Date.now()
  };

  // Then the Speaker's ruling
  const rulingEntry = {
    id: `ruling_${Date.now()}`,
    type: "ruling",
    speakerId: "speaker_of_house",
    speakerName: lang === 'th' ? "ประธานสภา" : "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerParty: null,
    speakerRole: "ประธานสภาผู้แทนราษฎร",
    speakerAlignment: "neutral",
    speakerColor: sustained ? "#28A745" : "#DC3545",
    speakerAvatar: "⚖️",
    text: text,
    protestable: false,
    sustained: sustained,
    timestamp: Date.now()
  };

  _debateState.transcript.push(protestEntry);
  _debateState.transcript.push(rulingEntry);

  _fireDebateCallback("onDialogueAdded", protestEntry);
  _fireDebateCallback("onDialogueAdded", rulingEntry);
}



// ──────────────────────────────────────────────────────────────────────────
// SECTION 9: PLAYER SPEECH MECHANIC
// When it's the player's turn, they choose a rhetorical style.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PLAYER_SPEECH_STANCES — The rhetorical stances the player can choose.
 * Each has different stat effects and narrative consequences.
 */
const PLAYER_SPEECH_STANCES = {
  aggressive: {
    id: "aggressive",
    label: "Aggressive Debate",
    labelThai: "อภิปรายแบบดุดัน",
    description: "Attack the opponent's position and credibility. High risk, high reward.",
    icon: "🔥",
    effects: {
      success: { politicalCapital: +6, localPopularity: +2 },
      failure: { politicalCapital: -4, localPopularity: -1 }
    },
    baseSuccessRate: 45,
    capitalMultiplier: 0.3  // PoliticalCapital influence on success
  },
  technical: {
    id: "technical",
    label: "Technical Argument",
    labelThai: "อภิปรายเชิงเทคนิค",
    description: "Present data, legal arguments, and detailed analysis. Moderate and steady.",
    icon: "📊",
    effects: {
      success: { politicalCapital: +4, localPopularity: +1 },
      failure: { politicalCapital: -1, localPopularity: 0 }
    },
    baseSuccessRate: 60,
    capitalMultiplier: 0.15
  },
  diplomatic: {
    id: "diplomatic",
    label: "Diplomatic Appeal",
    labelThai: "อภิปรายแบบทูต",
    description: "Seek common ground, propose amendments, build bridges. Safe but less impactful.",
    icon: "🤝",
    effects: {
      success: { politicalCapital: +3, localPopularity: +3 },
      failure: { politicalCapital: 0, localPopularity: +1 }
    },
    baseSuccessRate: 70,
    capitalMultiplier: 0.1
  }
};

/**
 * PLAYER_SPEECH_LINES — Pre-written lines for the player's speech,
 * organized by stance. Displayed in the transcript.
 */
const PLAYER_SPEECH_LINES = {
  aggressive: {
    en: [
      "This government's {topic} is a DISGRACE to the Thai people! The numbers don't lie — they've been cooking the books!",
      "I challenge the Minister to tell this House — WHERE IS THE MONEY? The budget figures are FICTION!",
      "The honorable member's argument collapses under the slightest scrutiny. Allow me to demonstrate.",
      "The people sent us here to FIGHT, not to rubber-stamp corrupt legislation. I say NO to this bill!"
    ],
    th: [
      "ท่านประธาน! {topic} ของรัฐบาลนี้เป็นความอัปยศของประชาชนไทย! ตัวเลขไม่โกหก — พวกเขาปลอมบัญชี!",
      "ผมท้าให้ท่านรัฐมนตรีบอกสภาแห่งนี้ — เงินอยู่ไหน? ตัวเลขงบประมาณเป็นเรื่องแต่ง!",
      "ท่านประธาน, ข้อโต้แย้งของท่านสมาชิกผู้ทรงเกียรติพังทลายเมื่อถูกตรวจสอบเพียงเล็กน้อย ให้ผมสาธิต",
      "ประชาชนส่งเรามาที่นี่เพื่อสู้ ไม่ใช่มาประทับตรากฎหมายฉ้อฉล ผมขอคัดค้านร่างนี้!"
    ]
  },
  technical: {
    en: [
      "If we examine Table 3 of the fiscal impact report, the projected revenue shortfall is ฿47.3 billion. This is unsustainable.",
      "I have prepared a 12-page analysis comparing this bill with similar legislation in 8 ASEAN nations. The data is clear.",
      "Section 14, subsection (b) of this bill conflicts with the Administrative Procedures Act of 2539. I propose an amendment.",
      "The ministry's own audit report — which I obtained through an information request — contradicts the figures presented today."
    ],
    th: [
      "ท่านประธาน, หากพิจารณาตาราง 3 ของรายงานผลกระทบทางการเงิน ประมาณการขาดรายได้อยู่ที่ ฿47,300 ล้าน ไม่ยั่งยืน",
      "ผมได้เตรียมรายงานวิเคราะห์ 12 หน้า เปรียบเทียบกฎหมายนี้กับกฎหมายที่คล้ายกันใน 8 ประเทศอาเซียน ข้อมูลชัดเจน",
      "มาตรา 14 วรรค (ข) ของร่างนี้ขัดกับ พ.ร.บ. วิธีปฏิบัติราชการทางปกครอง พ.ศ. 2539 ผมขอเสนอแก้ไข",
      "รายงานตรวจสอบของกระทรวงเอง — ที่ผมได้มาจากการร้องขอข้อมูล — ขัดแย้งกับตัวเลขที่นำเสนอวันนี้"
    ]
  },
  diplomatic: {
    en: [
      "I believe both sides want what's best for Thailand. Perhaps we can find compromise on Sections 7 through 12.",
      "While I respect the government's intent, I propose we establish a joint committee to address the concerns raised by both sides.",
      "The people watching at home want to see us work together. I extend my hand to the other side for constructive dialogue.",
      "I propose a 90-day pilot program in 5 provinces before rolling out nationwide. This serves both caution and progress."
    ],
    th: [
      "ท่านประธาน, ผมเชื่อว่าทั้งสองฝ่ายต้องการสิ่งที่ดีที่สุดสำหรับประเทศไทย บางทีเราอาจหาทางประนีประนอมในมาตรา 7 ถึง 12",
      "แม้จะเคารพเจตนาของรัฐบาล ผมเสนอให้ตั้งคณะกรรมาธิการร่วมเพื่อพิจารณาข้อกังวลของทั้งสองฝ่าย",
      "ประชาชนที่ดูอยู่ที่บ้านต้องการเห็นเราทำงานร่วมกัน ผมยื่นมือให้ฝ่ายตรงข้ามเพื่อเจรจาอย่างสร้างสรรค์",
      "ผมเสนอโครงการนำร่อง 90 วัน ใน 5 จังหวัด ก่อนขยายทั่วประเทศ เป็นทั้งการระมัดระวังและก้าวหน้า"
    ]
  }
};

/**
 * playerSpeak() — The player delivers their speech during their turn.
 *
 * @param {string} stanceId - "aggressive" | "technical" | "diplomatic"
 * @returns {Object} Speech result: { success, stance, capitalChange, narrative }
 */
function playerSpeak(stanceId) {
  // ── Guards ──
  if (!_debateState.isRunning) {
    return { error: "No debate in progress." };
  }
  if (!_debateState.playerTurnPending) {
    return { error: "It's not your turn to speak." };
  }
  if (_debateState.playerHasSpoken) {
    return { error: "You've already spoken this turn." };
  }

  const stance = PLAYER_SPEECH_STANCES[stanceId];
  if (!stance) {
    return { error: `Unknown stance: "${stanceId}"` };
  }

  console.log(`[debate.js] ═══ PLAYER SPEAKS: ${stance.label} ═══`);

  // ── Calculate success ──
  let successChance = stance.baseSuccessRate;

  // Political Capital bonus
  const capBonus = (parliamentState?.playerPoliticalCapital || 50) * stance.capitalMultiplier;
  successChance += capBonus;

  // Topic controversy modifier
  const contrMod = (_debateState.currentTopic?.controversy || 50) * 0.05;
  if (stanceId === "aggressive") successChance -= contrMod; // Harder to be aggressive on hot topics
  if (stanceId === "diplomatic") successChance += contrMod; // Easier to be diplomatic

  // Clamp
  successChance = Math.max(10, Math.min(95, successChance));

  // ── Roll ──
  const roll = Math.random() * 100;
  const success = roll < successChance;

  console.log(`  → Success chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)} → ${success ? "SUCCESS ✅" : "WEAK ❌"}`);

  // ── Build result ──
  const effects = success ? stance.effects.success : stance.effects.failure;
  applyEffects(effects);

  // ── Push to transcript ──
  const lang = _getDebateLang();
  const lines = PLAYER_SPEECH_LINES[stanceId]?.[lang] || PLAYER_SPEECH_LINES[stanceId]?.en;
  let speechText = lines[Math.floor(Math.random() * lines.length)];
  const topicTitle = (lang === 'th' && _debateState.currentTopic?.titleThai) ? _debateState.currentTopic.titleThai : (_debateState.currentTopic?.title || (lang === 'th' ? 'เรื่องนี้' : 'this matter'));
  speechText = speechText.replace(/\{topic\}/g, topicTitle);

  const speechEntry = {
    id: `player_speech_${Date.now()}`,
    type: "player_speech",
    speakerId: "player",
    speakerName: parliamentState ? parliamentState.playerName : "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerParty: parliamentState ? parliamentState.playerPartyId : null,
    speakerRole: parliamentState ? parliamentState.playerRole : "MP",
    speakerAlignment: parliamentState ? parliamentState.playerAlignment : "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: stance.icon,
    text: speechText,
    stance: stanceId,
    success: success,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(speechEntry);
  _debateState.playerHasSpoken = true;
  _debateState.playerTurnPending = false;

  _fireDebateCallback("onDialogueAdded", speechEntry);

  // ── Log event ──
  logEvent("player_speech", `Speech: ${stance.label}`,
    success
      ? `Your ${stance.label.toLowerCase()} speech was well-received. The House listens.`
      : `Your ${stance.label.toLowerCase()} speech fell flat. Weak applause.`,
    effects);

  // ── Resume the debate stream after player speaks ──
  setTimeout(() => {
    _debateState.isPaused = false;
  }, 1500);

  return {
    success,
    stanceId,
    stanceLabel: stance.label,
    stanceLabelThai: stance.labelThai,
    capitalChange: effects.politicalCapital || 0,
    popularityChange: effects.localPopularity || 0,
    narrative: success
      ? "Your speech resonated. Members nod approvingly."
      : "The House is unimpressed. A few jeers from the backbench.",
    speechText
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 10: INTERPELLATION MECHANIC (กระทู้ถามสด)
// The player queues a question for the Government.
// ──────────────────────────────────────────────────────────────────────────

/**
 * STEP 81: _getGaffeQuote() — Returns a random minister gaffe quote.
 * Used when THE GAFFE triggers during interpellation.
 * Inspired by real Thai parliamentary outbursts.
 * @private
 */
function _getGaffeQuote() {
  const quotes = [
    "ไม่ต้องมาสอนผม! ผมรู้ดีกว่าท่าน! — I don't need YOU to lecture ME!",
    "ท่านประธาน ผมขอปฏิเสธที่จะตอบคำถามที่ไร้สาระนี้! — I REFUSE to answer this absurd question!",
    "You think you can corner ME? I was in politics before you were BORN!",
    "The numbers are... um... well, the ministry will provide those later... next question!",
    "That's FAKE NEWS and the honorable member KNOWS it! [bangs desk]",
    "ผมไม่ได้โกหก! ตัวเลขมันเปลี่ยนไปเอง! — I didn't lie! The numbers changed by themselves!",
    "If the member doesn't like my answer, he can take it up with the NCPO... I mean, the committee!"
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * INTERPELLATION_TOPICS — Questions the player can ask the Government.
 * These are typically opposition-style "gotcha" questions.
 */
const INTERPELLATION_TOPICS = [
  {
    id: "interp_budget",
    question: "Can the Prime Minister explain the ฿700 billion discrepancy in the infrastructure budget?",
    questionThai: "ท่านนายกรัฐมนตรีชี้แจงได้หรือไม่ว่างบ 7 แสนล้านบาทในงบโครงสร้างพื้นฐานหายไปไหน?",
    target: "Prime Minister",
    difficulty: 70,
    category: "budget"
  },
  {
    id: "interp_corruption",
    question: "Why has the Anti-Corruption Commission been silent on the land deals in the EEC?",
    questionThai: "ทำไม ป.ป.ช. ถึงนิ่งเฉยต่อเรื่องการซื้อขายที่ดินในเขต EEC?",
    target: "Deputy Prime Minister",
    difficulty: 80,
    category: "corruption"
  },
  {
    id: "interp_military",
    question: "What is the breakdown of the classified military procurement budget for FY2027?",
    questionThai: "ขอให้ท่านรัฐมนตรีกลาโหมชี้แจงรายละเอียดงบจัดซื้ออาวุธลับปีงบ 2570",
    target: "Minister of Defence",
    difficulty: 90,
    category: "security"
  },
  {
    id: "interp_education",
    question: "Why have teacher salaries not been adjusted despite the 2025 reform promise?",
    questionThai: "ทำไมเงินเดือนครูยังไม่ปรับตามที่สัญญาไว้ในการปฏิรูป ปี 2568?",
    target: "Minister of Education",
    difficulty: 50,
    category: "social"
  },
  {
    id: "interp_flooding",
    question: "What measures has the Ministry taken to prevent annual flooding in 23 provinces?",
    questionThai: "กระทรวงมีมาตรการอะไรป้องกันน้ำท่วมซ้ำซากใน 23 จังหวัด?",
    target: "Minister of Interior",
    difficulty: 55,
    category: "infrastructure"
  }
];

/**
 * INTERPELLATION_RESPONSE_STANCES — How the player presents their
 * follow-up after the Government responds.
 */
const INTERPELLATION_RESPONSE_STANCES = {
  aggressive: {
    label: "Press Hard",
    labelThai: "กดดัน",
    description: "Aggressively demand specifics. Risk angering the coalition.",
    effects: {
      success: { politicalCapital: +12, localPopularity: +15 },
      failure: { politicalCapital: -8, localPopularity: -5 }
    },
    baseSuccessRate: 40
  },
  diplomatic: {
    label: "Seek Clarification",
    labelThai: "ขอความกระจ่าง",
    description: "Politely but firmly request additional details.",
    effects: {
      success: { politicalCapital: +7, localPopularity: +8 },
      failure: { politicalCapital: -2, localPopularity: -1 }
    },
    baseSuccessRate: 65
  },
  evade: {
    label: "Accept & Move On",
    labelThai: "ยอมรับคำตอบ",
    description: "Accept the Government's response. Safe but gains nothing.",
    effects: {
      success: { politicalCapital: +2 },
      failure: { politicalCapital: 0 }
    },
    baseSuccessRate: 95
  }
};

/**
 * queueInterpellation() — Player queues a question for the Government.
 * The question will be addressed during the next interpellation slot
 * (typically Thursday morning).
 *
 * @param {string} interpellationId - ID from INTERPELLATION_TOPICS
 * @returns {Object} Queue confirmation
 */
function queueInterpellation(interpellationId) {
  if (!parliamentState) return { error: "State not initialized." };

  const interp = INTERPELLATION_TOPICS.find(i => i.id === interpellationId);
  if (!interp) return { error: `Unknown interpellation: "${interpellationId}"` };

  // Check if already queued
  if (parliamentState.interpellationQueue.find(q => q.id === interpellationId)) {
    return { error: "This question is already queued." };
  }

  // Add to queue
  parliamentState.interpellationQueue.push({
    ...interp,
    queuedAt: Date.now(),
    status: "pending" // "pending" | "asked" | "answered"
  });

  parliamentState.weeklyStats.interpellationsFiled++;
  parliamentState.totalStats.interpellationsFiled++;

  console.log(`[debate.js] Interpellation queued: "${interp.question.substring(0, 50)}..."`);

  return {
    success: true,
    interpellation: interp,
    queuePosition: parliamentState.interpellationQueue.length
  };
}

/**
 * resolveInterpellation() — Resolves a queued interpellation.
 * Called during the interpellation phase of a parliament session.
 *
 * @param {string} interpellationId - The queued question ID
 * @param {string} responseStance - "aggressive" | "diplomatic" | "evade"
 * @returns {Object} Interpellation result
 */
function resolveInterpellation(interpellationId, responseStance) {
  if (!parliamentState) return { error: "State not initialized." };

  const queueItem = parliamentState.interpellationQueue.find(q => q.id === interpellationId);
  if (!queueItem) return { error: "This question is not in the queue." };

  const stance = INTERPELLATION_RESPONSE_STANCES[responseStance];
  if (!stance) return { error: `Unknown response stance: "${responseStance}"` };

  console.log(`[debate.js] ═══ INTERPELLATION RESOLUTION ═══`);
  console.log(`  → Question: ${queueItem.question.substring(0, 50)}...`);
  console.log(`  → Target: ${queueItem.target}`);
  console.log(`  → Player stance: ${stance.label}`);

  // ── Calculate success ──
  let successChance = stance.baseSuccessRate;

  // Difficulty modifier (harder questions are harder to press)
  const difficultyPenalty = (queueItem.difficulty - 50) * 0.3;
  successChance -= difficultyPenalty;

  // Political Capital bonus
  const capBonus = (parliamentState.playerPoliticalCapital || 50) * 0.15;
  successChance += capBonus;

  // Clamp
  successChance = Math.max(10, Math.min(95, successChance));

  // ── Roll ──
  const roll = Math.random() * 100;
  const success = roll < successChance;

  console.log(`  → Success chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)} → ${success ? "SUCCESS" : "FAIL"}`);

  // ── Apply effects ──
  const effects = success ? stance.effects.success : stance.effects.failure;
  applyEffects(effects);

  // ══════════════════════════════════════════════════════════════════
  // STEP 81: THE MINISTER'S GAFFE RNG
  // Regardless of the player's stance outcome, there's a small chance
  // the target minister slips up — loses their temper, makes a gaffe,
  // or gives a disastrously evasive answer that goes viral.
  //
  // Difficulty scaling:
  //   Easy:   25% chance, +5  Capital & LocalPop (frequent, modest)
  //   Normal: 15% chance, +7  Capital & LocalPop (standard)
  //   Hard:    5% chance, +10 Capital & LocalPop (rare but huge)
  // ══════════════════════════════════════════════════════════════════
  let gaffeTriggered = false;
  let gaffeReward = 0;

  const diff = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty
    : (localStorage.getItem('tps_difficulty') || 'normal');
  let gaffeChance = 0.15;
  gaffeReward = 7;

  if (diff === 'easy')  { gaffeChance = 0.25; gaffeReward = 5; }
  if (diff === 'hard')  { gaffeChance = 0.05; gaffeReward = 10; }

  const gaffeRoll = Math.random();
  if (gaffeRoll <= gaffeChance) {
    gaffeTriggered = true;

    // Apply bonus rewards
    applyEffects({
      politicalCapital: gaffeReward,
      localPopularity: gaffeReward
    });

    console.log(`[debate.js] STEP 81 — 🎬 GAFFE! ${queueItem.target} lost composure! Roll=${gaffeRoll.toFixed(3)} ≤ ${gaffeChance} → +${gaffeReward} Capital & LocalPop`);

    // Log the viral moment
    logEvent("interpellation", `🎬 VIRAL: ${queueItem.target} Gaffe!`,
      `${queueItem.target} lost their temper during questioning and gave a disastrous answer! The clip is going viral. +${gaffeReward} Capital, +${gaffeReward} Local Popularity.`,
      { capital: gaffeReward, popularity: gaffeReward, gaffe: true });

    // Publish gaffe news
    if (typeof publishNews === 'function') {
      publishNews('minister_gaffe', {
        player: parliamentState.playerName || 'Player',
        target: queueItem.target
      }, { sentiment: 'positive' });
    }
  }
  // ══════════════════════════════════════════════════════════════════

  // Mark as answered
  queueItem.status = "answered";
  queueItem.answeredAt = Date.now();
  queueItem.result = success ? "pressed" : "deflected";
  if (gaffeTriggered) queueItem.result = "gaffe"; // Override with gaffe result

  // ── Push to transcript ──
  const questionEntry = {
    id: `interp_q_${Date.now()}`,
    type: "interpellation_question",
    speakerId: "player",
    speakerName: parliamentState.playerName || "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerAlignment: parliamentState.playerAlignment || "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: "❓",
    text: queueItem.questionThai || queueItem.question,
    protestable: false,
    timestamp: Date.now()
  };

  // Build government response text — gaffe overrides normal response
  let govResponseText;
  if (gaffeTriggered) {
    govResponseText = `🎬 The ${queueItem.target} LOSES THEIR TEMPER! "${_getGaffeQuote()}" — The clip goes viral within minutes. Social media explodes.`;
  } else if (success) {
    govResponseText = `The ${queueItem.target} stumbles over the answer. The opposition benches erupt in applause.`;
  } else {
    govResponseText = `The ${queueItem.target} delivers a smooth, well-rehearsed response. The government benches bang their desks in approval.`;
  }

  const governmentResponse = {
    id: `interp_a_${Date.now()}`,
    type: "interpellation_answer",
    speakerId: "government_respondent",
    speakerName: queueItem.target,
    speakerThaiTitle: "ท่านรัฐมนตรี",
    speakerAlignment: "government",
    speakerColor: gaffeTriggered ? "#FF2D55" : "#1D3557",
    speakerAvatar: gaffeTriggered ? "🤬" : "🎙️",
    text: govResponseText,
    protestable: false,
    timestamp: Date.now()
  };

  if (_debateState.isRunning) {
    _debateState.transcript.push(questionEntry);
    _debateState.transcript.push(governmentResponse);
    _fireDebateCallback("onDialogueAdded", questionEntry);
    _fireDebateCallback("onDialogueAdded", governmentResponse);
  }

  // ── Log ──
  logEvent("interpellation", `Interpellation: ${queueItem.target}`,
    success
      ? `Your pressing question embarrassed the ${queueItem.target}. Political capital gained.`
      : `The ${queueItem.target} deflected your question skillfully. The moment is lost.`,
    effects);

  // v1.0.2: Publish news on interpellation outcome
  if (typeof publishNews === 'function') {
    const playerName = parliamentState.playerName || 'Player';
    if (success) {
      publishNews('interpellation_success', {
        player: playerName,
        target: queueItem.target
      }, { sentiment: 'positive' });
    } else {
      publishNews('interpellation_fail', {
        player: playerName,
        target: queueItem.target
      }, { sentiment: 'negative' });
    }
  }

  _fireDebateCallback("onInterpellationResult", {
    success, stance: responseStance, question: queueItem, effects,
    gaffeTriggered, gaffeReward  // STEP 81
  });

  return {
    success,
    stanceLabel: stance.label,
    target: queueItem.target,
    capitalChange: effects.politicalCapital || 0,
    popularityChange: effects.localPopularity || 0,
    gaffeTriggered,       // STEP 81
    gaffeReward,          // STEP 81
    narrative: gaffeTriggered
      ? `🎬 VIRAL MOMENT! The ${queueItem.target} lost their temper and gave a DISASTROUS answer! +${gaffeReward} Capital, +${gaffeReward} Local Pop. The clip is #1 trending!`
      : success
        ? `The ${queueItem.target} is visibly shaken. Reporters scribble furiously. Your clip goes viral.`
        : `The Government survives another question session. Business as usual.`
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 11: DEBATE CONCLUSION & VOTING
// Ends the debate and triggers a vote on the bill.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _endDebate() — Called when all dialogue rounds are complete.
 * Stops the interval and triggers the voting phase.
 * @private
 */
function _endDebate() {
  // Stop the dialogue stream
  if (_debateState.intervalId) {
    clearInterval(_debateState.intervalId);
    _debateState.intervalId = null;
  }

  console.log("[debate.js] ═══ DEBATE CONCLUDED — VOTING PHASE ═══");

  // Push closing statement from the Speaker
  _pushSpeakerProceduralLine("closeDebate", _debateState.currentTopic);

  _fireDebateCallback("onDebateEnd", _debateState.currentTopic, getDebateSnapshot());

  // Brief pause before vote
  setTimeout(() => {
    _pushSpeakerProceduralLine("callVote", _debateState.currentTopic);
    _fireDebateCallback("onVoteStart", _debateState.currentTopic);
  }, 2000);
}

/**
 * castVote() — The player casts their vote on the bill.
 *
 * v1.0.2 HARD-MODE ENGINE:
 *   Result = (GovSeats × GovUnity) - (OppSeats × OppUnity) + PlayerInfluence
 *   - GovUnity/OppUnity fluctuate with difficulty, controversy, and news
 *   - Whip enforcement guarantees party votes but costs loyalty over time
 *   - Bills can genuinely FAIL — triggering government crisis news
 *
 * @param {string} playerVote - "aye" | "nay" | "abstain"
 * @returns {Object} Vote result
 */

// ── House Configuration Constants ──
const HOUSE_TOTAL_SEATS = 500;
const GOV_BASE_SEATS = 260;      // Slim majority (realistic Thai parliament)
const OPP_BASE_SEATS = 240;

function castVote(playerVote) {
  if (!_debateState.currentTopic) {
    return { error: "No active bill to vote on." };
  }

  const topic = _debateState.currentTopic;
  console.log(`[debate.js] ═══ VOTE CAST: Player votes ${playerVote.toUpperCase()} ═══`);

  // ── Get difficulty scaling ──
  const diffMult = (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.getDifficultyMultiplier)
    ? TPSGlobalState.getDifficultyMultiplier()  // 0=easy, 1=normal, 2=hard
    : 1;

  // ── STEP 1: Calculate Government Unity (0.0 - 1.0) ──
  // Base: 0.85 on easy, 0.75 on normal, 0.60 on hard
  let govUnity = 0.85 - (diffMult * 0.10);

  // Coalition stability modifier (from parliamentState)
  const coalStab = (parliamentState && parliamentState.coalitionStability) || 65;
  govUnity += (coalStab - 50) * 0.003;  // ±0.045 swing

  // Topic controversy reduces unity (controversial bills = more rebels)
  govUnity -= (topic.controversy / 100) * 0.12;

  // Government position modifier
  if (topic.governmentPosition === 'against') {
    govUnity -= 0.15;  // Government MPs rebel more on bills the govt opposes
  } else if (topic.governmentPosition === 'neutral') {
    govUnity -= 0.08;  // Free vote territory
  }

  // Whip enforcement bonus
  const whipActive = parliamentState && parliamentState.whipUsedThisSession;
  if (whipActive) {
    govUnity += 0.15;  // Whip locks in party votes
  }

  // Random fluctuation (±5%)
  govUnity += (Math.random() - 0.5) * 0.10;
  govUnity = Math.max(0.30, Math.min(0.98, govUnity));

  // ── STEP 2: Calculate Opposition Unity (0.0 - 1.0) ──
  let oppUnity = 0.70 + (diffMult * 0.08);  // Opposition tighter on hard

  // Topic position modifier
  if (topic.oppositionPosition === 'for') {
    oppUnity -= 0.20;  // Opposition breaks ranks to vote FOR the bill
  } else if (topic.oppositionPosition === 'neutral') {
    oppUnity -= 0.10;
  }
  // If opposition is "against" → they vote NAY with high unity (default)

  // Controversy makes opposition MORE united (rallying effect)
  oppUnity += (topic.controversy / 100) * 0.08;

  // Random fluctuation
  oppUnity += (Math.random() - 0.5) * 0.10;
  oppUnity = Math.max(0.30, Math.min(0.98, oppUnity));

  // ── STEP 3: Calculate Raw Votes ──
  // Government MPs voting AYE (if govt position is "for") or NAY (if "against")
  const govForBill = topic.governmentPosition !== 'against';
  const oppForBill = topic.oppositionPosition === 'for';

  let govAyes, govNays, oppAyes, oppNays;

  if (govForBill) {
    govAyes = Math.round(GOV_BASE_SEATS * govUnity);
    govNays = Math.round(GOV_BASE_SEATS * (1 - govUnity) * 0.7);
  } else {
    govAyes = Math.round(GOV_BASE_SEATS * (1 - govUnity) * 0.5);
    govNays = Math.round(GOV_BASE_SEATS * govUnity);
  }

  if (oppForBill) {
    oppAyes = Math.round(OPP_BASE_SEATS * oppUnity);
    oppNays = Math.round(OPP_BASE_SEATS * (1 - oppUnity) * 0.6);
  } else {
    oppAyes = Math.round(OPP_BASE_SEATS * (1 - oppUnity) * 0.4);
    oppNays = Math.round(OPP_BASE_SEATS * oppUnity);
  }

  // ── STEP 4: Player Influence ──
  // Player's political capital shifts a few votes
  const playerCapital = (parliamentState && parliamentState.playerPoliticalCapital) || 50;
  const playerInfluence = Math.round((playerCapital - 50) * 0.15);

  if (playerVote === 'aye') {
    govAyes += Math.max(0, playerInfluence);
    if (playerInfluence < 0) govNays += Math.abs(playerInfluence);
  } else if (playerVote === 'nay') {
    govNays += Math.max(0, playerInfluence);
    if (playerInfluence < 0) govAyes += Math.abs(playerInfluence);
  }

  // ── STEP 5: Final Tally ──
  let totalAyes = Math.max(0, govAyes + oppAyes);
  let totalNays = Math.max(0, govNays + oppNays);
  let totalAbstain = Math.max(0, HOUSE_TOTAL_SEATS - totalAyes - totalNays);

  // Normalize to 500 max
  const rawTotal = totalAyes + totalNays + totalAbstain;
  if (rawTotal > HOUSE_TOTAL_SEATS) {
    const scale = HOUSE_TOTAL_SEATS / rawTotal;
    totalAyes = Math.round(totalAyes * scale);
    totalNays = Math.round(totalNays * scale);
    totalAbstain = HOUSE_TOTAL_SEATS - totalAyes - totalNays;
  }
  totalAbstain = Math.max(0, totalAbstain);

  // v1.0.2: Apply modified votes from amendment resolution
  if (_debateState._modifiedVotes) {
    totalAyes = _debateState._modifiedVotes.ayes;
    totalNays = _debateState._modifiedVotes.nays;
    totalAbstain = Math.max(0, HOUSE_TOTAL_SEATS - totalAyes - totalNays);
    _debateState._modifiedVotes = null;  // Consume
  }

  const passed = totalAyes > Math.floor(HOUSE_TOTAL_SEATS / 2); // >250 = pass

  // ═══ v1.0.2: LEGISLATIVE GRIDLOCK — AMENDMENT PHASE ═══
  // If the bill FAILS by a narrow margin (≤20 votes), trigger amendment phase
  const margin = totalAyes - totalNays;
  const narrowDefeatMargin = 20;
  const isNarrowDefeat = !passed && margin >= -narrowDefeatMargin && margin < 0;

  if (isNarrowDefeat && !_debateState._amendmentResolved) {
    console.log(`[debate.js] ═══ GRIDLOCK DETECTED: margin=${margin}, triggering amendment phase ═══`);

    // Store pending vote data for resolveAmendment()
    _debateState._pendingVote = {
      topic, playerVote, totalAyes, totalNays, totalAbstain,
      govUnity, oppUnity, whipActive, playerEffect: {},
      margin, diffMult
    };

    const amendmentOptions = {
      water_down: {
        id: "water_down",
        label: "Water It Down",
        labelThai: "ลดความเข้มข้น",
        icon: "💧",
        description: "Remove the controversial clause to gain centrist votes.",
        descriptionThai: "ตัดมาตราที่เป็นข้อถกเถียงเพื่อดึงเสียงกลาง",
        tradeoff: "+30 votes from centrists, but Party Loyalty -20 and bill effectiveness halved",
        tradeoffThai: "+30 เสียงจากกลุ่มกลาง แต่ความจงรักภักดีพรรค -20 และประสิทธิภาพร่างลดครึ่ง"
      },
      push_through: {
        id: "push_through",
        label: "Refuse to Compromise",
        labelThai: "ไม่ยอมประนีประนอม",
        icon: "✊",
        description: "Stand firm. The bill fails. Suffer the political consequences.",
        descriptionThai: "ยืนหยัด ร่างตกไป รับผลทางการเมือง",
        tradeoff: "Bill is defeated. Political Capital -5, but base respects your principles (+3 Loyalty)",
        tradeoffThai: "ร่างตกไป ทุนการเมือง -5 แต่ฐานเสียงเคารพหลักการ (+3 ความจงรักภักดี)"
      },
      pork_barrel: {
        id: "pork_barrel",
        label: "Buy the Votes",
        labelThai: "ซื้อเสียง",
        icon: "💰",
        description: "Bribe the holdouts with pork barrel spending.",
        descriptionThai: "ติดสินบนผู้ลังเลด้วยงบประมาณจัดสรร",
        tradeoff: "Costs ฿80B budget, +25 votes, but 40% chance of EC Scrutiny scandal",
        tradeoffThai: "ใช้งบ ฿80,000 ล้าน +25 เสียง แต่มีโอกาส 40% ถูก กกต. สอบสวน"
      }
    };

    // Fire callback for UI to show amendment modal
    _fireDebateCallback("onAmendmentPhase", {
      topic, margin, totalAyes, totalNays,
      votesNeeded: Math.abs(margin) + 1,
      options: amendmentOptions
    });

    return {
      pending: true,
      gridlock: true,
      topicId: topic.id,
      topicTitle: topic.title,
      ayes: totalAyes,
      nays: totalNays,
      margin: margin,
      votesNeeded: Math.abs(margin) + 1,
      narrative: `⚖️ GRIDLOCK! The bill fails by only ${Math.abs(margin)} votes. An amendment phase has been triggered.`,
      options: amendmentOptions
    };
  }
  // ═══ END GRIDLOCK CHECK ═══

  // ── STEP 6: Player Vote Effects ──
  let playerEffect = {};
  const alignment = parliamentState ? parliamentState.playerAlignment : 'opposition';

  if (playerVote === 'aye' && passed) {
    playerEffect = { politicalCapital: +3 };
  } else if (playerVote === 'nay' && !passed) {
    playerEffect = { politicalCapital: +4 };
  } else if (playerVote === 'abstain') {
    playerEffect = { politicalCapital: -2 };
  } else {
    // Voted on the losing side
    playerEffect = { politicalCapital: -1 };
  }
  applyEffects(playerEffect);

  // ── STEP 7: Coalition Stability Impact ──
  if (parliamentState) {
    if (passed && topic.governmentPosition === 'for') {
      parliamentState.coalitionStability = Math.min(100,
        parliamentState.coalitionStability + 2);
    } else if (!passed && topic.governmentPosition === 'for') {
      parliamentState.coalitionStability = Math.max(0,
        parliamentState.coalitionStability - 12);
    }

    if (whipActive) {
      parliamentState.partyLoyalty = Math.max(0,
        parliamentState.partyLoyalty - 5);
      parliamentState.whipUsedThisSession = false;
    }
  }

  // ── STEP 8: Build Result ──
  const isLandslide = Math.abs(margin) > 100;
  const isNarrow = Math.abs(margin) < 30;
  const isGovCrisis = !passed && topic.governmentPosition === 'for';

  let narrative;
  if (passed && isLandslide) {
    narrative = `Landslide victory! The bill passes ${totalAyes}-${totalNays}. ${topic.governmentPosition === 'for' ? 'The government benches erupt in applause.' : 'A stunning cross-party consensus.'}`;
  } else if (passed && isNarrow) {
    narrative = `Nail-biter! The bill BARELY passes ${totalAyes}-${totalNays}. ${topic.governmentPosition === 'for' ? 'The government whips breathe a sigh of relief.' : 'The opposition nearly blocked it.'}`;
  } else if (passed) {
    narrative = `The bill passes ${totalAyes}-${totalNays}. ${topic.governmentPosition === 'for' ? 'An expected government victory.' : 'Cross-bench support carries the day.'}`;
  } else if (isGovCrisis) {
    narrative = `🚨 GOVERNMENT DEFEAT! The bill is REJECTED ${totalAyes}-${totalNays}. A humiliating loss that shakes the coalition to its foundations.`;
  } else if (!passed && isNarrow) {
    narrative = `So close! The bill fails ${totalAyes}-${totalNays}. Just ${Math.abs(margin)} votes short. ${topic.oppositionPosition === 'against' ? 'The opposition whips celebrate a tight victory.' : ''}`;
  } else {
    narrative = `The bill is DEFEATED ${totalAyes}-${totalNays}. ${topic.oppositionPosition === 'against' ? 'The opposition celebrates.' : 'A rare cross-bench rejection.'}`;
  }

  const result = {
    topicId: topic.id,
    topicTitle: topic.title,
    topicTitleThai: topic.titleThai,
    ayes: totalAyes,
    nays: totalNays,
    abstain: totalAbstain,
    passed: passed,
    playerVote: playerVote,
    playerEffect: playerEffect,
    narrative: narrative,
    margin: margin,
    isGovCrisis: isGovCrisis,
    isNarrow: isNarrow,
    isLandslide: isLandslide,
    govUnity: Math.round(govUnity * 100),
    oppUnity: Math.round(oppUnity * 100),
    whipUsed: !!whipActive,
    amended: !!_debateState._amendmentResolved  // v1.0.2: Was this amended?
  };

  _debateState.voteResult = result;

  // ── Update stats ──
  if (parliamentState) {
    parliamentState.weeklyStats.votesAttended++;
    parliamentState.totalStats.votesAttended++;
    if (passed) {
      parliamentState.totalStats.billsPassed++;
    } else {
      parliamentState.totalStats.billsDefeated++;
    }
  }

  // ── Push vote result to transcript ──
  const marginLabel = isNarrow ? '(NARROW!)' : isLandslide ? '(LANDSLIDE)' : '';
  const amendedLabel = _debateState._amendmentResolved ? ' [AMENDED]' : '';
  const voteEntry = {
    id: `vote_${Date.now()}`,
    type: "vote_result",
    speakerId: "speaker_of_house",
    speakerName: "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerAlignment: "neutral",
    speakerColor: passed ? "#28A745" : "#DC3545",
    speakerAvatar: "🗳️",
    text: `ผลการลงมติ: เห็นด้วย ${totalAyes} เสียง / ไม่เห็นด้วย ${totalNays} เสียง / งดออกเสียง ${totalAbstain} เสียง ${marginLabel}${amendedLabel} — ${passed ? "ที่ประชุมมีมติเห็นชอบ" : "ที่ประชุมมีมติไม่เห็นชอบ"}`,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(voteEntry);
  _fireDebateCallback("onDialogueAdded", voteEntry);
  _fireDebateCallback("onVoteResult", result);

  // ── Government Crisis News ──
  if (isGovCrisis && typeof publishNews === 'function') {
    publishNews('vote_defeated', {
      topic: topic.title,
      ayes: String(totalAyes),
      nays: String(totalNays)
    }, {
      sentiment: 'negative',
      pollContext: `Government crisis: ${topic.title} defeated`
    });
  }

  // ── Log ──
  logEvent("vote", `Vote: ${topic.title}`,
    `${passed ? "PASSED" : "DEFEATED"} ${totalAyes}-${totalNays}. You voted ${playerVote.toUpperCase()}.${isGovCrisis ? ' ⚠️ GOVERNMENT CRISIS' : ''}${_debateState._amendmentResolved ? ' [AMENDED]' : ''}`,
    playerEffect);

  // ── Mark debate as complete ──
  _debateState.isRunning = false;
  _debateState._amendmentResolved = false; // Reset
  _debateState._pendingVote = null;
  if (parliamentState) {
    parliamentState.isDebateInProgress = false;
  }

  console.log(`[debate.js] Vote result: ${passed ? "PASSED" : "DEFEATED"} ${totalAyes}-${Math.max(0, totalNays)}`);

  return result;
}

/**
 * resolveAmendment() — v1.0.2: Resolves a gridlock amendment choice.
 *
 * @param {string} choice - "water_down" | "push_through" | "pork_barrel"
 * @returns {Object} Final vote result (via re-calling castVote with modifications)
 */
function resolveAmendment(choice) {
  const pending = _debateState._pendingVote;
  if (!pending) {
    console.error("[debate.js] No pending amendment to resolve.");
    return { error: "No pending amendment." };
  }

  const topic = pending.topic;
  console.log(`[debate.js] ═══ AMENDMENT RESOLVED: ${choice.toUpperCase()} ═══`);

  let modifiedAyes = pending.totalAyes;
  let modifiedNays = pending.totalNays;
  let sideEffects = {};

  switch (choice) {
    case "water_down":
      // Gain centrist votes, lose hardcore base
      modifiedAyes += 30;
      modifiedNays -= 8; // Some nays switch
      sideEffects = {
        partyLoyalty: -20,
        politicalCapital: -3,
        narrative: "You strip the controversial clauses. Centrists nod. Your base simmers with resentment.",
        narrativeThai: "คุณตัดมาตราที่เป็นข้อถกเถียง กลุ่มกลางพยักหน้า แต่ฐานเสียงคุกรุ่นด้วยความไม่พอใจ"
      };
      if (parliamentState) {
        parliamentState.partyLoyalty = Math.max(0, (parliamentState.partyLoyalty || 70) - 20);
      }
      applyEffects({ politicalCapital: -3 });
      break;

    case "push_through":
      // Bill fails as-is. Principled but costly.
      sideEffects = {
        politicalCapital: -5,
        partyLoyalty: +3,
        narrative: "You refuse to bend. The bill dies on the floor. Your allies respect your conviction, but the loss stings.",
        narrativeThai: "คุณปฏิเสธที่จะยอม ร่างตายบนพื้นสภา พันธมิตรเคารพความเชื่อมั่น แต่ความพ่ายแพ้ยังเจ็บปวด"
      };
      if (parliamentState) {
        parliamentState.partyLoyalty = Math.min(100, (parliamentState.partyLoyalty || 70) + 3);
      }
      applyEffects({ politicalCapital: -5 });
      // Don't modify votes — let it fail
      _debateState._amendmentResolved = true;
      _debateState._pendingVote = null;
      // Re-call castVote to finalize (it'll skip gridlock since _amendmentResolved is true)
      return castVote(pending.playerVote);

    case "pork_barrel":
      // Buy votes with budget, risk scandal
      modifiedAyes += 25;
      modifiedNays -= 5;
      const budgetCost = 80;
      const scandalRoll = Math.random();
      const scandalTriggered = scandalRoll < 0.40;

      sideEffects = {
        budgetCost: budgetCost,
        scandalTriggered: scandalTriggered,
        narrative: scandalTriggered
          ? "You pour ฿80B into pork barrel deals. Votes secured — but a leaked document triggers an EC investigation!"
          : "You pour ฿80B into constituency projects. The holdouts quietly switch sides. No paper trail... for now.",
        narrativeThai: scandalTriggered
          ? "คุณใช้งบ ฿80,000 ล้านซื้อเสียง ได้เสียงมา — แต่เอกสารรั่วทำให้ กกต. สอบสวน!"
          : "คุณใช้งบ ฿80,000 ล้านเข้าโครงการเขตเลือกตั้ง ผู้ลังเลเปลี่ยนข้าง... ยังไม่มีหลักฐาน"
      };

      // Apply budget cost
      if (parliamentState) {
        parliamentState.budget = Math.max(0, (parliamentState.budget || 500) - budgetCost);
      }

      // Scandal consequence
      if (scandalTriggered) {
        applyEffects({ politicalCapital: -10, localPopularity: -8 });
        if (typeof publishNews === 'function') {
          publishNews('vote_defeated', {
            topic: 'EC Scrutiny: Suspicious Budget Transfers',
            ayes: '', nays: ''
          }, { sentiment: 'negative' });
        }
      }
      break;

    default:
      console.error(`[debate.js] Unknown amendment choice: "${choice}"`);
      return { error: `Unknown choice: "${choice}"` };
  }

  // Modify the pending votes and re-run
  _debateState._amendmentResolved = true;

  // Temporarily override the debate state's current tallies
  // Re-call castVote — it will use _amendmentResolved to skip gridlock
  // but we need to inject the modified votes. Use a hook:
  _debateState._modifiedVotes = {
    ayes: modifiedAyes,
    nays: modifiedNays,
    sideEffects: sideEffects
  };
  _debateState._pendingVote = null;

  const result = castVote(pending.playerVote);

  // Attach amendment metadata to result
  result.amended = true;
  result.amendmentChoice = choice;
  result.amendmentEffects = sideEffects;

  // Fire amendment result callback
  _fireDebateCallback("onAmendmentResult", {
    choice, sideEffects, result
  });

  return result;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 12: DEBATE CONTROL FUNCTIONS
// Pause, resume, stop, and query the debate state.
// ──────────────────────────────────────────────────────────────────────────

/**
 * pauseDebate() — Temporarily pauses the dialogue stream.
 */
function pauseDebate() {
  _debateState.isPaused = true;
  console.log("[debate.js] Debate paused.");
}

/**
 * resumeDebate() — Resumes a paused dialogue stream.
 */
function resumeDebate() {
  _debateState.isPaused = false;
  _debateState.playerTurnPending = false;
  console.log("[debate.js] Debate resumed.");
}

/**
 * stopDebate() — Force-stops the current debate.
 * Used for emergencies (dissolution, walkout, etc.)
 */
function stopDebate() {
  if (_debateState.intervalId) {
    clearInterval(_debateState.intervalId);
    _debateState.intervalId = null;
  }
  if (_debateState.protestCooldownTimer) {
    clearTimeout(_debateState.protestCooldownTimer);
  }

  _debateState.isRunning = false;
  _debateState.isPaused = false;

  if (parliamentState) {
    parliamentState.isDebateInProgress = false;
  }

  console.log("[debate.js] Debate force-stopped.");
  _fireDebateCallback("onDebateEnd", _debateState.currentTopic, getDebateSnapshot());
}

/**
 * getDebateSnapshot() — Returns a read-only snapshot of the current
 * debate state for the UI.
 *
 * @returns {Object} Current debate state snapshot
 */
function getDebateSnapshot() {
  return {
    isRunning: _debateState.isRunning,
    isPaused: _debateState.isPaused,
    topic: _debateState.currentTopic,
    currentSpeaker: _debateState.currentSpeaker,
    currentDialogue: _debateState.currentDialogue,
    transcript: [..._debateState.transcript],
    roundsCompleted: _debateState.roundsCompleted,
    totalRounds: _debateState.totalRounds,
    progress: _debateState.totalRounds > 0
      ? Math.round((_debateState.roundsCompleted / _debateState.totalRounds) * 100)
      : 0,
    playerTurnPending: _debateState.playerTurnPending,
    playerHasSpoken: _debateState.playerHasSpoken,
    protestCooldown: _debateState.protestCooldown,
    speakerMomentum: { ..._debateState.speakerMomentum },
    voteResult: _debateState.voteResult,
    canProtest: _debateState.isRunning
      && !_debateState.isPaused
      && !_debateState.protestCooldown
      && !_debateState.playerTurnPending
      && _debateState.currentSpeaker !== null,
    canSpeak: _debateState.playerTurnPending && !_debateState.playerHasSpoken
  };
}

/**
 * getRandomDebateTopic() — Returns a topic NOT yet used this cycle.
 * v1.0.2: Uses localStorage memory to prevent looping.
 * @returns {Object} A DEBATE_TOPICS entry
 */
function getRandomDebateTopic() {
  let usedTopics = [];
  try {
    usedTopics = JSON.parse(localStorage.getItem('tps_used_debate_topics') || '[]');
  } catch (e) { usedTopics = []; }

  // Filter out already-used topics
  let available = DEBATE_TOPICS.filter(t => !usedTopics.includes(t.id));

  // If all exhausted, reset the pool
  if (available.length === 0) {
    console.log('[debate.js] All topics exhausted — resetting pool.');
    usedTopics = [];
    available = [...DEBATE_TOPICS];
  }

  // Pick random from available
  const topic = available[Math.floor(Math.random() * available.length)];

  // Mark as used
  usedTopics.push(topic.id);
  localStorage.setItem('tps_used_debate_topics', JSON.stringify(usedTopics));

  console.log(`[debate.js] Selected topic: "${topic.id}" (${available.length - 1} remaining)`);
  return topic;
}

/**
 * getDebateTopics() — Returns all available (unused) debate topics.
 * @returns {Object[]} Array of DEBATE_TOPICS entries
 */
function getDebateTopics() {
  let usedTopics = [];
  try {
    usedTopics = JSON.parse(localStorage.getItem('tps_used_debate_topics') || '[]');
  } catch (e) { usedTopics = []; }
  const available = DEBATE_TOPICS.filter(t => !usedTopics.includes(t.id));
  return available.length > 0 ? available : [...DEBATE_TOPICS];
}

/**
 * resetDebateTopicMemory() — Clears the used topics list.
 */
function resetDebateTopicMemory() {
  localStorage.removeItem('tps_used_debate_topics');
  console.log('[debate.js] Topic memory reset.');
}

/**
 * getInterpellationTopics() — Returns all available interpellation questions.
 * @returns {Object[]} Array of INTERPELLATION_TOPICS entries
 */
function getInterpellationTopics() {
  return [...INTERPELLATION_TOPICS];
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 13: LIVE DEBATE SPEED BINDING (STEP 4)
// Listen for the settings modal's debate speed slider changes and
// dynamically restart the debate interval at the new speed.
// ──────────────────────────────────────────────────────────────────────────

window.addEventListener('tps:debate-speed-changed', (e) => {
  const speed = e.detail?.speed || 1;
  // v1.0.2: Base interval 4500ms (was 3000ms)
  const newInterval = Math.round(4500 / speed);
  console.log(`[debate.js] ⚡ Debate speed changed to ${speed}× (interval: ${newInterval}ms)`);

  // Update the internal state
  _debateState.dialogueIntervalMs = newInterval;

  // If a debate is running, restart the interval at the new speed
  if (_debateState.isRunning && _debateState.intervalId) {
    clearInterval(_debateState.intervalId);
    _debateState.intervalId = setInterval(() => {
      if (_debateState.isPaused) return;
      _advanceDialogue();
    }, newInterval);
    console.log(`[debate.js] ⚡ Dialogue stream restarted at ${newInterval}ms`);
  }
});


// ──────────────────────────────────────────────────────────────────────────
// SECTION 13.5: MID-SESSION RANDOM EVENTS (v1.0.2)
// Chaos on the parliament floor — random crises that pause the debate.
// ──────────────────────────────────────────────────────────────────────────

/**
 * MID_SESSION_EVENTS — Random crises that can erupt during debate.
 * Each has multiple response choices with different trade-offs.
 */
const MID_SESSION_EVENTS = [
  {
    id: "phone_scandal",
    title: "MP Caught in Phone Scandal",
    titleThai: "ส.ส. ถูกจับได้ดูมือถือ",
    icon: "📱",
    description: "A coalition MP is caught watching inappropriate material on their phone during a live-broadcast session. Cameras zoom in. Social media explodes.",
    descriptionThai: "ส.ส. ฝ่ายรัฐบาลถูกจับได้ว่าดูเนื้อหาไม่เหมาะสมทางมือถือระหว่างถ่ายทอดสด กล้องซูมเข้า โซเชียลระเบิด",
    choices: [
      {
        id: "defend",
        label: "Defend Them",
        labelThai: "ปกป้อง",
        icon: "🛡️",
        description: "Stand by your colleague. 'It was a family emergency.'",
        effects: { partyLoyalty: +5, localPopularity: -10, politicalCapital: -3 },
        narrative: "You defend the MP publicly. Your party appreciates the loyalty, but the public is disgusted.",
        narrativeThai: "คุณปกป้อง ส.ส. ต่อสาธารณะ พรรคชื่นชมความจงรักภักดี แต่ประชาชนขยะแขยง"
      },
      {
        id: "condemn",
        label: "Condemn on Live TV",
        labelThai: "ประณามบนทีวี",
        icon: "📺",
        description: "Publicly condemn the behavior. Distance yourself immediately.",
        effects: { partyLoyalty: -8, localPopularity: +12, politicalCapital: +5 },
        narrative: "You condemn the MP live. The public cheers your integrity. Your party is furious at the betrayal.",
        narrativeThai: "คุณประณาม ส.ส. ต่อหน้ากล้อง ประชาชนชื่นชมความซื่อสัตย์ พรรคโกรธที่ทรยศ"
      },
      {
        id: "deflect",
        label: "Change the Subject",
        labelThai: "เปลี่ยนเรื่อง",
        icon: "🔄",
        description: "Redirect attention back to the bill. 'Let's focus on what matters.'",
        effects: { politicalCapital: +2 },
        narrative: "You smoothly redirect the debate. A few notice, but the moment passes without major damage.",
        narrativeThai: "คุณเปลี่ยนเรื่องอย่างแนบเนียน บางคนสังเกต แต่ช่วงเวลานั้นผ่านไปโดยไม่เสียหายมาก"
      }
    ]
  },
  {
    id: "protest_siege",
    title: "Massive Protest Outside Parliament",
    titleThai: "ม็อบใหญ่ล้อมรัฐสภา",
    icon: "✊",
    description: "Thousands of protesters surround Parliament, blocking all exits. They demand the session be suspended and the PM come out to negotiate.",
    descriptionThai: "ผู้ประท้วงหลายพันคนล้อมรัฐสภา ปิดทางออกทั้งหมด เรียกร้องให้ระงับการประชุมและนายกฯ ออกมาเจรจา",
    choices: [
      {
        id: "suspend",
        label: "Vote to Suspend Session",
        labelThai: "โหวตระงับการประชุม",
        icon: "⏸️",
        description: "Support suspending the session to hear the people's demands.",
        effects: { localPopularity: +15, coalitionStability: -10, politicalCapital: -5 },
        narrative: "Session suspended. The protesters cheer. The government is humiliated. You're a hero to the streets.",
        narrativeThai: "ระงับการประชุม ผู้ประท้วงเฮ รัฐบาลเสียหน้า คุณเป็นฮีโร่ของท้องถนน"
      },
      {
        id: "continue",
        label: "Demand Session Continue",
        labelThai: "เรียกร้องให้ประชุมต่อ",
        icon: "⚡",
        description: "The House must not bow to mob pressure. Democracy happens inside.",
        effects: { localPopularity: -8, coalitionStability: +5, partyLoyalty: +6 },
        narrative: "You stand firm. The establishment respects your resolve. The protesters label you 'anti-people'.",
        narrativeThai: "คุณยืนหยัด ฝ่ายอนุรักษ์เคารพความมุ่งมั่น ผู้ประท้วงเรียกคุณว่า 'ต่อต้านประชาชน'"
      }
    ]
  },
  {
    id: "fistfight",
    title: "Fistfight Erupts on the Floor",
    titleThai: "ชกต่อยกลางสภา",
    icon: "🥊",
    description: "Two MPs from opposing parties come to blows after a heated exchange. The Speaker calls for order. Security rushes in.",
    descriptionThai: "ส.ส. สองคนจากฝ่ายตรงข้ามชกต่อยกันหลังโต้เถียงดุเดือด ประธานสภาเรียกร้องความสงบ เจ้าหน้าที่รักษาความปลอดภัยวิ่งเข้ามา",
    choices: [
      {
        id: "break_up",
        label: "Break Up the Fight",
        labelThai: "เข้าห้ามทัพ",
        icon: "🤝",
        description: "Physically step between them and call for calm.",
        effects: { localPopularity: +8, politicalCapital: +6 },
        narrative: "You step between the brawling MPs. Cameras capture your bravery. 'The Peacemaker' trends on Twitter.",
        narrativeThai: "คุณเข้าไปห้ามทัพ กล้องจับภาพความกล้าหาญ '#ผู้สร้างสันติ' ติดเทรนด์ทวิตเตอร์"
      },
      {
        id: "join_chaos",
        label: "Fan the Flames",
        labelThai: "เติมเชื้อไฟ",
        icon: "🔥",
        description: "Use the chaos to loudly denounce the other side.",
        effects: { localPopularity: -5, partyLoyalty: +8, politicalCapital: +3 },
        narrative: "You exploit the moment, shouting accusations at the opposing bench. Your base loves it. Moderates are horrified.",
        narrativeThai: "คุณฉวยโอกาส ตะโกนข้อกล่าวหาใส่ฝ่ายตรงข้าม ฐานเสียงชอบ กลุ่มสายกลางสยอง"
      }
    ]
  },
  {
    id: "power_outage",
    title: "Parliament Blackout",
    titleThai: "ไฟดับในรัฐสภา",
    icon: "🔌",
    description: "The power goes out mid-debate. Rumors of sabotage spread instantly. The live broadcast cuts. MPs argue in the dark about whether to continue.",
    descriptionThai: "ไฟดับกลางอภิปราย ข่าวลือเรื่องก่อวินาศกรรมแพร่กระจายทันที ถ่ายทอดสดตัด ส.ส. โต้เถียงในความมืดว่าจะประชุมต่อหรือไม่",
    choices: [
      {
        id: "conspiracy",
        label: "Accuse Sabotage",
        labelThai: "กล่าวหาก่อวินาศกรรม",
        icon: "🕵️",
        description: "Claim the government cut power to avoid the vote. Demand investigation.",
        effects: { localPopularity: +6, coalitionStability: -8, politicalCapital: +4 },
        narrative: "Your sabotage accusation goes viral. The government scrambles to deny it. Trust plummets.",
        narrativeThai: "ข้อกล่าวหาก่อวินาศกรรมแพร่กระจาย รัฐบาลรีบปฏิเสธ ความเชื่อมั่นดิ่ง"
      },
      {
        id: "calm",
        label: "Call for Patience",
        labelThai: "เรียกร้องความอดทน",
        icon: "🕯️",
        description: "Light your phone flashlight and crack a joke. Wait for power to return.",
        effects: { localPopularity: +3, politicalCapital: +2, partyLoyalty: +2 },
        narrative: "Your calm humor wins the moment. 'The MP who made Parliament laugh in the dark' trends all night.",
        narrativeThai: "อารมณ์ขันของคุณชนะช่วงเวลา '#ส.ส.ที่ทำสภาหัวเราะในความมืด' ติดเทรนด์ตลอดคืน"
      }
    ]
  },
  {
    id: "bomb_threat",
    title: "Bomb Threat Called In",
    titleThai: "โทรขู่วางระเบิด",
    icon: "💣",
    description: "Security receives a bomb threat targeting the chamber. The Speaker announces an emergency recess. Panic spreads among junior MPs.",
    descriptionThai: "รักษาความปลอดภัยได้รับแจ้งขู่วางระเบิดในห้องประชุม ประธานสภาประกาศพักฉุกเฉิน ส.ส. รุ่นเล็กตื่นตระหนก",
    choices: [
      {
        id: "stay",
        label: "Refuse to Leave",
        labelThai: "ปฏิเสธที่จะออก",
        icon: "🦁",
        description: "Stay seated. 'I will not let terrorists dictate democracy.'",
        effects: { localPopularity: +12, politicalCapital: +8, partyLoyalty: +3 },
        narrative: "Your defiance becomes iconic. The image of you alone in the chamber goes global. Bravery... or recklessness?",
        narrativeThai: "ความท้าทายของคุณกลายเป็นตำนาน ภาพคุณนั่งคนเดียวในสภาเผยแพร่ทั่วโลก กล้าหาญ... หรือบ้าบิ่น?"
      },
      {
        id: "evacuate",
        label: "Lead Orderly Evacuation",
        labelThai: "นำอพยพอย่างเป็นระเบียบ",
        icon: "🚪",
        description: "Take charge and guide junior MPs to safety calmly.",
        effects: { localPopularity: +5, politicalCapital: +4, partyLoyalty: +5 },
        narrative: "You guide 30 panicking MPs to safety. Leadership under pressure. No one was harmed.",
        narrativeThai: "คุณนำ ส.ส. 30 คนที่ตื่นตระหนกไปยังที่ปลอดภัย ภาวะผู้นำภายใต้แรงกดดัน ไม่มีใครเจ็บ"
      }
    ]
  },
  {
    id: "leaked_audio",
    title: "Leaked Audio Clip Goes Viral",
    titleThai: "คลิปเสียงหลุดแพร่กระจาย",
    icon: "🎤",
    description: "A leaked recording of a senior minister making racist remarks surfaces on social media mid-debate. Every phone in the chamber pings simultaneously.",
    descriptionThai: "คลิปเสียงรัฐมนตรีอาวุโสพูดเหยียดเชื้อชาติหลุดออกมาทางโซเชียลกลางอภิปราย มือถือทุกเครื่องในสภาดังพร้อมกัน",
    choices: [
      {
        id: "demand_resign",
        label: "Demand Resignation",
        labelThai: "เรียกร้องให้ลาออก",
        icon: "👋",
        description: "Stand up and demand the minister resign immediately.",
        effects: { localPopularity: +15, coalitionStability: -12, partyLoyalty: -5 },
        narrative: "You demand resignation on the floor. The clip plays on every news channel. The minister's career hangs by a thread.",
        narrativeThai: "คุณเรียกร้องให้ลาออกกลางสภา คลิปเล่นในทุกช่องข่าว อาชีพรัฐมนตรีห้อยอยู่บนเส้นด้าย"
      },
      {
        id: "investigate",
        label: "Call for Investigation",
        labelThai: "เรียกร้องสอบสวน",
        icon: "🔍",
        description: "Demand a formal investigation before passing judgment.",
        effects: { localPopularity: +3, politicalCapital: +5, partyLoyalty: +3 },
        narrative: "You take the measured approach. Some praise your fairness. Others accuse you of protecting the establishment.",
        narrativeThai: "คุณใช้แนวทางที่รอบคอบ บางคนชมความยุติธรรม บางคนกล่าวหาว่าปกป้องฝ่ายอำนาจ"
      },
      {
        id: "exploit",
        label: "Use It as Ammunition",
        labelThai: "ใช้เป็นกระสุน",
        icon: "💥",
        description: "Use this to derail the government's entire agenda for the week.",
        effects: { localPopularity: +8, coalitionStability: -15, politicalCapital: +10, partyLoyalty: -3 },
        narrative: "You weaponize the clip. The government's agenda collapses. Victory today — but you've made powerful enemies.",
        narrativeThai: "คุณใช้คลิปเป็นอาวุธ วาระรัฐบาลพัง ชนะวันนี้ — แต่สร้างศัตรูที่ทรงพลัง"
      }
    ]
  },

  // ═══ STEP 52: EXPANDED CHAOS EVENTS ════════════════════════════════════

  {
    id: "hot_mic_leak",
    title: "Hot Mic Leak",
    titleThai: "ไมค์หลุด",
    icon: "🎙️",
    description: "A government MP's microphone is accidentally left on, broadcasting a whispered conversation: 'Don't worry, the vote is rigged. We have the numbers bought.' The chamber freezes. The live broadcast captures everything.",
    descriptionThai: "ไมโครโฟนของ ส.ส. ฝ่ายรัฐบาลเปิดค้างโดยบังเอิญ กระจายเสียงกระซิบ: 'ไม่ต้องห่วง โหวตล็อกแล้ว ซื้อเสียงไว้หมด' ห้องประชุมเงียบกริบ ถ่ายทอดสดจับได้ทุกอย่าง",
    choices: [
      {
        id: "defend_mp",
        label: "Defend the MP",
        labelThai: "ปกป้อง ส.ส.",
        icon: "🛡️",
        description: "Claim it was taken out of context. Rally party support.",
        effects: { partyLoyalty: +8, localPopularity: -12, politicalCapital: -5 },
        narrative: "You rally to your colleague's defense: 'That was clearly a joke taken out of context.' Nobody buys it, but the party appreciates your loyalty.",
        narrativeThai: "คุณปกป้องเพื่อนร่วมพรรค: 'นั่นเป็นแค่พูดเล่นถูกตัดบริบท' ไม่มีใครเชื่อ แต่พรรคชื่นชมความจงรักภักดี"
      },
      {
        id: "condemn_mp",
        label: "Condemn and Distance",
        labelThai: "ประณามและตีตัวออกห่าง",
        icon: "📢",
        description: "Publicly condemn vote-buying. Demand an ethics investigation.",
        effects: { partyLoyalty: -10, localPopularity: +15, politicalCapital: +8 },
        narrative: "You stand at the podium: 'If this is true, it is an assault on democracy itself!' The gallery erupts in applause. Your own party stares daggers.",
        narrativeThai: "คุณยืนที่แท่น: 'ถ้าเรื่องนี้จริง มันคือการทำลายประชาธิปไตย!' ผู้ชมปรบมือ พรรคจ้องด้วยสายตาอันตราย"
      },
      {
        id: "blame_tech",
        label: "Blame Technical Glitch",
        labelThai: "โทษปัญหาเทคนิค",
        icon: "🔧",
        description: "Claim it was an AI deepfake or audio glitch. 50/50 gamble.",
        effects: { localPopularity: -3, politicalCapital: +2 },
        narrative: "You suggest the audio was manipulated. Half the press corps buys it. The other half digs deeper. A coin-flip that may haunt you later.",
        narrativeThai: "คุณชี้ว่าเสียงถูกตัดต่อ สื่อครึ่งหนึ่งเชื่อ อีกครึ่งขุดลึกกว่าเดิม เสี่ยงที่อาจตามหลอกหลอนภายหลัง"
      }
    ]
  },
  {
    id: "royal_motorcade",
    title: "Royal Motorcade Delays Session",
    titleThai: "ขบวนเสด็จทำให้ประชุมล่าช้า",
    icon: "👑",
    description: "A royal motorcade passes near Parliament, causing all roads to close. Half the MPs are stuck in traffic. The government demands a quorum count. If opposition MPs are late, the vote may pass unchallenged.",
    descriptionThai: "ขบวนเสด็จผ่านใกล้รัฐสภา ถนนปิดหมด ส.ส. ครึ่งหนึ่งติดจราจร รัฐบาลเรียกร้องนับองค์ประชุม ถ้า ส.ส.ฝ่ายค้านมาไม่ทัน โหวตอาจผ่านโดยไม่มีฝ่ายค้าน",
    choices: [
      {
        id: "stall_proceedings",
        label: "Stall for Time",
        labelThai: "ถ่วงเวลา",
        icon: "⏰",
        description: "Use procedural motions to delay the vote until your allies arrive.",
        effects: { politicalCapital: -3, localPopularity: +5, coalitionStability: -5 },
        narrative: "You file three motions in rapid succession. The Speaker is annoyed, but the delay works — your allies arrive just in time.",
        narrativeThai: "คุณยื่นญัตติ 3 เรื่องติดต่อกัน ประธานสภาหงุดหงิด แต่การถ่วงเวลาได้ผล — พวกพ้องมาถึงทันเวลาพอดี"
      },
      {
        id: "challenge_quorum",
        label: "Challenge the Quorum Count",
        labelThai: "ท้วงการนับองค์ประชุม",
        icon: "📋",
        description: "Argue the quorum count is premature and unconstitutional.",
        effects: { politicalCapital: +5, localPopularity: +3, partyLoyalty: +4 },
        narrative: "You cite Article 120 of the Constitution. The Speaker is forced to wait. Legal scholars on TV call your move 'masterful'.",
        narrativeThai: "คุณอ้างมาตรา 120 ของรัฐธรรมนูญ ประธานถูกบังคับให้รอ นักกฎหมายทางทีวีชมว่า 'เป็นเซียน'"
      },
      {
        id: "let_vote_proceed",
        label: "Let the Vote Proceed",
        labelThai: "ปล่อยให้โหวตไป",
        icon: "🗳️",
        description: "Accept the situation. Some battles aren't worth fighting.",
        effects: { politicalCapital: +2, partyLoyalty: -6, localPopularity: -5 },
        narrative: "You sit quietly. The vote proceeds with a thin chamber. Your allies who were stuck in traffic are furious at your inaction.",
        narrativeThai: "คุณนั่งเงียบ โหวตดำเนินไปด้วยสมาชิกน้อย พวกพ้องที่ติดจราจรโกรธที่คุณไม่ทำอะไร"
      }
    ]
  },
  {
    id: "foreign_diplomat_walkout",
    title: "Foreign Diplomat Walkout",
    titleThai: "ทูตต่างชาติเดินออกจากห้อง",
    icon: "🏳️",
    description: "The EU Ambassador, observing from the gallery, stands up and walks out mid-debate after a government MP makes comments dismissing human rights concerns. International media goes live.",
    descriptionThai: "เอกอัครราชทูต EU ที่สังเกตการณ์จากแกลเลอรี ลุกขึ้นเดินออกกลางอภิปราย หลัง ส.ส.รัฐบาลพูดจาดูหมิ่นสิทธิมนุษยชน สื่อต่างชาติถ่ายสด",
    choices: [
      {
        id: "apologize_publicly",
        label: "Publicly Apologize to the Diplomat",
        labelThai: "ขอโทษทูตต่อสาธารณะ",
        icon: "🤝",
        description: "Cross party lines to apologize on behalf of Parliament.",
        effects: { localPopularity: +5, partyLoyalty: -8, politicalCapital: +6, coalitionStability: -5 },
        narrative: "You walk to the gallery exit and personally apologize to the Ambassador. International praise pours in. Your party calls you a 'traitor to national sovereignty'.",
        narrativeThai: "คุณเดินไปที่ทางออกแกลเลอรีและขอโทษเอกอัครราชทูตด้วยตนเอง นานาชาติชื่นชม พรรคเรียกคุณ 'ทรยศอธิปไตยชาติ'"
      },
      {
        id: "rally_nationalism",
        label: "Rally Nationalist Sentiment",
        labelThai: "ปลุกกระแสชาตินิยม",
        icon: "🇹🇭",
        description: "'Thailand doesn't need foreign approval!' Play to the base.",
        effects: { localPopularity: +8, partyLoyalty: +10, politicalCapital: -3, coalitionStability: +5 },
        narrative: "You pound the desk: 'We are a sovereign nation! We will NOT be lectured by former colonial powers!' Your base roars. Foreign investment confidence wobbles.",
        narrativeThai: "คุณทุบโต๊ะ: 'เราเป็นชาติที่มีอำนาจอธิปไตย! เราจะไม่ถูกสั่งสอนโดยอดีตเจ้าอาณานิคม!' ฐานเสียงคำราม ความเชื่อมั่นนักลงทุนต่างชาติสั่นคลอน"
      },
      {
        id: "use_leverage",
        label: "Use as Leverage Against Government",
        labelThai: "ใช้เป็นอาวุธกดดันรัฐบาล",
        icon: "⚖️",
        description: "Demand the government apologize or face diplomatic consequences.",
        effects: { localPopularity: +3, politicalCapital: +8, coalitionStability: -10 },
        narrative: "You demand a formal government apology: 'Do you want to lose the EU trade deal over one MP's arrogance?' The PM reluctantly agrees to a statement.",
        narrativeThai: "คุณเรียกร้องให้รัฐบาลขอโทษอย่างเป็นทางการ: 'จะเสีย FTA กับ EU เพราะความอวดดีของ ส.ส. คนเดียวหรือ?' นายกฯ ยอมออกแถลงการณ์อย่างไม่เต็มใจ"
      }
    ]
  }
];

// Mid-session event tracking
let _midSessionEventCount = 0;
let _midSessionCooldown = 0;
const MID_SESSION_MAX_EVENTS = 3;  // Max per debate (expanded pool, STEP 52)
const MID_SESSION_COOLDOWN_TICKS = 3;  // Minimum ticks between events
const MID_SESSION_CHANCE = 0.05;  // 5% per tick

/**
 * _checkMidSessionEvent() — Called each dialogue tick.
 * 5% chance to trigger a random event, with cooldown and max-per-debate limits.
 * @returns {boolean} true if an event was triggered (caller should skip normal dialogue)
 * @private
 */
function _checkMidSessionEvent() {
  // Cooldown tick
  if (_midSessionCooldown > 0) {
    _midSessionCooldown--;
    return false;
  }

  // Max events per debate
  if (_midSessionEventCount >= MID_SESSION_MAX_EVENTS) return false;

  // Don't trigger in first 3 rounds or last 2 rounds
  const idx = _debateState.dialogueIndex;
  const total = _debateState.dialogueQueue.length;
  if (idx < 3 || idx > total - 2) return false;

  // Roll the dice
  if (Math.random() > MID_SESSION_CHANCE) return false;

  // Pick a random event
  const event = MID_SESSION_EVENTS[Math.floor(Math.random() * MID_SESSION_EVENTS.length)];

  console.log(`[debate.js] 🚨 MID-SESSION EVENT TRIGGERED: "${event.title}"`);

  // Pause the debate
  _debateState.isPaused = true;
  _midSessionEventCount++;
  _midSessionCooldown = MID_SESSION_COOLDOWN_TICKS;

  // Push event to transcript
  const lang = _getDebateLang();
  const eventEntry = {
    id: `mid_event_${Date.now()}`,
    type: "mid_session_event",
    speakerId: "system",
    speakerName: lang === 'th' ? "⚠️ ด่วน" : "⚠️ BREAKING",
    speakerThaiTitle: "⚠️ ด่วน",
    speakerAlignment: "neutral",
    speakerColor: "#f59e0b",
    speakerAvatar: event.icon,
    text: lang === 'th' ? (event.descriptionThai || event.description) : event.description,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(eventEntry);
  _fireDebateCallback("onDialogueAdded", eventEntry);

  // Fire event callback for UI — STEP 52: include lang-resolved fields
  const resolvedChoices = event.choices.map(c => ({
    ...c,
    displayLabel: lang === 'th' ? (c.labelThai || c.label) : c.label,
    displayDesc: lang === 'th' ? (c.descriptionThai || c.description) : c.description
  }));

  _fireDebateCallback("onMidSessionEvent", {
    ...event,
    displayTitle: lang === 'th' ? (event.titleThai || event.title) : event.title,
    displayDesc: lang === 'th' ? (event.descriptionThai || event.description) : event.description,
    resolvedChoices: resolvedChoices,
    lang: lang
  });

  return true;
}

/**
 * resolveMidSessionEvent() — Player resolves a mid-session event by choosing a response.
 * @param {string} eventId — The event ID
 * @param {string} choiceId — The chosen response ID
 * @returns {Object} Result of the choice
 */
function resolveMidSessionEvent(eventId, choiceId) {
  const event = MID_SESSION_EVENTS.find(e => e.id === eventId);
  if (!event) return { error: `Unknown event: "${eventId}"` };

  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) return { error: `Unknown choice: "${choiceId}"` };

  console.log(`[debate.js] 🚨 Mid-session event resolved: "${event.title}" → "${choice.label}"`);

  // Apply effects
  applyEffects(choice.effects);

  // Push resolution to transcript
  const lang = _getDebateLang();
  const resolutionEntry = {
    id: `mid_resolve_${Date.now()}`,
    type: "mid_session_resolution",
    speakerId: "player",
    speakerName: (parliamentState && parliamentState.playerName) || "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerAlignment: parliamentState ? parliamentState.playerAlignment : "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: choice.icon,
    text: lang === 'th' ? (choice.narrativeThai || choice.narrative) : choice.narrative,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(resolutionEntry);
  _fireDebateCallback("onDialogueAdded", resolutionEntry);

  // Publish news
  if (typeof publishNews === 'function') {
    const playerName = (parliamentState && parliamentState.playerName) || 'Player';
    const isPositive = (choice.effects.localPopularity || 0) > 0;
    publishNews(isPositive ? 'speech_success' : 'speech_fail', {
      player: playerName,
      style: event.title,
      target: ''
    }, { sentiment: isPositive ? 'positive' : 'negative' });
  }

  // Log — STEP 52: bilingual title/narrative
  const displayTitle = lang === 'th' ? (event.titleThai || event.title) : event.title;
  const displayNarrative = lang === 'th' ? (choice.narrativeThai || choice.narrative) : choice.narrative;
  const displayChoiceLabel = lang === 'th' ? (choice.labelThai || choice.label) : choice.label;
  logEvent("mid_session", displayTitle, displayNarrative, choice.effects);

  // Resume debate after a brief pause
  setTimeout(() => {
    _debateState.isPaused = false;
    console.log("[debate.js] Debate resumed after mid-session event.");
  }, 1500);

  return {
    success: true,
    eventTitle: displayTitle,
    eventTitleEN: event.title,
    eventTitleTH: event.titleThai || event.title,
    choiceLabel: displayChoiceLabel,
    choiceLabelEN: choice.label,
    choiceLabelTH: choice.labelThai || choice.label,
    effects: choice.effects,
    narrative: displayNarrative
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 13B: INTERPELLATION SHOWDOWN (STEP 50)
// When a queued interpellation triggers mid-debate, the player faces
// a high-stakes rhetorical mini-game with 3 strategic choices.
// ──────────────────────────────────────────────────────────────────────────

// Showdown tracking
let _interpShowdownCooldown = 0;
const INTERP_SHOWDOWN_CHANCE = 0.10;  // 10% per tick
const INTERP_SHOWDOWN_COOLDOWN_TICKS = 5;  // Minimum ticks between showdowns

/**
 * INTERPELLATION_SHOWDOWN_STANCES — The 3 strategic choices available
 * during an Interpellation Showdown. Each has bilingual labels and
 * distinct risk/reward profiles.
 */
const INTERPELLATION_SHOWDOWN_STANCES = {
  aggressive: {
    id: "aggressive",
    labelEN: "Aggressive Attack",
    labelTH: "โจมตีดุดัน",
    descEN: "Go for the throat. Demand specifics, ridicule evasion. High risk — the Speaker may reprimand you.",
    descTH: "เปิดฉากโจมตี เรียกร้องข้อมูล เยาะเย้ยการบ่ายเบี่ยง เสี่ยงสูง — ประธานอาจตำหนิ",
    icon: "🔥",
    effects: {
      success: { localPopularity: +15, politicalCapital: +8 },
      failure: { politicalCapital: -10, localPopularity: -3 }
    },
    baseSuccessRate: 35  // Hard — modified by question difficulty
  },
  evidence: {
    id: "evidence",
    labelEN: "Evidence-Based Prosecution",
    labelTH: "งัดหลักฐานตอกกลับ",
    descEN: "Present documents, data, and legal citations. Costs Political Capital (-5) but guarantees credibility.",
    descTH: "นำเสนอเอกสาร ข้อมูล และข้อกฎหมาย ใช้ทุนการเมือง (-5) แต่รับประกันความน่าเชื่อถือ",
    icon: "📋",
    capitalCost: 5,  // Spend capital upfront
    effects: {
      success: { influence: +10, localPopularity: +5, politicalCapital: +3 },
      failure: { localPopularity: +2, politicalCapital: -2 }
    },
    baseSuccessRate: 70  // Reliable but requires capital investment
  },
  diplomatic: {
    id: "diplomatic",
    labelEN: "Diplomatic Questioning",
    labelTH: "ถามนำแบบประนีประนอม",
    descEN: "Ask pointed but polite questions. Safe — builds political capital regardless of outcome.",
    descTH: "ถามคมแต่สุภาพ ปลอดภัย — สร้างทุนการเมืองไม่ว่าผลจะเป็นอย่างไร",
    icon: "🤝",
    effects: {
      success: { politicalCapital: +5, localPopularity: +3 },
      failure: { politicalCapital: +2 }
    },
    baseSuccessRate: 85  // Safe option
  }
};

/**
 * Showdown narrative lines — bilingual, randomized per outcome.
 */
const INTERP_SHOWDOWN_NARRATIVES = {
  aggressive: {
    success: {
      en: [
        "The Minister's face turns white. The opposition benches erupt. Social media is ON FIRE.",
        "You slam the evidence on the podium. The Minister is speechless. Camera shutters go wild.",
        "The gallery gasps as the Minister fumbles for words. Your clip will lead the evening news."
      ],
      th: [
        "หน้ารัฐมนตรีซีดเผือก ฝ่ายค้านส่งเสียงดังลั่น โซเชียลระเบิด",
        "คุณฟาดหลักฐานลงบนแท่น รัฐมนตรีอ้ำอึ้ง เสียงชัตเตอร์กล้องดังไม่หยุด",
        "ผู้ชมในแกลเลอรีอึ้ง รัฐมนตรีพูดตะกุกตะกัก คลิปคุณจะเป็นข่าวเด่นเย็นนี้"
      ]
    },
    failure: {
      en: [
        "The Speaker slams the gavel: 'The member will withdraw that remark!' You've gone too far.",
        "The Minister fires back with a devastating rebuttal. The government benches roar with laughter.",
        "Your aggressive tone backfires. Even your own party allies wince. The Speaker issues a warning."
      ],
      th: [
        "ประธานเคาะค้อน: 'ขอให้สมาชิกถอนคำพูด!' คุณไปไกลเกินไป",
        "รัฐมนตรีตอบโต้อย่างรุนแรง ฝ่ายรัฐบาลหัวเราะลั่น",
        "น้ำเสียงดุดันของคุณย้อนกลับมาทำร้ายตัวเอง แม้แต่พรรคพวกยังเบ้หน้า ประธานตักเตือน"
      ]
    }
  },
  evidence: {
    success: {
      en: [
        "You produce a classified budget document. The Minister's own numbers contradict his statement. Checkmate.",
        "Your 12-page analysis leaves no room for doubt. MPs on both sides nod reluctantly. The data speaks.",
        "The NACC audit trail you present forces the Minister into an awkward 'I will look into it' retreat."
      ],
      th: [
        "คุณชูเอกสารงบประมาณลับ ตัวเลขของรัฐมนตรีเองขัดแย้งกับคำพูด รุกฆาต",
        "รายงานวิเคราะห์ 12 หน้าไม่เหลือที่สงสัย ส.ส.ทั้งสองฝ่ายพยักหน้าอย่างไม่เต็มใจ ข้อมูลพูดเอง",
        "หลักฐานตรวจสอบจาก ป.ป.ช. ที่คุณนำเสนอ บังคับให้รัฐมนตรีถอยด้วย 'จะไปตรวจสอบดู'"
      ]
    },
    failure: {
      en: [
        "The Minister's team was prepared. They counter every document with their own data. A draw at best.",
        "Your evidence is solid, but the Minister's spin doctors reframe the narrative. The moment passes."
      ],
      th: [
        "ทีมของรัฐมนตรีเตรียมมาดี ตอบโต้ทุกเอกสารด้วยข้อมูลของตน อย่างดีก็เสมอ",
        "หลักฐานคุณแน่น แต่ทีมประชาสัมพันธ์ของรัฐมนตรีบิดเรื่องราว โมเมนต์ผ่านไป"
      ]
    }
  },
  diplomatic: {
    success: {
      en: [
        "Your measured questioning earns respect from both sides. Even government MPs murmur approval.",
        "The Minister answers honestly, caught off guard by your reasonable tone. Progress is made."
      ],
      th: [
        "คำถามอย่างสุขุมของคุณได้รับความเคารพจากทั้งสองฝ่าย แม้ ส.ส.รัฐบาลยังพึมพำชื่นชม",
        "รัฐมนตรีตอบอย่างตรงไปตรงมา ถูกจับทางด้วยน้ำเสียงที่เป็นเหตุเป็นผล มีความคืบหน้า"
      ]
    },
    failure: {
      en: [
        "The Minister deflects with a practiced smile. Your polite approach didn't break through, but no damage done.",
        "A safe exchange. The gallery yawns. But you've maintained your reputation as a reasonable voice."
      ],
      th: [
        "รัฐมนตรีบ่ายเบี่ยงด้วยรอยยิ้มที่ฝึกมา วิธีสุภาพไม่ทะลุ แต่ไม่เสียหาย",
        "แลกเปลี่ยนที่ปลอดภัย ผู้ชมหาว แต่คุณรักษาชื่อเสียงเป็นเสียงที่มีเหตุผล"
      ]
    }
  }
};

/**
 * _checkInterpellationShowdown() — Called each dialogue tick.
 * 10% chance to trigger if there are pending interpellations in the queue.
 * @returns {boolean} true if showdown was triggered
 * @private
 */
function _checkInterpellationShowdown() {
  // Cooldown tick
  if (_interpShowdownCooldown > 0) {
    _interpShowdownCooldown--;
    return false;
  }

  // Must have queued interpellations
  if (!parliamentState || !parliamentState.interpellationQueue) return false;
  const pending = parliamentState.interpellationQueue.filter(q => q.status === 'pending');
  if (pending.length === 0) return false;

  // Don't trigger in first 4 or last 2 rounds
  const idx = _debateState.dialogueIndex;
  const total = _debateState.dialogueQueue.length;
  if (idx < 4 || idx > total - 2) return false;

  // Roll the dice (10%)
  if (Math.random() > INTERP_SHOWDOWN_CHANCE) return false;

  // Pick the first pending interpellation
  const interp = pending[0];
  interp.status = 'triggered';

  console.log(`[debate.js] ⚡ INTERPELLATION SHOWDOWN TRIGGERED: "${interp.question.substring(0, 50)}..."`);

  // Pause the debate
  _debateState.isPaused = true;
  _interpShowdownCooldown = INTERP_SHOWDOWN_COOLDOWN_TICKS;

  // Store active showdown
  _debateState._activeInterpShowdown = interp;

  // Push dramatic announcement to transcript
  const lang = _getDebateLang();
  const announceEntry = {
    id: `interp_showdown_${Date.now()}`,
    type: "interpellation_showdown",
    speakerId: "speaker_of_house",
    speakerName: lang === 'th' ? "ประธานสภา" : "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerAlignment: "neutral",
    speakerColor: "#f59e0b",
    speakerAvatar: "⚖️",
    text: lang === 'th'
      ? `ขอเชิญท่านสมาชิกตั้งกระทู้ถามสด — ถาม${interp.target}`
      : `The House recognizes the member for a Live Interpellation — Questioning the ${interp.target}`,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(announceEntry);
  _fireDebateCallback("onDialogueAdded", announceEntry);

  // Fire showdown callback for UI
  _fireDebateCallback("onInterpellationShowdown", {
    interpellation: interp,
    stances: INTERPELLATION_SHOWDOWN_STANCES
  });

  return true;
}

/**
 * resolveInterpellationShowdown() — Player chooses their rhetorical strategy.
 * Applies stat changes, pushes narrative to transcript, publishes news, resumes debate.
 *
 * @param {string} stanceId — "aggressive" | "evidence" | "diplomatic"
 * @returns {Object} Showdown result
 */
function resolveInterpellationShowdown(stanceId) {
  const interp = _debateState._activeInterpShowdown;
  if (!interp) return { error: "No active interpellation showdown." };

  const stance = INTERPELLATION_SHOWDOWN_STANCES[stanceId];
  if (!stance) return { error: `Unknown stance: "${stanceId}"` };

  const lang = _getDebateLang();
  console.log(`[debate.js] ⚡ SHOWDOWN RESOLVED: stance="${stance.labelEN}"`);

  // Deduct upfront capital cost (Evidence-Based)
  if (stance.capitalCost && parliamentState) {
    parliamentState.playerPoliticalCapital = Math.max(0,
      (parliamentState.playerPoliticalCapital || 50) - stance.capitalCost);
    console.log(`  → Capital cost: -${stance.capitalCost} (now ${parliamentState.playerPoliticalCapital})`);
  }

  // Calculate success (modified by question difficulty)
  let successChance = stance.baseSuccessRate;
  const difficultyPenalty = (interp.difficulty - 50) * 0.3;
  successChance -= difficultyPenalty;

  // Political Capital bonus
  const capBonus = ((parliamentState?.playerPoliticalCapital || 50)) * 0.12;
  successChance += capBonus;
  successChance = Math.max(10, Math.min(95, successChance));

  const roll = Math.random() * 100;
  const success = roll < successChance;

  console.log(`  → Chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)} → ${success ? "SUCCESS ✅" : "FAIL ❌"}`);

  // Apply effects
  const effects = success ? { ...stance.effects.success } : { ...stance.effects.failure };
  applyEffects(effects);

  // Pick narrative
  const narratives = INTERP_SHOWDOWN_NARRATIVES[stanceId];
  const pool = success
    ? (narratives.success[lang] || narratives.success.en)
    : (narratives.failure[lang] || narratives.failure.en);
  const narrative = pool[Math.floor(Math.random() * pool.length)];

  // Push question to transcript
  const questionEntry = {
    id: `showdown_q_${Date.now()}`,
    type: "interpellation_question",
    speakerId: "player",
    speakerName: (parliamentState?.playerName) || "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerAlignment: parliamentState?.playerAlignment || "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: stance.icon,
    text: lang === 'th' ? (interp.questionThai || interp.question) : interp.question,
    protestable: false,
    timestamp: Date.now()
  };

  // Push outcome to transcript
  const outcomeEntry = {
    id: `showdown_result_${Date.now()}`,
    type: "interpellation_outcome",
    speakerId: "system",
    speakerName: success
      ? (lang === 'th' ? "⚡ สำเร็จ" : "⚡ DEVASTATING")
      : (lang === 'th' ? "❌ พลาด" : "❌ DEFLECTED"),
    speakerThaiTitle: "",
    speakerAlignment: "neutral",
    speakerColor: success ? "#22c55e" : "#ef4444",
    speakerAvatar: success ? "💥" : "🛡️",
    text: narrative,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(questionEntry);
  _debateState.transcript.push(outcomeEntry);
  _fireDebateCallback("onDialogueAdded", questionEntry);
  _fireDebateCallback("onDialogueAdded", outcomeEntry);

  // Mark interpellation as answered
  interp.status = "answered";
  interp.answeredAt = Date.now();
  interp.result = success ? "showdown_success" : "showdown_fail";

  // Update stats
  if (parliamentState) {
    parliamentState.weeklyStats.interpellationsFiled++;
    parliamentState.totalStats.interpellationsFiled++;
  }

  // Clear active showdown
  _debateState._activeInterpShowdown = null;

  // Publish news
  if (typeof publishNews === 'function') {
    const playerName = (parliamentState?.playerName) || 'Player';
    publishNews(success ? 'interpellation_success' : 'interpellation_fail', {
      player: playerName,
      target: interp.target
    }, { sentiment: success ? 'positive' : 'negative' });
  }

  // Log event
  logEvent("interpellation_showdown",
    `Showdown: ${interp.target}`,
    narrative,
    effects);

  // Fire result callback
  _fireDebateCallback("onInterpellationResult", {
    success, stanceId, stanceLabel: lang === 'th' ? stance.labelTH : stance.labelEN,
    interpellation: interp, effects, narrative
  });

  // Resume debate after dramatic pause
  setTimeout(() => {
    _debateState.isPaused = false;
    console.log("[debate.js] Debate resumed after interpellation showdown.");
  }, 2000);

  return {
    success,
    stanceId,
    stanceLabel: lang === 'th' ? stance.labelTH : stance.labelEN,
    target: interp.target,
    effects,
    narrative,
    capitalCost: stance.capitalCost || 0
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 14: MODULE INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/debate.js] Live Debate Engine loaded. (v1.0.2)");
console.log(`  → ${DEBATE_TOPICS.length} debate topics defined`);
console.log(`  → ${AI_SPEAKERS.length} AI speakers (${AI_SPEAKERS.filter(s=>s.alignment==="government").length} Gov / ${AI_SPEAKERS.filter(s=>s.alignment==="opposition").length} Opp)`);
console.log(`  → ${PROTEST_REASONS.length} protest reasons`);
console.log(`  → ${INTERPELLATION_TOPICS.length} interpellation topics`);
console.log(`  → ${Object.keys(PLAYER_SPEECH_STANCES).length} player speech stances`);
console.log(`  → ${Object.keys(EXTRA_DIALOGUE_BANK).length} extra dialogue banks`);
console.log(`  → ${Object.keys(DIALOGUE_ARCHETYPES).length} dialogue archetypes (STEP 51: aggressive/technical/filler)`);
console.log(`  → ${MID_SESSION_EVENTS.length} mid-session random events`);
console.log("  → runDebate(), raiseProtest(), playerSpeak() ready");
console.log("  → queueInterpellation(), resolveInterpellation() ready");
console.log("  → resolveAmendment(), resolveMidSessionEvent() ready");
console.log("  → resolveInterpellationShowdown() ready (STEP 50)");
console.log("  → Live debate speed binding active (tps:debate-speed-changed)");
console.log("═══════════════════════════════════════════════════════════");
