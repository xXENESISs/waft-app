import test from "node:test";
import assert from "node:assert/strict";

import { animals } from "../js/animals.js";
import { createBattle, canUseAction } from "../js/battle-engine.js";

function hudTreatsTurnAsNight(turn) {
  const safeTurn = Math.max(1, Number(turn) || 1);
  return Math.floor((safeTurn - 1) / 2) % 2 === 1;
}

test("battlefield DAY/NIGHT HUD agrees with Nocturnal Hunt legality", () => {
  const owlEntry = Object.entries(animals).find(([, animal]) => animal?.special?.id === "nocturnal-hunt");
  assert.ok(owlEntry, "WAFT should contain a fighter whose special uses nocturnal-hunt");

  const [owlId] = owlEntry;
  const opponentId = Object.keys(animals).find((id) => id !== owlId && animals[id]?.stats);
  assert.ok(opponentId, "WAFT needs an opponent for the circadian test");

  const battle = createBattle(owlId, opponentId);
  const owl = battle.fighterA;
  assert.equal(owl.special?.id, "nocturnal-hunt");

  for (let turn = 1; turn <= 8; turn += 1) {
    battle.turn = turn;
    owl.specialCharge = owl.special.chargeHits;
    owl.stamina = owl.maxStamina;

    const engineAllowsNocturnalHunt = canUseAction(owl, "special", battle);
    const hudSaysNight = hudTreatsTurnAsNight(turn);

    assert.equal(
      engineAllowsNocturnalHunt,
      hudSaysNight,
      `Turn ${turn}: HUD circadian phase disagrees with Nocturnal Hunt legality`
    );
  }
});
