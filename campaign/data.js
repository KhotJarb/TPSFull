// ═══════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /campaign/data.js
// Campaign Module: Parties, Game State, MP Generation, Map Data
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// SECTION 1: POLITICAL PARTIES & BASE STATS
// 5 fictionalized Thai parties spanning the political spectrum
// ──────────────────────────────────────────────────────────────────

const CAMPAIGN_PARTIES = [
  {
    id: "khana_pracharat",
    name: "Khana Pracharat Party",
    shortName: "KPR",
    thaiName: "พรรคคณะประชารัฐ",
    color: "#FF6B2B",
    colorLight: "rgba(255,107,43,0.15)",
    ideology: "progressive",
    leader: "Thanawat Siripong",
    description: "A youth-driven progressive party demanding constitutional reform, military accountability, and digital freedoms. Dominates urban centers and university towns. Their idealism inspires millions but terrifies the establishment.",
    slogan: "ปฏิรูปเพื่ออนาคต — Reform for the Future",
    basePopularity: 28,
    partyListStrength: 35,
    regionalStrength: {
      bangkok: 40, central: 25, north: 30, northeast: 20, east: 25, west: 20, south: 10
    },
    banYaiNetwork: 5,
    ioStrength: 40,
    campaignFunds: 800,
    traits: ["urban_base", "social_media_savvy", "youth_appeal", "anti_establishment"]
  },
  {
    id: "phak_pracha_niyom",
    name: "Pracha Niyom Party",
    shortName: "PNP",
    thaiName: "พรรคประชานิยม",
    color: "#E63946",
    colorLight: "rgba(230,57,70,0.15)",
    ideology: "populist",
    leader: "Siriporn Wongsuwan",
    description: "The spiritual successor of Thailand's populist legacy. Champions rice subsidies, village funds, and mega-infrastructure. Controls the rural Northeast through deep grassroots networks and the loyalty of millions who remember the golden era of populism.",
    slogan: "เพื่อประชาชน — For the People",
    basePopularity: 30,
    partyListStrength: 28,
    regionalStrength: {
      bangkok: 15, central: 25, north: 35, northeast: 45, east: 20, west: 20, south: 10
    },
    banYaiNetwork: 30,
    ioStrength: 25,
    campaignFunds: 1500,
    traits: ["rural_machine", "isan_dominance", "patronage_network", "big_spending"]
  },
  {
    id: "palang_ratthaniyom",
    name: "Palang Ratthaniyom Party",
    shortName: "PRP",
    thaiName: "พรรคพลังรัฐนิยม",
    color: "#1D3557",
    colorLight: "rgba(29,53,87,0.15)",
    ideology: "royalist",
    leader: "General Kritsada Buranasiri",
    description: "The establishment party, backed by military brass, the palace network, and the Bangkok elite. Defends monarchy, nation, and religion at all costs. Their candidates are hand-picked generals, senior bureaucrats, and loyal royalists.",
    slogan: "ชาติ ศาสน์ กษัตริย์ — Nation, Religion, Monarchy",
    basePopularity: 18,
    partyListStrength: 15,
    regionalStrength: {
      bangkok: 20, central: 30, north: 10, northeast: 10, east: 25, west: 30, south: 35
    },
    banYaiNetwork: 35,
    ioStrength: 20,
    campaignFunds: 2000,
    traits: ["military_backed", "establishment", "deep_south_presence", "unlimited_funds"]
  },
  {
    id: "setthakij_thai",
    name: "Setthakij Thai Party",
    shortName: "STK",
    thaiName: "พรรคเศรษฐกิจไทย",
    color: "#2A9D8F",
    colorLight: "rgba(42,157,143,0.15)",
    ideology: "centrist",
    leader: "Anutin Charoensri",
    description: "A centrist party of pragmatic dealmakers, provincial bosses, and business tycoons. They will join any coalition for the right price. Masters of Ban Yai politics — their local strongmen deliver entire provinces on election day.",
    slogan: "เศรษฐกิจดี ชีวิตดี — Good Economy, Good Life",
    basePopularity: 14,
    partyListStrength: 12,
    regionalStrength: {
      bangkok: 10, central: 25, north: 20, northeast: 15, east: 30, west: 25, south: 15
    },
    banYaiNetwork: 45,
    ioStrength: 10,
    campaignFunds: 1200,
    traits: ["kingmaker", "ban_yai_masters", "coalition_flexible", "business_friendly"]
  },
  {
    id: "pak_tai_ruamjai",
    name: "Pak Tai Ruamjai Party",
    shortName: "PTR",
    thaiName: "พรรคปักษ์ใต้ร่วมใจ",
    color: "#457B9D",
    colorLight: "rgba(69,123,157,0.15)",
    ideology: "regional",
    leader: "Wiroj Phanphruk",
    description: "Champions the deep south and upper southern Thailand. Advocates for regional autonomy, rubber and palm oil subsidies, bilingual education, and special economic zones. A critical kingmaker whose 40-60 seats can make or break any government.",
    slogan: "ใต้ร่วมใจ พัฒนาถิ่น — Southern Unity, Local Growth",
    basePopularity: 10,
    partyListStrength: 10,
    regionalStrength: {
      bangkok: 5, central: 5, north: 5, northeast: 5, east: 10, west: 10, south: 45
    },
    banYaiNetwork: 25,
    ioStrength: 8,
    campaignFunds: 600,
    traits: ["southern_stronghold", "rubber_lobby", "muslim_community", "autonomy_platform"]
  }
];

