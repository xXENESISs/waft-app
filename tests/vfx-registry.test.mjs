import test from "node:test";
import assert from "node:assert/strict";

import { getAppliedStatusVfxDefinition } from "../js/battle-vfx-statuses.js";
import { getTransformSignatureVfxDefinition } from "../js/battle-vfx-signatures-transform.js";

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
