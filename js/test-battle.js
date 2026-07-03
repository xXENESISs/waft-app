import { animals } from "./animals.js";
import { setupLinkedFighterSelectors } from "./fighter-selector.js";
import {
  createBattle,
  resolveTurn,
  canUseAction,
  getEffectiveStat,
  transformCoconutOctopus,
  setCoconutOctopusPerfectAdaptationChoice
} from "./battle-engine.js";
import { chooseAndApplyAIAction } from "./ai-controller.js";

let currentBattle = null;
let playerId = null;
let enemyId = null;

let lastPlayerAction = "-";
let lastEnemyAction = "-";
let lastTurnOutcome = "-";
let lastTurnSummaryLines = ["Start a battle to begin."];

let playerFlipped = false;
let enemyFlipped = true;
let pendingOctopusFormPreview = null;
let preBattlePreviewPlayer = null;

let isAnimatingTurn = false;
let summaryAnimationToken = 0;

let socket = null;
let multiplayerRoomCode = null;
let multiplayerPlayerNumber = null;
let multiplayerPlayerSocketId = null;
let multiplayerPlayer1SocketId = null;
let multiplayerPlayer2SocketId = null;
let isMultiplayer = false;
let isWaitingForOpponentAction = false;

const TYPEWRITER_CHAR_DELAY = 8;
const TYPEWRITER_LINE_PAUSE = 180;

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

const SLOTH_COLONIES = [
  {
    id: "algae",
    emoji: "🟢",
    label: "Algae",
    fullName: "Algae Colony",
    className: "sloth-colony-algae",
    shortEffect: "50% end turn: +30 HP / +15 Stamina.",
    detail: "At the end of each turn, rolls 50%. On success, restores 30 HP and 15 Stamina.",
    amplified: "With Lichens: rolls twice independently."
  },
  {
    id: "fungi",
    emoji: "🍄",
    label: "Fungi",
    fullName: "Fungal Colony",
    className: "sloth-colony-fungi",
    shortEffect: "50% to invert stat reductions.",
    detail: "When the sloth receives a numeric stat debuff, rolls 50%. On success, turns the stat loss into the same stat gain.",
    amplified: "With Lichens: gets two independent inversion chances."
  },
  {
    id: "bacteria",
    emoji: "🦠",
    label: "Bacteria",
    fullName: "Bacterial Colony",
    className: "sloth-colony-bacteria",
    shortEffect: "Consecutive hits scale damage, then discharge.",
    detail: "Successful attacks build a 5-step chain. Softer damage curve: 1st hit +0%, 2nd +25%, 3rd +50%, 4th +75%, 5th +100%. After the peak hit, the chain resets to 0/5.",
    amplified: "With Lichens: each hit advances the chain by 2 steps, but the damage bonus is not doubled."
  },
  {
    id: "mites",
    emoji: "🕷️",
    label: "Mites",
    fullName: "Mite Colony",
    className: "sloth-colony-mites",
    shortEffect: "Attacks cost -5 Stamina.",
    detail: "Normal, Quick, Precise and Explosive attacks cost 5 less Stamina. Costs cannot go below 0.",
    amplified: "With Lichens: attacks cost 10 less Stamina."
  },
  {
    id: "lichens",
    emoji: "🪨",
    label: "Lichens",
    fullName: "Lichen Colony",
    className: "sloth-colony-lichens",
    shortEffect: "Amplifies the other active colony.",
    detail: "While active, it doubles the effect of the other active colony.",
    amplified: "During Microecosystem Ancestral, it empowers all four other colonies at once."
  }
];

const SLOTH_COLONY_BY_ID = Object.fromEntries(
  SLOTH_COLONIES.map((colony) => [colony.id, colony])
);

function isThreeToedSlothFighter(fighter) {
  return fighter && fighter.id === "three-toed-sloth";
}

function getSlothActiveColonies(fighter) {
  if (!isThreeToedSlothFighter(fighter)) return [];

  return Array.isArray(fighter.slothActiveColonies)
    ? fighter.slothActiveColonies
    : [];
}

function isSlothDormantInCurrentBiome(fighter) {
  if (!isThreeToedSlothFighter(fighter)) return false;
  if (fighter.slothMicroecosystemActive) return false;

  return currentBattle && (currentBattle.biome === "arctic" || currentBattle.biome === "desert");
}

function slothHasColony(fighter, colonyId) {
  return getSlothActiveColonies(fighter).includes(colonyId);
}

function getSlothBacterialBonusForHitLevel(hitLevel) {
  const level = Math.max(1, Math.min(5, hitLevel || 1));

  switch (level) {
    case 2:
      return 25;
    case 3:
      return 50;
    case 4:
      return 75;
    case 5:
      return 100;
    default:
      return 0;
  }
}

function getSlothBacterialNextHitBonus(fighter) {
  const chain = Math.max(0, Math.min(5, fighter.slothBacterialChain || 0));
  return getSlothBacterialBonusForHitLevel(Math.min(5, chain + 1));
}

function getSlothBacterialFollowingHitBonus(fighter) {
  const current = Math.max(0, Math.min(5, fighter.slothBacterialChain || 0));
  const progressGain = slothHasColony(fighter, "lichens") ? 2 : 1;
  const afterNextHit = Math.min(5, current + progressGain);

  if (Math.min(5, current + 1) >= 5) return 0;

  return getSlothBacterialBonusForHitLevel(Math.min(5, afterNextHit + 1));
}

function getSlothBacterialProgressText(fighter) {
  const chain = Math.max(0, Math.min(5, fighter.slothBacterialChain || 0));
  const nextHitBonus = getSlothBacterialNextHitBonus(fighter);
  const followingBonus = getSlothBacterialFollowingHitBonus(fighter);

  return (
    "Chain: " +
    chain +
    "/5 · Next hit +" +
    nextHitBonus +
    "% · Following +" +
    followingBonus +
    "% · peak resets"
  );
}

function getThreeToedSlothStatusText(fighter) {
  if (!isThreeToedSlothFighter(fighter)) return "";

  const colonies = getSlothActiveColonies(fighter);
  const colonyText = colonies.length > 0
    ? colonies.map((colonyId) => SLOTH_COLONY_BY_ID[colonyId]?.label || colonyId).join(", ")
    : "None";

  const lines = [
    "Living Ecosystem: " +
      (fighter.slothMicroecosystemActive
        ? "MICROECOSYSTEM"
        : isSlothDormantInCurrentBiome(fighter)
          ? "DORMANT"
          : "ACTIVE"),
    "Active colonies: " + colonyText,
    getSlothBacterialProgressText(fighter)
  ];

  if (slothHasColony(fighter, "lichens")) {
    lines.push(
      fighter.slothMicroecosystemActive
        ? "Lichens: empowering all colonies."
        : "Lichens: advancing the other colony faster."
    );
  }

  if (fighter.slothMicroecosystemActive) {
    lines.push(
      "Microecosystem Ancestral: " +
        (fighter.slothMicroecosystemTurns || 0) +
        " turn(s) left"
    );
  }

  if (isSlothDormantInCurrentBiome(fighter)) {
    lines.push("Arctic/Desert dormancy: no colonies and no Microecosystem.");
  }

  return lines.join("\n");
}

function getSlothColonyCurrentEffectText(fighter, colony) {
  const active = slothHasColony(fighter, colony.id);
  const lichensActive = slothHasColony(fighter, "lichens");
  const micro = Boolean(fighter.slothMicroecosystemActive);

  if (colony.id === "bacteria") {
    return getSlothBacterialProgressText(fighter);
  }

  if (colony.id === "lichens") {
    if (!active) return colony.shortEffect;
    return micro
      ? "Empowering Algae, Fungi, Bacteria and Mites."
      : "Doubling the other active colony.";
  }

  if (active && lichensActive) {
    return colony.amplified;
  }

  return colony.shortEffect;
}


function getSlothMiniStateLabel(active, boosted, dormant) {
  if (active && boosted) return "AMP";
  if (active) return "ACTIVE";
  if (dormant) return "LETARGO";
  return "DORMANT";
}

function getSlothFullStateLabel(active, boosted, dormant) {
  if (active && boosted) return "AMPLIFIED";
  if (active) return "ACTIVE";
  if (dormant) return "LETARGO";
  return "DORMANT";
}

function renderSlothColonyChip(fighter, colony, compact = false) {
  const active = slothHasColony(fighter, colony.id);
  const dormant = isSlothDormantInCurrentBiome(fighter);
  const lichensActive = slothHasColony(fighter, "lichens");
  const boosted = active && lichensActive && colony.id !== "lichens";
  const state = active ? "active" : "inactive";

  return `
    <div class="sloth-colony-chip ${colony.className} ${state}${dormant ? " dormant" : ""}${boosted ? " boosted" : ""}">
      <div class="sloth-colony-chip-top">
        <span class="sloth-colony-emoji">${colony.emoji}</span>
        <span class="sloth-colony-name">${compact ? colony.label : colony.fullName}</span>
      </div>
      <div class="sloth-colony-state">${getSlothMiniStateLabel(active, boosted, dormant)}</div>
    </div>
  `;
}

function renderSlothEcosystemMiniPanel(fighter) {
  const preview = Boolean(fighter.slothPreviewMode && !currentBattle);
  const dormant = !preview && isSlothDormantInCurrentBiome(fighter);
  const micro = Boolean(fighter.slothMicroecosystemActive);
  const activeCount = getSlothActiveColonies(fighter).length;
  const biome = currentBattle?.biome ? currentBattle.biome.toUpperCase() : "-";
  const stateText = preview
    ? "PREVIEW"
    : micro
      ? "MICROECOSYSTEM"
      : dormant
        ? "LETARGO"
        : activeCount + "/5 ACTIVE";
  const stateSubtext = preview
    ? "All colonies shown · battle starts with 2 random colonies"
    : micro
      ? "All colonies awakened · " + (fighter.slothMicroecosystemTurns || 0) + " turn(s)"
      : dormant
        ? "Arctic/Desert blocks the ecosystem"
        : "Biome " + biome + " · colonies rotate with biome shifts";

  return `
    <div class="sloth-ecosystem-card${micro ? " ancestral" : ""}${dormant ? " dormant" : ""}">
      <div class="sloth-ecosystem-header">
        <div>
          <div class="sloth-ecosystem-title">🌿 Living Ecosystem</div>
          <div class="sloth-ecosystem-subtitle">${stateSubtext}</div>
        </div>
        <div class="sloth-ecosystem-badge">${stateText}</div>
      </div>
      <div class="sloth-mini-colonies">
        ${SLOTH_COLONIES.map((colony) => renderSlothColonyChip(fighter, colony, true)).join("")}
      </div>
      <div class="sloth-chain-strip">
        <span>🦠 ${getSlothBacterialProgressText(fighter)}</span>
        ${slothHasColony(fighter, "lichens") ? "<span>🪨 Lichens speed up colony growth</span>" : ""}
      </div>
    </div>
  `;
}