// Total seats: 500 (400 constituency + 100 party-list)
const TOTAL_SEATS = 500;
const CONSTITUENCY_SEATS = 400;
const PARTY_LIST_SEATS = 100;
const MAJORITY_THRESHOLD = 251;

// ──────────────────────────────────────────────────────────────────
// SECTION 2: CAMPAIGN GAME STATE
// ──────────────────────────────────────────────────────────────────

const INITIAL_CAMPAIGN_STATE = {
  currentWeek: 1,
  maxWeeks: 8,
  electionYear: 2027,
  playerPartyId: "khana_pracharat",  // default; player chooses at start

  // Player resources
  playerFunds: 1000,       // in millions of Baht
  playerScrutiny: 0,       // 0-100: media/legal scrutiny (high = risk of disqualification)
  actionPointsPerWeek: 3,  // actions available each week
  actionPointsRemaining: 3,

  // Campaign metrics
  nationalPollShare: {},   // partyId → percentage (calculated)
  districtResults: {},     // districtId → { winnerId, scores: { partyId: score } }
  constituencySeats: {},   // partyId → seat count (after election)
  partyListSeats: {},      // partyId → seat count (after election)
  totalSeats: {},          // partyId → total seats

  // Coalition
  coalitionPartners: [],   // array of partyId
  coalitionSeats: 0,

  // Campaign log
  campaignLog: [],
  weeklyActions: [],       // actions taken this week

  // Flags
  electionHeld: false,
  coalitionFormed: false,
  gameResult: null         // "victory" | "opposition" | null
};

var campaignState = null;

function initCampaignState(playerPartyId) {
  campaignState = JSON.parse(JSON.stringify(INITIAL_CAMPAIGN_STATE));
  if (playerPartyId) campaignState.playerPartyId = playerPartyId;

  // Initialize poll shares from base popularity
  CAMPAIGN_PARTIES.forEach(p => {
    campaignState.nationalPollShare[p.id] = p.basePopularity;
    campaignState.constituencySeats[p.id] = 0;
    campaignState.partyListSeats[p.id] = 0;
    campaignState.totalSeats[p.id] = 0;
  });

  // Generate MPs for all parties
  generateAllPartyMPs();
  return campaignState;
}

// ──────────────────────────────────────────────────────────────────
// SECTION 3: THAI NAME GENERATION
// Realistic romanized Thai names (official English transliteration)
// ──────────────────────────────────────────────────────────────────

const THAI_FIRST_NAMES_MALE = [
  "Somchai","Somsak","Surachai","Prasert","Wichai","Narong","Sompong","Suchart",
  "Preecha","Boonlert","Thawatchai","Kittisak","Wisanu","Pongsakorn","Anurak",
  "Chaiyaporn","Nattapong","Thanakorn","Panupong","Sirawit","Wachirawit","Ekachai",
  "Krisada","Ratchanon","Supachai","Teerawat","Apichart","Chatchai","Damrong",
  "Kriangsak","Phichet","Rangsan","Santi","Tavee","Udom","Weerasak","Wirat",
  "Yutthana","Anon","Bundit","Chalerm","Decha","Kraiwit","Montri","Noppadon",
  "Patchara","Sarawut","Thepparat","Jakraphan","Kittikhun","Methee","Natthawut",
  "Patiphan","Rungroj","Sakda","Setthasit","Thanapol","Wattana","Worrawut",
  "Akkarawat","Boonrit","Chaiwat","Kanchit","Niphon","Phakphum","Sathit",
  "Thawee","Uthen","Winai","Arthit","Boonsong","Chana","Karun","Manop"
];

const THAI_FIRST_NAMES_FEMALE = [
  "Somying","Suda","Nittaya","Wilai","Pranee","Mayuree","Supaporn","Sasithorn",
  "Jintana","Kannika","Ladda","Narumon","Orn-anong","Patcharee","Ratchanee",
  "Siriporn","Thidarat","Urai","Wanida","Anchana","Bussaba","Chutima",
  "Daranee","Hathaichanok","Jariya","Kamonrat","Laddawan","Monthira","Nanthana",
  "Orathai","Phisamai","Rattana","Saithip","Tasanee","Usanee","Wanna",
  "Yaowalak","Achara","Benchawan","Chantra","Duangporn","Inthira","Kanjana",
  "Malai","Nopparat","Patcharin","Raweewan","Savitree","Thippawan","Waraporn",
  "Aranya","Boonyuen","Chanpen","Duangjit","Jutamas","Kwanjai","Maliwan",
  "Noppawan","Pensri","Rungrat","Sirilak","Tassanee","Wanthani","Yuphin"
];

