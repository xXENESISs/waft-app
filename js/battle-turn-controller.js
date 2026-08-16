// Shared turn controller for the current WAFT battle engine.
//
// Use resolveTurnSequenced() instead of resolveTurn() in battle UIs. It keeps
// the existing combat mechanics untouched, but captures the exact speed /
// priority order and converts the resulting legacy log slice into the ordered
// sequence consumed by Turn Summary V2 and battle VFX.

import {
  resolveTurn,
  getEffectiveStat,
  getActionPriority
} from "./battle-engine.js";

import {
  buildLegacyOrderedTurnSequence,
  determineLegacyTurnOrder
} from "./battle-turn-sequence-legacy-adapter.js";

export function resolveTurnSequenced(battle, actionA, actionB) {
  if (!battle || battle.finished) return null;

  const oldLogLength = Array.isArray(battle.log) ? battle.log.length : 0;
  const turnNumber = battle.turn;

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

  const { first, second } = determineLegacyTurnOrder({
    fighterA: battle.fighterA,
    fighterB: battle.fighterB,
    actionA,
    actionB,
    speedA,
    speedB,
    priorityA,
    priorityB
  });

  resolveTurn(battle, actionA, actionB);

  const newLines = Array.isArray(battle.log)
    ? battle.log.slice(oldLogLength)
    : [];

  const sequence = buildLegacyOrderedTurnSequence({
    turn: turnNumber,
    lines: newLines,
    first,
    second,
    battleFinished: Boolean(battle.finished),
    winner: battle.winner ?? null
  });

  battle.lastTurnSequence = sequence;
  return sequence;
}