function renderSlothColonyDetailCard(fighter, colony) {
  const active = slothHasColony(fighter, colony.id);
  const dormant = isSlothDormantInCurrentBiome(fighter);
  const lichensActive = slothHasColony(fighter, "lichens");
  const boosted = active && lichensActive && colony.id !== "lichens";

  return `
    <div class="sloth-modal-colony ${colony.className} ${active ? "active" : "inactive"}${dormant ? " dormant" : ""}${boosted ? " boosted" : ""}">
      <div class="sloth-modal-colony-head">
        <div class="sloth-modal-colony-title">
          <span>${colony.emoji}</span>
          <strong>${colony.fullName}</strong>
        </div>
        <div class="sloth-modal-status">${getSlothFullStateLabel(active, boosted, dormant)}</div>
      </div>
      <div class="sloth-modal-colony-effect">${colony.detail}</div>
      <div class="sloth-modal-colony-current">${getSlothColonyCurrentEffectText(fighter, colony)}</div>
      <div class="sloth-modal-colony-boost">${colony.amplified}</div>
    </div>
  `;
}

function renderSlothEcosystemModal(fighterOverride = null) {
  const player = fighterOverride || (currentBattle ? getBattleFighters().player : preBattlePreviewPlayer);
  const body = document.getElementById("slothEcosystemModalBody");
  const subtitle = document.getElementById("slothEcosystemModalSubtitle");

  if (!body || !subtitle || !isThreeToedSlothFighter(player)) return;

  const preview = Boolean(player.slothPreviewMode && !currentBattle);
  const dormant = !preview && isSlothDormantInCurrentBiome(player);
  const micro = Boolean(player.slothMicroecosystemActive);
  const activeCount = getSlothActiveColonies(player).length;
  const biome = preview ? "PRE-BATTLE" : currentBattle?.biome ? currentBattle.biome.toUpperCase() : "-";

  subtitle.textContent = preview
    ? "Pre-battle view: these are the 5 possible colonies. Battle start awakens 2 random colonies unless the biome is Arctic or Desert."
    : micro
      ? "Microecosystem Ancestral active: all colonies are awake for " + (player.slothMicroecosystemTurns || 0) + " turn(s)."
      : dormant
        ? "Biome " + biome + ": ecosystem in letargo. No colonies are active and Microecosystem is blocked."
        : "Biome " + biome + ": " + activeCount + "/5 colonies active. Lichens accelerate colony growth when awake.";

  body.innerHTML = `
    <div class="sloth-modal-summary${micro ? " ancestral" : ""}${dormant ? " dormant" : ""}">
      <div>
        <div class="sloth-modal-summary-label">Current State</div>
        <div class="sloth-modal-summary-value">${preview ? "PRE-BATTLE COLONY GUIDE" : micro ? "MICROECOSYSTEM ANCESTRAL" : dormant ? "LETARGO" : "LIVING ECOSYSTEM ACTIVE"}</div>
      </div>
      <div>
        <div class="sloth-modal-summary-label">Bacterial Chain</div>
        <div class="sloth-modal-summary-value">${getSlothBacterialProgressText(player)}</div>
      </div>
      <div>
        <div class="sloth-modal-summary-label">Lichens</div>
        <div class="sloth-modal-summary-value">${
          slothHasColony(player, "lichens")
            ? micro
              ? "Boosting all colonies"
              : "Accelerating the other colony"
            : "Inactive"
        }</div>
      </div>
    </div>

    <div class="sloth-modal-grid">
      ${SLOTH_COLONIES.map((colony) => renderSlothColonyDetailCard(player, colony)).join("")}
    </div>
  `;
}

function updateSlothEcosystemButton(player) {
  const btn = document.getElementById("slothEcosystemBtn");
  const titleEl = document.getElementById("btn-sloth-title");
  const descEl = document.getElementById("btn-sloth-desc");

  if (!btn || !titleEl || !descEl) return;

  if (!player || !isThreeToedSlothFighter(player)) {
    btn.style.display = "none";
    return;
  }

  const dormant = isSlothDormantInCurrentBiome(player);
  const micro = Boolean(player.slothMicroecosystemActive);
  const activeCount = getSlothActiveColonies(player).length;

  btn.style.display = "block";
  titleEl.textContent = "Living Ecosystem";
  descEl.textContent = micro
    ? "All colonies active. " + (player.slothMicroecosystemTurns || 0) + " turn(s) left."
    : dormant
      ? "Ecosystem in letargo. View blocked colonies."
      : activeCount + "/5 colonies active. Open full colony panel.";
}

function openSlothEcosystemModal() {
  if (currentBattle?.finished) return;

  const player = currentBattle ? getBattleFighters().player : preBattlePreviewPlayer;

  if (!isThreeToedSlothFighter(player)) {
    alert("Only the Three-Toed Sloth has a Living Ecosystem.");
    return;
  }

  renderSlothEcosystemModal(player);

  const modal = document.getElementById("slothEcosystemModal");
  if (modal) modal.style.display = "flex";
}

function closeSlothEcosystemModal() {
  const modal = document.getElementById("slothEcosystemModal");
  if (modal) modal.style.display = "none";
}

const ACTION_INFO = {
  normal: {
    title: "Normal Attack",
    desc: "Balanced attack. Standard damage, normal priority, low stamina cost. Cost 5"
  },
  quick: {
    title: "Quick Attack",
    desc: "Acts before normal attacks thanks to higher priority. Cost 20"
  },
  precise: {
    title: "Precise Attack",
    desc: "Higher accuracy (+20% hit chance) and +10% damage. Cost 20"
  },
  explosive: {
    title: "Explosive Attack",
    desc: "Higher crit pressure (+20% critical chance) and +20% damage. Cost 30"
  },
  concentration: {
    title: "Concentration",
    desc: "Restores 20 Life and 20 Stamina, and grants +10% Defense and Agility for the turn. Cost 0"
  }
};

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
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

function getBiomeRelation(fighter, biome) {
  const animal = animals[fighter.id];
  if (!animal?.biomes) return "Neutral";

  if (animal.biomes.favorable?.includes(biome)) return "Favorable";
  if (animal.biomes.unfavorable?.includes(biome)) return "Unfavorable";
  return "Neutral";
}


function isCoconutOctopusFighter(fighter) {
  return fighter && fighter.id === "coconut-octopus";
}

function getCoconutOctopusFormText(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return "";

  const form = fighter.octopusForm || "base";
  return OCTOPUS_FORM_LABELS[form] || form;
}

function getCoconutOctopusSpecialChoiceText(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return "";

  const choice = fighter.octopusPerfectAdaptationChoice || "tentacle-storm";
  return OCTOPUS_SPECIAL_CHOICE_LABELS[choice] || choice;
}

const OCTOPUS_FORM_ORDER = ["base", "offensive", "defensive", "evasive"];

const OCTOPUS_FORM_SHORT_LABELS = {
  base: "Base",
  offensive: "Off",
  defensive: "Def",
  evasive: "Eva"
};

function getCoconutOctopusFormChargeMax(formId) {
  const form = animals["coconut-octopus"]?.octopusForms?.[formId];
  return form?.special?.chargeHits ?? 0;
}

function getCoconutOctopusFormCharge(fighter, formId) {
  if (!isCoconutOctopusFighter(fighter)) return 0;

  if (fighter.octopusSpecialCharges && typeof fighter.octopusSpecialCharges[formId] === "number") {
    return fighter.octopusSpecialCharges[formId];
  }

  const currentForm = fighter.octopusForm || "base";
  if (currentForm === formId && typeof fighter.specialCharge === "number") {
    return fighter.specialCharge;
  }

  return 0;
}

function getCoconutOctopusCurrentCharge(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return fighter?.specialCharge ?? 0;
  return getCoconutOctopusFormCharge(fighter, fighter.octopusForm || "base");
}

function getCoconutOctopusCurrentChargeMax(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return fighter?.special?.chargeHits ?? 0;
  return getCoconutOctopusFormChargeMax(fighter.octopusForm || "base");
}

function getCoconutOctopusChargeLine(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return "";

  return OCTOPUS_FORM_ORDER.map((formId) => {
    return (
      OCTOPUS_FORM_SHORT_LABELS[formId] +
      " " +
      getCoconutOctopusFormCharge(fighter, formId) +
      "/" +
      getCoconutOctopusFormChargeMax(formId)
    );
  }).join(" · ");
}

