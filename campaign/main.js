import { GameState, Parties, PlayerActions, MPs } from './data.js';
import { executeAction, processPassiveWeekly, runElection, checkWinLoss } from './engine.js';
import { initMap, updateMapColors } from './map.js';

window.targetMode = null; // 'district' | 'region' | null
let pendingActionId = null;

document.addEventListener("DOMContentLoaded", () => {
    initUI();
    initMap(onDistrictClick, onRegionClick);
    updateResourceBars();
});

function initUI() {
    const actionGrid = document.getElementById("action-grid");
    
    // Wire up the 10 Action Buttons dynamically
    Object.values(PlayerActions).forEach(action => {
        const btn = document.createElement("button");
        btn.className = "action-btn";
        // Provide visual distinction between standard and targeted actions
        let indicator = "";
        if (action.needsDistrictTarget) indicator = "🎯 District";
        else if (action.needsRegionTarget) indicator = "🗺️ Region";
        else if (action.needsPartyTarget) indicator = "🤝 RNG Party";
        
        btn.innerHTML = `<strong>${action.name} <span style="float:right;color:#66fcf1;font-size:0.75rem;">${indicator}</span></strong><small>${action.description}</small>`;
        
        btn.onclick = () => handleActionClick(action.id);
        actionGrid.appendChild(btn);
    });

    // Custom modally mapped element (arrangePartyList)
    document.getElementById("btn-party-list").onclick = () => {
        document.getElementById("party-list-modal").classList.remove("hidden");
    };
    
    document.getElementById("close-modal").onclick = () => {
        document.getElementById("party-list-modal").classList.add("hidden");
    };

    document.querySelectorAll(".faction-select-btn").forEach(btn => {
        btn.onclick = (e) => {
            const faction = e.currentTarget.getAttribute("data-faction");
            executeAndLog("arrangePartyList", { factionType: faction });
            document.getElementById("party-list-modal").classList.add("hidden");
        };
    });

    document.getElementById("btn-end-turn").onclick = endTurn;
    document.getElementById("btn-run-election").onclick = triggerElectionNight;
}

function handleActionClick(actionId) {
    const action = PlayerActions[actionId];
    
    // AP check first to prevent targeting sequence if invalid
    if (GameState.actionPoints < action.apCost) {
        logMsg("Denied: Insufficient Action Points.", false);
        return;
    }

    if (action.needsDistrictTarget) {
        pendingActionId = actionId;
        window.targetMode = "district";
        document.getElementById("map-target-status").innerText = `TARGETING: SELECT DISTRICT FOR [${action.name}]`;
        document.getElementById("map-target-status").style.color = "#f4b41a";
        logMsg(`Target acquisition active (District). Select visually on map...`, true);
        return;
    }

    if (action.needsRegionTarget) {
        pendingActionId = actionId;
        window.targetMode = "region";
        document.getElementById("map-target-status").innerText = `TARGETING: SELECT REGION FOR [${action.name}]`;
        document.getElementById("map-target-status").style.color = "#f4b41a";
        logMsg(`Target acquisition active (Region). Select visually on map...`, true);
        return;
    }

    if (action.needsPartyTarget) {
        // Find an AI partner.
        const oppKeys = Object.keys(Parties).filter(k => k !== GameState.playerPartyId);
        const randOppTarget = oppKeys[Math.floor(Math.random() * oppKeys.length)];
        executeAndLog(actionId, { targetPartyId: randOppTarget });
        return;
    }

    if (action.needsFactionTarget) {
        document.getElementById("party-list-modal").classList.remove("hidden");
        return; // Logic breaks to the modal listener
    }

    // Direct fire actions (e.g. fundraise gala, overseas consultation)
    executeAndLog(actionId, {});
}

function onDistrictClick(districtId) {
    if (window.targetMode !== "district") return;
    executeAndLog(pendingActionId, { districtId });
    resetTargeting();
}

function onRegionClick(regionId) {
    if (window.targetMode !== "region") return;
    executeAndLog(pendingActionId, { regionId });
    resetTargeting();
}

function resetTargeting() {
    window.targetMode = null;
    pendingActionId = null;
    const statObj = document.getElementById("map-target-status");
    statObj.innerText = `TARGETING: OFF`;
    statObj.style.color = "#66fcf1";
}

function executeAndLog(actionId, params) {
    const res = executeAction(actionId, params);
    logMsg(res.log, res.success);
    updateResourceBars();
}

function endTurn() {
    // Math logic bounds turn increments
    processPassiveWeekly();
    GameState.turn++;
    GameState.actionPoints = 1; // Replenish AP standard logic
    
    logMsg(`>> WEEK ${GameState.turn - 1} CONCLUDED. PASSIVE LIST MODIFIERS APPLIED. <<`, true);
    
    if (GameState.turn > GameState.maxTurns) {
        GameState.turn = GameState.maxTurns; // Cap display
        document.getElementById("btn-run-election").disabled = false;
        document.getElementById("btn-end-turn").disabled = true;
        logMsg(`CRITICAL ALERT: CAMPAIGN PHASE IS OVER. INITIATE ELECTION NIGHT IMMEDIATELY.`, false);
        document.getElementById("map-target-status").innerText = `SYSTEM LOCKED`;
        document.getElementById("map-target-status").style.color = "#e02f44";
    }
    
    updateResourceBars();
}

function updateResourceBars() {
    const pParty = Parties[GameState.playerPartyId];
    
    // Binding values strictly to Engine state metrics
    document.getElementById("funds-val").innerText = pParty.funds.toLocaleString();
    document.getElementById("pop-val").innerText = Math.round(pParty.nationalPopularity) + "%";
    
    const ecEl = document.getElementById("ec-val");
    ecEl.innerText = pParty.ecScrutiny + "/100";
    if (pParty.ecScrutiny > 80) ecEl.style.color = "#e02f44";
    else ecEl.style.color = "#66fcf1";

    document.getElementById("ap-val").innerText = GameState.actionPoints;
    document.getElementById("week-val").innerText = `${GameState.turn}/${GameState.maxTurns}`;
    document.getElementById("party-name-ui").innerText = pParty.name;
}

function logMsg(msg, isSuccess) {
    const ul = document.getElementById("action-log");
    const li = document.createElement("li");
    const d = new Date();
    const timePad = `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]`;
    li.innerText = `${timePad} ${msg}`;
    li.style.color = isSuccess ? "#66fcf1" : "#e02f44";
    ul.prepend(li); // Newest messages at the top
}

function triggerElectionNight() {
    logMsg("EXECUTING ELECTION NIGHT PROTOCOLS... COUNTING...", true);
    document.getElementById("btn-run-election").disabled = true;

    // Run Engine Simulation algorithm
    const electionResults = runElection();
    
    logMsg("SEATS TALLIED. TRANSMITTING MAP DATA OVERRIDE...", true);
    
    // Animate map D3 colors natively based on the generated DistrictWinners obj
    updateMapColors(electionResults.districtWinners, Parties);

    // Provide dynamic callback window before checking Win/Loss condition
    setTimeout(() => {
        const finalStatus = checkWinLoss(electionResults);
        logMsg(finalStatus.log, finalStatus.isWin);
    }, 4500); 
}
