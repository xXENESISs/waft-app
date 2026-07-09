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
  renderSharedSlothEcosystemModalDom,
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

let socket = null;
let roomCode = null;
let localPlayerNumber = null;
let localSocketId = null;
let currentState = null;
let fighterSelector = null;
let viewedMatchId = null;
const flipStates = {};
const pendingOctopusFormPreviewByMatchId = {};
const larvalCommandsByMatchId = {};
const lastTurnLinesByMatchId = {};
const pendingAnimationByMatchId = {};
const pendingSummaryByMatchId = {};
const summaryAnimationTokens = {};
const resolvedReplayIndexByMatchId = {};

const TYPEWRITER_CHAR_DELAY = 8;
const TYPEWRITER_LINE_PAUSE = 180;

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


const SLOTH_COLONIES = [
  { id: "algae", emoji: "🟢", label: "Algae", fullName: "Algae Colony", className: "sloth-colony-algae", effect: "50% end-turn: +30 HP and +15 stamina.", boosted: "With Lichens: two restoration rolls." },
  { id: "fungi", emoji: "🍄", label: "Fungi", fullName: "Fungal Colony", className: "sloth-colony-fungi", effect: "50% chance to invert stat reductions.", boosted: "With Lichens: two inversion chances." },
  { id: "bacteria", emoji: "🦠", label: "Bacteria", fullName: "Bacterial Colony", className: "sloth-colony-bacteria", effect: "Consecutive hits build damage. Peak resets.", boosted: "With Lichens: chain advances by 2." },
  { id: "mites", emoji: "🕷️", label: "Mites", fullName: "Mite Colony", className: "sloth-colony-mites", effect: "Attacks cost 5 less stamina.", boosted: "With Lichens: attacks cost 10 less stamina." },
  { id: "lichens", emoji: "🪨", label: "Lichens", fullName: "Lichen Colony", className: "sloth-colony-lichens", effect: "Amplifies active colonies.", boosted: "During Microecosystem, empowers all colonies." }
];

function isThreeToedSlothFighter(fighter) {
  return isSharedThreeToedSlothFighter(fighter);
}

function getSlothActiveColonies(fighter) {
  return getSharedSlothActiveColonies(fighter);
}

function isSlothDormantInBattle(fighter, battle) {
  return isSharedSlothDormant(fighter, battle, { compact: true });
}

function slothHasColony(fighter, colonyId) {
  return sharedSlothHasColony(fighter, colonyId);
}

function getSlothBacterialBonusForHitLevel(hitLevel) {
  return getSharedSlothBacterialBonusForHitLevel(hitLevel);
}

function getSlothBacterialNextHitBonus(fighter) {
  return getSharedSlothBacterialNextHitBonus(fighter);
}

function getSlothBacterialProgressText(fighter) {
  return getSharedSlothBacterialProgressText(fighter);
}

function renderSlothColonyChip(fighter, colony, battle) {
  const active = slothHasColony(fighter, colony.id);
  const dormant = isSlothDormantInBattle(fighter, battle);
  const boosted = active && slothHasColony(fighter, "lichens") && colony.id !== "lichens";
  return `<div class="sloth-colony-chip ${colony.className} ${active ? "active" : "inactive"}${dormant ? " dormant" : ""}${boosted ? " boosted" : ""}">
    <div class="sloth-colony-chip-top"><span class="sloth-colony-emoji">${colony.emoji}</span><span class="sloth-colony-name">${escapeHtml(colony.label)}</span></div>
    <div class="sloth-colony-state">${active ? (boosted ? "AMPLIFIED" : "ACTIVE") : dormant ? "LETARGO" : "DORMANT"}</div>
  </div>`;
}

function renderSlothEcosystemMiniPanel(fighter, battle) {
  if (!isThreeToedSlothFighter(fighter)) return "";
  const dormant = isSlothDormantInBattle(fighter, battle);
  const micro = Boolean(fighter.slothMicroecosystemActive);
  const activeCount = getSlothActiveColonies(fighter).length;
  const biome = battle?.biome ? battle.biome.toUpperCase() : "-";
  const stateText = micro ? "MICROECOSYSTEM" : dormant ? "LETARGO" : activeCount + "/5 ACTIVE";
  const stateSubtext = micro ? "All colonies awakened · " + (fighter.slothMicroecosystemTurns || 0) + " turn(s)" : dormant ? "Arctic/Desert blocks the ecosystem" : "Biome " + biome + " · colonies rotate with biome shifts";
  return `<div class="sloth-ecosystem-card${micro ? " ancestral" : ""}${dormant ? " dormant" : ""}">
    <div class="sloth-ecosystem-header"><div><div class="sloth-ecosystem-title">🌿 Living Ecosystem</div><div class="sloth-ecosystem-subtitle">${escapeHtml(stateSubtext)}</div></div><div class="sloth-ecosystem-badge">${escapeHtml(stateText)}</div></div>
    <div class="sloth-mini-colonies">${SLOTH_COLONIES.map(c => renderSlothColonyChip(fighter, c, battle)).join("")}</div>
    <div class="sloth-chain-strip"><span>🦠 ${escapeHtml(getSlothBacterialProgressText(fighter))}</span>${slothHasColony(fighter, "lichens") ? "<span>🪨 Lichens boost active</span>" : ""}</div>
  </div>`;
}

function getCoconutOctopusFormChargeMax(formId) {
  return getSharedCoconutOctopusFormChargeMax(formId);
}
function getCoconutOctopusFormCharge(fighter, formId) {
  return getSharedCoconutOctopusFormCharge(fighter, formId);
}
function getCoconutOctopusCurrentCharge(fighter) {
  return getSharedCoconutOctopusCurrentCharge(fighter);
}
function getCoconutOctopusCurrentChargeMax(fighter) {
  return getSharedCoconutOctopusCurrentChargeMax(fighter);
}
function getCoconutOctopusChargeLine(fighter) {
  return getSharedCoconutOctopusChargeLine(fighter);
}


const MAX_TOURNAMENT_PLAYERS = 16;
const MIN_TOURNAMENT_PLAYERS = 2;

