import { mergeAnimalImageCandidates } from "./animal-assets.js";
import { animals } from "./animals.js";

export function uniqueList(items = []) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }

  return result;
}

export function getSharedImageCandidates(id, animal, localCandidates = {}) {
  const category = animal?.category ?? "";
  const direct = `./images/animals/${category}/${id}.png`;
  const mergedLegacy = mergeAnimalImageCandidates(localCandidates);

  return uniqueList([direct, ...(mergedLegacy[id] ?? [])]);
}

function isTechnicalLogLine(line) {
  if (!line) return true;
  if (line.includes("calc →")) return true;
  if (line.startsWith("Damage calc")) return true;
  if (line.startsWith("Critical calc")) return true;
  if (line.includes("→ HP:")) return true;
  if (line.startsWith("--- Turn")) return true;
  if (line.includes("gains effect: Neurotoxic Injection")) return true;
  return false;
}

function isImportantSummaryLine(line) {
  return (
    line.includes("BIOME SHIFT") ||
    line.includes("Biome changed") ||
    line.includes("Modified stat") ||
    line.includes(" uses ") ||
    line.includes(" hits ") ||
    line.includes("lands on") ||
    line.includes("total damage") ||
    line.includes("(CRITICAL)") ||
    line.includes("misses") ||
    line.includes("converts the miss") ||
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
    line.includes("Silent Stalk") ||
    line.includes("Throat Bite") ||
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
    line.includes("Costal Eversion") ||
    line.includes("Ribbed Guard") ||
    line.includes("Costal Toxin") ||
    line.includes("Tentacle Storm") ||
    line.includes("Coconut Fortress") ||
    line.includes("Coconut Shell") ||
    line.includes("Perfect Camouflage") ||
    line.includes("Ink Sea") ||
    line.includes("Predatory Pressure") ||
    line.includes("Caudal Autotomy") ||
    line.includes("Scaled Retreat") ||
    line.includes("detached tail") ||
    line.includes("Detached tail") ||
    line.includes("Darwinian Expulsion") ||
    line.includes("Larval Command") ||
    line.includes("commands its larvae") ||
    line.includes("Larval Sacrifice") ||
    line.includes("Larval Defense") ||
    line.includes("Larval Attack") ||
    (line.includes("conserves") && line.includes("larva")) ||
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
    line.includes("Tetrodotoxin effects")
  );
}

function getSpecialUserFromLine(line) {
  const specialUseMatch =
    line.match(/^(.+?) uses Throat Bite\b/) ||
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
    line.match(/^(.+?) uses Costal Eversion\b/) ||
    line.match(/^(.+?) uses Caudal Autotomy\b/) ||
    line.match(/^(.+?) explodes\b/);

  return specialUseMatch ? specialUseMatch[1] : null;
}


function formatTurnCount(value) {
  const turns = Number(value);
  return turns === 1 ? "1 turn" : `${turns} turns`;
}

function normalizeSkinkTailLine(line) {
  const autotomy = line.match(/^(.+?) uses Caudal Autotomy, shedding its tail, losing (\d+) HP, and creating a detached tail with (\d+) HP for (\d+) turns\.$/);
  if (autotomy) {
    return `${autotomy[1]} uses Caudal Autotomy, losing ${autotomy[2]} HP and creating a detached tail with ${autotomy[3]} HP for ${autotomy[4]} turns.`;
  }

  return line;
}

function flushPendingTailBlock(output, pendingTailBlock) {
  if (!pendingTailBlock) return null;

  const { defenderName, hpLeft, maxHp, destroyed } = pendingTailBlock;

  if (destroyed || hpLeft <= 0) {
    output.push(`${defenderName}'s detached tail is destroyed. Excess damage does not hit ${defenderName}.`);
  } else {
    output.push(`Detached tail HP: ${hpLeft}/${maxHp}.`);
  }

  return null;
}

function flushPendingAutotomyRegen(output, pendingRegen) {
  if (!pendingRegen) return null;
  output.push(`${pendingRegen.fighterName}'s Caudal Autotomy restores ${pendingRegen.amount} HP.`);
  return null;
}

