// Transitional adapter for the current WAFT engine.
//
// The long-term target is for battle-engine.js to emit structured events at
// source. Until then, this adapter converts one resolved legacy log slice into
// an ordered round-start -> fighter 1 -> fighter 2 -> round-end sequence.

import {
  TURN_PHASE,
  classifyBattleLogEvents,
  getActionLabel,
  getCompactPhaseEvents
} from "./battle-turn-sequence.js";

const ROUND_START_HINTS = [
  "BIOME SHIFT",
  "Biome changed",
  "Valve Release",
  "Pressure Control",
  "Larval Command",
  "commands its larvae",
  "day begins",
  "night begins",
  "dawn",
  "dusk",
  "Oasis"
];

const ROUND_END_HINTS = [
  "suffers",
  "from Poison",
  "from Bleed",
  "from Deep Bleed",
  "from Perforation",
  "Neotenic Regeneration",
  "Suffocating Humidity restores",
  "Algae",
  "remains active for",
  "has expired",
  "falls from",
  "tears off the Zombie Cockroach",
  "Zombie Cockroach drains",
  "Larval Gestation generates",
  "Hail",
  "Battle effect expired"
];

function cleanLines(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("--- Turn"))
    .filter((line) => !line.includes("→ HP:"))
    .filter((line) => !line.startsWith("Damage calc"))
    .filter((line) => !line.startsWith("Critical calc"))
    .filter((line) => !line.includes("calc →"))
    .filter((line) => !line.includes("calc ->"));
}

function containsAny(line, hints) {
  return hints.some((hint) => line.includes(hint));
}

function startsWithFighter(line, fighterName) {
  if (!fighterName) return false;
  return line.startsWith(`${fighterName} `) || line.startsWith(`${fighterName}'s `);
}

function looksLikePrimaryAction(line, actorName, action) {
  if (!startsWithFighter(line, actorName)) return false;

  if (action === "concentration") {
    return /concentrat/i.test(line);
  }

  if (action === "special") {
    return /\buses\b|takes flight|explodes|opens its Reaction Chamber/i.test(line);
  }

  if (action === "larval-command") {
    return /Larval Command|commands its larvae/i.test(line);
  }

  return /\bhits\b|\bmisses\b|\btries to hit\b|\buses\b/i.test(line);
}

function phaseFromLines(type, lines, metadata = {}) {
  const events = lines.flatMap((line) => classifyBattleLogEvents(line, metadata));

  return {
    type,
    ...metadata,
    lines,
    events: getCompactPhaseEvents({ events }, { maxQuiet: 2 })
  };
}

function findSecondActionStart(lines, second) {
  for (let i = 0; i < lines.length; i += 1) {
    if (looksLikePrimaryAction(lines[i], second.actorName, second.action)) {
      return i;
    }
  }

  return -1;
}

function findFirstActionStart(lines, first) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (containsAny(line, ROUND_START_HINTS)) continue;
    if (looksLikePrimaryAction(line, first.actorName, first.action)) return i;
  }

  return -1;
}

function findRoundEndStart(lines, secondActionStart, second) {
  if (secondActionStart < 0) return -1;

  let sawSecondAction = false;

  for (let i = secondActionStart; i < lines.length; i += 1) {
    const line = lines[i];

    if (!sawSecondAction && looksLikePrimaryAction(line, second.actorName, second.action)) {
      sawSecondAction = true;
      continue;
    }

    if (!sawSecondAction) continue;

    if (containsAny(line, ROUND_END_HINTS)) {
      return i;
    }
  }

  return -1;
}

export function buildLegacyOrderedTurnSequence(options = {}) {
  const {
    turn = null,
    lines = [],
    first = {},
    second = {},
    battleFinished = false,
    winner = null
  } = options;

  const cleaned = cleanLines(lines);

  const firstMeta = {
    actorId: first.actorId ?? null,
    actorName: first.actorName ?? "Fighter 1",
    targetId: first.targetId ?? null,
    targetName: first.targetName ?? "Fighter 2",
    action: first.action ?? null,
    actionLabel: first.actionLabel || getActionLabel(first.action),
    speed: first.speed ?? null,
    priority: first.priority ?? null
  };

  const secondMeta = {
    actorId: second.actorId ?? null,
    actorName: second.actorName ?? "Fighter 2",
    targetId: second.targetId ?? null,
    targetName: second.targetName ?? "Fighter 1",
    action: second.action ?? null,
    actionLabel: second.actionLabel || getActionLabel(second.action),
    speed: second.speed ?? null,
    priority: second.priority ?? null
  };

  const sharedFighters = {
    fighterAId: firstMeta.actorId,
    fighterAName: firstMeta.actorName,
    fighterBId: secondMeta.actorId,
    fighterBName: secondMeta.actorName
  };

  Object.assign(firstMeta, sharedFighters);
  Object.assign(secondMeta, sharedFighters);

  let firstStart = findFirstActionStart(cleaned, firstMeta);
  if (firstStart < 0) firstStart = 0;

  const beforeFirst = cleaned.slice(0, firstStart);
  const rest = cleaned.slice(firstStart);
  let secondRelativeStart = findSecondActionStart(rest, secondMeta);

  if (secondRelativeStart < 0) {
    secondRelativeStart = rest.length;
  }

  const firstLines = rest.slice(0, secondRelativeStart);
  const secondAndEnd = rest.slice(secondRelativeStart);
  let endRelativeStart = findRoundEndStart(secondAndEnd, 0, secondMeta);

  if (endRelativeStart < 0) {
    endRelativeStart = secondAndEnd.length;
  }

  const secondLines = secondAndEnd.slice(0, endRelativeStart);
  const endLines = secondAndEnd.slice(endRelativeStart);

  const phases = [];

  if (beforeFirst.length > 0) {
    phases.push(phaseFromLines(TURN_PHASE.ROUND_START, beforeFirst, sharedFighters));
  }

  phases.push(phaseFromLines(TURN_PHASE.ACTION, firstLines, firstMeta));

  if (secondLines.length > 0) {
    phases.push(phaseFromLines(TURN_PHASE.ACTION, secondLines, secondMeta));
  }

  if (endLines.length > 0) {
    phases.push(phaseFromLines(TURN_PHASE.ROUND_END, endLines, sharedFighters));
  }

  return {
    turn,
    order: [
      { position: 1, ...firstMeta },
      { position: 2, ...secondMeta }
    ],
    phases,
    battleFinished,
    winner
  };
}

export function determineLegacyTurnOrder(options = {}) {
  const {
    fighterA,
    fighterB,
    actionA,
    actionB,
    speedA = 0,
    speedB = 0,
    priorityA = 0,
    priorityB = 0
  } = options;

  const a = {
    actorId: fighterA?.id ?? null,
    actorName: fighterA?.name ?? "Fighter A",
    targetId: fighterB?.id ?? null,
    targetName: fighterB?.name ?? "Fighter B",
    action: actionA,
    actionLabel: getActionLabel(actionA),
    speed: speedA,
    priority: priorityA
  };

  const b = {
    actorId: fighterB?.id ?? null,
    actorName: fighterB?.name ?? "Fighter B",
    targetId: fighterA?.id ?? null,
    targetName: fighterA?.name ?? "Fighter A",
    action: actionB,
    actionLabel: getActionLabel(actionB),
    speed: speedB,
    priority: priorityB
  };

  if (priorityA > priorityB) return { first: a, second: b };
  if (priorityB > priorityA) return { first: b, second: a };
  return speedA >= speedB ? { first: a, second: b } : { first: b, second: a };
}
