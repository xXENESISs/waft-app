import { animals } from "./animals.js";
import {
  addEffect,
  getStackedModifierPercent,
  createBleedEffect,
  createDeepBleedEffect,
  createCostalToxinEffect,
  createAgilityDownEffect,
  createBiteEffect,
  createFalconDebuffEffect,
  createMutilationEffect,
  addBattleEffect,
  createHailEffect,
  createHumidityEffect,
  createPredatoryPressureEffect,
  createInkSeaEffect,
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
  },
  "larval-command": {
    name: "Larval Command",
    staminaCost: 0,
    priority: 7
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

    tigerStalkStacks: 0,
    tigerTookDirectDamageThisTurn: false,

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

    costalEversionActive: false,
    costalEversionTurns: 0,
    costalEversionActivatedTurn: null,

    caudalAutotomyActive: false,
    caudalAutotomyTurns: 0,
    caudalAutotomyActivatedTurn: null,
    caudalAutotomyTailHp: 0,
    caudalAutotomyMaxTailHp: 90,
    caudalAutotomyBlockedLastDirectHit: false,
    scaledRetreatBonusAppliedThisTurn: false,

    phantomCurrentActive: false,

    macaqueHitChain: 0,
    macaqueLoot: 0,

    iguanaProgress: {
      quick: false,
      precise: false,
      explosive: false
    },

    matamataStalkCharges: 0,
    matamataAmbushReady: false,
    matamataAmbushReadyTurn: null,
    ancestralRetreatActive: false,

    fennecMirageProgress: {
      quick: false,
      explosive: false,
      concentration: 0
    },
    fennecOasisReady: false,

    darwinsLarvae: 0,
    darwinsMaxLarvae: 5,
    darwinsLarvalDefense: 0,
    darwinsLarvalBlocksEffects: false,
    darwinsLarvalCommand: null,

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

    slothActiveColonies: animal.id === "three-toed-sloth" ? [] : null,
    slothBacterialChain: 0,
    slothMicroecosystemActive: false,
    slothMicroecosystemTurns: 0,
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

function randomChoiceExcluding(array, excludedValue) {
  const candidates = array.filter((item) => item !== excludedValue);
  return randomChoice(candidates.length > 0 ? candidates : array);
}

function applyRandomBiomeModifier(battle, reason = "selected") {
  const previousBiome = battle.biome;
  const previousStat = battle.biomeStat;

  const biome = randomChoiceExcluding(BIOMES, previousBiome);
  const stat = randomChoiceExcluding(BIOME_AFFECTABLE_STATS, previousStat);

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

  refreshThreeToedSlothColoniesForBattle(battle, reason);
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

function isCircadianDay(battle) {
  return Math.floor((battle.turn - 1) / 2) % 2 === 0;
}

function isCircadianNight(battle) {
  return Math.floor((battle.turn - 1) / 2) % 2 === 1;
}

function battleHasEffect(battle, effectId) {
  return battle.battleEffects.some((effect) => effect.id === effectId);
}

function getBattleEffect(battle, effectId) {
  return battle.battleEffects.find((effect) => effect.id === effectId) || null;
}

function createOasisEffect(duration, sourceId) {
  return {
    id: "oasis",
    name: "Oasis",
    duration: duration,
    sourceId: sourceId
  };
}

function hasActiveCaudalAutotomyTail(fighter) {
  return Boolean(
    fighter &&
      fighter.caudalAutotomyActive &&
      (fighter.caudalAutotomyTailHp || 0) > 0
  );
}

function resetCaudalAutotomyBlockMarker(fighter) {
  if (!fighter) return;
  fighter.caudalAutotomyBlockedLastDirectHit = false;
  fighter.caudalAutotomyLastBlock = null;
}

function caudalAutotomyForcesDirectHit(defender) {
  return hasActiveCaudalAutotomyTail(defender);
}

function isIberianRibbedNewt(fighter) {
  return fighter && fighter.id === "iberian-ribbed-newt";
}

function getBattleSide(battle, fighter) {
  if (!battle || !fighter) return null;
  if (battle.fighterA === fighter) return "A";
  if (battle.fighterB === fighter) return "B";
  return fighter.id || null;
}

function isOffensiveActionTargeting(actionType, fighter) {
  if (["normal", "quick", "precise", "explosive"].includes(actionType)) return true;
  if (actionType === "special") {
    return fighter?.special?.chargeType === "offensive";
  }
  return false;
}

function getRibbedGuardExtraStaminaCost(opponent) {
  if (opponent?.passive?.id !== "ribbed-guard") return 0;
  return opponent.costalEversionActive ? 10 : 5;
}

function removeCostalToxinFromTarget(target, sourceSlot, battle) {
  if (!target?.effects) return;

  const before = target.effects.length;
  target.effects = target.effects.filter((effect) => {
    return !(effect.id === "costal-toxin" && effect.sourceSlot === sourceSlot);
  });

  if (battle && target.effects.length < before) {
    addLog(
      battle,
      "Costal Toxin from Costal Eversion fades from " + target.name + "."
    );
  }
}

function applyCostalToxin(attacker, defender, battle) {
  if (!attacker?.alive || !defender?.costalEversionActive) return;

  const sourceSlot = getBattleSide(battle, defender);
  addEffect(attacker, createCostalToxinEffect(99, sourceSlot), battle);

  addLog(
    battle,
    attacker.name +
      " is affected by Costal Toxin: -10% Speed, Agility and Technique until " +
      defender.name +
      "'s Costal Eversion ends."
  );
}

function applyCostalEversionDefense(defender, attacker, damage, battle) {
  if (!defender.costalEversionActive) return damage;

  const originalDamage = Math.max(0, Math.round(damage));
  const reducedDamage = Math.max(0, Math.round(originalDamage * 0.5));
  const reflectedDamage = originalDamage > 0
    ? Math.max(1, Math.round(originalDamage * 0.25))
    : 0;

  if (attacker?.alive && reflectedDamage > 0) {
    applyDamage(attacker, reflectedDamage);

    addLog(
      battle,
      defender.name +
        "'s Costal Eversion reflects " +
        reflectedDamage +
        " damage back to " +
        attacker.name +
        "."
    );
  }

  applyCostalToxin(attacker, defender, battle);

  addLog(
    battle,
    defender.name +
      "'s Costal Eversion reduces incoming damage from " +
      originalDamage +
      " to " +
      reducedDamage +
      "."
  );

  return reducedDamage;
}

function handleCostalEversionEndTurn(fighter, opponent, battle) {
  if (!fighter.costalEversionActive) return;

  if (fighter.costalEversionActivatedTurn !== battle.turn) {
    const hpBefore = fighter.hp;
    restoreHp(fighter, 25);
    const healed = fighter.hp - hpBefore;

    addLog(
      battle,
      fighter.name +
        "'s Costal Eversion restores " +
        healed +
        " HP."
    );
  }

  fighter.costalEversionTurns = Math.max(0, (fighter.costalEversionTurns || 0) - 1);

  if (fighter.costalEversionTurns > 0) {
    addLog(
      battle,
      fighter.name +
        "'s Costal Eversion remains active for " +
        fighter.costalEversionTurns +
        " more turn" +
        (fighter.costalEversionTurns === 1 ? "" : "s") +
        "."
    );
    return;
  }

  fighter.costalEversionActive = false;
  fighter.costalEversionActivatedTurn = null;

  removeCostalToxinFromTarget(opponent, getBattleSide(battle, fighter), battle);

  addLog(
    battle,
    fighter.name + "'s Costal Eversion ends. Its ribs withdraw beneath the skin."
  );
}


function applyCaudalAutotomyDefense(defender, attacker, damage, battle) {
  resetCaudalAutotomyBlockMarker(defender);

  if (!hasActiveCaudalAutotomyTail(defender)) {
    return damage;
  }

  const originalDamage = Math.max(0, Math.round(damage));

  if (originalDamage <= 0) {
    return damage;
  }

  const tailHpBefore = defender.caudalAutotomyTailHp;
  const absorbedDamage = Math.min(tailHpBefore, originalDamage);
  defender.caudalAutotomyTailHp = Math.max(0, tailHpBefore - originalDamage);
  defender.caudalAutotomyBlockedLastDirectHit = true;
  defender.caudalAutotomyLastBlock = {
    originalDamage,
    absorbedDamage,
    tailHpBefore,
    tailHpAfter: defender.caudalAutotomyTailHp,
    tailMaxHp: defender.caudalAutotomyMaxTailHp,
    destroyed: defender.caudalAutotomyTailHp <= 0
  };

  return 0;
}

function logCaudalAutotomyTailBlock(defender, attacker, battle, actionName, critical = false) {
  const block = defender.caudalAutotomyLastBlock;

  if (!defender.caudalAutotomyBlockedLastDirectHit || !block) return;

  addLog(
    battle,
    attacker.name +
      " hits " +
      defender.name +
      "'s detached tail with " +
      actionName +
      " for " +
      block.originalDamage +
      " damage" +
      (critical ? " (CRITICAL)" : "") +
      "."
  );

  if (block.destroyed) {
    addLog(
      battle,
      defender.name +
        "'s detached tail blocks " +
        block.absorbedDamage +
        " damage and is destroyed."
    );
    return;
  }

  addLog(
    battle,
    defender.name +
      "'s detached tail blocks " +
      block.absorbedDamage +
      " damage (Tail HP: " +
      block.tailHpAfter +
      "/" +
      block.tailMaxHp +
      ")."
  );
}

function handleScaledRetreatBonus(attacker, defender, battle) {
  if (!defender?.alive) return;
  if (defender.passive?.id !== "scaled-retreat") return;
  if (!defender.concentrationActive) return;
  if (defender.scaledRetreatBonusAppliedThisTurn) return;

  const hpBefore = defender.hp;
  restoreHp(defender, 20);
  const healed = defender.hp - hpBefore;
  defender.scaledRetreatBonusAppliedThisTurn = true;

  if (healed > 0) {
    addLog(
      battle,
      defender.name +
        "'s Scaled Retreat doubles the HP recovery from Concentration, restoring " +
        healed +
        " extra HP."
    );
  } else {
    addLog(
      battle,
      defender.name +
        "'s Scaled Retreat triggers, but its HP is already full."
    );
  }
}

function handleCaudalAutotomyEndTurn(fighter, battle) {
  if (!fighter.caudalAutotomyActive) return;

  const hpBefore = fighter.hp;
  restoreHp(fighter, 30);
  const healed = fighter.hp - hpBefore;

  fighter.caudalAutotomyTurns = Math.max(0, (fighter.caudalAutotomyTurns || 0) - 1);

  if (fighter.caudalAutotomyTurns > 0) {
    const tailText = (fighter.caudalAutotomyTailHp || 0) > 0
      ? "tail " + fighter.caudalAutotomyTailHp + "/" + fighter.caudalAutotomyMaxTailHp
      : "tail destroyed";

    addLog(
      battle,
      fighter.name +
        "'s Caudal Autotomy restores " +
        healed +
        " HP (" +
        fighter.caudalAutotomyTurns +
        " turn" +
        (fighter.caudalAutotomyTurns === 1 ? "" : "s") +
        " left; " +
        tailText +
        ")."
    );
    return;
  }

  fighter.caudalAutotomyActive = false;
  fighter.caudalAutotomyActivatedTurn = null;
  fighter.caudalAutotomyTailHp = 0;
  fighter.caudalAutotomyBlockedLastDirectHit = false;
  fighter.caudalAutotomyLastBlock = null;

  addLog(
    battle,
    fighter.name + "'s tail regenerates and Caudal Autotomy ends."
  );
}


function isThreeToedSloth(fighter) {
  return fighter && fighter.id === "three-toed-sloth";
}

const THREE_TOED_SLOTH_COLONIES = ["algae", "fungi", "bacteria", "mites", "lichens"];

const THREE_TOED_SLOTH_COLONY_NAMES = {
  algae: "Algae Colony",
  fungi: "Fungal Colony",
  bacteria: "Bacterial Colony",
  mites: "Mite Colony",
  lichens: "Lichen Colony"
};

function getThreeToedSlothColonyName(colonyId) {
  return THREE_TOED_SLOTH_COLONY_NAMES[colonyId] || colonyId;
}

function isThreeToedSlothDormantBiome(biome) {
  return biome === "arctic" || biome === "desert";
}

function hasThreeToedSlothColony(fighter, colonyId) {
  return (
    isThreeToedSloth(fighter) &&
    Array.isArray(fighter.slothActiveColonies) &&
    fighter.slothActiveColonies.includes(colonyId)
  );
}

function hasThreeToedSlothLichens(fighter) {
  return hasThreeToedSlothColony(fighter, "lichens");
}

function getRandomThreeToedSlothColonies(count = 2) {
  const pool = [...THREE_TOED_SLOTH_COLONIES];
  const selected = [];

  while (selected.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
}

function resetThreeToedSlothBacterialChain(fighter, battle = null, reason = "reset") {
  if (!isThreeToedSloth(fighter)) return;
  if ((fighter.slothBacterialChain || 0) <= 0) return;

  fighter.slothBacterialChain = 0;

  if (battle) {
    addLog(
      battle,
      fighter.name + "'s Bacterial Colony chain resets" + (reason ? " (" + reason + ")" : "") + "."
    );
  }
}

function setThreeToedSlothColoniesForBiome(fighter, biome, battle = null, reason = "selected") {
  if (!isThreeToedSloth(fighter)) return;

  if (fighter.slothMicroecosystemActive) {
    if (battle) {
      addLog(
        battle,
        fighter.name + " keeps all colonies active through Microecosystem Ancestral despite the biome change."
      );
    }

    return;
  }

  resetThreeToedSlothBacterialChain(fighter, battle, "ecosystem reset");

  if (isThreeToedSlothDormantBiome(biome)) {
    fighter.slothActiveColonies = [];

    if (battle) {
      addLog(
        battle,
        fighter.name + "'s Living Ecosystem enters dormancy in " + biome.toUpperCase() + ": no colonies are active."
      );
    }

    return;
  }

  fighter.slothActiveColonies = getRandomThreeToedSlothColonies(2);

  if (battle) {
    addLog(
      battle,
      fighter.name + " awakens 2 symbiotic colonies" +
        (reason === "changed" ? " after the biome shift" : "") +
        ": " + fighter.slothActiveColonies.map(getThreeToedSlothColonyName).join(", ") + "."
    );
  }
}

function refreshThreeToedSlothColoniesForBattle(battle, reason = "selected") {
  setThreeToedSlothColoniesForBiome(battle.fighterA, battle.biome, battle, reason);
  setThreeToedSlothColoniesForBiome(battle.fighterB, battle.biome, battle, reason);
}

function getThreeToedSlothMiteStaminaDiscount(fighter, actionType) {
  if (!hasThreeToedSlothColony(fighter, "mites")) return 0;
  if (!["normal", "quick", "precise", "explosive"].includes(actionType)) return 0;

  return hasThreeToedSlothLichens(fighter) ? 10 : 5;
}

function getFinalActionStaminaCost(fighter, actionType, opponent) {
  if (!ACTIONS[actionType]) return 0;

  const baseCost = ACTIONS[actionType].staminaCost;
  const extraCost = getActionExtraStaminaCost(fighter, actionType, opponent);
  const slothDiscount = getThreeToedSlothMiteStaminaDiscount(fighter, actionType);

  return Math.max(0, baseCost + extraCost - slothDiscount);
}

function getThreeToedSlothBacterialBonusForHitLevel(hitLevel) {
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

function applyThreeToedSlothBacterialDamageBonus(attacker, damage, battle) {
  if (!hasThreeToedSlothColony(attacker, "bacteria")) return damage;

  const previousChain = Math.max(0, Math.min(5, attacker.slothBacterialChain || 0));
  const hitLevel = Math.min(5, previousChain + 1);
  const bonusPct = getThreeToedSlothBacterialBonusForHitLevel(hitLevel);
  const progressGain = hasThreeToedSlothLichens(attacker) ? 2 : 1;
  const developedChain = Math.min(5, previousChain + progressGain);

  attacker.slothBacterialChain = developedChain;

  addLog(
    battle,
    attacker.name +
      "'s Bacterial Colony develops from " +
      previousChain +
      "/5 to " +
      developedChain +
      "/5" +
      (hasThreeToedSlothLichens(attacker)
        ? " through Lichen acceleration"
        : "") +
      "."
  );

  let finalDamage = damage;

  if (bonusPct > 0) {
    finalDamage = Math.max(1, Math.round(damage * (1 + bonusPct / 100)));

    addLog(
      battle,
      attacker.name +
        "'s Bacterial Colony increases this attack's damage by +" +
        bonusPct +
        "% (" +
        damage +
        " → " +
        finalDamage +
        ")."
    );
  } else {
    addLog(
      battle,
      attacker.name +
        "'s Bacterial Colony is still germinating: no damage bonus on this hit."
    );
  }

  if (hitLevel >= 5) {
    attacker.slothBacterialChain = 0;

    addLog(
      battle,
      attacker.name +
        "'s Bacterial Colony releases its peak charge and resets to 0/5."
    );
  }

  return finalDamage;
}

function handleThreeToedSlothAlgaeEndTurn(fighter, battle) {
  if (!hasThreeToedSlothColony(fighter, "algae")) return;

  const attempts = hasThreeToedSlothLichens(fighter) ? 2 : 1;

  for (let i = 0; i < attempts; i += 1) {
    if (Math.random() >= 0.5) {
      addLog(
        battle,
        fighter.name + "'s Algae Colony fails to restore on roll " + (i + 1) + "/" + attempts + "."
      );
      continue;
    }

    const hpBefore = fighter.hp;
    const staminaBefore = fighter.stamina;

    restoreHp(fighter, 30);
    restoreStamina(fighter, 15, battle);

    const healed = fighter.hp - hpBefore;
    const staminaRestored = fighter.stamina - staminaBefore;

    addLog(
      battle,
      fighter.name +
        "'s Algae Colony restores " +
        healed +
        " HP and " +
        staminaRestored +
        " stamina" +
        (attempts > 1 ? " on roll " + (i + 1) + "/" + attempts : "") +
        "."
    );
  }
}

function activateThreeToedSlothMicroecosystem(attacker, battle) {
  attacker.slothMicroecosystemActive = true;
  attacker.slothMicroecosystemTurns = 3;
  attacker.slothActiveColonies = [...THREE_TOED_SLOTH_COLONIES];

  addLog(
    battle,
    attacker.name +
      " activates Microecosystem Ancestral: all 5 colonies awaken for 3 turns."
  );
}

function tickThreeToedSlothMicroecosystem(fighter, battle) {
  if (!isThreeToedSloth(fighter)) return;
  if (!fighter.slothMicroecosystemActive) return;

  fighter.slothMicroecosystemTurns = Math.max(0, (fighter.slothMicroecosystemTurns || 0) - 1);

  if (fighter.slothMicroecosystemTurns > 0) return;

  fighter.slothMicroecosystemActive = false;
  fighter.slothActiveColonies = [];

  addLog(
    battle,
    fighter.name + "'s Microecosystem Ancestral ends. The ecosystem adapts to the current biome."
  );

  setThreeToedSlothColoniesForBiome(fighter, battle.biome, battle, "changed");
}


function isCoconutOctopus(fighter) {
  return fighter && fighter.id === "coconut-octopus";
}

function getCoconutOctopusForms() {
  return animals["coconut-octopus"]?.octopusForms || {};
}

function getCoconutOctopusFormDefinition(formId) {
  return getCoconutOctopusForms()[formId] || null;
}

const COCONUT_OCTOPUS_FORM_IDS = ["base", "offensive", "defensive", "evasive"];

function ensureCoconutOctopusSpecialChargeState(fighter) {
  if (!isCoconutOctopus(fighter)) return;

  if (!fighter.octopusSpecialCharges) {
    fighter.octopusSpecialCharges = { base: 0, offensive: 0, defensive: 0, evasive: 0 };
  }

  if (!fighter.octopusSpecialReadyAnnounced) {
    fighter.octopusSpecialReadyAnnounced = { base: false, offensive: false, defensive: false, evasive: false };
  }

  COCONUT_OCTOPUS_FORM_IDS.forEach((formId) => {
    if (typeof fighter.octopusSpecialCharges[formId] !== "number") {
      fighter.octopusSpecialCharges[formId] = 0;
    }

    if (typeof fighter.octopusSpecialReadyAnnounced[formId] !== "boolean") {
      fighter.octopusSpecialReadyAnnounced[formId] = false;
    }
  });
}

function getCoconutOctopusCurrentFormId(fighter) {
  return COCONUT_OCTOPUS_FORM_IDS.includes(fighter?.octopusForm)
    ? fighter.octopusForm
    : "base";
}

function getCoconutOctopusFormSpecialRequirement(fighter, formId = null) {
  if (!isCoconutOctopus(fighter)) return fighter?.special?.chargeHits ?? 0;

  const activeForm = formId || getCoconutOctopusCurrentFormId(fighter);
  const form = getCoconutOctopusFormDefinition(activeForm);
  return form?.special?.chargeHits ?? fighter.special?.chargeHits ?? 0;
}

function getCoconutOctopusFormSpecialCharge(fighter, formId = null) {
  if (!isCoconutOctopus(fighter)) return fighter?.specialCharge ?? 0;

  ensureCoconutOctopusSpecialChargeState(fighter);
  const activeForm = formId || getCoconutOctopusCurrentFormId(fighter);
  return fighter.octopusSpecialCharges[activeForm] || 0;
}

function setCoconutOctopusFormSpecialCharge(fighter, formId, value) {
  if (!isCoconutOctopus(fighter)) return;

  ensureCoconutOctopusSpecialChargeState(fighter);
  const activeForm = COCONUT_OCTOPUS_FORM_IDS.includes(formId) ? formId : "base";
  const requirement = getCoconutOctopusFormSpecialRequirement(fighter, activeForm);
  fighter.octopusSpecialCharges[activeForm] = Math.max(0, Math.min(requirement, value || 0));
}

function syncCoconutOctopusDisplayedSpecialCharge(fighter) {
  if (!isCoconutOctopus(fighter)) return;

  const activeForm = getCoconutOctopusCurrentFormId(fighter);
  fighter.specialCharge = getCoconutOctopusFormSpecialCharge(fighter, activeForm);
  fighter.specialReadyAnnounced = Boolean(fighter.octopusSpecialReadyAnnounced?.[activeForm]);
}

function removeCoconutOctopusPredatoryPressure(fighter, battle) {
  if (!isCoconutOctopus(fighter) || !battle) return;

  const fighters = [battle.fighterA, battle.fighterB];

  fighters.forEach((target) => {
    if (!target?.effects) return;

    const before = target.effects.length;
    target.effects = target.effects.filter((effect) => {
      return !(effect.id === "predatory-pressure" && effect.sourceId === fighter.id);
    });

    if (before !== target.effects.length) {
      addLog(
        battle,
        fighter.name + "'s Predatory Pressure stacks disappear from " + target.name + "."
      );
    }
  });

  fighter.octopusPredatoryPressureStacks = 0;
}

function clearCoconutOctopusFormStacks(fighter, battle, previousForm) {
  if (!isCoconutOctopus(fighter)) return;

  if (previousForm === "offensive") {
    removeCoconutOctopusPredatoryPressure(fighter, battle);
  }
}

function applyCoconutOctopusForm(fighter, formId) {
  if (!isCoconutOctopus(fighter)) return false;

  const form = getCoconutOctopusFormDefinition(formId);
  if (!form) return false;

  fighter.octopusForm = formId;
  fighter.stats = { ...form.stats };
  fighter.passive = form.passive ? { ...form.passive } : null;
  fighter.special = form.special ? { ...form.special } : null;

  fighter.maxHp = fighter.stats.life * 10;
  fighter.hp = Math.min(fighter.hp, fighter.maxHp);

  fighter.maxStamina = fighter.stats.resistance * 4;
  fighter.stamina = Math.min(fighter.stamina, fighter.maxStamina);

  syncCoconutOctopusDisplayedSpecialCharge(fighter);

  return true;
}

export function transformCoconutOctopus(fighter, formId, battle = null) {
  if (!isCoconutOctopus(fighter)) {
    return {
      ok: false,
      message: "Only Coconut Octopus can transform."
    };
  }

  const allowedForms = COCONUT_OCTOPUS_FORM_IDS;

  if (!allowedForms.includes(formId)) {
    return {
      ok: false,
      message: "Invalid Coconut Octopus form."
    };
  }

  if (fighter.octopusForm === formId) {
    return {
      ok: false,
      message: fighter.name + " is already in " + getCoconutOctopusFormDefinition(formId).name + "."
    };
  }

  const free = Boolean(fighter.octopusFreeTransformationAvailable);
  const charges = fighter.octopusAdaptationCharges || 0;

  if (!free && charges <= 0) {
    return {
      ok: false,
      message: fighter.name + " has no adaptation charges left."
    };
  }

  ensureCoconutOctopusSpecialChargeState(fighter);

  const previousForm = fighter.octopusForm || "base";
  setCoconutOctopusFormSpecialCharge(fighter, previousForm, fighter.specialCharge || 0);
  clearCoconutOctopusFormStacks(fighter, battle, previousForm);

  if (free) {
    fighter.octopusFreeTransformationAvailable = false;
  } else {
    fighter.octopusAdaptationCharges = Math.max(0, charges - 1);
  }

  applyCoconutOctopusForm(fighter, formId);

  const form = getCoconutOctopusFormDefinition(formId);

  if (battle) {
    addLog(
      battle,
      fighter.name +
        " adapts into " +
        form.name +
        (free
          ? " for free through Initial Adaptation."
          : ". Adaptation charges left: " + fighter.octopusAdaptationCharges + ".")
    );
  }

  return {
    ok: true,
    message:
      fighter.name +
      " transformed into " +
      form.name +
      (free ? " for free." : ". Charges left: " + fighter.octopusAdaptationCharges + ".")
  };
}

export function setCoconutOctopusPerfectAdaptationChoice(fighter, choice) {
  if (!isCoconutOctopus(fighter)) return false;

  const allowedChoices = ["tentacle-storm", "coconut-fortress", "ink-sea"];

  if (!allowedChoices.includes(choice)) return false;

  fighter.octopusPerfectAdaptationChoice = choice;
  return true;
}

function applyCoconutOctopusPredatoryPressure(attacker, defender, battle) {
  if (!isCoconutOctopus(attacker)) return;
  if (attacker.octopusForm !== "offensive") return;
  if (attacker.passive?.id !== "predatory-pressure") return;
  if (!defender?.alive) return;

  attacker.octopusPredatoryPressureStacks = Math.min(
    8,
    (attacker.octopusPredatoryPressureStacks || 0) + 1
  );

  const reduction = attacker.octopusPredatoryPressureStacks * 5;

  addEffect(
    defender,
    createPredatoryPressureEffect(reduction, attacker.id),
    battle
  );

  addLog(
    battle,
    attacker.name +
      "'s Predatory Pressure reduces " +
      defender.name +
      "'s Attack by " +
      reduction +
      "% (" +
      attacker.octopusPredatoryPressureStacks +
      "/8 stack" +
      (attacker.octopusPredatoryPressureStacks === 1 ? "" : "s") +
      ")."
  );
}

function handleCoconutOctopusMissPassive(defender, battle, attacker = null) {
  if (!isCoconutOctopus(defender)) return;
  if (defender.octopusForm !== "evasive") return;
  if (defender.passive?.id !== "perfect-camouflage") return;
  if (!defender.alive) return;

  const hpBefore = defender.hp;
  const staminaBefore = defender.stamina;

  restoreHp(defender, 15);
  restoreStamina(defender, 15, battle);

  const healed = defender.hp - hpBefore;
  const staminaRestored = defender.stamina - staminaBefore;

  addLog(
    battle,
    defender.name +
      "'s Perfect Camouflage converts the miss into survival: +" +
      healed +
      " HP and +" +
      staminaRestored +
      " stamina."
  );
}

function applyCoconutFortressDefense(defender, damage, battle) {
  if (!isCoconutOctopus(defender)) return damage;
  if (!defender.coconutFortressActive) return damage;

  if (damage > 0) {
    addLog(
      battle,
      defender.name +
        "'s Coconut Fortress reduces incoming damage from " +
        damage +
        " to 0."
    );
  }

  return 0;
}

function getCoconutOctopusSpecialChoice(attacker) {
  if (attacker.octopusForm === "offensive") return "tentacle-storm";
  if (attacker.octopusForm === "defensive") return "coconut-fortress";
  if (attacker.octopusForm === "evasive") return "ink-sea";

  return attacker.octopusPerfectAdaptationChoice || "tentacle-storm";
}

function calculateCoconutTentacleDamage(attacker, defender, battle) {
  const attackValue = getEffectiveStat(attacker, "attack", battle, defender, "special");
  const explosiveValue = getEffectiveStat(attacker, "explosiveness", battle, defender, "special");
  const hybridAttack = attackValue * 0.65 + explosiveValue * 0.35;
  const defense = getEffectiveStat(defender, "defense", battle);

  const difference = hybridAttack - defense;
  const multiplier = 70 + difference / 4;
  const finalMultiplier = multiplier / 100;

  return {
    damage: Math.max(1, Math.round(hybridAttack * finalMultiplier)),
    attackValue: Math.round(attackValue * 100) / 100,
    explosivenessValue: Math.round(explosiveValue * 100) / 100,
    hybridAttack: Math.round(hybridAttack * 100) / 100,
    defenseValue: Math.round(defense * 100) / 100,
    multiplier: Math.round(multiplier * 100) / 100
  };
}

function applyDirectHitRecoil(attacker, defender, battle, damage) {
  if (!attacker?.alive || !defender || damage <= 0) return;

  if (defender.id === "pufferfish") {
    applyDamage(attacker, 10);

    addLog(
      battle,
      attacker.name +
        " suffers 10 damage from " +
        defender.name +
        "'s spines."
    );
  }

  if (
    isCoconutOctopus(defender) &&
    defender.octopusForm === "defensive" &&
    defender.passive?.id === "coconut-shell"
  ) {
    applyDamage(attacker, 10);

    addLog(
      battle,
      attacker.name +
        " suffers 10 damage from " +
        defender.name +
        "'s Coconut Shell."
    );
  }
}

function performCoconutTentacleStorm(attacker, defender, battle) {
  let successfulHits = 0;
  let totalDamage = 0;

  addLog(
    battle,
    attacker.name + " uses Tentacle Storm, striking with all eight arms."
  );

  for (let i = 1; i <= 8; i++) {
    const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(30);

    if (!hit) {
      addLog(
        battle,
        attacker.name +
          "'s Tentacle Storm hit " +
          i +
          " misses " +
          defender.name +
          "."
      );

      handleReactiveChargeOnMiss(attacker, defender, battle);
      continue;
    }

    let damageInfo = calculateCoconutTentacleDamage(attacker, defender, battle);
    let damage = damageInfo.damage;

    damage = applyIllusoryDanceDefense(defender, damage, battle);
    damage = applyCostalEversionDefense(defender, attacker, damage, battle);
    damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
    damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
    damage = applyCoconutFortressDefense(defender, damage, battle);
    damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

    applyDamage(defender, damage);
    applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

    successfulHits += 1;
    totalDamage += damage;

    addLog(
      battle,
      attacker.name +
        "'s Tentacle Storm hit " +
        i +
        " lands on " +
        defender.name +
        " for " +
        damage +
        " damage."
    );

    applyCoconutOctopusPredatoryPressure(attacker, defender, battle);

    if (!attacker.alive || !defender.alive) {
      break;
    }
  }

  addLog(
    battle,
    attacker.name +
      "'s Tentacle Storm ends with " +
      successfulHits +
      " hit" +
      (successfulHits === 1 ? "" : "s") +
      " and " +
      totalDamage +
      " total damage."
  );

  if (successfulHits > 0) {
    handleChargeGain(attacker, defender, true, battle);
  }

  consumeSpecialCharge(attacker);
}

function performCoconutFortressSpecial(attacker, battle) {
  attacker.coconutFortressActive = true;

  const hpBefore = attacker.hp;
  const staminaBefore = attacker.stamina;

  restoreHp(attacker, 50);
  restoreStamina(attacker, 50, battle);

  const healed = attacker.hp - hpBefore;
  const staminaRestored = attacker.stamina - staminaBefore;

  addLog(
    battle,
    attacker.name +
      " uses Coconut Fortress: all received damage is reduced to 0 this turn. It restores " +
      healed +
      " HP and " +
      staminaRestored +
      " stamina."
  );

  consumeSpecialCharge(attacker);
}

function performCoconutInkSeaSpecial(attacker, defender, battle) {
  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name + "'s Ink Sea fails to cover " + defender.name + "."
    );

    consumeSpecialCharge(attacker);
    return;
  }

  addEffect(defender, createInkSeaEffect(3, 50), battle);

  addLog(
    battle,
    attacker.name +
      " uses Ink Sea. " +
      defender.name +
      " suffers -50% Speed and -50% Technique for 3 turns."
  );

  consumeSpecialCharge(attacker);
}

function performCoconutOctopusSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const choice = getCoconutOctopusSpecialChoice(attacker);

  if (attacker.octopusForm === "base") {
    addLog(
      battle,
      attacker.name +
        " uses Perfect Adaptation and chooses " +
        getCoconutOctopusFormDefinition(choice === "tentacle-storm" ? "offensive" : choice === "coconut-fortress" ? "defensive" : "evasive").special.name +
        " without changing form."
    );
  }

  if (choice === "tentacle-storm") {
    performCoconutTentacleStorm(attacker, defender, battle);
    return;
  }

  if (choice === "coconut-fortress") {
    performCoconutFortressSpecial(attacker, battle);
    return;
  }

  if (choice === "ink-sea") {
    performCoconutInkSeaSpecial(attacker, defender, battle);
    return;
  }

  addLog(battle, attacker.name + "'s adaptation fails to find a form.");
  consumeSpecialCharge(attacker);
}


function fennecOasisIsActive(battle, fighter) {
  const oasis = getBattleEffect(battle, "oasis");

  return (
    oasis &&
    fighter &&
    fighter.passive &&
    fighter.passive.id === "thoths-mirage" &&
    oasis.sourceId === fighter.id
  );
}

function applyFennecOasisHitCap(attacker, defender, battle, hitChance) {
  if (!battle || !defender) {
    return hitChance;
  }

  if (!fennecOasisIsActive(battle, defender)) {
    return hitChance;
  }

  const cappedHitChance = Math.min(hitChance, 50);

  if (hitChance > 50) {
    const illusionLogs = [
      "The oasis bends the horizon. The attack strikes only illusion.",
      "Heat distortion deceives the senses.",
      "The mirage swallows the blow.",
      "The Fennec vanishes behind the shimmering air."
    ];

    addLog(
      battle,
      illusionLogs[Math.floor(Math.random() * illusionLogs.length)] +
        " Hit chance is capped at 50%."
    );
  }

  return cappedHitChance;
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
  return (attacker.falconStacks || 0) * 5;
}

function getFalconExplosivenessBonusPercent(attacker) {
  if (attacker.passive?.id !== "hunting-inertia") return 0;
  return (attacker.falconStacks || 0) * 10;
}

function increaseFalconStacks(attacker, battle) {
  if (attacker.passive?.id !== "hunting-inertia") return;

  const before = attacker.falconStacks || 0;
  attacker.falconStacks = Math.min(before + 1, 4);

  if (attacker.falconStacks > before) {
    const damageBonusPct = attacker.falconStacks * 5;
    const explosivenessBonusPct = attacker.falconStacks * 10;

    addLog(
      battle,
      `${attacker.name}'s Hunting Inertia rises to ${attacker.falconStacks}/4 (+${damageBonusPct}% damage, +${explosivenessBonusPct}% Explosiveness).`
    );
  }
}

function resetFalconStacks(attacker, battle, reason = "") {
  if (attacker.passive?.id !== "hunting-inertia") return;
  if ((attacker.falconStacks || 0) === 0) return;

  attacker.falconStacks = 0;

  addLog(
    battle,
    `${attacker.name}'s Hunting Inertia resets${reason ? ` (${reason})` : ""}.`
  );
}

function getTigerStalkStacks(fighter) {
  if (fighter.passive?.id !== "silent-stalk") return 0;
  return Math.max(0, Math.min(4, fighter.tigerStalkStacks || 0));
}

function getTigerStalkStatBonusPercent(fighter, stat) {
  const stacks = getTigerStalkStacks(fighter);
  if (stacks <= 0) return 0;

  if (stat === "attack") return stacks * 5;
  if (stat === "speed" || stat === "explosiveness") return stacks * 10;

  return 0;
}

function resetTigerStalkStacks(fighter, battle, reason = "") {
  if (fighter.passive?.id !== "silent-stalk") return;
  if ((fighter.tigerStalkStacks || 0) <= 0) return;

  fighter.tigerStalkStacks = 0;

  addLog(
    battle,
    `${fighter.name}'s Silent Stalk resets${reason ? ` (${reason})` : ""}.`
  );
}

function consumeTigerStalkStacks(fighter, battle, reason = "Throat Bite") {
  if (fighter.passive?.id !== "silent-stalk") return 0;

  const consumed = getTigerStalkStacks(fighter);
  if (consumed <= 0) return 0;

  fighter.tigerStalkStacks = 0;

  addLog(
    battle,
    `${fighter.name}'s Silent Stalk consumes ${consumed} Stalk stack${consumed === 1 ? "" : "s"} (${reason}).`
  );

  return consumed;
}

function handleTigerSilentStalkEndTurn(fighter, battle) {
  if (fighter.passive?.id !== "silent-stalk") return;

  const current = getTigerStalkStacks(fighter);

  if (fighter.tigerTookDirectDamageThisTurn) {
    if (current > 0) {
      fighter.tigerStalkStacks = Math.max(0, current - 1);

      addLog(
        battle,
        `${fighter.name}'s Silent Stalk is disrupted by direct damage (${current} → ${fighter.tigerStalkStacks}/4).`
      );
    }

    return;
  }

  if (current < 4) {
    fighter.tigerStalkStacks = current + 1;

    addLog(
      battle,
      `${fighter.name}'s Silent Stalk gains 1 Stalk stack (${fighter.tigerStalkStacks}/4).`
    );
  }
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

function isFennecMirageUser(fighter) {
  return (
    fighter &&
    fighter.passive &&
    fighter.passive.id === "thoths-mirage"
  );
}

function isFennecMirageComplete(fighter) {
  if (!fighter || !fighter.fennecMirageProgress) {
    return false;
  }

  return (
    fighter.fennecMirageProgress.quick &&
    fighter.fennecMirageProgress.explosive &&
    fighter.fennecMirageProgress.concentration >= 2
  );
}

function handleFennecMirageProgress(fighter, battle, requirement) {
  if (!isFennecMirageUser(fighter)) {
    return;
  }

  if (fennecOasisIsActive(battle, fighter)) {
    return;
  }

  if (!fighter.fennecMirageProgress) {
    fighter.fennecMirageProgress = {
      quick: false,
      explosive: false,
      concentration: 0
    };
  }

  if (requirement === "quick" && !fighter.fennecMirageProgress.quick) {
    fighter.fennecMirageProgress.quick = true;

    addLog(
      battle,
      fighter.name + " fulfills Thoth's Mirage requirement: successful Quick Attack."
    );
  }

  if (requirement === "explosive" && !fighter.fennecMirageProgress.explosive) {
    fighter.fennecMirageProgress.explosive = true;

    addLog(
      battle,
      fighter.name + " fulfills Thoth's Mirage requirement: successful Explosive Attack."
    );
  }

  if (
    requirement === "concentration" &&
    fighter.fennecMirageProgress.concentration < 2
  ) {
    fighter.fennecMirageProgress.concentration += 1;

    addLog(
      battle,
      fighter.name +
        " fulfills Thoth's Mirage requirement: Concentration " +
        fighter.fennecMirageProgress.concentration +
        "/2."
    );
  }

  if (isFennecMirageComplete(fighter)) {
    const oasisDuration = battle.biome === "desert" ? 6 : 3;

    addBattleEffect(battle, createOasisEffect(oasisDuration, fighter.id));

    addLog(
      battle,
      fighter.name +
        " completes Thoth's Mirage and summons the Oasis for " +
        oasisDuration +
        " full turns."
    );

    if (battle.biome === "desert") {
      addLog(
        battle,
        "The desert answers the mirage: Oasis duration is extended to 6 turns."
      );
    }

    fighter.fennecMirageProgress = {
      quick: false,
      explosive: false,
      concentration: 0
    };

    fighter.fennecOasisReady = false;
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
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    if (fennecOasisIsActive(battle, defender)) {
      addLog(
        battle,
        "The Oasis distorts Marine Echo. The second hit fades into the mirage."
      );
    }

    addLog(
      battle,
      attacker.name +
        "'s Marine Echo triggers, but the second hit misses " +
        defender.name +
        "."
    );

    handleReactiveChargeOnMiss(attacker, defender, battle);

    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "passive"
  );

  let damage = damageInfo.damage;

  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  addLog(
    battle,
    attacker.name +
      "'s Marine Echo triggers: second hit deals " +
      damage +
      " damage."
  );
}

function resolvePhantomCurrentStrike(fighter, opponent, battle) {
  if (!fighter.phantomCurrentActive) return;

  if (!fighter.alive || !opponent.alive) {
    fighter.phantomCurrentActive = false;
    return;
  }

  const precision = getEffectiveStat(fighter, "speed", battle, opponent, "special");
  const evasion = calculateEvasion(opponent, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(fighter, opponent, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(opponent) ? true : rollHit(hitChance);

  if (!hit) {
    if (fennecOasisIsActive(battle, opponent)) {
      addLog(
        battle,
        "The Oasis distorts Phantom Current. The strike cuts through a false image."
      );
    }

    addLog(
      battle,
      fighter.name +
        "'s Phantom Current strike misses " +
        opponent.name +
        "."
    );

    handleReactiveChargeOnMiss(fighter, opponent, battle);

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

  let damage = Math.max(1, Math.round(damageInfo.damage * 2));

  damage = applyIllusoryDanceDefense(opponent, damage, battle);
  damage = applyCostalEversionDefense(opponent, fighter, damage, battle);
  damage = applyCaudalAutotomyDefense(opponent, fighter, damage, battle);
  damage = applyAncestralRetreatDefense(opponent, fighter, damage, battle);
  damage = applyCoconutFortressDefense(opponent, damage, battle);
  damage = applyDarwinsLarvalDefense(opponent, fighter, damage, battle);

  applyDamage(opponent, damage);
  applyDirectHitRecoil(fighter, opponent, battle, damage);

  addLog(
    battle,
    fighter.name +
      " strikes from Phantom Current for " +
      damage +
      " damage."
  );

  addLog(
    battle,
    "Phantom Current calc -> Speed precision: " +
      Math.round(precision * 10) / 10 +
      " | Evasion: " +
      Math.round(evasion * 10) / 10 +
      " | Hit chance: " +
      Math.round(hitChance * 10) / 10 +
      "%."
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

  if (fighter.passive?.id === "circadian-cycle") {
    if (isCircadianDay(battle)) {
      if (stat === "attack") value *= 0.5;
      if (stat === "defense") value *= 1.5;
      if (stat === "technique") value *= 0.75;
      if (stat === "agility") value *= 0.75;
    }

    if (isCircadianNight(battle)) {
      if (stat === "attack") value *= 1.5;
      if (stat === "agility") value *= 1.25;
      if (stat === "technique") value *= 1.25;
    }
  }

  if (
    battle &&
    stat === battle.biomeStat &&
    ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(stat)
  ) {
    value *= getBiomeModifierForFighter(fighter, battle.biome);
  }

  if (
    battle &&
    fennecOasisIsActive(battle, fighter) &&
    ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(stat)
  ) {
    value += fighter.stats[stat] * 0.1;
  }

  const ignoresFatigue = fighter.passive?.id === "savage-endurance";

  if (
    !ignoresFatigue &&
    ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(stat)
  ) {
    value *= getFatigueMultiplier(fighter);
  }

  const directStatModifier = getDerivedModifierPercent(fighter, stat + "Pct");

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

  const tigerStalkBonusPct = getTigerStalkStatBonusPercent(fighter, stat);

  if (tigerStalkBonusPct > 0) {
    value *= 1 + tigerStalkBonusPct / 100;
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

  if (stat === "explosiveness") {
    const falconExplosivenessBonusPct = getFalconExplosivenessBonusPercent(fighter);

    if (falconExplosivenessBonusPct > 0) {
      value *= 1 + falconExplosivenessBonusPct / 100;
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
  const finalDamage = Math.max(0, Math.round(damage));

  if (finalDamage <= 0) return;

  defender.hp -= finalDamage;
  defender.damageTakenThisTurn += finalDamage;

  if (defender.passive?.id === "silent-stalk") {
    defender.tigerTookDirectDamageThisTurn = true;
  }

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

  let extraCost = 0;

  if (isOffensiveActionTargeting(actionType, fighter)) {
    if (opponent?.passive?.id === "suffocating-humidity" && humidityIsActive(opponent)) {
      extraCost += 5;
    }

    extraCost += getRibbedGuardExtraStaminaCost(opponent);
  }

  return extraCost;
}

export function spendStamina(fighter, amount, battle = null) {
  fighter.stamina = Math.max(0, fighter.stamina - amount);
  if (battle) updateFatigueState(fighter, battle);
}

function hasMatamataAmbushReady(attacker, battle = null) {
  if (
    !attacker ||
    !attacker.passive ||
    attacker.passive.id !== "immobile-stalk" ||
    !attacker.matamataAmbushReady
  ) {
    return false;
  }

  if (!battle) {
    return true;
  }

  if (attacker.matamataAmbushReadyTurn === null) {
    return true;
  }

  return battle.turn >= attacker.matamataAmbushReadyTurn;
}

function applyMatamataAmbushBonus(attacker, defender, damage, battle) {
  if (!hasMatamataAmbushReady(attacker, battle)) {
    return damage;
  }

  const boostedDamage = Math.max(1, Math.round(damage * 2));
  const stolenStamina = Math.min(20, defender.stamina);

  if (stolenStamina > 0) {
    spendStamina(defender, stolenStamina, battle);
    restoreStamina(attacker, stolenStamina, battle);
  }

  attacker.matamataStalkCharges = 0;
  attacker.matamataAmbushReady = false;
  attacker.matamataAmbushReadyTurn = null;

  addLog(
    battle,
    attacker.name +
      "'s Immobile Stalk triggers: the attack cannot miss, deals double damage, and absorbs " +
      stolenStamina +
      " stamina from " +
      defender.name +
      "."
  );

  return boostedDamage;
}

function applyAncestralRetreatDefense(defender, attacker, damage, battle) {
  if (
    !defender ||
    !attacker ||
    !defender.ancestralRetreatActive ||
    damage <= 0
  ) {
    return damage;
  }

  const originalDamage = damage;
  const reducedDamage = Math.max(0, Math.round(originalDamage * 0.5));
  const reflectedDamage = Math.max(1, Math.round(originalDamage * 0.25));

  addLog(
    battle,
    defender.name +
      "'s Ancestral Retreat reduces incoming direct damage from " +
      originalDamage +
      " to " +
      reducedDamage +
      "."
  );

  if (attacker.alive && reflectedDamage > 0) {
    applyDamage(attacker, reflectedDamage);

    addLog(
      battle,
      defender.name +
        "'s Ancestral Retreat reflects " +
        reflectedDamage +
        " damage back to " +
        attacker.name +
        "."
    );
  }

  return reducedDamage;
}

function applyDarwinsLarvalDefense(defender, attacker, damage, battle) {
  if (
    !defender ||
    !battle ||
    !isDarwinsFrog(defender) ||
    !defender.darwinsLarvalDefense ||
    defender.darwinsLarvalDefense <= 0 ||
    damage <= 0
  ) {
    return damage;
  }

  const larvaeDefending = defender.darwinsLarvalDefense;
  const originalDamage = damage;

  let reducedDamage = damage;

  if (larvaeDefending === 1) {
    reducedDamage = Math.max(0, Math.round(originalDamage * 0.5));
  }

  if (larvaeDefending >= 2) {
    reducedDamage = 0;
  }

  addLog(
    battle,
    defender.name +
      "'s Larval Defense blocks " +
      (larvaeDefending >= 2 ? "all" : "half of") +
      " the incoming direct damage (" +
      originalDamage +
      " → " +
      reducedDamage +
      ")."
  );

  return reducedDamage;
}

function darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle) {
  if (!defender || !defender.darwinsLarvalBlocksEffects) {
    return false;
  }

  addLog(
    battle,
    defender.name +
      "'s Larval Defense blocks secondary effects and status changes."
  );

  return true;
}

function tryMantisDecapitation(attacker, defender, battle) {
  if (
    !attacker ||
    !defender ||
    !battle ||
    !attacker.passive ||
    attacker.passive.id !== "decapitation" ||
    !defender.alive
  ) {
    return false;
  }

  if (defender.hp > defender.maxHp * 0.25) {
    return false;
  }

  const decapitationChance = 0.2;

  if (Math.random() >= decapitationChance) {
    addLog(
      battle,
      attacker.name +
        "'s Decapitation threatens " +
        defender.name +
        ", but the execution fails."
    );

    return false;
  }

  defender.hp = 0;
  defender.alive = false;

    addLog(
    battle,
    attacker.name +
      "'s Decapitation triggers: " +
      defender.name +
      " is instantly killed."
  );

  addLog(
    battle,
    attacker.name +
      "'s raptorial blades shear through " +
      defender.name +
      "'s neck. " +
      defender.name +
      "'s severed head hits the ground."
  );

  finishBattleIfNeeded(battle);

  return true;
}

function isDarwinsFrog(fighter) {
  return (
    fighter &&
    fighter.passive &&
    fighter.passive.id === "larval-gestation"
  );
}

function addDarwinsLarvae(fighter, amount, battle, reason = "Larval Gestation") {
  if (!isDarwinsFrog(fighter)) {
    return 0;
  }

  const maxLarvae = fighter.darwinsMaxLarvae || 5;
  const currentLarvae = fighter.darwinsLarvae || 0;
  const availableSpace = Math.max(0, maxLarvae - currentLarvae);
  const larvaeAdded = Math.min(amount, availableSpace);

  if (larvaeAdded <= 0) {
    addLog(
      battle,
      fighter.name +
        "'s " +
        reason +
        " cannot generate more larvae (" +
        currentLarvae +
        "/" +
        maxLarvae +
        ")."
    );

    return 0;
  }

  fighter.darwinsLarvae = currentLarvae + larvaeAdded;

  addLog(
    battle,
    fighter.name +
      "'s " +
      reason +
      " generates " +
      larvaeAdded +
      " larva" +
      (larvaeAdded === 1 ? "" : "e") +
      " (" +
      fighter.darwinsLarvae +
      "/" +
      maxLarvae +
      ")."
  );

  return larvaeAdded;
}

function handleDarwinsLarvalGestation(fighter, battle) {
  if (!isDarwinsFrog(fighter)) {
    return;
  }

  if ((fighter.darwinsLarvae || 0) >= (fighter.darwinsMaxLarvae || 5)) {
    return;
  }

  if (Math.random() < 0.25) {
    addDarwinsLarvae(fighter, 1, battle, "Larval Gestation");
  }
}

function normalizeDarwinsLarvalCommand(command) {
  const safeCommand = command || {};

  return {
    attack: Math.max(0, Math.floor(safeCommand.attack || 0)),
    defense: Math.max(0, Math.min(2, Math.floor(safeCommand.defense || 0))),
    sacrifice: Math.max(0, Math.floor(safeCommand.sacrifice || 0))
  };
}

function getDarwinsLarvalCommandCost(command) {
  const normalized = normalizeDarwinsLarvalCommand(command);

  return normalized.attack + normalized.defense + normalized.sacrifice;
}

export function canUseAction(fighter, actionType, battle = null) {
  if (!ACTIONS[actionType]) return false;

  const opponent =
    battle
      ? battle.fighterA.id === fighter.id
        ? battle.fighterB
        : battle.fighterA
      : null;

  if (actionType === "larval-command") {
    if (!isDarwinsFrog(fighter)) return false;

    const commandCost = getDarwinsLarvalCommandCost(fighter.darwinsLarvalCommand);
    const larvae = fighter.darwinsLarvae || 0;

    return commandCost > 0 && commandCost <= larvae;
  }

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

    if (
      fighter.special.id === "nocturnal-hunt" &&
      battle &&
      !isCircadianNight(battle)
    ) {
      return false;
    }

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

    if (fighter.special.id === "ancestral-microecosystem") {
      if (!battle) return false;
      if (isThreeToedSlothDormantBiome(battle.biome)) return false;
      if (fighter.slothMicroecosystemActive) return false;
    }

    if (fighter.special.id === "costal-eversion" && fighter.hp <= 50) {
      return false;
    }

    if (fighter.parasiticControlActive || fighter.nervousDisruptionActive) return false;

    const specialExtraCost = getFinalActionStaminaCost(fighter, actionType, opponent);
    if (specialExtraCost > 0 && fighter.stamina < specialExtraCost) return false;

    if (isCoconutOctopus(fighter)) {
      syncCoconutOctopusDisplayedSpecialCharge(fighter);
      return getCoconutOctopusFormSpecialCharge(fighter) >= getCoconutOctopusFormSpecialRequirement(fighter);
    }

    return fighter.specialCharge >= fighter.special.chargeHits;
  }

  const finalCost = getFinalActionStaminaCost(fighter, actionType, opponent);

  return fighter.stamina >= finalCost;
}

export function getActionPriority(actionType, fighter = null) {
  if (actionType === "special") {
    if (fighter?.special?.id === "total-regeneration") return 8;
    if (fighter?.special?.id === "illusory-dance") return 6;
    if (fighter?.special?.id === "costal-eversion") return 6;
    if (fighter?.special?.id === "deadly-dive") return 6;
    if (fighter?.special?.id === "marine-flash") return 7;
    if (fighter?.special?.id === "overinflation") return 9;
    if (fighter?.special?.id === "coconut-fortress") return 8;
    if (
      fighter?.special?.id === "perfect-adaptation" &&
      fighter?.octopusPerfectAdaptationChoice === "coconut-fortress"
    ) return 8;
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

  if (isCoconutOctopus(fighter)) {
    ensureCoconutOctopusSpecialChargeState(fighter);

    const formId = getCoconutOctopusCurrentFormId(fighter);
    const requirement = getCoconutOctopusFormSpecialRequirement(fighter, formId);
    const before = getCoconutOctopusFormSpecialCharge(fighter, formId);
    const next = Math.min(requirement, before + amount);

    setCoconutOctopusFormSpecialCharge(fighter, formId, next);
    syncCoconutOctopusDisplayedSpecialCharge(fighter);

    if (
      next >= requirement &&
      before < requirement &&
      !fighter.octopusSpecialReadyAnnounced[formId]
    ) {
      fighter.octopusSpecialReadyAnnounced[formId] = true;
      syncCoconutOctopusDisplayedSpecialCharge(fighter);

      const formName = getCoconutOctopusFormDefinition(formId)?.name || formId;
      addLog(battle, `${fighter.name}'s ${formName} Special Attack is ready.`);
    }

    return;
  }

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

  if (isCoconutOctopus(fighter)) {
    ensureCoconutOctopusSpecialChargeState(fighter);
    const formId = getCoconutOctopusCurrentFormId(fighter);
    setCoconutOctopusFormSpecialCharge(fighter, formId, 0);
    fighter.octopusSpecialReadyAnnounced[formId] = false;
    syncCoconutOctopusDisplayedSpecialCharge(fighter);
    return;
  }

  fighter.specialCharge = 0;
  fighter.specialReadyAnnounced = false;
}

function activateIllusoryDanceBuff(fighter, battle) {
  if (!fighter.illusoryDanceActive) return;
  if (fighter.illusoryDanceBuffReady) return;

  fighter.illusoryDanceBuffReady = true;
  addLog(
    battle,
    `${fighter.name}'s Illusory Dance prepares its next successful attack to deal 300% total damage.`
  );
}

function applyIllusoryDanceDefense(defender, damage, battle) {
  if (!defender.illusoryDanceActive) return damage;

  const attacker = battle.fighterA === defender ? battle.fighterB : battle.fighterA;
  const reducedDamage = Math.max(0, Math.round(damage * 0.5));
  const reflectedDamage = Math.max(1, Math.round(damage * 0.5));

  if (attacker?.alive && reflectedDamage > 0) {
    applyDamage(attacker, reflectedDamage);

    addLog(
      battle,
      `${defender.name}'s Illusory Dance reflects ${reflectedDamage} damage back to ${attacker.name}.`
    );
  }

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
  if (
    defender.special &&
    (defender.special.chargeType === "reactive" ||
      defender.special.chargeType === "evasive")
  ) {
    gainSpecialCharge(defender, 1, battle);
  }

  if (
    defender.special &&
    defender.special.id === "illusory-dance" &&
    defender.illusoryDanceActive
  ) {
    activateIllusoryDanceBuff(defender, battle);
  }

  handleInvertedInertia(attacker, defender, battle);
  handleCoconutOctopusMissPassive(defender, battle, attacker);
  resetThreeToedSlothBacterialChain(attacker, battle, "miss");
}

function getNextAttackBuff(attacker) {
  return {
    guaranteedHit: false,
    damagePct: attacker.illusoryDanceBuffReady ? 200 : 0
  };
}

function consumeNextAttackBuff(attacker) {
  attacker.illusoryDanceBuffReady = false;
}

export function resolveConcentration(fighter, battle) {
  const opponent =
    battle.fighterA === fighter ? battle.fighterB : battle.fighterA;

  if (fennecOasisIsActive(battle, opponent)) {
    spendStamina(fighter, 10, battle);

    addLog(
      battle,
      "The burning oasis disrupts " +
        fighter.name +
        "'s concentration. It fails and loses 10 stamina."
    );

    return;
  }

  restoreHp(fighter, 20);
  restoreStamina(fighter, 20, battle);
  fighter.concentratedLastTurn = true;
  fighter.concentrationActive = true;

  if (fighter.passive && fighter.passive.id === "residual-neurotoxin") {
    fighter.residualNeurotoxinActive = true;
  }

  if (
    opponent &&
    opponent.passive &&
    opponent.passive.id === "immobile-stalk" &&
    !opponent.matamataAmbushReady
  ) {
    opponent.matamataStalkCharges = Math.min(
      4,
      (opponent.matamataStalkCharges || 0) + 1
    );

    addLog(
      battle,
      opponent.name +
        "'s Immobile Stalk gains 1 charge (" +
        opponent.matamataStalkCharges +
        "/4)."
    );

    if (opponent.matamataStalkCharges >= 4) {
      opponent.matamataAmbushReady = true;
      opponent.matamataAmbushReadyTurn = battle.turn + 1;

      addLog(
        battle,
        opponent.name +
          "'s Immobile Stalk is ready: starting next turn, its next attack cannot miss, deals double damage, and absorbs 20 stamina."
      );
    }
  }

  handleFennecMirageProgress(fighter, battle, "concentration");

  addLog(
    battle,
    fighter.name +
      " uses Concentration, gains +10% Defense and Agility for the turn, restores 20 Life and 20 Stamina."
  );
}

function handlePostHitPassive(attacker, defender, battle, wasCritical, actionType = null) {
  if (defender.darwinsLarvalBlocksEffects) {
    addLog(
      battle,
      defender.name +
        "'s Larval Defense blocks secondary effects and status changes."
    );
    return;
  }

  if (defender.caudalAutotomyBlockedLastDirectHit) {
    return;
  }

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

  applyCoconutOctopusPredatoryPressure(attacker, defender, battle);
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
    throw new Error("Unknown action type: " + actionType);
  }

  const finalStaminaCost = getFinalActionStaminaCost(attacker, actionType, defender);
  spendStamina(attacker, finalStaminaCost, battle);

  if (getThreeToedSlothMiteStaminaDiscount(attacker, actionType) > 0) {
    addLog(
      battle,
      attacker.name +
        "'s Mite Colony reduces " +
        action.name +
        " stamina cost to " +
        finalStaminaCost +
        "."
    );
  }

  if (getRibbedGuardExtraStaminaCost(defender) > 0) {
    addLog(
      battle,
      defender.name +
        "'s Ribbed Guard increases " +
        attacker.name +
        "'s " +
        action.name +
        " stamina cost to " +
        finalStaminaCost +
        "."
    );
  }

  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const nextAttackBuff = getNextAttackBuff(attacker);
  const matamataAmbushReady = hasMatamataAmbushReady(attacker, battle);

  if (defender.residualNeurotoxinActive) {
    addEffect(attacker, createResidualNeurotoxinEffect(2), battle);

    addLog(
      battle,
      defender.name +
        "'s Residual Neurotoxin affects " +
        attacker.name +
        ": -10% Speed, Technique and Evasion next turn."
    );
  }

  if (defender.phantomCurrentActive) {
    addLog(
      battle,
      attacker.name +
        " cannot hit " +
        defender.name +
        " (Phantom Current)."
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    resetThreeToedSlothBacterialChain(attacker, battle, "miss");

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

    hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const circadianNightGuaranteedHit =
    attacker.passive &&
    attacker.passive.id === "circadian-cycle" &&
    isCircadianNight(battle);

  const hit =
    nextAttackBuff.guaranteedHit ||
    matamataAmbushReady ||
    circadianNightGuaranteedHit ||
    caudalAutotomyForcesDirectHit(defender)
      ? true
      : rollHit(hitChance);

  if (!hit) {
    if (fennecOasisIsActive(battle, defender)) {
      const oasisMissLogs = [
        "The Oasis bends the horizon. The blow cuts through empty heat.",
        "Heat distortion deceives the senses. The attack finds only mirage.",
        "The Oasis swallows the strike before it reaches the Fennec.",
        "The Fennec vanishes behind shimmering air, leaving only dust behind.",
        "The burning Oasis twists the battlefield. The attacker strikes an illusion.",
        "A false image flickers in the haze. The real Fennec is already gone."
      ];

      addLog(
        battle,
        oasisMissLogs[Math.floor(Math.random() * oasisMissLogs.length)]
      );
    }

    addLog(
      battle,
      attacker.name +
        " uses " +
        action.name +
        " but misses " +
        defender.name +
        "."
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
      attacker.name +
        " tries to hit " +
        defender.name +
        " with " +
        action.name +
        ", but " +
        defender.name +
        "'s Overinflation blocks the attack completely."
    );

    const overinflationDamage = 25;
    applyDamage(attacker, overinflationDamage);

    addLog(
      battle,
      attacker.name +
        " takes " +
        overinflationDamage +
        " damage from " +
        defender.name +
        "'s Overinflation."
    );

    addEffect(attacker, createTetrodotoxinEffect(2), battle);

    addLog(
      battle,
      attacker.name +
        " is poisoned by Tetrodotoxin: -25% Precision, Evasion and Speed next turn."
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
    attacker.passive &&
    attacker.passive.id === "relentless-bite" &&
    actionType === "explosive"
  ) {
    defenseFactor = 0.8;
  }

  if (
    attacker.passive &&
    attacker.passive.id === "lethal-precision" &&
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

  if (
    attacker.passive &&
    attacker.passive.id === "hunting-inertia" &&
    attacker.falconStacks > 0
  ) {
    addLog(
      battle,
      attacker.name +
        "'s Hunting Inertia grants +" +
        attacker.falconStacks * 10 +
        "% damage to this attack."
    );
  }

  const passiveBonuses = getPassiveBonuses(attacker, defender, battle, actionType);

  if (actionType === "explosive" && passiveBonuses.explosiveDamagePct > 0) {
    baseDamage = Math.round(
      baseDamage * (1 + passiveBonuses.explosiveDamagePct / 100)
    );
  }

  if (nextAttackBuff.damagePct > 0) {
    baseDamage = Math.round(baseDamage * (1 + nextAttackBuff.damagePct / 100));

    addLog(
      battle,
      attacker.name +
        "'s Illusory Dance buff empowers this successful attack (300% total damage)."
    );

    consumeNextAttackBuff(attacker);
  }

  const critChance = calculateCriticalChance(attacker, battle, actionType);
  let critical = rollCritical(critChance);

  if (
    defender.passive &&
    defender.passive.id === "savage-endurance" &&
    defender.hp < defender.maxHp * 0.25
  ) {
    critical = false;
  }

  let finalDamage = baseDamage;

  if (critical) {
    finalDamage = Math.round(baseDamage * 1.5);
  }

  finalDamage = applyThreeToedSlothBacterialDamageBonus(attacker, finalDamage, battle);
  finalDamage = applyMatamataAmbushBonus(attacker, defender, finalDamage, battle);
  finalDamage = applyIllusoryDanceDefense(defender, finalDamage, battle);
  finalDamage = applyCostalEversionDefense(defender, attacker, finalDamage, battle);
  finalDamage = applyCaudalAutotomyDefense(defender, attacker, finalDamage, battle);
  finalDamage = applyAncestralRetreatDefense(defender, attacker, finalDamage, battle);
  finalDamage = applyCoconutFortressDefense(defender, finalDamage, battle);
  finalDamage = applyDarwinsLarvalDefense(defender, attacker, finalDamage, battle);

  applyDamage(defender, finalDamage);
  applyDirectHitRecoil(attacker, defender, battle, finalDamage);

  if (defender.caudalAutotomyBlockedLastDirectHit && defender.caudalAutotomyLastBlock) {
    logCaudalAutotomyTailBlock(defender, attacker, battle, action.name, critical);
  } else {
    addLog(
      battle,
      attacker.name +
        " hits " +
        defender.name +
        " with " +
        action.name +
        " for " +
        finalDamage +
        " damage" +
        (critical ? " (CRITICAL)" : "") +
        "."
    );
  }

  handleScaledRetreatBonus(attacker, defender, battle);

    if (tryMantisDecapitation(attacker, defender, battle)) {
    return {
      hit: true,
      damage: finalDamage,
      critical,
      hitChance
    };
  }

  if (critical) {
    addLog(
      battle,
      "Critical calc -> Base damage: " +
        baseDamage +
        " | Critical multiplier: x1.5 | Final damage: " +
        (defender.caudalAutotomyBlockedLastDirectHit && defender.caudalAutotomyLastBlock
          ? defender.caudalAutotomyLastBlock.originalDamage
          : finalDamage) +
        "."
    );
  }

  addLog(
    battle,
    "Damage calc -> Attack: " +
      damageInfo.attackValue +
      " | Defense: " +
      damageInfo.defenseValue +
      " | Multiplier: " +
      damageInfo.multiplier +
      "%."
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  handleIguanaPassive(attacker, actionType, battle);
  handleFennecMirageProgress(attacker, battle, actionType);
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
  const stalkStacks = getTigerStalkStacks(attacker);
  const empoweredBite = stalkStacks >= 3;
  const defenseFactor = empoweredBite ? 0 : 0.5;

  const precision = calculateNormalPrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = nextAttackBuff.guaranteedHit || caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Throat Bite but misses " + defender.name + "."
    );

    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
    resetMacaqueChain(attacker, battle, "miss");
    handleReactiveChargeOnMiss(attacker, defender, battle);
    return;
  }

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    defenseFactor,
    "special"
  );

  let damage = damageInfo.damage;

  if (nextAttackBuff.damagePct > 0) {
    damage = Math.round(damage * (1 + nextAttackBuff.damagePct / 100));

    addLog(
      battle,
      attacker.name +
        "'s Illusory Dance buff empowers this successful attack (300% total damage)."
    );

    consumeNextAttackBuff(attacker);
  }

  damage = applyIllusoryDanceDefense(defender, damage, battle);
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  const defenseText = empoweredBite ? "100% Defense" : "50% Defense";

  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name + "'s Throat Bite fails to apply " + (empoweredBite ? "Deep Bleed" : "Bleed") + "."
    );

    addLog(
      battle,
      attacker.name +
        " uses Throat Bite, dealing " +
        damage +
        " damage and ignoring " +
        defenseText +
        "."
    );
  } else {
    if (empoweredBite) {
      addEffect(defender, createDeepBleedEffect(2, 30), battle);
    } else {
      addEffect(defender, createBleedEffect(2, 15), battle);
    }

    addLog(
      battle,
      attacker.name +
        " uses Throat Bite, dealing " +
        damage +
        " damage, ignoring " +
        defenseText +
        " and applying " +
        (empoweredBite ? "Deep Bleed" : "Bleed") +
        "."
    );
  }

  addLog(
    battle,
    "Throat Bite calc -> Attack: " +
      damageInfo.attackValue +
      " | Effective Defense: " +
      damageInfo.defenseValue +
      " | Multiplier: " +
      damageInfo.multiplier +
      "%."
  );

  if (empoweredBite) {
    consumeTigerStalkStacks(attacker, battle, "Throat Bite");
  }

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
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Mutilation but misses " + defender.name + "."
    );

    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name + "'s Mutilation fails to apply its disabling effect."
    );

    addLog(
      battle,
      attacker.name +
        " uses Mutilation, dealing " +
        damage +
        " damage."
    );
  } else {
    addEffect(defender, createMutilationEffect(2), battle);

    addLog(
      battle,
      attacker.name +
        " uses Mutilation, dealing " +
        damage +
        " damage and reducing " +
        defender.name +
        "'s Attack, Speed and Agility by 30% for 2 turns, while blocking Quick Attack."
    );
  }

  addLog(
    battle,
    "Mutilation calc -> Attack: " +
      damageInfo.attackValue +
      " | Defense: " +
      damageInfo.defenseValue +
      " | Multiplier: " +
      damageInfo.multiplier +
      "%."
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
      attacker.name + " cannot use Arctic Storm because Hail is already active."
    );
    return;
  }

  const duration = battle.biome === "arctic" ? 6 : 3;
  addBattleEffect(battle, createHailEffect(duration, attacker.id));

  if (battle.biome === "arctic") {
    attacker.arcticStormPermanentSpeed = true;

    addLog(
      battle,
      attacker.name +
        " uses Arctic Storm. Hail begins for " +
        duration +
        " turns and its speed bonus is permanent in Arctic biome."
    );
  } else {
    addLog(
      battle,
      attacker.name +
        " uses Arctic Storm. Hail begins for " +
        duration +
        " turns and doubles its Speed while active."
    );
  }

  resetMomentum(attacker, battle, "special");
  resetParasiticControlHits(attacker, battle, "special");
  resetFalconStacks(attacker, battle, "special");
  resetMacaqueChain(attacker, battle, "special");
  consumeSpecialCharge(attacker);
}

function performCostalEversionSpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const sacrifice = 50;

  if (attacker.hp <= sacrifice) {
    addLog(
      battle,
      attacker.name + " cannot use Costal Eversion because the HP sacrifice would be fatal."
    );
    return;
  }

  attacker.hp = Math.max(0, attacker.hp - sacrifice);

  attacker.costalEversionActive = true;
  attacker.costalEversionTurns = 3;
  attacker.costalEversionActivatedTurn = battle.turn;

  addLog(
    battle,
    attacker.name +
      " uses Costal Eversion, losing " +
      sacrifice +
      " HP and exposing its toxin-covered ribs for 3 turns."
  );

  addLog(
    battle,
    attacker.name +
      "'s Costal Eversion reduces direct damage by 50%, reflects 25% of original direct damage, applies Costal Toxin to direct attackers, and restores 25 HP at the end of the next 2 active turns."
  );

  resetMomentum(attacker, battle, "special");
  resetParasiticControlHits(attacker, battle, "special");
  resetFalconStacks(attacker, battle, "special");
  resetMacaqueChain(attacker, battle, "special");
  consumeSpecialCharge(attacker);
}

function performCaudalAutotomySpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const sacrifice = 90;
  attacker.hp = Math.max(0, attacker.hp - sacrifice);
  attacker.damageTakenThisTurn += sacrifice;

  attacker.caudalAutotomyActive = true;
  attacker.caudalAutotomyTurns = 3;
  attacker.caudalAutotomyActivatedTurn = battle.turn;
  attacker.caudalAutotomyTailHp = 90;
  attacker.caudalAutotomyMaxTailHp = 90;
  attacker.caudalAutotomyBlockedLastDirectHit = false;
  attacker.caudalAutotomyLastBlock = null;

  addLog(
    battle,
    attacker.name +
      " uses Caudal Autotomy, losing " +
      sacrifice +
      " HP and creating a detached tail with 90 HP for 3 turns."
  );

  if (attacker.hp <= 0) {
    attacker.alive = false;
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
    attacker.name +
      " uses Illusory Dance. This turn, it reflects 50% of direct damage received and only takes the remaining 50%."
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
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  const damageInfo = calculateDamageWithDefenseFactor(
    attacker,
    defender,
    battle,
    1,
    "special"
  );

  const specialBaseDamage = Math.max(1, Math.round(damageInfo.damage * 2));

  if (!hit) {
    let partialDamageToEnemy = Math.max(1, Math.round(specialBaseDamage * 0.25));
    const selfDamage = Math.max(1, Math.round(specialBaseDamage * 0.5));

    partialDamageToEnemy = applyCostalEversionDefense(defender, attacker, partialDamageToEnemy, battle);
    partialDamageToEnemy = applyCaudalAutotomyDefense(defender, attacker, partialDamageToEnemy, battle);
    partialDamageToEnemy = applyCoconutFortressDefense(defender, partialDamageToEnemy, battle);
    partialDamageToEnemy = applyDarwinsLarvalDefense(
      defender,
      attacker,
      partialDamageToEnemy,
      battle
    );

    applyDamage(defender, partialDamageToEnemy);
    applyDamage(attacker, selfDamage);

    addLog(
      battle,
      attacker.name +
        " uses Ballistic Strike but misses. " +
        defender.name +
        " still takes " +
        partialDamageToEnemy +
        " damage and " +
        attacker.name +
        " takes " +
        selfDamage +
        " self-damage."
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
  finalDamage = applyCostalEversionDefense(defender, attacker, finalDamage, battle);
  finalDamage = applyCaudalAutotomyDefense(defender, attacker, finalDamage, battle);
  finalDamage = applyAncestralRetreatDefense(defender, attacker, finalDamage, battle);
  finalDamage = applyCoconutFortressDefense(defender, finalDamage, battle);
  finalDamage = applyDarwinsLarvalDefense(defender, attacker, finalDamage, battle);

  applyDamage(defender, finalDamage);
  applyDirectHitRecoil(attacker, defender, battle, finalDamage);
  handleScaledRetreatBonus(attacker, defender, battle);

  addLog(
    battle,
    attacker.name +
      " uses Ballistic Strike and deals " +
      finalDamage +
      " damage" +
      (critical ? " (CRITICAL)" : "") +
      "."
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performGiantAsianMantisSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  let successfulHits = 0;
  let totalDamage = 0;

  addLog(
    battle,
    attacker.name + " uses Raptorial Chain, unleashing a sequence of raptorial strikes."
  );

  for (let strikeNumber = 1; strikeNumber <= 5; strikeNumber++) {
    const precision =
      getEffectiveStat(attacker, "technique", battle, defender, "special") * 0.6 +
      getEffectiveStat(attacker, "explosiveness", battle, defender, "special") * 0.25 +
      getEffectiveStat(attacker, "speed", battle, defender, "special") * 0.15;

    const evasion = calculateEvasion(defender, battle);
    let hitChance = calculateHitChanceFromValues(precision, evasion);

    hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

    const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

    if (!hit) {
      addLog(
        battle,
        attacker.name +
          "'s Raptorial Chain breaks at strike " +
          strikeNumber +
          ". The blow misses " +
          defender.name +
          "."
      );

      resetMomentum(attacker, battle, "miss");
      resetParasiticControlHits(attacker, battle, "miss");
      resetFalconStacks(attacker, battle, "miss");
      resetMacaqueChain(attacker, battle, "miss");
      handleReactiveChargeOnMiss(attacker, defender, battle);
      break;
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
    damage = applyCostalEversionDefense(defender, attacker, damage, battle);
    damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
    damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
    damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

    applyDamage(defender, damage);

    successfulHits += 1;
    totalDamage += damage;

    addLog(
      battle,
      attacker.name +
        "'s Raptorial Chain strike " +
        strikeNumber +
        " hits " +
        defender.name +
        " for " +
        damage +
        " damage."
    );

    if (
      attacker.alive &&
      defender &&
      (defender.id === "pufferfish" ||
        defender.id === "puffer-fish" ||
        defender.name === "Pufferfish")
    ) {
      applyDamage(attacker, 10);

      addLog(
        battle,
        attacker.name +
          " suffers 10 damage from " +
          defender.name +
          "'s spines."
      );

      if (!attacker.alive) {
        addLog(
          battle,
          attacker.name +
            "'s Raptorial Chain ends as the spines bring it down."
        );

        finishBattleIfNeeded(battle);
        consumeSpecialCharge(attacker);
        return;
      }
    }

    if (!defender.darwinsLarvalBlocksEffects && tryMantisDecapitation(attacker, defender, battle)) {
      addLog(
        battle,
        attacker.name +
          "'s Raptorial Chain ends as the execution is completed."
      );

      consumeSpecialCharge(attacker);
      return;
    }

    if (!defender.alive) {
      consumeSpecialCharge(attacker);
      return;
    }
  }

  if (successfulHits >= 3 && defender.alive) {
    if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
      addLog(
        battle,
        attacker.name +
          "'s Raptorial Chain fails to open " +
          defender.name +
          "'s guard."
      );
    } else {
      addEffect(
        defender,
        {
          id: "raptorial-defense-down",
          name: "Raptorial Defense Down",
          duration: 2,
          stackable: false,
          allowsConcentration: true,
          modifiers: {
            defensePct: -20
          }
        },
        battle
      );

      addLog(
        battle,
        attacker.name +
          "'s Raptorial Chain opens " +
          defender.name +
          "'s guard: Defense is reduced by 20% for 2 turns."
      );
    }
  }

  addLog(
    battle,
    attacker.name +
      "'s Raptorial Chain ends with " +
      successfulHits +
      " successful hit" +
      (successfulHits === 1 ? "" : "s") +
      " and " +
      totalDamage +
      " total damage."
  );

  if (successfulHits > 0) {
    increaseMomentum(attacker, battle);
    increaseParasiticControlHits(attacker, defender, battle);
    increaseFalconStacks(attacker, battle);
    increaseMacaqueChain(attacker, defender, battle);
  }

  consumeSpecialCharge(attacker);
}

function performDungBeetleSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = getEffectiveStat(attacker, "attack", battle, defender, "special");
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Dung Throw but misses " + defender.name + "."
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name + "'s Dung Throw fails to reduce Agility."
    );

    addLog(
      battle,
      attacker.name +
        " uses Dung Throw, dealing " +
        damage +
        " damage."
    );
  } else {
    addEffect(defender, createAgilityDownEffect(3, 50), battle);

    addLog(
      battle,
      attacker.name +
        " uses Dung Throw, dealing " +
        damage +
        " damage and reducing " +
        defender.name +
        "'s Agility by 50% for 3 turns."
    );
  }

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
    damage = applyCostalEversionDefense(defender, attacker, damage, battle);
    damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
    damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
    damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

    applyDamage(defender, damage);

    addLog(
      battle,
      attacker.name +
        " uses Death Roll on a bitten target: " +
        damage +
        " damage, ignores defense and cannot be dodged."
    );

    consumeSpecialCharge(attacker);
    return;
  }

  const precision = calculateNormalPrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Death Roll but misses " + defender.name + "."
    );

    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  addLog(
    battle,
    attacker.name + " uses Death Roll, dealing " + damage + " damage."
  );

  consumeSpecialCharge(attacker);
}

function performFennecSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = calculatePrecisePrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Anubis' Staff but misses " + defender.name + "."
    );

    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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

  let damage = Math.max(1, Math.round(damageInfo.damage * 2));

  damage = applyIllusoryDanceDefense(defender, damage, battle);
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);

  const drainBlocked = darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle);

  const oasisActive = fennecOasisIsActive(battle, attacker);
  const healRatio = oasisActive ? 1 : 0.5;
  const staminaStealRatio = oasisActive ? 0.5 : 0.25;

  let healAmount = 0;
  let stolenStamina = 0;

  if (!drainBlocked && damage > 0) {
    healAmount = Math.max(1, Math.round(damage * healRatio));

    const staminaToSteal = Math.max(1, Math.round(damage * staminaStealRatio));
    stolenStamina = Math.min(staminaToSteal, defender.stamina);

    restoreHp(attacker, healAmount);

    if (stolenStamina > 0) {
      spendStamina(defender, stolenStamina, battle);
      restoreStamina(attacker, stolenStamina, battle);
    }
  }

  addLog(
    battle,
    attacker.name +
      " uses Anubis' Staff, dealing " +
      damage +
      " damage."
  );

  if (drainBlocked) {
    addLog(
      battle,
      attacker.name +
        "'s Anubis' Staff fails to drain HP or stamina."
    );
  } else if (oasisActive) {
    addLog(
      battle,
      "Oasis empowers Anubis' Staff: " +
        attacker.name +
        " restores " +
        healAmount +
        " HP and steals " +
        stolenStamina +
        " stamina from " +
        defender.name +
        "."
    );
  } else {
    addLog(
      battle,
      attacker.name +
        " restores " +
        healAmount +
        " HP and steals " +
        stolenStamina +
        " stamina from " +
        defender.name +
        "."
    );
  }

  addLog(
    battle,
    "Anubis' Staff calc -> Attack: " +
      damageInfo.attackValue +
      " | Defense: " +
      damageInfo.defenseValue +
      " | Multiplier: " +
      damageInfo.multiplier +
      "% | Final damage before drain: " +
      damage +
      "."
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);

  consumeSpecialCharge(attacker);
}

function performMatamataSpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;
  attacker.ancestralRetreatActive = true;

  restoreHp(attacker, 60);
  restoreStamina(attacker, 30, battle);

  addLog(
    battle,
    attacker.name +
      " uses Ancestral Retreat, withdrawing into its shell. It restores 60 HP and 30 stamina."
  );

  addLog(
    battle,
    attacker.name +
      "'s Ancestral Retreat is active: direct damage received this turn is reduced by 50%, and 25% of the original incoming damage is reflected."
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
      attacker.name + " uses Total Regeneration but has nothing to heal."
    );
  } else {
    const hpBefore = attacker.hp;
    restoreHp(attacker, healAmount);
    const actualHealed = attacker.hp - hpBefore;

    addLog(
      battle,
      attacker.name + " uses Total Regeneration and restores " + actualHealed + " HP."
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
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Nervous Disruption but misses " + defender.name + "."
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name + "'s Nervous Disruption fails to take control."
    );

    addLog(
      battle,
      attacker.name +
        " uses Nervous Disruption, dealing " +
        damage +
        " damage."
    );
  } else {
    defender.nervousDisruptionActive = true;
    defender.parasiticControlActive = false;

    addLog(
      battle,
      attacker.name +
        " uses Nervous Disruption, dealing " +
        damage +
        " damage. On " +
        defender.name +
        "'s next turn, it hits itself and cannot use Concentration or Special Attack."
    );
  }

  increaseParasiticControlHits(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performDarwinsFrogSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const larvaeBefore = attacker.darwinsLarvae || 0;
  const maxLarvae = attacker.darwinsMaxLarvae || 5;

  const larvaeReleased = Math.floor(Math.random() * 3) + 1;
  const availableSpace = Math.max(0, maxLarvae - larvaeBefore);
  const larvaeStored = Math.min(larvaeReleased, availableSpace);
  const overflowLarvae = larvaeReleased - larvaeStored;

  addLog(
    battle,
    attacker.name +
      " uses Darwinian Expulsion, violently swelling its vocal sac and releasing " +
      larvaeReleased +
      " larva" +
      (larvaeReleased === 1 ? "" : "e") +
      " into the battlefield."
  );

  if (larvaeStored > 0) {
    addDarwinsLarvae(attacker, larvaeStored, battle, "Darwinian Expulsion");
  } else {
    addLog(
      battle,
      attacker.name +
        " already has maximum larvae (" +
        larvaeBefore +
        "/" +
        maxLarvae +
        ")."
    );
  }

  const healAmount = larvaeReleased * 20;
  const staminaAmount = larvaeReleased * 20;

  const hpBefore = attacker.hp;
  const staminaBefore = attacker.stamina;

  restoreHp(attacker, healAmount);
  restoreStamina(attacker, staminaAmount, battle);

  const actualHealed = attacker.hp - hpBefore;
  const actualRestoredStamina = attacker.stamina - staminaBefore;

  addLog(
    battle,
    attacker.name +
      "'s Darwinian Expulsion restores " +
      actualHealed +
      " HP and " +
      actualRestoredStamina +
      " stamina."
  );

  if (overflowLarvae > 0 && defender && defender.alive) {
    const damagePerLarva = Math.max(1, Math.round(attacker.stats.attack * 0.5));
    let overflowDamage = damagePerLarva * overflowLarvae;

    overflowDamage = applyIllusoryDanceDefense(defender, overflowDamage, battle);
    overflowDamage = applyCostalEversionDefense(defender, attacker, overflowDamage, battle);
    overflowDamage = applyCaudalAutotomyDefense(defender, attacker, overflowDamage, battle);
    overflowDamage = applyAncestralRetreatDefense(defender, attacker, overflowDamage, battle);
    overflowDamage = applyCoconutFortressDefense(defender, overflowDamage, battle);
    overflowDamage = applyDarwinsLarvalDefense(defender, attacker, overflowDamage, battle);

    applyDamage(defender, overflowDamage);

    addLog(
      battle,
      overflowLarvae +
        " overflowing larva" +
        (overflowLarvae === 1 ? "" : "e") +
        " from " +
        attacker.name +
        "'s Darwinian Expulsion strike " +
        defender.name +
        " for " +
        overflowDamage +
        " guaranteed damage."
    );

    finishBattleIfNeeded(battle);
  }

  consumeSpecialCharge(attacker);
}

function performFalconSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  defender.tempAccuracyLockTurns = 1;

  addLog(
    battle,
    attacker.name + " takes flight. " + defender.name + "'s accuracy against it is capped at 25% this turn."
  );

  const precision = calculatePrecisePrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + " uses Deadly Dive but misses " + defender.name + "."
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

  let damage = damageInfo.damage;

  damage = applyIllusoryDanceDefense(defender, damage, battle);
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  const staminaLoss = Math.min(defender.stamina, Math.max(0, Math.round(damage * 0.5)));

  if (staminaLoss > 0) {
    spendStamina(defender, staminaLoss, battle);
  }

  addLog(
    battle,
    attacker.name +
      " uses Deadly Dive, dealing " +
      damage +
      " damage and reducing " +
      defender.name +
      "'s stamina by " +
      staminaLoss +
      "."
  );

  addLog(
    battle,
    "Deadly Dive calc -> Attack: " +
      damageInfo.attackValue +
      " | Defense: " +
      damageInfo.defenseValue +
      " | Multiplier: " +
      damageInfo.multiplier +
      "%."
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseMacaqueChain(attacker, defender, battle);
  consumeSpecialCharge(attacker);
}

function performSailfishSpecial(attacker, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;
  attacker.phantomCurrentActive = true;

  addLog(
    battle,
    attacker.name + " uses Phantom Current and becomes untargetable this turn."
  );

  consumeSpecialCharge(attacker);
}

function performMacaqueSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const loot = attacker.macaqueLoot;
  let damage = Math.max(0, Math.round(loot * 1.5));

  if (damage <= 0) {
    addLog(
      battle,
      attacker.name + " uses Looting Burst but has no stored loot."
    );

    attacker.macaqueLoot = 0;
    attacker.macaqueHitChain = 0;
    consumeSpecialCharge(attacker);
    return;
  }

  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  addLog(
    battle,
    attacker.name +
      " uses Looting Burst, consuming " +
      loot +
      " loot to deal " +
      damage +
      " damage."
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

  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name +
        "'s Refresh fails to reduce Technique and Agility."
    );

    addLog(
      battle,
      attacker.name +
        " uses Refresh, restoring " +
        actualHealed +
        " HP and " +
        actualRestoredStamina +
        " Stamina."
    );
  } else {
    const debuffAmount = humidityActive ? 40 : 20;
    const debuffDuration = humidityActive ? 2 : 1;

    addEffect(
      defender,
      {
        id: "refresh-debuff",
        name: humidityActive ? "Empowered Refresh Debuff" : "Refresh Debuff",
        duration: debuffDuration,
        stackable: false,
        allowsConcentration: true,
        modifiers: {
          techniquePct: -debuffAmount,
          agilityPct: -debuffAmount
        }
      },
      battle
    );

    addLog(
      battle,
      attacker.name +
        " uses Refresh, restoring " +
        actualHealed +
        " HP and " +
        actualRestoredStamina +
        " Stamina, and reducing " +
        defender.name +
        "'s Technique and Agility by " +
        debuffAmount +
        "% for " +
        debuffDuration +
        " turn" +
        (debuffDuration === 1 ? "" : "s") +
        "."
    );
  }

  consumeSpecialCharge(attacker);
}

function performFireSalamanderSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const precision = getEffectiveStat(attacker, "technique", battle, defender, "special");
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name +
        " uses Neurotoxic Injection (Tetrodotoxin) but misses " +
        defender.name +
        "."
    );

    consumeSpecialCharge(attacker);
    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  if (darwinsLarvalDefenseBlocksSecondaryEffects(defender, battle)) {
    addLog(
      battle,
      attacker.name +
        "'s Neurotoxic Injection fails to apply Tetrodotoxin effects."
    );

    addLog(
      battle,
      attacker.name +
        " uses Neurotoxic Injection (Tetrodotoxin), dealing " +
        damage +
        " damage."
    );
  } else {
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

          battle.log.push(
            target.name +
              " suffers " +
              toxinDamage +
              " damage from Neurotoxic Injection (Tetrodotoxin)."
          );

          if (target.hp <= 0) {
            target.alive = false;
          }
        }
      },
      battle
    );

    addLog(
      battle,
      attacker.name +
        " uses Neurotoxic Injection (Tetrodotoxin), dealing " +
        damage +
        " damage, reducing " +
        defender.name +
        "'s Agility, Technique and Speed by 25% for 2 turns, and applying 30 fixed damage over time."
    );
  }

  consumeSpecialCharge(attacker);
}