function getCoconutOctopusStatusText(fighter) {
  if (!isCoconutOctopusFighter(fighter)) return "";

  const lines = [
    "Form: " + getCoconutOctopusFormText(fighter),
    "Adaptation charges: " + (fighter.octopusAdaptationCharges ?? 0) + "/8",
    "First transformation: " + (fighter.octopusFreeTransformationAvailable ? "FREE" : "USED"),
    "Special charges: " + getCoconutOctopusChargeLine(fighter)
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


function getBattleFighters() {
  if (!currentBattle) return { player: null, enemy: null };

  const player =
    currentBattle.fighterA.id === playerId
      ? currentBattle.fighterA
      : currentBattle.fighterB;

  const enemy =
    player === currentBattle.fighterA
      ? currentBattle.fighterB
      : currentBattle.fighterA;

  return { player, enemy };
}

function percent(current, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
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
    "fennec": ["./images/animals/mammals/fennec.png"],
    "giant-asian-mantis": ["./images/animals/arthropods/asian-giant-mantis.png"],
    "darwins-frog": ["./images/animals/amphibians/darwins-frog.png"],
    "coconut-octopus": ["./images/animals/fish/coconut-octopus.png"],
    "three-toed-sloth": ["./images/animals/mammals/three-toed-sloth.png"],
  };

  return [direct, ...(legacy[id] ?? [])];
}

function loadFighterImage(imgEl, fighterId) {
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

function applyFlipStates() {
  const playerImg = document.getElementById("playerImage");
  const enemyImg = document.getElementById("enemyImage");

  playerImg.classList.toggle("flipped", playerFlipped);
  enemyImg.classList.toggle("flipped", enemyFlipped);
}

function renderEffects(containerId, fighter) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!fighter || !fighter.effects || fighter.effects.length === 0) {
    const pill = document.createElement("div");
    pill.className = "status-pill";
    pill.textContent = "No effects";
    container.appendChild(pill);
    return;
  }

  fighter.effects.forEach((effect) => {
    const pill = document.createElement("div");
    pill.className = "status-pill";
    pill.textContent = `${effect.name} (${effect.duration === 99 ? "∞" : effect.duration})`;
    container.appendChild(pill);
  });
}

function formatStatArrowLine(fighter, statKey, label) {
  const animal = animals[fighter.id];
  const baseValue = animal.stats[statKey];

  const currentValue = ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(statKey)
    ? Math.round(getEffectiveStat(fighter, statKey, currentBattle) * 10) / 10
    : fighter.stats[statKey];

  const roundedBase = Math.round(baseValue * 10) / 10;
  const roundedCurrent = Math.round(currentValue * 10) / 10;

  if (roundedBase === roundedCurrent) {
    return `${label}: ${roundedBase}`;
  }

  const diffPct = Math.round(((roundedCurrent - roundedBase) / roundedBase) * 100);
  return `${label}: ${roundedBase} → ${roundedCurrent} (${diffPct > 0 ? "+" : ""}${diffPct}%)`;
}

function getEffectDurationLines(fighter, battle) {
  const lines = [];

  if (!fighter.effects || fighter.effects.length === 0) {
    return "None";
  }

  fighter.effects.forEach((effect) => {
    const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
    lines.push(`${effect.name}: ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`);
  });

  return lines.join("\n");
}

function getBattlefieldDurationLines(battle, fighter) {
  const lines = [];

  if (!battle?.battleEffects || battle.battleEffects.length === 0) {
    return "None";
  }

  battle.battleEffects.forEach((effect) => {
    const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
    lines.push(`${effect.name}: ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`);
  });

  return lines.join("\n");
}

function getCircadianPhaseText(battle) {
  if (!battle) return "";

  const phaseIndex = Math.floor((battle.turn - 1) / 2) % 2;
  const turnInsidePhase = ((battle.turn - 1) % 2) + 1;
  const turnsLeft = 2 - turnInsidePhase;

  if (phaseIndex === 0) {
    return "☀️ Day — Dawn holds the battlefield. " +
      turnsLeft + " turn" + (turnsLeft === 1 ? "" : "s") +
      " until sunset.";
  }

  return "🌙 Night — The sun has fallen. " +
    turnsLeft + " turn" + (turnsLeft === 1 ? "" : "s") +
    " until sunrise.";
}

function getExtraResourceText(fighter) {
  if (!fighter) return "";

  if (fighter.passive && fighter.passive.id === "circadian-cycle") {
  return getCircadianPhaseText(currentBattle);
}

  if (fighter.passive && fighter.passive.id === "persistent-harassment") {
    return "Loot: " + fighter.macaqueLoot + "\nChain: " + fighter.macaqueHitChain;
  }

  if (fighter.passive && fighter.passive.id === "suffocating-humidity") {
    var quickDone = fighter.iguanaProgress && fighter.iguanaProgress.quick ? "YES" : "NO";
    var preciseDone = fighter.iguanaProgress && fighter.iguanaProgress.precise ? "YES" : "NO";
    var explosiveDone = fighter.iguanaProgress && fighter.iguanaProgress.explosive ? "YES" : "NO";

    var progressCount = 0;
    if (fighter.iguanaProgress && fighter.iguanaProgress.quick) progressCount += 1;
    if (fighter.iguanaProgress && fighter.iguanaProgress.precise) progressCount += 1;
    if (fighter.iguanaProgress && fighter.iguanaProgress.explosive) progressCount += 1;

    var humidityEffect = null;

    if (fighter.effects && fighter.effects.length > 0) {
      for (var i = 0; i < fighter.effects.length; i++) {
        if (fighter.effects[i].id === "humidity") {
          humidityEffect = fighter.effects[i];
          break;
        }
      }
    }

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
    var charges = fighter.matamataStalkCharges || 0;
    var ready = fighter.matamataAmbushReady ? "YES" : "NO";

    return (
      "Immobile Stalk: " +
      charges +
      "/4" +
      "\nAmbush ready: " +
      ready
    );
  }

  if (fighter.passive && fighter.passive.id === "thoths-mirage") {
    var progress = fighter.fennecMirageProgress || {
      quick: false,
      explosive: false,
      concentration: 0
    };

    var quickDone = progress.quick ? "YES" : "NO";
    var explosiveDone = progress.explosive ? "YES" : "NO";
    var concentrationCount = progress.concentration || 0;

    var oasisEffect = null;

    if (currentBattle && currentBattle.battleEffects) {
      for (var i = 0; i < currentBattle.battleEffects.length; i++) {
        if (
          currentBattle.battleEffects[i].id === "oasis" &&
          currentBattle.battleEffects[i].sourceId === fighter.id
        ) {
          oasisEffect = currentBattle.battleEffects[i];
          break;
        }
      }
    }

    var oasisText = "Oasis: INACTIVE";

    if (oasisEffect) {
      oasisText =
        "Oasis: ACTIVE (" +
        oasisEffect.duration +
        " turn" +
        (oasisEffect.duration === 1 ? "" : "s") +
        " left)";
    }

    return (
      "Thoth's Mirage" +
      "\nQuick: " +
      quickDone +
      "  Explosive: " +
      explosiveDone +
      "\nConcentration: " +
      concentrationCount +
      "/2" +
      "\n" +
      oasisText
    );
  }

    if (fighter.passive && fighter.passive.id === "larval-gestation") {
    var larvae = fighter.darwinsLarvae || 0;
    var maxLarvae = fighter.darwinsMaxLarvae || 5;

    return "Larvae: " + larvae + "/" + maxLarvae;
  }

  if (fighter.passive && (
    fighter.passive.id === "cephalopod-adaptation" ||
    fighter.passive.id === "predatory-pressure" ||
    fighter.passive.id === "coconut-shell" ||
    fighter.passive.id === "perfect-camouflage"
  )) {
    return getCoconutOctopusStatusText(fighter);
  }

  if (isThreeToedSlothFighter(fighter)) {
    return getThreeToedSlothStatusText(fighter);
  }

  return "";
}

function formatPreviewTooltip(fighterId) {
  const animal = animals[fighterId];
  if (!animal) return "";

  const passiveText = animal.passive
    ? `${animal.passive.name}\n${animal.passive.description}`
    : "None";

  const specialText = animal.special
    ? `${animal.special.name}\n${animal.special.description}`
    : "None";

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
      <div class="tooltip-text">Life: ${animal.stats.life}
Attack: ${animal.stats.attack}
Defense: ${animal.stats.defense}
Resistance: ${animal.stats.resistance}
Technique: ${animal.stats.technique}
Speed: ${animal.stats.speed}
Agility: ${animal.stats.agility}
Explosiveness: ${animal.stats.explosiveness}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Biomes</div>
      <div class="tooltip-text">Favorable: ${animal.biomes?.favorable?.join(", ") || "none"}
Neutral: ${animal.biomes?.neutral?.join(", ") || "none"}
Unfavorable: ${animal.biomes?.unfavorable?.join(", ") || "none"}</div>
    </div>
  `;
}

function formatTooltip(fighter) {
  if (!fighter) return "";

  if (!currentBattle) {
    return formatPreviewTooltip(fighter.id);
  }

  const animal = animals[fighter.id];

  const passiveText = animal.passive
    ? `${animal.passive.name}\n${animal.passive.description}`
    : "None";

  const specialText = animal.special
    ? `${animal.special.name}\n${animal.special.description}`
    : "None";

  const macaqueExtra =
    fighter.passive?.id === "persistent-harassment"
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Loot</div>
      <div class="tooltip-text">Stored loot: ${fighter.macaqueLoot}\nHit chain: ${fighter.macaqueHitChain}</div>
    </div>
  `
      : "";

  const iguanaExtra =
    fighter.passive?.id === "suffocating-humidity"
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Humidity Progress</div>
      <div class="tooltip-text">Quick hit: ${fighter.iguanaProgress?.quick ? "Yes" : "No"}\nPrecise hit: ${fighter.iguanaProgress?.precise ? "Yes" : "No"}\nExplosive hit: ${fighter.iguanaProgress?.explosive ? "Yes" : "No"}</div>
    </div>
  `
      : "";

  const coconutExtra =
    isCoconutOctopusFighter(fighter)
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Coconut Octopus Adaptation</div>
      <div class="tooltip-text">${getCoconutOctopusStatusText(fighter)}</div>
    </div>
  `
      : "";

  const slothExtra =
    isThreeToedSlothFighter(fighter)
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Living Ecosystem</div>
      <div class="tooltip-text">${getThreeToedSlothStatusText(fighter)}</div>
    </div>
  `
      : "";

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
      <div class="tooltip-text">${formatStatArrowLine(fighter, "life", "Life")}
${formatStatArrowLine(fighter, "attack", "Attack")}
${formatStatArrowLine(fighter, "defense", "Defense")}
${formatStatArrowLine(fighter, "resistance", "Resistance")}
${formatStatArrowLine(fighter, "technique", "Technique")}
${formatStatArrowLine(fighter, "speed", "Speed")}
${formatStatArrowLine(fighter, "agility", "Agility")}
${formatStatArrowLine(fighter, "explosiveness", "Explosiveness")}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Fighter Effects</div>
      <div class="tooltip-text">${getEffectDurationLines(fighter, currentBattle)}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Battlefield Effects</div>
      <div class="tooltip-text">${getBattlefieldDurationLines(currentBattle, fighter)}</div>
    </div>

    ${macaqueExtra}
    ${iguanaExtra}
    ${coconutExtra}
    ${slothExtra}
  `;
}

