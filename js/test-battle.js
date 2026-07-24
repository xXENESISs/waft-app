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
import { setupLinkedFighterSelectors } from "./fighter-selector.js";
import {
  createBattle,
  resolveTurn,
  canUseAction,
  getEffectiveStat,
  transformCoconutOctopus,
  setCoconutOctopusPerfectAdaptationChoice,
  applyHornedLizardPressureControl,
  canUseHornedLizardPressureControl
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
let pendingHornedPressureControl = null;
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
  return isSharedThreeToedSlothFighter(fighter);
}

function getSlothActiveColonies(fighter) {
  return getSharedSlothActiveColonies(fighter);
}

function isSlothDormantInCurrentBiome(fighter) {
  return isSharedSlothDormant(fighter, currentBattle);
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

function getSlothBacterialFollowingHitBonus(fighter) {
  return getSharedSlothBacterialFollowingHitBonus(fighter);
}

function getSlothBacterialProgressText(fighter) {
  return getSharedSlothBacterialProgressText(fighter);
}

function getThreeToedSlothStatusText(fighter) {
  return getSharedThreeToedSlothStatusText(fighter, currentBattle);
}

function getSlothColonyCurrentEffectText(fighter, colony) {
  return getSharedSlothColonyCurrentEffectText(fighter, colony);
}


function getSlothMiniStateLabel(active, boosted, dormant) {
  return getSharedSlothMiniStateLabel(active, boosted, dormant);
}

function getSlothFullStateLabel(active, boosted, dormant) {
  return getSharedSlothFullStateLabel(active, boosted, dormant);
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
  return updateSharedSlothEcosystemButtonDom(player, currentBattle);
}

function getSlothFighterForExtraResourcePrefix(prefix) {
  if (currentBattle) {
    const { player, enemy } = getBattleFighters();
    return prefix === "player" ? player : enemy;
  }

  const selectId = prefix === "player" ? "playerFighter" : "enemyFighter";
  const selectedId = document.getElementById(selectId)?.value;
  return selectedId ? createPreviewFighterState(selectedId) : null;
}

function bindSlothExtraResourceCard(prefix) {
  const extraResourceEl = document.getElementById(`${prefix}ExtraResource`);
  if (!extraResourceEl || extraResourceEl.dataset.slothCardClickBound === "true") return;

  extraResourceEl.dataset.slothCardClickBound = "true";
  extraResourceEl.addEventListener("click", (event) => {
    const card = event.target.closest(".sloth-ecosystem-card");
    if (!card || !extraResourceEl.contains(card)) return;

    const fighter = getSlothFighterForExtraResourcePrefix(prefix);
    openSlothEcosystemModalForFighter(fighter);
  });
}

function setSlothExtraResourceClickable(extraResourceEl, enabled) {
  if (!extraResourceEl) return;

  extraResourceEl.classList.toggle("clickable-sloth-resource", Boolean(enabled));
  extraResourceEl.style.cursor = enabled ? "pointer" : "";
  extraResourceEl.title = enabled ? "Open Living Ecosystem" : "";
}

function getHornedFighterForExtraResourcePrefix(prefix) {
  if (currentBattle) {
    const { player, enemy } = getBattleFighters();
    return prefix === "player" ? player : enemy;
  }

  const selectId = prefix === "player" ? "playerFighter" : "enemyFighter";
  const selectedId = document.getElementById(selectId)?.value;
  return selectedId ? createPreviewFighterState(selectedId) : null;
}

function bindHornedPressureExtraResourceCard(prefix) {
  const extraResourceEl = document.getElementById(`${prefix}ExtraResource`);
  if (!extraResourceEl || extraResourceEl.dataset.hornedPressureCardClickBound === "true") return;

  extraResourceEl.dataset.hornedPressureCardClickBound = "true";

  const openFromCard = (event) => {
    const card = event.target.closest(".horned-pressure-card");
    if (!card || !extraResourceEl.contains(card)) return;

    const fighter = getHornedFighterForExtraResourcePrefix(prefix);
    openHornedLizardPressureControlModal(fighter, true);
  };

  extraResourceEl.addEventListener("click", openFromCard);
  extraResourceEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".horned-pressure-card");
    if (!card || !extraResourceEl.contains(card)) return;
    event.preventDefault();
    openFromCard(event);
  });
}

function setHornedPressureExtraResourceClickable(extraResourceEl, enabled) {
  if (!extraResourceEl) return;

  extraResourceEl.classList.toggle("clickable-horned-pressure-resource", Boolean(enabled));
  extraResourceEl.title = enabled ? "Open Pressure Control" : "";
}

function openSlothEcosystemModalForFighter(fighter, showAlert = false) {
  if (!isThreeToedSlothFighter(fighter)) {
    if (showAlert) alert("Only the Three-Toed Sloth has a Living Ecosystem.");
    return;
  }

  renderSlothEcosystemModal(fighter);

  const modal = document.getElementById("slothEcosystemModal");
  if (modal) modal.style.display = "flex";
}

function openSlothEcosystemModal() {
  if (currentBattle?.finished) return;

  const player = currentBattle ? getBattleFighters().player : preBattlePreviewPlayer;
  openSlothEcosystemModalForFighter(player, true);
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
  return isSharedCoconutOctopusFighter(fighter);
}

function getCoconutOctopusFormText(fighter) {
  return getSharedCoconutOctopusFormText(fighter);
}

function getCoconutOctopusSpecialChoiceText(fighter) {
  return getSharedCoconutOctopusSpecialChoiceText(fighter);
}

const OCTOPUS_FORM_ORDER = ["base", "offensive", "defensive", "evasive"];

const OCTOPUS_FORM_SHORT_LABELS = {
  base: "Base",
  offensive: "Off",
  defensive: "Def",
  evasive: "Eva"
};

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

function getCoconutOctopusStatusText(fighter) {
  return getSharedCoconutOctopusStatusText(fighter);
}


const HORNED_PRESSURE_CONTROL_OPTIONS = [
  {
    id: "recovery",
    cost: 20,
    emoji: "❤️",
    title: "Recovery",
    desc: "Restore 20 Stamina."
  },
  {
    id: "muscular-discharge",
    cost: 40,
    emoji: "💥",
    title: "Muscular Discharge",
    desc: "Next offensive action uses doubled Explosiveness for critical chance."
  },
  {
    id: "hypertension",
    cost: 60,
    emoji: "📈",
    title: "Muscular Hypertension",
    desc: "+2 permanent Explosiveness for the rest of the battle."
  },
  {
    id: "vasoconstriction",
    cost: 80,
    emoji: "🛡️",
    title: "Vasoconstriction",
    desc: "+3 permanent Defense for the rest of the battle."
  },
  {
    id: "gouging",
    cost: 100,
    emoji: "👁️",
    title: "Gouging",
    desc: "Two independent 10% eye attacks. Already lost eyes can heal the lizard by 100 HP each."
  }
];

function getHornedPressureControlOption(optionId) {
  return HORNED_PRESSURE_CONTROL_OPTIONS.find((option) => option.id === optionId) || null;
}

function getPendingHornedPressureControlLabel() {
  const option = getHornedPressureControlOption(pendingHornedPressureControl);
  return option ? option.title : null;
}

