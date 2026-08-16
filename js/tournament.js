// Single Tournament V2 bootstrap.
import { installLegacyPresentationCompat } from "./legacy-presentation-compat.js";
import { installTurnSummaryV2Live } from "./turn-summary-v2-live.js";

installLegacyPresentationCompat();
installTurnSummaryV2Live({
  legacyBoxId: "turnSummaryBox",
  hideLegacy: true,
  playVfx: true,
  playerSide: "fighterA"
});

import("./tournament-legacy.js").catch((error) => {
  console.error("WAFT Single Tournament legacy bootstrap failed:", error);
});