const THAI_LAST_NAMES = [
  "Wongsawat","Srisawat","Charoensuk","Phanphruk","Buranasiri","Thonglor",
  "Jantarakul","Kanchanadul","Limcharoen","Ngamwongwan","Petcharat","Rattanaporn",
  "Singhanat","Thammasat","Udomsap","Vivatsiri","Wattanawong","Yingthai",
  "Anukulkit","Bunditkul","Chairungsi","Dangprasert","Intaraprasit","Junlaphan",
  "Kittisunthorn","Lertvilai","Maneekhao","Noosuk","Onlamai","Phanthong",
  "Raktham","Saengmani","Thongprasert","Wichitchai","Chenphon","Detphirom",
  "Hongsawat","Itsarangkun","Kaewkamnerd","Luecha","Nakpradit","Phromlikhit",
  "Roengsumran","Saetang","Siriwattana","Tanpradit","Uayporn","Wasuthon",
  "Chotikul","Duangkaew","Hiransombat","Kaewboonruang","Maneerat","Noparatnak",
  "Patcharapon","Rungruang","Suthisarn","Thamrongthanyawong","Worasit",
  "Ariyapruchya","Bhavilai","Chailert","Dechthai","Kraisorn","Pitaktham",
  "Sethapramote","Thanomsin","Yodsaenklai","Kitpreedaborisut","Prawatmuang",
  "Jirawattanapon","Kasemsan","Lertsirimitr","Phasukvanich","Chakrabandhu",
  "Kridakon","Punyashthiti","Somprasong","Tanthuwanit","Vajiralongkorn_NOT"
];

// Remove the joke entry
THAI_LAST_NAMES[THAI_LAST_NAMES.length - 1] = "Vatcharapijarn";

const THAI_NICKNAMES = [
  "Nong","Pee","Aom","Bam","Boom","Dang","Fon","Golf","Ice","Joy",
  "Kai","Lek","Moo","Nok","Oat","Pun","Rose","Som","Tai","View",
  "Wan","Yai","Arm","Bank","Boss","Cream","Dome","Earth","Film","Gun",
  "Hong","Ink","Jazz","Kong","Lucky","Mind","Net","Oak","Palm","Quiz"
];

var _mpIdCounter = 0;

/**
 * Generates a random realistic Thai name
 * @returns {{ fullName: string, firstName: string, lastName: string, nickname: string, gender: string }}
 */
function generateThaiName() {
  const gender = Math.random() > 0.7 ? "female" : "male";
  const pool = gender === "male" ? THAI_FIRST_NAMES_MALE : THAI_FIRST_NAMES_FEMALE;
  const firstName = pool[Math.floor(Math.random() * pool.length)];
  const lastName = THAI_LAST_NAMES[Math.floor(Math.random() * THAI_LAST_NAMES.length)];
  const nickname = THAI_NICKNAMES[Math.floor(Math.random() * THAI_NICKNAMES.length)];
  return {
    fullName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    nickname,
    gender
  };
}

// ──────────────────────────────────────────────────────────────────
// SECTION 4: MP AUTO-GENERATION & ROSTER MANAGEMENT
// Generates 500 MP slots per party, each with portrait URL
// ──────────────────────────────────────────────────────────────────

// Global MP registry: partyId → MP[]
var partyRosters = {};

/**
 * Generates a single MP object
 */
function generateMP(partyId, slotIndex) {
  _mpIdCounter++;
  const name = generateThaiName();
  const mpId = `${partyId}_mp_${_mpIdCounter}`;
  const seed = encodeURIComponent(name.fullName + _mpIdCounter);

  return {
    id: mpId,
    partyId: partyId,
    slotIndex: slotIndex,
    name: name.fullName,
    firstName: name.firstName,
    lastName: name.lastName,
    nickname: name.nickname,
    gender: name.gender,
    portraitUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    age: Math.floor(Math.random() * 35) + 30, // 30-64
    experience: Math.floor(Math.random() * 5),  // 0-4 terms served
    localInfluence: Math.floor(Math.random() * 60) + 20, // 20-79
    charisma: Math.floor(Math.random() * 60) + 20,
    assignedDistrictId: null,  // set during candidate assignment
    isEdited: false            // tracks if player has customized this MP
  };
}

/**
 * Generates 500 MP objects for one party
 */
function generatePartyRoster(partyId) {
  const roster = [];
  for (let i = 0; i < TOTAL_SEATS; i++) {
    roster.push(generateMP(partyId, i));
  }
  partyRosters[partyId] = roster;
  return roster;
}

/**
 * Generates rosters for ALL parties
 */
function generateAllPartyMPs() {
  _mpIdCounter = 0;
  CAMPAIGN_PARTIES.forEach(party => {
    generatePartyRoster(party.id);
  });
}

/**
 * Gets the player's roster
 */
function getPlayerRoster() {
  if (!campaignState) return [];
  return partyRosters[campaignState.playerPartyId] || [];
}

/**
 * Gets any party's roster
 */
function getPartyRoster(partyId) {
  return partyRosters[partyId] || [];
}

/**
 * Gets a specific MP by ID
 */