function normalizeAndCleanLines(rawLines = []) {
  const output = [];
  let pendingTailBlock = null;
  let pendingRegen = null;

  for (const raw of rawLines || []) {
    if (!raw) continue;
    let line = normalizeSkinkTailLine(String(raw));

    if (isTechnicalLogLine(line)) continue;

    if (line.includes("detached tail intercepts direct attacks while it remains active")) continue;
    if (line.match(/^(.+?)'s attack is intercepted by (.+?)'s detached tail\.$/)) continue;
    if (line.match(/^(.+?)'s detached tail absorbs the direct hit's secondary effects\.$/)) continue;

    const tailBlockMatch = line.match(/^(.+?)'s detached tail blocks (\d+) damage \((\d+)\/(\d+) tail HP left\)\.$/);
    if (tailBlockMatch) {
      pendingTailBlock = {
        defenderName: tailBlockMatch[1],
        blocked: Number(tailBlockMatch[2]),
        hpLeft: Number(tailBlockMatch[3]),
        maxHp: Number(tailBlockMatch[4]),
        destroyed: Number(tailBlockMatch[3]) <= 0
      };
      continue;
    }

    const tailBlockDestroyedMatch = line.match(/^(.+?)'s detached tail blocks (\d+) damage and is destroyed\.$/);
    if (tailBlockDestroyedMatch) {
      pendingTailBlock = {
        defenderName: tailBlockDestroyedMatch[1],
        blocked: Number(tailBlockDestroyedMatch[2]),
        hpLeft: 0,
        maxHp: 90,
        destroyed: true
      };
      continue;
    }

    const tailDestroyedMatch = line.match(/^(.+?)'s detached tail is destroyed and no longer protects it\.$/);
    if (tailDestroyedMatch) {
      if (pendingTailBlock && pendingTailBlock.defenderName === tailDestroyedMatch[1]) {
        pendingTailBlock.destroyed = true;
        pendingTailBlock.hpLeft = 0;
      } else {
        pendingTailBlock = {
          defenderName: tailDestroyedMatch[1],
          blocked: 0,
          hpLeft: 0,
          maxHp: 90,
          destroyed: true
        };
      }
      continue;
    }

    const tailHitMatch = line.match(/^(.+?) hits (.+?)'s detached tail with (.+?) for (\d+) damage( \(CRITICAL\))?\.$/);
    if (tailHitMatch) {
      pendingRegen = flushPendingAutotomyRegen(output, pendingRegen);
      output.push(line);
      pendingTailBlock = flushPendingTailBlock(output, pendingTailBlock || {
        defenderName: tailHitMatch[2],
        hpLeft: Math.max(0, 90 - Number(tailHitMatch[4])),
        maxHp: 90,
        destroyed: Number(tailHitMatch[4]) >= 90
      });
      continue;
    }

    const regenMatch = line.match(/^(.+?)'s Caudal Autotomy regenerates (\d+) HP\.$/);
    if (regenMatch) {
      pendingTailBlock = flushPendingTailBlock(output, pendingTailBlock);
      pendingRegen = {
        fighterName: regenMatch[1],
        amount: Number(regenMatch[2])
      };
      continue;
    }

    const remainsWithTailMatch = line.match(/^(.+?)'s Caudal Autotomy remains active for (\d+) more turn(?:s)?\. Tail HP: (\d+)\/(\d+)\.$/);
    if (remainsWithTailMatch) {
      const amount = pendingRegen?.amount ?? 0;
      if (amount > 0) {
        output.push(`${remainsWithTailMatch[1]}'s Caudal Autotomy restores ${amount} HP (${formatTurnCount(remainsWithTailMatch[2])} left; tail HP: ${remainsWithTailMatch[3]}/${remainsWithTailMatch[4]}).`);
        pendingRegen = null;
      } else {
        output.push(line);
      }
      continue;
    }

    const remainsDestroyedMatch = line.match(/^(.+?)'s Caudal Autotomy remains active for (\d+) more turn(?:s)?\. The detached tail no longer protects it\.$/);
    if (remainsDestroyedMatch) {
      const amount = pendingRegen?.amount ?? 0;
      if (amount > 0) {
        output.push(`${remainsDestroyedMatch[1]}'s Caudal Autotomy restores ${amount} HP (${formatTurnCount(remainsDestroyedMatch[2])} left; tail destroyed).`);
        pendingRegen = null;
      } else {
        output.push(`${remainsDestroyedMatch[1]}'s Caudal Autotomy remains active for ${formatTurnCount(remainsDestroyedMatch[2])} (tail destroyed).`);
      }
      continue;
    }

    const endMatch = line.match(/^(.+?)'s tail regenerates and Caudal Autotomy ends\.$/);
    if (endMatch) {
      const amount = pendingRegen?.amount ?? 0;
      if (amount > 0) {
        output.push(`${endMatch[1]}'s Caudal Autotomy restores ${amount} HP and ends.`);
        pendingRegen = null;
      } else {
        output.push(line);
      }
      continue;
    }

    pendingTailBlock = flushPendingTailBlock(output, pendingTailBlock);
    pendingRegen = flushPendingAutotomyRegen(output, pendingRegen);

    output.push(line);
  }

  pendingTailBlock = flushPendingTailBlock(output, pendingTailBlock);
  pendingRegen = flushPendingAutotomyRegen(output, pendingRegen);

  return output;
}

export function buildSharedTurnSummary(newLines = [], options = {}) {
  const { importantOnly = false } = options;
  const cleaned = normalizeAndCleanLines(newLines);
  const filtered = [];
  const summary = [];
  const fightersWhoUsedSpecial = new Set();

  for (const line of cleaned) {
    const specialUser = getSpecialUserFromLine(line);
    if (specialUser) fightersWhoUsedSpecial.add(specialUser);

    if (!importantOnly || isImportantSummaryLine(line)) {
      filtered.push(line);
    }
  }

  for (const line of filtered) {
    const formatted = formatSharedBattleLogLine(line);

    const cannotUseSpecialMatch = formatted.match(/^(.+?) cannot use Special Attack\.$/);
    if (cannotUseSpecialMatch && fightersWhoUsedSpecial.has(cannotUseSpecialMatch[1])) {
      continue;
    }

    summary.push(formatted);
  }

  return summary.length > 0 ? summary : ["No major events this turn."];
}

export function formatSharedBattleLogLine(line) {
  if (
    line.includes("Honey Badger has fallen below") &&
    line.includes("fatigue")
  ) {
    return "Honey Badger's Savage Endurance ignores fatigue: no stat reduction is applied.";
  }

  if (
    line.includes("enters Savage Endurance") &&
    line.includes("below 25% HP")
  ) {
    return "Honey Badger enters Savage Endurance: below 25% HP, it becomes immune to critical hits and gains +20% Attack and +20% Explosiveness.";
  }

  return line;
}

export function deriveSharedTurnOutcome(summaryLines = []) {
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
  if (joined.includes("Costal Eversion")) return "Special Triggered";
  if (joined.includes("Costal Toxin")) return "Passive Triggered";
  if (joined.includes("Caudal Autotomy")) return "Special Triggered";
  if (joined.includes("detached tail")) return "Tail Blocked";
  if (joined.includes("Scaled Retreat")) return "Passive Triggered";
  if (joined.includes("Arctic Storm")) return "Special Triggered";
  if (joined.includes("Throat Bite")) return "Special Triggered";
  if (joined.includes("Silent Stalk")) return "Passive Triggered";
  if (joined.includes("Parasitic Control")) return "Passive Triggered";
  if (joined.includes("Critical Hit")) return "Critical Hit";
  if (joined.includes("misses")) return "Miss";
  if (joined.includes("hits")) return "Hit";

  return "Turn Resolved";
}

export function setupSwapFightersButton(options = {}) {
  const {
    buttonId = "swapFightersBtn",
    anchorId = "startBattleBtn",
    playerSelectId = "playerFighter",
    enemySelectId = "enemyFighter",
    label = "↔ Swap Fighters",
    onSwap = null
  } = options;

  const playerSelect = document.getElementById(playerSelectId);
  const enemySelect = document.getElementById(enemySelectId);
  const anchor = document.getElementById(anchorId);

  if (!playerSelect || !enemySelect || !anchor) return null;

  let button = document.getElementById(buttonId);

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = buttonId;
    button.className = "secondary-btn";
    button.textContent = label;
    button.style.marginLeft = "8px";
    anchor.insertAdjacentElement("afterend", button);
  }

  button.onclick = () => {
    const previousPlayer = playerSelect.value;
    const previousEnemy = enemySelect.value;

    playerSelect.value = previousEnemy;
    enemySelect.value = previousPlayer;

    playerSelect.dispatchEvent(new Event("change", { bubbles: true }));
    enemySelect.dispatchEvent(new Event("change", { bubbles: true }));

    if (typeof onSwap === "function") {
      onSwap({ playerId: playerSelect.value, enemyId: enemySelect.value });
    }
  };

  return button;
}


/* ========================================================= */
/* SHARED LEGENDARY UI CORE                                  */
/* Centralizes repeated UI for Coconut Octopus, Sloth, Frog. */
/* ========================================================= */

export function escapeSharedHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const SHARED_OCTOPUS_FORM_ORDER = ["base", "offensive", "defensive", "evasive"];

export const SHARED_OCTOPUS_FORM_LABELS = {
  base: "Base Form",
  offensive: "Offensive Form",
  defensive: "Defensive Form",
  evasive: "Evasive Form"
};

export const SHARED_OCTOPUS_FORM_BUTTON_LABELS = {
  base: "Base",
  offensive: "Offensive",
  defensive: "Defensive",
  evasive: "Evasive"
};

export const SHARED_OCTOPUS_FORM_SHORT_LABELS = {
  base: "Base",
  offensive: "Off",
  defensive: "Def",
  evasive: "Eva"
};

export const SHARED_OCTOPUS_SPECIAL_CHOICE_LABELS = {
  "tentacle-storm": "Tentacle Storm",
  "coconut-fortress": "Coconut Fortress",
  "ink-sea": "Ink Sea"
};

export function isSharedCoconutOctopusFighter(fighter) {
  return fighter && fighter.id === "coconut-octopus";
}

export function getSharedCoconutOctopusFormText(fighter) {
  if (!isSharedCoconutOctopusFighter(fighter)) return "";
  const form = fighter.octopusForm || "base";
  return SHARED_OCTOPUS_FORM_LABELS[form] || form;
}

export function getSharedCoconutOctopusSpecialChoiceText(fighter) {
  if (!isSharedCoconutOctopusFighter(fighter)) return "";
  const choice = fighter.octopusPerfectAdaptationChoice || "tentacle-storm";
  return SHARED_OCTOPUS_SPECIAL_CHOICE_LABELS[choice] || choice;
}

export function getSharedCoconutOctopusFormDefinitionForPreview(formId) {
  const octopus = animals["coconut-octopus"];
  const form = octopus?.octopusForms?.[formId];
  if (form) return form;

  if (formId === "base" && octopus) {
    return {
      id: "base",
      name: "Base Form",
      stats: octopus.stats,
      passive: octopus.passive,
      special: octopus.special
    };
  }

  return null;
}

export function getSharedCoconutOctopusFormChargeMax(formId) {
  const form = getSharedCoconutOctopusFormDefinitionForPreview(formId);
  return form?.special?.chargeHits ?? 0;
}

export function getSharedCoconutOctopusFormCharge(fighter, formId) {
  if (!isSharedCoconutOctopusFighter(fighter)) return 0;

  if (fighter.octopusSpecialCharges && typeof fighter.octopusSpecialCharges[formId] === "number") {
    return fighter.octopusSpecialCharges[formId];
  }

  const currentForm = fighter.octopusForm || "base";
  if (currentForm === formId && typeof fighter.specialCharge === "number") {
    return fighter.specialCharge;
  }

  return 0;
}

export function getSharedCoconutOctopusCurrentCharge(fighter) {
  if (!isSharedCoconutOctopusFighter(fighter)) return fighter?.specialCharge ?? 0;
  return getSharedCoconutOctopusFormCharge(fighter, fighter.octopusForm || "base");
}

export function getSharedCoconutOctopusCurrentChargeMax(fighter) {
  if (!isSharedCoconutOctopusFighter(fighter)) return fighter?.special?.chargeHits ?? 0;
  return getSharedCoconutOctopusFormChargeMax(fighter.octopusForm || "base");
}

export function getSharedCoconutOctopusChargeLine(fighter) {
  if (!isSharedCoconutOctopusFighter(fighter)) return "";

  return SHARED_OCTOPUS_FORM_ORDER.map((formId) => {
    return (
      SHARED_OCTOPUS_FORM_SHORT_LABELS[formId] +
      " " +
      getSharedCoconutOctopusFormCharge(fighter, formId) +
      "/" +
      getSharedCoconutOctopusFormChargeMax(formId)
    );
  }).join(" · ");
}

export function getSharedCoconutOctopusStatusText(fighter) {
  if (!isSharedCoconutOctopusFighter(fighter)) return "";

  const form = fighter.octopusForm || "base";
  const lines = [
    "Form: " + getSharedCoconutOctopusFormText(fighter),
    "Adaptation charges: " + (fighter.octopusAdaptationCharges ?? 0) + "/8",
    "First transformation: " + (fighter.octopusFreeTransformationAvailable ? "FREE" : "USED"),
    "Special charges: " + getSharedCoconutOctopusChargeLine(fighter)
  ];

  if (form === "base") {
    lines.push("Perfect Adaptation: choose option when using Special");
  }

  if (form === "offensive") {
    lines.push("Predatory Pressure: " + ((fighter.octopusPredatoryPressureStacks || 0) * 5) + "% Attack reduction");
  }

  if (form === "defensive") {
    lines.push("Coconut Shell: 10 fixed damage on direct hit");
    lines.push("Fortress active: " + (fighter.coconutFortressActive ? "YES" : "NO"));
  }

  if (form === "evasive") {
    lines.push("Perfect Camouflage: +15 HP / +15 Stamina when enemy misses");
  }

  return lines.join("\n");
}

export function getSharedCoconutOctopusPreviewStatsHtml(form) {
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
  return rows.map(([label, value]) => `<div class="octopus-preview-stat">${escapeSharedHtml(label)}<strong>${escapeSharedHtml(value)}</strong></div>`).join("");
}

export function getSharedCoconutOctopusPreviewText(fighter, formId) {
  const form = getSharedCoconutOctopusFormDefinitionForPreview(formId);
  if (!form) return "";

  return (
    "Passive — " +
    (form.passive?.name || "None") +
    "\n" +
    (form.passive?.description || "No passive.") +
    "\n\nSuper — " +
    (form.special?.name || "None") +
    "\n" +
    "Charge: " +
    getSharedCoconutOctopusFormCharge(fighter, formId) +
    "/" +
    getSharedCoconutOctopusFormChargeMax(formId) +
    "\n" +
    (form.special?.description || "No super.")
  );
}

export function renderSharedCoconutOctopusFormPreviewDom(options = {}) {
  const {
    player,
    pendingFormId,
    currentBattle = null,
    isBusy = false,
    isWaiting = false,
    isMultiplayer = false,
    panelId = "octopusFormPreviewPanel",
    titleId = "octopusFormPreviewTitle",
    statsId = "octopusFormPreviewStats",
    textId = "octopusFormPreviewText",
    confirmId = "octopusConfirmFormBtn"
  } = options;

  const panel = document.getElementById(panelId);
  const titleEl = document.getElementById(titleId);
  const statsEl = document.getElementById(statsId);
  const textEl = document.getElementById(textId);
  const confirmBtn = document.getElementById(confirmId);

  if (!panel || !titleEl || !statsEl || !textEl || !confirmBtn) return;

  if (!player || player.id !== "coconut-octopus" || !pendingFormId) {
    panel.style.display = "none";
    return;
  }

  const form = getSharedCoconutOctopusFormDefinitionForPreview(pendingFormId);
  if (!form) {
    panel.style.display = "none";
    return;
  }

  const currentForm = player.octopusForm || "base";
  const charges = player.octopusAdaptationCharges ?? 0;
  const isCurrent = pendingFormId === currentForm;
  const canPay = Boolean(player.octopusFreeTransformationAvailable) || charges > 0;
  const blocked =
    !currentBattle ||
    currentBattle.finished ||
    isBusy ||
    isWaiting ||
    isMultiplayer ||
    isCurrent ||
    !canPay;

  panel.style.display = "block";
  titleEl.textContent = form.name + (isCurrent ? " — Current Form" : " — Preview");
  statsEl.innerHTML = getSharedCoconutOctopusPreviewStatsHtml(form);
  textEl.textContent = getSharedCoconutOctopusPreviewText(player, pendingFormId);

  if (!currentBattle) {
    confirmBtn.textContent = "Preview only — start battle to transform";
  } else if (isCurrent) {
    confirmBtn.textContent = "Already in this form";
  } else if (pendingFormId === "base") {
    confirmBtn.textContent = player.octopusFreeTransformationAvailable
      ? "Confirm Free Return to Base"
      : "Return to Base Form (-1 charge)";
  } else if (player.octopusFreeTransformationAvailable) {
    confirmBtn.textContent = "Confirm Free Transformation";
  } else {
    confirmBtn.textContent = "Confirm Form Change (-1 charge)";
  }

  confirmBtn.disabled = blocked;
}

export function updateSharedCoconutOctopusPanelDom(options = {}) {
  const {
    player,
    pendingFormId = null,
    currentBattle = null,
    isBusy = false,
    isWaiting = false,
    panelId = "octopusAdaptationPanel",
    statusId = "octopusAdaptationStatus"
  } = options;

  const panel = document.getElementById(panelId);
  const statusEl = document.getElementById(statusId);

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
    getSharedCoconutOctopusFormText(player) +
    " · adaptation " +
    charges +
    "/8" +
    freeText +
    "\nSpecial charges: " +
    getSharedCoconutOctopusChargeLine(player);

  document.querySelectorAll(".octopus-form-btn").forEach((btn) => {
    const targetForm = btn.dataset.octopusForm || btn.dataset.onlineOctopusPreview;
    const isCurrent = targetForm === form;
    const isPreview = targetForm === pendingFormId;

    btn.classList.toggle("active", isCurrent);
    btn.classList.toggle("preview", isPreview && !isCurrent);
    btn.disabled = currentBattle ? Boolean(currentBattle.finished || isBusy || isWaiting) : false;
  });
}

export function renderSharedOnlineTournamentOctopusPanel(options = {}) {
  const { fighter, matchId, canAct = false, preview = null } = options;
  if (!fighter || fighter.id !== "coconut-octopus") return "";

  const currentForm = fighter.octopusForm || "base";
  const charges = fighter.octopusAdaptationCharges ?? 0;
  const freeText = fighter.octopusFreeTransformationAvailable ? " · first transformation free" : "";
  const form = preview ? getSharedCoconutOctopusFormDefinitionForPreview(preview) : null;
  const canPay = Boolean(fighter.octopusFreeTransformationAvailable) || charges > 0;

  const previewHtml = form
    ? `<div class="octopus-preview-panel" style="display:block;">
        <div class="octopus-preview-title">${escapeSharedHtml(form.name)}${preview === currentForm ? " — Current Form" : " — Preview"}</div>
        <div class="octopus-preview-stats">${getSharedCoconutOctopusPreviewStatsHtml(form)}</div>
        <div class="octopus-preview-text">${escapeSharedHtml(getSharedCoconutOctopusPreviewText(fighter, preview))}</div>
        <div class="octopus-preview-actions">
          <button type="button" class="octopus-confirm-btn" data-online-octopus-confirm="${escapeSharedHtml(matchId)}" ${!canAct || preview === currentForm || !canPay ? "disabled" : ""}>${preview === "base" ? "Return to Base Form (-1 charge)" : fighter.octopusFreeTransformationAvailable ? "Confirm Free Transformation" : "Confirm Form Change (-1 charge)"}</button>
          <button type="button" class="octopus-cancel-btn" data-online-octopus-cancel="${escapeSharedHtml(matchId)}">Cancel Preview</button>
        </div>
      </div>`
    : "";

  return `<div class="octopus-adaptation-panel" id="octopusAdaptationPanel">
      <div class="octopus-adaptation-title">Coconut Octopus — Stand Phase</div>
      <div class="octopus-adaptation-status">${escapeSharedHtml(getSharedCoconutOctopusFormText(fighter))} · adaptation ${escapeSharedHtml(charges)}/8${escapeSharedHtml(freeText)}
Special charges: ${escapeSharedHtml(getSharedCoconutOctopusChargeLine(fighter))}</div>
      <div class="octopus-adaptation-grid">
        ${SHARED_OCTOPUS_FORM_ORDER.map((formId) => `<button type="button" class="octopus-mini-btn octopus-form-btn ${formId === currentForm ? "active" : ""} ${formId === preview && formId !== currentForm ? "preview" : ""}" data-online-octopus-preview="${escapeSharedHtml(formId)}" data-match-id="${escapeSharedHtml(matchId)}" ${!canAct ? "disabled" : ""}>${escapeSharedHtml(SHARED_OCTOPUS_FORM_BUTTON_LABELS[formId] || formId)}</button>`).join("")}
      </div>
      ${previewHtml}
    </div>`;
}

export const SHARED_SLOTH_COLONIES = [
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

export const SHARED_SLOTH_COLONY_BY_ID = Object.fromEntries(
  SHARED_SLOTH_COLONIES.map((colony) => [colony.id, colony])
);

export function isSharedThreeToedSlothFighter(fighter) {
  return fighter && fighter.id === "three-toed-sloth";
}

export function getSharedSlothActiveColonies(fighter) {
  if (!isSharedThreeToedSlothFighter(fighter)) return [];
  return Array.isArray(fighter.slothActiveColonies) ? fighter.slothActiveColonies : [];
}

export function isSharedSlothDormant(fighter, battle = null, options = {}) {
  if (!isSharedThreeToedSlothFighter(fighter)) return false;
  if (options.preview || fighter.slothPreviewMode) return false;
  if (fighter.slothMicroecosystemActive) return false;
  return Boolean(battle && (battle.biome === "arctic" || battle.biome === "desert"));
}

export function sharedSlothHasColony(fighter, colonyId) {
  return getSharedSlothActiveColonies(fighter).includes(colonyId);
}

export function getSharedSlothBacterialBonusForHitLevel(hitLevel) {
  const level = Math.max(1, Math.min(5, hitLevel || 1));
  switch (level) {
    case 2: return 25;
    case 3: return 50;
    case 4: return 75;
    case 5: return 100;
    default: return 0;
  }
}

export function getSharedSlothBacterialNextHitBonus(fighter) {
  const chain = Math.max(0, Math.min(5, fighter?.slothBacterialChain || 0));
  return getSharedSlothBacterialBonusForHitLevel(Math.min(5, chain + 1));
}

export function getSharedSlothBacterialFollowingHitBonus(fighter) {
  const current = Math.max(0, Math.min(5, fighter?.slothBacterialChain || 0));
  const progressGain = sharedSlothHasColony(fighter, "lichens") ? 2 : 1;
  const afterNextHit = Math.min(5, current + progressGain);
  if (Math.min(5, current + 1) >= 5) return 0;
  return getSharedSlothBacterialBonusForHitLevel(Math.min(5, afterNextHit + 1));
}

export function getSharedSlothBacterialProgressText(fighter, options = {}) {
  const chain = Math.max(0, Math.min(5, fighter?.slothBacterialChain || 0));
  const nextHitBonus = getSharedSlothBacterialNextHitBonus(fighter);
  if (options.compact) {
    return "Chain: " + chain + "/5 · Next hit +" + nextHitBonus + "% · peak resets";
  }
  const followingBonus = getSharedSlothBacterialFollowingHitBonus(fighter);
  return "Chain: " + chain + "/5 · Next hit +" + nextHitBonus + "% · Following +" + followingBonus + "% · peak resets";
}

export function getSharedThreeToedSlothStatusText(fighter, battle = null, options = {}) {
  if (!isSharedThreeToedSlothFighter(fighter)) return "";

  const colonies = getSharedSlothActiveColonies(fighter);
  const colonyText = colonies.length > 0
    ? colonies.map((colonyId) => SHARED_SLOTH_COLONY_BY_ID[colonyId]?.label || colonyId).join(", ")
    : "None";

  const dormant = isSharedSlothDormant(fighter, battle, options);
  const lines = [
    "Living Ecosystem: " +
      (fighter.slothMicroecosystemActive
        ? "MICROECOSYSTEM"
        : dormant
          ? "DORMANT"
          : "ACTIVE"),
    "Active colonies: " + colonyText,
    getSharedSlothBacterialProgressText(fighter)
  ];

  if (sharedSlothHasColony(fighter, "lichens")) {
    lines.push(
      fighter.slothMicroecosystemActive
        ? "Lichens: empowering all colonies."
        : "Lichens: advancing the other colony faster."
    );
  }

  if (fighter.slothMicroecosystemActive) {
    lines.push("Microecosystem Ancestral: " + (fighter.slothMicroecosystemTurns || 0) + " turn(s) left");
  }

  if (dormant) {
    lines.push("Arctic/Desert dormancy: no colonies and no Microecosystem.");
  }

  return lines.join("\n");
}

export function getSharedSlothColonyCurrentEffectText(fighter, colony) {
  const active = sharedSlothHasColony(fighter, colony.id);
  const lichensActive = sharedSlothHasColony(fighter, "lichens");
  const micro = Boolean(fighter?.slothMicroecosystemActive);

  if (colony.id === "bacteria") return getSharedSlothBacterialProgressText(fighter);

  if (colony.id === "lichens") {
    if (!active) return colony.shortEffect || colony.effect;
    return micro ? "Empowering Algae, Fungi, Bacteria and Mites." : "Doubling the other active colony.";
  }

  if (active && lichensActive) return colony.amplified || colony.boosted;
  return colony.shortEffect || colony.effect;
}

export function getSharedSlothMiniStateLabel(active, boosted, dormant) {
  if (active && boosted) return "AMP";
  if (active) return "ACTIVE";
  if (dormant) return "LETARGO";
  return "DORMANT";
}

export function getSharedSlothFullStateLabel(active, boosted, dormant) {
  if (active && boosted) return "AMPLIFIED";
  if (active) return "ACTIVE";
  if (dormant) return "LETARGO";
  return "DORMANT";
}

export function renderSharedSlothColonyChip(fighter, colony, battle = null, options = {}) {
  const active = sharedSlothHasColony(fighter, colony.id);
  const dormant = isSharedSlothDormant(fighter, battle, options);
  const lichensActive = sharedSlothHasColony(fighter, "lichens");
  const boosted = active && lichensActive && colony.id !== "lichens";
  const state = active ? "active" : "inactive";
  const compact = Boolean(options.compact);

  return `
    <div class="sloth-colony-chip ${colony.className} ${state}${dormant ? " dormant" : ""}${boosted ? " boosted" : ""}">
      <div class="sloth-colony-chip-top">
        <span class="sloth-colony-emoji">${colony.emoji}</span>
        <span class="sloth-colony-name">${escapeSharedHtml(compact ? colony.label : colony.fullName)}</span>
      </div>
      <div class="sloth-colony-state">${getSharedSlothMiniStateLabel(active, boosted, dormant)}</div>
    </div>
  `;
}

export function renderSharedSlothEcosystemMiniPanel(fighter, battle = null, options = {}) {
  if (!isSharedThreeToedSlothFighter(fighter)) return "";
  const preview = Boolean(options.preview || (fighter.slothPreviewMode && !battle));
  const dormant = !preview && isSharedSlothDormant(fighter, battle, options);
  const micro = Boolean(fighter.slothMicroecosystemActive);
  const activeCount = getSharedSlothActiveColonies(fighter).length;
  const biome = battle?.biome ? battle.biome.toUpperCase() : "-";
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
          <div class="sloth-ecosystem-subtitle">${escapeSharedHtml(stateSubtext)}</div>
        </div>
        <div class="sloth-ecosystem-badge">${escapeSharedHtml(stateText)}</div>
      </div>
      <div class="sloth-mini-colonies">
        ${SHARED_SLOTH_COLONIES.map((colony) => renderSharedSlothColonyChip(fighter, colony, battle, { ...options, compact: true, preview })).join("")}
      </div>
      <div class="sloth-chain-strip">
        <span>🦠 ${escapeSharedHtml(getSharedSlothBacterialProgressText(fighter, options.compact ? { compact: true } : {}))}</span>
        ${sharedSlothHasColony(fighter, "lichens") ? "<span>🪨 Lichens speed up colony growth</span>" : ""}
      </div>
    </div>
  `;
}

export function renderSharedSlothColonyDetailCard(fighter, colony, battle = null, options = {}) {
  const active = sharedSlothHasColony(fighter, colony.id);
  const dormant = isSharedSlothDormant(fighter, battle, options);
  const lichensActive = sharedSlothHasColony(fighter, "lichens");
  const boosted = active && lichensActive && colony.id !== "lichens";

  return `
    <div class="sloth-modal-colony ${colony.className} ${active ? "active" : "inactive"}${dormant ? " dormant" : ""}${boosted ? " boosted" : ""}">
      <div class="sloth-modal-colony-head">
        <div class="sloth-modal-colony-title">
          <span>${colony.emoji}</span>
          <strong>${escapeSharedHtml(colony.fullName)}</strong>
        </div>
        <div class="sloth-modal-status">${getSharedSlothFullStateLabel(active, boosted, dormant)}</div>
      </div>
      <div class="sloth-modal-colony-effect">${escapeSharedHtml(colony.detail || colony.effect)}</div>
      <div class="sloth-modal-colony-current">${escapeSharedHtml(getSharedSlothColonyCurrentEffectText(fighter, colony))}</div>
      <div class="sloth-modal-colony-boost">${escapeSharedHtml(colony.amplified || colony.boosted)}</div>
    </div>
  `;
}

export function getSharedSlothEcosystemModalContent(fighter, battle = null, options = {}) {
  if (!isSharedThreeToedSlothFighter(fighter)) return { subtitle: "", bodyHtml: "" };

  const preview = Boolean(options.preview || (fighter.slothPreviewMode && !battle));
  const dormant = !preview && isSharedSlothDormant(fighter, battle, options);
  const micro = Boolean(fighter.slothMicroecosystemActive);
  const activeCount = getSharedSlothActiveColonies(fighter).length;
  const biome = preview ? "PRE-BATTLE" : battle?.biome ? battle.biome.toUpperCase() : "-";

  const subtitle = preview
    ? "Pre-battle view: these are the 5 possible colonies. Battle start awakens 2 random colonies unless the biome is Arctic or Desert."
    : micro
      ? "Microecosystem Ancestral active: all colonies are awake for " + (fighter.slothMicroecosystemTurns || 0) + " turn(s)."
      : dormant
        ? "Biome " + biome + ": ecosystem in letargo. No colonies are active and Microecosystem is blocked."
        : "Biome " + biome + ": " + activeCount + "/5 colonies active. Lichens accelerate colony growth when awake.";

  const bodyHtml = `
    <div class="sloth-modal-summary${micro ? " ancestral" : ""}${dormant ? " dormant" : ""}">
      <div>
        <div class="sloth-modal-summary-label">Current State</div>
        <div class="sloth-modal-summary-value">${preview ? "PRE-BATTLE COLONY GUIDE" : micro ? "MICROECOSYSTEM ANCESTRAL" : dormant ? "LETARGO" : "LIVING ECOSYSTEM ACTIVE"}</div>
      </div>
      <div>
        <div class="sloth-modal-summary-label">Bacterial Chain</div>
        <div class="sloth-modal-summary-value">${escapeSharedHtml(getSharedSlothBacterialProgressText(fighter))}</div>
      </div>
      <div>
        <div class="sloth-modal-summary-label">Lichens</div>
        <div class="sloth-modal-summary-value">${
          sharedSlothHasColony(fighter, "lichens")
            ? micro
              ? "Boosting all colonies"
              : "Accelerating the other colony"
            : "Inactive"
        }</div>
      </div>
    </div>

    <div class="sloth-modal-grid">
      ${SHARED_SLOTH_COLONIES.map((colony) => renderSharedSlothColonyDetailCard(fighter, colony, battle, { ...options, preview })).join("")}
    </div>
  `;

  return { subtitle, bodyHtml };
}

export function renderSharedSlothEcosystemModalDom(options = {}) {
  const {
    fighter,
    battle = null,
    bodyId = "slothEcosystemModalBody",
    subtitleId = "slothEcosystemModalSubtitle",
    preview = false
  } = options;

  const body = document.getElementById(bodyId);
  const subtitle = document.getElementById(subtitleId);
  if (!body || !subtitle || !isSharedThreeToedSlothFighter(fighter)) return;

  const content = getSharedSlothEcosystemModalContent(fighter, battle, { preview });
  subtitle.textContent = content.subtitle;
  body.innerHTML = content.bodyHtml;
}

export function getSharedSlothEcosystemButtonState(player, battle = null, options = {}) {
  if (!player || !isSharedThreeToedSlothFighter(player)) {
    return { visible: false, title: "Living Ecosystem", desc: "" };
  }

  const dormant = isSharedSlothDormant(player, battle, options);
  const micro = Boolean(player.slothMicroecosystemActive);
  const activeCount = getSharedSlothActiveColonies(player).length;

  return {
    visible: true,
    title: "Living Ecosystem",
    desc: micro
      ? "All colonies active. " + (player.slothMicroecosystemTurns || 0) + " turn(s) left."
      : dormant
        ? "Ecosystem in letargo. View blocked colonies."
        : activeCount + "/5 colonies active. Open full colony panel."
  };
}

export function updateSharedSlothEcosystemButtonDom(player, battle = null, options = {}) {
  const btn = document.getElementById(options.buttonId || "slothEcosystemBtn");
  const titleEl = document.getElementById(options.titleId || "btn-sloth-title");
  const descEl = document.getElementById(options.descId || "btn-sloth-desc");
  if (!btn || !titleEl || !descEl) return;

  const state = getSharedSlothEcosystemButtonState(player, battle, options);
  btn.style.display = state.visible ? "block" : "none";
  titleEl.textContent = state.title;
  descEl.textContent = state.desc;
}

export function getSharedLarvalDraftTotal(draft = {}) {
  return (draft.attack || 0) + (draft.defense || 0) + (draft.sacrifice || 0);
}

export function getSharedCurrentLarvae(fighter, previewMode = false) {
  if (!fighter || fighter.passive?.id !== "larval-gestation") return 0;
  if (previewMode) return fighter.darwinsMaxLarvae || 5;
  return fighter.darwinsLarvae || 0;
}

export function updateSharedLarvalCommandButtonDom(player, options = {}) {
  const larvalBtn = document.getElementById(options.buttonId || "larvalCommandBtn");
  const titleEl = document.getElementById(options.titleId || "btn-larval-title");
  const descEl = document.getElementById(options.descId || "btn-larval-desc");

  if (!larvalBtn || !titleEl || !descEl) return;

  if (!player || player.passive?.id !== "larval-gestation") {
    larvalBtn.style.display = "none";
    return;
  }

  const larvae = player.darwinsLarvae || 0;
  const maxLarvae = player.darwinsMaxLarvae || 5;

  larvalBtn.style.display = "block";
  titleEl.textContent = "Larval Command";
  descEl.textContent = "Larvae: " + larvae + "/" + maxLarvae + ". Assign larvae to attack, defend or sacrifice.";
}

export function renderSharedLarvalCommandModalDom(options = {}) {
  const {
    fighter,
    draft = { attack: 0, defense: 0, sacrifice: 0 },
    previewMode = false,
    availableTextId = "larvalAvailableText"
  } = options;

  const larvae = getSharedCurrentLarvae(fighter, previewMode);
  const totalUsed = getSharedLarvalDraftTotal(draft);
  const conserved = Math.max(0, larvae - totalUsed);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  const setDisabled = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.disabled = Boolean(value);
  };

  setText(availableTextId, previewMode
    ? "Preview: larvae can be assigned once they exist in battle. Simulate up to " + larvae + "/5."
    : "Larvae available: " + larvae + "/5");

  setText("larvalAttackValue", draft.attack || 0);
  setText("larvalDefenseValue", draft.defense || 0);
  setText("larvalSacrificeValue", draft.sacrifice || 0);
  setText("larvalConserveValue", conserved);

  setDisabled("larvalAttackMinus", (draft.attack || 0) <= 0);
  setDisabled("larvalDefenseMinus", (draft.defense || 0) <= 0);
  setDisabled("larvalSacrificeMinus", (draft.sacrifice || 0) <= 0);

  setDisabled("larvalAttackPlus", totalUsed >= larvae);
  setDisabled("larvalDefensePlus", totalUsed >= larvae || (draft.defense || 0) >= 2);
  setDisabled("larvalSacrificePlus", totalUsed >= larvae);

  const clearBtn = document.getElementById("larvalClearBtn");
  const confirmBtn = document.getElementById("larvalConfirmBtn");

  if (previewMode) {
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

export function getSharedLegendaryExtraResourceHtml(fighter, battle = null) {
  if (isSharedThreeToedSlothFighter(fighter)) {
    return renderSharedSlothEcosystemMiniPanel(fighter, battle);
  }
  return "";
}