function clearPendingHornedPressureControl() {
  pendingHornedPressureControl = null;
}

function isHornedLizardFighter(fighter) {
  return fighter?.id === "horned-lizard" || fighter?.passive?.id === "blood-pressure";
}

function getHornedLizardEyeLossCount(fighter) {
  return (fighter?.hornedLizardLeftEyeLost ? 1 : 0) +
    (fighter?.hornedLizardRightEyeLost ? 1 : 0);
}

function getHornedLizardVisionText(fighter) {
  const lostEyes = getHornedLizardEyeLossCount(fighter);

  if (lostEyes >= 2) return "Total Blindness";
  if (lostEyes === 1) return "Partial Vision";
  if ((fighter?.hornedLizardTemporaryBlindnessActions || 0) > 0) return "Blood-Blinded";
  return "Normal";
}

function getHornedLizardEyePanelState(isLost, blindActions = 0) {
  if (isLost) {
    return {
      className: "lost",
      label: "RIPPED OUT"
    };
  }

  if (blindActions > 0) {
    return {
      className: "blinded",
      label: "BLOOD-BLINDED"
    };
  }

  return {
    className: "intact",
    label: "INTACT"
  };
}

function renderHornedLizardPressurePanel(fighter) {
  const pressure = Math.max(0, Math.min(100, fighter?.hornedLizardPressure || 0));
  const pressurePct = pressure;
  const explosiveBonus = fighter?.hornedLizardPermanentExplosivenessBonus || 0;
  const defenseBonus = fighter?.hornedLizardPermanentDefenseBonus || 0;
  const dischargeReady = Boolean(fighter?.hornedLizardMuscleDischargeReady);
  const pendingLabel = isHornedLizardFighter(fighter) && currentBattle && getBattleFighters().player === fighter
    ? getPendingHornedPressureControlLabel()
    : null;

  return `
    <div class="horned-pressure-card clickable-horned-pressure-card${pendingLabel ? " pending" : ""}" role="button" tabindex="0" title="Open Pressure Control">
      <div class="horned-pressure-header">
        <div>
          <div class="horned-pressure-title">🩸 Blood Pressure</div>
          <div class="horned-pressure-subtitle">${pendingLabel ? "Pending: activates with your next action" : "Click to open Pressure Control"}</div>
        </div>
        <div class="horned-pressure-badge">${pressure}/100</div>
      </div>
      <div class="horned-pressure-meter">
        <div class="horned-pressure-fill" style="width:${pressurePct}%"></div>
      </div>
      <div class="horned-bonus-grid">
        <div class="horned-bonus-chip${pendingLabel ? " active pending" : ""}">${pendingLabel ? "⏳ " + pendingLabel : "🫀 No control"}</div>
        <div class="horned-bonus-chip${dischargeReady ? " active" : ""}">💥 ${dischargeReady ? "Discharge ready" : "Off"}</div>
        <div class="horned-bonus-chip${explosiveBonus > 0 || defenseBonus > 0 ? " active" : ""}">📈 +${explosiveBonus} · 🛡️ +${defenseBonus}</div>
      </div>
    </div>
  `;
}

function renderHornedLizardOcularPanel(fighter) {
  const leftLost = Boolean(fighter?.hornedLizardLeftEyeLost);
  const rightLost = Boolean(fighter?.hornedLizardRightEyeLost);
  const blindActions = fighter?.hornedLizardTemporaryBlindnessActions || 0;
  const vision = getHornedLizardVisionText(fighter);
  const leftEye = getHornedLizardEyePanelState(leftLost, blindActions);
  const rightEye = getHornedLizardEyePanelState(rightLost, blindActions);

  return `
    <div class="horned-ocular-card${getHornedLizardEyeLossCount(fighter) >= 2 ? " total" : getHornedLizardEyeLossCount(fighter) === 1 || blindActions > 0 ? " partial" : ""}">
      <div class="horned-pressure-header horned-ocular-header">
        <div>
          <div class="horned-pressure-title">👁️ Ocular State</div>
          <div class="horned-pressure-subtitle">${blindActions > 0 ? "Blood blindness active" : "Eye damage tracked here"}</div>
        </div>
        <div class="horned-pressure-badge">${vision}</div>
      </div>
      <div class="horned-eye-row">
        <div class="horned-eye-chip ${leftEye.className}">Left: ${leftEye.label}</div>
        <div class="horned-eye-chip ${rightEye.className}">Right: ${rightEye.label}</div>
      </div>
      <div class="horned-blindness-line">Blindness: ${blindActions}/2 offensive action${blindActions === 1 ? "" : "s"}</div>
    </div>
  `;
}

function updateHornedLizardOcularResource(prefix, fighter, opponent = null) {
  const resource = document.getElementById(`${prefix}OcularResource`);
  if (!resource) return;

  const shouldShow = Boolean(currentBattle && fighter && isHornedLizardFighter(opponent));

  if (!shouldShow) {
    resource.innerHTML = "";
    resource.style.display = "none";
    return;
  }

  resource.innerHTML = renderHornedLizardOcularPanel(fighter);
  resource.style.display = "block";
}

function getHornedLizardPressureStatusText(fighter) {
  if (!fighter) return "";

  return (
    "Blood Pressure: " +
    (fighter.hornedLizardPressure || 0) +
    "/100" +
    "\nMuscular Discharge: " +
    (fighter.hornedLizardMuscleDischargeReady ? "READY" : "NO") +
    "\nPermanent Explosiveness: +" +
    (fighter.hornedLizardPermanentExplosivenessBonus || 0) +
    "\nPermanent Defense: +" +
    (fighter.hornedLizardPermanentDefenseBonus || 0)
  );
}

function getHornedLizardOcularStatusText(fighter) {
  if (!fighter) return "";

  return (
    "Vision: " +
    getHornedLizardVisionText(fighter) +
    "\nLeft Eye: " +
    (fighter.hornedLizardLeftEyeLost ? "RIPPED OUT" : "INTACT") +
    "\nRight Eye: " +
    (fighter.hornedLizardRightEyeLost ? "RIPPED OUT" : "INTACT") +
    "\nTemporary Blindness: " +
    (fighter.hornedLizardTemporaryBlindnessActions || 0) +
    "/2 offensive actions"
  );
}

function getCompactPhaseTextForPanel(fighter) {
  if (!currentBattle) return "PREVIEW";
  const phaseIndex = Math.floor((currentBattle.turn - 1) / 2) % 2;
  return phaseIndex === 0 ? "DAY" : "NIGHT";
}

function getCircadianTurnsUntilChange() {
  if (!currentBattle) return "-";
  const turnInsidePhase = ((currentBattle.turn - 1) % 2) + 1;
  return Math.max(0, 2 - turnInsidePhase);
}

function isGenericResourcePanelFighter(fighter) {
  return Boolean(
    fighter && (
      fighter.id === "bombardier-beetle" ||
      isCoconutOctopusFighter(fighter) ||
      fighter.passive?.id === "circadian-cycle" ||
      fighter.special?.id === "overinflation" ||
      fighter.passive?.id === "momentum" ||
      fighter.passive?.id === "hunting-inertia" ||
      fighter.passive?.id === "parasitic-control" ||
      fighter.passive?.id === "immobile-stalk" ||
      fighter.passive?.id === "thoths-mirage" ||
      fighter.passive?.id === "larval-gestation"
    )
  );
}