function getMPById(mpId) {
  for (const partyId in partyRosters) {
    const mp = partyRosters[partyId].find(m => m.id === mpId);
    if (mp) return mp;
  }
  return null;
}

// ── Player Roster Editor Functions ──────────────────────────────

/**
 * Renames an MP in the player's roster
 * @param {string} mpId - The MP's unique ID
 * @param {string} newName - The new full name
 * @returns {boolean} Success
 */
function editMPName(mpId, newName) {
  const mp = getMPById(mpId);
  if (!mp) return false;
  if (mp.partyId !== campaignState.playerPartyId) return false;

  const parts = newName.trim().split(/\s+/);
  mp.firstName = parts[0] || mp.firstName;
  mp.lastName = parts.slice(1).join(" ") || mp.lastName;
  mp.name = newName.trim();
  mp.isEdited = true;

  // Update portrait seed to match new name
  const seed = encodeURIComponent(mp.name + mp.id);
  if (!mp._portraitOverridden) {
    mp.portraitUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }
  return true;
}

/**
 * Sets a custom portrait URL for an MP
 * @param {string} mpId - The MP's unique ID
 * @param {string} imageUrl - The new image URL
 * @returns {boolean} Success
 */
function editMPPortrait(mpId, imageUrl) {
  const mp = getMPById(mpId);
  if (!mp) return false;
  if (mp.partyId !== campaignState.playerPartyId) return false;

  mp.portraitUrl = imageUrl;
  mp._portraitOverridden = true;
  mp.isEdited = true;
  return true;
}

/**
 * Resets an MP back to auto-generated defaults
 */
function resetMP(mpId) {
  const mp = getMPById(mpId);
  if (!mp) return false;
  if (mp.partyId !== campaignState.playerPartyId) return false;

  const name = generateThaiName();
  mp.name = name.fullName;
  mp.firstName = name.firstName;
  mp.lastName = name.lastName;
  mp.nickname = name.nickname;
  mp.gender = name.gender;
  const seed = encodeURIComponent(mp.name + mp.id);
  mp.portraitUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  mp._portraitOverridden = false;
  mp.isEdited = false;
  return true;
}

/**
 * Batch search/filter player MPs
 */
function searchPlayerMPs(query) {
  const roster = getPlayerRoster();
  if (!query) return roster;
  const q = query.toLowerCase();
  return roster.filter(mp =>
    mp.name.toLowerCase().includes(q) ||
    mp.nickname.toLowerCase().includes(q) ||
    (mp.assignedDistrictId && mp.assignedDistrictId.toLowerCase().includes(q))
  );
}


// ──────────────────────────────────────────────────────────────────
// SECTION 5: PROVINCE & DISTRICT MAP DATA
// 77 provinces, 400 constituency districts
// Uses official English province names
// ──────────────────────────────────────────────────────────────────

const REGIONS = {
  bangkok: "Bangkok Metropolitan",
  central: "Central Thailand",
  north: "Northern Thailand",
  northeast: "Northeastern Thailand (Isan)",
  east: "Eastern Thailand",
  west: "Western Thailand",
  south: "Southern Thailand"
};

/**
 * Province definitions with district allocations summing to 400
 * Each province: { name, region, districts, basePop (thousands), politicalLean }
 */
