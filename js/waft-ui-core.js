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
    line.includes("Reaction Chamber") ||
    line.includes("Valve Release") ||
    line.includes("opens its Reaction Chamber") ||
    line.includes("Hydroquinone") ||
    line.includes("Hydrogen Peroxide") ||
    line.includes("Chain Reaction") ||
    line.includes("true damage") ||
    line.includes("chemical sequence") ||
    line.includes("stored reactants") ||
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
  if (joined.includes("Chain Reaction")) return "Special Triggered";
  if (joined.includes("Reaction Chamber")) return "Passive Triggered";
  if (joined.includes("Hydroquinone") || joined.includes("Hydrogen Peroxide")) return "Passive Triggered";
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


function ensureSharedCoconutOctopusFormButtons(panel) {
  const grid = panel?.querySelector(".octopus-adaptation-grid");
  if (!grid) return;

  const existingForms = Array.from(grid.querySelectorAll(".octopus-form-btn"))
    .map((btn) => btn.dataset.octopusForm || btn.dataset.onlineOctopusPreview || "");

  const alreadyCorrect =
    existingForms.length === SHARED_OCTOPUS_FORM_ORDER.length &&
    SHARED_OCTOPUS_FORM_ORDER.every((formId, index) => existingForms[index] === formId);

  if (alreadyCorrect) return;

  grid.innerHTML = SHARED_OCTOPUS_FORM_ORDER.map((formId) => {
    const label = SHARED_OCTOPUS_FORM_BUTTON_LABELS[formId] || formId;
    return `<button type="button" class="octopus-mini-btn octopus-form-btn" data-octopus-form="${escapeSharedHtml(formId)}">${escapeSharedHtml(label)}</button>`;
  }).join("");
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
  ensureSharedCoconutOctopusFormButtons(panel);

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
  updateSharedBombardierReactionChamberButtonDom(player);

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


let sharedBombardierCurrentFighter = null;

export function isSharedBombardierBeetleFighter(fighter) {
  return Boolean(fighter && fighter.id === "bombardier-beetle");
}

function clampSharedBombardierCount(value, max = 3) {
  return Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
}

function getSharedBombardierValveReductionPercent(count) {
  switch (clampSharedBombardierCount(count)) {
    case 1:
      return 10;
    case 2:
      return 25;
    case 3:
      return 50;
    default:
      return 0;
  }
}

export function getSharedBombardierStoredReactants(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) {
    return { hydroquinone: 0, peroxide: 0 };
  }

  return {
    hydroquinone: clampSharedBombardierCount(fighter.bombardierHydroquinone || 0),
    peroxide: clampSharedBombardierCount(fighter.bombardierPeroxide || 0)
  };
}

export function getSharedBombardierValveRelease(fighter) {
  const stored = getSharedBombardierStoredReactants(fighter);

  return {
    hydroquinone: Math.min(stored.hydroquinone, clampSharedBombardierCount(fighter?.bombardierValveHydroquinone || 0, stored.hydroquinone)),
    peroxide: Math.min(stored.peroxide, clampSharedBombardierCount(fighter?.bombardierValvePeroxide || 0, stored.peroxide))
  };
}

export function setSharedBombardierValveRelease(fighter, hydroquinone, peroxide) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;
  const stored = getSharedBombardierStoredReactants(fighter);

  fighter.bombardierValveHydroquinone = Math.max(0, Math.min(stored.hydroquinone, Math.round(hydroquinone || 0)));
  fighter.bombardierValvePeroxide = Math.max(0, Math.min(stored.peroxide, Math.round(peroxide || 0)));
}

export function clearSharedBombardierValveRelease(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;
  fighter.bombardierValveHydroquinone = 0;
  fighter.bombardierValvePeroxide = 0;
}

export function fillSharedBombardierValveRelease(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;
  const stored = getSharedBombardierStoredReactants(fighter);
  fighter.bombardierValveHydroquinone = stored.hydroquinone;
  fighter.bombardierValvePeroxide = stored.peroxide;
}

export function getSharedBombardierSelectedReactants(fighter) {
  const stored = getSharedBombardierStoredReactants(fighter);
  const valve = getSharedBombardierValveRelease(fighter);
  const remainingHydroquinone = Math.max(0, stored.hydroquinone - valve.hydroquinone);
  const remainingPeroxide = Math.max(0, stored.peroxide - valve.peroxide);

  const selectedHydroquinone = Number.isFinite(fighter?.bombardierSelectedHydroquinone)
    ? Math.max(0, Math.min(remainingHydroquinone, Math.round(fighter.bombardierSelectedHydroquinone)))
    : remainingHydroquinone;

  const selectedPeroxide = Number.isFinite(fighter?.bombardierSelectedPeroxide)
    ? Math.max(0, Math.min(remainingPeroxide, Math.round(fighter.bombardierSelectedPeroxide)))
    : remainingPeroxide;

  return {
    storedHydroquinone: stored.hydroquinone,
    storedPeroxide: stored.peroxide,
    remainingHydroquinone,
    remainingPeroxide,
    hydroquinone: selectedHydroquinone,
    peroxide: selectedPeroxide
  };
}

