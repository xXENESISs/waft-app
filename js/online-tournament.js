// Online Tournament V2 bootstrap.
// Shared presentation is installed before the mature tournament module so its
// Socket.IO listeners can be mirrored without changing networking/bracket code.
//
// The mature module registers its page initializer on DOMContentLoaded. Because
// it is now loaded dynamically behind V2, DOMContentLoaded can fire while that
// import is resolving. During this one import only, late DOMContentLoaded
// registrations are invoked immediately if the real event already happened.

import { installLegacyPresentationCompat } from "./legacy-presentation-compat.js";
import { installOnlineTournamentV2SocketBridge } from "./online-tournament-v2-socket-bridge.js";
import { installOnlineTournamentV2Live } from "./online-tournament-v2-live.js";

installLegacyPresentationCompat();
installOnlineTournamentV2SocketBridge();
installOnlineTournamentV2Live();

const originalDocumentAddEventListener = document.addEventListener.bind(document);
let realDomContentLoadedFired = Boolean(
  performance.getEntriesByType?.("navigation")?.[0]?.domContentLoadedEventEnd
);

originalDocumentAddEventListener(
  "DOMContentLoaded",
  () => {
    realDomContentLoadedFired = true;
  },
  { once: true }
);

function invokeDomReadyListener(listener) {
  queueMicrotask(() => {
    const event = new Event("DOMContentLoaded");

    if (typeof listener === "function") {
      listener.call(document, event);
      return;
    }

    listener?.handleEvent?.(event);
  });
}

document.addEventListener = function waftOnlineTournamentDomReadyCompat(type, listener, options) {
  if (type === "DOMContentLoaded" && realDomContentLoadedFired) {
    invokeDomReadyListener(listener);
    return;
  }

  return originalDocumentAddEventListener(type, listener, options);
};

try {
  await import("./online-tournament-legacy.js");
} catch (error) {
  console.error("WAFT Online Tournament legacy bootstrap failed:", error);
} finally {
  document.addEventListener = originalDocumentAddEventListener;
}