const THAILAND_PROVINCES = [
  // ── Bangkok Metropolitan Region ─────────────────────────────
  { id: "bangkok", name: "Bangkok", region: "bangkok", districts: 33, basePop: 5500, politicalLean: { khana_pracharat: 40, phak_pracha_niyom: 15, palang_ratthaniyom: 20, setthakij_thai: 15, pak_tai_ruamjai: 10 } },
  { id: "nonthaburi", name: "Nonthaburi", region: "central", districts: 9, basePop: 1260, politicalLean: { khana_pracharat: 35, phak_pracha_niyom: 20, palang_ratthaniyom: 20, setthakij_thai: 15, pak_tai_ruamjai: 10 } },
  { id: "pathum_thani", name: "Pathum Thani", region: "central", districts: 7, basePop: 1150, politicalLean: { khana_pracharat: 32, phak_pracha_niyom: 22, palang_ratthaniyom: 20, setthakij_thai: 16, pak_tai_ruamjai: 10 } },
  { id: "samut_prakan", name: "Samut Prakan", region: "central", districts: 8, basePop: 1340, politicalLean: { khana_pracharat: 30, phak_pracha_niyom: 25, palang_ratthaniyom: 18, setthakij_thai: 17, pak_tai_ruamjai: 10 } },
  { id: "nakhon_pathom", name: "Nakhon Pathom", region: "central", districts: 5, basePop: 920, politicalLean: { khana_pracharat: 25, phak_pracha_niyom: 25, palang_ratthaniyom: 22, setthakij_thai: 18, pak_tai_ruamjai: 10 } },
  { id: "samut_sakhon", name: "Samut Sakhon", region: "central", districts: 3, basePop: 570, politicalLean: { khana_pracharat: 25, phak_pracha_niyom: 28, palang_ratthaniyom: 20, setthakij_thai: 17, pak_tai_ruamjai: 10 } },
  { id: "samut_songkhram", name: "Samut Songkhram", region: "central", districts: 1, basePop: 190, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 25, palang_ratthaniyom: 25, setthakij_thai: 20, pak_tai_ruamjai: 10 } },

  // ── Central Thailand ────────────────────────────────────────
  { id: "ayutthaya", name: "Phra Nakhon Si Ayutthaya", region: "central", districts: 5, basePop: 810, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 30, palang_ratthaniyom: 22, setthakij_thai: 18, pak_tai_ruamjai: 10 } },
  { id: "ang_thong", name: "Ang Thong", region: "central", districts: 2, basePop: 280, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 30, palang_ratthaniyom: 22, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "lop_buri", name: "Lop Buri", region: "central", districts: 4, basePop: 760, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 28, palang_ratthaniyom: 25, setthakij_thai: 19, pak_tai_ruamjai: 10 } },
  { id: "sing_buri", name: "Sing Buri", region: "central", districts: 1, basePop: 210, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 28, palang_ratthaniyom: 24, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "chai_nat", name: "Chai Nat", region: "central", districts: 2, basePop: 330, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 28, palang_ratthaniyom: 24, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "saraburi", name: "Saraburi", region: "central", districts: 4, basePop: 640, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 25, palang_ratthaniyom: 24, setthakij_thai: 19, pak_tai_ruamjai: 10 } },
  { id: "nakhon_nayok", name: "Nakhon Nayok", region: "central", districts: 1, basePop: 260, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 26, palang_ratthaniyom: 24, setthakij_thai: 18, pak_tai_ruamjai: 10 } },
  { id: "suphan_buri", name: "Suphan Buri", region: "central", districts: 5, basePop: 850, politicalLean: { khana_pracharat: 10, phak_pracha_niyom: 15, palang_ratthaniyom: 15, setthakij_thai: 50, pak_tai_ruamjai: 10 } },

  // ── Western Thailand ────────────────────────────────────────
  { id: "kanchanaburi", name: "Kanchanaburi", region: "west", districts: 5, basePop: 890, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 22, palang_ratthaniyom: 28, setthakij_thai: 22, pak_tai_ruamjai: 10 } },
  { id: "ratchaburi", name: "Ratchaburi", region: "west", districts: 5, basePop: 870, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 22, palang_ratthaniyom: 28, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "phetchaburi", name: "Phetchaburi", region: "west", districts: 3, basePop: 480, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 22, palang_ratthaniyom: 30, setthakij_thai: 18, pak_tai_ruamjai: 12 } },
  { id: "prachuap_khiri_khan", name: "Prachuap Khiri Khan", region: "west", districts: 3, basePop: 530, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 20, palang_ratthaniyom: 28, setthakij_thai: 20, pak_tai_ruamjai: 14 } },

  // ── Eastern Thailand ────────────────────────────────────────
  { id: "chonburi", name: "Chon Buri", region: "east", districts: 10, basePop: 1560, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 18, palang_ratthaniyom: 25, setthakij_thai: 25, pak_tai_ruamjai: 10 } },
  { id: "rayong", name: "Rayong", region: "east", districts: 4, basePop: 740, politicalLean: { khana_pracharat: 25, phak_pracha_niyom: 18, palang_ratthaniyom: 25, setthakij_thai: 22, pak_tai_ruamjai: 10 } },
  { id: "chanthaburi", name: "Chanthaburi", region: "east", districts: 3, basePop: 540, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 22, palang_ratthaniyom: 28, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "trat", name: "Trat", region: "east", districts: 1, basePop: 230, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 22, palang_ratthaniyom: 28, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "chachoengsao", name: "Chachoengsao", region: "east", districts: 4, basePop: 720, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 25, palang_ratthaniyom: 25, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "prachin_buri", name: "Prachin Buri", region: "east", districts: 3, basePop: 490, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 28, palang_ratthaniyom: 24, setthakij_thai: 20, pak_tai_ruamjai: 10 } },
  { id: "sa_kaeo", name: "Sa Kaeo", region: "east", districts: 3, basePop: 560, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 30, palang_ratthaniyom: 25, setthakij_thai: 20, pak_tai_ruamjai: 10 } },

  // ── Northeastern Thailand (Isan) ────────────────────────────
  { id: "nakhon_ratchasima", name: "Nakhon Ratchasima", region: "northeast", districts: 16, basePop: 2650, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 35, palang_ratthaniyom: 15, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "buri_ram", name: "Buri Ram", region: "northeast", districts: 11, basePop: 1580, politicalLean: { khana_pracharat: 10, phak_pracha_niyom: 25, palang_ratthaniyom: 15, setthakij_thai: 42, pak_tai_ruamjai: 8 } },
  { id: "surin", name: "Surin", region: "northeast", districts: 9, basePop: 1390, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 40, palang_ratthaniyom: 15, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "si_sa_ket", name: "Si Sa Ket", region: "northeast", districts: 8, basePop: 1470, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 42, palang_ratthaniyom: 13, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "ubon_ratchathani", name: "Ubon Ratchathani", region: "northeast", districts: 12, basePop: 1870, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 40, palang_ratthaniyom: 14, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "yasothon", name: "Yasothon", region: "northeast", districts: 3, basePop: 540, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 42, palang_ratthaniyom: 12, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "chaiyaphum", name: "Chaiyaphum", region: "northeast", districts: 8, basePop: 1140, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 38, palang_ratthaniyom: 15, setthakij_thai: 21, pak_tai_ruamjai: 8 } },
  { id: "amnat_charoen", name: "Amnat Charoen", region: "northeast", districts: 2, basePop: 380, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 42, palang_ratthaniyom: 13, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "bueng_kan", name: "Bueng Kan", region: "northeast", districts: 2, basePop: 420, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 40, palang_ratthaniyom: 15, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "nong_khai", name: "Nong Khai", region: "northeast", districts: 3, basePop: 520, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 40, palang_ratthaniyom: 14, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "udon_thani", name: "Udon Thani", region: "northeast", districts: 11, basePop: 1580, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 42, palang_ratthaniyom: 12, setthakij_thai: 18, pak_tai_ruamjai: 8 } },
  { id: "loei", name: "Loei", region: "northeast", districts: 4, basePop: 640, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 38, palang_ratthaniyom: 16, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "nong_bua_lam_phu", name: "Nong Bua Lam Phu", region: "northeast", districts: 3, basePop: 510, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 40, palang_ratthaniyom: 14, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "khon_kaen", name: "Khon Kaen", region: "northeast", districts: 11, basePop: 1800, politicalLean: { khana_pracharat: 25, phak_pracha_niyom: 35, palang_ratthaniyom: 14, setthakij_thai: 18, pak_tai_ruamjai: 8 } },
  { id: "kalasin", name: "Kalasin", region: "northeast", districts: 6, basePop: 990, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 42, palang_ratthaniyom: 12, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "maha_sarakham", name: "Maha Sarakham", region: "northeast", districts: 6, basePop: 960, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 38, palang_ratthaniyom: 14, setthakij_thai: 18, pak_tai_ruamjai: 8 } },
  { id: "roi_et", name: "Roi Et", region: "northeast", districts: 8, basePop: 1310, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 42, palang_ratthaniyom: 12, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "sakon_nakhon", name: "Sakon Nakhon", region: "northeast", districts: 8, basePop: 1150, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 40, palang_ratthaniyom: 14, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "nakhon_phanom", name: "Nakhon Phanom", region: "northeast", districts: 5, basePop: 720, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 40, palang_ratthaniyom: 14, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "mukdahan", name: "Mukdahan", region: "northeast", districts: 2, basePop: 350, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 40, palang_ratthaniyom: 14, setthakij_thai: 20, pak_tai_ruamjai: 8 } },

  // ── Northern Thailand ───────────────────────────────────────
  { id: "chiang_mai", name: "Chiang Mai", region: "north", districts: 10, basePop: 1760, politicalLean: { khana_pracharat: 30, phak_pracha_niyom: 35, palang_ratthaniyom: 12, setthakij_thai: 15, pak_tai_ruamjai: 8 } },
  { id: "lamphun", name: "Lamphun", region: "north", districts: 2, basePop: 400, politicalLean: { khana_pracharat: 28, phak_pracha_niyom: 35, palang_ratthaniyom: 14, setthakij_thai: 15, pak_tai_ruamjai: 8 } },
  { id: "lampang", name: "Lampang", region: "north", districts: 5, basePop: 740, politicalLean: { khana_pracharat: 25, phak_pracha_niyom: 35, palang_ratthaniyom: 15, setthakij_thai: 17, pak_tai_ruamjai: 8 } },
  { id: "uttaradit", name: "Uttaradit", region: "north", districts: 3, basePop: 460, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 32, palang_ratthaniyom: 18, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "phrae", name: "Phrae", region: "north", districts: 3, basePop: 440, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 32, palang_ratthaniyom: 18, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "nan", name: "Nan", region: "north", districts: 3, basePop: 480, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 32, palang_ratthaniyom: 18, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "phayao", name: "Phayao", region: "north", districts: 3, basePop: 480, politicalLean: { khana_pracharat: 24, phak_pracha_niyom: 35, palang_ratthaniyom: 14, setthakij_thai: 19, pak_tai_ruamjai: 8 } },
  { id: "chiang_rai", name: "Chiang Rai", region: "north", districts: 8, basePop: 1280, politicalLean: { khana_pracharat: 25, phak_pracha_niyom: 35, palang_ratthaniyom: 15, setthakij_thai: 17, pak_tai_ruamjai: 8 } },
  { id: "mae_hong_son", name: "Mae Hong Son", region: "north", districts: 1, basePop: 270, politicalLean: { khana_pracharat: 20, phak_pracha_niyom: 32, palang_ratthaniyom: 18, setthakij_thai: 22, pak_tai_ruamjai: 8 } },

  // ── Lower North / Upper Central ─────────────────────────────
  { id: "nakhon_sawan", name: "Nakhon Sawan", region: "central", districts: 6, basePop: 1060, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 30, palang_ratthaniyom: 22, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "uthai_thani", name: "Uthai Thani", region: "central", districts: 2, basePop: 330, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 28, palang_ratthaniyom: 25, setthakij_thai: 24, pak_tai_ruamjai: 8 } },
  { id: "kamphaeng_phet", name: "Kamphaeng Phet", region: "central", districts: 4, basePop: 730, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 30, palang_ratthaniyom: 22, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "tak", name: "Tak", region: "north", districts: 3, basePop: 530, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 28, palang_ratthaniyom: 24, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "sukhothai", name: "Sukhothai", region: "central", districts: 3, basePop: 600, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 30, palang_ratthaniyom: 22, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "phitsanulok", name: "Phitsanulok", region: "central", districts: 5, basePop: 870, politicalLean: { khana_pracharat: 22, phak_pracha_niyom: 30, palang_ratthaniyom: 20, setthakij_thai: 20, pak_tai_ruamjai: 8 } },
  { id: "phichit", name: "Phichit", region: "central", districts: 3, basePop: 540, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 30, palang_ratthaniyom: 22, setthakij_thai: 22, pak_tai_ruamjai: 8 } },
  { id: "phetchabun", name: "Phetchabun", region: "central", districts: 6, basePop: 1010, politicalLean: { khana_pracharat: 18, phak_pracha_niyom: 32, palang_ratthaniyom: 20, setthakij_thai: 22, pak_tai_ruamjai: 8 } },

  // ── Southern Thailand ───────────────────────────────────────
  { id: "nakhon_si_thammarat", name: "Nakhon Si Thammarat", region: "south", districts: 10, basePop: 1560, politicalLean: { khana_pracharat: 12, phak_pracha_niyom: 15, palang_ratthaniyom: 30, setthakij_thai: 12, pak_tai_ruamjai: 31 } },
  { id: "krabi", name: "Krabi", region: "south", districts: 3, basePop: 470, politicalLean: { khana_pracharat: 12, phak_pracha_niyom: 12, palang_ratthaniyom: 28, setthakij_thai: 12, pak_tai_ruamjai: 36 } },
  { id: "phang_nga", name: "Phang Nga", region: "south", districts: 2, basePop: 270, politicalLean: { khana_pracharat: 12, phak_pracha_niyom: 12, palang_ratthaniyom: 28, setthakij_thai: 12, pak_tai_ruamjai: 36 } },
  { id: "phuket", name: "Phuket", region: "south", districts: 2, basePop: 420, politicalLean: { khana_pracharat: 28, phak_pracha_niyom: 15, palang_ratthaniyom: 22, setthakij_thai: 15, pak_tai_ruamjai: 20 } },
  { id: "surat_thani", name: "Surat Thani", region: "south", districts: 7, basePop: 1060, politicalLean: { khana_pracharat: 12, phak_pracha_niyom: 12, palang_ratthaniyom: 32, setthakij_thai: 12, pak_tai_ruamjai: 32 } },
  { id: "ranong", name: "Ranong", region: "south", districts: 1, basePop: 190, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 12, palang_ratthaniyom: 28, setthakij_thai: 15, pak_tai_ruamjai: 30 } },
  { id: "chumphon", name: "Chumphon", region: "south", districts: 3, basePop: 510, politicalLean: { khana_pracharat: 14, phak_pracha_niyom: 12, palang_ratthaniyom: 30, setthakij_thai: 14, pak_tai_ruamjai: 30 } },
  { id: "songkhla", name: "Songkhla", region: "south", districts: 10, basePop: 1430, politicalLean: { khana_pracharat: 15, phak_pracha_niyom: 12, palang_ratthaniyom: 28, setthakij_thai: 12, pak_tai_ruamjai: 33 } },
  { id: "satun", name: "Satun", region: "south", districts: 2, basePop: 320, politicalLean: { khana_pracharat: 10, phak_pracha_niyom: 10, palang_ratthaniyom: 22, setthakij_thai: 10, pak_tai_ruamjai: 48 } },
  { id: "trang", name: "Trang", region: "south", districts: 4, basePop: 640, politicalLean: { khana_pracharat: 12, phak_pracha_niyom: 12, palang_ratthaniyom: 28, setthakij_thai: 12, pak_tai_ruamjai: 36 } },
  { id: "phatthalung", name: "Phatthalung", region: "south", districts: 3, basePop: 520, politicalLean: { khana_pracharat: 12, phak_pracha_niyom: 12, palang_ratthaniyom: 28, setthakij_thai: 12, pak_tai_ruamjai: 36 } },
  { id: "pattani", name: "Pattani", region: "south", districts: 4, basePop: 700, politicalLean: { khana_pracharat: 8, phak_pracha_niyom: 8, palang_ratthaniyom: 18, setthakij_thai: 8, pak_tai_ruamjai: 58 } },
  { id: "yala", name: "Yala", region: "south", districts: 3, basePop: 530, politicalLean: { khana_pracharat: 8, phak_pracha_niyom: 8, palang_ratthaniyom: 18, setthakij_thai: 8, pak_tai_ruamjai: 58 } },
  { id: "narathiwat", name: "Narathiwat", region: "south", districts: 4, basePop: 810, politicalLean: { khana_pracharat: 8, phak_pracha_niyom: 8, palang_ratthaniyom: 18, setthakij_thai: 8, pak_tai_ruamjai: 58 } }
];


