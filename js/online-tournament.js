// Online Tournament V2 bootstrap.
// Shared presentation is installed before the mature tournament module so its
// Socket.IO listeners can be mirrored without changing networking/bracket code.

import { installLegacyPresentationCompat } from "./legacy-presentation-compat.js";
import { installOnlineTournamentV2SocketBridge } from "./online-tournament-v2-socket-bridge.js";
import { installOnlineTournamentV2Live } from "./online-tournament-v2-live.js";

installLegacyPresentationCompat();
installOnlineTournamentV2SocketBridge();
installOnlineTournamentV2Live();

import("./online-tournament-legacy.js").catch((error) => {
  console.error("WAFT Online Tournament legacy bootstrap failed:", error);
});
