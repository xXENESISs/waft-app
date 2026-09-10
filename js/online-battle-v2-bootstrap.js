// Shared Online Battle V2 bootstrap helpers.

import { installLegacyPresentationCompat } from "./legacy-presentation-compat.js";
import { installOnlineBattleV2SocketBridge } from "./online-battle-v2-socket-bridge.js";
import { installTurnSummaryV2Live } from "./turn-summary-v2-live.js";

export function installOnlineBattleV2() {
  installLegacyPresentationCompat();
  installOnlineBattleV2SocketBridge();
  installTurnSummaryV2Live({
    legacyBoxId: "turnSummaryBox",
    hideLegacy: true,
    playVfx: true,
    playerSide: "fighterA"
  });
}