function renderFighter(prefix, fighter) {
  const hpPct = percent(fighter.hp, fighter.maxHp);
  const staminaPct = percent(fighter.stamina, fighter.maxStamina);

  document.getElementById(`${prefix}Name`).textContent = fighter.name;

  document.getElementById(`${prefix}HpText`).textContent =
    `${fighter.hp}/${fighter.maxHp} (${hpPct}%)`;
  document.getElementById(`${prefix}HpBar`).style.width = `${hpPct}%`;

  document.getElementById(`${prefix}StaminaText`).textContent =
    `${fighter.stamina}/${fighter.maxStamina} (${staminaPct}%)`;
  document.getElementById(`${prefix}StaminaBar`).style.width = `${staminaPct}%`;

  const specialMax = isCoconutOctopusFighter(fighter)
    ? getCoconutOctopusCurrentChargeMax(fighter)
    : fighter.special?.chargeHits ?? 0;
  const specialCharge = isCoconutOctopusFighter(fighter)
    ? getCoconutOctopusCurrentCharge(fighter)
    : fighter.specialCharge ?? 0;
  const specialReady = specialMax > 0 && specialCharge >= specialMax;

  document.getElementById(`${prefix}SpecialText`).textContent =
    specialReady ? "READY" : `${specialCharge}/${specialMax}`;
  document.getElementById(`${prefix}SpecialBar`).style.width =
    `${specialMax > 0 ? percent(specialCharge, specialMax) : 0}%`;

  const extraResourceEl = document.getElementById(`${prefix}ExtraResource`);
  if (extraResourceEl) {
    if (isThreeToedSlothFighter(fighter)) {
      extraResourceEl.innerHTML = renderSlothEcosystemMiniPanel(fighter);
      extraResourceEl.style.display = "block";
    } else {
      const extraResourceText = getExtraResourceText(fighter);

      if (extraResourceText) {
        extraResourceEl.textContent = extraResourceText;
        extraResourceEl.style.display = "block";
      } else {
        extraResourceEl.textContent = "";
        extraResourceEl.style.display = "none";
      }
    }
  }

  renderEffects(`${prefix}Effects`, fighter);
}

function renderTopPanel() {
  if (!currentBattle) return;

  const { player, enemy } = getBattleFighters();

  document.getElementById("turnValue").textContent = currentBattle.turn;
  document.getElementById("biomeValue").textContent = currentBattle.biome?.toUpperCase() ?? "-";
  document.getElementById("biomeStatValue").textContent = currentBattle.biomeStat?.toUpperCase() ?? "-";
  document.getElementById("playerBiomeRelationValue").textContent = getBiomeRelation(player, currentBattle.biome);
  document.getElementById("enemyBiomeRelationValue").textContent = getBiomeRelation(enemy, currentBattle.biome);

  document.getElementById("playerActionValue").textContent = lastPlayerAction;
  document.getElementById("enemyActionValue").textContent = lastEnemyAction;

  const outcomeEl = document.getElementById("turnOutcomeValue");
  if (outcomeEl) {
    outcomeEl.textContent = lastTurnOutcome;
  }

  if (!currentBattle.finished) {
    document.getElementById("resultValue").textContent = "In progress";
  } else if (currentBattle.winner === "draw") {
    document.getElementById("resultValue").textContent = "Draw";
  } else {
    const winner =
      currentBattle.fighterA.id === currentBattle.winner
        ? currentBattle.fighterA.name
        : currentBattle.fighterB.name;
    document.getElementById("resultValue").textContent = winner;
  }
}

function renderSummary() {
  document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
}

async function typeTurnSummary(lines) {
  const token = ++summaryAnimationToken;
  const box = document.getElementById("turnSummaryBox");

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

function renderLog() {
  const logEl = document.getElementById("battleLog");
  if (!currentBattle) {
    logEl.textContent = "";
    return;
  }

  logEl.textContent = currentBattle.log
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  logEl.scrollTop = logEl.scrollHeight;
}

function updateSpecialButton(player) {
  const specialBtn = document.getElementById("specialActionBtn");
  const titleEl = document.getElementById("btn-special-title");
  const descEl = document.getElementById("btn-special-desc");

  if (!specialBtn || !titleEl || !descEl) return;

  if (!player?.special) {
    titleEl.textContent = "Special Attack";
    descEl.textContent = "No special available.";
    specialBtn.classList.remove("special-ready");
    return;
  }

  const needed = isCoconutOctopusFighter(player)
    ? getCoconutOctopusCurrentChargeMax(player)
    : player.special.chargeHits ?? 0;
  const currentCharge = isCoconutOctopusFighter(player)
    ? getCoconutOctopusCurrentCharge(player)
    : player.specialCharge ?? 0;
  const ready = currentCharge >= needed;

  titleEl.textContent = player.special.name;

  if (isCoconutOctopusFighter(player) && (player.octopusForm || "base") === "base") {
    descEl.textContent = ready
      ? "READY. Press to choose Tentacle Storm, Coconut Fortress or Ink Sea."
      : "Choose Tentacle Storm, Coconut Fortress or Ink Sea when ready. Charge: " + currentCharge + "/" + needed + " · " + getCoconutOctopusChargeLine(player);
  } else if (isThreeToedSlothFighter(player)) {
    const dormant = currentBattle && (currentBattle.biome === "arctic" || currentBattle.biome === "desert");
    descEl.textContent = dormant
      ? "Dormant in Arctic/Desert. Microecosystem Ancestral cannot be used here."
      : `${player.special.description} ${ready ? "READY" : `Charge: ${currentCharge}/${needed}`}`;
  } else {
    descEl.textContent = `${player.special.description} ${ready ? "READY" : `Charge: ${currentCharge}/${needed}`}`;
  }

  if (ready) {
    specialBtn.classList.add("special-ready");
  } else {
    specialBtn.classList.remove("special-ready");
  }
}

function updateLarvalCommandButton(player) {
  const larvalBtn = document.getElementById("larvalCommandBtn");
  const titleEl = document.getElementById("btn-larval-title");
  const descEl = document.getElementById("btn-larval-desc");

  if (!larvalBtn || !titleEl || !descEl) return;

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

  return rows
    .map(([label, value]) => `<div class="octopus-preview-stat">${label}<strong>${value}</strong></div>`)
    .join("");
}

function renderCoconutOctopusFormPreview(player) {
  const panel = document.getElementById("octopusFormPreviewPanel");
  const titleEl = document.getElementById("octopusFormPreviewTitle");
  const statsEl = document.getElementById("octopusFormPreviewStats");
  const textEl = document.getElementById("octopusFormPreviewText");
  const confirmBtn = document.getElementById("octopusConfirmFormBtn");

  if (!panel || !titleEl || !statsEl || !textEl || !confirmBtn) return;

  if (!player || player.id !== "coconut-octopus" || !pendingOctopusFormPreview) {
    panel.style.display = "none";
    return;
  }

  const form = getCoconutOctopusFormDefinitionForPreview(pendingOctopusFormPreview);
  if (!form) {
    panel.style.display = "none";
    return;
  }

  const currentForm = player.octopusForm || "base";
  const charges = player.octopusAdaptationCharges ?? 0;
  const isCurrent = pendingOctopusFormPreview === currentForm;
  const canPay = Boolean(player.octopusFreeTransformationAvailable) || charges > 0;
  const blocked =
    !currentBattle ||
    currentBattle.finished ||
    isAnimatingTurn ||
    isWaitingForOpponentAction ||
    isMultiplayer ||
    isCurrent ||
    !canPay;

  panel.style.display = "block";
  titleEl.textContent = form.name + (isCurrent ? " — Current Form" : " — Preview");
  statsEl.innerHTML = getCoconutOctopusPreviewStatsHtml(form);
  textEl.textContent =
    "Passive — " +
    (form.passive?.name || "None") +
    "\n" +
    (form.passive?.description || "No passive.") +
    "\n\nSuper — " +
    (form.special?.name || "None") +
    "\n" +
    "Charge: " +
    getCoconutOctopusFormCharge(player, pendingOctopusFormPreview) +
    "/" +
    getCoconutOctopusFormChargeMax(pendingOctopusFormPreview) +
    "\n" +
    (form.special?.description || "No super.");

  if (!currentBattle) {
    confirmBtn.textContent = "Preview only — start battle to transform";
  } else if (isCurrent) {
    confirmBtn.textContent = "Already in this form";
  } else if (player.octopusFreeTransformationAvailable) {
    confirmBtn.textContent = "Confirm Free Transformation";
  } else {
    confirmBtn.textContent = "Confirm Form Change (-1 charge)";
  }

  confirmBtn.disabled = blocked;
}

function previewPlayerCoconutOctopusForm(formId) {
  const player = currentBattle ? getBattleFighters().player : preBattlePreviewPlayer;

  if (!isCoconutOctopusFighter(player)) return;

  pendingOctopusFormPreview = formId;
  updateCoconutOctopusPanel(player);
}

function clearPlayerCoconutOctopusPreview() {
  pendingOctopusFormPreview = null;
  const player = currentBattle ? getBattleFighters().player : preBattlePreviewPlayer;
  updateCoconutOctopusPanel(player);
}

function updateCoconutOctopusPanel(player) {
  const panel = document.getElementById("octopusAdaptationPanel");
  const statusEl = document.getElementById("octopusAdaptationStatus");

  if (!panel || !statusEl) return;

  if (!player || player.id !== "coconut-octopus") {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";

  const form = player.octopusForm || "base";
  const charges = player.octopusAdaptationCharges ?? 0;
  const freeText = player.octopusFreeTransformationAvailable ? " · first transformation free" : "";

  statusEl.textContent =
    getCoconutOctopusFormText(player) +
    " · adaptation " +
    charges +
    "/8" +
    freeText +
    "\nSpecial charges: " +
    getCoconutOctopusChargeLine(player);

  if (pendingOctopusFormPreview && !getCoconutOctopusFormDefinitionForPreview(pendingOctopusFormPreview)) {
    pendingOctopusFormPreview = null;
  }

  document.querySelectorAll(".octopus-form-btn").forEach((btn) => {
    const targetForm = btn.dataset.octopusForm;
    const isCurrent = targetForm === form;
    const isPreview = targetForm === pendingOctopusFormPreview;

    btn.classList.toggle("active", isCurrent);
    btn.classList.toggle("preview", isPreview && !isCurrent);

    btn.disabled = currentBattle ? currentBattle.finished : false;
  });

  renderCoconutOctopusFormPreview(player);
}

function transformPlayerCoconutOctopus(formId) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return;

  if (isMultiplayer) {
    alert("Coconut Octopus transformations are not synced in multiplayer yet. Use Single Battle for this first test.");
    return;
  }

  const { player } = getBattleFighters();

  if (!isCoconutOctopusFighter(player)) return;

  const result = transformCoconutOctopus(player, formId, currentBattle);

  if (result.ok) {
    pendingOctopusFormPreview = null;
  }

  lastTurnOutcome = result.ok ? "Adaptation" : "Adaptation Failed";
  lastTurnSummaryLines = [result.message];

  renderBattle();
}

function playerNeedsPerfectAdaptationChoice(action) {
  if (action !== "special") return false;
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return false;

  const { player } = getBattleFighters();

  return isCoconutOctopusFighter(player) && (player.octopusForm || "base") === "base";
}

function openCoconutOctopusPerfectAdaptationModal() {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return;

  const { player } = getBattleFighters();

  if (!isCoconutOctopusFighter(player) || (player.octopusForm || "base") !== "base") {
    return;
  }

  const modal = document.getElementById("octopusPerfectAdaptationModal");
  if (!modal) return;

  modal.style.display = "flex";
}

function closeCoconutOctopusPerfectAdaptationModal() {
  const modal = document.getElementById("octopusPerfectAdaptationModal");
  if (!modal) return;

  modal.style.display = "none";
}

async function chooseCoconutOctopusPerfectAdaptationAndAttack(choice) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return;

  const { player } = getBattleFighters();

  if (!isCoconutOctopusFighter(player)) return;
  if ((player.octopusForm || "base") !== "base") return;

  const ok = setCoconutOctopusPerfectAdaptationChoice(player, choice);
  if (!ok) return;

  closeCoconutOctopusPerfectAdaptationModal();
  await playTurn("special");
}


