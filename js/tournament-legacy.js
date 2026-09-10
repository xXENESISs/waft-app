import { animals } from "./animals.js";

import {
  getSharedImageCandidates,
  buildSharedTurnSummary,
  deriveSharedTurnOutcome,
  formatSharedBattleLogLine,
  setupSwapFightersButton,
  isSharedThreeToedSlothFighter,
  getSharedSlothActiveColonies,
  isSharedSlothDormant,
  sharedSlothHasColony,
  getSharedSlothBacterialBonusForHitLevel,
  getSharedSlothBacterialNextHitBonus,
  getSharedSlothBacterialFollowingHitBonus,
  getSharedSlothBacterialProgressText,
  getSharedThreeToedSlothStatusText,
  getSharedSlothColonyCurrentEffectText,
  getSharedSlothMiniStateLabel,
  getSharedSlothFullStateLabel,
  renderSharedSlothColonyChip,
  renderSharedSlothEcosystemMiniPanel,
  renderSharedSlothColonyDetailCard,
  updateSharedSlothEcosystemButtonDom,
  isSharedCoconutOctopusFighter,
  getSharedCoconutOctopusFormText,
  getSharedCoconutOctopusSpecialChoiceText,
  getSharedCoconutOctopusFormChargeMax,
  getSharedCoconutOctopusFormCharge,
  getSharedCoconutOctopusCurrentCharge,
  getSharedCoconutOctopusCurrentChargeMax,
  getSharedCoconutOctopusChargeLine,
  getSharedCoconutOctopusStatusText,
  getSharedCoconutOctopusFormDefinitionForPreview,
  getSharedCoconutOctopusPreviewStatsHtml,
  renderSharedCoconutOctopusFormPreviewDom,
  updateSharedCoconutOctopusPanelDom,
  renderSharedOnlineTournamentOctopusPanel,
  updateSharedLarvalCommandButtonDom,
  getSharedLarvalDraftTotal,
  getSharedCurrentLarvae,
  renderSharedLarvalCommandModalDom
} from "./waft-ui-core.js";
import { setupFighterSelector } from "./fighter-selector.js";
import {
  createBattle,
  resolveTurn,
  canUseAction,
  getEffectiveStat,
  transformCoconutOctopus,
  setCoconutOctopusPerfectAdaptationChoice
} from "./battle-engine.js";
import { chooseAndApplyAIAction } from "./ai-controller.js";

let currentTournament = null;
let currentBattle = null;
let currentPlayerBattle = null;
let currentPlayerMatch = null;
let currentOpponentId = null;
let currentBattleViewMode = "player";
let currentAIReplayMatch = null;
let currentAIReplayIndex = 0;
let isResolvingTurn = false;

let playerFlipped = false;
let enemyFlipped = true;
let pendingOctopusFormPreview = null;
let pendingOctopusSpecialChoiceConfirmed = false;

let lastTurnSummaryLines = ["Start a tournament to begin."];

let summaryAnimationToken = 0;

const TYPEWRITER_CHAR_DELAY = 8;
const TYPEWRITER_LINE_PAUSE = 180;

let larvalDraftCommand = {
  attack: 0,
  defense: 0,
  sacrifice: 0
};

const ROUND_DEFINITIONS = [
  { name: "Round of 16", key: "round16", matchCount: 8 },
  { name: "Quarterfinals", key: "quarterfinals", matchCount: 4 },
  { name: "Semifinals", key: "semifinals", matchCount: 2 },
  { name: "Final", key: "final", matchCount: 1 },
  { name: "Champion", key: "champion", matchCount: 1 }
];

const ACTION_POOL = ["normal", "quick", "precise", "explosive", "concentration", "special"];

const OCTOPUS_FORM_LABELS = {
  base: "Base Form",
  offensive: "Offensive Form",
  defensive: "Defensive Form",
  evasive: "Evasive Form"
};

const OCTOPUS_SPECIAL_CHOICE_LABELS = {
  "tentacle-storm": "Tentacle Storm",
  "coconut-fortress": "Coconut Fortress",
  "ink-sea": "Ink Sea"
};


function getAnimalName(fighterId) {
  return animals[fighterId]?.name || fighterId || "TBD";
}


function isCoconutOctopusFighter(fighter) {
  return isSharedCoconutOctopusFighter(fighter);
}

function getCoconutOctopusFormText(fighter) {
  return getSharedCoconutOctopusFormText(fighter);
}

function getCoconutOctopusStatusText(fighter) {
  return getSharedCoconutOctopusStatusText(fighter);
}

function getCoconutOctopusFormDefinitionForPreview(formId) {
  return getSharedCoconutOctopusFormDefinitionForPreview(formId);
}

function getCoconutOctopusPreviewStatsHtml(form) {
  if (!form?.stats) return "";
  const rows = [
    ["Life", form.stats.life],
    ["Attack", form.stats.attack],
    ["Defense", form.stats.defense],
    ["Stamina", form.stats.resistance],
    ["Speed", form.stats.speed],
    ["Technique", form.stats.technique],
    ["Agility", form.stats.agility],
    ["Explosive", form.stats.explosiveness]
  ];
  return rows.map(([label, value]) => `<div class="octopus-preview-stat">${label}<strong>${value}</strong></div>`).join("");
}

function getPassiveDescriptionText(fighterId, passive) {
  if (fighterId === "honey-badger" && passive?.id === "savage-endurance") {
    return (
      "Ignores fatigue penalties and prevents stat reductions caused by fatigue. " +
      "When below 25% HP, becomes immune to critical hits and gains +20% Attack and +20% Explosiveness."
    );
  }

  return passive?.description || "No passive.";
}

function getPassiveFullText(fighterId) {
  const animal = animals[fighterId];

  if (!animal?.passive) {
    return "None";
  }

  return (
    animal.passive.name +
    "\n" +
    getPassiveDescriptionText(fighterId, animal.passive)
  );
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeTurnSummary(lines) {
  const token = ++summaryAnimationToken;
  const box = document.getElementById("turnSummaryBox");

  if (!box) return;

  box.textContent = "";

  for (let i = 0; i < lines.length; i++) {
    if (token !== summaryAnimationToken) return;

    if (box.textContent.length > 0) {
      box.textContent += "\n";
    }

    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      if (token !== summaryAnimationToken) return;

      box.textContent += line[j];
      await delay(TYPEWRITER_CHAR_DELAY);
    }

    await delay(TYPEWRITER_LINE_PAUSE);
  }
}


function applyFlipStates() {
  const playerImg = document.getElementById("playerImage");
  const enemyImg = document.getElementById("enemyImage");

  if (playerImg) playerImg.classList.toggle("flipped", playerFlipped);
  if (enemyImg) enemyImg.classList.toggle("flipped", enemyFlipped);
}

function clearAnimationClasses() {
  const playerWrap = document.getElementById("playerImageWrap");
  const enemyWrap = document.getElementById("enemyImageWrap");

  if (!playerWrap || !enemyWrap) return;

  const classes = [
    "move-attacker-left",
    "move-attacker-right",
    "hit-defender-left",
    "hit-defender-right",
    "hit-defender-left-crit",
    "hit-defender-right-crit"
  ];

  playerWrap.classList.remove(...classes);
  enemyWrap.classList.remove(...classes);
}

function pushAnimationEvent(events, actorName, targetName, player, enemy, hit, critical = false) {
  if (!player || !enemy) return;

  const validActor = actorName === player.name || actorName === enemy.name;
  const validTarget = targetName === player.name || targetName === enemy.name;

  if (!validActor || !validTarget || actorName === targetName) return;

  events.push({ actor: actorName, target: targetName, hit, critical });
}