// ──────────────────────────────────────────────────────────────────
// SECTION 5B: DISTRICT GENERATION FROM PROVINCE DATA
// Generates all 400 district objects with gameplay properties
// ──────────────────────────────────────────────────────────────────

var DISTRICTS = [];

/**
 * Generates all 400 district objects from THAILAND_PROVINCES
 */
function generateDistricts() {
  DISTRICTS = [];
  let globalIdx = 0;

  THAILAND_PROVINCES.forEach(province => {
    for (let d = 1; d <= province.districts; d++) {
      globalIdx++;
      const districtId = `${province.id}_d${d}`;
      const popVariance = 0.8 + Math.random() * 0.4; // ±20%
      const districtPop = Math.round((province.basePop / province.districts) * popVariance);

      // Copy and add slight randomness to political lean
      const lean = {};
      let total = 0;
      for (const pid in province.politicalLean) {
        lean[pid] = province.politicalLean[pid] + (Math.random() * 8 - 4);
        lean[pid] = Math.max(2, lean[pid]);
        total += lean[pid];
      }
      // Normalize to 100
      for (const pid in lean) {
        lean[pid] = Math.round((lean[pid] / total) * 100);
      }

      DISTRICTS.push({
        id: districtId,
        globalIndex: globalIdx,
        provinceId: province.id,
        provinceName: province.name,
        region: province.region,
        districtNumber: d,
        displayName: `${province.name} District ${d}`,

        // Population & demographics
        basePop: districtPop,
        urbanRatio: province.region === "bangkok" ? 0.95
          : ["central"].includes(province.region) && province.districts > 5 ? 0.6
          : province.region === "south" || province.region === "northeast" ? 0.25
          : 0.35 + Math.random() * 0.2,

        // Political lean (base voting intention)
        politicalLean: lean,

        // Campaign mechanics
        banYaiBonus: 0,           // +score from Ban Yai operations (costs scrutiny)
        campaignBuffs: {          // accumulated buffs from player actions
          rally: 0,               // from holding rallies
          canvass: 0,             // from door-to-door
          io: 0,                  // from information operations
          infrastructure: 0,     // from promising development
          policy: 0              // from policy announcements
        },
        banYaiOwner: null,        // partyId that controls Ban Yai in this district
        isTargeted: false,        // whether player has targeted this district this week
        visitCount: 0             // how many times player has campaigned here
      });
    }
  });

  return DISTRICTS;
}

