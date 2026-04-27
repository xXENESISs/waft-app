// =============================
// WAFT EFFECTS SYSTEM
// Compatible with current battle-engine.js
// =============================

export function addEffect(target, effect, battle) {
  const existingIndex = target.effects.findIndex((e) => e.id === effect.id);

  const stampedEffect = {
    ...effect,
    appliedOnTurn: battle ? battle.turn : null
  };

  if (existingIndex !== -1 && effect.stackable === false) {
    target.effects[existingIndex] = stampedEffect;

    if (battle) {
      battle.log.push(`${target.name}'s ${effect.name} was refreshed.`);
    }
    return;
  }

  target.effects.push(stampedEffect);

  if (battle) {
    battle.log.push(`${target.name} gains effect: ${effect.name}.`);
  }
}

export function hasEffect(target, effectId) {
  return target.effects.some((effect) => effect.id === effectId);
}

export function getEffectById(target, effectId) {
  return target.effects.find((effect) => effect.id === effectId) || null;
}

export function getStackedModifierPercent(target, key) {
  return target.effects.reduce((total, effect) => {
    return total + (effect.modifiers?.[key] ?? 0);
  }, 0);
}

// =============================
// BASIC EFFECT FACTORIES
// =============================

function applyEffectDamage(target, damage, battle, sourceName) {
  target.hp = Math.max(0, target.hp - damage);
  target.damageTakenThisTurn += damage;

  battle.log.push(`${target.name} suffers ${damage} damage from ${sourceName}.`);

  if (target.hp <= 0) {
    target.alive = false;
  }
}

export function createBleedEffect(duration = 2, damage = 15) {
  return {
    id: "bleed",
    name: "Bleed",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {},
    onTurnEnd(target, battle) {
      applyEffectDamage(target, damage, battle, "Bleed");
    }
  };
}

export function createPoisonEffect(duration = 3, damage = 10) {
  return {
    id: "poison",
    name: "Poison",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {},
    onTurnEnd(target, battle) {
      applyEffectDamage(target, damage, battle, "Poison");
    }
  };
}

export function createPerforationEffect(duration = 2, damage = 30) {
  return {
    id: "perforation",
    name: "Perforation",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {},
    onTurnEnd(target, battle) {
      applyEffectDamage(target, damage, battle, "Perforation");
    }
  };
}

export function createEvasionDownEffect(duration = 2, amount = 20) {
  return {
    id: "evasion-down",
    name: "Evasion Down",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      evasionPct: -amount
    }
  };
}

export function createHeavyEvasionDownEffect(duration = 3, amount = 50) {
  return {
    id: "heavy-evasion-down",
    name: "Heavy Evasion Down",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      evasionPct: -amount
    }
  };
}

export function createAgilityDownEffect(duration = 2, amount = 20) {
  return {
    id: "agility-down",
    name: "Agility Down",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      agilityPct: -amount
    }
  };
}

export function createBlindnessEffect(duration = 2) {
  return {
    id: "blindness",
    name: "Blindness",
    duration,
    stackable: false,
    allowsConcentration: false,
    modifiers: {
      precisionPct: -25
    },
    restrictions: {
      canUseSpecial: false
    }
  };
}

export function createIrritantSecretionEffect(duration = 2) {
  return {
    id: "irritant-secretion",
    name: "Irritant Secretion",
    duration,
    stackable: false,
    allowsConcentration: false,
    modifiers: {
      attackPct: -30
    },
    extraCosts: {
      attackStaminaCost: 5
    },
    restrictions: {
      canUseConcentration: false
    }
  };
}

export function createDestabilizationEffect(duration = 2) {
  return {
    id: "destabilization",
    name: "Destabilization",
    duration,
    stackable: false,
    allowsConcentration: false,
    modifiers: {
      techniquePct: -25,
      agilityPct: -25
    }
  };
}

export function createBiteEffect(duration = 5, amount = 20, escapeChance = 0.5) {
  return {
    id: "bite",
    name: "Bite",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      agilityPct: -amount
    },
    escapeChancePerTurn: escapeChance,
    onTurnEnd(target, battle) {
      if (Math.random() < escapeChance) {
        this.duration = 0;
        battle.log.push(`${target.name} escapes Bite.`);
      }
    }
  };
}

export function createAnchorEffect(hpDrain = 20, staminaDrain = 5, escapeChance = 0.5) {
  return {
    id: "anchor",
    name: "Anchor",
    duration: 99,
    stackable: false,
    allowsConcentration: true,
    modifiers: {},
    drain: {
      hpPerTurn: hpDrain,
      staminaPerTurn: staminaDrain
    },
    escapeChancePerTurn: escapeChance
  };
}

export function createMomentumEffect() {
  return {
    id: "momentum",
    name: "Momentum",
    duration: 99,
    stackable: true,
    allowsConcentration: true,
    modifiers: {},
    stacks: 0,
    stackValues: [5, 10, 15, 20]
  };
}

export function createHuntingInertiaEffect() {
  return {
    id: "hunting-inertia",
    name: "Hunting Inertia",
    duration: 99,
    stackable: true,
    allowsConcentration: true,
    modifiers: {},
    stacks: 0,
    stackValues: [10, 20, 30]
  };
}

export function createFalconDebuffEffect(duration = 2, amount = 25) {
  return {
    id: "falcon-debuff",
    name: "Falcon Debuff",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      techniquePct: -amount,
      agilityPct: -amount
    }
  };
}

