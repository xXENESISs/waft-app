// WAFT battle engine facade.
//
// The full combat implementation lives in battle-engine-core.js. This facade
// preserves every existing export, while wrapping createBattle/resolveTurn so
// the V2 presentation receives initial state and real priority/speed order
// without changing combat balance.

export * from "./battle-engine-core.js";

import {
  createBattle as createCoreBattle,
  resolveTurn as resolveCoreTurn,
  getEffectiveStat,
  getActionPriority
} from "./battle-engine-core.js";

import {
  buildLegacyOrderedTurnSequence,
  determineLegacyTurnOrder
} from "./battle-turn-sequence-legacy-adapter.js";

function dispatchBrowserBattleState(battle, message = null) {
  if (typeof window === "undefined" || !battle) return;

  window.dispatchEvent(
    new CustomEvent("waft:battle-state", {
      detail: {
        battle,
        playerSide: "fighterA",
        message
      }
    })
  );
}

export function createBattle(idA, idB) {
  const battle = createCoreBattle(idA, idB);
  dispatchBrowserBattleState(battle, "Battle started. Choose your first action.");
  return battle;
}

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

  const sequence = buildLegacyOrderedTurnSequence({
    turn: turnNumber,
    lines: newLines,
    first,
    second,
    battleFinished: Boolean(battle.finished),
    winner: battle.winner ?? null
  });

  battle.lastTurnSequence = sequence;

  if (typeof window !== "undefined") {
    window.__WAFT_LAST_TURN_SEQUENCE__ = sequence;
    window.dispatchEvent(
      new CustomEvent("waft:turn-resolved", {
        detail: {
          sequence,
          battle,
          actionA,
          actionB
        }
      })
    );
  }
}
