import { animals } from "./animals.js";
import { setupFighterSelector } from "./fighter-selector.js";
import {
  createBattle,
  resolveTurn,
  canUseAction,
  getEffectiveStat,
  transformCoconutOctopus,
  setCoconutOctopusPerfectAdaptationChoice
} from "./battle-engine.js";

let currentTournament = null;
let currentBattle = null;
let currentPlayerMatch = null;
let currentOpponentId = null;
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
  return fighter && fighter.id === "coconut-octopus";
}

function getCoconutOctopusFormText(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return "";
  const form = fighter.octopusForm || "base";
  return OCTOPUS_FORM_LABELS[form] || form;
}

function getCoconutOctopusStatusText(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return "";

  const lines = [
    "Form: " + getCoconutOctopusFormText(fighter),
    "Adaptation charges: " + (fighter.octopusAdaptationCharges ?? 0) + "/8",
    "First transformation: " + (fighter.octopusFreeTransformationAvailable ? "FREE" : "USED")
  ];

  if ((fighter.octopusForm || "base") === "base") {
    lines.push("Perfect Adaptation: choose option when using Special");
  }
  if ((fighter.octopusForm || "base") === "offensive") {
    lines.push("Predatory Pressure: " + ((fighter.octopusPredatoryPressureStacks || 0) * 5) + "% Attack reduction");
  }
  if ((fighter.octopusForm || "base") === "defensive") {
    lines.push("Coconut Shell: 10 fixed damage on direct hit");
    lines.push("Fortress active: " + (fighter.coconutFortressActive ? "YES" : "NO"));
  }
  if ((fighter.octopusForm || "base") === "evasive") {
    lines.push("Perfect Camouflage: +15 HP / +15 Stamina when enemy misses");
  }

  return lines.join("\n");
}

function getCoconutOctopusFormDefinitionForPreview(formId) {
  return animals["coconut-octopus"]?.octopusForms?.[formId] || null;
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
    "coconut-octopus": ["./images/animals/fish/coconut-octopus.png"]
  };

  return [direct, ...(legacy[id] ?? [])];
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

function resolveRandomNonPlayerMatches(roundIndex) {
  if (!currentTournament) return;

  const round = currentTournament.rounds[roundIndex];
  if (!round || roundIndex >= 4) return;

  round.matches.forEach((match, matchIndex) => {
    if (match.resolved) return;
    if (!match.fighterA || !match.fighterB) return;
    if (matchContainsPlayer(match)) return;

    const winner = Math.random() < 0.5 ? match.fighterA : match.fighterB;

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

      const winner = Math.random() < 0.5 ? match.fighterA : match.fighterB;

      match.winner = winner;
      match.resolved = true;

      placeWinnerInNextRound(roundIndex, matchIndex, winner);
    });
  }
}

function loadCurrentPlayerBattle() {
  if (!currentTournament || currentTournament.finished || currentTournament.playerEliminated) {
    currentBattle = null;
    currentPlayerMatch = null;
    currentOpponentId = null;
    return;
  }

  currentPlayerMatch = getPlayerMatch(currentTournament.currentRoundIndex);
  currentOpponentId = getMatchOpponent(currentPlayerMatch);

  if (!currentPlayerMatch || !currentOpponentId) {
    currentBattle = null;
    return;
  }

  currentBattle = createBattle(currentTournament.playerFighterId, currentOpponentId);

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
  if (isCoconutOctopusFighter(fighter) && (fighter.octopusForm || "base") === "base") {
    setCoconutOctopusPerfectAdaptationChoice(fighter, randomChoice(["tentacle-storm", "coconut-fortress", "ink-sea"]));
  }
  const possible = ACTION_POOL.filter((action) =>
    canUseAction(fighter, action, currentBattle)
  );

  if (possible.length === 0) {
    return "concentration";
  }

  if (
    fighter.special &&
    fighter.specialCharge >= fighter.special.chargeHits &&
    canUseAction(fighter, "special", currentBattle)
  ) {
    return "special";
  }

  return randomChoice(possible);
}