async function runShakeSequence(newLines, player, enemy) {
  clearAnimationClasses();

  const playerWrap = document.getElementById("playerImageWrap");
  const enemyWrap = document.getElementById("enemyImageWrap");

  if (!playerWrap || !enemyWrap || !player || !enemy) return;

  const events = [];

  for (const line of newLines) {
    let match;

    match = line.match(/^(.+?) hits (.+?) with (.+?) for (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      pushAnimationEvent(events, match[1], match[2], player, enemy, true, Boolean(match[5]));
      continue;
    }

    match = line.match(/^(.+?) uses (.+?) but misses (.+?)\.$/);
    if (match) {
      pushAnimationEvent(events, match[1], match[3], player, enemy, false, false);
      continue;
    }

    match = line.match(/^(.+?) uses Ballistic Strike and deals (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      const targetName = match[1] === player.name ? enemy.name : player.name;
      pushAnimationEvent(events, match[1], targetName, player, enemy, true, Boolean(match[3]));
      continue;
    }

    match = line.match(/^(.+?) uses (.+?), dealing (\d+) damage/);
    if (match) {
      const targetName = match[1] === player.name ? enemy.name : player.name;
      pushAnimationEvent(events, match[1], targetName, player, enemy, true, false);
      continue;
    }

    match = line.match(/^(.+?) uses (.+?) and deals (\d+) damage/);
    if (match) {
      const targetName = match[1] === player.name ? enemy.name : player.name;
      pushAnimationEvent(events, match[1], targetName, player, enemy, true, false);
      continue;
    }

    match = line.match(/^(.+?) strikes from Phantom Current for (\d+) damage\.$/);
    if (match) {
      const targetName = match[1] === player.name ? enemy.name : player.name;
      pushAnimationEvent(events, match[1], targetName, player, enemy, true, false);
      continue;
    }

    match = line.match(/^(.+?)'s Raptorial Chain strike (\d+) hits (.+?) for (\d+) damage\.$/);
    if (match) {
      pushAnimationEvent(events, match[1], match[3], player, enemy, true, false);
      continue;
    }

    match = line.match(/^(.+?)'s Marine Echo triggers: second hit deals (\d+) damage\.$/);
    if (match) {
      const targetName = match[1] === player.name ? enemy.name : player.name;
      pushAnimationEvent(events, match[1], targetName, player, enemy, true, false);
      continue;
    }

    match = line.match(/^(.+?)'s Larval Attack sends (\d+) larva(?:e)? into (.+?), dealing (\d+) guaranteed damage\.$/);
    if (match) {
      pushAnimationEvent(events, match[1], match[3], player, enemy, true, false);
      continue;
    }

    match = line.match(/^(\d+) overflowing larva(?:e)? from (.+?)'s Darwinian Expulsion strike (.+?) for (\d+) guaranteed damage\.$/);
    if (match) {
      pushAnimationEvent(events, match[2], match[3], player, enemy, true, false);
      continue;
    }
  }

  for (const event of events) {
    const actorIsPlayer = event.actor === player.name;
    const attackerWrap = actorIsPlayer ? playerWrap : enemyWrap;
    const defenderWrap = actorIsPlayer ? enemyWrap : playerWrap;

    attackerWrap.classList.add(actorIsPlayer ? "move-attacker-left" : "move-attacker-right");
    await delay(220);
    attackerWrap.classList.remove(actorIsPlayer ? "move-attacker-left" : "move-attacker-right");

    if (event.hit) {
      const hitClass = actorIsPlayer
        ? event.critical
          ? "hit-defender-right-crit"
          : "hit-defender-right"
        : event.critical
        ? "hit-defender-left-crit"
        : "hit-defender-left";

      defenderWrap.classList.add(hitClass);
      await delay(event.critical ? 260 : 220);
      defenderWrap.classList.remove(hitClass);
    }

    await delay(60);
  }
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function getAvailableFighterIds() {
  return Object.keys(animals).filter((fighterId) => {
    const animal = animals[fighterId];
    return animal && animal.stats && animal.name;
  });
}

function getImageCandidates(id, animal) {
  const category = animal?.category ?? "";
  const direct = `./images/animals/${category}/${id}.png`;

  const legacy = {
    "sumatran-tiger": ["./images/animals/mammals/sumatran-tiger.png"],
    walrus: ["./images/animals/fish/walrus.png"],
    "shima-enaga": ["./images/animals/birds/shima-enaga.png"],
    "mantis-shrimp": ["./images/animals/fish/mantis-shrimp.png"],
    "dung-beetle": ["./images/animals/arthropods/dung-beetle.png"],
    caiman: ["./images/animals/reptiles/black-caiman.png"],
    axolotl: ["./images/animals/amphibians/axolotl.png"],
    "emerald-wasp": ["./images/animals/arthropods/emerald-jewel-wasp.png"],
    "peregrine-falcon": ["./images/animals/birds/peregrine-falcon.png"],
    sailfish: ["./images/animals/fish/sailfish.png"],
    "tibetan-macaque": ["./images/animals/mammals/tibetan-macaque.png"],
    iguana: ["./images/animals/reptiles/green-iguana.png"],
    "japanese-fire-bellied-newt": ["./images/animals/amphibians/japanese-fire-bellied-newt.png"],
    "honey-badger": ["./images/animals/mammals/honey-badger.png"],
    pufferfish: ["./images/animals/fish/pufferfish.png"],
    "eurasian-eagle-owl": ["./images/animals/birds/eurasian-eagle-owl.png"],
    matamata: ["./images/animals/reptiles/matamata.png"],
    fennec: ["./images/animals/mammals/fennec.png"],
    "giant-asian-mantis": ["./images/animals/arthropods/asian-giant-mantis.png"],
    "darwins-frog": ["./images/animals/amphibians/darwins-frog.png"],
    "coconut-octopus": ["./images/animals/fish/coconut-octopus.png"],
    "iberian-ribbed-newt": ["./images/animals/amphibians/iberian-ribbed-newt.png"],
    "iberian-skink": ["./images/animals/reptiles/iberian-skink.png"],
      "bombardier-beetle": ["./images/animals/arthropods/bombardier-beetle.png"],
};

  return getSharedImageCandidates(id, animal, legacy);
}

function loadFighterImage(imgEl, fighterId) {
  if (!imgEl) return;

  const animal = animals[fighterId];
  const candidates = getImageCandidates(fighterId, animal);
  let index = 0;

  function tryNext() {
    if (index >= candidates.length) {
      imgEl.removeAttribute("src");
      return;
    }

    imgEl.src = candidates[index];
    index += 1;
  }

  imgEl.onerror = tryNext;
  tryNext();
}

function percent(current, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function prettyActionLabel(action, fighter = null) {
  if (action === "special" && fighter?.special?.name) {
    return fighter.special.name;
  }

  const labels = {
    normal: "Normal Attack",
    quick: "Quick Attack",
    precise: "Precise Attack",
    explosive: "Explosive Attack",
    concentration: "Concentration",
    special: "Special Attack",
    "larval-command": "Larval Command"
  };

  return labels[action] ?? action;
}

function createEmptyRounds() {
  return [
    {
      name: "Round of 16",
      matches: []
    },
    {
      name: "Quarterfinals",
      matches: [
        { id: "qf-1", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "qf-2", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "qf-3", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "qf-4", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    },
    {
      name: "Semifinals",
      matches: [
        { id: "sf-1", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "sf-2", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    },
    {
      name: "Final",
      matches: [
        { id: "final-1", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    },
    {
      name: "Champion",
      matches: [
        { id: "champion", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    }
  ];
}

function createTournament(playerFighterId) {
  const availableFighters = getAvailableFighterIds();

  if (availableFighters.length < 16) {
    throw new Error("At least 16 fighters are required to create a tournament.");
  }

  const randomOpponents = shuffleArray(
    availableFighters.filter((fighterId) => fighterId !== playerFighterId)
  ).slice(0, 15);

  const participants = shuffleArray([
    playerFighterId,
    ...randomOpponents
  ]);

  const rounds = createEmptyRounds();

  for (let i = 0; i < 16; i += 2) {
    rounds[0].matches.push({
      id: "r16-" + (i / 2 + 1),
      fighterA: participants[i],
      fighterB: participants[i + 1],
      winner: null,
      resolved: false,
      positionA: i + 1,
      positionB: i + 2
    });
  }

  const playerPosition = participants.indexOf(playerFighterId) + 1;

  return {
    active: true,
    finished: false,
    playerFighterId,
    playerPosition,
    playerEliminated: false,
    champion: null,
    currentRoundIndex: 0,
    awaitingContinue: false,
    rounds
  };
}

function populateFighterSelect() {
  const select = document.getElementById("playerFighter");
  const fighterIds = getAvailableFighterIds();

  select.innerHTML = "";

  fighterIds.forEach((fighterId) => {
    const option = document.createElement("option");
    option.value = fighterId;
    option.textContent = getAnimalName(fighterId);
    select.appendChild(option);
  });
}

function matchContainsPlayer(match) {
  if (!currentTournament || !match) return false;

  return (
    match.fighterA === currentTournament.playerFighterId ||
    match.fighterB === currentTournament.playerFighterId
  );
}

function getPlayerMatch(roundIndex) {
  if (!currentTournament) return null;

  const round = currentTournament.rounds[roundIndex];
  if (!round) return null;

  return round.matches.find((match) => matchContainsPlayer(match)) || null;
}

function getMatchOpponent(match) {
  if (!match || !currentTournament) return null;

  if (match.fighterA === currentTournament.playerFighterId) {
    return match.fighterB;
  }

  if (match.fighterB === currentTournament.playerFighterId) {
    return match.fighterA;
  }

  return null;
}

function placeWinnerInNextRound(roundIndex, matchIndex, winnerId) {
  if (!currentTournament) return;

  const nextRound = currentTournament.rounds[roundIndex + 1];
  if (!nextRound) return;

  if (roundIndex === 3) {
    const championMatch = nextRound.matches[0];
    championMatch.fighterA = winnerId;
    championMatch.winner = winnerId;
    championMatch.resolved = true;
    currentTournament.champion = winnerId;
    currentTournament.finished = true;
    return;
  }

  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];

  if (matchIndex % 2 === 0) {
    nextMatch.fighterA = winnerId;
  } else {
    nextMatch.fighterB = winnerId;
  }
}

function cloneBattleForReplay(battle) {
  return JSON.parse(JSON.stringify(battle));
}

function createAIReplayFrame(battle, summaryLines, label) {
  return {
    battle: cloneBattleForReplay(battle),
    summaryLines: Array.isArray(summaryLines) && summaryLines.length
      ? [...summaryLines]
      : ["No major events this turn."],
    label: label || "Turn " + battle.turn
  };
}

function getAIReplayFrames(match) {
  return Array.isArray(match?.aiReplay) ? match.aiReplay : [];
}

function resolveAIMatchToCompletion(match) {
  if (!match || !match.fighterA || !match.fighterB) return null;

  const battle = createBattle(match.fighterA, match.fighterB);
  let safety = 0;

  match.aiReplay = [
    createAIReplayFrame(
      battle,
      [
        "AI combat ready.",
        getAnimalName(match.fighterA) + " vs " + getAnimalName(match.fighterB) + ".",
        "Use Next Turn / Previous Turn to review the fight."
      ],
      "Start"
    )
  ];

  while (!battle.finished && safety < 160) {
    const oldLogLength = battle.log.length;
    const decisionA = chooseAndApplyAIAction(battle, battle.fighterA);
    const decisionB = chooseAndApplyAIAction(battle, battle.fighterB);

    resolveTurn(battle, decisionA.action, decisionB.action);

    const newLines = battle.log.slice(oldLogLength);
    match.aiReplay.push(
      createAIReplayFrame(
        battle,
        buildTurnSummary(newLines),
        "Turn " + Math.max(1, battle.turn - 1)
      )
    );

    safety += 1;
  }

  match.aiBattle = cloneBattleForReplay(battle);
  match.battleLog = battle.log.slice(-80);
  match.turns = battle.turn;

  return battle;
}

function getAIMatchWinnerId(match, battle) {
  if (!match || !battle) return match?.fighterA || null;

  if (battle.winner === match.fighterA || battle.winner === match.fighterB) {
    return battle.winner;
  }

  const scoreA =
    (battle.fighterA?.hp || 0) +
    (battle.fighterA?.stamina || 0) * 0.35 +
    ((battle.fighterA?.specialCharge || 0) * 10);

  const scoreB =
    (battle.fighterB?.hp || 0) +
    (battle.fighterB?.stamina || 0) * 0.35 +
    ((battle.fighterB?.specialCharge || 0) * 10);

  return scoreA >= scoreB ? match.fighterA : match.fighterB;
}

function resolveRandomNonPlayerMatches(roundIndex) {
  if (!currentTournament) return;

  const round = currentTournament.rounds[roundIndex];
  if (!round || roundIndex >= 4) return;

  round.matches.forEach((match, matchIndex) => {
    if (match.resolved) return;
    if (!match.fighterA || !match.fighterB) return;
    if (matchContainsPlayer(match)) return;

    const battle = resolveAIMatchToCompletion(match);
    const winner = getAIMatchWinnerId(match, battle);

    match.winner = winner;
    match.resolved = true;

    placeWinnerInNextRound(roundIndex, matchIndex, winner);
  });
}

function resolveRemainingTournamentAfterElimination(startRoundIndex) {
  if (!currentTournament) return;

  for (let roundIndex = startRoundIndex; roundIndex <= 3; roundIndex++) {
    const round = currentTournament.rounds[roundIndex];

    if (!round) continue;

    round.matches.forEach((match, matchIndex) => {
      if (match.resolved) return;
      if (!match.fighterA || !match.fighterB) return;

      const battle = resolveAIMatchToCompletion(match);
      const winner = getAIMatchWinnerId(match, battle);

      match.winner = winner;
      match.resolved = true;

      placeWinnerInNextRound(roundIndex, matchIndex, winner);
    });
  }
}


function loadCurrentPlayerBattle() {
  if (!currentTournament || currentTournament.finished || currentTournament.playerEliminated) {
    currentBattle = null;
    currentPlayerBattle = null;
    currentPlayerMatch = null;
    currentOpponentId = null;
    currentBattleViewMode = "player";
    currentAIReplayMatch = null;
    currentAIReplayIndex = 0;
    return;
  }

  currentBattleViewMode = "player";
  currentAIReplayMatch = null;
  currentAIReplayIndex = 0;
  currentPlayerMatch = getPlayerMatch(currentTournament.currentRoundIndex);
  currentOpponentId = getMatchOpponent(currentPlayerMatch);

  if (!currentPlayerMatch || !currentOpponentId) {
    currentBattle = null;
    currentPlayerBattle = null;
    return;
  }

  currentPlayerBattle = createBattle(currentTournament.playerFighterId, currentOpponentId);
  currentBattle = currentPlayerBattle;

  playerFlipped = false;
  enemyFlipped = true;

  lastTurnSummaryLines = [
    currentTournament.rounds[currentTournament.currentRoundIndex].name + " begins.",
    getAnimalName(currentTournament.playerFighterId) +
      " faces " +
      getAnimalName(currentOpponentId) +
      "."
  ];

  currentTournament.awaitingContinue = false;
}

function chooseEnemyAction(fighter) {
  const decision = chooseAndApplyAIAction(currentBattle, fighter);
  return decision.action;
}

function getBattleFighters() {
  if (!currentBattle || !currentTournament) {
    return { player: null, enemy: null };
  }

  if (currentBattleViewMode === "ai-replay") {
    return {
      player: currentBattle.fighterA,
      enemy: currentBattle.fighterB
    };
  }

  const player =
    currentBattle.fighterA.id === currentTournament.playerFighterId
      ? currentBattle.fighterA
      : currentBattle.fighterB;

  const enemy =
    player === currentBattle.fighterA
      ? currentBattle.fighterB
      : currentBattle.fighterA;

  return { player, enemy };
}

function setAIReplayFrame(match, frameIndex) {
  const frames = getAIReplayFrames(match);
  if (!match || frames.length === 0) return;

  currentAIReplayMatch = match;
  currentAIReplayIndex = Math.max(0, Math.min(frames.length - 1, frameIndex));

  const frame = frames[currentAIReplayIndex];
  currentBattle = cloneBattleForReplay(frame.battle);
  currentOpponentId = match.fighterB;
  currentBattleViewMode = "ai-replay";

  const finalFrame = currentAIReplayIndex === frames.length - 1;
  lastTurnSummaryLines = [
    frame.label + " / " + (frames.length - 1),
    ...frame.summaryLines,
    finalFrame && match.winner ? "Winner: " + getAnimalName(match.winner) : null
  ].filter(Boolean);

  renderTournament();
}

function viewResolvedAIMatch(roundIndex, matchIndex) {
  if (!currentTournament) return;

  const match = currentTournament.rounds[roundIndex]?.matches?.[matchIndex];
  if (!match || !match.aiBattle) return;

  if (!Array.isArray(match.aiReplay) || match.aiReplay.length === 0) {
    match.aiReplay = [
      createAIReplayFrame(
        match.aiBattle,
        [
          "This AI combat was created before turn replay existed.",
          "Only the final state can be shown."
        ],
        "Final"
      )
    ];
  }

  setAIReplayFrame(match, 0);
}

function returnToPlayerCombat() {
  if (!currentTournament) return;

  currentAIReplayMatch = null;
  currentAIReplayIndex = 0;
  currentBattleViewMode = "player";
  currentPlayerMatch = getPlayerMatch(currentTournament.currentRoundIndex);
  currentOpponentId = getMatchOpponent(currentPlayerMatch);

  if (currentPlayerBattle) {
    currentBattle = currentPlayerBattle;
  } else if (currentPlayerMatch && currentOpponentId && !currentPlayerMatch.resolved) {
    currentPlayerBattle = createBattle(currentTournament.playerFighterId, currentOpponentId);
    currentBattle = currentPlayerBattle;
  } else {
    currentBattle = null;
  }

  lastTurnSummaryLines = currentBattle
    ? ["Returned to your combat."]
    : ["Returned to the tournament bracket."];

  renderTournament();
}

function moveAIReplayFrame(delta) {
  if (!currentAIReplayMatch) return;
  setAIReplayFrame(currentAIReplayMatch, currentAIReplayIndex + delta);
}

function jumpAIReplayFrame(target) {
  if (!currentAIReplayMatch) return;
  const frames = getAIReplayFrames(currentAIReplayMatch);
  if (frames.length === 0) return;

  if (target === "start") {
    setAIReplayFrame(currentAIReplayMatch, 0);
    return;
  }

  if (target === "end") {
    setAIReplayFrame(currentAIReplayMatch, frames.length - 1);
  }
}

function getBiomeRelation(fighter) {
  if (!fighter || !currentBattle?.biome) {
    return "-";
  }

  const animal = animals[fighter.id];
  const biome = currentBattle.biome;

  if (!animal?.biomes) {
    return "Neutral";
  }

  if (animal.biomes.favorable?.includes(biome)) {
    return "Favorable";
  }

  if (animal.biomes.unfavorable?.includes(biome)) {
    return "Unfavorable";
  }

  return "Neutral";
}

function getExtraResourceText(fighter) {
  if (!fighter) return "";

  if (fighter.passive && fighter.passive.id === "persistent-harassment") {
    return "Loot: " + fighter.macaqueLoot + "\nChain: " + fighter.macaqueHitChain;
  }


  if (fighter.passive && fighter.passive.id === "hunting-inertia") {
    const stacks = fighter.falconStacks || 0;
    return (
      "Hunting Inertia: " +
      stacks +
      "/4" +
      "\nDamage bonus: +" +
      stacks * 5 +
      "%" +
      "\nExplosiveness bonus: +" +
      stacks * 10 +
      "%"
    );
  }

  if (fighter.passive && fighter.passive.id === "silent-stalk") {
    const stacks = fighter.tigerStalkStacks || 0;
    return (
      "Silent Stalk: " +
      stacks +
      "/4" +
      "\nAttack bonus: +" +
      stacks * 5 +
      "%" +
      "\nSpeed bonus: +" +
      stacks * 10 +
      "%" +
      "\nExplosiveness bonus: +" +
      stacks * 10 +
      "%"
    );
  }

  if (fighter.passive && fighter.passive.id === "inverted-inertia") {
    return (
      "Illusory Dance active: " +
      (fighter.illusoryDanceActive ? "YES" : "NO") +
      "\nNext successful attack x3: " +
      (fighter.illusoryDanceBuffReady ? "YES" : "NO")
    );
  }

  if (fighter.passive && fighter.passive.id === "ribbed-guard") {
    return (
      "Ribbed Guard: offensive actions cost +" +
      (fighter.costalEversionActive ? "10" : "5") +
      " stamina" +
      "\nCostal Eversion: " +
      (fighter.costalEversionActive ? "ACTIVE (" + (fighter.costalEversionTurns || 0) + " turn(s) left)" : "NO") +
      "\nWhile active: -50% damage, 25% reflect, Costal Toxin"
    );
  }


  if (fighter.passive && fighter.passive.id === "scaled-retreat") {
    return (
      "Scaled Retreat: Concentration HP x2 if hit" +
      "\nCaudal Autotomy: " +
      (fighter.caudalAutotomyActive ? "ACTIVE (" + (fighter.caudalAutotomyTurns || 0) + " turn(s) left)" : "NO") +
      "\nTail HP: " +
      ((fighter.caudalAutotomyActive && (fighter.caudalAutotomyTailHp || 0) > 0) ? (fighter.caudalAutotomyTailHp + "/" + (fighter.caudalAutotomyMaxTailHp || 90)) : "inactive")
    );
  }

  if (fighter.tempAccuracyLockTurns > 0) {
    return "Accuracy capped at 25% this turn.";
  }

  if (fighter.passive && fighter.passive.id === "suffocating-humidity") {
    const progress = fighter.iguanaProgress || {};
    const quickDone = progress.quick ? "YES" : "NO";
    const preciseDone = progress.precise ? "YES" : "NO";
    const explosiveDone = progress.explosive ? "YES" : "NO";

    let progressCount = 0;
    if (progress.quick) progressCount += 1;
    if (progress.precise) progressCount += 1;
    if (progress.explosive) progressCount += 1;

    return (
      "Humidity: " +
      progressCount +
      "/3" +
      "\nQuick: " +
      quickDone +
      "  Precise: " +
      preciseDone +
      "  Explosive: " +
      explosiveDone
    );
  }

  if (fighter.passive && fighter.passive.id === "immobile-stalk") {
    return (
      "Immobile Stalk: " +
      (fighter.matamataStalkCharges || 0) +
      "/4" +
      "\nAmbush ready: " +
      (fighter.matamataAmbushReady ? "YES" : "NO")
    );
  }

  if (fighter.passive && fighter.passive.id === "thoths-mirage") {
    const progress = fighter.fennecMirageProgress || {
      quick: false,
      explosive: false,
      concentration: 0
    };

    return (
      "Thoth's Mirage" +
      "\nQuick: " +
      (progress.quick ? "YES" : "NO") +
      "  Explosive: " +
      (progress.explosive ? "YES" : "NO") +
      "\nConcentration: " +
      (progress.concentration || 0) +
      "/2"
    );
  }

  if (fighter.passive && fighter.passive.id === "larval-gestation") {
    const larvae = fighter.darwinsLarvae || 0;
    const maxLarvae = fighter.darwinsMaxLarvae || 5;

    return "Larvae: " + larvae + "/" + maxLarvae;
  }

  if (isCoconutOctopusFighter(fighter)) {
    return getCoconutOctopusStatusText(fighter);
  }

  return "";
}



function formatTooltipStatLine(fighter, statKey, label) {
  const animal = animals[fighter.id];
  if (!animal || !animal.stats) return label + ": -";

  const baseValue = animal.stats[statKey];

  const modifiedStats = [
    "attack",
    "defense",
    "speed",
    "agility",
    "technique",
    "explosiveness"
  ];

  const currentValue = modifiedStats.includes(statKey)
    ? Math.round(getEffectiveStat(fighter, statKey, currentBattle) * 10) / 10
    : fighter.stats[statKey];

  const roundedBase = Math.round(baseValue * 10) / 10;
  const roundedCurrent = Math.round(currentValue * 10) / 10;

  if (roundedBase === roundedCurrent) {
    return label + ": " + roundedBase;
  }

  const diffPct =
    roundedBase !== 0
      ? Math.round(((roundedCurrent - roundedBase) / roundedBase) * 100)
      : 0;

  return (
    label +
    ": " +
    roundedBase +
    " → " +
    roundedCurrent +
    " (" +
    (diffPct > 0 ? "+" : "") +
    diffPct +
    "%)"
  );
}

function formatBiomeRelationForTooltip(fighter) {
  if (!currentBattle || !fighter) return "Biome: -";

  const animal = animals[fighter.id];
  const biome = currentBattle.biome;

  if (!animal?.biomes || !biome) {
    return "Current biome: -";
  }

  if (animal.biomes.favorable?.includes(biome)) {
    return "Current biome: " + biome + " — Favorable";
  }

  if (animal.biomes.unfavorable?.includes(biome)) {
    return "Current biome: " + biome + " — Unfavorable";
  }

  return "Current biome: " + biome + " — Neutral";
}

function formatFighterTooltip(fighter) {
  if (!fighter) return "";

  const animal = animals[fighter.id];
  if (!animal) return "";

  const passiveText = getPassiveFullText(fighter.id);

  const specialText = animal.special
    ? animal.special.name + "\n" + animal.special.description
    : "None";

  const effectsText =
    fighter.effects && fighter.effects.length > 0
      ? fighter.effects
          .map((effect) => {
            const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
            return effect.name + ": " + turnsLeft + " turn" + (turnsLeft === 1 ? "" : "s") + " left";
          })
          .join("\n")
      : "None";

  const battleEffectsText =
    currentBattle && currentBattle.battleEffects && currentBattle.battleEffects.length > 0
      ? currentBattle.battleEffects
          .map((effect) => {
            const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
            return effect.name + ": " + turnsLeft + " turn" + (turnsLeft === 1 ? "" : "s") + " left";
          })
          .join("\n")
      : "None";

  const extraResourceText = getExtraResourceText(fighter);

  return `
    <h3>${animal.name}</h3>

    <div class="tooltip-section">
      <div class="tooltip-label">Passive</div>
      <div class="tooltip-text">${passiveText}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Special</div>
      <div class="tooltip-text">${specialText}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Stats</div>
      <div class="tooltip-text">${formatTooltipStatLine(fighter, "life", "Life")}
${formatTooltipStatLine(fighter, "attack", "Attack")}
${formatTooltipStatLine(fighter, "defense", "Defense")}
${formatTooltipStatLine(fighter, "resistance", "Resistance")}
${formatTooltipStatLine(fighter, "technique", "Technique")}
${formatTooltipStatLine(fighter, "speed", "Speed")}
${formatTooltipStatLine(fighter, "agility", "Agility")}
${formatTooltipStatLine(fighter, "explosiveness", "Explosiveness")}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Current State</div>
      <div class="tooltip-text">HP: ${fighter.hp}/${fighter.maxHp}
Stamina: ${fighter.stamina}/${fighter.maxStamina}
Special Charge: ${fighter.specialCharge}/${fighter.special?.chargeHits ?? 0}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Fighter Effects</div>
      <div class="tooltip-text">${effectsText}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Battlefield Effects</div>
      <div class="tooltip-text">${battleEffectsText}</div>
    </div>

    ${
      extraResourceText
        ? `<div class="tooltip-section">
            <div class="tooltip-label">Extra Resource</div>
            <div class="tooltip-text">${extraResourceText}</div>
          </div>`
        : ""
    }

    <div class="tooltip-section">
      <div class="tooltip-label">Biomes</div>
      <div class="tooltip-text">${formatBiomeRelationForTooltip(fighter)}
Modified stat this battle: ${currentBattle?.biomeStat || "-"}
Favorable: ${animal.biomes?.favorable?.join(", ") || "none"}
Neutral: ${animal.biomes?.neutral?.join(", ") || "none"}
Unfavorable: ${animal.biomes?.unfavorable?.join(", ") || "none"}</div>
    </div>
  `;
}

function formatBracketSlotTitle(fighterId) {
  const animal = animals[fighterId];
  if (!animal) return "";

  const passiveText = animal.passive
    ? animal.passive.name + ": " + getPassiveDescriptionText(fighterId, animal.passive)
    : "Passive: None";

  const specialText = animal.special
    ? animal.special.name + ": " + animal.special.description
    : "Special: None";

  return (
    animal.name +
    "\n\nStats" +
    "\nLife: " + animal.stats.life +
    " | Attack: " + animal.stats.attack +
    " | Defense: " + animal.stats.defense +
    " | Resistance: " + animal.stats.resistance +
    "\nTechnique: " + animal.stats.technique +
    " | Speed: " + animal.stats.speed +
    " | Agility: " + animal.stats.agility +
    " | Explosiveness: " + animal.stats.explosiveness +
    "\n\nPassive\n" + passiveText +
    "\n\nSpecial\n" + specialText
  );
}

function renderFighter(prefix, fighter) {
  if (!fighter) return;

  const hpPct = percent(fighter.hp, fighter.maxHp);
  const staminaPct = percent(fighter.stamina, fighter.maxStamina);
  const specialMax = fighter.special?.chargeHits ?? 0;
  const specialReady = specialMax > 0 && fighter.specialCharge >= specialMax;

  document.getElementById(prefix + "Name").textContent = fighter.name;
  document.getElementById(prefix + "HpText").textContent =
    fighter.hp + "/" + fighter.maxHp + " (" + hpPct + "%)";
  document.getElementById(prefix + "HpBar").style.width = hpPct + "%";

  document.getElementById(prefix + "StaminaText").textContent =
    fighter.stamina + "/" + fighter.maxStamina + " (" + staminaPct + "%)";
  document.getElementById(prefix + "StaminaBar").style.width = staminaPct + "%";

  document.getElementById(prefix + "SpecialText").textContent =
    specialReady ? "READY" : fighter.specialCharge + "/" + specialMax;
  document.getElementById(prefix + "SpecialBar").style.width =
    (specialMax > 0 ? percent(fighter.specialCharge, specialMax) : 0) + "%";

  loadFighterImage(document.getElementById(prefix + "Image"), fighter.id);

  const tooltipEl = document.getElementById(prefix + "Tooltip");

  if (tooltipEl) {
    tooltipEl.innerHTML = formatFighterTooltip(fighter);
  }

  const extraEl = document.getElementById(prefix + "ExtraResource");
  const extraText = getExtraResourceText(fighter);

  extraEl.classList.toggle("special-resource-panel", isSharedThreeToedSlothFighter(fighter));

  if (isSharedThreeToedSlothFighter(fighter)) {
    extraEl.innerHTML = renderSharedSlothEcosystemMiniPanel(fighter, currentBattle);
    extraEl.style.display = "block";
    extraEl.setAttribute("role", "button");
    extraEl.setAttribute("tabindex", "0");
    extraEl.title = "Open Living Ecosystem";
    extraEl.onclick = () => openSlothEcosystemModalForFighter(fighter);
    extraEl.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSlothEcosystemModalForFighter(fighter);
      }
    };
  } else if (extraText) {
    extraEl.textContent = extraText;
    extraEl.style.display = "block";
    extraEl.removeAttribute("role");
    extraEl.removeAttribute("tabindex");
    extraEl.removeAttribute("title");
    extraEl.onclick = null;
    extraEl.onkeydown = null;
  } else {
    extraEl.textContent = "";
    extraEl.style.display = "none";
    extraEl.removeAttribute("role");
    extraEl.removeAttribute("tabindex");
    extraEl.removeAttribute("title");
    extraEl.onclick = null;
    extraEl.onkeydown = null;
  }
}

function renderSpecialButton(player) {
  const specialBtn = document.getElementById("specialActionBtn");
  const titleEl = document.getElementById("btn-special-title");
  const descEl = document.getElementById("btn-special-desc");

  if (!player?.special) {
    titleEl.textContent = "Special Attack";
    descEl.textContent = "No special available.";
    specialBtn.classList.remove("special-ready");
    return;
  }

  const needed = player.special.chargeHits ?? 0;
  const ready = player.specialCharge >= needed;

  titleEl.textContent = player.special.name;
  descEl.textContent =
    player.special.description + " " + (ready ? "READY" : "Charge: " + player.specialCharge + "/" + needed);

  if (ready) {
    specialBtn.classList.add("special-ready");
  } else {
    specialBtn.classList.remove("special-ready");
  }
}

function renderLarvalCommandButton(player) {
  return updateSharedLarvalCommandButtonDom(player);
}

function renderSlothEcosystemButton(player) {
  return updateSharedSlothEcosystemButtonDom(player, currentBattle);
}

function renderTournamentSlothEcosystemModal(player) {
  const body = document.getElementById("slothEcosystemModalBody");
  const subtitle = document.getElementById("slothEcosystemModalSubtitle");

  if (!body || !subtitle || !isSharedThreeToedSlothFighter(player)) return false;

  const dormant = isSharedSlothDormant(player, currentBattle);
  const micro = Boolean(player.slothMicroecosystemActive);
  const activeCount = getSharedSlothActiveColonies(player).length;
  const biome = currentBattle?.biome ? currentBattle.biome.toUpperCase() : "-";

  subtitle.textContent = micro
    ? "Microecosystem Ancestral active: all colonies are awake for " + (player.slothMicroecosystemTurns || 0) + " turn(s)."
    : dormant
      ? "Biome " + biome + ": ecosystem in letargo. No colonies are active and Microecosystem is blocked."
      : "Biome " + biome + ": " + activeCount + "/5 colonies active. Lichens accelerate colony growth when awake.";

  const colonies = [
    {
      id: "algae",
      emoji: "🧪",
      fullName: "Algae Colony",
      className: "sloth-colony-algae",
      detail: "Algae restore 30 HP and 15 Stamina at the end of the turn.",
      amplified: "With Lichens: recovery is doubled."
    },
    {
      id: "fungi",
      emoji: "🍄",
      fullName: "Fungi Colony",
      className: "sloth-colony-fungi",
      detail: "Fungi can invert stat debuffs into buffs.",
      amplified: "With Lichens: the inversion becomes stronger."
    },
    {
      id: "bacteria",
      emoji: "🦠",
      fullName: "Bacteria Colony",
      className: "sloth-colony-bacteria",
      detail: "Bacteria build a chain that increases the next hit.",
      amplified: "With Lichens: chain growth is faster."
    },
    {
      id: "mites",
      emoji: "🕷️",
      fullName: "Mite Colony",
      className: "sloth-colony-mites",
      detail: "Mites reduce attack stamina costs.",
      amplified: "With Lichens: attacks cost even less Stamina."
    },
    {
      id: "lichens",
      emoji: "🪨",
      fullName: "Lichen Colony",
      className: "sloth-colony-lichens",
      detail: "Lichens amplify the other active colony.",
      amplified: "During Microecosystem Ancestral, Lichens empower all colonies at once."
    }
  ];

  body.innerHTML = `
    <div class="sloth-modal-summary${micro ? " ancestral" : ""}${dormant ? " dormant" : ""}">
      <div>
        <div class="sloth-modal-summary-label">Current State</div>
        <div class="sloth-modal-summary-value">${micro ? "MICROECOSYSTEM ANCESTRAL" : dormant ? "LETARGO" : "LIVING ECOSYSTEM ACTIVE"}</div>
      </div>
      <div>
        <div class="sloth-modal-summary-label">Bacterial Chain</div>
        <div class="sloth-modal-summary-value">${getSharedSlothBacterialProgressText(player)}</div>
      </div>
      <div>
        <div class="sloth-modal-summary-label">Lichens</div>
        <div class="sloth-modal-summary-value">${
          sharedSlothHasColony(player, "lichens")
            ? micro
              ? "Boosting all colonies"
              : "Accelerating the other colony"
            : "Inactive"
        }</div>
      </div>
    </div>

    <div class="sloth-modal-grid">
      ${colonies.map((colony) => {
        const active = sharedSlothHasColony(player, colony.id);
        const lichensActive = sharedSlothHasColony(player, "lichens");
        const boosted = active && lichensActive && colony.id !== "lichens";
        const stateText = active
          ? dormant
            ? "LETARGO"
            : boosted
              ? "AMPLIFIED"
              : "ACTIVE"
          : "INACTIVE";

        return `
          <div class="sloth-modal-colony ${colony.className} ${active ? "active" : "inactive"}${dormant ? " dormant" : ""}${boosted ? " boosted" : ""}">
            <div class="sloth-modal-colony-head">
              <div class="sloth-modal-colony-title">
                <span>${colony.emoji}</span>
                <strong>${colony.fullName}</strong>
              </div>
              <div class="sloth-modal-status">${stateText}</div>
            </div>
            <div class="sloth-modal-colony-effect">${colony.detail}</div>
            <div class="sloth-modal-colony-current">${getSharedSlothColonyCurrentEffectText(player, colony)}</div>
            <div class="sloth-modal-colony-boost">${colony.amplified}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  return true;
}

function openSlothEcosystemModalForFighter(fighter) {
  if (!currentBattle || !isSharedThreeToedSlothFighter(fighter)) return;

  const rendered = renderTournamentSlothEcosystemModal(fighter);
  if (!rendered) return;

  const modal = document.getElementById("slothEcosystemModal");
  if (modal) modal.style.display = "flex";
}

function openSlothEcosystemModal() {
  if (!currentBattle || currentBattle.finished || currentBattleViewMode !== "player") return;

  const { player } = getBattleFighters();
  openSlothEcosystemModalForFighter(player);
}

function closeSlothEcosystemModal() {
  const modal = document.getElementById("slothEcosystemModal");
  if (modal) modal.style.display = "none";
}

function renderActionButtons() {
  const { player } = getBattleFighters();
  const buttons = document.querySelectorAll(".action-btn");

  buttons.forEach((btn) => {
    const action = btn.dataset.action;

    if (
      !currentBattle ||
      !player ||
      currentBattle.finished ||
      currentTournament?.awaitingContinue ||
      currentTournament?.finished ||
      currentTournament?.playerEliminated ||
      currentBattleViewMode !== "player" ||
      isResolvingTurn
    ) {
      btn.disabled = true;
      return;
    }

    if (btn.id === "slothEcosystemBtn") {
      btn.disabled = !isSharedThreeToedSlothFighter(player);
      return;
    }

    if (action === "larval-command") {
      const larvae = player.darwinsLarvae || 0;
      btn.disabled = !(player.passive?.id === "larval-gestation" && larvae > 0);
      return;
    }

    btn.disabled = !canUseAction(player, action, currentBattle);
  });

  const continueBtn = document.getElementById("continueTournamentBtn");
  continueBtn.disabled = !(
    currentTournament &&
    currentTournament.awaitingContinue &&
    !currentTournament.finished &&
    !currentTournament.playerEliminated
  );
}

function createFighterSlot(fighterId, match, slotPosition = null) {
  const slot = document.createElement("div");
  slot.className = "fighter-slot";

  if (!fighterId) {
    const empty = document.createElement("div");
    empty.className = "empty-slot";
    empty.textContent = "TBD";
    slot.appendChild(empty);
    return slot;
  }

  slot.title = formatBracketSlotTitle(fighterId);

  if (currentTournament && fighterId === currentTournament.playerFighterId) {
    slot.classList.add("player-slot");
  }

  if (match && match.winner) {
    if (match.winner === fighterId) {
      slot.classList.add("winner");
    } else {
      slot.classList.add("eliminated");
    }
  }

  const img = document.createElement("img");
  img.className = "fighter-img";
  img.alt = getAnimalName(fighterId);
  loadFighterImage(img, fighterId);

  const nameWrap = document.createElement("div");

  const name = document.createElement("div");
  name.className = "fighter-name";
  name.textContent = getAnimalName(fighterId);

  const position = document.createElement("div");
  position.className = "fighter-position";

  if (slotPosition) {
    position.textContent = "Position " + slotPosition;
  } else if (fighterId === currentTournament?.playerFighterId) {
    position.textContent = "Your fighter";
  } else {
    position.textContent = "";
  }

  nameWrap.appendChild(name);
  nameWrap.appendChild(position);

  const marker = document.createElement("div");
  marker.className = "marker";

  if (match && match.winner === fighterId) {
    marker.textContent = "✅";
  } else if (match && match.winner && match.winner !== fighterId) {
    marker.textContent = "❌";
  } else {
    marker.textContent = "";
  }

  slot.appendChild(img);
  slot.appendChild(nameWrap);
  slot.appendChild(marker);

  return slot;
}

function createMatchCard(match, roundIndex, matchIndex) {
  const card = document.createElement("div");
  card.className = "match-card";

  if (match === currentPlayerMatch && currentBattle && !currentBattle.finished) {
    card.classList.add("current-match");
  }

  const label = document.createElement("div");
  label.className = "match-label";

  if (roundIndex === 4) {
    label.textContent = "Champion";
  } else {
    label.textContent = "Match " + (matchIndex + 1);
  }

  card.appendChild(label);

  if (roundIndex === 4) {
    card.appendChild(createFighterSlot(match.fighterA, match));
    return card;
  }

  card.appendChild(createFighterSlot(match.fighterA, match, match.positionA || null));
  card.appendChild(createFighterSlot(match.fighterB, match, match.positionB || null));

  if (match.aiBattle && !matchContainsPlayer(match)) {
    const replayBtn = document.createElement("button");
    replayBtn.type = "button";
    replayBtn.className = "secondary-btn";
    replayBtn.style.marginTop = "8px";
    replayBtn.textContent = "Replay AI Combat";
    replayBtn.addEventListener("click", () => viewResolvedAIMatch(roundIndex, matchIndex));
    card.appendChild(replayBtn);
  }

  return card;
}

function renderBracket() {
  const grid = document.getElementById("bracketGrid");
  grid.innerHTML = "";

  if (!currentTournament) {
    ROUND_DEFINITIONS.forEach((round) => {
      const column = document.createElement("div");
      column.className = "round-column";

      const title = document.createElement("div");
      title.className = "round-title";
      title.textContent = round.name;

      column.appendChild(title);

      for (let i = 0; i < round.matchCount; i++) {
        const card = document.createElement("div");
        card.className = "match-card";

        const label = document.createElement("div");
        label.className = "match-label";
        label.textContent = round.name === "Champion" ? "Champion" : "Match " + (i + 1);

        card.appendChild(label);
        card.appendChild(createFighterSlot(null, null));

        if (round.name !== "Champion") {
          card.appendChild(createFighterSlot(null, null));
        }

        column.appendChild(card);
      }

      grid.appendChild(column);
    });

    return;
  }

  currentTournament.rounds.forEach((round, roundIndex) => {
    const column = document.createElement("div");
    column.className = "round-column";

    const title = document.createElement("div");
    title.className = "round-title";
    title.textContent = round.name;

    column.appendChild(title);

    round.matches.forEach((match, matchIndex) => {
      column.appendChild(createMatchCard(match, roundIndex, matchIndex));
    });

    grid.appendChild(column);
  });
}

function renderTournamentInfo() {
  const statusEl = document.getElementById("tournamentStatus");
  const yourFighterEl = document.getElementById("yourFighterValue");
  const yourPositionEl = document.getElementById("yourPositionValue");
  const currentRoundEl = document.getElementById("currentRoundValue");
  const activeBiomeEl = document.getElementById("activeBiomeValue");
  const modifiedStatEl = document.getElementById("modifiedStatValue");
  const currentTurnEl = document.getElementById("currentTurnValue");
  const yourBiomeRelationEl = document.getElementById("yourBiomeRelationValue");
  const enemyBiomeRelationEl = document.getElementById("enemyBiomeRelationValue");
  const subtitleEl = document.getElementById("bracketSubtitle");
  const pillEl = document.getElementById("bracketStatusPill");

  if (!currentTournament) {
    statusEl.textContent = "Not started";
    yourFighterEl.textContent = "-";
    yourPositionEl.textContent = "-";
    currentRoundEl.textContent = "-";
    activeBiomeEl.textContent = "-";
    modifiedStatEl.textContent = "-";
    currentTurnEl.textContent = "-";
    yourBiomeRelationEl.textContent = "-";
    enemyBiomeRelationEl.textContent = "-";
    subtitleEl.textContent = "Choose your fighter and start a tournament.";
    pillEl.textContent = "Waiting";
    return;
  }

  statusEl.textContent = currentTournament.finished
    ? "Finished"
    : currentTournament.playerEliminated
    ? "Eliminated"
    : "Active";

  yourFighterEl.textContent = getAnimalName(currentTournament.playerFighterId);
  yourPositionEl.textContent = String(currentTournament.playerPosition);
  currentRoundEl.textContent =
    currentTournament.rounds[currentTournament.currentRoundIndex]?.name || "-";

  activeBiomeEl.textContent = currentBattle?.biome
    ? currentBattle.biome.toUpperCase()
    : "-";

  modifiedStatEl.textContent = currentBattle?.biomeStat
    ? currentBattle.biomeStat.toUpperCase()
    : "-";

  currentTurnEl.textContent = currentBattle?.turn
    ? String(currentBattle.turn)
    : "-";

  const battleFighters = getBattleFighters();

  yourBiomeRelationEl.textContent = battleFighters.player
    ? getBiomeRelation(battleFighters.player)
    : "-";

  enemyBiomeRelationEl.textContent = battleFighters.enemy
    ? getBiomeRelation(battleFighters.enemy)
    : "-";

  subtitleEl.textContent =
    "Your fighter: " +
    getAnimalName(currentTournament.playerFighterId) +
    " | Position " +
    currentTournament.playerPosition +
    " | Bracket locked.";

  pillEl.textContent = currentTournament.finished
    ? "Champion: " + getAnimalName(currentTournament.champion)
    : currentTournament.playerEliminated
    ? "You were eliminated"
    : currentTournament.awaitingContinue
    ? "Round cleared"
    : "Tournament active";
}

function buildTurnSummary(newLines) {
  return buildSharedTurnSummary(newLines);
}

function formatBattleLogLine(line) {
  return formatSharedBattleLogLine(line);
}

function renderAIReplayControls() {
  const summaryBox = document.getElementById("turnSummaryBox");
  if (!summaryBox || !summaryBox.parentElement) return;

  let controls = document.getElementById("aiReplayControls");
  if (!controls) {
    controls = document.createElement("div");
    controls.id = "aiReplayControls";
    controls.style.display = "none";
    controls.style.gridTemplateColumns = "repeat(5, minmax(0, 1fr))";
    controls.style.gap = "8px";
    controls.style.marginBottom = "10px";
    summaryBox.parentElement.insertBefore(controls, summaryBox);
  }

  if (currentBattleViewMode !== "ai-replay" || !currentAIReplayMatch) {
    controls.style.display = "none";
    controls.innerHTML = "";
    return;
  }

  const frames = getAIReplayFrames(currentAIReplayMatch);
  const atStart = currentAIReplayIndex <= 0;
  const atEnd = currentAIReplayIndex >= frames.length - 1;
  const canReturn = Boolean(currentPlayerBattle || getPlayerMatch(currentTournament?.currentRoundIndex));

  controls.style.display = "grid";
  controls.innerHTML = `
    <button type="button" class="secondary-btn" id="aiReplayStartBtn" ${atStart ? "disabled" : ""}>⏮ Start</button>
    <button type="button" class="secondary-btn" id="aiReplayPrevBtn" ${atStart ? "disabled" : ""}>◀ Previous Turn</button>
    <button type="button" class="secondary-btn" id="aiReplayNextBtn" ${atEnd ? "disabled" : ""}>Next Turn ▶</button>
    <button type="button" class="secondary-btn" id="aiReplayEndBtn" ${atEnd ? "disabled" : ""}>Final ⏭</button>
    <button type="button" class="continue-btn" id="returnToPlayerCombatBtn" ${canReturn ? "" : "disabled"}>Return to Your Combat</button>
  `;

  document.getElementById("aiReplayStartBtn")?.addEventListener("click", () => jumpAIReplayFrame("start"));
  document.getElementById("aiReplayPrevBtn")?.addEventListener("click", () => moveAIReplayFrame(-1));
  document.getElementById("aiReplayNextBtn")?.addEventListener("click", () => moveAIReplayFrame(1));
  document.getElementById("aiReplayEndBtn")?.addEventListener("click", () => jumpAIReplayFrame("end"));
  document.getElementById("returnToPlayerCombatBtn")?.addEventListener("click", returnToPlayerCombat);
}

function renderBattle() {
  const battlePanel = document.getElementById("battlePanel");
  const logPanel = document.getElementById("logPanel");

  if (!currentBattle) {
    battlePanel.style.display = "none";
    logPanel.style.display = "none";
    renderAIReplayControls();
    renderActionButtons();
    return;
  }

  battlePanel.style.display = "grid";
  logPanel.style.display = "block";

  const { player, enemy } = getBattleFighters();

  renderFighter("player", player);
  renderFighter("enemy", enemy);
  applyFlipStates();

  renderSpecialButton(player);
  renderLarvalCommandButton(player);
  renderSlothEcosystemButton(player);
  updateCoconutOctopusPanel(player);

  document.getElementById("currentMatchTitle").textContent =
    currentBattleViewMode !== "player"
      ? "AI vs AI Combat Log"
      : currentTournament.rounds[currentTournament.currentRoundIndex].name;

  document.getElementById("currentMatchSubtitle").textContent =
    player.name +
    " vs " +
    enemy.name +
    " | Turn " +
    currentBattle.turn +
    " | Biome: " +
    (currentBattle.biome ? currentBattle.biome.toUpperCase() : "-") +
    " | Modified stat: " +
    (currentBattle.biomeStat ? currentBattle.biomeStat.toUpperCase() : "-") +
    " | Left biome: " +
    getBiomeRelation(player) +
    " | Right biome: " +
    getBiomeRelation(enemy);

  document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  renderAIReplayControls();

  document.getElementById("battleLog").textContent = currentBattle.log
    .map((line, index) => index + 1 + ". " + formatBattleLogLine(line))
    .join("\n");

  const logEl = document.getElementById("battleLog");
  logEl.scrollTop = logEl.scrollHeight;

  renderActionButtons();
}

function renderTournament() {
  renderTournamentInfo();
  renderBracket();
  renderBattle();
}

function processFinishedPlayerMatch() {
  if (!currentTournament || !currentBattle || !currentBattle.finished || !currentPlayerMatch) return;
  if (currentPlayerMatch.resolved) return;

  const roundIndex = currentTournament.currentRoundIndex;
  const round = currentTournament.rounds[roundIndex];
  const matchIndex = round.matches.indexOf(currentPlayerMatch);

  const winnerId = currentBattle.winner;

  currentPlayerMatch.winner = winnerId;
  currentPlayerMatch.resolved = true;
  currentPlayerBattle = currentBattle;

  placeWinnerInNextRound(roundIndex, matchIndex, winnerId);

  if (winnerId !== currentTournament.playerFighterId) {
    if (!currentTournament.champion) {
      resolveRemainingTournamentAfterElimination(roundIndex);
    }

    currentTournament.playerEliminated = true;
    currentTournament.finished = true;
    currentTournament.awaitingContinue = false;
    currentTournament.currentRoundIndex = 4;

    lastTurnSummaryLines = [
      ...lastTurnSummaryLines,
      "",
      getAnimalName(currentTournament.playerFighterId) +
        " has been eliminated from the tournament.",
      "The remaining bracket has been resolved.",
      "Tournament champion: " +
        getAnimalName(currentTournament.champion) +
        "."
    ];

    return;
  }

  if (roundIndex === 3) {
    currentTournament.finished = true;
    currentTournament.champion = currentTournament.playerFighterId;
    currentTournament.awaitingContinue = false;

    lastTurnSummaryLines = [
      ...lastTurnSummaryLines,
      "",
      getAnimalName(currentTournament.playerFighterId) +
        " wins the WAFT Tournament."
    ];

    return;
  }

  resolveRandomNonPlayerMatches(roundIndex);
  currentTournament.currentRoundIndex += 1;
  currentTournament.awaitingContinue = true;

  const nextMatch = getPlayerMatch(currentTournament.currentRoundIndex);
  const nextOpponent = getMatchOpponent(nextMatch);

  lastTurnSummaryLines = [
    ...lastTurnSummaryLines,
    "",
    "You advanced to " +
      currentTournament.rounds[currentTournament.currentRoundIndex].name +
      ".",
    "Next opponent: " + getAnimalName(nextOpponent) + "."
  ];
}


function renderCoconutOctopusFormPreview(player) {
  return renderSharedCoconutOctopusFormPreviewDom({
    player,
    pendingFormId: pendingOctopusFormPreview,
    currentBattle,
    isBusy: isResolvingTurn
  });
}

function previewPlayerCoconutOctopusForm(formId) {
  if (!currentBattle) return;
  const { player } = getBattleFighters();
  if (!isCoconutOctopusFighter(player)) return;
  pendingOctopusFormPreview = formId;
  updateCoconutOctopusPanel(player);
}

function clearPlayerCoconutOctopusPreview() {
  pendingOctopusFormPreview = null;
  const { player } = getBattleFighters();
  updateCoconutOctopusPanel(player);
}

function updateCoconutOctopusPanel(player) {
  if (!player || player.id !== "coconut-octopus") {
    pendingOctopusFormPreview = null;
  }

  updateSharedCoconutOctopusPanelDom({
    player,
    pendingFormId: pendingOctopusFormPreview,
    currentBattle,
    isBusy: isResolvingTurn
  });

  renderCoconutOctopusFormPreview(player);
}

function transformPlayerCoconutOctopus(formId) {
  if (!currentBattle || currentBattle.finished || isResolvingTurn) return;
  const { player } = getBattleFighters();
  if (!isCoconutOctopusFighter(player)) return;
  const result = transformCoconutOctopus(player, formId, currentBattle);
  if (result.ok) pendingOctopusFormPreview = null;
  lastTurnSummaryLines = [result.message];
  renderTournament();
}

function playerNeedsPerfectAdaptationChoice(action) {
  if (action !== "special") return false;
  if (pendingOctopusSpecialChoiceConfirmed) return false;
  if (!currentBattle || currentBattle.finished || isResolvingTurn) return false;
  const { player } = getBattleFighters();
  return isCoconutOctopusFighter(player) && (player.octopusForm || "base") === "base";
}

function openCoconutOctopusPerfectAdaptationModal() {
  if (!currentBattle || currentBattle.finished || isResolvingTurn) return;
  const { player } = getBattleFighters();
  if (!isCoconutOctopusFighter(player) || (player.octopusForm || "base") !== "base") return;
  const modal = document.getElementById("octopusPerfectAdaptationModal");
  if (modal) modal.style.display = "flex";
}

function closeCoconutOctopusPerfectAdaptationModal() {
  const modal = document.getElementById("octopusPerfectAdaptationModal");
  if (modal) modal.style.display = "none";
}

async function chooseCoconutOctopusPerfectAdaptationAndAttack(choice) {
  if (!currentBattle || currentBattle.finished || isResolvingTurn) return;
  const { player } = getBattleFighters();
  if (!isCoconutOctopusFighter(player) || (player.octopusForm || "base") !== "base") return;
  if (!setCoconutOctopusPerfectAdaptationChoice(player, choice)) return;
  closeCoconutOctopusPerfectAdaptationModal();
  pendingOctopusSpecialChoiceConfirmed = true;
  await playTurn("special");
  pendingOctopusSpecialChoiceConfirmed = false;
}

async function playTurn(playerAction) {
  if (!currentBattle || currentBattle.finished || isResolvingTurn) return;

  if (playerNeedsPerfectAdaptationChoice(playerAction)) {
    openCoconutOctopusPerfectAdaptationModal();
    return;
  }

  const { player, enemy } = getBattleFighters();

  if (playerAction === "larval-command") {
    openLarvalCommandModal();
    return;
  }

  if (!canUseAction(player, playerAction, currentBattle)) return;

  isResolvingTurn = true;

  const enemyAction = chooseEnemyAction(enemy);
  const oldLogLength = currentBattle.log.length;

  if (currentBattle.fighterA.id === player.id) {
    resolveTurn(currentBattle, playerAction, enemyAction);
  } else {
    resolveTurn(currentBattle, enemyAction, playerAction);
  }

  const newLines = currentBattle.log.slice(oldLogLength);
  lastTurnSummaryLines = buildTurnSummary(newLines);

  if (currentBattle.finished) {
    processFinishedPlayerMatch();
  }

  const animatedSummaryLines = [...lastTurnSummaryLines];

  lastTurnSummaryLines = [""];
  renderTournament();

  await runShakeSequence(newLines, player, enemy);
  await typeTurnSummary(animatedSummaryLines);

  lastTurnSummaryLines = animatedSummaryLines;
  isResolvingTurn = false;

  renderTournament();
}

function getLarvalDraftTotal() {
  return getSharedLarvalDraftTotal(larvalDraftCommand);
}

function getCurrentPlayerLarvae() {
  const { player } = getBattleFighters();
  return getSharedCurrentLarvae(player, false);
}

function renderLarvalCommandModal() {
  const { player } = getBattleFighters();
  renderSharedLarvalCommandModalDom({
    fighter: player,
    draft: larvalDraftCommand,
    previewMode: false
  });
}

function openLarvalCommandModal() {
  if (!currentBattle || currentBattle.finished) return;

  const { player } = getBattleFighters();

  if (!player || player.passive?.id !== "larval-gestation") {
    alert("Only Darwin's Frog can command larvae.");
    return;
  }

  const larvae = player.darwinsLarvae || 0;

  if (larvae <= 0) {
    alert("No larvae available.");
    return;
  }

  larvalDraftCommand = player.darwinsLarvalCommand
    ? {
        attack: player.darwinsLarvalCommand.attack || 0,
        defense: player.darwinsLarvalCommand.defense || 0,
        sacrifice: player.darwinsLarvalCommand.sacrifice || 0
      }
    : {
        attack: 0,
        defense: 0,
        sacrifice: 0
      };

  document.getElementById("larvalCommandModal").style.display = "flex";
  renderLarvalCommandModal();
}

function closeLarvalCommandModal() {
  document.getElementById("larvalCommandModal").style.display = "none";
}

function adjustLarvalDraft(type, delta) {
  const larvae = getCurrentPlayerLarvae();
  const currentValue = larvalDraftCommand[type] || 0;

  if (delta > 0 && getLarvalDraftTotal() >= larvae) return;
  if (type === "defense" && delta > 0 && currentValue >= 2) return;

  larvalDraftCommand[type] = Math.max(0, currentValue + delta);
  renderLarvalCommandModal();
}

function clearLarvalDraft() {
  larvalDraftCommand = {
    attack: 0,
    defense: 0,
    sacrifice: 0
  };

  renderLarvalCommandModal();
}

async function confirmLarvalCommandModal() {
  const { player } = getBattleFighters();
  if (!player) return;

  const larvae = player.darwinsLarvae || 0;
  const totalUsed = getLarvalDraftTotal();

  if (totalUsed > larvae) {
    alert("You assigned more larvae than available.");
    return;
  }

  if (totalUsed <= 0) {
    player.darwinsLarvalCommand = null;

    lastTurnSummaryLines = [
      "Larval Command cleared.",
      "All larvae will be conserved.",
      "Choose a main action to resolve the turn."
    ];

    const animatedSummaryLines = [...lastTurnSummaryLines];

    closeLarvalCommandModal();

    lastTurnSummaryLines = [""];
    renderTournament();

    await typeTurnSummary(animatedSummaryLines);

    lastTurnSummaryLines = animatedSummaryLines;
    renderTournament();
    return;
  }

  player.darwinsLarvalCommand = {
    attack: larvalDraftCommand.attack,
    defense: larvalDraftCommand.defense,
    sacrifice: larvalDraftCommand.sacrifice
  };

  const conserved = larvae - totalUsed;

  lastTurnSummaryLines = [
    "Larval Command prepared.",
    "Attack larvae: " + larvalDraftCommand.attack,
    "Defense larvae: " + larvalDraftCommand.defense,
    "Sacrifice larvae: " + larvalDraftCommand.sacrifice,
    "Conserved larvae: " + conserved,
    "Choose a main action to resolve the turn."
  ];

  const animatedSummaryLines = [...lastTurnSummaryLines];

  closeLarvalCommandModal();

  lastTurnSummaryLines = [""];
  renderTournament();

  await runShakeSequence(newLines, player, enemy);
  await typeTurnSummary(animatedSummaryLines);

  lastTurnSummaryLines = animatedSummaryLines;
  renderTournament();
}

function startTournament() {
  const selectedFighterId = document.getElementById("playerFighter").value;

  try {
    currentTournament = createTournament(selectedFighterId);
    currentBattle = null;
    currentPlayerBattle = null;
    currentPlayerMatch = null;
    currentOpponentId = null;
    currentBattleViewMode = "player";
    currentAIReplayMatch = null;
    currentAIReplayIndex = 0;

    loadCurrentPlayerBattle();

    renderTournament();
  } catch (error) {
    alert(error.message);
  }
}

function continueTournament() {
  if (!currentTournament || !currentTournament.awaitingContinue) return;

  loadCurrentPlayerBattle();
  renderTournament();
}

function resetTournament() {
  currentTournament = null;
  currentBattle = null;
  currentPlayerBattle = null;
  currentPlayerMatch = null;
  currentOpponentId = null;
  currentBattleViewMode = "player";
  currentAIReplayMatch = null;
  currentAIReplayIndex = 0;
  lastTurnSummaryLines = ["Start a tournament to begin."];
  renderTournament();
}


function bindCoconutOctopusFormControls() {
  const panel = document.getElementById("octopusAdaptationPanel");
  if (!panel || panel.dataset.octopusControlsBound === "true") return;

  panel.dataset.octopusControlsBound = "true";
  panel.addEventListener("click", (event) => {
    const button = event.target.closest(".octopus-form-btn");
    if (!button || !panel.contains(button) || button.disabled) return;

    const formId = button.dataset.octopusForm || button.dataset.onlineOctopusPreview;
    if (!formId) return;

    previewPlayerCoconutOctopusForm(formId);
  });
}

function init() {
  setupFighterSelector({
    selectId: "playerFighter",
    categoryId: "playerFighterCategory",
    sortId: "playerFighterSort",
    favoriteToggleId: "playerFighterFavoriteToggle",
    defaultValue: "sumatran-tiger",
    onChange: () => {
      if (!currentTournament) {
        renderTournament();
      }
    }
  });

  document.getElementById("startTournamentBtn").addEventListener("click", startTournament);
  document.getElementById("resetTournamentBtn").addEventListener("click", resetTournament);
  document.getElementById("continueTournamentBtn").addEventListener("click", continueTournament);

  document.getElementById("playerFlipBtn").addEventListener("click", () => {
    playerFlipped = !playerFlipped;
    applyFlipStates();
  });

  document.getElementById("enemyFlipBtn").addEventListener("click", () => {
    enemyFlipped = !enemyFlipped;
    applyFlipStates();
  });

  bindCoconutOctopusFormControls();
  document.getElementById("octopusConfirmFormBtn")?.addEventListener("click", () => {
    if (pendingOctopusFormPreview) transformPlayerCoconutOctopus(pendingOctopusFormPreview);
  });
  document.getElementById("octopusCancelPreviewBtn")?.addEventListener("click", clearPlayerCoconutOctopusPreview);
  document.getElementById("octopusPerfectAdaptationCloseBtn")?.addEventListener("click", closeCoconutOctopusPerfectAdaptationModal);
  document.querySelectorAll("[data-octopus-perfect-choice]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await chooseCoconutOctopusPerfectAdaptationAndAttack(btn.dataset.octopusPerfectChoice);
    });
  });

  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.id === "slothEcosystemBtn") {
        openSlothEcosystemModal();
        return;
      }

      const action = btn.dataset.action;
      if (!action) return;

      playTurn(action);
    });
  });

  document.getElementById("slothEcosystemCloseBtn")?.addEventListener("click", closeSlothEcosystemModal);
  document.getElementById("larvalCommandCloseBtn").addEventListener("click", closeLarvalCommandModal);

  document.getElementById("larvalAttackMinus").addEventListener("click", () => adjustLarvalDraft("attack", -1));
  document.getElementById("larvalAttackPlus").addEventListener("click", () => adjustLarvalDraft("attack", 1));

  document.getElementById("larvalDefenseMinus").addEventListener("click", () => adjustLarvalDraft("defense", -1));
  document.getElementById("larvalDefensePlus").addEventListener("click", () => adjustLarvalDraft("defense", 1));

  document.getElementById("larvalSacrificeMinus").addEventListener("click", () => adjustLarvalDraft("sacrifice", -1));
  document.getElementById("larvalSacrificePlus").addEventListener("click", () => adjustLarvalDraft("sacrifice", 1));

  document.getElementById("larvalClearBtn").addEventListener("click", clearLarvalDraft);
  document.getElementById("larvalConfirmBtn").addEventListener("click", async () => {
    await confirmLarvalCommandModal();
  });

  renderTournament();
}

init();