function getGenericResourcePanelType(fighter) {
  if (!fighter) return null;
  if (fighter.id === "bombardier-beetle") return "bombardier";
  if (isCoconutOctopusFighter(fighter)) return "coconut-octopus";
  if (fighter.passive?.id === "circadian-cycle") return "circadian";
  if (fighter.special?.id === "overinflation") return "overinflation";
  if (fighter.passive?.id === "momentum") return "momentum";
  if (fighter.passive?.id === "hunting-inertia") return "hunting-inertia";
  if (fighter.passive?.id === "parasitic-control") return "parasitic-control";
  if (fighter.passive?.id === "immobile-stalk") return "immobile-stalk";
  if (fighter.passive?.id === "thoths-mirage") return "thoths-mirage";
  if (fighter.passive?.id === "larval-gestation") return "larval-gestation";
  return null;
}

function getBombardierValveText(fighter) {
  const hydro = fighter.bombardierValveHydroquinone || 0;
  const peroxide = fighter.bombardierValvePeroxide || 0;
  if (hydro <= 0 && peroxide <= 0) return "Valve: off";

  const parts = [];
  if (hydro > 0) parts.push(`🔴 ${hydro}`);
  if (peroxide > 0) parts.push(`🔵 ${peroxide}`);
  return `Valve: ${parts.join(" + ")}`;
}

function getFennecOasisEffect(fighter) {
  if (!currentBattle || !fighter) return null;

  return (currentBattle.battleEffects || []).find((effect) => {
    return effect.id === "oasis" && effect.sourceId === fighter.id;
  }) || null;
}

function getFennecMirageProgress(fighter) {
  return fighter?.fennecMirageProgress || {
    quick: false,
    explosive: false,
    concentration: 0
  };
}

function getFennecMirageProgressCount(fighter) {
  const progress = getFennecMirageProgress(fighter);
  return (progress.quick ? 1 : 0) +
    (progress.explosive ? 1 : 0) +
    Math.min(2, progress.concentration || 0);
}

function getOctopusFormShortText(fighter) {
  const form = fighter?.octopusForm || "base";
  const labels = {
    base: "BASE",
    offensive: "OFF",
    defensive: "DEF",
    evasive: "EVA"
  };
  return labels[form] || form.toUpperCase();
}

function renderOctopusFormGuideCard(formId, form) {
  if (!form) return "";

  const stats = form.stats
    ? `ATK ${form.stats.attack} · DEF ${form.stats.defense} · TEC ${form.stats.technique} · AGI ${form.stats.agility} · EXP ${form.stats.explosiveness}`
    : "Stats unavailable";

  const special = form.special?.name ? `Special: ${form.special.name}. ${form.special.description || ""}` : "Special unavailable.";
  const passive = form.passive?.name ? `Passive: ${form.passive.name}. ${form.passive.description || ""}` : "Passive unavailable.";

  return `
    <div class="generic-modal-card octopus-form-guide ${formId}">
      <strong>${form.name || formId}</strong>
      <span>${stats}</span>
      <span>${passive}</span>
      <span>${special}</span>
    </div>
  `;
}

function renderGenericResourcePanel(fighter, opponent = null) {
  const type = getGenericResourcePanelType(fighter);
  if (!type) return "";

  if (type === "circadian") {
    const phase = getCompactPhaseTextForPanel(fighter);
    const night = phase === "NIGHT";
    const turnsLeft = getCircadianTurnsUntilChange();
    return `
      <div class="generic-resource-card compact circadian ${night ? "night" : "day"}" data-generic-resource="circadian" role="button" tabindex="0" title="Open Circadian Cycle guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">${night ? "🌙" : "☀️"} Circadian Cycle</div>
          <div class="generic-resource-badge">${phase}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>${night ? "+ATK / +TEC" : "+DEF / -ATK"}</span>
          <span>Change: ${turnsLeft}</span>
        </div>
      </div>
    `;
  }

  if (type === "overinflation") {
    const uses = fighter.overinflationUses ?? 4;
    return `
      <div class="generic-resource-card compact overinflation" data-generic-resource="overinflation" role="button" tabindex="0" title="Open Overinflation guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🐡 Overinflation</div>
          <div class="generic-resource-badge">${uses}/4</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Uses: ${uses}/4</span>
          <span>Toxin: ${fighter.residualNeurotoxinActive ? "YES" : "NO"}</span>
        </div>
      </div>
    `;
  }

  if (type === "momentum") {
    const stacks = fighter.momentumStacks || 0;
    const bonus = [0, 5, 10, 15, 20][stacks] || 0;
    return `
      <div class="generic-resource-card compact momentum" data-generic-resource="momentum" role="button" tabindex="0" title="Open Momentum guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">💩 Momentum</div>
          <div class="generic-resource-badge">${stacks}/4</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Stacks: ${stacks}/4</span>
          <span>Damage: +${bonus}%</span>
        </div>
      </div>
    `;
  }

  if (type === "hunting-inertia") {
    const stacks = fighter.falconStacks || 0;
    return `
      <div class="generic-resource-card compact hunting-inertia" data-generic-resource="hunting-inertia" role="button" tabindex="0" title="Open Hunting Inertia guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🦅 Hunting Inertia</div>
          <div class="generic-resource-badge">${stacks}/4</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Damage: +${stacks * 5}%</span>
          <span>Expl.: +${stacks * 10}%</span>
        </div>
      </div>
    `;
  }

  if (type === "bombardier") {
    const hydro = fighter.bombardierHydroquinone || 0;
    const peroxide = fighter.bombardierPeroxide || 0;
    return `
      <div class="generic-resource-card compact bombardier" data-generic-resource="bombardier" role="button" tabindex="0" title="Open Reaction Chamber guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">⚗️ Reaction Chamber</div>
          <div class="generic-resource-badge">${hydro}/${peroxide}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>🔴 ${hydro}/3</span>
          <span>🔵 ${peroxide}/3</span>
          <span>${getBombardierValveText(fighter)}</span>
        </div>
      </div>
    `;
  }

  if (type === "immobile-stalk") {
    const charges = fighter.matamataStalkCharges || 0;
    const ready = Boolean(fighter.matamataAmbushReady);
    return `
      <div class="generic-resource-card compact immobile-stalk" data-generic-resource="immobile-stalk" role="button" tabindex="0" title="Open Immobile Stalk guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🐢 Immobile Stalk</div>
          <div class="generic-resource-badge">${ready ? "AMBUSH" : charges + "/4"}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Stalk: ${charges}/4</span>
          <span>Ambush: ${ready ? "READY" : "NO"}</span>
        </div>
      </div>
    `;
  }

  if (type === "thoths-mirage") {
    const progress = getFennecMirageProgress(fighter);
    const oasis = getFennecOasisEffect(fighter);
    const progressCount = getFennecMirageProgressCount(fighter);
    return `
      <div class="generic-resource-card compact thoths-mirage" data-generic-resource="thoths-mirage" role="button" tabindex="0" title="Open Thoth's Mirage guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🏜️ Thoth's Mirage</div>
          <div class="generic-resource-badge">${oasis ? "OASIS" : progressCount + "/4"}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Q: ${progress.quick ? "✓" : "-"}</span>
          <span>E: ${progress.explosive ? "✓" : "-"}</span>
          <span>C: ${Math.min(2, progress.concentration || 0)}/2</span>
          <span>Oasis: ${oasis ? oasis.duration : "OFF"}</span>
        </div>
      </div>
    `;
  }

  if (type === "larval-gestation") {
    const larvae = fighter.darwinsLarvae || 0;
    const maxLarvae = fighter.darwinsMaxLarvae || 5;
    const larvalDefense = fighter.darwinsLarvalDefense || 0;
    return `
      <div class="generic-resource-card compact larval-gestation" data-generic-resource="larval-gestation" role="button" tabindex="0" title="Open Larval Command guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🐸 Larval Gestation</div>
          <div class="generic-resource-badge">${larvae}/${maxLarvae}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Larvae: ${larvae}/${maxLarvae}</span>
          <span>Defense: ${larvalDefense}</span>
          <span>Command: ${fighter.darwinsLarvalCommand || "none"}</span>
        </div>
      </div>
    `;
  }

  if (type === "coconut-octopus") {
    const form = fighter.octopusForm || "base";
    const charges = fighter.octopusAdaptationCharges ?? 0;
    const charge = getCoconutOctopusCurrentCharge(fighter);
    const maxCharge = getCoconutOctopusCurrentChargeMax(fighter);
    return `
      <div class="generic-resource-card compact coconut-octopus" data-generic-resource="coconut-octopus" role="button" tabindex="0" title="Open Coconut Octopus forms guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🐙 Adaptation</div>
          <div class="generic-resource-badge">${getOctopusFormShortText(fighter)}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>Form: ${getCoconutOctopusFormText(fighter)}</span>
          <span>Charges: ${charges}/8</span>
          <span>Special: ${charge}/${maxCharge}</span>
        </div>
      </div>
    `;
  }

  if (type === "parasitic-control") {
    const hits = fighter.parasiticControlHits || 0;
    const roachAttached = opponent?.zombieCockroachSourceName === fighter.name
      ? opponent.zombieCockroachTurns || 0
      : 0;
    const roachConfused = opponent?.zombieCockroachSourceName === fighter.name
      ? Boolean(opponent.zombieCockroachConfused)
      : false;
    const controlState = roachAttached > 0
      ? `🪳 ${roachAttached}/3`
      : fighter.parasiticControlActive
        ? "CONTROL"
        : hits > 0
          ? `${hits}/3`
          : "NONE";

    return `
      <div class="generic-resource-card compact parasitic-control" data-generic-resource="parasitic-control" role="button" tabindex="0" title="Open Parasitic Control guide">
        <div class="generic-resource-header">
          <div class="generic-resource-title">🧠 Parasitic Control</div>
          <div class="generic-resource-badge">${controlState}</div>
        </div>
        <div class="generic-resource-chip-row">
          <span>🧠 ${hits}/3</span>
          <span>🪳 Roach: ${roachAttached}/3</span>
          <span>😵 ${roachConfused ? "YES" : "NO"}</span>
        </div>
      </div>
    `;
  }

  return "";
}

