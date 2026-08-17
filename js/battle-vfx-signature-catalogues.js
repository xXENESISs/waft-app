// Single entry point for every WAFT signature-special VFX catalogue.
// Adding another catalogue should only require changing this module; battle-vfx.js
// stays stable and all four game modes inherit the new visuals automatically.

import { playSignatureSpecialVfx } from "./battle-vfx-signatures.js";
import { playTransformSignatureVfx } from "./battle-vfx-signatures-transform.js";
import { playCombatSignatureVfx } from "./battle-vfx-signatures-combat.js";
import { playControlSignatureVfx } from "./battle-vfx-signatures-control.js";
import { playTacticalSignatureVfx } from "./battle-vfx-signatures-tactical.js";

const CATALOGUES = Object.freeze([
  playSignatureSpecialVfx,
  playTransformSignatureVfx,
  playCombatSignatureVfx,
  playControlSignatureVfx,
  playTacticalSignatureVfx
]);

export async function playSignatureCataloguesVfx(event, context = {}) {
  const results = await Promise.all(
    CATALOGUES.map((play) => play(event, context))
  );

  return results.some(Boolean);
}