export function createHumidityEffect(duration = 3, sourceId = null) {
  return {
    id: "humidity",
    name: "Humidity",
    duration,
    sourceId,
    stackable: false,
    allowsConcentration: true,
    modifiers: {}
  };
}

export function createTetrodotoxinEffect(duration = 1) {
  return {
    id: "tetrodotoxin",
    name: "Tetrodotoxin",
    duration,
    stackable: false,
    allowsConcentration: false,
    modifiers: {
      techniquePct: -25,
      agilityPct: -25,
      speedPct: -25
    }
  };
}

export function createMutilationEffect(duration = 2) {
  return {
    id: "mutilation",
    name: "Mutilation",
    duration,
    stackable: false,
    allowsConcentration: true,
    modifiers: {
      attackPct: -30,
      speedPct: -30,
      agilityPct: -30
    },
    restrictions: {
      canUseQuickAttack: false
    }
  };
}

// =============================
// BATTLEFIELD EFFECTS
// =============================

export function addBattleEffect(battle, effect) {
  const existingIndex = battle.battleEffects.findIndex((e) => e.id === effect.id);

  if (existingIndex !== -1) {
    battle.battleEffects[existingIndex] = {
      ...effect,
      appliedOnTurn: battle.turn
    };
    battle.log.push(`Battle effect refreshed: ${effect.name}.`);
    return;
  }

  battle.battleEffects.push({
    ...effect,
    appliedOnTurn: battle.turn
  });
  battle.log.push(`Battle effect activated: ${effect.name}.`);
}

export function createHailEffect(duration, sourceId) {
  return {
    id: "hail",
    name: "Hail",
    duration,
    sourceId,
    onTurnEnd(battle) {
      const fighters = [battle.fighterA, battle.fighterB];

      fighters.forEach((fighter) => {
        if (!fighter.alive) return;
        if (fighter.id === sourceId) return;

        applyEffectDamage(fighter, 15, battle, "Hail");
      });

      const source =
        battle.fighterA.id === sourceId ? battle.fighterA : battle.fighterB;

      if (source.alive) {
        source.hp = Math.min(source.maxHp, source.hp + 15);
        battle.log.push(`${source.name} restores 15 HP from Arctic Storm.`);
      }
    }
  };
}

export function createSandstormEffect(duration = 6, sourceId = null) {
  return {
    id: "sandstorm",
    name: "Sandstorm",
    duration,
    sourceId
  };
}

// =============================
// TURN END PROCESSING
// =============================

export function processFighterTurnEndEffects(fighter, battle, opponent = null) {
  fighter.effects.forEach((effect) => {
    if (typeof effect.onTurnEnd === "function") {
      effect.onTurnEnd(fighter, battle);
    }

    if (effect.drain) {
      const hpDrain = effect.drain.hpPerTurn ?? 0;
      const staminaDrain = effect.drain.staminaPerTurn ?? 0;

      fighter.hp = Math.max(0, fighter.hp - hpDrain);
      fighter.stamina = Math.max(0, fighter.stamina - staminaDrain);

      if (hpDrain > 0) {
        fighter.damageTakenThisTurn += hpDrain;
        battle.log.push(`${fighter.name} loses ${hpDrain} HP from ${effect.name}.`);
      }

      if (staminaDrain > 0) {
        battle.log.push(`${fighter.name} loses ${staminaDrain} stamina from ${effect.name}.`);
      }

      if (opponent && opponent.alive) {
        if (hpDrain > 0) {
          opponent.hp = Math.min(opponent.maxHp, opponent.hp + hpDrain);
          battle.log.push(`${opponent.name} steals ${hpDrain} HP through ${effect.name}.`);
        }

        if (staminaDrain > 0) {
          opponent.stamina = Math.min(opponent.maxStamina, opponent.stamina + staminaDrain);
          battle.log.push(`${opponent.name} steals ${staminaDrain} stamina through ${effect.name}.`);
        }
      }

      if (fighter.hp <= 0) {
        fighter.alive = false;
      }

      if (effect.escapeChancePerTurn && Math.random() < effect.escapeChancePerTurn) {
        effect.duration = 0;
        battle.log.push(`${fighter.name} escapes ${effect.name}.`);
      }
    }
  });
}

export function tickFighterEffects(fighter, battle) {
  fighter.effects.forEach((effect) => {
    if (effect.duration === 99) return;
    if (effect.appliedOnTurn === battle.turn) return;

    effect.duration -= 1;
  });

  const expired = fighter.effects.filter((effect) => effect.duration <= 0);
  fighter.effects = fighter.effects.filter((effect) => effect.duration > 0);

  expired.forEach((effect) => {
    battle.log.push(`${effect.name} on ${fighter.name} has expired.`);
  });
}

export function processBattleEffectsTurnEnd(battle) {
  battle.battleEffects.forEach((effect) => {
    if (typeof effect.onTurnEnd === "function") {
      effect.onTurnEnd(battle);
    }
  });

  battle.battleEffects.forEach((effect) => {
    if (effect.duration === 99) return;
    if (effect.appliedOnTurn === battle.turn) return;

    effect.duration -= 1;
  });

  const expired = battle.battleEffects.filter((effect) => effect.duration <= 0);
  battle.battleEffects = battle.battleEffects.filter(
    (effect) => effect.duration > 0
  );

  expired.forEach((effect) => {
    battle.log.push(`Battle effect expired: ${effect.name}.`);
  });
}

// =============================
// CONCENTRATION CHECK
// =============================

export function canConcentrateUnderEffects(fighter) {
  return fighter.effects.every((effect) => effect.allowsConcentration !== false);
}