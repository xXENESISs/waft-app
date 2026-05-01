import { animals } from "./animals.js";
import {
  addEffect,
  getStackedModifierPercent,
  createBleedEffect,
  createAgilityDownEffect,
  createBiteEffect,
  createFalconDebuffEffect,
  createMutilationEffect,
  addBattleEffect,
  createHailEffect,
  createHumidityEffect,
  processFighterTurnEndEffects,
  tickFighterEffects,
  processBattleEffectsTurnEnd,
  canConcentrateUnderEffects
} from "./effects.js";

const ACTIONS = {
  normal: {
    name: "Normal Attack",
    staminaCost: 5,
    priority: 1
  },
  quick: {
    name: "Quick Attack",
    staminaCost: 20,
    priority: 3
  },
  precise: {
    name: "Precise Attack",
    staminaCost: 20,
    priority: 1
  },
  explosive: {
    name: "Explosive Attack",
    staminaCost: 30,
    priority: 1
  },
  concentration: {
    name: "Concentration",
    staminaCost: 0,
    priority: 4
  },
  special: {
    name: "Special Attack",
    staminaCost: 0,
    priority: 1
  }
};

const BIOMES = ["arctic", "desert", "jungle", "forest", "marine", "mountain"];
const BIOME_AFFECTABLE_STATS = [
  "attack",
  "defense",
  "speed",
  "agility",
  "technique",
  "explosiveness"
];

const BIOME_ROTATION_TURNS = 7;

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function createFighter(id) {
  const animal = animals[id];

  if (!animal) {
    throw new Error(`Unknown animal id: ${id}`);
  }

  return {
    id: animal.id,
    name: animal.name,
    category: animal.category,

    hp: animal.stats.life * 10,
    maxHp: animal.stats.life * 10,

    stamina: animal.stats.resistance * 4,
    maxStamina: animal.stats.resistance * 4,

    stats: { ...animal.stats },
    biomes: animal.biomes ? { ...animal.biomes } : null,

    passive: animal.passive ?? null,
    special: animal.special ?? null,

    effects: [],
    alive: true,

    concentratedLastTurn: false,
    concentrationActive: false,

    fatigueTier: 0,

    specialCharge: 0,
    specialReadyAnnounced: false,

    overinflationUses: 4,
    overinflationActive: false,
    overinflationUsedLastTurn: false,
    overinflationUsedThisTurn: false,
    residualNeurotoxinActive: false,

    arcticStormPermanentSpeed: false,

    illusoryDanceActive: false,
    illusoryDanceBuffReady: false,

    momentumStacks: 0,

    damageTakenThisTurn: 0,
    damageTakenLastTurn: 0,

    parasiticControlHits: 0,
    parasiticControlActive: false,
    nervousDisruptionActive: false,

    falconStacks: 0,
    tempAccuracyLockTurns: 0,

    phantomCurrentActive: false,

    macaqueHitChain: 0,
    macaqueLoot: 0,

    iguanaProgress: {
      quick: false,
      precise: false,
      explosive: false
    }
  };
}

export function createBattle(idA, idB) {
  const battle = {
    fighterA: createFighter(idA),
    fighterB: createFighter(idB),

    biome: null,
    biomeStat: null,

    turn: 1,
    finished: false,
    winner: null,
    log: [],

    battleEffects: []
  };

  applyRandomBiomeModifier(battle, "selected");
  return battle;
}

export function addLog(battle, message) {
  battle.log.push(message);
}

function getBiomeModifierForFighter(fighter, biome) {
  if (!fighter.biomes) return 1;

  if (fighter.biomes.favorable?.includes(biome)) return 1.1;
  if (fighter.biomes.unfavorable?.includes(biome)) return 0.9;
  return 1;
}

function applyRandomBiomeModifier(battle, reason = "selected") {
  const biome = randomChoice(BIOMES);
  const stat = randomChoice(BIOME_AFFECTABLE_STATS);

  battle.biome = biome;
  battle.biomeStat = stat;

  const modA = getBiomeModifierForFighter(battle.fighterA, biome);
  const modB = getBiomeModifierForFighter(battle.fighterB, biome);

  addLog(
    battle,
    `Biome ${reason}: ${biome.toUpperCase()}. Modified stat: ${stat.toUpperCase()}.`
  );

  const relationA =
    modA > 1 ? "favorable" : modA < 1 ? "unfavorable" : "neutral";
  const relationB =
    modB > 1 ? "favorable" : modB < 1 ? "unfavorable" : "neutral";

  addLog(
    battle,
    `${battle.fighterA.name}: ${relationA} biome → ${stat} ${modA > 1 ? "+10%" : modA < 1 ? "-10%" : "0%"}.`
  );

  addLog(
    battle,
    `${battle.fighterB.name}: ${relationB} biome → ${stat} ${modB > 1 ? "+10%" : modB < 1 ? "-10%" : "0%"}.`
  );
}

function rotateBiomeIfNeeded(battle) {
  if (battle.finished) return;
  if (battle.turn % BIOME_ROTATION_TURNS !== 0) return;

  addLog(
    battle,
    `The battlefield shifts after turn ${battle.turn}.`
  );

  applyRandomBiomeModifier(battle, "changed");
}

function getFatigueTier(fighter) {
  const ratio = fighter.stamina / fighter.maxStamina;

  if (ratio <= 0.10) return 3;
  if (ratio <= 0.25) return 2;
  if (ratio <= 0.50) return 1;
  return 0;
}

function getFatigueMultiplier(fighter) {
  switch (getFatigueTier(fighter)) {
    case 1:
      return 0.9;
    case 2:
      return 0.8;
    case 3:
      return 0.5;
    default:
      return 1;
  }
}

function updateFatigueState(fighter, battle) {
  const newTier = getFatigueTier(fighter);

  if (newTier === fighter.fatigueTier) return;

  fighter.fatigueTier = newTier;

  if (newTier === 1) {
    addLog(
      battle,
      `${fighter.name} has fallen below 50% stamina and suffers moderate fatigue (−10%).`
    );
  } else if (newTier === 2) {
    addLog(
      battle,
      `${fighter.name} has fallen below 25% stamina and suffers heavy fatigue (−20%).`
    );
  } else if (newTier === 3) {
    addLog(
      battle,
      `${fighter.name} has fallen below 10% stamina and suffers critical fatigue (−50%).`
    );
  } else {
    addLog(
      battle,
      `${fighter.name} has recovered above fatigue thresholds.`
    );
  }
}

function getPassiveBonuses(attacker, defender, battle, actionType) {
  const bonuses = {
    speedPct: 0,
    precisionPct: 0,
    explosiveDamagePct: 0
  };

  if (
    attacker.passive?.id === "feline-instinct" &&
    defender.stamina < defender.maxStamina * 0.5
  ) {
    bonuses.speedPct += 10;
    bonuses.precisionPct += 10;

    if (actionType === "explosive") {
      bonuses.explosiveDamagePct += 25;
    }
  }

  return bonuses;
}

function battleHasEffect(battle, effectId) {
  return battle.battleEffects.some((effect) => effect.id === effectId);
}

function fighterHasEffect(fighter, effectId) {
  return fighter.effects.some((effect) => effect.id === effectId);
}

function getDerivedModifierPercent(fighter, key) {
  return getStackedModifierPercent(fighter, key);
}

