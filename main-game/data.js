// ============================================================
// THAILAND POLITICAL SIMULATION (TPS) — data.js
// Core Data: Parties, Game State, and Crisis Events
// ============================================================

// ─── POLITICAL PARTIES ──────────────────────────────────────
// Modeled after real Thai political dynamics with fictional names.
// ideology: "royalist" | "progressive" | "populist" | "regional" | "centrist"
// seats: out of 500 total parliamentary seats
// relation: relationship score with the PM (player), -100 to +100
// inCoalition: whether the party is currently in the player's coalition

const PARTIES = [
  {
    id: "progressive_move",
    name: "Progressive Move Party",
    shortName: "PMP",
    ideology: "progressive",
    description: "Youth-driven, urban-based reformists pushing for constitutional rewrite, military reform, and digital rights. Wildly popular online but polarizing among elites.",
    color: "#FF6B2B",
    seats: 152,
    relation: 70,
    inCoalition: true,
    priorities: ["constitution_reform", "decentralization", "digital_rights", "education"],
    voteModifiers: {
      constitution_reform: +30,
      military_budget: -25,
      royal_reform: +20,
      subsidies: -5,
      decentralization: +20,
      media_control: -30,
      education: +25,
      infrastructure: +5
    }
  },
  {
    id: "peoples_populist",
    name: "People's Populist Party",
    shortName: "PPP",
    ideology: "populist",
    description: "The spiritual successor to banned populist movements. Champions rural subsidies, universal healthcare expansion, and infrastructure mega-projects. Has deep roots in the Northeast and North.",
    color: "#E63946",
    seats: 141,
    relation: 55,
    inCoalition: true,
    priorities: ["subsidies", "infrastructure", "healthcare", "rural_development"],
    voteModifiers: {
      subsidies: +35,
      infrastructure: +25,
      constitution_reform: +5,
      military_budget: -10,
      decentralization: +10,
      media_control: -5,
      education: +10,
      royal_reform: -15
    }
  },
  {
    id: "national_heritage",
    name: "National Heritage Party",
    shortName: "NHP",
    ideology: "royalist",
    description: "The establishment party backed by military brass, senior bureaucrats, and royalist networks. Defends traditional institutions and national security at all costs.",
    color: "#1D3557",
    seats: 97,
    relation: -10,
    inCoalition: false,
    priorities: ["military_budget", "media_control", "national_security"],
    voteModifiers: {
      military_budget: +35,
      media_control: +25,
      constitution_reform: -35,
      subsidies: -15,
      royal_reform: -40,
      decentralization: -20,
      infrastructure: +10,
      education: -5
    }
  },
  {
    id: "thai_unity",
    name: "Thai Unity Party",
    shortName: "TUP",
    ideology: "centrist",
    description: "A centrist 'big tent' party of career politicians, business elites, and pragmatic dealmakers. They will join any coalition if the price is right.",
    color: "#457B9D",
    seats: 65,
    relation: 30,
    inCoalition: true,
    priorities: ["infrastructure", "economic_stability"],
    voteModifiers: {
      subsidies: +5,
      infrastructure: +20,
      constitution_reform: -5,
      military_budget: +10,
      decentralization: +5,
      media_control: +5,
      education: +10,
      royal_reform: -10
    }
  },
  {
    id: "southern_pact",
    name: "Southern Pact Coalition",
    shortName: "SPC",
    ideology: "regional",
    description: "Represents the deep south's cultural identity, advocating for regional autonomy, bilingual education, and special economic zones. A critical kingmaker in close elections.",
    color: "#2A9D8F",
    seats: 45,
    relation: 20,
    inCoalition: false,
    priorities: ["decentralization", "education", "regional_autonomy"],
    voteModifiers: {
      decentralization: +40,
      education: +20,
      subsidies: +10,
      infrastructure: +15,
      constitution_reform: +10,
      military_budget: -20,
      media_control: -15,
      royal_reform: -5
    }
  }
];