function updateStaticActionButtons() {
  document.getElementById("btn-normal-title").textContent = ACTION_INFO.normal.title;
  document.getElementById("btn-normal-desc").textContent = ACTION_INFO.normal.desc;

  document.getElementById("btn-quick-title").textContent = ACTION_INFO.quick.title;
  document.getElementById("btn-quick-desc").textContent = ACTION_INFO.quick.desc;

  document.getElementById("btn-precise-title").textContent = ACTION_INFO.precise.title;
  document.getElementById("btn-precise-desc").textContent = ACTION_INFO.precise.desc;

  document.getElementById("btn-explosive-title").textContent = ACTION_INFO.explosive.title;
  document.getElementById("btn-explosive-desc").textContent = ACTION_INFO.explosive.desc;

  document.getElementById("btn-concentration-title").textContent = ACTION_INFO.concentration.title;
  document.getElementById("btn-concentration-desc").textContent = ACTION_INFO.concentration.desc;
}

function updateActionButtons() {
  const { player } = getBattleFighters();
  const buttons = document.querySelectorAll(".action-btn");

  if (!currentBattle) {
    const previewPlayer = preBattlePreviewPlayer;

    buttons.forEach((btn) => {
      const action = btn.dataset.action;

      if (btn.id === "slothEcosystemBtn") {
        btn.disabled = !isThreeToedSlothFighter(previewPlayer);
        return;
      }

      if (action === "larval-command") {
        btn.disabled = !(previewPlayer?.passive?.id === "larval-gestation");
        return;
      }

      btn.disabled = true;
    });

    document.querySelectorAll(".octopus-form-btn").forEach((btn) => {
      btn.disabled = !isCoconutOctopusFighter(previewPlayer);
    });

    return;
  }

  if (
    !player ||
    currentBattle.finished ||
    isAnimatingTurn ||
    isWaitingForOpponentAction
  ) {
    buttons.forEach((btn) => (btn.disabled = true));
    document.querySelectorAll(".octopus-form-btn").forEach((btn) => (btn.disabled = true));
    return;
  }

  buttons.forEach((btn) => {
    const action = btn.dataset.action;

    if (btn.id === "slothEcosystemBtn") {
      btn.disabled = !isThreeToedSlothFighter(player);
      return;
    }

    if (action === "larval-command") {
      const larvae = player.darwinsLarvae || 0;
      btn.disabled = !(player.passive?.id === "larval-gestation" && larvae > 0);
      return;
    }

    btn.disabled = !canUseAction(player, action, currentBattle);
  });
}

function renderBattle() {
  if (!currentBattle) return;

  const { player, enemy } = getBattleFighters();

  renderTopPanel();
  renderFighter("player", player);
  renderFighter("enemy", enemy);
  renderSummary();
  renderLog();

  updateStaticActionButtons();
  updateSpecialButton(player);

  if (typeof updateLarvalCommandButton === "function") {
    updateLarvalCommandButton(player);
  }

  updateSlothEcosystemButton(player);
  updateCoconutOctopusPanel(player);

  updateActionButtons();

  document.getElementById("playerTooltip").innerHTML = formatTooltip(player);
  document.getElementById("enemyTooltip").innerHTML = formatTooltip(enemy);

  const endMessage = document.getElementById("endMessage");
  if (!currentBattle.finished) {
    endMessage.textContent = "";
    return;
  }

  if (currentBattle.winner === "draw") {
    endMessage.textContent = "The battle ends in a draw.";
    return;
  }

  const winnerName =
    currentBattle.fighterA.id === currentBattle.winner
      ? currentBattle.fighterA.name
      : currentBattle.fighterB.name;

  endMessage.textContent = `${winnerName} wins the battle.`;
}

function chooseEnemyAction(fighter) {
  const decision = chooseAndApplyAIAction(currentBattle, fighter);
  return decision.action;
}