/**
 * Gets districts for a specific province
 */
function getDistrictsByProvince(provinceId) {
  return DISTRICTS.filter(d => d.provinceId === provinceId);
}

/**
 * Gets districts for a specific region
 */
function getDistrictsByRegion(region) {
  return DISTRICTS.filter(d => d.region === region);
}

/**
 * Gets a single district by ID
 */
function getDistrictById(districtId) {
  return DISTRICTS.find(d => d.id === districtId);
}

/**
 * Gets province data by ID
 */
function getProvinceById(provinceId) {
  return THAILAND_PROVINCES.find(p => p.id === provinceId);
}

/**
 * Validates that total districts = 400
 */
function validateDistrictCount() {
  const total = THAILAND_PROVINCES.reduce((sum, p) => sum + p.districts, 0);
  console.log(`Total districts: ${total} (expected: 400)`);
  return total === CONSTITUENCY_SEATS;
}


// ──────────────────────────────────────────────────────────────────
// SECTION 6: PLACEHOLDER — TopoJSON/GeoJSON Map Reference
// The actual map file should be placed at /campaign/thailand.topojson
// ──────────────────────────────────────────────────────────────────

/**
 * Path to the TopoJSON map file.
 * This file must contain Thailand's 400 electoral districts with
 * properties matching our district IDs.
 *
 * Each feature in the TopoJSON should have:
 *   - properties["data-province-id"]: matches province.id
 *   - properties["data-district-id"]: matches district.id
 *   - properties["name"]: display name
 *
 * See README.md for instructions on obtaining this file.
 */
const MAP_TOPOJSON_PATH = "./thailand.topojson";

/**
 * Fallback: province-level GeoJSON (77 provinces)
 * Easier to find than district-level data
 */
const MAP_GEOJSON_FALLBACK_PATH = "./thailand-provinces.geojson";


// ──────────────────────────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────────────────────────

// Auto-generate districts on script load
generateDistricts();
validateDistrictCount();

console.log("[campaign/data.js] Loaded successfully.");
console.log(`  → ${CAMPAIGN_PARTIES.length} parties defined`);
console.log(`  → ${DISTRICTS.length} districts generated across ${THAILAND_PROVINCES.length} provinces`);
console.log(`  → MP generation ready (${TOTAL_SEATS} slots per party)`);