// Total seats: 500 (152 + 141 + 97 + 65 + 45 = 500)
// Coalition seats: 152 + 141 + 65 = 358 (majority = 251)
const PARLIAMENT_TOTAL_SEATS = 500;
const MAJORITY_THRESHOLD = 251;


// ─── AVAILABLE LAWS / POLICIES ──────────────────────────────
const LAWS = [
  {
    id: "subsidies",
    name: "Universal Rice & Rubber Subsidy",
    description: "Guarantee above-market prices for rice and rubber farmers. Expensive but wins rural hearts.",
    icon: "🌾",
    passed: false,
    effects: { popularity: +8, budget: -120, unrest: -6, growth: -1 },
    monthlyEffects: { budget: -40, popularity: +2, unrest: -1 }
  },
  {
    id: "military_budget",
    name: "Defense Budget Expansion",
    description: "Increase the armed forces budget by 15%. Keeps the generals happy but angers reformists.",
    icon: "🎖️",
    passed: false,
    effects: { popularity: -5, budget: -80, unrest: -8 },
    monthlyEffects: { budget: -30, unrest: -2 }
  },
  {
    id: "constitution_reform",
    name: "Constitutional Amendment Bill",
    description: "Rewrite key chapters of the junta-era constitution. The most explosive issue in Thai politics.",
    icon: "📜",
    passed: false,
    effects: { popularity: +10, budget: -20, unrest: +12 },
    monthlyEffects: { popularity: +3, unrest: +2 }
  },
  {
    id: "decentralization",
    name: "Provincial Autonomy Act",
    description: "Devolve power and budgets to provincial governments. Empowers regions but weakens Bangkok.",
    icon: "🏛️",
    passed: false,
    effects: { popularity: +5, budget: -60, unrest: -4, growth: +1 },
    monthlyEffects: { budget: -15, growth: +1 }
  },
  {
    id: "media_control",
    name: "National Cyber Security Act",
    description: "Expand government authority over online content. Establishment loves it; activists are horrified.",
    icon: "🔒",
    passed: false,
    effects: { popularity: -8, budget: -30, unrest: +10 },
    monthlyEffects: { unrest: +3, popularity: -2 }
  },
  {
    id: "education",
    name: "Education Modernization Fund",
    description: "Overhaul curriculum, fund rural schools, and expand university access. A long-term investment.",
    icon: "📚",
    passed: false,
    effects: { popularity: +6, budget: -90, unrest: -3, growth: +2 },
    monthlyEffects: { budget: -25, growth: +1, popularity: +1 }
  },
  {
    id: "infrastructure",
    name: "Eastern Seaboard Megaproject",
    description: "Build high-speed rail and port expansion in the EEC corridor. Big money, big returns — eventually.",
    icon: "🚄",
    passed: false,
    effects: { popularity: +4, budget: -200, unrest: -2, growth: +3 },
    monthlyEffects: { budget: -50, growth: +2 }
  },
  {
    id: "healthcare",
    name: "Universal Healthcare Plus",
    description: "Expand the 30-baht scheme to cover dental, mental health, and elderly care.",
    icon: "🏥",
    passed: false,
    effects: { popularity: +12, budget: -100, unrest: -5 },
    monthlyEffects: { budget: -35, popularity: +2, unrest: -1 }
  }
];


// ─── INITIAL GAME STATE ─────────────────────────────────────
const INITIAL_GAME_STATE = {
  turn: 1,
  maxTurns: 48,           // 4-year term = 48 months
  popularity: 50,          // 0–100, PM approval rating
  budget: 1000,            // in billions of Baht
  growth: 3.2,             // GDP growth %
  unrest: 20,              // 0–100, social tension meter
  militaryPatience: 70,    // hidden stat: how long before a coup (0 = coup)
  coalitionStability: 75,  // 0–100
  passedLaws: [],
  currentEvent: null,
  eventHistory: [],
  isGameOver: false,
  gameOverReason: "",
  monthLabels: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
};


// ─── CRISIS EVENTS ──────────────────────────────────────────
// Each event is inspired by real Thai political crises.
// Effects modify: popularity, budget, unrest, growth, militaryPatience,
//                 coalitionStability, and party relations (partyEffects).

