// WAFT ordered turn sequence foundation.
//
// This module is intentionally UI-agnostic. The battle engine can bracket the
// real resolution phases (round start -> first action -> second action ->
// round end) and every UI can consume the same structured result.

export const TURN_PHASE = Object.freeze({
  ROUND_START: "round-start",
  ACTION: "action",
  ROUND_END: "round-end"
});

export const TURN_EVENT = Object.freeze({
  ACTION: "action",
  HIT: "hit",
  CRITICAL: "critical",
  MISS: "miss",
  DAMAGE: "damage",
  HEAL: "heal",
  STAMINA: "stamina",
  STATUS_APPLIED: "status-applied",
  STATUS_EXPIRED: "status-expired",
  BUFF: "buff",
  DEBUFF: "debuff",
  SPECIAL: "special",
  PASSIVE: "passive",
  FIELD: "field",
  KO: "ko",
  INFO: "info"
});

const ACTION_LABELS = Object.freeze({
  normal: "Normal Attack",
  quick: "Quick Attack",
  precise: "Precise Attack",
  explosive: "Explosive Attack",
  concentration: "Concentration",
  special: "Special Attack",
  "larval-command": "Larval Command"
});

const SPECIAL_NAMES = [
  "Throat Bite",
  "Lethal Bite",
  "Arctic Storm",
  "Illusory Dance",
  "Ballistic Strike",
  "Dung Throw",
  "Death Roll",
  "Total Regeneration",
  "Nervous Disruption",
  "Zombie Cockroach",
  "Deadly Dive",
  "Phantom Current",
  "Looting Burst",
  "Refresh",
  "Mutilation",
  "Anubis' Staff",
  "Ancestral Retreat",
  "Darwinian Expulsion",
  "Perfect Adaptation",
  "Tentacle Storm",
  "Coconut Fortress",
  "Ink Sea",
  "Neurotoxic Injection",
  "Overinflation",
  "Costal Eversion",
  "Caudal Autotomy",
  "Microecosystem Ancestral",
  "Ancestral Explosive Strike",
  "Chain Reaction",
  "Bloody Gouging",
  "Marine Flash"
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanLine(value) {
  return String(value ?? "").trim();
}

function numberFromMatch(match, index = 1) {
  const value = Number(match?.[index]);
  return Number.isFinite(value) ? value : null;
}

function fighterSnapshot(fighter) {
  if (!fighter) return null;

  return {
    id: fighter.id ?? null,
    name: fighter.name ?? fighter.id ?? "Unknown",
    hp: fighter.hp ?? null,
    maxHp: fighter.maxHp ?? null,
    stamina: fighter.stamina ?? null,
    maxStamina: fighter.maxStamina ?? null,
    alive: fighter.alive !== false
  };
}

export function getActionLabel(actionType) {
  return ACTION_LABELS[actionType] || String(actionType || "Action");
}

export function createTurnSequence(battle) {
  return {
    turn: battle?.turn ?? null,
    startedAtLogIndex: safeArray(battle?.log).length,
    finishedAtLogIndex: null,
    fighterA: fighterSnapshot(battle?.fighterA),
    fighterB: fighterSnapshot(battle?.fighterB),
    order: [],
    phases: [],
    events: [],
    finished: false
  };
}

export function beginBattleTurnSequence(battle) {
  if (!battle) return null;
  const sequence = createTurnSequence(battle);
  battle.lastTurnSequence = sequence;
  return sequence;
}

export function setBattleTurnOrder(battle, orderedEntries = []) {
  const sequence = battle?.lastTurnSequence;
  if (!sequence) return;

  sequence.order = orderedEntries
    .filter(Boolean)
    .map((entry, index) => ({
      position: index + 1,
      actorId: entry.actor?.id ?? entry.actorId ?? null,
      actorName: entry.actor?.name ?? entry.actorName ?? "Unknown",
      targetId: entry.target?.id ?? entry.targetId ?? null,
      targetName: entry.target?.name ?? entry.targetName ?? "Unknown",
      action: entry.action ?? null,
      actionLabel: getActionLabel(entry.action),
      speed: entry.speed ?? null,
      priority: entry.priority ?? null
    }));
}

export function beginBattleTurnPhase(battle, type, metadata = {}) {
  const sequence = battle?.lastTurnSequence;
  if (!sequence) return null;

  return {
    type,
    logStart: safeArray(battle.log).length,
    metadata: { ...metadata },
    before: {
      fighterA: fighterSnapshot(battle.fighterA),
      fighterB: fighterSnapshot(battle.fighterB)
    }
  };
}

export function endBattleTurnPhase(battle, token, metadata = {}) {
  const sequence = battle?.lastTurnSequence;
  if (!sequence || !token) return null;

  const logEnd = safeArray(battle.log).length;
  const lines = safeArray(battle.log).slice(token.logStart, logEnd);
  const events = lines
    .map((line) => classifyBattleLogLine(line, token.metadata))
    .filter(Boolean);

  const phase = {
    type: token.type,
    ...token.metadata,
    ...metadata,
    logStart: token.logStart,
    logEnd,
    lines,
    events,
    before: token.before,
    after: {
      fighterA: fighterSnapshot(battle.fighterA),
      fighterB: fighterSnapshot(battle.fighterB)
    }
  };

  sequence.phases.push(phase);
  sequence.events.push(...events);
  return phase;
}

export function finishBattleTurnSequence(battle) {
  const sequence = battle?.lastTurnSequence;
  if (!sequence) return null;

  sequence.finishedAtLogIndex = safeArray(battle.log).length;
  sequence.finished = true;
  sequence.fighterAAfter = fighterSnapshot(battle.fighterA);
  sequence.fighterBAfter = fighterSnapshot(battle.fighterB);
  sequence.battleFinished = Boolean(battle.finished);
  sequence.winner = battle.winner ?? null;
  return sequence;
}

export function classifyBattleLogLine(rawLine, context = {}) {
  const line = cleanLine(rawLine);
  if (!line) return null;

  if (line.startsWith("--- Turn")) return null;
  if (line.includes("calc →") || line.includes("calc ->")) return null;
  if (line.startsWith("Damage calc") || line.startsWith("Critical calc")) return null;
  if (line.includes("→ HP:")) return null;

  const base = {
    text: line,
    actorId: context.actorId ?? null,
    actorName: context.actorName ?? null,
    targetId: context.targetId ?? null,
    targetName: context.targetName ?? null,
    action: context.action ?? null
  };

  if (line.includes("has been defeated")) {
    return { ...base, type: TURN_EVENT.KO, emphasis: "major" };
  }

  if (line.includes("BIOME SHIFT") || line.includes("Biome changed")) {
    return { ...base, type: TURN_EVENT.FIELD, subtype: "biome", emphasis: "major" };
  }

  if (/\b(day|night|dawn|dusk)\b/i.test(line) && /\b(begins|starts|changes|becomes)\b/i.test(line)) {
    return { ...base, type: TURN_EVENT.FIELD, subtype: "day-night", emphasis: "major" };
  }

  if (/\bOasis\b/.test(line)) {
    return { ...base, type: TURN_EVENT.FIELD, subtype: "oasis", emphasis: "major" };
  }

  const criticalHit = line.match(/hits (.+?) with (.+?) for (\d+) damage \(CRITICAL\)/i);
  if (criticalHit) {
    return {
      ...base,
      type: TURN_EVENT.CRITICAL,
      targetName: criticalHit[1],
      actionLabel: criticalHit[2],
      amount: numberFromMatch(criticalHit, 3),
      emphasis: "major"
    };
  }

  const damageHit = line.match(/hits (.+?) with (.+?) for (\d+) damage/i);
  if (damageHit) {
    return {
      ...base,
      type: TURN_EVENT.HIT,
      targetName: damageHit[1],
      actionLabel: damageHit[2],
      amount: numberFromMatch(damageHit, 3),
      emphasis: "normal"
    };
  }

  const genericDamage = line.match(/(?:dealing|takes|suffers|for) (\d+) (?:true )?damage/i);
  if (genericDamage) {
    return {
      ...base,
      type: TURN_EVENT.DAMAGE,
      amount: numberFromMatch(genericDamage, 1),
      emphasis: "normal"
    };
  }

  if (/\bmiss(?:es|ed)?\b/i.test(line)) {
    return { ...base, type: TURN_EVENT.MISS, emphasis: "normal" };
  }

  const heal = line.match(/(?:restores|regenerates|heals) (\d+) HP/i);
  if (heal) {
    return {
      ...base,
      type: TURN_EVENT.HEAL,
      amount: numberFromMatch(heal, 1),
      emphasis: "normal"
    };
  }

  const statusApplied = line.match(/gains effect: (.+?)\.?$/i);
  if (statusApplied) {
    return {
      ...base,
      type: TURN_EVENT.STATUS_APPLIED,
      statusName: statusApplied[1],
      emphasis: "normal"
    };
  }

  if (/has expired|effect expired|wears off/i.test(line)) {
    return { ...base, type: TURN_EVENT.STATUS_EXPIRED, emphasis: "quiet" };
  }

  if (/\breduc(?:es|ing)\b/i.test(line) || /Defense Down|Evasion Down|Agility Down|Technique Down|Speed Down/i.test(line)) {
    return { ...base, type: TURN_EVENT.DEBUFF, emphasis: "normal" };
  }

  if (/\bgains?\b/i.test(line) && /Attack|Defense|Speed|Agility|Technique|Explosiveness|Precision|Evasion/i.test(line)) {
    return { ...base, type: TURN_EVENT.BUFF, emphasis: "normal" };
  }

  const usedSpecial = SPECIAL_NAMES.find((specialName) => line.includes(`uses ${specialName}`));
  if (usedSpecial) {
    return {
      ...base,
      type: TURN_EVENT.SPECIAL,
      specialName: usedSpecial,
      emphasis: "major"
    };
  }

  if (/Special Attack is ready/i.test(line)) {
    return { ...base, type: TURN_EVENT.INFO, subtype: "special-ready", emphasis: "quiet" };
  }

  if (/passive|Colony|Momentum|Inertia|Silent Stalk|Predatory Pressure|Reaction Chamber|Scaled Retreat|Perfect Camouflage/i.test(line)) {
    return { ...base, type: TURN_EVENT.PASSIVE, emphasis: "quiet" };
  }

  if (/stamina/i.test(line)) {
    return { ...base, type: TURN_EVENT.STAMINA, emphasis: "quiet" };
  }

  return { ...base, type: TURN_EVENT.INFO, emphasis: "quiet" };
}

export function getCompactPhaseEvents(phase, options = {}) {
  const { maxQuiet = 2 } = options;
  const events = safeArray(phase?.events);
  const major = events.filter((event) => event.emphasis === "major");
  const normal = events.filter((event) => event.emphasis === "normal");
  const quiet = events.filter((event) => event.emphasis === "quiet").slice(0, maxQuiet);
  return [...major, ...normal, ...quiet];
}

export function getTurnSequenceForUi(battle) {
  const sequence = battle?.lastTurnSequence;
  if (!sequence) return null;

  return {
    turn: sequence.turn,
    order: safeArray(sequence.order),
    phases: safeArray(sequence.phases).map((phase) => ({
      ...phase,
      events: getCompactPhaseEvents(phase)
    })),
    battleFinished: sequence.battleFinished,
    winner: sequence.winner
  };
}