function getMomentumAttackBonusPercent(attacker) {
  if (attacker.passive?.id !== "momentum") return 0;
  const bonusTable = [0, 5, 10, 15, 20];
  return bonusTable[attacker.momentumStacks] ?? 0;
}

function increaseMomentum(attacker, battle) {
  if (attacker.passive?.id !== "momentum") return;

  const before = attacker.momentumStacks;
  attacker.momentumStacks = Math.min(attacker.momentumStacks + 1, 4);

  const bonusTable = [0, 5, 10, 15, 20];

  if (attacker.momentumStacks > before) {
    addLog(
      battle,
      `${attacker.name}'s Momentum rises to +${bonusTable[attacker.momentumStacks]}% Attack.`
    );
  } else if (attacker.momentumStacks === 4) {
    addLog(
      battle,
      `${attacker.name}'s Momentum remains at maximum (+20% Attack).`
    );
  }
}

function resetMomentum(attacker, battle, reason = "") {
  if (attacker.passive?.id !== "momentum") return;
  if (attacker.momentumStacks <= 0) return;

  attacker.momentumStacks = 0;

  if (reason) {
    addLog(battle, `${attacker.name}'s Momentum resets (${reason}).`);
  } else {
    addLog(battle, `${attacker.name}'s Momentum resets.`);
  }
}

function increaseParasiticControlHits(attacker, defender, battle) {
  if (attacker.passive?.id !== "parasitic-control") return;

  attacker.parasiticControlHits += 1;

  addLog(
    battle,
    `${attacker.name}'s Parasitic Control chain rises to ${attacker.parasiticControlHits}/3.`
  );

  if (attacker.parasiticControlHits >= 3) {
    attacker.parasiticControlHits = 0;
    defender.parasiticControlActive = true;

    addLog(
      battle,
      `${attacker.name}'s Parasitic Control disrupts ${defender.name}: next turn, no Concentration or Special Attack, and 50% chance to hit itself.`
    );
  }
}

function resetParasiticControlHits(attacker, battle, reason = "") {
  if (attacker.passive?.id !== "parasitic-control") return;
  if (attacker.parasiticControlHits <= 0) return;

  attacker.parasiticControlHits = 0;

  if (reason) {
    addLog(
      battle,
      `${attacker.name}'s Parasitic Control chain resets (${reason}).`
    );
  } else {
    addLog(
      battle,
      `${attacker.name}'s Parasitic Control chain resets.`
    );
  }
}

function getFalconDamageBonusPercent(attacker) {
  if (attacker.passive?.id !== "hunting-inertia") return 0;
  return attacker.falconStacks * 10;
}

function increaseFalconStacks(attacker, battle) {
  if (attacker.passive?.id !== "hunting-inertia") return;

  const before = attacker.falconStacks;
  attacker.falconStacks = Math.min(attacker.falconStacks + 1, 3);

  if (attacker.falconStacks > before) {
    const bonusPct = attacker.falconStacks * 10;

    addLog(
      battle,
      `${attacker.name}'s Hunting Inertia rises to ${attacker.falconStacks} stack(s) (+${bonusPct}% damage).`
    );
  }
}

function resetFalconStacks(attacker, battle, reason = "") {
  if (attacker.passive?.id !== "hunting-inertia") return;
  if (attacker.falconStacks === 0) return;

  attacker.falconStacks = 0;

  addLog(
    battle,
    `${attacker.name}'s Hunting Inertia resets${reason ? ` (${reason})` : ""}.`
  );
}

function getMacaqueStealAmount(chainCount) {
  const stealTable = [5, 10, 15, 20, 25, 30];
  return stealTable[Math.min(chainCount - 1, 5)];
}

function increaseMacaqueChain(attacker, defender, battle) {
  if (attacker.passive?.id !== "persistent-harassment") return;

  attacker.macaqueHitChain += 1;

  const intendedSteal = getMacaqueStealAmount(attacker.macaqueHitChain);
  const actualSteal = Math.min(intendedSteal, defender.stamina);

  if (actualSteal > 0) {
    spendStamina(defender, actualSteal, battle);
    attacker.macaqueLoot += actualSteal;
  }

  addLog(
    battle,
    `${attacker.name}'s Persistent Harassment chain rises to ${attacker.macaqueHitChain}. It steals ${actualSteal} stamina and stores ${attacker.macaqueLoot} loot.`
  );
}

function resetMacaqueChain(attacker, battle, reason = "") {
  if (attacker.passive?.id !== "persistent-harassment") return;
  if (attacker.macaqueHitChain === 0) return;

  attacker.macaqueHitChain = 0;

  addLog(
    battle,
    `${attacker.name}'s Persistent Harassment chain resets${reason ? ` (${reason})` : ""}.`
  );
}

function humidityIsActive(fighter) {
  return fighterHasEffect(fighter, "humidity");
}

function addHumidityEffect(fighter, battle) {
  addEffect(fighter, createHumidityEffect(3), battle);
}

function resetIguanaProgress(attacker) {
  attacker.iguanaProgress.quick = false;
  attacker.iguanaProgress.precise = false;
  attacker.iguanaProgress.explosive = false;
}

function handleIguanaPassive(attacker, actionType, battle) {
  if (attacker.passive?.id !== "suffocating-humidity") return;
  if (humidityIsActive(attacker)) return;

  if (actionType === "quick") {
    attacker.iguanaProgress.quick = true;
    addLog(battle, `${attacker.name} fulfills Humidity requirement: Quick Attack.`);
  }

  if (actionType === "precise") {
    attacker.iguanaProgress.precise = true;
    addLog(battle, `${attacker.name} fulfills Humidity requirement: Precise Attack.`);
  }

  if (actionType === "explosive") {
    attacker.iguanaProgress.explosive = true;
    addLog(battle, `${attacker.name} fulfills Humidity requirement: Explosive Attack.`);
  }

  if (
    attacker.iguanaProgress.quick &&
    attacker.iguanaProgress.precise &&
    attacker.iguanaProgress.explosive
  ) {
    addHumidityEffect(attacker, battle);
    addLog(
      battle,
      `${attacker.name} activates Suffocating Humidity for 3 turns.`
    );
    resetIguanaProgress(attacker);
  }
}

function calculateSelfHitDamage(fighter, battle, multiplier = 1) {
  const damageInfo = calculateDamageWithDefenseFactor(
    fighter,
    fighter,
    battle,
    1,
    "special"
  );

  return Math.max(1, Math.round(damageInfo.damage * multiplier));
}

function resolveMindControlTurn(fighter, battle) {
  if (fighter.nervousDisruptionActive) {
    const selfDamage = calculateSelfHitDamage(fighter, battle, 1);

    applyDamage(fighter, selfDamage);

    addLog(
      battle,
      `${fighter.name} is affected by Nervous Disruption and hits itself for ${selfDamage} damage.`
    );

    fighter.nervousDisruptionActive = false;
    fighter.parasiticControlActive = false;
    return true;
  }

  if (fighter.parasiticControlActive) {
    const selfHit = Math.random() < 0.5;

    if (selfHit) {
      const selfDamage = calculateSelfHitDamage(fighter, battle, 1);

      applyDamage(fighter, selfDamage);

      addLog(
        battle,
        `${fighter.name} is affected by Parasitic Control and hits itself for ${selfDamage} damage.`
      );

      fighter.parasiticControlActive = false;
      return true;
    }
  }

  return false;
}