function getBattleFighters() {
  if (!currentBattle || !currentTournament) {
    return { player: null, enemy: null };
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

  if (extraText) {
    extraEl.textContent = extraText;
    extraEl.style.display = "block";
  } else {
    extraEl.textContent = "";
    extraEl.style.display = "none";
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
  const larvalBtn = document.getElementById("larvalCommandBtn");
  const titleEl = document.getElementById("btn-larval-title");
  const descEl = document.getElementById("btn-larval-desc");

  if (!player || player.passive?.id !== "larval-gestation") {
    larvalBtn.style.display = "none";
    return;
  }

  const larvae = player.darwinsLarvae || 0;
  const maxLarvae = player.darwinsMaxLarvae || 5;

  larvalBtn.style.display = "block";
  titleEl.textContent = "Larval Command";
  descEl.textContent =
    "Larvae: " +
    larvae +
    "/" +
    maxLarvae +
    ". Assign larvae to attack, defend or sacrifice.";
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
      isResolvingTurn
    ) {
      btn.disabled = true;
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
  const summary = [];

  for (const line of newLines) {
    if (line.includes("calc →")) continue;
    if (line.startsWith("Damage calc")) continue;
    if (line.startsWith("Critical calc")) continue;
    if (line.includes("→ HP:")) continue;
    if (line.startsWith("--- Turn")) continue;
    if (line.includes("gains effect: Neurotoxic Injection")) continue;

    if (
      line.includes("Honey Badger has fallen below") &&
      line.includes("fatigue")
    ) {
      summary.push(
        "Honey Badger's Savage Endurance ignores fatigue: no stat reduction is applied."
      );
      continue;
    }

    if (
      line.includes("enters Savage Endurance") &&
      line.includes("below 25% HP")
    ) {
      summary.push(
        "Honey Badger enters Savage Endurance: below 25% HP, it becomes immune to critical hits and gains +20% Attack and +20% Explosiveness."
      );
      continue;
    }

    summary.push(line);
  }

  return summary.length > 0 ? summary : ["No major events this turn."];
}

function formatBattleLogLine(line) {
  if (
    line.includes("Honey Badger has fallen below") &&
    line.includes("fatigue")
  ) {
    return "Honey Badger's Savage Endurance ignores fatigue: no stat reduction is applied.";
  }

  return line;
}

function renderBattle() {
  const battlePanel = document.getElementById("battlePanel");
  const logPanel = document.getElementById("logPanel");

  if (!currentBattle) {
    battlePanel.style.display = "none";
    logPanel.style.display = "none";
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
  updateCoconutOctopusPanel(player);

  document.getElementById("currentMatchTitle").textContent =
    currentTournament.rounds[currentTournament.currentRoundIndex].name;

  document.getElementById("currentMatchSubtitle").textContent =
    getAnimalName(currentTournament.playerFighterId) +
    " vs " +
    getAnimalName(currentOpponentId) +
    " | Turn " +
    currentBattle.turn +
    " | Biome: " +
    (currentBattle.biome ? currentBattle.biome.toUpperCase() : "-") +
    " | Modified stat: " +
    (currentBattle.biomeStat ? currentBattle.biomeStat.toUpperCase() : "-") +
    " | Your biome: " +
    getBiomeRelation(player) +
    " | Enemy biome: " +
    getBiomeRelation(enemy);

  document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");

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

  currentTournament.currentRoundIndex += 1;
  resolveRandomNonPlayerMatches(currentTournament.currentRoundIndex);
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
  const panel = document.getElementById("octopusFormPreviewPanel");
  const titleEl = document.getElementById("octopusFormPreviewTitle");
  const statsEl = document.getElementById("octopusFormPreviewStats");
  const textEl = document.getElementById("octopusFormPreviewText");
  const confirmBtn = document.getElementById("octopusConfirmFormBtn");
  if (!panel || !titleEl || !statsEl || !textEl || !confirmBtn) return;
  if (!player || player.id !== "coconut-octopus" || !pendingOctopusFormPreview) { panel.style.display = "none"; return; }
  const form = getCoconutOctopusFormDefinitionForPreview(pendingOctopusFormPreview);
  if (!form) { panel.style.display = "none"; return; }
  const currentForm = player.octopusForm || "base";
  const charges = player.octopusAdaptationCharges ?? 0;
  const isCurrent = pendingOctopusFormPreview === currentForm;
  const canPay = Boolean(player.octopusFreeTransformationAvailable) || charges > 0;
  const blocked = !currentBattle || currentBattle.finished || isResolvingTurn || isCurrent || !canPay;
  panel.style.display = "block";
  titleEl.textContent = form.name + (isCurrent ? " — Current Form" : " — Preview");
  statsEl.innerHTML = getCoconutOctopusPreviewStatsHtml(form);
  textEl.textContent = "Passive — " + (form.passive?.name || "None") + "\n" + (form.passive?.description || "No passive.") + "\n\nSuper — " + (form.special?.name || "None") + "\n" + (form.special?.description || "No super.");
  confirmBtn.textContent = isCurrent ? "Already in this form" : player.octopusFreeTransformationAvailable ? "Confirm Free Transformation" : "Confirm Form Change (-1 charge)";
  confirmBtn.disabled = blocked;
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
  const panel = document.getElementById("octopusAdaptationPanel");
  const statusEl = document.getElementById("octopusAdaptationStatus");
  if (!panel || !statusEl) return;
  if (!player || player.id !== "coconut-octopus") { panel.style.display = "none"; pendingOctopusFormPreview = null; return; }
  panel.style.display = "block";
  const form = player.octopusForm || "base";
  const charges = player.octopusAdaptationCharges ?? 0;
  const freeText = player.octopusFreeTransformationAvailable ? " · first transformation free" : "";
  statusEl.textContent = getCoconutOctopusFormText(player) + " · charges " + charges + "/8" + freeText;
  document.querySelectorAll(".octopus-form-btn").forEach((btn) => {
    const targetForm = btn.dataset.octopusForm;
    btn.classList.toggle("active", targetForm === form);
    btn.classList.toggle("preview", targetForm === pendingOctopusFormPreview && targetForm !== form);
    btn.disabled = !currentBattle || currentBattle.finished || isResolvingTurn;
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
  return (
    larvalDraftCommand.attack +
    larvalDraftCommand.defense +
    larvalDraftCommand.sacrifice
  );
}

function getCurrentPlayerLarvae() {
  const { player } = getBattleFighters();
  if (!player) return 0;

  return player.darwinsLarvae || 0;
}

function renderLarvalCommandModal() {
  const larvae = getCurrentPlayerLarvae();
  const totalUsed = getLarvalDraftTotal();
  const conserved = Math.max(0, larvae - totalUsed);

  document.getElementById("larvalAvailableText").textContent =
    "Larvae available: " + larvae + "/5";

  document.getElementById("larvalAttackValue").textContent = larvalDraftCommand.attack;
  document.getElementById("larvalDefenseValue").textContent = larvalDraftCommand.defense;
  document.getElementById("larvalSacrificeValue").textContent = larvalDraftCommand.sacrifice;
  document.getElementById("larvalConserveValue").textContent = conserved;

  document.getElementById("larvalAttackMinus").disabled = larvalDraftCommand.attack <= 0;
  document.getElementById("larvalDefenseMinus").disabled = larvalDraftCommand.defense <= 0;
  document.getElementById("larvalSacrificeMinus").disabled = larvalDraftCommand.sacrifice <= 0;

  document.getElementById("larvalAttackPlus").disabled = totalUsed >= larvae;
  document.getElementById("larvalDefensePlus").disabled =
    totalUsed >= larvae || larvalDraftCommand.defense >= 2;
  document.getElementById("larvalSacrificePlus").disabled = totalUsed >= larvae;
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
    currentPlayerMatch = null;
    currentOpponentId = null;

    resolveRandomNonPlayerMatches(0);
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
  currentPlayerMatch = null;
  currentOpponentId = null;
  lastTurnSummaryLines = ["Start a tournament to begin."];
  renderTournament();
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

  document.querySelectorAll(".octopus-form-btn").forEach((btn) => {
    btn.addEventListener("click", () => previewPlayerCoconutOctopusForm(btn.dataset.octopusForm));
  });
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
      const action = btn.dataset.action;
      playTurn(action);
    });
  });

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