function buildTurnSummary(newLines) {
  const filtered = [];
  const summary = [];

  const fightersWhoUsedSpecial = new Set();

  for (const line of newLines) {
    if (line.includes("gains effect: Neurotoxic Injection")) continue;
    if (line.includes("calc →")) continue;
    if (line.startsWith("Damage calc")) continue;
    if (line.startsWith("Critical calc")) continue;
    if (line.includes("→ HP:")) continue;
    if (line.startsWith("--- Turn")) continue;

    filtered.push(line);

    const specialUseMatch =
      line.match(/^(.+?) uses Lethal Bite\b/) ||
      line.match(/^(.+?) uses Arctic Storm\b/) ||
      line.match(/^(.+?) uses Illusory Dance\b/) ||
      line.match(/^(.+?) uses Ballistic Strike\b/) ||
      line.match(/^(.+?) uses Dung Throw\b/) ||
      line.match(/^(.+?) uses Death Roll\b/) ||
      line.match(/^(.+?) uses Total Regeneration\b/) ||
      line.match(/^(.+?) uses Nervous Disruption\b/) ||
      line.match(/^(.+?) uses Deadly Dive\b/) ||
      line.match(/^(.+?) uses Phantom Current\b/) ||
      line.match(/^(.+?) uses Looting Burst\b/) ||
      line.match(/^(.+?) uses Refresh\b/) ||
      line.match(/^(.+?) uses Mutilation\b/) ||
      line.match(/^(.+?) uses Anubis' Staff\b/) ||
      line.match(/^(.+?) uses Ancestral Retreat\b/) ||
      line.match(/^(.+?) uses Darwinian Expulsion\b/) ||
      line.match(/^(.+?) uses Perfect Adaptation\b/) ||
      line.match(/^(.+?) uses Tentacle Storm\b/) ||
      line.match(/^(.+?) uses Coconut Fortress\b/) ||
      line.match(/^(.+?) uses Ink Sea\b/) ||
      line.match(/^(.+?) uses Neurotoxic Injection \(Tetrodotoxin\)\b/) ||
      line.match(/^(.+?) uses Overinflation\b/) ||
      line.match(/^(.+?) explodes\b/);

    if (specialUseMatch) {
      fightersWhoUsedSpecial.add(specialUseMatch[1]);
    }
  }

  for (const line of filtered) {
    if (
      line.includes("Honey Badger has fallen below") &&
      line.includes("fatigue")
    ) {
      summary.push(
        "Honey Badger enters Savage Endurance: fatigue has no effect."
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

    const cannotUseSpecialMatch = line.match(/^(.+?) cannot use Special Attack\.$/);

    if (cannotUseSpecialMatch) {
      const fighterName = cannotUseSpecialMatch[1];

      if (fightersWhoUsedSpecial.has(fighterName)) {
        continue;
      }
    }

    const important =
      line.includes("BIOME SHIFT") ||
      line.includes("Biome changed") ||
      line.includes("Modified stat") ||
      line.includes(" uses ") ||
      line.includes(" hits ") ||
      line.includes("(CRITICAL)") ||
      line.includes("misses") ||
      line.includes("gains effect") ||
      line.includes("reduces") ||
      line.includes("Battle effect activated") ||
      line.includes("Battle effect expired") ||
      line.includes("suffers") ||
      line.includes("restores") ||
      line.includes("has expired") ||
      line.includes("Special Attack is ready") ||
      line.includes("has been defeated") ||
      line.includes("tries to hit") ||
      line.includes("Overinflation") ||
      line.includes("takes 25 damage") ||
      line.includes("spines") ||
      line.includes("Illusory Dance") ||
      line.includes("Hail begins") ||
      line.includes("cannot use") ||
      line.includes("Inverted Inertia") ||
      line.includes("counterattacks") ||
      line.includes("Momentum rises") ||
      line.includes("Momentum resets") ||
      line.includes("Hunting Inertia rises") ||
      line.includes("Hunting Inertia grants") ||
      line.includes("Hunting Inertia resets") ||
      line.includes("Marine Echo triggers") ||
      line.includes("Phantom Current") ||
      line.includes("Persistent Harassment") ||
      line.includes("steals") ||
      line.includes("stores loot") ||
      line.includes("Looting Burst") ||
      line.includes("fulfills Humidity requirement") ||
      line.includes("activates Suffocating Humidity") ||
      line.includes("Suffocating Humidity restores") ||
      line.includes("Refresh") ||
      line.includes("Mutilation") ||
      line.includes("Neurotoxic Injection (Tetrodotoxin)") ||
      line.includes("Tetrodotoxin") ||
      line.includes("explodes") ||
      line.includes("Immobile Stalk") ||
      line.includes("Ancestral Retreat") ||
      line.includes("Thoth's Mirage") ||
      line.includes("Oasis") ||
      line.includes("Anubis' Staff") ||
      line.includes("hit chance is capped") ||
      line.includes("burning oasis") ||
      line.includes("desert answers the mirage") ||
      line.includes("empty heat") ||
      line.includes("attack finds only mirage") ||
      line.includes("swallows the strike") ||
      line.includes("shimmering air") ||
      line.includes("strikes an illusion") ||
      line.includes("false image") ||
      line.includes("real Fennec is already gone") ||
      line.includes("The Oasis bends the horizon") ||
      line.includes("Heat distortion deceives the senses") ||
      line.includes("Decapitation") ||
      line.includes("Raptorial Chain") ||
      line.includes("Raptorial Defense Down") ||
      line.includes("severed head") ||
      line.includes("raptorial blades") ||
      line.includes("reflects") ||

      // Darwin's Frog / Larval system
      line.includes("Darwinian Expulsion") ||
      line.includes("Larval Command") ||
      line.includes("commands its larvae") ||
      line.includes("Larval Sacrifice") ||
      line.includes("Larval Defense") ||
      line.includes("Larval Attack") ||
      line.includes("conserves") && line.includes("larva") ||
      line.includes("larvae") ||
      line.includes("larva") ||
      line.includes("overflowing larva") ||
      line.includes("maximum larvae") ||
      line.includes("blocks all the incoming direct damage") ||
      line.includes("blocks half of the incoming direct damage") ||
      line.includes("blocks secondary effects and status changes") ||
      line.includes("fails to apply") ||
      line.includes("fails to reduce") ||
      line.includes("fails to take control") ||
      line.includes("fails to open") ||
      line.includes("fails to drain") ||
      line.includes("Tetrodotoxin effects");

    if (important) {
      summary.push(line);
    }
  }

  return summary.length > 0 ? summary : ["No major events this turn."];
}

function deriveTurnOutcome(summaryLines) {
  const joined = summaryLines.join(" ");

  if (joined.includes("has been defeated")) return "Defeat";
  if (joined.includes("(CRITICAL)")) return "Critical Hit";
  if (joined.includes("Perfect Adaptation")) return "Special Triggered";
  if (joined.includes("Tentacle Storm")) return "Special Triggered";
  if (joined.includes("Coconut Fortress")) return "Special Triggered";
  if (joined.includes("Ink Sea")) return "Special Triggered";
  if (joined.includes("Predatory Pressure")) return "Passive Triggered";
  if (joined.includes("Perfect Camouflage")) return "Passive Triggered";
  if (joined.includes("Microecosystem Ancestral")) return "Special Triggered";
  if (joined.includes("Ancestral Explosive Strike")) return "Special Triggered";
  if (joined.includes("Colony")) return "Passive Triggered";
  if (joined.includes("Mutilation")) return "Special Triggered";
  if (joined.includes("Neurotoxic Injection (Tetrodotoxin)")) return "Special Triggered";
  if (joined.includes("Overinflation")) return "Special Triggered";
  if (joined.includes("explodes")) return "Special Triggered";
  if (joined.includes("Refresh")) return "Special Triggered";
  if (joined.includes("Looting Burst")) return "Special Triggered";
  if (joined.includes("Phantom Current")) return "Special Triggered";
  if (joined.includes("Deadly Dive")) return "Special Triggered";
  if (joined.includes("Nervous Disruption")) return "Special Triggered";
  if (joined.includes("Total Regeneration")) return "Special Triggered";
  if (joined.includes("Death Roll")) return "Special Triggered";
  if (joined.includes("Ancestral Retreat")) return "Special Triggered";
  if (joined.includes("Anubis' Staff")) return "Special Triggered";
  if (joined.includes("Thoth's Mirage")) return "Passive Triggered";
  if (joined.includes("Oasis")) return "Oasis Active";
  if (joined.includes("Dung Throw")) return "Special Triggered";
  if (joined.includes("Ballistic Strike")) return "Special Triggered";
  if (joined.includes("Illusory Dance")) return "Special Triggered";
  if (joined.includes("Arctic Storm")) return "Special Triggered";
  if (joined.includes("Lethal Bite")) return "Special Triggered";
  if (joined.includes("Inmobile Stalk")) return "Passive Triggered";
  if (joined.includes("misses")) return "Miss";
  if (joined.includes("Battle effect activated")) return "Battlefield Changed";
  if (joined.includes("restores 20 Life and 20 Stamina")) return "Concentration";
  if (joined.includes("gains effect")) return "Effect Applied";
  if (joined.includes("suffers")) return "Damage / Effect Tick";
  if (joined.includes("activates Suffocating Humidity")) return "Humidity Activated";
  if (joined.includes("cannot use")) return "Action Blocked";
  if (joined.includes("Decapitation")) return "Execution";
  if (joined.includes("Raptorial Chain")) return "Special Triggered"; 

  return "Resolved";
}

function clearAnimationClasses() {
  const playerWrap = document.getElementById("playerImageWrap");
  const enemyWrap = document.getElementById("enemyImageWrap");

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShakeSequence(newLines, player, enemy) {
  clearAnimationClasses();

  const playerWrap = document.getElementById("playerImageWrap");
  const enemyWrap = document.getElementById("enemyImageWrap");

  const events = [];

  for (const line of newLines) {
    let match;

    match = line.match(/^(.+?) uses (.+?) but misses (.+?)\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: false,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) hits (.+?) with (.+?) for (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[2],
        hit: true,
        critical: Boolean(match[5])
      });
      continue;
    }

    match = line.match(/^(.+?) uses Lethal Bite, dealing (\d+) damage, ignoring 50% Defense and applying Bleed\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Ballistic Strike and deals (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: Boolean(match[3])
      });
      continue;
    }

    match = line.match(/^(.+?) uses Ballistic Strike but misses\./);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: false,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Looting Burst, consuming (\d+) loot to deal (\d+) damage\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) strikes from Phantom Current for (\d+) damage\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Refresh, restoring (\d+) HP and (\d+) Stamina, and reducing (.+?)'s Technique and Agility by 20% for 1 turn\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[4],
        hit: false,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Mutilation, dealing (\d+) damage and applying Mutilation to (.+?)\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Neurotoxic Injection \(Tetrodotoxin\), dealing (\d+) damage, reducing (.+?)'s Agility, Technique and Speed by 25% for 1 turn, and applying 30 fixed damage over time\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) explodes, dealing (\d+) damage to (.+?) and dropping to 1 HP\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: true,
        critical: false
      });
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

function startBattle() {
  const playerSelect = document.getElementById("playerFighter");
  const enemySelect = document.getElementById("enemyFighter");

  playerId = playerSelect.value;
  enemyId = enemySelect.value;

  if (playerId === enemyId && !isMultiplayer) {
    alert("Choose two different fighters.");
    return;
  }

  summaryAnimationToken += 1;
  isAnimatingTurn = false;
  isWaitingForOpponentAction = false;
  pendingOctopusFormPreview = null;

  if (isMultiplayer) {
    if (!multiplayerRoomCode || !socket) {
      alert("Create or join a room first.");
      return;
    }

    lastPlayerAction = "-";
    lastEnemyAction = "-";
    lastTurnOutcome = "Waiting";
    lastTurnSummaryLines = ["Fighter selected. Waiting for opponent..."];

    socket.emit("selectFighter", {
      roomCode: multiplayerRoomCode,
      fighterId: playerId
    });

    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
    updateActionButtons();
    return;
  }

  preBattlePreviewPlayer = null;
  currentBattle = createBattle(playerId, enemyId);

  playerFlipped = false;
  enemyFlipped = true;

  loadFighterImage(document.getElementById("playerImage"), playerId);
  loadFighterImage(document.getElementById("enemyImage"), enemyId);
  applyFlipStates();

  lastPlayerAction = "-";
  lastEnemyAction = "-";
  lastTurnOutcome = "-";
  lastTurnSummaryLines = ["Battle started. Choose your first action."];

  renderBattle();
}

function createPreviewFighterState(fighterId) {
  const animal = animals[fighterId];
  if (!animal) return null;

  const maxHp = animal.stats.life * 10;
  const maxStamina = animal.stats.resistance * 4;

  return {
    id: animal.id,
    name: animal.name,
    category: animal.category,
    hp: maxHp,
    maxHp,
    stamina: maxStamina,
    maxStamina,
    stats: { ...animal.stats },
    biomes: animal.biomes ? { ...animal.biomes } : null,
    passive: animal.passive ?? null,
    special: animal.special ?? null,
    effects: [],
    alive: true,
    specialCharge: 0,

    darwinsLarvae: animal.id === "darwins-frog" ? 0 : 0,
    darwinsMaxLarvae: animal.id === "darwins-frog" ? 5 : 5,

    octopusForm: animal.id === "coconut-octopus" ? "base" : null,
    octopusAdaptationCharges: animal.id === "coconut-octopus" ? 8 : 0,
    octopusFreeTransformationAvailable: animal.id === "coconut-octopus",
    octopusPredatoryPressureStacks: 0,
    octopusPerfectAdaptationChoice: "tentacle-storm",
    octopusSpecialCharges: animal.id === "coconut-octopus"
      ? { base: 0, offensive: 0, defensive: 0, evasive: 0 }
      : null,
    octopusSpecialReadyAnnounced: animal.id === "coconut-octopus"
      ? { base: false, offensive: false, defensive: false, evasive: false }
      : null,
    coconutFortressActive: false,

    slothPreviewMode: animal.id === "three-toed-sloth",
    slothActiveColonies: animal.id === "three-toed-sloth" ? SLOTH_COLONIES.map((colony) => colony.id) : null,
    slothBacterialChain: 0,
    slothMicroecosystemActive: false,
    slothMicroecosystemTurns: 0
  };
}