function consumeOneTurnControlState(fighter, battle) {
  if (fighter.parasiticControlActive) {
    fighter.parasiticControlActive = false;
    addLog(
      battle,
      `${fighter.name} breaks free from Parasitic Control.`
    );
  }

  if (fighter.nervousDisruptionActive) {
    fighter.nervousDisruptionActive = false;
  }
}

function performMarineEcho(attacker, defender, battle) {
  if (attacker.passive?.id !== "marine-echo") return;
  if (!attacker.alive || !defender.alive) return;
  if (attacker.phantomCurrentActive) return;

  const chance = battle.biome === "marine" ? 0.5 : 0.2;

  if (Math.random() >= chance) return;

  const precision = getEffectiveStat(attacker, "speed", battle, defender, "passive");
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name}'s Marine Echo triggers, but the second hit misses ${defender.name}.`
    );
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "passive"
  );

  const damage = damageInfo.damage;

  applyDamage(defender, damage);

  addLog(
    battle,
    `${attacker.name}'s Marine Echo triggers: second hit deals ${damage} damage.`
  );
}

function resolvePhantomCurrentStrike(fighter, opponent, battle) {
  if (!fighter.phantomCurrentActive) return;
  if (!fighter.alive || !opponent.alive) {
    fighter.phantomCurrentActive = false;
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    fighter,
    opponent,
    battle,
    1,
    "special"
  );

  const damage = Math.max(1, Math.round(damageInfo.damage * 2));

  applyDamage(opponent, damage);

  addLog(
    battle,
    `${fighter.name} strikes from Phantom Current for ${damage} damage.`
  );

  fighter.phantomCurrentActive = false;
}

function isQuickAttackBlocked(fighter) {
  return fighter.effects.some(
    (effect) => effect.restrictions?.canUseQuickAttack === false
  );
}

function createResidualNeurotoxinEffect(duration = 2) {
  return {
    id: "residual-neurotoxin",
    name: "Residual Neurotoxin",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      speedPct: -10,
      techniquePct: -10,
      evasionPct: -10
    }
  };
}

function createTetrodotoxinEffect(duration = 2) {
  return {
    id: "tetrodotoxin",
    name: "Tetrodotoxin",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      techniquePct: -25,
      agilityPct: -25,
      speedPct: -25
    }
  };
}

export function getEffectiveStat(fighter, stat, battle, opponent = null, actionType = null) {
  let value = fighter.stats[stat];

  if (
    battle &&
    stat === battle.biomeStat &&
    ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(stat)
  ) {
    value *= getBiomeModifierForFighter(fighter, battle.biome);
  }

  const ignoresFatigue = fighter.passive?.id === "savage-endurance";

  if (
    !ignoresFatigue &&
    ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(stat)
  ) {
    value *= getFatigueMultiplier(fighter);
  }

  const directStatModifier = getDerivedModifierPercent(fighter, `${stat}Pct`);
  if (directStatModifier !== 0) {
    value *= 1 + directStatModifier / 100;
  }

  if (
    fighter.passive?.id === "savage-endurance" &&
    fighter.hp < fighter.maxHp * 0.25
  ) {
    if (stat === "attack") value *= 1.2;
    if (stat === "explosiveness") value *= 1.2;
  }

  if (stat === "attack") {
    const momentumBonusPct = getMomentumAttackBonusPercent(fighter);
    if (momentumBonusPct > 0) {
      value *= 1 + momentumBonusPct / 100;
    }

    const falconBonusPct = getFalconDamageBonusPercent(fighter);
    if (falconBonusPct > 0) {
      value *= 1 + falconBonusPct / 100;
    }
  }

  if (
  fighter.concentrationActive &&
  (stat === "defense" || stat === "agility")
) {
  value *= 1.1;
}

  if (stat === "speed" && fighter.special?.id === "arctic-storm") {
    if (
      battle.biome === "arctic" ||
      fighter.arcticStormPermanentSpeed ||
      (fighter.id === "walrus" && battleHasEffect(battle, "hail"))
    ) {
      value *= 2;
    }
  }

  if (opponent) {
    const passiveBonuses = getPassiveBonuses(fighter, opponent, battle, actionType);

    if (stat === "speed") {
      value *= 1 + passiveBonuses.speedPct / 100;
    }
  }

  return value;
}

export function calculateNormalPrecision(fighter, opponent, battle) {
  let value =
    getEffectiveStat(fighter, "technique", battle, opponent, "normal") * 0.8 +
    getEffectiveStat(fighter, "speed", battle, opponent, "normal") * 0.2;

  const passiveBonuses = getPassiveBonuses(fighter, opponent, battle, "normal");
  value *= 1 + passiveBonuses.precisionPct / 100;
  value *= 1 + getDerivedModifierPercent(fighter, "precisionPct") / 100;

  return value;
}

export function calculateQuickPrecision(fighter, opponent, battle) {
  let value =
    getEffectiveStat(fighter, "agility", battle, opponent, "quick") * 0.6 +
    getEffectiveStat(fighter, "technique", battle, opponent, "quick") * 0.2 +
    getEffectiveStat(fighter, "speed", battle, opponent, "quick") * 0.2;

  const passiveBonuses = getPassiveBonuses(fighter, opponent, battle, "quick");
  value *= 1 + passiveBonuses.precisionPct / 100;
  value *= 1 + getDerivedModifierPercent(fighter, "precisionPct") / 100;

  return value;
}

export function calculatePrecisePrecision(fighter, opponent, battle) {
  let value =
    getEffectiveStat(fighter, "technique", battle, opponent, "precise") * 0.9 +
    getEffectiveStat(fighter, "speed", battle, opponent, "precise") * 0.1;

  const passiveBonuses = getPassiveBonuses(fighter, opponent, battle, "precise");
  value *= 1 + passiveBonuses.precisionPct / 100;
  value *= 1 + getDerivedModifierPercent(fighter, "precisionPct") / 100;

  return value;
}

export function calculateExplosivePrecision(fighter, opponent, battle) {
  let value =
    getEffectiveStat(fighter, "explosiveness", battle, opponent, "explosive") * 0.6 +
    getEffectiveStat(fighter, "technique", battle, opponent, "explosive") * 0.2 +
    getEffectiveStat(fighter, "speed", battle, opponent, "explosive") * 0.2;

  const passiveBonuses = getPassiveBonuses(fighter, opponent, battle, "explosive");
  value *= 1 + passiveBonuses.precisionPct / 100;
  value *= 1 + getDerivedModifierPercent(fighter, "precisionPct") / 100;

  return value;
}

export function calculateEvasion(fighter, battle) {
  let value =
    getEffectiveStat(fighter, "agility", battle) * 0.8 +
    getEffectiveStat(fighter, "speed", battle) * 0.2;

  value *= 1 + getDerivedModifierPercent(fighter, "evasionPct") / 100;

  return value;
}

export function calculateHitChanceFromValues(precision, evasion) {
  const rawChance = 70 + (precision - evasion) * 0.8;
  return Math.max(20, Math.min(100, rawChance));
}

export function rollHit(hitChance) {
  return Math.random() * 100 <= hitChance;
}

export function calculateCriticalChance(fighter, battle, actionType) {
  let chance =
    getEffectiveStat(fighter, "explosiveness", battle, null, actionType) * 0.4;

  if (actionType === "explosive") {
    chance += 20;
  }

  if (
    fighter.passive?.id === "lethal-precision" &&
    actionType === "precise"
  ) {
    chance += 10;
  }

  return Math.max(0, Math.min(100, chance));
}

