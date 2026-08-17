import test from "node:test";
import assert from "node:assert/strict";

import { getAppliedStatusVfxDefinition } from "../js/battle-vfx-statuses.js";
import { getTransformSignatureVfxDefinition } from "../js/battle-vfx-signatures-transform.js";
import { getCombatSignatureVfxDefinition } from "../js/battle-vfx-signatures-combat.js";
import { getControlSignatureVfxDefinition } from "../js/battle-vfx-signatures-control.js";
import { getTacticalSignatureVfxDefinition } from "../js/battle-vfx-signatures-tactical.js";

test("applied status VFX groups readable condition families", () => {
  const cases = {
    Poison: "toxin",
    Tetrodotoxin: "toxin",
    "Neurotoxic Injection (Tetrodotoxin)": "toxin",
    Bleed: "bleed",
    "Deep Bleed": "bleed",
    Mutilation: "bleed",
    Blindness: "blindness",
    "Partial Vision": "blindness",
    Perforation: "perforation",
    "Agility Down": "stat-down",
    "Heavy Evasion Down": "stat-down",
    "Refresh Debuff": "stat-down",
    "Predatory Pressure": "stat-down"
  };

  for (const [statusName, expectedKind] of Object.entries(cases)) {
    const definition = getAppliedStatusVfxDefinition(statusName);
    assert.equal(definition?.kind, expectedKind, `${statusName} should map to ${expectedKind}`);
    assert.ok(definition?.duration > 0);
  }

  assert.equal(getAppliedStatusVfxDefinition("Unknown Cosmetic State"), null);
});

test("transform signature VFX covers body-state specials", () => {
  const cases = {
    "Caudal Autotomy": "caudal-autotomy",
    Overinflation: "overinflation",
    "Total Regeneration": "total-regeneration",
    "Costal Eversion": "costal-eversion",
    "Perfect Adaptation": "perfect-adaptation"
  };

  for (const [specialName, expectedKind] of Object.entries(cases)) {
    const definition = getTransformSignatureVfxDefinition(specialName);
    assert.equal(definition?.kind, expectedKind, `${specialName} should map to ${expectedKind}`);
    assert.equal(definition?.focus, "actor", `${specialName} should render on its user`);
    assert.ok(definition?.duration >= 800, `${specialName} should remain readable long enough`);
  }

  assert.equal(getTransformSignatureVfxDefinition("Unknown Future Transformation"), null);
});

test("combat signature VFX distinguishes action-pattern specials", () => {
  const cases = {
    "Darwinian Expulsion": ["darwinian-expulsion", "actor"],
    "Raptorial Chain": ["raptorial-chain", "target"],
    "Anubis' Staff": ["anubis-staff", "both"],
    "Deadly Dive": ["deadly-dive", "target"],
    "Death Roll": ["death-roll", "target"],
    "Ballistic Strike": ["ballistic-strike", "target"]
  };

  for (const [specialName, [expectedKind, expectedFocus]] of Object.entries(cases)) {
    const definition = getCombatSignatureVfxDefinition(specialName);
    assert.equal(definition?.kind, expectedKind, `${specialName} should map to ${expectedKind}`);
    assert.equal(definition?.focus, expectedFocus, `${specialName} should focus ${expectedFocus}`);
    assert.ok(definition?.duration >= 800, `${specialName} should remain visually readable`);
  }

  assert.equal(getCombatSignatureVfxDefinition("Unknown Future Combo"), null);
});

test("control and resource signature VFX preserve actor/target semantics", () => {
  const cases = {
    "Zombie Cockroach": ["zombie-cockroach", "target"],
    Refresh: ["refresh", "both"],
    "Looting Burst": ["looting-burst", "both"],
    "Dung Throw": ["dung-throw", "target"],
    "Nocturnal Hunt": ["nocturnal-hunt", "both"]
  };

  for (const [specialName, [expectedKind, expectedFocus]] of Object.entries(cases)) {
    const definition = getControlSignatureVfxDefinition(specialName);
    assert.equal(definition?.kind, expectedKind, `${specialName} should map to ${expectedKind}`);
    assert.equal(definition?.focus, expectedFocus, `${specialName} should focus ${expectedFocus}`);
    assert.ok(definition?.duration >= 800, `${specialName} should remain visually readable`);
  }

  assert.equal(getControlSignatureVfxDefinition("Unknown Future Control Special"), null);
});

test("tactical signature VFX covers uncovered secondary mechanics", () => {
  const cases = {
    "Tentacle Storm": ["tentacle-storm", "target"],
    "Neurotoxic Injection (Tetrodotoxin)": ["neurotoxic-injection", "target"],
    Mutilation: ["mutilation", "target"],
    "Ancestral Retreat": ["ancestral-retreat", "actor"]
  };

  for (const [specialName, [expectedKind, expectedFocus]] of Object.entries(cases)) {
    const definition = getTacticalSignatureVfxDefinition(specialName);
    assert.equal(definition?.kind, expectedKind, `${specialName} should map to ${expectedKind}`);
    assert.equal(definition?.focus, expectedFocus, `${specialName} should focus ${expectedFocus}`);
    assert.ok(definition?.duration >= 800, `${specialName} should remain visually readable`);
  }

  assert.equal(getTacticalSignatureVfxDefinition("Unknown Future Tactical Special"), null);
});