function performEurasianEagleOwlSpecial(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  if (!isCircadianNight(battle)) {
    addLog(
      battle,
      attacker.name + " cannot use Nocturnal Hunt during Day."
    );
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
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);

  if (damage > 0) {
    restoreHp(attacker, damage);
  }

  addLog(
    battle,
    attacker.name +
      " uses Nocturnal Hunt, dealing " +
      damage +
      " unavoidable damage and healing " +
      damage +
      " HP."
  );

  addLog(
    battle,
    "Nocturnal Hunt calc → Attack: " +
      damageInfo.attackValue +
      " | Defense: " +
      damageInfo.defenseValue +
      " | Multiplier: " +
      damageInfo.multiplier +
      "%."
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
    let explosionDamage = 200;

    explosionDamage = applyDarwinsLarvalDefense(
      defender,
      attacker,
      explosionDamage,
      battle
    );

    applyDamage(defender, explosionDamage);

    attacker.hp = 1;
    attacker.alive = true;
    attacker.overinflationActive = false;
    attacker.overinflationUsedLastTurn = false;

    addLog(
      battle,
      `${attacker.name} uses Overinflation twice in a row and explodes: ${defender.name} takes ${explosionDamage} damage, and ${attacker.name} is left at 1 HP. Uses left: ${attacker.overinflationUses}.`
    );

    return;
  }

  attacker.overinflationActive = true;
  attacker.overinflationUsedLastTurn = true;

  let chipDamage = 25;

  chipDamage = applyDarwinsLarvalDefense(
    defender,
    attacker,
    chipDamage,
    battle
  );

  applyDamage(defender, chipDamage);

  addLog(
    battle,
    `${attacker.name} uses Overinflation and becomes immune to damage this turn. ${defender.name} takes ${chipDamage} damage. Uses left: ${attacker.overinflationUses}.`
  );
}