function getGenericResourceOpponentForFighter(fighter) {
  if (!currentBattle || !fighter) return null;
  if (currentBattle.fighterA === fighter) return currentBattle.fighterB;
  if (currentBattle.fighterB === fighter) return currentBattle.fighterA;
  const { player, enemy } = getBattleFighters();
  if (player === fighter) return enemy;
  if (enemy === fighter) return player;
  return null;
}

function getGenericResourceGuideHtml(fighter) {
  const type = getGenericResourcePanelType(fighter);
  if (!type) return "";

  const animal = animals[fighter.id];
  const title = animal?.name || fighter.name || "Fighter";

  if (type === "circadian") {
    return `
      <div class="generic-modal-summary circadian">
        <div><div class="generic-modal-label">Current phase</div><div class="generic-modal-value">${getCompactPhaseTextForPanel(fighter)}</div></div>
        <div><div class="generic-modal-label">Turns until change</div><div class="generic-modal-value">${getCircadianTurnsUntilChange()}</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>☀️ Day</strong><span>-50% Attack, +50% Defense, -25% Technique and Agility. Special is blocked.</span></div>
        <div class="generic-modal-card"><strong>🌙 Night</strong><span>+50% Attack, +25% Technique and +25% Agility. Nocturnal Hunt becomes usable when charged.</span></div>
      </div>
    `;
  }

  if (type === "overinflation") {
    return `
      <div class="generic-modal-summary overinflation">
        <div><div class="generic-modal-label">Uses left</div><div class="generic-modal-value">${fighter.overinflationUses ?? 4}/4</div></div>
        <div><div class="generic-modal-label">Residual Neurotoxin</div><div class="generic-modal-value">${fighter.residualNeurotoxinActive ? "ACTIVE" : "INACTIVE"}</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>🐡 Overinflation</strong><span>Becomes immune to damage for the turn. If hit, punishes the attacker and can apply Tetrodotoxin pressure.</span></div>
        <div class="generic-modal-card"><strong>Explosion risk</strong><span>Using Overinflation twice in a row makes Pufferfish explode, damaging the opponent and leaving itself at 1 HP.</span></div>
      </div>
    `;
  }

  if (type === "momentum") {
    const stacks = fighter.momentumStacks || 0;
    const bonus = [0, 5, 10, 15, 20][stacks] || 0;
    return `
      <div class="generic-modal-summary momentum">
        <div><div class="generic-modal-label">Current stacks</div><div class="generic-modal-value">${stacks}/4</div></div>
        <div><div class="generic-modal-label">Current bonus</div><div class="generic-modal-value">+${bonus}% damage</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>💩 Momentum</strong><span>Each consecutive successful attack increases damage: +5%, +10%, +15%, +20%.</span></div>
        <div class="generic-modal-card"><strong>Pressure pattern</strong><span>The Dung Beetle becomes more dangerous if it keeps landing hits without interruption.</span></div>
      </div>
    `;
  }

  if (type === "hunting-inertia") {
    const stacks = fighter.falconStacks || 0;
    return `
      <div class="generic-modal-summary hunting-inertia">
        <div><div class="generic-modal-label">Stacks</div><div class="generic-modal-value">${stacks}/4</div></div>
        <div><div class="generic-modal-label">Damage</div><div class="generic-modal-value">+${stacks * 5}%</div></div>
        <div><div class="generic-modal-label">Explosiveness</div><div class="generic-modal-value">+${stacks * 10}%</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>🦅 Hunting Inertia</strong><span>Each successful attack gives 1 stack, up to 4. Each stack grants +5% damage and +10% Explosiveness.</span></div>
        <div class="generic-modal-card"><strong>Deadly Dive</strong><span>The falcon can dive with defensive timing, drain stamina based on damage, and keep its stacks if the dive hits.</span></div>
      </div>
    `;
  }

  if (type === "bombardier") {
    const hydro = fighter.bombardierHydroquinone || 0;
    const peroxide = fighter.bombardierPeroxide || 0;
    const selectedHydro = fighter.bombardierSelectedHydroquinone ?? hydro;
    const selectedPeroxide = fighter.bombardierSelectedPeroxide ?? peroxide;
    return `
      <div class="generic-modal-summary bombardier">
        <div><div class="generic-modal-label">Hydroquinone</div><div class="generic-modal-value">🔴 ${hydro}/3</div></div>
        <div><div class="generic-modal-label">Hydrogen Peroxide</div><div class="generic-modal-value">🔵 ${peroxide}/3</div></div>
        <div><div class="generic-modal-label">Chain Mix</div><div class="generic-modal-value">🔴 ${selectedHydro} · 🔵 ${selectedPeroxide}</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>⚗️ Reaction Chamber</strong><span>Offensive hits store 🔴 Hydroquinone. Concentration stores 🔵 Hydrogen Peroxide. Maximum 3 of each.</span></div>
        <div class="generic-modal-card"><strong>Valve Release</strong><span>Before the main action, stored reactants can be spent. 🔴 reduces enemy Attack; 🔵 reduces enemy Technique. 1/2/3 charges give 10%/25%/50%.</span></div>
        <div class="generic-modal-card"><strong>Chain Reaction</strong><span>The super uses the selected mix for chained true-damage discharges. If no mix is selected, it can use all stored reactants.</span></div>
      </div>
    `;
  }

  if (type === "immobile-stalk") {
    const charges = fighter.matamataStalkCharges || 0;
    const ready = Boolean(fighter.matamataAmbushReady);
    return `
      <div class="generic-modal-summary immobile-stalk">
        <div><div class="generic-modal-label">Stalk charges</div><div class="generic-modal-value">${charges}/4</div></div>
        <div><div class="generic-modal-label">Ambush</div><div class="generic-modal-value">${ready ? "READY" : "NO"}</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>🐢 Immobile Stalk</strong><span>Every enemy Concentration gives Matamata 1 stalk charge. At 4/4, from the next turn onward, its next attack cannot miss, deals double damage, and absorbs 20 stamina.</span></div>
        <div class="generic-modal-card"><strong>🛡️ Ancestral Retreat</strong><span>Defensive special: restores 60 HP and 30 stamina. During that turn, the next direct damage is reduced by 50%, and 25% of the original incoming damage is reflected.</span></div>
      </div>
    `;
  }

  if (type === "thoths-mirage") {
    const progress = getFennecMirageProgress(fighter);
    const oasis = getFennecOasisEffect(fighter);
    return `
      <div class="generic-modal-summary thoths-mirage">
        <div><div class="generic-modal-label">Quick hit</div><div class="generic-modal-value">${progress.quick ? "DONE" : "NO"}</div></div>
        <div><div class="generic-modal-label">Explosive hit</div><div class="generic-modal-value">${progress.explosive ? "DONE" : "NO"}</div></div>
        <div><div class="generic-modal-label">Concentration</div><div class="generic-modal-value">${Math.min(2, progress.concentration || 0)}/2</div></div>
        <div><div class="generic-modal-label">Oasis</div><div class="generic-modal-value">${oasis ? oasis.duration + " turns" : "INACTIVE"}</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>🏜️ Thoth's Mirage</strong><span>Complete 1 successful Quick Attack, 1 successful Explosive Attack, and 2 Concentrations to unlock Oasis.</span></div>
        <div class="generic-modal-card"><strong>🌅 Oasis</strong><span>Oasis lasts 3 full turns, or 6 full turns if activated in Desert.</span></div>
        <div class="generic-modal-card"><strong>🦊 Anubis' Staff</strong><span>Evasive special. Outside Oasis, heals for 50% of damage dealt and steals stamina equal to 25% of damage. During Oasis, healing becomes 100% and stamina steal becomes 50%.</span></div>
      </div>
    `;
  }

  if (type === "larval-gestation") {
    const larvae = fighter.darwinsLarvae || 0;
    const maxLarvae = fighter.darwinsMaxLarvae || 5;
    return `
      <div class="generic-modal-summary larval-gestation">
        <div><div class="generic-modal-label">Larvae</div><div class="generic-modal-value">${larvae}/${maxLarvae}</div></div>
        <div><div class="generic-modal-label">Larval defense</div><div class="generic-modal-value">${fighter.darwinsLarvalDefense || 0}</div></div>
        <div><div class="generic-modal-label">Stored command</div><div class="generic-modal-value">${fighter.darwinsLarvalCommand || "NONE"}</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>🐸 Larval Gestation</strong><span>At the end of each turn, Darwin's Frog has a 25% chance to generate 1 larva. Maximum: 5 active larvae.</span></div>
        <div class="generic-modal-card"><strong>🧬 Larval Command</strong><span>Attack spends larvae for guaranteed damage. Defend can block incoming damage. Sacrifice converts larvae into HP/stamina recovery. Meditate preserves resources.</span></div>
        <div class="generic-modal-card"><strong>🌋 Darwinian Expulsion</strong><span>Special: instantly generates 1, 2 or 3 larvae, without exceeding the 5-larva cap.</span></div>
      </div>
    `;
  }

  if (type === "coconut-octopus") {
    const octopus = animals["coconut-octopus"];
    const forms = octopus?.octopusForms || {};
    return `
      <div class="generic-modal-summary coconut-octopus">
        <div><div class="generic-modal-label">Current form</div><div class="generic-modal-value">${getCoconutOctopusFormText(fighter)}</div></div>
        <div><div class="generic-modal-label">Adaptation charges</div><div class="generic-modal-value">${fighter.octopusAdaptationCharges ?? 0}/8</div></div>
        <div><div class="generic-modal-label">Current special</div><div class="generic-modal-value">${getCoconutOctopusCurrentCharge(fighter)}/${getCoconutOctopusCurrentChargeMax(fighter)}</div></div>
      </div>
      <div class="generic-modal-grid octopus-form-guide-grid">
        ${["base", "offensive", "defensive", "evasive"].map((formId) => renderOctopusFormGuideCard(formId, forms[formId])).join("")}
        <div class="generic-modal-card"><strong>🌊 Perfect Adaptation</strong><span>In Base Form, the super lets the octopus choose a balanced Tentacle Storm, Coconut Fortress or Ink Sea without transforming or spending adaptation charges.</span></div>
      </div>
    `;
  }

  if (type === "parasitic-control") {
    const opponent = getGenericResourceOpponentForFighter(fighter);
    const roachAttached = opponent?.zombieCockroachSourceName === fighter.name
      ? opponent.zombieCockroachTurns || 0
      : 0;
    return `
      <div class="generic-modal-summary parasitic-control">
        <div><div class="generic-modal-label">Neurohits</div><div class="generic-modal-value">${fighter.parasiticControlHits || 0}/3</div></div>
        <div><div class="generic-modal-label">Control</div><div class="generic-modal-value">${fighter.parasiticControlActive ? "ARMED" : "NONE"}</div></div>
        <div><div class="generic-modal-label">Zombie Cockroach</div><div class="generic-modal-value">${roachAttached}/3 on rival</div></div>
      </div>
      <div class="generic-modal-grid">
        <div class="generic-modal-card"><strong>🧠 Parasitic Control</strong><span>3 consecutive offensive hits arm control from the rival's next real action onward. It blocks Concentration and Special Attack and has a 50% chance to force self-hit.</span></div>
        <div class="generic-modal-card"><strong>🪳 Zombie Cockroach</strong><span>4-charge offensive super. If it attaches, for up to 3 turns it drains 20 HP and 10 Stamina at turn end, may confuse the next action, and can be removed by a 20% end-turn escape roll.</span></div>
      </div>
    `;
  }

  return `<div class="generic-modal-card"><strong>${title}</strong><span>No extra guide available.</span></div>`;
}