const CRISIS_EVENTS = [
  {
    id: "student_flashmob",
    title: "🎓 Student Flash Mob at Democracy Monument",
    description: "Thousands of university students have gathered at Ratchadamnoen Avenue, raising the three-finger salute and demanding a full constitutional rewrite. The protest is trending worldwide on social media. Riot police await orders.",
    choices: [
      {
        label: "Open dialogue — invite student leaders to Government House",
        effects: { popularity: +8, unrest: -5, militaryPatience: -8 },
        partyEffects: { progressive_move: +10, national_heritage: -15 },
        outcome: "You sit across from student leaders on live TV. Reformists praise your courage, but generals are quietly furious."
      },
      {
        label: "Ignore and wait — it will blow over on its own",
        effects: { popularity: -3, unrest: +8 },
        partyEffects: { progressive_move: -10, national_heritage: +5 },
        outcome: "The protest grows for three more days. International media picks it up. Your silence is deafening."
      },
      {
        label: "Deploy crowd control — disperse with water cannons",
        effects: { popularity: -12, unrest: +15, militaryPatience: +5 },
        partyEffects: { progressive_move: -20, national_heritage: +10 },
        outcome: "Viral videos of students being blasted with water cannons flood social media. Your approval craters overnight."
      }
    ]
  },
  {
    id: "rice_farmer_march",
    title: "🌾 Farmer's March on Bangkok",
    description: "Over 10,000 rice farmers from Isan have marched to Bangkok, setting up camp outside the Finance Ministry. They demand the government honor unpaid rice pledging scheme debts from a previous administration. The rainy season approaches and they need to return to their fields.",
    choices: [
      {
        label: "Pay the farmers in full — honor the debts immediately",
        effects: { popularity: +10, budget: -150, unrest: -10 },
        partyEffects: { peoples_populist: +15, thai_unity: -5 },
        outcome: "Farmers celebrate and return home. Your budget takes a massive hit, but rural support surges."
      },
      {
        label: "Offer partial payment with a structured installment plan",
        effects: { popularity: +3, budget: -60, unrest: -3 },
        partyEffects: { peoples_populist: +5 },
        outcome: "Some farmers accept; others remain camped out. A pragmatic but unsatisfying compromise."
      },
      {
        label: "Blame the previous government and refuse to pay",
        effects: { popularity: -8, unrest: +12, budget: 0 },
        partyEffects: { peoples_populist: -20, national_heritage: +5 },
        outcome: "Farmers block major intersections. The Northeast turns against you overnight."
      }
    ]
  },
  {
    id: "court_dissolution",
    title: "⚖️ Constitutional Court Dissolution Petition",
    description: "The Election Commission has filed a petition with the Constitutional Court to dissolve your largest coalition partner, Progressive Move Party, for alleged anti-monarchy rhetoric. If successful, your coalition loses its majority instantly.",
    choices: [
      {
        label: "Publicly support PMP and condemn judicial overreach",
        effects: { popularity: +5, unrest: +10, militaryPatience: -12 },
        partyEffects: { progressive_move: +20, national_heritage: -20, thai_unity: -10 },
        outcome: "You're seen as defending democracy, but you've put a giant target on your own back."
      },
      {
        label: "Stay neutral — let the courts do their work",
        effects: { popularity: -5, unrest: +5 },
        partyEffects: { progressive_move: -15, national_heritage: +10, thai_unity: +5 },
        outcome: "Progressive Move feels betrayed. Your coalition cracks. Legal analysts say the court will likely rule against PMP."
      },
      {
        label: "Negotiate behind the scenes to delay the ruling",
        effects: { popularity: -2, budget: -40, unrest: +3, militaryPatience: -5 },
        partyEffects: { progressive_move: +5, thai_unity: +5 },
        outcome: "Your backroom deal buys time, but rumors leak. Whispers of corruption follow you."
      }
    ]
  },
  {
    id: "military_interview",
    title: "🎖️ Army Commander's Cryptic TV Interview",
    description: "The Army Commander-in-Chief appeared on prime-time television, saying he is 'deeply concerned about national stability' and that 'the military is always ready to protect the nation.' Political analysts are reading between the lines. The baht drops 2% overnight.",
    choices: [
      {
        label: "Visit the army barracks personally to reassure the generals",
        effects: { popularity: -5, unrest: -5, militaryPatience: +15 },
        partyEffects: { national_heritage: +10, progressive_move: -10 },
        outcome: "You're photographed shaking hands with brass. Your base sees weakness; the military sees submission."
      },
      {
        label: "Hold a press conference asserting civilian supremacy",
        effects: { popularity: +7, unrest: +8, militaryPatience: -15 },
        partyEffects: { progressive_move: +15, national_heritage: -15 },
        outcome: "Your speech goes viral. Democrats cheer. In military circles, you've just crossed a line."
      },
      {
        label: "Quietly reshuffle the cabinet to include a military-linked figure",
        effects: { popularity: -3, unrest: -3, militaryPatience: +10 },
        partyEffects: { national_heritage: +8, progressive_move: -8, peoples_populist: -5 },
        outcome: "A quiet compromise. No headlines, but your coalition grumbles about selling out."
      }
    ]
  },
  {
    id: "minister_scandal",
    title: "📱 Viral Exposé: Minister's Hidden Assets",
    description: "An investigative journalist has published leaked documents showing your Finance Minister owns 14 luxury condos, 3 foreign bank accounts, and a superyacht — all undeclared. The hashtag #ฉ้อราษฎร์บังหลวง is trending #1 nationwide.",
    choices: [
      {
        label: "Fire the minister immediately and order an investigation",
        effects: { popularity: +10, unrest: -5 },
        partyEffects: { thai_unity: -15 },
        outcome: "Swift justice. The public applauds, but the minister's faction within the coalition is plotting revenge."
      },
      {
        label: "Express concern but wait for formal investigation results",
        effects: { popularity: -8, unrest: +7 },
        partyEffects: { thai_unity: +5, progressive_move: -10 },
        outcome: "The scandal dominates news cycles for weeks. Every day you don't act, your credibility bleeds."
      },
      {
        label: "Deflect — announce a major new economic policy to change the news cycle",
        effects: { popularity: -3, budget: -80, unrest: +3, growth: +1 },
        partyEffects: {},
        outcome: "The distraction works... for about 48 hours. Then the story comes back stronger."
      }
    ]
  },
  {
    id: "southern_violence",
    title: "💥 Bombing in the Deep South",
    description: "A car bomb has detonated at a market in Pattani province, killing 8 civilians and wounding 30. Separatist insurgents are suspected. The Southern Pact Coalition demands an emergency session. National security hawks want martial law extended.",
    choices: [
      {
        label: "Declare extended martial law in 3 southern provinces",
        effects: { popularity: -4, budget: -50, unrest: -5, militaryPatience: +10 },
        partyEffects: { national_heritage: +15, southern_pact: -25, progressive_move: -10 },
        outcome: "Security tightens. But the deep south feels occupied, not protected."
      },
      {
        label: "Fast-track peace talks with separatist representatives",
        effects: { popularity: +5, unrest: +5, militaryPatience: -10 },
        partyEffects: { southern_pact: +20, national_heritage: -15, progressive_move: +5 },
        outcome: "A bold move. Hawks accuse you of negotiating with terrorists. Doves call you brave."
      },
      {
        label: "Increase development aid to southern provinces instead",
        effects: { popularity: +3, budget: -90, unrest: -3, growth: +1 },
        partyEffects: { southern_pact: +10, peoples_populist: +5 },
        outcome: "Money flows south. Schools and hospitals are built. The violence continues, but communities feel heard."
      }
    ]
  },
  {
    id: "economic_downturn",
    title: "📉 Export Collapse & Baht Crisis",
    description: "Global demand for Thai electronics and auto parts has plummeted. The baht is at a 5-year low. Factory workers in Rayong and Chonburi face mass layoffs. The Bank of Thailand is urging emergency measures.",
    choices: [
      {
        label: "Massive stimulus package — inject cash into the economy",
        effects: { popularity: +6, budget: -200, growth: +2, unrest: -5 },
        partyEffects: { peoples_populist: +10, thai_unity: +10 },
        outcome: "The bleeding stops — temporarily. Economists warn this is unsustainable."
      },
      {
        label: "Austerity measures — cut government spending to stabilize the baht",
        effects: { popularity: -10, budget: +80, growth: -1, unrest: +10 },
        partyEffects: { national_heritage: +5, peoples_populist: -15, progressive_move: -5 },
        outcome: "Markets stabilize. Workers riot. The IMF approves; the streets do not."
      },
      {
        label: "Target stimulus only to affected export sectors",
        effects: { popularity: +2, budget: -100, growth: +1, unrest: +2 },
        partyEffects: { thai_unity: +5 },
        outcome: "A measured response. Not dramatic enough for headlines, but factories stay open."
      }
    ]
  },
  {
    id: "royal_controversy",
    title: "👑 Palace Statement on Government Policy",
    description: "The Royal Household Bureau has issued an unusually pointed statement expressing 'concern' about recent government policies 'that may affect national harmony.' The statement is vague but unmistakable. Media self-censors. The nation holds its breath.",
    choices: [
      {
        label: "Issue a humble public response reaffirming loyalty to the monarchy",
        effects: { popularity: -3, unrest: -8, militaryPatience: +10 },
        partyEffects: { national_heritage: +15, progressive_move: -15 },
        outcome: "You bow to institutional pressure. Traditionalists nod; your reform base feels abandoned."
      },
      {
        label: "Make no public response — continue governance as planned",
        effects: { popularity: +3, unrest: +10, militaryPatience: -10 },
        partyEffects: { progressive_move: +10, national_heritage: -10 },
        outcome: "Your silence is interpreted a dozen ways. Tension simmers beneath a veneer of normalcy."
      }
    ]
  },
  {
    id: "social_media_ban",
    title: "📵 NBTC Demands Social Media Shutdown",
    description: "The National Broadcasting and Telecommunications Commission demands you authorize blocking Twitter/X and TikTok citing national security and lèse-majesté violations. Tech companies threaten to pull investment if you comply.",
    choices: [
      {
        label: "Authorize the block — national security comes first",
        effects: { popularity: -15, unrest: +18, militaryPatience: +8 },
        partyEffects: { national_heritage: +15, progressive_move: -25, southern_pact: -5 },
        outcome: "Thailand goes dark on social media. VPN usage skyrockets. International condemnation pours in."
      },
      {
        label: "Reject the request and champion digital freedom",
        effects: { popularity: +10, unrest: +5, militaryPatience: -10 },
        partyEffects: { progressive_move: +20, national_heritage: -15, thai_unity: +5 },
        outcome: "Young Thais celebrate. The NBTC warns of 'consequences.' Foreign tech firms breathe a sigh of relief."
      },
      {
        label: "Compromise — block specific content, not entire platforms",
        effects: { popularity: +2, unrest: +5, budget: -20 },
        partyEffects: { progressive_move: -5, national_heritage: +5 },
        outcome: "A technocratic middle ground. Nobody is fully satisfied, but the platforms stay online."
      }
    ]
  },
  {
    id: "coalition_defection",
    title: "🏚️ Coalition Partner Threatens to Defect",
    description: "Thai Unity Party's leader has been spotted dining with opposition figures at a Sukhumvit restaurant. Leaked WhatsApp messages suggest they're negotiating to switch sides. Your coalition majority hangs by a thread.",
    choices: [
      {
        label: "Offer TUP a major cabinet portfolio to keep them loyal",
        effects: { popularity: -5, budget: -30, coalitionStability: +15 },
        partyEffects: { thai_unity: +20, progressive_move: -10, peoples_populist: -10 },
        outcome: "TUP gets the Commerce Ministry. Your allies resent the payoff, but mathematics is mathematics."
      },
      {
        label: "Call their bluff — dare them to leave publicly",
        effects: { popularity: +5, unrest: +5, coalitionStability: -15 },
        partyEffects: { thai_unity: -20, progressive_move: +5 },
        outcome: "A power play. TUP's leader backs down for now — but the trust is gone forever."
      },
      {
        label: "Court the Southern Pact as a replacement coalition partner",
        effects: { popularity: +2, budget: -40, coalitionStability: +5 },
        partyEffects: { southern_pact: +15, thai_unity: -10, national_heritage: -5 },
        outcome: "You diversify your coalition. The Southern Pact demands autonomy concessions in return."
      }
    ]
  },
  {
    id: "flood_crisis",
    title: "🌊 Catastrophic Flooding in Central Plains",
    description: "Unprecedented monsoon rains have breached flood barriers north of Bangkok. Ayutthaya is underwater. 500,000 people are displaced. Industrial estates in Pathum Thani are at risk. The 2011 nightmare is repeating itself.",
    choices: [
      {
        label: "Full emergency mobilization — redirect all available funds",
        effects: { popularity: +12, budget: -180, unrest: -8, growth: -2 },
        partyEffects: { peoples_populist: +10, thai_unity: +5, southern_pact: +5 },
        outcome: "You're on the ground in waders. The response is swift. Lives are saved. The budget is devastated."
      },
      {
        label: "Request international aid and coordinate with the military",
        effects: { popularity: +5, budget: -60, unrest: -3, militaryPatience: +5 },
        partyEffects: { national_heritage: +10, progressive_move: -5 },
        outcome: "Foreign aid trickles in. Joint civilian-military ops create good optics. Nationalists grumble about foreign help."
      },
      {
        label: "Focus resources on protecting Bangkok and industrial zones",
        effects: { popularity: -8, budget: -80, unrest: +12, growth: +1 },
        partyEffects: { peoples_populist: -15, progressive_move: -5, thai_unity: +5 },
        outcome: "Bangkok stays dry. Upstream communities feel sacrificed. 'Bangkok First' trends on social media."
      }
    ]
  },
  {
    id: "lese_majeste",
    title: "⚖️ High-Profile Lèse-Majesté Arrest",
    description: "Police have arrested a prominent political activist and social media influencer under Article 112 (lèse-majesté) for a satirical TikTok video. The UN Human Rights Office has issued a statement. Youth groups are mobilizing.",
    choices: [
      {
        label: "Support the arrest — the law must be upheld",
        effects: { popularity: -10, unrest: +12, militaryPatience: +10 },
        partyEffects: { national_heritage: +15, progressive_move: -20 },
        outcome: "You stand with the establishment. The activist becomes a martyr. International criticism intensifies."
      },
      {
        label: "Call for bail and advocate for Article 112 reform",
        effects: { popularity: +8, unrest: +8, militaryPatience: -15 },
        partyEffects: { progressive_move: +20, national_heritage: -25, southern_pact: +5 },
        outcome: "A politically dangerous position. Reformists love you. The palace network is not amused."
      },
      {
        label: "Remain silent and let the judiciary handle it",
        effects: { popularity: -3, unrest: +5 },
        partyEffects: { progressive_move: -10, national_heritage: +5 },
        outcome: "Your silence speaks volumes. Both sides accuse you of cowardice."
      }
    ]
  },
  {
    id: "cannabis_policy",
    title: "🌿 Cannabis Regulation Chaos",
    description: "After the previous government decriminalized cannabis without proper regulation, weed shops have exploded across Bangkok. Hospitals report a spike in youth ER visits. Tourism is booming but parents are outraged.",
    choices: [
      {
        label: "Re-criminalize recreational use immediately",
        effects: { popularity: +3, unrest: +5, growth: -1, budget: -20 },
        partyEffects: { national_heritage: +10, progressive_move: -10, thai_unity: -5 },
        outcome: "Shops close overnight. The tourism lobby is furious. Conservatives applaud."
      },
      {
        label: "Implement strict regulation — licensed dispensaries only",
        effects: { popularity: +5, budget: +30, unrest: -3, growth: +1 },
        partyEffects: { progressive_move: +10, thai_unity: +10, peoples_populist: +5 },
        outcome: "A mature, revenue-generating framework. It takes 6 months to implement, but the path is sound."
      },
      {
        label: "Do nothing — let the free market sort it out",
        effects: { popularity: -5, unrest: +8, growth: +1 },
        partyEffects: { progressive_move: +5, national_heritage: -10, peoples_populist: -5 },
        outcome: "Chaos continues. Bangkok becomes the 'Amsterdam of Asia.' Not everyone is proud."
      }
    ]
  },
  {
    id: "chinese_submarine",
    title: "🚢 Controversial Chinese Submarine Deal",
    description: "The Royal Thai Navy insists on purchasing three Chinese submarines worth ฿36 billion. Critics call it a colossal waste given Thailand's shallow Gulf waters. The Navy threatens to 'reassess its support' for the government.",
    choices: [
      {
        label: "Approve the purchase — maintain military relations",
        effects: { popularity: -8, budget: -150, militaryPatience: +15, unrest: +5 },
        partyEffects: { national_heritage: +15, progressive_move: -15, peoples_populist: -10 },
        outcome: "The submarines are ordered. The public is bewildered. Memes about submarines in puddles go viral."
      },
      {
        label: "Cancel the deal and redirect funds to public healthcare",
        effects: { popularity: +10, budget: +0, militaryPatience: -15, unrest: -3 },
        partyEffects: { progressive_move: +15, peoples_populist: +10, national_heritage: -20 },
        outcome: "A popular decision. The Navy brass are stone-faced at the press conference."
      },
      {
        label: "Negotiate to reduce the deal to one submarine as a compromise",
        effects: { popularity: +2, budget: -50, militaryPatience: +5, unrest: +2 },
        partyEffects: { national_heritage: +5, thai_unity: +5, progressive_move: -5 },
        outcome: "One submarine. Everyone can live with it. Nobody is happy. Classic politics."
      }
    ]
  },
  {
    id: "temple_scandal",
    title: "🛕 Mega-Temple Financial Scandal",
    description: "Leaked documents reveal a nationally revered mega-temple has been laundering billions in donations through shell companies linked to a sitting senator. The National Office of Buddhism is implicated. Devout Buddhists are torn between faith and fury.",
    choices: [
      {
        label: "Order a full investigation regardless of political fallout",
        effects: { popularity: +8, unrest: +7, militaryPatience: -5 },
        partyEffects: { progressive_move: +10, national_heritage: -15, peoples_populist: +5 },
        outcome: "Arrests are made. Donors are shocked. You've touched the untouchable — brave or foolish, history will decide."
      },
      {
        label: "Refer it to religious authorities to handle internally",
        effects: { popularity: -5, unrest: +3 },
        partyEffects: { national_heritage: +10, progressive_move: -10 },
        outcome: "The Sangha Supreme Council promises 'internal review.' Nothing changes. Cynicism grows."
      }
    ]
  }
];

// ─── GAME CONSTANTS ─────────────────────────────────────────
const GAME_CONSTANTS = {
  COUP_THRESHOLD: 100,         // Unrest level that triggers a military coup
  MILITARY_COUP_PATIENCE: 0,   // If militaryPatience hits 0, coup regardless of unrest
  MIN_COALITION_SEATS: 251,    // Minimum seats for coalition majority
  BUDGET_BANKRUPTCY: 0,        // Game over if budget runs out
  MAX_POPULARITY: 100,
  MIN_POPULARITY: 0,
  MAX_UNREST: 100,
  MIN_UNREST: 0,
  MONTHLY_BUDGET_INCOME: 85,   // Tax revenue per month
  MONTHLY_UNREST_DECAY: -2,    // Natural unrest decay per month
  MONTHLY_POPULARITY_DECAY: -1 // Natural popularity decay (public gets bored)
};

// ─── EXPORT (accessible globally) ───────────────────────────
// Since we're using vanilla JS without modules, these are global constants.
// They can be accessed directly from other script files.