export function setSharedBombardierSelectedReactants(fighter, hydroquinone, peroxide) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;

  const stored = getSharedBombardierStoredReactants(fighter);
  const valve = getSharedBombardierValveRelease(fighter);

  const rebalanceReactant = (storedValue, valveValue, requestedValue) => {
    const requested = clampSharedBombardierCount(requestedValue, storedValue);
    const currentRemaining = Math.max(0, storedValue - valveValue);
    const neededFromValve = Math.max(0, requested - currentRemaining);
    const newValve = Math.max(0, valveValue - neededFromValve);
    const newRemaining = Math.max(0, storedValue - newValve);

    return {
      valve: newValve,
      selected: Math.min(requested, newRemaining)
    };
  };

  const hydroquinoneBalance = rebalanceReactant(
    stored.hydroquinone,
    valve.hydroquinone,
    hydroquinone
  );

  const peroxideBalance = rebalanceReactant(
    stored.peroxide,
    valve.peroxide,
    peroxide
  );

  fighter.bombardierValveHydroquinone = hydroquinoneBalance.valve;
  fighter.bombardierValvePeroxide = peroxideBalance.valve;
  fighter.bombardierSelectedHydroquinone = hydroquinoneBalance.selected;
  fighter.bombardierSelectedPeroxide = peroxideBalance.selected;
}

export function clearSharedBombardierSelectedReactants(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;
  fighter.bombardierSelectedHydroquinone = 0;
  fighter.bombardierSelectedPeroxide = 0;
}

export function fillSharedBombardierSelectedReactants(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;
  fighter.bombardierSelectedHydroquinone = null;
  fighter.bombardierSelectedPeroxide = null;
}

export function getSharedBombardierReactionPreview(fighter) {
  const stored = getSharedBombardierStoredReactants(fighter);
  const valve = getSharedBombardierValveRelease(fighter);
  const selected = getSharedBombardierSelectedReactants(fighter);
  const attackValue = 80 + selected.hydroquinone * 5;
  const techniqueValue = 80 + selected.peroxide * 5;
  const firstDamage = Math.max(1, Math.round(attackValue * 0.5));
  const growth = Math.max(1, Math.round(attackValue * 0.05));
  const valveAttackReduction = getSharedBombardierValveReductionPercent(valve.hydroquinone);
  const valveTechniqueReduction = getSharedBombardierValveReductionPercent(valve.peroxide);

  return {
    storedHydroquinone: stored.hydroquinone,
    storedPeroxide: stored.peroxide,
    valveHydroquinone: valve.hydroquinone,
    valvePeroxide: valve.peroxide,
    valveAttackReduction,
    valveTechniqueReduction,
    remainingHydroquinone: selected.remainingHydroquinone,
    remainingPeroxide: selected.remainingPeroxide,
    hydroquinone: selected.hydroquinone,
    peroxide: selected.peroxide,
    attackValue,
    techniqueValue,
    firstDamage,
    growth,
    charge: fighter?.specialCharge || 0,
    requirement: fighter?.special?.chargeHits || 6
  };
}

function getSharedBombardierOrbRow(icon, label, current, available, kind, scope, hint) {
  const filled = Array.from({ length: 3 }, (_, index) => {
    const active = index < current;
    const availableOrb = index < available;
    return `
      <span class="bombardier-orb ${kind} ${active ? "active" : ""} ${availableOrb ? "available" : "empty"}">
        <span class="bombardier-orb-shell"></span>
        <span class="bombardier-orb-core"></span>
        <span class="bombardier-orb-vent"></span>
      </span>`;
  }).join("");

  return `
    <div class="bombardier-reactant-unit ${kind}">
      <div class="bombardier-reactant-label"><span>${icon}</span><strong>${escapeSharedHtml(label)}</strong></div>
      <div class="bombardier-reactant-orbs">${filled}</div>
      <div class="bombardier-reactant-count">${escapeSharedHtml(hint)} ${current}/${available}</div>
      <div class="bombardier-reactant-controls">
        <button type="button" data-bombardier-adjust="${scope}:${kind}" data-bombardier-delta="-1">−</button>
        <button type="button" data-bombardier-adjust="${scope}:${kind}" data-bombardier-delta="1">+</button>
      </div>
    </div>
  `;
}

