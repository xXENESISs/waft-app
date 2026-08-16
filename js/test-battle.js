// Single Battle V2 bootstrap.
// Keep the mature battle page logic untouched and layer the new ordered
// summary + shared VFX on top of it.

import "./test-battle-legacy.js";
import { installTurnSummaryV2Live } from "./turn-summary-v2-live.js";

installTurnSummaryV2Live({
  legacyBoxId: "turnSummaryBox",
  hideLegacy: true,
  playVfx: true,
  playerSide: "fighterA"
});
