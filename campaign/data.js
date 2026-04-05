// /campaign/data.js

// Deep Political Architecture & Entities

// Factions explicitly matching Thai political realities
export const FactionTypes = [
    "Tycoon/BanYai", 
    "Activist", 
    "Technocrat", 
    "Military Retainer", 
    "Union Leader"
];

// 5 Thai Parties with deep attributes (100 = Conservative, 0 = Progressive)
export const Parties = {
    "MFP": { id: "MFP", name: "Progressive Movement", funds: 2000000, nationalPopularity: 45, ideology: 10, ecScrutiny: 40, color: "#f47920" },
    "PTP": { id: "PTP", name: "Populist Front", funds: 8000000, nationalPopularity: 38, ideology: 40, ecScrutiny: 20, color: "#e00a22" },
    "BJT": { id: "BJT", name: "Provincial Tycoons", funds: 15000000, nationalPopularity: 22, ideology: 70, ecScrutiny: 10, color: "#203986" },
    "PPRP": { id: "PPRP", name: "Establishment Guard", funds: 12000000, nationalPopularity: 15, ideology: 90, ecScrutiny: 5, color: "#005b9b" },
    "UTN": { id: "UTN", name: "Nationalist Coalition", funds: 10000000, nationalPopularity: 18, ideology: 95, ecScrutiny: 8, color: "#162d59" }
};

// Map Data: 400 Districts TopoJSON Placeholder grouped into 5 Regions
export const Regions = [
    { id: "North", name: "North", districtCount: 37 },
    { id: "Northeast", name: "Northeast", districtCount: 133 },
    { id: "Central", name: "Central", districtCount: 122 },
    { id: "South", name: "South", districtCount: 75 },
    { id: "Bangkok", name: "Bangkok", districtCount: 33 }
];

export const Districts = [];
let districtIdCounter = 1;
Regions.forEach(region => {
    for (let i = 0; i < region.districtCount; i++) {
        Districts.push({
            id: `D${districtIdCounter}`,
            regionId: region.id,
            banYaiBonus: 0,
            watchdogActive: false, // For deployWatchdogs
            basePopularity: { "MFP": 10, "PTP": 10, "BJT": 10, "PPRP": 10, "UTN": 10 } 
        });
        districtIdCounter++;
    }
});

// MP Roster & Factions: Auto-generate 500 MPs
export const MPs = [];
for (let i = 1; i <= 500; i++) {
    const isPartyList = i > 400;
    const pKeys = Object.keys(Parties);
    const partyId = pKeys[Math.floor(Math.random() * pKeys.length)];
    const factionType = FactionTypes[Math.floor(Math.random() * FactionTypes.length)];
    
    MPs.push({
        id: `MP${i}`,
        type: isPartyList ? 'Party-List' : 'Constituency',
        partyId,
        factionType,
        loyalty: Math.floor(Math.random() * 50) + 50, // 50 to 100
        influence: Math.floor(Math.random() * 100),   // 0 to 100
        districtId: isPartyList ? null : `D${i}`
    });
}

// CRITICAL - 10 Active Campaign Actions
export const PlayerActions = {
    fundraiseGala: {
        id: "fundraiseGala",
        name: "Elite Fundraise Gala",
        apCost: 1,
        description: "Hobnob with tycoons. Huge +Funds, -Ideology (shifts conservative), +EC Scrutiny."
    },
    lawfarePetition: {
        id: "lawfarePetition",
        name: "Lawfare Petition",
        apCost: 1,
        description: "High cost. RNG chance to drastically reduce a rival's Popularity. If failed, player suffers backlash (-Popularity)."
    },
    mobilizeFlashMob: {
        id: "mobilizeFlashMob",
        name: "Mobilize Flash Mob",
        apCost: 1,
        description: "+Popularity (Youth/Urban), +Social Unrest."
    },
    deployIO: {
        id: "deployIO",
        name: "Deploy Cyber IO",
        apCost: 1,
        description: "Cheap. Lowers specific rival's popularity, high RNG risk of Scandal Event."
    },
    buyBanYai: {
        id: "buyBanYai",
        name: "Buy Ban Yai Loyalty",
        apCost: 1,
        needsDistrictTarget: true,
        description: "Massive cost. Grants instant +100% banYaiBonus in a specific D3 map district."
    },
    overseasConsultation: {
        id: "overseasConsultation",
        name: "Overseas Consultation",
        apCost: 1, // Will also skip turn in logic
        description: "Skips a turn, +30% EC Scrutiny, instantly restores all own MPs' loyalty to 100%."
    },
    arrangePartyList: {
        id: "arrangePartyList",
        name: "Arrange Party List",
        apCost: 1,
        needsFactionTarget: true,
        description: "Setting 'Tycoons' top gives passive +Funds but drains -Popularity. 'Activists' gives +Popularity but drains -Funds."
    },
    preElectionSecretPact: {
        id: "preElectionSecretPact",
        name: "Pre-Election Secret Pact",
        apCost: 1,
        needsPartyTarget: true,
        description: "RNG event. Secure AI party's seats for coalition. If leaks, suffer massive -20% nationalPopularity due to betrayal."
    },
    megaRegionalRally: {
        id: "megaRegionalRally",
        name: "Mega Regional Rally",
        apCost: 1,
        needsRegionTarget: true,
        description: "Spend massive funds. Buffs base popularity of ALL constituency candidates in a selected Region."
    },
    deployWatchdogs: {
        id: "deployWatchdogs",
        name: "Deploy Election Watchdogs",
        apCost: 1,
        needsDistrictTarget: true,
        description: "Defensive action. Cancels out AI's banYaiBonus in a specific district and increases AI's EC Scrutiny."
    }
};

// Global Game State Tracker
export const GameState = {
    turn: 1,
    maxTurns: 8,
    actionPoints: 1,
    playerPartyId: "MFP",
    socialUnrest: 0,
    partyListBonusActive: null, // Track passive income ("Tycoon/BanYai" or "Activist")
    secretPacts: []
};