function getGenericResourceFighterForPrefix(prefix) {
  if (currentBattle) {
    const { player, enemy } = getBattleFighters();
    return prefix === "player" ? player : enemy;
  }

  const selectId = prefix === "player" ? "playerFighter" : "enemyFighter";
  const selectedId = document.getElementById(selectId)?.value;
  return selectedId ? createPreviewFighterState(selectedId) : null;
}

function openGenericResourceModal(fighter) {
  if (!isGenericResourcePanelFighter(fighter)) return;

  const modal = document.getElementById("genericResourceModal");
  const titleEl = document.getElementById("genericResourceModalTitle");
  const subtitleEl = document.getElementById("genericResourceModalSubtitle");
  const bodyEl = document.getElementById("genericResourceModalBody");
  if (!modal || !titleEl || !subtitleEl || !bodyEl) return;

  const animal = animals[fighter.id];
  const type = getGenericResourcePanelType(fighter);
  const titles = {
    circadian: "Circadian Cycle",
    overinflation: "Overinflation",
    momentum: "Momentum",
    "hunting-inertia": "Hunting Inertia",
    bombardier: "Reaction Chamber",
    "immobile-stalk": "Immobile Stalk",
    "thoths-mirage": "Thoth's Mirage",
    "larval-gestation": "Larval Command",
    "coconut-octopus": "Adaptation Forms",
    "parasitic-control": "Parasitic Control"
  };

  titleEl.textContent = titles[type] || animal?.passive?.name || animal?.special?.name || "Mechanic Guide";
  subtitleEl.textContent = `${animal?.name || fighter.name}: mechanic state and combat rules.`;
  bodyEl.innerHTML = getGenericResourceGuideHtml(fighter);
  modal.style.display = "flex";
}

