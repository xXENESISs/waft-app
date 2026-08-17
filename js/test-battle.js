// Single Battle V2 bootstrap.
// Install the shared presentation layer first, then load the mature battle page
// logic unchanged. The compatibility shim removes only legacy animation/text
// pacing; combat mechanics remain inside battle-engine-core.js.

import { installLegacyPresentationCompat } from "./legacy-presentation-compat.js";
import { installTurnSummaryV2Live } from "./turn-summary-v2-live.js";
import { installMobileArenaLayoutV2 } from "./mobile-arena-layout-v2.js";

installMobileArenaLayoutV2();
installLegacyPresentationCompat();
installTurnSummaryV2Live({
  legacyBoxId: "turnSummaryBox",
  hideLegacy: true,
  playVfx: true,
  playerSide: "fighterA"
});

import("./test-battle-legacy.js").catch((error) => {
  console.error("WAFT Single Battle legacy bootstrap failed:", error);
});
