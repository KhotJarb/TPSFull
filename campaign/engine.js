import { GameState, Parties, PlayerActions, Districts, Regions, MPs } from './data.js';

/**
 * deeply processes the costs, RNG elements, and stat changes for all 10 actions
 * @param {string} actionId 
 * @param {Object} targetParams { targetPartyId, districtId, regionId, factionType }
 */
export function executeAction(actionId, targetParams = {}) {
    const action = PlayerActions[actionId];
    if (!action) return { success: false, log: "Invalid Action!" };

    if (GameState.actionPoints < action.apCost) {
        return { success: false, log: "Not enough Action Points." };
    }

    const pParty = Parties[GameState.playerPartyId];
    let logMsg = "";

    switch (actionId) {
        case "fundraiseGala":
            pParty.funds += 2000000;
            pParty.ideology = Math.min(100, pParty.ideology + 5);
            pParty.ecScrutiny += 15;
            logMsg = "Hosted Fundraise Gala: +2M Funds, shifted right, +15 EC Scrutiny.";
            break;

        case "lawfarePetition":
            if (pParty.funds < 2000000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 2000000;
            const targetP = Parties[targetParams.targetPartyId];
            if (Math.random() < 0.4) {
                targetP.nationalPopularity -= 15;
                logMsg = `Lawfare success: ${targetP.name} loses massive popularity!`;
            } else {
                pParty.nationalPopularity -= 5;
                logMsg = "Lawfare failed: Backlash reduces your popularity by 5%.";
            }
            break;

        case "mobilizeFlashMob":
            if (pParty.funds < 500000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 500000;
            pParty.nationalPopularity += 10;
            GameState.socialUnrest += 15;
            logMsg = "Flash Mob mobilized: Popularity boosted, but Social Unrest rises.";
            break;

        case "deployIO":
            if (pParty.funds < 300000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 300000;
            const targetIO = Parties[targetParams.targetPartyId];
            targetIO.nationalPopularity -= 5;
            if (Math.random() < 0.25) {
                pParty.ecScrutiny += 25;
                logMsg = "Cyber IO effective, but trace discovered! SCANDAL: +25 EC Scrutiny.";
            } else {
                logMsg = `Cyber IO: ${targetIO.name} popularity reduced by 5%.`;
            }
            break;

        case "buyBanYai":
            if (pParty.funds < 5000000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 5000000;
            const dist = Districts.find(d => d.id === targetParams.districtId);
            dist.banYaiBonus = 100;
            logMsg = `Ban Yai loyalty bought in District ${dist.id}. Base bonus massive.`;
            break;

        case "overseasConsultation":
            if (pParty.funds < 1000000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 1000000;
            GameState.turn += 1; // skip turn
            pParty.ecScrutiny += 30;
            MPs.filter(m => m.partyId === GameState.playerPartyId).forEach(m => m.loyalty = 100);
            logMsg = "Overseas Consultation: MPs loyalty locked to 100%. Skipped turn. EC Risk spiked +30.";
            break;

        case "arrangePartyList":
            GameState.partyListBonusActive = targetParams.factionType;
            logMsg = `Party List prioritized for ${targetParams.factionType}. Passive effects active.`;
            break;

        case "preElectionSecretPact":
            const targetPact = Parties[targetParams.targetPartyId];
            if (Math.random() < 0.3) {
                pParty.nationalPopularity -= 20;
                logMsg = `DISASTER! Secret Pact with ${targetPact.name} leaked! Voter betrayal: -20% Popularity!`;
            } else {
                GameState.secretPacts.push(targetParams.targetPartyId);
                logMsg = `Secret coalition secured under the table with ${targetPact.name}.`;
            }
            break;

        case "megaRegionalRally":
            if (pParty.funds < 8000000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 8000000;
            Districts.filter(d => d.regionId === targetParams.regionId).forEach(d => {
                d.basePopularity[GameState.playerPartyId] = (d.basePopularity[GameState.playerPartyId] || 0) + 25;
            });
            logMsg = `Mega Rally in ${targetParams.regionId}: +25 Popularity to all local candidates.`;
            break;

        case "deployWatchdogs":
            if (pParty.funds < 1000000) return { success: false, log: "Insufficient Funds." };
            pParty.funds -= 1000000;
            const wdDist = Districts.find(d => d.id === targetParams.districtId);
            wdDist.watchdogActive = true;
            logMsg = `Election watchdogs swarming ${wdDist.id}. AI Ban Yai tactics nullified.`;
            break;

        default:
            return { success: false, log: "Unknown action." };
    }

    GameState.actionPoints -= action.apCost;
    return { success: true, log: logMsg };
}

/**
 * Handle passive loop elements (e.g. active list faction)
 */
export function processPassiveWeekly() {
    const pParty = Parties[GameState.playerPartyId];
    if (GameState.partyListBonusActive === "Tycoons") {
        pParty.funds += 800000;
        pParty.nationalPopularity = Math.max(0, pParty.nationalPopularity - 2);
    } else if (GameState.partyListBonusActive === "Activists") {
        pParty.nationalPopularity += 3;
        pParty.funds = Math.max(0, pParty.funds - 400000);
    }
}

/**
 * Runs 400 constituency + 100 Party list simulation
 */
export function runElection() {
    let constituencyResults = {};
    Object.keys(Parties).forEach(k => constituencyResults[k] = 0);
    
    // 1. CONSTITUENCY (First Past the Post, Highest Score Wins)
    Districts.forEach(d => {
        let bestScore = -1;
        let winnerParty = null;
        
        Object.keys(Parties).forEach(partyId => {
            let score = d.basePopularity[partyId] || 0;
            score += Math.random() * 20; // Campaign margin of error
            
            // Add Player BanYai Buyout
            if (partyId === GameState.playerPartyId && d.banYaiBonus > 0) {
                score += d.banYaiBonus;
            }
            
            // AI BanYai mechanics (If AI, random huge spike unless watchdogs active)
            if (partyId !== GameState.playerPartyId && !d.watchdogActive && Math.random() < 0.1) {
                score += 80;
                Parties[partyId].ecScrutiny += 5; // AI incurs trace scrutiny
            }
            
            if (score > bestScore) {
                bestScore = score;
                winnerParty = partyId;
            }
        });
        
        constituencyResults[winnerParty]++;
    });

    // 2. PARTY LIST (100 seats, Largest Remainder Method)
    let partyListResults = {};
    Object.keys(Parties).forEach(k => partyListResults[k] = 0);

    let totalPop = Object.values(Parties).reduce((sum, p) => sum + p.nationalPopularity, 0);
    if (totalPop === 0) totalPop = 1; // Safefall

    let remainingSeats = 100;
    let remainders = [];

    Object.keys(Parties).forEach(partyId => {
        let exactSeats = (Parties[partyId].nationalPopularity / totalPop) * 100;
        let automaticSeats = Math.floor(exactSeats);
        partyListResults[partyId] = automaticSeats;
        remainingSeats -= automaticSeats;
        
        remainders.push({ id: partyId, fraction: exactSeats - automaticSeats });
    });

    remainders.sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < remainingSeats; i++) {
        partyListResults[remainders[i].id]++;
    }

    // 3. COMBINE TOTALS
    let totalSeats = {};
    Object.keys(Parties).forEach(partyId => {
        totalSeats[partyId] = constituencyResults[partyId] + partyListResults[partyId];
    });

    return { totalSeats, constituencyResults, partyListResults };
}

/**
 * Resolve coalition logic and process win/loss state
 */
export function coalitionPhase(electionResults) {
    let playerSeats = electionResults.totalSeats[GameState.playerPartyId];
    
    // Synergize Secret Pacts
    GameState.secretPacts.forEach(pactPartyId => {
        playerSeats += electionResults.totalSeats[pactPartyId];
    });
    
    return {
        totalCoalitionSeats: playerSeats,
        win: playerSeats >= 251 // Majority to form Govt
    };
}

export function checkWinLoss(electionResults) {
    const coaRes = coalitionPhase(electionResults);
    
    if (coaRes.win) {
        // Redirection to the Governing simulation loop
        setTimeout(() => {
            window.location.href = "../main-game/index.html"; 
        }, 3000);
        return { isWin: true, log: `VICTORY! You govern with ${coaRes.totalCoalitionSeats} seats. Redirecting to Goverment loop...` };
    } else {
        return { isWin: false, log: `DEFEAT! You only secured ${coaRes.totalCoalitionSeats} seats. Plunged into a 4-year opposition loop.` };
    }
}