function closeGenericResourceModal() {
  const modal = document.getElementById("genericResourceModal");
  if (modal) modal.style.display = "none";
}

function setGenericResourceClickable(extraResourceEl, enabled) {
  if (!extraResourceEl) return;
  extraResourceEl.classList.toggle("clickable-generic-resource", Boolean(enabled));
  extraResourceEl.style.cursor = enabled ? "pointer" : "";
  extraResourceEl.title = enabled ? "Open mechanic guide" : "";
}

function bindGenericResourceCard(prefix) {
  const extraResourceEl = document.getElementById(`${prefix}ExtraResource`);
  if (!extraResourceEl || extraResourceEl.dataset.genericResourceBound === "true") return;

  extraResourceEl.dataset.genericResourceBound = "true";
  extraResourceEl.addEventListener("click", (event) => {
    const card = event.target.closest(".generic-resource-card");
    if (!card || !extraResourceEl.contains(card)) return;
    openGenericResourceModal(getGenericResourceFighterForPrefix(prefix));
  });
}

function updateHornedLizardPressureControlButton(player) {
  const btn = document.getElementById("hornedPressureControlBtn");
  const title = document.getElementById("btn-horned-pressure-title");
  const desc = document.getElementById("btn-horned-pressure-desc");

  if (!btn || !desc) return;

  const isHorned = isHornedLizardFighter(player);
  btn.style.display = isHorned ? "block" : "none";

  if (!isHorned) {
    btn.disabled = true;
    if (title) title.textContent = "Pressure Control";
    desc.textContent = "Spend Blood Pressure before your main action.";
    return;
  }

  const pressure = player?.hornedLizardPressure || 0;
  const preview = !currentBattle;
  const pendingLabel = getPendingHornedPressureControlLabel();

  btn.disabled = Boolean(currentBattle && (currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction));

  if (title) {
    title.textContent = pendingLabel ? "Selected: " + pendingLabel : "Pressure Control";
  }

  desc.textContent = preview
    ? "Open the Pressure Control guide before battle."
    : pendingLabel
      ? "Will activate before your next main action. Click to change or cancel. Pressure: " + pressure + "/100."
      : "Current Pressure: " + pressure + "/100. Select a control, then choose your main action.";
}

function renderHornedLizardPressureControlModal(fighterOverride = null, selectionAllowed = false) {
  const body = document.getElementById("hornedPressureControlModalBody");
  const subtitle = document.getElementById("hornedPressureControlSubtitle");

  if (!body || !subtitle) return;

  const { player } = currentBattle ? getBattleFighters() : { player: preBattlePreviewPlayer };
  const fighter = fighterOverride || player;
  const pressure = fighter?.hornedLizardPressure || 0;
  const pendingLabel = selectionAllowed ? getPendingHornedPressureControlLabel() : null;
  const fighterName = fighter?.name || "Texas Horned Lizard";

  subtitle.textContent = selectionAllowed
    ? pendingLabel
      ? "Selected: " + pendingLabel + ". It will activate only after you choose an attack, Concentration or Special."
      : "Blood Pressure available: " + pressure + "/100. Select one option, then choose your main action."
    : fighterName + " Pressure Control guide. Options are visible here, but only your own Texas Horned Lizard can select one.";

  body.innerHTML = `
    <div class="horned-modal-summary${pendingLabel ? " pending" : ""}">
      <div>
        <div class="horned-modal-label">Current Pressure</div>
        <div class="horned-modal-value">${pressure}/100</div>
      </div>
      <div>
        <div class="horned-modal-label">Selected Control</div>
        <div class="horned-modal-value">${pendingLabel || "None"}</div>
      </div>
      <div>
        <div class="horned-modal-label">Permanent Buffs</div>
        <div class="horned-modal-value">+${fighter?.hornedLizardPermanentExplosivenessBonus || 0} Expl. · +${fighter?.hornedLizardPermanentDefenseBonus || 0} Def.</div>
      </div>
    </div>
    <div class="horned-control-grid">
      ${HORNED_PRESSURE_CONTROL_OPTIONS.map((option) => {
        const enabled = selectionAllowed && canUseHornedLizardPressureControl(fighter, option.id);
        const selected = selectionAllowed && pendingHornedPressureControl === option.id;
        return `
          <button type="button" class="horned-control-option${enabled ? " available" : ""}${selected ? " selected" : ""}" data-pressure-control="${option.id}" ${enabled ? "" : "disabled"}>
            <div class="horned-control-cost">${option.emoji} ${option.cost} Pressure</div>
            <div class="horned-control-title">${selected ? "✓ " : ""}${option.title}</div>
            <div class="horned-control-desc">${option.desc}</div>
          </button>
        `;
      }).join("")}
    </div>
    <div class="horned-control-footer">
      <button type="button" class="horned-control-cancel" data-pressure-control-cancel ${selectionAllowed && pendingLabel ? "" : "disabled"}>Cancel selected control</button>
      <div class="horned-control-footnote">${selectionAllowed ? "Selection does not spend Pressure now. It resolves immediately before your next main action." : "Information view only. Open your own Blood Pressure panel or central button to select a control."}</div>
    </div>
  `;
}