function getSharedBombardierReservoirOrbs(icon, current, kind) {
  return Array.from({ length: 3 }, (_, index) => {
    const active = index < current;
    return `
      <span class="bombardier-reservoir-orb ${kind} ${active ? "active" : "empty"}">
        <span class="bombardier-reservoir-shell"></span>
        <span class="bombardier-reservoir-core"></span>
        <span class="bombardier-reservoir-vent"></span>
      </span>`;
  }).join("");
}

function ensureSharedBombardierReactionChamberDom() {
  if (typeof document === "undefined") return null;

  let modal = document.getElementById("bombardierReactionChamberModal");

  if (!modal) {
    const style = document.createElement("style");
    style.id = "bombardierReactionChamberStyles";
    style.textContent = `

      .bombardier-chamber-btn {
        width: 100%;
        min-height: 84px;
        text-align: left;
        border-radius: 18px;
        border: 1px solid rgba(245,158,11,0.48);
        background:
          radial-gradient(circle at 12% 18%, rgba(248,113,113,.34), transparent 28%),
          radial-gradient(circle at 88% 18%, rgba(96,165,250,.28), transparent 30%),
          linear-gradient(135deg, rgba(31,17,10,.98), rgba(7,15,31,.98));
        color: #fff;
        padding: 12px 13px;
        cursor: pointer;
        box-shadow: inset 0 0 34px rgba(245,158,11,0.08), 0 12px 30px rgba(0,0,0,0.26);
      }
      .bombardier-chamber-btn[disabled] { opacity: 0.45; cursor: default; }
      .bombardier-chamber-subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: .14em; color: #fbbf24; margin-bottom: 4px; font-weight: 900; }
      .bombardier-chamber-title { font-size: 16px; font-weight: 1000; letter-spacing: .02em; }
      .bombardier-chamber-desc { margin-top: 6px; font-size: 11px; line-height: 1.25; color: rgba(255,255,255,.84); }
      .bombardier-modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: radial-gradient(circle at 50% 50%, rgba(15,23,42,.60), rgba(2,6,23,.90));
        backdrop-filter: blur(10px);
        align-items: center;
        justify-content: center;
        padding: 18px;
      }
      .bombardier-modal-backdrop.open { display: flex; }
      .bombardier-modal-card {
        width: min(980px, 96vw);
        max-height: 91vh;
        overflow: auto;
        border-radius: 30px;
        border: 1px solid rgba(180,83,9,.72);
        background:
          radial-gradient(circle at 18% 12%, rgba(190,18,60,.22), transparent 28%),
          radial-gradient(circle at 82% 12%, rgba(37,99,235,.22), transparent 28%),
          radial-gradient(circle at 50% 30%, rgba(245,158,11,.12), transparent 26%),
          linear-gradient(145deg, rgba(13,9,7,.99), rgba(5,10,22,.99));
        box-shadow: 0 34px 92px rgba(0,0,0,.72), inset 0 0 86px rgba(245,158,11,.06);
        color: #f8fafc;
        scrollbar-color: rgba(251,191,36,.45) rgba(15,23,42,.35);
      }
      .bombardier-modal-head {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
        padding: 22px 24px 14px;
        border-bottom: 1px solid rgba(251,191,36,.16);
      }
      .bombardier-modal-kicker { font-size: 11px; color: #fbbf24; text-transform: uppercase; letter-spacing: .20em; font-weight: 1000; }
      .bombardier-modal-title { margin-top: 4px; font-size: 31px; font-weight: 1000; letter-spacing: .01em; }
      .bombardier-modal-subtitle { margin-top: 5px; font-size: 12px; color: #cbd5e1; line-height: 1.35; max-width: 680px; }
      .bombardier-modal-close {
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.08);
        color: #fff;
        border-radius: 999px;
        width: 38px;
        height: 38px;
        font-size: 18px;
        cursor: pointer;
      }
      .bombardier-modal-body { padding: 20px 24px 24px; }
      .bombardier-organ {
        position: relative;
        display: grid;
        grid-template-columns: minmax(210px,1fr) 230px minmax(210px,1fr);
        gap: 18px;
        align-items: center;
        margin-bottom: 18px;
        padding: 18px;
        border-radius: 26px;
        border: 1px solid rgba(251,191,36,.18);
        background:
          linear-gradient(90deg, rgba(127,29,29,.10), transparent 30%, transparent 70%, rgba(30,64,175,.10)),
          rgba(2,6,23,.30);
        overflow: hidden;
      }
      .bombardier-organ::before {
        content: "";
        position:absolute;
        inset: 16px 14%;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(251,191,36,.12), transparent 58%);
        filter: blur(10px);
        pointer-events:none;
      }
      .bombardier-reservoir {
        position: relative;
        min-height: 148px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 32px 32px 24px 24px;
        padding: 15px;
        overflow:hidden;
        background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(15,23,42,.55));
        box-shadow: inset 0 0 42px rgba(0,0,0,.38);
      }
      .bombardier-reservoir::before {
        content: none;
        display: none;
      }
      .bombardier-reservoir.red { box-shadow: inset 0 0 48px rgba(248,113,113,.16), 0 0 28px rgba(127,29,29,.10); }
      .bombardier-reservoir.blue { box-shadow: inset 0 0 48px rgba(96,165,250,.16), 0 0 28px rgba(30,64,175,.10); }
      .bombardier-reservoir-title { position:relative; z-index:1; display:flex; gap:8px; align-items:center; font-size: 15px; font-weight: 1000; letter-spacing:.02em; }
      .bombardier-reservoir-sub { position:relative; z-index:1; margin-top: 7px; font-size: 12px; color:#cbd5e1; line-height:1.35; max-width: 280px; }
      .bombardier-reservoir-orbs { position:relative; z-index:1; display:flex; gap:10px; margin-top: 16px; }
      .bombardier-reservoir-orb {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: inline-block;
        border: 1px solid rgba(255,255,255,.16);
        background: rgba(2,6,23,.70);
        box-shadow: inset 0 0 10px rgba(0,0,0,.45);
      }
      .bombardier-reservoir-orb.active.hydroquinone {
        background: #dc2626;
        border-color: rgba(248,113,113,.85);
        box-shadow: 0 0 10px rgba(248,113,113,.25), inset 0 0 8px rgba(0,0,0,.25);
      }
      .bombardier-reservoir-orb.active.peroxide {
        background: #2563eb;
        border-color: rgba(96,165,250,.85);
        box-shadow: 0 0 10px rgba(96,165,250,.25), inset 0 0 8px rgba(0,0,0,.25);
      }
      .bombardier-reservoir-orb.empty {
        opacity: .35;
      }
      .bombardier-valve-stage {
        position:relative;
        min-height: 178px;
        display:grid;
        place-items:center;
      }
      .bombardier-pipe {
        position:absolute;
        top: 83px;
        height: 15px;
        width: 98px;
        border-radius:999px;
        background: linear-gradient(90deg, rgba(92,44,20,.92), rgba(251,191,36,.38));
        border: 1px solid rgba(251,191,36,.20);
        box-shadow: inset 0 0 12px rgba(0,0,0,.45), 0 0 18px rgba(245,158,11,.16);
      }
      .bombardier-pipe.left { left: -38px; }
      .bombardier-pipe.right { right: -38px; transform: rotate(180deg); }
      .bombardier-valve-core {
        width: 152px;
        height: 152px;
        border-radius: 42% 42% 52% 52%;
        position:relative;
        border: 1px solid rgba(251,191,36,.48);
        background:
          radial-gradient(circle at 50% 54%, rgba(251,191,36,.58), transparent 29%),
          radial-gradient(circle at 36% 34%, rgba(248,113,113,.32), transparent 30%),
          radial-gradient(circle at 64% 34%, rgba(96,165,250,.30), transparent 30%),
          linear-gradient(180deg, rgba(93,56,24,.98), rgba(25,17,11,.99));
        box-shadow: inset 0 0 44px rgba(0,0,0,.52), 0 0 42px rgba(245,158,11,.18);
      }
      .bombardier-valve-core::before, .bombardier-valve-core::after {
        content:"";
        position:absolute;
        width: 20px;
        height: 78px;
        top: 30px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(0,0,0,.40), rgba(251,191,36,.12));
        border: 1px solid rgba(251,191,36,.25);
      }
      .bombardier-valve-core::before { left: 38px; transform: rotate(-12deg); }
      .bombardier-valve-core::after { right: 38px; transform: rotate(12deg); }
      .bombardier-core-label {
        position:absolute;
        left: 50%;
        bottom: 13px;
        transform: translateX(-50%);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing:.13em;
        color:#fef3c7;
        opacity:.82;
        font-weight:1000;
      }
      .bombardier-control-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .bombardier-control-card {
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(15,23,42,.72), rgba(2,6,23,.55));
        padding: 14px;
        box-shadow: inset 0 0 28px rgba(0,0,0,.20);
      }
      .bombardier-control-card.valve { border-color: rgba(251,191,36,.30); }
      .bombardier-control-card.chain { border-color: rgba(96,165,250,.24); }
      .bombardier-control-title { font-size: 15px; font-weight: 1000; letter-spacing:.02em; }
      .bombardier-control-sub { margin-top: 4px; color:#cbd5e1; font-size: 12px; line-height:1.35; }
      .bombardier-reactant-row { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
      .bombardier-reactant-unit {
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        background: rgba(2,6,23,.42);
        padding: 12px;
      }
      .bombardier-reactant-unit.hydroquinone { box-shadow: inset 0 0 26px rgba(248,113,113,.09); }
      .bombardier-reactant-unit.peroxide { box-shadow: inset 0 0 26px rgba(96,165,250,.09); }
      .bombardier-reactant-label { display:flex; gap:8px; align-items:center; font-size: 13px; margin-bottom: 10px; }
      .bombardier-reactant-orbs { display:flex; gap:7px; margin-bottom: 10px; }
      .bombardier-orb {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        display: inline-block;
        background: rgba(15,23,42,.95);
        border: 1px solid rgba(255,255,255,.13);
        opacity: .30;
        box-shadow: inset 0 0 8px rgba(0,0,0,.42);
      }
      .bombardier-orb.available {
        opacity: .55;
      }
      .bombardier-orb.empty {
        opacity: .24;
      }
      .bombardier-orb.active.hydroquinone {
        opacity: 1;
        background: #dc2626;
        border-color: rgba(248,113,113,.9);
        box-shadow: 0 0 8px rgba(248,113,113,.25), inset 0 0 7px rgba(0,0,0,.28);
      }
      .bombardier-orb.active.peroxide {
        opacity: 1;
        background: #2563eb;
        border-color: rgba(96,165,250,.9);
        box-shadow: 0 0 8px rgba(96,165,250,.25), inset 0 0 7px rgba(0,0,0,.28);
      }
      .bombardier-reactant-count { color: #cbd5e1; font-size: 12px; margin-bottom: 10px; }
      .bombardier-reactant-controls { display:flex; gap:8px; }
      .bombardier-reactant-controls button, .bombardier-modal-actions button {
        border: 1px solid rgba(255,255,255,.14);
        background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.045));
        color: #f8fafc;
        border-radius: 12px;
        min-height: 36px;
        padding: 0 12px;
        cursor: pointer;
        font-weight: 900;
      }
      .bombardier-reactant-controls button:hover, .bombardier-modal-actions button:hover { border-color: rgba(251,191,36,.36); background: rgba(251,191,36,.12); }
      .bombardier-reactant-controls button { flex:1; }
      .bombardier-result-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin-top: 12px; }
      .bombardier-result-stat {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(2,6,23,.46);
        border-radius: 14px;
        padding: 10px;
      }
      .bombardier-result-stat span { display:block; font-size: 10px; color:#94a3b8; text-transform: uppercase; letter-spacing: .08em; }
      .bombardier-result-stat strong { display:block; margin-top: 4px; font-size: 20px; }
      .bombardier-modal-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top: 14px; }
      .bombardier-modal-actions .primary { border-color: rgba(251,191,36,.38); background: linear-gradient(180deg, rgba(245,158,11,.20), rgba(146,64,14,.18)); }
      .bombardier-modal-note { color: #cbd5e1; font-size: 12px; line-height: 1.45; margin-top: 14px; }
      .bombardier-organ { grid-template-columns: minmax(240px,1fr) 170px minmax(240px,1fr); }
      .bombardier-valve-stage { min-height: 150px; }
      .bombardier-pipe { display: none; }
      .bombardier-valve-core {
        width: 136px;
        height: 136px;
        border-radius: 48%;
        background:
          radial-gradient(circle at 50% 48%, rgba(251,191,36,.68), transparent 30%),
          radial-gradient(circle at 34% 34%, rgba(248,113,113,.24), transparent 28%),
          radial-gradient(circle at 66% 34%, rgba(96,165,250,.22), transparent 28%),
          linear-gradient(180deg, rgba(82,52,24,.98), rgba(19,14,9,.99));
      }
      .bombardier-valve-core::before, .bombardier-valve-core::after {
        display: none;
      }
      .bombardier-core-label {
        bottom: 18px;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(2,6,23,.42);
        border: 1px solid rgba(251,191,36,.18);
      }
      .bombardier-control-grid { align-items: stretch; }
      .bombardier-control-card {
        display: flex;
        flex-direction: column;
        min-height: 462px;
      }
      .bombardier-reactant-row { align-items: stretch; }
      .bombardier-reactant-unit { display: flex; flex-direction: column; }
      .bombardier-reactant-controls { margin-top: auto; }
      .bombardier-control-card > .bombardier-modal-actions { margin-top: auto; }
      .bombardier-chain-simple {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-top: 12px;
      }
      .bombardier-chain-charge, .bombardier-saved-mix {
        border: 1px solid rgba(255,255,255,.10);
        background:
          radial-gradient(circle at 12% 28%, rgba(96,165,250,.12), transparent 36%),
          rgba(2,6,23,.46);
        border-radius: 14px;
        padding: 12px;
      }
      .bombardier-chain-charge span, .bombardier-saved-mix span {
        display:block;
        font-size: 10px;
        color:#94a3b8;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      .bombardier-chain-charge strong {
        display:block;
        margin-top: 4px;
        font-size: 24px;
      }
      .bombardier-saved-mix strong {
        display:block;
        margin-top: 8px;
        font-size: 18px;
        letter-spacing: .02em;
      }
      @media (max-width: 860px) {
        .bombardier-organ, .bombardier-control-grid, .bombardier-reactant-row, .bombardier-result-grid { grid-template-columns: 1fr; }
        .bombardier-pipe { display:none; }
      }
    `;
    document.head.appendChild(style);

    modal = document.createElement("div");
    modal.id = "bombardierReactionChamberModal";
    modal.className = "bombardier-modal-backdrop";
    modal.innerHTML = `
      <div class="bombardier-modal-card" role="dialog" aria-modal="true" aria-labelledby="bombardierReactionChamberTitle">
        <div class="bombardier-modal-head">
          <div>
            <div class="bombardier-modal-kicker">Brachinus crepitans</div>
            <div class="bombardier-modal-title" id="bombardierReactionChamberTitle">Reaction Chamber</div>
            <div class="bombardier-modal-subtitle">Open the chemical valves: spend reactants now to weaken the enemy, or save them for Chain Reaction.</div>
          </div>
          <button type="button" class="bombardier-modal-close" data-bombardier-close="1">×</button>
        </div>
        <div class="bombardier-modal-body" id="bombardierReactionChamberBody"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.addEventListener("click", (event) => {
      const openBtn = event.target.closest("[data-shared-bombardier-open]");
      if (openBtn) {
        event.preventDefault();
        openSharedBombardierReactionChamberModal(sharedBombardierCurrentFighter);
        return;
      }

      if (event.target.closest("[data-bombardier-close]")) {
        closeSharedBombardierReactionChamberModal();
        return;
      }

      const adjustBtn = event.target.closest("[data-bombardier-adjust]");
      if (adjustBtn && sharedBombardierCurrentFighter) {
        const [scope, kind] = String(adjustBtn.dataset.bombardierAdjust || "").split(":");
        const delta = Number(adjustBtn.dataset.bombardierDelta || 0);

        if (scope === "valve") {
          const selected = getSharedBombardierValveRelease(sharedBombardierCurrentFighter);
          setSharedBombardierValveRelease(
            sharedBombardierCurrentFighter,
            kind === "hydroquinone" ? selected.hydroquinone + delta : selected.hydroquinone,
            kind === "peroxide" ? selected.peroxide + delta : selected.peroxide
          );
        }

        if (scope === "chain") {
          const selected = getSharedBombardierSelectedReactants(sharedBombardierCurrentFighter);
          setSharedBombardierSelectedReactants(
            sharedBombardierCurrentFighter,
            kind === "hydroquinone" ? selected.hydroquinone + delta : selected.hydroquinone,
            kind === "peroxide" ? selected.peroxide + delta : selected.peroxide
          );
        }

        renderSharedBombardierReactionChamberModalDom(sharedBombardierCurrentFighter);
        updateSharedBombardierReactionChamberButtonDom(sharedBombardierCurrentFighter);
        return;
      }

      if (event.target.closest("[data-bombardier-valve-fill]") && sharedBombardierCurrentFighter) {
        fillSharedBombardierValveRelease(sharedBombardierCurrentFighter);
        renderSharedBombardierReactionChamberModalDom(sharedBombardierCurrentFighter);
        updateSharedBombardierReactionChamberButtonDom(sharedBombardierCurrentFighter);
        return;
      }

      if (event.target.closest("[data-bombardier-valve-clear]") && sharedBombardierCurrentFighter) {
        clearSharedBombardierValveRelease(sharedBombardierCurrentFighter);
        renderSharedBombardierReactionChamberModalDom(sharedBombardierCurrentFighter);
        updateSharedBombardierReactionChamberButtonDom(sharedBombardierCurrentFighter);
        return;
      }

      if (event.target.closest("[data-bombardier-chain-fill]") && sharedBombardierCurrentFighter) {
        fillSharedBombardierSelectedReactants(sharedBombardierCurrentFighter);
        renderSharedBombardierReactionChamberModalDom(sharedBombardierCurrentFighter);
        updateSharedBombardierReactionChamberButtonDom(sharedBombardierCurrentFighter);
        return;
      }

      if (event.target.closest("[data-bombardier-chain-clear]") && sharedBombardierCurrentFighter) {
        clearSharedBombardierSelectedReactants(sharedBombardierCurrentFighter);
        renderSharedBombardierReactionChamberModalDom(sharedBombardierCurrentFighter);
        updateSharedBombardierReactionChamberButtonDom(sharedBombardierCurrentFighter);
      }
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeSharedBombardierReactionChamberModal();
    });
  }

  return modal;
}

export function renderSharedBombardierReactionChamberModalDom(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;

  sharedBombardierCurrentFighter = fighter;
  const modal = ensureSharedBombardierReactionChamberDom();
  const body = modal?.querySelector("#bombardierReactionChamberBody");
  if (!body) return;

  const preview = getSharedBombardierReactionPreview(fighter);

  body.innerHTML = `
    <div class="bombardier-organ">
      <div class="bombardier-reservoir red">
        <div class="bombardier-reservoir-title">🔴 Hydroquinone reservoir</div>
        <div class="bombardier-reservoir-sub">Abrasive fuel. Stored only when an offensive hit lands.</div>
        <div class="bombardier-reservoir-orbs">${getSharedBombardierReservoirOrbs("🔴", preview.storedHydroquinone, "hydroquinone")}</div>
      </div>

      <div class="bombardier-valve-stage">
        <div class="bombardier-valve-core"><div class="bombardier-core-label">valves</div></div>
      </div>

      <div class="bombardier-reservoir blue">
        <div class="bombardier-reservoir-title">🔵 Hydrogen Peroxide reservoir</div>
        <div class="bombardier-reservoir-sub">Pressure reagent. Stored through Concentration and released to cut Technique.</div>
        <div class="bombardier-reservoir-orbs">${getSharedBombardierReservoirOrbs("🔵", preview.storedPeroxide, "peroxide")}</div>
      </div>
    </div>

    <div class="bombardier-control-grid">
      <div class="bombardier-control-card valve">
        <div class="bombardier-control-title">Valve Release</div>
        <div class="bombardier-control-sub">Spend reactants before the turn resolves. 1 charge = 10%, 2 = 25%, 3 = 50%. Effect lasts one turn.</div>
        <div class="bombardier-reactant-row">
          ${getSharedBombardierOrbRow("🔴", "Attack valve", preview.valveHydroquinone, preview.storedHydroquinone, "hydroquinone", "valve", "Release")}
          ${getSharedBombardierOrbRow("🔵", "Technique valve", preview.valvePeroxide, preview.storedPeroxide, "peroxide", "valve", "Release")}
        </div>
        <div class="bombardier-result-grid">
          <div class="bombardier-result-stat"><span>Enemy Attack</span><strong>-${preview.valveAttackReduction}%</strong></div>
          <div class="bombardier-result-stat"><span>Enemy Technique</span><strong>-${preview.valveTechniqueReduction}%</strong></div>
        </div>
        <div class="bombardier-modal-actions">
          <button class="primary" type="button" data-bombardier-valve-fill="1">Open all valves</button>
          <button type="button" data-bombardier-valve-clear="1">Seal valves</button>
        </div>
      </div>

      <div class="bombardier-control-card chain">
        <div class="bombardier-control-title">Chain Reaction mix</div>
        <div class="bombardier-control-sub">Choose how many remaining reactants are saved for the special. If untouched, it uses all remaining reactants.</div>
        <div class="bombardier-reactant-row">
          ${getSharedBombardierOrbRow("🔴", "Reaction Attack", preview.hydroquinone, preview.remainingHydroquinone, "hydroquinone", "chain", "Mix")}
          ${getSharedBombardierOrbRow("🔵", "Reaction Technique", preview.peroxide, preview.remainingPeroxide, "peroxide", "chain", "Mix")}
        </div>
        <div class="bombardier-chain-simple">
          <div class="bombardier-chain-charge">
            <span>Chain charge</span>
            <strong>${preview.charge}/${preview.requirement}</strong>
          </div>
          <div class="bombardier-saved-mix">
            <span>Saved for Chain Reaction</span>
            <strong>🔴 ${preview.hydroquinone}/${preview.remainingHydroquinone} · 🔵 ${preview.peroxide}/${preview.remainingPeroxide}</strong>
          </div>
        </div>
        <div class="bombardier-modal-actions">
          <button class="primary" type="button" data-bombardier-chain-fill="1">Use remaining mix</button>
          <button type="button" data-bombardier-chain-clear="1">Base reaction</button>
        </div>
      </div>
    </div>


    <div class="bombardier-modal-actions">
      <button type="button" data-bombardier-close="1">Done</button>
    </div>
  `;
}

export function openSharedBombardierReactionChamberModal(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return;

  const modal = ensureSharedBombardierReactionChamberDom();
  renderSharedBombardierReactionChamberModalDom(fighter);
  modal?.classList.add("open");
}

export function closeSharedBombardierReactionChamberModal() {
  const modal = document.getElementById("bombardierReactionChamberModal");
  if (modal) modal.classList.remove("open");
}

export function updateSharedBombardierReactionChamberButtonDom(player, options = {}) {
  if (typeof document === "undefined") return;

  const buttonId = options.buttonId || "bombardierReactionChamberBtn";
  const anchorId = options.anchorId || "specialActionBtn";
  const anchor = document.getElementById(anchorId);

  let button = document.getElementById(buttonId);

  if (!button && anchor) {
    button = document.createElement("button");
    button.type = "button";
    button.id = buttonId;
    button.className = "bombardier-chamber-btn";
    button.setAttribute("data-shared-bombardier-open", "1");
    button.innerHTML = `
      <div class="bombardier-chamber-subtitle">Reaction Chamber</div>
      <div class="bombardier-chamber-title" id="btn-bombardier-title">Chemical Valves</div>
      <div class="bombardier-chamber-desc" id="btn-bombardier-desc">Open valves, weaken the enemy, or prime Chain Reaction.</div>
    `;
    anchor.insertAdjacentElement("afterend", button);
  }

  ensureSharedBombardierReactionChamberDom();

  if (!button) return;

  if (!isSharedBombardierBeetleFighter(player)) {
    button.style.display = "none";
    button.disabled = true;
    if (sharedBombardierCurrentFighter === player) sharedBombardierCurrentFighter = null;
    return;
  }

  sharedBombardierCurrentFighter = player;
  const preview = getSharedBombardierReactionPreview(player);

  button.style.display = "block";
  button.disabled = false;
  const title = button.querySelector("#btn-bombardier-title");
  const desc = button.querySelector("#btn-bombardier-desc");

  if (title) title.textContent = `Chemical Valves · ${preview.charge}/${preview.requirement}`;
  if (desc) {
    desc.textContent = `Stored 🔴 ${preview.storedHydroquinone}/3 🔵 ${preview.storedPeroxide}/3 · Valve: -${preview.valveAttackReduction}% ATK / -${preview.valveTechniqueReduction}% TEC · Chain first ${preview.firstDamage}.`;
  }
}

export function renderSharedBombardierReactionChamberPanel(fighter) {
  if (!isSharedBombardierBeetleFighter(fighter)) return "";

  sharedBombardierCurrentFighter = fighter;
  ensureSharedBombardierReactionChamberDom();

  const preview = getSharedBombardierReactionPreview(fighter);

  return `
    <button type="button" class="legendary-extra-card bombardier-reaction-card" data-shared-bombardier-open="1">
      <div class="legendary-extra-header">
        <div>
          <div class="legendary-extra-title">🧪 Reaction Chamber</div>
          <div class="legendary-extra-subtitle">Valve Release + Chain Reaction</div>
        </div>
        <div class="legendary-extra-badge">${preview.charge}/${preview.requirement}</div>
      </div>
      <div class="legendary-extra-grid">
        <div class="legendary-extra-stat"><span>Stored 🔴</span><strong>${preview.storedHydroquinone}/3</strong></div>
        <div class="legendary-extra-stat"><span>Stored 🔵</span><strong>${preview.storedPeroxide}/3</strong></div>
        <div class="legendary-extra-stat"><span>Valve Attack</span><strong>-${preview.valveAttackReduction}%</strong></div>
        <div class="legendary-extra-stat"><span>Valve Technique</span><strong>-${preview.valveTechniqueReduction}%</strong></div>
      </div>
      <div class="legendary-extra-note">Open chamber · Valve Release lasts one turn · Chain first discharge ${preview.firstDamage} true damage.</div>
    </button>
  `;
}

export function getSharedLegendaryExtraResourceHtml(fighter, battle = null) {
  if (isSharedThreeToedSlothFighter(fighter)) {
    return renderSharedSlothEcosystemMiniPanel(fighter, battle);
  }

  if (isSharedBombardierBeetleFighter(fighter)) {
    return renderSharedBombardierReactionChamberPanel(fighter);
  }

  return "";
}
