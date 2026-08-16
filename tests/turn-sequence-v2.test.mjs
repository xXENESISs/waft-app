import test from "node:test";
import assert from "node:assert/strict";

import { animals } from "../js/animals.js";
import { createBattle, resolveTurn } from "../js/battle-engine.js";
import {
  TURN_EVENT,
  TURN_PHASE
} from "../js/battle-turn-sequence.js";
import {
  buildLegacyOrderedTurnSequence,
  determineLegacyTurnOrder
} from "../js/battle-turn-sequence-legacy-adapter.js";
import { getBattleVfxCue } from "../js/battle-vfx.js";

function fighter(id, name) {
  return { id, name };
}

test("priority decides action order before speed", () => {
  const fighterA = fighter("a", "Fast A");
  const fighterB = fighter("b", "Slow B");

  const { first, second } = determineLegacyTurnOrder({
    fighterA,
    fighterB,
    actionA: "normal",
    actionB: "quick",
    speedA: 100,
    speedB: 10,
    priorityA: 1,
    priorityB: 3
  });

  assert.equal(first.actorId, "b");
  assert.equal(first.action, "quick");
  assert.equal(second.actorId, "a");
});

test("speed decides order when priority is tied", () => {
  const fighterA = fighter("a", "A");
  const fighterB = fighter("b", "B");

  const { first } = determineLegacyTurnOrder({
    fighterA,
    fighterB,
    actionA: "normal",
    actionB: "normal",
    speedA: 40,
    speedB: 75,
    priorityA: 1,
    priorityB: 1
  });

  assert.equal(first.actorId, "b");
});

test("legacy round becomes ordered actions plus round-end events", () => {
  const first = {
    actorId: "kea",
    actorName: "Kea",
    targetId: "wolf",
    targetName: "Wolf",
    action: "precise",
    speed: 90,
    priority: 1
  };

  const second = {
    actorId: "wolf",
    actorName: "Wolf",
    targetId: "kea",
    targetName: "Kea",
    action: "special",
    speed: 60,
    priority: 1
  };

  const sequence = buildLegacyOrderedTurnSequence({
    turn: 7,
    first,
    second,
    lines: [
      "--- Turn 7 ---",
      "Kea hits Wolf with Precise Attack for 74 damage (CRITICAL).",
      "Wolf gains effect: Poison.",
      "Wolf uses Throat Bite, dealing 92 damage.",
      "Kea suffers 10 damage from Poison.",
      "Kea's Algae Colony restores 30 HP."
    ]
  });

  assert.equal(sequence.turn, 7);
  assert.equal(sequence.order[0].actorName, "Kea");
  assert.equal(sequence.order[1].actorName, "Wolf");

  const actionPhases = sequence.phases.filter((phase) => phase.type === TURN_PHASE.ACTION);
  const endPhase = sequence.phases.find((phase) => phase.type === TURN_PHASE.ROUND_END);

  assert.equal(actionPhases.length, 2);
  assert.ok(actionPhases[0].events.some((event) => event.type === TURN_EVENT.CRITICAL && event.amount === 74));
  assert.ok(actionPhases[0].events.some((event) => event.type === TURN_EVENT.STATUS_APPLIED && event.targetName === "Wolf"));

  assert.ok(actionPhases[1].events.some((event) => event.type === TURN_EVENT.SPECIAL && event.specialName === "Throat Bite"));
  assert.ok(actionPhases[1].events.some((event) => event.type === TURN_EVENT.DAMAGE && event.amount === 92));

  assert.ok(endPhase);
  assert.ok(endPhase.events.some((event) => event.type === TURN_EVENT.DAMAGE && event.targetName === "Kea" && event.amount === 10));
  assert.ok(endPhase.events.some((event) => event.type === TURN_EVENT.HEAL && event.actorName === "Kea" && event.amount === 30));
});

test("VFX routes self-benefits to actor and harmful effects to target", () => {
  const context = {
    playerId: "kea",
    enemyId: "wolf",
    playerName: "Kea",
    enemyName: "Wolf"
  };

  const healCue = getBattleVfxCue({
    type: TURN_EVENT.HEAL,
    actorId: "kea",
    actorName: "Kea",
    targetId: "wolf",
    targetName: "Wolf",
    amount: 30
  }, context);

  const buffCue = getBattleVfxCue({
    type: TURN_EVENT.BUFF,
    actorId: "kea",
    actorName: "Kea",
    targetId: "wolf",
    targetName: "Wolf"
  }, context);

  const criticalCue = getBattleVfxCue({
    type: TURN_EVENT.CRITICAL,
    actorId: "kea",
    actorName: "Kea",
    targetId: "wolf",
    targetName: "Wolf",
    amount: 74
  }, context);

  const debuffCue = getBattleVfxCue({
    type: TURN_EVENT.DEBUFF,
    actorId: "kea",
    actorName: "Kea",
    targetId: "wolf",
    targetName: "Wolf"
  }, context);

  assert.equal(healCue.side, "player");
  assert.equal(buffCue.side, "player");
  assert.equal(criticalCue.side, "enemy");
  assert.equal(debuffCue.side, "enemy");
});

test("real battle-engine resolveTurn publishes a structured lastTurnSequence", () => {
  const fighterIds = Object.entries(animals)
    .filter(([, animal]) => animal?.stats && animal?.name)
    .map(([id]) => id)
    .slice(0, 2);

  assert.equal(fighterIds.length, 2, "WAFT needs at least two valid fighters for the smoke test");

  const battle = createBattle(fighterIds[0], fighterIds[1]);
  resolveTurn(battle, "normal", "normal");

  assert.ok(battle.lastTurnSequence, "resolveTurn must attach lastTurnSequence");
  assert.equal(battle.lastTurnSequence.turn, 1);
  assert.equal(battle.lastTurnSequence.order.length, 2);
  assert.ok(Array.isArray(battle.lastTurnSequence.phases));
  assert.ok(battle.lastTurnSequence.phases.some((phase) => phase.type === TURN_PHASE.ACTION));
});