export function rollCritical(critChance) {
  return Math.random() * 100 <= critChance;
}

function calculateDamageWithDefenseFactor(
  attacker,
  defender,
  battle,
  defenseFactor = 1,
  actionType = "normal"
) {
  const attack = getEffectiveStat(attacker, "attack", battle, defender, actionType);
  const defense = getEffectiveStat(defender, "defense", battle) * defenseFactor;

  const difference = attack - defense;
  const multiplier = 70 + difference / 4;
  const finalMultiplier = multiplier / 100;

  const damage = Math.max(1, Math.round(attack * finalMultiplier));

  return {
    damage,
    attackValue: Math.round(attack * 100) / 100,
    defenseValue: Math.round(defense * 100) / 100,
    multiplier: Math.round(multiplier * 100) / 100
  };
}

export function applyDamage(defender, damage) {
  defender.hp -= damage;
  defender.damageTakenThisTurn += damage;

  if (defender.hp <= 0) {
    defender.hp = 0;
    defender.alive = false;
  }
}

export function restoreHp(fighter, amount) {
  fighter.hp = Math.min(fighter.maxHp, fighter.hp + amount);
}

export function restoreStamina(fighter, amount, battle = null) {
  fighter.stamina = Math.min(fighter.maxStamina, fighter.stamina + amount);
  if (battle) updateFatigueState(fighter, battle);
}

function getActionExtraStaminaCost(fighter, actionType, opponent) {
  if (!ACTIONS[actionType]) return 0;

  if (["normal", "quick", "precise", "explosive"].includes(actionType)) {
    if (opponent?.passive?.id === "suffocating-humidity" && humidityIsActive(opponent)) {
      return 5;
    }
  }

  return 0;
}

export function spendStamina(fighter, amount, battle = null) {
  fighter.stamina = Math.max(0, fighter.stamina - amount);
  if (battle) updateFatigueState(fighter, battle);
}

export function canUseAction(fighter, actionType, battle = null) {
  if (!ACTIONS[actionType]) return false;

  const opponent =
    battle
      ? battle.fighterA.id === fighter.id
        ? battle.fighterB
        : battle.fighterA
      : null;

  if (actionType === "quick" && isQuickAttackBlocked(fighter)) {
    return false;
  }

  if (actionType === "concentration") {
    if (fighter.concentratedLastTurn) return false;
    if (!canConcentrateUnderEffects(fighter)) return false;
    if (fighter.parasiticControlActive || fighter.nervousDisruptionActive) return false;
  }

  if (actionType === "special") {
    if (!fighter.special) return false;

    if (fighter.special.id === "overinflation") {
      return fighter.overinflationUses > 0;
    }

    if (
      fighter.special.id === "arctic-storm" &&
      battle &&
      battleHasEffect(battle, "hail")
    ) {
      return false;
    }

    if (fighter.parasiticControlActive || fighter.nervousDisruptionActive) return false;

    return fighter.specialCharge >= fighter.special.chargeHits;
  }

  const finalCost =
    ACTIONS[actionType].staminaCost +
    getActionExtraStaminaCost(fighter, actionType, opponent);

  return fighter.stamina >= finalCost;
}

export function getActionPriority(actionType, fighter = null) {
  if (actionType === "special") {
    if (fighter?.special?.id === "total-regeneration") return 8;
    if (fighter?.special?.id === "illusory-dance") return 6;
    if (fighter?.special?.id === "marine-flash") return 7;
    if (fighter?.special?.id === "overinflation") return 9;
    if (fighter?.special?.chargeType !== "offensive") return 5;
    if (fighter?.special?.id === "neurotoxic-injection") return 5;
  }

  return ACTIONS[actionType]?.priority ?? 0;
}

export function getPrecisionForAction(fighter, defender, actionType, battle) {
  switch (actionType) {
    case "normal":
      return calculateNormalPrecision(fighter, defender, battle);
    case "quick":
      return calculateQuickPrecision(fighter, defender, battle);
    case "precise":
      return calculatePrecisePrecision(fighter, defender, battle);
    case "explosive":
      return calculateExplosivePrecision(fighter, defender, battle);
    default:
      return 0;
  }
}

function gainSpecialCharge(fighter, amount, battle) {
  if (!fighter.special) return;
  if (fighter.special.id === "overinflation") return;

  const before = fighter.specialCharge;
  fighter.specialCharge = Math.min(
    fighter.special.chargeHits,
    fighter.specialCharge + amount
  );

  if (
    fighter.specialCharge >= fighter.special.chargeHits &&
    before < fighter.special.chargeHits &&
    !fighter.specialReadyAnnounced
  ) {
    fighter.specialReadyAnnounced = true;
    addLog(battle, `${fighter.name}'s Special Attack is ready.`);
  }
}

function consumeSpecialCharge(fighter) {
  if (fighter.special?.id === "overinflation") return;

  fighter.specialCharge = 0;
  fighter.specialReadyAnnounced = false;
}

function activateIllusoryDanceBuff(fighter, battle) {
  if (!fighter.illusoryDanceActive) return;
  if (fighter.illusoryDanceBuffReady) return;

  fighter.illusoryDanceBuffReady = true;
  addLog(
    battle,
    `${fighter.name}'s Illusory Dance grants a guaranteed next attack with +50% damage.`
  );
}

function applyIllusoryDanceDefense(defender, damage, battle) {
  if (!defender.illusoryDanceActive) return damage;

  const reducedDamage = Math.max(
    Math.round(damage * 0.5),
    Math.ceil(damage * 0.2)
  );

  addLog(
    battle,
    `${defender.name}'s Illusory Dance reduces incoming damage from ${damage} to ${reducedDamage}.`
  );

  return reducedDamage;
}

function handleInvertedInertia(attacker, defender, battle) {
  if (defender.passive?.id !== "inverted-inertia") return;

  const attackerAttack = getEffectiveStat(attacker, "attack", battle, defender, "passive");
const counterDamage = Math.round(attackerAttack *0.5);

  applyDamage (attacker, counterDamage); 

  addLog(
    battle,
    `${defender.name}'s Inverted Inertia counters with 50% of ${attacker.name}'s Attack, dealing ${counterDamage} damage.`
  );
}

function handleReactiveChargeOnMiss(attacker, defender, battle) {
  if (defender.special?.chargeType === "reactive") {
    gainSpecialCharge(defender, 1, battle);
  }

  if (defender.special?.id === "illusory-dance" && defender.illusoryDanceActive) {
    activateIllusoryDanceBuff(defender, battle);
  }

  handleInvertedInertia(attacker, defender, battle);
}

function getNextAttackBuff(attacker) {
  return {
    guaranteedHit: attacker.illusoryDanceBuffReady,
    damagePct: attacker.illusoryDanceBuffReady ? 50 : 0
  };
}

function consumeNextAttackBuff(attacker) {
  attacker.illusoryDanceBuffReady = false;
}

export function resolveConcentration(fighter, battle) {
  restoreHp(fighter, 20);
  restoreStamina(fighter, 20, battle);
  fighter.concentratedLastTurn = true;
  fighter.concentrationActive = true;

  if (fighter.passive?.id === "residual-neurotoxin") {
    fighter.residualNeurotoxinActive = true;
  }

  addLog(
    battle,
    `${fighter.name} uses Concentration, gains +10% Defense and Agility for the turn, restores 20 Life and 20 Stamina.`
  );
}