function getEl(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = getEl(id);
  if (el) el.textContent = value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTurnSummary(newLines) {
  return buildSharedTurnSummary(newLines);
}

function formatBattleLogLine(line) {
  return formatSharedBattleLogLine(line);
}

async function typeTurnSummaryForMatch(matchId, lines) {
  const token = (summaryAnimationTokens[matchId] || 0) + 1;
  summaryAnimationTokens[matchId] = token;

  const box = document.querySelector(`[data-turn-summary-match-id="${CSS.escape(matchId)}"]`);

  if (!box) {
    lastTurnLinesByMatchId[matchId] = [...lines];
    return;
  }

  box.textContent = "";

  for (let i = 0; i < lines.length; i++) {
    if (summaryAnimationTokens[matchId] !== token) return;

    if (box.textContent.length > 0) {
      box.textContent += "\n";
    }

    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      if (summaryAnimationTokens[matchId] !== token) return;

      box.textContent += line[j];
      await delay(TYPEWRITER_CHAR_DELAY);
    }

    await delay(TYPEWRITER_LINE_PAUSE);
  }

  lastTurnLinesByMatchId[matchId] = [...lines];
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

function getAnimalName(fighterId) {
  return animals[fighterId]?.name || fighterId || "TBD";
}

function getAvailableFighterIds() {
  return Object.keys(animals).filter((fighterId) => {
    const animal = animals[fighterId];
    return animal && animal.name && animal.stats;
  });
}

function addLog(message) {
  const logEl = getEl("lobbyLog");
  if (!logEl) return;

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  logEl.textContent += `[${time}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function normalizeRoomCode(code) {
  return String(code || "").trim().toUpperCase();
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
    "three-toed-sloth": ["./images/animals/mammals/three-toed-sloth.png"],
    "iberian-ribbed-newt": [
      "./images/animals/amphibians/iberian-ribbed-newt.png",
      "./images/animals/amphibians/iberian-ribbed-newt.jpg",
      "./images/animals/amphibians/iberian-ribbed-newt.jpeg",
      "./images/animals/amphibians/iberian-ribbed-newt.webp",
      "./images/animals/amphibians/gallipato.png",
      "./images/animals/amphibians/gallipato.jpg",
      "./images/animals/amphibians/gallipato.jpeg",
      "./images/animals/amphibians/gallipato.webp",
      "./images/animals/amphibians/gallipato-iberico.png",
      "./images/animals/amphibians/gallipato-iberico.jpg",
      "./images/animals/amphibians/gallipato-iberico.jpeg",
      "./images/animals/amphibians/gallipato-iberico.webp"
    ],
    "iberian-skink": [
      "./images/animals/reptiles/iberian-skink.png",
      "./images/animals/reptiles/iberian-skink.jpg",
      "./images/animals/reptiles/iberian-skink.jpeg",
      "./images/animals/reptiles/iberian-skink.webp",
      "./images/animals/reptiles/eslizon-iberico.png",
      "./images/animals/reptiles/eslizon-iberico.jpg",
      "./images/animals/reptiles/eslizon-iberico.jpeg",
      "./images/animals/reptiles/eslizon-iberico.webp",
      "./images/animals/reptiles/eslizon.png",
      "./images/animals/reptiles/eslizon.jpg",
      "./images/animals/reptiles/eslizon.jpeg",
      "./images/animals/reptiles/eslizon.webp"
    ]
  };

  return getSharedImageCandidates(id, animal, legacy);
}

function loadFighterImage(imgEl, fighterId) {
  if (!imgEl || !fighterId || !animals[fighterId]) {
    if (imgEl) imgEl.removeAttribute("src");
    return;
  }

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

function loadImagesInside(container) {
  if (!container) return;

  container.querySelectorAll("img[data-fighter-id]").forEach((img) => {
    loadFighterImage(img, img.getAttribute("data-fighter-id"));
  });
}

function percent(current, max) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLocalPlayerState() {
  if (!currentState || !localSocketId) return null;
  return currentState.players.find((player) => player.id === localSocketId) || null;
}

function getSelectedFighterId() {
  return fighterSelector?.getValue() || getEl("playerFighter")?.value || "";
}

function emitSelectedFighter() {
  if (!roomCode || currentState?.bracketLocked) return;

  const fighterId = getSelectedFighterId();
  if (!fighterId) return;

  socket.emit("selectOnlineTournamentFighter", {
    roomCode,
    fighterId
  });
}

function copyRoomCode() {
  if (!roomCode) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(roomCode).then(() => {
      addLog("Room code copied: " + roomCode);
    });
    return;
  }

  addLog("Room code: " + roomCode);
}

function getParticipantKey(participant) {
  if (!participant) return null;
  return participant.type === "player" ? participant.socketId : participant.slotId;
}

function participantIsLocal(participant) {
  return Boolean(participant?.socketId && participant.socketId === localSocketId);
}

function matchContainsLocalPlayer(match) {
  return participantIsLocal(match?.fighterA) || participantIsLocal(match?.fighterB);
}

function activeMatchContainsLocalPlayer(activeMatch) {
  return participantIsLocal(activeMatch?.fighterA) || participantIsLocal(activeMatch?.fighterB);
}

function getLocalActiveMatch() {
  return (currentState?.activeMatches || []).find((match) => activeMatchContainsLocalPlayer(match)) || null;
}

function getActiveMatchById(matchId) {
  return (currentState?.activeMatches || []).find((match) => match.matchId === matchId) || null;
}

function findBracketMatchById(matchId) {
  const bracket = currentState?.bracket;
  if (!bracket || !matchId) return null;

  for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex++) {
    const round = bracket.rounds[roundIndex];
    const matchIndex = round.matches.findIndex((match) => match.id === matchId);

    if (matchIndex !== -1) {
      return {
        round,
        match: round.matches[matchIndex],
        roundIndex,
        matchIndex
      };
    }
  }

  return null;
}

function getViewedMatchData() {
  const activeMatches = currentState?.activeMatches || [];
  const localActive = getLocalActiveMatch();

  if (viewedMatchId) {
    const active = getActiveMatchById(viewedMatchId);
    if (active) return { type: "active", active };

    const found = findBracketMatchById(viewedMatchId);
    if (found) return { type: "bracket", ...found };
  }

  if (localActive) {
    viewedMatchId = localActive.matchId;
    return { type: "active", active: localActive };
  }

  if (activeMatches.length > 0) {
    viewedMatchId = activeMatches[0].matchId;
    return { type: "active", active: activeMatches[0] };
  }

  return null;
}

function hasLocalSubmittedAction(activeMatch) {
  if (!activeMatch || !localSocketId) return false;
  return activeMatch.submittedSocketIds?.includes(localSocketId);
}

function formatParticipantMeta(participant) {
  if (!participant) return "TBD";

  if (participant.type === "player") {
    return participant.socketId === localSocketId ? "You" : "Player " + participant.playerNumber;
  }

  return "Bot";
}


function getExtraResourceText(fighter) {
  if (!fighter) return "";

  if (fighter.passive?.id === "persistent-harassment") {
    return "Loot: " + (fighter.macaqueLoot || 0) + "\nChain: " + (fighter.macaqueHitChain || 0);
  }


  if (fighter.passive?.id === "hunting-inertia") {
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

  if (fighter.passive?.id === "silent-stalk") {
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

  if (fighter.passive?.id === "inverted-inertia") {
    return (
      "Illusory Dance active: " +
      (fighter.illusoryDanceActive ? "YES" : "NO") +
      "\nNext successful attack x3: " +
      (fighter.illusoryDanceBuffReady ? "YES" : "NO")
    );
  }

  if (fighter.passive?.id === "ribbed-guard") {
    return (
      "Ribbed Guard: offensive actions cost +" +
      (fighter.costalEversionActive ? "10" : "5") +
      " stamina" +
      "\nCostal Eversion: " +
      (fighter.costalEversionActive ? "ACTIVE (" + (fighter.costalEversionTurns || 0) + " turn(s) left)" : "NO") +
      "\nWhile active: -50% damage, 25% reflect, Costal Toxin"
    );
  }


  if (fighter.passive?.id === "scaled-retreat") {
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

  if (fighter.passive?.id === "suffocating-humidity") {
    const progress = fighter.iguanaProgress || {};
    const quickDone = progress.quick ? "YES" : "NO";
    const preciseDone = progress.precise ? "YES" : "NO";
    const explosiveDone = progress.explosive ? "YES" : "NO";

    const humidityEffect = fighter.effects?.find((effect) => effect.id === "humidity");

    if (humidityEffect) {
      return (
        "Humidity: ACTIVE (" +
        humidityEffect.duration +
        " turn" +
        (humidityEffect.duration === 1 ? "" : "s") +
        ")" +
        "\nQuick: YES  Precise: YES  Explosive: YES"
      );
    }

    let count = 0;
    if (progress.quick) count += 1;
    if (progress.precise) count += 1;
    if (progress.explosive) count += 1;

    return (
      "Humidity: " +
      count +
      "/3" +
      "\nQuick: " +
      quickDone +
      "  Precise: " +
      preciseDone +
      "  Explosive: " +
      explosiveDone
    );
  }

  if (fighter.passive?.id === "larval-gestation") {
    return "Larvae: " + (fighter.darwinsLarvae || 0) + "/" + (fighter.darwinsMaxLarvae || 5);
  }

  if (fighter.passive?.id === "immobile-stalk") {
    return (
      "Immobile Stalk: " +
      (fighter.matamataStalkCharges || 0) +
      "/4" +
      "\nAmbush ready: " +
      (fighter.matamataAmbushReady ? "YES" : "NO")
    );
  }

  if (fighter.passive?.id === "thoths-mirage") {
    const progress = fighter.fennecMirageProgress || {
      quick: false,
      explosive: false,
      concentration: 0
    };

    const oasisEffect = currentState?.activeMatches
      ?.flatMap((match) => match.battle?.battleEffects || [])
      ?.find((effect) => effect.id === "oasis" && effect.sourceId === fighter.id);

    const oasisText = oasisEffect
      ? "Oasis: ACTIVE (" + oasisEffect.duration + " turn" + (oasisEffect.duration === 1 ? "" : "s") + " left)"
      : "Oasis: INACTIVE";

    return (
      "Thoth's Mirage" +
      "\nQuick: " +
      (progress.quick ? "YES" : "NO") +
      "  Explosive: " +
      (progress.explosive ? "YES" : "NO") +
      "\nConcentration: " +
      (progress.concentration || 0) +
      "/2" +
      "\n" +
      oasisText
    );
  }

  if (isCoconutOctopusFighter(fighter)) {
    return getCoconutOctopusStatusText(fighter);
  }

  return "";
}

function formatEffectDurationLines(fighter) {
  if (!fighter?.effects || fighter.effects.length === 0) {
    return "None";
  }

  return fighter.effects
    .map((effect) => {
      const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
      return `${effect.name}: ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`;
    })
    .join("\n");
}

function formatBattlefieldEffectLines(battle) {
  if (!battle?.battleEffects || battle.battleEffects.length === 0) {
    return "None";
  }

  return battle.battleEffects
    .map((effect) => {
      const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
      return `${effect.name}: ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`;
    })
    .join("\n");
}

function formatStatLineForTooltip(participant, fighter, statKey, label) {
  const animal = animals[participant?.fighterId];
  const base = animal?.stats?.[statKey];

  if (base === undefined) {
    return `${label}: -`;
  }

  const current = fighter?.stats?.[statKey] ?? base;

  if (Math.round(base * 10) / 10 === Math.round(current * 10) / 10) {
    return `${label}: ${base}`;
  }

  const diffPct = Math.round(((current - base) / base) * 100);
  return `${label}: ${base} → ${Math.round(current * 10) / 10} (${diffPct > 0 ? "+" : ""}${diffPct}%)`;
}

function formatCombatTooltip(participant, fighter, battle) {
  const animal = animals[participant?.fighterId];
  if (!animal) return "";

  const passiveText = animal.passive
    ? `${animal.passive.name}
${animal.passive.description}`
    : "None";

  const specialText = animal.special
    ? `${animal.special.name}
${animal.special.description}`
    : "None";

  const extraResourceText = fighter ? getExtraResourceText(fighter) : "";

  return `
    <h3>${escapeHtml(animal.name)}</h3>

    <div class="tooltip-section">
      <div class="tooltip-label">Passive</div>
      <div class="tooltip-text">${escapeHtml(passiveText)}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Special</div>
      <div class="tooltip-text">${escapeHtml(specialText)}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Stats</div>
      <div class="tooltip-text">${escapeHtml([
        formatStatLineForTooltip(participant, fighter, "life", "Life"),
        formatStatLineForTooltip(participant, fighter, "attack", "Attack"),
        formatStatLineForTooltip(participant, fighter, "defense", "Defense"),
        formatStatLineForTooltip(participant, fighter, "resistance", "Resistance"),
        formatStatLineForTooltip(participant, fighter, "technique", "Technique"),
        formatStatLineForTooltip(participant, fighter, "speed", "Speed"),
        formatStatLineForTooltip(participant, fighter, "agility", "Agility"),
        formatStatLineForTooltip(participant, fighter, "explosiveness", "Explosiveness")
      ].join("\n"))}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Biomes</div>
      <div class="tooltip-text">${escapeHtml("Favorable: " + (animal.biomes?.favorable?.join(", ") || "none") +
        "\nNeutral: " + (animal.biomes?.neutral?.join(", ") || "none") +
        "\nUnfavorable: " + (animal.biomes?.unfavorable?.join(", ") || "none"))}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Fighter Effects</div>
      <div class="tooltip-text">${escapeHtml(fighter ? formatEffectDurationLines(fighter) : "None")}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Battlefield Effects</div>
      <div class="tooltip-text">${escapeHtml(battle ? formatBattlefieldEffectLines(battle) : "None")}</div>
    </div>

    ${extraResourceText
      ? `<div class="tooltip-section">
          <div class="tooltip-label">Extra Resource</div>
          <div class="tooltip-text">${escapeHtml(extraResourceText)}</div>
        </div>`
      : ""}
  `;
}

function renderBattleBars(fighter) {
  if (!fighter) {
    return "";
  }

  const hpPct = percent(fighter.hp, fighter.maxHp);
  const staminaPct = percent(fighter.stamina, fighter.maxStamina);
  const specialMax = isCoconutOctopusFighter(fighter) ? getCoconutOctopusCurrentChargeMax(fighter) : (fighter.special?.chargeHits || 0);
  const specialCharge = isCoconutOctopusFighter(fighter) ? getCoconutOctopusCurrentCharge(fighter) : (fighter.specialCharge || 0);
  const specialReady = specialMax > 0 && specialCharge >= specialMax;
  const specialPct = specialMax > 0 ? percent(specialCharge, specialMax) : 0;
  const specialText = specialReady ? "READY" : `${specialCharge}/${specialMax}`;

  return `
    <div class="online-bar-block">
      <div class="online-bar-label"><span>HP</span><span>${fighter.hp}/${fighter.maxHp} (${hpPct}%)</span></div>
      <div class="online-bar"><div class="online-bar-fill online-hp-fill" style="width:${hpPct}%"></div></div>
    </div>

    <div class="online-bar-block">
      <div class="online-bar-label"><span>Stamina</span><span>${fighter.stamina}/${fighter.maxStamina} (${staminaPct}%)</span></div>
      <div class="online-bar"><div class="online-bar-fill online-stamina-fill" style="width:${staminaPct}%"></div></div>
    </div>

    <div class="online-bar-block">
      <div class="online-bar-label"><span>Special</span><span>${specialText}</span></div>
      <div class="online-bar"><div class="online-bar-fill online-special-fill" style="width:${specialPct}%"></div></div>
    </div>
  `;
}

function renderOnlineBattleFighterCard(participant, fighter, sideLabel, battle = null) {
  if (!participant) {
    return `
      <div class="online-battle-fighter-card">
        <div class="online-battle-fighter-image"></div>
        <div class="online-battle-fighter-body">
          <div class="online-battle-fighter-name">TBD</div>
          <div class="combat-meta">${sideLabel}</div>
        </div>
      </div>
    `;
  }

  const meta = formatParticipantMeta(participant);
  const key = getParticipantKey(participant) || participant.slotId || participant.fighterId;
  const extraResourceText = fighter ? getExtraResourceText(fighter) : "";
  const tooltip = formatCombatTooltip(participant, fighter, battle);
  const sideKey = sideLabel.includes("A") ? "A" : "B";

  return `
    <div class="online-battle-fighter-card">
      <div class="online-battle-fighter-image" data-combat-side="${sideKey}">
        <div class="online-battle-tooltip">${tooltip}</div>
        <button class="online-flip-btn" data-flip-key="${escapeHtml(key)}">↔</button>
        <img data-fighter-id="${participant.fighterId}" data-flip-image-key="${escapeHtml(key)}" alt="${escapeHtml(participant.name)}">
      </div>

      <div class="online-battle-fighter-body">
        <div class="online-battle-fighter-name">${escapeHtml(participant.name)}</div>
        <div class="combat-meta">${sideLabel} · ${meta}</div>
        ${renderBattleBars(fighter)}

        ${isThreeToedSlothFighter(fighter) ? renderSlothEcosystemMiniPanel(fighter, battle) : (extraResourceText ? `<div class="online-extra-resource">${escapeHtml(extraResourceText)}</div>` : "")}
      </div>
    </div>
  `;
}

function getLocalFighterInActiveMatch(activeMatch) {
  if (!activeMatch || !localSocketId) return { participant: null, fighter: null, side: null };

  if (activeMatch.fighterA?.socketId === localSocketId) {
    return { participant: activeMatch.fighterA, fighter: activeMatch.battle?.fighterA, side: "A" };
  }

  if (activeMatch.fighterB?.socketId === localSocketId) {
    return { participant: activeMatch.fighterB, fighter: activeMatch.battle?.fighterB, side: "B" };
  }

  return { participant: null, fighter: null, side: null };
}

function getPreparedLarvalCommand(matchId) {
  const command = larvalCommandsByMatchId[matchId];

  if (!command) return null;

  const total =
    (command.attack || 0) +
    (command.defense || 0) +
    (command.sacrifice || 0);

  if (total <= 0) return null;

  return {
    attack: command.attack || 0,
    defense: command.defense || 0,
    sacrifice: command.sacrifice || 0
  };
}

function getActionInfoForButton(action, localFighter, activeMatch) {
  const base = {
    normal: {
      subtitle: "Attack",
      title: "Normal Attack",
      desc: "Balanced attack. Cost 5."
    },
    quick: {
      subtitle: "Attack",
      title: "Quick Attack",
      desc: "Higher priority. Cost 20."
    },
    precise: {
      subtitle: "Attack",
      title: "Precise Attack",
      desc: "Higher accuracy and +10% damage. Cost 20."
    },
    explosive: {
      subtitle: "Attack",
      title: "Explosive Attack",
      desc: "Higher crit pressure and +20% damage. Cost 30."
    },
    concentration: {
      subtitle: "Support",
      title: "Concentration",
      desc: "Restore HP/Stamina and gain defense."
    },
    special: {
      subtitle: "Special",
      title: localFighter?.special?.name || "Special Attack",
      desc: localFighter?.special
        ? localFighter.special.description + " " +
          ((isCoconutOctopusFighter(localFighter) ? getCoconutOctopusCurrentCharge(localFighter) >= getCoconutOctopusCurrentChargeMax(localFighter) : localFighter.specialCharge >= localFighter.special.chargeHits)
            ? "READY"
            : "Charge: " + (isCoconutOctopusFighter(localFighter) ? getCoconutOctopusCurrentCharge(localFighter) : localFighter.specialCharge) + "/" + (isCoconutOctopusFighter(localFighter) ? getCoconutOctopusCurrentChargeMax(localFighter) : localFighter.special.chargeHits))
        : "No special available."
    },
    "larval-command": {
      subtitle: "Larvae",
      title: getPreparedLarvalCommand(activeMatch?.matchId) ? "Larval Command Prepared" : "Larval Command",
      desc: getPreparedLarvalCommand(activeMatch?.matchId)
        ? "Command ready. It will be sent with your next main action."
        : "Assign larvae to attack, defend or sacrifice."
    }
  };

  return base[action];
}

function renderActionButtons(activeMatch, canAct) {
  const { fighter: localFighter } = getLocalFighterInActiveMatch(activeMatch);

  const actions = ["normal", "quick", "precise", "explosive", "concentration", "special"];

  if (localFighter?.passive?.id === "larval-gestation") {
    actions.push("larval-command");
  }

  return actions.map((action) => {
    const info = getActionInfoForButton(action, localFighter, activeMatch);
    let disabled = !canAct;

    if (action === "special") {
      const specialMax = isCoconutOctopusFighter(localFighter) ? getCoconutOctopusCurrentChargeMax(localFighter) : (localFighter?.special?.chargeHits || 0);
      const specialCharge = isCoconutOctopusFighter(localFighter) ? getCoconutOctopusCurrentCharge(localFighter) : (localFighter?.specialCharge || 0);
      disabled = disabled || !localFighter?.special || specialCharge < specialMax;
    }

    if (action === "larval-command") {
      disabled = !canAct || !localFighter || (localFighter.darwinsLarvae || 0) <= 0;
    }

    const readyClass =
      action === "special" &&
      localFighter?.special &&
      (isCoconutOctopusFighter(localFighter) ? getCoconutOctopusCurrentCharge(localFighter) >= getCoconutOctopusCurrentChargeMax(localFighter) : localFighter.specialCharge >= localFighter.special.chargeHits)
        ? " special-ready"
        : "";

    return `
      <button class="online-action-btn${readyClass}" data-online-action="${action}" data-action="${action}" ${disabled ? "disabled" : ""}>
        <div class="online-action-btn-subtitle">${escapeHtml(info.subtitle)}</div>
        <div class="online-action-btn-title">${escapeHtml(info.title)}</div>
        <div class="online-action-btn-desc">${escapeHtml(info.desc)}</div>
      </button>
    `;
  }).join("");
}

function bindFlipButtonsInside(container) {
  if (!container) return;

  container.querySelectorAll("[data-flip-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-flip-key");
      flipStates[key] = !flipStates[key];

      container
        .querySelectorAll(`[data-flip-image-key="${CSS.escape(key)}"]`)
        .forEach((img) => img.classList.toggle("flipped", Boolean(flipStates[key])));
    });
  });

  container.querySelectorAll("[data-flip-image-key]").forEach((img) => {
    const key = img.getAttribute("data-flip-image-key");
    img.classList.toggle("flipped", Boolean(flipStates[key]));
  });
}


function clearOnlineAnimationClasses(matchId = null) {
  const area = getEl("activeCombatArea");
  if (!area) return;

  const classes = [
    "move-attacker-left",
    "move-attacker-right",
    "hit-defender-left",
    "hit-defender-right",
    "hit-defender-left-crit",
    "hit-defender-right-crit"
  ];

  area.querySelectorAll(".online-battle-fighter-image").forEach((wrap) => {
    wrap.classList.remove(...classes);
  });
}

function pushOnlineAnimationEvent(events, actorName, targetName, fighterA, fighterB, hit, critical = false) {
  if (!fighterA || !fighterB) return;

  const validActor = actorName === fighterA.name || actorName === fighterB.name;
  const validTarget = targetName === fighterA.name || targetName === fighterB.name;

  if (!validActor || !validTarget || actorName === targetName) return;

  events.push({ actor: actorName, target: targetName, hit, critical });
}

function getOnlineAnimationEvents(newLines, battle) {
  const fighterA = battle?.fighterA;
  const fighterB = battle?.fighterB;
  const events = [];

  if (!Array.isArray(newLines) || !fighterA || !fighterB) {
    return events;
  }

  for (const line of newLines) {
    let match;

    match = line.match(/^(.+?) hits (.+?) with (.+?) for (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      pushOnlineAnimationEvent(events, match[1], match[2], fighterA, fighterB, true, Boolean(match[5]));
      continue;
    }

    match = line.match(/^(.+?) uses (.+?) but misses (.+?)\.$/);
    if (match) {
      pushOnlineAnimationEvent(events, match[1], match[3], fighterA, fighterB, false, false);
      continue;
    }

    match = line.match(/^(.+?) uses Ballistic Strike and deals (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      const targetName = match[1] === fighterA.name ? fighterB.name : fighterA.name;
      pushOnlineAnimationEvent(events, match[1], targetName, fighterA, fighterB, true, Boolean(match[3]));
      continue;
    }

    match = line.match(/^(.+?) uses (.+?), dealing (\d+) damage/);
    if (match) {
      const targetName = match[1] === fighterA.name ? fighterB.name : fighterA.name;
      pushOnlineAnimationEvent(events, match[1], targetName, fighterA, fighterB, true, false);
      continue;
    }

    match = line.match(/^(.+?) uses (.+?) and deals (\d+) damage/);
    if (match) {
      const targetName = match[1] === fighterA.name ? fighterB.name : fighterA.name;
      pushOnlineAnimationEvent(events, match[1], targetName, fighterA, fighterB, true, false);
      continue;
    }

    match = line.match(/^(.+?) strikes from Phantom Current for (\d+) damage\.$/);
    if (match) {
      const targetName = match[1] === fighterA.name ? fighterB.name : fighterA.name;
      pushOnlineAnimationEvent(events, match[1], targetName, fighterA, fighterB, true, false);
      continue;
    }

    match = line.match(/^(.+?)'s Raptorial Chain strike (\d+) hits (.+?) for (\d+) damage\.$/);
    if (match) {
      pushOnlineAnimationEvent(events, match[1], match[3], fighterA, fighterB, true, false);
      continue;
    }

    match = line.match(/^(.+?)'s Marine Echo triggers: second hit deals (\d+) damage\.$/);
    if (match) {
      const targetName = match[1] === fighterA.name ? fighterB.name : fighterA.name;
      pushOnlineAnimationEvent(events, match[1], targetName, fighterA, fighterB, true, false);
      continue;
    }

    match = line.match(/^(.+?)'s Larval Attack sends (\d+) larva(?:e)? into (.+?), dealing (\d+) guaranteed damage\.$/);
    if (match) {
      pushOnlineAnimationEvent(events, match[1], match[3], fighterA, fighterB, true, false);
      continue;
    }

    match = line.match(/^(\d+) overflowing larva(?:e)? from (.+?)'s Darwinian Expulsion strike (.+?) for (\d+) guaranteed damage\.$/);
    if (match) {
      pushOnlineAnimationEvent(events, match[2], match[3], fighterA, fighterB, true, false);
      continue;
    }
  }

  return events;
}

async function runOnlineShakeSequence(matchId, newLines, activeMatchOverride = null) {
  const activeMatch = activeMatchOverride || getActiveMatchById(matchId);
  if (!activeMatch || viewedMatchId !== matchId) return;

  const area = getEl("activeCombatArea");
  if (!area) return;

  const wrapA = area.querySelector('[data-combat-side="A"]');
  const wrapB = area.querySelector('[data-combat-side="B"]');

  if (!wrapA || !wrapB) return;

  clearOnlineAnimationClasses(matchId);

  const events = getOnlineAnimationEvents(newLines, activeMatch.battle);

  for (const event of events) {
    if (viewedMatchId !== matchId) return;

    const actorIsA = event.actor === activeMatch.battle?.fighterA?.name;
    const attackerWrap = actorIsA ? wrapA : wrapB;
    const defenderWrap = actorIsA ? wrapB : wrapA;

    attackerWrap.classList.add(actorIsA ? "move-attacker-left" : "move-attacker-right");
    await delay(220);
    attackerWrap.classList.remove(actorIsA ? "move-attacker-left" : "move-attacker-right");

    if (event.hit) {
      const hitClass = actorIsA
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


function getResolvedReplayFrames(match) {
  return Array.isArray(match?.battleReplay) ? match.battleReplay : [];
}

function getResolvedReplayIndex(match) {
  const frames = getResolvedReplayFrames(match);
  if (!match?.id || frames.length === 0) return 0;

  const current = Number(resolvedReplayIndexByMatchId[match.id]);
  if (!Number.isFinite(current)) return frames.length - 1;

  return Math.max(0, Math.min(frames.length - 1, current));
}

function setResolvedReplayIndex(matchId, index) {
  const found = findBracketMatchById(matchId);
  const frames = getResolvedReplayFrames(found?.match);
  if (!found?.match || frames.length === 0) return;

  resolvedReplayIndexByMatchId[matchId] = Math.max(0, Math.min(frames.length - 1, index));
  renderState();
}

function renderResolvedMatch(found) {
  const panel = getEl("combatPanel");
  const area = getEl("activeCombatArea");
  const status = getEl("activeCombatStatus");
  const pill = getEl("activeCombatPill");
  if (!panel || !area || !found) return;

  const { round, match, matchIndex } = found;
  panel.classList.remove("locked-empty");

  const localActive = getLocalActiveMatch();
  const canReturn = localActive && localActive.matchId !== match.id;
  const frames = getResolvedReplayFrames(match);
  const hasReplay = frames.length > 0;
  const replayIndex = hasReplay ? getResolvedReplayIndex(match) : 0;
  const replayFrame = hasReplay ? frames[replayIndex] : null;
  const replayBattle = replayFrame?.battle || null;
  const atStart = !hasReplay || replayIndex <= 0;
  const atEnd = !hasReplay || replayIndex >= frames.length - 1;

  if (status) status.textContent = hasReplay ? "Viewing resolved combat replay." : match.resolved ? "Viewing resolved combat." : "Viewing bracket match.";
  if (pill) pill.textContent = round.name + " · Match " + (matchIndex + 1);

  const winnerText = match.winner ? "Winner: " + match.winner.name : "Awaiting fighters";
  const summaryLines = replayFrame?.summaryLines?.length
    ? buildTurnSummary(replayFrame.summaryLines)
    : lastTurnLinesByMatchId[match.id]?.length
    ? lastTurnLinesByMatchId[match.id]
    : match.resolved
    ? ["Combat finished."]
    : ["No turn summary available."];
  const summaryHeader = hasReplay
    ? (replayFrame.label || "Turn") + " / " + (frames.length - 1)
    : "Resolved combat";
  const summaryText = [summaryHeader, ...summaryLines].join("\n");
  const logSource = replayBattle?.log || match.battleLog || [];
  const logText = logSource.length
    ? logSource.map((line, index) => `${index + 1}. ${formatBattleLogLine(line)}`).join("\n")
    : "No combat log available yet.";

  area.innerHTML = `
    <div class="online-battle-panel">
      ${renderOnlineBattleFighterCard(match.fighterA, replayBattle?.fighterA || null, "Fighter A", replayBattle)}

      <div class="online-battle-center">
        <div class="online-match-title-card">
          <div class="online-title-top-row">
            <div>
              <div class="online-match-title">${escapeHtml(round.name)} · Match ${matchIndex + 1}</div>
              <div class="online-match-subtitle">
                ${escapeHtml(match.fighterA?.name || "TBD")} vs ${escapeHtml(match.fighterB?.name || "TBD")}
                ${replayBattle ? `<br>Turn ${escapeHtml(String(replayBattle.turn))} · ${escapeHtml(replayBattle.biome ? replayBattle.biome.toUpperCase() : "-")} · Modified stat: ${escapeHtml(replayBattle.biomeStat ? replayBattle.biomeStat.toUpperCase() : "-")}` : ""}
              </div>
            </div>
            ${canReturn ? `<button class="secondary-btn return-match-btn" id="returnToYourMatchBtn">Return to Your Match</button>` : ""}
          </div>

          <div class="resolved-banner ${match.resolved ? "resolved" : "pending"}">${escapeHtml(winnerText)}</div>
        </div>

        ${hasReplay ? `
          <div class="online-summary-panel">
            <div class="online-summary-title">Replay Controls</div>
            <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;">
              <button class="secondary-btn" id="resolvedReplayStartBtn" ${atStart ? "disabled" : ""}>⏮ Start</button>
              <button class="secondary-btn" id="resolvedReplayPrevBtn" ${atStart ? "disabled" : ""}>◀ Previous Turn</button>
              <button class="secondary-btn" id="resolvedReplayNextBtn" ${atEnd ? "disabled" : ""}>Next Turn ▶</button>
              <button class="secondary-btn" id="resolvedReplayEndBtn" ${atEnd ? "disabled" : ""}>Final ⏭</button>
            </div>
          </div>
        ` : ""}

        <div class="online-summary-panel">
          <div class="online-summary-title">Turn Summary</div>
          <div class="online-summary-box" data-turn-summary-match-id="${escapeHtml(match.id)}">${escapeHtml(summaryText)}</div>
        </div>

        <div class="online-summary-panel">
          <div class="online-summary-title">Combat Log</div>
          <div class="online-summary-box">${escapeHtml(logText)}</div>
        </div>
      </div>

      ${renderOnlineBattleFighterCard(match.fighterB, replayBattle?.fighterB || null, "Fighter B", replayBattle)}
    </div>
  `;

  getEl("returnToYourMatchBtn")?.addEventListener("click", () => {
    if (!localActive) return;
    viewedMatchId = localActive.matchId;
    renderState();
  });

  getEl("resolvedReplayStartBtn")?.addEventListener("click", () => setResolvedReplayIndex(match.id, 0));
  getEl("resolvedReplayPrevBtn")?.addEventListener("click", () => setResolvedReplayIndex(match.id, replayIndex - 1));
  getEl("resolvedReplayNextBtn")?.addEventListener("click", () => setResolvedReplayIndex(match.id, replayIndex + 1));
  getEl("resolvedReplayEndBtn")?.addEventListener("click", () => setResolvedReplayIndex(match.id, frames.length - 1));

  loadImagesInside(area);
  bindFlipButtonsInside(area);
}

let pendingOctopusPerfectAdaptationMatchId = null;

function getLocalCoconutOctopusInMatch(activeMatch) {
  const { fighter } = getLocalFighterInActiveMatch(activeMatch);
  return isCoconutOctopusFighter(fighter) ? fighter : null;
}

function renderOnlineTournamentOctopusPanel(activeMatch, canAct) {
  const fighter = getLocalCoconutOctopusInMatch(activeMatch);
  if (!fighter) return "";

  const matchId = activeMatch.matchId;
  const preview = pendingOctopusFormPreviewByMatchId[matchId] || null;
  const currentForm = fighter.octopusForm || "base";
  const charges = fighter.octopusAdaptationCharges ?? 0;
  const freeText = fighter.octopusFreeTransformationAvailable ? " · first transformation free" : "";
  const form = preview ? getCoconutOctopusFormDefinitionForPreview(preview) : null;

  const previewHtml = form
    ? `<div class="octopus-preview-panel" style="display:block;">
        <div class="octopus-preview-title">${escapeHtml(form.name)}${preview === currentForm ? " — Current Form" : " — Preview"}</div>
        <div class="octopus-preview-stats">${getCoconutOctopusPreviewStatsHtml(form)}</div>
        <div class="octopus-preview-text">${escapeHtml("Passive — " + (form.passive?.name || "None") + "\n" + (form.passive?.description || "No passive.") + "\n\nSuper — " + (form.special?.name || "None") + "\n" + (form.special?.description || "No super."))}</div>
        <div class="octopus-preview-actions">
          <button type="button" class="octopus-confirm-btn" data-online-octopus-confirm="${escapeHtml(matchId)}" ${!canAct || preview === currentForm || (!fighter.octopusFreeTransformationAvailable && charges <= 0) ? "disabled" : ""}>${fighter.octopusFreeTransformationAvailable ? "Confirm Free Transformation" : "Confirm Form Change (-1 charge)"}</button>
          <button type="button" class="octopus-cancel-btn" data-online-octopus-cancel="${escapeHtml(matchId)}">Cancel Preview</button>
        </div>
      </div>`
    : "";

  return `<div class="octopus-adaptation-panel" id="octopusAdaptationPanel">
      <div class="octopus-adaptation-title">Coconut Octopus — Stand Phase</div>
      <div class="octopus-adaptation-status">${escapeHtml(getCoconutOctopusFormText(fighter))} · adaptation ${charges}/8${escapeHtml(freeText)}
Special charges: ${escapeHtml(getCoconutOctopusChargeLine(fighter))}</div>
      <div class="octopus-adaptation-grid">
        ${["offensive", "defensive", "evasive"].map((formId) => `<button type="button" class="octopus-mini-btn octopus-form-btn ${formId === currentForm ? "active" : ""} ${formId === preview && formId !== currentForm ? "preview" : ""}" data-online-octopus-preview="${escapeHtml(formId)}" data-match-id="${escapeHtml(matchId)}" ${!canAct ? "disabled" : ""}>${escapeHtml(formId[0].toUpperCase() + formId.slice(1))}</button>`).join("")}
      </div>
      ${previewHtml}
    </div>`;
}

function bindOnlineTournamentOctopusControls(container, activeMatch, canAct) {
  if (!container || !activeMatch) return;
  container.querySelectorAll("[data-online-octopus-preview]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingOctopusFormPreviewByMatchId[activeMatch.matchId] = button.getAttribute("data-online-octopus-preview");
      renderState();
    });
  });
  container.querySelectorAll("[data-online-octopus-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      delete pendingOctopusFormPreviewByMatchId[activeMatch.matchId];
      renderState();
    });
  });
  container.querySelectorAll("[data-online-octopus-confirm]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!canAct || !roomCode) return;
      const formId = pendingOctopusFormPreviewByMatchId[activeMatch.matchId];
      if (!formId) return;
      socket.emit("transformCoconutOctopusOnlineTournament", { roomCode, matchId: activeMatch.matchId, formId });
      delete pendingOctopusFormPreviewByMatchId[activeMatch.matchId];
      addLog("Coconut Octopus adaptation sent for " + activeMatch.roundName + " Match " + (activeMatch.matchIndex + 1) + ".");
    });
  });
}

function localPlayerNeedsOnlineTournamentPerfectAdaptationChoice(activeMatch, action) {
  if (action !== "special") return false;
  const { fighter } = getLocalFighterInActiveMatch(activeMatch);
  return isCoconutOctopusFighter(fighter) && (fighter.octopusForm || "base") === "base";
}

function openOnlineTournamentOctopusPerfectAdaptationModal(activeMatch) {
  if (!activeMatch) return;
  pendingOctopusPerfectAdaptationMatchId = activeMatch.matchId;
  const modal = document.getElementById("octopusPerfectAdaptationModal");
  if (modal) modal.style.display = "flex";
}

function closeOnlineTournamentOctopusPerfectAdaptationModal() {
  pendingOctopusPerfectAdaptationMatchId = null;
  const modal = document.getElementById("octopusPerfectAdaptationModal");
  if (modal) modal.style.display = "none";
}

function renderActiveCombatMatch(activeMatch) {
  const panel = getEl("combatPanel");
  const area = getEl("activeCombatArea");
  const status = getEl("activeCombatStatus");
  const pill = getEl("activeCombatPill");
  if (!panel || !area) return;

  panel.classList.remove("locked-empty");

  const battle = activeMatch.battle;
  const localIsParticipant = activeMatchContainsLocalPlayer(activeMatch);
  const alreadySubmitted = hasLocalSubmittedAction(activeMatch);
  const canAct = localIsParticipant && !alreadySubmitted && !battle.finished;
  const localActive = getLocalActiveMatch();
  const canReturn = localActive && localActive.matchId !== activeMatch.matchId;

  if (status) {
    if (canAct) status.textContent = "Your combat. Choose an action.";
    else if (localIsParticipant && alreadySubmitted) status.textContent = "Action sent. Waiting for the opponent or bot resolution.";
    else status.textContent = "Spectating active combat. Click Return to Your Match to resume your own fight.";
  }

  if (pill) pill.textContent = activeMatch.roundName + " · Match " + (activeMatch.matchIndex + 1);

  const summaryText = lastTurnLinesByMatchId[activeMatch.matchId]?.length
    ? lastTurnLinesByMatchId[activeMatch.matchId].join("\n")
    : "Combat generated. Waiting for actions.";

  const combatLogText = battle.log?.length
    ? battle.log.map((line, index) => `${index + 1}. ${formatBattleLogLine(line)}`).join("\n")
    : "No combat log yet.";

  area.innerHTML = `
    <div class="online-battle-panel">
      ${renderOnlineBattleFighterCard(activeMatch.fighterA, battle.fighterA, "Fighter A", battle)}

      <div class="online-battle-center">
        <div class="online-match-title-card">
          <div class="online-title-top-row">
            <div>
              <div class="online-match-title">${escapeHtml(activeMatch.roundName)} · Match ${activeMatch.matchIndex + 1}</div>
              <div class="online-match-subtitle">
                ${escapeHtml(activeMatch.fighterA?.name || "TBD")} vs ${escapeHtml(activeMatch.fighterB?.name || "TBD")}<br>
                Turn ${battle.turn} · ${battle.biome ? battle.biome.toUpperCase() : "-"} · Modified stat: ${battle.biomeStat ? battle.biomeStat.toUpperCase() : "-"}
              </div>
            </div>
            ${canReturn ? `<button class="secondary-btn return-match-btn" id="returnToYourMatchBtn">Return to Your Match</button>` : ""}
          </div>
        </div>

        ${renderOnlineTournamentOctopusPanel(activeMatch, canAct)}

        <div class="online-actions-panel">
          <div class="online-actions-grid">
            ${renderActionButtons(activeMatch, canAct)}
          </div>
        </div>

        <div class="online-summary-panel">
          <div class="online-summary-title">Turn Summary</div>
          <div class="online-summary-box" data-turn-summary-match-id="${escapeHtml(activeMatch.matchId)}">${escapeHtml(summaryText)}</div>
        </div>
      </div>

      ${renderOnlineBattleFighterCard(activeMatch.fighterB, battle.fighterB, "Fighter B", battle)}
    </div>

    <div class="online-combat-log-panel">
      <div class="online-combat-log-title">Combat Log</div>
      <div class="online-combat-log-box">${escapeHtml(combatLogText)}</div>
    </div>
  `;

  area.querySelectorAll("[data-online-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!roomCode || !canAct) return;

      const action = button.getAttribute("data-online-action");

      if (localPlayerNeedsOnlineTournamentPerfectAdaptationChoice(activeMatch, action)) {
        openOnlineTournamentOctopusPerfectAdaptationModal(activeMatch);
        return;
      }

      if (action === "larval-command") {
        openLarvalCommandModal(activeMatch);
        return;
      }

      const larvalCommand = getPreparedLarvalCommand(activeMatch.matchId);

      socket.emit("onlineTournamentPlayerAction", {
        roomCode,
        matchId: activeMatch.matchId,
        action,
        larvalCommand,
        coconutPerfectAdaptationChoice: null
      });

      if (larvalCommand) {
        delete larvalCommandsByMatchId[activeMatch.matchId];
      }

      addLog("Action sent for " + activeMatch.roundName + " Match " + (activeMatch.matchIndex + 1) + ": " + action);
    });
  });

  bindOnlineTournamentOctopusControls(area, activeMatch, canAct);

  getEl("returnToYourMatchBtn")?.addEventListener("click", () => {
    if (!localActive) return;
    viewedMatchId = localActive.matchId;
    renderState();
  });

  const summaryBox = area.querySelector(".online-summary-box");
  if (summaryBox) summaryBox.scrollTop = summaryBox.scrollHeight;

  const combatLog = area.querySelector(".online-combat-log-box");
  if (combatLog) combatLog.scrollTop = combatLog.scrollHeight;

  loadImagesInside(area);
  bindFlipButtonsInside(area);
}

function renderActiveCombat() {
  const panel = getEl("combatPanel");
  const area = getEl("activeCombatArea");
  const status = getEl("activeCombatStatus");
  const pill = getEl("activeCombatPill");
  if (!panel || !area) return;

  const viewed = getViewedMatchData();

  if (!viewed) {
    panel.classList.add("locked-empty");

    if (currentState?.bracket?.finished) {
      const champion = currentState.bracket.champion;
      if (status) status.textContent = "Tournament finished.";
      if (pill) pill.textContent = champion ? "Champion: " + champion.name : "Finished";
      area.innerHTML = `<div class="empty-combat-card">Tournament finished. Champion: <strong>${champion?.name || "TBD"}</strong></div>`;
      return;
    }

    if (status) {
      status.textContent = currentState?.bracket
        ? "No active combat. The host can generate the next batch of combats."
        : "Generate the bracket, then let the host generate combats.";
    }

    if (pill) pill.textContent = "No combat";
    area.innerHTML = `
      <div class="empty-combat-card">
        ${currentState?.bracket
          ? "Bracket locked. Press Generate Available Combats to start every ready human match and auto-resolve bot-only matches."
          : "No active combat yet."}
      </div>
    `;
    return;
  }

  if (viewed.type === "active") {
    renderActiveCombatMatch(viewed.active);
    return;
  }

  renderResolvedMatch(viewed);
}

let larvalModalMatchId = null;
let larvalDraftCommand = {
  attack: 0,
  defense: 0,
  sacrifice: 0
};

function getLarvalModalActiveMatch() {
  if (!larvalModalMatchId) return null;
  return getActiveMatchById(larvalModalMatchId);
}

function getLarvalDraftTotal() {
  return getSharedLarvalDraftTotal(larvalDraftCommand);
}

function getCurrentPlayerLarvaeForModal() {
  const activeMatch = getLarvalModalActiveMatch();
  const { fighter } = activeMatch ? getLocalFighterInActiveMatch(activeMatch) : { fighter: null };
  return getSharedCurrentLarvae(fighter, false);
}

function renderLarvalCommandModal() {
  const activeMatch = getLarvalModalActiveMatch();
  const { fighter } = activeMatch ? getLocalFighterInActiveMatch(activeMatch) : { fighter: null };
  renderSharedLarvalCommandModalDom({
    fighter,
    draft: larvalDraftCommand,
    previewMode: false
  });
}

function openLarvalCommandModal(activeMatch) {
  const { fighter } = getLocalFighterInActiveMatch(activeMatch);

  if (!fighter || fighter.passive?.id !== "larval-gestation") {
    window.alert("Only Darwin's Frog can command larvae.");
    return;
  }

  if ((fighter.darwinsLarvae || 0) <= 0) {
    window.alert("No larvae available.");
    return;
  }

  larvalModalMatchId = activeMatch.matchId;

  const existing = larvalCommandsByMatchId[activeMatch.matchId];

  larvalDraftCommand = existing
    ? {
        attack: existing.attack || 0,
        defense: existing.defense || 0,
        sacrifice: existing.sacrifice || 0
      }
    : {
        attack: 0,
        defense: 0,
        sacrifice: 0
      };

  const modal = getEl("larvalCommandModal");
  if (!modal) return;

  modal.style.display = "flex";
  renderLarvalCommandModal();
}

function closeLarvalCommandModal() {
  const modal = getEl("larvalCommandModal");
  if (modal) modal.style.display = "none";
  larvalModalMatchId = null;
}

function adjustLarvalDraft(type, delta) {
  const larvae = getCurrentPlayerLarvaeForModal();
  const current = larvalDraftCommand[type] || 0;

  if (delta > 0 && getLarvalDraftTotal() >= larvae) return;
  if (type === "defense" && delta > 0 && current >= 2) return;

  larvalDraftCommand[type] = Math.max(0, current + delta);
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

function confirmLarvalCommandModal() {
  if (!larvalModalMatchId) return;

  const larvae = getCurrentPlayerLarvaeForModal();
  const total = getLarvalDraftTotal();

  if (total > larvae) {
    window.alert("You assigned more larvae than available.");
    return;
  }

  if (total <= 0) {
    delete larvalCommandsByMatchId[larvalModalMatchId];
    addLog("Larval command cleared.");
  } else {
    larvalCommandsByMatchId[larvalModalMatchId] = {
      attack: larvalDraftCommand.attack || 0,
      defense: larvalDraftCommand.defense || 0,
      sacrifice: larvalDraftCommand.sacrifice || 0
    };

    const conserved = Math.max(0, larvae - total);

    addLog(
      "Larval command prepared: " +
      "Attack " +
      (larvalDraftCommand.attack || 0) +
      " · Defense " +
      (larvalDraftCommand.defense || 0) +
      " · Sacrifice " +
      (larvalDraftCommand.sacrifice || 0) +
      " · Conserved " +
      conserved +
      ". Choose a main action to send it."
    );
  }

  closeLarvalCommandModal();
  renderState();
}

function bindOnlineTournamentOctopusModalListeners() {
  document.getElementById("octopusPerfectAdaptationCloseBtn")?.addEventListener("click", closeOnlineTournamentOctopusPerfectAdaptationModal);
  document.querySelectorAll("[data-octopus-perfect-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!pendingOctopusPerfectAdaptationMatchId || !roomCode) return;
      const activeMatch = getActiveMatchById(pendingOctopusPerfectAdaptationMatchId);
      if (!activeMatch) return;
      const choice = button.getAttribute("data-octopus-perfect-choice");
      const larvalCommand = getPreparedLarvalCommand(activeMatch.matchId);
      socket.emit("onlineTournamentPlayerAction", {
        roomCode,
        matchId: activeMatch.matchId,
        action: "special",
        larvalCommand,
        coconutPerfectAdaptationChoice: choice
      });
      if (larvalCommand) delete larvalCommandsByMatchId[activeMatch.matchId];
      closeOnlineTournamentOctopusPerfectAdaptationModal();
      addLog("Perfect Adaptation sent: " + (OCTOPUS_SPECIAL_CHOICE_LABELS[choice] || choice));
    });
  });
}

function bindLarvalCommandModalListeners() {
  getEl("larvalCommandCloseBtn")?.addEventListener("click", closeLarvalCommandModal);
  getEl("larvalAttackMinus")?.addEventListener("click", () => adjustLarvalDraft("attack", -1));
  getEl("larvalAttackPlus")?.addEventListener("click", () => adjustLarvalDraft("attack", 1));
  getEl("larvalDefenseMinus")?.addEventListener("click", () => adjustLarvalDraft("defense", -1));
  getEl("larvalDefensePlus")?.addEventListener("click", () => adjustLarvalDraft("defense", 1));
  getEl("larvalSacrificeMinus")?.addEventListener("click", () => adjustLarvalDraft("sacrifice", -1));
  getEl("larvalSacrificePlus")?.addEventListener("click", () => adjustLarvalDraft("sacrifice", 1));
  getEl("larvalClearBtn")?.addEventListener("click", clearLarvalDraft);
  getEl("larvalConfirmBtn")?.addEventListener("click", confirmLarvalCommandModal);
}

function renderConnectionPanel() {
  const connected = Boolean(socket?.connected);
  const localPlayer = getLocalPlayerState();
  const bracketLocked = Boolean(currentState?.bracketLocked);
  const isHost = currentState?.hostId === localSocketId;
  const activeCount = currentState?.activeMatches?.length || 0;

  setText("socketStatusValue", connected ? "Connected" : "Disconnected");
  setText("roomCodeValue", roomCode || "-");
  setText("playerNumberValue", localPlayerNumber ? "Player " + localPlayerNumber : "-");
  setText("playersCountValue", (currentState?.players?.length || 0) + "/" + (currentState?.maxPlayers || MAX_TOURNAMENT_PLAYERS));
  setText("fighterStatusValue", localPlayer?.fighterName || "-");
  setText("readyStatusValue", localPlayer?.ready ? "Ready" : "Not ready");

  const readyBtn = getEl("readyBtn");
  const startBtn = getEl("startTournamentBtn");
  const resetBtn = getEl("resetTournamentBtn");
  const nextCombatBtn = getEl("nextCombatBtn");
  const copyBtn = getEl("copyRoomBtn");
  const roomInput = getEl("roomInput");

  if (copyBtn) copyBtn.disabled = !roomCode;
  if (roomInput && roomCode && roomInput.value !== roomCode) roomInput.value = roomCode;

  if (readyBtn) {
    readyBtn.disabled = !roomCode || bracketLocked || !localPlayer?.fighterId;
    readyBtn.textContent = localPlayer?.ready ? "Unready" : "Ready";
  }

  const enoughPlayers = (currentState?.players?.length || 0) >= (currentState?.minPlayers || MIN_TOURNAMENT_PLAYERS);
  const everyoneReady = Boolean(currentState?.players?.length) && currentState.players.every((player) => player.ready);
  const everyoneHasFighter = Boolean(currentState?.players?.length) && currentState.players.every((player) => player.fighterId);

  if (startBtn) {
    startBtn.disabled = !roomCode || bracketLocked || !isHost || !enoughPlayers || !everyoneReady || !everyoneHasFighter;
  }

  if (resetBtn) {
    resetBtn.disabled = !roomCode || !isHost || !bracketLocked;
  }

  if (nextCombatBtn) {
    nextCombatBtn.disabled = !roomCode || !isHost || !bracketLocked || activeCount > 0 || Boolean(currentState?.bracket?.finished);
    nextCombatBtn.textContent = activeCount > 0 ? "Combats Running" : "Generate Available Combats";
  }
}

function renderPlayerSlots() {
  const container = getEl("playerSlots");
  if (!container) return;

  container.innerHTML = "";

  const players = currentState?.players || [];
  const maxSlots = currentState?.maxPlayers || MAX_TOURNAMENT_PLAYERS;

  for (let i = 0; i < maxSlots; i++) {
    const player = players[i];
    const slot = document.createElement("div");
    slot.className = "player-slot";

    if (player?.id === localSocketId) slot.classList.add("local-player");
    if (player?.ready) slot.classList.add("ready");
    if (!player) slot.classList.add("empty-slot");

    const title = document.createElement("div");
    title.className = "player-slot-title";
    title.textContent = player ? "Player " + (i + 1) + (player?.isHost ? " · Host" : "") : "Open Slot " + (i + 1);

    const fighter = document.createElement("div");
    fighter.className = "player-slot-fighter";
    fighter.textContent = player?.fighterName || "Waiting for player...";

    const status = document.createElement("div");
    status.className = "player-slot-status";
    status.textContent = player ? (player.ready ? "Ready" : "Choosing fighter") : "Can be filled by a real player before bracket generation";

    slot.appendChild(title);
    slot.appendChild(fighter);
    slot.appendChild(status);
    container.appendChild(slot);
  }
}

function renderParticipant(participant, match) {
  const wrapper = document.createElement("div");
  wrapper.className = "bracket-fighter";

  if (!participant) {
    wrapper.classList.add("empty");
    wrapper.innerHTML = `<div class="bracket-avatar empty-avatar"></div><div><div class="bracket-name">TBD</div><div class="bracket-meta">Awaiting winner</div></div>`;
    return wrapper;
  }

  if (participant.socketId === localSocketId) wrapper.classList.add("your-entry");
  if (participant.type === "player") wrapper.classList.add("human-entry");
  if (match?.winner && getParticipantKey(match.winner) === getParticipantKey(participant)) wrapper.classList.add("winner-entry");
  if (match?.resolved && (!match.winner || getParticipantKey(match.winner) !== getParticipantKey(participant))) wrapper.classList.add("loser-entry");

  const avatar = document.createElement("div");
  avatar.className = "bracket-avatar";

  const img = document.createElement("img");
  img.alt = participant.name;
  avatar.appendChild(img);
  loadFighterImage(img, participant.fighterId);

  const textWrap = document.createElement("div");
  textWrap.className = "bracket-text";

  const name = document.createElement("div");
  name.className = "bracket-name";
  name.textContent = participant.name;

  const meta = document.createElement("div");
  meta.className = "bracket-meta";

  if (participant.type === "player") {
    meta.textContent = participant.socketId === localSocketId
      ? "You · Position " + participant.position
      : "Player " + participant.playerNumber + " · Position " + participant.position;
  } else {
    meta.textContent = "Bot · Position " + participant.position;
  }

  textWrap.appendChild(name);
  textWrap.appendChild(meta);
  wrapper.appendChild(avatar);
  wrapper.appendChild(textWrap);

  return wrapper;
}

function renderBracket() {
  const bracketGrid = getEl("bracketGrid");
  const bracketStatus = getEl("bracketStatus");
  if (!bracketGrid) return;

  bracketGrid.innerHTML = "";
  const bracket = currentState?.bracket;
  const activeMatchIds = new Set((currentState?.activeMatches || []).map((match) => match.matchId));

  if (!bracket) {
    if (bracketStatus) bracketStatus.textContent = "Waiting for bracket";
    bracketGrid.innerHTML = `
      <div class="empty-bracket-card">
        Create or join a room, choose fighters, mark all joined players ready, then let the host generate the shared 16-fighter bracket. Bots will fill every empty slot.
      </div>
    `;
    return;
  }

  if (bracketStatus) {
    bracketStatus.textContent = bracket.finished
      ? "Champion: " + (bracket.champion?.name || "TBD")
      : activeMatchIds.size > 0
        ? activeMatchIds.size + " active combat" + (activeMatchIds.size === 1 ? "" : "s")
        : "Bracket locked";
  }

  bracket.rounds.forEach((round) => {
    const column = document.createElement("section");
    column.className = "bracket-column";

    const title = document.createElement("h3");
    title.textContent = round.name;
    column.appendChild(title);

    round.matches.forEach((match, index) => {
      const card = document.createElement("div");
      card.className = "bracket-match";
      card.dataset.matchId = match.id;

      if (activeMatchIds.has(match.id)) card.classList.add("active-match");
      if (match.resolved) card.classList.add("resolved-match");
      if (viewedMatchId === match.id) card.classList.add("viewed-match");
      if (matchContainsLocalPlayer(match)) card.classList.add("your-match-card");

      const matchLabel = document.createElement("div");
      matchLabel.className = "match-label";
      matchLabel.textContent = "Match " + (index + 1) + (activeMatchIds.has(match.id) ? " · ACTIVE" : match.resolved ? " · RESOLVED" : "");

      card.appendChild(matchLabel);
      card.appendChild(renderParticipant(match.fighterA, match));
      card.appendChild(renderParticipant(match.fighterB, match));

      card.addEventListener("click", () => {
        viewedMatchId = match.id;
        if (match.resolved && Array.isArray(match.battleReplay) && resolvedReplayIndexByMatchId[match.id] === undefined) {
          resolvedReplayIndexByMatchId[match.id] = 0;
        }
        renderActiveCombat();
        renderBracket();
      });

      column.appendChild(card);
    });

    bracketGrid.appendChild(column);
  });
}

function renderState() {
  renderConnectionPanel();
  renderPlayerSlots();
  renderActiveCombat();
  renderBracket();
}

function initFighterSelector() {
  const defaultFighter = getAvailableFighterIds()[0] || "";

  fighterSelector = setupFighterSelector({
    selectId: "playerFighter",
    categoryId: "playerFighterCategory",
    sortId: "playerFighterSort",
    favoriteToggleId: "playerFighterFavoriteToggle",
    defaultValue: defaultFighter,
    onChange: () => {
      emitSelectedFighter();
    }
  });
}

function initSocket() {
  socket = io();

  socket.on("connect", () => {
    localSocketId = socket.id;
    addLog("Connected to WAFT server.");
    renderState();
  });

  socket.on("disconnect", () => {
    addLog("Disconnected from WAFT server.");
    renderState();
  });

  socket.on("onlineTournamentRoomCreated", (payload) => {
    roomCode = payload.roomCode;
    localPlayerNumber = payload.playerNumber;
    localSocketId = payload.playerId || socket.id;
    getEl("roomInput").value = roomCode;
    addLog("Tournament room created: " + roomCode);
    emitSelectedFighter();
    renderState();
  });

  socket.on("onlineTournamentRoomJoined", (payload) => {
    roomCode = payload.roomCode;
    localPlayerNumber = payload.playerNumber;
    localSocketId = payload.playerId || socket.id;
    getEl("roomInput").value = roomCode;
    addLog("Joined tournament room: " + roomCode);
    emitSelectedFighter();
    renderState();
  });

  socket.on("onlineTournamentState", (state) => {
    currentState = state;
    roomCode = state.roomCode || roomCode;

    const localPlayer = getLocalPlayerState();
    if (localPlayer) localPlayerNumber = localPlayer.playerNumber;

    if (viewedMatchId && !getActiveMatchById(viewedMatchId) && !findBracketMatchById(viewedMatchId)) {
      viewedMatchId = null;
    }

    const localActive = getLocalActiveMatch();
    if (localActive && (!viewedMatchId || !getActiveMatchById(viewedMatchId))) {
      viewedMatchId = localActive.matchId;
    }

    renderState();
  });

  socket.on("onlineTournamentBracketCreated", (state) => {
    currentState = state;
    viewedMatchId = null;
    const humanCount = state.players?.length || 0;
    const botCount = Math.max(0, 16 - humanCount);
    addLog("Shared bracket generated and locked: " + humanCount + " human player" + (humanCount === 1 ? "" : "s") + " + " + botCount + " bot" + (botCount === 1 ? "" : "s") + ".");
    renderState();
  });

  socket.on("onlineTournamentCombatGenerated", ({ result, state }) => {
    currentState = state;

    if (result?.autoResolvedCount) {
      addLog("Auto-resolved " + result.autoResolvedCount + " bot combat" + (result.autoResolvedCount === 1 ? "" : "s") + ".");
    }

    if (result?.createdMatches?.length) {
      addLog("Generated " + result.createdMatches.length + " active combat" + (result.createdMatches.length === 1 ? "" : "s") + ".");

      result.createdMatches.forEach((match) => {
        if (!lastTurnLinesByMatchId[match.matchId]) {
          lastTurnLinesByMatchId[match.matchId] = [
            match.roundName + " begins.",
            match.fighterA.name + " faces " + match.fighterB.name + "."
          ];
        }
      });
    }

    if (result?.type === "finished") addLog("Tournament finished.");
    if (result?.type === "waiting") addLog("Waiting for the next round to become ready.");
    if (result?.type === "active") addLog("There are already active combats.");

    const localActive = getLocalActiveMatch();
    if (localActive) viewedMatchId = localActive.matchId;
    else if (!viewedMatchId && currentState.activeMatches?.[0]) viewedMatchId = currentState.activeMatches[0].matchId;

    renderState();
  });

  socket.on("onlineTournamentBattleUpdated", ({ matchId, message, state }) => {
    currentState = state;
    if (message) addLog(message);
    renderState();
  });

  socket.on("onlineTournamentTurnResolved", ({ result, state }) => {
    const previousViewedMatchId = viewedMatchId;
    const animationSnapshot = result?.matchId
      ? (() => {
          const existing = getActiveMatchById(result.matchId);
          return existing
            ? {
                ...existing,
                battle: result.battle || existing.battle
              }
            : null;
        })()
      : null;

    currentState = state;

    if (result?.matchId && result?.newLines?.length) {
      const summaryLines = buildTurnSummary(result.newLines);

      lastTurnLinesByMatchId[result.matchId] = [""];
      pendingAnimationByMatchId[result.matchId] = result.newLines;
      pendingSummaryByMatchId[result.matchId] = summaryLines;

      addLog("Turn resolved for " + result.matchId + ".");
    }

    if (result?.finished && result?.winnerParticipant) {
      addLog("Combat finished. Winner: " + result.winnerParticipant.name + ".");
    }

    const localActive = getLocalActiveMatch();

    if (previousViewedMatchId) {
      viewedMatchId = previousViewedMatchId;
    } else if (localActive) {
      viewedMatchId = localActive.matchId;
    } else if (result?.matchId) {
      viewedMatchId = result.matchId;
    }

    renderState();

    if (result?.matchId && pendingAnimationByMatchId[result.matchId]) {
      const linesToAnimate = pendingAnimationByMatchId[result.matchId];
      const summaryToType = pendingSummaryByMatchId[result.matchId] || buildTurnSummary(linesToAnimate);
      delete pendingAnimationByMatchId[result.matchId];
      delete pendingSummaryByMatchId[result.matchId];

      setTimeout(async () => {
        await runOnlineShakeSequence(result.matchId, linesToAnimate, animationSnapshot);
        await typeTurnSummaryForMatch(result.matchId, summaryToType);
      }, 30);
    }
  });

  socket.on("onlineTournamentWaitingForOpponentAction", ({ matchId }) => {
    if (matchId) viewedMatchId = matchId;
    addLog("Waiting for opponent action...");
    renderState();
  });

  socket.on("onlineTournamentOpponentDisconnected", () => {
    addLog("A tournament player disconnected. Lobby updated.");
  });

  socket.on("onlineTournamentError", (message) => {
    addLog("Error: " + message);
    window.alert(message);
  });
}

function initDomEvents() {
  getEl("createTournamentRoomBtn")?.addEventListener("click", () => {
    socket.emit("createOnlineTournamentRoom");
  });

  getEl("joinTournamentRoomBtn")?.addEventListener("click", () => {
    const code = normalizeRoomCode(getEl("roomInput")?.value);

    if (!code) {
      window.alert("Enter a tournament room code.");
      return;
    }

    socket.emit("joinOnlineTournamentRoom", code);
  });

  getEl("copyRoomBtn")?.addEventListener("click", copyRoomCode);

  getEl("readyBtn")?.addEventListener("click", () => {
    if (!roomCode) return;

    const localPlayer = getLocalPlayerState();

    socket.emit("setOnlineTournamentReady", {
      roomCode,
      ready: !localPlayer?.ready
    });
  });

  getEl("startTournamentBtn")?.addEventListener("click", () => {
    if (!roomCode) return;

    socket.emit("startOnlineTournament", {
      roomCode
    });
  });

  getEl("resetTournamentBtn")?.addEventListener("click", () => {
    if (!roomCode) return;

    socket.emit("resetOnlineTournamentRoom", {
      roomCode
    });
  });

  getEl("nextCombatBtn")?.addEventListener("click", () => {
    if (!roomCode) return;

    socket.emit("generateOnlineTournamentNextCombat", {
      roomCode
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initFighterSelector();
  initSocket();
  initDomEvents();
  bindLarvalCommandModalListeners();
  bindOnlineTournamentOctopusModalListeners();
  renderState();
});
