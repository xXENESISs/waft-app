// WAFT battle engine facade.
//
// The full combat implementation lives in battle-engine-core.js. This facade
// preserves every existing export, while wrapping resolveTurn so the real
// priority/speed order is captured as a compact structured sequence for all
// battle modes without changing combat balance.

export * from "./battle-engine-core.js";

import {
  resolveTurn as resolveCoreTurn,
  getEffectiveStat,
  getActionPriority
} from "./battle-engine-core.js";

import {
  buildLegacyOrderedTurnSequence,
  determineLegacyTurnOrder
} from "./battle-turn-sequence-legacy-adapter.js";

export function resolveTurn(battle, actionA, actionB) {
  if (!battle || battle.finished) return;

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

  resolveCoreTurn(battle, actionA, actionB);

  const newLines = Array.isArray(battle.log)
    ? battle.log.slice(oldLogLength)
    : [];

  battle.lastTurnSequence = buildLegacyOrderedTurnSequence({
    turn: turnNumber,
    lines: newLines,
    first,
    second,
    battleFinished: Boolean(battle.finished),
    winner: battle.winner ?? null
  });
}