function handlePostHitPassive(attacker, defender, battle, wasCritical, actionType = null) {
  if (attacker.passive?.id === "frozen-impact" && wasCritical) {
    const duration = battle.biome === "arctic" ? 4 : 2;
    addEffect(defender, createAgilityDownEffect(duration, 20), battle);

    addLog(
      battle,
      `${attacker.name}'s Frozen Impact reduces ${defender.name}'s Agility by 20% for ${duration} turns.`
    );
  }

  if (
    attacker.passive?.id === "relentless-bite" &&
    actionType === "explosive"
  ) {
    addEffect(defender, createBiteEffect(5, 20, 0.5), battle);

    addLog(
      battle,
      `${attacker.name}'s Relentless Bite applies Bite to ${defender.name} (-20% Agility, up to 5 turns, 50% escape chance each turn).`
    );
  }
}

function handleChargeGain(attacker, defender, hit, battle) {
  if (hit && attacker.special?.chargeType === "offensive") {
    gainSpecialCharge(attacker, 1, battle);
  }

  if (hit && defender.special?.chargeType === "defensive") {
    gainSpecialCharge(defender, 1, battle);
  }
}

export function performAttack(attacker, defender, actionType, battle) {
  const action = ACTIONS[actionType];

  if (!action) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  const extraCost = getActionExtraStaminaCost(attacker, actionType, defender);
  spendStamina(attacker, action.staminaCost + extraCost, battle);
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const nextAttackBuff = getNextAttackBuff(attacker);

  if (defender.residualNeurotoxinActive) {
    addEffect(attacker, createResidualNeurotoxinEffect(2), battle);

    addLog(
      battle,
      `${defender.name}'s Residual Neurotoxin affects ${attacker.name}: −10% Speed, Technique and Evasion next turn.`
    );
  }

  if (defender.phantomCurrentActive) {
    addLog(
      battle,
      `${attacker.name} cannot hit ${defender.name} (Phantom Current).`
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");

    return {
      hit: false,
      damage: 0,
      critical: false,
      hitChance: 0
    };
  }

  const precision = getPrecisionForAction(attacker, defender, actionType, battle);
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  if (actionType === "precise") {
    hitChance = Math.min(100, hitChance + 20);
  }

  if (attacker.tempAccuracyLockTurns > 0) {
    hitChance = Math.min(hitChance, 25);
  }

  const hit = nextAttackBuff.guaranteedHit ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses ${action.name} but misses ${defender.name}.`
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);

    return {
      hit: false,
      damage: 0,
      critical: false,
      hitChance
    };
  }

if (defender.overinflationActive) {
  addLog(
    battle,
    `${attacker.name} tries to hit ${defender.name} with ${action.name}, but ${defender.name}'s Overinflation blocks the attack completely.`
  );

  const overinflationDamage = 25;
  applyDamage(attacker, overinflationDamage);

  addLog(
    battle,
    `${attacker.name} takes ${overinflationDamage} damage from ${defender.name}'s Overinflation.`
  );

  addEffect(attacker, createTetrodotoxinEffect(2), battle);

  addLog(
    battle,
    `${attacker.name} is poisoned by Tetrodotoxin: −25% Precision, Evasion and Speed next turn.`
  );

  finishBattleIfNeeded(battle);

  return {
    hit: true,
    damage: 0,
    critical: false,
    hitChance
  };
}

  let defenseFactor = 1;

  if (
    attacker.passive?.id === "relentless-bite" &&
    actionType === "explosive"
  ) {
    defenseFactor = 0.8;
  }

  if (
    attacker.passive?.id === "lethal-precision" &&
    actionType === "precise"
  ) {
    defenseFactor = 0.8;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    defenseFactor,
    actionType
  );

  let baseDamage = damageInfo.damage;

  if (actionType === "precise") {
    baseDamage = Math.round(baseDamage * 1.1);
  }

  if (actionType === "explosive") {
    baseDamage = Math.round(baseDamage * 1.2);
  }

  if (attacker.passive?.id === "hunting-inertia" && attacker.falconStacks > 0) {
    addLog(
      battle,
      `${attacker.name}'s Hunting Inertia grants +${attacker.falconStacks * 10}% damage to this attack.`
    );
  }

  const passiveBonuses = getPassiveBonuses(attacker, defender, battle, actionType);
  if (actionType === "explosive" && passiveBonuses.explosiveDamagePct > 0) {
    baseDamage = Math.round(baseDamage * (1 + passiveBonuses.explosiveDamagePct / 100));
  }

  if (nextAttackBuff.damagePct > 0) {
    baseDamage = Math.round(baseDamage * (1 + nextAttackBuff.damagePct / 100));
    addLog(
      battle,
      `${attacker.name}'s Illusory Dance buff empowers the attack (+50% damage, guaranteed hit).`
    );
    consumeNextAttackBuff(attacker);
  }

  const critChance = calculateCriticalChance(attacker, battle, actionType);
  let critical = rollCritical(critChance);

  if (
    defender.passive?.id === "savage-endurance" &&
    defender.hp < defender.maxHp * 0.25
  ) {
    critical = false;
  }

  let finalDamage = baseDamage;

  if (critical) {
    finalDamage = Math.round(baseDamage * 1.5);
  }

  finalDamage = applyIllusoryDanceDefense(defender, finalDamage, battle);

  applyDamage(defender, finalDamage);

addLog(
  battle,
  `${attacker.name} hits ${defender.name} with ${action.name} for ${finalDamage} damage${critical ? " (CRITICAL)" : ""}.`
);

if (defender.id === "pufferfish" && attacker.alive) {
  applyDamage(attacker, 10);

  addLog(
    battle,
    `${attacker.name} suffers 10 damage from ${defender.name}'s spines.`
  );
}

  if (critical) {
    addLog(
      battle,
      `Critical calc → Base damage: ${baseDamage} | Critical multiplier: x1.5 | Final damage: ${finalDamage}.`
    );
  }

  addLog(
    battle,
    `Damage calc → Attack: ${damageInfo.attackValue} | Defense: ${damageInfo.defenseValue} | Multiplier: ${damageInfo.multiplier}%.`
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  handleIguanaPassive(attacker, actionType, battle);
  handlePostHitPassive(attacker, defender, battle, critical, actionType);
  handleChargeGain(attacker, defender, true, battle);

  performMarineEcho(attacker, defender, battle);

  return {
    hit: true,
    damage: finalDamage,
    critical,
    hitChance
  };
}

function performTigerSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const nextAttackBuff = getNextAttackBuff(attacker);

  const precision = calculatePrecisePrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  const hit = nextAttackBuff.guaranteedHit
    ? true
    : rollHit(calculateHitChanceFromValues(precision, evasion));

  if (!hit) {
    addLog(battle, `${attacker.name} uses Lethal Bite but misses ${defender.name}.`);
    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    0.5,
    "special"
  );

  let damage = damageInfo.damage;

  if (nextAttackBuff.damagePct > 0) {
    damage = Math.round(damage * (1 + nextAttackBuff.damagePct / 100));
    addLog(
      battle,
      `${attacker.name}'s Illusory Dance buff empowers the attack (+50% damage, guaranteed hit).`
    );
    consumeNextAttackBuff(attacker);
  }

  damage = applyIllusoryDanceDefense(defender, damage, battle);

  applyDamage(defender, damage);
  addEffect(defender, createBleedEffect(2, 15), battle);

  addLog(
    battle,
    `${attacker.name} uses Lethal Bite, dealing ${damage} damage, ignoring 50% Defense and applying Bleed.`
  );

  addLog(
    battle,
    `Lethal Bite calc → Attack: ${damageInfo.attackValue} | Effective Defense: ${damageInfo.defenseValue} | Multiplier: ${damageInfo.multiplier}%.`
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performHoneyBadgerSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = calculateNormalPrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses Mutilation but misses ${defender.name}.`
    );
    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  let damage = damageInfo.damage;
  damage = applyIllusoryDanceDefense(defender, damage, battle);
  applyDamage(defender, damage);

  addEffect(defender, createMutilationEffect(2), battle);

  addLog(
    battle,
    `${attacker.name} uses Mutilation, dealing ${damage} damage and reducing ${defender.name}'s Attack, Speed and Agility by 30% for 2 turns, while blocking Quick Attack.`
  );

  addLog(
    battle,
    `Mutilation calc → Attack: ${damageInfo.attackValue} | Defense: ${damageInfo.defenseValue} | Multiplier: ${damageInfo.multiplier}%.`
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performWalrusSpecial(attacker, battle) {
  attacker.overinflationUsedThisTurn = false;

  if (battleHasEffect(battle, "hail")) {
    addLog(
      battle,
      `${attacker.name} cannot use Arctic Storm because Hail is already active.`
    );
    return;
  }

  const duration = battle.biome === "arctic" ? 6 : 3;
  addBattleEffect(battle, createHailEffect(duration, attacker.id));

  if (battle.biome === "arctic") {
    attacker.arcticStormPermanentSpeed = true;
    addLog(
      battle,
      `${attacker.name} uses Arctic Storm. Hail begins for ${duration} turns and its speed bonus is permanent in Arctic biome.`
    );
  } else {
    addLog(
      battle,
      `${attacker.name} uses Arctic Storm. Hail begins for ${duration} turns and doubles its Speed while active.`
    );
  }

  resetMomentum(attacker, battle, "special");
  resetParasiticControlHits(attacker, battle, "special");
  resetFalconStacks(attacker, battle, "special");
  resetMacaqueChain(attacker, battle, "special");
  consumeSpecialCharge(attacker);
}

function performShimaEnagaSpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;
  attacker.illusoryDanceActive = true;

  addLog(
    battle,
    `${attacker.name} uses Illusory Dance. Incoming damage is reduced by 50% this turn (minimum 20% damage taken).`
  );

  resetMomentum(attacker, battle, "special");
  resetParasiticControlHits(attacker, battle, "special");
  resetFalconStacks(attacker, battle, "special");
  resetMacaqueChain(attacker, battle, "special");
  consumeSpecialCharge(attacker);
}

function performMantisShrimpSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = getEffectiveStat(attacker, "explosiveness", battle, defender, "special");
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  const specialBaseDamage = Math.max(1, Math.round(damageInfo.damage * 2));

  if (!hit) {
    const partialDamageToEnemy = Math.max(1, Math.round(specialBaseDamage * 0.25));
    const selfDamage = Math.max(1, Math.round(specialBaseDamage * 0.5));

    applyDamage(defender, partialDamageToEnemy);
    applyDamage(attacker, selfDamage);

    addLog(
      battle,
      `${attacker.name} uses Ballistic Strike but misses. ${defender.name} still takes ${partialDamageToEnemy} damage and ${attacker.name} takes ${selfDamage} self-damage.`
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    consumeSpecialCharge(attacker);
    return;
  }

  const critical = rollCritical(80);

  let finalDamage = specialBaseDamage;

  if (critical) {
    finalDamage = Math.round(finalDamage * 1.5);
  }

  finalDamage = applyIllusoryDanceDefense(defender, finalDamage, battle);

  applyDamage(defender, finalDamage);

  addLog(
    battle,
    `${attacker.name} uses Ballistic Strike and deals ${finalDamage} damage${critical ? " (CRITICAL)" : ""}.`
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performDungBeetleSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = getEffectiveStat(attacker, "attack", battle, defender, "special");
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses Dung Throw but misses ${defender.name}.`
    );
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    consumeSpecialCharge(attacker);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  let damage = Math.max(1, Math.round(damageInfo.damage * 0.5));

  damage = applyIllusoryDanceDefense(defender, damage, battle);

  applyDamage(defender, damage);
  addEffect(defender, createAgilityDownEffect(3, 50), battle);

  addLog(
    battle,
    `${attacker.name} uses Dung Throw, dealing ${damage} damage and reducing ${defender.name}'s Agility by 50% for 3 turns.`
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performCaimanSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const targetHasBite = fighterHasEffect(defender, "bite");

  if (targetHasBite) {
    const attackValue = getEffectiveStat(attacker, "attack", battle, defender, "special");
    let damage = Math.max(1, Math.round(attackValue * 2));

    damage = applyIllusoryDanceDefense(defender, damage, battle);
    applyDamage(defender, damage);

    addLog(
      battle,
      `${attacker.name} uses Death Roll on a bitten target: ${damage} damage, ignores defense and cannot be dodged.`
    );

    consumeSpecialCharge(attacker);
    return;
  }

  const precision = calculateNormalPrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses Death Roll but misses ${defender.name}.`
    );
    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  let damage = damageInfo.damage;

  damage = applyIllusoryDanceDefense(defender, damage, battle);
  applyDamage(defender, damage);

  addLog(
    battle,
    `${attacker.name} uses Death Roll, dealing ${damage} damage.`
  );

  consumeSpecialCharge(attacker);
}

function performAxolotlSpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const healAmount = attacker.damageTakenLastTurn * 2;

  if (healAmount <= 0) {
    addLog(
      battle,
      `${attacker.name} uses Total Regeneration but has nothing to heal.`
    );
  } else {
    const hpBefore = attacker.hp;
    restoreHp(attacker, healAmount);
    const actualHealed = attacker.hp - hpBefore;

    addLog(
      battle,
      `${attacker.name} uses Total Regeneration and restores ${actualHealed} HP.`
    );
  }

  attacker.damageTakenThisTurn = 0;
  attacker.damageTakenLastTurn = 0;

  consumeSpecialCharge(attacker);
}

function performEmeraldWaspSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = getEffectiveStat(attacker, "technique", battle, defender, "special");
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses Nervous Disruption but misses ${defender.name}.`
    );
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    consumeSpecialCharge(attacker);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  let damage = damageInfo.damage;

  damage = applyIllusoryDanceDefense(defender, damage, battle);
  applyDamage(defender, damage);

  defender.nervousDisruptionActive = true;
  defender.parasiticControlActive = false;

  addLog(
    battle,
    `${attacker.name} uses Nervous Disruption, dealing ${damage} damage. On ${defender.name}'s next turn, it hits itself and cannot use Concentration or Special Attack.`
  );

  increaseParasiticControlHits(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performFalconSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const stacks = attacker.falconStacks;

  defender.tempAccuracyLockTurns = 1;

  const precision = calculatePrecisePrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses Deadly Dive but misses ${defender.name}.`
    );
    resetFalconStacks(attacker, battle, "miss");
    consumeSpecialCharge(attacker);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  let multiplier = 1.5;
  if (stacks === 1) multiplier = 1.6;
  if (stacks === 2) multiplier = 1.7;
  if (stacks >= 3) multiplier = 1.8;

  let damage = Math.max(1, Math.round(damageInfo.damage * multiplier));

  damage = applyIllusoryDanceDefense(defender, damage, battle);
  applyDamage(defender, damage);

  addEffect(defender, createFalconDebuffEffect(2, 25), battle);

  addLog(
    battle,
    `${attacker.name} uses Deadly Dive (${multiplier}x), dealing ${damage} damage and reducing ${defender.name}'s Technique and Agility by 25% for 2 turns.`
  );

  attacker.falconStacks = 0;
  consumeSpecialCharge(attacker);
}

function performSailfishSpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;
  attacker.phantomCurrentActive = true;

  addLog(
    battle,
    `${attacker.name} uses Phantom Current and becomes untargetable this turn.`
  );

  consumeSpecialCharge(attacker);
}

function performMacaqueSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const loot = attacker.macaqueLoot;
  const damage = Math.max(0, Math.round(loot * 1.5));

  if (damage <= 0) {
    addLog(
      battle,
      `${attacker.name} uses Looting Burst but has no stored loot.`
    );
    attacker.macaqueLoot = 0;
    attacker.macaqueHitChain = 0;
    consumeSpecialCharge(attacker);
    return;
  }

  applyDamage(defender, damage);

  addLog(
    battle,
    `${attacker.name} uses Looting Burst, consuming ${loot} loot to deal ${damage} damage.`
  );

  attacker.macaqueLoot = 0;
  attacker.macaqueHitChain = 0;
  consumeSpecialCharge(attacker);
}

function performIguanaSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const humidityActive = humidityIsActive(attacker);
  const healAmount = humidityActive ? 80 : 40;
  const staminaAmount = humidityActive ? 80 : 40;

  const hpBefore = attacker.hp;
  const staminaBefore = attacker.stamina;

  restoreHp(attacker, healAmount);
  restoreStamina(attacker, staminaAmount, battle);

  const actualHealed = attacker.hp - hpBefore;
  const actualRestoredStamina = attacker.stamina - staminaBefore;

  addEffect(
    defender,
    {
      id: "refresh-debuff",
      name: "Refresh Debuff",
      duration: 1,
      stackable: false,
      allowsConcentration: true,
      modifiers: {
        techniquePct: -20,
        agilityPct: -20
      }
    },
    battle
  );

  addLog(
    battle,
    `${attacker.name} uses Refresh, restoring ${actualHealed} HP and ${actualRestoredStamina} Stamina, and reducing ${defender.name}'s Technique and Agility by 20% for 1 turn.`
  );

  consumeSpecialCharge(attacker);
}

function performFireSalamanderSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = getEffectiveStat(attacker, "technique", battle, defender, "special");
  const evasion = calculateEvasion(defender, battle);
  const hitChance = calculateHitChanceFromValues(precision, evasion);
  const hit = rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      `${attacker.name} uses Neurotoxic Injection (Tetrodotoxin) but misses ${defender.name}.`
    );
    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  let damage = damageInfo.damage;
  damage = applyIllusoryDanceDefense(defender, damage, battle);
  applyDamage(defender, damage);

  addEffect(
    defender,
    {
      id: "neurotoxic-injection-debuff",
      name: "Neurotoxic Injection (Tetrodotoxin)",
      duration: 2,
      stackable: false,
      allowsConcentration: true,
      modifiers: {
        agilityPct: -25,
        techniquePct: -25,
        speedPct: -25
      }
    },
    battle
  );

  addEffect(
    defender,
    {
      id: "neurotoxic-injection-damage",
      name: "Neurotoxic Injection (Tetrodotoxin)",
      duration: 2,
      stackable: false,
      allowsConcentration: true,
      modifiers: {},
      onTurnEnd(target, battle) {
        const toxinDamage = 15;
        target.hp = Math.max(0, target.hp - toxinDamage);
        target.damageTakenThisTurn += toxinDamage;
        battle.log.push(`${target.name} suffers ${toxinDamage} damage from Neurotoxic Injection (Tetrodotoxin).`);

        if (target.hp <= 0) {
          target.alive = false;
        }
      }
    },
    battle
  );

  addLog(
    battle,
    `${attacker.name} uses Neurotoxic Injection (Tetrodotoxin), dealing ${damage} damage, reducing ${defender.name}'s Agility, Technique and Speed by 25% for 2 turns, and applying 30 fixed damage over time.`
  );

  consumeSpecialCharge(attacker);
}

function performPufferfishSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = true;

  if (attacker.overinflationUses <= 0) {
    addLog(
      battle,
      `${attacker.name} has no Overinflation uses left.`
    );
    return;
  }

  attacker.overinflationUses -= 1;

  if (attacker.overinflationUsedLastTurn) {
    applyDamage(defender, 200);

    attacker.hp = 1;
    attacker.alive = true;
    attacker.overinflationActive = false;
    attacker.overinflationUsedLastTurn = false;

    addLog(
      battle,
      `${attacker.name} uses Overinflation twice in a row and explodes: ${defender.name} takes 200 damage, and ${attacker.name} is left at 1 HP. Uses left: ${attacker.overinflationUses}.`
    );

    return;
  }

 attacker.overinflationActive = true;
attacker.overinflationUsedLastTurn = true;

const chipDamage = 25;
applyDamage(defender, chipDamage);

addLog(
  battle,
  `${attacker.name} uses Overinflation and becomes immune to damage this turn. Uses left: ${attacker.overinflationUses}.`
);
}

function performSpecialAction(attacker, defender, battle) {
  if (!attacker.special) return;

  switch (attacker.special.id) {
    case "lethal-bite":
      performTigerSpecial(attacker, defender, battle);
      break;
    case "mutilation":
      performHoneyBadgerSpecial(attacker, defender, battle);
      break;
    case "arctic-storm":
      performWalrusSpecial(attacker, battle);
      break;
    case "illusory-dance":
      performShimaEnagaSpecial(attacker, battle);
      break;
    case "marine-flash":
      performMantisShrimpSpecial(attacker, defender, battle);
      break;
    case "dung-throw":
      performDungBeetleSpecial(attacker, defender, battle);
      break;
    case "death-roll":
      performCaimanSpecial(attacker, defender, battle);
      break;
    case "total-regeneration":
      performAxolotlSpecial(attacker, battle);
      break;
    case "nervous-disruption":
      performEmeraldWaspSpecial(attacker, defender, battle);
      break;
    case "deadly-dive":
      performFalconSpecial(attacker, defender, battle);
      break;
    case "phantom-current":
      performSailfishSpecial(attacker, battle);
      break;
    case "looting-burst":
      performMacaqueSpecial(attacker, defender, battle);
      break;
    case "refresh":
      performIguanaSpecial(attacker, defender, battle);
      break;
    case "neurotoxic-injection":
      performFireSalamanderSpecial(attacker, defender, battle);
      break;
    case "overinflation":
      performPufferfishSpecial(attacker, defender, battle);
      break;
    default:
      addLog(battle, `${attacker.name} has no implemented special logic yet.`);
      consumeSpecialCharge(attacker);
      break;
  }
}