function renderFighterPreview(prefix, fighterId) {
  const animal = animals[fighterId];
  if (!animal) return;

  const previewFighter = createPreviewFighterState(fighterId);

  document.getElementById(`${prefix}Name`).textContent = animal.name;

  const maxHp = animal.stats.life * 10;
  const maxStamina = animal.stats.resistance * 4;
  const specialMax = animal.special?.chargeHits ?? 0;

  document.getElementById(`${prefix}HpText`).textContent = `${maxHp}/${maxHp} (100%)`;
  document.getElementById(`${prefix}HpBar`).style.width = "100%";

  document.getElementById(`${prefix}StaminaText`).textContent = `${maxStamina}/${maxStamina} (100%)`;
  document.getElementById(`${prefix}StaminaBar`).style.width = "100%";

  document.getElementById(`${prefix}SpecialText`).textContent = `0/${specialMax}`;
  document.getElementById(`${prefix}SpecialBar`).style.width = "0%";

  loadFighterImage(document.getElementById(`${prefix}Image`), fighterId);

  const extraResourceEl = document.getElementById(`${prefix}ExtraResource`);
  if (extraResourceEl) {
    if (previewFighter && isThreeToedSlothFighter(previewFighter)) {
      extraResourceEl.innerHTML = renderSlothEcosystemMiniPanel(previewFighter);
      extraResourceEl.style.display = "block";
    } else {
      const extraResourceText = previewFighter ? getExtraResourceText(previewFighter) : "";

      if (extraResourceText) {
        extraResourceEl.textContent = extraResourceText;
        extraResourceEl.style.display = "block";
      } else {
        extraResourceEl.textContent = "";
        extraResourceEl.style.display = "none";
      }
    }
  }

  const effectsEl = document.getElementById(`${prefix}Effects`);
  effectsEl.innerHTML = "";

  const favorable = animal.biomes?.favorable?.join(", ") || "None";
  const neutral = animal.biomes?.neutral?.join(", ") || "None";
  const unfavorable = animal.biomes?.unfavorable?.join(", ") || "None";

  const biomePill = document.createElement("div");
  biomePill.className = "status-pill";
  biomePill.textContent = `Fav: ${favorable} | Neu: ${neutral} | Weak: ${unfavorable}`;
  effectsEl.appendChild(biomePill);

  const tooltipEl = document.getElementById(`${prefix}Tooltip`);
  if (tooltipEl) {
    tooltipEl.innerHTML = formatPreviewTooltip(fighterId);
  }
}

function renderSelectionPreview() {
  if (currentBattle) return;

  const playerSelect = document.getElementById("playerFighter");
  const enemySelect = document.getElementById("enemyFighter");

  playerId = playerSelect.value;
  enemyId = enemySelect.value;

  const previewPlayer = createPreviewFighterState(playerId);
  const previewEnemy = createPreviewFighterState(enemyId);
  preBattlePreviewPlayer = previewPlayer;

  renderFighterPreview("player", playerId);
  renderFighterPreview("enemy", enemyId);

  playerFlipped = false;
  enemyFlipped = true;
  applyFlipStates();

  const playerAnimal = animals[playerId];
  const enemyAnimal = animals[enemyId];

  lastPlayerAction = "-";
  lastEnemyAction = "-";
  lastTurnOutcome = "Waiting";

  document.getElementById("turnValue").textContent = "-";
  document.getElementById("biomeValue").textContent = "-";
  document.getElementById("biomeStatValue").textContent = "-";
  document.getElementById("playerBiomeRelationValue").textContent = "-";
  document.getElementById("enemyBiomeRelationValue").textContent = "-";
  document.getElementById("playerActionValue").textContent = "-";
  document.getElementById("enemyActionValue").textContent = "-";
  document.getElementById("resultValue").textContent = "Waiting";

  lastTurnSummaryLines = [
    "PRE-BATTLE INFO",
    "",
    `${playerAnimal.name}`,
    `Life: ${playerAnimal.stats.life} | Attack: ${playerAnimal.stats.attack} | Defense: ${playerAnimal.stats.defense} | Resistance: ${playerAnimal.stats.resistance}`,
    `Technique: ${playerAnimal.stats.technique} | Speed: ${playerAnimal.stats.speed} | Agility: ${playerAnimal.stats.agility} | Explosiveness: ${playerAnimal.stats.explosiveness}`,
    `Passive: ${playerAnimal.passive?.name ?? "None"} — ${playerAnimal.passive?.description ?? "No passive."}`,
    `Special: ${playerAnimal.special?.name ?? "None"} — ${playerAnimal.special?.description ?? "No special."}`,
    `Biomes: favorable ${playerAnimal.biomes?.favorable?.join(", ") || "none"} | neutral ${playerAnimal.biomes?.neutral?.join(", ") || "none"} | unfavorable ${playerAnimal.biomes?.unfavorable?.join(", ") || "none"}`,
    "",
    `${enemyAnimal.name}`,
    `Life: ${enemyAnimal.stats.life} | Attack: ${enemyAnimal.stats.attack} | Defense: ${enemyAnimal.stats.defense} | Resistance: ${enemyAnimal.stats.resistance}`,
    `Technique: ${enemyAnimal.stats.technique} | Speed: ${enemyAnimal.stats.speed} | Agility: ${enemyAnimal.stats.agility} | Explosiveness: ${enemyAnimal.stats.explosiveness}`,
    `Passive: ${enemyAnimal.passive?.name ?? "None"} — ${enemyAnimal.passive?.description ?? "No passive."}`,
    `Special: ${enemyAnimal.special?.name ?? "None"} — ${enemyAnimal.special?.description ?? "No special."}`,
    `Biomes: favorable ${enemyAnimal.biomes?.favorable?.join(", ") || "none"} | neutral ${enemyAnimal.biomes?.neutral?.join(", ") || "none"} | unfavorable ${enemyAnimal.biomes?.unfavorable?.join(", ") || "none"}`
  ];

  updateSpecialButton(previewPlayer || {
    special: playerAnimal.special,
    specialCharge: 0
  });

  updateLarvalCommandButton(previewPlayer);
  updateSlothEcosystemButton(previewPlayer);
  updateCoconutOctopusPanel(previewPlayer);
  updateActionButtons();

  const slothBtn = document.getElementById("slothEcosystemBtn");
  if (slothBtn && isThreeToedSlothFighter(previewPlayer)) {
    slothBtn.disabled = false;
  }

  renderSummary();
}

async function resolveLocalTurn(playerAction) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn) return;

  isAnimatingTurn = true;

  try {
    const { player, enemy } = getBattleFighters();
    const enemyAction = chooseEnemyAction(enemy);
    const oldLogLength = currentBattle.log.length;

    lastPlayerAction = prettyActionLabel(playerAction, player);
    lastEnemyAction = prettyActionLabel(enemyAction, enemy);

    if (currentBattle.fighterA.id === player.id) {
      resolveTurn(currentBattle, playerAction, enemyAction);
    } else {
      resolveTurn(currentBattle, enemyAction, playerAction);
    }

    const newLines = currentBattle.log.slice(oldLogLength);
    const summaryLines = buildTurnSummary(newLines);

    lastTurnSummaryLines = [""];
    lastTurnOutcome = deriveTurnOutcome(summaryLines);

    renderBattle();

    await runShakeSequence(newLines, player, enemy);
    await typeTurnSummary(summaryLines);

    lastTurnSummaryLines = summaryLines;
  } catch (error) {
    console.error("Turn resolution failed:", error);

    lastTurnSummaryLines = [
      "Turn resolution failed. Check the console for the exact error."
    ];

    lastTurnOutcome = "Error";
  } finally {
    isAnimatingTurn = false;
    renderBattle();
  }
}

async function resolveMultiplayerTurnFromServer(data) {
  if (!currentBattle || isAnimatingTurn) return;

  isAnimatingTurn = true;
  isWaitingForOpponentAction = false;

  currentBattle = data.battle;

  const ownAction =
    multiplayerPlayerSocketId === data.player1 ? data.action1 : data.action2;

  const opponentAction =
    multiplayerPlayerSocketId === data.player1 ? data.action2 : data.action1;

  const { player, enemy } = getBattleFighters();

  lastPlayerAction = prettyActionLabel(ownAction, player);
  lastEnemyAction = prettyActionLabel(opponentAction, enemy);

  const newLines = data.newLines || [];
  const summaryLines = buildTurnSummary(newLines);

  lastTurnSummaryLines = [""];
  lastTurnOutcome = deriveTurnOutcome(summaryLines);

  renderBattle();

  await runShakeSequence(newLines, player, enemy);
  await typeTurnSummary(summaryLines);

  lastTurnSummaryLines = summaryLines;
  isAnimatingTurn = false;

  renderBattle();
}

let larvalDraftCommand = {
  attack: 0,
  defense: 0,
  sacrifice: 0
};

let larvalPreviewMode = false;

function getLarvalDraftTotal() {
  return (
    larvalDraftCommand.attack +
    larvalDraftCommand.defense +
    larvalDraftCommand.sacrifice
  );
}

function getCurrentPlayerLarvae() {
  if (!currentBattle) {
    return preBattlePreviewPlayer?.passive?.id === "larval-gestation"
      ? preBattlePreviewPlayer.darwinsMaxLarvae || 5
      : 0;
  }

  const { player } = getBattleFighters();

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

  const clearBtn = document.getElementById("larvalClearBtn");
  const confirmBtn = document.getElementById("larvalConfirmBtn");

  if (larvalPreviewMode) {
    document.getElementById("larvalAvailableText").textContent =
      "Preview: larvae can be assigned once they exist in battle. Simulate up to " + larvae + "/5.";
    if (clearBtn) clearBtn.textContent = "Reset Preview";
    if (confirmBtn) {
      confirmBtn.textContent = "Preview only";
      confirmBtn.disabled = true;
    }
  } else {
    if (clearBtn) clearBtn.textContent = "Clear";
    if (confirmBtn) {
      confirmBtn.textContent = "Confirm Command";
      confirmBtn.disabled = false;
    }
  }
}