function openHornedLizardPressureControlModal(fighterOverride = null, showAlert = true) {
  const { player } = currentBattle ? getBattleFighters() : { player: preBattlePreviewPlayer };
  const fighter = fighterOverride || player;

  if (!isHornedLizardFighter(fighter)) {
    if (showAlert) alert("Only the Texas Horned Lizard has Pressure Control.");
    return;
  }

  const modal = document.getElementById("hornedPressureControlModal");
  if (!modal) return;

  const selectionAllowed = Boolean(
    currentBattle &&
    !currentBattle.finished &&
    !isAnimatingTurn &&
    !isWaitingForOpponentAction &&
    !isMultiplayer &&
    fighter === player &&
    isHornedLizardFighter(player)
  );

  renderHornedLizardPressureControlModal(fighter, selectionAllowed);
  modal.style.display = "flex";
}

function closeHornedLizardPressureControlModal() {
  const modal = document.getElementById("hornedPressureControlModal");
  if (modal) modal.style.display = "none";
}

function chooseHornedLizardPressureControl(option) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return;

  const { player } = getBattleFighters();

  if (!isHornedLizardFighter(player)) return;

  if (!canUseHornedLizardPressureControl(player, option)) {
    lastTurnOutcome = "Pressure Failed";
    lastTurnSummaryLines = ["Not enough Blood Pressure for this Pressure Control option."];
    renderBattle();
    return;
  }

  pendingHornedPressureControl = option;
  const selected = getHornedPressureControlOption(option);

  lastTurnOutcome = "Pressure Selected";
  lastTurnSummaryLines = [
    "Pressure Control selected: " + (selected?.title || option) + ".",
    "It has not been spent yet.",
    "Choose an attack, Concentration or Special to activate it before the main action."
  ];

  closeHornedLizardPressureControlModal();
  renderBattle();
}

function cancelHornedLizardPressureControl() {
  const previous = getPendingHornedPressureControlLabel();
  clearPendingHornedPressureControl();

  lastTurnOutcome = previous ? "Pressure Canceled" : "Pressure Control";
  lastTurnSummaryLines = [previous ? "Canceled Pressure Control: " + previous + "." : "No Pressure Control was selected."];

  renderHornedLizardPressureControlModal(currentBattle ? getBattleFighters().player : preBattlePreviewPlayer, Boolean(currentBattle));
  renderBattle();
}

