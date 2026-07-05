import {
  canUseAction,
  getEffectiveStat,
  getPrecisionForAction,
  calculateEvasion,
  calculateHitChanceFromValues,
  transformCoconutOctopus,
  setCoconutOctopusPerfectAdaptationChoice
} from "./battle-engine.js";

const ACTION_POOL = ["normal", "quick", "precise", "explosive", "concentration", "special"];
const ATTACK_ACTIONS = ["normal", "quick", "precise", "explosive"];

const OCTOPUS_FORMS = ["base", "offensive", "defensive", "evasive"];
const OCTOPUS_SPECIAL_REQUIREMENTS = {
  base: 4,
  offensive: 6,
  defensive: 5,
  evasive: 4
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ratio(current, max) {
  if (!max || max <= 0) return 0;
  return clamp(current / max, 0, 1);
}

function hpRatio(fighter) {
  return ratio(fighter?.hp || 0, fighter?.maxHp || 1);
}

function staminaRatio(fighter) {
  return ratio(fighter?.stamina || 0, fighter?.maxStamina || 1);
}

function hasEffect(fighter, effectId) {
  return Array.isArray(fighter?.effects) && fighter.effects.some((effect) => effect.id === effectId);
}

function battleHasEffect(battle, effectId, sourceId = null) {
  return Array.isArray(battle?.battleEffects) && battle.battleEffects.some((effect) => {
    if (effect.id !== effectId) return false;
    if (sourceId && effect.sourceId !== sourceId) return false;
    return true;
  });
}

function getOpponent(battle, fighter) {
  if (!battle || !fighter) return null;
  if (battle.fighterA === fighter || battle.fighterA?.id === fighter.id && battle.fighterB !== fighter) {
    return battle.fighterA === fighter ? battle.fighterB : battle.fighterB;
  }
  if (battle.fighterB === fighter || battle.fighterB?.id === fighter.id && battle.fighterA !== fighter) {
    return battle.fighterB === fighter ? battle.fighterA : battle.fighterA;
  }
  return battle.fighterA?.id === fighter.id ? battle.fighterB : battle.fighterA;
}

function getFighterFromKey(battle, fighterOrKey) {
  if (!battle) return null;
  if (fighterOrKey === "A" || fighterOrKey === "fighterA") return battle.fighterA;
  if (fighterOrKey === "B" || fighterOrKey === "fighterB") return battle.fighterB;
  return fighterOrKey;
}

function getSpecialCharge(fighter) {
  if (!fighter) return 0;
  if (fighter.id === "coconut-octopus") {
    const form = getOctopusForm(fighter);
    return fighter.octopusSpecialCharges?.[form] || 0;
  }
  return fighter.specialCharge || 0;
}

function getSpecialRequirement(fighter) {
  if (!fighter?.special) return 0;
  if (fighter.id === "coconut-octopus") {
    return OCTOPUS_SPECIAL_REQUIREMENTS[getOctopusForm(fighter)] || fighter.special.chargeHits || 0;
  }
  return fighter.special.chargeHits || 0;
}

function getOctopusForm(fighter) {
  return fighter?.octopusForm || "base";
}

function getOctopusCharge(fighter, form) {
  return fighter?.octopusSpecialCharges?.[form] || 0;
}

function getOctopusRequirement(form) {
  return OCTOPUS_SPECIAL_REQUIREMENTS[form] || 4;
}

function isOctopusFormReady(fighter, form) {
  return getOctopusCharge(fighter, form) >= getOctopusRequirement(form);
}

function canTransformOctopus(fighter, form) {
  if (!fighter || fighter.id !== "coconut-octopus") return false;
  if (form === "base") return false;
  if (getOctopusForm(fighter) === form) return false;
  if (fighter.octopusFreeTransformationAvailable) return true;
  return (fighter.octopusAdaptationCharges || 0) > 0;
}

function canUseSpecialNow(fighter, battle) {
  return Boolean(fighter?.special && canUseAction(fighter, "special", battle));
}

function estimateHitChance(fighter, defender, action, battle) {
  if (!fighter || !defender) return 50;
  if (!ATTACK_ACTIONS.includes(action)) {
    if (action === "special") {
      const specialId = fighter.special?.id;
      if (specialId === "death-roll" && hasEffect(defender, "bite")) return 100;
      if (specialId === "marine-flash") {
        const precision = getEffectiveStat(fighter, "explosiveness", battle, defender, "special");
        const evasion = calculateEvasion(defender, battle);
        return calculateHitChanceFromValues(precision, evasion);
      }
      if (specialId === "nervous-disruption" || specialId === "neurotoxic-injection") {
        const precision = getEffectiveStat(fighter, "technique", battle, defender, "special");
        const evasion = calculateEvasion(defender, battle);
        return calculateHitChanceFromValues(precision, evasion);
      }
      if (specialId === "throat-bite") {
        const precision = getPrecisionForAction(fighter, defender, "normal", battle);
        const evasion = calculateEvasion(defender, battle);
        return calculateHitChanceFromValues(precision, evasion);
      }
      if (specialId === "deadly-dive") {
        const precision = getPrecisionForAction(fighter, defender, "precise", battle);
        const evasion = calculateEvasion(defender, battle);
        return calculateHitChanceFromValues(precision, evasion);
      }
      if (specialId === "anubis-staff") {
        const precision = getEffectiveStat(fighter, "technique", battle, defender, "special");
        const evasion = calculateEvasion(defender, battle);
        return calculateHitChanceFromValues(precision, evasion);
      }
      return 70;
    }
    return 100;
  }

  const precision = getPrecisionForAction(fighter, defender, action, battle);
  const evasion = calculateEvasion(defender, battle);
  return calculateHitChanceFromValues(precision, evasion);
}

function estimateAttackDamage(fighter, defender, action, battle) {
  const attack = getEffectiveStat(fighter, "attack", battle, defender, action);
  const explosive = getEffectiveStat(fighter, "explosiveness", battle, defender, action);
  const technique = getEffectiveStat(fighter, "technique", battle, defender, action);

  switch (action) {
    case "quick":
      return Math.max(1, Math.round((attack * 0.65) + (getEffectiveStat(fighter, "speed", battle, defender, action) * 0.15)));
    case "precise":
      return Math.max(1, Math.round((attack * 0.75) + (technique * 0.25)));
    case "explosive":
      return Math.max(1, Math.round((attack * 0.75) + (explosive * 0.45)));
    default:
      return Math.max(1, Math.round(attack));
  }
}

function getBestAttackAction(fighter, defender, battle, extraScores = {}) {
  let best = null;

  for (const action of ATTACK_ACTIONS) {
    if (!canUseAction(fighter, action, battle)) continue;

    const hitChance = estimateHitChance(fighter, defender, action, battle);
    const damage = estimateAttackDamage(fighter, defender, action, battle);
    const expected = damage * (hitChance / 100);

    let score = expected;

    if (hitChance >= 75) score += 8;
    if (hitChance < 45) score -= 18;
    if (action === "normal" && staminaRatio(fighter) < 0.35) score += 10;
    if (action === "quick") score += 2;
    if (action === "precise" && hitChance > 70) score += 5;
    if (action === "explosive" && staminaRatio(fighter) > 0.45) score += 7;

    score += extraScores[action] || 0;

    if (!best || score > best.score) {
      best = { action, score, hitChance, damage };
    }
  }

  return best;
}

function isLikelyFinisher(fighter, defender, battle, action = null) {
  if (!defender) return false;
  const best = action
    ? { damage: estimateAttackDamage(fighter, defender, action, battle), hitChance: estimateHitChance(fighter, defender, action, battle) }
    : getBestAttackAction(fighter, defender, battle);

  if (!best) return false;
  return best.damage >= defender.hp || best.damage * (best.hitChance / 100) >= defender.hp * 0.85;
}

function enemyLooksDangerous(enemy, fighter, battle) {
  if (!enemy) return false;
  const attack = getEffectiveStat(enemy, "attack", battle, fighter, "normal");
  const explosive = getEffectiveStat(enemy, "explosiveness", battle, fighter, "explosive");
  return attack + explosive > (fighter?.hp || 0) * 0.28 || getSpecialCharge(enemy) >= getSpecialRequirement(enemy);
}

function getAvailableActions(fighter, battle) {
  return ACTION_POOL.filter((action) => canUseAction(fighter, action, battle));
}

function makeDecision(action, extras = {}) {
  return {
    action,
    larvalCommand: null,
    octopusForm: null,
    coconutPerfectAdaptationChoice: null,
    reason: extras.reason || "",
    ...extras
  };
}

function scoreGeneralSpecial(fighter, defender, battle) {
  if (!canUseSpecialNow(fighter, battle)) return -999;

  const specialId = fighter.special?.id;
  const ownHp = hpRatio(fighter);
  const ownStamina = staminaRatio(fighter);
  const enemyHp = hpRatio(defender);
  const hitChance = estimateHitChance(fighter, defender, "special", battle);
  const finisher = enemyHp < 0.25 || (defender?.hp || 0) < getEffectiveStat(fighter, "attack", battle, defender, "special") * 1.4;

  let score = 60;

  if (finisher) score += 55;
  if (hitChance < 45) score -= 45;
  if (hitChance > 75) score += 15;

  switch (specialId) {
    case "death-roll":
      score += hasEffect(defender, "bite") ? 120 : -85;
      break;
    case "refresh": {
      const humidity = battleHasEffect(battle, "humidity", fighter.id);
      const missingHp = fighter.maxHp - fighter.hp;
      const missingStamina = fighter.maxStamina - fighter.stamina;
      score = 20 + (missingHp * 0.16) + (missingStamina * 0.12);
      if (humidity) score += 70;
      if (missingHp < 40 && missingStamina < 40 && !humidity) score -= 50;
      break;
    }
    case "total-regeneration":
      score = 10 + (fighter.damageTakenLastTurn || 0) * 1.4;
      if (ownHp < 0.45) score += 35;
      if ((fighter.damageTakenLastTurn || 0) <= 20) score -= 70;
      break;
    case "arctic-storm":
      score += battle?.biome === "arctic" ? 45 : 18;
      if (ownHp < 0.3) score += 15;
      break;
    case "illusory-dance":
      score = enemyLooksDangerous(defender, fighter, battle) ? 95 : 45;
      if (ownHp < 0.45) score += 25;
      break;
    case "marine-flash":
      score += hitChance >= 65 ? 45 : -55;
      if (ownHp < 0.25 && hitChance < 70) score -= 35;
      break;
    case "dung-throw":
      score += 35;
      if (getEffectiveStat(defender, "agility", battle, fighter, "normal") > 75) score += 20;
      break;
    case "nervous-disruption":
      score += 50;
      if (defender.special && getSpecialCharge(defender) >= getSpecialRequirement(defender) - 1) score += 35;
      break;
    case "throat-bite": {
      const stacks = fighter.tigerStalkStacks || 0;
      score += stacks >= 3 ? 80 : 25;
      if (enemyHp < 0.45) score += 25;
      if (hitChance < 55 && stacks > 0) score -= 35;
      break;
    }
    case "deadly-dive": {
      const stacks = fighter.falconStacks || 0;
      score += 25 + stacks * 12;
      if (staminaRatio(defender) > 0.45) score += 25;
      if (battle?.biome === "mountain") score += 20;
      if (hitChance < 55 && stacks > 0) score -= 25;
      break;
    }
    case "phantom-current":
      score += 35;
      if (getEffectiveStat(defender, "speed", battle, fighter, "normal") > 75) score += 25;
      break;
    case "looting-burst":
      score += (fighter.macaqueLoot || 0) * 8;
      break;
    case "neurotoxic-injection":
      score += 40;
      if (getEffectiveStat(defender, "speed", battle, fighter, "normal") > 70) score += 20;
      break;
    case "overinflation":
      score = ownHp > 0.35 ? 75 : 40;
      if (defender.hp < fighter.hp) score += 15;
      break;
    case "nocturnal-hunt":
      score += 60;
      break;
    case "ancestral-retreat":
      score = ownHp < 0.55 || enemyLooksDangerous(defender, fighter, battle) ? 95 : 35;
      break;
    case "anubis-staff":
      score += battleHasEffect(battle, "oasis", fighter.id) ? 70 : 25;
      if (ownHp < 0.6 || ownStamina < 0.45) score += 25;
      break;
    case "raptorial-chain":
      score += hitChance >= 62 ? 45 : -20;
      if (enemyHp <= 0.3) score += 35;
      break;
    case "darwinian-expulsion":
      score = (fighter.darwinsLarvae || 0) <= 2 ? 95 : 35;
      if ((fighter.darwinsLarvae || 0) >= 4) score -= 70;
      if (ownHp < 0.25 && (fighter.darwinsLarvae || 0) > 0) score -= 25;
      break;
    case "ancestral-microecosystem":
      if (battle?.biome === "arctic" || battle?.biome === "desert" || fighter.slothMicroecosystemActive) {
        score = -999;
      } else {
        score = 80;
        if (ownHp < 0.6) score += 20;
        if (Array.isArray(fighter.slothActiveColonies) && fighter.slothActiveColonies.includes("bacteria")) score += 15;
      }
      break;
    case "perfect-adaptation":
    case "tentacle-storm":
    case "coconut-fortress":
    case "ink-sea":
      score += 40;
      break;
    default:
      break;
  }

  return score;
}

function buildDarwinsLarvalCommand(fighter, defender, battle) {
  if (fighter.id !== "darwins-frog") return null;

  const larvae = fighter.darwinsLarvae || 0;
  if (larvae <= 0) return null;

  const ownHp = hpRatio(fighter);
  const ownStamina = staminaRatio(fighter);
  const enemyHp = hpRatio(defender);
  const damagePerLarva = Math.max(1, Math.round(fighter.stats.attack * 0.5));

  const command = { attack: 0, defense: 0, sacrifice: 0 };

  if ((fighter.maxHp - fighter.hp >= 70 || fighter.maxStamina - fighter.stamina >= 60) && (ownHp < 0.45 || ownStamina < 0.35)) {
    command.sacrifice = Math.min(larvae, ownHp < 0.25 ? 2 : 1);
  }

  const remainingAfterSacrifice = larvae - command.sacrifice;

  if (remainingAfterSacrifice > 0 && enemyLooksDangerous(defender, fighter, battle) && ownHp < 0.55) {
    command.defense = Math.min(2, remainingAfterSacrifice);
  }

  const remaining = larvae - command.sacrifice - command.defense;

  if (remaining > 0) {
    const larvaeNeededToFinish = Math.ceil((defender?.hp || 0) / damagePerLarva);
    if (larvaeNeededToFinish <= remaining) {
      command.attack = larvaeNeededToFinish;
    } else if (enemyHp < 0.35 && remaining >= 2) {
      command.attack = Math.min(remaining, 2);
    } else if (larvae >= 5 && remaining >= 1) {
      command.attack = 1;
    }
  }

  const total = command.attack + command.defense + command.sacrifice;
  return total > 0 ? command : null;
}

function chooseDarwinsFrogAction(fighter, defender, battle) {
  const larvalCommand = buildDarwinsLarvalCommand(fighter, defender, battle);
  const specialScore = scoreGeneralSpecial(fighter, defender, battle);
  const extra = {};

  if ((fighter.darwinsLarvae || 0) <= 1 && canUseSpecialNow(fighter, battle)) {
    if (specialScore > 30) return makeDecision("special", { larvalCommand, reason: "Generate larvae early." });
  }

  const bestAttack = getBestAttackAction(fighter, defender, battle, extra);
  const concentrationGood = canUseAction(fighter, "concentration", battle) && (staminaRatio(fighter) < 0.45 || hpRatio(fighter) < 0.55);

  if (specialScore > 95) return makeDecision("special", { larvalCommand, reason: "Larvae generation is valuable." });
  if (concentrationGood && !isLikelyFinisher(fighter, defender, battle)) return makeDecision("concentration", { larvalCommand, reason: "Recover while larvae stay available." });
  return makeDecision(bestAttack?.action || fallbackAction(fighter, battle), { larvalCommand, reason: "Darwin larval economy." });
}

function chooseIguanaAction(fighter, defender, battle) {
  const progress = fighter.iguanaProgress || {};
  const humidity = battleHasEffect(battle, "humidity", fighter.id);
  const extra = {};

  if (!humidity) {
    if (!progress.quick) extra.quick = 55;
    if (!progress.precise) extra.precise = 55;
    if (!progress.explosive) extra.explosive = 55;
  }

  const specialScore = scoreGeneralSpecial(fighter, defender, battle);
  if (specialScore > 85) return makeDecision("special", { reason: humidity ? "Empowered Refresh." : "Refresh recovery/debuff." });

  const bestAttack = getBestAttackAction(fighter, defender, battle, extra);
  if (bestAttack) return makeDecision(bestAttack.action, { reason: "Build Suffocating Humidity." });

  return makeDecision(fallbackAction(fighter, battle), { reason: "Iguana fallback." });
}

function chooseFennecAction(fighter, defender, battle) {
  const progress = fighter.fennecMirageProgress || {};
  const oasis = battleHasEffect(battle, "oasis", fighter.id);
  const extra = {};

  if (!oasis) {
    if (!progress.quick) extra.quick = 50;
    if (!progress.explosive) extra.explosive = 45;
  }

  const specialScore = scoreGeneralSpecial(fighter, defender, battle);
  if (specialScore > (oasis ? 70 : 105)) {
    return makeDecision("special", { reason: oasis ? "Use Anubis' Staff inside Oasis." : "Use Anubis' Staff for sustain." });
  }

  if (!oasis && (progress.concentration || 0) < 2 && canUseAction(fighter, "concentration", battle)) {
    const notFinisher = !isLikelyFinisher(fighter, defender, battle);
    if (notFinisher && (hpRatio(fighter) < 0.8 || staminaRatio(fighter) < 0.75 || (progress.quick && progress.explosive))) {
      return makeDecision("concentration", { reason: "Complete Thoth's Mirage." });
    }
  }

  const bestAttack = getBestAttackAction(fighter, defender, battle, extra);
  return makeDecision(bestAttack?.action || fallbackAction(fighter, battle), { reason: "Build Fennec Oasis." });
}

function chooseCaimanAction(fighter, defender, battle) {
  if (canUseSpecialNow(fighter, battle) && hasEffect(defender, "bite")) {
    return makeDecision("special", { reason: "Death Roll on bitten target." });
  }

  const extra = {};
  if (!hasEffect(defender, "bite")) extra.explosive = 75;

  const bestAttack = getBestAttackAction(fighter, defender, battle, extra);
  const specialScore = scoreGeneralSpecial(fighter, defender, battle);

  if (specialScore > 100) return makeDecision("special", { reason: "Death Roll is worth using." });
  return makeDecision(bestAttack?.action || fallbackAction(fighter, battle), { reason: "Prepare Bite before Death Roll." });
}

function chooseThreeToedSlothAction(fighter, defender, battle) {
  const colonies = Array.isArray(fighter.slothActiveColonies) ? fighter.slothActiveColonies : [];
  const dormant = battle?.biome === "arctic" || battle?.biome === "desert";
  const extra = {};

  if (colonies.includes("bacteria")) {
    extra.precise = 35;
    extra.normal = 18;
    extra.quick = 8;
    extra.explosive = -10;
  }

  if (colonies.includes("mites")) {
    extra.explosive = (extra.explosive || 0) + 20;
    extra.quick = (extra.quick || 0) + 12;
    extra.precise = (extra.precise || 0) + 12;
  }

  const specialScore = scoreGeneralSpecial(fighter, defender, battle);
  if (!dormant && specialScore > 90) {
    return makeDecision("special", { reason: "Microecosystem Ancestral has value now." });
  }

  const bestAttack = getBestAttackAction(fighter, defender, battle, extra);
  if (bestAttack) return makeDecision(bestAttack.action, { reason: "Play around active colonies." });

  if (canUseAction(fighter, "concentration", battle)) return makeDecision("concentration", { reason: "Recover while ecosystem works." });
  return makeDecision(fallbackAction(fighter, battle), { reason: "Sloth fallback." });
}

function chooseCoconutOctopusAction(fighter, defender, battle) {
  const currentForm = getOctopusForm(fighter);
  const ownHp = hpRatio(fighter);
  const ownStamina = staminaRatio(fighter);
  const enemyHp = hpRatio(defender);
  const enemyFastTechnical =
    getEffectiveStat(defender, "speed", battle, fighter, "normal") +
    getEffectiveStat(defender, "technique", battle, fighter, "normal") > 155;

  let desiredForm = currentForm;
  let desiredChoice = null;

  if (currentForm === "base" && canUseSpecialNow(fighter, battle)) {
    if (ownHp < 0.45 || ownStamina < 0.35) desiredChoice = "coconut-fortress";
    else if (enemyFastTechnical && !hasEffect(defender, "ink-sea")) desiredChoice = "ink-sea";
    else desiredChoice = "tentacle-storm";

    return makeDecision("special", {
      coconutPerfectAdaptationChoice: desiredChoice,
      reason: "Use Base Perfect Adaptation intelligently."
    });
  }

  if (ownHp < 0.38) {
    desiredForm = "defensive";
  } else if (enemyFastTechnical && !hasEffect(defender, "ink-sea") && ownHp < 0.75) {
    desiredForm = "evasive";
  } else if (enemyHp < 0.5 || hpRatio(fighter) > 0.72) {
    desiredForm = "offensive";
  }

  if (isOctopusFormReady(fighter, "defensive") && ownHp < 0.6) desiredForm = "defensive";
  if (isOctopusFormReady(fighter, "evasive") && enemyFastTechnical && !hasEffect(defender, "ink-sea")) desiredForm = "evasive";
  if (isOctopusFormReady(fighter, "offensive") && enemyHp < 0.65 && ownHp > 0.35) desiredForm = "offensive";

  const canChange = desiredForm !== currentForm && canTransformOctopus(fighter, desiredForm);
  const effectiveForm = canChange ? desiredForm : currentForm;

  let action = null;

  if (isOctopusFormReady(fighter, effectiveForm)) {
    if (effectiveForm === "defensive" && (ownHp < 0.7 || enemyLooksDangerous(defender, fighter, battle))) {
      action = "special";
    } else if (effectiveForm === "evasive" && (!hasEffect(defender, "ink-sea") || enemyFastTechnical)) {
      action = "special";
    } else if (effectiveForm === "offensive" && (enemyHp < 0.7 || isLikelyFinisher(fighter, defender, battle))) {
      action = "special";
    }
  }

  if (!action) {
    const extra = {};
    if (effectiveForm === "offensive") extra.explosive = 50;
    if (effectiveForm === "defensive") {
      extra.precise = 20;
      extra.normal = 15;
    }
    if (effectiveForm === "evasive") {
      extra.quick = 25;
      extra.precise = 20;
    }
    const bestAttack = getBestAttackAction(fighter, defender, battle, extra);
    action = bestAttack?.action || fallbackAction(fighter, battle);
  }

  return makeDecision(action, {
    octopusForm: canChange ? desiredForm : null,
    coconutPerfectAdaptationChoice: desiredChoice,
    reason: "Coconut Octopus form logic."
  });
}

function chooseGenericAnimalAction(fighter, defender, battle) {
  const specialScore = scoreGeneralSpecial(fighter, defender, battle);

  if (specialScore > 100) {
    return makeDecision("special", { reason: "High-value special." });
  }

  const extra = {};

  switch (fighter.passive?.id) {
    case "momentum":
      extra.normal = 20;
      extra.precise = 20;
      extra.explosive = staminaRatio(fighter) > 0.5 ? 12 : -10;
      break;
    case "parasitic-control":
      extra.precise = 30;
      extra.normal = 18;
      extra.quick = 12;
      break;
    case "hunting-inertia": {
      const stacks = fighter.falconStacks || 0;
      extra.precise = 30 + stacks * 6;
      extra.quick = 18;
      extra.explosive = staminaRatio(fighter) > 0.45 ? 10 + stacks * 4 : -8;
      break;
    }
    case "silent-stalk": {
      const stacks = fighter.tigerStalkStacks || 0;
      extra.precise = 22 + stacks * 8;
      extra.normal = 12;
      extra.explosive = stacks >= 2 && staminaRatio(fighter) > 0.45 ? 18 : 0;
      break;
    }
    case "ballistic-impulse":
      extra.explosive = 25;
      break;
    case "lethal-precision":
      extra.precise = 45;
      break;
    default:
      break;
  }

  if (fighter.id === "matamata" && fighter.matamataAmbushReady) {
    extra.explosive = 50;
    extra.precise = 35;
  }

  const bestAttack = getBestAttackAction(fighter, defender, battle, extra);

  if (specialScore > 70 && (!bestAttack || specialScore > bestAttack.score + 25)) {
    return makeDecision("special", { reason: "Special beats normal attacks." });
  }

  if (
    canUseAction(fighter, "concentration", battle) &&
    !isLikelyFinisher(fighter, defender, battle) &&
    (hpRatio(fighter) < 0.45 || staminaRatio(fighter) < 0.32)
  ) {
    return makeDecision("concentration", { reason: "Recover under pressure." });
  }

  return makeDecision(bestAttack?.action || fallbackAction(fighter, battle), { reason: "Generic best scored action." });
}

function fallbackAction(fighter, battle) {
  const available = getAvailableActions(fighter, battle).filter((action) => action !== "special");
  if (available.includes("normal")) return "normal";
  if (available.includes("concentration")) return "concentration";
  return available[0] || "normal";
}

export function chooseAIAction(battle, fighterOrKey, options = {}) {
  const fighter = getFighterFromKey(battle, fighterOrKey);
  const defender = getOpponent(battle, fighter);

  if (!fighter || !defender || battle?.finished) {
    return makeDecision("normal", { reason: "No active battle." });
  }

  let decision;

  switch (fighter.id) {
    case "darwins-frog":
      decision = chooseDarwinsFrogAction(fighter, defender, battle);
      break;
    case "coconut-octopus":
      decision = chooseCoconutOctopusAction(fighter, defender, battle);
      break;
    case "three-toed-sloth":
      decision = chooseThreeToedSlothAction(fighter, defender, battle);
      break;
    case "iguana":
      decision = chooseIguanaAction(fighter, defender, battle);
      break;
    case "fennec":
      decision = chooseFennecAction(fighter, defender, battle);
      break;
    case "caiman":
      decision = chooseCaimanAction(fighter, defender, battle);
      break;
    default:
      decision = chooseGenericAnimalAction(fighter, defender, battle);
      break;
  }

  if (!decision || !decision.action) {
    decision = makeDecision(fallbackAction(fighter, battle), { reason: "Fallback." });
  }

  if (decision.action === "special" && !canUseAction(fighter, "special", battle)) {
    decision.action = fallbackAction(fighter, battle);
  }

  if (!canUseAction(fighter, decision.action, battle)) {
    decision.action = fallbackAction(fighter, battle);
  }

  if (options.debug) {
    decision.debug = {
      fighter: fighter.name,
      hpRatio: hpRatio(fighter),
      staminaRatio: staminaRatio(fighter),
      reason: decision.reason
    };
  }

  return decision;
}

export function applyAICombatDecision(battle, fighterOrKey, decision) {
  const fighter = getFighterFromKey(battle, fighterOrKey);
  if (!fighter || !decision) return decision?.action || "normal";

  if (fighter.id === "darwins-frog") {
    fighter.darwinsLarvalCommand = decision.larvalCommand || null;
  }

  if (fighter.id === "coconut-octopus") {
    if (decision.octopusForm) {
      transformCoconutOctopus(fighter, decision.octopusForm, battle);
    }

    if (decision.coconutPerfectAdaptationChoice) {
      setCoconutOctopusPerfectAdaptationChoice(
        fighter,
        decision.coconutPerfectAdaptationChoice
      );
    }
  }

  return decision.action || fallbackAction(fighter, battle);
}

export function chooseAndApplyAIAction(battle, fighterOrKey, options = {}) {
  const decision = chooseAIAction(battle, fighterOrKey, options);
  const action = applyAICombatDecision(battle, fighterOrKey, decision);

  return {
    ...decision,
    action
  };
}