async function openLarvalCommandPrompt() {
  if (currentBattle && (currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction)) return;

  const player = currentBattle ? getBattleFighters().player : preBattlePreviewPlayer;

  if (!player || player.passive?.id !== "larval-gestation") {
    alert("Only Darwin's Frog can command larvae.");
    return;
  }

  if (!currentBattle) {
    larvalPreviewMode = true;
    larvalDraftCommand = {
      attack: 0,
      defense: 0,
      sacrifice: 0
    };

    const modal = document.getElementById("larvalCommandModal");
    modal.style.display = "flex";
    renderLarvalCommandModal();
    return;
  }

  larvalPreviewMode = false;

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

  const modal = document.getElementById("larvalCommandModal");
  modal.style.display = "flex";

  renderLarvalCommandModal();
}

function closeLarvalCommandModal() {
  const modal = document.getElementById("larvalCommandModal");
  modal.style.display = "none";
  larvalPreviewMode = false;
}

function adjustLarvalDraft(type, delta) {
  const larvae = getCurrentPlayerLarvae();
  const currentValue = larvalDraftCommand[type] || 0;

  if (delta > 0 && getLarvalDraftTotal() >= larvae) {
    return;
  }

  if (type === "defense" && delta > 0 && currentValue >= 2) {
    return;
  }

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

function confirmLarvalCommandModal() {
  if (larvalPreviewMode) return;
  if (!currentBattle || currentBattle.finished) return;

  const { player } = getBattleFighters();
  const larvae = player.darwinsLarvae || 0;
  const totalUsed = getLarvalDraftTotal();

  if (totalUsed > larvae) {
    alert("You assigned more larvae than available.");
    return;
  }

  if (totalUsed <= 0) {
    player.darwinsLarvalCommand = null;

    lastTurnOutcome = "Larvae Conserved";
    lastTurnSummaryLines = [
      "Larval Command cleared.",
      "All larvae will be conserved.",
      "Choose a main action to resolve the turn."
    ];

    closeLarvalCommandModal();
    renderBattle();
    return;
  }

  player.darwinsLarvalCommand = {
    attack: larvalDraftCommand.attack,
    defense: larvalDraftCommand.defense,
    sacrifice: larvalDraftCommand.sacrifice
  };

  const conserved = larvae - totalUsed;

  lastTurnOutcome = "Larvae Prepared";
  lastTurnSummaryLines = [
    "Larval Command prepared.",
    "Attack larvae: " + larvalDraftCommand.attack,
    "Defense larvae: " + larvalDraftCommand.defense,
    "Sacrifice larvae: " + larvalDraftCommand.sacrifice,
    "Conserved larvae: " + conserved,
    "Choose a main action to resolve the turn."
  ];

  closeLarvalCommandModal();
  renderBattle();
}

async function playTurn(playerAction) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return;

  if (isMultiplayer) {
    if (!socket || !multiplayerRoomCode) return;

    const { player } = getBattleFighters();

    lastPlayerAction = prettyActionLabel(playerAction, player);
    lastEnemyAction = "Waiting...";
    lastTurnOutcome = "Waiting";
    lastTurnSummaryLines = ["Action selected. Waiting for opponent..."];

    isWaitingForOpponentAction = true;

    renderBattle();

    socket.emit("playerAction", {
      roomCode: multiplayerRoomCode,
      action: playerAction
    });

    return;
  }

  await resolveLocalTurn(playerAction);
}

function initFlipButtons() {
  document.getElementById("playerFlipBtn").addEventListener("click", () => {
    playerFlipped = !playerFlipped;
    applyFlipStates();
  });

  document.getElementById("enemyFlipBtn").addEventListener("click", () => {
    enemyFlipped = !enemyFlipped;
    applyFlipStates();
  });
}

function setupMultiplayer() {
  if (typeof io === "undefined") {
    return;
  }

  socket = io();

  socket.on("connect", () => {
    multiplayerPlayerSocketId = socket.id;
  });

  window.createRoom = function () {
    socket.emit("createRoom");
  };

  window.joinRoom = function () {
    const input = document.getElementById("roomInput");
    const code = input ? input.value.trim() : "";

    if (!code) {
      alert("Enter a room code.");
      return;
    }

    socket.emit("joinRoom", code);
  };

  socket.on("roomCreated", (data) => {
    multiplayerRoomCode = data.roomCode;
    multiplayerPlayerNumber = data.playerNumber;
    isMultiplayer = true;

    alert("Sala creada: " + multiplayerRoomCode);

    lastTurnSummaryLines = [`Room created: ${multiplayerRoomCode}. Waiting for opponent...`];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("roomJoined", (data) => {
    multiplayerRoomCode = data.roomCode;
    multiplayerPlayerNumber = data.playerNumber;
    isMultiplayer = true;

    alert("Joined room: " + multiplayerRoomCode);

    lastTurnSummaryLines = [`Joined room: ${multiplayerRoomCode}. Choose your fighter and press Start Battle.`];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("playersReady", () => {
    isMultiplayer = true;
    lastTurnSummaryLines = ["Both players connected. Choose your fighter and press Start Battle."];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("fighterSelected", () => {
    lastTurnSummaryLines = ["A fighter has been selected. Waiting for both players..."];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("battleStarted", (data) => {
    currentBattle = data.battle;

    multiplayerPlayer1SocketId = data.player1;
    multiplayerPlayer2SocketId = data.player2;

    if (multiplayerPlayerSocketId === data.player1) {
      playerId = data.fighter1;
      enemyId = data.fighter2;
    } else {
      playerId = data.fighter2;
      enemyId = data.fighter1;
    }

    playerFlipped = false;
    enemyFlipped = true;

    loadFighterImage(document.getElementById("playerImage"), playerId);
    loadFighterImage(document.getElementById("enemyImage"), enemyId);
    applyFlipStates();

    lastPlayerAction = "-";
    lastEnemyAction = "-";
    lastTurnOutcome = "-";
    lastTurnSummaryLines = ["Multiplayer battle started. Choose your action."];

    isWaitingForOpponentAction = false;
    isAnimatingTurn = false;
    summaryAnimationToken += 1;

    renderBattle();
  });

  socket.on("waitingForOpponentAction", () => {
    isWaitingForOpponentAction = true;
    updateActionButtons();
  });

  socket.on("turnResolved", async (data) => {
    await resolveMultiplayerTurnFromServer(data);
  });

  socket.on("opponentDisconnected", () => {
    alert("Opponent disconnected.");
    isWaitingForOpponentAction = false;
    isAnimatingTurn = false;
    updateActionButtons();
  });

  socket.on("errorMessage", (msg) => {
    alert(msg);
  });
}

function init() {
  setupMultiplayer();

  document.getElementById("startBattleBtn").addEventListener("click", startBattle);

  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;

      if (btn.id === "slothEcosystemBtn") {
        openSlothEcosystemModal();
        return;
      }

      if (action === "larval-command") {
        await openLarvalCommandPrompt();
        return;
      }

      if (playerNeedsPerfectAdaptationChoice(action)) {
        openCoconutOctopusPerfectAdaptationModal();
        return;
      }

      await playTurn(action);
    });

    btn.disabled = true;
  });

  document.querySelectorAll(".octopus-form-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      previewPlayerCoconutOctopusForm(btn.dataset.octopusForm);
    });
  });

  document.getElementById("octopusConfirmFormBtn")?.addEventListener("click", () => {
    if (!pendingOctopusFormPreview) return;
    transformPlayerCoconutOctopus(pendingOctopusFormPreview);
  });

  document.getElementById("octopusCancelPreviewBtn")?.addEventListener("click", () => {
    clearPlayerCoconutOctopusPreview();
  });


  document.getElementById("octopusPerfectAdaptationCloseBtn")?.addEventListener("click", closeCoconutOctopusPerfectAdaptationModal);

  document.querySelectorAll("[data-octopus-perfect-choice]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await chooseCoconutOctopusPerfectAdaptationAndAttack(btn.dataset.octopusPerfectChoice);
    });
  });

  document.getElementById("larvalCommandCloseBtn").addEventListener("click", closeLarvalCommandModal);
  document.getElementById("slothEcosystemCloseBtn")?.addEventListener("click", closeSlothEcosystemModal);

  document.getElementById("larvalAttackMinus").addEventListener("click", () => adjustLarvalDraft("attack", -1));
  document.getElementById("larvalAttackPlus").addEventListener("click", () => adjustLarvalDraft("attack", 1));

  document.getElementById("larvalDefenseMinus").addEventListener("click", () => adjustLarvalDraft("defense", -1));
  document.getElementById("larvalDefensePlus").addEventListener("click", () => adjustLarvalDraft("defense", 1));

  document.getElementById("larvalSacrificeMinus").addEventListener("click", () => adjustLarvalDraft("sacrifice", -1));
  document.getElementById("larvalSacrificePlus").addEventListener("click", () => adjustLarvalDraft("sacrifice", 1));

  document.getElementById("larvalClearBtn").addEventListener("click", clearLarvalDraft);
  document.getElementById("larvalConfirmBtn").addEventListener("click", confirmLarvalCommandModal);

  initFlipButtons();
  updateStaticActionButtons();

  setupLinkedFighterSelectors([
    {
      selectId: "playerFighter",
      categoryId: "playerFighterCategory",
      sortId: "playerFighterSort",
      favoriteToggleId: "playerFighterFavoriteToggle",
      defaultValue: "sumatran-tiger",
      onChange: renderSelectionPreview
    },
    {
      selectId: "enemyFighter",
      categoryId: "enemyFighterCategory",
      sortId: "enemyFighterSort",
      favoriteToggleId: "enemyFighterFavoriteToggle",
      defaultValue: "walrus",
      onChange: renderSelectionPreview
    }
  ]);

  renderSelectionPreview();
}

init();