function performDarwinsLarvalCommand(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  const command = normalizeDarwinsLarvalCommand(attacker.darwinsLarvalCommand);
  const larvaeAvailable = attacker.darwinsLarvae || 0;
  const larvaeCost = getDarwinsLarvalCommandCost(command);

  if (!isDarwinsFrog(attacker)) {
    addLog(
      battle,
      attacker.name + " cannot command larvae."
    );

    attacker.darwinsLarvalCommand = null;
    return;
  }

  if (larvaeCost <= 0) {
    addLog(
      battle,
      attacker.name + " conserves its larvae."
    );

    attacker.darwinsLarvalCommand = null;
    return;
  }

  if (larvaeCost > larvaeAvailable) {
    addLog(
      battle,
      attacker.name +
        " cannot command " +
        larvaeCost +
        " larvae because only " +
        larvaeAvailable +
        " are available."
    );

    attacker.darwinsLarvalCommand = null;
    return;
  }

  attacker.darwinsLarvae = larvaeAvailable - larvaeCost;

  addLog(
    battle,
    attacker.name +
      " commands its larvae: " +
      command.attack +
      " attack, " +
      command.defense +
      " defend, " +
      command.sacrifice +
      " sacrifice."
  );

  if (command.sacrifice > 0) {
    const hpBefore = attacker.hp;
    const staminaBefore = attacker.stamina;

    const healAmount = command.sacrifice * 50;
    const staminaAmount = command.sacrifice * 50;

    restoreHp(attacker, healAmount);
    restoreStamina(attacker, staminaAmount, battle);

    const actualHealed = attacker.hp - hpBefore;
    const actualRestoredStamina = attacker.stamina - staminaBefore;

    addLog(
      battle,
      attacker.name +
        "'s Larval Sacrifice consumes " +
        command.sacrifice +
        " larva" +
        (command.sacrifice === 1 ? "" : "e") +
        ", restoring " +
        actualHealed +
        " HP and " +
        actualRestoredStamina +
        " stamina."
    );
  }

  if (command.defense > 0) {
    attacker.darwinsLarvalDefense = command.defense;
    attacker.darwinsLarvalBlocksEffects = command.defense >= 2;

    addLog(
      battle,
      attacker.name +
        "'s Larval Defense prepares " +
        command.defense +
        " larva" +
        (command.defense === 1 ? "" : "e") +
        " to protect it this turn."
    );
  }

  if (command.attack > 0 && defender.alive) {
    const damagePerLarva = Math.max(1, Math.round(attacker.stats.attack * 0.5));
    const totalDamage = damagePerLarva * command.attack;

    applyDamage(defender, totalDamage);

    addLog(
      battle,
      attacker.name +
        "'s Larval Attack sends " +
        command.attack +
        " larva" +
        (command.attack === 1 ? "" : "e") +
        " into " +
        defender.name +
        ", dealing " +
        totalDamage +
        " guaranteed damage."
    );

    finishBattleIfNeeded(battle);
  }

  const conservedLarvae = attacker.darwinsLarvae || 0;

  addLog(
    battle,
    attacker.name +
      " conserves " +
      conservedLarvae +
      " larva" +
      (conservedLarvae === 1 ? "" : "e") +
      " for future turns."
  );

  attacker.darwinsLarvalCommand = null;
}

function performThreeToedSlothAncestralMicroecosystem(attacker, defender, battle) {
  attacker.concentratedLastTurn = false;
  attacker.overinflationUsedThisTurn = false;

  if (isThreeToedSlothDormantBiome(battle.biome)) {
    addLog(
      battle,
      attacker.name + " cannot use Microecosystem Ancestral in " + battle.biome.toUpperCase() + "."
    );
    return;
  }

  activateThreeToedSlothMicroecosystem(attacker, battle);

  const precision = calculateExplosivePrecision(attacker, defender, battle);
  const evasion = calculateEvasion(defender, battle);
  let hitChance = calculateHitChanceFromValues(precision, evasion);

  hitChance = applyFennecOasisHitCap(attacker, defender, battle, hitChance);

  const hit = caudalAutotomyForcesDirectHit(defender) ? true : rollHit(hitChance);

  if (!hit) {
    addLog(
      battle,
      attacker.name + "'s ancestral explosive strike misses " + defender.name + "."
    );

    resetMomentum(attacker, battle, "miss");
    resetParasiticControlHits(attacker, battle, "miss");
    resetFalconStacks(attacker, battle, "miss");
    resetTigerStalkStacks(attacker, battle, "miss");
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
    "explosive"
  );

  let damage = Math.max(1, Math.round(damageInfo.damage * 1.2));
  let critical = rollCritical(calculateCriticalChance(attacker, battle, "explosive"));

  if (
    defender.passive &&
    defender.passive.id === "savage-endurance" &&
    defender.hp < defender.maxHp * 0.25
  ) {
    critical = false;
  }

  if (critical) {
    damage = Math.round(damage * 1.5);
  }

  damage = applyThreeToedSlothBacterialDamageBonus(attacker, damage, battle);
  damage = applyIllusoryDanceDefense(defender, damage, battle);
  damage = applyCostalEversionDefense(defender, attacker, damage, battle);
  damage = applyCaudalAutotomyDefense(defender, attacker, damage, battle);
  damage = applyAncestralRetreatDefense(defender, attacker, damage, battle);
  damage = applyCoconutFortressDefense(defender, damage, battle);
  damage = applyDarwinsLarvalDefense(defender, attacker, damage, battle);

  applyDamage(defender, damage);
  applyDirectHitRecoil(attacker, defender, battle, damage);
    handleScaledRetreatBonus(attacker, defender, battle);

  addLog(
    battle,
    attacker.name +
      " hits " +
      defender.name +
      " with Ancestral Explosive Strike for " +
      damage +
      " damage" +
      (critical ? " (CRITICAL)" : "") +
      "."
  );

  addLog(
    battle,
    "Microecosystem Ancestral calc -> Explosive precision: " +
      Math.round(precision * 10) / 10 +
      " | Evasion: " +
      Math.round(evasion * 10) / 10 +
      " | Hit chance: " +
      Math.round(hitChance * 10) / 10 +
      "%."
  );

  increaseMomentum(attacker, battle);
  increaseParasiticControlHits(attacker, defender, battle);
  increaseFalconStacks(attacker, battle);
  increaseMacaqueChain(attacker, defender, battle);
  handlePostHitPassive(attacker, defender, battle, critical, "explosive");
  consumeSpecialCharge(attacker);
}

function performSpecialAction(attacker, defender, battle) {
  if (!attacker.special) return;

  switch (attacker.special.id) {
    case "lethal-bite":
    case "throat-bite":
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
    case "costal-eversion":
      performCostalEversionSpecial(attacker, battle);
      break;
    case "caudal-autotomy":
      performCaudalAutotomySpecial(attacker, battle);
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
    case "nocturnal-hunt":
      performEurasianEagleOwlSpecial(attacker, defender, battle);
      break;
    case "ancestral-retreat":
       performMatamataSpecial(attacker, battle);
      break;
    case "anubis-staff":
       performFennecSpecial(attacker, defender, battle);
      break;
    case "raptorial-chain":
       performGiantAsianMantisSpecial(attacker, defender, battle);
      break;
    case "darwinian-expulsion":
       performDarwinsFrogSpecial(attacker, defender, battle);
      break;
    case "ancestral-microecosystem":
       performThreeToedSlothAncestralMicroecosystem(attacker, defender, battle);
      break;
    case "perfect-adaptation":
    case "tentacle-storm":
    case "coconut-fortress":
    case "ink-sea":
       performCoconutOctopusSpecial(attacker, defender, battle);
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

  handleThreeToedSlothAlgaeEndTurn(fighter, battle);
  tickThreeToedSlothMicroecosystem(fighter, battle);
  handleTigerSilentStalkEndTurn(fighter, battle);
  handleCostalEversionEndTurn(fighter, opponent, battle);
  handleCaudalAutotomyEndTurn(fighter, battle);

  handleDarwinsLarvalGestation(fighter, battle);
}

function advanceTurnDamageMemory(fighter) {
  fighter.damageTakenLastTurn = fighter.damageTakenThisTurn;
  fighter.damageTakenThisTurn = 0;
  fighter.tigerTookDirectDamageThisTurn = false;

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

  fighter.darwinsLarvalDefense = 0;
  fighter.darwinsLarvalBlocksEffects = false;
  fighter.coconutFortressActive = false;
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
    const finalStaminaCost = getFinalActionStaminaCost(attacker, actionType, defender);

    if (finalStaminaCost > 0) {
      spendStamina(attacker, finalStaminaCost, battle);

      addLog(
        battle,
        attacker.name +
          " spends " +
          finalStaminaCost +
          " stamina to use Special Attack against " +
          defender.name +
          "."
      );
    }

    performSpecialAction(attacker, defender, battle);
    consumeOneTurnControlState(attacker, battle);
    return;
  }

  if (actionType === "larval-command") {
    performDarwinsLarvalCommand(attacker, defender, battle);
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

  if (fighter.special?.id === "costal-eversion") {
    addLog(
      battle,
      `${fighter.name} → HP: ${fighter.hp}/${fighter.maxHp} (${hpPercent}%) | Stamina: ${fighter.stamina}/${fighter.maxStamina} (${staminaPercent}%) | Special Charge: ${fighter.specialCharge}/${fighter.special?.chargeHits ?? 0} | Costal Eversion: ${fighter.costalEversionActive ? fighter.costalEversionTurns + " turn(s)" : "inactive"}.`
    );
    return;
  }

  if (fighter.special?.id === "caudal-autotomy") {
    addLog(
      battle,
      `${fighter.name} → HP: ${fighter.hp}/${fighter.maxHp} (${hpPercent}%) | Stamina: ${fighter.stamina}/${fighter.maxStamina} (${staminaPercent}%) | Special Charge: ${fighter.specialCharge}/${fighter.special?.chargeHits ?? 0} | Caudal Autotomy: ${fighter.caudalAutotomyActive ? fighter.caudalAutotomyTurns + " turn(s), Tail " + fighter.caudalAutotomyTailHp + "/" + fighter.caudalAutotomyMaxTailHp : "inactive"}.`
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
  fighter.scaledRetreatBonusAppliedThisTurn = false;
  fighter.caudalAutotomyBlockedLastDirectHit = false;
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

  battle.fighterA.ancestralRetreatActive = false;
  battle.fighterB.ancestralRetreatActive = false 
}


function shiftBiomeForNextTurnIfNeeded(battle) {
  if (battle.finished) return;

  const nextTurn = battle.turn + 1;

  if (nextTurn > 1 && (nextTurn - 1) % BIOME_ROTATION_TURNS === 0) {
    addLog(
      battle,
      `🌍 BIOME SHIFT! The battlefield changes for turn ${nextTurn}...`
    );
    applyRandomBiomeModifier(battle, "changed");
  }
}

export function resolveTurn(battle, actionA, actionB) {
  if (battle.finished) return;

  clearTurnDefenseBuff(battle.fighterA);
  clearTurnDefenseBuff(battle.fighterB);

  addLog(battle, `--- Turn ${battle.turn} ---`);

  if (battle.fighterA.darwinsLarvalCommand) {
    performDarwinsLarvalCommand(battle.fighterA, battle.fighterB, battle);
    finishBattleIfNeeded(battle);
    if (battle.finished) return;
  }

  if (battle.fighterB.darwinsLarvalCommand) {
    performDarwinsLarvalCommand(battle.fighterB, battle.fighterA, battle);
    finishBattleIfNeeded(battle);
    if (battle.finished) return;
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

  shiftBiomeForNextTurnIfNeeded(battle);

  battle.turn += 1;
}