function applyPendingHornedLizardPressureControlIfNeeded(player, enemy) {
  if (!pendingHornedPressureControl) return null;

  const option = pendingHornedPressureControl;
  clearPendingHornedPressureControl();

  if (!isHornedLizardFighter(player)) {
    return { ok: false, message: "Pending Pressure Control was canceled because the current fighter is not the Texas Horned Lizard." };
  }

  return applyHornedLizardPressureControl(player, enemy, currentBattle, option);
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
    "iberian-ribbed-newt": ["./images/animals/amphibians/iberian-ribbed-newt.png"],
    "iberian-skink": ["./images/animals/reptiles/iberian-skink.png"],
    "horned-lizard": ["./images/animals/reptiles/horned-lizard.png"],
      "bombardier-beetle": ["./images/animals/arthropods/bombardier-beetle.png"],
};

  return getSharedImageCandidates(id, animal, legacy);
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


  if (fighter.passive && fighter.passive.id === "hunting-inertia") {
    var falconStacks = fighter.falconStacks || 0;
    return (
      "Hunting Inertia: " +
      falconStacks +
      "/4" +
      "\nDamage bonus: +" +
      falconStacks * 5 +
      "%" +
      "\nExplosiveness bonus: +" +
      falconStacks * 10 +
      "%"
    );
  }

  if (fighter.passive && fighter.passive.id === "silent-stalk") {
    var tigerStacks = fighter.tigerStalkStacks || 0;
    return (
      "Silent Stalk: " +
      tigerStacks +
      "/4" +
      "\nAttack bonus: +" +
      tigerStacks * 5 +
      "%" +
      "\nSpeed bonus: +" +
      tigerStacks * 10 +
      "%" +
      "\nExplosiveness bonus: +" +
      tigerStacks * 10 +
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

  if (isHornedLizardFighter(fighter)) {
    return getHornedLizardPressureStatusText(fighter);
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

  const hornedPressureExtra =
    isHornedLizardFighter(fighter)
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Blood Pressure</div>
      <div class="tooltip-text">${getHornedLizardPressureStatusText(fighter)}</div>
    </div>
  `
      : "";

  const battleHasHornedLizard =
    currentBattle &&
    (isHornedLizardFighter(currentBattle.fighterA) ||
      isHornedLizardFighter(currentBattle.fighterB));

  const hornedOcularExtra =
    !isHornedLizardFighter(fighter) &&
    (battleHasHornedLizard ||
      getHornedLizardEyeLossCount(fighter) > 0 ||
      (fighter.hornedLizardTemporaryBlindnessActions || 0) > 0)
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Ocular State</div>
      <div class="tooltip-text">${getHornedLizardOcularStatusText(fighter)}</div>
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
    ${hornedPressureExtra}
    ${hornedOcularExtra}
    ${isGenericResourcePanelFighter(fighter) ? `
      <div class="tooltip-section">
        <div class="tooltip-label">Mechanic State</div>
        <div class="tooltip-text">${getGenericResourcePanelType(fighter) || "Resource"}</div>
      </div>
    ` : ""}
  `;
}

function renderFighter(prefix, fighter, opponent = null) {
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
      setHornedPressureExtraResourceClickable(extraResourceEl, false);
      setGenericResourceClickable(extraResourceEl, false);
      extraResourceEl.innerHTML = renderSlothEcosystemMiniPanel(fighter);
      extraResourceEl.style.display = "block";
      setSlothExtraResourceClickable(extraResourceEl, true);
    } else if (isHornedLizardFighter(fighter)) {
      setSlothExtraResourceClickable(extraResourceEl, false);
      setHornedPressureExtraResourceClickable(extraResourceEl, true);
      setGenericResourceClickable(extraResourceEl, false);
      extraResourceEl.innerHTML = renderHornedLizardPressurePanel(fighter);
      extraResourceEl.style.display = "block";
    } else if (isGenericResourcePanelFighter(fighter)) {
      setSlothExtraResourceClickable(extraResourceEl, false);
      setHornedPressureExtraResourceClickable(extraResourceEl, false);
      setGenericResourceClickable(extraResourceEl, true);
      extraResourceEl.innerHTML = renderGenericResourcePanel(fighter, opponent);
      extraResourceEl.style.display = "block";
    } else {
      setSlothExtraResourceClickable(extraResourceEl, false);
      setHornedPressureExtraResourceClickable(extraResourceEl, false);
      setGenericResourceClickable(extraResourceEl, false);
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

  updateHornedLizardOcularResource(prefix, fighter, opponent);
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
  return updateSharedLarvalCommandButtonDom(player);
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

  return rows
    .map(([label, value]) => `<div class="octopus-preview-stat">${label}<strong>${value}</strong></div>`)
    .join("");
}

function renderCoconutOctopusFormPreview(player) {
  return renderSharedCoconutOctopusFormPreviewDom({
    player,
    pendingFormId: pendingOctopusFormPreview,
    currentBattle,
    isBusy: isAnimatingTurn,
    isWaiting: isWaitingForOpponentAction,
    isMultiplayer
  });
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
  if (!player || player.id !== "coconut-octopus") {
    pendingOctopusFormPreview = null;
  }

  updateSharedCoconutOctopusPanelDom({
    player,
    pendingFormId: pendingOctopusFormPreview,
    currentBattle,
    isBusy: isAnimatingTurn,
    isWaiting: isWaitingForOpponentAction
  });

  if (pendingOctopusFormPreview && !getCoconutOctopusFormDefinitionForPreview(pendingOctopusFormPreview)) {
    pendingOctopusFormPreview = null;
  }

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

      if (btn.id === "hornedPressureControlBtn") {
        btn.disabled = !isHornedLizardFighter(previewPlayer);
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

    if (btn.id === "hornedPressureControlBtn") {
      btn.disabled = !isHornedLizardFighter(player);
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
  renderFighter("player", player, enemy);
  renderFighter("enemy", enemy, player);
  renderSummary();
  renderLog();

  updateStaticActionButtons();
  updateSpecialButton(player);

  if (typeof updateLarvalCommandButton === "function") {
    updateLarvalCommandButton(player);
  }

  updateSlothEcosystemButton(player);
  updateHornedLizardPressureControlButton(player);
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
  return buildSharedTurnSummary(newLines, { importantOnly: true });
}

function deriveTurnOutcome(summaryLines) {
  return deriveSharedTurnOutcome(summaryLines);
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

    match = line.match(/^(.+?) uses (?:Throat Bite|Lethal Bite), dealing (\d+) damage.*\.$/);
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
  clearPendingHornedPressureControl();
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

    hornedLizardPressure: animal.id === "horned-lizard" ? 0 : null,
    hornedLizardMuscleDischargeReady: false,
    hornedLizardPermanentExplosivenessBonus: 0,
    hornedLizardPermanentDefenseBonus: 0,
    hornedLizardTemporaryBlindnessActions: 0,
    hornedLizardLeftEyeLost: false,
    hornedLizardRightEyeLost: false,

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
      setHornedPressureExtraResourceClickable(extraResourceEl, false);
      setGenericResourceClickable(extraResourceEl, false);
      extraResourceEl.innerHTML = renderSlothEcosystemMiniPanel(previewFighter);
      extraResourceEl.style.display = "block";
      setSlothExtraResourceClickable(extraResourceEl, true);
    } else if (previewFighter && isHornedLizardFighter(previewFighter)) {
      setSlothExtraResourceClickable(extraResourceEl, false);
      setHornedPressureExtraResourceClickable(extraResourceEl, true);
      setGenericResourceClickable(extraResourceEl, false);
      extraResourceEl.innerHTML = renderHornedLizardPressurePanel(previewFighter);
      extraResourceEl.style.display = "block";
    } else if (previewFighter && isGenericResourcePanelFighter(previewFighter)) {
      setSlothExtraResourceClickable(extraResourceEl, false);
      setHornedPressureExtraResourceClickable(extraResourceEl, false);
      setGenericResourceClickable(extraResourceEl, true);
      extraResourceEl.innerHTML = renderGenericResourcePanel(previewFighter);
      extraResourceEl.style.display = "block";
    } else {
      setSlothExtraResourceClickable(extraResourceEl, false);
      setHornedPressureExtraResourceClickable(extraResourceEl, false);
      setGenericResourceClickable(extraResourceEl, false);
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

  updateHornedLizardOcularResource(prefix, previewFighter, null);

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
  clearPendingHornedPressureControl();

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
  updateHornedLizardPressureControlButton(previewPlayer);
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
    const pendingPressureLabel = getPendingHornedPressureControlLabel();

    lastPlayerAction = pendingPressureLabel
      ? pendingPressureLabel + " + " + prettyActionLabel(playerAction, player)
      : prettyActionLabel(playerAction, player);
    lastEnemyAction = prettyActionLabel(enemyAction, enemy);

    applyPendingHornedLizardPressureControlIfNeeded(player, enemy);

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
  return getSharedLarvalDraftTotal(larvalDraftCommand);
}

function getCurrentPlayerLarvae() {
  if (!currentBattle) {
    return getSharedCurrentLarvae(preBattlePreviewPlayer, true);
  }

  const { player } = getBattleFighters();
  return getSharedCurrentLarvae(player, false);
}

function renderLarvalCommandModal() {
  const player = currentBattle ? getBattleFighters().player : preBattlePreviewPlayer;
  renderSharedLarvalCommandModalDom({
    fighter: player,
    draft: larvalDraftCommand,
    previewMode: Boolean(larvalPreviewMode)
  });
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

  setupSwapFightersButton({
    anchorId: "startBattleBtn",
    playerSelectId: "playerFighter",
    enemySelectId: "enemyFighter",
    onSwap: () => {
      preBattlePreviewPlayer = null;
      renderSelectionPreview();
    }
  });

  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;

      if (btn.id === "slothEcosystemBtn") {
        openSlothEcosystemModal();
        return;
      }

      if (btn.id === "hornedPressureControlBtn") {
        if (isMultiplayer) {
          alert("Pressure Control is only enabled in Single Battle for this first test.");
          return;
        }
        openHornedLizardPressureControlModal();
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
  document.getElementById("hornedPressureControlCloseBtn")?.addEventListener("click", closeHornedLizardPressureControlModal);
  document.getElementById("genericResourceCloseBtn")?.addEventListener("click", closeGenericResourceModal);

  document.getElementById("hornedPressureControlModalBody")?.addEventListener("click", (event) => {
    const cancelBtn = event.target.closest("[data-pressure-control-cancel]");
    if (cancelBtn) {
      if (!cancelBtn.disabled) cancelHornedLizardPressureControl();
      return;
    }

    const btn = event.target.closest("[data-pressure-control]");
    if (!btn || btn.disabled) return;
    chooseHornedLizardPressureControl(btn.dataset.pressureControl);
  });

  document.getElementById("larvalAttackMinus").addEventListener("click", () => adjustLarvalDraft("attack", -1));
  document.getElementById("larvalAttackPlus").addEventListener("click", () => adjustLarvalDraft("attack", 1));

  document.getElementById("larvalDefenseMinus").addEventListener("click", () => adjustLarvalDraft("defense", -1));
  document.getElementById("larvalDefensePlus").addEventListener("click", () => adjustLarvalDraft("defense", 1));

  document.getElementById("larvalSacrificeMinus").addEventListener("click", () => adjustLarvalDraft("sacrifice", -1));
  document.getElementById("larvalSacrificePlus").addEventListener("click", () => adjustLarvalDraft("sacrifice", 1));

  document.getElementById("larvalClearBtn").addEventListener("click", clearLarvalDraft);
  document.getElementById("larvalConfirmBtn").addEventListener("click", confirmLarvalCommandModal);

  initFlipButtons();
  bindSlothExtraResourceCard("player");
  bindSlothExtraResourceCard("enemy");
  bindHornedPressureExtraResourceCard("player");
  bindHornedPressureExtraResourceCard("enemy");
  bindGenericResourceCard("player");
  bindGenericResourceCard("enemy");
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