function processEndTurnPassives(fighter, opponent, battle) {
  if (!fighter.alive) return;

  if (fighter.passive?.id === "neotenic-regeneration") {
    if (Math.random() < 0.5) {
      restoreHp(fighter, 20);
      addLog(
        battle,
        `${fighter.name}'s Neotenic Regeneration restores 20 HP.`
      );
    }
  }

  if (fighter.passive?.id === "suffocating-humidity" && humidityIsActive(fighter)) {
    restoreHp(fighter, 20);
    addLog(
      battle,
      `${fighter.name}'s Suffocating Humidity restores 20 HP.`
    );
  }
}

function advanceTurnDamageMemory(fighter) {
  fighter.damageTakenLastTurn = fighter.damageTakenThisTurn;
  fighter.damageTakenThisTurn = 0;

  if (fighter.tempAccuracyLockTurns > 0) {
    fighter.tempAccuracyLockTurns -= 1;
  }
}

function clearEndTurnTemporaryStates(fighter) {
  fighter.overinflationActive = false;
  fighter.residualNeurotoxinActive = false;

  if (!fighter.overinflationUsedThisTurn) {
    fighter.overinflationUsedLastTurn = false;
  }

  fighter.overinflationUsedThisTurn = false;
}

export function performAction(attacker, defender, actionType, battle) {
  if (!attacker.alive || !defender.alive) return;

  if (resolveMindControlTurn(attacker, battle)) {
    finishBattleIfNeeded(battle);
    return;
  }

  if (!canUseAction(attacker, actionType, battle)) {
    addLog(
      battle,
      `${attacker.name} cannot use ${ACTIONS[actionType]?.name ?? actionType}.`
    );
    attacker.concentratedLastTurn = false;
    attacker.overinflationUsedThisTurn = false;

    consumeOneTurnControlState(attacker, battle);
    return;
  }

  if (actionType === "concentration") {
    attacker.overinflationUsedThisTurn = false;
    resolveConcentration(attacker, battle);

    if (defender.special?.id === "illusory-dance" && defender.illusoryDanceActive) {
      activateIllusoryDanceBuff(defender, battle);
    }

    resetMomentum(attacker, battle, "concentration");
    resetParasiticControlHits(attacker, battle, "concentration");
    resetFalconStacks(attacker, battle, "concentration");
    resetMacaqueChain(attacker, battle, "concentration");
    consumeOneTurnControlState(attacker, battle);
    return;
  }

  if (actionType === "special") {
    performSpecialAction(attacker, defender, battle);
    consumeOneTurnControlState(attacker, battle);
    return;
  }

  performAttack(attacker, defender, actionType, battle);
  consumeOneTurnControlState(attacker, battle);
}

export function finishBattleIfNeeded(battle) {
  const { fighterA, fighterB } = battle;

  if (battle.finished) return;

  if (!fighterA.alive && !fighterB.alive) {
    addLog(battle, `${fighterA.name} has been defeated.`);
    addLog(battle, `${fighterB.name} has been defeated.`);
    battle.finished = true;
    battle.winner = "draw";
    return;
  }

  if (!fighterA.alive) {
    addLog(battle, `${fighterA.name} has been defeated.`);
    battle.finished = true;
    battle.winner = fighterB.id;
    return;
  }

  if (!fighterB.alive) {
    addLog(battle, `${fighterB.name} has been defeated.`);
    battle.finished = true;
    battle.winner = fighterA.id;
  }
}

function logFighterState(battle, fighter) {
  const hpPercent = Math.round((fighter.hp / fighter.maxHp) * 100);
  const staminaPercent = Math.round((fighter.stamina / fighter.maxStamina) * 100);

  if (fighter.special?.id === "overinflation") {
    addLog(
      battle,
      `${fighter.name} → HP: ${fighter.hp}/${fighter.maxHp} (${hpPercent}%) | Stamina: ${fighter.stamina}/${fighter.maxStamina} (${staminaPercent}%) | Overinflation Uses: ${fighter.overinflationUses}/4.`
    );
    return;
  }

  addLog(
    battle,
    `${fighter.name} → HP: ${fighter.hp}/${fighter.maxHp} (${hpPercent}%) | Stamina: ${fighter.stamina}/${fighter.maxStamina} (${staminaPercent}%) | Special Charge: ${fighter.specialCharge}/${fighter.special?.chargeHits ?? 0}.`
  );
}

function clearTurnDefenseBuff(fighter) {
  fighter.concentrationActive = false;
  fighter.illusoryDanceActive = false;
}

function endTurnProcessing(battle) {
  resolvePhantomCurrentStrike(battle.fighterA, battle.fighterB, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  resolvePhantomCurrentStrike(battle.fighterB, battle.fighterA, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  processFighterTurnEndEffects(battle.fighterA, battle, battle.fighterB);
  processFighterTurnEndEffects(battle.fighterB, battle, battle.fighterA);
  updateFatigueState(battle.fighterA, battle);
  updateFatigueState(battle.fighterB, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  processEndTurnPassives(battle.fighterA, battle.fighterB, battle);
  processEndTurnPassives(battle.fighterB, battle.fighterA, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  processBattleEffectsTurnEnd(battle);
  updateFatigueState(battle.fighterA, battle);
  updateFatigueState(battle.fighterB, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  tickFighterEffects(battle.fighterA, battle);
  tickFighterEffects(battle.fighterB, battle);

  clearEndTurnTemporaryStates(battle.fighterA);
  clearEndTurnTemporaryStates(battle.fighterB);

  advanceTurnDamageMemory(battle.fighterA);
  advanceTurnDamageMemory(battle.fighterB);
}

export function resolveTurn(battle, actionA, actionB) {
  if (battle.finished) return;

  clearTurnDefenseBuff(battle.fighterA);
  clearTurnDefenseBuff(battle.fighterB);

  // 🔥 AÑADIDO CLAVE → EL CAMBIO SE ANUNCIA AL EMPEZAR EL TURNO
  if (battle.turn > 1 && (battle.turn - 1) % BIOME_ROTATION_TURNS === 0) {
    addLog(
      battle,
      `🌍 BIOME SHIFT! The battlefield changes...`
    );
    applyRandomBiomeModifier(battle, "changed");
  }

  const speedA = getEffectiveStat(
    battle.fighterA,
    "speed",
    battle,
    battle.fighterB,
    actionA
  );
  const speedB = getEffectiveStat(
    battle.fighterB,
    "speed",
    battle,
    battle.fighterA,
    actionB
  );

  const priorityA = getActionPriority(actionA, battle.fighterA);
  const priorityB = getActionPriority(actionB, battle.fighterB);

  const first =
    priorityA > priorityB
      ? { actor: battle.fighterA, target: battle.fighterB, action: actionA }
      : priorityB > priorityA
      ? { actor: battle.fighterB, target: battle.fighterA, action: actionB }
      : speedA >= speedB
      ? { actor: battle.fighterA, target: battle.fighterB, action: actionA }
      : { actor: battle.fighterB, target: battle.fighterA, action: actionB };

  const second =
    first.actor.id === battle.fighterA.id
      ? { actor: battle.fighterB, target: battle.fighterA, action: actionB }
      : { actor: battle.fighterA, target: battle.fighterB, action: actionA };

  addLog(battle, `--- Turn ${battle.turn} ---`);

  performAction(first.actor, first.target, first.action, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  performAction(second.actor, second.target, second.action, battle);
  finishBattleIfNeeded(battle);
  if (battle.finished) return;

  endTurnProcessing(battle);
  if (battle.finished) return;

  logFighterState(battle, battle.fighterA);
  logFighterState(battle, battle.fighterB);

  battle.turn += 1;
}